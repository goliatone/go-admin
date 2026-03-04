package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"
)

// Config defines runtime configuration for the e-sign example application.
type Config struct {
	App      AppConfig      `koanf:"app" json:"app" yaml:"app"`
	Server   ServerConfig   `koanf:"server" json:"server" yaml:"server"`
	Admin    AdminConfig    `koanf:"admin" json:"admin" yaml:"admin"`
	Features FeatureConfig  `koanf:"features" json:"features" yaml:"features"`
	Runtime  RuntimeConfig  `koanf:"runtime" json:"runtime" yaml:"runtime"`
	Storage  StorageConfig  `koanf:"storage" json:"storage" yaml:"storage"`
	Email    EmailConfig    `koanf:"email" json:"email" yaml:"email"`
	Signer   SignerConfig   `koanf:"signer" json:"signer" yaml:"signer"`
	Services ServicesConfig `koanf:"services" json:"services" yaml:"services"`
	Google   GoogleConfig   `koanf:"google" json:"google" yaml:"google"`
	Public   PublicConfig   `koanf:"public" json:"public" yaml:"public"`

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

type FeatureConfig struct {
	ESign       bool `koanf:"esign" json:"esign" yaml:"esign"`
	ESignGoogle bool `koanf:"esign_google" json:"esign_google" yaml:"esign_google"`
	Activity    bool `koanf:"activity" json:"activity" yaml:"activity"`
}

type RuntimeConfig struct {
	Profile       string `koanf:"profile" json:"profile" yaml:"profile"`
	StartupPolicy string `koanf:"startup_policy" json:"startup_policy" yaml:"startup_policy"`
}

type StorageConfig struct {
	EncryptionAlgorithm string `koanf:"encryption_algorithm" json:"encryption_algorithm" yaml:"encryption_algorithm"`
}

type EmailConfig struct {
	Transport string `koanf:"transport" json:"transport" yaml:"transport"`
}

type SignerConfig struct {
	UploadSigningKey string `koanf:"upload_signing_key" json:"upload_signing_key" yaml:"upload_signing_key"`
	UploadTTLSeconds int    `koanf:"upload_ttl_seconds" json:"upload_ttl_seconds" yaml:"upload_ttl_seconds"`
}

type ServicesConfig struct {
	ModuleEnabled         bool   `koanf:"module_enabled" json:"module_enabled" yaml:"module_enabled"`
	EncryptionKey         string `koanf:"encryption_key" json:"encryption_key" yaml:"encryption_key"`
	CallbackPublicBaseURL string `koanf:"callback_public_base_url" json:"callback_public_base_url" yaml:"callback_public_base_url"`
}

type GoogleConfig struct {
	ClientID         string `koanf:"client_id" json:"client_id" yaml:"client_id"`
	ClientSecret     string `koanf:"client_secret" json:"client_secret" yaml:"client_secret"`
	OAuthRedirectURI string `koanf:"oauth_redirect_uri" json:"oauth_redirect_uri" yaml:"oauth_redirect_uri"`
}

type PublicConfig struct {
	BaseURL string `koanf:"base_url" json:"base_url" yaml:"base_url"`
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
		Features: FeatureConfig{
			ESign:       true,
			ESignGoogle: false,
			Activity:    true,
		},
		Runtime: RuntimeConfig{
			Profile:       "development",
			StartupPolicy: "enforce",
		},
		Storage: StorageConfig{
			EncryptionAlgorithm: "aws:kms",
		},
		Email: EmailConfig{
			Transport: "deterministic",
		},
		Signer: SignerConfig{
			UploadTTLSeconds: 300,
		},
		Services: ServicesConfig{
			ModuleEnabled: true,
			EncryptionKey: "go-admin-esign-services-app-key",
		},
		Google: GoogleConfig{},
		Public: PublicConfig{},
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
	applyLegacyEnvOverrides(loaded)
	if len(resolvedPaths) > 0 {
		loaded.ConfigPath = strings.TrimSpace(resolvedPaths[0])
	}
	return loaded, container, loaded.Validate()
}

func resolveDefaultConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/esign/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}

func applyLegacyEnvOverrides(cfg *Config) {
	if cfg == nil {
		return
	}
	applyLegacyString(&cfg.App.Env, "GO_ENV", "ENV")
	applyLegacyPort(&cfg.Server.Address, "PORT")

	applyLegacyBool(&cfg.Admin.PublicAPI, "ADMIN_PUBLIC_API")
	applyLegacyString(&cfg.Admin.APIPrefix, "ADMIN_API_PREFIX")
	applyLegacyString(&cfg.Admin.APIVersion, "ADMIN_API_VERSION")
	applyLegacyBool(&cfg.Admin.Debug.EnableSlog, "ADMIN_DEBUG_SLOG")

	applyLegacyBool(&cfg.Features.ESign, "ESIGN_FEATURE_ENABLED")
	applyLegacyBool(&cfg.Features.ESignGoogle, "ESIGN_GOOGLE_FEATURE_ENABLED")
	applyLegacyBool(&cfg.Features.Activity, "ESIGN_ACTIVITY_FEATURE_ENABLED")

	applyLegacyString(&cfg.Runtime.StartupPolicy, "ESIGN_STARTUP_POLICY")
	applyLegacyString(&cfg.Runtime.Profile, "ESIGN_RUNTIME_PROFILE")

	applyLegacyString(&cfg.Storage.EncryptionAlgorithm, "ESIGN_STORAGE_ENCRYPTION_ALGORITHM")
	applyLegacyString(&cfg.Email.Transport, "ESIGN_EMAIL_TRANSPORT")
	applyLegacyString(&cfg.Signer.UploadSigningKey, "ESIGN_SIGNER_UPLOAD_SIGNING_KEY")
	applyLegacyInt(&cfg.Signer.UploadTTLSeconds, "ESIGN_SIGNER_UPLOAD_TTL_SECONDS")

	applyLegacyBool(&cfg.Services.ModuleEnabled, "ESIGN_SERVICES_MODULE_ENABLED")
	applyLegacyString(&cfg.Services.EncryptionKey, "ESIGN_SERVICES_ENCRYPTION_KEY")
	applyLegacyString(&cfg.Services.CallbackPublicBaseURL, "ESIGN_SERVICES_CALLBACK_PUBLIC_BASE_URL")

	applyLegacyString(&cfg.Google.ClientID, "ESIGN_GOOGLE_CLIENT_ID")
	applyLegacyString(&cfg.Google.ClientSecret, "ESIGN_GOOGLE_CLIENT_SECRET")
	applyLegacyString(&cfg.Google.OAuthRedirectURI, "ESIGN_GOOGLE_OAUTH_REDIRECT_URI")

	applyLegacyString(&cfg.Public.BaseURL, "ESIGN_PUBLIC_BASE_URL")
}

func applyLegacyString(target *string, keys ...string) {
	if target == nil {
		return
	}
	for _, key := range keys {
		value, ok := os.LookupEnv(strings.TrimSpace(key))
		if !ok {
			continue
		}
		*target = strings.TrimSpace(value)
		return
	}
}

func applyLegacyBool(target *bool, key string) {
	if target == nil {
		return
	}
	value, ok := os.LookupEnv(strings.TrimSpace(key))
	if !ok {
		return
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return
	}
	*target = parsed
}

func applyLegacyInt(target *int, key string) {
	if target == nil {
		return
	}
	value, ok := os.LookupEnv(strings.TrimSpace(key))
	if !ok {
		return
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return
	}
	*target = parsed
}

func applyLegacyPort(target *string, key string) {
	if target == nil {
		return
	}
	value, ok := os.LookupEnv(strings.TrimSpace(key))
	if !ok {
		return
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	if strings.HasPrefix(value, ":") {
		*target = value
		return
	}
	if _, err := strconv.Atoi(value); err == nil {
		*target = ":" + value
		return
	}
	*target = value
}
