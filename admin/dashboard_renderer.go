package admin

import (
	"encoding/json"
	"io"
	"maps"
	"strings"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

const adminDashboardChromeExtensionKey = "go_admin.chrome"

// DashboardRenderer defines the typed renderer contract used by go-admin.
// Host chrome is composed at the route edge and passed alongside the canonical
// go-dashboard page model.
type DashboardRenderer interface {
	RenderPage(name string, page AdminDashboardPage, out ...io.Writer) (string, error)
}

// DashboardRendererFunc adapts a function to DashboardRenderer.
type DashboardRendererFunc func(name string, page AdminDashboardPage, out ...io.Writer) (string, error)

// RenderPage implements DashboardRenderer.
func (fn DashboardRendererFunc) RenderPage(name string, page AdminDashboardPage, out ...io.Writer) (string, error) {
	return fn(name, page, out...)
}

type dashboardRendererAdapter struct {
	renderer DashboardRenderer
}

func adaptDashboardRenderer(renderer DashboardRenderer) dashcmp.Renderer {
	if renderer == nil {
		return nil
	}
	return dashboardRendererAdapter{renderer: renderer}
}

func (adapter dashboardRendererAdapter) RenderPage(name string, page dashcmp.Page, out ...io.Writer) (string, error) {
	return adapter.renderer.RenderPage(name, ComposeAdminDashboardPage(page), out...)
}

// AdminDashboardPage is the route/template-edge wrapper around the canonical
// typed go-dashboard page.
type AdminDashboardPage struct {
	Dashboard dashcmp.Page     `json:"dashboard"`
	Chrome    AdminChromeState `json:"chrome"`
}

// ComposeAdminDashboardPage rebuilds the typed admin route wrapper from the raw
// go-dashboard page. Route/page decoration stores host chrome in page metadata
// so renderers can reconstruct it without reintroducing payload-map mutation.
func ComposeAdminDashboardPage(page dashcmp.Page) AdminDashboardPage {
	return AdminDashboardPage{
		Dashboard: page,
		Chrome:    adminChromeStateFromPage(page),
	}
}

// Title returns the preferred page title after host composition.
func (page AdminDashboardPage) Title() string {
	if title := strings.TrimSpace(page.Chrome.Title); title != "" {
		return title
	}
	if title := strings.TrimSpace(page.Dashboard.Title); title != "" {
		return title
	}
	return "Dashboard"
}

// LayoutJSON derives the dashboard state JSON from the canonical typed page.
func (page AdminDashboardPage) LayoutJSON() string {
	return adminDashboardLayoutJSON(page.Dashboard, page.Chrome.BasePath)
}

// AdminChromeState captures host chrome metadata needed by go-admin templates.
type AdminChromeState struct {
	Title                        string                       `json:"title,omitempty"`
	PageHeader                   AdminPageHeader              `json:"page_header"`
	BasePath                     string                       `json:"base_path,omitempty"`
	AssetBasePath                string                       `json:"asset_base_path,omitempty"`
	APIBasePath                  string                       `json:"api_base_path,omitempty"`
	BodyClasses                  string                       `json:"body_classes,omitempty"`
	Active                       string                       `json:"active,omitempty"`
	NavItems                     []any                        `json:"nav_items,omitempty"`
	NavUtilityItems              []any                        `json:"nav_utility_items,omitempty"`
	SessionUser                  map[string]any               `json:"session_user,omitempty"`
	Theme                        map[string]map[string]string `json:"theme,omitempty"`
	ExternalAssets               map[string]string            `json:"external_assets,omitempty"`
	CSRFTemplateHelpers          map[string]string            `json:"csrf_template_helpers,omitempty"`
	SidebarHideSearch            bool                         `json:"sidebar_hide_search,omitempty"`
	SidebarCollapsePlacement     SidebarCollapsePlacement     `json:"sidebar_collapse_placement,omitempty"`
	SidebarCompactFooter         bool                         `json:"sidebar_compact_footer,omitempty"`
	SidebarHidePresence          bool                         `json:"sidebar_hide_presence,omitempty"`
	SidebarHideUserMenuIndicator bool                         `json:"sidebar_hide_user_menu_indicator,omitempty"`
	TranslationCapabilities      map[string]any               `json:"translation_capabilities,omitempty"`
	UsersImportAvailable         bool                         `json:"users_import_available,omitempty"`
	UsersImportEnabled           bool                         `json:"users_import_enabled,omitempty"`
	NavDebug                     bool                         `json:"nav_debug,omitempty"`
	NavItemsJSON                 string                       `json:"nav_items_json,omitempty"`
	AdminPartials                AdminStructuralPartials      `json:"admin_partials"`
}

func (state AdminChromeState) Empty() bool {
	return !adminChromeHasText(state) && !adminChromeHasCollections(state) && !adminChromeHasFlags(state)
}

func adminChromeHasText(state AdminChromeState) bool {
	for _, value := range []string{
		state.Title, state.BasePath, state.AssetBasePath, state.APIBasePath,
		state.BodyClasses, state.Active, string(state.SidebarCollapsePlacement), state.NavItemsJSON,
	} {
		if strings.TrimSpace(value) != "" {
			return true
		}
	}
	return false
}

func adminChromeHasCollections(state AdminChromeState) bool {
	return len(state.NavItems) > 0 || len(state.NavUtilityItems) > 0 || len(state.SessionUser) > 0 ||
		len(state.Theme) > 0 || len(state.ExternalAssets) > 0 || len(state.CSRFTemplateHelpers) > 0 ||
		len(state.TranslationCapabilities) > 0 || len(state.PageHeader.Breadcrumbs) > 0 || len(state.PageHeader.Hooks) > 0 ||
		state.AdminPartials.Sidebar != "" ||
		state.AdminPartials.Breadcrumbs != "" || state.AdminPartials.Footer != ""
}

func adminChromeHasFlags(state AdminChromeState) bool {
	return state.SidebarHideSearch || state.SidebarCompactFooter || state.SidebarHidePresence ||
		state.SidebarHideUserMenuIndicator || state.UsersImportAvailable || state.UsersImportEnabled || state.NavDebug ||
		state.PageHeader.HideHeader || state.PageHeader.HideBreadcrumbs
}

func withAdminChromeState(page dashcmp.Page, state AdminChromeState) (dashcmp.Page, error) {
	if title := strings.TrimSpace(state.Title); title != "" {
		page.Title = title
	}
	if state.Empty() {
		return page, nil
	}

	encoded, err := json.Marshal(cloneAdminChromeState(state))
	if err != nil {
		return dashcmp.Page{}, err
	}

	meta := clonePageMeta(page.Meta)
	if meta.Extensions == nil {
		meta.Extensions = map[string]json.RawMessage{}
	}
	meta.Extensions[adminDashboardChromeExtensionKey] = encoded
	page.Meta = meta
	return page, nil
}

func adminChromeStateFromPage(page dashcmp.Page) AdminChromeState {
	if page.Meta == nil || len(page.Meta.Extensions) == 0 {
		return AdminChromeState{}
	}
	raw, ok := page.Meta.Extensions[adminDashboardChromeExtensionKey]
	if !ok || len(raw) == 0 {
		return AdminChromeState{}
	}
	var state AdminChromeState
	if err := json.Unmarshal(raw, &state); err != nil {
		return AdminChromeState{}
	}
	return cloneAdminChromeState(state)
}

func cloneAdminChromeState(state AdminChromeState) AdminChromeState {
	if len(state.NavItems) > 0 {
		state.NavItems = append([]any{}, state.NavItems...)
	}
	if len(state.NavUtilityItems) > 0 {
		state.NavUtilityItems = append([]any{}, state.NavUtilityItems...)
	}
	state.SessionUser = cloneAny(state.SessionUser)
	state.Theme = cloneNestedStringMap(state.Theme)
	state.ExternalAssets = cloneStringMap(state.ExternalAssets)
	state.CSRFTemplateHelpers = cloneStringMap(state.CSRFTemplateHelpers)
	state.TranslationCapabilities = cloneAny(state.TranslationCapabilities)
	state.PageHeader.Breadcrumbs = append([]AdminPageHeaderBreadcrumb(nil), state.PageHeader.Breadcrumbs...)
	state.PageHeader.Hooks = cloneStringMap(state.PageHeader.Hooks)
	state.AdminPartials = state.AdminPartials.Clone()
	return state
}

func cloneNestedStringMap(input map[string]map[string]string) map[string]map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]map[string]string, len(input))
	for key, value := range input {
		if len(value) == 0 {
			out[key] = map[string]string{}
			continue
		}
		nested := make(map[string]string, len(value))
		maps.Copy(nested, value)
		out[key] = nested
	}
	return out
}

func clonePageMeta(meta *dashcmp.PageMeta) *dashcmp.PageMeta {
	if meta == nil {
		return &dashcmp.PageMeta{}
	}
	cloned := &dashcmp.PageMeta{}
	if len(meta.Extensions) > 0 {
		cloned.Extensions = make(map[string]json.RawMessage, len(meta.Extensions))
		for key, value := range meta.Extensions {
			if len(value) == 0 {
				cloned.Extensions[key] = nil
				continue
			}
			cloned.Extensions[key] = append(json.RawMessage(nil), value...)
		}
	}
	return cloned
}

func adminDashboardAreaPayloads(page dashcmp.Page) []map[string]any {
	areas := make([]map[string]any, 0, len(page.Areas))
	for _, area := range page.Areas {
		widgets := make([]map[string]any, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			widgets = append(widgets, map[string]any{
				"id":         widget.ID,
				"definition": widget.Definition,
				"name":       widget.Name,
				"template":   widget.Template,
				"area":       widget.Area,
				"area_code":  widget.Area,
				"span":       widget.Span,
				"hidden":     widget.Hidden,
				"config":     cloneAny(widget.Config),
				"data":       widget.Data,
			})
		}
		payload := map[string]any{
			"slot":    area.Slot,
			"code":    area.Code,
			"title":   area.Title,
			"widgets": widgets,
		}
		areas = append(areas, payload)
	}
	return areas
}

func adminDashboardLayoutJSON(page dashcmp.Page, basePath string) string {
	encoded, err := json.Marshal(map[string]any{
		"areas":    adminDashboardAreaPayloads(page),
		"basePath": basePath,
	})
	if err != nil {
		return "{}"
	}
	return string(encoded)
}
