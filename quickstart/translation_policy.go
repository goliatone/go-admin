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
				EntityType:      strings.TrimSpace(input.EntityType),
				PolicyEntity:    strings.TrimSpace(input.PolicyEntity),
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
	return admin.MissingTranslationsError{
		EntityType:      strings.TrimSpace(input.EntityType),
		PolicyEntity:    strings.TrimSpace(input.PolicyEntity),
		EntityID:        strings.TrimSpace(input.EntityID),
		Transition:      strings.TrimSpace(input.Transition),
		Environment:     strings.TrimSpace(input.Environment),
		RequestedLocale: strings.TrimSpace(input.RequestedLocale),
		MissingLocales:  normalizeLocaleList(missing),
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
	entity := strings.TrimSpace(input.PolicyEntity)
	if entity == "" {
		entity = strings.TrimSpace(input.EntityType)
	}
	if entity == "" {
		return ""
	}
	if idx := strings.Index(entity, "@"); idx > 0 {
		entity = entity[:idx]
	}
	return strings.TrimSpace(entity)
}

func findEntityConfig(required map[string]TranslationPolicyEntityConfig, entity string) (TranslationPolicyEntityConfig, bool) {
	if required == nil {
		return nil, false
	}
	if cfg, ok := required[entity]; ok {
		return cfg, true
	}
	for key, cfg := range required {
		if strings.EqualFold(key, entity) {
			return cfg, true
		}
	}
	return nil, false
}

func findTransitionConfig(entityCfg TranslationPolicyEntityConfig, transition string) (TranslationPolicyTransitionConfig, bool) {
	if entityCfg == nil {
		return TranslationPolicyTransitionConfig{}, false
	}
	if cfg, ok := entityCfg[transition]; ok {
		return cfg, true
	}
	for key, cfg := range entityCfg {
		if strings.EqualFold(key, transition) {
			return cfg, true
		}
	}
	return TranslationPolicyTransitionConfig{}, false
}

func findEnvironmentCriteria(envs map[string]TranslationCriteria, env string) (TranslationCriteria, bool) {
	if envs == nil {
		return TranslationCriteria{}, false
	}
	if cfg, ok := envs[env]; ok {
		return cfg, true
	}
	for key, cfg := range envs {
		if strings.EqualFold(key, env) {
			return cfg, true
		}
	}
	return TranslationCriteria{}, false
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
