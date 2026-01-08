package helpers

import (
	"context"

	"github.com/goliatone/go-admin/pkg/admin"
)

// TabContentKind identifies how tab content should be resolved by the host app.
type TabContentKind string

const (
	TabContentUnknown   TabContentKind = ""
	TabContentDetails   TabContentKind = "details"
	TabContentDashboard TabContentKind = "dashboard_area"
	TabContentCMS       TabContentKind = "cms_area"
	TabContentPanel     TabContentKind = "panel"
	TabContentTemplate  TabContentKind = "template"
)

const (
	UserProfileAreaCode        = "admin.users.detail.profile"
	UserActivityAreaCode       = "admin.users.detail.activity"
	UserProfileWidgetCode      = "admin.widget.user_profile_overview"
	UserActivityWidgetCode     = "admin.widget.user_activity_feed"
	UserProfileWidgetLabel     = "Profile Overview"
	UserActivityWidgetLabel    = "User Activity"
	UserDetailAreaScope        = "users.detail"
	UserDetailEmptyPanelNotice = "No widgets configured for this tab."
)

// TabContentSpec describes where content should be sourced for a tab.
type TabContentSpec struct {
	Kind     TabContentKind
	AreaCode string
	Panel    string
	Template string
	Data     map[string]any
}

// TabContentResolver maps (panel, record, tab) to a content specification.
type TabContentResolver interface {
	ResolveTabContent(ctx context.Context, panelName string, record map[string]any, tab admin.PanelTab) (TabContentSpec, error)
}

// TabContentResolverFunc adapts a function to the TabContentResolver interface.
type TabContentResolverFunc func(ctx context.Context, panelName string, record map[string]any, tab admin.PanelTab) (TabContentSpec, error)

func (f TabContentResolverFunc) ResolveTabContent(ctx context.Context, panelName string, record map[string]any, tab admin.PanelTab) (TabContentSpec, error) {
	return f(ctx, panelName, record, tab)
}

// TabContentRegistry stores explicit mappings for per-panel tab content.
type TabContentRegistry struct {
	specs map[string]TabContentSpec
}

func NewTabContentRegistry() *TabContentRegistry {
	return &TabContentRegistry{specs: map[string]TabContentSpec{}}
}

func (r *TabContentRegistry) Register(panelName, tabID string, spec TabContentSpec) {
	if r == nil {
		return
	}
	if r.specs == nil {
		r.specs = map[string]TabContentSpec{}
	}
	r.specs[TabKey(panelName, tabID)] = spec
}

func (r *TabContentRegistry) ResolveTabContent(ctx context.Context, panelName string, record map[string]any, tab admin.PanelTab) (TabContentSpec, error) {
	if r == nil {
		return TabContentSpec{}, nil
	}
	if r.specs != nil {
		if spec, ok := r.specs[TabKey(panelName, tab.ID)]; ok {
			return spec, nil
		}
	}
	return TabContentSpec{}, nil
}

// TabRenderMode controls how tab panels are rendered.
type TabRenderMode string

const (
	TabRenderModeSSR    TabRenderMode = "ssr"
	TabRenderModeHybrid TabRenderMode = "hybrid"
	TabRenderModeClient TabRenderMode = "client"
)

// TabRenderModeSelector picks a render mode for a tab (defaults + overrides).
type TabRenderModeSelector struct {
	Default   TabRenderMode
	Overrides map[string]TabRenderMode
}

func (s TabRenderModeSelector) ModeFor(panelName string, tab admin.PanelTab, spec TabContentSpec) TabRenderMode {
	if s.Default == "" {
		s.Default = TabRenderModeSSR
	}
	if s.Overrides != nil {
		if mode, ok := s.Overrides[TabKey(panelName, tab.ID)]; ok {
			return mode
		}
	}
	return s.Default
}

// IsInlineTab returns true for tab specs intended to render inside the detail view.
func IsInlineTab(spec TabContentSpec) bool {
	switch spec.Kind {
	case TabContentDetails, TabContentDashboard, TabContentCMS, TabContentTemplate, TabContentPanel:
		return true
	default:
		return false
	}
}

// TabKey builds a stable map key for per-panel tab overrides.
func TabKey(panelName, tabID string) string {
	if panelName == "" {
		return tabID
	}
	return panelName + ":" + tabID
}

// ResolveTabWidgets builds template-ready widget payloads for a dashboard/CMS area.
func ResolveTabWidgets(ctx admin.AdminContext, adm *admin.Admin, basePath, areaCode string) ([]map[string]any, error) {
	if adm == nil || adm.Dashboard() == nil || areaCode == "" {
		return nil, nil
	}
	theme := adm.Theme(ctx.Context)
	layout, err := adm.Dashboard().RenderLayout(ctx, theme, basePath)
	if err != nil {
		return nil, err
	}
	return widgetsForArea(layout, areaCode), nil
}

// ApplyUserProfileWidgetOverrides injects record data into profile widgets.
func ApplyUserProfileWidgetOverrides(widgets []map[string]any, record map[string]any) {
	if len(widgets) == 0 || record == nil {
		return
	}
	values := map[string]any{
		"Username": record["username"],
		"Email":    record["email"],
		"Role":     record["role"],
		"Status":   record["status"],
		"Created":  record["created_at"],
	}
	for _, widget := range widgets {
		if widget["definition"] != UserProfileWidgetCode {
			continue
		}
		data, ok := widget["data"].(map[string]any)
		if !ok || data == nil {
			data = map[string]any{}
		}
		data["values"] = values
		widget["data"] = data
	}
}

func widgetsForArea(layout *admin.DashboardLayout, areaCode string) []map[string]any {
	if layout == nil || areaCode == "" {
		return nil
	}
	for _, area := range layout.Areas {
		if area == nil || area.Code != areaCode {
			continue
		}
		out := make([]map[string]any, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			if widget == nil {
				continue
			}
			span := widget.Span
			if span <= 0 {
				span = 12
			}
			out = append(out, map[string]any{
				"id":         widget.ID,
				"definition": widget.Definition,
				"area":       widget.Area,
				"data":       widget.Data,
				"config":     widget.Config,
				"metadata":   widget.Metadata,
				"hidden":     widget.Hidden,
				"span":       span,
			})
		}
		return out
	}
	return nil
}
