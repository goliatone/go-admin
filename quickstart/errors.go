package quickstart

import "github.com/goliatone/go-admin/admin"

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
