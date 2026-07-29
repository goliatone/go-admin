package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"
)

var activeConfig struct {
	mu  sync.RWMutex
	cfg *AppConfig
}

// Logger is the minimal structured logger contract used while loading config.
type Logger interface {
	Debug(string, ...any)
	Info(string, ...any)
	Error(string, ...any)
}

// Defaults returns baseline admin-shell configuration values.
func Defaults() AppConfig {
	return AppConfig{
		Name: "go-admin shell",
		Env:  "development",
		Server: Server{
			Address:                ":8383",
			PrintRoutes:            true,
			ShutdownTimeoutSeconds: 10,
		},
		Admin: Admin{
			BasePath:      "/admin",
			Title:         "Admin Shell",
			DefaultLocale: "en",
		},
		Deployment: Deployment{
			AppID:          "admin-shell",
			AppName:        "Go Admin Shell",
			AppVersion:     "development",
			PersonaEnabled: true,
		},
		Auth: Auth{
			SigningKey:          "admin-shell-dev-signing-key",
			DemoEnabled:         true,
			ShowDemoCredentials: true,
			DemoUsername:        "admin",
			DemoEmail:           "admin@example.com",
			DemoPassword:        "admin.pwd",
		},
		Features: Features{
			Profile: "minimal",
			Overrides: map[string]bool{
				"search": true,
			},
		},
		Logging: Logging{
			Level:  "info",
			Format: "json",
		},
	}
}

// Load resolves configuration from defaults, optional files, and env overrides.
func Load(paths ...string) (AppConfig, error) {
	return load(nil, paths...)
}

// LoadWithLogger resolves configuration using the supplied application logger.
func LoadWithLogger(logger Logger, paths ...string) (AppConfig, error) {
	return load(logger, paths...)
}

func load(logger Logger, paths ...string) (AppConfig, error) {
	resolvedPaths, err := resolveConfigPaths(paths...)
	if err != nil {
		return AppConfig{}, err
	}

	preview := Defaults()
	previewContainer := newContainer(&preview, resolvedPaths, goconfig.ValidationNone, false, logger)
	if err := previewContainer.Load(context.Background()); err != nil {
		return AppConfig{}, err
	}
	previewLoaded := previewContainer.Raw()
	if previewLoaded == nil {
		return AppConfig{}, fmt.Errorf("preview config is nil")
	}

	failFast := shouldFailFast(previewLoaded.Env)

	cfg := Defaults()
	container := newContainer(&cfg, resolvedPaths, goconfig.ValidationSemantic, failFast, logger)
	if err := container.Load(context.Background()); err != nil {
		return AppConfig{}, err
	}

	loaded := container.Raw()
	if loaded == nil {
		return AppConfig{}, fmt.Errorf("loaded config is nil")
	}
	if len(resolvedPaths) > 0 {
		loaded.ConfigPath = strings.TrimSpace(resolvedPaths[0])
	}
	SetActive(*loaded)
	return *loaded, nil
}

func newContainer(
	cfg *AppConfig,
	files []string,
	mode goconfig.ValidationMode,
	failFast bool,
	logger Logger,
) *goconfig.Container[*AppConfig] {
	if logger == nil {
		logger = discardConfigLogger{}
	}
	container := goconfig.New(cfg).
		WithLogger(logger).
		WithValidationMode(mode).
		WithBaseValidate(false).
		WithFailFast(failFast).
		WithConfigPath("").
		WithSolverPasses(2).
		WithStringTransformerForKey("env", goconfig.ToLower).
		WithStringTransformerForKey("admin.base_path", goconfig.EnsureLeadingSlash).
		WithNormalizer(configNormalizers()...).
		WithValidator(configValidators()...)

	providers := make([]goconfig.ProviderBuilder[*AppConfig], 0, len(files)+2)
	providers = append(providers, goconfig.StructProvider[*AppConfig](cfg))
	for i, path := range files {
		providers = append(providers, goconfig.OptionalProvider(
			goconfig.FileProvider[*AppConfig](path, int(goconfig.PriorityConfig.WithOffset(i))),
		))
	}
	providers = append(providers, goconfig.EnvProvider[*AppConfig](DefaultEnvPrefix, DefaultEnvDelimiter))
	container.WithProvider(providers...)

	return container
}

type discardConfigLogger struct{}

func (discardConfigLogger) Debug(string, ...any) {}
func (discardConfigLogger) Info(string, ...any)  {}
func (discardConfigLogger) Error(string, ...any) {}

func shouldFailFast(_ string) bool {
	return true
}

func configNormalizers() []goconfig.Normalizer[*AppConfig] {
	return []goconfig.Normalizer[*AppConfig]{
		func(c *AppConfig) error {
			c.Name = strings.TrimSpace(c.Name)
			c.Env = strings.ToLower(strings.TrimSpace(c.Env))
			c.Server.Address = strings.TrimSpace(c.Server.Address)
			c.Admin.BasePath = strings.TrimSpace(c.Admin.BasePath)
			c.Admin.Title = strings.TrimSpace(c.Admin.Title)
			c.Admin.DefaultLocale = strings.TrimSpace(c.Admin.DefaultLocale)
			c.Deployment.AppID = strings.TrimSpace(c.Deployment.AppID)
			c.Deployment.AppName = strings.TrimSpace(c.Deployment.AppName)
			c.Deployment.AppVersion = strings.TrimSpace(c.Deployment.AppVersion)
			c.Auth.SigningKey = strings.TrimSpace(c.Auth.SigningKey)
			c.Auth.DemoUsername = strings.TrimSpace(c.Auth.DemoUsername)
			c.Auth.DemoEmail = strings.TrimSpace(c.Auth.DemoEmail)
			c.Auth.DemoPassword = strings.TrimSpace(c.Auth.DemoPassword)
			c.Features.Profile = strings.ToLower(strings.TrimSpace(c.Features.Profile))
			c.Logging.Level = strings.ToLower(strings.TrimSpace(c.Logging.Level))
			c.Logging.Format = strings.ToLower(strings.TrimSpace(c.Logging.Format))
			if c.Env == "" {
				c.Env = "development"
			}
			if c.Features.Profile == "" {
				c.Features.Profile = "minimal"
			}
			if c.Logging.Level == "" {
				c.Logging.Level = "info"
			}
			if c.Logging.Format == "" {
				c.Logging.Format = "json"
			}
			return nil
		},
	}
}

func configValidators() []goconfig.Validator[*AppConfig] {
	return []goconfig.Validator[*AppConfig]{
		validateRequiredFields,
	}
}

func validateRequiredFields(c *AppConfig) error {
	if strings.TrimSpace(c.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if strings.TrimSpace(c.Env) == "" {
		return fmt.Errorf("env is required")
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
	if c.Server.ShutdownTimeoutSeconds <= 0 {
		return fmt.Errorf("server.shutdown_timeout_seconds must be greater than zero")
	}
	if strings.TrimSpace(c.Deployment.AppID) == "" {
		return fmt.Errorf("deployment.app_id is required")
	}
	if strings.TrimSpace(c.Deployment.AppName) == "" {
		return fmt.Errorf("deployment.app_name is required")
	}
	if strings.TrimSpace(c.Auth.SigningKey) == "" {
		return fmt.Errorf("auth.signing_key is required")
	}
	switch c.Features.Profile {
	case "minimal", "default", "full":
	default:
		return fmt.Errorf("features.profile must be one of minimal, default, or full")
	}
	switch c.Logging.Level {
	case "trace", "debug", "info", "warn", "warning", "error":
	default:
		return fmt.Errorf("logging.level must be one of trace, debug, info, warn, or error")
	}
	switch c.Logging.Format {
	case "json", "console", "text", "pretty":
	default:
		return fmt.Errorf("logging.format must be one of json, console, text, or pretty")
	}
	if c.Auth.DemoEnabled {
		if !IsDevelopmentEnv(c.Env) {
			return fmt.Errorf("auth.demo_enabled is only allowed in development environments")
		}
		if strings.TrimSpace(c.Auth.DemoUsername) == "" {
			return fmt.Errorf("auth.demo_username is required when demo auth is enabled")
		}
		if strings.TrimSpace(c.Auth.DemoEmail) == "" {
			return fmt.Errorf("auth.demo_email is required when demo auth is enabled")
		}
		if strings.TrimSpace(c.Auth.DemoPassword) == "" {
			return fmt.Errorf("auth.demo_password is required when demo auth is enabled")
		}
	}
	if !IsDevelopmentEnv(c.Env) {
		if c.Auth.ShowDemoCredentials {
			return fmt.Errorf("auth.show_demo_credentials is only allowed in development environments")
		}
		if strings.TrimSpace(c.Auth.SigningKey) == "admin-shell-dev-signing-key" {
			return fmt.Errorf("auth.signing_key must be replaced outside development")
		}
		if len(c.Auth.SigningKey) < 32 {
			return fmt.Errorf("auth.signing_key must contain at least 32 characters outside development")
		}
	}
	return nil
}

// Validate verifies config invariants.
func (c AppConfig) Validate() error {
	normalized := c
	for _, normalize := range configNormalizers() {
		if normalize == nil {
			continue
		}
		if err := normalize(&normalized); err != nil {
			return err
		}
	}
	for _, validate := range configValidators() {
		if validate == nil {
			continue
		}
		if err := validate(&normalized); err != nil {
			return err
		}
	}
	return nil
}

// FeatureOverrides returns a defensive copy of configured quickstart overrides.
func (c AppConfig) FeatureOverrides() map[string]bool {
	if len(c.Features.Overrides) == 0 {
		return nil
	}
	out := make(map[string]bool, len(c.Features.Overrides))
	for key, value := range c.Features.Overrides {
		if key = strings.TrimSpace(key); key != "" {
			out[key] = value
		}
	}
	return out
}

// IsDevelopmentEnv is the canonical environment policy used by validation
// and runtime composition.
func IsDevelopmentEnv(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "development", "dev", "local", "test":
		return true
	default:
		return false
	}
}

// SetActive stores runtime config for cross-package access during app bootstrap.
func SetActive(cfg AppConfig) {
	activeConfig.mu.Lock()
	defer activeConfig.mu.Unlock()
	clone := cloneConfig(cfg)
	activeConfig.cfg = &clone
}

// ResetActive clears the globally active runtime config.
func ResetActive() {
	activeConfig.mu.Lock()
	activeConfig.cfg = nil
	activeConfig.mu.Unlock()
}

// Active returns the currently active runtime config, or defaults when unset.
func Active() AppConfig {
	activeConfig.mu.RLock()
	defer activeConfig.mu.RUnlock()
	if activeConfig.cfg == nil {
		return Defaults()
	}
	return cloneConfig(*activeConfig.cfg)
}

func cloneConfig(cfg AppConfig) AppConfig {
	cfg.Features.Overrides = cfg.FeatureOverrides()
	return cfg
}

// GetEnvString returns an env var value or fallback if the var is empty.
func GetEnvString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func resolveConfigPaths(paths ...string) ([]string, error) {
	if len(paths) == 0 {
		paths = []string{
			GetEnvString("APP_CONFIG", GetEnvString("APP_CONFIG_PATH", resolveDefaultConfigPath())),
			GetEnvString("APP_CONFIG_OVERRIDES", resolveDefaultOverridesPath()),
		}
	}

	files := make([]string, 0, len(paths))
	for _, path := range paths {
		path = filepath.FromSlash(strings.TrimSpace(path))
		if path == "" {
			continue
		}

		matches, err := filepath.Glob(path)
		if err != nil {
			return nil, err
		}

		if len(matches) == 0 {
			if hasGlob(path) {
				continue
			}
			files = append(files, path)
			continue
		}

		slices.Sort(matches)
		files = append(files, matches...)
	}

	return uniquePaths(files), nil
}

func hasGlob(path string) bool {
	return strings.ContainsAny(path, "*?[")
}

func uniquePaths(paths []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(paths))
	for _, path := range paths {
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	return out
}

func resolveDefaultConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/admin-shell/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}

func resolveDefaultOverridesPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/admin-shell/config/overrides.yml"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "overrides.yml"))
}
