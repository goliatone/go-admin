package quickstart

import (
	"net/http"
	"net/url"
	"testing"

	goerrors "github.com/goliatone/go-errors"
	"github.com/stretchr/testify/mock"
)

func TestContentEntryApplyUpdateIntentEditsAddsAndReordersRowsByIdentity(t *testing.T) {
	schema := teachingTopicsUpdateIntentSchema("preserve")
	record := map[string]any{
		"title":   "Teaching topics",
		"enabled": false,
		"tags":    []any{"cms", "topics"},
		"metadata": map[string]any{
			"audience": "editors",
		},
		"columns": []any{
			map[string]any{
				"title":              "Column 1",
				"entries__present":   "true",
				"entries__complete":  "true",
				"entries__clear":     "false",
				"unrelated__present": "kept",
				"entries": []any{
					map[string]any{"topic_id": "topic-2", "label": "Topic 2 renamed"},
					map[string]any{"topic_id": "topic-1"},
					map[string]any{"topic_id": "topic-3", "label": "Topic 3"},
				},
			},
		},
	}
	existing := map[string]any{
		"title":   "Teaching topics",
		"enabled": true,
		"columns": []any{
			map[string]any{
				"title": "Column 1",
				"entries": []any{
					map[string]any{"topic_id": "topic-1", "label": "Topic 1", "weight": 1},
					map[string]any{"topic_id": "topic-2", "label": "Topic 2", "weight": 2},
				},
			},
		},
	}

	patched, err := contentEntryApplyUpdateIntent(record, existing, schema, nil, nil, ContentEntryUpdateIntentPolicy{})
	if err != nil {
		t.Fatalf("apply update intent: %v", err)
	}

	if got := patched["enabled"]; got != false {
		t.Fatalf("expected unrelated boolean to remain parsed false, got %#v", got)
	}
	if got := patched["tags"]; len(requireTestValue[[]any](t, got, "patched tags")) != 2 {
		t.Fatalf("expected unrelated scalar array to remain, got %#v", got)
	}
	column := requireMapItem(t, requireRecordSlice(t, patched, "columns"), 0)
	if _, exists := column["entries__present"]; exists {
		t.Fatalf("did not expect array marker to persist: %#v", column)
	}
	entries := requireRecordSlice(t, column, "entries")
	if len(entries) != 3 {
		t.Fatalf("expected three entries after add, got %#v", entries)
	}
	first := requireMapItem(t, entries, 0)
	if first["topic_id"] != "topic-2" || first["label"] != "Topic 2 renamed" || first["weight"] != 2 {
		t.Fatalf("expected reordered edited topic-2 with preserved weight, got %#v", first)
	}
	second := requireMapItem(t, entries, 1)
	if second["topic_id"] != "topic-1" || second["label"] != "Topic 1" || second["weight"] != 1 {
		t.Fatalf("expected reordered topic-1 with preserved fields, got %#v", second)
	}
	third := requireMapItem(t, entries, 2)
	if third["topic_id"] != "topic-3" || third["label"] != "Topic 3" {
		t.Fatalf("expected added topic-3, got %#v", third)
	}
}

func TestContentEntryApplyUpdateIntentRejectsDuplicateSubmittedIdentity(t *testing.T) {
	schema := teachingTopicsUpdateIntentSchema("")
	record := map[string]any{
		"columns": []any{
			map[string]any{
				"entries__present":  "true",
				"entries__complete": "true",
				"entries": []any{
					map[string]any{"topic_id": "topic-1"},
					map[string]any{"topic_id": "topic-1"},
				},
			},
		},
	}
	existing := map[string]any{
		"columns": []any{
			map[string]any{
				"entries": []any{
					map[string]any{"topic_id": "topic-1"},
				},
			},
		},
	}

	if _, err := contentEntryApplyUpdateIntent(record, existing, schema, nil, nil, ContentEntryUpdateIntentPolicy{}); err == nil {
		t.Fatalf("expected duplicate submitted identity to fail")
	}
}

func TestUpdateForPanelUpdateIntentRejectsJSONRequests(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	ctx := teachingTopicsUpdateContext(created, nil)
	ctx.HeadersM["Content-Type"] = "application/json"
	ctx.On("Body").Return([]byte(`{"title":"JSON update"}`))

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	err := h.updateForPanel(ctx, "")
	if err == nil {
		t.Fatalf("expected JSON update to fail for update-intent content type")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if typedErr.Code != http.StatusBadRequest || typedErr.TextCode != "INVALID_FORM" {
		t.Fatalf("expected invalid form bad request, got code=%d text=%q", typedErr.Code, typedErr.TextCode)
	}
}

func TestUpdateForPanelWithoutUpdateIntentKeepsJSONRequestBehavior(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	repo.Admin = newContentEntryAdminFixture(t).Admin
	if _, err := repo.Admin.RegisterPanel("teaching-topics-menu", newInMemoryPanelBuilder().
		WithRepository(repo.PanelRepo).
		FormSchema(map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title": map[string]any{"type": "string"},
			},
		})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	ctx := teachingTopicsUpdateContext(created, nil)
	ctx.HeadersM["Content-Type"] = "application/json"
	ctx.On("Body").Return([]byte(`{"title":"JSON update"}`))
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	if err := h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}
	updated := mustGetTeachingTopicsRecord(t, repo.PanelRepo, created)
	if got := updated["title"]; got != "JSON update" {
		t.Fatalf("expected JSON update to keep existing behavior, got %#v", updated)
	}
}

func TestUpdateForPanelUpdateIntentPreservesUnrelatedParsedFields(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	ctx := teachingTopicsUpdateContext(created, url.Values{
		"title":            []string{"Teaching topics"},
		"featured":         []string{"on"},
		"tags[]":           []string{"cms", "topics"},
		"metadata.summary": []string{"Curated topics"},
		"columns[0].title": []string{"Column 1"},
	})
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	if err := h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated := mustGetTeachingTopicsRecord(t, repo.PanelRepo, created)
	if got := updated["featured"]; got != true {
		t.Fatalf("expected unrelated scalar field to persist, got %#v", got)
	}
	if got := updated["tags"]; len(requireTestValue[[]any](t, got, "updated tags")) != 2 {
		t.Fatalf("expected unrelated array field to persist, got %#v", got)
	}
	metadata := requireTestValue[map[string]any](t, updated["metadata"], "updated metadata")
	if got := metadata["summary"]; got != "Curated topics" {
		t.Fatalf("expected unrelated object field to persist, got %#v", metadata)
	}
}

func TestContentEntryApplyUpdateIntentUsesProgrammaticPolicy(t *testing.T) {
	policy := ContentEntryUpdateIntentPolicy{Arrays: map[string]ContentEntryUpdateIntentArrayPolicy{
		"items": {
			Identity:           []string{"slug"},
			Ambiguous:          ContentEntryUpdateIntentPreserve,
			AllowIndexFallback: true,
		},
	}}
	record := map[string]any{
		"items": []any{
			map[string]any{"slug": "two", "title": "Two edited"},
		},
	}
	existing := map[string]any{
		"items": []any{
			map[string]any{"slug": "one", "title": "One"},
			map[string]any{"slug": "two", "title": "Two"},
		},
	}

	patched, err := contentEntryApplyUpdateIntent(record, existing, nil, nil, nil, policy)
	if err != nil {
		t.Fatalf("apply update intent: %v", err)
	}
	items := requireRecordSlice(t, patched, "items")
	if len(items) != 2 {
		t.Fatalf("expected edited row plus preserved omission, got %#v", items)
	}
	if got := requireMapItem(t, items, 0)["title"]; got != "Two edited" {
		t.Fatalf("expected first row edited, got %#v", items)
	}
	if got := requireMapItem(t, items, 1)["title"]; got != "One" {
		t.Fatalf("expected omitted row preserved, got %#v", items)
	}
}
