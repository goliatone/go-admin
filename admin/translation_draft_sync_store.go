package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	syncstore "github.com/goliatone/go-admin/pkg/go-sync/store"
	translationcore "github.com/goliatone/go-admin/translations/core"
	goerrors "github.com/goliatone/go-errors"
)

const (
	translationDraftSyncResourceKind    = "translation_variant_draft"
	translationDraftSyncOperation       = "autosave"
	translationDraftSyncTriggerRead     = "read"
	translationDraftSyncTriggerSave     = "save"
	translationDraftSyncTriggerConflict = "conflict"
)

var _ syncstore.ResourceStore = (*translationDraftSyncResourceStore)(nil)

type translationDraftSyncResourceStore struct {
	binding *translationQueueBinding
}

type translationDraftSyncMutationPayload struct {
	Fields                 map[string]any `json:"fields"`
	Metadata               map[string]any `json:"metadata"`
	AcknowledgedSourceHash string         `json:"acknowledged_source_hash"`
	SourceHashAtLastSync   string         `json:"source_hash_at_last_sync"`
	Autosave               any            `json:"autosave"`
}

type translationDraftSyncSnapshotOptions struct {
	QAOutcomeTrigger string
}

func newTranslationDraftSyncResourceStore(binding *translationQueueBinding) *translationDraftSyncResourceStore {
	if binding == nil {
		return nil
	}
	return &translationDraftSyncResourceStore{binding: binding}
}

func (s *translationDraftSyncResourceStore) Get(ctx context.Context, ref synccore.ResourceRef) (synccore.Snapshot, error) {
	if err := s.validateResourceRef(ref); err != nil {
		return synccore.Snapshot{}, err
	}
	channel := translationDraftSyncChannel(ref.Scope)
	ctx = translationDraftSyncContext(ctx, ref.Scope)
	editorCtx, err := s.binding.loadVariantEditorContext(ctx, ref.ID, channel)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "load translation draft")
	}
	if !editorCtx.HasTarget {
		return synccore.Snapshot{}, synccore.NewError(synccore.CodeNotFound, "translation draft not found", map[string]any{
			"variant_id": strings.TrimSpace(ref.ID),
		})
	}
	return s.snapshot(ctx, ref, editorCtx, nil, editorCtx.TargetRowVersion, translationDraftSyncSnapshotOptions{
		QAOutcomeTrigger: translationDraftSyncTriggerRead,
	})
}

//nolint:gocyclo,funlen // sync mutation validation has a fixed sequence of contract checks before persistence.
func (s *translationDraftSyncResourceStore) Mutate(ctx context.Context, input synccore.MutationInput) (synccore.Snapshot, error) {
	if err := s.validateResourceRef(input.ResourceRef); err != nil {
		return synccore.Snapshot{}, err
	}
	if strings.TrimSpace(input.Operation) != translationDraftSyncOperation {
		return synccore.Snapshot{}, synccore.NewError(synccore.CodeInvalidMutation, "unsupported translation draft sync operation", map[string]any{
			"operation": strings.TrimSpace(input.Operation),
		})
	}

	payload, body, err := decodeTranslationDraftSyncMutation(input.Payload, input.Metadata)
	if err != nil {
		return synccore.Snapshot{}, err
	}
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return synccore.Snapshot{}, translationDraftSyncError(identityErr, "validate translation draft mutation")
	}
	if metadataIdentityErr := rejectTranslationClientIdentityFields(extractMap(body["metadata"])); metadataIdentityErr != nil {
		return synccore.Snapshot{}, translationDraftSyncError(metadataIdentityErr, "validate translation draft mutation metadata")
	}

	ref := input.ResourceRef
	channel := translationDraftSyncChannel(ref.Scope)
	ctx = translationDraftSyncContext(ctx, ref.Scope)
	editorCtx, err := s.binding.loadVariantEditorContext(ctx, ref.ID, channel)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "load translation draft")
	}
	if !editorCtx.HasTarget {
		return synccore.Snapshot{}, synccore.NewError(synccore.CodeNotFound, "translation draft not found", map[string]any{
			"variant_id": strings.TrimSpace(ref.ID),
		})
	}
	if input.ExpectedRevision != editorCtx.TargetRowVersion {
		latest, snapshotErr := s.snapshot(ctx, ref, editorCtx, nil, editorCtx.TargetRowVersion, translationDraftSyncSnapshotOptions{
			QAOutcomeTrigger: translationDraftSyncTriggerConflict,
		})
		if snapshotErr != nil {
			return synccore.Snapshot{}, snapshotErr
		}
		return synccore.Snapshot{}, synccore.NewStaleRevisionError(editorCtx.TargetRowVersion, &latest)
	}

	identity := translationDraftSyncIdentity(input, ref.Scope)
	if scopeErr := s.binding.ensureEditorScope(identity, editorCtx); scopeErr != nil {
		return synccore.Snapshot{}, translationDraftSyncError(scopeErr, "validate translation draft scope")
	}
	sourceSyncState, err := s.binding.resolveEditorSourceSyncState(editorCtx, body, payload.Metadata)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "validate translation draft source acknowledgement")
	}
	fields, err := parseTranslationEditorFields(payload.Fields)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "validate translation draft fields")
	}
	updatedRecord, updatedFields, nextVersion, err := s.binding.persistEditorVariantUpdate(ctx, editorCtx, fields, payload.Metadata, identity.ActorID, sourceSyncState)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "persist translation draft")
	}
	if syncErr := SyncTranslationFamilyStore(ctx, s.binding.admin, channel); syncErr != nil {
		return synccore.Snapshot{}, translationDraftSyncError(syncErr, "sync translation family")
	}
	s.binding.recordVariantUpdateActivity(ctx, editorCtx, identity.ActorID, nextVersion, translationDraftSyncAutosave(body, input.Metadata))

	reloaded, err := s.binding.loadVariantEditorContext(ctx, ref.ID, channel)
	if err != nil {
		return synccore.Snapshot{}, translationDraftSyncError(err, "reload translation draft")
	}
	reloaded.TargetFields = updatedFields
	reloaded.TargetRecordID = strings.TrimSpace(editorVariantRecordID(updatedRecord))
	reloaded.TargetRowVersion = nextVersion
	return s.snapshot(ctx, ref, reloaded, updatedRecord, nextVersion, translationDraftSyncSnapshotOptions{
		QAOutcomeTrigger: translationDraftSyncTriggerSave,
	})
}

func (s *translationDraftSyncResourceStore) validateResourceRef(ref synccore.ResourceRef) error {
	if s == nil || s.binding == nil || s.binding.admin == nil {
		return synccore.NewError(synccore.CodeTemporaryFailure, "translation draft sync store is not configured", nil)
	}
	if strings.TrimSpace(ref.Kind) != translationDraftSyncResourceKind {
		return synccore.NewError(synccore.CodeNotFound, "unsupported translation draft resource kind", map[string]any{
			"kind": strings.TrimSpace(ref.Kind),
		})
	}
	if strings.TrimSpace(ref.ID) == "" {
		return synccore.NewError(synccore.CodeInvalidMutation, "translation draft resource id is required", map[string]any{
			"field": "id",
		})
	}
	return nil
}

func (s *translationDraftSyncResourceStore) snapshot(ctx context.Context, ref synccore.ResourceRef, editorCtx translationEditorContext, updatedRecord any, revision int64, options translationDraftSyncSnapshotOptions) (synccore.Snapshot, error) {
	currentAssignment := translationEditorAssignmentByLocale(editorCtx.Family, editorCtx.TargetVariant.Locale)
	qaResults := s.binding.translationQAResults(editorCtx)
	if trigger := strings.TrimSpace(options.QAOutcomeTrigger); trigger == translationDraftSyncTriggerSave {
		recordTranslationQAOutcomeMetric(ctx, translationQAOutcomeEvent{
			Trigger:      trigger,
			AssignmentID: strings.TrimSpace(currentAssignment.ID),
			EntityType:   strings.TrimSpace(editorCtx.Family.ContentType),
			Locale:       strings.TrimSpace(editorCtx.TargetVariant.Locale),
			Environment:  translationDraftSyncChannel(ref.Scope),
			Outcome:      translationQAOutcomeLabel(qaResults),
			WarningCount: intValue(extractMap(qaResults["summary"])["warning_count"]),
			BlockerCount: intValue(extractMap(qaResults["summary"])["blocker_count"]),
		})
	}
	data := translationEditorVariantPayload(ctx, s.binding, editorCtx, currentAssignment, updatedRecord, revision, qaResults)
	data["source_fields"] = cloneStringMap(editorCtx.SourceFields)
	data["target_fields"] = cloneStringMap(editorCtx.TargetFields)
	data["target_locale"] = strings.TrimSpace(editorCtx.TargetVariant.Locale)
	data["source_locale"] = strings.TrimSpace(editorCtx.SourceVariant.Locale)
	data["entity_type"] = strings.TrimSpace(editorCtx.Family.ContentType)
	encoded, err := json.Marshal(data)
	if err != nil {
		return synccore.Snapshot{}, synccore.NewWrappedError(synccore.CodeTemporaryFailure, "encode translation draft snapshot", nil, err)
	}
	if revision <= 0 {
		revision = translationEditorDefaultVersion
	}
	updatedAt := translationDraftSyncUpdatedAt(editorCtx, updatedRecord)
	return synccore.Snapshot{
		ResourceRef: synccore.ResourceRef{
			Kind:  translationDraftSyncResourceKind,
			ID:    strings.TrimSpace(ref.ID),
			Scope: translationDraftSyncScope(ref.Scope),
		},
		Data:      encoded,
		Revision:  revision,
		UpdatedAt: updatedAt,
		Metadata: map[string]any{
			"assignment_id":  strings.TrimSpace(currentAssignment.ID),
			"family_id":      strings.TrimSpace(editorCtx.Family.ID),
			"target_locale":  strings.TrimSpace(editorCtx.TargetVariant.Locale),
			"channel":        translationDraftSyncChannel(ref.Scope),
			ScopeTenantIDKey: strings.TrimSpace(editorCtx.Family.TenantID),
			ScopeOrgIDKey:    strings.TrimSpace(editorCtx.Family.OrgID),
		},
	}, nil
}

func decodeTranslationDraftSyncMutation(raw []byte, metadata map[string]any) (translationDraftSyncMutationPayload, map[string]any, error) {
	payload := translationDraftSyncMutationPayload{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &payload); err != nil {
			return translationDraftSyncMutationPayload{}, nil, synccore.NewWrappedError(synccore.CodeInvalidMutation, "invalid translation draft mutation payload", nil, err)
		}
	}
	body := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &body); err != nil {
			return translationDraftSyncMutationPayload{}, nil, synccore.NewWrappedError(synccore.CodeInvalidMutation, "invalid translation draft mutation payload", nil, err)
		}
	}
	if payload.Metadata == nil {
		payload.Metadata = map[string]any{}
	}
	for key, value := range metadata {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := payload.Metadata[key]; !exists {
			payload.Metadata[key] = value
		}
	}
	if payload.Autosave != nil {
		body["autosave"] = payload.Autosave
	} else if value, ok := metadata["autosave"]; ok {
		body["autosave"] = value
	}
	if payload.AcknowledgedSourceHash != "" {
		body[translationEditorAcknowledgedSourceHashKey] = payload.AcknowledgedSourceHash
	}
	if payload.SourceHashAtLastSync != "" {
		body[translationEditorSourceHashAtLastSyncKey] = payload.SourceHashAtLastSync
	}
	body["metadata"] = payload.Metadata
	return payload, body, nil
}

func translationDraftSyncError(err error, action string) error {
	if err == nil {
		return nil
	}
	if _, ok := synccore.ErrorCodeOf(err); ok {
		return err
	}
	var domainErr *goerrors.Error
	if errors.As(err, &domainErr) && domainErr != nil {
		switch strings.TrimSpace(domainErr.TextCode) {
		case TextCodeNotFound, TextCodeTranslationMissing:
			return synccore.NewWrappedError(synccore.CodeNotFound, domainErr.Message, cloneAnyMap(domainErr.Metadata), err)
		case TextCodeValidationError:
			return synccore.NewWrappedError(synccore.CodeInvalidMutation, domainErr.Message, cloneAnyMap(domainErr.Metadata), err)
		case TextCodeForbidden, string(translationcore.ErrorPermissionDenied):
			return synccore.NewWrappedError(synccore.CodeInvalidMutation, domainErr.Message, cloneAnyMap(domainErr.Metadata), err)
		case TextCodeConflict, TextCodeTranslationQueueConflict, TextCodeTranslationQueueVersionConflict, string(translationcore.ErrorVersionConflict):
			return synccore.NewWrappedError(synccore.CodeInvalidMutation, domainErr.Message, cloneAnyMap(domainErr.Metadata), err)
		}
	}
	return synccore.NewWrappedError(synccore.CodeTemporaryFailure, strings.TrimSpace(action)+" failed", nil, err)
}

func translationDraftSyncContext(ctx context.Context, scope map[string]string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if tenantID := strings.TrimSpace(scope[ScopeTenantIDKey]); tenantID != "" {
		ctx = context.WithValue(ctx, tenantIDContextKey, tenantID)
	}
	if orgID := strings.TrimSpace(scope[ScopeOrgIDKey]); orgID != "" {
		ctx = context.WithValue(ctx, orgIDContextKey, orgID)
	}
	if channel := translationDraftSyncChannel(scope); channel != "" {
		ctx = WithContentChannel(ctx, channel)
		ctx = WithEnvironment(ctx, channel)
	}
	return ctx
}

func translationDraftSyncIdentity(input synccore.MutationInput, scope map[string]string) translationTransportIdentity {
	return translationTransportIdentity{
		ActorID:  strings.TrimSpace(input.ActorID),
		TenantID: strings.TrimSpace(scope[ScopeTenantIDKey]),
		OrgID:    strings.TrimSpace(scope[ScopeOrgIDKey]),
	}
}

func translationDraftSyncScope(scope map[string]string) map[string]string {
	out := map[string]string{}
	for _, key := range []string{ScopeTenantIDKey, ScopeOrgIDKey, "channel"} {
		if value := strings.TrimSpace(scope[key]); value != "" {
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationDraftSyncChannel(scope map[string]string) string {
	return translationChannel(scope["channel"])
}

func translationDraftSyncAutosave(body, metadata map[string]any) bool {
	if translationEditorAutosaveRequested(body) {
		return true
	}
	return toBool(metadata["autosave"])
}

func translationDraftSyncUpdatedAt(editorCtx translationEditorContext, updatedRecord any) time.Time {
	if updated := translationEditorRecordUpdatedAt(updatedRecord); updated != nil {
		switch typed := updated.(type) {
		case time.Time:
			if !typed.IsZero() {
				return typed.UTC()
			}
		case string:
			if parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(typed)); err == nil {
				return parsed.UTC()
			}
		}
	}
	if !editorCtx.TargetVariant.UpdatedAt.IsZero() {
		return editorCtx.TargetVariant.UpdatedAt.UTC()
	}
	return time.Now().UTC()
}
