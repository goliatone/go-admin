package quickstart

import (
	"context"
	"errors"
	"fmt"

	"github.com/goliatone/go-admin/admin"
)

var ErrPersistentCMSSetupFailed = errors.New("quickstart: persistent CMS setup failed")

// AdapterFlags captures adapter switches (config or env).
type AdapterFlags struct {
	UsePersistentCMS   bool `json:"use_persistent_cms"`
	UseGoOptions       bool `json:"use_go_options"`
	UseGoUsersActivity bool `json:"use_go_users_activity"`
}

// AdapterHooks supplies host-specific builders for optional adapters.
type AdapterHooks struct {
	// PersistentCMS should build CMSOptions when persistent storage is desired.
	// Return backend label (for logging) alongside options.
	PersistentCMS func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error) `json:"persistent_cms"`
	// GoOptions should swap settings to go-options backend.
	GoOptions func(adm *admin.Admin) (string, error) `json:"go_options"`
	// GoUsersActivity should build an activity sink backed by go-users (or nil).
	GoUsersActivity func() admin.ActivitySink `json:"go_users_activity"`
}

// AdapterResult describes applied adapters/backends.
type AdapterResult struct {
	Flags              AdapterFlags       `json:"flags"`
	CMSBackend         string             `json:"cms_backend"`
	SettingsBackend    string             `json:"settings_backend"`
	ActivityBackend    string             `json:"activity_backend"`
	ActivitySink       admin.ActivitySink `json:"activity_sink"`
	PersistentCMSSet   bool               `json:"persistent_cms_set"`
	PersistentCMSError error              `json:"persistent_cms_error"`
	Config             admin.Config       `json:"config"`
}

// ConfigureAdapters mutates the admin config (CMS) using explicit defaults and
// available hooks.
func ConfigureAdapters(ctx context.Context, cfg admin.Config, hooks AdapterHooks) (admin.Config, AdapterResult) {
	return configureAdaptersWithFlagsLogger(ctx, cfg, hooks, AdapterFlags{}, nil)
}

// ConfigureAdaptersWithFlags mutates the admin config (CMS) based on supplied flags.
func ConfigureAdaptersWithFlags(ctx context.Context, cfg admin.Config, hooks AdapterHooks, flags AdapterFlags) (admin.Config, AdapterResult) {
	return configureAdaptersWithFlagsLogger(ctx, cfg, hooks, flags, nil)
}

func configureAdaptersWithFlagsLogger(ctx context.Context, cfg admin.Config, hooks AdapterHooks, flags AdapterFlags, logger admin.Logger) (admin.Config, AdapterResult) {
	logger = ensureQuickstartLogger(logger)
	result := AdapterResult{
		Flags:           flags,
		CMSBackend:      "in-memory CMS",
		SettingsBackend: "in-memory settings",
		ActivityBackend: "in-memory activity feed",
	}
	if flags.UsePersistentCMS {
		if hooks.PersistentCMS == nil {
			result.PersistentCMSError = errors.Join(
				ErrPersistentCMSSetupFailed,
				fmt.Errorf("persistent CMS setup hook is not configured"),
			)
			logger.Warn("persistent CMS requested but setup hook is not configured",
				"default_locale", cfg.DefaultLocale,
			)
		} else {
			opts, backend, err := hooks.PersistentCMS(ctx, cfg.DefaultLocale)
			if err == nil && opts.Container != nil {
				cfg.CMS = opts
				result.CMSBackend = backend
				result.PersistentCMSSet = true
			} else if err != nil {
				result.PersistentCMSError = errors.Join(ErrPersistentCMSSetupFailed, err)
				logger.Warn("persistent CMS requested but setup failed",
					"error", err,
					"default_locale", cfg.DefaultLocale,
				)
			} else {
				result.PersistentCMSError = errors.Join(
					ErrPersistentCMSSetupFailed,
					fmt.Errorf("persistent CMS setup returned nil container"),
				)
				logger.Warn("persistent CMS requested but setup returned nil container",
					"default_locale", cfg.DefaultLocale,
				)
			}
		}
	}
	result.Config = cfg
	return cfg, result
}

// ApplyAdapterIntegrations wires optional adapters post-admin initialization.
func ApplyAdapterIntegrations(adm *admin.Admin, result *AdapterResult, hooks AdapterHooks) {
	if adm == nil || result == nil {
		return
	}
	if result.Flags.UseGoUsersActivity && hooks.GoUsersActivity != nil {
		if sink := hooks.GoUsersActivity(); sink != nil {
			adm.WithActivitySink(sink)
			result.ActivitySink = sink
			result.ActivityBackend = "go-users activity sink"
		}
	}
	if result.Flags.UseGoOptions && hooks.GoOptions != nil {
		if backend, err := hooks.GoOptions(adm); err == nil && backend != "" {
			result.SettingsBackend = backend
		}
	}
}
