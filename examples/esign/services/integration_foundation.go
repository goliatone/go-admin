package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

// IntegrationFoundationService orchestrates provider-agnostic integration mapping/sync/conflict flows.
type IntegrationFoundationService struct {
	store      stores.IntegrationFoundationStore
	agreements stores.AgreementStore
	audits     stores.AuditEventStore
	tx         stores.TransactionManager
	now        func() time.Time
}

// IntegrationFoundationOption customizes integration foundation service behavior.
type IntegrationFoundationOption func(*IntegrationFoundationService)

// WithIntegrationAuditStore sets append-only audit event sink used for integration actions.
func WithIntegrationAuditStore(audits stores.AuditEventStore) IntegrationFoundationOption {
	return func(s *IntegrationFoundationService) {
		if s == nil || audits == nil {
			return
		}
		s.audits = audits
	}
}

// WithIntegrationClock sets custom integration service clock.
func WithIntegrationClock(now func() time.Time) IntegrationFoundationOption {
	return func(s *IntegrationFoundationService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// NewIntegrationFoundationService creates a provider-agnostic integration foundation service.
func NewIntegrationFoundationService(store stores.Store, opts ...IntegrationFoundationOption) IntegrationFoundationService {
	svc := IntegrationFoundationService{
		store:      store,
		agreements: store,
		audits:     store,
		tx:         store,
		now:        func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s IntegrationFoundationService) forTx(tx stores.TxStore) IntegrationFoundationService {
	txSvc := s
	txSvc.store = tx
	txSvc.agreements = tx
	txSvc.audits = tx
	return txSvc
}

func (s IntegrationFoundationService) withWriteTx(ctx context.Context, fn func(IntegrationFoundationService) error) error {
	if fn == nil {
		return nil
	}
	if s.tx == nil {
		return fn(s)
	}
	return s.tx.WithTx(ctx, func(tx stores.TxStore) error {
		return fn(s.forTx(tx))
	})
}

// MappingCompileInput captures a mapping spec validation/compile request payload.
type MappingCompileInput struct {
	ID              string
	Provider        string
	Name            string
	Version         int64
	Status          string
	CreatedByUserID string
	UpdatedByUserID string
	ExternalSchema  stores.ExternalSchema
	Rules           []stores.MappingRule
}

// MappingCompileResult returns persisted mapping contract + canonical compile output.
type MappingCompileResult struct {
	Spec          stores.MappingSpecRecord
	CanonicalJSON string
	Hash          string
	Warnings      []string
}

// StartSyncRunInput captures a sync run initialization request.
type StartSyncRunInput struct {
	Provider        string
	Direction       string
	MappingSpecID   string
	Cursor          string
	CreatedByUserID string
	IdempotencyKey  string
}

// SaveCheckpointInput captures checkpoint persistence payload.
type SaveCheckpointInput struct {
	RunID         string
	CheckpointKey string
	Cursor        string
	Payload       map[string]any
}

// ResolveConflictInput captures conflict resolution payload.
type ResolveConflictInput struct {
	ConflictID       string
	Status           string
	Resolution       map[string]any
	ResolvedByUserID string
	IdempotencyKey   string
}

// DetectConflictInput captures conflict creation payload.
type DetectConflictInput struct {
	RunID          string
	BindingID      string
	Provider       string
	EntityKind     string
	ExternalID     string
	InternalID     string
	Reason         string
	Payload        map[string]any
	IdempotencyKey string
}

// InboundParticipantInput captures provider participant data for apply operations.
type InboundParticipantInput struct {
	ExternalID   string
	Email        string
	Name         string
	Role         string
	SigningStage int
}

// InboundFieldDefinitionInput captures optional field bootstrap data.
type InboundFieldDefinitionInput struct {
	FieldDefinitionID     string
	ParticipantID         string
	ParticipantExternalID string
	Type                  string
	Required              bool
	ValidationJSON        string
	PageNumber            int
	X                     float64
	Y                     float64
	Width                 float64
	Height                float64
	TabIndex              int
	Label                 string
	AppearanceJSON        string
}

// InboundApplyInput captures idempotent inbound sync payload.
type InboundApplyInput struct {
	Provider         string
	EntityKind       string
	ExternalID       string
	AgreementID      string
	MetadataTitle    string
	MetadataMessage  string
	Participants     []InboundParticipantInput
	FieldDefinitions []InboundFieldDefinitionInput
	IdempotencyKey   string
}

// InboundApplyResult captures inbound apply summary.
type InboundApplyResult struct {
	AgreementID          string
	ParticipantCount     int
	FieldDefinitionCount int
	Replay               bool
}

// OutboundChangeInput captures a normalized outbound change event payload.
type OutboundChangeInput struct {
	Provider       string
	AgreementID    string
	EventType      string
	SourceEventID  string
	Payload        map[string]any
	IdempotencyKey string
}

// SyncRunDiagnostics returns run/checkpoint/conflict diagnostics payload.
type SyncRunDiagnostics struct {
	Run         stores.IntegrationSyncRunRecord
	Checkpoints []stores.IntegrationCheckpointRecord
	Conflicts   []stores.IntegrationConflictRecord
}

// DeterministicIntegrationMutationKey produces stable idempotency keys for integration mutations.
func DeterministicIntegrationMutationKey(parts ...string) string {
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(strings.ToLower(part))
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	sum := sha256.Sum256([]byte(strings.Join(normalized, "|")))
	return "intg_" + hex.EncodeToString(sum[:])
}

// RedactIntegrationPayload recursively redacts sensitive values in provider payloads.
func RedactIntegrationPayload(in map[string]any) map[string]any {
	if len(in) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		if shouldRedactIntegrationKey(key) {
			out[key] = "[REDACTED]"
			continue
		}
		switch typed := value.(type) {
		case map[string]any:
			out[key] = RedactIntegrationPayload(typed)
		case []map[string]any:
			rows := make([]map[string]any, 0, len(typed))
			for _, row := range typed {
				rows = append(rows, RedactIntegrationPayload(row))
			}
			out[key] = rows
		case []any:
			rows := make([]any, 0, len(typed))
			for _, item := range typed {
				if m, ok := item.(map[string]any); ok {
					rows = append(rows, RedactIntegrationPayload(m))
					continue
				}
				rows = append(rows, item)
			}
			out[key] = rows
		default:
			out[key] = value
		}
	}
	return out
}

// ValidateAndCompileMapping validates and persists a canonical compiled mapping spec.
func (s IntegrationFoundationService) ValidateAndCompileMapping(ctx context.Context, scope stores.Scope, input MappingCompileInput) (MappingCompileResult, error) {
	if s.store == nil {
		return MappingCompileResult{}, domainValidationError("integration_mapping_specs", "store", "not configured")
	}
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	name := strings.TrimSpace(input.Name)
	if provider == "" {
		return MappingCompileResult{}, integrationMappingError("provider", "required")
	}
	if name == "" {
		return MappingCompileResult{}, integrationMappingError("name", "required")
	}
	if len(input.Rules) == 0 {
		return MappingCompileResult{}, integrationMappingError("rules", "at least one rule is required")
	}

	schema := normalizeExternalSchema(input.ExternalSchema)
	rules := normalizeMappingRules(input.Rules)
	warnings := collectMappingWarnings(schema, rules)

	canonicalPayload := map[string]any{
		"provider": provider,
		"name":     name,
		"schema":   schema,
		"rules":    rules,
	}
	canonicalBytes, err := json.Marshal(canonicalPayload)
	if err != nil {
		return MappingCompileResult{}, integrationMappingError("compile", "unable to marshal canonical payload")
	}
	sum := sha256.Sum256(canonicalBytes)
	hash := hex.EncodeToString(sum[:])

	record, err := s.store.UpsertMappingSpec(ctx, scope, stores.MappingSpecRecord{
		ID:              strings.TrimSpace(input.ID),
		Provider:        provider,
		Name:            name,
		Version:         input.Version,
		Status:          strings.TrimSpace(input.Status),
		ExternalSchema:  schema,
		Rules:           rules,
		CompiledJSON:    string(canonicalBytes),
		CompiledHash:    hash,
		CreatedByUserID: strings.TrimSpace(input.CreatedByUserID),
		UpdatedByUserID: strings.TrimSpace(input.UpdatedByUserID),
	})
	if err != nil {
		return MappingCompileResult{}, err
	}

	s.appendAudit(ctx, scope, stores.AuditEventRecord{
		AgreementID: "",
		EventType:   "integration.mapping.compiled",
		ActorType:   "system",
		ActorID:     strings.TrimSpace(record.UpdatedByUserID),
		MetadataJSON: mustJSON(map[string]any{
			"provider": provider,
			"name":     name,
			"version":  record.Version,
			"hash":     hash,
			"warnings": warnings,
		}),
		CreatedAt: s.now(),
	})

	return MappingCompileResult{
		Spec:          record,
		CanonicalJSON: string(canonicalBytes),
		Hash:          hash,
		Warnings:      warnings,
	}, nil
}

// ListMappingSpecs returns provider-scoped mapping specs.
func (s IntegrationFoundationService) ListMappingSpecs(ctx context.Context, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error) {
	if s.store == nil {
		return nil, domainValidationError("integration_mapping_specs", "store", "not configured")
	}
	return s.store.ListMappingSpecs(ctx, scope, provider)
}

// GetMappingSpec returns a single mapping spec.
func (s IntegrationFoundationService) GetMappingSpec(ctx context.Context, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	if s.store == nil {
		return stores.MappingSpecRecord{}, domainValidationError("integration_mapping_specs", "store", "not configured")
	}
	return s.store.GetMappingSpec(ctx, scope, id)
}

// PublishMappingSpec marks a mapping spec as published.
func (s IntegrationFoundationService) PublishMappingSpec(ctx context.Context, scope stores.Scope, id string, expectedVersion int64) (stores.MappingSpecRecord, error) {
	if s.store == nil {
		return stores.MappingSpecRecord{}, domainValidationError("integration_mapping_specs", "store", "not configured")
	}
	record, err := s.store.PublishMappingSpec(ctx, scope, id, expectedVersion, s.now())
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	s.appendAudit(ctx, scope, stores.AuditEventRecord{
		EventType: "integration.mapping.published",
		ActorType: "system",
		ActorID:   strings.TrimSpace(record.UpdatedByUserID),
		MetadataJSON: mustJSON(map[string]any{
			"mapping_spec_id": record.ID,
			"provider":        record.Provider,
			"name":            record.Name,
			"version":         record.Version,
		}),
		CreatedAt: s.now(),
	})
	return record, nil
}

// StartSyncRun starts a sync run with deterministic idempotency semantics.
func (s IntegrationFoundationService) StartSyncRun(ctx context.Context, scope stores.Scope, input StartSyncRunInput) (stores.IntegrationSyncRunRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	direction := strings.ToLower(strings.TrimSpace(input.Direction))
	mappingSpecID := strings.TrimSpace(input.MappingSpecID)
	if provider == "" {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "provider", "required")
	}
	if direction == "" {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "direction", "required")
	}
	if mappingSpecID == "" {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "mapping_spec_id", "required")
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("sync_run_start", provider, direction, mappingSpecID, strings.TrimSpace(input.Cursor))
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, key, s.now())
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	if !claimed {
		runs, listErr := s.store.ListIntegrationSyncRuns(ctx, scope, provider)
		if listErr == nil {
			for _, run := range runs {
				if run.Direction == direction && run.MappingSpecID == mappingSpecID && run.Cursor == strings.TrimSpace(input.Cursor) {
					return run, true, nil
				}
			}
		}
		return stores.IntegrationSyncRunRecord{}, true, nil
	}

	run, err := s.store.CreateIntegrationSyncRun(ctx, scope, stores.IntegrationSyncRunRecord{
		Provider:        provider,
		Direction:       direction,
		MappingSpecID:   mappingSpecID,
		Status:          stores.IntegrationSyncRunStatusRunning,
		Cursor:          strings.TrimSpace(input.Cursor),
		AttemptCount:    1,
		CreatedByUserID: strings.TrimSpace(input.CreatedByUserID),
		StartedAt:       s.now(),
	})
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	s.appendAudit(ctx, scope, stores.AuditEventRecord{
		EventType: "integration.sync.run_started",
		ActorType: "system",
		ActorID:   strings.TrimSpace(input.CreatedByUserID),
		MetadataJSON: mustJSON(map[string]any{
			"run_id":          run.ID,
			"provider":        run.Provider,
			"direction":       run.Direction,
			"mapping_spec_id": run.MappingSpecID,
			"cursor":          run.Cursor,
		}),
		CreatedAt: s.now(),
	})
	return run, false, nil
}

// SaveCheckpoint upserts a run checkpoint and advances run cursor.
func (s IntegrationFoundationService) SaveCheckpoint(ctx context.Context, scope stores.Scope, input SaveCheckpointInput) (stores.IntegrationCheckpointRecord, error) {
	if s.store == nil {
		return stores.IntegrationCheckpointRecord{}, domainValidationError("integration_checkpoints", "store", "not configured")
	}
	runID := strings.TrimSpace(input.RunID)
	checkpointKey := strings.TrimSpace(input.CheckpointKey)
	if runID == "" {
		return stores.IntegrationCheckpointRecord{}, domainValidationError("integration_checkpoints", "run_id", "required")
	}
	if checkpointKey == "" {
		return stores.IntegrationCheckpointRecord{}, domainValidationError("integration_checkpoints", "checkpoint_key", "required")
	}
	payloadJSON := mustJSON(input.Payload)
	record, err := s.store.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
		RunID:         runID,
		CheckpointKey: checkpointKey,
		Cursor:        strings.TrimSpace(input.Cursor),
		PayloadJSON:   payloadJSON,
	})
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	if _, err := s.store.UpdateIntegrationSyncRunStatus(ctx, scope, runID, stores.IntegrationSyncRunStatusRunning, "", strings.TrimSpace(input.Cursor), nil, 0); err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	return record, nil
}

// CompleteSyncRun marks run as completed with idempotent replay behavior.
func (s IntegrationFoundationService) CompleteSyncRun(ctx context.Context, scope stores.Scope, runID, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error) {
	return s.transitionSyncRun(ctx, scope, runID, stores.IntegrationSyncRunStatusCompleted, "", idempotencyKey)
}

// FailSyncRun marks run as failed with idempotent replay behavior.
func (s IntegrationFoundationService) FailSyncRun(ctx context.Context, scope stores.Scope, runID, lastError, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error) {
	return s.transitionSyncRun(ctx, scope, runID, stores.IntegrationSyncRunStatusFailed, strings.TrimSpace(lastError), idempotencyKey)
}

// ResumeSyncRun restarts a failed run in a retry-safe way.
func (s IntegrationFoundationService) ResumeSyncRun(ctx context.Context, scope stores.Scope, runID, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "run_id", "required")
	}
	key := strings.TrimSpace(idempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("sync_run_resume", runID)
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, key, s.now())
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	run, err := s.store.GetIntegrationSyncRun(ctx, scope, runID)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	if !claimed {
		return run, true, nil
	}
	if run.Status == stores.IntegrationSyncRunStatusCompleted {
		return run, true, nil
	}
	updated, err := s.store.UpdateIntegrationSyncRunStatus(ctx, scope, runID, stores.IntegrationSyncRunStatusRunning, "", run.Cursor, nil, run.Version)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	return updated, false, nil
}

// ListSyncRuns returns sync run history.
func (s IntegrationFoundationService) ListSyncRuns(ctx context.Context, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error) {
	if s.store == nil {
		return nil, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	return s.store.ListIntegrationSyncRuns(ctx, scope, provider)
}

// GetSyncRun returns a specific sync run.
func (s IntegrationFoundationService) GetSyncRun(ctx context.Context, scope stores.Scope, runID string) (stores.IntegrationSyncRunRecord, error) {
	if s.store == nil {
		return stores.IntegrationSyncRunRecord{}, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	return s.store.GetIntegrationSyncRun(ctx, scope, runID)
}

// SyncRunDiagnostics returns run + checkpoints + conflict diagnostics.
func (s IntegrationFoundationService) SyncRunDiagnostics(ctx context.Context, scope stores.Scope, runID string) (SyncRunDiagnostics, error) {
	if s.store == nil {
		return SyncRunDiagnostics{}, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	run, err := s.store.GetIntegrationSyncRun(ctx, scope, runID)
	if err != nil {
		return SyncRunDiagnostics{}, err
	}
	checkpoints, err := s.store.ListIntegrationCheckpoints(ctx, scope, runID)
	if err != nil {
		return SyncRunDiagnostics{}, err
	}
	conflicts, err := s.store.ListIntegrationConflicts(ctx, scope, runID, "")
	if err != nil {
		return SyncRunDiagnostics{}, err
	}
	return SyncRunDiagnostics{Run: run, Checkpoints: checkpoints, Conflicts: conflicts}, nil
}

// DetectConflict creates a pending conflict with idempotent replay semantics.
func (s IntegrationFoundationService) DetectConflict(ctx context.Context, scope stores.Scope, input DetectConflictInput) (stores.IntegrationConflictRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationConflictRecord{}, false, domainValidationError("integration_conflicts", "store", "not configured")
	}
	runID := strings.TrimSpace(input.RunID)
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	entityKind := strings.ToLower(strings.TrimSpace(input.EntityKind))
	externalID := strings.TrimSpace(input.ExternalID)
	reason := strings.TrimSpace(input.Reason)
	if runID == "" || provider == "" || entityKind == "" || externalID == "" || reason == "" {
		return stores.IntegrationConflictRecord{}, false, integrationConflictError("run_id, provider, entity_kind, external_id, and reason are required")
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("integration_conflict", runID, provider, entityKind, externalID, reason)
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, key, s.now())
	if err != nil {
		return stores.IntegrationConflictRecord{}, false, err
	}
	if !claimed {
		conflicts, listErr := s.store.ListIntegrationConflicts(ctx, scope, runID, stores.IntegrationConflictStatusPending)
		if listErr == nil {
			for _, conflict := range conflicts {
				if conflict.Provider == provider && conflict.EntityKind == entityKind && conflict.ExternalID == externalID && conflict.Reason == reason {
					return conflict, true, nil
				}
			}
		}
		return stores.IntegrationConflictRecord{}, true, nil
	}
	record, err := s.store.CreateIntegrationConflict(ctx, scope, stores.IntegrationConflictRecord{
		RunID:       runID,
		BindingID:   strings.TrimSpace(input.BindingID),
		Provider:    provider,
		EntityKind:  entityKind,
		ExternalID:  externalID,
		InternalID:  strings.TrimSpace(input.InternalID),
		Status:      stores.IntegrationConflictStatusPending,
		Reason:      reason,
		PayloadJSON: mustJSON(RedactIntegrationPayload(input.Payload)),
	})
	if err != nil {
		return stores.IntegrationConflictRecord{}, false, err
	}
	s.appendAudit(ctx, scope, stores.AuditEventRecord{
		EventType: "integration.conflict.detected",
		ActorType: "system",
		ActorID:   "integration_sync",
		MetadataJSON: mustJSON(map[string]any{
			"conflict_id": record.ID,
			"run_id":      record.RunID,
			"provider":    record.Provider,
			"entity_kind": record.EntityKind,
			"external_id": record.ExternalID,
			"reason":      record.Reason,
		}),
		CreatedAt: s.now(),
	})
	return record, false, nil
}

// ResolveConflict resolves or ignores an integration conflict with idempotent behavior.
func (s IntegrationFoundationService) ResolveConflict(ctx context.Context, scope stores.Scope, input ResolveConflictInput) (stores.IntegrationConflictRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationConflictRecord{}, false, domainValidationError("integration_conflicts", "store", "not configured")
	}
	conflictID := strings.TrimSpace(input.ConflictID)
	status := strings.ToLower(strings.TrimSpace(input.Status))
	if conflictID == "" {
		return stores.IntegrationConflictRecord{}, false, integrationConflictError("conflict_id is required")
	}
	if status != stores.IntegrationConflictStatusResolved && status != stores.IntegrationConflictStatusIgnored {
		return stores.IntegrationConflictRecord{}, false, integrationConflictError("status must be resolved or ignored")
	}
	conflict, err := s.store.GetIntegrationConflict(ctx, scope, conflictID)
	if err != nil {
		return stores.IntegrationConflictRecord{}, false, err
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("integration_conflict_resolve", conflictID, status, conflict.ExternalID)
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, key, s.now())
	if err != nil {
		return stores.IntegrationConflictRecord{}, false, err
	}
	if !claimed {
		return conflict, true, nil
	}
	resolutionJSON := mustJSON(RedactIntegrationPayload(input.Resolution))
	resolved, err := s.store.ResolveIntegrationConflict(
		ctx,
		scope,
		conflictID,
		status,
		resolutionJSON,
		strings.TrimSpace(input.ResolvedByUserID),
		s.now(),
		conflict.Version,
	)
	if err != nil {
		return stores.IntegrationConflictRecord{}, false, err
	}
	s.appendAudit(ctx, scope, stores.AuditEventRecord{
		EventType: "integration.conflict.resolved",
		ActorType: "admin_user",
		ActorID:   strings.TrimSpace(input.ResolvedByUserID),
		MetadataJSON: mustJSON(map[string]any{
			"conflict_id": resolved.ID,
			"status":      resolved.Status,
			"run_id":      resolved.RunID,
			"resolution":  RedactIntegrationPayload(input.Resolution),
		}),
		CreatedAt: s.now(),
	})
	return resolved, false, nil
}

// ListConflicts lists integration conflicts by run/status filters.
func (s IntegrationFoundationService) ListConflicts(ctx context.Context, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error) {
	if s.store == nil {
		return nil, domainValidationError("integration_conflicts", "store", "not configured")
	}
	return s.store.ListIntegrationConflicts(ctx, scope, runID, status)
}

// GetConflict returns conflict detail.
func (s IntegrationFoundationService) GetConflict(ctx context.Context, scope stores.Scope, conflictID string) (stores.IntegrationConflictRecord, error) {
	if s.store == nil {
		return stores.IntegrationConflictRecord{}, domainValidationError("integration_conflicts", "store", "not configured")
	}
	return s.store.GetIntegrationConflict(ctx, scope, conflictID)
}

// ApplyInbound ingests provider-agnostic normalized payload and applies idempotent domain updates.
func (s IntegrationFoundationService) ApplyInbound(ctx context.Context, scope stores.Scope, input InboundApplyInput) (InboundApplyResult, error) {
	if s.store == nil {
		return InboundApplyResult{}, domainValidationError("integration_inbound", "store", "not configured")
	}
	if s.agreements == nil {
		return InboundApplyResult{}, domainValidationError("integration_inbound", "agreements", "not configured")
	}
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	entityKind := strings.ToLower(strings.TrimSpace(input.EntityKind))
	externalID := strings.TrimSpace(input.ExternalID)
	agreementID := strings.TrimSpace(input.AgreementID)
	if provider == "" || entityKind == "" || externalID == "" || agreementID == "" {
		return InboundApplyResult{}, domainValidationError("integration_inbound", "provider|entity_kind|external_id|agreement_id", "required")
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("inbound_apply", provider, entityKind, externalID, agreementID)
	}

	var result InboundApplyResult
	err := s.withWriteTx(ctx, func(txSvc IntegrationFoundationService) error {
		claimed, claimErr := txSvc.store.ClaimIntegrationMutation(ctx, scope, key, txSvc.now())
		if claimErr != nil {
			return claimErr
		}
		if !claimed {
			participants, pErr := txSvc.agreements.ListParticipants(ctx, scope, agreementID)
			if pErr != nil {
				return pErr
			}
			definitions, dErr := txSvc.agreements.ListFieldDefinitions(ctx, scope, agreementID)
			if dErr != nil {
				return dErr
			}
			result = InboundApplyResult{
				AgreementID:          agreementID,
				ParticipantCount:     len(participants),
				FieldDefinitionCount: len(definitions),
				Replay:               true,
			}
			return nil
		}

		agreement, getErr := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if getErr != nil {
			return getErr
		}
		if agreement.Status == stores.AgreementStatusDraft {
			patch := stores.AgreementDraftPatch{}
			if title := strings.TrimSpace(input.MetadataTitle); title != "" {
				patch.Title = &title
			}
			if message := strings.TrimSpace(input.MetadataMessage); message != "" {
				patch.Message = &message
			}
			if patch.Title != nil || patch.Message != nil {
				agreement, getErr = txSvc.agreements.UpdateDraft(ctx, scope, agreementID, patch, agreement.Version)
				if getErr != nil {
					return getErr
				}
			}
		}

		participantIDsByExternal := map[string]string{}
		for _, participant := range input.Participants {
			externalParticipantID := strings.TrimSpace(participant.ExternalID)
			participantID := ""
			if externalParticipantID != "" {
				binding, bindErr := txSvc.store.GetIntegrationBindingByExternal(ctx, scope, provider, "participant", externalParticipantID)
				if bindErr == nil {
					participantID = strings.TrimSpace(binding.InternalID)
				}
			}
			role := strings.ToLower(strings.TrimSpace(participant.Role))
			if role == "" {
				role = stores.RecipientRoleSigner
			}
			stage := participant.SigningStage
			if stage <= 0 {
				stage = 1
			}
			upserted, upsertErr := txSvc.agreements.UpsertParticipantDraft(ctx, scope, agreementID, stores.ParticipantDraftPatch{
				ID:           participantID,
				Email:        integrationStrPtr(strings.TrimSpace(participant.Email)),
				Name:         integrationStrPtr(strings.TrimSpace(participant.Name)),
				Role:         integrationStrPtr(role),
				SigningStage: integrationIntPtr(stage),
			}, 0)
			if upsertErr != nil {
				return upsertErr
			}
			if externalParticipantID != "" {
				participantIDsByExternal[externalParticipantID] = upserted.ID
				if _, bindErr := txSvc.store.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
					Provider:       provider,
					EntityKind:     "participant",
					ExternalID:     externalParticipantID,
					InternalID:     upserted.ID,
					ProvenanceJSON: mustJSON(map[string]any{"source": "integration_inbound"}),
				}); bindErr != nil {
					return bindErr
				}
			}
		}

		fieldDefinitionCount := 0
		for _, field := range input.FieldDefinitions {
			participantID := strings.TrimSpace(field.ParticipantID)
			if participantID == "" {
				participantID = participantIDsByExternal[strings.TrimSpace(field.ParticipantExternalID)]
			}
			if participantID == "" {
				continue
			}
			fieldType := strings.TrimSpace(field.Type)
			if fieldType == "" {
				fieldType = stores.FieldTypeText
			}
			definition, defErr := txSvc.agreements.UpsertFieldDefinitionDraft(ctx, scope, agreementID, stores.FieldDefinitionDraftPatch{
				ID:             strings.TrimSpace(field.FieldDefinitionID),
				ParticipantID:  integrationStrPtr(participantID),
				Type:           integrationStrPtr(fieldType),
				Required:       integrationBoolPtr(field.Required),
				ValidationJSON: integrationStrPtr(strings.TrimSpace(field.ValidationJSON)),
			})
			if defErr != nil {
				return defErr
			}
			fieldDefinitionCount++
			if field.PageNumber > 0 && field.Width > 0 && field.Height > 0 {
				if _, instanceErr := txSvc.agreements.UpsertFieldInstanceDraft(ctx, scope, agreementID, stores.FieldInstanceDraftPatch{
					FieldDefinitionID: integrationStrPtr(definition.ID),
					PageNumber:        integrationIntPtr(field.PageNumber),
					X:                 integrationFloatPtr(field.X),
					Y:                 integrationFloatPtr(field.Y),
					Width:             integrationFloatPtr(field.Width),
					Height:            integrationFloatPtr(field.Height),
					TabIndex:          integrationIntPtr(field.TabIndex),
					Label:             integrationStrPtr(strings.TrimSpace(field.Label)),
					AppearanceJSON:    integrationStrPtr(strings.TrimSpace(field.AppearanceJSON)),
				}); instanceErr != nil {
					return instanceErr
				}
			}
		}

		if _, bindErr := txSvc.store.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
			Provider:       provider,
			EntityKind:     entityKind,
			ExternalID:     externalID,
			InternalID:     agreementID,
			ProvenanceJSON: mustJSON(map[string]any{"source": "integration_inbound"}),
		}); bindErr != nil {
			return bindErr
		}

		txSvc.appendAudit(ctx, scope, stores.AuditEventRecord{
			AgreementID: agreementID,
			EventType:   "integration.inbound.applied",
			ActorType:   "system",
			ActorID:     provider,
			MetadataJSON: mustJSON(RedactIntegrationPayload(map[string]any{
				"provider":               provider,
				"entity_kind":            entityKind,
				"external_id":            externalID,
				"agreement_id":           agreementID,
				"participant_count":      len(input.Participants),
				"field_definition_count": fieldDefinitionCount,
			})),
			CreatedAt: txSvc.now(),
		})

		participants, pErr := txSvc.agreements.ListParticipants(ctx, scope, agreementID)
		if pErr != nil {
			return pErr
		}
		definitions, dErr := txSvc.agreements.ListFieldDefinitions(ctx, scope, agreementID)
		if dErr != nil {
			return dErr
		}
		result = InboundApplyResult{
			AgreementID:          agreementID,
			ParticipantCount:     len(participants),
			FieldDefinitionCount: len(definitions),
			Replay:               false,
		}
		return nil
	})
	if err != nil {
		return InboundApplyResult{}, err
	}
	return result, nil
}

// EmitOutboundChange emits normalized provider-agnostic change events.
func (s IntegrationFoundationService) EmitOutboundChange(ctx context.Context, scope stores.Scope, input OutboundChangeInput) (stores.IntegrationChangeEventRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationChangeEventRecord{}, false, domainValidationError("integration_change_events", "store", "not configured")
	}
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	agreementID := strings.TrimSpace(input.AgreementID)
	eventType := strings.TrimSpace(input.EventType)
	sourceEventID := strings.TrimSpace(input.SourceEventID)
	if provider == "" || agreementID == "" || eventType == "" {
		return stores.IntegrationChangeEventRecord{}, false, domainValidationError("integration_change_events", "provider|agreement_id|event_type", "required")
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = DeterministicIntegrationMutationKey("outbound_change", provider, agreementID, eventType, sourceEventID)
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, idempotencyKey, s.now())
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, false, err
	}
	if !claimed {
		events, listErr := s.store.ListIntegrationChangeEvents(ctx, scope, agreementID)
		if listErr == nil {
			for _, event := range events {
				if event.Provider == provider && event.IdempotencyKey == idempotencyKey {
					return event, true, nil
				}
			}
		}
		return stores.IntegrationChangeEventRecord{}, true, nil
	}
	event, err := s.store.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
		AgreementID:    agreementID,
		Provider:       provider,
		EventType:      eventType,
		SourceEventID:  sourceEventID,
		IdempotencyKey: idempotencyKey,
		PayloadJSON:    mustJSON(RedactIntegrationPayload(input.Payload)),
		EmittedAt:      s.now(),
	})
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, false, err
	}
	return event, false, nil
}

func (s IntegrationFoundationService) transitionSyncRun(ctx context.Context, scope stores.Scope, runID, status, lastError, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error) {
	if s.store == nil {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "store", "not configured")
	}
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return stores.IntegrationSyncRunRecord{}, false, domainValidationError("integration_sync_runs", "run_id", "required")
	}
	key := strings.TrimSpace(idempotencyKey)
	if key == "" {
		key = DeterministicIntegrationMutationKey("sync_run_transition", runID, status)
	}
	claimed, err := s.store.ClaimIntegrationMutation(ctx, scope, key, s.now())
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	run, err := s.store.GetIntegrationSyncRun(ctx, scope, runID)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	if !claimed {
		return run, true, nil
	}
	var completedAt *time.Time
	if status == stores.IntegrationSyncRunStatusCompleted || status == stores.IntegrationSyncRunStatusFailed {
		now := s.now()
		completedAt = &now
	}
	updated, err := s.store.UpdateIntegrationSyncRunStatus(ctx, scope, runID, status, lastError, run.Cursor, completedAt, run.Version)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, false, err
	}
	return updated, false, nil
}

func (s IntegrationFoundationService) appendAudit(ctx context.Context, scope stores.Scope, event stores.AuditEventRecord) {
	if s.audits == nil {
		return
	}
	if strings.TrimSpace(event.EventType) == "" {
		return
	}
	event.AgreementID = strings.TrimSpace(event.AgreementID)
	if event.AgreementID == "" {
		event.AgreementID = "integration"
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = s.now()
	}
	_, _ = s.audits.Append(ctx, scope, event)
}

func normalizeExternalSchema(schema stores.ExternalSchema) stores.ExternalSchema {
	schema.ObjectType = strings.TrimSpace(schema.ObjectType)
	schema.Version = strings.TrimSpace(schema.Version)
	fields := append([]stores.ExternalFieldRef{}, schema.Fields...)
	for i := range fields {
		fields[i].Object = strings.TrimSpace(fields[i].Object)
		fields[i].Field = strings.TrimSpace(fields[i].Field)
		fields[i].Type = strings.TrimSpace(fields[i].Type)
		fields[i].ConstraintsJSON = strings.TrimSpace(fields[i].ConstraintsJSON)
	}
	sort.Slice(fields, func(i, j int) bool {
		left := strings.Join([]string{fields[i].Object, fields[i].Field, fields[i].Type}, "|")
		right := strings.Join([]string{fields[j].Object, fields[j].Field, fields[j].Type}, "|")
		return left < right
	})
	schema.Fields = fields
	return schema
}

func normalizeMappingRules(rules []stores.MappingRule) []stores.MappingRule {
	out := append([]stores.MappingRule{}, rules...)
	for i := range out {
		out[i].SourceObject = strings.TrimSpace(out[i].SourceObject)
		out[i].SourceField = strings.TrimSpace(out[i].SourceField)
		out[i].TargetEntity = strings.TrimSpace(out[i].TargetEntity)
		out[i].TargetPath = strings.TrimSpace(out[i].TargetPath)
		out[i].DefaultValue = strings.TrimSpace(out[i].DefaultValue)
		out[i].Transform = strings.TrimSpace(out[i].Transform)
	}
	sort.Slice(out, func(i, j int) bool {
		left := strings.Join([]string{out[i].SourceObject, out[i].SourceField, out[i].TargetEntity, out[i].TargetPath, out[i].Transform}, "|")
		right := strings.Join([]string{out[j].SourceObject, out[j].SourceField, out[j].TargetEntity, out[j].TargetPath, out[j].Transform}, "|")
		return left < right
	})
	return out
}

func collectMappingWarnings(schema stores.ExternalSchema, rules []stores.MappingRule) []string {
	warnings := make([]string, 0)
	available := map[string]struct{}{}
	for _, field := range schema.Fields {
		key := strings.ToLower(strings.TrimSpace(field.Object)) + "|" + strings.ToLower(strings.TrimSpace(field.Field))
		if strings.TrimSpace(field.Object) == "" || strings.TrimSpace(field.Field) == "" {
			continue
		}
		available[key] = struct{}{}
	}
	for _, rule := range rules {
		if strings.TrimSpace(rule.SourceObject) == "" || strings.TrimSpace(rule.SourceField) == "" {
			warnings = append(warnings, "rule contains empty source object/field")
			continue
		}
		key := strings.ToLower(strings.TrimSpace(rule.SourceObject)) + "|" + strings.ToLower(strings.TrimSpace(rule.SourceField))
		if _, ok := available[key]; !ok {
			warnings = append(warnings, "rule source field missing from external schema: "+key)
		}
	}
	if len(warnings) == 0 {
		return warnings
	}
	sort.Strings(warnings)
	return warnings
}

func integrationMappingError(field, reason string) error {
	return goerrors.New("invalid integration mapping", goerrors.CategoryValidation).
		WithCode(400).
		WithTextCode(string(ErrorCodeIntegrationMapping)).
		WithMetadata(map[string]any{"field": strings.TrimSpace(field), "reason": strings.TrimSpace(reason)})
}

func integrationConflictError(reason string) error {
	return goerrors.New("integration conflict", goerrors.CategoryConflict).
		WithCode(409).
		WithTextCode(string(ErrorCodeIntegrationConflict)).
		WithMetadata(map[string]any{"reason": strings.TrimSpace(reason)})
}

func mustJSON(payload any) string {
	if payload == nil {
		return "{}"
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

func shouldRedactIntegrationKey(key string) bool {
	key = strings.ToLower(strings.TrimSpace(key))
	for _, fragment := range []string{"token", "secret", "password", "signature", "ssn", "email", "phone"} {
		if strings.Contains(key, fragment) {
			return true
		}
	}
	return false
}

func integrationStrPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func integrationIntPtr(value int) *int {
	if value <= 0 {
		return nil
	}
	return &value
}

func integrationBoolPtr(value bool) *bool {
	return &value
}

func integrationFloatPtr(value float64) *float64 {
	if value == 0 {
		return nil
	}
	return &value
}
