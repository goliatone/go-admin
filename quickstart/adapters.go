package quickstart

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// AdapterFlags captures env-driven adapter switches.
type AdapterFlags struct {
	UsePersistentCMS   bool
	UseGoOptions       bool
	UseGoUsersActivity bool
}

// AdapterHooks supplies host-specific builders for optional adapters.
type AdapterHooks struct {
	// PersistentCMS should build CMSOptions when persistent storage is desired.
	// Return backend label (for logging) alongside options.
	PersistentCMS func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error)
	// GoOptions should swap settings to go-options backend.
	GoOptions func(adm *admin.Admin) (string, error)
	// GoUsersActivity should build an activity sink backed by go-users (or nil).
	GoUsersActivity func() admin.ActivitySink
}

// AdapterResult describes applied adapters/backends.
type AdapterResult struct {
	Flags            AdapterFlags
	CMSBackend       string
	SettingsBackend  string
	ActivityBackend  string
	ActivitySink     admin.ActivitySink
	PersistentCMSSet bool
}

// ResolveAdapterFlags reads environment toggles.
func ResolveAdapterFlags() AdapterFlags {
	return AdapterFlags{
		UsePersistentCMS:   strings.EqualFold(os.Getenv("USE_PERSISTENT_CMS"), "true"),
		UseGoOptions:       strings.EqualFold(os.Getenv("USE_GO_OPTIONS"), "true"),
		UseGoUsersActivity: strings.EqualFold(os.Getenv("USE_GO_USERS_ACTIVITY"), "true"),
	}
}

// ConfigureAdapters mutates the admin config (CMS) based on env flags and available hooks.
func ConfigureAdapters(ctx context.Context, cfg admin.Config, hooks AdapterHooks) (admin.Config, AdapterResult) {
	flags := ResolveAdapterFlags()
	result := AdapterResult{
		Flags:           flags,
		CMSBackend:      "in-memory CMS",
		SettingsBackend: "in-memory settings",
		ActivityBackend: "in-memory activity feed",
	}
	if flags.UsePersistentCMS && hooks.PersistentCMS != nil {
		if opts, backend, err := hooks.PersistentCMS(ctx, cfg.DefaultLocale); err == nil && opts.Container != nil {
			cfg.CMS = opts
			result.CMSBackend = backend
			result.PersistentCMSSet = true
		} else if err != nil {
			log.Printf("warning: persistent CMS requested but setup failed: %v", err)
		}
	}
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
