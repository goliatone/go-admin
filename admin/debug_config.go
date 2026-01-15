package admin

import (
	"strings"
	"time"
)

const (
	debugDefaultFeatureKey         = "debug"
	debugDefaultPermission         = "admin.debug.view"
	debugDefaultPathSuffix         = "debug"
	debugDefaultMaxLogEntries      = 500
	debugDefaultMaxSQLQueries      = 200
	debugDefaultSlowQueryThreshold = 50 * time.Millisecond
)

var defaultDebugPanels = []string{
	"template",
	"session",
	"requests",
	"sql",
	"logs",
	"config",
	"routes",
	"custom",
}

// DebugConfig controls the debug module behavior and feature flags.
type DebugConfig struct {
	Enabled            bool
	CaptureSQL         bool
	CaptureLogs        bool
	StrictQueryHooks   bool
	MaxLogEntries      int
	MaxSQLQueries      int
	MaskFieldTypes     map[string]string
	Panels             []string
	FeatureKey         string
	Permission         string
	BasePath           string
	SlowQueryThreshold time.Duration
	AllowedIPs         []string
	PersistLayout      bool
}

func normalizeDebugConfig(cfg DebugConfig, basePath string) DebugConfig {
	cfg.FeatureKey = strings.TrimSpace(cfg.FeatureKey)
	if cfg.FeatureKey == "" {
		cfg.FeatureKey = debugDefaultFeatureKey
	}
	cfg.Permission = strings.TrimSpace(cfg.Permission)
	if cfg.Permission == "" {
		cfg.Permission = debugDefaultPermission
	}
	cfg.BasePath = strings.TrimSpace(cfg.BasePath)
	if cfg.BasePath == "" {
		cfg.BasePath = joinPath(basePath, debugDefaultPathSuffix)
	}
	if cfg.MaxLogEntries <= 0 {
		cfg.MaxLogEntries = debugDefaultMaxLogEntries
	}
	if cfg.MaxSQLQueries <= 0 {
		cfg.MaxSQLQueries = debugDefaultMaxSQLQueries
	}
	if cfg.SlowQueryThreshold <= 0 {
		cfg.SlowQueryThreshold = debugDefaultSlowQueryThreshold
	}
	if cfg.Panels == nil {
		cfg.Panels = append([]string{}, defaultDebugPanels...)
	}
	cfg.Panels = normalizePanelIDs(cfg.Panels)
	cfg.MaskFieldTypes = normalizeMaskFieldTypes(cfg.MaskFieldTypes)
	return cfg
}

func debugConfigEnabled(cfg DebugConfig) bool {
	return cfg.Enabled && len(cfg.Panels) > 0
}

func normalizePanelIDs(panels []string) []string {
	if len(panels) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(panels))
	for _, panel := range panels {
		normalized := strings.ToLower(strings.TrimSpace(panel))
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, normalized)
	}
	return out
}

func normalizeMaskFieldTypes(fields map[string]string) map[string]string {
	if len(fields) == 0 {
		return nil
	}
	out := make(map[string]string, len(fields))
	for field, maskType := range fields {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		out[field] = strings.TrimSpace(maskType)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
