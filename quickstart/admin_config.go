package quickstart

import (
	"os"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// DefaultNavMenuCode is the quickstart default menu identifier.
const DefaultNavMenuCode = "admin_main"

// AdminConfigOption mutates the base admin config.
type AdminConfigOption func(*admin.Config)

// EnvFlagOverride maps an environment variable to a config FeatureFlags key.
type EnvFlagOverride struct {
	Env string
	Key string
}

// NewAdminConfig builds a baseline admin config with quickstart defaults.
func NewAdminConfig(basePath, title, defaultLocale string, opts ...AdminConfigOption) admin.Config {
	cfg := admin.Config{
		Title:         strings.TrimSpace(title),
		BasePath:      normalizeBasePath(basePath),
		DefaultLocale: strings.TrimSpace(defaultLocale),
		Theme:         "admin",
		ThemeVariant:  "light",
		NavMenuCode:   DefaultNavMenuCode,
		ThemeTokens:   DefaultThemeTokens(),
		Features:      DefaultAdminFeatures(),
		FeatureFlags:  map[string]bool{},
	}

	if cfg.Title == "" {
		cfg.Title = "Admin"
	}
	if cfg.DefaultLocale == "" {
		cfg.DefaultLocale = "en"
	}

	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}

	return cfg
}

// DefaultAdminFeatures returns the baseline feature set for quickstart.
func DefaultAdminFeatures() admin.Features {
	return admin.Features{
		Dashboard:     true,
		CMS:           true,
		Commands:      true,
		Settings:      true,
		Search:        true,
		Notifications: true,
		Jobs:          true,
		Media:         true,
		Export:        true,
		Bulk:          true,
		Preferences:   true,
		Profile:       true,
		Users:         true,
		Tenants:       true,
		Organizations: true,
	}
}

// DefaultMinimalFeatures returns a Stage 1 friendly feature set.
func DefaultMinimalFeatures() admin.Features {
	return admin.Features{
		Dashboard: true,
		CMS:       true,
	}
}

// DefaultThemeTokens returns the baseline theme tokens used by quickstart.
func DefaultThemeTokens() map[string]string {
	return map[string]string{
		"primary": "#2563eb",
		"accent":  "#f59e0b",
	}
}

// WithFeatures replaces the default feature set.
func WithFeatures(features admin.Features) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.Features = features
	}
}

// WithFeaturesExplicit replaces the defaults and clears existing feature flags.
func WithFeaturesExplicit(features admin.Features) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.Features = features
		cfg.FeatureFlags = map[string]bool{}
	}
}

// WithFeatureFlags merges the provided flag overrides.
func WithFeatureFlags(flags map[string]bool) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil || len(flags) == 0 {
			return
		}
		if cfg.FeatureFlags == nil {
			cfg.FeatureFlags = map[string]bool{}
		}
		for key, value := range flags {
			cfg.FeatureFlags[key] = value
		}
	}
}

// WithFeatureFlag sets a single feature flag.
func WithFeatureFlag(key string, enabled bool) AdminConfigOption {
	return WithFeatureFlags(map[string]bool{key: enabled})
}

// WithFeatureFlagsFromEnv overrides feature flags when env vars are present.
func WithFeatureFlagsFromEnv(overrides ...EnvFlagOverride) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil || len(overrides) == 0 {
			return
		}
		if cfg.FeatureFlags == nil {
			cfg.FeatureFlags = map[string]bool{}
		}
		for _, override := range overrides {
			if strings.TrimSpace(override.Env) == "" || strings.TrimSpace(override.Key) == "" {
				continue
			}
			if value, ok := envBool(override.Env); ok {
				cfg.FeatureFlags[override.Key] = value
			}
		}
	}
}

// WithTheme overrides the base theme name/variant.
func WithTheme(name, variant string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		if strings.TrimSpace(name) != "" {
			cfg.Theme = strings.TrimSpace(name)
		}
		if strings.TrimSpace(variant) != "" {
			cfg.ThemeVariant = strings.TrimSpace(variant)
		}
	}
}

// WithThemeTokens merges custom theme tokens.
func WithThemeTokens(tokens map[string]string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil || len(tokens) == 0 {
			return
		}
		if cfg.ThemeTokens == nil {
			cfg.ThemeTokens = map[string]string{}
		}
		for key, value := range tokens {
			cfg.ThemeTokens[key] = value
		}
	}
}

// WithNavMenuCode overrides the default navigation menu code.
func WithNavMenuCode(code string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		code = strings.TrimSpace(code)
		if code != "" {
			cfg.NavMenuCode = code
		}
	}
}

// WithThemeAssetPrefix sets a default asset prefix used by themes.
func WithThemeAssetPrefix(prefix string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.ThemeAssetPrefix = strings.TrimSpace(prefix)
	}
}

func normalizeBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return "/admin"
	}
	return "/" + strings.Trim(trimmed, "/")
}

func envBool(key string) (bool, bool) {
	value, ok := os.LookupEnv(key)
	if !ok {
		return false, false
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return false, false
	}
	return parsed, true
}
