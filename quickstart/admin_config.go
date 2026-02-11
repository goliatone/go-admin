package quickstart

import (
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// DefaultNavMenuCode is the quickstart default menu identifier.
const DefaultNavMenuCode = "admin_main"

// AdminConfigOption mutates the base admin config.
type AdminConfigOption func(*admin.Config)

// NewAdminConfig builds a baseline admin config with quickstart defaults.
func NewAdminConfig(basePath, title, defaultLocale string, opts ...AdminConfigOption) admin.Config {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "/admin"
	}
	basePath = normalizeBasePathValue(basePath)
	cfg := admin.Config{
		Title:         strings.TrimSpace(title),
		BasePath:      basePath,
		DefaultLocale: strings.TrimSpace(defaultLocale),
		Theme:         "admin",
		ThemeVariant:  "light",
		NavMenuCode:   DefaultNavMenuCode,
		ThemeTokens:   DefaultThemeTokens(),
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

	if strings.TrimSpace(cfg.Debug.BasePath) == "" {
		cfg.Debug.BasePath = path.Join("/", cfg.BasePath, "debug")
	}

	scopeCfg := ScopeConfigFromAdmin(cfg)
	cfg.ScopeMode = string(scopeCfg.Mode)
	cfg.DefaultTenantID = scopeCfg.DefaultTenantID
	cfg.DefaultOrgID = scopeCfg.DefaultOrgID

	return cfg
}

// DefaultAdminFeatures returns the baseline feature defaults for quickstart.
func DefaultAdminFeatures() map[string]bool {
	return map[string]bool{
		string(admin.FeatureDashboard):           true,
		string(admin.FeatureActivity):            true,
		string(admin.FeaturePreview):             true,
		string(admin.FeatureCMS):                 true,
		string(admin.FeatureCommands):            true,
		string(admin.FeatureSettings):            true,
		string(admin.FeatureSearch):              true,
		string(admin.FeatureNotifications):       true,
		string(admin.FeatureJobs):                true,
		string(admin.FeatureMedia):               true,
		string(admin.FeatureExport):              true,
		string(admin.FeatureBulk):                true,
		string(admin.FeaturePreferences):         true,
		string(admin.FeatureProfile):             true,
		string(admin.FeatureUsers):               true,
		string(admin.FeatureTenants):             false,
		string(admin.FeatureOrganizations):       false,
		string(admin.FeatureTranslationExchange): false,
		string(admin.FeatureTranslationQueue):    false,
	}
}

// DefaultMinimalFeatures returns a Stage 1 friendly feature default set.
func DefaultMinimalFeatures() map[string]bool {
	return map[string]bool{
		string(admin.FeatureDashboard): true,
		string(admin.FeatureCMS):       true,
	}
}

// DefaultThemeTokens returns the baseline theme tokens used by quickstart.
func DefaultThemeTokens() map[string]string {
	return map[string]string{
		"primary": "#2563eb",
		"accent":  "#f59e0b",
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

// WithFeatureCatalogPath sets the feature catalog config file path.
func WithFeatureCatalogPath(path string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.FeatureCatalogPath = strings.TrimSpace(path)
	}
}

// WithScopeConfig applies scope defaults for single/multi tenant behavior.
func WithScopeConfig(scope ScopeConfig) AdminConfigOption {
	return func(cfg *admin.Config) {
		ApplyScopeConfig(cfg, scope)
	}
}

// WithScopeMode sets the scope mode (single or multi).
func WithScopeMode(mode ScopeMode) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.ScopeMode = strings.ToLower(strings.TrimSpace(string(mode)))
	}
}

// WithDefaultScope sets the default tenant/org identifiers for single-tenant mode.
func WithDefaultScope(tenantID, orgID string) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.DefaultTenantID = strings.TrimSpace(tenantID)
		cfg.DefaultOrgID = strings.TrimSpace(orgID)
	}
}

// WithScopeFromEnv applies scope defaults from ADMIN_SCOPE_* env vars.
func WithScopeFromEnv() AdminConfigOption {
	return WithScopeConfig(ScopeConfigFromEnv())
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
