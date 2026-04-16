package esignsync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	gosynccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	"github.com/goliatone/go-admin/pkg/go-sync/store"
	httptransport "github.com/goliatone/go-admin/pkg/go-sync/transport/http"
	goerrors "github.com/goliatone/go-errors"
	"github.com/google/uuid"
)

const (
	ResourceKindAgreementDraft = "agreement_draft"
	OperationAutosave          = "autosave"
	OperationSend              = "send"
	OperationStartReview       = "start_review"
	OperationDispose           = "dispose"
	replayStoredEventType      = "draft.sync.replay_stored"
)

type AgreementDraftWorkflow interface {
	Create(ctx context.Context, scope stores.Scope, input services.DraftCreateInput) (stores.DraftRecord, bool, error)
	Get(ctx context.Context, scope stores.Scope, id, createdByUserID string) (stores.DraftRecord, error)
	Update(ctx context.Context, scope stores.Scope, id string, input services.DraftUpdateInput) (stores.DraftRecord, error)
	Delete(ctx context.Context, scope stores.Scope, id, createdByUserID string) error
	Send(ctx context.Context, scope stores.Scope, id string, input services.DraftSendInput) (services.DraftSendResult, error)
	StartReview(ctx context.Context, scope stores.Scope, id string, input services.DraftStartReviewInput) (services.DraftStartReviewResult, error)
}

type AgreementDraftBootstrapPayload struct {
	ResourceRef gosynccore.ResourceRef     `json:"resource_ref"`
	Draft       httptransport.ReadResponse `json:"draft"`
	WizardID    string                     `json:"wizard_id"`
}

type AgreementDraftBootstrapper struct {
	workflow AgreementDraftWorkflow
	now      func() time.Time
	newID    func() string
}

func NewAgreementDraftBootstrapper(workflow AgreementDraftWorkflow) *AgreementDraftBootstrapper {
	return &AgreementDraftBootstrapper{
		workflow: workflow,
		now:      func() time.Time { return time.Now().UTC() },
		newID: func() string {
			return "wizard_" + strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))
		},
	}
}

func (b *AgreementDraftBootstrapper) Bootstrap(ctx context.Context, scope stores.Scope, actorID string) (AgreementDraftBootstrapPayload, error) {
	if b == nil || b.workflow == nil {
		return AgreementDraftBootstrapPayload{}, fmt.Errorf("agreement draft bootstrapper is not configured")
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return AgreementDraftBootstrapPayload{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "actor id is required", map[string]any{
			"field": "actor_id",
		})
	}

	wizardID := b.newID()
	createdAt := b.now().UTC().Format(time.RFC3339Nano)
	record, _, err := b.workflow.Create(ctx, scope, services.DraftCreateInput{
		WizardID:        wizardID,
		WizardState:     initialWizardState(wizardID, createdAt),
		Title:           "",
		CurrentStep:     1,
		CreatedByUserID: actorID,
	})
	if err != nil {
		return AgreementDraftBootstrapPayload{}, err
	}

	resourceScope := buildResourceScope(scope, actorID)
	snapshot, err := snapshotFromDraftRecord(record, resourceScope)
	if err != nil {
		return AgreementDraftBootstrapPayload{}, err
	}
	return AgreementDraftBootstrapPayload{
		ResourceRef: snapshot.ResourceRef,
		Draft:       httptransport.ReadResponseFromSnapshot(snapshot),
		WizardID:    wizardID,
	}, nil
}

type AgreementDraftResourceStore struct {
	workflow AgreementDraftWorkflow
	now      func() time.Time
}

var _ store.ResourceStore = (*AgreementDraftResourceStore)(nil)

func NewAgreementDraftResourceStore(workflow AgreementDraftWorkflow) *AgreementDraftResourceStore {
	return &AgreementDraftResourceStore{
		workflow: workflow,
		now:      func() time.Time { return time.Now().UTC() },
	}
}

func (s *AgreementDraftResourceStore) Get(ctx context.Context, ref gosynccore.ResourceRef) (gosynccore.Snapshot, error) {
	if s == nil || s.workflow == nil {
		return gosynccore.Snapshot{}, gosynccore.NewError(gosynccore.CodeTemporaryFailure, "agreement draft workflow is required", nil)
	}
	scope, actorID, err := resolveScopedActor(ref.Scope)
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	err = validateResourceKind(ref.Kind)
	if err != nil {
		return gosynccore.Snapshot{}, err
	}

	record, err := s.workflow.Get(ctx, scope, strings.TrimSpace(ref.ID), actorID)
	if err != nil {
		return gosynccore.Snapshot{}, s.mapWorkflowError(ctx, ref, actorID, err)
	}
	return snapshotFromDraftRecord(record, buildResourceScope(scope, actorID))
}

func (s *AgreementDraftResourceStore) Mutate(ctx context.Context, input gosynccore.MutationInput) (gosynccore.Snapshot, error) {
	if s == nil || s.workflow == nil {
		return gosynccore.Snapshot{}, gosynccore.NewError(gosynccore.CodeTemporaryFailure, "agreement draft workflow is required", nil)
	}
	scope, actorID, err := resolveScopedActor(input.ResourceRef.Scope)
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	if actorID == "" {
		actorID = strings.TrimSpace(input.ActorID)
	}
	if actorID == "" {
		return gosynccore.Snapshot{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "actor id is required", map[string]any{
			"field": "actor_id",
		})
	}
	if err := validateResourceKind(input.ResourceRef.Kind); err != nil {
		return gosynccore.Snapshot{}, err
	}
	resourceID := strings.TrimSpace(input.ResourceRef.ID)

	switch strings.ToLower(strings.TrimSpace(input.Operation)) {
	case OperationAutosave:
		return s.mutateAutosave(ctx, input, scope, actorID, resourceID)
	case OperationSend:
		return s.mutateSend(ctx, input, scope, actorID, resourceID)
	case OperationStartReview:
		return s.mutateStartReview(ctx, input, scope, actorID, resourceID)
	case OperationDispose:
		if err := s.workflow.Delete(ctx, scope, resourceID, actorID); err != nil {
			return gosynccore.Snapshot{}, s.mapWorkflowError(ctx, input.ResourceRef, actorID, err)
		}
		return snapshotFromDisposeResult(input.ResourceRef, buildResourceScope(scope, actorID), input.ExpectedRevision+1, s.now().UTC())
	default:
		return gosynccore.Snapshot{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "unsupported agreement draft operation", map[string]any{
			"operation": strings.TrimSpace(input.Operation),
		})
	}
}

func (s *AgreementDraftResourceStore) mutateAutosave(ctx context.Context, input gosynccore.MutationInput, scope stores.Scope, actorID, resourceID string) (gosynccore.Snapshot, error) {
	payload, err := decodeAutosavePayload(input.Payload)
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	record, err := s.workflow.Update(ctx, scope, resourceID, services.DraftUpdateInput{
		ExpectedRevision: input.ExpectedRevision,
		WizardState:      payload.WizardState,
		Title:            payload.title(),
		CurrentStep:      payload.currentStep(),
		DocumentID:       payload.DocumentID,
		UpdatedByUserID:  actorID,
	})
	if err != nil {
		return gosynccore.Snapshot{}, s.mapWorkflowError(ctx, input.ResourceRef, actorID, err)
	}
	return snapshotFromDraftRecord(record, buildResourceScope(scope, actorID))
}

func (s *AgreementDraftResourceStore) mutateSend(ctx context.Context, input gosynccore.MutationInput, scope stores.Scope, actorID, resourceID string) (gosynccore.Snapshot, error) {
	return s.mutateWorkflowTransition(ctx, input, scope, actorID, resourceID, OperationSend)
}

func (s *AgreementDraftResourceStore) mutateStartReview(ctx context.Context, input gosynccore.MutationInput, scope stores.Scope, actorID, resourceID string) (gosynccore.Snapshot, error) {
	return s.mutateWorkflowTransition(ctx, input, scope, actorID, resourceID, OperationStartReview)
}

type draftWorkflowTransitionInput struct {
	ExpectedRevision int64
	NextRevision     int64
	IPAddress        string
	CorrelationID    string
	IdempotencyKey   string
	CreatedAt        time.Time
}

func (s *AgreementDraftResourceStore) mutateWorkflowTransition(
	ctx context.Context,
	input gosynccore.MutationInput,
	scope stores.Scope,
	actorID, resourceID string,
	operation string,
) (gosynccore.Snapshot, error) {
	transitionInput := draftWorkflowTransitionInput{
		ExpectedRevision: input.ExpectedRevision,
		NextRevision:     input.ExpectedRevision + 1,
		IPAddress:        strings.TrimSpace(fmt.Sprint(copyAnyMap(input.Metadata)["ip_address"])),
		CorrelationID:    strings.TrimSpace(input.CorrelationID),
		IdempotencyKey:   strings.TrimSpace(input.IdempotencyKey),
		CreatedAt:        s.now().UTC(),
	}
	snapshot, err := s.runWorkflowTransition(ctx, input.ResourceRef, scope, actorID, resourceID, operation, transitionInput)
	if err != nil {
		return gosynccore.Snapshot{}, s.mapWorkflowError(ctx, input.ResourceRef, actorID, err)
	}
	return snapshot, nil
}

func (s *AgreementDraftResourceStore) runWorkflowTransition(
	ctx context.Context,
	ref gosynccore.ResourceRef,
	scope stores.Scope,
	actorID, resourceID, operation string,
	input draftWorkflowTransitionInput,
) (gosynccore.Snapshot, error) {
	resourceScope := buildResourceScope(scope, actorID)
	switch operation {
	case OperationSend:
		result, err := s.workflow.Send(ctx, scope, resourceID, services.DraftSendInput{
			ExpectedRevision: input.ExpectedRevision,
			CreatedByUserID:  actorID,
			IPAddress:        input.IPAddress,
			CorrelationID:    input.CorrelationID,
			IdempotencyKey:   input.IdempotencyKey,
		})
		if err != nil {
			return gosynccore.Snapshot{}, err
		}
		return snapshotFromSendResult(ref, resourceScope, result, input.NextRevision, input.CreatedAt)
	case OperationStartReview:
		result, err := s.workflow.StartReview(ctx, scope, resourceID, services.DraftStartReviewInput{
			ExpectedRevision: input.ExpectedRevision,
			CreatedByUserID:  actorID,
			IPAddress:        input.IPAddress,
			CorrelationID:    input.CorrelationID,
			IdempotencyKey:   input.IdempotencyKey,
		})
		if err != nil {
			return gosynccore.Snapshot{}, err
		}
		return snapshotFromStartReviewResult(ref, resourceScope, result, input.NextRevision, input.CreatedAt)
	default:
		return gosynccore.Snapshot{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "unsupported agreement draft operation", map[string]any{
			"operation": strings.TrimSpace(operation),
		})
	}
}

func (s *AgreementDraftResourceStore) mapWorkflowError(ctx context.Context, ref gosynccore.ResourceRef, actorID string, err error) error {
	if err == nil {
		return nil
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) && coded != nil {
		textCode := strings.ToLower(strings.TrimSpace(coded.TextCode))
		switch textCode {
		case "not_found", "draft_send_not_found":
			return gosynccore.NewWrappedError(gosynccore.CodeNotFound, "resource not found", copyAnyMap(coded.Metadata), err)
		case "stale_revision", "version_conflict":
			currentRevision := int64Metadata(coded.Metadata, "current_revision")
			latest := s.latestSnapshot(ctx, ref, actorID)
			return gosynccore.NewStaleRevisionError(currentRevision, latest)
		case "missing_required_fields", "validation_failed":
			return gosynccore.NewWrappedError(gosynccore.CodeInvalidMutation, "invalid mutation", copyAnyMap(coded.Metadata), err)
		}
		switch coded.Category {
		case goerrors.CategoryNotFound:
			return gosynccore.NewWrappedError(gosynccore.CodeNotFound, "resource not found", copyAnyMap(coded.Metadata), err)
		case goerrors.CategoryValidation:
			return gosynccore.NewWrappedError(gosynccore.CodeInvalidMutation, "invalid mutation", copyAnyMap(coded.Metadata), err)
		case goerrors.CategoryConflict:
			currentRevision := int64Metadata(coded.Metadata, "current_revision")
			latest := s.latestSnapshot(ctx, ref, actorID)
			return gosynccore.NewStaleRevisionError(currentRevision, latest)
		}
	}
	return gosynccore.NewWrappedError(gosynccore.CodeTemporaryFailure, "agreement draft sync failed", nil, err)
}

func (s *AgreementDraftResourceStore) latestSnapshot(ctx context.Context, ref gosynccore.ResourceRef, actorID string) *gosynccore.Snapshot {
	scope, _, err := resolveScopedActor(ref.Scope)
	if err != nil {
		return nil
	}
	record, loadErr := s.workflow.Get(ctx, scope, strings.TrimSpace(ref.ID), actorID)
	if loadErr != nil {
		return nil
	}
	snapshot, snapshotErr := snapshotFromDraftRecord(record, buildResourceScope(scope, actorID))
	if snapshotErr != nil {
		return nil
	}
	return &snapshot
}

type AgreementDraftIdempotencyStore struct {
	mu      sync.Mutex
	audits  stores.DraftAuditEventStore
	now     func() time.Time
	pending map[string]reservationEntry
	results map[string]resultEntry
}

type reservationEntry struct {
	token     string
	expiresAt time.Time
}

type resultEntry struct {
	result    gosynccore.MutationResult
	expiresAt time.Time
}

var _ store.ReservingIdempotencyStore = (*AgreementDraftIdempotencyStore)(nil)
var _ store.CommitRecoveryStore = (*AgreementDraftIdempotencyStore)(nil)

func NewAgreementDraftIdempotencyStore(audits stores.DraftAuditEventStore) *AgreementDraftIdempotencyStore {
	return &AgreementDraftIdempotencyStore{
		audits:  audits,
		now:     func() time.Time { return time.Now().UTC() },
		pending: map[string]reservationEntry{},
		results: map[string]resultEntry{},
	}
}

func (s *AgreementDraftIdempotencyStore) Reserve(ctx context.Context, key string, ttl time.Duration) (store.IdempotencyReserveResult, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return store.IdempotencyReserveResult{}, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now().UTC()
	s.evictExpired(now)
	if entry, ok := s.results[key]; ok {
		result := entry.result
		return store.IdempotencyReserveResult{Result: &result}, nil
	}
	if replayed, ok, err := s.lookupPersistentReplay(ctx, key, ttl); err != nil {
		return store.IdempotencyReserveResult{}, err
	} else if ok {
		return store.IdempotencyReserveResult{Result: &replayed}, nil
	}
	if _, ok := s.pending[key]; ok {
		return store.IdempotencyReserveResult{Pending: true}, nil
	}

	reservation := store.IdempotencyReservation{
		Key:   key,
		Token: "reservation_" + strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", "")),
	}
	entry := reservationEntry{token: reservation.Token}
	if ttl > 0 {
		entry.expiresAt = now.Add(ttl)
	}
	s.pending[key] = entry
	return store.IdempotencyReserveResult{Reservation: &reservation}, nil
}

func (s *AgreementDraftIdempotencyStore) Commit(ctx context.Context, reservation store.IdempotencyReservation, result gosynccore.MutationResult, ttl time.Duration) error {
	key, token, err := s.validateReservation(reservation)
	if err != nil {
		return err
	}
	if s.shouldPersistReplayAudit(result) {
		if err := s.appendReplayAudit(ctx, key, result, ttl); err != nil {
			return err
		}
	}
	return s.cacheCommittedResult(key, token, result, ttl)
}

func (s *AgreementDraftIdempotencyStore) RecoverCommit(ctx context.Context, reservation store.IdempotencyReservation, result gosynccore.MutationResult, ttl time.Duration) error {
	key, token, err := s.validateReservation(reservation)
	if err != nil {
		return err
	}
	if s.shouldPersistReplayAudit(result) {
		if err := s.appendReplayAudit(ctx, key, result, ttl); err != nil {
			return err
		}
	}
	return s.cacheCommittedResult(key, token, result, ttl)
}

func (s *AgreementDraftIdempotencyStore) Release(_ context.Context, reservation store.IdempotencyReservation) error {
	key := strings.TrimSpace(reservation.Key)
	token := strings.TrimSpace(reservation.Token)
	if key == "" || token == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.pending[key]
	if ok && entry.token == token {
		delete(s.pending, key)
	}
	return nil
}

func (s *AgreementDraftIdempotencyStore) validateReservation(reservation store.IdempotencyReservation) (string, string, error) {
	key := strings.TrimSpace(reservation.Key)
	token := strings.TrimSpace(reservation.Token)
	if key == "" || token == "" {
		return "", "", fmt.Errorf("idempotency reservation is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.pending[key]
	if !ok || entry.token != token {
		return "", "", fmt.Errorf("idempotency reservation is invalid")
	}
	return key, token, nil
}

func (s *AgreementDraftIdempotencyStore) cacheCommittedResult(key, token string, result gosynccore.MutationResult, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.pending[key]
	if !ok || entry.token != token {
		return fmt.Errorf("idempotency reservation is invalid")
	}
	delete(s.pending, key)
	next := resultEntry{result: cloneMutationResult(result)}
	if ttl > 0 {
		next.expiresAt = s.now().UTC().Add(ttl)
	}
	s.results[key] = next
	return nil
}

func (s *AgreementDraftIdempotencyStore) appendReplayAudit(ctx context.Context, key string, result gosynccore.MutationResult, ttl time.Duration) error {
	if s == nil || s.audits == nil {
		return nil
	}
	scope, err := storesScopeFromResourceScope(result.Snapshot.ResourceRef.Scope)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"scoped_idempotency_key": key,
		"snapshot": map[string]any{
			"resource_ref": map[string]any{
				"kind":  strings.TrimSpace(result.Snapshot.ResourceRef.Kind),
				"id":    strings.TrimSpace(result.Snapshot.ResourceRef.ID),
				"scope": copyStringMap(result.Snapshot.ResourceRef.Scope),
			},
			"data":       mustDecodeRawJSON(result.Snapshot.Data),
			"revision":   result.Snapshot.Revision,
			"updated_at": result.Snapshot.UpdatedAt.UTC().Format(time.RFC3339Nano),
			"metadata":   copyAnyMap(result.Snapshot.Metadata),
		},
		"applied": result.Applied,
		"replay":  result.Replay,
	}
	if ttl > 0 {
		payload["expires_at"] = s.now().UTC().Add(ttl).Format(time.RFC3339Nano)
	}
	_, err = s.audits.AppendDraftEvent(ctx, scope, stores.DraftAuditEventRecord{
		DraftID:      strings.TrimSpace(result.Snapshot.ResourceRef.ID),
		EventType:    replayStoredEventType,
		ActorType:    "system",
		ActorID:      strings.TrimSpace(result.Snapshot.ResourceRef.Scope["actor_id"]),
		MetadataJSON: mustJSONString(payload),
		CreatedAt:    s.now().UTC(),
	})
	return err
}

func (s *AgreementDraftIdempotencyStore) shouldPersistReplayAudit(result gosynccore.MutationResult) bool {
	operation := strings.TrimSpace(fmt.Sprint(copyAnyMap(result.Snapshot.Metadata)["operation"]))
	return !strings.EqualFold(operation, OperationSend) && !strings.EqualFold(operation, OperationStartReview)
}

func (s *AgreementDraftIdempotencyStore) lookupPersistentReplay(ctx context.Context, key string, ttl time.Duration) (gosynccore.MutationResult, bool, error) {
	if s == nil || s.audits == nil {
		return gosynccore.MutationResult{}, false, nil
	}
	parsed, err := parseScopedReplayKey(key)
	if err != nil {
		return gosynccore.MutationResult{}, false, nil
	}
	scope, err := storesScopeFromResourceScope(parsed.Scope)
	if err != nil {
		return gosynccore.MutationResult{}, false, nil
	}
	events, err := s.audits.ListDraftEvents(ctx, scope, parsed.ResourceID, stores.DraftAuditEventQuery{
		Limit:    100,
		SortDesc: true,
	})
	if err != nil {
		return gosynccore.MutationResult{}, false, err
	}
	for _, event := range events {
		result, ok := mutationResultFromReplayEvent(event, key)
		if ok {
			s.storeReplayResult(key, result, ttl)
			return result, true, nil
		}
		result, ok = mutationResultFromSendEvent(event, parsed)
		if ok {
			s.storeReplayResult(key, result, ttl)
			return result, true, nil
		}
		result, ok = mutationResultFromStartReviewEvent(event, parsed)
		if ok {
			s.storeReplayResult(key, result, ttl)
			return result, true, nil
		}
	}
	return gosynccore.MutationResult{}, false, nil
}

func (s *AgreementDraftIdempotencyStore) storeReplayResult(key string, result gosynccore.MutationResult, ttl time.Duration) {
	entry := resultEntry{result: cloneMutationResult(result)}
	if ttl > 0 {
		entry.expiresAt = s.now().UTC().Add(ttl)
	}
	s.results[key] = entry
}

func (s *AgreementDraftIdempotencyStore) evictExpired(now time.Time) {
	for key, entry := range s.pending {
		if !entry.expiresAt.IsZero() && now.After(entry.expiresAt) {
			delete(s.pending, key)
		}
	}
	for key, entry := range s.results {
		if !entry.expiresAt.IsZero() && now.After(entry.expiresAt) {
			delete(s.results, key)
		}
	}
}

type scopedReplayKey struct {
	ResourceID     string            `json:"resource_id"`
	Operation      string            `json:"operation"`
	RawIdempotency string            `json:"raw_idempotency"`
	Scope          map[string]string `json:"scope"`
}

func parseScopedReplayKey(key string) (scopedReplayKey, error) {
	parts := strings.Split(strings.TrimSpace(key), "|")
	if len(parts) < 7 {
		return scopedReplayKey{}, fmt.Errorf("invalid scoped idempotency key")
	}
	out := scopedReplayKey{
		ResourceID: strings.TrimSpace(urlDecode(parts[2])),
		Operation:  strings.TrimSpace(urlDecode(parts[3])),
		Scope:      map[string]string{},
	}
	for _, part := range parts[4:] {
		part = strings.TrimSpace(part)
		switch {
		case strings.HasPrefix(part, "scope="):
			raw := strings.TrimPrefix(part, "scope=")
			for entry := range strings.SplitSeq(raw, ",") {
				entry = strings.TrimSpace(entry)
				if entry == "" {
					continue
				}
				kv := strings.SplitN(entry, "=", 2)
				if len(kv) != 2 {
					continue
				}
				out.Scope[urlDecode(kv[0])] = urlDecode(kv[1])
			}
		case strings.HasPrefix(part, "key="):
			out.RawIdempotency = strings.TrimSpace(urlDecode(strings.TrimPrefix(part, "key=")))
		}
	}
	if out.ResourceID == "" {
		return scopedReplayKey{}, fmt.Errorf("scoped idempotency key is missing resource id")
	}
	return out, nil
}

func mutationResultFromReplayEvent(event stores.DraftAuditEventRecord, scopedKey string) (gosynccore.MutationResult, bool) {
	if !strings.EqualFold(strings.TrimSpace(event.EventType), replayStoredEventType) {
		return gosynccore.MutationResult{}, false
	}
	payload := decodeMetadata(event.MetadataJSON)
	if strings.TrimSpace(fmt.Sprint(payload["scoped_idempotency_key"])) != strings.TrimSpace(scopedKey) {
		return gosynccore.MutationResult{}, false
	}
	snapshot, ok := snapshotFromReplayMetadata(payload["snapshot"])
	if !ok {
		return gosynccore.MutationResult{}, false
	}
	return gosynccore.MutationResult{
		Snapshot: snapshot,
		Applied:  payloadBool(payload, "applied", true),
		Replay:   payloadBool(payload, "replay", false),
	}, true
}

func mutationResultFromSendEvent(event stores.DraftAuditEventRecord, key scopedReplayKey) (gosynccore.MutationResult, bool) {
	if !strings.EqualFold(strings.TrimSpace(event.EventType), "draft.sent") {
		return gosynccore.MutationResult{}, false
	}
	if !strings.EqualFold(strings.TrimSpace(key.Operation), OperationSend) {
		return gosynccore.MutationResult{}, false
	}
	payload := decodeMetadata(event.MetadataJSON)
	if strings.TrimSpace(fmt.Sprint(payload["idempotency_key"])) != strings.TrimSpace(key.RawIdempotency) {
		return gosynccore.MutationResult{}, false
	}
	revision := int64Metadata(payload, "revision")
	if revision <= 0 {
		revision = 1
	}
	updatedAt := parseTimestamp(fmt.Sprint(payload["updated_at"]), event.CreatedAt)
	scope := copyStringMap(key.Scope)
	data := map[string]any{
		"id":            strings.TrimSpace(event.DraftID),
		"agreement_id":  strings.TrimSpace(fmt.Sprint(payload["agreement_id"])),
		"status":        strings.TrimSpace(fmt.Sprint(payload["status"])),
		"draft_deleted": payloadBool(payload, "draft_deleted", true),
		"wizard_id":     strings.TrimSpace(fmt.Sprint(payload["wizard_id"])),
	}
	raw, err := json.Marshal(data)
	if err != nil {
		return gosynccore.MutationResult{}, false
	}
	return gosynccore.MutationResult{
		Snapshot: gosynccore.Snapshot{
			ResourceRef: gosynccore.ResourceRef{
				Kind:  ResourceKindAgreementDraft,
				ID:    strings.TrimSpace(event.DraftID),
				Scope: scope,
			},
			Data:      raw,
			Revision:  revision,
			UpdatedAt: updatedAt,
			Metadata: map[string]any{
				"agreement_id":  strings.TrimSpace(fmt.Sprint(payload["agreement_id"])),
				"status":        strings.TrimSpace(fmt.Sprint(payload["status"])),
				"draft_deleted": payloadBool(payload, "draft_deleted", true),
				"operation":     OperationSend,
			},
		},
		Applied: true,
		Replay:  false,
	}, true
}

func mutationResultFromStartReviewEvent(event stores.DraftAuditEventRecord, key scopedReplayKey) (gosynccore.MutationResult, bool) {
	if !strings.EqualFold(strings.TrimSpace(event.EventType), "draft.review_started") {
		return gosynccore.MutationResult{}, false
	}
	if !strings.EqualFold(strings.TrimSpace(key.Operation), OperationStartReview) {
		return gosynccore.MutationResult{}, false
	}
	payload := decodeMetadata(event.MetadataJSON)
	if strings.TrimSpace(fmt.Sprint(payload["idempotency_key"])) != strings.TrimSpace(key.RawIdempotency) {
		return gosynccore.MutationResult{}, false
	}
	revision := int64Metadata(payload, "revision")
	if revision <= 0 {
		revision = 1
	}
	updatedAt := parseTimestamp(fmt.Sprint(payload["updated_at"]), event.CreatedAt)
	scope := copyStringMap(key.Scope)
	data := map[string]any{
		"id":               strings.TrimSpace(event.DraftID),
		"agreement_id":     strings.TrimSpace(fmt.Sprint(payload["agreement_id"])),
		"status":           strings.TrimSpace(fmt.Sprint(payload["status"])),
		"review_status":    strings.TrimSpace(fmt.Sprint(payload["review_status"])),
		"review_gate":      strings.TrimSpace(fmt.Sprint(payload["review_gate"])),
		"comments_enabled": payloadBool(payload, "comments_enabled", false),
		"draft_deleted":    payloadBool(payload, "draft_deleted", true),
		"wizard_id":        strings.TrimSpace(fmt.Sprint(payload["wizard_id"])),
	}
	raw, err := json.Marshal(data)
	if err != nil {
		return gosynccore.MutationResult{}, false
	}
	return gosynccore.MutationResult{
		Snapshot: gosynccore.Snapshot{
			ResourceRef: gosynccore.ResourceRef{
				Kind:  ResourceKindAgreementDraft,
				ID:    strings.TrimSpace(event.DraftID),
				Scope: scope,
			},
			Data:      raw,
			Revision:  revision,
			UpdatedAt: updatedAt,
			Metadata: map[string]any{
				"agreement_id":     strings.TrimSpace(fmt.Sprint(payload["agreement_id"])),
				"status":           strings.TrimSpace(fmt.Sprint(payload["status"])),
				"review_status":    strings.TrimSpace(fmt.Sprint(payload["review_status"])),
				"review_gate":      strings.TrimSpace(fmt.Sprint(payload["review_gate"])),
				"comments_enabled": payloadBool(payload, "comments_enabled", false),
				"draft_deleted":    payloadBool(payload, "draft_deleted", true),
				"operation":        OperationStartReview,
			},
		},
		Applied: true,
		Replay:  false,
	}, true
}

type autosavePayload struct {
	WizardState map[string]any `json:"wizard_state"`
	Title       string         `json:"title"`
	CurrentStep int            `json:"current_step"`
	DocumentID  *string        `json:"document_id"`
}

func (p autosavePayload) title() string {
	title := strings.TrimSpace(p.Title)
	if title != "" {
		return title
	}
	if details, ok := p.WizardState["details"].(map[string]any); ok {
		return strings.TrimSpace(fmt.Sprint(details["title"]))
	}
	return ""
}

func (p autosavePayload) currentStep() int {
	if p.CurrentStep > 0 {
		return p.CurrentStep
	}
	switch raw := p.WizardState["currentStep"].(type) {
	case int:
		return raw
	case int32:
		return int(raw)
	case int64:
		return int(raw)
	case float64:
		return int(raw)
	default:
		return 1
	}
}

func decodeAutosavePayload(raw []byte) (autosavePayload, error) {
	payload := autosavePayload{}
	if len(raw) == 0 {
		return payload, gosynccore.NewError(gosynccore.CodeInvalidMutation, "payload is required", map[string]any{
			"field": "payload",
		})
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return autosavePayload{}, gosynccore.NewWrappedError(gosynccore.CodeInvalidMutation, "invalid payload", map[string]any{
			"field": "payload",
		}, err)
	}
	if payload.WizardState == nil {
		return autosavePayload{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "wizard_state is required", map[string]any{
			"field": "payload.wizard_state",
		})
	}
	return payload, nil
}

func snapshotFromDraftRecord(record stores.DraftRecord, scope map[string]string) (gosynccore.Snapshot, error) {
	data, err := json.Marshal(map[string]any{
		"id":           strings.TrimSpace(record.ID),
		"wizard_id":    strings.TrimSpace(record.WizardID),
		"title":        strings.TrimSpace(record.Title),
		"current_step": record.CurrentStep,
		"document_id":  nullableString(record.DocumentID),
		"created_at":   record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":   record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"expires_at":   record.ExpiresAt.UTC().Format(time.RFC3339Nano),
		"revision":     record.Revision,
		"wizard_state": decodeMetadata(record.WizardStateJSON),
	})
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	return gosynccore.Snapshot{
		ResourceRef: gosynccore.ResourceRef{
			Kind:  ResourceKindAgreementDraft,
			ID:    strings.TrimSpace(record.ID),
			Scope: copyStringMap(scope),
		},
		Data:      data,
		Revision:  record.Revision,
		UpdatedAt: record.UpdatedAt.UTC(),
		Metadata: map[string]any{
			"title":        strings.TrimSpace(record.Title),
			"current_step": record.CurrentStep,
			"document_id":  nullableString(record.DocumentID),
			"wizard_id":    strings.TrimSpace(record.WizardID),
			"status":       "draft",
		},
	}, nil
}

func snapshotFromSendResult(
	ref gosynccore.ResourceRef,
	scope map[string]string,
	result services.DraftSendResult,
	revision int64,
	updatedAt time.Time,
) (gosynccore.Snapshot, error) {
	if revision <= 0 {
		revision = 1
	}
	data, err := json.Marshal(map[string]any{
		"id":            strings.TrimSpace(ref.ID),
		"agreement_id":  strings.TrimSpace(result.AgreementID),
		"status":        strings.TrimSpace(result.Status),
		"draft_deleted": result.DraftDeleted,
	})
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	return gosynccore.Snapshot{
		ResourceRef: gosynccore.ResourceRef{
			Kind:  ResourceKindAgreementDraft,
			ID:    strings.TrimSpace(ref.ID),
			Scope: copyStringMap(scope),
		},
		Data:      data,
		Revision:  revision,
		UpdatedAt: updatedAt.UTC(),
		Metadata: map[string]any{
			"agreement_id":  strings.TrimSpace(result.AgreementID),
			"status":        strings.TrimSpace(result.Status),
			"draft_deleted": result.DraftDeleted,
			"operation":     OperationSend,
		},
	}, nil
}

func snapshotFromStartReviewResult(
	ref gosynccore.ResourceRef,
	scope map[string]string,
	result services.DraftStartReviewResult,
	revision int64,
	updatedAt time.Time,
) (gosynccore.Snapshot, error) {
	if revision <= 0 {
		revision = 1
	}
	data, err := json.Marshal(map[string]any{
		"id":               strings.TrimSpace(ref.ID),
		"agreement_id":     strings.TrimSpace(result.AgreementID),
		"status":           strings.TrimSpace(result.Status),
		"review_status":    strings.TrimSpace(result.ReviewStatus),
		"review_gate":      strings.TrimSpace(result.ReviewGate),
		"comments_enabled": result.CommentsEnabled,
		"draft_deleted":    result.DraftDeleted,
	})
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	return gosynccore.Snapshot{
		ResourceRef: gosynccore.ResourceRef{
			Kind:  ResourceKindAgreementDraft,
			ID:    strings.TrimSpace(ref.ID),
			Scope: copyStringMap(scope),
		},
		Data:      data,
		Revision:  revision,
		UpdatedAt: updatedAt.UTC(),
		Metadata: map[string]any{
			"agreement_id":     strings.TrimSpace(result.AgreementID),
			"status":           strings.TrimSpace(result.Status),
			"review_status":    strings.TrimSpace(result.ReviewStatus),
			"review_gate":      strings.TrimSpace(result.ReviewGate),
			"comments_enabled": result.CommentsEnabled,
			"draft_deleted":    result.DraftDeleted,
			"operation":        OperationStartReview,
		},
	}, nil
}

func snapshotFromDisposeResult(
	ref gosynccore.ResourceRef,
	scope map[string]string,
	revision int64,
	updatedAt time.Time,
) (gosynccore.Snapshot, error) {
	if revision <= 0 {
		revision = 1
	}
	data, err := json.Marshal(map[string]any{
		"id":             strings.TrimSpace(ref.ID),
		"status":         "discarded",
		"draft_disposed": true,
		"draft_deleted":  true,
	})
	if err != nil {
		return gosynccore.Snapshot{}, err
	}
	return gosynccore.Snapshot{
		ResourceRef: gosynccore.ResourceRef{
			Kind:  ResourceKindAgreementDraft,
			ID:    strings.TrimSpace(ref.ID),
			Scope: copyStringMap(scope),
		},
		Data:      data,
		Revision:  revision,
		UpdatedAt: updatedAt.UTC(),
		Metadata: map[string]any{
			"status":         "discarded",
			"draft_disposed": true,
			"draft_deleted":  true,
			"operation":      OperationDispose,
		},
	}, nil
}

func initialWizardState(wizardID, createdAt string) map[string]any {
	return map[string]any{
		"wizardId":         strings.TrimSpace(wizardID),
		"version":          1,
		"createdAt":        strings.TrimSpace(createdAt),
		"updatedAt":        strings.TrimSpace(createdAt),
		"currentStep":      1,
		"document":         map[string]any{"id": nil, "title": nil, "pageCount": nil},
		"details":          map[string]any{"title": "", "message": ""},
		"participants":     []any{},
		"fieldDefinitions": []any{},
		"fieldPlacements":  []any{},
		"fieldRules":       []any{},
		"review": map[string]any{
			"enabled":         false,
			"gate":            stores.AgreementReviewGateApproveBeforeSend,
			"commentsEnabled": false,
			"participants":    []any{},
		},
		"titleSource":    "autofill",
		"serverDraftId":  nil,
		"serverRevision": 0,
		"lastSyncedAt":   nil,
		"syncPending":    false,
	}
}

func validateResourceKind(kind string) error {
	if strings.EqualFold(strings.TrimSpace(kind), ResourceKindAgreementDraft) {
		return nil
	}
	return gosynccore.NewError(gosynccore.CodeInvalidMutation, "unsupported resource kind", map[string]any{
		"kind": strings.TrimSpace(kind),
	})
}

func resolveScopedActor(scope map[string]string) (stores.Scope, string, error) {
	storeScope, err := storesScopeFromResourceScope(scope)
	if err != nil {
		return stores.Scope{}, "", err
	}
	actorID := firstNonEmpty(scope["actor_id"])
	if actorID == "" {
		return stores.Scope{}, "", gosynccore.NewError(gosynccore.CodeInvalidMutation, "actor id is required", map[string]any{
			"field": "resource_ref.scope.actor_id",
		})
	}
	return storeScope, actorID, nil
}

func storesScopeFromResourceScope(scope map[string]string) (stores.Scope, error) {
	storeScope := stores.Scope{
		TenantID: firstNonEmpty(scope["tenant_id"]),
		OrgID:    firstNonEmpty(scope["org_id"]),
	}
	if strings.TrimSpace(storeScope.TenantID) == "" || strings.TrimSpace(storeScope.OrgID) == "" {
		return stores.Scope{}, gosynccore.NewError(gosynccore.CodeInvalidMutation, "tenant and org scope are required", map[string]any{
			"field": "resource_ref.scope",
		})
	}
	return storeScope, nil
}

func buildResourceScope(scope stores.Scope, actorID string) map[string]string {
	return map[string]string{
		"tenant_id": strings.TrimSpace(scope.TenantID),
		"org_id":    strings.TrimSpace(scope.OrgID),
		"actor_id":  strings.TrimSpace(actorID),
	}
}

func BuildIdentityScope(scope stores.Scope, actorID string) map[string]string {
	return buildResourceScope(scope, actorID)
}

func decodeMetadata(raw string) map[string]any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return map[string]any{}
	}
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil || decoded == nil {
		return map[string]any{}
	}
	return decoded
}

func snapshotFromReplayMetadata(raw any) (gosynccore.Snapshot, bool) {
	entry, ok := raw.(map[string]any)
	if !ok || entry == nil {
		return gosynccore.Snapshot{}, false
	}
	resourceRefMap, ok := entry["resource_ref"].(map[string]any)
	if !ok || resourceRefMap == nil {
		return gosynccore.Snapshot{}, false
	}
	ref := gosynccore.ResourceRef{
		Kind:  strings.TrimSpace(fmt.Sprint(resourceRefMap["kind"])),
		ID:    strings.TrimSpace(fmt.Sprint(resourceRefMap["id"])),
		Scope: anyStringMap(resourceRefMap["scope"]),
	}
	if ref.Kind == "" || ref.ID == "" {
		return gosynccore.Snapshot{}, false
	}
	data, err := json.Marshal(entry["data"])
	if err != nil {
		return gosynccore.Snapshot{}, false
	}
	return gosynccore.Snapshot{
		ResourceRef: ref,
		Data:        data,
		Revision:    int64Metadata(entry, "revision"),
		UpdatedAt:   parseTimestamp(fmt.Sprint(entry["updated_at"]), time.Time{}),
		Metadata:    anyMap(entry["metadata"]),
	}, true
}

func parseTimestamp(raw string, fallback time.Time) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		if fallback.IsZero() {
			return time.Now().UTC()
		}
		return fallback.UTC()
	}
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err == nil {
		return parsed.UTC()
	}
	parsed, err = time.Parse(time.RFC3339, raw)
	if err == nil {
		return parsed.UTC()
	}
	if fallback.IsZero() {
		return time.Now().UTC()
	}
	return fallback.UTC()
}

func anyMap(raw any) map[string]any {
	typed, ok := raw.(map[string]any)
	if !ok || typed == nil {
		return nil
	}
	return copyAnyMap(typed)
}

func anyStringMap(raw any) map[string]string {
	typed, ok := raw.(map[string]any)
	if !ok || typed == nil {
		return nil
	}
	out := make(map[string]string, len(typed))
	for key, value := range typed {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = strings.TrimSpace(fmt.Sprint(value))
	}
	return out
}

func payloadBool(payload map[string]any, key string, fallback bool) bool {
	switch value := payload[key].(type) {
	case bool:
		return value
	default:
		return fallback
	}
}

func int64Metadata(metadata map[string]any, key string) int64 {
	switch value := metadata[key].(type) {
	case int:
		return int64(value)
	case int32:
		return int64(value)
	case int64:
		return value
	case float64:
		return int64(value)
	default:
		return 0
	}
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func urlDecode(value string) string {
	decoded, err := url.QueryUnescape(strings.TrimSpace(value))
	if err != nil {
		return strings.TrimSpace(value)
	}
	return strings.TrimSpace(decoded)
}

func mustJSONString(payload map[string]any) string {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

func mustDecodeRawJSON(raw []byte) any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return strings.TrimSpace(string(raw))
	}
	return decoded
}

func cloneMutationResult(result gosynccore.MutationResult) gosynccore.MutationResult {
	return gosynccore.MutationResult{
		Snapshot: gosynccore.Snapshot{
			ResourceRef: gosynccore.ResourceRef{
				Kind:  strings.TrimSpace(result.Snapshot.ResourceRef.Kind),
				ID:    strings.TrimSpace(result.Snapshot.ResourceRef.ID),
				Scope: copyStringMap(result.Snapshot.ResourceRef.Scope),
			},
			Data:      append([]byte(nil), result.Snapshot.Data...),
			Revision:  result.Snapshot.Revision,
			UpdatedAt: result.Snapshot.UpdatedAt,
			Metadata:  copyAnyMap(result.Snapshot.Metadata),
		},
		Applied: result.Applied,
		Replay:  result.Replay,
	}
}

func copyStringMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		out[key] = strings.TrimSpace(input[key])
	}
	return out
}

func copyAnyMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	maps.Copy(out, input)
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
