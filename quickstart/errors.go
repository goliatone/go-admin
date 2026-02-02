package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ErrorEnvOption customizes which environment variables map to error config.
type ErrorEnvOption struct {
	DevModeKey               string
	IncludeStackTraceKey     string
	ExposeInternalMessageKey string
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

// WithErrorsFromEnv maps ADMIN_ERROR* environment variables into the admin config.
func WithErrorsFromEnv(opts ...ErrorEnvOption) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		envOpts := mergeErrorEnvOptions(opts...)
		errCfg := cfg.Errors

		if value, ok := envBoolKey(envOpts.DevModeKey); ok {
			errCfg.DevMode = value
		}
		if value, ok := envBoolKey(envOpts.IncludeStackTraceKey); ok {
			errCfg.IncludeStackTrace = value
		}
		if value, ok := envBoolKey(envOpts.ExposeInternalMessageKey); ok {
			errCfg.ExposeInternalMessages = value
		}

		cfg.Errors = errCfg
	}
}

func mergeErrorEnvOptions(opts ...ErrorEnvOption) ErrorEnvOption {
	out := ErrorEnvOption{
		DevModeKey:               "ADMIN_DEV",
		IncludeStackTraceKey:     "ADMIN_ERROR_STACKTRACE",
		ExposeInternalMessageKey: "ADMIN_ERROR_EXPOSE_INTERNAL",
	}
	for _, opt := range opts {
		if key := strings.TrimSpace(opt.DevModeKey); key != "" {
			out.DevModeKey = key
		}
		if key := strings.TrimSpace(opt.IncludeStackTraceKey); key != "" {
			out.IncludeStackTraceKey = key
		}
		if key := strings.TrimSpace(opt.ExposeInternalMessageKey); key != "" {
			out.ExposeInternalMessageKey = key
		}
	}
	return out
}
