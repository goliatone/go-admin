package admin

import (
	"context"

	"github.com/goliatone/go-admin/console"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// ConsoleDashboardConfig adapts the existing dashboard renderer and providers.
// Identity must resolve trusted viewer scope; the host then reloads current grants.
type ConsoleDashboardConfig struct {
	Identity       func(AdminContext) (console.Identity, error)
	WidgetTemplate string
}

type ConsolePanelWidgetPayload struct {
	console.Identity
	Panel     console.PanelSnapshot `json:"panel"`
	Watermark uint64                `json:"watermark"`
}

type consoleDashboardIdentityKey struct{}

func (h *ConsoleHost) DashboardArea() string { return "console." + h.config.ID }

// RegisterDashboard registers before Admin.Initialize. Areas and providers are
// instance-namespaced; a collision fails instead of replacing another callback.
func (h *ConsoleHost) RegisterDashboard(admin *Admin, config ConsoleDashboardConfig) error {
	if h.closed() || admin == nil || config.Identity == nil {
		return ErrForbidden
	}
	if !featureEnabled(admin.featureGate, FeatureDashboard) {
		return ErrFeatureDisabled
	}
	dashboard := admin.Dashboard()
	definitions := h.config.Registry.Definitions()
	template, err := normalizeDashboardProviderTemplate(config.WidgetTemplate)
	if err != nil {
		return err
	}
	area := h.DashboardArea()
	dashboard.mu.RLock()
	_, occupied := dashboard.areas[area]
	dashboard.mu.RUnlock()
	if occupied {
		return conflictDomainError("console dashboard area already registered", nil)
	}
	for _, def := range definitions {
		if dashboard.HasProvider(area + "." + def.ID) {
			return conflictDomainError("console dashboard provider already registered", nil)
		}
	}
	admin.RegisterWidgetArea(WidgetAreaDefinition{Code: area, Name: h.config.Title, Scope: h.config.ID})
	for _, def := range definitions {
		panelID := def.ID
		if err := dashboard.RegisterProviderChecked(DashboardProviderSpec{Code: area + "." + panelID, Name: def.Label, Template: template, DefaultArea: area, DefaultSpan: def.Span,
			Handler: func(viewer AdminContext, _ map[string]any) (WidgetPayload, error) {
				identity, found := viewer.Context.Value(consoleDashboardIdentityKey{}).(console.Identity)
				var err error
				if !found {
					identity, err = config.Identity(viewer)
				}
				if err != nil {
					return EmptyWidgetPayload(), ErrForbidden
				}
				snapshot, err := h.Snapshot(viewer.Context, identity)
				if err != nil {
					return EmptyWidgetPayload(), err
				}
				for _, panel := range snapshot.Panels {
					if panel.ID == panelID {
						return WidgetPayloadOf(ConsolePanelWidgetPayload{Identity: identity, Panel: panel, Watermark: snapshot.Watermark}), nil
					}
				}
				return EmptyWidgetPayload(), ErrForbidden
			},
		}); err != nil {
			return err
		}
	}
	h.dashboardAdmin = admin
	return nil
}

// DashboardController reuses the existing SSR runtime. The console's route
// adapter owns rendering and viewer identity; no second dashboard page is mounted.
func (h *ConsoleHost) dashboardController(admin *Admin, template string) (*dashcmp.Controller, error) {
	if h.closed() || admin == nil || admin.dash == nil || admin.dash.runtime == nil {
		return nil, ErrForbidden
	}
	return dashcmp.NewController(dashcmp.ControllerOptions{Service: admin.dash.runtime.Service, Renderer: admin.dashboardRenderer(), Template: template,
		Areas: []dashcmp.AreaSlot{{Slot: "main", Code: h.DashboardArea()}}, PageDecorator: decorateDashboardControllerPage}), nil
}

// DashboardPage isolates layout preferences by the same full identity as records.
// It uses the existing service, renderer and typed page/chrome adapter.
func (h *ConsoleHost) DashboardPage(viewer AdminContext, identity console.Identity, template string) (AdminDashboardPage, error) {
	ctx, done := h.operationContext(viewer.Context)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return AdminDashboardPage{}, err
	}
	controller, err := h.dashboardController(h.dashboardAdmin, template)
	if err != nil {
		return AdminDashboardPage{}, err
	}
	ctx = context.WithValue(ctx, consoleDashboardIdentityKey{}, identity)
	page, err := controller.Page(ctx, dashcmp.ViewerContext{UserID: h.preferenceKey(identity), Locale: viewer.Locale, FallbackLocales: viewer.FallbackLocales})
	if err != nil {
		return AdminDashboardPage{}, err
	}
	if _, _, err := h.current(ctx, identity); err != nil {
		return AdminDashboardPage{}, err
	}
	return ComposeAdminDashboardPage(page), nil
}

func (h *ConsoleHost) SaveDashboardLayout(ctx context.Context, identity console.Identity, overrides dashcmp.LayoutOverrides) error {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return err
	}
	admin := h.dashboardAdmin
	if admin == nil || admin.dash == nil || admin.dash.runtime == nil {
		return ErrForbidden
	}
	area := h.DashboardArea()
	for code := range overrides.AreaOrder {
		if code != area {
			return ErrForbidden
		}
	}
	for code := range overrides.AreaRows {
		if code != area {
			return ErrForbidden
		}
	}
	return admin.dash.runtime.Service.SavePreferences(ctx, dashcmp.ViewerContext{UserID: h.preferenceKey(identity)}, overrides)
}

// Debug dashboard events carry invalidation hints only. Never forward arbitrary
// broadcast Instance configuration/metadata or a payload projected for another
// viewer. The following authorized provider reload supplies records.
func projectDebugDashboardEvent(event dashcmp.WidgetEvent) (dashcmp.WidgetEvent, bool) {
	if event.AreaCode != debugWidgetAreaCode {
		return dashcmp.WidgetEvent{}, false
	}
	return dashcmp.WidgetEvent{AreaCode: debugWidgetAreaCode, Reason: "refresh"}, true
}
