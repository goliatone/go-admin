package quickstart

import "strings"

func normalizeTranslationExchangeUIConfig(ui TranslationExchangeUIConfig, adminDefaultLocale string, queueLocales []string) TranslationExchangeUIConfig {
	configured := translationExchangeUIConfigHasFields(ui)
	if !configured {
		return TranslationExchangeUIConfig{}
	}

	out := TranslationExchangeUIConfig{
		Configured:        true,
		LocaleLabels:      normalizeTranslationExchangeLocaleLabels(ui.LocaleLabels),
		IncludeSourceHash: cloneBoolPtr(ui.IncludeSourceHash),
		IncludeExamples:   cloneBoolPtr(ui.IncludeExamples),
		Template: TranslationExchangeTemplateOption{
			Label:    strings.TrimSpace(ui.Template.Label),
			Format:   strings.ToLower(strings.TrimSpace(ui.Template.Format)),
			Href:     strings.TrimSpace(ui.Template.Href),
			Filename: strings.TrimSpace(ui.Template.Filename),
		},
		Apply: TranslationExchangeApplyDefaults{
			AllowCreateMissing:      cloneBoolPtr(ui.Apply.AllowCreateMissing),
			AllowSourceHashOverride: cloneBoolPtr(ui.Apply.AllowSourceHashOverride),
			ContinueOnError:         cloneBoolPtr(ui.Apply.ContinueOnError),
			DryRun:                  cloneBoolPtr(ui.Apply.DryRun),
		},
	}

	sourceOptions := normalizeTranslationExchangeLocaleOptions(ui.SourceLocales, out.LocaleLabels)
	configuredSource := normalizeTranslationExchangeLocaleCode(ui.SourceLocale)
	if translationExchangeValidLocaleCode(configuredSource) {
		sourceOptions = appendLocaleOptionIfMissing(sourceOptions, TranslationExchangeLocaleOption{
			Code:  configuredSource,
			Label: translationExchangeLocaleLabel(configuredSource, ui.SourceLocale, out.LocaleLabels),
		})
	}
	if len(sourceOptions) == 0 {
		fallbackSource := normalizeTranslationExchangeLocaleCode(adminDefaultLocale)
		if translationExchangeValidLocaleCode(fallbackSource) {
			sourceOptions = appendLocaleOptionIfMissing(sourceOptions, TranslationExchangeLocaleOption{
				Code:  fallbackSource,
				Label: translationExchangeLocaleLabel(fallbackSource, adminDefaultLocale, out.LocaleLabels),
			})
		}
	}
	out.SourceLocales = sourceOptions
	if configuredSource != "" && localeOptionContains(sourceOptions, configuredSource) {
		out.SourceLocale = configuredSource
	} else if len(sourceOptions) > 0 {
		out.SourceLocale = sourceOptions[0].Code
	}

	targetOptions := normalizeTranslationExchangeLocaleOptions(ui.TargetLocales, out.LocaleLabels)
	if len(targetOptions) == 0 {
		targetOptions = normalizeTranslationExchangeLocaleCodesAsOptions(queueLocales, out.LocaleLabels)
	}
	if out.SourceLocale != "" {
		targetOptions = removeLocaleOption(targetOptions, out.SourceLocale)
	}
	out.TargetLocales = targetOptions
	out.DefaultTargetLocales = filterLocaleCodes(ui.DefaultTargetLocales, targetOptions, out.SourceLocale)
	if len(out.DefaultTargetLocales) == 0 {
		out.DefaultTargetLocales = localeOptionCodes(targetOptions)
	}

	out.Resources = normalizeTranslationExchangeResourceOptions(ui.Resources)
	out.DefaultResources = filterResourceIDs(ui.DefaultResources, out.Resources)
	if len(out.DefaultResources) == 0 {
		out.DefaultResources = resourceOptionIDs(out.Resources)
	}

	return out
}

func translationExchangeUIConfigHasFields(ui TranslationExchangeUIConfig) bool {
	return ui.Configured ||
		strings.TrimSpace(ui.SourceLocale) != "" ||
		len(ui.SourceLocales) > 0 ||
		len(ui.TargetLocales) > 0 ||
		len(ui.LocaleLabels) > 0 ||
		len(ui.Resources) > 0 ||
		len(ui.DefaultResources) > 0 ||
		len(ui.DefaultTargetLocales) > 0 ||
		ui.IncludeSourceHash != nil ||
		ui.IncludeExamples != nil ||
		ui.Apply.AllowCreateMissing != nil ||
		ui.Apply.AllowSourceHashOverride != nil ||
		ui.Apply.ContinueOnError != nil ||
		ui.Apply.DryRun != nil ||
		strings.TrimSpace(ui.Template.Label) != "" ||
		strings.TrimSpace(ui.Template.Format) != "" ||
		strings.TrimSpace(ui.Template.Href) != "" ||
		strings.TrimSpace(ui.Template.Filename) != ""
}

func normalizeTranslationExchangeLocaleLabels(labels map[string]string) map[string]string {
	if len(labels) == 0 {
		return nil
	}
	out := map[string]string{}
	for code, label := range labels {
		normalized := normalizeTranslationExchangeLocaleCode(code)
		if normalized == "" {
			continue
		}
		if trimmed := strings.TrimSpace(label); trimmed != "" {
			out[normalized] = trimmed
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeTranslationExchangeLocaleOptions(options []TranslationExchangeLocaleOption, labels map[string]string) []TranslationExchangeLocaleOption {
	out := []TranslationExchangeLocaleOption{}
	for _, option := range options {
		code := normalizeTranslationExchangeLocaleCode(option.Code)
		if !translationExchangeValidLocaleCode(code) {
			continue
		}
		out = appendLocaleOptionIfMissing(out, TranslationExchangeLocaleOption{
			Code:  code,
			Label: translationExchangeLocaleLabel(code, option.Label, labels),
		})
	}
	return out
}

func normalizeTranslationExchangeLocaleCodesAsOptions(codes []string, labels map[string]string) []TranslationExchangeLocaleOption {
	out := []TranslationExchangeLocaleOption{}
	for _, raw := range codes {
		code := normalizeTranslationExchangeLocaleCode(raw)
		if !translationExchangeValidLocaleCode(code) {
			continue
		}
		out = appendLocaleOptionIfMissing(out, TranslationExchangeLocaleOption{
			Code:  code,
			Label: translationExchangeLocaleLabel(code, raw, labels),
		})
	}
	return out
}

func normalizeTranslationExchangeLocaleCode(code string) string {
	return strings.ToLower(strings.TrimSpace(code))
}

func translationExchangeValidLocaleCode(code string) bool {
	switch strings.ToLower(strings.TrimSpace(code)) {
	case "", "none", "mixed":
		return false
	default:
		return true
	}
}

func appendLocaleOptionIfMissing(options []TranslationExchangeLocaleOption, option TranslationExchangeLocaleOption) []TranslationExchangeLocaleOption {
	if option.Code == "" || localeOptionContains(options, option.Code) {
		return options
	}
	if strings.TrimSpace(option.Label) == "" {
		option.Label = strings.ToUpper(option.Code)
	}
	return append(options, option)
}

func localeOptionContains(options []TranslationExchangeLocaleOption, code string) bool {
	code = normalizeTranslationExchangeLocaleCode(code)
	for _, option := range options {
		if option.Code == code {
			return true
		}
	}
	return false
}

func removeLocaleOption(options []TranslationExchangeLocaleOption, code string) []TranslationExchangeLocaleOption {
	code = normalizeTranslationExchangeLocaleCode(code)
	out := options[:0]
	for _, option := range options {
		if option.Code != code {
			out = append(out, option)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationExchangeLocaleLabel(code, fallback string, labels map[string]string) string {
	if label := strings.TrimSpace(labels[code]); label != "" {
		return label
	}
	if label := strings.TrimSpace(fallback); label != "" && normalizeTranslationExchangeLocaleCode(label) != code {
		return label
	}
	return strings.ToUpper(code)
}

func filterLocaleCodes(codes []string, options []TranslationExchangeLocaleOption, source string) []string {
	if len(codes) == 0 || len(options) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, option := range options {
		allowed[option.Code] = struct{}{}
	}
	source = normalizeTranslationExchangeLocaleCode(source)
	seen := map[string]struct{}{}
	out := []string{}
	for _, raw := range codes {
		code := normalizeTranslationExchangeLocaleCode(raw)
		if code == "" || code == source {
			continue
		}
		if _, ok := allowed[code]; !ok {
			continue
		}
		if _, ok := seen[code]; ok {
			continue
		}
		seen[code] = struct{}{}
		out = append(out, code)
	}
	return out
}

func localeOptionCodes(options []TranslationExchangeLocaleOption) []string {
	out := make([]string, 0, len(options))
	for _, option := range options {
		if option.Code != "" {
			out = append(out, option.Code)
		}
	}
	return out
}

func normalizeTranslationExchangeResourceOptions(options []TranslationExchangeResourceOption) []TranslationExchangeResourceOption {
	out := []TranslationExchangeResourceOption{}
	seen := map[string]struct{}{}
	for _, option := range options {
		id := strings.TrimSpace(option.ID)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		label := strings.TrimSpace(option.Label)
		if label == "" {
			label = id
		}
		out = append(out, TranslationExchangeResourceOption{ID: id, Label: label})
	}
	return out
}

func filterResourceIDs(ids []string, options []TranslationExchangeResourceOption) []string {
	if len(ids) == 0 || len(options) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, option := range options {
		allowed[option.ID] = struct{}{}
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, raw := range ids {
		id := strings.TrimSpace(raw)
		if id == "" {
			continue
		}
		if _, ok := allowed[id]; !ok {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func resourceOptionIDs(options []TranslationExchangeResourceOption) []string {
	out := make([]string, 0, len(options))
	for _, option := range options {
		if option.ID != "" {
			out = append(out, option.ID)
		}
	}
	return out
}

func cloneBoolPtr(value *bool) *bool {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}
