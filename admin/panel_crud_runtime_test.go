package admin

import (
	"context"
	"testing"
)

func TestPanelUpdateBlockedTranslationRecordsActivity(t *testing.T) {
	sink := &recordingSink{}
	panel := &Panel{
		name:       "articles",
		repo:       NewMemoryRepository(),
		authorizer: allowAll{},
		activity:   sink,
		permissions: PanelPermissions{
			Edit: "articles.edit",
		},
		hooks: PanelHooks{
			BeforeUpdateWithID: func(_ AdminContext, _ string, _ map[string]any) error {
				return MissingTranslationsError{MissingLocales: []string{"fr", "es"}}
			},
		},
	}

	_, err := panel.Update(AdminContext{
		Context: WithLocale(context.Background(), "de"),
		UserID:  "user-42",
	}, "article-1", map[string]any{
		"transition": "publish",
		"locale":     "it",
	})
	if err == nil {
		t.Fatalf("expected update to fail with missing translations")
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one blocked translation activity entry, got %d", len(sink.entries))
	}
	entry := sink.entries[0]
	if entry.Action != "panel.transition.blocked" {
		t.Fatalf("expected blocked transition action, got %q", entry.Action)
	}
	if entry.Actor != "user-42" {
		t.Fatalf("expected actor user-42, got %q", entry.Actor)
	}
	if got := entry.Metadata["panel"]; got != "articles" {
		t.Fatalf("expected panel metadata, got %v", got)
	}
	if got := entry.Metadata["entity_id"]; got != "article-1" {
		t.Fatalf("expected entity id metadata, got %v", got)
	}
	if got := entry.Metadata["locale"]; got != "it" {
		t.Fatalf("expected requested locale metadata, got %v", got)
	}
}
