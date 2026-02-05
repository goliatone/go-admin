package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// DebugPanelDeps provides optional dependencies for debug panel registration.
type DebugPanelDeps struct {
	ScopeBuffer *ScopeDebugBuffer
}

// DebugPanelRegistrar registers a debug panel definition.
type DebugPanelRegistrar func(cfg *admin.Config, deps DebugPanelDeps)

// DebugPanelCatalog maps panel IDs to registration callbacks.
type DebugPanelCatalog map[string]DebugPanelRegistrar

// DefaultDebugPanelCatalog returns the built-in quickstart debug panel catalog.
func DefaultDebugPanelCatalog() DebugPanelCatalog {
	return DebugPanelCatalog{
		ScopeDebugPanelID: func(_ *admin.Config, deps DebugPanelDeps) {
			if deps.ScopeBuffer == nil {
				return
			}
			RegisterScopeDebugPanel(deps.ScopeBuffer)
		},
	}
}

// ConfigureDebugPanels ensures debug panels are enabled in config and registered in the catalog.
func ConfigureDebugPanels(cfg *admin.Config, deps DebugPanelDeps, catalog DebugPanelCatalog) {
	if cfg == nil || !cfg.Debug.Enabled {
		return
	}

	if cfg.Debug.Repl.Enabled {
		if !cfg.Debug.Repl.AppEnabled && !cfg.Debug.Repl.ShellEnabled {
			cfg.Debug.Repl.AppEnabled = true
			cfg.Debug.Repl.ShellEnabled = true
		}
		if cfg.Debug.Repl.AppEnabled {
			addDebugPanel(cfg, admin.DebugPanelConsole, cfg.Debug.ToolbarMode)
		}
		if cfg.Debug.Repl.ShellEnabled {
			addDebugPanel(cfg, admin.DebugPanelShell, cfg.Debug.ToolbarMode)
		}
	}

	if cfg.Debug.CaptureJSErrors {
		addDebugPanel(cfg, admin.DebugPanelJSErrors, cfg.Debug.ToolbarMode)
	}

	if deps.ScopeBuffer != nil {
		addDebugPanel(cfg, ScopeDebugPanelID, cfg.Debug.ToolbarMode)
	}

	RegisterDebugPanelCatalog(cfg, deps, catalog)
}

// RegisterDebugPanelCatalog registers panels defined in the provided catalog.
func RegisterDebugPanelCatalog(cfg *admin.Config, deps DebugPanelDeps, catalog DebugPanelCatalog) {
	if cfg == nil || len(catalog) == 0 {
		return
	}
	seen := map[string]bool{}
	ids := append([]string{}, cfg.Debug.Panels...)
	ids = append(ids, cfg.Debug.ToolbarPanels...)
	for _, panelID := range ids {
		normalized := normalizeDebugPanelID(panelID)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		if register, ok := catalog[normalized]; ok && register != nil {
			register(cfg, deps)
		}
	}
}

// AddDebugPanels appends panels to the debug config, preserving defaults.
func AddDebugPanels(cfg *admin.Config, panels ...string) {
	if cfg == nil || len(panels) == 0 {
		return
	}
	ensureDebugPanels(cfg)
	for _, panel := range panels {
		cfg.Debug.Panels = appendUniqueDebugPanel(cfg.Debug.Panels, panel)
	}
}

func addDebugPanel(cfg *admin.Config, panel string, addToToolbar bool) {
	AddDebugPanels(cfg, panel)
	if !addToToolbar {
		return
	}
	ensureDebugToolbarPanels(cfg)
	cfg.Debug.ToolbarPanels = appendUniqueDebugPanel(cfg.Debug.ToolbarPanels, panel)
}

func ensureDebugPanels(cfg *admin.Config) {
	if cfg == nil || cfg.Debug.Panels != nil {
		return
	}
	panels := admin.DefaultDebugPanels()
	if !cfg.Debug.CaptureJSErrors {
		panels = removeDebugPanel(panels, admin.DebugPanelJSErrors)
	}
	cfg.Debug.Panels = panels
}

func ensureDebugToolbarPanels(cfg *admin.Config) {
	if cfg == nil || cfg.Debug.ToolbarPanels != nil {
		return
	}
	panels := admin.DefaultDebugToolbarPanels()
	if !cfg.Debug.CaptureJSErrors {
		panels = removeDebugPanel(panels, admin.DebugPanelJSErrors)
	}
	cfg.Debug.ToolbarPanels = panels
}

func appendUniqueDebugPanel(panels []string, panel string) []string {
	normalized := normalizeDebugPanelID(panel)
	if normalized == "" {
		return panels
	}
	for _, existing := range panels {
		if normalizeDebugPanelID(existing) == normalized {
			return panels
		}
	}
	return append(panels, normalized)
}

func normalizeDebugPanelID(panel string) string {
	return strings.ToLower(strings.TrimSpace(panel))
}

func removeDebugPanel(panels []string, panel string) []string {
	normalized := normalizeDebugPanelID(panel)
	if normalized == "" || len(panels) == 0 {
		return panels
	}
	out := make([]string, 0, len(panels))
	for _, candidate := range panels {
		if normalizeDebugPanelID(candidate) == normalized {
			continue
		}
		out = append(out, candidate)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
