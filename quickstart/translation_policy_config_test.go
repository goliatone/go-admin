package quickstart

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDefaultContentTranslationPolicyConfigIsPermissiveAndAgnostic(t *testing.T) {
	cfg := DefaultContentTranslationPolicyConfig()
	if cfg.RequiredFieldsStrategy != admin.RequiredFieldsValidationError {
		t.Fatalf("expected required_fields_strategy=error, got %q", cfg.RequiredFieldsStrategy)
	}
	if len(cfg.Required) != 0 {
		t.Fatalf("expected no default required entity rules, got %+v", cfg.Required)
	}
	if len(cfg.PageEntities) != 0 {
		t.Fatalf("expected no default page_entities, got %+v", cfg.PageEntities)
	}
	if len(cfg.EntityAliases) != 0 {
		t.Fatalf("expected no default entity aliases, got %+v", cfg.EntityAliases)
	}
}

func translationPolicyValidationCatalogFixture() TranslationPolicyValidationCatalog {
	return TranslationPolicyValidationCatalog{
		Entities: map[string]TranslationPolicyEntityCatalog{
			"articles": {
				Transitions: map[string]TranslationPolicyTransitionCatalog{
					"publish": {
						RequiredFields: []string{"title", "path", "summary"},
					},
				},
			},
		},
	}
}

func TestValidateTranslationPolicyConfigUnknownKeysErrorStrategy(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"articles": {
				"publish": {
					RequiredFields: map[string][]string{"en": {"title", "unknown_field"}},
				},
				"approve": {
					Locales: []string{"en"},
				},
			},
			"widgets": {
				"publish": {Locales: []string{"en"}},
			},
		},
	}
	result, err := ValidateTranslationPolicyConfig(cfg, translationPolicyValidationCatalogFixture())
	if err == nil {
		t.Fatalf("expected validation error")
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", result.Warnings)
	}
	msg := err.Error()
	if !strings.Contains(msg, `unknown policy entity "widgets"`) {
		t.Fatalf("expected unknown entity in error, got %q", msg)
	}
	if !strings.Contains(msg, `unknown transition "approve" for entity "articles"`) {
		t.Fatalf("expected unknown transition in error, got %q", msg)
	}
	if !strings.Contains(msg, `unknown required field key "unknown_field"`) {
		t.Fatalf("expected unknown required field key in error, got %q", msg)
	}
}

func TestValidateTranslationPolicyConfigUnknownKeysWarnStrategy(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationWarn,
		Required: map[string]TranslationPolicyEntityConfig{
			"widgets": {
				"publish": {Locales: []string{"en"}},
			},
		},
	}
	result, err := ValidateTranslationPolicyConfig(cfg, translationPolicyValidationCatalogFixture())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Warnings) != 1 {
		t.Fatalf("expected one warning, got %+v", result.Warnings)
	}
	if !strings.Contains(result.Warnings[0], `unknown policy entity "widgets"`) {
		t.Fatalf("unexpected warning: %q", result.Warnings[0])
	}
}

func TestValidateTranslationPolicyConfigUnknownKeysIgnoreStrategy(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationIgnore,
		Required: map[string]TranslationPolicyEntityConfig{
			"widgets": {
				"publish": {Locales: []string{"en"}},
			},
		},
	}
	result, err := ValidateTranslationPolicyConfig(cfg, translationPolicyValidationCatalogFixture())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", result.Warnings)
	}
}

func TestNormalizeTranslationPolicyConfigNormalizesEntityAliases(t *testing.T) {
	cfg := NormalizeTranslationPolicyConfig(TranslationPolicyConfig{
		PageEntities: []string{" Landing-Pages ", "landing_pages", ""},
		EntityAliases: map[string]string{
			" Article-Type ": "News",
			"":               "posts",
			"legacy":         "",
		},
	})
	if got := strings.Join(cfg.PageEntities, ","); got != "landing_page" {
		t.Fatalf("expected normalized page_entities [landing_page], got %q", got)
	}
	if len(cfg.EntityAliases) != 1 {
		t.Fatalf("expected one normalized alias, got %+v", cfg.EntityAliases)
	}
	if got := cfg.EntityAliases["article_type"]; got != "news" {
		t.Fatalf("expected alias article_type -> news, got %q", got)
	}
}
