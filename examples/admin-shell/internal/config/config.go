package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	goconfig "github.com/goliatone/go-config/config"
)

const (
	DefaultEnvPrefix    = "APP_"
	DefaultEnvDelimiter = "__"
)

// AppConfig defines runtime configuration for the admin shell example.
type AppConfig struct {
	Name     string          `koanf:"name" json:"name" yaml:"name"`
	Env      string          `koanf:"env" json:"env" yaml:"env"`
	Server   ServerConfig    `koanf:"server" json:"server" yaml:"server"`
	Admin    AdminConfig     `koanf:"admin" json:"admin" yaml:"admin"`
	Auth     AuthConfig      `koanf:"auth" json:"auth" yaml:"auth"`
	Features map[string]bool `koanf:"features" json:"features" yaml:"features"`

	ConfigPath string `koanf:"-" json:"-" yaml:"-"`
}

// ServerConfig captures transport options.
type ServerConfig struct {
	Address     string `koanf:"address" json:"address" yaml:"address"`
	PrintRoutes bool   `koanf:"print_routes" json:"print_routes" yaml:"print_routes"`
}

// AdminConfig captures go-admin quickstart settings.
type AdminConfig struct {
	BasePath      string `koanf:"base_path" json:"base_path" yaml:"base_path"`
	Title         string `koanf:"title" json:"title" yaml:"title"`
	DefaultLocale string `koanf:"default_locale" json:"default_locale" yaml:"default_locale"`
}

// AuthConfig captures go-auth demo identity settings.
type AuthConfig struct {
	SigningKey   string `koanf:"signing_key" json:"signing_key" yaml:"signing_key"`
	DemoUsername string `koanf:"demo_username" json:"demo_username" yaml:"demo_username"`
	DemoEmail    string `koanf:"demo_email" json:"demo_email" yaml:"demo_email"`
	DemoPassword string `koanf:"demo_password" json:"demo_password" yaml:"demo_password"`
}

// Validate satisfies go-config Validable.
func (c AppConfig) Validate() error {
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

// Defaults returns baseline example config values.
func Defaults() *AppConfig {
	return &AppConfig{
		Name: "go-admin shell",
		Env:  "development",
		Server: ServerConfig{
			Address:     ":8082",
			PrintRoutes: true,
		},
		Admin: AdminConfig{
			BasePath:      "/admin",
			Title:         "Admin Shell",
			DefaultLocale: "en",
		},
		Auth: AuthConfig{
			SigningKey:   "admin-shell-dev-signing-key",
			DemoUsername: "admin",
			DemoEmail:    "admin@example.com",
			DemoPassword: "admin.pwd",
		},
		Features: defaultFeatures(),
	}
}

// Load resolves configuration from struct defaults, optional file, and env variables.
func Load(ctx context.Context) (*AppConfig, *goconfig.Container[*AppConfig], error) {
	cfg := Defaults()
	configPath := resolveConfigPath()
	if override := strings.TrimSpace(os.Getenv("APP_CONFIG_PATH")); override != "" {
		configPath = override
	}

	container := goconfig.New(cfg).
		WithProvider(
			goconfig.StructProvider[*AppConfig](cfg),
			goconfig.OptionalProvider(goconfig.FileProvider[*AppConfig](configPath)),
			goconfig.EnvProvider[*AppConfig](DefaultEnvPrefix, DefaultEnvDelimiter),
		)

	if err := container.Load(ctx); err != nil {
		return nil, container, err
	}

	loaded := container.Raw()
	if loaded == nil {
		return nil, container, fmt.Errorf("loaded config is nil")
	}
	if len(loaded.Features) == 0 {
		loaded.Features = defaultFeatures()
	}
	loaded.ConfigPath = configPath
	return loaded, container, nil
}

func resolveConfigPath() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "examples/admin-shell/config/app.yaml"
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "config", "app.yaml"))
}

func defaultFeatures() map[string]bool {
	return map[string]bool{
		"dashboard": true,
		"cms":       true,
		"search":    true,
		"commands":  false,
		"settings":  false,
		"jobs":      false,
		"media":     false,
		"users":     false,
	}
}
