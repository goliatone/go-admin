package quickstart

import "github.com/goliatone/go-admin/admin"

// ErrorEnvOption is retained for compatibility.
// Deprecated: use ErrorOption and WithErrorOptions.
type ErrorEnvOption struct {
	DevModeKey               string
	IncludeStackTraceKey     string
	ExposeInternalMessageKey string
}

// ErrorOption applies explicit error configuration overrides.
type ErrorOption struct {
	DevMode               *bool
	IncludeStackTrace     *bool
	ExposeInternalMessage *bool
}

// WithErrorConfig merges an error config into the admin config.
func WithErrorConfig(errorCfg admin.ErrorConfig) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.Errors = errorCfg
	}
}

// WithErrorOptions applies explicit error options to the admin config.
func WithErrorOptions(opt ErrorOption) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		errCfg := cfg.Errors
		if opt.DevMode != nil {
			errCfg.DevMode = *opt.DevMode
		}
		if opt.IncludeStackTrace != nil {
			errCfg.IncludeStackTrace = *opt.IncludeStackTrace
		}
		if opt.ExposeInternalMessage != nil {
			errCfg.ExposeInternalMessages = *opt.ExposeInternalMessage
		}
		cfg.Errors = errCfg
	}
}

// WithErrorsFromEnv is retained for compatibility and no longer reads process environment.
// Deprecated: use WithErrorOptions and an external config loader.
func WithErrorsFromEnv(_ ...ErrorEnvOption) AdminConfigOption {
	return func(_ *admin.Config) {}
}
