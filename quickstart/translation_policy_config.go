package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// TranslationPolicyConfig captures translation enforcement rules for workflow transitions.
// Defaults are permissive (no enforcement) unless requirements are configured.
type TranslationPolicyConfig struct {
	// DenyByDefault blocks transitions when no explicit requirements are configured.
	DenyByDefault bool `json:"deny_by_default,omitempty"`
	// RequiredFieldsStrategy controls how unknown required-field keys are handled.
	// Valid values: error, warn, ignore (defaults to error).
	RequiredFieldsStrategy admin.RequiredFieldsValidationStrategy `json:"required_fields_strategy,omitempty"`
	// Required maps entity -> transition -> requirements.
	Required map[string]TranslationPolicyEntityConfig `json:"required,omitempty"`
}

// TranslationPolicyEntityConfig maps transition names to requirements.
type TranslationPolicyEntityConfig map[string]TranslationPolicyTransitionConfig

// TranslationPolicyTransitionConfig describes requirements for a transition and optional environments.
type TranslationPolicyTransitionConfig struct {
	Locales        []string                       `json:"locales,omitempty"`
	RequiredFields map[string][]string            `json:"required_fields,omitempty"`
	Environments   map[string]TranslationCriteria `json:"environments,omitempty"`
}

// TranslationCriteria captures locale/field requirements for a transition or environment.
type TranslationCriteria struct {
	Locales        []string            `json:"locales,omitempty"`
	RequiredFields map[string][]string `json:"required_fields,omitempty"`
}

// DefaultTranslationPolicyConfig returns permissive defaults (no enforcement).
func DefaultTranslationPolicyConfig() TranslationPolicyConfig {
	return TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
	}
}

// NormalizeTranslationPolicyConfig applies defaults and normalizes strategy values.
func NormalizeTranslationPolicyConfig(cfg TranslationPolicyConfig) TranslationPolicyConfig {
	cfg.RequiredFieldsStrategy = normalizeRequiredFieldsStrategy(cfg.RequiredFieldsStrategy)
	return cfg
}

func normalizeRequiredFieldsStrategy(strategy admin.RequiredFieldsValidationStrategy) admin.RequiredFieldsValidationStrategy {
	switch strings.ToLower(strings.TrimSpace(string(strategy))) {
	case string(admin.RequiredFieldsValidationWarn):
		return admin.RequiredFieldsValidationWarn
	case string(admin.RequiredFieldsValidationIgnore):
		return admin.RequiredFieldsValidationIgnore
	case string(admin.RequiredFieldsValidationError):
		return admin.RequiredFieldsValidationError
	default:
		return admin.RequiredFieldsValidationError
	}
}
