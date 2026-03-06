package config

import (
	"context"
	"fmt"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"
)

// Config defines runtime configuration for the e-sign example application.
type Config struct {
	App       AppConfig       `koanf:"app" json:"app" yaml:"app"`
	Server    ServerConfig    `koanf:"server" json:"server" yaml:"server"`
	Admin     AdminConfig     `koanf:"admin" json:"admin" yaml:"admin"`
	Auth      AuthConfig      `koanf:"auth" json:"auth" yaml:"auth"`
	Features  FeatureConfig   `koanf:"features" json:"features" yaml:"features"`
	Runtime   RuntimeConfig   `koanf:"runtime" json:"runtime" yaml:"runtime"`
	Storage   StorageConfig   `koanf:"storage" json:"storage" yaml:"storage"`
	Email     EmailConfig     `koanf:"email" json:"email" yaml:"email"`
	Signer    SignerConfig    `koanf:"signer" json:"signer" yaml:"signer"`
	Services  ServicesConfig  `koanf:"services" json:"services" yaml:"services"`
	Google    GoogleConfig    `koanf:"google" json:"google" yaml:"google"`
	Public    PublicConfig    `koanf:"public" json:"public" yaml:"public"`
	Databases DatabasesConfig `koanf:"databases" json:"databases" yaml:"databases"`
	Network   NetworkConfig   `koanf:"network" json:"network" yaml:"network"`

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
	Profile       string `koanf:"profile" json:"profile" yaml:"profile"`
	StartupPolicy string `koanf:"startup_policy" json:"startup_policy" yaml:"startup_policy"`
	StrictStartup bool   `koanf:"strict_startup" json:"strict_startup" yaml:"strict_startup"`
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
	UploadSigningKey             string `koanf:"upload_signing_key" json:"upload_signing_key" yaml:"upload_signing_key"`
	UploadTTLSeconds             int    `koanf:"upload_ttl_seconds" json:"upload_ttl_seconds" yaml:"upload_ttl_seconds"`
	ProfileTTLDays               int    `koanf:"profile_ttl_days" json:"profile_ttl_days" yaml:"profile_ttl_days"`
	ProfilePersistDrawnSignature bool   `koanf:"profile_persist_drawn_signature" json:"profile_persist_drawn_signature" yaml:"profile_persist_drawn_signature"`
	ProfileMode                  string `koanf:"profile_mode" json:"profile_mode" yaml:"profile_mode"`
	SavedSignaturesLimitPerType  int    `koanf:"saved_signatures_limit_per_type" json:"saved_signatures_limit_per_type" yaml:"saved_signatures_limit_per_type"`
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

type NetworkConfig struct {
	RateLimitTrustProxyHeaders bool `koanf:"rate_limit_trust_proxy_headers" json:"rate_limit_trust_proxy_headers" yaml:"rate_limit_trust_proxy_headers"`
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
		Network: NetworkConfig{
			RateLimitTrustProxyHeaders: false,
		},
	}
}

func (c Config) Validate() error {
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
