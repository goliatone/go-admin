package quickstart

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDefaultContentTranslationPolicyConfigIncludesPagesAndPostsPublishRules(t *testing.T) {
	cfg := DefaultContentTranslationPolicyConfig()

	pagesCfg, ok := cfg.Required["pages"]
	if !ok {
		t.Fatalf("expected pages requirements")
	}
	postsCfg, ok := cfg.Required["posts"]
	if !ok {
		t.Fatalf("expected posts requirements")
	}
	pagesPublish, ok := pagesCfg["publish"]
	if !ok {
		t.Fatalf("expected pages.publish requirements")
	}
	postsPublish, ok := postsCfg["publish"]
	if !ok {
		t.Fatalf("expected posts.publish requirements")
	}
	staging, ok := pagesPublish.Environments["staging"]
	if !ok {
		t.Fatalf("expected pages.publish.staging requirements")
	}
	production, ok := pagesPublish.Environments["production"]
	if !ok {
		t.Fatalf("expected pages.publish.production requirements")
	}
	if got := strings.Join(staging.Locales, ","); got != "en,es" {
		t.Fatalf("expected pages staging locales en,es got %q", got)
	}
	if got := strings.Join(production.Locales, ","); got != "en,es,fr" {
		t.Fatalf("expected pages production locales en,es,fr got %q", got)
	}
	if got := strings.Join(postsPublish.RequiredFields["fr"], ","); got != "title,path,excerpt" {
		t.Fatalf("expected posts fr required fields title,path,excerpt got %q", got)
	}
}

func TestValidateTranslationPolicyConfigUnknownKeysErrorStrategy(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
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
	result, err := ValidateTranslationPolicyConfig(cfg, DefaultTranslationPolicyValidationCatalog())
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
	if !strings.Contains(msg, `unknown transition "approve" for entity "pages"`) {
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
	result, err := ValidateTranslationPolicyConfig(cfg, DefaultTranslationPolicyValidationCatalog())
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
	result, err := ValidateTranslationPolicyConfig(cfg, DefaultTranslationPolicyValidationCatalog())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", result.Warnings)
	}
}
