package setup

import (
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/quickstart"
)

// DatabasesRuntimeConfig controls DSN values consumed by setup package code.
type DatabasesRuntimeConfig struct {
	CMSDSN     string
	ContentDSN string
}

// NavigationRuntimeConfig controls navigation seed/debug behavior.
type NavigationRuntimeConfig struct {
	ResetMenu bool
	Debug     bool
	DebugLog  bool
}

// SecureLinkRuntimeConfig controls securelink defaults for setup/auth flows.
type SecureLinkRuntimeConfig struct {
	BasePath   string
	BaseURL    string
	SigningKey string
	QueryKey   string
	AsQuery    bool
	Expiration time.Duration
}

// RuntimeConfig controls setup package runtime defaults.
type RuntimeConfig struct {
	AppEnv                     string
	Scope                      quickstart.ScopeConfig
	Seeds                      SeedConfig
	Navigation                 NavigationRuntimeConfig
	SecureLink                 SecureLinkRuntimeConfig
	PasswordPolicyHints        []string
	PermissionResolverCacheTTL time.Duration
	Databases                  DatabasesRuntimeConfig
	CMSRuntimeLogs             *bool
}

var (
	setupRuntimeMu  sync.RWMutex
	setupRuntimeCfg = defaultRuntimeConfig()
)

func defaultRuntimeConfig() RuntimeConfig {
	return RuntimeConfig{
		AppEnv: "development",
		Scope:  quickstart.DefaultScopeConfig(),
		Seeds:  DefaultSeedConfig(),
		Navigation: NavigationRuntimeConfig{
			ResetMenu: true,
			Debug:     false,
			DebugLog:  false,
		},
		SecureLink: SecureLinkRuntimeConfig{
			BasePath:   "/admin",
			BaseURL:    defaultSecureLinkBaseURL,
			SigningKey: defaultSecureLinkKey,
			QueryKey:   defaultSecureLinkQueryKey,
			AsQuery:    true,
			Expiration: defaultSecureLinkExpiration,
		},
		PasswordPolicyHints: defaultPasswordPolicyHints(),
	}
}

// ConfigureRuntime applies setup runtime defaults.
func ConfigureRuntime(cfg RuntimeConfig) {
	setupRuntimeMu.Lock()
	if strings.TrimSpace(cfg.AppEnv) == "" {
		cfg.AppEnv = setupRuntimeCfg.AppEnv
	}
	if strings.TrimSpace(string(cfg.Scope.Mode)) == "" {
		cfg.Scope = setupRuntimeCfg.Scope
	}
	if cfg.SecureLink.Expiration <= 0 {
		cfg.SecureLink.Expiration = setupRuntimeCfg.SecureLink.Expiration
	}
	if strings.TrimSpace(cfg.SecureLink.BasePath) == "" {
		cfg.SecureLink.BasePath = setupRuntimeCfg.SecureLink.BasePath
	}
	if strings.TrimSpace(cfg.SecureLink.BaseURL) == "" {
		cfg.SecureLink.BaseURL = setupRuntimeCfg.SecureLink.BaseURL
	}
	if strings.TrimSpace(cfg.SecureLink.QueryKey) == "" {
		cfg.SecureLink.QueryKey = setupRuntimeCfg.SecureLink.QueryKey
	}
	if len(cfg.PasswordPolicyHints) == 0 {
		cfg.PasswordPolicyHints = append([]string{}, setupRuntimeCfg.PasswordPolicyHints...)
	}
	setupRuntimeCfg = cfg
	setupRuntimeMu.Unlock()
}

func runtimeConfig() RuntimeConfig {
	setupRuntimeMu.RLock()
	cfg := setupRuntimeCfg
	setupRuntimeMu.RUnlock()
	return cfg
}
