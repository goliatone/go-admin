package stores

import (
	"strings"
	"sync"
)

// RuntimeConfig controls stores package runtime defaults.
type RuntimeConfig struct {
	CMSDSN     string `json:"cmsdsn"`
	ContentDSN string `json:"content_dsn"`
}

var (
	storesRuntimeMu  sync.RWMutex
	storesRuntimeCfg = RuntimeConfig{}
)

// ConfigureRuntime applies store runtime defaults.
func ConfigureRuntime(cfg RuntimeConfig) {
	storesRuntimeMu.Lock()
	storesRuntimeCfg = cfg
	storesRuntimeMu.Unlock()
}

func currentRuntimeConfig() RuntimeConfig {
	storesRuntimeMu.RLock()
	cfg := storesRuntimeCfg
	storesRuntimeMu.RUnlock()
	return cfg
}

func configuredContentDSN() string {
	cfg := currentRuntimeConfig()
	if value := strings.TrimSpace(cfg.ContentDSN); value != "" {
		return value
	}
	if value := strings.TrimSpace(cfg.CMSDSN); value != "" {
		return value
	}
	return ""
}
