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
	// PageEntities declares policy entities that should prefer the page translation
	// checker when both page/content checkers are configured.
	PageEntities []string `json:"page_entities,omitempty"`
	// EntityAliases maps input policy entities to canonical policy keys.
	// Useful for irregular nouns or legacy names that singular/plural inflection
	// cannot resolve deterministically.
	EntityAliases map[string]string `json:"entity_aliases,omitempty"`
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

// DefaultContentTranslationPolicyConfig returns a permissive, content-type agnostic
// baseline with no built-in entity assumptions.
func DefaultContentTranslationPolicyConfig() TranslationPolicyConfig {
	return DefaultTranslationPolicyConfig()
}

// DefaultTranslationPolicyValidationCatalog is empty by default so hosts can
// supply their own entity catalogs.
func DefaultTranslationPolicyValidationCatalog() TranslationPolicyValidationCatalog {
	return TranslationPolicyValidationCatalog{}
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
		entityKey := policyEntityLookupKey(firstNonEmpty(resolvePolicyEntityAlias(cfg.EntityAliases, entity), entity))
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
	cfg.PageEntities = normalizeTranslationPolicyEntities(cfg.PageEntities)
	cfg.EntityAliases = normalizeTranslationPolicyEntityAliases(cfg.EntityAliases)
	return cfg
}

func normalizeTranslationPolicyEntities(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		normalized := policyEntityLookupKey(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	sort.Strings(out)
	return out
}

func normalizeTranslationPolicyEntityAliases(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	out := map[string]string{}
	for key, value := range values {
		normalizedKey := admin.CanonicalPolicyEntityKey(key)
		normalizedValue := admin.CanonicalPolicyEntityKey(value)
		if normalizedKey == "" || normalizedValue == "" {
			continue
		}
		out[normalizedKey] = normalizedValue
	}
	if len(out) == 0 {
		return nil
	}
	return out
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
		normalized := policyEntityLookupKey(key)
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
