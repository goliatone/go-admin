package quickstart

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type translationExchangeValidatingExporter struct {
	next admin.TranslationExchangeExporter
	ui   TranslationExchangeUIConfig
}

func (e translationExchangeValidatingExporter) Export(ctx context.Context, input admin.TranslationExportInput) (admin.TranslationExportResult, error) {
	if e.next == nil {
		return admin.TranslationExportResult{}, translationExchangeConfigError{Missing: []string{"exporter"}}
	}
	normalized, err := validateTranslationExchangeExportFilter(input.Filter, e.ui)
	if err != nil {
		return admin.TranslationExportResult{}, err
	}
	input.Filter = normalized
	return e.next.Export(ctx, input)
}

func validateTranslationExchangeExportFilter(filter admin.TranslationExportFilter, ui TranslationExchangeUIConfig) (admin.TranslationExportFilter, error) {
	if !ui.Configured {
		return filter, nil
	}
	out := filter
	resources, err := validateTranslationExchangeResourceValues(filter.Resources, ui.Resources)
	if err != nil {
		return filter, err
	}
	sourceLocale, err := validateTranslationExchangeSourceLocale(filter.SourceLocale, ui)
	if err != nil {
		return filter, err
	}
	targetLocales, err := validateTranslationExchangeTargetLocales(filter.TargetLocales, ui.TargetLocales, sourceLocale)
	if err != nil {
		return filter, err
	}
	out.Resources = resources
	out.SourceLocale = sourceLocale
	out.TargetLocales = targetLocales
	return out, nil
}

func validateTranslationExchangeResourceValues(values []string, options []TranslationExchangeResourceOption) ([]string, error) {
	allowed := map[string]struct{}{}
	for _, option := range options {
		id := strings.TrimSpace(option.ID)
		if id != "" {
			allowed[id] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return nil, translationExchangeFilterValidationError("resources", "no exchange resources are configured", nil, nil)
	}
	out := []string{}
	seen := map[string]struct{}{}
	for _, value := range values {
		resource := strings.TrimSpace(value)
		if resource == "" {
			continue
		}
		if _, ok := allowed[resource]; !ok {
			return nil, translationExchangeFilterValidationError("resources", fmt.Sprintf("unsupported exchange resource %q", resource), resource, mapKeys(allowed))
		}
		if _, ok := seen[resource]; ok {
			continue
		}
		seen[resource] = struct{}{}
		out = append(out, resource)
	}
	if len(out) == 0 {
		return nil, translationExchangeFilterValidationError("resources", "at least one exchange resource is required", nil, mapKeys(allowed))
	}
	return out, nil
}

func validateTranslationExchangeSourceLocale(value string, ui TranslationExchangeUIConfig) (string, error) {
	allowed := map[string]struct{}{}
	for _, option := range ui.SourceLocales {
		code := normalizeTranslationExchangeLocaleCode(option.Code)
		if translationExchangeValidLocaleCode(code) {
			allowed[code] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return "", translationExchangeFilterValidationError("source_locale", "no exchange source locales are configured", nil, nil)
	}
	source := normalizeTranslationExchangeLocaleCode(value)
	if source == "" {
		source = normalizeTranslationExchangeLocaleCode(ui.SourceLocale)
	}
	if source == "" {
		return "", translationExchangeFilterValidationError("source_locale", "source locale is required", nil, mapKeys(allowed))
	}
	if _, ok := allowed[source]; !ok {
		return "", translationExchangeFilterValidationError("source_locale", fmt.Sprintf("unsupported source locale %q", source), source, mapKeys(allowed))
	}
	return source, nil
}

func validateTranslationExchangeTargetLocales(values []string, options []TranslationExchangeLocaleOption, source string) ([]string, error) {
	allowed := map[string]struct{}{}
	for _, option := range options {
		code := normalizeTranslationExchangeLocaleCode(option.Code)
		if translationExchangeValidLocaleCode(code) && code != source {
			allowed[code] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return nil, translationExchangeFilterValidationError("target_locales", "no exchange target locales are configured", nil, nil)
	}
	out := []string{}
	seen := map[string]struct{}{}
	for _, value := range values {
		locale := normalizeTranslationExchangeLocaleCode(value)
		if locale == "" {
			continue
		}
		if locale == source {
			return nil, translationExchangeFilterValidationError("target_locales", "target locale cannot match source locale", locale, mapKeys(allowed))
		}
		if _, ok := allowed[locale]; !ok {
			return nil, translationExchangeFilterValidationError("target_locales", fmt.Sprintf("unsupported target locale %q", locale), locale, mapKeys(allowed))
		}
		if _, ok := seen[locale]; ok {
			continue
		}
		seen[locale] = struct{}{}
		out = append(out, locale)
	}
	if len(out) == 0 {
		return nil, translationExchangeFilterValidationError("target_locales", "at least one target locale is required", nil, mapKeys(allowed))
	}
	return out, nil
}

func translationExchangeFilterValidationError(field, message string, value any, allowed []string) error {
	meta := map[string]any{
		"field": field,
	}
	if value != nil {
		meta["value"] = value
	}
	if len(allowed) > 0 {
		meta["allowed"] = allowed
	}
	return admin.NewDomainError(admin.TextCodeValidationError, message, meta)
}

func mapKeys(values map[string]struct{}) []string {
	out := make([]string, 0, len(values))
	for value := range values {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}
