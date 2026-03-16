package config

import (
	"context"
	"fmt"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"
)

// Config defines runtime configuration for the examples/web application.
type Config struct {
	App          AppConfig          `koanf:"app" json:"app" yaml:"app"`
	Server       ServerConfig       `koanf:"server" json:"server" yaml:"server"`
	Admin        AdminConfig        `koanf:"admin" json:"admin" yaml:"admin"`
	Site         SiteConfig         `koanf:"site" json:"site" yaml:"site"`
	Features     FeatureConfig      `koanf:"features" json:"features" yaml:"features"`
	Registration RegistrationConfig `koanf:"registration" json:"registration" yaml:"registration"`
	Navigation   NavigationConfig   `koanf:"navigation" json:"navigation" yaml:"navigation"`
	Seeds        SeedsConfig        `koanf:"seeds" json:"seeds" yaml:"seeds"`
	Databases    DatabasesConfig    `koanf:"databases" json:"databases" yaml:"databases"`
	SecureLink   SecureLinkConfig   `koanf:"securelink" json:"securelink" yaml:"securelink"`
	Translation  TranslationConfig  `koanf:"translation" json:"translation" yaml:"translation"`
	Datagrid     DatagridConfig     `koanf:"datagrid" json:"datagrid" yaml:"datagrid"`
	ExportPDF    ExportPDFConfig    `koanf:"export_pdf" json:"export_pdf" yaml:"export_pdf"`
	Fiber        FiberConfig        `koanf:"fiber" json:"fiber" yaml:"fiber"`
	Auth         AuthConfig         `koanf:"auth" json:"auth" yaml:"auth"`
	CMS          CMSConfig          `koanf:"cms" json:"cms" yaml:"cms"`

	ConfigPath string `koanf:"-" json:"-" yaml:"-"`
}

type AppConfig struct {
	Name string `koanf:"name" json:"name" yaml:"name"`
	Env  string `koanf:"env" json:"env" yaml:"env"`
}

type ServerConfig struct {
	Address string `koanf:"address" json:"address" yaml:"address"`
}

type AdminConfig struct {
	BasePath                    string            `koanf:"base_path" json:"base_path" yaml:"base_path"`
	Title                       string            `koanf:"title" json:"title" yaml:"title"`
	DefaultLocale               string            `koanf:"default_locale" json:"default_locale" yaml:"default_locale"`
	PublicAPI                   bool              `koanf:"public_api" json:"public_api" yaml:"public_api"`
	PreviewSecret               string            `koanf:"preview_secret" json:"preview_secret" yaml:"preview_secret"`
	APIPrefix                   string            `koanf:"api_prefix" json:"api_prefix" yaml:"api_prefix"`
	APIVersion                  string            `koanf:"api_version" json:"api_version" yaml:"api_version"`
	AssetsDir                   string            `koanf:"assets_dir" json:"assets_dir" yaml:"assets_dir"`
	FeatureCatalogPath          string            `koanf:"feature_catalog_path" json:"feature_catalog_path" yaml:"feature_catalog_path"`
	WorkflowConfigPath          string            `koanf:"workflow_config_path" json:"workflow_config_path" yaml:"workflow_config_path"`
	RegisterTemplate            string            `koanf:"register_template" json:"register_template" yaml:"register_template"`
	Preferences                 PreferencesConfig `koanf:"preferences" json:"preferences" yaml:"preferences"`
	Debug                       AdminDebugConfig  `koanf:"debug" json:"debug" yaml:"debug"`
	Errors                      AdminErrorsConfig `koanf:"errors" json:"errors" yaml:"errors"`
	Scope                       AdminScopeConfig  `koanf:"scope" json:"scope" yaml:"scope"`
	AuthzPreflight              AdminAuthzConfig  `koanf:"authz_preflight" json:"authz_preflight" yaml:"authz_preflight"`
	PermissionResolverCacheTTL  time.Duration     `koanf:"permission_resolver_cache_ttl" json:"permission_resolver_cache_ttl" yaml:"permission_resolver_cache_ttl"`
	PasswordPolicyHints         []string          `koanf:"password_policy_hints" json:"password_policy_hints" yaml:"password_policy_hints"`
	DatagridURLStateEnableToken *bool             `koanf:"datagrid_url_enable_state_token" json:"datagrid_url_enable_state_token" yaml:"datagrid_url_enable_state_token"`
}

type PreferencesConfig struct {
	SchemaPath string `koanf:"schema_path" json:"schema_path" yaml:"schema_path"`
	JSONStrict bool   `koanf:"json_strict" json:"json_strict" yaml:"json_strict"`
}

type AdminDebugConfig struct {
	Enabled          bool   `koanf:"enabled" json:"enabled" yaml:"enabled"`
	EnableSlog       bool   `koanf:"enable_slog" json:"enable_slog" yaml:"enable_slog"`
	Layout           string `koanf:"layout" json:"layout" yaml:"layout"`
	ReplEnabled      bool   `koanf:"repl_enabled" json:"repl_enabled" yaml:"repl_enabled"`
	ReplReadOnly     bool   `koanf:"repl_read_only" json:"repl_read_only" yaml:"repl_read_only"`
	ScopeEnabled     bool   `koanf:"scope_enabled" json:"scope_enabled" yaml:"scope_enabled"`
	ScopeLimit       int    `koanf:"scope_limit" json:"scope_limit" yaml:"scope_limit"`
	DoctorEnabled    *bool  `koanf:"doctor_enabled" json:"doctor_enabled" yaml:"doctor_enabled"`
	NavigationStrict bool   `koanf:"navigation_integrity_strict" json:"navigation_integrity_strict" yaml:"navigation_integrity_strict"`
}

type AdminErrorsConfig struct {
	DevMode              bool `koanf:"dev_mode" json:"dev_mode" yaml:"dev_mode"`
	IncludeStackTrace    bool `koanf:"include_stack_trace" json:"include_stack_trace" yaml:"include_stack_trace"`
	ExposeInternalErrors bool `koanf:"expose_internal_errors" json:"expose_internal_errors" yaml:"expose_internal_errors"`
}

type AdminScopeConfig struct {
	Mode            string `koanf:"mode" json:"mode" yaml:"mode"`
	DefaultTenantID string `koanf:"default_tenant_id" json:"default_tenant_id" yaml:"default_tenant_id"`
	DefaultOrgID    string `koanf:"default_org_id" json:"default_org_id" yaml:"default_org_id"`
}

type AdminAuthzConfig struct {
	Mode  string   `koanf:"mode" json:"mode" yaml:"mode"`
	Roles []string `koanf:"roles" json:"roles" yaml:"roles"`
}

type SiteConfig struct {
	BasePath                 string   `koanf:"base_path" json:"base_path" yaml:"base_path"`
	RuntimeEnv               string   `koanf:"runtime_env" json:"runtime_env" yaml:"runtime_env"`
	ContentChannel           string   `koanf:"content_channel" json:"content_channel" yaml:"content_channel"`
	SupportedLocales         []string `koanf:"supported_locales" json:"supported_locales" yaml:"supported_locales"`
	LocalePrefixMode         string   `koanf:"locale_prefix_mode" json:"locale_prefix_mode" yaml:"locale_prefix_mode"`
	AllowLocaleFallback      bool     `koanf:"allow_locale_fallback" json:"allow_locale_fallback" yaml:"allow_locale_fallback"`
	ContributionLocalePolicy string   `koanf:"contribution_locale_policy" json:"contribution_locale_policy" yaml:"contribution_locale_policy"`
	EnableGeneratedFallback  bool     `koanf:"enable_generated_fallback" json:"enable_generated_fallback" yaml:"enable_generated_fallback"`
	EnableSearch             bool     `koanf:"enable_search" json:"enable_search" yaml:"enable_search"`
	EnableCanonicalRedirect  bool     `koanf:"enable_canonical_redirect" json:"enable_canonical_redirect" yaml:"enable_canonical_redirect"`
	CanonicalRedirectMode    string   `koanf:"canonical_redirect_mode" json:"canonical_redirect_mode" yaml:"canonical_redirect_mode"`
	StrictLocalizedPaths     bool     `koanf:"strict_localized_paths" json:"strict_localized_paths" yaml:"strict_localized_paths"`
	EnvironmentStrict        bool     `koanf:"environment_strict" json:"environment_strict" yaml:"environment_strict"`
	Theme                    string   `koanf:"theme" json:"theme" yaml:"theme"`
	ThemeVariant             string   `koanf:"theme_variant" json:"theme_variant" yaml:"theme_variant"`
}

type FeatureConfig struct {
	PersistentCMS    bool `koanf:"persistent_cms" json:"persistent_cms" yaml:"persistent_cms"`
	GoOptions        bool `koanf:"go_options" json:"go_options" yaml:"go_options"`
	GoUsersActivity  bool `koanf:"go_users_activity" json:"go_users_activity" yaml:"go_users_activity"`
	UserInvites      bool `koanf:"user_invites" json:"user_invites" yaml:"user_invites"`
	PasswordReset    bool `koanf:"password_reset" json:"password_reset" yaml:"password_reset"`
	SelfRegistration bool `koanf:"self_registration" json:"self_registration" yaml:"self_registration"`
}

type RegistrationConfig struct {
	Mode      string   `koanf:"mode" json:"mode" yaml:"mode"`
	Allowlist []string `koanf:"allowlist" json:"allowlist" yaml:"allowlist"`
}

type NavigationConfig struct {
	ResetMenu       bool `koanf:"reset_menu" json:"reset_menu" yaml:"reset_menu"`
	Debug           bool `koanf:"debug" json:"debug" yaml:"debug"`
	DebugLog        bool `koanf:"debug_log" json:"debug_log" yaml:"debug_log"`
	IntegrityStrict bool `koanf:"integrity_strict" json:"integrity_strict" yaml:"integrity_strict"`
}

type SeedsConfig struct {
	Enabled          bool `koanf:"enabled" json:"enabled" yaml:"enabled"`
	Truncate         bool `koanf:"truncate" json:"truncate" yaml:"truncate"`
	IgnoreDuplicates bool `koanf:"ignore_duplicates" json:"ignore_duplicates" yaml:"ignore_duplicates"`
}

type DatabasesConfig struct {
	CMSDSN     string `koanf:"cms_dsn" json:"cms_dsn" yaml:"cms_dsn"`
	ContentDSN string `koanf:"content_dsn" json:"content_dsn" yaml:"content_dsn"`
}

type SecureLinkConfig struct {
	BaseURL    string        `koanf:"base_url" json:"base_url" yaml:"base_url"`
	SigningKey string        `koanf:"signing_key" json:"signing_key" yaml:"signing_key"`
	QueryKey   string        `koanf:"query_key" json:"query_key" yaml:"query_key"`
	AsQuery    bool          `koanf:"as_query" json:"as_query" yaml:"as_query"`
	Expiration time.Duration `koanf:"expiration" json:"expiration" yaml:"expiration"`
}

type TranslationConfig struct {
	Profile  string `koanf:"profile" json:"profile" yaml:"profile"`
	Exchange *bool  `koanf:"exchange" json:"exchange" yaml:"exchange"`
	Queue    *bool  `koanf:"queue" json:"queue" yaml:"queue"`
}

type DatagridConfig struct {
	StateStoreMode      string `koanf:"state_store_mode" json:"state_store_mode" yaml:"state_store_mode"`
	SyncDebounceMS      int    `koanf:"sync_debounce_ms" json:"sync_debounce_ms" yaml:"sync_debounce_ms"`
	MaxShareEntries     int    `koanf:"max_share_entries" json:"max_share_entries" yaml:"max_share_entries"`
	URLMaxLength        int    `koanf:"url_max_length" json:"url_max_length" yaml:"url_max_length"`
	URLMaxFiltersLength int    `koanf:"url_max_filters_length" json:"url_max_filters_length" yaml:"url_max_filters_length"`
	URLEnableStateToken *bool  `koanf:"url_enable_state_token" json:"url_enable_state_token" yaml:"url_enable_state_token"`
}

type ExportPDFConfig struct {
	Engine            string        `koanf:"engine" json:"engine" yaml:"engine"`
	WKHTMLToPDFPath   string        `koanf:"wkhtmltopdf_path" json:"wkhtmltopdf_path" yaml:"wkhtmltopdf_path"`
	BrowserPath       string        `koanf:"browser_path" json:"browser_path" yaml:"browser_path"`
	Timeout           time.Duration `koanf:"timeout" json:"timeout" yaml:"timeout"`
	PageSize          string        `koanf:"page_size" json:"page_size" yaml:"page_size"`
	PrintBackground   bool          `koanf:"print_background" json:"print_background" yaml:"print_background"`
	PreferCSSPageSize bool          `koanf:"prefer_css_page_size" json:"prefer_css_page_size" yaml:"prefer_css_page_size"`
	Headless          bool          `koanf:"headless" json:"headless" yaml:"headless"`
	Args              []string      `koanf:"args" json:"args" yaml:"args"`
}

type FiberConfig struct {
	StrictRoutes        bool   `koanf:"strict_routes" json:"strict_routes" yaml:"strict_routes"`
	RouteConflictPolicy string `koanf:"route_conflict_policy" json:"route_conflict_policy" yaml:"route_conflict_policy"`
	PathConflictMode    string `koanf:"path_conflict_mode" json:"path_conflict_mode" yaml:"path_conflict_mode"`
	ReadBufferSize      int    `koanf:"read_buffer_size" json:"read_buffer_size" yaml:"read_buffer_size"`
}

type AuthConfig struct {
	Debug          bool `koanf:"debug" json:"debug" yaml:"debug"`
	ResolverStrict bool `koanf:"resolver_strict" json:"resolver_strict" yaml:"resolver_strict"`
}

type CMSConfig struct {
	RuntimeLogs *bool `koanf:"runtime_logs" json:"runtime_logs" yaml:"runtime_logs"`
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.App.Name) == "" {
		return fmt.Errorf("app.name is required")
	}
	if strings.TrimSpace(c.App.Env) == "" {
		return fmt.Errorf("app.env is required")
	}
	if strings.TrimSpace(c.Server.Address) == "" {
		return fmt.Errorf("server.address is required")
	}
	if strings.TrimSpace(c.Admin.BasePath) == "" {
		return fmt.Errorf("admin.base_path is required")
	}
	if strings.TrimSpace(c.Admin.Title) == "" {
		return fmt.Errorf("admin.title is required")
	}
	if strings.TrimSpace(c.Admin.DefaultLocale) == "" {
		return fmt.Errorf("admin.default_locale is required")
	}
	if strings.TrimSpace(c.Site.RuntimeEnv) == "" {
		return fmt.Errorf("site.runtime_env is required")
	}
	if strings.TrimSpace(c.Site.ContentChannel) == "" {
		return fmt.Errorf("site.content_channel is required")
	}
	if strings.TrimSpace(c.SecureLink.BaseURL) == "" {
		return fmt.Errorf("securelink.base_url is required")
	}
	if strings.TrimSpace(c.SecureLink.QueryKey) == "" {
		return fmt.Errorf("securelink.query_key is required")
	}
	if c.SecureLink.Expiration <= 0 {
		return fmt.Errorf("securelink.expiration must be greater than zero")
	}
	if c.Admin.Debug.ScopeLimit <= 0 {
		return fmt.Errorf("admin.debug.scope_limit must be greater than zero")
	}
	if c.Admin.PermissionResolverCacheTTL < 0 {
		return fmt.Errorf("admin.permission_resolver_cache_ttl cannot be negative")
	}
	if c.ExportPDF.Timeout <= 0 {
		return fmt.Errorf("export_pdf.timeout must be greater than zero")
	}
	if c.Fiber.ReadBufferSize <= 0 {
		return fmt.Errorf("fiber.read_buffer_size must be greater than zero")
	}
	return nil
}

func Defaults() *Config {
	return &Config{
		App: AppConfig{
			Name: "go-admin web",
			Env:  "development",
		},
		Server: ServerConfig{
			Address: ":8080",
		},
		Admin: AdminConfig{
			BasePath:           "/admin",
			Title:              "Enterprise Admin",
			DefaultLocale:      "en",
			PublicAPI:          true,
			APIPrefix:          "api",
			APIVersion:         "",
			RegisterTemplate:   "register",
			FeatureCatalogPath: "feature_catalog.yaml",
			WorkflowConfigPath: "workflow_config.yaml",
			Preferences: PreferencesConfig{
				SchemaPath: "",
				JSONStrict: false,
			},
			Debug: AdminDebugConfig{
				Enabled:          true,
				EnableSlog:       true,
				Layout:           "admin",
				ReplEnabled:      true,
				ReplReadOnly:     false,
				ScopeEnabled:     true,
				ScopeLimit:       200,
				NavigationStrict: false,
			},
			Errors: AdminErrorsConfig{
				DevMode:              true,
				IncludeStackTrace:    true,
				ExposeInternalErrors: true,
			},
			Scope: AdminScopeConfig{
				Mode:            "single",
				DefaultTenantID: "11111111-1111-1111-1111-111111111111",
				DefaultOrgID:    "22222222-2222-2222-2222-222222222222",
			},
			AuthzPreflight: AdminAuthzConfig{
				Mode:  "warn",
				Roles: []string{"superadmin", "owner"},
			},
			PermissionResolverCacheTTL: 30 * time.Second,
			PasswordPolicyHints: []string{
				"Use at least 8 characters",
				"Mix letters, numbers, and symbols",
				"Avoid reused passwords",
			},
		},
		Site: SiteConfig{
			BasePath:                 "/",
			RuntimeEnv:               "dev",
			ContentChannel:           "default",
			SupportedLocales:         []string{"en", "es", "fr"},
			LocalePrefixMode:         "non_default",
			AllowLocaleFallback:      true,
			ContributionLocalePolicy: "fallback",
			EnableGeneratedFallback:  false,
			EnableSearch:             true,
			EnableCanonicalRedirect:  true,
			CanonicalRedirectMode:    "requested_locale_sticky",
			StrictLocalizedPaths:     false,
			EnvironmentStrict:        false,
			Theme:                    "",
			ThemeVariant:             "",
		},
		Features: FeatureConfig{
			PersistentCMS:    true,
			GoOptions:        false,
			GoUsersActivity:  false,
			UserInvites:      true,
			PasswordReset:    true,
			SelfRegistration: false,
		},
		Registration: RegistrationConfig{
			Mode:      "closed",
			Allowlist: []string{"example.com"},
		},
		Navigation: NavigationConfig{
			ResetMenu:       true,
			Debug:           false,
			DebugLog:        false,
			IntegrityStrict: false,
		},
		Seeds: SeedsConfig{
			Enabled:          true,
			Truncate:         false,
			IgnoreDuplicates: true,
		},
		Databases: DatabasesConfig{},
		SecureLink: SecureLinkConfig{
			BaseURL:    "http://localhost:8080",
			SigningKey: "admin-demo-securelink-signing-key-change-me",
			QueryKey:   "token",
			AsQuery:    true,
			Expiration: 72 * time.Hour,
		},
		Translation: TranslationConfig{
			Profile: "full",
		},
		Datagrid: DatagridConfig{},
		ExportPDF: ExportPDFConfig{
			Engine:            "chromium",
			Timeout:           30 * time.Second,
			PrintBackground:   true,
			PreferCSSPageSize: true,
			Headless:          true,
			Args:              []string{"--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"},
		},
		Fiber: FiberConfig{
			StrictRoutes:        true,
			RouteConflictPolicy: "log_and_continue",
			PathConflictMode:    "prefer_static",
			ReadBufferSize:      16 * 1024,
		},
		Auth: AuthConfig{
			Debug:          false,
			ResolverStrict: false,
		},
		CMS: CMSConfig{},
	}
}

// Load resolves config from defaults, optional files, and environment overrides.
func Load(ctx context.Context, paths ...string) (*Config, *goconfig.Container[*Config], error) {
	cfg := Defaults()

	resolvedPaths := paths
	if len(resolvedPaths) == 0 {
		resolvedPaths = []string{resolveDefaultConfigPath()}
	}

	container := goconfig.New(cfg)
	providers := []goconfig.ProviderBuilder[*Config]{
		goconfig.StructProvider[*Config](cfg),
	}
	for i, p := range resolvedPaths {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" {
			continue
		}
		providers = append(providers,
			goconfig.OptionalProvider(
				goconfig.FileProvider[*Config](trimmed, int(goconfig.PriorityConfig.WithOffset(i))),
			),
		)
	}
	providers = append(providers, goconfig.EnvProvider[*Config](DefaultEnvPrefix, DefaultEnvDelimiter))
	container.WithProvider(providers...)

	if err := container.Load(ctx); err != nil {
		return nil, container, err
	}

	loaded := container.Raw()
	if loaded == nil {
		return nil, container, fmt.Errorf("loaded config is nil")
	}
	if len(resolvedPaths) > 0 {
		loaded.ConfigPath = strings.TrimSpace(resolvedPaths[0])
	}
	return loaded, container, nil
}

func resolveDefaultConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/web/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}
