package quickstart

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	delivery "github.com/goliatone/go-export/adapters/delivery"
	deliverybun "github.com/goliatone/go-export/adapters/delivery/bun"
	exportjob "github.com/goliatone/go-export/adapters/job"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

// LegacyExportAdoptionConfig is trusted operator policy, disabled by default.
// Authorize must check current identity, legacy ownership, the versioned profile
// and a maintenance fence excluding old writers before any record is read.
// Select resolves reviewed endpoint/credential versions without network I/O.
// Neither callback may commit, open a nested transaction or change authorization.
type LegacyExportAdoptionConfig struct {
	Authorize func(context.Context, bun.Tx, export.Actor, string, string) error
	Select    func(context.Context, bun.Tx, export.Actor, export.ExportRecord, string) (deliverybun.ScheduleRequest, error)
	// Inventory authorizes current operator/profile/fence before listing trusted ownership IDs.
	// Return at most limit IDs, strictly increasing after the cursor, using tx only.
	Inventory func(ctx context.Context, tx bun.Tx, actor export.Actor, profile, after string, limit int) ([]string, error)
}

type LegacyExportReview struct {
	ExportID     string             `json:"export_id"`
	ProfileRef   string             `json:"profile_ref"`
	State        export.ExportState `json:"state"`
	RecordSHA256 string             `json:"record_sha256"`
	PlanSHA256   string             `json:"plan_sha256"`
}

type LegacyExportAdoptionRequest struct {
	ExportID     string `json:"export_id"`
	ProfileRef   string `json:"profile_ref"`
	RecordSHA256 string `json:"record_sha256"`
	PlanSHA256   string `json:"plan_sha256"`
}

func (r LegacyExportAdoptionRequest) Validate() error {
	if !validLegacyRef(r.ExportID) || !validLegacyRef(r.ProfileRef) || !validLegacyDigest(r.RecordSHA256) || !validLegacyDigest(r.PlanSHA256) {
		return durableExportInvalid("legacy export, versioned profile and reviewed SHA256 digests required")
	}
	return nil
}
func validLegacyRef(v string) bool { return v != "" && len(v) <= 512 && strings.TrimSpace(v) == v }
func validLegacyDigest(v string) bool {
	b, e := hex.DecodeString(v)
	return e == nil && len(b) == sha256.Size && strings.ToLower(v) == v
}

type LegacyExportAdoptionResult struct {
	ExportID   string             `json:"export_id"`
	ProfileRef string             `json:"profile_ref"`
	State      export.ExportState `json:"adopted_state"`
	Replayed   bool               `json:"replayed"`
}
type legacyExportReceipt struct {
	bun.BaseModel `bun:"table:admin_export_legacy_adoptions"`
	ExportID      string             `bun:",pk"`
	Namespace     string             `bun:",notnull"`
	ActorID       string             `bun:",notnull"`
	TenantID      string             `bun:",notnull"`
	WorkspaceID   string             `bun:",notnull"`
	ProfileRef    string             `bun:",notnull"`
	RecordSHA256  string             `bun:",notnull"`
	PlanSHA256    string             `bun:",notnull"`
	State         export.ExportState `bun:",notnull"`
	ReceiptIDs    string             `bun:",notnull"`
	AdoptedAt     time.Time          `bun:",notnull"`
}

func legacyDigest(v any) (string, error) {
	raw, e := json.Marshal(v)
	if e != nil {
		return "", durableExportInvalid("legacy adoption data cannot be fingerprinted")
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}
func legacyRecordDigest(rec export.ExportRecord, payload []byte) (string, error) {
	// Bind the exact stored request bytes, including numeric precision; native
	// ExportRecord JSON omits Request and its decoded any fields may be lossy.
	return legacyDigest(struct {
		Record         export.ExportRecord
		RequestPayload string
	}{rec, string(payload)})
}

// Bind the reviewed profile version as well as its immutable native plan.
func legacyProfileDigest(profile, planDigest string) (string, error) {
	return legacyDigest(struct {
		ProfileRef string
		PlanSHA256 string
	}{profile, planDigest})
}
func legacyPlan(rec export.ExportRecord, req deliverybun.ScheduleRequest) (deliverybun.ScheduleRequest, string, error) {
	if req.ExportID != "" && req.ExportID != rec.ID {
		return req, "", durableExportInvalid("legacy plan export mismatch")
	}
	req.ExportID = rec.ID
	raw, e := json.Marshal(req)
	if e != nil || len(raw) > 1<<20 {
		return req, "", durableExportInvalid("invalid legacy plan")
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if e = decoder.Decode(&req); e != nil {
		return req, "", durableExportInvalid("invalid legacy plan")
	}
	if !validLegacyRef(req.Key) || len(req.Targets) == 0 || len(req.Targets) > delivery.DefaultMaxTargets {
		return req, "", durableExportInvalid("bounded legacy plan and stable operation key required")
	}
	sort.Slice(req.Targets, func(i, j int) bool { return req.Targets[i].ID < req.Targets[j].ID })
	for i, t := range req.Targets {
		if !validLegacyRef(t.ID) || (i > 0 && req.Targets[i-1].ID == t.ID) {
			return req, "", durableExportInvalid("unique legacy plan targets required")
		}
		if e = delivery.ValidateWebhookDelivery(delivery.WebhookDelivery{ID: strings.Repeat("0", 64), URL: t.URL, Headers: t.Headers, Body: json.RawMessage(`{}`), SHA256: delivery.PayloadDigest([]byte(`{}`))}); e != nil {
			return req, "", e
		}
	}
	digest, e := legacyDigest(req)
	return req, digest, e
}
func (h *DurableExportHost) legacyEnabled() error {
	if h == nil || h.cfg.LegacyAdoption == nil || h.cfg.Webhooks == nil || h.Webhooks == nil {
		return durableExportInvalid("legacy adoption requires explicit host policies and durable webhooks")
	}
	return nil
}

// legacyTransaction reuses the current trusted transaction and invokes policy
// before metadata access. Result values must be returned only after commit.
func (h *DurableExportHost) legacyTransaction(ctx context.Context, a export.Actor, id, profile string, fn func(context.Context, bun.Tx) error) error {
	if h == nil {
		return durableExportInvalid("legacy host required")
	}
	ctx, release, _, gateErr := h.cfg.RecoveryGate.enter(ctx)
	if gateErr != nil {
		return gateErr
	}
	defer release()
	if e := h.legacyEnabled(); e != nil {
		return e
	}
	if a.ID == "" {
		return durableExportDenied()
	}
	if !validLegacyRef(id) || !validLegacyRef(profile) {
		return durableExportInvalid("legacy export and versioned profile required")
	}
	called := false
	e := h.cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
		if called {
			return durableExportInvalid("legacy transaction callback repeated")
		}
		called = true
		if e := h.cfg.LegacyAdoption.Authorize(ctx, tx, a, id, profile); e != nil {
			return e
		}
		return fn(ctx, tx)
	})
	if e == nil && !called {
		return durableExportInvalid("legacy transaction callback not invoked")
	}
	return e
}
func (h *DurableExportHost) legacyRead(ctx context.Context, tx bun.Tx, a export.Actor, id, profile string) (export.ExportRecord, deliverybun.ScheduleRequest, LegacyExportReview, error) {
	var review LegacyExportReview
	// Lock before reading the canonical executable request and mutable state.
	var locked struct {
		ID             string
		RequestPayload []byte
	}
	q := tx.NewSelect().Table("export_records").Column("id", "request_payload").Where("id=?", id)
	if h.cfg.DB.Dialect().Name() == dialect.PG {
		q = q.For("UPDATE")
	}
	if e := q.Scan(ctx, &locked); e != nil {
		return export.ExportRecord{}, deliverybun.ScheduleRequest{}, review, e
	}
	rec, e := h.Tracker.WithTx(tx).Status(ctx, id)
	if e != nil {
		return rec, deliverybun.ScheduleRequest{}, review, e
	}
	if e = h.cfg.Guard.AuthorizeDownload(ctx, a, id); e != nil {
		return rec, deliverybun.ScheduleRequest{}, review, e
	}
	if rec.State == export.StateQueued {
		if e = legacyRequestReplaySafe(locked.RequestPayload, rec.Request); e != nil {
			return rec, deliverybun.ScheduleRequest{}, review, e
		}
	}
	req, e := h.cfg.LegacyAdoption.Select(ctx, tx, a, rec, profile)
	if e != nil {
		return rec, req, review, e
	}
	req, pd, e := legacyPlan(rec, req)
	if e != nil {
		return rec, req, review, e
	}
	for _, t := range req.Targets {
		if e = h.cfg.Webhooks.AuthorizeTarget(ctx, a, id, t); e != nil {
			return rec, req, review, e
		}
	}
	pd, e = legacyProfileDigest(profile, pd)
	if e != nil {
		return rec, req, review, e
	}
	rd, e := legacyRecordDigest(rec, locked.RequestPayload)
	return rec, req, LegacyExportReview{ExportID: id, ProfileRef: profile, State: rec.State, RecordSHA256: rd, PlanSHA256: pd}, e
}

// PreviewLegacyExport exposes only digests/references, never credential bytes.
// The operator must fence old workers and review the returned record/plan pair.
func (h *DurableExportHost) PreviewLegacyExport(ctx context.Context, a export.Actor, id, profile string) (LegacyExportReview, error) {
	var review LegacyExportReview
	e := h.legacyTransaction(ctx, a, id, profile, func(ctx context.Context, tx bun.Tx) error {
		rec, _, r, e := h.legacyRead(ctx, tx, a, id, profile)
		if e != nil {
			return e
		}
		if rec.State != export.StateQueued && rec.State != export.StateCompleted {
			return durableExportInvalid("legacy queued or completed record required")
		}
		review = r
		return nil
	})
	if e != nil {
		return LegacyExportReview{}, e
	}
	return review, nil
}
func (h *DurableExportHost) legacyArtifact(ctx context.Context, rec export.ExportRecord) error {
	if rec.Artifact.Key == "" {
		return durableExportInvalid("retained completed artifact required")
	}
	reader, meta, e := h.replay.Service.Store.Open(ctx, rec.Artifact.Key)
	if e != nil {
		return e
	}
	if e = reader.Close(); e != nil {
		return e
	}
	if meta != rec.Artifact.Meta {
		return durableExportInvalid("legacy artifact metadata mismatch")
	}
	return nil
}
func (h *DurableExportHost) legacyDelivery(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, req deliverybun.ScheduleRequest) ([]delivery.WebhookReceipt, error) {
	cfg := deliverybun.Config{DB: h.cfg.DB, Queue: h.Queue, Sender: h.cfg.Webhooks.Sender, Namespace: h.cfg.Namespace, AuthorizeTarget: h.cfg.Webhooks.AuthorizeTarget, Link: h.cfg.Webhooks.Link, Now: h.cfg.Now,
		Authorize: func(ctx context.Context, actor export.Actor, id string) (context.Context, error) {
			return ctx, h.cfg.AuthorizeRecordTransaction(ctx, tx, actor, id)
		},
		WithAuthorizedTransaction: func(ctx context.Context, actor export.Actor, id string, fn func(context.Context, bun.Tx, export.ExportRecord) error) error {
			if actor.ID != a.ID || actor.Scope != a.Scope || id != rec.ID {
				return durableExportDenied()
			}
			if e := h.cfg.AuthorizeRecordTransaction(ctx, tx, actor, id); e != nil {
				return e
			}
			return fn(ctx, tx, rec)
		}}
	svc, e := deliverybun.NewService(cfg)
	if e != nil {
		return nil, e
	}
	return svc.Schedule(ctx, a, req)
}
func (h *DurableExportHost) legacyReplay(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, req deliverybun.ScheduleRequest, row legacyExportReceipt) error {
	if e := h.cfg.AuthorizeRecordTransaction(ctx, tx, a, rec.ID); e != nil {
		return e
	}
	if row.State == export.StateQueued {
		return h.legacyQueuedReplay(ctx, tx, a, rec, req, row)
	}
	if e := h.legacyArtifact(ctx, rec); e != nil {
		return e
	}
	var ids []string
	if e := json.Unmarshal([]byte(row.ReceiptIDs), &ids); e != nil || len(ids) != len(req.Targets) {
		return durableExportInvalid("retained legacy receipts invalid")
	}
	count, e := tx.NewSelect().Table("export_webhook_targets").Where("export_id=?", rec.ID).Where("id IN (?)", bun.List(ids)).Count(ctx)
	if e != nil {
		return e
	}
	if count != len(ids) {
		return durableExportInvalid("retained legacy receipts incomplete")
	}
	_, e = h.legacyDelivery(ctx, tx, a, rec, req)
	return e
}

func (h *DurableExportHost) legacyQueuedReplay(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, req deliverybun.ScheduleRequest, row legacyExportReceipt) error {
	var plan struct {
		Namespace, Owner, Request, Digest string
		PublishedAt                       time.Time
	}
	if e := tx.NewSelect().Table("export_webhook_completion_plans").Column("namespace", "owner", "request", "digest", "published_at").Where("export_id=?", rec.ID).Scan(ctx, &plan); e != nil {
		return e
	}
	owner, e := legacyDigest(struct {
		ID    string
		Scope export.Scope
	}{a.ID, a.Scope})
	if e != nil {
		return e
	}
	digest := delivery.PayloadDigest([]byte(plan.Request))
	storedDigest, e := legacyProfileDigest(row.ProfileRef, digest)
	if e != nil {
		return e
	}
	if plan.Namespace != row.Namespace || plan.Owner != owner || plan.Digest != digest || storedDigest != row.PlanSHA256 {
		return durableExportInvalid("retained legacy completion plan mismatch")
	}
	if rec.State == export.StateQueued && !plan.PublishedAt.IsZero() {
		return durableExportInvalid("queued legacy export has a premature publication marker")
	}
	if rec.State == export.StateCompleted {
		if plan.PublishedAt.IsZero() {
			return durableExportInvalid("retained legacy publication marker required")
		}
		if e = h.legacyArtifact(ctx, rec); e != nil {
			return e
		}
		return h.legacyPublishedReplay(ctx, tx, a, rec, req, row.Namespace, owner)
	}
	return nil
}

// A queued adoption has no target IDs in its original receipt. Once completed,
// require the native operation and full target set before invoking Schedule's
// idempotent replay; otherwise Schedule could recreate a pruned publication.
func (h *DurableExportHost) legacyPublishedReplay(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, req deliverybun.ScheduleRequest, namespace, owner string) error {
	signature, err := legacyDigest(req)
	if err != nil {
		return err
	}
	ids := make([]string, 0, len(req.Targets))
	for _, target := range req.Targets {
		ids = append(ids, target.ID)
	}
	count, err := tx.NewSelect().TableExpr("export_webhook_targets AS t").
		Join("JOIN export_webhook_operations AS o ON o.id=t.operation_id").
		Where("t.export_id=? AND t.namespace=? AND t.owner=?", rec.ID, namespace, owner).
		Where("t.target_id IN (?)", bun.List(ids)).Where("o.signature=?", signature).Count(ctx)
	if err != nil {
		return err
	}
	if count != len(req.Targets) {
		return durableExportInvalid("retained legacy publication incomplete")
	}
	_, err = h.legacyDelivery(ctx, tx, a, rec, req)
	return err
}

// AdoptLegacyExport applies the reviewed pair atomically. Existing plans and
// delivery identities are never rebound to another profile or credential set.
func (h *DurableExportHost) AdoptLegacyExport(ctx context.Context, a export.Actor, r LegacyExportAdoptionRequest) (LegacyExportAdoptionResult, error) {
	if err := r.Validate(); err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	var result LegacyExportAdoptionResult
	err := h.legacyTransaction(ctx, a, r.ExportID, r.ProfileRef, func(ctx context.Context, tx bun.Tx) error {
		var applyErr error
		result, applyErr = h.adoptLegacyExportTx(ctx, tx, a, r)
		return applyErr
	})
	if err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	return result, nil
}

func (h *DurableExportHost) adoptLegacyExportTx(ctx context.Context, tx bun.Tx, a export.Actor, r LegacyExportAdoptionRequest) (LegacyExportAdoptionResult, error) {
	rec, plan, review, err := h.legacyRead(ctx, tx, a, r.ExportID, r.ProfileRef)
	if err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	ns, err := h.cfg.Namespace(ctx, a)
	if err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	if ns == "" {
		return LegacyExportAdoptionResult{}, durableExportDenied()
	}
	row := legacyExportReceipt{ExportID: rec.ID}
	err = tx.NewSelect().Model(&row).WherePK().Scan(ctx)
	if err == nil {
		if !legacyReceiptMatches(row, ns, a, r, review) {
			return LegacyExportAdoptionResult{}, durableExportInvalid("legacy adoption replay conflict")
		}
		// A still-queued record must retain the original reviewed input.
		if row.State == export.StateQueued && rec.State == export.StateQueued && row.RecordSHA256 != review.RecordSHA256 {
			return LegacyExportAdoptionResult{}, durableExportInvalid("retained queued legacy record changed after adoption")
		}
		if err = h.legacyReplay(ctx, tx, a, rec, plan, row); err != nil {
			return LegacyExportAdoptionResult{}, err
		}
		return LegacyExportAdoptionResult{ExportID: rec.ID, ProfileRef: row.ProfileRef, State: row.State, Replayed: true}, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return LegacyExportAdoptionResult{}, err
	}
	return h.adoptUnclaimedLegacyExport(ctx, tx, a, r, rec, plan, review, ns)
}

func legacyReceiptMatches(row legacyExportReceipt, namespace string, actor export.Actor, request LegacyExportAdoptionRequest, review LegacyExportReview) bool {
	return row.Namespace == namespace && row.ActorID == actor.ID && row.TenantID == actor.Scope.TenantID && row.WorkspaceID == actor.Scope.WorkspaceID && row.ProfileRef == request.ProfileRef && row.RecordSHA256 == request.RecordSHA256 && row.PlanSHA256 == request.PlanSHA256 && review.PlanSHA256 == request.PlanSHA256
}

func (h *DurableExportHost) adoptUnclaimedLegacyExport(ctx context.Context, tx bun.Tx, a export.Actor, r LegacyExportAdoptionRequest, rec export.ExportRecord, plan deliverybun.ScheduleRequest, review LegacyExportReview, namespace string) (LegacyExportAdoptionResult, error) {
	if review.RecordSHA256 != r.RecordSHA256 || review.PlanSHA256 != r.PlanSHA256 {
		return LegacyExportAdoptionResult{}, durableExportInvalid("legacy adoption review is stale")
	}
	if rec.State != export.StateQueued && rec.State != export.StateCompleted {
		return LegacyExportAdoptionResult{}, durableExportInvalid("legacy queued or completed record required")
	}
	if err := checkLegacyNotificationIntent(ctx, tx, rec.ID); err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	if err := h.authorizeLegacyAdoption(ctx, a, rec); err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	if err := h.retainLegacyOwner(ctx, tx, a, rec, namespace); err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	receiptIDs, err := h.publishLegacyAdoption(ctx, tx, a, rec, plan)
	if err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	raw, err := json.Marshal(receiptIDs)
	if err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	row := legacyExportReceipt{ExportID: rec.ID, Namespace: namespace, ActorID: a.ID, TenantID: a.Scope.TenantID, WorkspaceID: a.Scope.WorkspaceID, ProfileRef: r.ProfileRef, RecordSHA256: r.RecordSHA256, PlanSHA256: r.PlanSHA256, State: rec.State, ReceiptIDs: string(raw), AdoptedAt: h.cfg.Now()}
	if row.AdoptedAt.IsZero() {
		return LegacyExportAdoptionResult{}, durableExportInvalid("legacy adoption clock required")
	}
	if _, err = tx.NewInsert().Model(&row).Exec(ctx); err != nil {
		return LegacyExportAdoptionResult{}, err
	}
	return LegacyExportAdoptionResult{ExportID: rec.ID, ProfileRef: r.ProfileRef, State: rec.State}, nil
}

func checkLegacyNotificationIntent(ctx context.Context, tx bun.Tx, exportID string) error {
	for _, table := range []string{"export_webhook_completion_plans", "export_webhook_targets"} {
		count, err := tx.NewSelect().Table(table).Where("export_id=?", exportID).Count(ctx)
		if err != nil {
			return err
		}
		if count != 0 {
			return durableExportInvalid("existing notification intent cannot be adopted or replaced")
		}
	}
	return nil
}

func (h *DurableExportHost) authorizeLegacyAdoption(ctx context.Context, a export.Actor, rec export.ExportRecord) error {
	if rec.State != export.StateQueued {
		return h.legacyArtifact(ctx, rec)
	}
	if rec.Request.Definition == "" {
		return durableExportInvalid("retained queued request required")
	}
	definition, err := h.Bundle.Runner.Definitions.Resolve(rec.Request)
	if err != nil {
		return err
	}
	for _, guard := range []export.Guard{h.cfg.Guard, h.Bundle.Runner.Guard} {
		if guard == nil {
			continue
		}
		if err = guard.AuthorizeExport(ctx, a, rec.Request, definition); err != nil {
			return err
		}
	}
	return nil
}

func (h *DurableExportHost) retainLegacyOwner(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, namespace string) error {
	owner := durableExportOwner{ExportID: rec.ID, Namespace: namespace, ActorID: a.ID, TenantID: a.Scope.TenantID, WorkspaceID: a.Scope.WorkspaceID}
	if _, err := tx.NewInsert().Model(&owner).On("CONFLICT (export_id) DO NOTHING").Exec(ctx); err != nil {
		return err
	}
	var retained durableExportOwner
	if err := tx.NewSelect().Model(&retained).Where("export_id=?", rec.ID).Scan(ctx); err != nil {
		return err
	}
	if retained.ExportID != owner.ExportID || retained.Namespace != owner.Namespace || retained.ActorID != owner.ActorID || retained.TenantID != owner.TenantID || retained.WorkspaceID != owner.WorkspaceID {
		return durableExportDenied()
	}
	if err := h.cfg.AcceptBackground(ctx, tx, a, rec); err != nil {
		return err
	}
	return h.cfg.AuthorizeRecordTransaction(ctx, tx, a, rec.ID)
}

func (h *DurableExportHost) publishLegacyAdoption(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, plan deliverybun.ScheduleRequest) ([]string, error) {
	if rec.State == export.StateQueued {
		return nil, h.enqueueLegacyAdoption(ctx, tx, a, rec, plan)
	}
	receipts, err := h.legacyDelivery(ctx, tx, a, rec, plan)
	if err != nil {
		return nil, err
	}
	var ids []string
	for _, receipt := range receipts {
		ids = append(ids, receipt.ID)
	}
	return ids, nil
}

func (h *DurableExportHost) enqueueLegacyAdoption(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, plan deliverybun.ScheduleRequest) error {
	publisher, err := deliverybun.NewCompletionPublisher(deliverybun.CompletionConfig{Delivery: h.Webhooks, AuthorizeTransaction: h.cfg.AuthorizeRecordTransaction, Select: func(context.Context, export.Actor, export.ExportRecord) (deliverybun.ScheduleRequest, error) {
		return plan, nil
	}})
	if err != nil {
		return err
	}
	if err = publisher.OnQueued(ctx, tx, a, rec); err != nil {
		return err
	}
	payload, err := json.Marshal(exportjob.Payload{ExportID: rec.ID, Actor: export.Actor{ID: a.ID, Scope: a.Scope}, Request: rec.Request})
	if err != nil {
		return err
	}
	_, err = h.Queue.EnqueueTx(ctx, tx.Tx, &job.ExecutionMessage{JobID: exportjob.DefaultGenerateTaskID, ScriptPath: exportjob.DefaultGenerateTaskPath, IdempotencyKey: rec.ID, Parameters: map[string]any{"payload": json.RawMessage(payload)}}, h.cfg.Now())
	return err
}
