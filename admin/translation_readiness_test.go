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
		"id":                       "page_1",
		"locale":                   "en",
		"family_id":                "tg_1",
		"available_locales":        []string{"en", "es"},
		"requested_locale":         "fr",
		"missing_requested_locale": true,
		"title":                    "Home",
		"path":                     "/home",
	}
	policy := readinessPolicyStub{
		ok: true,
		req: TranslationRequirements{
			Locales:          []string{"en", "es", "fr"},
			DefaultWorkScope: "localization",
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
	quickCreate, _ := readiness["quick_create"].(map[string]any)
	if quickCreate == nil {
		t.Fatalf("expected quick_create payload")
	}
	if recommended := toString(quickCreate["recommended_locale"]); recommended != "fr" {
		t.Fatalf("expected recommended_locale fr, got %q", recommended)
	}
	if required := toStringSlice(quickCreate["required_for_publish"]); len(required) != 3 || required[2] != "fr" {
		t.Fatalf("expected required_for_publish [en es fr], got %v", required)
	}
	defaultAssignment, _ := quickCreate["default_assignment"].(map[string]any)
	if got := toString(defaultAssignment["work_scope"]); got != "localization" {
		t.Fatalf("expected default assignment work_scope localization, got %q", got)
	}
}

func TestBuildRecordTranslationReadinessMissingFields(t *testing.T) {
	record := map[string]any{
		"id":                "page_1",
		"locale":            "en",
		"family_id":         "tg_1",
		"available_locales": []string{"en"},
		"title":             "Home",
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

func TestBuildRecordTranslationReadinessDefaultsWorkScopeWhenPolicyOmitsIt(t *testing.T) {
	record := map[string]any{
		"id":                "page_1",
		"locale":            "en",
		"family_id":         "tg_1",
		"available_locales": []string{"en"},
	}
	policy := readinessPolicyStub{
		ok: true,
		req: TranslationRequirements{
			Locales: []string{"en", "fr"},
		},
	}

	readiness := buildRecordTranslationReadiness(context.Background(), policy, "pages", record, nil)
	quickCreate, _ := readiness["quick_create"].(map[string]any)
	defaultAssignment, _ := quickCreate["default_assignment"].(map[string]any)
	if got := toString(defaultAssignment["work_scope"]); got != "__all__" {
		t.Fatalf("expected default assignment work_scope __all__, got %q", got)
	}
}

func TestBuildRecordTranslationReadinessDisablesQuickCreateWhenPolicyIsUnresolved(t *testing.T) {
	record := map[string]any{
		"id":                       "page_1",
		"locale":                   "en",
		"family_id":                "tg_1",
		"available_locales":        []string{"en"},
		"requested_locale":         "fr",
		"missing_requested_locale": true,
	}
	policy := readinessPolicyStub{ok: false}

	readiness := buildRecordTranslationReadiness(context.Background(), policy, "pages", record, nil)
	if readiness == nil {
		t.Fatalf("expected readiness payload")
	}
	quickCreate, _ := readiness["quick_create"].(map[string]any)
	if quickCreate == nil {
		t.Fatalf("expected quick_create payload")
	}
	if enabled, _ := quickCreate["enabled"].(bool); enabled {
		t.Fatalf("expected quick_create to be disabled when policy is unresolved")
	}
	if got := toString(quickCreate["disabled_reason_code"]); got != "policy_denied" {
		t.Fatalf("expected policy_denied quick_create code, got %q", got)
	}
	if got := toString(quickCreate["recommended_locale"]); got != "fr" {
		t.Fatalf("expected requested locale to remain the recommendation, got %q", got)
	}
}

func TestBuildRecordTranslationReadinessCacheMemoizesByEntityAndEnvironment(t *testing.T) {
	record := map[string]any{
		"id":                "post_1",
		"locale":            "en",
		"family_id":         "tg_1",
		"available_locales": []string{"en"},
	}
	cache := &translationReadinessRequirementsCache{}
	policy := &readinessPolicyCounterStub{}

	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", record, map[string]any{"environment": "production"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                "post_2",
		"locale":            "en",
		"family_id":         "tg_2",
		"available_locales": []string{"en"},
	}, map[string]any{"environment": "production"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                "post_3",
		"locale":            "en",
		"family_id":         "tg_3",
		"available_locales": []string{"en"},
	}, map[string]any{"environment": "staging"}, cache)
	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                "post_4",
		"locale":            "en",
		"policy_entity":     "news",
		"family_id":         "tg_4",
		"available_locales": []string{"en"},
	}, map[string]any{"environment": "production"}, cache)

	if got := len(policy.calls); got != 3 {
		t.Fatalf("expected 3 requirements resolutions, got %d (%v)", got, policy.calls)
	}
}

func TestBuildRecordTranslationReadinessCacheNormalizesPolicyEntityAliases(t *testing.T) {
	cache := &translationReadinessRequirementsCache{}
	policy := &readinessPolicyCounterStub{}

	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                "post_1",
		"locale":            "en",
		"policy_entity":     "post",
		"family_id":         "tg_1",
		"available_locales": []string{"en"},
	}, map[string]any{"environment": "production"}, cache)

	_ = buildRecordTranslationReadinessWithCache(context.Background(), policy, "posts", map[string]any{
		"id":                "post_2",
		"locale":            "fr",
		"policy_entity":     "posts",
		"family_id":         "tg_2",
		"available_locales": []string{"fr"},
	}, map[string]any{"environment": "production"}, cache)

	if got := len(policy.calls); got != 1 {
		t.Fatalf("expected one requirements resolution for post/posts aliases, got %d (%v)", got, policy.calls)
	}
}

func TestTranslationReadinessBatchAvailableLocalesAggregatesByGroup(t *testing.T) {
	grouped := translationReadinessBatchAvailableLocales([]map[string]any{
		{
			"id":                "post_1",
			"locale":            "en",
			"family_id":         "tg_shared",
			"available_locales": []string{"en"},
		},
		{
			"id":                "post_2",
			"locale":            "fr",
			"family_id":         "tg_shared",
			"available_locales": []string{"fr"},
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
		"id":                "page_1",
		"locale":            "en",
		"family_id":         "tg_1",
		"available_locales": []string{"en", "fr"},
		"title":             "Home",
		"path":              "/home",
		"updated_by":        "alice",
		"updated_at":        "2026-02-17T10:00:00Z",
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
