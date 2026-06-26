package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"maps"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	gocommand "github.com/goliatone/go-command"
)

type translationEditorTestFixtureOptions struct {
	ReviewRequired          bool
	AssignmentStatus        AssignmentStatus
	AssignmentVersion       int64
	TargetFields            map[string]string
	LastSyncedSourceFields  map[string]string
	VariantRowVersion       int64
	TargetCMSStatus         string
	TargetVariantStatus     string
	AssignmentAssigneeID    string
	AssignmentReviewerID    string
	LastRejectionReason     string
	Permissions             map[string]bool
	FamilyStore             translationservices.FamilyStore
	RequiredLocales         []string
	ExtraAssignments        []TranslationAssignment
	PagePanelViewPermission string
}

type translationEditorTestFixture struct {
	translationFamilyMutationFixture
	app             *fiber.App
	binding         *translationQueueBinding
	assignmentID    string
	targetVariantID string
	targetRecordID  string
}

type translationMemoryFixturePair struct {
	FamilyID             string
	SourceID             string
	TargetID             string
	TenantID             string
	OrgID                string
	TargetLocale         string
	TargetStatus         string
	SourceTitle          string
	SourceBody           string
	TargetBody           string
	SourceHash           string
	UseCurrentSourceHash bool
}

type translationEditorMemoryTrackingStore struct {
	base          translationservices.FamilyStore
	familiesCalls int
	suggestions   []TranslationEditorMemorySuggestion
}

func (s *translationEditorMemoryTrackingStore) Families(ctx context.Context) ([]translationservices.FamilyRecord, error) {
	s.familiesCalls++
	return s.base.Families(ctx)
}

func (s *translationEditorMemoryTrackingStore) Family(ctx context.Context, id string) (translationservices.FamilyRecord, bool, error) {
	return s.base.Family(ctx, id)
}

func (s *translationEditorMemoryTrackingStore) SaveFamily(ctx context.Context, family translationservices.FamilyRecord) error {
	return s.base.SaveFamily(ctx, family)
}

func (s *translationEditorMemoryTrackingStore) TranslationEditorMemorySuggestions(_ context.Context, input TranslationEditorMemorySuggestionInput) ([]TranslationEditorMemorySuggestion, error) {
	input = normalizeTranslationEditorMemoryInput(input)
	if input.TenantID != "tenant-1" || input.OrgID != "org-1" || input.ContentType != "pages" || input.SourceLocale != "en" || input.TargetLocale != "fr" {
		return nil, nil
	}
	return append([]TranslationEditorMemorySuggestion{}, s.suggestions...), nil
}

type editorSuggestionActionService struct {
	decision TranslationSuggestionDecision
}

func (s editorSuggestionActionService) SuggestTranslation(_ context.Context, input TranslationSuggestionInput) (TranslationSuggestionResult, error) {
	return TranslationSuggestionResult{
		AssignmentID:  strings.TrimSpace(input.AssignmentID),
		FieldPath:     strings.TrimSpace(input.FieldPath),
		SuggestedText: "Suggestion",
	}, nil
}

func (s editorSuggestionActionService) EvaluateTranslationSuggestionAction(context.Context, TranslationSuggestionInput, TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error) {
	if !s.decision.Allowed && strings.TrimSpace(s.decision.ReasonCode) == "" {
		return TranslationSuggestionDecision{Allowed: true}, nil
	}
	return s.decision, nil
}

func translationEditorFieldByPath(t *testing.T, data map[string]any, path string) map[string]any {
	t.Helper()
	for _, raw := range anySliceFromValue(data["fields"]) {
		field := extractMap(raw)
		if toString(field["path"]) == path {
			return field
		}
	}
	t.Fatalf("field %q not found in %+v", path, data["fields"])
	return nil
}

func assertTranslationEditorVariantStatusMetadata(t *testing.T, metadata map[string]any, want string) {
	t.Helper()
	editorMeta := extractMap(metadata[translationEditorMetadataKey])
	if got := toString(editorMeta[translationEditorVariantStatusKey]); got != want {
		t.Fatalf("expected editor variant status %q, got %q in %+v", want, got, editorMeta)
	}
	if got := toString(metadata[translationVariantStatusMetadataKey]); got != want {
		t.Fatalf("expected top-level variant status %q, got %q in %+v", want, got, metadata)
	}
}

func assertTranslationEditorReadModelVariantStatus(t *testing.T, fixture translationEditorTestFixture, want string) {
	t.Helper()
	family, ok, err := fixture.admin.translationFamilyStore.Family(context.Background(), "tg-page-1")
	if err != nil {
		t.Fatalf("load synced family: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced family")
	}
	variant, ok := translationFamilyVariantByLocale(family, "fr")
	if !ok {
		t.Fatalf("expected fr variant in synced family")
	}
	if got := variant.Status; got != want {
		t.Fatalf("expected read-model variant status %q, got %q", want, got)
	}
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
	if strings.TrimSpace(options.TargetCMSStatus) == "" {
		options.TargetCMSStatus = "draft"
	}
	if strings.TrimSpace(options.TargetVariantStatus) == "" {
		options.TargetVariantStatus = string(translationcore.VariantStatusInProgress)
	}
	if strings.TrimSpace(options.AssignmentAssigneeID) == "" {
		options.AssignmentAssigneeID = "translator-1"
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

	requiredLocales := append([]string{}, options.RequiredLocales...)
	if len(requiredLocales) == 0 {
		requiredLocales = []string{"fr"}
	}
	assignments := []TranslationAssignment{
		{
			ID:                  "asg-editor-1",
			FamilyID:            "tg-page-1",
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
			AssigneeID:          strings.TrimSpace(options.AssignmentAssigneeID),
			ReviewerID:          strings.TrimSpace(options.AssignmentReviewerID),
			Version:             options.AssignmentVersion,
			LastRejectionReason: options.LastRejectionReason,
		},
	}
	assignments = append(assignments, options.ExtraAssignments...)
	base := newTranslationFamilyMutationFixture(t, translationFamilyMutationFixtureOptions{
		RequiredLocales:         requiredLocales,
		ReviewRequired:          options.ReviewRequired,
		FamilyStore:             options.FamilyStore,
		Assignments:             assignments,
		PagePanelViewPermission: options.PagePanelViewPermission,
	})

	permissions := map[string]bool{
		PermAdminTranslationsView:    true,
		PermAdminTranslationsEdit:    true,
		PermAdminTranslationsAssign:  true,
		PermAdminTranslationsClaim:   true,
		PermAdminTranslationsApprove: true,
		PermAdminTranslationsManage:  true,
	}
	maps.Copy(permissions, options.Permissions)
	authorizer := translationPermissionAuthorizer{allowed: permissions}
	base.admin.WithAuthorizer(authorizer)
	if pagePanel, ok := base.admin.registry.Panel("pages"); ok && pagePanel != nil {
		pagePanel.authorizer = authorizer
	}

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
	if _, updateSourceErr := base.content.UpdatePage(context.Background(), updatedSource); updateSourceErr != nil {
		t.Fatalf("update source page: %v", updateSourceErr)
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
			translationEditorVariantStatusKey:          strings.TrimSpace(options.TargetVariantStatus),
		},
		"source_hash_at_last_sync":          lastSyncedHash,
		translationVariantStatusMetadataKey: strings.TrimSpace(options.TargetVariantStatus),
	}
	_, err = base.content.CreatePage(context.Background(), CMSPage{
		ID:       "page-1-fr",
		Title:    options.TargetFields["title"],
		Slug:     "page-1-fr",
		Locale:   "fr",
		FamilyID: "tg-page-1",
		Status:   strings.TrimSpace(options.TargetCMSStatus),
		Data: map[string]any{
			"path": options.TargetFields["path"],
			"body": options.TargetFields["body"],
		},
		Metadata: targetMetadata,
	})
	if err != nil {
		t.Fatalf("seed target page: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, base.admin, "production")

	if recordErr := base.activity.Record(context.Background(), ActivityEntry{
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
	}); recordErr != nil {
		t.Fatalf("seed activity: %v", recordErr)
	}
	if recordErr := base.activity.Record(context.Background(), ActivityEntry{
		ID:     "evt-editor-2",
		Actor:  "translator-1",
		Action: "translation.variant.saved",
		Object: "translation_assignment:asg-editor-1",
		Metadata: map[string]any{
			"variant_id": "page-1-fr",
		},
	}); recordErr != nil {
		t.Fatalf("seed second activity: %v", recordErr)
	}

	binding := newTranslationQueueBinding(base.admin)
	binding.now = func() time.Time { return time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC) }
	editorCtx, err := binding.loadAssignmentEditorContext(context.Background(), TranslationAssignment{
		ID:             "asg-editor-1",
		FamilyID:       "tg-page-1",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		TargetLocale:   "fr",
		TargetRecordID: "page-1-fr",
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

func seedTranslationMemoryFixturePair(t *testing.T, content *translationFamilyMutationContentService, pair translationMemoryFixturePair) {
	t.Helper()
	if pair.TargetLocale == "" {
		pair.TargetLocale = "fr"
	}
	if pair.TargetStatus == "" {
		pair.TargetStatus = string(translationcore.VariantStatusApproved)
	}
	sourceData := map[string]any{
		"path": "/" + strings.TrimSpace(pair.SourceID),
		"body": pair.SourceBody,
	}
	source := CMSPage{
		ID:       pair.SourceID,
		Title:    pair.SourceTitle,
		Slug:     pair.SourceID,
		Locale:   "en",
		FamilyID: pair.FamilyID,
		Status:   string(translationcore.VariantStatusPublished),
		Data:     sourceData,
		Metadata: map[string]any{
			"tenant_id": pair.TenantID,
			"org_id":    pair.OrgID,
		},
	}
	if _, err := content.CreatePage(context.Background(), source); err != nil {
		t.Fatalf("seed translation memory source: %v", err)
	}
	sourceHash := strings.TrimSpace(pair.SourceHash)
	if pair.UseCurrentSourceHash {
		sourceHash = translationEditorHashFields(translationFamilyFields(source.Title, source.Slug, sourceData))
	}
	if sourceHash == "" {
		sourceHash = "fixture-source-hash"
	}
	if _, err := content.CreatePage(context.Background(), CMSPage{
		ID:       pair.TargetID,
		Title:    strings.TrimSpace(firstNonEmpty(pair.TargetBody, pair.SourceTitle)),
		Slug:     pair.TargetID,
		Locale:   pair.TargetLocale,
		FamilyID: pair.FamilyID,
		Status:   pair.TargetStatus,
		Data: map[string]any{
			"path": "/" + strings.TrimSpace(pair.TargetID),
			"body": pair.TargetBody,
		},
		Metadata: map[string]any{
			"tenant_id":                              pair.TenantID,
			"org_id":                                 pair.OrgID,
			translationEditorSourceHashAtLastSyncKey: sourceHash,
		},
	}); err != nil {
		t.Fatalf("seed translation memory target: %v", err)
	}
}

func TestTranslationEditorAssignmentDetailReturnsDriftAssistTimelineAndActions(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please tighten the CTA tone.",
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
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
	if changed := toBool(titleDrift["changed"]); !changed {
		t.Fatalf("expected title drift change, got %+v", titleDrift)
	}
	if mode := toString(titleDrift["comparison_mode"]); mode != translationEditorComparisonModeSnapshot {
		t.Fatalf("expected snapshot comparison mode, got %q", mode)
	}

	fieldCompleteness := extractMap(data["field_completeness"])
	bodyCompleteness := extractMap(fieldCompleteness["body"])
	if complete := toBool(bodyCompleteness["complete"]); !complete {
		t.Fatalf("expected body complete, got %+v", bodyCompleteness)
	}

	drift := extractMap(data["source_target_drift"])
	summary := extractMap(drift[translationSourceTargetDriftChangedSummaryKey])
	if count := toInt(summary[translationSourceTargetDriftSummaryCountKey]); count <= 0 {
		t.Fatalf("expected changed field count > 0, got %+v", summary)
	}

	attachments := anySliceFromValue(data["attachments"])
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
	glossaryMatches := anySliceFromValue(assist["glossary_matches"])
	if len(glossaryMatches) == 0 {
		t.Fatalf("expected glossary matches, got %+v", assist)
	}
	styleGuide := extractMap(assist["style_guide_summary"])
	if available := toBool(styleGuide["available"]); !available {
		t.Fatalf("expected style guide available, got %+v", styleGuide)
	}
	memorySuggestions := anySliceFromValue(assist["translation_memory_suggestions"])
	if len(memorySuggestions) != 0 {
		t.Fatalf("expected empty translation memory suggestions without scoped matches, got %+v", memorySuggestions)
	}

	comments := anySliceFromValue(data["comments"])
	events := anySliceFromValue(data["events"])
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
	if enabled := toBool(submitReview["enabled"]); !enabled {
		t.Fatalf("expected submit_review enabled, got %+v", submitReview)
	}
	if autoApprove := toBool(submitReview["auto_approve"]); autoApprove {
		t.Fatalf("expected submit_review auto_approve false when review is required")
	}
}

func TestTranslationEditorAssignmentDetailSuggestionActionDisabledWithoutService(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	action := extractMap(data["suggest_translation_action"])
	if enabled := toBool(action["enabled"]); enabled {
		t.Fatalf("expected top-level suggestion action disabled, got %+v", action)
	}
	if got := toString(action["reason_code"]); got != TranslationSuggestionReasonServiceUnavailable {
		t.Fatalf("expected service unavailable reason, got %q in %+v", got, action)
	}
	title := translationEditorFieldByPath(t, data, "title")
	fieldAction := extractMap(title["suggest_translation_action"])
	if enabled := toBool(fieldAction["enabled"]); enabled {
		t.Fatalf("expected field suggestion action disabled, got %+v", fieldAction)
	}
}

func TestTranslationEditorAssignmentDetailSuggestionActionEnabled(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		Permissions: map[string]bool{PermAdminTranslationsSuggest: true},
	})
	fixture.admin.WithTranslationSuggestionService(editorSuggestionActionService{
		decision: TranslationSuggestionDecision{Allowed: true},
	})
	fixture.admin.config.Commands.RPC.Commands = map[string]RPCCommandRule{
		TranslationSuggestionGenerateCommandName: DefaultTranslationSuggestionRPCCommandRule(),
	}

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	action := extractMap(data["suggest_translation_action"])
	if enabled := toBool(action["enabled"]); !enabled {
		t.Fatalf("expected top-level suggestion action enabled, got %+v", action)
	}
	if got := toString(action["command_name"]); got != TranslationSuggestionGenerateCommandName {
		t.Fatalf("expected command name %q, got %q", TranslationSuggestionGenerateCommandName, got)
	}
	if got := toString(action["rpc_method"]); got != RPCMethodCommandDispatch {
		t.Fatalf("expected rpc method %q, got %q", RPCMethodCommandDispatch, got)
	}

	title := translationEditorFieldByPath(t, data, "title")
	fieldAction := extractMap(title["suggest_translation_action"])
	if enabled := toBool(fieldAction["enabled"]); !enabled {
		t.Fatalf("expected title suggestion action enabled, got %+v", fieldAction)
	}
	payloadMap := extractMap(fieldAction["payload"])
	if got := toString(payloadMap["assignment_id"]); got != fixture.assignmentID {
		t.Fatalf("expected assignment payload %q, got %+v", fixture.assignmentID, payloadMap)
	}
	if got := toString(payloadMap["field_path"]); got != "title" {
		t.Fatalf("expected title field payload, got %+v", payloadMap)
	}
}

func TestTranslationEditorAssignmentDetailSuggestionActionDisabledForQueuedExecutionMode(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		Permissions: map[string]bool{PermAdminTranslationsSuggest: true},
	})
	fixture.admin.WithTranslationSuggestionService(editorSuggestionActionService{
		decision: TranslationSuggestionDecision{Allowed: true},
	})
	fixture.admin.config.Commands.RPC.Commands = map[string]RPCCommandRule{
		TranslationSuggestionGenerateCommandName: DefaultTranslationSuggestionRPCCommandRule(),
	}
	if err := fixture.admin.Commands().SetExecutionPolicy(CommandExecutionPolicy{
		PerCommand: map[string]gocommand.ExecutionMode{
			TranslationSuggestionGenerateCommandName: gocommand.ExecutionModeQueued,
		},
	}); err != nil {
		t.Fatalf("SetExecutionPolicy: %v", err)
	}

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	title := translationEditorFieldByPath(t, extractMap(payload["data"]), "title")
	fieldAction := extractMap(title["suggest_translation_action"])
	if enabled := toBool(fieldAction["enabled"]); enabled {
		t.Fatalf("expected queued suggestion action disabled for editor, got %+v", fieldAction)
	}
	if got := toString(fieldAction["execution_mode"]); got != string(gocommand.ExecutionModeQueued) {
		t.Fatalf("expected queued execution mode in action state, got %q in %+v", got, fieldAction)
	}
	if got := toString(fieldAction["reason_code"]); got != "execution_mode_unsupported" {
		t.Fatalf("expected execution mode unsupported reason, got %q in %+v", got, fieldAction)
	}
}

func TestTranslationEditorAssignmentDetailSuggestionActionReadOnlyAndPolicyDenied(t *testing.T) {
	readOnly := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		AssignmentStatus: AssignmentStatusApproved,
		Permissions:      map[string]bool{PermAdminTranslationsSuggest: true},
	})
	readOnly.admin.WithTranslationSuggestionService(editorSuggestionActionService{decision: TranslationSuggestionDecision{Allowed: true}})
	readOnly.admin.config.Commands.RPC.Commands = map[string]RPCCommandRule{
		TranslationSuggestionGenerateCommandName: DefaultTranslationSuggestionRPCCommandRule(),
	}
	status, payload := doTranslationEditorJSONRequest(t, readOnly.app, http.MethodGet, "/admin/api/translations/assignments/"+readOnly.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("read-only status=%d want=200 payload=%+v", status, payload)
	}
	action := extractMap(extractMap(payload["data"])["suggest_translation_action"])
	if got := toString(action["reason_code"]); got != TranslationSuggestionReasonReadOnlyAssignment {
		t.Fatalf("expected read-only reason, got %q in %+v", got, action)
	}

	denied := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		Permissions: map[string]bool{PermAdminTranslationsSuggest: true},
	})
	denied.admin.WithTranslationSuggestionService(editorSuggestionActionService{decision: TranslationSuggestionDecision{
		Allowed:    false,
		ReasonCode: TranslationSuggestionReasonQuotaExceeded,
		Reason:     "Quota exhausted.",
	}})
	denied.admin.config.Commands.RPC.Commands = map[string]RPCCommandRule{
		TranslationSuggestionGenerateCommandName: DefaultTranslationSuggestionRPCCommandRule(),
	}
	status, payload = doTranslationEditorJSONRequest(t, denied.app, http.MethodGet, "/admin/api/translations/assignments/"+denied.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("denied status=%d want=200 payload=%+v", status, payload)
	}
	title := translationEditorFieldByPath(t, extractMap(payload["data"]), "title")
	fieldAction := extractMap(title["suggest_translation_action"])
	if enabled := toBool(fieldAction["enabled"]); enabled {
		t.Fatalf("expected quota-denied action disabled, got %+v", fieldAction)
	}
	if got := toString(fieldAction["reason_code"]); got != TranslationSuggestionReasonQuotaExceeded {
		t.Fatalf("expected quota reason, got %q in %+v", got, fieldAction)
	}
}

func TestTranslationEditorAssignmentDetailIncludesActorDisplayLabels(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		AssignmentAssigneeID: "9e838c81-6d3e-49d7-ad8f-b6616a040a44",
		AssignmentReviewerID: "173c7e5b-50cb-37d0-8ced-a24b570863e6",
	})
	ctx := context.Background()
	if _, err := fixture.admin.users.users.Create(ctx, UserRecord{
		ID:       "9e838c81-6d3e-49d7-ad8f-b6616a040a44",
		Username: "translator.jane",
		Email:    "jane@example.com",
		Status:   "active",
	}); err != nil {
		t.Fatalf("seed assignee user: %v", err)
	}
	if _, err := fixture.admin.users.users.Create(ctx, UserRecord{
		ID:       "173c7e5b-50cb-37d0-8ced-a24b570863e6",
		Username: "",
		Email:    "reviewer.sam@example.com",
		Status:   "active",
	}); err != nil {
		t.Fatalf("seed reviewer user: %v", err)
	}

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	assignment := extractMap(extractMap(payload["data"])["translation_assignment"])
	if got := strings.TrimSpace(toString(assignment["assignee_id"])); got != "9e838c81-6d3e-49d7-ad8f-b6616a040a44" {
		t.Fatalf("expected assignee_id to remain stable, got %q", got)
	}
	if got := strings.TrimSpace(toString(assignment["reviewer_id"])); got != "173c7e5b-50cb-37d0-8ced-a24b570863e6" {
		t.Fatalf("expected reviewer_id to remain stable, got %q", got)
	}
	if got := strings.TrimSpace(toString(assignment["assignee_label"])); got != "translator.jane" {
		t.Fatalf("expected assignee_label translator.jane, got %q", got)
	}
	if got := strings.TrimSpace(toString(assignment["display_assignee"])); got != "translator.jane" {
		t.Fatalf("expected display_assignee translator.jane, got %q", got)
	}
	if got := strings.TrimSpace(toString(assignment["reviewer_label"])); got != "reviewer.sam@example.com" {
		t.Fatalf("expected reviewer_label reviewer.sam@example.com, got %q", got)
	}
	if got := strings.TrimSpace(toString(assignment["display_reviewer"])); got != "reviewer.sam@example.com" {
		t.Fatalf("expected display_reviewer reviewer.sam@example.com, got %q", got)
	}
}

func TestTranslationEditorAssignmentDetailReturnsPreviewActionWithoutURL(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	preview := extractMap(data["preview_action"])
	if !toBool(preview["enabled"]) {
		t.Fatalf("expected preview action enabled, got %+v", preview)
	}
	if got := toString(preview["assignment_id"]); got != fixture.assignmentID {
		t.Fatalf("expected assignment_id %q, got %q", fixture.assignmentID, got)
	}
	if got := toString(preview["entity_type"]); got != "pages" {
		t.Fatalf("expected entity_type pages, got %q", got)
	}
	if got := toString(preview["target_record_id"]); got != fixture.targetRecordID {
		t.Fatalf("expected target_record_id %q, got %q", fixture.targetRecordID, got)
	}
	if got := toString(preview["record_id"]); got != fixture.targetRecordID {
		t.Fatalf("expected record_id to target %q, got %q", fixture.targetRecordID, got)
	}
	if got := toString(preview["target_locale"]); got != "fr" {
		t.Fatalf("expected target_locale fr, got %q", got)
	}
	if got := toString(preview["channel"]); got != "production" {
		t.Fatalf("expected channel production, got %q", got)
	}
	if got := toString(preview["url"]); got != "" {
		t.Fatalf("expected assignment detail preview action to omit signed url, got %q", got)
	}
}

func TestTranslationEditorAssignmentPreviewReturnsFreshSignedTargetURL(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	req.Header.Set("X-User-ID", "translator-1")
	req.Header.Set("X-Test-Authenticated-Actor-ID", "translator-1")
	resp, err := fixture.app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=200", resp.StatusCode)
	}
	if got := strings.TrimSpace(resp.Header.Get("Cache-Control")); got != "no-store" {
		t.Fatalf("expected Cache-Control no-store, got %q", got)
	}
	if got := strings.TrimSpace(resp.Header.Get("Pragma")); got != "no-cache" {
		t.Fatalf("expected Pragma no-cache, got %q", got)
	}

	payload := map[string]any{}
	if decodeErr := json.NewDecoder(resp.Body).Decode(&payload); decodeErr != nil {
		t.Fatalf("decode response: %v", decodeErr)
	}
	meta := extractMap(payload["meta"])
	if got := toString(meta["cache"]); got != "no-store" {
		t.Fatalf("expected meta cache no-store, got %q", got)
	}
	if got := toString(meta["channel"]); got != "production" {
		t.Fatalf("expected meta channel production, got %q", got)
	}

	data := extractMap(payload["data"])
	if !toBool(data["enabled"]) {
		t.Fatalf("expected enabled preview data, got %+v", data)
	}
	if got := toString(data["target_record_id"]); got != fixture.targetRecordID {
		t.Fatalf("expected target_record_id %q, got %q", fixture.targetRecordID, got)
	}
	if got := toString(data["record_id"]); got != fixture.targetRecordID {
		t.Fatalf("expected record_id to target %q, got %q", fixture.targetRecordID, got)
	}
	rawURL := toString(data["url"])
	if !strings.HasPrefix(rawURL, "/fr/page-1?preview_token=") {
		t.Fatalf("expected localized target preview url, got %q", rawURL)
	}
	token := previewTokenFromURL(t, rawURL)
	decoded, err := fixture.admin.Preview().Validate(token)
	if err != nil {
		t.Fatalf("validate preview token: %v", err)
	}
	if decoded.ContentID != fixture.targetRecordID {
		t.Fatalf("expected preview token content id %q, got %q", fixture.targetRecordID, decoded.ContentID)
	}
	if decoded.EntityType != "pages@production" {
		t.Fatalf("expected preview token entity pages@production, got %q", decoded.EntityType)
	}
}

func TestTranslationEditorAssignmentPreviewUsesRequestedChannelInTokenScope(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	syncTranslationFamilyFixtureStore(t, fixture.admin, "staging")

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=staging&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if !toBool(data["enabled"]) {
		t.Fatalf("expected enabled staging preview, got %+v", data)
	}
	if got := toString(data["channel"]); got != "staging" {
		t.Fatalf("expected staging channel, got %q", got)
	}
	token := previewTokenFromURL(t, toString(data["url"]))
	decoded, err := fixture.admin.Preview().Validate(token)
	if err != nil {
		t.Fatalf("validate preview token: %v", err)
	}
	if decoded.EntityType != "pages@staging" {
		t.Fatalf("expected preview token entity pages@staging, got %q", decoded.EntityType)
	}
	if decoded.ContentID != fixture.targetRecordID {
		t.Fatalf("expected preview token content id %q, got %q", fixture.targetRecordID, decoded.ContentID)
	}
}

func TestTranslationEditorAssignmentPreviewReturnsUnavailableWhenPathMissing(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target page: %v", err)
	}
	updated := cloneCMSPage(*target)
	updated.Slug = " "
	updated.PreviewURL = " "
	updated.Data = map[string]any{
		"body": "Target body without a preview path.",
	}
	if _, err := fixture.content.UpdatePage(context.Background(), updated); err != nil {
		t.Fatalf("update target page without preview path: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if toBool(data["enabled"]) {
		t.Fatalf("expected preview disabled without path, got %+v", data)
	}
	if got := toString(data["reason_code"]); got != translationPreviewReasonPathMissing {
		t.Fatalf("expected reason_code %q, got %q in %+v", translationPreviewReasonPathMissing, got, data)
	}
	if got := toString(data["url"]); got != "" {
		t.Fatalf("expected disabled preview to omit url, got %q", got)
	}
}

func TestTranslationEditorAssignmentPreviewRequiresAllowlistedAbsolutePreviewURL(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target page: %v", err)
	}
	updated := cloneCMSPage(*target)
	updated.Slug = " "
	updated.PreviewURL = "https://preview.example.test/fr/page-1?lang=fr#draft"
	updated.Data = map[string]any{
		"body": "Target body with absolute preview URL.",
	}
	if _, err := fixture.content.UpdatePage(context.Background(), updated); err != nil {
		t.Fatalf("update target page with absolute preview url: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assertTranslationPreviewDisabled(t, payload, translationPreviewReasonPathMissing)

	fixture.admin.AddPreviewURLAllowedHost("https://preview.example.test/base")
	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if !toBool(data["enabled"]) {
		t.Fatalf("expected allowlisted absolute preview enabled, got %+v", data)
	}
	rawURL := toString(data["url"])
	if !strings.HasPrefix(rawURL, "https://preview.example.test/fr/page-1?lang=fr&preview_token=") || !strings.HasSuffix(rawURL, "#draft") {
		t.Fatalf("expected allowlisted absolute preview URL with token before fragment, got %q", rawURL)
	}
}

func TestTranslationEditorAssignmentPreviewReturnsUnavailableWhenTargetRecordMissing(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	if err := fixture.content.DeletePage(context.Background(), fixture.targetRecordID); err != nil {
		t.Fatalf("delete target page: %v", err)
	}

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assertTranslationPreviewDisabled(t, payload, translationPreviewReasonNoTarget)
}

func TestTranslationEditorAssignmentPreviewReturnsUnavailableWhenPreviewServiceMissing(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	fixture.admin.preview = nil

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assertTranslationPreviewDisabled(t, payload, translationPreviewReasonPreviewUnavailable)
}

func TestTranslationEditorAssignmentPreviewReturnsUnavailableForUnsupportedContent(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	family, ok, err := fixture.admin.translationFamilyStore.Family(context.Background(), "tg-page-1")
	if err != nil {
		t.Fatalf("load family: %v", err)
	}
	if !ok {
		t.Fatalf("expected family")
	}
	family.ContentType = "unsupported_content_type"
	if err := fixture.admin.translationFamilyStore.SaveFamily(context.Background(), family); err != nil {
		t.Fatalf("save unsupported family: %v", err)
	}

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assertTranslationPreviewDisabled(t, payload, translationPreviewReasonUnsupportedContent)
}

func TestTranslationEditorAssignmentPreviewReturnsUnavailableWhenContentPanelPermissionDenied(t *testing.T) {
	const pagePreviewPermission = "admin.pages.preview"
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		PagePanelViewPermission: pagePreviewPermission,
		Permissions: map[string]bool{
			pagePreviewPermission: false,
		},
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	assertTranslationPreviewDisabled(t, payload, translationPreviewReasonPermissionDenied)
}

func TestTranslationEditorAssignmentPreviewRequiresViewPermission(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		Permissions: map[string]bool{
			PermAdminTranslationsView: false,
		},
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"/preview?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusForbidden {
		t.Fatalf("status=%d want=403 payload=%+v", status, payload)
	}
}

func assertTranslationPreviewDisabled(t *testing.T, payload map[string]any, reasonCode string) {
	t.Helper()
	data := extractMap(payload["data"])
	if toBool(data["enabled"]) {
		t.Fatalf("expected preview disabled, got %+v", data)
	}
	if got := toString(data["reason_code"]); got != reasonCode {
		t.Fatalf("expected reason_code %q, got %q in %+v", reasonCode, got, data)
	}
	if got := toString(data["reason"]); got == "" {
		t.Fatalf("expected disabled reason in %+v", data)
	}
	if got := toString(data["url"]); got != "" {
		t.Fatalf("expected disabled preview to omit url, got %q", got)
	}
}

func TestTranslationEditorAssignmentDetailReturnsLocaleNavigation(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		RequiredLocales: []string{"fr", "es", "de"},
		ExtraAssignments: []TranslationAssignment{
			{
				ID:             "asg-editor-es",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "es",
				TargetRecordID: "page-1-es",
				SourceTitle:    "Translation guide",
				SourcePath:     "/page-1",
				AssignmentType: AssignmentTypeDirect,
				Status:         AssignmentStatusInProgress,
				Priority:       PriorityNormal,
				AssigneeID:     "translator-2",
				WorkScope:      translationcore.DefaultWorkScope,
				Version:        1,
			},
			{
				ID:             "asg-editor-es-review",
				FamilyID:       "tg-page-1",
				EntityType:     "pages",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				SourceRecordID: "page-1",
				SourceLocale:   "en",
				TargetLocale:   "es",
				TargetRecordID: "page-1-es-review",
				SourceTitle:    "Translation guide",
				SourcePath:     "/page-1",
				AssignmentType: AssignmentTypeDirect,
				Status:         AssignmentStatusInProgress,
				Priority:       PriorityHigh,
				AssigneeID:     "translator-review",
				WorkScope:      "editorial.review",
				Version:        1,
				UpdatedAt:      time.Date(2026, 3, 12, 18, 0, 0, 0, time.UTC),
			},
		},
	})
	if _, err := fixture.content.CreatePage(context.Background(), CMSPage{
		ID:       "page-1-it",
		Title:    "Guida di traduzione",
		Slug:     "page-1-it",
		Locale:   "it",
		FamilyID: "tg-page-1",
		Status:   "draft",
		Data: map[string]any{
			"path": "/it/page-1",
			"body": "Bozza italiana senza incarico.",
		},
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	}); err != nil {
		t.Fatalf("seed variant-only locale: %v", err)
	}
	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page for variant-only locale: %v", err)
	}
	updatedSource := cloneCMSPage(*source)
	updatedSource.AvailableLocales = append(updatedSource.AvailableLocales, "it")
	if _, err := fixture.content.UpdatePage(context.Background(), updatedSource); err != nil {
		t.Fatalf("update source page available locales: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	navigation := extractMap(data["locale_navigation"])
	if got := toString(navigation["family_id"]); got != "tg-page-1" {
		t.Fatalf("expected family_id tg-page-1, got %q", got)
	}
	if got := toString(navigation["current_locale"]); got != "fr" {
		t.Fatalf("expected current_locale fr, got %q", got)
	}
	if got := toString(navigation["source_locale"]); got != "en" {
		t.Fatalf("expected source_locale en, got %q", got)
	}
	if got := toString(navigation["current_work_scope"]); got != translationcore.DefaultWorkScope {
		t.Fatalf("expected current_work_scope %q, got %q", translationcore.DefaultWorkScope, got)
	}
	if href := toString(navigation["family_detail_url"]); !strings.Contains(href, "/admin/translations/families/tg-page-1") {
		t.Fatalf("expected family detail href, got %q", href)
	}

	locales := anySliceFromValue(navigation["locales"])
	if len(locales) != 4 {
		t.Fatalf("expected four locale navigation entries, got %d: %+v", len(locales), locales)
	}
	entries := map[string]map[string]any{}
	for _, raw := range locales {
		entry := extractMap(raw)
		entries[toString(entry["locale"])] = entry
	}

	fr := entries["fr"]
	if !toBool(fr["current"]) || !toBool(fr["enabled"]) || toBool(fr["disabled"]) {
		t.Fatalf("expected current fr locale to be enabled, got %+v", fr)
	}
	if got := toString(fr["href"]); !strings.Contains(got, "/admin/translations/assignments/asg-editor-1/edit") {
		t.Fatalf("expected fr assignment editor href, got %q", got)
	}

	es := entries["es"]
	if toBool(es["current"]) || !toBool(es["enabled"]) || toBool(es["disabled"]) {
		t.Fatalf("expected assigned es locale to be enabled sibling, got %+v", es)
	}
	if got := toString(es["href"]); !strings.Contains(got, "/admin/translations/assignments/asg-editor-es/edit") {
		t.Fatalf("expected es assignment editor href, got %q", got)
	}
	if got := toString(es["assignment_id"]); got != "asg-editor-es" {
		t.Fatalf("expected es locale to use current work-scope assignment, got %q", got)
	}
	if got := toString(es["work_scope"]); got != translationcore.DefaultWorkScope {
		t.Fatalf("expected es work_scope %q, got %q", translationcore.DefaultWorkScope, got)
	}

	de := entries["de"]
	if toBool(de["enabled"]) || !toBool(de["disabled"]) {
		t.Fatalf("expected missing de locale to be disabled, got %+v", de)
	}
	if got := toString(de["href"]); got != "" {
		t.Fatalf("expected missing de locale to have no fallback href, got %q", got)
	}
	if got := toString(de["reason"]); !strings.Contains(got, "No translation assignment") {
		t.Fatalf("expected missing de locale reason, got %q", got)
	}

	it := entries["it"]
	if toBool(it["enabled"]) || !toBool(it["disabled"]) {
		t.Fatalf("expected variant-only it locale to be disabled, got %+v", it)
	}
	if got := toString(it["href"]); got != "" {
		t.Fatalf("expected variant-only it locale to have no fallback href, got %q", got)
	}
	if _, ok := entries["en"]; ok {
		t.Fatalf("did not expect source locale in target locale navigation: %+v", entries["en"])
	}
}

func TestTranslationEditorAssignmentDetailReturnsScopedTranslationMemorySuggestions(t *testing.T) {
	familyStore := NewBunTranslationFamilyStore(newTranslationFamilyStoreSQLiteDB(t))
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
		FamilyStore:    familyStore,
	})

	seedTranslationMemoryFixturePair(t, fixture.content, translationMemoryFixturePair{
		FamilyID:             "tg-memory-current",
		SourceID:             "memory-current-en",
		TargetID:             "memory-current-fr",
		TenantID:             "tenant-1",
		OrgID:                "org-1",
		TargetLocale:         "fr",
		TargetStatus:         string(translationcore.VariantStatusApproved),
		SourceTitle:          "Prior publish guide",
		SourceBody:           "Translation guide for publish workflows from the home page.",
		TargetBody:           "Guide precedent pour les workflows de publication.",
		UseCurrentSourceHash: true,
	})
	seedTranslationMemoryFixturePair(t, fixture.content, translationMemoryFixturePair{
		FamilyID:     "tg-memory-stale",
		SourceID:     "memory-stale-en",
		TargetID:     "memory-stale-fr",
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		TargetLocale: "fr",
		TargetStatus: string(translationcore.VariantStatusPublished),
		SourceTitle:  "Older publish guide",
		SourceBody:   "Translation guide for publish workflows from the home page.",
		TargetBody:   "Ancienne suggestion approuvee.",
		SourceHash:   "stale-source-hash",
	})
	seedTranslationMemoryFixturePair(t, fixture.content, translationMemoryFixturePair{
		FamilyID:             "tg-memory-other-tenant",
		SourceID:             "memory-other-tenant-en",
		TargetID:             "memory-other-tenant-fr",
		TenantID:             "tenant-2",
		OrgID:                "org-9",
		TargetLocale:         "fr",
		TargetStatus:         string(translationcore.VariantStatusApproved),
		SourceTitle:          "Other tenant",
		SourceBody:           "Translation guide for publish workflows from the home page.",
		TargetBody:           "Leaked tenant suggestion",
		UseCurrentSourceHash: true,
	})
	seedTranslationMemoryFixturePair(t, fixture.content, translationMemoryFixturePair{
		FamilyID:             "tg-memory-other-locale",
		SourceID:             "memory-other-locale-en",
		TargetID:             "memory-other-locale-es",
		TenantID:             "tenant-1",
		OrgID:                "org-1",
		TargetLocale:         "es",
		TargetStatus:         string(translationcore.VariantStatusApproved),
		SourceTitle:          "Other locale",
		SourceBody:           "Translation guide for publish workflows from the home page.",
		TargetBody:           "Sugerencia en espanol",
		UseCurrentSourceHash: true,
	})
	seedTranslationMemoryFixturePair(t, fixture.content, translationMemoryFixturePair{
		FamilyID:             "tg-memory-draft",
		SourceID:             "memory-draft-en",
		TargetID:             "memory-draft-fr",
		TenantID:             "tenant-1",
		OrgID:                "org-1",
		TargetLocale:         "fr",
		TargetStatus:         string(translationcore.VariantStatusDraft),
		SourceTitle:          "Draft",
		SourceBody:           "Translation guide for publish workflows from the home page.",
		TargetBody:           "Draft suggestion",
		UseCurrentSourceHash: true,
	})
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	assist := extractMap(extractMap(payload["data"])["assist"])
	suggestions := anySliceFromValue(assist["translation_memory_suggestions"])
	if len(suggestions) != 2 {
		t.Fatalf("expected two scoped translation memory suggestions, got %+v", suggestions)
	}
	current := extractMap(suggestions[0])
	if got := toString(current["source"]); got != "internal_variant_history" {
		t.Fatalf("expected internal history source, got %+v", current)
	}
	if got := toString(current["field_path"]); got != "body" {
		t.Fatalf("expected body field suggestion, got %+v", current)
	}
	if got := toString(current["locale_pair"]); got != "en:fr" {
		t.Fatalf("expected en:fr locale pair, got %+v", current)
	}
	if got := toString(current["suggested_text"]); got != "Guide precedent pour les workflows de publication." {
		t.Fatalf("expected current suggestion text, got %+v", current)
	}
	if stale := toBool(current["stale_source"]); stale {
		t.Fatalf("expected first suggestion to be current, got %+v", current)
	}

	stale := extractMap(suggestions[1])
	if got := toString(stale["suggested_text"]); got != "Ancienne suggestion approuvee." {
		t.Fatalf("expected stale suggestion text, got %+v", stale)
	}
	if staleSource := toBool(stale["stale_source"]); !staleSource {
		t.Fatalf("expected stale_source indicator, got %+v", stale)
	}
	for _, raw := range suggestions {
		entry := extractMap(raw)
		switch toString(entry["suggested_text"]) {
		case "Leaked tenant suggestion", "Sugerencia en espanol", "Draft suggestion":
			t.Fatalf("unexpected unscoped, wrong-locale, or draft suggestion: %+v", entry)
		}
	}
}

func TestTranslationEditorAssignmentDetailUsesBoundedTranslationMemoryLookup(t *testing.T) {
	sourceFields := map[string]string{
		"title": "Prior guide",
		"path":  "/prior-guide",
		"body":  "Translation guide for publish workflows from the home page.",
	}
	trackingStore := &translationEditorMemoryTrackingStore{
		base: translationservices.NewInMemoryFamilyStore(),
		suggestions: []TranslationEditorMemorySuggestion{
			{
				Family: translationservices.FamilyRecord{
					ID:           "tm-tracking",
					TenantID:     "tenant-1",
					OrgID:        "org-1",
					ContentType:  "pages",
					SourceLocale: "en",
				},
				SourceVariant: translationservices.FamilyVariant{
					ID:             "tm-tracking::en",
					FamilyID:       "tm-tracking",
					TenantID:       "tenant-1",
					OrgID:          "org-1",
					Locale:         "en",
					Status:         string(translationcore.VariantStatusPublished),
					IsSource:       true,
					Fields:         sourceFields,
					SourceRecordID: "tm-tracking-source",
				},
				TargetVariant: translationservices.FamilyVariant{
					ID:                   "tm-tracking::fr",
					FamilyID:             "tm-tracking",
					TenantID:             "tenant-1",
					OrgID:                "org-1",
					Locale:               "fr",
					Status:               string(translationcore.VariantStatusApproved),
					SourceHashAtLastSync: translationEditorHashFields(sourceFields),
					Fields: map[string]string{
						"body": "Suggestion issue du read model.",
					},
					SourceRecordID: "tm-tracking-fr",
				},
				FieldPath:     "body",
				SourceText:    "Translation guide for publish workflows from the home page.",
				SuggestedText: "Suggestion issue du read model.",
			},
		},
	}
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
		FamilyStore:    trackingStore,
	})
	trackingStore.familiesCalls = 0

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}
	if trackingStore.familiesCalls != 0 {
		t.Fatalf("expected editor TM lookup to avoid broad Families calls, got %d", trackingStore.familiesCalls)
	}
	assist := extractMap(extractMap(payload["data"])["assist"])
	suggestions := anySliceFromValue(assist["translation_memory_suggestions"])
	if len(suggestions) != 1 {
		t.Fatalf("expected bounded lookup suggestion, got %+v", suggestions)
	}
	if got := toString(extractMap(suggestions[0])["suggested_text"]); got != "Suggestion issue du read model." {
		t.Fatalf("expected bounded lookup suggestion text, got %+v", suggestions[0])
	}
}

func TestTranslationEditorAssignmentDetailPaginatesHistory(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		LastRejectionReason: "Please tighten the CTA tone.",
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, "/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1&history_page=2&history_per_page=1", nil)
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
	items := anySliceFromValue(history["items"])
	if len(items) != 1 {
		t.Fatalf("expected one paged history item, got %+v", history)
	}
	item := extractMap(items[0])
	if got := toString(item["entry_type"]); got == "" {
		t.Fatalf("expected history entry_type, got %+v", item)
	}
}

func TestTranslationEditorDraftSyncMaintainsSourceHashAndRowVersion(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	originalTarget, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || originalTarget == nil {
		t.Fatalf("load original target page: %v", err)
	}
	originalSourceHash := toString(originalTarget.Metadata["source_hash_at_last_sync"])

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, translationEditorDraftSyncURL(fixture), translationEditorDraftSyncMutation(3, true, map[string]any{
		"title": "Guide de publication",
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	data := extractMap(payload["data"])
	if applied := toBool(payload["applied"]); !applied {
		t.Fatalf("expected applied sync mutation, got %+v", payload)
	}
	if got := toInt(data["row_version"]); got != 4 {
		t.Fatalf("expected row_version 4, got %d", got)
	}
	fields := mapString(payloadPath(data, "fields"))
	if got := fields["title"]; got != "Guide de publication" {
		t.Fatalf("expected updated title, got %q", got)
	}
	preview := extractMap(data["preview_action"])
	if !toBool(preview["enabled"]) {
		t.Fatalf("expected draft sync response to refresh enabled preview_action, got %+v", preview)
	}
	if got := toString(preview["target_record_id"]); got != fixture.targetRecordID {
		t.Fatalf("expected draft sync preview target_record_id %q, got %q", fixture.targetRecordID, got)
	}
	if got := toString(preview["url"]); got != "" {
		t.Fatalf("expected draft sync preview_action to omit signed URL, got %q", got)
	}
	fieldDrift := extractMap(data["field_drift"])
	if changed := toBool(extractMap(fieldDrift["title"])["changed"]); !changed {
		t.Fatalf("expected title drift to remain until source acknowledgement, got %+v", fieldDrift)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load updated target page: %v", err)
	}
	if got := target.Status; got != "draft" {
		t.Fatalf("expected CMS target status draft, got %q", got)
	}
	assertTranslationEditorVariantStatusMetadata(t, target.Metadata, string(translationcore.VariantStatusInProgress))
	editorMeta := extractMap(extractMap(target.Metadata[translationEditorMetadataKey]))
	if got := toInt(editorMeta[translationEditorRowVersionKey]); got != 4 {
		t.Fatalf("expected persisted row_version 4, got %d", got)
	}
	assertTranslationEditorReadModelVariantStatus(t, fixture, string(translationcore.VariantStatusInProgress))

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

func TestTranslationEditorAutosaveAcceptsConsecutiveFieldUpdates(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	detailURL := "/admin/api/translations/assignments/" + fixture.assignmentID + "?channel=production&tenant_id=tenant-1&org_id=org-1"
	variantURL := translationEditorDraftSyncURL(fixture)

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, detailURL, nil)
	if status != http.StatusOK {
		t.Fatalf("initial detail status=%d want=200 payload=%+v", status, payload)
	}
	detail := extractMap(payload["data"])
	if got := toInt(detail["row_version"]); got != 3 {
		t.Fatalf("initial row_version = %d, want 3", got)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, variantURL, translationEditorDraftSyncMutation(3, true, map[string]any{
		"title": "Guide de publication",
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("first autosave status=%d want=200 payload=%+v", status, payload)
	}
	firstSave := extractMap(payload["data"])
	firstVersion := toInt(firstSave["row_version"])
	if firstVersion != 4 {
		t.Fatalf("first autosave row_version = %d, want 4", firstVersion)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, detailURL, nil)
	if status != http.StatusOK {
		t.Fatalf("detail after first autosave status=%d want=200 payload=%+v", status, payload)
	}
	reloaded := extractMap(payload["data"])
	if got := toInt(reloaded["row_version"]); got != firstVersion {
		t.Fatalf("reloaded row_version = %d, want %d", got, firstVersion)
	}
	targetVariant := extractMap(reloaded["target_variant"])
	if got := toInt(targetVariant["row_version"]); got != firstVersion {
		t.Fatalf("reloaded target_variant row_version = %d, want %d", got, firstVersion)
	}
	family, ok, err := fixture.admin.translationFamilyStore.Family(context.Background(), "tg-page-1")
	if err != nil {
		t.Fatalf("load synced family after first autosave: %v", err)
	}
	if !ok {
		t.Fatalf("expected synced family after first autosave")
	}
	variant, ok := translationFamilyVariantByLocale(family, "fr")
	if !ok {
		t.Fatalf("expected fr variant after first autosave: %+v", family.Variants)
	}
	if variant.RowVersion != int64(firstVersion) {
		t.Fatalf("synced variant row_version = %d, want %d", variant.RowVersion, firstVersion)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, variantURL, translationEditorDraftSyncMutation(int64(firstVersion), true, map[string]any{
		"body": "Publier la traduction avec un second changement autosauve.",
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("second autosave status=%d want=200 payload=%+v", status, payload)
	}
	secondSave := extractMap(payload["data"])
	if got := toInt(secondSave["row_version"]); got != 5 {
		t.Fatalf("second autosave row_version = %d, want 5", got)
	}
	fields := mapString(payloadPath(secondSave, "fields"))
	if got := fields["title"]; got != "Guide de publication" {
		t.Fatalf("expected title from first autosave to persist, got %q", got)
	}
	if got := fields["body"]; got != "Publier la traduction avec un second changement autosauve." {
		t.Fatalf("expected body from second autosave to persist, got %q", got)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load target after consecutive autosaves: %v", err)
	}
	if target.Title != "Guide de publication" {
		t.Fatalf("persisted title = %q, want first autosave value", target.Title)
	}
	if got := toString(target.Data["body"]); got != "Publier la traduction avec un second changement autosauve." {
		t.Fatalf("persisted body = %q, want second autosave value", got)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, variantURL, translationEditorDraftSyncMutation(int64(firstVersion), true, map[string]any{
		"path": "/fr/stale",
	}, nil))
	if status != http.StatusConflict {
		t.Fatalf("stale autosave status=%d want=409 payload=%+v", status, payload)
	}
	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["code"]); got != "STALE_REVISION" {
		t.Fatalf("expected code STALE_REVISION, got %q", got)
	}
	latest := extractMap(extractMap(extractMap(errPayload["details"])["resource"])["data"])
	if got := toInt(latest["row_version"]); got != 5 {
		t.Fatalf("latest stale-conflict row_version = %d, want 5", got)
	}
}

func TestTranslationEditorAutosavePersistsPageSEOMirrorFields(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	detailURL := "/admin/api/translations/assignments/" + fixture.assignmentID + "?channel=production&tenant_id=tenant-1&org_id=org-1"
	variantURL := translationEditorDraftSyncURL(fixture)

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load seeded target page: %v", err)
	}
	staleTitle := "Translation Demo - Exchange Ready"
	staleDescription := "Demonstrates translation exchange export and import flows."
	seeded := cloneCMSPage(*target)
	if seeded.Data == nil {
		seeded.Data = map[string]any{}
	}
	if seeded.SEO == nil {
		seeded.SEO = map[string]any{}
	}
	seeded.Data["meta_title"] = staleTitle
	seeded.Data["meta_description"] = staleDescription
	seeded.SEO["title"] = staleTitle
	seeded.SEO["description"] = staleDescription
	if _, err = fixture.content.UpdatePage(context.Background(), seeded); err != nil {
		t.Fatalf("seed target page SEO mirrors: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")

	translatedTitle := "Demo de traduction - pret pour l'echange"
	translatedDescription := "Demontre les flux d'exportation et d'importation des echanges de traduction."
	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, variantURL, translationEditorDraftSyncMutation(3, true, map[string]any{
		"meta_title":       translatedTitle,
		"meta_description": translatedDescription,
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("autosave SEO fields status=%d want=200 payload=%+v", status, payload)
	}
	data := extractMap(payload["data"])
	if got := toInt(data["row_version"]); got != 4 {
		t.Fatalf("autosave SEO fields row_version = %d, want 4", got)
	}
	fields := mapString(extractMap(data["fields"]))
	targetFields := mapString(extractMap(data["target_fields"]))
	if got := fields["meta_title"]; got != translatedTitle {
		t.Fatalf("response fields.meta_title = %q, want %q", got, translatedTitle)
	}
	if got := fields["meta_description"]; got != translatedDescription {
		t.Fatalf("response fields.meta_description = %q, want %q", got, translatedDescription)
	}
	if got := targetFields["meta_title"]; got != translatedTitle {
		t.Fatalf("response target_fields.meta_title = %q, want %q", got, translatedTitle)
	}
	if got := targetFields["meta_description"]; got != translatedDescription {
		t.Fatalf("response target_fields.meta_description = %q, want %q", got, translatedDescription)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodGet, detailURL, nil)
	if status != http.StatusOK {
		t.Fatalf("detail after SEO autosave status=%d want=200 payload=%+v", status, payload)
	}
	reloadedTargetFields := mapString(extractMap(extractMap(payload["data"])["target_fields"]))
	if got := reloadedTargetFields["meta_title"]; got != translatedTitle {
		t.Fatalf("reloaded target_fields.meta_title = %q, want %q", got, translatedTitle)
	}
	if got := reloadedTargetFields["meta_description"]; got != translatedDescription {
		t.Fatalf("reloaded target_fields.meta_description = %q, want %q", got, translatedDescription)
	}

	persisted, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || persisted == nil {
		t.Fatalf("load target after SEO autosave: %v", err)
	}
	if got := toString(persisted.Data["meta_title"]); got != translatedTitle {
		t.Fatalf("persisted Data.meta_title = %q, want %q", got, translatedTitle)
	}
	if got := toString(persisted.Data["meta_description"]); got != translatedDescription {
		t.Fatalf("persisted Data.meta_description = %q, want %q", got, translatedDescription)
	}
	if got := toString(persisted.SEO["title"]); got != translatedTitle {
		t.Fatalf("persisted SEO.title = %q, want %q", got, translatedTitle)
	}
	if got := toString(persisted.SEO["description"]); got != translatedDescription {
		t.Fatalf("persisted SEO.description = %q, want %q", got, translatedDescription)
	}

	status, payload = doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, variantURL, translationEditorDraftSyncMutation(4, true, map[string]any{
		"meta_title":       "",
		"meta_description": "",
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("clear SEO fields status=%d want=200 payload=%+v", status, payload)
	}
	clearData := extractMap(payload["data"])
	clearFields := mapString(extractMap(clearData["fields"]))
	clearTargetFields := mapString(extractMap(clearData["target_fields"]))
	if got := clearFields["meta_title"]; got != "" {
		t.Fatalf("clear response fields.meta_title = %q, want empty", got)
	}
	if got := clearFields["meta_description"]; got != "" {
		t.Fatalf("clear response fields.meta_description = %q, want empty", got)
	}
	if got := clearTargetFields["meta_title"]; got != "" {
		t.Fatalf("clear response target_fields.meta_title = %q, want empty", got)
	}
	if got := clearTargetFields["meta_description"]; got != "" {
		t.Fatalf("clear response target_fields.meta_description = %q, want empty", got)
	}

	cleared, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || cleared == nil {
		t.Fatalf("load target after clearing SEO autosave: %v", err)
	}
	if got := toString(cleared.Data["meta_title"]); got != "" {
		t.Fatalf("cleared Data.meta_title = %q, want empty", got)
	}
	if got := toString(cleared.Data["meta_description"]); got != "" {
		t.Fatalf("cleared Data.meta_description = %q, want empty", got)
	}
	if got := toString(cleared.SEO["title"]); got != "" {
		t.Fatalf("cleared SEO.title = %q, want empty", got)
	}
	if got := toString(cleared.SEO["description"]); got != "" {
		t.Fatalf("cleared SEO.description = %q, want empty", got)
	}
}

func TestTranslationEditorAutosavePageSEOFieldWritesSurvivePageAdapterProjection(t *testing.T) {
	staleTitle := "Translation Demo - Exchange Ready"
	staleDescription := "Demonstrates translation exchange export and import flows."
	translatedTitle := "Demo de traduction - pret pour l'echange"
	translatedDescription := "Demontre les flux d'exportation et d'importation des echanges de traduction."
	existing := &CMSContent{
		ID:    "page-1-fr",
		Title: "Translation Demo - Exchange Ready",
		Slug:  "translation-demo-exchange",
		Data: map[string]any{
			"path":             "/translation-demo-exchange",
			"meta_title":       staleTitle,
			"meta_description": staleDescription,
		},
	}
	page := CMSPage{
		ID:    existing.ID,
		Title: existing.Title,
		Slug:  existing.Slug,
		Data:  cloneAnyMap(existing.Data),
		SEO: map[string]any{
			"title":       staleTitle,
			"description": staleDescription,
		},
	}

	translationEditorSetPageField(&page, "meta_title", translatedTitle)
	translationEditorSetPageField(&page, "meta_description", translatedDescription)
	projected := projectedPageContentDataForTest(page, existing)
	if got := toString(projected["meta_title"]); got != translatedTitle {
		t.Fatalf("projected meta_title = %q, want %q", got, translatedTitle)
	}
	if got := toString(projected["meta_description"]); got != translatedDescription {
		t.Fatalf("projected meta_description = %q, want %q", got, translatedDescription)
	}

	translationEditorSetPageField(&page, "meta_title", "")
	translationEditorSetPageField(&page, "meta_description", "")
	cleared := projectedPageContentDataForTest(page, existing)
	if got := toString(cleared["meta_title"]); got != "" {
		t.Fatalf("projected cleared meta_title = %q, want empty", got)
	}
	if got := toString(cleared["meta_description"]); got != "" {
		t.Fatalf("projected cleared meta_description = %q, want empty", got)
	}
	if got := toString(page.SEO["title"]); got != "" {
		t.Fatalf("page SEO.title after clear = %q, want empty", got)
	}
	if got := toString(page.SEO["description"]); got != "" {
		t.Fatalf("page SEO.description after clear = %q, want empty", got)
	}
}

func TestTranslationEditorDraftSyncReopensApprovedAndMovesActiveCMSStatusToDraft(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired:      true,
		TargetCMSStatus:     "scheduled",
		TargetVariantStatus: string(translationcore.VariantStatusApproved),
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, translationEditorDraftSyncURL(fixture), translationEditorDraftSyncMutation(3, false, map[string]any{
		"body": "Texte approuve mis a jour.",
	}, nil))
	if status != http.StatusOK {
		t.Fatalf("status=%d want=200 payload=%+v", status, payload)
	}

	target, err := fixture.content.Page(context.Background(), fixture.targetRecordID, "")
	if err != nil || target == nil {
		t.Fatalf("load updated target page: %v", err)
	}
	if got := target.Status; got != "draft" {
		t.Fatalf("expected CMS target status draft, got %q", got)
	}
	assertTranslationEditorVariantStatusMetadata(t, target.Metadata, string(translationcore.VariantStatusInProgress))
	assertTranslationEditorReadModelVariantStatus(t, fixture, string(translationcore.VariantStatusInProgress))
}

func TestTranslationEditorCMSStatusForVariantStatus(t *testing.T) {
	tests := []struct {
		name       string
		variant    string
		currentCMS string
		want       string
	}{
		{name: "in progress draft stays draft", variant: string(translationcore.VariantStatusInProgress), currentCMS: "draft", want: "draft"},
		{name: "in progress published becomes draft", variant: string(translationcore.VariantStatusInProgress), currentCMS: "published", want: "draft"},
		{name: "in progress scheduled becomes draft", variant: string(translationcore.VariantStatusInProgress), currentCMS: "scheduled", want: "draft"},
		{name: "pending approval becomes draft", variant: string(translationcore.VariantStatusInProgress), currentCMS: "pending_approval", want: "draft"},
		{name: "translation approved remains non public", variant: string(translationcore.VariantStatusApproved), currentCMS: "published", want: "draft"},
		{name: "archived remains archived", variant: string(translationcore.VariantStatusInProgress), currentCMS: "archived", want: "archived"},
		{name: "explicit archive wins", variant: string(translationcore.VariantStatusArchived), currentCMS: "published", want: "archived"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := translationEditorCMSStatusForVariantStatus(tc.variant, tc.currentCMS); got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestTranslationEditorDraftSyncAcknowledgesCurrentSourceHashWhenRequested(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	source, err := fixture.content.Page(context.Background(), "page-1", "")
	if err != nil || source == nil {
		t.Fatalf("load source page: %v", err)
	}
	currentSourceHash := translationEditorHashFields(translationFamilyFields(source.Title, source.Slug, source.Data))

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, translationEditorDraftSyncURL(fixture), translationEditorDraftSyncMutation(3, false, map[string]any{
		"title": "Guide de publication",
	}, map[string]any{
		"acknowledged_source_hash": currentSourceHash,
	}))
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

func TestTranslationEditorDraftSyncRejectsStaleSourceAcknowledgement(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, translationEditorDraftSyncURL(fixture), translationEditorDraftSyncMutation(3, false, map[string]any{
		"title": "Guide de publication",
	}, map[string]any{
		"acknowledged_source_hash": "stale-source-hash",
	}))
	if status != http.StatusBadRequest {
		t.Fatalf("status=%d want=400 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["code"]); got != "INVALID_MUTATION" {
		t.Fatalf("expected code INVALID_MUTATION, got %q", got)
	}
	meta := extractMap(errPayload["details"])
	if got := toString(meta["field"]); got != translationEditorAcknowledgedSourceHashKey {
		t.Fatalf("expected field %q, got %+v", translationEditorAcknowledgedSourceHashKey, meta)
	}
}

func TestTranslationEditorDraftSyncReturnsStaleRevisionPayload(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPatch, translationEditorDraftSyncURL(fixture), translationEditorDraftSyncMutation(2, true, map[string]any{
		"title": "Conflit",
	}, nil))
	if status != http.StatusConflict {
		t.Fatalf("status=%d want=409 payload=%+v", status, payload)
	}

	errPayload := extractMap(payload["error"])
	if got := toString(errPayload["code"]); got != "STALE_REVISION" {
		t.Fatalf("expected code STALE_REVISION, got %q", got)
	}
	details := extractMap(errPayload["details"])
	if got := toInt(details["current_revision"]); got != 3 {
		t.Fatalf("expected current_revision 3, got %+v", details)
	}
	latest := extractMap(extractMap(details["resource"])["data"])
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

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"channel":          "production",
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
		"/admin/api/translations/assignments/"+fixture.assignmentID+"?channel=production&tenant_id=tenant-1&org_id=org-1",
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
	comments := anySliceFromValue(reviewFeedback["comments"])
	if len(comments) != 1 {
		t.Fatalf("expected one review_feedback comment, got %+v", reviewFeedback)
	}
	qaResults := extractMap(data["qa_results"])
	if enabled := toBool(qaResults["enabled"]); !enabled {
		t.Fatalf("expected qa_results enabled, got %+v", qaResults)
	}
	summary := extractMap(qaResults["summary"])
	if got := toInt(summary["warning_count"]); got <= 0 {
		t.Fatalf("expected warning_count > 0, got %+v", summary)
	}
	if got := toInt(summary["blocker_count"]); got <= 0 {
		t.Fatalf("expected blocker_count > 0, got %+v", summary)
	}
	if blocked := toBool(qaResults["submit_blocked"]); !blocked {
		t.Fatalf("expected submit_blocked true, got %+v", qaResults)
	}
}

func TestTranslationEditorSubmitReviewBlocksOnQAResults(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{
		ReviewRequired: true,
	})
	enableTranslationEditorQAWithBlockers(t, fixture)
	metrics := &capturingTranslationMetrics{}
	useTranslationMetricsForTest(t, metrics)

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"channel":          "production",
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
	if blocked := toBool(qaResults["submit_blocked"]); !blocked {
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
	useTranslationMetricsForTest(t, metrics)
	reviewAssignment, err := rejectFixture.repo.Get(context.Background(), rejectFixture.assignmentID)
	if err != nil {
		t.Fatalf("load assignment: %v", err)
	}
	reviewAssignment.Status = AssignmentStatusInReview
	reviewAssignment.ReviewerID = "reviewer-1"
	reviewAssignment.LastReviewerID = "reviewer-1"
	reviewAssignment.Version = 2
	if _, updateReviewErr := rejectFixture.repo.Update(context.Background(), reviewAssignment, reviewAssignment.Version); updateReviewErr != nil {
		t.Fatalf("update review assignment: %v", updateReviewErr)
	}

	var rejectBody bytes.Buffer
	if encodeRejectErr := json.NewEncoder(&rejectBody).Encode(map[string]any{
		"channel":          "production",
		"expected_version": 3,
		"reason":           "Please align the CTA wording.",
		"comment":          "Keep the glossary term consistent.",
	}); encodeRejectErr != nil {
		t.Fatalf("encode reject body: %v", encodeRejectErr)
	}
	rejectReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignments/"+rejectFixture.assignmentID+"/actions/reject?channel=production&tenant_id=tenant-1&org_id=org-1", &rejectBody)
	rejectReq.Header.Set("Content-Type", "application/json")
	rejectReq.Header.Set("X-User-ID", "reviewer-1")
	rejectResp, err := rejectFixture.app.Test(rejectReq)
	if err != nil {
		t.Fatalf("reject request error: %v", err)
	}
	defer rejectResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if rejectResp.StatusCode != http.StatusOK {
		t.Fatalf("reject status=%d want=200", rejectResp.StatusCode)
	}

	rejectedTarget, err := rejectFixture.content.Page(context.Background(), rejectFixture.targetRecordID, "")
	if err != nil || rejectedTarget == nil {
		t.Fatalf("load rejected target: %v", err)
	}
	if got := rejectedTarget.Status; got != "draft" {
		t.Fatalf("expected rejected target CMS status draft, got %q", got)
	}
	assertTranslationEditorVariantStatusMetadata(t, rejectedTarget.Metadata, string(translationcore.VariantStatusInProgress))
	assertTranslationEditorReadModelVariantStatus(t, rejectFixture, string(translationcore.VariantStatusInProgress))
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
	if _, updateApproveErr := approveFixture.repo.Update(context.Background(), approveAssignment, approveAssignment.Version); updateApproveErr != nil {
		t.Fatalf("update approve assignment: %v", updateApproveErr)
	}

	var approveBody bytes.Buffer
	if encodeApproveErr := json.NewEncoder(&approveBody).Encode(map[string]any{
		"channel":          "production",
		"expected_version": 3,
		"comment":          "Looks good for publish.",
	}); encodeApproveErr != nil {
		t.Fatalf("encode approve body: %v", encodeApproveErr)
	}
	approveReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/translations/assignments/"+approveFixture.assignmentID+"/actions/approve?channel=production&tenant_id=tenant-1&org_id=org-1", &approveBody)
	approveReq.Header.Set("Content-Type", "application/json")
	approveReq.Header.Set("X-User-ID", "reviewer-1")
	approveResp, err := approveFixture.app.Test(approveReq)
	if err != nil {
		t.Fatalf("approve request error: %v", err)
	}
	defer approveResp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort
	if approveResp.StatusCode != http.StatusOK {
		t.Fatalf("approve status=%d want=200", approveResp.StatusCode)
	}

	approvedTarget, err := approveFixture.content.Page(context.Background(), approveFixture.targetRecordID, "")
	if err != nil || approvedTarget == nil {
		t.Fatalf("load approved target: %v", err)
	}
	if got := approvedTarget.Status; got != "draft" {
		t.Fatalf("expected approved target CMS status draft, got %q", got)
	}
	assertTranslationEditorVariantStatusMetadata(t, approvedTarget.Metadata, string(translationcore.VariantStatusApproved))
	assertTranslationEditorReadModelVariantStatus(t, approveFixture, string(translationcore.VariantStatusApproved))
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
	useTranslationMetricsForTest(t, metrics)

	status, payload := doTranslationEditorJSONRequest(t, fixture.app, http.MethodPost, "/admin/api/translations/assignments/"+fixture.assignmentID+"/actions/submit_review?channel=production&tenant_id=tenant-1&org_id=org-1", map[string]any{
		"channel":          "production",
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
	if got := target.Status; got != "draft" {
		t.Fatalf("expected target CMS status draft, got %q", got)
	}
	assertTranslationEditorVariantStatusMetadata(t, target.Metadata, string(translationcore.VariantStatusApproved))
	assertTranslationEditorReadModelVariantStatus(t, fixture, string(translationcore.VariantStatusApproved))
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

func translationEditorDraftSyncURL(fixture translationEditorTestFixture) string {
	return "/admin/api/translations/sync/resources/translation_variant_draft/" + fixture.targetVariantID + "?channel=production&tenant_id=tenant-1&org_id=org-1"
}

func translationEditorDraftSyncMutation(expectedRevision int64, autosave bool, fields map[string]any, metadata map[string]any) map[string]any {
	payload := map[string]any{
		"autosave": autosave,
		"fields":   fields,
	}
	if metadata != nil {
		payload["metadata"] = metadata
	}
	return map[string]any{
		"operation":         translationDraftSyncOperation,
		"expected_revision": expectedRevision,
		"payload":           payload,
		"metadata": map[string]any{
			"autosave": autosave,
		},
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

	req := httptest.NewRequestWithContext(context.Background(), method, target, &payload)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "translator-1")
	req.Header.Set("X-Test-Authenticated-Actor-ID", "translator-1")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test response body cleanup is best-effort

	out := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp.StatusCode, out
}

func previewTokenFromURL(t *testing.T, rawURL string) string {
	t.Helper()
	parsed, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("parse preview url %q: %v", rawURL, err)
	}
	token := strings.TrimSpace(parsed.Query().Get("preview_token"))
	if token == "" {
		t.Fatalf("expected preview_token query param in %q", rawURL)
	}
	return token
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

func projectedPageContentDataForTest(page CMSPage, existing *CMSContent) map[string]any {
	data := cloneAnyMap(existing.Data)
	maps.Copy(data, cloneAnyMap(page.Data))
	return updatePageContentData(data, page, existing)
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
	if _, updateSourceErr := fixture.content.UpdatePage(context.Background(), updatedSource); updateSourceErr != nil {
		t.Fatalf("update source page: %v", updateSourceErr)
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
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")
}
