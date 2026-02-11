package admin

import (
	"context"
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
