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

// Defaults returns baseline admin-shell configuration values.
func Defaults() AppConfig {
	return AppConfig{
		Name: "go-admin shell",
		Env:  "development",
		Server: Server{
			Address:     ":8383",
			PrintRoutes: true,
		},
		Admin: Admin{
			BasePath:      "/admin",
			Title:         "Admin Shell",
			DefaultLocale: "en",
		},
		Auth: Auth{
			SigningKey:   "admin-shell-dev-signing-key",
			DemoUsername: "admin",
			DemoEmail:    "admin@example.com",
			DemoPassword: "admin.pwd",
		},
		Features: Features{
			Dashboard: true,
			CMS:       true,
			Search:    true,
			Commands:  false,
			Settings:  false,
			Jobs:      false,
			Media:     false,
			Users:     false,
		},
	}
}

// Load resolves configuration from defaults, optional files, and env overrides.
func Load(paths ...string) (AppConfig, error) {
	resolvedPaths, err := resolveConfigPaths(paths...)
	if err != nil {
		return AppConfig{}, err
	}

	preview := Defaults()
	previewContainer := newContainer(&preview, resolvedPaths, goconfig.ValidationNone, false)
	if err := previewContainer.Load(context.Background()); err != nil {
		return AppConfig{}, err
	}
	previewLoaded := previewContainer.Raw()
	if previewLoaded == nil {
		return AppConfig{}, fmt.Errorf("preview config is nil")
	}

	failFast := shouldFailFast(previewLoaded.Env)

	cfg := Defaults()
	container := newContainer(&cfg, resolvedPaths, goconfig.ValidationSemantic, failFast)
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
) *goconfig.Container[*AppConfig] {
	container := goconfig.New(cfg).
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
			c.Auth.SigningKey = strings.TrimSpace(c.Auth.SigningKey)
			c.Auth.DemoUsername = strings.TrimSpace(c.Auth.DemoUsername)
			c.Auth.DemoEmail = strings.TrimSpace(c.Auth.DemoEmail)
			c.Auth.DemoPassword = strings.TrimSpace(c.Auth.DemoPassword)
			if c.Env == "" {
				c.Env = "development"
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
	if strings.TrimSpace(c.Auth.SigningKey) == "" {
		return fmt.Errorf("auth.signing_key is required")
	}
	if strings.TrimSpace(c.Auth.DemoUsername) == "" {
		return fmt.Errorf("auth.demo_username is required")
	}
	if strings.TrimSpace(c.Auth.DemoEmail) == "" {
		return fmt.Errorf("auth.demo_email is required")
	}
	if strings.TrimSpace(c.Auth.DemoPassword) == "" {
		return fmt.Errorf("auth.demo_password is required")
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

// FeatureDefaults returns typed feature flags as string-key map.
func (c AppConfig) FeatureDefaults() map[string]bool {
	return map[string]bool{
		"dashboard": c.Features.Dashboard,
		"cms":       c.Features.CMS,
		"search":    c.Features.Search,
		"commands":  c.Features.Commands,
		"settings":  c.Features.Settings,
		"jobs":      c.Features.Jobs,
		"media":     c.Features.Media,
		"users":     c.Features.Users,
	}
}

// SetActive stores runtime config for cross-package access during app bootstrap.
func SetActive(cfg AppConfig) {
	activeConfig.mu.Lock()
	defer activeConfig.mu.Unlock()
	clone := cfg
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
	clone := *activeConfig.cfg
	return clone
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
		return "examples/admin-shell/internal/config/app.json"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "app.json"))
}

func resolveDefaultOverridesPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/admin-shell/internal/config/overrides.yml"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "overrides.yml"))
}
