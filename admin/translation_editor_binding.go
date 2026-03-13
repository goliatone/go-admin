package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	router "github.com/goliatone/go-router"
)

const (
	translationEditorMetadataKey                     = "translation_editor"
	translationEditorAcknowledgedSourceHashKey       = "acknowledged_source_hash"
	translationEditorRowVersionKey                   = "row_version"
	translationEditorSourceHashAtLastSyncKey         = "source_hash_at_last_sync"
	translationEditorLastSyncedSourceFieldsKey       = "last_synced_source_fields"
	translationEditorLastSavedAtKey                  = "last_saved_at"
	translationEditorLastSavedByKey                  = "last_saved_by"
	translationEditorComparisonModeSnapshot          = "snapshot"
	translationEditorComparisonModeHashOnly          = "hash_only"
	translationEditorDefaultVersion            int64 = 1
)

type translationEditorContext struct {
	Environment          string
	Family               translationservices.FamilyRecord
	Policy               translationservices.FamilyPolicy
	SourceVariant        translationservices.FamilyVariant
	TargetVariant        translationservices.FamilyVariant
	SourceFields         map[string]string
	TargetFields         map[string]string
	CurrentSourceHash    string
	LastSyncedSourceHash string
	LastSyncedFields     map[string]string
	TargetRowVersion     int64
	SourceVersion        string
	SourceRecordID       string
	TargetRecordID       string
	TargetStatus         string
	ActivityEntries      []ActivityEntry
	HasTarget            bool
}

type translationEditorSourceSyncState struct {
	SourceHash   string
	SourceFields map[string]string
}

func (b *translationQueueBinding) AssignmentDetail(c router.Context, assignmentID string) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.detail",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()

	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)

	assignment, err := repo.Get(adminCtx.Context, strings.TrimSpace(assignmentID))
	if err != nil {
		return nil, err
	}
	if err := b.ensureAssignmentScope(identity, assignment); err != nil {
		return nil, err
	}

	environment := strings.TrimSpace(firstNonEmpty(c.Query("environment"), adminCtx.Channel))
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, environment)
	if err != nil {
		return nil, err
	}
	historyPage := clampInt(atoiDefault(c.Query("history_page"), 1), 1, 10_000)
	historyPerPage := clampInt(atoiDefault(c.Query("history_per_page"), 10), 1, 100)

	return map[string]any{
		"data": b.assignmentDetailPayload(adminCtx.Context, assignment, editorCtx, now, historyPage, historyPerPage),
		"meta": map[string]any{
			"environment":      environment,
			"history_page":     historyPage,
			"history_per_page": historyPerPage,
		},
	}, nil
}

func (b *translationQueueBinding) UpdateVariant(c router.Context, variantID string, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.variants.update",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()

	if err := rejectTranslationClientIdentityFields(body); err != nil {
		return nil, err
	}
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_editor_binding",
		})
	}

	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); err != nil {
		return nil, err
	}

	environment := strings.TrimSpace(firstNonEmpty(toString(body["environment"]), c.Query("environment"), adminCtx.Channel))
	editorCtx, err := b.loadVariantEditorContext(adminCtx.Context, strings.TrimSpace(variantID), environment)
	if err != nil {
		return nil, err
	}
	identity := translationIdentityFromAdminContext(adminCtx)
	if err := b.ensureEditorScope(identity, editorCtx); err != nil {
		return nil, err
	}
	if !editorCtx.HasTarget {
		return nil, notFoundDomainError("translation variant not found", map[string]any{
			"variant_id": strings.TrimSpace(variantID),
		})
	}

	fields, err := parseTranslationEditorFields(body["fields"])
	if err != nil {
		return nil, err
	}
	metadata := extractMap(body["metadata"])
	expectedVersion := translationEditorExpectedVersion(body)
	if expectedVersion <= 0 {
		return nil, validationDomainError("expected_version must be > 0", map[string]any{
			"field": "expected_version",
		})
	}
	if editorCtx.TargetRowVersion != expectedVersion {
		latestState := b.assignmentDetailVariantConflictPayload(adminCtx.Context, editorCtx)
		if translationEditorAutosaveRequested(body) {
			return nil, AutosaveConflictError{
				Panel:             editorCtx.Family.ContentType,
				EntityID:          strings.TrimSpace(editorCtx.TargetRecordID),
				Version:           strconv.FormatInt(editorCtx.TargetRowVersion, 10),
				ExpectedVersion:   strconv.FormatInt(expectedVersion, 10),
				LatestStatePath:   strings.TrimSpace(editorCtx.TargetVariant.ID),
				LatestServerState: latestState,
			}
		}
		return nil, NewDomainError(string(translationcore.ErrorVersionConflict), "translation variant version conflict", map[string]any{
			"variant_id":        strings.TrimSpace(editorCtx.TargetVariant.ID),
			"record_id":         strings.TrimSpace(editorCtx.TargetRecordID),
			"expected_version":  expectedVersion,
			"actual_version":    editorCtx.TargetRowVersion,
			"translation_group": strings.TrimSpace(editorCtx.Family.ID),
		})
	}

	actorID := strings.TrimSpace(identity.ActorID)
	sourceSyncState, err := b.resolveEditorSourceSyncState(editorCtx, body, metadata)
	if err != nil {
		return nil, err
	}
	updatedRecord, updatedFields, nextVersion, err := b.persistEditorVariantUpdate(adminCtx.Context, editorCtx, fields, metadata, actorID, sourceSyncState)
	if err != nil {
		return nil, err
	}
	if b.admin.activity != nil {
		_ = b.admin.activity.Record(adminCtx.Context, ActivityEntry{
			Actor:  actorID,
			Action: "translation.variant.saved",
			Object: "translation_variant:" + strings.TrimSpace(editorCtx.TargetVariant.ID),
			Metadata: map[string]any{
				"family_id":     strings.TrimSpace(editorCtx.Family.ID),
				"variant_id":    strings.TrimSpace(editorCtx.TargetVariant.ID),
				"record_id":     strings.TrimSpace(editorCtx.TargetRecordID),
				"content_type":  strings.TrimSpace(editorCtx.Family.ContentType),
				"target_locale": strings.TrimSpace(editorCtx.TargetVariant.Locale),
				"row_version":   nextVersion,
				"autosave":      translationEditorAutosaveRequested(body),
			},
		})
	}

	reloaded, err := b.loadVariantEditorContext(adminCtx.Context, strings.TrimSpace(variantID), environment)
	if err != nil {
		return nil, err
	}
	reloaded.TargetFields = updatedFields
	reloaded.TargetRecordID = strings.TrimSpace(editorVariantRecordID(updatedRecord))
	reloaded.TargetRowVersion = nextVersion
	currentAssignment := translationEditorAssignmentByLocale(reloaded.Family, reloaded.TargetVariant.Locale)

	return map[string]any{
		"data": map[string]any{
			"variant_id":               strings.TrimSpace(reloaded.TargetVariant.ID),
			"family_id":                strings.TrimSpace(reloaded.Family.ID),
			"record_id":                strings.TrimSpace(reloaded.TargetRecordID),
			"status":                   strings.TrimSpace(reloaded.TargetStatus),
			"row_version":              nextVersion,
			"version":                  nextVersion,
			"fields":                   cloneStringMap(reloaded.TargetFields),
			"source_hash_at_last_sync": strings.TrimSpace(reloaded.LastSyncedSourceHash),
			"source_target_drift":      translationEditorDriftPayload(reloaded),
			"field_completeness":       translationEditorFieldCompleteness(reloaded),
			"field_drift":              translationEditorFieldDrift(reloaded),
			"field_validations":        translationEditorFieldValidations(reloaded),
			"updated_at":               translationEditorRecordUpdatedAt(updatedRecord),
			"assignment_action_states": b.assignmentEditorActionStates(adminCtx.Context, reloaded, currentAssignment),
			"review_action_states":     b.reviewActionStates(adminCtx.Context, currentAssignment),
			"qa_results":               b.translationQAResults(reloaded),
			"assist":                   translationEditorAssistPayload(reloaded),
		},
		"meta": map[string]any{
			"environment": environment,
			"autosave":    translationEditorAutosaveRequested(body),
		},
	}, nil
}

func (b *translationQueueBinding) loadAssignmentEditorContext(ctx context.Context, assignment TranslationAssignment, environment string) (translationEditorContext, error) {
	familyBinding := &translationFamilyBinding{admin: b.admin}
	runtime, err := familyBinding.runtime(ctx, environment)
	if err != nil {
		return translationEditorContext{}, err
	}
	scope := translationservices.Scope{
		TenantID: strings.TrimSpace(assignment.TenantID),
		OrgID:    strings.TrimSpace(assignment.OrgID),
	}
	if scope.TenantID == "" {
		scope.TenantID = tenantIDFromContext(ctx)
	}
	if scope.OrgID == "" {
		scope.OrgID = orgIDFromContext(ctx)
	}
	family, ok, err := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: environment,
		FamilyID:    strings.TrimSpace(assignment.TranslationGroupID),
	})
	if err != nil {
		return translationEditorContext{}, err
	}
	if !ok {
		return translationEditorContext{}, notFoundDomainError("translation family not found", map[string]any{
			"family_id": strings.TrimSpace(assignment.TranslationGroupID),
		})
	}

	sourceVariant := translationFamilySourceVariant(family)
	targetVariant, hasTarget := translationFamilyVariantByLocale(family, assignment.TargetLocale)

	sourceFields := cloneStringMap(sourceVariant.Fields)
	targetFields := map[string]string{}
	targetRecordID := strings.TrimSpace(assignment.TargetRecordID)
	targetStatus := string(translationcore.VariantStatusDraft)
	targetVersion := translationEditorDefaultVersion
	lastSyncedSourceHash := ""
	lastSyncedFields := map[string]string{}

	if hasTarget {
		targetFields = cloneStringMap(targetVariant.Fields)
		if targetRecordID == "" {
			targetRecordID = strings.TrimSpace(targetVariant.SourceRecordID)
		}
		targetStatus = strings.TrimSpace(targetVariant.Status)
		targetVersion = translationEditorVariantVersionFromMetadata(targetVariant.Metadata)
		lastSyncedSourceHash = strings.TrimSpace(firstNonEmpty(
			targetVariant.SourceHashAtLastSync,
			translationEditorSourceHashFromMetadata(targetVariant.Metadata),
		))
		lastSyncedFields = translationEditorSourceFieldsFromMetadata(targetVariant.Metadata)
	}

	entries := []ActivityEntry{}
	if b != nil && b.admin != nil && b.admin.activity != nil {
		entries, _ = b.admin.activity.List(ctx, 50, ActivityFilter{
			Object: "translation_assignment:" + strings.TrimSpace(assignment.ID),
		})
	}

	sourceVersion := ""
	if !sourceVariant.UpdatedAt.IsZero() {
		sourceVersion = sourceVariant.UpdatedAt.UTC().Format(time.RFC3339)
	}

	return translationEditorContext{
		Environment:          environment,
		Family:               family,
		Policy:               family.Policy,
		SourceVariant:        sourceVariant,
		TargetVariant:        targetVariant,
		SourceFields:         sourceFields,
		TargetFields:         targetFields,
		CurrentSourceHash:    translationEditorHashFields(sourceFields),
		LastSyncedSourceHash: lastSyncedSourceHash,
		LastSyncedFields:     lastSyncedFields,
		TargetRowVersion:     targetVersion,
		SourceVersion:        sourceVersion,
		SourceRecordID:       strings.TrimSpace(sourceVariant.SourceRecordID),
		TargetRecordID:       targetRecordID,
		TargetStatus:         targetStatus,
		ActivityEntries:      entries,
		HasTarget:            hasTarget,
	}, nil
}

func (b *translationQueueBinding) loadVariantEditorContext(ctx context.Context, variantID, environment string) (translationEditorContext, error) {
	familyBinding := &translationFamilyBinding{admin: b.admin}
	runtime, err := familyBinding.runtime(ctx, environment)
	if err != nil {
		return translationEditorContext{}, err
	}
	page := 1
	perPage := 200
	for {
		result, listErr := runtime.service.List(ctx, translationservices.ListFamiliesInput{
			Scope: translationservices.Scope{
				TenantID: tenantIDFromContext(ctx),
				OrgID:    orgIDFromContext(ctx),
			},
			Environment: environment,
			Page:        page,
			PerPage:     perPage,
		})
		if listErr != nil {
			return translationEditorContext{}, listErr
		}
		for _, family := range result.Items {
			for _, variant := range family.Variants {
				if !strings.EqualFold(strings.TrimSpace(variant.ID), strings.TrimSpace(variantID)) {
					continue
				}
				assignment := TranslationAssignment{
					TranslationGroupID: strings.TrimSpace(family.ID),
					TargetLocale:       strings.TrimSpace(variant.Locale),
					TargetRecordID:     strings.TrimSpace(variant.SourceRecordID),
					TenantID:           strings.TrimSpace(family.TenantID),
					OrgID:              strings.TrimSpace(family.OrgID),
				}
				return b.loadAssignmentEditorContext(ctx, assignment, environment)
			}
		}
		if page*perPage >= result.Total || len(result.Items) == 0 {
			break
		}
		page++
	}
	return translationEditorContext{}, notFoundDomainError("translation variant not found", map[string]any{
		"variant_id": strings.TrimSpace(variantID),
	})
}

func (b *translationQueueBinding) assignmentDetailPayload(ctx context.Context, assignment TranslationAssignment, editorCtx translationEditorContext, now time.Time, historyPage, historyPerPage int) map[string]any {
	row := b.assignmentContractRow(ctx, assignment, now)
	editorActions := b.assignmentEditorActionStates(ctx, editorCtx, assignment)
	fieldCompleteness := translationEditorFieldCompleteness(editorCtx)
	fieldDrift := translationEditorFieldDrift(editorCtx)
	fieldValidations := translationEditorFieldValidations(editorCtx)
	fields := translationEditorFieldPayloads(editorCtx)
	comments, events := translationEditorTimeline(editorCtx, assignment)
	attachments := translationEditorAttachments(editorCtx)
	reviewFeedback := translationEditorReviewFeedbackPayload(assignment, comments)

	payload := map[string]any{
		"assignment_id":            strings.TrimSpace(assignment.ID),
		"assignment_row_version":   assignment.Version,
		"assignment_version":       assignment.Version,
		"family_id":                strings.TrimSpace(editorCtx.Family.ID),
		"variant_id":               strings.TrimSpace(editorCtx.TargetVariant.ID),
		"entity_type":              strings.TrimSpace(editorCtx.Family.ContentType),
		"source_locale":            strings.TrimSpace(editorCtx.SourceVariant.Locale),
		"target_locale":            strings.TrimSpace(assignment.TargetLocale),
		"status":                   normalizeTranslationQueueState(string(assignment.Status)),
		"priority":                 strings.TrimSpace(string(assignment.Priority)),
		"row_version":              editorCtx.TargetRowVersion,
		"version":                  editorCtx.TargetRowVersion,
		"source_record_id":         strings.TrimSpace(editorCtx.SourceRecordID),
		"target_record_id":         strings.TrimSpace(editorCtx.TargetRecordID),
		"source_variant":           cloneFamilyVariantPayload(editorCtx.SourceVariant),
		"target_variant":           cloneFamilyVariantPayload(editorCtx.TargetVariant),
		"source_fields":            cloneStringMap(editorCtx.SourceFields),
		"target_fields":            cloneStringMap(editorCtx.TargetFields),
		"fields":                   fields,
		"field_completeness":       fieldCompleteness,
		"field_drift":              fieldDrift,
		"field_validations":        fieldValidations,
		"source_target_drift":      translationEditorDriftPayload(editorCtx),
		"actions":                  editorActions,
		"editor_actions":           editorActions,
		"assignment_action_states": editorActions,
		"review_actions":           b.reviewActionStates(ctx, assignment),
		"review_action_states":     b.reviewActionStates(ctx, assignment),
		"comments":                 comments,
		"events":                   events,
		"history":                  translationEditorHistoryPayload(comments, events, historyPage, historyPerPage),
		"attachments":              attachments,
		"attachment_summary":       translationEditorAttachmentSummary(attachments),
		"review_feedback":          reviewFeedback,
		"last_rejection_reason":    strings.TrimSpace(assignment.LastRejectionReason),
		"qa_results":               b.translationQAResults(editorCtx),
		"assist":                   translationEditorAssistPayload(editorCtx),
		"glossary_matches":         translationEditorGlossaryMatches(editorCtx),
		"style_guide_summary":      translationEditorStyleGuideSummary(editorCtx),
		"translation_assignment":   row,
	}
	if assignment.DueDate != nil {
		payload["due_date"] = assignment.DueDate
	}
	return payload
}

func (b *translationQueueBinding) assignmentEditorActionStates(ctx context.Context, editorCtx translationEditorContext, assignment TranslationAssignment) map[string]any {
	actions := map[string]any{}
	for key, value := range b.assignmentActionStates(ctx, assignment) {
		actions[key] = value
	}
	submitState := b.queueActionState(ctx, assignment.Status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress")
	submitState["auto_approve"] = !editorCtx.Policy.ReviewRequired
	submitState["missing_required_fields"] = translationEditorMissingRequiredFields(editorCtx)
	actions["submit_review"] = submitState
	actions["approve"] = b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review")
	actions["reject"] = b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review")
	actions["archive"] = b.queueActionState(ctx, assignment.Status != AssignmentStatusPublished, PermAdminTranslationsManage, "published assignments cannot be archived")
	return actions
}

func translationEditorFieldPayloads(editorCtx translationEditorContext) []map[string]any {
	fieldCompleteness := translationEditorFieldCompleteness(editorCtx)
	fieldDrift := translationEditorFieldDrift(editorCtx)
	fieldValidations := translationEditorFieldValidations(editorCtx)
	required := translationEditorRequiredFieldSet(editorCtx)
	paths := translationEditorFieldPaths(editorCtx)
	out := make([]map[string]any, 0, len(paths))
	for _, path := range paths {
		entry := map[string]any{
			"path":          path,
			"label":         translationEditorFieldLabel(path),
			"input_type":    translationEditorInputType(path),
			"required":      required[path],
			"source_value":  strings.TrimSpace(editorCtx.SourceFields[path]),
			"target_value":  strings.TrimSpace(editorCtx.TargetFields[path]),
			"completeness":  fieldCompleteness[path],
			"drift":         fieldDrift[path],
			"validation":    fieldValidations[path],
			"has_assist":    len(translationEditorGlossaryMatchesForField(editorCtx, path)) > 0,
			"glossary_hits": translationEditorGlossaryMatchesForField(editorCtx, path),
		}
		out = append(out, entry)
	}
	return out
}

func translationEditorFieldCompleteness(editorCtx translationEditorContext) map[string]any {
	required := translationEditorRequiredFieldSet(editorCtx)
	paths := translationEditorFieldPaths(editorCtx)
	out := make(map[string]any, len(paths))
	for _, path := range paths {
		value := strings.TrimSpace(editorCtx.TargetFields[path])
		req := required[path]
		out[path] = map[string]any{
			"required": req,
			"complete": !req || value != "",
			"missing":  req && value == "",
		}
	}
	return out
}

func translationEditorFieldValidations(editorCtx translationEditorContext) map[string]any {
	completeness := translationEditorFieldCompleteness(editorCtx)
	paths := translationEditorFieldPaths(editorCtx)
	out := make(map[string]any, len(paths))
	for _, path := range paths {
		entry := extractMap(completeness[path])
		missing, _ := entry["missing"].(bool)
		out[path] = map[string]any{
			"valid":   !missing,
			"message": translationEditorValidationMessage(path, missing),
		}
	}
	return out
}

func translationEditorFieldDrift(editorCtx translationEditorContext) map[string]any {
	paths := translationEditorFieldPaths(editorCtx)
	changedFields, mode := translationEditorChangedFields(editorCtx)
	changedSet := map[string]struct{}{}
	for _, path := range changedFields {
		changedSet[path] = struct{}{}
	}
	out := make(map[string]any, len(paths))
	for _, path := range paths {
		_, changed := changedSet[path]
		out[path] = map[string]any{
			"changed":               changed,
			"comparison_mode":       mode,
			"previous_source_value": strings.TrimSpace(editorCtx.LastSyncedFields[path]),
			"current_source_value":  strings.TrimSpace(editorCtx.SourceFields[path]),
		}
	}
	return out
}

func translationEditorDriftPayload(editorCtx translationEditorContext) map[string]any {
	changedFields, mode := translationEditorChangedFields(editorCtx)
	return map[string]any{
		translationSourceTargetDriftSourceHashKey:        strings.TrimSpace(editorCtx.LastSyncedSourceHash),
		translationSourceTargetDriftCurrentSourceHashKey: strings.TrimSpace(editorCtx.CurrentSourceHash),
		translationSourceTargetDriftSourceVersionKey:     strings.TrimSpace(editorCtx.SourceVersion),
		translationSourceTargetDriftChangedSummaryKey: map[string]any{
			translationSourceTargetDriftSummaryCountKey:  len(changedFields),
			translationSourceTargetDriftSummaryFieldsKey: append([]string{}, changedFields...),
		},
		"comparison_mode": mode,
		"fields_by_path":  translationEditorFieldDrift(editorCtx),
	}
}

func translationEditorChangedFields(editorCtx translationEditorContext) ([]string, string) {
	if strings.TrimSpace(editorCtx.CurrentSourceHash) == "" || strings.TrimSpace(editorCtx.CurrentSourceHash) == strings.TrimSpace(editorCtx.LastSyncedSourceHash) {
		return []string{}, translationEditorComparisonModeSnapshot
	}
	paths := translationEditorFieldPaths(editorCtx)
	if len(editorCtx.LastSyncedFields) == 0 {
		return append([]string{}, paths...), translationEditorComparisonModeHashOnly
	}
	changed := []string{}
	for _, path := range paths {
		if strings.TrimSpace(editorCtx.LastSyncedFields[path]) != strings.TrimSpace(editorCtx.SourceFields[path]) {
			changed = append(changed, path)
		}
	}
	return changed, translationEditorComparisonModeSnapshot
}

func translationEditorRequiredFieldSet(editorCtx translationEditorContext) map[string]bool {
	out := map[string]bool{}
	for _, field := range editorCtx.Policy.RequiredFields[strings.TrimSpace(strings.ToLower(editorCtx.TargetVariant.Locale))] {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		out[field] = true
	}
	return out
}

func translationEditorFieldPaths(editorCtx translationEditorContext) []string {
	set := map[string]struct{}{}
	for key := range editorCtx.SourceFields {
		if key = strings.TrimSpace(key); key != "" {
			set[key] = struct{}{}
		}
	}
	for key := range editorCtx.TargetFields {
		if key = strings.TrimSpace(key); key != "" {
			set[key] = struct{}{}
		}
	}
	for key := range translationEditorRequiredFieldSet(editorCtx) {
		set[key] = struct{}{}
	}
	out := make([]string, 0, len(set))
	for key := range set {
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func translationEditorMissingRequiredFields(editorCtx translationEditorContext) []string {
	completeness := translationEditorFieldCompleteness(editorCtx)
	out := []string{}
	for _, path := range translationEditorFieldPaths(editorCtx) {
		entry := extractMap(completeness[path])
		missing, _ := entry["missing"].(bool)
		if missing {
			out = append(out, path)
		}
	}
	return out
}

func translationEditorAssistPayload(editorCtx translationEditorContext) map[string]any {
	return map[string]any{
		"glossary_matches":               translationEditorGlossaryMatches(editorCtx),
		"style_guide_summary":            translationEditorStyleGuideSummary(editorCtx),
		"translation_memory_suggestions": []map[string]any{},
	}
}

func translationEditorGlossaryMatches(editorCtx translationEditorContext) []map[string]any {
	library := translationEditorGlossaryLibrary(strings.TrimSpace(strings.ToLower(editorCtx.TargetVariant.Locale)))
	if len(library) == 0 {
		return []map[string]any{}
	}
	matches := []map[string]any{}
	seen := map[string]struct{}{}
	for _, path := range translationEditorFieldPaths(editorCtx) {
		sourceValue := strings.ToLower(strings.TrimSpace(editorCtx.SourceFields[path]))
		if sourceValue == "" {
			continue
		}
		for _, candidate := range library {
			term := strings.ToLower(strings.TrimSpace(toString(candidate["term"])))
			if term == "" || !strings.Contains(sourceValue, term) {
				continue
			}
			key := path + ":" + term
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			match := cloneAnyMap(candidate)
			match["field_paths"] = []string{path}
			matches = append(matches, match)
		}
	}
	return matches
}

func translationEditorGlossaryMatchesForField(editorCtx translationEditorContext, fieldPath string) []map[string]any {
	out := []map[string]any{}
	for _, match := range translationEditorGlossaryMatches(editorCtx) {
		fieldPaths := toStringSlice(match["field_paths"])
		for _, candidate := range fieldPaths {
			if strings.EqualFold(strings.TrimSpace(candidate), strings.TrimSpace(fieldPath)) {
				out = append(out, cloneAnyMap(match))
				break
			}
		}
	}
	return out
}

func translationEditorStyleGuideSummary(editorCtx translationEditorContext) map[string]any {
	locale := strings.TrimSpace(strings.ToLower(editorCtx.TargetVariant.Locale))
	contentType := strings.TrimSpace(strings.ToLower(editorCtx.Family.ContentType))
	if locale == "" || contentType == "" {
		return map[string]any{
			"available": false,
			"title":     "",
			"summary":   "",
			"rules":     []string{},
		}
	}
	title := fmt.Sprintf("%s %s Style Guide", strings.ToUpper(locale), strings.Title(strings.ReplaceAll(contentType, "_", " ")))
	summary := "Keep terminology consistent, preserve links/placeholders, and mirror source structure before stylistic changes."
	return map[string]any{
		"available":        true,
		"locale":           locale,
		"content_type":     contentType,
		"title":            title,
		"summary":          summary,
		"summary_markdown": summary,
		"rules":            translationEditorStyleGuideRules(locale, contentType),
		"last_reviewed_at": "",
		"style_guide_id":   "builtin:" + contentType + ":" + locale,
	}
}

func translationEditorAttachments(editorCtx translationEditorContext) []map[string]any {
	if !editorCtx.HasTarget {
		return []map[string]any{}
	}
	attachments := extractMap(editorCtx.TargetVariant.Metadata)["attachments"]
	rawItems, ok := attachments.([]any)
	if !ok || len(rawItems) == 0 {
		return []map[string]any{}
	}
	out := make([]map[string]any, 0, len(rawItems))
	for _, raw := range rawItems {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		normalized := cloneAnyMap(item)
		if strings.TrimSpace(toString(normalized["id"])) == "" {
			normalized["id"] = fmt.Sprintf("attachment-%d", len(out)+1)
		}
		if strings.TrimSpace(toString(normalized["kind"])) == "" {
			normalized["kind"] = "reference"
		}
		if strings.TrimSpace(toString(normalized["filename"])) == "" {
			normalized["filename"] = "attachment"
		}
		if _, ok := normalized["byte_size"]; !ok {
			normalized["byte_size"] = 0
		}
		if _, ok := normalized["uploaded_at"]; !ok {
			normalized["uploaded_at"] = ""
		}
		if _, ok := normalized["description"]; !ok {
			normalized["description"] = ""
		}
		if _, ok := normalized["url"]; !ok {
			normalized["url"] = ""
		}
		out = append(out, normalized)
	}
	return out
}

func translationEditorTimeline(editorCtx translationEditorContext, assignment TranslationAssignment) ([]map[string]any, []map[string]any) {
	comments := []map[string]any{}
	events := []map[string]any{}
	lastReason := strings.TrimSpace(assignment.LastRejectionReason)
	if lastReason != "" && !translationEditorHasCommentBody(editorCtx.ActivityEntries, lastReason) {
		comments = append(comments, map[string]any{
			"id":         "comment:last_rejection_reason",
			"author_id":  strings.TrimSpace(firstNonEmpty(assignment.LastReviewerID, assignment.ReviewerID)),
			"title":      "Review feedback",
			"body":       lastReason,
			"created_at": assignment.UpdatedAt,
			"kind":       "review_feedback",
		})
	}
	for _, entry := range editorCtx.ActivityEntries {
		if comment, ok := translationEditorCommentFromActivity(entry); ok {
			comments = append(comments, comment)
			continue
		}
		events = append(events, map[string]any{
			"id":         strings.TrimSpace(entry.ID),
			"actor_id":   strings.TrimSpace(entry.Actor),
			"action":     strings.TrimSpace(entry.Action),
			"object":     strings.TrimSpace(entry.Object),
			"metadata":   cloneAnyMap(entry.Metadata),
			"created_at": entry.CreatedAt,
		})
	}
	return comments, events
}

func translationEditorCommentFromActivity(entry ActivityEntry) (map[string]any, bool) {
	action := strings.TrimSpace(strings.ToLower(entry.Action))
	if action == "" {
		return nil, false
	}
	metadata := cloneAnyMap(entry.Metadata)
	body := translationEditorCommentBody(metadata)
	if !strings.Contains(action, "comment") && !strings.EqualFold(toString(metadata["kind"]), "review_feedback") && !strings.EqualFold(action, "translation.review.feedback") {
		return nil, false
	}
	if body == "" {
		return nil, false
	}
	kind := strings.TrimSpace(firstNonEmpty(toString(metadata["kind"]), "comment"))
	title := "Comment"
	if strings.EqualFold(kind, "review_feedback") {
		title = "Review feedback"
	}
	return map[string]any{
		"id":         strings.TrimSpace(entry.ID),
		"title":      title,
		"author_id":  strings.TrimSpace(entry.Actor),
		"actor_id":   strings.TrimSpace(entry.Actor),
		"action":     strings.TrimSpace(entry.Action),
		"body":       body,
		"kind":       kind,
		"metadata":   metadata,
		"created_at": entry.CreatedAt,
	}, true
}

func translationEditorCommentBody(metadata map[string]any) string {
	lines := []string{}
	body := strings.TrimSpace(firstNonEmpty(
		toString(metadata["body"]),
		toString(metadata["comment"]),
		toString(metadata["message"]),
		toString(metadata["text"]),
		toString(metadata["reason"]),
	))
	if body != "" {
		lines = append(lines, body)
	}
	for _, note := range toStringSlice(metadata["terminology_notes"]) {
		note = strings.TrimSpace(note)
		if note == "" {
			continue
		}
		lines = append(lines, "Terminology: "+note)
	}
	for _, note := range toStringSlice(metadata["style_notes"]) {
		note = strings.TrimSpace(note)
		if note == "" {
			continue
		}
		lines = append(lines, "Style: "+note)
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func translationEditorHasCommentBody(entries []ActivityEntry, body string) bool {
	body = strings.TrimSpace(body)
	if body == "" {
		return false
	}
	for _, entry := range entries {
		if strings.EqualFold(translationEditorCommentBody(entry.Metadata), body) {
			return true
		}
	}
	return false
}

func translationEditorReviewFeedbackPayload(assignment TranslationAssignment, comments []map[string]any) map[string]any {
	reviewComments := []map[string]any{}
	for _, comment := range comments {
		if !strings.EqualFold(strings.TrimSpace(toString(comment["kind"])), "review_feedback") {
			continue
		}
		reviewComments = append(reviewComments, cloneAnyMap(comment))
	}
	if len(reviewComments) == 0 && strings.TrimSpace(assignment.LastRejectionReason) == "" {
		return nil
	}
	return map[string]any{
		"last_rejection_reason": strings.TrimSpace(assignment.LastRejectionReason),
		"comments":              reviewComments,
	}
}

func translationEditorHistoryPayload(comments, events []map[string]any, page, perPage int) map[string]any {
	items := make([]map[string]any, 0, len(comments)+len(events))
	for _, comment := range comments {
		entry := cloneAnyMap(comment)
		entry["entry_type"] = "comment"
		if strings.TrimSpace(toString(entry["title"])) == "" {
			entry["title"] = "Comment"
		}
		items = append(items, entry)
	}
	for _, event := range events {
		entry := cloneAnyMap(event)
		entry["entry_type"] = "event"
		entry["title"] = strings.TrimSpace(firstNonEmpty(toString(entry["action"]), "Activity"))
		items = append(items, entry)
	}
	sort.SliceStable(items, func(i, j int) bool {
		left := strings.TrimSpace(toString(items[i]["created_at"]))
		right := strings.TrimSpace(toString(items[j]["created_at"]))
		return left > right
	})
	total := len(items)
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 {
		perPage = 10
	}
	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}
	paged := []map[string]any{}
	if start < end {
		paged = items[start:end]
	}
	hasMore := end < total
	nextPage := 0
	if hasMore {
		nextPage = page + 1
	}
	return map[string]any{
		"items":     paged,
		"page":      page,
		"per_page":  perPage,
		"total":     total,
		"has_more":  hasMore,
		"next_page": nextPage,
	}
}

func translationEditorAttachmentSummary(attachments []map[string]any) map[string]any {
	kinds := map[string]int{}
	for _, attachment := range attachments {
		kind := strings.TrimSpace(toString(attachment["kind"]))
		if kind == "" {
			kind = "reference"
		}
		kinds[kind]++
	}
	return map[string]any{
		"total": len(attachments),
		"kinds": kinds,
	}
}

func translationEditorExpectedVersion(body map[string]any) int64 {
	for _, key := range []string{"expected_version", "expectedVersion", "version"} {
		switch raw := body[key].(type) {
		case int:
			return int64(raw)
		case int32:
			return int64(raw)
		case int64:
			return raw
		case float32:
			return int64(raw)
		case float64:
			return int64(raw)
		case string:
			if parsed, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64); err == nil {
				return parsed
			}
		}
	}
	return 0
}

func translationEditorAutosaveRequested(body map[string]any) bool {
	if toBool(body["autosave"]) || toBool(body["is_autosave"]) {
		return true
	}
	spec := extractMap(body["autosave"])
	return toBool(spec["enabled"]) || toBool(spec["active"]) || toBool(spec["value"])
}

func parseTranslationEditorFields(raw any) (map[string]string, error) {
	fields, ok := raw.(map[string]any)
	if !ok {
		if raw == nil {
			return map[string]string{}, nil
		}
		return nil, validationDomainError("fields must be an object", map[string]any{
			"field": "fields",
		})
	}
	out := map[string]string{}
	for key, value := range fields {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		switch typed := value.(type) {
		case string:
			out[key] = typed
		case nil:
			out[key] = ""
		default:
			out[key] = strings.TrimSpace(toString(typed))
		}
	}
	return out, nil
}

func (b *translationQueueBinding) ensureEditorScope(identity translationTransportIdentity, editorCtx translationEditorContext) error {
	assignment := TranslationAssignment{
		ID:                 "",
		TranslationGroupID: strings.TrimSpace(editorCtx.Family.ID),
		TenantID:           strings.TrimSpace(editorCtx.Family.TenantID),
		OrgID:              strings.TrimSpace(editorCtx.Family.OrgID),
	}
	return b.ensureAssignmentScope(identity, assignment)
}

func (b *translationQueueBinding) assignmentDetailVariantConflictPayload(ctx context.Context, editorCtx translationEditorContext) map[string]any {
	assignment := translationEditorAssignmentByLocale(editorCtx.Family, editorCtx.TargetVariant.Locale)
	return map[string]any{
		"variant_id":               strings.TrimSpace(editorCtx.TargetVariant.ID),
		"family_id":                strings.TrimSpace(editorCtx.Family.ID),
		"record_id":                strings.TrimSpace(editorCtx.TargetRecordID),
		"row_version":              editorCtx.TargetRowVersion,
		"fields":                   cloneStringMap(editorCtx.TargetFields),
		"field_completeness":       translationEditorFieldCompleteness(editorCtx),
		"field_drift":              translationEditorFieldDrift(editorCtx),
		"field_validations":        translationEditorFieldValidations(editorCtx),
		"source_target_drift":      translationEditorDriftPayload(editorCtx),
		"assist":                   translationEditorAssistPayload(editorCtx),
		"assignment_action_states": b.assignmentEditorActionStates(ctx, editorCtx, assignment),
	}
}

func translationEditorAssignmentByLocale(family translationservices.FamilyRecord, locale string) TranslationAssignment {
	targetLocale := strings.TrimSpace(strings.ToLower(locale))
	if targetLocale == "" {
		return TranslationAssignment{}
	}
	for _, item := range family.Assignments {
		if !strings.EqualFold(strings.TrimSpace(item.TargetLocale), targetLocale) {
			continue
		}
		return TranslationAssignment{
			ID:                 strings.TrimSpace(item.ID),
			TranslationGroupID: strings.TrimSpace(family.ID),
			TargetLocale:       targetLocale,
			Status:             AssignmentStatus(strings.TrimSpace(item.Status)),
			AssigneeID:         strings.TrimSpace(item.AssigneeID),
			ReviewerID:         strings.TrimSpace(item.ReviewerID),
			Priority:           Priority(strings.TrimSpace(item.Priority)),
			DueDate:            cloneTimePtr(item.DueDate),
			UpdatedAt:          item.UpdatedAt,
			CreatedAt:          item.CreatedAt,
		}
	}
	return TranslationAssignment{}
}

func (b *translationQueueBinding) resolveEditorSourceSyncState(editorCtx translationEditorContext, body, metadata map[string]any) (translationEditorSourceSyncState, error) {
	state := translationEditorSourceSyncState{
		SourceHash:   strings.TrimSpace(editorCtx.LastSyncedSourceHash),
		SourceFields: cloneStringMap(editorCtx.LastSyncedFields),
	}
	requestedHash := strings.TrimSpace(firstNonEmpty(
		toString(body[translationEditorAcknowledgedSourceHashKey]),
		toString(body[translationEditorSourceHashAtLastSyncKey]),
		toString(metadata[translationEditorAcknowledgedSourceHashKey]),
		toString(metadata[translationEditorSourceHashAtLastSyncKey]),
	))
	if requestedHash == "" {
		return state, nil
	}

	currentHash := strings.TrimSpace(editorCtx.CurrentSourceHash)
	if currentHash != "" && strings.EqualFold(requestedHash, currentHash) {
		return translationEditorSourceSyncState{
			SourceHash:   currentHash,
			SourceFields: cloneStringMap(editorCtx.SourceFields),
		}, nil
	}
	if state.SourceHash != "" && strings.EqualFold(requestedHash, state.SourceHash) {
		return state, nil
	}
	return translationEditorSourceSyncState{}, NewDomainError(string(translationcore.ErrorVersionConflict), "translation source acknowledgement is stale", map[string]any{
		"field":                    translationEditorAcknowledgedSourceHashKey,
		"variant_id":               strings.TrimSpace(editorCtx.TargetVariant.ID),
		"family_id":                strings.TrimSpace(editorCtx.Family.ID),
		"requested_source_hash":    requestedHash,
		"source_hash_at_last_sync": state.SourceHash,
		"current_source_hash":      currentHash,
		"source_target_drift":      translationEditorDriftPayload(editorCtx),
	})
}

func (b *translationQueueBinding) persistEditorVariantUpdate(ctx context.Context, editorCtx translationEditorContext, fields map[string]string, metadata map[string]any, actorID string, sourceSyncState translationEditorSourceSyncState) (any, map[string]string, int64, error) {
	if b == nil || b.admin == nil || b.admin.contentSvc == nil {
		return nil, nil, 0, serviceNotConfiguredDomainError("content service", map[string]any{
			"component": "translation_editor_binding",
		})
	}
	nextFields := cloneStringMap(editorCtx.TargetFields)
	for key, value := range fields {
		nextFields[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}
	nextVersion := editorCtx.TargetRowVersion + 1
	if nextVersion <= 0 {
		nextVersion = translationEditorDefaultVersion
	}
	syncHash := strings.TrimSpace(sourceSyncState.SourceHash)
	syncFields := cloneStringMap(sourceSyncState.SourceFields)
	now := b.now().UTC()

	if strings.EqualFold(strings.TrimSpace(editorCtx.Family.ContentType), "pages") {
		record, err := b.admin.contentSvc.Page(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
		if err != nil || record == nil {
			return nil, nil, 0, err
		}
		updated := cloneCMSPage(*record)
		for key, value := range nextFields {
			translationEditorSetPageField(&updated, key, value)
		}
		if updated.Status == "" || strings.EqualFold(updated.Status, string(translationcore.VariantStatusDraft)) {
			updated.Status = string(translationcore.VariantStatusInProgress)
		}
		updated.Metadata = translationEditorMergeMetadata(updated.Metadata, metadata, nextVersion, syncHash, syncFields, actorID, now)
		persisted, err := b.admin.contentSvc.UpdatePage(ctx, updated)
		if err != nil {
			return nil, nil, 0, err
		}
		return persisted, translationEditorPageFields(*persisted), nextVersion, nil
	}

	record, err := b.admin.contentSvc.Content(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
	if err != nil || record == nil {
		return nil, nil, 0, err
	}
	updated := cloneCMSContent(*record)
	for key, value := range nextFields {
		translationEditorSetContentField(&updated, key, value)
	}
	if updated.Status == "" || strings.EqualFold(updated.Status, string(translationcore.VariantStatusDraft)) {
		updated.Status = string(translationcore.VariantStatusInProgress)
	}
	updated.Metadata = translationEditorMergeMetadata(updated.Metadata, metadata, nextVersion, syncHash, syncFields, actorID, now)
	persisted, err := b.admin.contentSvc.UpdateContent(ctx, updated)
	if err != nil {
		return nil, nil, 0, err
	}
	return persisted, translationEditorContentFields(*persisted), nextVersion, nil
}

func (b *translationQueueBinding) runSubmitReviewAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	if b == nil || b.admin == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_editor_binding",
		})
	}
	environment := strings.TrimSpace(firstNonEmpty(toString(body["environment"]), adminCtx.Channel))
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, environment)
	if err != nil {
		return TranslationAssignment{}, err
	}
	missingFields := translationEditorMissingRequiredFields(editorCtx)
	if len(missingFields) > 0 {
		return TranslationAssignment{}, NewDomainError(string(translationcore.ErrorPolicyBlocked), "required translation fields must be completed before submit_review", map[string]any{
			"assignment_id":      strings.TrimSpace(assignment.ID),
			"variant_id":         strings.TrimSpace(editorCtx.TargetVariant.ID),
			"family_id":          strings.TrimSpace(editorCtx.Family.ID),
			"missing_fields":     append([]string{}, missingFields...),
			"field_completeness": translationEditorFieldCompleteness(editorCtx),
		})
	}
	qaResults := b.translationQAResults(editorCtx)
	if toBool(qaResults["submit_blocked"]) {
		return TranslationAssignment{}, NewDomainError(string(translationcore.ErrorPolicyBlocked), "translation QA blockers must be resolved before submit_review", map[string]any{
			"assignment_id": strings.TrimSpace(assignment.ID),
			"variant_id":    strings.TrimSpace(editorCtx.TargetVariant.ID),
			"family_id":     strings.TrimSpace(editorCtx.Family.ID),
			"qa_results":    qaResults,
		})
	}

	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	submitted, err := service.SubmitReview(adminCtx.Context, TranslationQueueSubmitInput{
		AssignmentID:    strings.TrimSpace(assignment.ID),
		TranslatorID:    actorID,
		ExpectedVersion: expectedVersion,
	})
	if err != nil {
		return TranslationAssignment{}, err
	}

	targetStatus := string(translationcore.VariantStatusInReview)
	final := submitted
	if !editorCtx.Policy.ReviewRequired {
		final, err = service.Approve(adminCtx.Context, TranslationQueueApproveInput{
			AssignmentID:    strings.TrimSpace(submitted.ID),
			ReviewerID:      actorID,
			ExpectedVersion: submitted.Version,
		})
		if err != nil {
			return TranslationAssignment{}, err
		}
		targetStatus = string(translationcore.VariantStatusApproved)
	}

	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, targetStatus, actorID); err != nil {
		return TranslationAssignment{}, err
	}
	return final, nil
}

func (b *translationQueueBinding) runApproveAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	environment := strings.TrimSpace(firstNonEmpty(toString(body["environment"]), adminCtx.Channel))
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, environment)
	if err != nil {
		return TranslationAssignment{}, err
	}
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	updated, err := service.Approve(adminCtx.Context, TranslationQueueApproveInput{
		AssignmentID:     strings.TrimSpace(assignment.ID),
		ReviewerID:       actorID,
		Comment:          strings.TrimSpace(toString(body["comment"])),
		TerminologyNotes: toStringSlice(body["terminology_notes"]),
		StyleNotes:       toStringSlice(body["style_notes"]),
		ExpectedVersion:  expectedVersion,
	})
	if err != nil {
		return TranslationAssignment{}, err
	}
	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, string(translationcore.VariantStatusApproved), actorID); err != nil {
		return TranslationAssignment{}, err
	}
	return updated, nil
}

func (b *translationQueueBinding) runRejectAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	environment := strings.TrimSpace(firstNonEmpty(toString(body["environment"]), adminCtx.Channel))
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, environment)
	if err != nil {
		return TranslationAssignment{}, err
	}
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	updated, err := service.Reject(adminCtx.Context, TranslationQueueRejectInput{
		AssignmentID:     strings.TrimSpace(assignment.ID),
		ReviewerID:       actorID,
		Reason:           strings.TrimSpace(toString(body["reason"])),
		Comment:          strings.TrimSpace(toString(body["comment"])),
		TerminologyNotes: toStringSlice(body["terminology_notes"]),
		StyleNotes:       toStringSlice(body["style_notes"]),
		ExpectedVersion:  expectedVersion,
	})
	if err != nil {
		return TranslationAssignment{}, err
	}
	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, string(translationcore.VariantStatusInProgress), actorID); err != nil {
		return TranslationAssignment{}, err
	}
	return updated, nil
}

func (b *translationQueueBinding) persistEditorVariantStatus(ctx context.Context, editorCtx translationEditorContext, status, actorID string) error {
	if b == nil || b.admin == nil || b.admin.contentSvc == nil || !editorCtx.HasTarget {
		return nil
	}
	now := b.now().UTC()
	syncHash := translationEditorHashFields(editorCtx.SourceFields)
	syncFields := cloneStringMap(editorCtx.SourceFields)
	nextVersion := editorCtx.TargetRowVersion + 1
	if nextVersion <= 0 {
		nextVersion = translationEditorDefaultVersion
	}
	if strings.EqualFold(strings.TrimSpace(editorCtx.Family.ContentType), "pages") {
		record, err := b.admin.contentSvc.Page(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
		if err != nil || record == nil {
			return err
		}
		updated := cloneCMSPage(*record)
		updated.Status = strings.TrimSpace(status)
		updated.Metadata = translationEditorMergeMetadata(updated.Metadata, nil, nextVersion, syncHash, syncFields, actorID, now)
		_, err = b.admin.contentSvc.UpdatePage(ctx, updated)
		return err
	}
	record, err := b.admin.contentSvc.Content(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
	if err != nil || record == nil {
		return err
	}
	updated := cloneCMSContent(*record)
	updated.Status = strings.TrimSpace(status)
	updated.Metadata = translationEditorMergeMetadata(updated.Metadata, nil, nextVersion, syncHash, syncFields, actorID, now)
	_, err = b.admin.contentSvc.UpdateContent(ctx, updated)
	return err
}

func translationEditorMergeMetadata(existing, incoming map[string]any, rowVersion int64, sourceHash string, sourceFields map[string]string, actorID string, now time.Time) map[string]any {
	merged := cloneAnyMap(existing)
	if merged == nil {
		merged = map[string]any{}
	}
	for key, value := range cloneAnyMap(incoming) {
		merged[key] = value
	}
	editorMeta := extractMap(merged[translationEditorMetadataKey])
	if editorMeta == nil {
		editorMeta = map[string]any{}
	}
	editorMeta[translationEditorRowVersionKey] = rowVersion
	editorMeta[translationEditorSourceHashAtLastSyncKey] = strings.TrimSpace(sourceHash)
	editorMeta[translationEditorLastSyncedSourceFieldsKey] = cloneStringMapToAny(sourceFields)
	editorMeta[translationEditorLastSavedAtKey] = now.Format(time.RFC3339)
	editorMeta[translationEditorLastSavedByKey] = strings.TrimSpace(actorID)
	merged[translationEditorMetadataKey] = editorMeta
	merged["source_hash_at_last_sync"] = strings.TrimSpace(sourceHash)
	return merged
}

func translationEditorVariantVersionFromMetadata(metadata map[string]any) int64 {
	editorMeta := extractMap(metadata[translationEditorMetadataKey])
	for _, candidate := range []any{editorMeta[translationEditorRowVersionKey], metadata[translationEditorRowVersionKey], metadata["version"], metadata["row_version"]} {
		switch typed := candidate.(type) {
		case int:
			if typed > 0 {
				return int64(typed)
			}
		case int32:
			if typed > 0 {
				return int64(typed)
			}
		case int64:
			if typed > 0 {
				return typed
			}
		case float32:
			if typed > 0 {
				return int64(typed)
			}
		case float64:
			if typed > 0 {
				return int64(typed)
			}
		case string:
			if parsed, err := strconv.ParseInt(strings.TrimSpace(typed), 10, 64); err == nil && parsed > 0 {
				return parsed
			}
		}
	}
	return translationEditorDefaultVersion
}

func translationEditorSourceHashFromMetadata(metadata map[string]any) string {
	editorMeta := extractMap(metadata[translationEditorMetadataKey])
	return strings.TrimSpace(firstNonEmpty(
		toString(editorMeta[translationEditorSourceHashAtLastSyncKey]),
		toString(metadata[translationEditorSourceHashAtLastSyncKey]),
		toString(metadata["source_hash_at_last_sync"]),
	))
}

func translationEditorSourceFieldsFromMetadata(metadata map[string]any) map[string]string {
	editorMeta := extractMap(metadata[translationEditorMetadataKey])
	candidate := extractMap(editorMeta[translationEditorLastSyncedSourceFieldsKey])
	if len(candidate) == 0 {
		candidate = extractMap(metadata[translationEditorLastSyncedSourceFieldsKey])
	}
	out := map[string]string{}
	for key, value := range candidate {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = strings.TrimSpace(toString(value))
	}
	return out
}

func translationEditorHashFields(fields map[string]string) string {
	if len(fields) == 0 {
		return ""
	}
	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	payload := make(map[string]string, len(keys))
	for _, key := range keys {
		payload[key] = strings.TrimSpace(fields[key])
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func translationEditorInputType(fieldPath string) string {
	switch strings.TrimSpace(strings.ToLower(fieldPath)) {
	case "body", "summary", "excerpt", "description", "meta_description":
		return "textarea"
	default:
		return "text"
	}
}

func translationEditorFieldLabel(fieldPath string) string {
	switch strings.TrimSpace(strings.ToLower(fieldPath)) {
	case "meta_title":
		return "Meta Title"
	case "meta_description":
		return "Meta Description"
	default:
		return strings.Title(strings.ReplaceAll(strings.TrimSpace(fieldPath), "_", " "))
	}
}

func translationEditorValidationMessage(fieldPath string, missing bool) string {
	if !missing {
		return ""
	}
	return translationEditorFieldLabel(fieldPath) + " is required before submit"
}

func translationEditorGlossaryLibrary(locale string) []map[string]any {
	switch strings.TrimSpace(strings.ToLower(locale)) {
	case "fr":
		return []map[string]any{
			{"term": "home", "preferred_translation": "accueil", "notes": "Use the navigation label, not domicile."},
			{"term": "publish", "preferred_translation": "publier", "notes": "Keep the action verb concise."},
			{"term": "translation", "preferred_translation": "traduction", "notes": "Use the product noun consistently."},
		}
	case "es":
		return []map[string]any{
			{"term": "home", "preferred_translation": "inicio", "notes": "Prefer Inicio for primary nav labels."},
			{"term": "publish", "preferred_translation": "publicar", "notes": "Use the imperative action label."},
		}
	default:
		return nil
	}
}

func translationEditorStyleGuideRules(locale, contentType string) []string {
	rules := []string{
		"Preserve placeholders, links, and HTML structure from the source.",
		"Keep CTA labels short and consistent with glossary preferences.",
	}
	if strings.EqualFold(locale, "fr") {
		rules = append(rules, "Use sentence case for navigation and CTA copy.")
	}
	if strings.EqualFold(contentType, "pages") {
		rules = append(rules, "Do not localize canonical slug fragments unless policy explicitly allows it.")
	}
	return rules
}

func cloneStringMapToAny(input map[string]string) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = strings.TrimSpace(value)
	}
	return out
}

func translationEditorRecordUpdatedAt(record any) any {
	switch typed := record.(type) {
	case *CMSPage:
		if value, ok := typed.Metadata["updated_at"]; ok {
			return value
		}
	case *CMSContent:
		if value, ok := typed.Metadata["updated_at"]; ok {
			return value
		}
	}
	return nil
}

func editorVariantRecordID(record any) string {
	switch typed := record.(type) {
	case *CMSPage:
		return strings.TrimSpace(typed.ID)
	case *CMSContent:
		return strings.TrimSpace(typed.ID)
	default:
		return ""
	}
}

func translationEditorPageFields(page CMSPage) map[string]string {
	return translationFamilyFields(page.Title, page.Slug, page.Data)
}

func translationEditorContentFields(content CMSContent) map[string]string {
	return translationFamilyFields(content.Title, content.Slug, content.Data)
}

func translationEditorSetPageField(page *CMSPage, fieldPath, value string) {
	if page == nil {
		return
	}
	value = strings.TrimSpace(value)
	switch strings.TrimSpace(strings.ToLower(fieldPath)) {
	case "title":
		page.Title = value
	case "slug":
		page.Slug = strings.TrimPrefix(value, "/")
	case "path":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		page.Data["path"] = value
	default:
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		page.Data[strings.TrimSpace(fieldPath)] = value
	}
}

func translationEditorSetContentField(content *CMSContent, fieldPath, value string) {
	if content == nil {
		return
	}
	value = strings.TrimSpace(value)
	switch strings.TrimSpace(strings.ToLower(fieldPath)) {
	case "title":
		content.Title = value
	case "slug":
		content.Slug = strings.TrimPrefix(value, "/")
	case "path":
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		content.Data["path"] = value
	default:
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		content.Data[strings.TrimSpace(fieldPath)] = value
	}
}
