package helpers

import (
	"strings"
	"sync"

	"github.com/goliatone/go-admin/quickstart"
)

// RuntimeConfig controls helpers package runtime defaults.
type RuntimeConfig struct {
	Scope quickstart.ScopeConfig `json:"scope"`
}

var (
	helpersRuntimeMu  sync.RWMutex
	helpersRuntimeCfg = defaultRuntimeConfig()
)

func defaultRuntimeConfig() RuntimeConfig {
	return RuntimeConfig{
		Scope: quickstart.DefaultScopeConfig(),
	}
}

// ConfigureRuntime applies helper runtime defaults.
func ConfigureRuntime(cfg RuntimeConfig) {
	helpersRuntimeMu.Lock()
	scope := quickstart.NormalizeScopeConfig(cfg.Scope)
	if strings.TrimSpace(string(scope.Mode)) == "" {
		scope = quickstart.DefaultScopeConfig()
	}
	cfg.Scope = scope
	helpersRuntimeCfg = cfg
	helpersRuntimeMu.Unlock()
}

func runtimeConfig() RuntimeConfig {
	helpersRuntimeMu.RLock()
	cfg := helpersRuntimeCfg
	helpersRuntimeMu.RUnlock()
	return cfg
}
