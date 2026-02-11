package quickstart

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

// TranslationChecker is the minimal contract needed to validate translations.
type TranslationChecker interface {
	CheckTranslations(ctx context.Context, id uuid.UUID, required []string, opts cmsinterfaces.TranslationCheckOptions) ([]string, error)
}

// TranslationPolicyServices supplies translation checkers for pages and content.
type TranslationPolicyServices struct {
	Pages   TranslationChecker
	Content TranslationChecker
}

type translationPolicy struct {
	cfg      TranslationPolicyConfig
	services TranslationPolicyServices
}

// Requirements exposes policy-derived translation requirements for read-model readiness.
func (p translationPolicy) Requirements(_ context.Context, input admin.TranslationPolicyInput) (admin.TranslationRequirements, bool, error) {
	req, ok := resolveTranslationRequirements(p.cfg, input)
	if !ok {
		return admin.TranslationRequirements{}, false, nil
	}
	locales := normalizeLocaleList(req.Locales)
	if len(locales) == 0 && len(req.RequiredFields) > 0 {
		locales = requiredLocalesFromFields(req.RequiredFields)
	}
	return admin.TranslationRequirements{
		Locales:                locales,
		RequiredFields:         cloneRequiredFields(req.RequiredFields),
		RequiredFieldsStrategy: req.RequiredFieldsStrategy,
	}, true, nil
}

// NewTranslationPolicy builds a quickstart translation policy from config + services.
func NewTranslationPolicy(cfg TranslationPolicyConfig, services TranslationPolicyServices) admin.TranslationPolicy {
	if services.Pages == nil && services.Content == nil {
		return nil
	}
	cfg = NormalizeTranslationPolicyConfig(cfg)
	return translationPolicy{cfg: cfg, services: services}
}

func (p translationPolicy) Validate(ctx context.Context, input admin.TranslationPolicyInput) error {
	req, ok := resolveTranslationRequirements(p.cfg, input)
	requiredLocales := normalizeLocaleList(req.Locales)
	if len(requiredLocales) == 0 && len(req.RequiredFields) > 0 {
		requiredLocales = requiredLocalesFromFields(req.RequiredFields)
	}
	if !ok || len(requiredLocales) == 0 {
		if p.cfg.DenyByDefault {
			return admin.MissingTranslationsError{
				EntityType:      normalizePolicyEntity(input.EntityType),
				PolicyEntity:    normalizePolicyEntity(input.PolicyEntity),
				EntityID:        strings.TrimSpace(input.EntityID),
				Transition:      strings.TrimSpace(input.Transition),
				Environment:     strings.TrimSpace(input.Environment),
				RequestedLocale: strings.TrimSpace(input.RequestedLocale),
			}
		}
		return nil
	}
	entityID := uuidFromString(input.EntityID)
	if entityID == uuid.Nil {
		return fmt.Errorf("translation policy requires a valid entity id")
	}
	opts := cmsinterfaces.TranslationCheckOptions{
		State:                  strings.TrimSpace(input.State),
		Environment:            strings.TrimSpace(input.Environment),
		RequiredFields:         cloneRequiredFields(req.RequiredFields),
		RequiredFieldsStrategy: req.RequiredFieldsStrategy,
	}
	entity := resolvePolicyEntity(input)
	var checker TranslationChecker
	if strings.EqualFold(entity, "pages") {
		checker = p.services.Pages
		if checker == nil {
			return fmt.Errorf("page translation checker unavailable")
		}
	} else {
		checker = p.services.Content
		if checker == nil {
			return fmt.Errorf("content translation checker unavailable")
		}
	}
	missing, err := checker.CheckTranslations(ctx, entityID, requiredLocales, opts)
	if err != nil {
		return err
	}
	if len(missing) == 0 {
		return nil
	}
	requiredFieldsEvaluated := requiredFieldsValidationEnabled(req.RequiredFields, req.RequiredFieldsStrategy)
	return admin.MissingTranslationsError{
		EntityType:      normalizePolicyEntity(input.EntityType),
		PolicyEntity:    normalizePolicyEntity(input.PolicyEntity),
		EntityID:        strings.TrimSpace(input.EntityID),
		Transition:      strings.TrimSpace(input.Transition),
		Environment:     strings.TrimSpace(input.Environment),
		RequestedLocale: strings.TrimSpace(input.RequestedLocale),
		MissingLocales:  normalizeLocaleList(missing),
		MissingFieldsByLocale: buildMissingFieldsByLocale(
			req.RequiredFields,
			missing,
			requiredFieldsEvaluated,
		),
		RequiredFieldsEvaluated: requiredFieldsEvaluated,
	}
}

func resolveTranslationRequirements(cfg TranslationPolicyConfig, input admin.TranslationPolicyInput) (admin.TranslationRequirements, bool) {
	if len(cfg.Required) == 0 {
		return admin.TranslationRequirements{}, false
	}
	entityKey := resolvePolicyEntity(input)
	if entityKey == "" {
		return admin.TranslationRequirements{}, false
	}
	entityCfg, ok := findEntityConfig(cfg.Required, entityKey)
	if !ok {
		return admin.TranslationRequirements{}, false
	}
	transition := strings.TrimSpace(input.Transition)
	if transition == "" {
		return admin.TranslationRequirements{}, false
	}
	transitionCfg, ok := findTransitionConfig(entityCfg, transition)
	if !ok {
		return admin.TranslationRequirements{}, false
	}
	if env := strings.TrimSpace(input.Environment); env != "" {
		if criteria, ok := findEnvironmentCriteria(transitionCfg.Environments, env); ok {
			return admin.TranslationRequirements{
				Locales:                append([]string{}, criteria.Locales...),
				RequiredFields:         cloneRequiredFields(criteria.RequiredFields),
				RequiredFieldsStrategy: cfg.RequiredFieldsStrategy,
			}, true
		}
	}
	return admin.TranslationRequirements{
		Locales:                append([]string{}, transitionCfg.Locales...),
		RequiredFields:         cloneRequiredFields(transitionCfg.RequiredFields),
		RequiredFieldsStrategy: cfg.RequiredFieldsStrategy,
	}, true
}

func resolvePolicyEntity(input admin.TranslationPolicyInput) string {
	entity := normalizePolicyEntity(input.PolicyEntity)
	if entity == "" {
		entity = normalizePolicyEntity(input.EntityType)
	}
	return entity
}

func findEntityConfig(required map[string]TranslationPolicyEntityConfig, entity string) (TranslationPolicyEntityConfig, bool) {
	return caseInsensitiveMapLookup(required, entity)
}

func findTransitionConfig(entityCfg TranslationPolicyEntityConfig, transition string) (TranslationPolicyTransitionConfig, bool) {
	return caseInsensitiveMapLookup(entityCfg, transition)
}

func findEnvironmentCriteria(envs map[string]TranslationCriteria, env string) (TranslationCriteria, bool) {
	return caseInsensitiveMapLookup(envs, env)
}

func normalizeLocaleList(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales))
	for _, locale := range locales {
		trimmed := strings.TrimSpace(locale)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func requiredLocalesFromFields(fields map[string][]string) []string {
	if len(fields) == 0 {
		return nil
	}
	keys := make([]string, 0, len(fields))
	for locale := range fields {
		if strings.TrimSpace(locale) != "" {
			keys = append(keys, locale)
		}
	}
	sort.Slice(keys, func(i, j int) bool {
		return strings.ToLower(keys[i]) < strings.ToLower(keys[j])
	})
	return keys
}

func cloneRequiredFields(fields map[string][]string) map[string][]string {
	if len(fields) == 0 {
		return nil
	}
	out := make(map[string][]string, len(fields))
	for locale, values := range fields {
		if len(values) == 0 {
			out[locale] = nil
			continue
		}
		out[locale] = append([]string{}, values...)
	}
	return out
}

func requiredFieldsValidationEnabled(fields map[string][]string, strategy admin.RequiredFieldsValidationStrategy) bool {
	if len(fields) == 0 {
		return false
	}
	return !strings.EqualFold(string(strategy), string(admin.RequiredFieldsValidationIgnore))
}

func buildMissingFieldsByLocale(requiredFields map[string][]string, missingLocales []string, include bool) map[string][]string {
	if !include || len(requiredFields) == 0 || len(missingLocales) == 0 {
		return nil
	}
	out := map[string][]string{}
	for _, locale := range normalizeLocaleList(missingLocales) {
		fields := requiredFieldsForLocale(requiredFields, locale)
		if len(fields) == 0 {
			continue
		}
		out[locale] = fields
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func requiredFieldsForLocale(requiredFields map[string][]string, locale string) []string {
	locale = strings.TrimSpace(locale)
	if locale == "" || len(requiredFields) == 0 {
		return nil
	}
	fields, ok := caseInsensitiveMapLookup(requiredFields, locale)
	if ok {
		return normalizeRequiredFieldNames(fields)
	}
	return nil
}

func caseInsensitiveMapLookup[T any](values map[string]T, key string) (T, bool) {
	var zero T
	if len(values) == 0 {
		return zero, false
	}
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return zero, false
	}
	if value, ok := values[trimmed]; ok {
		return value, true
	}
	target := normalizeLookupKey(trimmed)
	if target == "" {
		return zero, false
	}
	matches := make([]string, 0, len(values))
	for candidate := range values {
		if normalizeLookupKey(candidate) == target {
			matches = append(matches, candidate)
		}
	}
	if len(matches) == 0 {
		return zero, false
	}
	sort.Slice(matches, func(i, j int) bool {
		li := normalizeLookupKey(matches[i])
		lj := normalizeLookupKey(matches[j])
		if li == lj {
			return matches[i] < matches[j]
		}
		return li < lj
	})
	return values[matches[0]], true
}

func normalizeRequiredFieldNames(fields []string) []string {
	if len(fields) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i]) < strings.ToLower(out[j])
	})
	return out
}

func normalizePolicyEntity(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if idx := strings.Index(value, "@"); idx > 0 {
		value = value[:idx]
	}
	return strings.TrimSpace(value)
}

func uuidFromString(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.Nil
}

func hasTranslationPolicyRequirements(cfg TranslationPolicyConfig) bool {
	if len(cfg.Required) == 0 {
		return false
	}
	for _, entityCfg := range cfg.Required {
		for _, transitionCfg := range entityCfg {
			if len(transitionCfg.Locales) > 0 || len(transitionCfg.RequiredFields) > 0 {
				return true
			}
			if len(transitionCfg.Environments) == 0 {
				continue
			}
			for _, criteria := range transitionCfg.Environments {
				if len(criteria.Locales) > 0 || len(criteria.RequiredFields) > 0 {
					return true
				}
			}
		}
	}
	return false
}

func resolveTranslationPolicyServices(cfg admin.Config, overrides TranslationPolicyServices) TranslationPolicyServices {
	if overrides.Pages != nil || overrides.Content != nil {
		return overrides
	}
	raw := cfg.CMS.GoCMSConfig
	if raw == nil {
		raw = cfg.CMSConfig
	}
	if raw == nil && cfg.CMS.Container != nil {
		raw = cfg.CMS.Container
	}
	return TranslationPolicyServices{
		Pages:   resolveGoCMSPageChecker(raw),
		Content: resolveGoCMSContentChecker(raw),
	}
}

func resolveGoCMSPageChecker(raw any) TranslationChecker {
	if raw == nil {
		return nil
	}
	switch v := raw.(type) {
	case interface{ Pages() cms.PageService }:
		return resolveTranslationChecker(v.Pages())
	case interface{ PageService() cms.PageService }:
		return resolveTranslationChecker(v.PageService())
	}
	if provider, ok := raw.(interface{ Container() any }); ok {
		inner := provider.Container()
		if svc := resolveGoCMSPageChecker(inner); svc != nil {
			return svc
		}
	}
	if provider, ok := raw.(interface{ Pages() any }); ok {
		if svc := resolveTranslationChecker(provider.Pages()); svc != nil {
			return svc
		}
	}
	if provider, ok := raw.(interface{ PageService() any }); ok {
		if svc := resolveTranslationChecker(provider.PageService()); svc != nil {
			return svc
		}
	}
	return nil
}

func resolveGoCMSContentChecker(raw any) TranslationChecker {
	if raw == nil {
		return nil
	}
	switch v := raw.(type) {
	case interface{ Content() cms.ContentService }:
		return resolveTranslationChecker(v.Content())
	case interface{ ContentService() cms.ContentService }:
		return resolveTranslationChecker(v.ContentService())
	}
	if provider, ok := raw.(interface{ Container() any }); ok {
		inner := provider.Container()
		if svc := resolveGoCMSContentChecker(inner); svc != nil {
			return svc
		}
	}
	if provider, ok := raw.(interface{ Content() any }); ok {
		if svc := resolveTranslationChecker(provider.Content()); svc != nil {
			return svc
		}
	}
	if provider, ok := raw.(interface{ ContentService() any }); ok {
		if svc := resolveTranslationChecker(provider.ContentService()); svc != nil {
			return svc
		}
	}
	return nil
}

func resolveTranslationChecker(value any) TranslationChecker {
	if value == nil {
		return nil
	}
	if svc, ok := value.(TranslationChecker); ok {
		return svc
	}
	return nil
}
