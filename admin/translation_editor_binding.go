package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"sort"
	"strconv"
	"strings"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

const (
	translationEditorMetadataKey                         = "translation_editor"
	translationEditorAcknowledgedSourceHashKey           = "acknowledged_source_hash"
	translationEditorRowVersionKey                       = "row_version"
	translationEditorSourceHashAtLastSyncKey             = "source_hash_at_last_sync"
	translationEditorLastSyncedSourceFieldsKey           = "last_synced_source_fields"
	translationEditorLastSavedAtKey                      = "last_saved_at"
	translationEditorLastSavedByKey                      = "last_saved_by"
	translationEditorVariantStatusKey                    = "variant_status"
	translationVariantStatusMetadataKey                  = "translation_variant_status"
	translationEditorComparisonModeSnapshot              = "snapshot"
	translationEditorComparisonModeHashOnly              = "hash_only"
	translationEditorDefaultVersion                int64 = 1
	translationPreviewReasonNoTarget                     = "target_record_missing"
	translationPreviewReasonPreviewUnavailable           = "preview_service_unavailable"
	translationPreviewReasonUnsupportedContent           = "unsupported_content"
	translationPreviewReasonPermissionDenied             = "permission_denied"
	translationPreviewReasonPathMissing                  = "preview_path_missing"
	translationPreviewReasonTemporarilyUnavailable       = "temporarily_unavailable"
)

var errTranslationPreviewUnsupportedContent = errors.New("translation preview unsupported content")

type translationEditorContext struct {
	Environment          string                            `json:"environment"`
	Family               translationservices.FamilyRecord  `json:"family"`
	Policy               translationservices.FamilyPolicy  `json:"policy"`
	SourceVariant        translationservices.FamilyVariant `json:"source_variant"`
	TargetVariant        translationservices.FamilyVariant `json:"target_variant"`
	SourceFields         map[string]string                 `json:"source_fields"`
	TargetFields         map[string]string                 `json:"target_fields"`
	CurrentSourceHash    string                            `json:"current_source_hash"`
	LastSyncedSourceHash string                            `json:"last_synced_source_hash"`
	LastSyncedFields     map[string]string                 `json:"last_synced_fields"`
	TargetRowVersion     int64                             `json:"target_row_version"`
	SourceVersion        string                            `json:"source_version"`
	SourceRecordID       string                            `json:"source_record_id"`
	TargetRecordID       string                            `json:"target_record_id"`
	TargetStatus         string                            `json:"target_status"`
	ActivityEntries      []ActivityEntry                   `json:"activity_entries"`
	HasTarget            bool                              `json:"has_target"`
}

type translationEditorSourceSyncState struct {
	SourceHash   string            `json:"source_hash"`
	SourceFields map[string]string `json:"source_fields"`
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
	if scopeErr := b.ensureAssignmentScope(identity, assignment); scopeErr != nil {
		return nil, scopeErr
	}

	channel := translationChannelFromRequest(c, adminCtx, nil)
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, channel)
	if err != nil {
		return nil, err
	}
	historyPage := clampInt(atoiDefault(c.Query("history_page"), 1), 1, 10_000)
	historyPerPage := clampInt(atoiDefault(c.Query("history_per_page"), 10), 1, 100)

	return map[string]any{
		"data": b.assignmentDetailPayload(adminCtx.Context, assignment, editorCtx, now, historyPage, historyPerPage),
		"meta": mergeTranslationChannelContract(map[string]any{
			"history_page":     historyPage,
			"history_per_page": historyPerPage,
		}, channel),
	}, nil
}

func (b *translationQueueBinding) AssignmentPreview(c router.Context, assignmentID string) (payload any, err error) {
	if c != nil {
		c.SetHeader("Cache-Control", "no-store")
		c.SetHeader("Pragma", "no-cache")
	}
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.preview",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()

	adminCtx, repo, _, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)

	assignment, err := repo.Get(adminCtx.Context, strings.TrimSpace(assignmentID))
	if err != nil {
		return nil, err
	}
	if scopeErr := b.ensureAssignmentScope(identity, assignment); scopeErr != nil {
		return nil, scopeErr
	}

	channel := translationChannelFromRequest(c, adminCtx, nil)
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, channel)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"data": b.assignmentPreviewAction(adminCtx, assignment, editorCtx, true),
		"meta": mergeTranslationChannelContract(map[string]any{
			"cache": "no-store",
		}, channel),
	}, nil
}

func (b *translationQueueBinding) recordVariantUpdateActivity(ctx context.Context, editorCtx translationEditorContext, actorID string, nextVersion int64, autosave bool) {
	if b == nil || b.admin == nil || b.admin.activity == nil {
		return
	}
	if err := b.admin.activity.Record(ctx, ActivityEntry{
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
			"autosave":      autosave,
		},
	}); err != nil {
		return
	}
}

func translationEditorVariantPayload(ctx context.Context, b *translationQueueBinding, reloaded translationEditorContext, currentAssignment TranslationAssignment, updatedRecord any, nextVersion int64, qaResults map[string]any) map[string]any {
	return map[string]any{
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
		"assignment_action_states": b.assignmentEditorActionStates(ctx, reloaded, currentAssignment),
		"review_action_states":     b.reviewActionStates(ctx, currentAssignment),
		"qa_results":               qaResults,
		"assist":                   translationEditorAssistPayload(ctx, b, reloaded),
		"preview_action":           b.assignmentPreviewAction(AdminContext{Context: ctx}, currentAssignment, reloaded, false),
	}
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
		FamilyID:    strings.TrimSpace(assignment.FamilyID),
	})
	if err != nil {
		return translationEditorContext{}, err
	}
	if !ok {
		return translationEditorContext{}, notFoundDomainError("translation family not found", map[string]any{
			"family_id": strings.TrimSpace(assignment.FamilyID),
		})
	}
	editorCtx, hasTarget := translationEditorContextFromFamily(family, assignment, environment)
	editorCtx.HasTarget = hasTarget

	entries := []ActivityEntry{}
	if b != nil && b.admin != nil && b.admin.activity != nil {
		if activityEntries, listErr := b.admin.activity.List(ctx, 50, ActivityFilter{
			Object: "translation_assignment:" + strings.TrimSpace(assignment.ID),
		}); listErr == nil {
			entries = activityEntries
		}
	}

	sourceVersion := ""
	if !editorCtx.SourceVariant.UpdatedAt.IsZero() {
		sourceVersion = editorCtx.SourceVariant.UpdatedAt.UTC().Format(time.RFC3339)
	}
	editorCtx.SourceVersion = sourceVersion
	editorCtx.ActivityEntries = entries
	return editorCtx, nil
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
					FamilyID:       strings.TrimSpace(family.ID),
					TargetLocale:   strings.TrimSpace(variant.Locale),
					TargetRecordID: strings.TrimSpace(variant.SourceRecordID),
					TenantID:       strings.TrimSpace(family.TenantID),
					OrgID:          strings.TrimSpace(family.OrgID),
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

func translationEditorContextFromFamily(family translationservices.FamilyRecord, assignment TranslationAssignment, environment string) (translationEditorContext, bool) {
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
		targetVersion = translationEditorVariantVersion(targetVariant)
		lastSyncedSourceHash = strings.TrimSpace(firstNonEmpty(
			targetVariant.SourceHashAtLastSync,
			translationEditorSourceHashFromMetadata(targetVariant.Metadata),
		))
		lastSyncedFields = translationEditorSourceFieldsFromMetadata(targetVariant.Metadata)
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
		SourceRecordID:       strings.TrimSpace(sourceVariant.SourceRecordID),
		TargetRecordID:       targetRecordID,
		TargetStatus:         targetStatus,
		HasTarget:            hasTarget,
	}, hasTarget
}

func (b *translationQueueBinding) assignmentDetailPayload(ctx context.Context, assignment TranslationAssignment, editorCtx translationEditorContext, now time.Time, historyPage, historyPerPage int) map[string]any {
	row := b.assignmentContractRow(ctx, assignment, now, editorCtx.Environment, b.newAssignmentActorLabelResolver().labelsForAssignments(ctx, []TranslationAssignment{assignment}))
	editorActions := b.assignmentEditorActionStates(ctx, editorCtx, assignment)
	fieldCompleteness := translationEditorFieldCompleteness(editorCtx)
	fieldDrift := translationEditorFieldDrift(editorCtx)
	fieldValidations := translationEditorFieldValidations(editorCtx)
	suggestAction := b.assignmentSuggestTranslationAction(ctx, assignment, editorCtx)
	fields := b.translationEditorFieldPayloads(ctx, assignment, editorCtx)
	comments, events := translationEditorTimeline(editorCtx, assignment)
	attachments := translationEditorAttachments(editorCtx)
	reviewFeedback := translationEditorReviewFeedbackPayload(assignment, comments)

	payload := map[string]any{
		"assignment_id":              strings.TrimSpace(assignment.ID),
		"assignment_row_version":     assignment.Version,
		"assignment_version":         assignment.Version,
		"family_id":                  strings.TrimSpace(editorCtx.Family.ID),
		"variant_id":                 strings.TrimSpace(editorCtx.TargetVariant.ID),
		"entity_type":                strings.TrimSpace(editorCtx.Family.ContentType),
		"source_locale":              strings.TrimSpace(editorCtx.SourceVariant.Locale),
		"target_locale":              strings.TrimSpace(assignment.TargetLocale),
		"status":                     normalizeTranslationQueueState(string(assignment.Status)),
		"priority":                   strings.TrimSpace(string(assignment.Priority)),
		"row_version":                editorCtx.TargetRowVersion,
		"version":                    editorCtx.TargetRowVersion,
		"source_record_id":           strings.TrimSpace(editorCtx.SourceRecordID),
		"target_record_id":           strings.TrimSpace(editorCtx.TargetRecordID),
		"source_variant":             cloneFamilyVariantPayload(editorCtx.SourceVariant),
		"target_variant":             cloneFamilyVariantPayload(editorCtx.TargetVariant),
		"source_fields":              cloneStringMap(editorCtx.SourceFields),
		"target_fields":              cloneStringMap(editorCtx.TargetFields),
		"fields":                     fields,
		"field_completeness":         fieldCompleteness,
		"field_drift":                fieldDrift,
		"field_validations":          fieldValidations,
		"source_target_drift":        translationEditorDriftPayload(editorCtx),
		"actions":                    editorActions,
		"editor_actions":             editorActions,
		"assignment_action_states":   editorActions,
		"suggest_translation_action": suggestAction,
		"review_actions":             b.reviewActionStates(ctx, assignment),
		"review_action_states":       b.reviewActionStates(ctx, assignment),
		"comments":                   comments,
		"events":                     events,
		"history":                    translationEditorHistoryPayload(comments, events, historyPage, historyPerPage),
		"attachments":                attachments,
		"attachment_summary":         translationEditorAttachmentSummary(attachments),
		"review_feedback":            reviewFeedback,
		"last_rejection_reason":      strings.TrimSpace(assignment.LastRejectionReason),
		"qa_results":                 b.translationQAResults(editorCtx),
		"assist":                     translationEditorAssistPayload(ctx, b, editorCtx),
		"glossary_matches":           translationEditorGlossaryMatches(editorCtx),
		"style_guide_summary":        translationEditorStyleGuideSummary(editorCtx),
		"translation_assignment":     row,
		"locale_navigation":          b.translationEditorLocaleNavigationPayload(editorCtx, assignment),
		"preview_action":             b.assignmentPreviewAction(AdminContext{Context: ctx}, assignment, editorCtx, false),
	}
	if assignment.DueDate != nil {
		payload["due_date"] = assignment.DueDate
	}
	return payload
}

func (b *translationQueueBinding) assignmentPreviewAction(adminCtx AdminContext, assignment TranslationAssignment, editorCtx translationEditorContext, includeURL bool) map[string]any {
	channel := strings.TrimSpace(editorCtx.Environment)
	targetLocale := strings.TrimSpace(firstNonEmpty(assignment.TargetLocale, editorCtx.TargetVariant.Locale))
	entityType := strings.TrimSpace(editorCtx.Family.ContentType)
	targetRecordID := strings.TrimSpace(editorCtx.TargetRecordID)

	base := map[string]any{
		"enabled":          false,
		"assignment_id":    strings.TrimSpace(assignment.ID),
		"entity_type":      entityType,
		"record_id":        targetRecordID,
		"target_record_id": targetRecordID,
		"target_locale":    targetLocale,
		"channel":          channel,
	}
	disabled := func(reasonCode, reason string) map[string]any {
		out := maps.Clone(base)
		out["reason_code"] = strings.TrimSpace(reasonCode)
		out["reason"] = strings.TrimSpace(reason)
		return out
	}

	if !editorCtx.HasTarget || targetRecordID == "" {
		return disabled(translationPreviewReasonNoTarget, "Preview is unavailable because the target record does not exist.")
	}
	if entityType == "" {
		return disabled(translationPreviewReasonUnsupportedContent, "Preview is unavailable because this assignment has no content type.")
	}
	if b == nil || b.admin == nil {
		return disabled(translationPreviewReasonTemporarilyUnavailable, "Preview is temporarily unavailable.")
	}
	previewSvc := b.admin.Preview()
	if previewSvc == nil {
		return disabled(translationPreviewReasonPreviewUnavailable, "Preview is unavailable because the preview service is not configured.")
	}

	record, err := b.assignmentPreviewTargetRecord(adminCtx, entityType, targetRecordID, targetLocale, channel)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			return disabled(translationPreviewReasonPermissionDenied, "Preview is unavailable because you do not have access to the target content.")
		}
		if errors.Is(err, errTranslationPreviewUnsupportedContent) {
			return disabled(translationPreviewReasonUnsupportedContent, "Preview is unavailable for this content type.")
		}
		if errors.Is(err, ErrNotFound) {
			return disabled(translationPreviewReasonNoTarget, "Preview is unavailable because the target record could not be loaded.")
		}
		return disabled(translationPreviewReasonUnsupportedContent, "Preview is unavailable for this content type.")
	}

	targetPath := ResolveContentPreviewPath(record)
	if targetPath == "" {
		return disabled(translationPreviewReasonPathMissing, "Preview is unavailable because the target content has no preview path.")
	}

	out := maps.Clone(base)
	out["enabled"] = true
	if !includeURL {
		return out
	}
	token, err := previewSvc.Generate(translationPreviewEntityType(entityType, channel), targetRecordID, time.Hour)
	if err != nil {
		return disabled(translationPreviewReasonTemporarilyUnavailable, "Preview is temporarily unavailable.")
	}
	out["url"] = b.admin.BuildSitePreviewURL(targetPath, token)
	if out["url"] == "" {
		return disabled(translationPreviewReasonPathMissing, "Preview is unavailable because the target content has no allowed preview URL.")
	}
	return out
}

func (b *translationQueueBinding) assignmentPreviewTargetRecord(adminCtx AdminContext, entityType, targetRecordID, targetLocale, channel string) (map[string]any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{"component": "translation_preview"})
	}
	contentCtx := adminCtx.Context
	if contentCtx == nil {
		contentCtx = context.Background()
	}
	if channel = strings.TrimSpace(channel); channel != "" {
		contentCtx = WithContentChannel(contentCtx, channel)
	}
	if targetLocale = strings.TrimSpace(targetLocale); targetLocale != "" {
		contentCtx = WithLocale(contentCtx, targetLocale)
	}
	contentAdminCtx := adminCtx
	contentAdminCtx.Context = contentCtx
	contentAdminCtx.Channel = channel
	contentAdminCtx.Environment = channel
	contentAdminCtx.Locale = targetLocale

	_, panel, err := b.admin.resolveContentNavigationPanel(contentCtx, entityType)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, errTranslationPreviewUnsupportedContent
		}
		return nil, err
	}
	if panel == nil {
		return nil, errTranslationPreviewUnsupportedContent
	}
	return panel.Get(contentAdminCtx, targetRecordID)
}

func translationPreviewEntityType(entityType, channel string) string {
	entityType = strings.TrimSpace(entityType)
	channel = strings.TrimSpace(channel)
	if entityType == "" || channel == "" {
		return entityType
	}
	return entityType + "@" + channel
}

func (b *translationQueueBinding) translationEditorLocaleNavigationPayload(editorCtx translationEditorContext, currentAssignment TranslationAssignment) map[string]any {
	family := editorCtx.Family
	currentLocale := strings.TrimSpace(strings.ToLower(firstNonEmpty(currentAssignment.TargetLocale, editorCtx.TargetVariant.Locale)))
	sourceLocale := strings.TrimSpace(strings.ToLower(firstNonEmpty(editorCtx.SourceVariant.Locale, family.SourceLocale, family.Policy.SourceLocale)))
	currentWorkScope := normalizeTranslationAssignmentWorkScope(firstNonEmpty(currentAssignment.WorkScope, family.Policy.DefaultWorkScope))
	locales := translationEditorNavigationLocales(family, currentLocale, sourceLocale)
	entries := make([]map[string]any, 0, len(locales))
	for _, locale := range locales {
		assignment, hasAssignment := translationEditorFamilyAssignmentByLocale(family, locale, currentWorkScope)
		entry := map[string]any{
			"locale":   locale,
			"label":    strings.ToUpper(locale),
			"current":  strings.EqualFold(locale, currentLocale),
			"source":   sourceLocale != "" && strings.EqualFold(locale, sourceLocale),
			"enabled":  false,
			"disabled": true,
			"reason":   "No translation assignment exists for this locale.",
		}
		if hasAssignment && strings.TrimSpace(assignment.ID) != "" {
			entry["assignment_id"] = strings.TrimSpace(assignment.ID)
			entry["status"] = strings.TrimSpace(assignment.Status)
			entry["work_scope"] = normalizeTranslationAssignmentWorkScope(assignment.WorkScope)
			entry["enabled"] = true
			entry["disabled"] = false
			delete(entry, "reason")
			if href := translationEditorAssignmentEditorURL(b.admin, assignment.ID); href != "" {
				entry["href"] = href
			}
		}
		entries = append(entries, entry)
	}
	return map[string]any{
		"family_id":          strings.TrimSpace(family.ID),
		"current_locale":     currentLocale,
		"source_locale":      sourceLocale,
		"current_work_scope": currentWorkScope,
		"family_detail_url":  translationSSRHrefWithChannel(translationEditorFamilyDetailURL(b.admin, family.ID), editorCtx.Environment),
		"locales":            entries,
	}
}

func translationEditorNavigationLocales(family translationservices.FamilyRecord, currentLocale, sourceLocale string) []string {
	set := map[string]struct{}{}
	for _, locale := range family.Policy.RequiredLocales {
		if normalized := strings.TrimSpace(strings.ToLower(locale)); normalized != "" {
			set[normalized] = struct{}{}
		}
	}
	for _, assignment := range family.Assignments {
		if normalized := strings.TrimSpace(strings.ToLower(assignment.TargetLocale)); normalized != "" {
			set[normalized] = struct{}{}
		}
	}
	sourceLocale = strings.TrimSpace(strings.ToLower(sourceLocale))
	for _, variant := range family.Variants {
		if normalized := strings.TrimSpace(strings.ToLower(variant.Locale)); normalized != "" {
			if sourceLocale != "" && strings.EqualFold(normalized, sourceLocale) {
				continue
			}
			set[normalized] = struct{}{}
		}
	}
	if normalized := strings.TrimSpace(strings.ToLower(currentLocale)); normalized != "" {
		set[normalized] = struct{}{}
	}
	return sortLocaleSetWithCurrentFirst(set, currentLocale)
}

func sortLocaleSetWithCurrentFirst(set map[string]struct{}, currentLocale string) []string {
	out := make([]string, 0, len(set))
	for locale := range set {
		out = append(out, locale)
	}
	sort.Strings(out)
	currentLocale = strings.TrimSpace(strings.ToLower(currentLocale))
	if currentLocale == "" {
		return out
	}
	for index, locale := range out {
		if !strings.EqualFold(locale, currentLocale) {
			continue
		}
		copy(out[1:index+1], out[0:index])
		out[0] = locale
		break
	}
	return out
}

func translationEditorFamilyAssignmentByLocale(family translationservices.FamilyRecord, locale, workScope string) (translationservices.FamilyAssignment, bool) {
	targetLocale := strings.TrimSpace(strings.ToLower(locale))
	if targetLocale == "" {
		return translationservices.FamilyAssignment{}, false
	}
	targetWorkScope := normalizeTranslationAssignmentWorkScope(workScope)
	var selected translationservices.FamilyAssignment
	selectedRank := 99
	selectedTime := time.Time{}
	for _, assignment := range family.Assignments {
		if !strings.EqualFold(strings.TrimSpace(assignment.TargetLocale), targetLocale) || strings.TrimSpace(assignment.ID) == "" {
			continue
		}
		if normalizeTranslationAssignmentWorkScope(assignment.WorkScope) != targetWorkScope {
			continue
		}
		rank := translationEditorAssignmentNavigationRank(assignment.Status)
		if selected.ID == "" || rank < selectedRank || (rank == selectedRank && assignment.UpdatedAt.After(selectedTime)) {
			selected = assignment
			selectedRank = rank
			selectedTime = assignment.UpdatedAt
		}
	}
	if selected.ID == "" {
		return translationservices.FamilyAssignment{}, false
	}
	return selected, true
}

func translationEditorAssignmentNavigationRank(status string) int {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case string(translationcore.AssignmentStatusOpen), string(translationcore.AssignmentStatusAssigned), string(translationcore.AssignmentStatusInProgress), string(translationcore.AssignmentStatusInReview), string(translationcore.AssignmentStatusChangesRequested):
		return 0
	case string(translationcore.AssignmentStatusApproved):
		return 1
	default:
		return 2
	}
}

func translationEditorAssignmentEditorURL(adm *Admin, assignmentID string) string {
	return translationAssignmentEditorURL(adm, assignmentID)
}

func translationAssignmentEditorURL(adm *Admin, assignmentID string) string {
	assignmentID = strings.TrimSpace(assignmentID)
	if adm == nil || assignmentID == "" {
		return ""
	}
	if href := resolveURLWith(adm.URLs(), "admin", "translations.assignments.edit", map[string]string{
		"assignment_id": assignmentID,
	}, nil); href != "" {
		return href
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	return base + "/translations/assignments/" + assignmentID + "/edit"
}

func translationEditorFamilyDetailURL(adm *Admin, familyID string) string {
	familyID = strings.TrimSpace(familyID)
	if adm == nil || familyID == "" {
		return ""
	}
	if href := resolveURLWith(adm.URLs(), "admin", "translations.families.id", map[string]string{
		"family_id": familyID,
	}, nil); href != "" {
		return href
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	return base + "/translations/families/" + familyID
}

func (b *translationQueueBinding) assignmentEditorActionStates(ctx context.Context, editorCtx translationEditorContext, assignment TranslationAssignment) map[string]any {
	actions := map[string]any{}
	maps.Copy(actions, b.assignmentActionStates(ctx, assignment))
	submitState := b.queueActionState(ctx, assignment.Status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress")
	submitState["auto_approve"] = !editorCtx.Policy.ReviewRequired
	submitState["missing_required_fields"] = translationEditorMissingRequiredFields(editorCtx)
	actions["submit_review"] = submitState
	actions["approve"] = b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review")
	actions["reject"] = b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review")
	actions["archive"] = b.queueActionState(ctx, assignment.Status != AssignmentStatusArchived, PermAdminTranslationsManage, "archived assignments cannot be archived again")
	return actions
}

func (b *translationQueueBinding) translationEditorFieldPayloads(ctx context.Context, assignment TranslationAssignment, editorCtx translationEditorContext) []map[string]any {
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
		entry["suggest_translation_action"] = b.fieldSuggestTranslationAction(ctx, assignment, editorCtx, path)
		out = append(out, entry)
	}
	return out
}

func (b *translationQueueBinding) assignmentSuggestTranslationAction(ctx context.Context, assignment TranslationAssignment, editorCtx translationEditorContext) map[string]any {
	executionMode := translationSuggestionEditorExecutionMode(b)
	commandRegistration := CommandRegistrationState{}
	if b != nil {
		commandRegistration = translationSuggestionCommandRegistration(b.admin)
	}
	base := newTranslationSuggestionActionBase(b, assignment, editorCtx, commandRegistration, executionMode)
	if reasonCode, reason, unavailable := b.translationSuggestionActionUnavailable(ctx, assignment, commandRegistration, executionMode); unavailable {
		return disabledTranslationSuggestionAction(base, reasonCode, reason)
	}
	out := maps.Clone(base)
	out["enabled"] = true
	return out
}

func newTranslationSuggestionActionBase(b *translationQueueBinding, assignment TranslationAssignment, editorCtx translationEditorContext, commandRegistration CommandRegistrationState, executionMode string) map[string]any {
	base := map[string]any{
		"enabled":                 false,
		"assignment_id":           strings.TrimSpace(assignment.ID),
		"permission":              PermAdminTranslationsSuggest,
		"command_name":            TranslationSuggestionGenerateCommandName,
		"command_registered":      commandRegistration.Registered(),
		"command_dispatchable":    commandRegistration.CanDispatch(),
		"inline_result_supported": commandRegistration.SupportsInlineResult(),
		"transport":               "rpc",
		"rpc_method":              RPCMethodCommandDispatch,
	}
	if executionMode != "" {
		base["execution_mode"] = executionMode
	}
	if b != nil && b.admin != nil {
		apiBase := strings.TrimRight(strings.TrimSpace(b.admin.AdminAPIBasePath()), "/")
		if apiBase != "" {
			base["endpoint"] = apiBase + "/rpc"
			base["rpc_invoke_path"] = apiBase + "/rpc"
		}
	}
	if strings.TrimSpace(editorCtx.Environment) != "" {
		base["channel"] = strings.TrimSpace(editorCtx.Environment)
		base["environment"] = strings.TrimSpace(editorCtx.Environment)
	}
	return base
}

func disabledTranslationSuggestionAction(base map[string]any, reasonCode, reason string) map[string]any {
	out := maps.Clone(base)
	out["reason_code"] = strings.TrimSpace(reasonCode)
	out["reason"] = strings.TrimSpace(reason)
	return out
}

func (b *translationQueueBinding) translationSuggestionActionUnavailable(ctx context.Context, assignment TranslationAssignment, commandRegistration CommandRegistrationState, executionMode string) (string, string, bool) {
	if b == nil || b.admin == nil || b.admin.TranslationSuggestionService() == nil {
		return TranslationSuggestionReasonServiceUnavailable, "Translation suggestion service is not configured.", true
	}
	if _, ok := b.admin.config.Commands.RPC.ResolveRule(TranslationSuggestionGenerateCommandName); !ok {
		return "transport_unavailable", "Translation suggestion RPC transport is not configured.", true
	}
	if !commandRegistration.Registered() {
		return "command_unavailable", "Translation suggestion command is not registered.", true
	}
	if !commandRegistration.SupportsInlineResult() {
		return "command_result_unavailable", "Translation suggestion command does not support inline results.", true
	}
	if executionMode != "" && executionMode != string(gocommand.ExecutionModeInline) {
		return "execution_mode_unsupported", "Translation suggestion generation requires inline command execution in the editor.", true
	}
	if !translationSuggestionEditableStatus(assignment.Status) {
		return TranslationSuggestionReasonReadOnlyAssignment, "Translation suggestion is unavailable for this assignment state.", true
	}
	if !permissionAllowed(b.admin.authorizer, ctx, PermAdminTranslationsSuggest, "translations") {
		return TranslationSuggestionReasonPermissionDenied, "Translation suggestion permission is required.", true
	}
	return "", "", false
}

func translationSuggestionEditorExecutionMode(b *translationQueueBinding) string {
	if b == nil || b.admin == nil || b.admin.Commands() == nil {
		return string(gocommand.ExecutionModeInline)
	}
	mode, err := resolveDispatchModeForCommand(
		TranslationSuggestionGenerateCommandName,
		"",
		b.admin.Commands().ExecutionPolicy(),
	)
	if err != nil {
		return ""
	}
	mode = gocommand.NormalizeExecutionMode(mode)
	if mode == "" {
		mode = gocommand.ExecutionModeInline
	}
	return strings.TrimSpace(string(mode))
}

func (b *translationQueueBinding) fieldSuggestTranslationAction(ctx context.Context, assignment TranslationAssignment, editorCtx translationEditorContext, fieldPath string) map[string]any {
	base := b.assignmentSuggestTranslationAction(ctx, assignment, editorCtx)
	fieldPath = strings.TrimSpace(fieldPath)
	base["field_path"] = fieldPath
	base["payload"] = map[string]any{
		"assignment_id": strings.TrimSpace(assignment.ID),
		"field_path":    fieldPath,
	}
	enabled, hasEnabled := base["enabled"].(bool)
	if !hasEnabled || !enabled {
		return base
	}
	if _, fieldExists := editorCtx.SourceFields[fieldPath]; !fieldExists {
		base["enabled"] = false
		base["reason_code"] = TranslationSuggestionReasonFieldUnsupported
		base["reason"] = "Translation suggestion is unavailable for this field."
		return base
	}
	if strings.TrimSpace(editorCtx.SourceFields[fieldPath]) == "" {
		base["enabled"] = false
		base["reason_code"] = TranslationSuggestionReasonEmptySource
		base["reason"] = "Translation suggestion is unavailable for an empty source field."
		return base
	}
	service := b.admin.TranslationSuggestionService()
	evaluator, ok := service.(TranslationSuggestionActionEvaluator)
	if !ok || evaluator == nil {
		return base
	}
	loaded := translationSuggestionContextFromEditor(assignment, editorCtx)
	decision, err := evaluator.EvaluateTranslationSuggestionAction(ctx, TranslationSuggestionInput{
		AssignmentID: strings.TrimSpace(assignment.ID),
		FieldPath:    fieldPath,
		ActorID:      strings.TrimSpace(actorFromContext(ctx)),
		TenantID:     strings.TrimSpace(firstNonEmpty(assignment.TenantID, tenantIDFromContext(ctx))),
		OrgID:        strings.TrimSpace(firstNonEmpty(assignment.OrgID, orgIDFromContext(ctx))),
		Channel:      strings.TrimSpace(editorCtx.Environment),
		Environment:  strings.TrimSpace(editorCtx.Environment),
	}, loaded)
	if err != nil {
		base["enabled"] = false
		base["reason_code"] = TranslationSuggestionReasonPolicyDenied
		base["reason"] = "Translation suggestion availability could not be evaluated."
		return base
	}
	decision = normalizeTranslationSuggestionDecision(decision)
	if !decision.Allowed {
		base["enabled"] = false
		base["reason_code"] = decision.ReasonCode
		base["reason"] = decision.Reason
	}
	return base
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
		missing := toBool(entry["missing"])
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
		missing := toBool(entry["missing"])
		if missing {
			out = append(out, path)
		}
	}
	return out
}

func translationEditorAssistPayload(ctx context.Context, b *translationQueueBinding, editorCtx translationEditorContext) map[string]any {
	return map[string]any{
		"glossary_matches":               translationEditorGlossaryMatches(editorCtx),
		"style_guide_summary":            translationEditorStyleGuideSummary(editorCtx),
		"translation_memory_suggestions": translationEditorMemorySuggestions(ctx, b, editorCtx),
	}
}

func translationEditorMemorySuggestions(ctx context.Context, b *translationQueueBinding, editorCtx translationEditorContext) []map[string]any {
	if b == nil || b.admin == nil {
		return []map[string]any{}
	}
	store, ok := b.admin.translationFamilyStore.(TranslationEditorMemorySuggestionStore)
	if !ok || store == nil {
		return []map[string]any{}
	}
	sourceLocale := strings.TrimSpace(strings.ToLower(editorCtx.SourceVariant.Locale))
	targetLocale := strings.TrimSpace(strings.ToLower(editorCtx.TargetVariant.Locale))
	contentType := strings.TrimSpace(strings.ToLower(editorCtx.Family.ContentType))
	if sourceLocale == "" || targetLocale == "" || contentType == "" {
		return []map[string]any{}
	}
	input := normalizeTranslationEditorMemoryInput(TranslationEditorMemorySuggestionInput{
		TenantID:        strings.TrimSpace(editorCtx.Family.TenantID),
		OrgID:           strings.TrimSpace(editorCtx.Family.OrgID),
		ContentType:     contentType,
		SourceLocale:    sourceLocale,
		TargetLocale:    targetLocale,
		ExcludeFamilyID: strings.TrimSpace(editorCtx.Family.ID),
		FieldSources:    editorCtx.SourceFields,
		Limit:           12,
	})
	if input.TenantID == "" {
		input.TenantID = tenantIDFromContext(ctx)
	}
	if input.OrgID == "" {
		input.OrgID = orgIDFromContext(ctx)
	}
	if len(input.FieldSources) == 0 {
		return []map[string]any{}
	}
	matches, err := store.TranslationEditorMemorySuggestions(ctx, input)
	if err != nil {
		return []map[string]any{}
	}
	suggestions := make([]map[string]any, 0, len(matches))
	for _, match := range matches {
		sourceHash := translationEditorHashFields(match.SourceVariant.Fields)
		suggestions = append(suggestions, translationEditorMemorySuggestionPayload(match.Family, match.SourceVariant, match.TargetVariant, match.FieldPath, match.SourceText, match.SuggestedText, sourceHash))
	}
	sort.SliceStable(suggestions, func(i, j int) bool {
		leftScore := float64FromAny(suggestions[i]["score"])
		rightScore := float64FromAny(suggestions[j]["score"])
		if leftScore == rightScore {
			if toString(suggestions[i]["field_path"]) == toString(suggestions[j]["field_path"]) {
				return toString(suggestions[i]["source_label"]) < toString(suggestions[j]["source_label"])
			}
			return toString(suggestions[i]["field_path"]) < toString(suggestions[j]["field_path"])
		}
		return leftScore > rightScore
	})
	return suggestions
}

func float64FromAny(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int64:
		return float64(typed)
	case int32:
		return float64(typed)
	case uint:
		return float64(typed)
	case uint64:
		return float64(typed)
	case uint32:
		return float64(typed)
	default:
		return 0
	}
}

func translationEditorMemorySuggestionPayload(family translationservices.FamilyRecord, source, target translationservices.FamilyVariant, fieldPath, sourceText, suggestedText, sourceHash string) map[string]any {
	sourceSyncHash := strings.TrimSpace(target.SourceHashAtLastSync)
	sourceState := "unknown"
	staleSource := false
	score := 0.80
	if sourceSyncHash != "" && strings.TrimSpace(sourceHash) != "" {
		if strings.EqualFold(sourceSyncHash, strings.TrimSpace(sourceHash)) {
			sourceState = "current"
			score = 0.95
		} else {
			sourceState = "stale"
			staleSource = true
			score = 0.70
		}
	}
	sourceLabel := strings.TrimSpace(firstNonEmpty(source.Fields["title"], source.SourceRecordID, family.ID))
	sourceLocale := strings.TrimSpace(strings.ToLower(source.Locale))
	targetLocale := strings.TrimSpace(strings.ToLower(target.Locale))
	return map[string]any{
		"id":                       "tm:" + strings.TrimSpace(family.ID) + ":" + targetLocale + ":" + strings.TrimSpace(fieldPath),
		"score":                    score,
		"source":                   "internal_variant_history",
		"source_label":             sourceLabel,
		"locale_pair":              sourceLocale + ":" + targetLocale,
		"source_locale":            sourceLocale,
		"target_locale":            targetLocale,
		"field_path":               strings.TrimSpace(fieldPath),
		"source_text":              strings.TrimSpace(sourceText),
		"suggested_text":           strings.TrimSpace(suggestedText),
		"stale_source":             staleSource,
		"source_state":             sourceState,
		"source_family_id":         strings.TrimSpace(family.ID),
		"source_variant_id":        strings.TrimSpace(source.ID),
		"target_variant_id":        strings.TrimSpace(target.ID),
		"source_hash":              strings.TrimSpace(sourceHash),
		"source_hash_at_last_sync": sourceSyncHash,
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
	title := fmt.Sprintf("%s %s Style Guide", strings.ToUpper(locale), titleCase(strings.ReplaceAll(contentType, "_", " ")))
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
	start := min((page-1)*perPage, total)
	end := min(start+perPage, total)
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
		ID:       "",
		FamilyID: strings.TrimSpace(editorCtx.Family.ID),
		TenantID: strings.TrimSpace(editorCtx.Family.TenantID),
		OrgID:    strings.TrimSpace(editorCtx.Family.OrgID),
	}
	return b.ensureAssignmentScope(identity, assignment)
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
			ID:           strings.TrimSpace(item.ID),
			FamilyID:     strings.TrimSpace(family.ID),
			TargetLocale: targetLocale,
			Status:       AssignmentStatus(strings.TrimSpace(item.Status)),
			AssigneeID:   strings.TrimSpace(item.AssigneeID),
			ReviewerID:   strings.TrimSpace(item.ReviewerID),
			Priority:     Priority(strings.TrimSpace(item.Priority)),
			DueDate:      cloneTimePtr(item.DueDate),
			UpdatedAt:    item.UpdatedAt,
			CreatedAt:    item.CreatedAt,
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
	state := b.editorVariantUpdateState(editorCtx, fields, sourceSyncState)
	if IsCMSPagePolicyEntity(editorCtx.Family.ContentType) {
		return b.persistEditorPageUpdate(ctx, editorCtx, state, metadata, actorID)
	}
	return b.persistEditorContentUpdate(ctx, editorCtx, state, metadata, actorID)
}

type editorVariantUpdateState struct {
	fields     map[string]string
	version    int64
	syncHash   string
	syncFields map[string]string
	now        time.Time
}

func (b *translationQueueBinding) editorVariantUpdateState(editorCtx translationEditorContext, fields map[string]string, sourceSyncState translationEditorSourceSyncState) editorVariantUpdateState {
	nextFields := cloneStringMap(editorCtx.TargetFields)
	for key, value := range fields {
		nextFields[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}
	nextVersion := editorCtx.TargetRowVersion + 1
	if nextVersion <= 0 {
		nextVersion = translationEditorDefaultVersion
	}
	return editorVariantUpdateState{
		fields:     nextFields,
		version:    nextVersion,
		syncHash:   strings.TrimSpace(sourceSyncState.SourceHash),
		syncFields: cloneStringMap(sourceSyncState.SourceFields),
		now:        b.now().UTC(),
	}
}

func (b *translationQueueBinding) persistEditorPageUpdate(ctx context.Context, editorCtx translationEditorContext, state editorVariantUpdateState, metadata map[string]any, actorID string) (any, map[string]string, int64, error) {
	record, err := b.admin.contentSvc.Page(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
	if err != nil || record == nil {
		return nil, nil, 0, err
	}
	updated := preparePersistedEditorPage(*record, state, metadata, actorID)
	persisted, err := b.admin.contentSvc.UpdatePage(ctx, updated)
	if err != nil {
		return nil, nil, 0, err
	}
	return persisted, translationEditorPageFields(*persisted), state.version, nil
}

func (b *translationQueueBinding) persistEditorContentUpdate(ctx context.Context, editorCtx translationEditorContext, state editorVariantUpdateState, metadata map[string]any, actorID string) (any, map[string]string, int64, error) {
	record, err := b.admin.contentSvc.Content(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
	if err != nil || record == nil {
		return nil, nil, 0, err
	}
	updated := preparePersistedEditorContent(*record, state, metadata, actorID)
	persisted, err := b.admin.contentSvc.UpdateContent(ctx, updated)
	if err != nil {
		return nil, nil, 0, err
	}
	return persisted, translationEditorContentFields(*persisted), state.version, nil
}

func preparePersistedEditorPage(record CMSPage, state editorVariantUpdateState, metadata map[string]any, actorID string) CMSPage {
	updated := cloneCMSPage(record)
	for key, value := range state.fields {
		translationEditorSetPageField(&updated, key, value)
	}
	variantStatus := translationEditorNextEditableVariantStatus()
	updated.Status = translationEditorCMSStatusForVariantStatus(variantStatus, updated.Status)
	updated.Metadata = translationEditorMergeMetadata(updated.Metadata, metadata, state.version, state.syncHash, state.syncFields, actorID, state.now, variantStatus)
	return updated
}

func preparePersistedEditorContent(record CMSContent, state editorVariantUpdateState, metadata map[string]any, actorID string) CMSContent {
	updated := cloneCMSContent(record)
	for key, value := range state.fields {
		translationEditorSetContentField(&updated, key, value)
	}
	variantStatus := translationEditorNextEditableVariantStatus()
	updated.Status = translationEditorCMSStatusForVariantStatus(variantStatus, updated.Status)
	updated.Metadata = translationEditorMergeMetadata(updated.Metadata, metadata, state.version, state.syncHash, state.syncFields, actorID, state.now, variantStatus)
	return updated
}

func (b *translationQueueBinding) runSubmitReviewAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	if b == nil || b.admin == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_editor_binding",
		})
	}
	channel := translationChannel(toString(body["channel"]), adminCtx.Channel)
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, channel)
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
	recordTranslationQAOutcomeMetric(adminCtx.Context, translationQAOutcomeEvent{
		Trigger:      "submit_review",
		AssignmentID: strings.TrimSpace(assignment.ID),
		EntityType:   strings.TrimSpace(editorCtx.Family.ContentType),
		Locale:       strings.TrimSpace(editorCtx.TargetVariant.Locale),
		Environment:  channel,
		Outcome:      translationQAOutcomeLabel(qaResults),
		WarningCount: intValue(extractMap(qaResults["summary"])["warning_count"]),
		BlockerCount: intValue(extractMap(qaResults["summary"])["blocker_count"]),
	})
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
	var autoApproveEvent *translationReviewActionEvent
	if !editorCtx.Policy.ReviewRequired {
		reviewEvent := &translationReviewActionEvent{
			Action:       "approve",
			Flow:         "auto_approve",
			AssignmentID: strings.TrimSpace(submitted.ID),
			EntityType:   strings.TrimSpace(editorCtx.Family.ContentType),
			Locale:       strings.TrimSpace(editorCtx.TargetVariant.Locale),
			Environment:  channel,
			Outcome:      "success",
		}
		final, err = service.Approve(adminCtx.Context, TranslationQueueApproveInput{
			AssignmentID:    strings.TrimSpace(submitted.ID),
			ReviewerID:      actorID,
			ExpectedVersion: submitted.Version,
		})
		if err != nil {
			reviewEvent.Outcome = "error"
			reviewEvent.Err = err
			recordTranslationReviewActionMetric(adminCtx.Context, *reviewEvent)
			return TranslationAssignment{}, err
		}
		autoApproveEvent = reviewEvent
		targetStatus = string(translationcore.VariantStatusApproved)
	}

	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, targetStatus, actorID); err != nil {
		if autoApproveEvent != nil {
			autoApproveEvent.Outcome = "error"
			autoApproveEvent.Err = err
			recordTranslationReviewActionMetric(adminCtx.Context, *autoApproveEvent)
		}
		return TranslationAssignment{}, err
	}
	if autoApproveEvent != nil {
		recordTranslationReviewActionMetric(adminCtx.Context, *autoApproveEvent)
	}
	return final, nil
}

func (b *translationQueueBinding) runApproveAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	channel := translationChannel(toString(body["channel"]), adminCtx.Channel)
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, channel)
	if err != nil {
		return TranslationAssignment{}, err
	}
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	event := translationReviewActionEvent{
		Action:       "approve",
		Flow:         "approve",
		AssignmentID: strings.TrimSpace(assignment.ID),
		EntityType:   strings.TrimSpace(editorCtx.Family.ContentType),
		Locale:       strings.TrimSpace(editorCtx.TargetVariant.Locale),
		Environment:  channel,
		Outcome:      "success",
	}
	updated, err := service.Approve(adminCtx.Context, TranslationQueueApproveInput{
		AssignmentID:     strings.TrimSpace(assignment.ID),
		ReviewerID:       actorID,
		Comment:          strings.TrimSpace(toString(body["comment"])),
		TerminologyNotes: toStringSlice(body["terminology_notes"]),
		StyleNotes:       toStringSlice(body["style_notes"]),
		ExpectedVersion:  expectedVersion,
	})
	if err != nil {
		event.Outcome = "error"
		event.Err = err
		recordTranslationReviewActionMetric(adminCtx.Context, event)
		return TranslationAssignment{}, err
	}
	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, string(translationcore.VariantStatusApproved), actorID); err != nil {
		event.Outcome = "error"
		event.Err = err
		recordTranslationReviewActionMetric(adminCtx.Context, event)
		return TranslationAssignment{}, err
	}
	recordTranslationReviewActionMetric(adminCtx.Context, event)
	return updated, nil
}

func (b *translationQueueBinding) runRejectAction(adminCtx AdminContext, service *DefaultTranslationQueueService, assignment TranslationAssignment, expectedVersion int64, body map[string]any) (TranslationAssignment, error) {
	channel := translationChannel(toString(body["channel"]), adminCtx.Channel)
	editorCtx, err := b.loadAssignmentEditorContext(adminCtx.Context, assignment, channel)
	if err != nil {
		return TranslationAssignment{}, err
	}
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	event := translationReviewActionEvent{
		Action:       "reject",
		Flow:         "request_changes",
		AssignmentID: strings.TrimSpace(assignment.ID),
		EntityType:   strings.TrimSpace(editorCtx.Family.ContentType),
		Locale:       strings.TrimSpace(editorCtx.TargetVariant.Locale),
		Environment:  channel,
		Outcome:      "success",
	}
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
		event.Outcome = "error"
		event.Err = err
		recordTranslationReviewActionMetric(adminCtx.Context, event)
		return TranslationAssignment{}, err
	}
	if err := b.persistEditorVariantStatus(adminCtx.Context, editorCtx, string(translationcore.VariantStatusInProgress), actorID); err != nil {
		event.Outcome = "error"
		event.Err = err
		recordTranslationReviewActionMetric(adminCtx.Context, event)
		return TranslationAssignment{}, err
	}
	recordTranslationReviewActionMetric(adminCtx.Context, event)
	return updated, nil
}

func translationQAOutcomeLabel(results map[string]any) string {
	if !toBool(results["enabled"]) {
		return "disabled"
	}
	summary := extractMap(results["summary"])
	if intValue(summary["blocker_count"]) > 0 {
		return "blocked"
	}
	if intValue(summary["warning_count"]) > 0 {
		return "warnings"
	}
	return "clean"
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
	if IsCMSPagePolicyEntity(editorCtx.Family.ContentType) {
		record, err := b.admin.contentSvc.Page(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
		if err != nil || record == nil {
			return err
		}
		updated := cloneCMSPage(*record)
		variantStatus := translationFamilyVariantStatus(status)
		updated.Status = translationEditorCMSStatusForVariantStatus(variantStatus, updated.Status)
		updated.Metadata = translationEditorMergeMetadata(updated.Metadata, nil, nextVersion, syncHash, syncFields, actorID, now, variantStatus)
		if _, err = b.admin.contentSvc.UpdatePage(ctx, updated); err != nil {
			return err
		}
		return SyncTranslationFamilyStore(ctx, b.admin, editorCtx.Environment)
	}
	record, err := b.admin.contentSvc.Content(ctx, strings.TrimSpace(editorCtx.TargetRecordID), "")
	if err != nil || record == nil {
		return err
	}
	updated := cloneCMSContent(*record)
	variantStatus := translationFamilyVariantStatus(status)
	updated.Status = translationEditorCMSStatusForVariantStatus(variantStatus, updated.Status)
	updated.Metadata = translationEditorMergeMetadata(updated.Metadata, nil, nextVersion, syncHash, syncFields, actorID, now, variantStatus)
	if _, err = b.admin.contentSvc.UpdateContent(ctx, updated); err != nil {
		return err
	}
	return SyncTranslationFamilyStore(ctx, b.admin, editorCtx.Environment)
}

func translationEditorNextEditableVariantStatus() string {
	return string(translationcore.VariantStatusInProgress)
}

func translationEditorVariantStatusFromMetadata(metadata map[string]any, fallbackStatus string) string {
	editorMeta := extractMap(metadata[translationEditorMetadataKey])
	for _, candidate := range []string{
		toString(editorMeta[translationEditorVariantStatusKey]),
		toString(metadata[translationVariantStatusMetadataKey]),
		toString(metadata[translationEditorVariantStatusKey]),
		fallbackStatus,
	} {
		if strings.TrimSpace(candidate) == "" {
			continue
		}
		return translationFamilyVariantStatus(candidate)
	}
	return string(translationcore.VariantStatusDraft)
}

func translationEditorCMSStatusForVariantStatus(variantStatus, currentCMSStatus string) string {
	switch translationFamilyVariantStatus(variantStatus) {
	case string(translationcore.VariantStatusArchived):
		return "archived"
	default:
		switch strings.TrimSpace(strings.ToLower(currentCMSStatus)) {
		case "archived":
			return "archived"
		default:
			return "draft"
		}
	}
}

func translationEditorMergeMetadata(existing, incoming map[string]any, rowVersion int64, sourceHash string, sourceFields map[string]string, actorID string, now time.Time, variantStatus string) map[string]any {
	merged := cloneAnyMap(existing)
	if merged == nil {
		merged = map[string]any{}
	}
	maps.Copy(merged, cloneAnyMap(incoming))
	editorMeta := extractMap(merged[translationEditorMetadataKey])
	if editorMeta == nil {
		editorMeta = map[string]any{}
	}
	editorMeta[translationEditorRowVersionKey] = rowVersion
	editorMeta[translationEditorSourceHashAtLastSyncKey] = strings.TrimSpace(sourceHash)
	editorMeta[translationEditorLastSyncedSourceFieldsKey] = cloneStringMapToAny(sourceFields)
	editorMeta[translationEditorLastSavedAtKey] = now.Format(time.RFC3339)
	editorMeta[translationEditorLastSavedByKey] = strings.TrimSpace(actorID)
	if normalizedStatus := translationFamilyVariantStatus(variantStatus); normalizedStatus != "" {
		editorMeta[translationEditorVariantStatusKey] = normalizedStatus
		merged[translationVariantStatusMetadataKey] = normalizedStatus
	}
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

func translationEditorVariantVersion(variant translationservices.FamilyVariant) int64 {
	if variant.RowVersion > 0 {
		return variant.RowVersion
	}
	return translationEditorVariantVersionFromMetadata(variant.Metadata)
}

func normalizeTranslationFamilyVariantRowVersion(rowVersion int64) int64 {
	if rowVersion > 0 {
		return rowVersion
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
		return titleCase(strings.ReplaceAll(strings.TrimSpace(fieldPath), "_", " "))
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
	if IsCMSPagePolicyEntity(contentType) {
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
	case "meta_title":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		if page.SEO == nil {
			page.SEO = map[string]any{}
		}
		page.Data["meta_title"] = value
		page.SEO["title"] = value
	case "meta_description":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		if page.SEO == nil {
			page.SEO = map[string]any{}
		}
		page.Data["meta_description"] = value
		page.SEO["description"] = value
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
