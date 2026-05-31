package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	gocommand "github.com/goliatone/go-command"
)

// ErrTranslationExchangeConfig indicates invalid quickstart exchange wiring.
var ErrTranslationExchangeConfig = errors.New("translation exchange config invalid")

// TranslationExchangeAsyncApplyFunc allows hosts to hand off apply flows to async backends.
// The implementation may enqueue work and return a queued/accepted result contract.
type TranslationExchangeAsyncApplyFunc func(context.Context, admin.TranslationImportApplyInput) (admin.TranslationExchangeResult, error)

// TranslationExchangeConfig configures optional translation exchange wiring in quickstart.
type TranslationExchangeConfig struct {
	Enabled bool `json:"enabled,omitempty"`
	// CommandExecutionMode applies per-command routing policy overrides for translation exchange commands.
	// Hosts can still override specific command ids through WithCommandExecutionPolicy.
	CommandExecutionMode gocommand.ExecutionMode     `json:"command_execution_mode,omitempty"`
	UI                   TranslationExchangeUIConfig `json:"ui"`

	Store        admin.TranslationExchangeStore        `json:"-"`
	RuntimeStore admin.TranslationExchangeRuntimeStore `json:"-"`
	Exporter     admin.TranslationExchangeExporter     `json:"-"`
	Validator    admin.TranslationExchangeValidator    `json:"-"`
	Applier      admin.TranslationExchangeApplier      `json:"-"`

	AsyncApply TranslationExchangeAsyncApplyFunc `json:"-"`

	PermissionRegister PermissionRegisterFunc `json:"-"`
}

// TranslationExchangeUIConfig carries JSON-safe exchange wizard settings.
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

type translationExchangeConfigError struct {
	Missing []string `json:"missing"`
}

func (e translationExchangeConfigError) Error() string {
	if len(e.Missing) == 0 {
		return ErrTranslationExchangeConfig.Error()
	}
	return fmt.Sprintf("%s (missing: %s)", ErrTranslationExchangeConfig.Error(), strings.Join(e.Missing, ", "))
}

func (e translationExchangeConfigError) Unwrap() error {
	return ErrTranslationExchangeConfig
}

// WithTranslationExchangeConfig configures opt-in translation exchange command/permission wiring.
func WithTranslationExchangeConfig(cfg TranslationExchangeConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationExchangeConfig = cfg
		opts.translationExchangeConfigSet = true
		if opts.featureDefaults == nil {
			opts.featureDefaults = map[string]bool{}
		}
		opts.featureDefaults[string(admin.FeatureTranslationExchange)] = cfg.Enabled
	}
}

// RegisterTranslationExchangeWiring wires commands and optional permission registration.
func RegisterTranslationExchangeWiring(adm *admin.Admin, cfg TranslationExchangeConfig) error {
	if adm == nil || !cfg.Enabled {
		return nil
	}
	cfg.UI = normalizeTranslationExchangeUIConfig(cfg.UI, "", nil)

	exporter, validator, applier, service, err := resolveTranslationExchangeHandlers(cfg)
	if err != nil {
		return err
	}

	commands := adm.Commands()
	if commands == nil {
		return translationExchangeConfigError{Missing: []string{"command_bus"}}
	}
	if err := admin.RegisterTranslationExchangeCommandFactories(commands); err != nil {
		return err
	}
	if _, err := admin.RegisterCommand(commands, &admin.TranslationExportCommand{Service: exporter}); err != nil {
		return err
	}
	if _, err := admin.RegisterCommand(commands, &admin.TranslationImportValidateCommand{Service: validator}); err != nil {
		return err
	}
	if _, err := admin.RegisterCommand(commands, &admin.TranslationImportApplyCommand{Service: applier}); err != nil {
		return err
	}
	if _, err := admin.RegisterCommand(commands, &admin.TranslationImportRunCommand{
		Validator: validator,
		Applier:   applier,
	}); err != nil {
		return err
	}

	if cfg.PermissionRegister != nil {
		if err := RegisterTranslationExchangePermissions(cfg.PermissionRegister); err != nil {
			return err
		}
	}
	if cfg.RuntimeStore != nil {
		runtime := admin.NewTranslationExchangeRuntime(cfg.RuntimeStore, exporter, service)
		if runtime != nil {
			runtime.Configure(exporter, applier)
			adm.WithTranslationExchangeRuntime(runtime)
		}
	}

	return nil
}

func resolveTranslationExchangeHandlers(cfg TranslationExchangeConfig) (admin.TranslationExchangeExporter, admin.TranslationExchangeValidator, admin.TranslationExchangeApplier, *admin.TranslationExchangeService, error) {
	exporter := cfg.Exporter
	validator := cfg.Validator
	applier := cfg.Applier
	var service *admin.TranslationExchangeService

	if cfg.Store != nil {
		opts := []admin.TranslationExchangeServiceOption{}
		if cfg.RuntimeStore != nil {
			opts = append(opts, admin.WithTranslationExchangeApplyRecordStore(cfg.RuntimeStore))
		}
		service = admin.NewTranslationExchangeService(cfg.Store, opts...)
		if exporter == nil {
			exporter = service
		}
		if validator == nil {
			validator = service
		}
		if applier == nil {
			applier = service
		}
	}

	if cfg.AsyncApply != nil {
		applier = translationExchangeAsyncApplier{apply: cfg.AsyncApply}
	}

	missing := []string{}
	if exporter == nil {
		missing = append(missing, "exporter")
	}
	if validator == nil {
		missing = append(missing, "validator")
	}
	if applier == nil {
		missing = append(missing, "applier")
	}
	if len(missing) > 0 {
		return nil, nil, nil, nil, translationExchangeConfigError{Missing: missing}
	}
	if cfg.UI.Configured {
		exporter = translationExchangeValidatingExporter{
			next: exporter,
			ui:   cfg.UI,
		}
	}

	return exporter, validator, applier, service, nil
}

type translationExchangeAsyncApplier struct {
	apply TranslationExchangeAsyncApplyFunc
}

func (a translationExchangeAsyncApplier) ApplyImport(ctx context.Context, input admin.TranslationImportApplyInput) (admin.TranslationExchangeResult, error) {
	if a.apply == nil {
		return admin.TranslationExchangeResult{}, translationExchangeConfigError{Missing: []string{"async_apply"}}
	}
	return a.apply(ctx, input)
}
