package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	translationcore "github.com/goliatone/go-admin/translations/core"
)

type translationEditorTestFixtureOptions struct {
	ReviewRequired         bool
	AssignmentStatus       AssignmentStatus
	AssignmentVersion      int64
	TargetFields           map[string]string
	LastSyncedSourceFields map[string]string
	VariantRowVersion      int64
	LastRejectionReason    string
	Permissions            map[string]bool
}

type translationEditorTestFixture struct {
	translationFamilyMutationFixture
	app             *fiber.App
	binding         *translationQueueBinding
	assignmentID    string
	targetVariantID string
	targetRecordID  string
}

func newTranslationEditorTestFixture(t *testing.T, options translationEditorTestFixtureOptions) translationEditorTestFixture {
	t.Helper()

	if options.AssignmentStatus == "" {
		options.AssignmentStatus = AssignmentStatusInProgress
	}
	if options.AssignmentVersion <= 0 {
		options.AssignmentVersion = 2
	}
	if options.VariantRowVersion <= 0 {
		options.VariantRowVersion = 3
	}
	if len(options.TargetFields) == 0 {
		options.TargetFields = map[string]string{
			"title": "Guide de traduction",
			"path":  "/fr/page-1",
			"body":  "Publier la traduction depuis l'accueil.",
		}
	}
	if len(options.LastSyncedSourceFields) == 0 {
		options.LastSyncedSourceFields = map[string]string{
			"title": "Page 1",
			"path":  "/page-1",
			"body":  "Translation guide for publish workflows.",
		}
	}

	base := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales: []string{"fr"},
		ReviewRequired:  options.ReviewRequired,
		Assignments: []TranslationAssignment{
			{
				ID:                  "asg-editor-1",
				TranslationGroupID:  "tg-page-1",
				EntityType:          "pages",
				TenantID:            "tenant-1",
				OrgID:               "org-1",
				SourceRecordID:      "page-1",
				SourceLocale:        "en",
				TargetLocale:        "fr",
				TargetRecordID:      "page-1-fr",
				SourceTitle:         "Translation guide",
				SourcePath:          "/page-1",
				AssignmentType:      AssignmentTypeDirect,
				Status:              options.AssignmentStatus,
				Priority:            PriorityHigh,
				AssigneeID:          "translator-1",
				Version:             options.AssignmentVersion,
				LastRejectionReason: options.LastRejectionReason,
			},
		},
	})

	permissions := map[string]bool{
		PermAdminTranslationsView:    true,
		PermAdminTranslationsEdit:    true,
		PermAdminTranslationsAssign:  true,
		PermAdminTranslationsClaim:   true,
		PermAdminTranslationsApprove: true,
		PermAdminTranslationsManage:  true,
	}
	for key, value := range options.Permissions {
		permissions[key] = value
	}
	base.admin.WithAuthorizer(translationPermissionAuthorizer{allowed: permissions})

	source, err := base.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	updatedSource := cloneCMSPage(*source)
	if updatedSource.Data == nil {
		updatedSource.Data = map[string]any{}
	}
	updatedSource.Title = "Translation publish guide"
	updatedSource.Data["body"] = "Translation guide for publish workflows from the home page."
	if _, err := base.content.UpdatePage(context.Background(), updatedSource); err != nil {
		t.Fatalf("update source page: %v", err)
	}
	currentSourceFields := translationFamilyFields(updatedSource.Title, updatedSource.Slug, updatedSource.Data)
	lastSyncedHash := translationEditorHashFields(options.LastSyncedSourceFields)

	targetMetadata := map[string]any{
		"tenant_id": "tenant-1",
		"org_id":    "org-1",
		"attachments": []any{
			map[string]any{
				"id":          "asset-1",
				"kind":        "reference",
				"filename":    "homepage-brief.pdf",
				"byte_size":   2048,
				"uploaded_at": "2026-03-12T15:30:00Z",
				"description": "Homepage localization brief",
				"url":         "/media/homepage-brief.pdf",
			},
			map[string]any{
				"id":          "asset-2",
				"kind":        "terminology",
				"filename":    "glossary.csv",
				"byte_size":   1024,
				"uploaded_at": "2026-03-11T10:00:00Z",
				"description": "Approved glossary extract",
				"url":         "/media/glossary.csv",
			},
		},
		translationEditorMetadataKey: map[string]any{
			translationEditorRowVersionKey:             options.VariantRowVersion,
			translationEditorSourceHashAtLastSyncKey:   lastSyncedHash,
			translationEditorLastSyncedSourceFieldsKey: cloneStringMapToAny(options.LastSyncedSourceFields),
			translationEditorLastSavedAtKey:            "2026-03-12T16:00:00Z",
			translationEditorLastSavedByKey:            "translator-1",
		},
		"source_hash_at_last_sync": lastSyncedHash,
	}
	_, err = base.content.CreatePage(context.Background(), CMSPage{
		ID:                 "page-1-fr",
		Title:              options.TargetFields["title"],
		Slug:               "page-1-fr",
		Locale:             "fr",
		TranslationGroupID: "tg-page-1",
		Status:             string(translationcore.VariantStatusInProgress),
		Data: map[string]any{
			"path": options.TargetFields["path"],
			"body": options.TargetFields["body"],
		},
		Metadata: targetMetadata,
	})
	if err != nil {
		t.Fatalf("seed target page: %v", err)
	}

	if err := base.activity.Record(context.Background(), ActivityEntry{
		ID:     "evt-editor-1",
		Actor:  "translator-1",
		Action: "translation.comment.added",
		Object: "translation_assignment:asg-editor-1",
		Metadata: map[string]any{
			"variant_id":  "page-1-fr",
			"field_paths": []string{"body"},
			"source_hash": translationEditorHashFields(currentSourceFields),
			"body":        "Homepage CTA should stay imperative in French.",
		},
	}); err != nil {
		t.Fatalf("seed activity: %v", err)
	}
	if err := base.activity.Record(context.Background(), ActivityEntry{
		ID:     "evt-editor-2",
		Actor:  "translator-1",
		Action: "translation.variant.saved",
		Object: "translation_assignment:asg-editor-1",
		Metadata: map[string]any{
			"variant_id": "page-1-fr",
		},
	}); err != nil {
		t.Fatalf("seed second activity: %v", err)
	}

	binding := newTranslationQueueBinding(base.admin)
	binding.now = func() time.Time { return time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC) }
	editorCtx, err := binding.loadAssignmentEditorContext(context.Background(), TranslationAssignment{
		ID:                 "asg-editor-1",
		TranslationGroupID: "tg-page-1",
		TenantID:           "tenant-1",
		OrgID:              "org-1",
		TargetLocale:       "fr",
		TargetRecordID:     "page-1-fr",
	}, "production")
	if err != nil {
		t.Fatalf("load editor context: %v", err)
	}

	return translationEditorTestFixture{
		translationFamilyMutationFixture: base,
		app:                              newTranslationQueueTestApp(t, binding),
		binding:                          binding,
		assignmentID:                     "asg-editor-1",
		targetVariantID:                  strings.TrimSpace(editorCtx.TargetVariant.ID),
		targetRecordID:                   "page-1-fr",
	}
}

func TestTranslationEditorAssignmentDetailReturnsDriftAssistTimelineAndActions(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please tighten the CTA tone.",
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?environment=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["assignment_id"]); got != fixture.assignmentID {
		t.Fatalf("expected assignment_id %q, got %q", fixture.assignmentID, got)
	}
	if got := toString(data["variant_id"]); got != fixture.targetVariantID {
		t.Fatalf("expected variant_id %q, got %q", fixture.targetVariantID, got)
	}
	if got := toInt(data["assignment_row_version"]); got != 2 {
		t.Fatalf("expected assignment_row_version 2, got %d", got)
	}

	fieldDrift := extractMap(data["field_drift"])
	titleDrift := extractMap(fieldDrift["title"])
	if changed, _ := titleDrift["changed"].(bool); !changed {
		t.Fatalf("expected title drift change, got %+v", titleDrift)
	}
	if mode := toString(titleDrift["comparison_mode"]); mode != translationEditorComparisonModeSnapshot {
		t.Fatalf("expected snapshot comparison mode, got %q", mode)
	}

	fieldCompleteness := extractMap(data["field_completeness"])
	bodyCompleteness := extractMap(fieldCompleteness["body"])
	if complete, _ := bodyCompleteness["complete"].(bool); !complete {
		t.Fatalf("expected body complete, got %+v", bodyCompleteness)
	}

	drift := extractMap(data["source_target_drift"])
	summary := extractMap(drift[translationSourceTargetDriftChangedSummaryKey])
	if count := toInt(summary[translationSourceTargetDriftSummaryCountKey]); count <= 0 {
		t.Fatalf("expected changed field count > 0, got %+v", summary)
	}

	attachments, _ := data["attachments"].([]any)
	if len(attachments) != 2 {
		t.Fatalf("expected two attachments, got %d", len(attachments))
	}
	firstAttachment := extractMap(attachments[0])
	if got := toInt(firstAttachment["byte_size"]); got != 2048 {
		t.Fatalf("expected normalized attachment byte_size, got %+v", firstAttachment)
	}
	attachmentSummary := extractMap(data["attachment_summary"])
	if got := toInt(attachmentSummary["total"]); got != 2 {
		t.Fatalf("expected attachment_summary total=2, got %+v", attachmentSummary)
	}

	assist := extractMap(data["assist"])
	glossaryMatches, _ := assist["glossary_matches"].([]any)
	if len(glossaryMatches) == 0 {
		t.Fatalf("expected glossary matches, got %+v", assist)
	}
	styleGuide := extractMap(assist["style_guide_summary"])
	if available, _ := styleGuide["available"].(bool); !available {
		t.Fatalf("expected style guide available, got %+v", styleGuide)
	}

	comments, _ := data["comments"].([]any)
	events, _ := data["events"].([]any)
	if len(comments) != 2 {
		t.Fatalf("expected rejection and activity comments, got %d", len(comments))
	}
	if len(events) != 1 {
		t.Fatalf("expected one non-comment timeline event, got %d", len(events))
	}
	history := extractMap(data["history"])
	if got := toInt(history["total"]); got != 3 {
		t.Fatalf("expected history total=3, got %+v", history)
	}

	actions := extractMap(data["assignment_action_states"])
	submitReview := extractMap(actions["submit_review"])
	if enabled, _ := submitReview["enabled"].(bool); !enabled {
		t.Fatalf("expected submit_review enabled, got %+v", submitReview)
	}
	if autoApprove, _ := submitReview["auto_approve"].(bool); autoApprove {
		t.Fatalf("expected submit_review auto_approve false when review is required")
	}
}

func TestTranslationEditorAssignmentDetailPaginatesHistory(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please tighten the CTA tone.",
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?environment=production&tenant_id=tenant-1&org_id=org-1&history_page=2&history_per_page=1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	history := extractMap(data["history"])
	if got := toInt(history["page"]); got != 2 {
		t.Fatalf("expected history page 2, got %+v", history)
	}
	if got := toInt(history["per_page"]); got != 1 {
		t.Fatalf("expected history per_page 1, got %+v", history)
	}
	if got := toInt(history["total"]); got != 3 {
		t.Fatalf("expected history total 3, got %+v", history)
	}
	items, _ := history["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected one paged history item, got %+v", history)
	}
	item := extractMap(items[0])
	if got := toString(item["entry_type"]); got == "" {
		t.Fatalf("expected history entry_type, got %+v", item)
	}
}

func TestTranslationEditorUpdateVariantMaintainsSourceHashAndRowVersion(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	originalTarget, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || originalTarget == nil {
		t.Fatalf("load original target page: %v", err)
	}
	originalSourceHash := toString(originalTarget.Metadata["source_hash_at_last_sync"])

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, "/admin/api/translations/variants/"+fixture.targetVariantID+"?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":      "production",
		"expected_version": 3,
		"autosave":         true,
		"fields": map[string]any{
			"title": "Guide de publication",
		},
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toInt(data["row_version"]); got != 4 {
		t.Fatalf("expected row_version 4, got %d", got)
	}
	fields := mapString(payloadPath(data, "fields"))
	if got := fields["title"]; got != "Guide de publication" {
		t.Fatalf("expected updated title, got %q", got)
	}
	if got := toString(extractMap(payload["meta"])["autosave"]); got != "true" {
		t.Fatalf("expected autosave meta true, got %+v", payload["meta"])
	}
	fieldDrift := extractMap(data["field_drift"])
	if changed, _ := extractMap(fieldDrift["title"])["changed"].(bool); !changed {
		t.Fatalf("expected title drift to remain until source acknowledgement, got %+v", fieldDrift)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load updated target page: %v", err)
	}
	editorMeta := extractMap(extractMap(target.Metadata[translationEditorMetadataKey]))
	if got := toInt(editorMeta[translationEditorRowVersionKey]); got != 4 {
		t.Fatalf("expected persisted row_version 4, got %d", got)
	}

	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	expectedHash := translationEditorHashFields(translationFamilyFields(source.Title, source.Slug, source.Data))
	if got := toString(target.Metadata["source_hash_at_last_sync"]); got != originalSourceHash {
		t.Fatalf("expected source hash to stay at prior sync %q, got %q", originalSourceHash, got)
	}
	if expectedHash == originalSourceHash {
		t.Fatalf("expected fixture to contain source drift")
	}
}

func TestTranslationEditorUpdateVariantAcknowledgesCurrentSourceHashWhenRequested(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	currentSourceHash := translationEditorHashFields(translationFamilyFields(source.Title, source.Slug, source.Data))

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, "/admin/api/translations/variants/"+fixture.targetVariantID+"?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":              "production",
		"expected_version":         3,
		"acknowledged_source_hash": currentSourceHash,
		"fields": map[string]any{
			"title": "Guide de publication",
		},
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["source_hash_at_last_sync"]); got != currentSourceHash {
		t.Fatalf("expected acknowledged source hash %q, got %q", currentSourceHash, got)
	}
	drift := extractMap(data["source_target_drift"])
	summary := extractMap(drift[translationSourceTargetDriftChangedSummaryKey])
	if got := toInt(summary[translationSourceTargetDriftSummaryCountKey]); got != 0 {
		t.Fatalf("expected cleared drift after acknowledgement, got %+v", summary)
	}
}

func TestTranslationEditorUpdateVariantRejectsStaleSourceAcknowledgement(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, "/admin/api/translations/variants/"+fixture.targetVariantID+"?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":              "production",
		"expected_version":         3,
		"acknowledged_source_hash": "stale-source-hash",
		"fields": map[string]any{
			"title": "Guide de publication",
		},
	})
	if status != http.StatusConflict {
		t.Fatalf("status=%d want=409 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["text_code"]); got != string(translationcore.ErrorVersionConflict) {
		t.Fatalf("expected text_code %q, got %q", string(translationcore.ErrorVersionConflict), got)
	}
	meta := extractMap(errPayload["metadata"])
	if got := toString(meta["field"]); got != translationEditorAcknowledgedSourceHashKey {
		t.Fatalf("expected field %q, got %+v", translationEditorAcknowledgedSourceHashKey, meta)
	}
}

func TestTranslationEditorUpdateVariantReturnsAutosaveConflictPayload(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, "/admin/api/translations/variants/"+fixture.targetVariantID+"?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":      "production",
		"expected_version": 2,
		"autosave":         true,
		"fields": map[string]any{
			"title": "Conflit",
		},
	})
	if status != http.StatusConflict {
		t.Fatalf("status=%d want=409 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["text_code"]); got != TextCodeAutosaveConflict {
		t.Fatalf("expected text_code %q, got %q", TextCodeAutosaveConflict, got)
	}
	meta := extractMap(errPayload["metadata"])
	if got := toString(meta["expected_version"]); got != "2" {
		t.Fatalf("expected expected_version 2, got %+v", meta)
	}
	latest := extractMap(meta["latest_server_state_record"])
	if got := toInt(latest["row_version"]); got != 3 {
		t.Fatalf("expected latest row_version 3, got %+v", latest)
	}
}

func TestTranslationEditorSubmitReviewBlocksWhenRequiredFieldsMissing(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
		TargetFields: map[string]string{
			"title": "Guide de traduction",
			"path":  "/fr/page-1",
			"body":  "",
		},
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":      "production",
		"expected_version": 2,
	})
	if status != http.StatusConflict {
		t.Fatalf("status=%d want=409 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["text_code"]); got != string(translationcore.ErrorPolicyBlocked) {
		t.Fatalf("expected text_code %q, got %q", string(translationcore.ErrorPolicyBlocked), got)
	}
	meta := extractMap(errPayload["metadata"])
	missingFields := toStringSlice(meta["missing_fields"])
	if len(missingFields) != 1 || missingFields[0] != "body" {
		t.Fatalf("expected missing_fields [body], got %+v", missingFields)
	}
}

func TestTranslationEditorDetailIncludesReviewFeedbackAndQAResults(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please preserve the CTA token.",
	})
	enableTranslationEditorQAWithBlockers(t, fixture)

	status, payload := doTranslationEditorJSONRequest(
		t,
		fixture.app,
		http.MethodGet,
		"/admin/api/translations/assignments/"+fixture.assignmentID+"?environment=production&tenant_id=tenant-1&org_id=org-1",
		nil,
	)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["last_rejection_reason"]); got != "Please preserve the CTA token." {
		t.Fatalf("expected last_rejection_reason, got %+v", data)
	}
	reviewFeedback := extractMap(data["review_feedback"])
	comments, _ := reviewFeedback["comments"].([]any)
	if len(comments) != 1 {
		t.Fatalf("expected one review_feedback comment, got %+v", reviewFeedback)
	}
	qaResults := extractMap(data["qa_results"])
	if enabled, _ := qaResults["enabled"].(bool); !enabled {
		t.Fatalf("expected qa_results enabled, got %+v", qaResults)
	}
	summary := extractMap(qaResults["summary"])
	if got := toInt(summary["warning_count"]); got <= 0 {
		t.Fatalf("expected warning_count > 0, got %+v", summary)
	}
	if got := toInt(summary["blocker_count"]); got <= 0 {
		t.Fatalf("expected blocker_count > 0, got %+v", summary)
	}
	if blocked, _ := qaResults["submit_blocked"].(bool); !blocked {
		t.Fatalf("expected submit_blocked true, got %+v", qaResults)
	}
}

func TestTranslationEditorSubmitReviewBlocksOnQAResults(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})
	enableTranslationEditorQAWithBlockers(t, fixture)
	metrics := &capturingTranslationMetrics{}
	originalMetrics := defaultTranslationMetrics
	defaultTranslationMetrics = metrics
	t.Cleanup(func() {
		defaultTranslationMetrics = originalMetrics
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":      "production",
		"expected_version": 2,
	})
	if status != http.StatusConflict {
		t.Fatalf("status=%d want=409 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["text_code"]); got != string(translationcore.ErrorPolicyBlocked) {
		t.Fatalf("expected text_code %q, got %q", string(translationcore.ErrorPolicyBlocked), got)
	}
	qaResults := extractMap(extractMap(errPayload["metadata"])["qa_results"])
	if blocked, _ := qaResults["submit_blocked"].(bool); !blocked {
		t.Fatalf("expected submit_blocked true in metadata, got %+v", qaResults)
	}
	if len(metrics.qaOutcomeTags) != 1 {
		t.Fatalf("expected one qa outcome metric, got %d", len(metrics.qaOutcomeTags))
	}
	if metrics.qaOutcomeTags[0]["trigger"] != "submit_review" || metrics.qaOutcomeTags[0]["outcome"] != "blocked" {
		t.Fatalf("unexpected qa outcome tags: %+v", metrics.qaOutcomeTags[0])
	}
}

func TestTranslationEditorReviewActionsPersistVariantStatus(t *testing.T) {
	rejectFixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})
	metrics := &capturingTranslationMetrics{}
	originalMetrics := defaultTranslationMetrics
	defaultTranslationMetrics = metrics
	t.Cleanup(func() {
		defaultTranslationMetrics = originalMetrics
	})
	reviewAssignment, err := rejectFixture.repo.Get(context.Background(), rejectFixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	reviewAssignment.Status = AssignmentStatusInReview
	reviewAssignment.ReviewerID = "reviewer-1"
	reviewAssignment.LastReviewerID = "reviewer-1"
	reviewAssignment.Version = 2
	if _, err := rejectFixture.repo.Update(context.Background(), reviewAssignment, reviewAssignment.Version); err != nil {
		t.Fatalf("update review assignment: %v", err)
	}

	var rejectBody bytes.Buffer
	if err := json.NewEncoder(&rejectBody).Encode(map[string]any{
		"environment":      "production",
		"expected_version": 3,
		"reason":           "Please align the CTA wording.",
		"comment":          "Keep the glossary term consistent.",
	}); err != nil {
		t.Fatalf("encode reject body: %v", err)
	}
	rejectReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignments/"+rejectFixture.assignmentID+"/actions/reject?environment=production&tenant_id=tenant-1&org_id=org-1", &rejectBody)
	rejectReq.Header.Set("Content-Type", "application/json")
	rejectReq.Header.Set("X-User-ID", "reviewer-1")
	rejectResp, err := rejectFixture.app.Test(rejectReq)
	if err != nil {
		t.Fatalf("reject request error: %v", err)
	}
	defer rejectResp.Body.Close()
	if rejectResp.StatusCode != http.StatusOK {
		t.Fatalf("reject status=%d want=200", rejectResp.StatusCode)
	}

	rejectedTarget, err := rejectFixture.content.Page(context.Background(), rejectFixture.targetRecordID, "")
	if err != nil || rejectedTarget == nil {
		t.Fatalf("load rejected target: %v", err)
	}
	if got := rejectedTarget.Status; got != string(translationcore.VariantStatusInProgress) {
		t.Fatalf("expected rejected target status in_progress, got %q", got)
	}
	if len(metrics.reviewActionTags) == 0 {
		t.Fatalf("expected review action metric for reject")
	}
	if metrics.reviewActionTags[0]["action"] != "reject" || metrics.reviewActionTags[0]["flow"] != "request_changes" || metrics.reviewActionTags[0]["outcome"] != "success" {
		t.Fatalf("unexpected reject review metric tags: %+v", metrics.reviewActionTags[0])
	}

	approveFixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})
	approveAssignment, err := approveFixture.repo.Get(context.Background(), approveFixture.assignmentID)
	if err != nil {
		t.Fatalf("load approve assignment: %v", err)
	}
	approveAssignment.Status = AssignmentStatusInReview
	approveAssignment.ReviewerID = "reviewer-1"
	approveAssignment.LastReviewerID = "reviewer-1"
	approveAssignment.Version = 2
	if _, err := approveFixture.repo.Update(context.Background(), approveAssignment, approveAssignment.Version); err != nil {
		t.Fatalf("update approve assignment: %v", err)
	}

	var approveBody bytes.Buffer
	if err := json.NewEncoder(&approveBody).Encode(map[string]any{
		"environment":      "production",
		"expected_version": 3,
		"comment":          "Looks good for publish.",
	}); err != nil {
		t.Fatalf("encode approve body: %v", err)
	}
	approveReq := httptest.NewRequest(http.MethodPost, "/admin/api/translations/assignments/"+approveFixture.assignmentID+"/actions/approve?environment=production&tenant_id=tenant-1&org_id=org-1", &approveBody)
	approveReq.Header.Set("Content-Type", "application/json")
	approveReq.Header.Set("X-User-ID", "reviewer-1")
	approveResp, err := approveFixture.app.Test(approveReq)
	if err != nil {
		t.Fatalf("approve request error: %v", err)
	}
	defer approveResp.Body.Close()
	if approveResp.StatusCode != http.StatusOK {
		t.Fatalf("approve status=%d want=200", approveResp.StatusCode)
	}

	approvedTarget, err := approveFixture.content.Page(context.Background(), approveFixture.targetRecordID, "")
	if err != nil || approvedTarget == nil {
		t.Fatalf("load approved target: %v", err)
	}
	if got := approvedTarget.Status; got != string(translationcore.VariantStatusApproved) {
		t.Fatalf("expected approved target status approved, got %q", got)
	}
	if len(metrics.reviewActionTags) < 2 {
		t.Fatalf("expected review action metric for approve, got %+v", metrics.reviewActionTags)
	}
	if metrics.reviewActionTags[1]["action"] != "approve" || metrics.reviewActionTags[1]["flow"] != "approve" || metrics.reviewActionTags[1]["outcome"] != "success" {
		t.Fatalf("unexpected approve review metric tags: %+v", metrics.reviewActionTags[1])
	}
}

func TestTranslationEditorSubmitReviewAutoApprovesWhenReviewIsDisabled(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: false,
	})
	metrics := &capturingTranslationMetrics{}
	originalMetrics := defaultTranslationMetrics
	defaultTranslationMetrics = metrics
	t.Cleanup(func() {
		defaultTranslationMetrics = originalMetrics
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?environment=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"environment":      "production",
		"expected_version": 2,
	})
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if got := toString(data["status"]); got != string(AssignmentStatusApproved) {
		t.Fatalf("expected approved assignment status, got %q", got)
	}

	assignment, err := fixture.repo.Get(context.Background(), fixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	if assignment.Status != AssignmentStatusApproved {
		t.Fatalf("expected persisted assignment approved, got %q", assignment.Status)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target page: %v", err)
	}
	if got := target.Status; got != string(translationcore.VariantStatusApproved) {
		t.Fatalf("expected target variant approved, got %q", got)
	}
	if len(metrics.qaOutcomeTags) != 1 {
		t.Fatalf("expected one qa outcome metric for submit review, got %d", len(metrics.qaOutcomeTags))
	}
	if metrics.qaOutcomeTags[0]["trigger"] != "submit_review" {
		t.Fatalf("unexpected qa outcome metric tags: %+v", metrics.qaOutcomeTags[0])
	}
	if len(metrics.reviewActionTags) != 1 {
		t.Fatalf("expected one review action metric for auto-approve, got %+v", metrics.reviewActionTags)
	}
	if metrics.reviewActionTags[0]["action"] != "approve" || metrics.reviewActionTags[0]["flow"] != "auto_approve" || metrics.reviewActionTags[0]["outcome"] != "success" {
		t.Fatalf("unexpected auto-approve review metric tags: %+v", metrics.reviewActionTags[0])
	}
}

func doTranslationEditorJSONRequest(t *testing.T, app *fiber.App, method, target string, body map[string]any) (int, map[string]any) {
	t.Helper()

	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatalf("encode request body: %v", err)
		}
	}

	req := httptest.NewRequest(method, target, &payload)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close()

	out := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp.StatusCode, out
}

func payloadPath(data map[string]any, key string) map[string]any {
	return extractMap(data[key])
}

func mapString(data map[string]any) map[string]string {
	out := map[string]string{}
	for key, value := range data {
		out[key] = toString(value)
	}
	return out
}

func enableTranslationEditorQAWithBlockers(t *testing.T, fixture translationEditorTestFixture) {
	t.Helper()

	fixture.admin.featureGate = featureGateFromKeys(
		FeatureCMS,
		FeatureTranslationQueue,
		FeatureTranslationQATerms,
		FeatureTranslationQAStyle,
	)

	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	updatedSource := cloneCMSPage(*source)
	updatedSource.Title = "Translation publish guide {{cta}}"
	updatedSource.Data["body"] = "Translation guide for publish workflows from the home page. Review https://example.com <strong>now</strong>."
	if _, err := fixture.content.UpdatePage(context.Background(), updatedSource); err != nil {
		t.Fatalf("update source page: %v", err)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target page: %v", err)
	}
	updatedTarget := cloneCMSPage(*target)
	updatedTarget.Title = "Guide de contenu"
	updatedTarget.Data["body"] = "Publier le contenu depuis l'accueil."
	if _, err := fixture.content.UpdatePage(context.Background(), updatedTarget); err != nil {
		t.Fatalf("update target page: %v", err)
	}
}
