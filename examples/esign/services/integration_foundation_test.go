package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestIntegrationFoundationValidateAndCompileMappingDeterministic(t *testing.T) {
	store := stores.NewInMemoryStore()
	svc := NewIntegrationFoundationService(store, WithIntegrationClock(func() time.Time {
		return time.Date(2026, 2, 16, 9, 30, 0, 0, time.UTC)
	}))
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	baseInput := MappingCompileInput{
		Provider: "crm",
		Name:     "agreement-bootstrap",
		Status:   stores.MappingSpecStatusDraft,
		ExternalSchema: stores.ExternalSchema{
			ObjectType: "contract",
			Version:    "v1",
			Fields: []stores.ExternalFieldRef{
				{Object: "contract", Field: "email", Type: "string", Required: true},
				{Object: "contract", Field: "name", Type: "string", Required: true},
			},
		},
		Rules: []stores.MappingRule{
			{SourceObject: "contract", SourceField: "name", TargetEntity: "participant", TargetPath: "name"},
			{SourceObject: "contract", SourceField: "email", TargetEntity: "participant", TargetPath: "email"},
		},
	}

	first, err := svc.ValidateAndCompileMapping(ctx, scope, baseInput)
	if err != nil {
		t.Fatalf("ValidateAndCompileMapping first: %v", err)
	}

	reordered := baseInput
	reordered.ExternalSchema.Fields = []stores.ExternalFieldRef{
		{Object: "contract", Field: "name", Type: "string", Required: true},
		{Object: "contract", Field: "email", Type: "string", Required: true},
	}
	reordered.Rules = []stores.MappingRule{
		{SourceObject: "contract", SourceField: "email", TargetEntity: "participant", TargetPath: "email"},
		{SourceObject: "contract", SourceField: "name", TargetEntity: "participant", TargetPath: "name"},
	}

	second, err := svc.ValidateAndCompileMapping(ctx, scope, reordered)
	if err != nil {
		t.Fatalf("ValidateAndCompileMapping second: %v", err)
	}

	if first.Hash != second.Hash {
		t.Fatalf("expected deterministic compile hash, first=%s second=%s", first.Hash, second.Hash)
	}
	if first.CanonicalJSON != second.CanonicalJSON {
		t.Fatalf("expected deterministic canonical json")
	}
	if second.Spec.CompiledHash != second.Hash {
		t.Fatalf("expected persisted compiled hash %s, got %s", second.Hash, second.Spec.CompiledHash)
	}
}

func TestIntegrationFoundationSyncRunCheckpointResumeLifecycle(t *testing.T) {
	store := stores.NewInMemoryStore()
	svc := NewIntegrationFoundationService(store)
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	compiled, err := svc.ValidateAndCompileMapping(ctx, scope, MappingCompileInput{
		Provider: "crm",
		Name:     "sync-run-spec",
		ExternalSchema: stores.ExternalSchema{
			ObjectType: "employee",
			Version:    "v1",
			Fields: []stores.ExternalFieldRef{
				{Object: "employee", Field: "email", Type: "string", Required: true},
			},
		},
		Rules: []stores.MappingRule{
			{SourceObject: "employee", SourceField: "email", TargetEntity: "participant", TargetPath: "email"},
		},
	})
	if err != nil {
		t.Fatalf("ValidateAndCompileMapping: %v", err)
	}

	run, replay, err := svc.StartSyncRun(ctx, scope, StartSyncRunInput{
		Provider:       "crm",
		Direction:      "inbound",
		MappingSpecID:  compiled.Spec.ID,
		Cursor:         "cursor-0",
		IdempotencyKey: "run-start-1",
	})
	if err != nil {
		t.Fatalf("StartSyncRun first: %v", err)
	}
	if replay {
		t.Fatalf("expected first run start to not replay")
	}

	replayRun, replay, err := svc.StartSyncRun(ctx, scope, StartSyncRunInput{
		Provider:       "crm",
		Direction:      "inbound",
		MappingSpecID:  compiled.Spec.ID,
		Cursor:         "cursor-0",
		IdempotencyKey: "run-start-1",
	})
	if err != nil {
		t.Fatalf("StartSyncRun replay: %v", err)
	}
	if !replay {
		t.Fatalf("expected replay for duplicate run-start")
	}
	if replayRun.ID != run.ID {
		t.Fatalf("expected replay run id %s, got %s", run.ID, replayRun.ID)
	}

	checkpoint, err := svc.SaveCheckpoint(ctx, scope, SaveCheckpointInput{
		RunID:         run.ID,
		CheckpointKey: "page-1",
		Cursor:        "cursor-1",
		Payload:       map[string]any{"batch": 1},
	})
	if err != nil {
		t.Fatalf("SaveCheckpoint: %v", err)
	}
	if checkpoint.CheckpointKey != "page-1" {
		t.Fatalf("expected checkpoint key page-1, got %s", checkpoint.CheckpointKey)
	}

	failed, replay, err := svc.FailSyncRun(ctx, scope, run.ID, "provider timeout", "run-fail-1")
	if err != nil {
		t.Fatalf("FailSyncRun: %v", err)
	}
	if replay {
		t.Fatalf("expected fail transition not replay")
	}
	if failed.Status != stores.IntegrationSyncRunStatusFailed {
		t.Fatalf("expected failed status, got %s", failed.Status)
	}

	resumed, replay, err := svc.ResumeSyncRun(ctx, scope, run.ID, "run-resume-1")
	if err != nil {
		t.Fatalf("ResumeSyncRun: %v", err)
	}
	if replay {
		t.Fatalf("expected resume transition not replay")
	}
	if resumed.Status != stores.IntegrationSyncRunStatusRunning {
		t.Fatalf("expected running status after resume, got %s", resumed.Status)
	}

	completed, replay, err := svc.CompleteSyncRun(ctx, scope, run.ID, "run-complete-1")
	if err != nil {
		t.Fatalf("CompleteSyncRun: %v", err)
	}
	if replay {
		t.Fatalf("expected complete transition not replay")
	}
	if completed.Status != stores.IntegrationSyncRunStatusCompleted {
		t.Fatalf("expected completed status, got %s", completed.Status)
	}

	diag, err := svc.SyncRunDiagnostics(ctx, scope, run.ID)
	if err != nil {
		t.Fatalf("SyncRunDiagnostics: %v", err)
	}
	if len(diag.Checkpoints) != 1 {
		t.Fatalf("expected 1 checkpoint, got %d", len(diag.Checkpoints))
	}
	if diag.Run.Status != stores.IntegrationSyncRunStatusCompleted {
		t.Fatalf("expected diagnostics run status completed, got %s", diag.Run.Status)
	}
}

func TestIntegrationFoundationConflictLifecycleAndRedaction(t *testing.T) {
	store := stores.NewInMemoryStore()
	svc := NewIntegrationFoundationService(store)
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	compiled, err := svc.ValidateAndCompileMapping(ctx, scope, MappingCompileInput{
		Provider:       "hris",
		Name:           "conflict-spec",
		ExternalSchema: stores.ExternalSchema{ObjectType: "candidate", Version: "v1", Fields: []stores.ExternalFieldRef{{Object: "candidate", Field: "email", Type: "string"}}},
		Rules:          []stores.MappingRule{{SourceObject: "candidate", SourceField: "email", TargetEntity: "participant", TargetPath: "email"}},
	})
	if err != nil {
		t.Fatalf("ValidateAndCompileMapping: %v", err)
	}
	run, _, err := svc.StartSyncRun(ctx, scope, StartSyncRunInput{Provider: "hris", Direction: "inbound", MappingSpecID: compiled.Spec.ID})
	if err != nil {
		t.Fatalf("StartSyncRun: %v", err)
	}

	conflict, replay, err := svc.DetectConflict(ctx, scope, DetectConflictInput{
		RunID:      run.ID,
		Provider:   "hris",
		EntityKind: "participant",
		ExternalID: "ext-123",
		InternalID: "participant-1",
		Reason:     "email mismatch",
		Payload: map[string]any{
			"email": "person@example.com",
			"token": "top-secret",
			"safe":  "value",
		},
	})
	if err != nil {
		t.Fatalf("DetectConflict: %v", err)
	}
	if replay {
		t.Fatalf("expected first conflict create not replay")
	}
	if conflict.Status != stores.IntegrationConflictStatusPending {
		t.Fatalf("expected pending conflict status, got %s", conflict.Status)
	}
	if strings.Contains(conflict.PayloadJSON, "person@example.com") || strings.Contains(conflict.PayloadJSON, "top-secret") {
		t.Fatalf("expected sensitive values redacted from conflict payload, got %s", conflict.PayloadJSON)
	}
	if !strings.Contains(conflict.PayloadJSON, "[REDACTED]") {
		t.Fatalf("expected redacted marker in conflict payload, got %s", conflict.PayloadJSON)
	}

	resolved, replay, err := svc.ResolveConflict(ctx, scope, ResolveConflictInput{
		ConflictID:       conflict.ID,
		Status:           stores.IntegrationConflictStatusResolved,
		ResolvedByUserID: "ops-user",
		Resolution:       map[string]any{"action": "keep_internal"},
		IdempotencyKey:   "conflict-resolve-1",
	})
	if err != nil {
		t.Fatalf("ResolveConflict: %v", err)
	}
	if replay {
		t.Fatalf("expected first conflict resolve not replay")
	}
	if resolved.Status != stores.IntegrationConflictStatusResolved {
		t.Fatalf("expected resolved conflict status, got %s", resolved.Status)
	}

	resolvedList, err := svc.ListConflicts(ctx, scope, run.ID, stores.IntegrationConflictStatusResolved)
	if err != nil {
		t.Fatalf("ListConflicts resolved: %v", err)
	}
	if len(resolvedList) != 1 {
		t.Fatalf("expected 1 resolved conflict, got %d", len(resolvedList))
	}
}

func TestIntegrationFoundationApplyInboundIdempotentAndBootstrapsParticipantsFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	svc := NewIntegrationFoundationService(store)
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	agreementID := createIntegrationDraftAgreement(t, store, scope)

	result, err := svc.ApplyInbound(ctx, scope, InboundApplyInput{
		Provider:        "crm",
		EntityKind:      "agreement",
		ExternalID:      "ext-agreement-1",
		AgreementID:     agreementID,
		MetadataTitle:   "Inbound Hydrated Agreement",
		MetadataMessage: "Prefilled by CRM",
		Participants: []InboundParticipantInput{
			{ExternalID: "ext-participant-1", Email: "signer@example.com", Name: "Signer One", Role: stores.RecipientRoleSigner, SigningStage: 1},
		},
		FieldDefinitions: []InboundFieldDefinitionInput{
			{ParticipantExternalID: "ext-participant-1", Type: stores.FieldTypeSignature, Required: true, PageNumber: 1, X: 0.1, Y: 0.2, Width: 0.2, Height: 0.07},
		},
		IdempotencyKey: "inbound-apply-1",
	})
	if err != nil {
		t.Fatalf("ApplyInbound first: %v", err)
	}
	if result.Replay {
		t.Fatalf("expected first apply not replay")
	}
	if result.ParticipantCount != 1 {
		t.Fatalf("expected participant count 1, got %d", result.ParticipantCount)
	}
	if result.FieldDefinitionCount != 1 {
		t.Fatalf("expected field definition count 1, got %d", result.FieldDefinitionCount)
	}

	participants, err := store.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		t.Fatalf("ListParticipants: %v", err)
	}
	if len(participants) != 1 {
		t.Fatalf("expected 1 participant, got %d", len(participants))
	}
	if participants[0].Email != "signer@example.com" {
		t.Fatalf("expected participant email signer@example.com, got %s", participants[0].Email)
	}

	definitions, err := store.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		t.Fatalf("ListFieldDefinitions: %v", err)
	}
	if len(definitions) != 1 {
		t.Fatalf("expected 1 field definition, got %d", len(definitions))
	}

	replayResult, err := svc.ApplyInbound(ctx, scope, InboundApplyInput{
		Provider:       "crm",
		EntityKind:     "agreement",
		ExternalID:     "ext-agreement-1",
		AgreementID:    agreementID,
		IdempotencyKey: "inbound-apply-1",
	})
	if err != nil {
		t.Fatalf("ApplyInbound replay: %v", err)
	}
	if !replayResult.Replay {
		t.Fatalf("expected replay apply result")
	}

	binding, err := store.GetIntegrationBindingByExternal(ctx, scope, "crm", "agreement", "ext-agreement-1")
	if err != nil {
		t.Fatalf("GetIntegrationBindingByExternal: %v", err)
	}
	if binding.InternalID != agreementID {
		t.Fatalf("expected agreement binding internal id %s, got %s", agreementID, binding.InternalID)
	}
}

func TestIntegrationFoundationApplyInboundIsAtomicAndRetriesAfterFailure(t *testing.T) {
	base := stores.NewInMemoryStore()
	store := &failingIntegrationBindingStore{
		InMemoryStore:              base,
		failAgreementBindingUpsert: true,
	}
	svc := NewIntegrationFoundationService(store)
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	agreementID := createIntegrationDraftAgreement(t, base, scope)
	input := InboundApplyInput{
		Provider:      "crm",
		EntityKind:    "agreement",
		ExternalID:    "ext-agreement-atomic-1",
		AgreementID:   agreementID,
		MetadataTitle: "Atomic Inbound",
		Participants: []InboundParticipantInput{
			{ExternalID: "ext-participant-atomic-1", Email: "atomic@example.com", Name: "Atomic Signer", Role: stores.RecipientRoleSigner, SigningStage: 1},
		},
		FieldDefinitions: []InboundFieldDefinitionInput{
			{ParticipantExternalID: "ext-participant-atomic-1", Type: stores.FieldTypeSignature, Required: true, PageNumber: 1, X: 0.1, Y: 0.2, Width: 0.2, Height: 0.07},
		},
		IdempotencyKey: "inbound-atomic-1",
	}

	if _, err := svc.ApplyInbound(ctx, scope, input); err == nil {
		t.Fatal("expected atomic inbound apply failure")
	}
	participants, err := store.ListParticipants(ctx, scope, agreementID)
	if err != nil {
		t.Fatalf("ListParticipants after failed apply: %v", err)
	}
	if len(participants) != 0 {
		t.Fatalf("expected no participants after failed atomic apply, got %d", len(participants))
	}
	definitions, err := store.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		t.Fatalf("ListFieldDefinitions after failed apply: %v", err)
	}
	if len(definitions) != 0 {
		t.Fatalf("expected no field definitions after failed atomic apply, got %d", len(definitions))
	}

	store.failAgreementBindingUpsert = false
	result, err := svc.ApplyInbound(ctx, scope, input)
	if err != nil {
		t.Fatalf("ApplyInbound retry after failure: %v", err)
	}
	if result.Replay {
		t.Fatal("expected retry to execute after rollback, got replay=true")
	}
	if result.ParticipantCount != 1 {
		t.Fatalf("expected participant count 1 after retry, got %d", result.ParticipantCount)
	}
	if result.FieldDefinitionCount != 1 {
		t.Fatalf("expected field definition count 1 after retry, got %d", result.FieldDefinitionCount)
	}
}

func TestIntegrationFoundationEmitOutboundChangeContractStability(t *testing.T) {
	store := stores.NewInMemoryStore()
	svc := NewIntegrationFoundationService(store)
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	ctx := context.Background()

	agreementID := createIntegrationDraftAgreement(t, store, scope)

	event, replay, err := svc.EmitOutboundChange(ctx, scope, OutboundChangeInput{
		Provider:       "crm",
		AgreementID:    agreementID,
		EventType:      "agreement.completed",
		SourceEventID:  "audit-event-1",
		Payload:        map[string]any{"status": "completed", "executed_object_key": "tenant/a/b/executed.pdf"},
		IdempotencyKey: "outbound-event-1",
	})
	if err != nil {
		t.Fatalf("EmitOutboundChange first: %v", err)
	}
	if replay {
		t.Fatalf("expected first outbound event not replay")
	}
	if event.ID == "" || event.IdempotencyKey == "" {
		t.Fatalf("expected event id and idempotency key to be populated")
	}
	if !strings.Contains(event.PayloadJSON, "executed_object_key") {
		t.Fatalf("expected outbound payload contract key in payload json, got %s", event.PayloadJSON)
	}

	replayEvent, replay, err := svc.EmitOutboundChange(ctx, scope, OutboundChangeInput{
		Provider:       "crm",
		AgreementID:    agreementID,
		EventType:      "agreement.completed",
		SourceEventID:  "audit-event-1",
		Payload:        map[string]any{"status": "completed"},
		IdempotencyKey: "outbound-event-1",
	})
	if err != nil {
		t.Fatalf("EmitOutboundChange replay: %v", err)
	}
	if !replay {
		t.Fatalf("expected replay for duplicate outbound event")
	}
	if replayEvent.ID != event.ID {
		t.Fatalf("expected replay event id %s, got %s", event.ID, replayEvent.ID)
	}

	events, err := store.ListIntegrationChangeEvents(ctx, scope, agreementID)
	if err != nil {
		t.Fatalf("ListIntegrationChangeEvents: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 stored outbound event, got %d", len(events))
	}
}

func createIntegrationDraftAgreement(t *testing.T, store *stores.InMemoryStore, scope stores.Scope) string {
	t.Helper()
	ctx := context.Background()
	doc, err := store.Create(ctx, scope, stores.DocumentRecord{
		Title:           "Integration Source Document",
		SourceObjectKey: "tenant/tenant-1/org/org-1/docs/integration.pdf",
		SourceSHA256:    strings.Repeat("a", 64),
		SizeBytes:       1024,
		PageCount:       1,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID: doc.ID,
		Title:      "Integration Draft",
		Message:    "Seeded for integration tests",
	})
	if err != nil {
		t.Fatalf("CreateDraft agreement: %v", err)
	}
	return agreement.ID
}

type failingIntegrationBindingStore struct {
	*stores.InMemoryStore
	failAgreementBindingUpsert bool
}

func (s *failingIntegrationBindingStore) WithTx(ctx context.Context, fn func(tx stores.TxStore) error) error {
	if s == nil || s.InMemoryStore == nil {
		return errors.New("integration test tx store is not configured")
	}
	return s.InMemoryStore.WithTx(ctx, func(tx stores.TxStore) error {
		if fn == nil {
			return nil
		}
		if txStore, ok := tx.(*stores.InMemoryStore); ok {
			return fn(&failingIntegrationBindingStore{
				InMemoryStore:              txStore,
				failAgreementBindingUpsert: s.failAgreementBindingUpsert,
			})
		}
		return fn(tx)
	})
}

func (s *failingIntegrationBindingStore) UpsertIntegrationBinding(ctx context.Context, scope stores.Scope, record stores.IntegrationBindingRecord) (stores.IntegrationBindingRecord, error) {
	if s.failAgreementBindingUpsert && strings.EqualFold(strings.TrimSpace(record.EntityKind), "agreement") {
		return stores.IntegrationBindingRecord{}, errors.New("forced agreement binding failure")
	}
	return s.InMemoryStore.UpsertIntegrationBinding(ctx, scope, record)
}
