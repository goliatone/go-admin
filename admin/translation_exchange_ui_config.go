package admin

// TranslationExchangeUIConfig carries JSON-safe exchange wizard settings for
// SSR and client enhancement. Host-facing packages may alias this type.
type TranslationExchangeUIConfig struct {
	Configured           bool                                `koanf:"configured" json:"configured,omitempty" yaml:"configured,omitempty"`
	SourceLocale         string                              `koanf:"source_locale" json:"source_locale,omitempty" yaml:"source_locale,omitempty"`
	SourceLocales        []TranslationExchangeLocaleOption   `koanf:"source_locales" json:"source_locales,omitempty" yaml:"source_locales,omitempty"`
	TargetLocales        []TranslationExchangeLocaleOption   `koanf:"target_locales" json:"target_locales,omitempty" yaml:"target_locales,omitempty"`
	LocaleLabels         map[string]string                   `koanf:"locale_labels" json:"locale_labels,omitempty" yaml:"locale_labels,omitempty"`
	Resources            []TranslationExchangeResourceOption `koanf:"resources" json:"resources,omitempty" yaml:"resources,omitempty"`
	DefaultResources     []string                            `koanf:"default_resources" json:"default_resources,omitempty" yaml:"default_resources,omitempty"`
	DefaultTargetLocales []string                            `koanf:"default_target_locales" json:"default_target_locales,omitempty" yaml:"default_target_locales,omitempty"`
	IncludeSourceHash    *bool                               `koanf:"include_source_hash" json:"include_source_hash,omitempty" yaml:"include_source_hash,omitempty"`
	IncludeExamples      *bool                               `koanf:"include_examples" json:"include_examples,omitempty" yaml:"include_examples,omitempty"`
	Template             TranslationExchangeTemplateOption   `koanf:"template" json:"template" yaml:"template,omitempty"`
	Apply                TranslationExchangeApplyDefaults    `koanf:"apply" json:"apply" yaml:"apply,omitempty"`
}

// TranslationExchangeLocaleOption describes a selectable locale.
type TranslationExchangeLocaleOption struct {
	Code  string `koanf:"code" json:"code" yaml:"code"`
	Label string `koanf:"label" json:"label,omitempty" yaml:"label,omitempty"`
}

// TranslationExchangeResourceOption describes a selectable exchange resource.
type TranslationExchangeResourceOption struct {
	ID    string `koanf:"id" json:"id" yaml:"id"`
	Label string `koanf:"label" json:"label,omitempty" yaml:"label,omitempty"`
}

// TranslationExchangeTemplateOption configures the template download affordance.
type TranslationExchangeTemplateOption struct {
	Label    string `koanf:"label" json:"label,omitempty" yaml:"label,omitempty"`
	Format   string `koanf:"format" json:"format,omitempty" yaml:"format,omitempty"`
	Href     string `koanf:"href" json:"href,omitempty" yaml:"href,omitempty"`
	Filename string `koanf:"filename" json:"filename,omitempty" yaml:"filename,omitempty"`
}

// TranslationExchangeApplyDefaults configures import/apply wizard option defaults.
type TranslationExchangeApplyDefaults struct {
	AllowCreateMissing      *bool `koanf:"allow_create_missing" json:"allow_create_missing,omitempty" yaml:"allow_create_missing,omitempty"`
	AllowSourceHashOverride *bool `koanf:"allow_source_hash_override" json:"allow_source_hash_override,omitempty" yaml:"allow_source_hash_override,omitempty"`
	ContinueOnError         *bool `koanf:"continue_on_error" json:"continue_on_error,omitempty" yaml:"continue_on_error,omitempty"`
	DryRun                  *bool `koanf:"dry_run" json:"dry_run,omitempty" yaml:"dry_run,omitempty"`
}
