package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ErrTranslationExchangeConfig indicates invalid quickstart exchange wiring.
var ErrTranslationExchangeConfig = errors.New("translation exchange config invalid")

// TranslationExchangeAsyncApplyFunc allows hosts to hand off apply flows to async backends.
// The implementation may enqueue work and return a queued/accepted result contract.
type TranslationExchangeAsyncApplyFunc func(context.Context, admin.TranslationImportApplyInput) (admin.TranslationExchangeResult, error)

// TranslationExchangeConfig configures optional translation exchange wiring in quickstart.
type TranslationExchangeConfig struct {
	Enabled bool `json:"enabled,omitempty"`

	Store     admin.TranslationExchangeStore     `json:"-"`
	Exporter  admin.TranslationExchangeExporter  `json:"-"`
	Validator admin.TranslationExchangeValidator `json:"-"`
	Applier   admin.TranslationExchangeApplier   `json:"-"`

	AsyncApply TranslationExchangeAsyncApplyFunc `json:"-"`

	PermissionRegister PermissionRegisterFunc `json:"-"`
}

type translationExchangeConfigError struct {
	Missing []string
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

	exporter, validator, applier, err := resolveTranslationExchangeHandlers(cfg)
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

	return nil
}

func resolveTranslationExchangeHandlers(cfg TranslationExchangeConfig) (admin.TranslationExchangeExporter, admin.TranslationExchangeValidator, admin.TranslationExchangeApplier, error) {
	exporter := cfg.Exporter
	validator := cfg.Validator
	applier := cfg.Applier

	if cfg.Store != nil {
		service := admin.NewTranslationExchangeService(cfg.Store)
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
		return nil, nil, nil, translationExchangeConfigError{Missing: missing}
	}

	return exporter, validator, applier, nil
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
