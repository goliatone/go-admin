package admin

import (
	"context"
	"strings"
	"sync"

	debugregistry "github.com/goliatone/go-admin/debug"
)

var debugBuiltinPanelsOnce sync.Once

func ensureDebugBuiltinPanels() {
	debugBuiltinPanelsOnce.Do(func() {
		registerBuiltinDebugPanel(DebugPanelRequests, debugregistry.PanelConfig{
			EventType:   "request",
			SnapshotKey: DebugPanelRequests,
		})
		registerBuiltinDebugPanel(DebugPanelSQL, debugregistry.PanelConfig{
			EventType:   DebugPanelSQL,
			SnapshotKey: DebugPanelSQL,
		})
		registerBuiltinDebugPanel(DebugPanelLogs, debugregistry.PanelConfig{
			EventType:   "log",
			SnapshotKey: DebugPanelLogs,
		})
		registerBuiltinDebugPanel(DebugPanelRoutes, debugregistry.PanelConfig{
			SnapshotKey: DebugPanelRoutes,
		})
		registerBuiltinDebugPanel(DebugPanelConfig, debugregistry.PanelConfig{
			SnapshotKey: DebugPanelConfig,
		})
		registerBuiltinDebugPanel(DebugPanelTemplate, debugregistry.PanelConfig{
			EventType:   DebugPanelTemplate,
			SnapshotKey: DebugPanelTemplate,
		})
		registerBuiltinDebugPanel(DebugPanelSession, debugregistry.PanelConfig{
			EventType:   DebugPanelSession,
			SnapshotKey: DebugPanelSession,
		})
		registerBuiltinDebugPanel(DebugPanelCustom, debugregistry.PanelConfig{
			EventType:   DebugPanelCustom,
			SnapshotKey: DebugPanelCustom,
		})
	})
}

func registerBuiltinDebugPanel(id string, config debugregistry.PanelConfig) {
	normalized := normalizePanelID(id)
	if normalized == "" {
		return
	}
	if meta, ok := debugPanelDefaults[normalized]; ok {
		if config.Label == "" {
			config.Label = meta.Label
		}
		if config.Icon == "" {
			config.Icon = meta.Icon
		}
		if config.Span == 0 {
			config.Span = meta.Span
		}
	}
	if config.Label == "" {
		config.Label = debugPanelLabel(normalized)
	}
	if strings.TrimSpace(config.SnapshotKey) == "" {
		config.SnapshotKey = normalized
	}
	_ = debugregistry.RegisterPanel(normalized, config)
}

func registerDebugPanelFromInterface(panel DebugPanel) {
	if panel == nil {
		return
	}
	id := normalizePanelID(panel.ID())
	if id == "" {
		return
	}
	config := debugregistry.PanelConfig{
		Label:       strings.TrimSpace(panel.Label()),
		Icon:        strings.TrimSpace(panel.Icon()),
		SnapshotKey: id,
		Snapshot: func(ctx context.Context) any {
			return panel.Collect(ctx)
		},
	}
	if spanProvider, ok := panel.(interface{ Span() int }); ok {
		config.Span = spanProvider.Span()
	}
	_ = debugregistry.RegisterPanel(id, config)
}

func debugPanelDefinitionFor(panelID string) debugregistry.PanelDefinition {
	ensureDebugBuiltinPanels()
	normalized := normalizePanelID(panelID)
	if normalized == "" {
		return debugregistry.PanelDefinition{}
	}
	def, ok := debugregistry.PanelDefinitionFor(normalized)
	if !ok {
		def = debugregistry.PanelDefinition{
			ID:              normalized,
			Label:           debugPanelLabel(normalized),
			SnapshotKey:     normalized,
			EventTypes:      debugPanelEventTypes(normalized),
			SupportsToolbar: true,
		}
		if meta, ok := debugPanelDefaults[normalized]; ok {
			if meta.Label != "" {
				def.Label = meta.Label
			}
			if meta.Icon != "" {
				def.Icon = meta.Icon
			}
			if meta.Span > 0 {
				def.Span = meta.Span
			}
		}
		if def.Label == "" {
			def.Label = debugPanelLabel(normalized)
		}
		if def.Span == 0 {
			def.Span = debugPanelDefaultSpan
		}
		return def
	}
	if def.Label == "" {
		def.Label = debugPanelLabel(normalized)
	}
	if def.SnapshotKey == "" {
		def.SnapshotKey = normalized
	}
	if len(def.EventTypes) == 0 {
		def.EventTypes = debugPanelEventTypes(normalized)
	}
	if def.Span == 0 {
		if meta, ok := debugPanelDefaults[normalized]; ok && meta.Span > 0 {
			def.Span = meta.Span
		}
	}
	if def.Label == "" {
		def.Label = debugPanelLabel(normalized)
	}
	return def
}

func debugPanelSnapshotKey(panelID string) string {
	ensureDebugBuiltinPanels()
	normalized := normalizePanelID(panelID)
	if normalized == "" {
		return ""
	}
	def, ok := debugregistry.PanelDefinitionFor(normalized)
	if !ok {
		return normalized
	}
	if def.SnapshotKey == "" {
		return normalized
	}
	return def.SnapshotKey
}
