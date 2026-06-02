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

func TestValidateTranslationPolicyConfigWorkflowSettings(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"articles": {
				"publish": {
					Locales:                 []string{"en"},
					AssignmentLifecycleMode: "invalid_mode",
					DefaultWorkScope:        "bad scope!",
				},
			},
		},
	}
	_, err := ValidateTranslationPolicyConfig(cfg, translationPolicyValidationCatalogFixture())
	if err == nil {
		t.Fatalf("expected validation error")
	}
	msg := err.Error()
	if !strings.Contains(msg, `invalid assignment lifecycle mode "invalid_mode"`) {
		t.Fatalf("expected lifecycle mode validation error, got %q", msg)
	}
	if !strings.Contains(msg, `invalid default work scope "bad scope!"`) {
		t.Fatalf("expected work scope validation error, got %q", msg)
	}
}

func TestNormalizeTranslationPolicyConfigWorkflowSettings(t *testing.T) {
	cfg := NormalizeTranslationPolicyConfig(TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"articles": {
				"publish": {
					AssignmentLifecycleMode: " auto_archive ",
					DefaultWorkScope:        " editorial.review ",
					Environments: map[string]TranslationCriteria{
						"staging": {
							AssignmentLifecycleMode: " single_active_per_locale ",
							DefaultWorkScope:        " qa_signoff ",
						},
					},
				},
			},
		},
	})
	publish := cfg.Required["articles"]["publish"]
	if publish.AssignmentLifecycleMode != "auto_archive" {
		t.Fatalf("expected auto_archive, got %q", publish.AssignmentLifecycleMode)
	}
	if publish.DefaultWorkScope != "editorial.review" {
		t.Fatalf("expected normalized work scope editorial.review, got %q", publish.DefaultWorkScope)
	}
	if got := publish.Environments["staging"].AssignmentLifecycleMode; got != "single_active_per_locale" {
		t.Fatalf("expected single_active_per_locale, got %q", got)
	}
	if got := publish.Environments["staging"].DefaultWorkScope; got != "qa_signoff" {
		t.Fatalf("expected qa_signoff, got %q", got)
	}
}

func TestValidateTranslationPolicyCoverageExactMatches(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {"publish": {Locales: []string{"en"}}},
			"posts": {"publish": {Locales: []string{"en"}}},
			"news":  {"publish": {Locales: []string{"en"}}},
		},
	}
	result, err := ValidateTranslationPolicyCoverage(cfg, []string{"pages", "posts", "news"})
	if err != nil {
		t.Fatalf("expected coverage validation to pass: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", result.Warnings)
	}
}

func TestValidateTranslationPolicyCoverageUsesAliases(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		EntityAliases:          map[string]string{"article": "news"},
		Required: map[string]TranslationPolicyEntityConfig{
			"news": {"publish": {Locales: []string{"en"}}},
		},
	}
	if _, err := ValidateTranslationPolicyCoverage(cfg, []string{"articles"}); err != nil {
		t.Fatalf("expected alias coverage validation to pass: %v", err)
	}
}

func TestValidateTranslationPolicyCoverageUsesSingularPluralMatching(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"post": {"publish": {Locales: []string{"en"}}},
		},
	}
	if _, err := ValidateTranslationPolicyCoverage(cfg, []string{"posts"}); err != nil {
		t.Fatalf("expected singular/plural coverage validation to pass: %v", err)
	}
}

func TestValidateTranslationPolicyCoverageReportsMissingContentType(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {"publish": {Locales: []string{"en"}}},
		},
	}
	_, err := ValidateTranslationPolicyCoverage(cfg, []string{"pages", "news"})
	if err == nil {
		t.Fatalf("expected missing coverage error")
	}
	if !strings.Contains(err.Error(), `content type "news"`) {
		t.Fatalf("expected missing news coverage in error, got %v", err)
	}
}

func TestValidateTranslationPolicyCoverageRequiresPublishRequirements(t *testing.T) {
	tests := []struct {
		name string
		cfg  TranslationPolicyConfig
	}{
		{
			name: "empty entity config",
			cfg: TranslationPolicyConfig{
				RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
				Required: map[string]TranslationPolicyEntityConfig{
					"news": {},
				},
			},
		},
		{
			name: "non publish requirements",
			cfg: TranslationPolicyConfig{
				RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
				Required: map[string]TranslationPolicyEntityConfig{
					"news": {
						"draft": {Locales: []string{"en"}},
					},
				},
			},
		},
		{
			name: "empty publish requirements",
			cfg: TranslationPolicyConfig{
				RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
				Required: map[string]TranslationPolicyEntityConfig{
					"news": {
						"publish": {},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ValidateTranslationPolicyCoverage(tt.cfg, []string{"news"})
			if err == nil {
				t.Fatalf("expected missing publish requirements error")
			}
			if !strings.Contains(err.Error(), `publish requirements for content type "news"`) {
				t.Fatalf("expected publish requirements in error, got %v", err)
			}
		})
	}
}

func TestValidateTranslationPolicyCoverageAcceptsEnvironmentPublishRequirements(t *testing.T) {
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"news": {
				"publish": {
					Environments: map[string]TranslationCriteria{
						"production": {Locales: []string{"en", "fr"}},
					},
				},
			},
		},
	}

	if _, err := ValidateTranslationPolicyCoverage(cfg, []string{"news"}); err != nil {
		t.Fatalf("expected environment publish requirements to satisfy coverage: %v", err)
	}
}

func TestValidateTranslationPolicyCoverageAllowsEmptyContentTypes(t *testing.T) {
	result, err := ValidateTranslationPolicyCoverage(TranslationPolicyConfig{}, nil)
	if err != nil {
		t.Fatalf("expected empty content types to pass: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", result.Warnings)
	}
}
