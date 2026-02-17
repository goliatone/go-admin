package admin

import (
	"context"
	"fmt"
	"testing"
)

type readinessPolicyStub struct {
	req TranslationRequirements
	ok  bool
	err error
}

func (s readinessPolicyStub) Validate(context.Context, TranslationPolicyInput) error {
	return nil
}

func (s readinessPolicyStub) Requirements(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
	return s.req, s.ok, s.err
}

type readinessPolicyCounterStub struct {
	calls []string
}

func (s *readinessPolicyCounterStub) Validate(context.Context, TranslationPolicyInput) error {
	return nil
}

func (s *readinessPolicyCounterStub) Requirements(_ context.Context, input TranslationPolicyInput) (TranslationRequirements, bool, error) {
	key := fmt.Sprintf("%s|%s|%s|%s", input.EntityType, input.PolicyEntity, input.Transition, input.Environment)
	s.calls = append(s.calls, key)
	return TranslationRequirements{Locales: []string{"en", "fr"}}, true, nil
}

func TestBuildRecordTranslationReadinessMissingLocales(t *testing.T) {
	record := map[string]any{
		"id":                   "page_1",
		"locale":               "en",
		"translation_group_id": "tg_1",
		"available_locales":    []string{"en", "es"},
		"title":                "Home",
		"path":                 "/home",
	}
	policy := readinessPolicyStub{
		ok: true,
		req: TranslationRequirements{
			Locales: []string{"en", "es", "fr"},
			RequiredFields: map[string][]string{
				"en": {"title", "path"},
				"es": {"title", "path"},
				"fr": {"title", "path"},
			},
		},
	}

	readiness := buildRecordTranslationReadiness(context.Background(), policy, "pages", record, map[string]any{"environment": "production"})
	if readiness == nil {
		t.Fatalf("expected readiness payload")
	}
	if state := toString(readiness["readiness_state"]); state != translationReadinessStateMissingLocales {
		t.Fatalf("expected readiness state %q, got %q", translationReadinessStateMissingLocales, state)
	}
	missing := toStringSlice(readiness["missing_required_locales"])
	if len(missing) != 1 || missing[0] != "fr" {
		t.Fatalf("expected missing locales [fr], got %v", missing)
	}
	readyFor, _ := readiness["ready_for_transition"].(map[string]bool)
	if readyFor[translationReadinessTransitionPublish] {
		t.Fatalf("expected publish readiness false when locales missing")
	}
	if env := toString(readiness["evaluated_environment"]); env != "production" {
		t.Fatalf("expected evaluated_environment production, got %q", env)
	}
}

func TestBuildRecordTranslationReadinessMissingFields(t *testing.T) {
	record := map[string]any{
		"id":                   "page_1",
		"locale":               "en",
		"translation_group_id": "tg_1",
		"available_locales":    []string{"en"},
		"title":                "Home",
	}
	policy := readinessPolicyStub{
		ok: true,
		req: TranslationRequirements{
			Locales: []string{"en"},
			RequiredFields: map[string][]string{
				"en": {"title", "path"},
			},
		},
	}

	readiness := buildRecordTranslationReadiness(context.Background(), policy, "pages", record, nil)
	if readiness == nil {
		t.Fatalf("expected readiness payload")
	}
	if state := toString(readiness["readiness_state"]); state != translationReadinessStateMissingFields {
		t.Fatalf("expected readiness state %q, got %q", translationReadinessStateMissingFields, state)
	}
	missingFields, _ := readiness["missing_required_fields_by_locale"].(map[string][]string)
	fields := missingFields["en"]
	if len(fields) != 1 || fields[0] != "path" {
		t.Fatalf("expected missing fields [path], got %v", fields)
	}
}

func TestBuildRecordTranslationReadinessCacheMemoizesByEntityAndEnvironment(t *testing.T) {
	record := map[string]any{
		"id":                   "post_1",
		"locale":               "en",
		"translation_group_id": "tg_1",
		"available_locales":    []string{"en"},
	}
	cache := &translationReadinessRequirementsCache{}
	policy := &readinessPolicyCounterStub{}

	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", record, map[string]any{"environment": "production"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                   "post_2",
		"locale":               "en",
		"translation_group_id": "tg_2",
		"available_locales":    []string{"en"},
	}, map[string]any{"environment": "production"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                   "post_3",
		"locale":               "en",
		"translation_group_id": "tg_3",
		"available_locales":    []string{"en"},
	}, map[string]any{"environment": "staging"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                   "post_4",
		"locale":               "en",
		"policy_entity":        "news",
		"translation_group_id": "tg_4",
		"available_locales":    []string{"en"},
	}, map[string]any{"environment": "production"}, cache)

	if got := len(policy.calls); got != 3 {
		t.Fatalf("expected 3 requirements resolutions, got %d (%v)", got, policy.calls)
	}
}

func TestTranslationReadinessBatchAvailableLocalesAggregatesByGroup(t *testing.T) {
	grouped := translationReadinessBatchAvailableLocales([]map[string]any{
		{
			"id":                   "post_1",
			"locale":               "en",
			"translation_group_id": "tg_shared",
			"available_locales":    []string{"en"},
		},
		{
			"id":                   "post_2",
			"locale":               "fr",
			"translation_group_id": "tg_shared",
			"available_locales":    []string{"fr"},
		},
		{
			"id":                "post_3",
			"locale":            "es",
			"available_locales": []string{"es"},
		},
	})

	locales := grouped["tg_shared"]
	if len(locales) != 2 || locales[0] != "en" || locales[1] != "fr" {
		t.Fatalf("expected grouped locales [en fr], got %v", locales)
	}
	if _, exists := grouped[""]; exists {
		t.Fatalf("did not expect anonymous group aggregation, got %v", grouped[""])
	}
}

func TestBuildRecordTranslationReadinessIncludesLocaleMetadata(t *testing.T) {
	record := map[string]any{
		"id":                   "page_1",
		"locale":               "en",
		"translation_group_id": "tg_1",
		"available_locales":    []string{"en", "fr"},
		"title":                "Home",
		"path":                 "/home",
		"updated_by":           "alice",
		"updated_at":           "2026-02-17T10:00:00Z",
		"locale_metadata": map[string]any{
			"fr": map[string]any{
				"updated_by": "jean",
				"updated_at": "2026-02-16T08:00:00Z",
			},
		},
	}
	policy := readinessPolicyStub{
		ok: true,
		req: TranslationRequirements{
			Locales: []string{"en", "fr"},
		},
	}

	readiness := buildRecordTranslationReadiness(context.Background(), policy, "pages", record, nil)
	localeMetadata, ok := readiness["locale_metadata"].(map[string]map[string]any)
	if !ok {
		t.Fatalf("expected locale_metadata map, got %#v", readiness["locale_metadata"])
	}
	enMeta := localeMetadata["en"]
	if toString(enMeta["updated_by"]) != "alice" {
		t.Fatalf("expected en.updated_by alice, got %#v", enMeta["updated_by"])
	}
	if toString(enMeta["updated_at"]) != "2026-02-17T10:00:00Z" {
		t.Fatalf("expected en.updated_at timestamp, got %#v", enMeta["updated_at"])
	}
	frMeta := localeMetadata["fr"]
	if toString(frMeta["updated_by"]) != "jean" {
		t.Fatalf("expected fr.updated_by jean, got %#v", frMeta["updated_by"])
	}
}
