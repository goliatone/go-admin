package quickstart

import (
	"fmt"
	"sort"
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

// TranslationPolicyValidationCatalog describes known policy entities/transitions/fields.
// Validation is optional and used by hosts that want strict startup checks.
type TranslationPolicyValidationCatalog struct {
	Entities map[string]TranslationPolicyEntityCatalog
}

// TranslationPolicyEntityCatalog describes known transitions and field keys for one entity.
type TranslationPolicyEntityCatalog struct {
	Transitions map[string]TranslationPolicyTransitionCatalog
}

// TranslationPolicyTransitionCatalog describes known required-field keys for one transition.
type TranslationPolicyTransitionCatalog struct {
	RequiredFields []string
}

// TranslationPolicyValidationResult includes non-fatal warnings produced by validation.
type TranslationPolicyValidationResult struct {
	Warnings []string
}

// DefaultTranslationPolicyConfig returns permissive defaults (no enforcement).
func DefaultTranslationPolicyConfig() TranslationPolicyConfig {
	return TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
	}
}

// DefaultContentTranslationPolicyConfig returns a page/post publish-focused policy fixture.
func DefaultContentTranslationPolicyConfig() TranslationPolicyConfig {
	return TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en", "es", "fr"},
					RequiredFields: map[string][]string{
						"en": {"title", "path"},
						"es": {"title", "path"},
						"fr": {"title", "path"},
					},
					Environments: map[string]TranslationCriteria{
						"staging": {
							Locales: []string{"en", "es"},
							RequiredFields: map[string][]string{
								"en": {"title", "path"},
								"es": {"title", "path"},
							},
						},
						"production": {
							Locales: []string{"en", "es", "fr"},
							RequiredFields: map[string][]string{
								"en": {"title", "path"},
								"es": {"title", "path"},
								"fr": {"title", "path"},
							},
						},
					},
				},
			},
			"posts": {
				"publish": {
					Locales: []string{"en", "es", "fr"},
					RequiredFields: map[string][]string{
						"en": {"title", "path", "excerpt"},
						"es": {"title", "path", "excerpt"},
						"fr": {"title", "path", "excerpt"},
					},
					Environments: map[string]TranslationCriteria{
						"staging": {
							Locales: []string{"en", "es"},
							RequiredFields: map[string][]string{
								"en": {"title", "path", "excerpt"},
								"es": {"title", "path", "excerpt"},
							},
						},
						"production": {
							Locales: []string{"en", "es", "fr"},
							RequiredFields: map[string][]string{
								"en": {"title", "path", "excerpt"},
								"es": {"title", "path", "excerpt"},
								"fr": {"title", "path", "excerpt"},
							},
						},
					},
				},
			},
		},
	}
}

// DefaultTranslationPolicyValidationCatalog defines known page/post publish contracts.
func DefaultTranslationPolicyValidationCatalog() TranslationPolicyValidationCatalog {
	return TranslationPolicyValidationCatalog{
		Entities: map[string]TranslationPolicyEntityCatalog{
			"pages": {
				Transitions: map[string]TranslationPolicyTransitionCatalog{
					"publish": {
						RequiredFields: []string{
							"title",
							"slug",
							"path",
							"content",
							"template_id",
							"parent_id",
							"meta_title",
							"meta_description",
							"blocks",
						},
					},
				},
			},
			"posts": {
				Transitions: map[string]TranslationPolicyTransitionCatalog{
					"publish": {
						RequiredFields: []string{
							"title",
							"slug",
							"path",
							"content",
							"excerpt",
							"category",
							"featured_image",
							"tags",
							"meta_title",
							"meta_description",
							"author",
						},
					},
				},
			},
		},
	}
}

// ValidateTranslationPolicyConfig validates policy keys against a known catalog.
// Strategy controls unknown-key handling:
// - error: returns an error
// - warn: records warnings
// - ignore: suppresses unknown-key issues
func ValidateTranslationPolicyConfig(cfg TranslationPolicyConfig, catalog TranslationPolicyValidationCatalog) (TranslationPolicyValidationResult, error) {
	cfg = NormalizeTranslationPolicyConfig(cfg)
	result := TranslationPolicyValidationResult{}
	if len(cfg.Required) == 0 || len(catalog.Entities) == 0 {
		return result, nil
	}
	catalogEntities := normalizeEntityCatalog(catalog.Entities)
	errorsOut := []string{}
	for _, entity := range sortedKeys(cfg.Required) {
		entityKey := normalizeLookupKey(entity)
		entityCfg := cfg.Required[entity]
		entityCatalog, ok := catalogEntities[entityKey]
		if !ok {
			appendValidationIssue(&result, &errorsOut, cfg.RequiredFieldsStrategy, fmt.Sprintf("unknown policy entity %q", entity))
			continue
		}
		catalogTransitions := normalizeTransitionCatalog(entityCatalog.Transitions)
		for _, transition := range sortedKeys(entityCfg) {
			transitionKey := normalizeLookupKey(transition)
			transitionCfg := entityCfg[transition]
			transitionCatalog, ok := catalogTransitions[transitionKey]
			if !ok {
				appendValidationIssue(
					&result,
					&errorsOut,
					cfg.RequiredFieldsStrategy,
					fmt.Sprintf("unknown transition %q for entity %q", transition, entity),
				)
				continue
			}
			knownFields := normalizeFieldCatalog(transitionCatalog.RequiredFields)
			validateRequiredFieldLocales(
				cfg.RequiredFieldsStrategy,
				fmt.Sprintf("entity %q transition %q", entity, transition),
				transitionCfg.RequiredFields,
				knownFields,
				&result,
				&errorsOut,
			)
			for _, env := range sortedKeys(transitionCfg.Environments) {
				criteria := transitionCfg.Environments[env]
				validateRequiredFieldLocales(
					cfg.RequiredFieldsStrategy,
					fmt.Sprintf("entity %q transition %q environment %q", entity, transition, env),
					criteria.RequiredFields,
					knownFields,
					&result,
					&errorsOut,
				)
			}
		}
	}
	if len(errorsOut) > 0 {
		return result, fmt.Errorf("translation policy config validation failed: %s", strings.Join(errorsOut, "; "))
	}
	return result, nil
}

// NormalizeTranslationPolicyConfig applies defaults and normalizes strategy values.
func NormalizeTranslationPolicyConfig(cfg TranslationPolicyConfig) TranslationPolicyConfig {
	cfg.RequiredFieldsStrategy = normalizeRequiredFieldsStrategy(cfg.RequiredFieldsStrategy)
	return cfg
}

func validateRequiredFieldLocales(
	strategy admin.RequiredFieldsValidationStrategy,
	context string,
	required map[string][]string,
	knownFields map[string]struct{},
	result *TranslationPolicyValidationResult,
	errorsOut *[]string,
) {
	for _, locale := range sortedKeys(required) {
		fields := required[locale]
		for _, field := range fields {
			key := normalizeLookupKey(field)
			if key == "" {
				continue
			}
			if _, ok := knownFields[key]; ok {
				continue
			}
			appendValidationIssue(
				result,
				errorsOut,
				strategy,
				fmt.Sprintf("%s has unknown required field key %q for locale %q", context, field, locale),
			)
		}
	}
}

func appendValidationIssue(
	result *TranslationPolicyValidationResult,
	errorsOut *[]string,
	strategy admin.RequiredFieldsValidationStrategy,
	message string,
) {
	switch normalizeRequiredFieldsStrategy(strategy) {
	case admin.RequiredFieldsValidationWarn:
		result.Warnings = append(result.Warnings, message)
	case admin.RequiredFieldsValidationIgnore:
		return
	default:
		*errorsOut = append(*errorsOut, message)
	}
}

func normalizeEntityCatalog(values map[string]TranslationPolicyEntityCatalog) map[string]TranslationPolicyEntityCatalog {
	out := map[string]TranslationPolicyEntityCatalog{}
	for key, value := range values {
		normalized := normalizeLookupKey(key)
		if normalized == "" {
			continue
		}
		out[normalized] = value
	}
	return out
}

func normalizeTransitionCatalog(values map[string]TranslationPolicyTransitionCatalog) map[string]TranslationPolicyTransitionCatalog {
	out := map[string]TranslationPolicyTransitionCatalog{}
	for key, value := range values {
		normalized := normalizeLookupKey(key)
		if normalized == "" {
			continue
		}
		out[normalized] = value
	}
	return out
}

func normalizeFieldCatalog(values []string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, value := range values {
		normalized := normalizeLookupKey(value)
		if normalized == "" {
			continue
		}
		out[normalized] = struct{}{}
	}
	return out
}

func normalizeLookupKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func sortedKeys[T any](values map[string]T) []string {
	if len(values) == 0 {
		return nil
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		li := strings.ToLower(strings.TrimSpace(keys[i]))
		lj := strings.ToLower(strings.TrimSpace(keys[j]))
		if li == lj {
			return keys[i] < keys[j]
		}
		return li < lj
	})
	return keys
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
