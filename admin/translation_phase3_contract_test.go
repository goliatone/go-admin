package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestTranslationPhase3ContractFallbackContextConsistency(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_en": {
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
		list: []map[string]any{
			{
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
			{
				"id":                   "post_es",
				"title":                "Post ES",
				"status":               "draft",
				"locale":               "es",
				"translation_group_id": "tg_123",
			},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: &Panel{name: "posts", repo: repo},
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	detail, err := binding.Detail(c, "es", "post_en")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	data, _ := detail["data"].(map[string]any)
	assertFallbackContractKeys(t, data)

	siblings, ok := detail["siblings"].([]map[string]any)
	if !ok || len(siblings) == 0 {
		t.Fatalf("expected siblings payload, got %T", detail["siblings"])
	}
	for _, sibling := range siblings {
		assertFallbackContractKeys(t, sibling)
	}
}

func TestTranslationPhase3ContractBlockerMetadata(t *testing.T) {
	t.Run("required keys always present", func(t *testing.T) {
		mapped, status := mapToGoError(MissingTranslationsError{
			EntityType: "pages",
			EntityID:   "page_123",
		}, nil)
		if status != 409 {
			t.Fatalf("expected status 409, got %d", status)
		}
		if mapped == nil || mapped.TextCode != TextCodeTranslationMissing {
			t.Fatalf("expected %s mapped error, got %+v", TextCodeTranslationMissing, mapped)
		}
		if _, ok := mapped.Metadata["missing_locales"]; !ok {
			t.Fatalf("expected missing_locales key, got %+v", mapped.Metadata)
		}
		if _, ok := mapped.Metadata["transition"]; !ok {
			t.Fatalf("expected transition key, got %+v", mapped.Metadata)
		}
		if _, ok := mapped.Metadata["missing_fields_by_locale"]; ok {
			t.Fatalf("expected missing_fields_by_locale to be omitted when not enabled, got %+v", mapped.Metadata)
		}
	})

	t.Run("missing_fields_by_locale appears when enabled", func(t *testing.T) {
		mapped, status := mapToGoError(MissingTranslationsError{
			EntityType:              "pages",
			EntityID:                "page_123",
			Transition:              "publish",
			MissingLocales:          []string{"fr"},
			RequiredFieldsEvaluated: true,
			MissingFieldsByLocale:   map[string][]string{"fr": {"title"}},
		}, nil)
		if status != 422 {
			t.Fatalf("expected status 422, got %d", status)
		}
		if mapped == nil || mapped.TextCode != TextCodeTranslationMissing {
			t.Fatalf("expected %s mapped error, got %+v", TextCodeTranslationMissing, mapped)
		}
		if _, ok := mapped.Metadata["missing_fields_by_locale"]; !ok {
			t.Fatalf("expected missing_fields_by_locale key when enabled, got %+v", mapped.Metadata)
		}
	})
}

func assertFallbackContractKeys(t *testing.T, payload map[string]any) {
	t.Helper()
	for _, key := range []string{"requested_locale", "resolved_locale", "missing_requested_locale", "fallback_used"} {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected fallback contract key %q in payload %+v", key, payload)
		}
	}
}
