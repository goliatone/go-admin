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
		var body string
		if e := tx.NewSelect().Table("export_webhook_completion_plans").Column("request").Where("export_id=?", rec.ID).Scan(ctx, &body); e != nil {
			return e
		}
		storedDigest, e := legacyProfileDigest(row.ProfileRef, delivery.PayloadDigest([]byte(body)))
		if e != nil {
			return e
		}
		if storedDigest != row.PlanSHA256 {
			return durableExportInvalid("retained legacy completion plan mismatch")
		}
		return nil
	}
	if e := h.legacyArtifact(ctx, rec); e != nil {
		return e
	}
	var ids []string
	if e := json.Unmarshal([]byte(row.ReceiptIDs), &ids); e != nil || len(ids) != len(req.Targets) {
		return durableExportInvalid("retained legacy receipts invalid")
	}
	count, e := tx.NewSelect().Table("export_webhook_targets").Where("export_id=?", rec.ID).Where("id IN (?)", bun.In(ids)).Count(ctx)
	if e != nil {
		return e
	}
	if count != len(ids) {
		return durableExportInvalid("retained legacy receipts incomplete")
	}
	_, e = h.legacyDelivery(ctx, tx, a, rec, req)
	return e
}

// AdoptLegacyExport applies the reviewed pair atomically. Existing plans and
// delivery identities are never rebound to another profile or credential set.
func (h *DurableExportHost) AdoptLegacyExport(ctx context.Context, a export.Actor, r LegacyExportAdoptionRequest) (LegacyExportAdoptionResult, error) {
	if e := r.Validate(); e != nil {
		return LegacyExportAdoptionResult{}, e
	}
	var result LegacyExportAdoptionResult
	e := h.legacyTransaction(ctx, a, r.ExportID, r.ProfileRef, func(ctx context.Context, tx bun.Tx) error {
		rec, plan, review, e := h.legacyRead(ctx, tx, a, r.ExportID, r.ProfileRef)
		if e != nil {
			return e
		}
		ns, e := h.cfg.Namespace(ctx, a)
		if e != nil {
			return e
		}
		if ns == "" {
			return durableExportDenied()
		}
		row := legacyExportReceipt{ExportID: rec.ID}
		e = tx.NewSelect().Model(&row).WherePK().Scan(ctx)
		if e == nil {
			if row.Namespace != ns || row.ActorID != a.ID || row.TenantID != a.Scope.TenantID || row.WorkspaceID != a.Scope.WorkspaceID || row.ProfileRef != r.ProfileRef || row.RecordSHA256 != r.RecordSHA256 || row.PlanSHA256 != r.PlanSHA256 || review.PlanSHA256 != r.PlanSHA256 {
				return durableExportInvalid("legacy adoption replay conflict")
			}
			if e = h.legacyReplay(ctx, tx, a, rec, plan, row); e != nil {
				return e
			}
			result = LegacyExportAdoptionResult{ExportID: rec.ID, ProfileRef: row.ProfileRef, State: row.State, Replayed: true}
			return nil
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		if review.RecordSHA256 != r.RecordSHA256 || review.PlanSHA256 != r.PlanSHA256 {
			return durableExportInvalid("legacy adoption review is stale")
		}
		if rec.State != export.StateQueued && rec.State != export.StateCompleted {
			return durableExportInvalid("legacy queued or completed record required")
		}
		for _, table := range []string{"export_webhook_completion_plans", "export_webhook_targets"} {
			count, e := tx.NewSelect().Table(table).Where("export_id=?", rec.ID).Count(ctx)
			if e != nil {
				return e
			}
			if count != 0 {
				return durableExportInvalid("existing notification intent cannot be adopted or replaced")
			}
		}
		if rec.State == export.StateQueued {
			if rec.Request.Definition == "" {
				return durableExportInvalid("retained queued request required")
			}
			def, e := h.Bundle.Runner.Definitions.Resolve(rec.Request)
			if e != nil {
				return e
			}
			for _, guard := range []export.Guard{h.cfg.Guard, h.Bundle.Runner.Guard} {
				if guard != nil {
					if e = guard.AuthorizeExport(ctx, a, rec.Request, def); e != nil {
						return e
					}
				}
			}
		} else if e = h.legacyArtifact(ctx, rec); e != nil {
			return e
		}
		owner := durableExportOwner{ExportID: rec.ID, Namespace: ns, ActorID: a.ID, TenantID: a.Scope.TenantID, WorkspaceID: a.Scope.WorkspaceID}
		if _, e = tx.NewInsert().Model(&owner).On("CONFLICT (export_id) DO NOTHING").Exec(ctx); e != nil {
			return e
		}
		var retained durableExportOwner
		if e = tx.NewSelect().Model(&retained).Where("export_id=?", rec.ID).Scan(ctx); e != nil {
			return e
		}
		if retained.ExportID != owner.ExportID || retained.Namespace != owner.Namespace || retained.ActorID != owner.ActorID || retained.TenantID != owner.TenantID || retained.WorkspaceID != owner.WorkspaceID {
			return durableExportDenied()
		}
		if e = h.cfg.AcceptBackground(ctx, tx, a, rec); e != nil {
			return e
		}
		if e = h.cfg.AuthorizeRecordTransaction(ctx, tx, a, rec.ID); e != nil {
			return e
		}
		var receiptIDs []string
		if rec.State == export.StateQueued {
			publisher, e := deliverybun.NewCompletionPublisher(deliverybun.CompletionConfig{Delivery: h.Webhooks, AuthorizeTransaction: h.cfg.AuthorizeRecordTransaction, Select: func(context.Context, export.Actor, export.ExportRecord) (deliverybun.ScheduleRequest, error) {
				return plan, nil
			}})
			if e != nil {
				return e
			}
			if e = publisher.OnQueued(ctx, tx, a, rec); e != nil {
				return e
			}
			payload, e := json.Marshal(exportjob.Payload{ExportID: rec.ID, Actor: export.Actor{ID: a.ID, Scope: a.Scope}, Request: rec.Request})
			if e != nil {
				return e
			}
			if _, e = h.Queue.EnqueueTx(ctx, tx.Tx, &job.ExecutionMessage{JobID: exportjob.DefaultGenerateTaskID, ScriptPath: exportjob.DefaultGenerateTaskPath, IdempotencyKey: rec.ID, Parameters: map[string]any{"payload": json.RawMessage(payload)}}, h.cfg.Now()); e != nil {
				return e
			}
		} else {
			receipts, e := h.legacyDelivery(ctx, tx, a, rec, plan)
			if e != nil {
				return e
			}
			for _, r := range receipts {
				receiptIDs = append(receiptIDs, r.ID)
			}
		}
		raw, e := json.Marshal(receiptIDs)
		if e != nil {
			return e
		}
		row = legacyExportReceipt{ExportID: rec.ID, Namespace: ns, ActorID: a.ID, TenantID: a.Scope.TenantID, WorkspaceID: a.Scope.WorkspaceID, ProfileRef: r.ProfileRef, RecordSHA256: r.RecordSHA256, PlanSHA256: r.PlanSHA256, State: rec.State, ReceiptIDs: string(raw), AdoptedAt: h.cfg.Now()}
		if row.AdoptedAt.IsZero() {
			return durableExportInvalid("legacy adoption clock required")
		}
		if _, e = tx.NewInsert().Model(&row).Exec(ctx); e != nil {
			return e
		}
		result = LegacyExportAdoptionResult{ExportID: rec.ID, ProfileRef: r.ProfileRef, State: rec.State}
		return nil
	})
	if e != nil {
		return LegacyExportAdoptionResult{}, e
	}
	return result, nil
}
