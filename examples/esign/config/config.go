package config

import (
	"context"
	"fmt"
	"net"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"

	RepositoryDialectSQLite   = "sqlite"
	RepositoryDialectPostgres = "postgres"

	defaultMigrationsLocalDir = "data/sql/migrations"
	defaultSQLiteDSN          = "file:data/go-admin-esign.sqlite?_busy_timeout=5000&_foreign_keys=on"
)

// Config defines runtime configuration for the e-sign example application.
type Config struct {
	App        AppConfig        `koanf:"app" json:"app" yaml:"app"`
	Server     ServerConfig     `koanf:"server" json:"server" yaml:"server"`
	Admin      AdminConfig      `koanf:"admin" json:"admin" yaml:"admin"`
	Auth       AuthConfig       `koanf:"auth" json:"auth" yaml:"auth"`
	Features   FeatureConfig    `koanf:"features" json:"features" yaml:"features"`
	Runtime    RuntimeConfig    `koanf:"runtime" json:"runtime" yaml:"runtime"`
	Storage    StorageConfig    `koanf:"storage" json:"storage" yaml:"storage"`
	Email      EmailConfig      `koanf:"email" json:"email" yaml:"email"`
	Signer     SignerConfig     `koanf:"signer" json:"signer" yaml:"signer"`
	Services   ServicesConfig   `koanf:"services" json:"services" yaml:"services"`
	Google     GoogleConfig     `koanf:"google" json:"google" yaml:"google"`
	Public     PublicConfig     `koanf:"public" json:"public" yaml:"public"`
	Databases  DatabasesConfig  `koanf:"databases" json:"databases" yaml:"databases"`
	SQLite     SQLiteConfig     `koanf:"sqlite" json:"sqlite" yaml:"sqlite"`
	Postgres   PostgresConfig   `koanf:"postgres" json:"postgres" yaml:"postgres"`
	Migrations MigrationsConfig `koanf:"migrations" json:"migrations" yaml:"migrations"`
	Network    NetworkConfig    `koanf:"network" json:"network" yaml:"network"`

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
	BasePath      string           `koanf:"base_path" json:"base_path" yaml:"base_path"`
	Title         string           `koanf:"title" json:"title" yaml:"title"`
	DefaultLocale string           `koanf:"default_locale" json:"default_locale" yaml:"default_locale"`
	PublicAPI     bool             `koanf:"public_api" json:"public_api" yaml:"public_api"`
	APIPrefix     string           `koanf:"api_prefix" json:"api_prefix" yaml:"api_prefix"`
	APIVersion    string           `koanf:"api_version" json:"api_version" yaml:"api_version"`
	Debug         AdminDebugConfig `koanf:"debug" json:"debug" yaml:"debug"`
}

type AdminDebugConfig struct {
	EnableSlog bool `koanf:"enable_slog" json:"enable_slog" yaml:"enable_slog"`
}

type AuthConfig struct {
	AdminID       string `koanf:"admin_id" json:"admin_id" yaml:"admin_id"`
	AdminEmail    string `koanf:"admin_email" json:"admin_email" yaml:"admin_email"`
	AdminRole     string `koanf:"admin_role" json:"admin_role" yaml:"admin_role"`
	AdminPassword string `koanf:"admin_password" json:"admin_password" yaml:"admin_password"`
	SigningKey    string `koanf:"signing_key" json:"signing_key" yaml:"signing_key"`
	ContextKey    string `koanf:"context_key" json:"context_key" yaml:"context_key"`
	SeedFile      string `koanf:"seed_file" json:"seed_file" yaml:"seed_file"`
}

type FeatureConfig struct {
	ESign       bool `koanf:"esign" json:"esign" yaml:"esign"`
	ESignGoogle bool `koanf:"esign_google" json:"esign_google" yaml:"esign_google"`
	Activity    bool `koanf:"activity" json:"activity" yaml:"activity"`
}

type RuntimeConfig struct {
	Profile           string `koanf:"profile" json:"profile" yaml:"profile"`
	StartupPolicy     string `koanf:"startup_policy" json:"startup_policy" yaml:"startup_policy"`
	StrictStartup     bool   `koanf:"strict_startup" json:"strict_startup" yaml:"strict_startup"`
	RepositoryDialect string `koanf:"repository_dialect" json:"repository_dialect" yaml:"repository_dialect"`
}

type StorageConfig struct {
	EncryptionAlgorithm string `koanf:"encryption_algorithm" json:"encryption_algorithm" yaml:"encryption_algorithm"`
}

type EmailConfig struct {
	Transport string          `koanf:"transport" json:"transport" yaml:"transport"`
	SMTP      EmailSMTPConfig `koanf:"smtp" json:"smtp" yaml:"smtp"`
}

type EmailSMTPConfig struct {
	Host            string `koanf:"host" json:"host" yaml:"host"`
	Port            int    `koanf:"port" json:"port" yaml:"port"`
	Username        string `koanf:"username" json:"username" yaml:"username"`
	Password        string `koanf:"password" json:"password" yaml:"password"`
	FromName        string `koanf:"from_name" json:"from_name" yaml:"from_name"`
	FromAddress     string `koanf:"from_address" json:"from_address" yaml:"from_address"`
	TimeoutSeconds  int    `koanf:"timeout_seconds" json:"timeout_seconds" yaml:"timeout_seconds"`
	DisableSTARTTLS bool   `koanf:"disable_starttls" json:"disable_starttls" yaml:"disable_starttls"`
	InsecureTLS     bool   `koanf:"insecure_tls" json:"insecure_tls" yaml:"insecure_tls"`
}

type SignerConfig struct {
	UploadSigningKey             string          `koanf:"upload_signing_key" json:"upload_signing_key" yaml:"upload_signing_key"`
	UploadTTLSeconds             int             `koanf:"upload_ttl_seconds" json:"upload_ttl_seconds" yaml:"upload_ttl_seconds"`
	ProfileTTLDays               int             `koanf:"profile_ttl_days" json:"profile_ttl_days" yaml:"profile_ttl_days"`
	ProfilePersistDrawnSignature bool            `koanf:"profile_persist_drawn_signature" json:"profile_persist_drawn_signature" yaml:"profile_persist_drawn_signature"`
	ProfileMode                  string          `koanf:"profile_mode" json:"profile_mode" yaml:"profile_mode"`
	SavedSignaturesLimitPerType  int             `koanf:"saved_signatures_limit_per_type" json:"saved_signatures_limit_per_type" yaml:"saved_signatures_limit_per_type"`
	PDF                          SignerPDFConfig `koanf:"pdf" json:"pdf" yaml:"pdf"`
}

type SignerPDFConfig struct {
	MaxSourceBytes         int64  `koanf:"max_source_bytes" json:"max_source_bytes" yaml:"max_source_bytes"`
	MaxPages               int    `koanf:"max_pages" json:"max_pages" yaml:"max_pages"`
	MaxObjects             int    `koanf:"max_objects" json:"max_objects" yaml:"max_objects"`
	MaxDecompressedBytes   int64  `koanf:"max_decompressed_bytes" json:"max_decompressed_bytes" yaml:"max_decompressed_bytes"`
	ParseTimeoutMS         int    `koanf:"parse_timeout_ms" json:"parse_timeout_ms" yaml:"parse_timeout_ms"`
	NormalizationTimeoutMS int    `koanf:"normalization_timeout_ms" json:"normalization_timeout_ms" yaml:"normalization_timeout_ms"`
	AllowEncrypted         bool   `koanf:"allow_encrypted" json:"allow_encrypted" yaml:"allow_encrypted"`
	AllowJavaScriptActions bool   `koanf:"allow_javascript_actions" json:"allow_javascript_actions" yaml:"allow_javascript_actions"`
	CompatibilityMode      string `koanf:"compatibility_mode" json:"compatibility_mode" yaml:"compatibility_mode"`
	PreviewFallbackEnabled bool   `koanf:"preview_fallback_enabled" json:"preview_fallback_enabled" yaml:"preview_fallback_enabled"`
	PipelineMode           string `koanf:"pipeline_mode" json:"pipeline_mode" yaml:"pipeline_mode"`
}

type ServicesConfig struct {
	ModuleEnabled         bool   `koanf:"module_enabled" json:"module_enabled" yaml:"module_enabled"`
	EncryptionKey         string `koanf:"encryption_key" json:"encryption_key" yaml:"encryption_key"`
	CallbackPublicBaseURL string `koanf:"callback_public_base_url" json:"callback_public_base_url" yaml:"callback_public_base_url"`
}

type GoogleConfig struct {
	ProviderMode          string `koanf:"provider_mode" json:"provider_mode" yaml:"provider_mode"`
	ClientID              string `koanf:"client_id" json:"client_id" yaml:"client_id"`
	ClientSecret          string `koanf:"client_secret" json:"client_secret" yaml:"client_secret"`
	OAuthRedirectURI      string `koanf:"oauth_redirect_uri" json:"oauth_redirect_uri" yaml:"oauth_redirect_uri"`
	TokenEndpoint         string `koanf:"token_endpoint" json:"token_endpoint" yaml:"token_endpoint"`
	RevokeEndpoint        string `koanf:"revoke_endpoint" json:"revoke_endpoint" yaml:"revoke_endpoint"`
	DriveBaseURL          string `koanf:"drive_base_url" json:"drive_base_url" yaml:"drive_base_url"`
	UserInfoEndpoint      string `koanf:"userinfo_endpoint" json:"userinfo_endpoint" yaml:"userinfo_endpoint"`
	HealthEndpoint        string `koanf:"health_endpoint" json:"health_endpoint" yaml:"health_endpoint"`
	HTTPTimeoutSeconds    int    `koanf:"http_timeout_seconds" json:"http_timeout_seconds" yaml:"http_timeout_seconds"`
	CredentialActiveKeyID string `koanf:"credential_active_key_id" json:"credential_active_key_id" yaml:"credential_active_key_id"`
	CredentialActiveKey   string `koanf:"credential_active_key" json:"credential_active_key" yaml:"credential_active_key"`
	CredentialKeysJSON    string `koanf:"credential_keys_json" json:"credential_keys_json" yaml:"credential_keys_json"`
}

type PublicConfig struct {
	BaseURL string `koanf:"base_url" json:"base_url" yaml:"base_url"`
}

type DatabasesConfig struct {
	ESignDSN   string `koanf:"esign_dsn" json:"esign_dsn" yaml:"esign_dsn"`
	ContentDSN string `koanf:"content_dsn" json:"content_dsn" yaml:"content_dsn"`
}

type SQLiteConfig struct {
	DSN string `koanf:"dsn" json:"dsn" yaml:"dsn"`
}

type PostgresConfig struct {
	DSN string `koanf:"dsn" json:"dsn" yaml:"dsn"`
}

type MigrationsConfig struct {
	LocalDir  string `koanf:"local_dir" json:"local_dir" yaml:"local_dir"`
	LocalOnly bool   `koanf:"local_only" json:"local_only" yaml:"local_only"`
}

type RateLimitBucketConfig struct {
	MaxRequests   int `koanf:"max_requests" json:"max_requests" yaml:"max_requests"`
	WindowSeconds int `koanf:"window_seconds" json:"window_seconds" yaml:"window_seconds"`
}

type NetworkRateLimitConfig struct {
	SignerSession RateLimitBucketConfig `koanf:"signer_session" json:"signer_session" yaml:"signer_session"`
	SignerConsent RateLimitBucketConfig `koanf:"signer_consent" json:"signer_consent" yaml:"signer_consent"`
	SignerWrite   RateLimitBucketConfig `koanf:"signer_write" json:"signer_write" yaml:"signer_write"`
	SignerSubmit  RateLimitBucketConfig `koanf:"signer_submit" json:"signer_submit" yaml:"signer_submit"`
	AdminResend   RateLimitBucketConfig `koanf:"admin_resend" json:"admin_resend" yaml:"admin_resend"`
}

type NetworkConfig struct {
	RateLimitTrustProxyHeaders bool                   `koanf:"rate_limit_trust_proxy_headers" json:"rate_limit_trust_proxy_headers" yaml:"rate_limit_trust_proxy_headers"`
	TrustedProxyCIDRs          []string               `koanf:"trusted_proxy_cidrs" json:"trusted_proxy_cidrs" yaml:"trusted_proxy_cidrs"`
	RateLimit                  NetworkRateLimitConfig `koanf:"rate_limit" json:"rate_limit" yaml:"rate_limit"`
}

var activeConfig struct {
	mu  sync.RWMutex
	cfg *Config
}

func Defaults() *Config {
	return &Config{
		App: AppConfig{
			Name: "go-admin e-sign",
			Env:  "development",
		},
		Server: ServerConfig{
			Address: ":8082",
		},
		Admin: AdminConfig{
			BasePath:      "/admin",
			Title:         "E-Sign Admin",
			DefaultLocale: "en",
			PublicAPI:     true,
			APIPrefix:     "api",
			APIVersion:    "v1",
			Debug: AdminDebugConfig{
				EnableSlog: true,
			},
		},
		Auth: AuthConfig{
			AdminID:       "",
			AdminEmail:    "",
			AdminRole:     "",
			AdminPassword: "",
			SigningKey:    "",
			ContextKey:    "",
			SeedFile:      resolveDefaultAuthSeedPath(),
		},
		Features: FeatureConfig{
			ESign:       true,
			ESignGoogle: false,
			Activity:    true,
		},
		Runtime: RuntimeConfig{
			Profile:       "development",
			StartupPolicy: "enforce",
			StrictStartup: false,
		},
		Storage: StorageConfig{
			EncryptionAlgorithm: "aws:kms",
		},
		Email: EmailConfig{
			Transport: "deterministic",
			SMTP: EmailSMTPConfig{
				Host:            "localhost",
				Port:            1025,
				FromName:        "E-Sign",
				FromAddress:     "no-reply@example.test",
				TimeoutSeconds:  10,
				DisableSTARTTLS: false,
				InsecureTLS:     false,
			},
		},
		Signer: SignerConfig{
			UploadTTLSeconds:             300,
			ProfileTTLDays:               90,
			ProfilePersistDrawnSignature: true,
			ProfileMode:                  "hybrid",
			SavedSignaturesLimitPerType:  10,
			PDF: SignerPDFConfig{
				MaxSourceBytes:         10 * 1024 * 1024,
				MaxPages:               200,
				MaxObjects:             100000,
				MaxDecompressedBytes:   64 * 1024 * 1024,
				ParseTimeoutMS:         2500,
				NormalizationTimeoutMS: 5000,
				AllowEncrypted:         false,
				AllowJavaScriptActions: false,
				CompatibilityMode:      "balanced",
				PreviewFallbackEnabled: false,
				PipelineMode:           "prefer_normalized",
			},
		},
		Services: ServicesConfig{
			ModuleEnabled: true,
			EncryptionKey: "go-admin-esign-services-app-key",
		},
		Google: GoogleConfig{
			ProviderMode:          "real",
			TokenEndpoint:         "https://oauth2.googleapis.com/token",
			RevokeEndpoint:        "https://oauth2.googleapis.com/revoke",
			DriveBaseURL:          "https://www.googleapis.com/drive/v3",
			UserInfoEndpoint:      "https://www.googleapis.com/oauth2/v2/userinfo",
			HealthEndpoint:        "https://www.googleapis.com/generate_204",
			HTTPTimeoutSeconds:    10,
			CredentialActiveKeyID: "v1",
			CredentialActiveKey:   "go-admin-esign-google",
			CredentialKeysJSON:    "",
		},
		Public: PublicConfig{
			BaseURL: "http://localhost:8082",
		},
		Databases: DatabasesConfig{},
		SQLite: SQLiteConfig{
			DSN: defaultSQLiteDSN,
		},
		Postgres: PostgresConfig{
			DSN: "",
		},
		Migrations: MigrationsConfig{
			LocalDir:  defaultMigrationsLocalDir,
			LocalOnly: false,
		},
		Network: NetworkConfig{
			RateLimitTrustProxyHeaders: false,
			TrustedProxyCIDRs: []string{
				"127.0.0.1/32",
				"::1/128",
			},
			RateLimit: NetworkRateLimitConfig{
				SignerSession: RateLimitBucketConfig{MaxRequests: 60, WindowSeconds: 60},
				SignerConsent: RateLimitBucketConfig{MaxRequests: 30, WindowSeconds: 60},
				SignerWrite:   RateLimitBucketConfig{MaxRequests: 120, WindowSeconds: 60},
				SignerSubmit:  RateLimitBucketConfig{MaxRequests: 12, WindowSeconds: 60},
				AdminResend:   RateLimitBucketConfig{MaxRequests: 12, WindowSeconds: 60},
			},
		},
	}
}

func (c Config) Validate() error {
	normalized := c
	normalized.applyPersistenceDefaults()
	normalized.applySignerPDFDefaults()

	if strings.TrimSpace(c.Admin.BasePath) == "" {
		return fmt.Errorf("admin.base_path is required")
	}
	if strings.TrimSpace(c.Admin.Title) == "" {
		return fmt.Errorf("admin.title is required")
	}
	if strings.TrimSpace(c.Admin.DefaultLocale) == "" {
		return fmt.Errorf("admin.default_locale is required")
	}
	if strings.TrimSpace(c.Server.Address) == "" {
		return fmt.Errorf("server.address is required")
	}
	if c.Signer.UploadTTLSeconds <= 0 {
		return fmt.Errorf("signer.upload_ttl_seconds must be greater than zero")
	}
	if c.Signer.ProfileTTLDays <= 0 {
		return fmt.Errorf("signer.profile_ttl_days must be greater than zero")
	}
	if c.Signer.SavedSignaturesLimitPerType <= 0 {
		return fmt.Errorf("signer.saved_signatures_limit_per_type must be greater than zero")
	}
	if c.Email.SMTP.TimeoutSeconds <= 0 {
		return fmt.Errorf("email.smtp.timeout_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerSession.MaxRequests <= 0 || c.Network.RateLimit.SignerSession.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_session max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerConsent.MaxRequests <= 0 || c.Network.RateLimit.SignerConsent.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_consent max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerWrite.MaxRequests <= 0 || c.Network.RateLimit.SignerWrite.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_write max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.SignerSubmit.MaxRequests <= 0 || c.Network.RateLimit.SignerSubmit.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.signer_submit max_requests and window_seconds must be greater than zero")
	}
	if c.Network.RateLimit.AdminResend.MaxRequests <= 0 || c.Network.RateLimit.AdminResend.WindowSeconds <= 0 {
		return fmt.Errorf("network.rate_limit.admin_resend max_requests and window_seconds must be greater than zero")
	}
	for _, raw := range c.Network.TrustedProxyCIDRs {
		cidr := strings.TrimSpace(raw)
		if cidr == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return fmt.Errorf("network.trusted_proxy_cidrs contains invalid cidr %q: %w", cidr, err)
		}
	}
	switch normalized.Runtime.RepositoryDialect {
	case RepositoryDialectSQLite, RepositoryDialectPostgres:
	default:
		return fmt.Errorf("runtime.repository_dialect must be one of %s|%s", RepositoryDialectSQLite, RepositoryDialectPostgres)
	}
	switch normalized.Runtime.RepositoryDialect {
	case RepositoryDialectSQLite:
		if strings.TrimSpace(normalized.SQLite.DSN) == "" {
			return fmt.Errorf("sqlite.dsn is required when runtime.repository_dialect=%s", RepositoryDialectSQLite)
		}
	case RepositoryDialectPostgres:
		if strings.TrimSpace(normalized.Postgres.DSN) == "" {
			return fmt.Errorf("postgres.dsn is required when runtime.repository_dialect=%s", RepositoryDialectPostgres)
		}
	}
	return nil
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
	loaded.applyPersistenceDefaults()
	loaded.applySignerPDFDefaults()
	if len(resolvedPaths) > 0 {
		loaded.ConfigPath = strings.TrimSpace(resolvedPaths[0])
	}
	if err := loaded.Validate(); err != nil {
		return loaded, container, err
	}
	SetActive(loaded)
	return loaded, container, nil
}

func resolveDefaultConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}

func resolveDefaultAuthSeedPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/dev_seed.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "dev_seed.json"))
}

// SetActive stores runtime config for cross-package access during app bootstrap.
func SetActive(cfg *Config) {
	activeConfig.mu.Lock()
	defer activeConfig.mu.Unlock()
	if cfg == nil {
		activeConfig.cfg = nil
		return
	}
	clone := *cfg
	activeConfig.cfg = &clone
}

// ResetActive clears the globally active runtime config.
func ResetActive() {
	SetActive(nil)
}

// Active returns the currently active runtime config, or defaults when unset.
func Active() Config {
	activeConfig.mu.RLock()
	defer activeConfig.mu.RUnlock()
	if activeConfig.cfg == nil {
		return *Defaults()
	}
	clone := *activeConfig.cfg
	return clone
}

func (c *Config) applyPersistenceDefaults() {
	if c == nil {
		return
	}

	c.Runtime.Profile = strings.ToLower(strings.TrimSpace(c.Runtime.Profile))
	if c.Runtime.Profile == "" {
		c.Runtime.Profile = "development"
	}
	c.Runtime.RepositoryDialect = strings.ToLower(strings.TrimSpace(c.Runtime.RepositoryDialect))
	if c.Runtime.RepositoryDialect == "" {
		if isProductionLikeProfile(c.Runtime.Profile) {
			c.Runtime.RepositoryDialect = RepositoryDialectPostgres
		} else {
			c.Runtime.RepositoryDialect = RepositoryDialectSQLite
		}
	}

	c.Databases.ESignDSN = strings.TrimSpace(c.Databases.ESignDSN)
	c.Databases.ContentDSN = strings.TrimSpace(c.Databases.ContentDSN)
	c.SQLite.DSN = strings.TrimSpace(c.SQLite.DSN)
	c.Postgres.DSN = strings.TrimSpace(c.Postgres.DSN)
	c.Migrations.LocalDir = strings.TrimSpace(c.Migrations.LocalDir)
	if c.Migrations.LocalDir == "" {
		c.Migrations.LocalDir = defaultMigrationsLocalDir
	}

	if c.SQLite.DSN == "" {
		c.SQLite.DSN = defaultSQLiteDSN
	}
}

func (c *Config) applySignerPDFDefaults() {
	if c == nil {
		return
	}
	defaults := Defaults().Signer.PDF

	if c.Signer.PDF.MaxSourceBytes <= 0 {
		c.Signer.PDF.MaxSourceBytes = defaults.MaxSourceBytes
	}
	if c.Signer.PDF.MaxPages <= 0 {
		c.Signer.PDF.MaxPages = defaults.MaxPages
	}
	if c.Signer.PDF.MaxObjects <= 0 {
		c.Signer.PDF.MaxObjects = defaults.MaxObjects
	}
	if c.Signer.PDF.MaxDecompressedBytes <= 0 {
		c.Signer.PDF.MaxDecompressedBytes = defaults.MaxDecompressedBytes
	}
	if c.Signer.PDF.ParseTimeoutMS <= 0 {
		c.Signer.PDF.ParseTimeoutMS = defaults.ParseTimeoutMS
	}
	if c.Signer.PDF.NormalizationTimeoutMS <= 0 {
		c.Signer.PDF.NormalizationTimeoutMS = defaults.NormalizationTimeoutMS
	}
	mode := strings.ToLower(strings.TrimSpace(c.Signer.PDF.CompatibilityMode))
	switch mode {
	case "strict", "balanced", "permissive":
		c.Signer.PDF.CompatibilityMode = mode
	default:
		c.Signer.PDF.CompatibilityMode = defaults.CompatibilityMode
	}
	switch strings.ToLower(strings.TrimSpace(c.Signer.PDF.PipelineMode)) {
	case "analyze_only", "enforce_policy", "prefer_normalized":
		c.Signer.PDF.PipelineMode = strings.ToLower(strings.TrimSpace(c.Signer.PDF.PipelineMode))
	default:
		c.Signer.PDF.PipelineMode = defaults.PipelineMode
	}
}

func isProductionLikeProfile(profile string) bool {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "production", "prod":
		return true
	default:
		return false
	}
}
