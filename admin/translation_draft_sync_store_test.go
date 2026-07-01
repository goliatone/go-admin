package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	auth "github.com/goliatone/go-auth"
)

func TestTranslationDraftSyncStoreGetReturnsEditorSnapshot(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)
	metrics := &capturingTranslationMetrics{}
	useTranslationMetricsForTest(t, metrics)

	snapshot, err := store.Get(context.Background(), translationDraftSyncTestRef(fixture))
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if len(metrics.qaOutcomeTags) != 0 {
		t.Fatalf("expected read snapshot to avoid qa outcome metrics, got %+v", metrics.qaOutcomeTags)
	}

	if snapshot.Revision != 3 {
		t.Fatalf("revision=%d want 3", snapshot.Revision)
	}
	data := translationDraftSyncSnapshotData(t, snapshot)
	if got := toString(data["variant_id"]); got != fixture.targetVariantID {
		t.Fatalf("variant_id=%q want %q", got, fixture.targetVariantID)
	}
	fields := mapString(mustAs[map[string]any](data["target_fields"]))
	if got := fields["title"]; got != "Guide de traduction" {
		t.Fatalf("target title=%q", got)
	}
	if got := toString(snapshot.Metadata["channel"]); got != "production" {
		t.Fatalf("metadata channel=%q want production", got)
	}
}

func TestTranslationDraftSyncStoreMutateAppliesConsecutiveAutosavesAndReturnsStaleRevision(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)
	ref := translationDraftSyncTestRef(fixture)
	metrics := &capturingTranslationMetrics{}
	useTranslationMetricsForTest(t, metrics)

	first := storeMutation(t, store, ref, 3, map[string]any{
		"fields": map[string]any{
			"title": "Guide de publication",
		},
		"autosave": true,
	})
	if first.Revision != 4 {
		t.Fatalf("first revision=%d want 4", first.Revision)
	}
	firstData := translationDraftSyncSnapshotData(t, first)
	firstFields := mapString(mustAs[map[string]any](firstData["target_fields"]))
	if got := firstFields["title"]; got != "Guide de publication" {
		t.Fatalf("first title=%q", got)
	}
	if len(metrics.qaOutcomeTags) != 1 || metrics.qaOutcomeTags[0]["trigger"] != translationDraftSyncTriggerSave {
		t.Fatalf("expected one save qa outcome metric after first mutate, got %+v", metrics.qaOutcomeTags)
	}

	second := storeMutation(t, store, ref, 4, map[string]any{
		"fields": map[string]any{
			"body": "Deuxieme autosave.",
		},
		"metadata": map[string]any{
			"autosave": true,
		},
	})
	if second.Revision != 5 {
		t.Fatalf("second revision=%d want 5", second.Revision)
	}
	secondData := translationDraftSyncSnapshotData(t, second)
	secondFields := mapString(mustAs[map[string]any](secondData["target_fields"]))
	if got := secondFields["title"]; got != "Guide de publication" {
		t.Fatalf("second title=%q", got)
	}
	if got := secondFields["body"]; got != "Deuxieme autosave." {
		t.Fatalf("second body=%q", got)
	}
	if len(metrics.qaOutcomeTags) != 2 || metrics.qaOutcomeTags[1]["trigger"] != translationDraftSyncTriggerSave {
		t.Fatalf("expected second save qa outcome metric after second mutate, got %+v", metrics.qaOutcomeTags)
	}

	_, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef:      ref,
		Operation:        translationDraftSyncOperation,
		Payload:          mustJSONBytes(t, map[string]any{"fields": map[string]any{"path": "/fr/stale"}}),
		ExpectedRevision: 3,
		ActorID:          "translator-1",
	})
	if err == nil {
		t.Fatal("expected stale revision error")
	}
	if code, ok := synccore.ErrorCodeOf(err); !ok || code != synccore.CodeStaleRevision {
		t.Fatalf("expected STALE_REVISION, got code=%q err=%v", code, err)
	}
	current, latest, ok := synccore.StaleRevisionDetails(err)
	if !ok || current != 5 || latest == nil || latest.Revision != 5 {
		t.Fatalf("unexpected stale details current=%d latest=%+v ok=%v", current, latest, ok)
	}
	if len(metrics.qaOutcomeTags) != 2 {
		t.Fatalf("expected stale snapshot to avoid qa outcome metrics, got %+v", metrics.qaOutcomeTags)
	}
}

func TestTranslationDraftSyncStoreRejectsClientIdentityFields(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)

	_, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef: translationDraftSyncTestRef(fixture),
		Operation:   translationDraftSyncOperation,
		Payload: mustJSONBytes(t, map[string]any{
			"fields": map[string]any{
				"title": "Tentative interdite",
			},
			"scope": map[string]any{
				"tenant_id": "tenant-evil",
			},
		}),
		ExpectedRevision: 3,
		ActorID:          "translator-1",
	})
	if err == nil {
		t.Fatal("expected invalid mutation error")
	}
	if code, ok := synccore.ErrorCodeOf(err); !ok || code != synccore.CodeInvalidMutation {
		t.Fatalf("expected INVALID_MUTATION, got code=%q err=%v", code, err)
	}
}

func TestTranslationDraftSyncRouteReadMutateAndStaleRevision(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	target := "/admin/api/translations/sync/resources/translation_variant_draft/" + fixture.targetVariantID + "?channel=production&tenant_id=tenant-1&org_id=org-1"

	status, payload := doTranslationDraftSyncJSONRequest(t, fixture.app, http.MethodGet, target, nil)
	if status != http.StatusOK {
		t.Fatalf("read status=%d payload=%+v", status, payload)
	}
	if got := translationDraftSyncJSONInt64(t, payload, "revision"); got != 3 {
		t.Fatalf("read revision=%d want 3", got)
	}
	readData := extractMap(payload["data"])
	if got := toString(readData["variant_id"]); got != fixture.targetVariantID {
		t.Fatalf("read variant_id=%q want %q", got, fixture.targetVariantID)
	}

	status, payload = doTranslationDraftSyncJSONRequest(t, fixture.app, http.MethodPatch, target, map[string]any{
		"operation":         "autosave",
		"expected_revision": 3,
		"payload": map[string]any{
			"fields": map[string]any{
				"title": "Guide de publication",
			},
			"autosave": true,
		},
		"metadata": map[string]any{
			"autosave": true,
		},
	})
	if status != http.StatusOK {
		t.Fatalf("mutate status=%d payload=%+v", status, payload)
	}
	if got := translationDraftSyncJSONInt64(t, payload, "revision"); got != 4 {
		t.Fatalf("mutate revision=%d want 4", got)
	}
	if got := payload["applied"]; got != true {
		t.Fatalf("mutate applied=%v want true", got)
	}
	mutateData := extractMap(payload["data"])
	fields := mapString(extractMap(mutateData["target_fields"]))
	if got := fields["title"]; got != "Guide de publication" {
		t.Fatalf("mutate title=%q", got)
	}

	status, payload = doTranslationDraftSyncJSONRequest(t, fixture.app, http.MethodPatch, target, map[string]any{
		"operation":         "autosave",
		"expected_revision": 3,
		"payload": map[string]any{
			"fields": map[string]any{
				"path": "/fr/stale",
			},
		},
	})
	if status != http.StatusConflict {
		t.Fatalf("stale status=%d payload=%+v", status, payload)
	}
	errorPayload := extractMap(payload["error"])
	if got := toString(errorPayload["code"]); got != string(synccore.CodeStaleRevision) {
		t.Fatalf("stale code=%q", got)
	}
	details := extractMap(errorPayload["details"])
	if got := translationDraftSyncJSONInt64(t, details, "current_revision"); got != 4 {
		t.Fatalf("stale current_revision=%d want 4", got)
	}
	resource := extractMap(details["resource"])
	if got := translationDraftSyncJSONInt64(t, resource, "revision"); got != 4 {
		t.Fatalf("stale resource revision=%d want 4", got)
	}
}

func TestTranslationDraftSyncRouteMutatesContentBackedVariant(t *testing.T) {
	ctx := context.Background()
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	sourceFields := map[string]string{
		"title": "Content source",
		"path":  "content-source",
		"body":  "Content source body.",
	}
	targetFields := map[string]string{
		"title": "Contenu source",
		"path":  "contenu-source",
		"body":  "Corps traduit.",
	}
	lastSyncedHash := translationEditorHashFields(sourceFields)
	now := time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC)

	if _, err := fixture.content.CreateContent(ctx, CMSContent{
		ID:              "content-1",
		Title:           sourceFields["title"],
		Slug:            sourceFields["path"],
		Locale:          "en",
		FamilyID:        "content-family-1",
		ContentType:     "article",
		ContentTypeSlug: "article",
		Status:          "published",
		Data: map[string]any{
			"body": sourceFields["body"],
		},
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	}); err != nil {
		t.Fatalf("seed source content: %v", err)
	}
	if _, err := fixture.content.CreateContent(ctx, CMSContent{
		ID:              "content-1-fr",
		Title:           targetFields["title"],
		Slug:            targetFields["path"],
		Locale:          "fr",
		FamilyID:        "content-family-1",
		ContentType:     "article",
		ContentTypeSlug: "article",
		Status:          "published",
		Data: map[string]any{
			"body": targetFields["body"],
		},
		Metadata: translationEditorMergeMetadata(map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		}, nil, 3, lastSyncedHash, sourceFields, "translator-1", now, translationEditorNextEditableVariantStatus()),
	}); err != nil {
		t.Fatalf("seed target content: %v", err)
	}
	if _, err := fixture.repo.Create(ctx, TranslationAssignment{
		ID:             "asg-content-1",
		FamilyID:       "content-family-1",
		EntityType:     "article",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		SourceRecordID: "content-1",
		SourceLocale:   "en",
		TargetLocale:   "fr",
		TargetRecordID: "content-1-fr",
		SourceTitle:    sourceFields["title"],
		SourcePath:     "/" + sourceFields["path"],
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusAssigned,
		Priority:       PriorityHigh,
		AssigneeID:     "translator-1",
		Version:        2,
	}); err != nil {
		t.Fatalf("seed content assignment: %v", err)
	}
	syncTranslationFamilyFixtureStore(t, fixture.admin, "production")
	family, ok, err := fixture.admin.translationFamilyStore.Family(ctx, "content-family-1")
	if err != nil || !ok {
		t.Fatalf("load content family ok=%v err=%v", ok, err)
	}
	variant, ok := translationFamilyVariantByLocale(family, "fr")
	if !ok {
		t.Fatalf("expected fr content variant: %+v", family.Variants)
	}

	target := "/admin/api/translations/sync/resources/translation_variant_draft/" + variant.ID + "?channel=production&tenant_id=tenant-1&org_id=org-1"
	status, payload := doTranslationDraftSyncJSONRequest(t, fixture.app, http.MethodPatch, target, map[string]any{
		"operation":         "autosave",
		"expected_revision": 3,
		"payload": map[string]any{
			"fields": map[string]any{
				"body": "Corps traduit mis a jour.",
			},
			"autosave": true,
		},
		"metadata": map[string]any{
			"autosave": true,
		},
	})
	if status != http.StatusOK {
		t.Fatalf("content mutate status=%d payload=%+v", status, payload)
	}
	if got := translationDraftSyncJSONInt64(t, payload, "revision"); got != 4 {
		t.Fatalf("content revision=%d want 4", got)
	}
	data := extractMap(payload["data"])
	fields := mapString(extractMap(data["target_fields"]))
	if got := fields["body"]; got != "Corps traduit mis a jour." {
		t.Fatalf("snapshot body=%q", got)
	}

	persisted, err := fixture.content.Content(ctx, "content-1-fr", "")
	if err != nil || persisted == nil {
		t.Fatalf("load persisted content: %v", err)
	}
	if got := toString(persisted.Data["body"]); got != "Corps traduit mis a jour." {
		t.Fatalf("persisted body=%q", got)
	}
	if got := persisted.Status; got != "draft" {
		t.Fatalf("persisted status=%q want draft", got)
	}
}

func translationDraftSyncTestRef(fixture translationEditorTestFixture) synccore.ResourceRef {
	return synccore.ResourceRef{
		Kind: translationDraftSyncResourceKind,
		ID:   fixture.targetVariantID,
		Scope: map[string]string{
			ScopeTenantIDKey: "tenant-1",
			ScopeOrgIDKey:    "org-1",
			"channel":        "production",
		},
	}
}

func storeMutation(t *testing.T, store *translationDraftSyncResourceStore, ref synccore.ResourceRef, revision int64, payload map[string]any) synccore.Snapshot {
	t.Helper()
	snapshot, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef:      ref,
		Operation:        translationDraftSyncOperation,
		Payload:          mustJSONBytes(t, payload),
		ExpectedRevision: revision,
		ActorID:          "translator-1",
	})
	if err != nil {
		t.Fatalf("Mutate: %v", err)
	}
	return snapshot
}

func translationDraftSyncSnapshotData(t *testing.T, snapshot synccore.Snapshot) map[string]any {
	t.Helper()
	var data map[string]any
	if err := json.Unmarshal(snapshot.Data, &data); err != nil {
		t.Fatalf("decode snapshot data: %v", err)
	}
	return data
}

func translationDraftSyncJSONInt64(t *testing.T, payload map[string]any, key string) int64 {
	t.Helper()
	value, ok := payload[key].(float64)
	if !ok {
		t.Fatalf("expected %s to decode as float64, got %T (%v)", key, payload[key], payload[key])
	}
	return int64(value)
}

func mustJSONBytes(t *testing.T, payload map[string]any) []byte {
	t.Helper()
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return encoded
}

func doTranslationDraftSyncJSONRequest(t *testing.T, app interface {
	Test(*http.Request, ...int) (*http.Response, error)
}, method, target string, body map[string]any) (int, map[string]any) {
	t.Helper()
	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatalf("encode request body: %v", err)
		}
	}
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID:        "translator-1",
		Subject:        "translator-1",
		TenantID:       "tenant-1",
		OrganizationID: "org-1",
	})
	req := httptest.NewRequestWithContext(ctx, method, target, &payload)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-Authenticated-Actor-ID", "translator-1")
	req.Header.Set("X-User-ID", "spoofed-user")
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
