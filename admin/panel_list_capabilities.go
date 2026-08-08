package admin

import (
	"context"
	"slices"
	"strings"
)

// PanelListCapabilities describes the optional operations supported by a panel
// list. Selection is derived from operations that consume selected record IDs.
type PanelListCapabilities struct {
	Selection bool `json:"selection"`
	Bulk      bool `json:"bulk"`
	Export    bool `json:"export"`
}

// ResolvePanelListCapabilities returns a normalized list capability projection.
func ResolvePanelListCapabilities(bulk, export bool) PanelListCapabilities {
	return PanelListCapabilities{
		Selection: bulk || export,
		Bulk:      bulk,
		Export:    export,
	}
}

// Normalized enforces the selection invariant for public callers.
func (c PanelListCapabilities) Normalized() PanelListCapabilities {
	return ResolvePanelListCapabilities(c.Bulk, c.Export)
}

// ExportAPIAvailable reports whether export routes were successfully registered
// by the boot pipeline.
func (a *Admin) ExportAPIAvailable() bool {
	return a.exportAPIEndpoint() != ""
}

func (a *Admin) recordExportRoutesAvailable(endpoint string) {
	if a == nil || strings.TrimSpace(endpoint) == "" {
		return
	}
	a.exportRoutesMu.Lock()
	a.exportRoutesEndpoint = strings.TrimSpace(endpoint)
	a.exportRoutesMu.Unlock()
}

func (a *Admin) exportAPIEndpoint() string {
	if a == nil || !featureEnabled(a.featureGate, FeatureExport) {
		return ""
	}
	a.exportRoutesMu.RLock()
	defer a.exportRoutesMu.RUnlock()
	return a.exportRoutesEndpoint
}

// ResolvePanelExportConfig returns usable export metadata for a panel list.
// Unknown variants fall back to the base definition. Registry errors fail
// closed and are logged so view/schema rendering does not advertise a broken
// operation.
func (a *Admin) ResolvePanelExportConfig(ctx context.Context, definition, variant string) *ExportConfig {
	if a == nil || a.exportRegistry == nil {
		return nil
	}
	endpoint := a.exportAPIEndpoint()
	if endpoint == "" {
		return nil
	}
	definition = strings.TrimSpace(definition)
	if definition == "" {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	registered, err := a.exportRegistry.GetDefinition(ctx, definition)
	if err != nil {
		a.loggerFor("admin.export").Warn("panel export capability unavailable",
			"definition", definition,
			"variant", strings.TrimSpace(variant),
			"error", err,
		)
		return nil
	}
	if strings.TrimSpace(registered.Name) != definition {
		return nil
	}

	config := &ExportConfig{
		Definition: definition,
		Endpoint:   endpoint,
	}
	variant = strings.TrimSpace(variant)
	if variant != "" && slices.Contains(registered.Variants, variant) {
		config.Variant = variant
	}
	return config
}

// AuthorizedPanelBulkActions filters panel bulk actions using every normalized
// required permission. A missing authorizer preserves the existing permissive
// compatibility behavior.
func (a *Admin) AuthorizedPanelBulkActions(ctx context.Context, panelName string, actions []Action) []Action {
	if len(actions) == 0 {
		return nil
	}
	if a == nil || a.authorizer == nil {
		return append([]Action{}, actions...)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	panelName = strings.TrimSpace(panelName)
	out := make([]Action, 0, len(actions))
	for _, action := range actions {
		permissions := append([]string(nil), action.PermissionsAll...)
		permissions = append(permissions, action.Permission)
		if !CanAll(a.authorizer, ctx, panelName, permissions...) {
			continue
		}
		out = append(out, action)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
