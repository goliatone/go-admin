package quickstart

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"maps"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/templateview"
	client "github.com/goliatone/go-admin/pkg/client"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
	gotemplate "github.com/goliatone/go-template"
)

// DashboardRendererOption customizes the default dashboard renderer setup.
type DashboardRendererOption func(*dashboardRendererOptions)

type dashboardRendererOptions struct {
	templateFS          []fs.FS
	useEmbedded         bool
	templateFuncs       map[string]any
	templateFuncOptions []TemplateFuncOption
}

// WithDashboardTemplatesFS appends a template filesystem to the renderer.
func WithDashboardTemplatesFS(fsys fs.FS) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil || fsys == nil {
			return
		}
		opts.templateFS = append(opts.templateFS, fsys)
	}
}

// WithDashboardEmbeddedTemplates toggles the embedded dashboard templates.
func WithDashboardEmbeddedTemplates(enabled bool) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil {
			return
		}
		opts.useEmbedded = enabled
	}
}

// WithDashboardTemplateFuncs overrides template functions used by the dashboard renderer.
func WithDashboardTemplateFuncs(funcs map[string]any) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil {
			return
		}
		opts.templateFuncs = cloneTemplateFuncMap(funcs)
	}
}

// WithDashboardTemplateFuncOptions configures quickstart.DefaultTemplateFuncs when
// no explicit template function map is provided.
func WithDashboardTemplateFuncOptions(options ...TemplateFuncOption) DashboardRendererOption {
	return func(opts *dashboardRendererOptions) {
		if opts == nil || len(options) == 0 {
			return
		}
		opts.templateFuncOptions = append(opts.templateFuncOptions, options...)
	}
}

// WithDefaultDashboardRenderer registers dashboard SSR against the shared host
// view engine when one is supplied. The standalone renderer remains the
// compatibility fallback for hosts without a shared view engine. The config
// argument is retained for source compatibility; request-scoped shell state is
// composed by Admin and carried by AdminDashboardPage.
func WithDefaultDashboardRenderer(adm *admin.Admin, viewEngine fiber.Views, _ admin.Config, opts ...DashboardRendererOption) error {
	if adm == nil {
		return fmt.Errorf("admin is required")
	}
	dashboard := adm.Dashboard()
	if dashboard == nil {
		return fmt.Errorf("dashboard is required")
	}
	if dashboard.HasRenderer() {
		return nil
	}
	var renderer admin.DashboardRenderer
	if viewEngine != nil {
		renderer = &dashboardViewRenderer{views: viewEngine}
	} else {
		var err error
		renderer, err = NewDashboardTemplateRenderer(opts...)
		if err != nil {
			return err
		}
	}
	dashboard.WithRenderer(renderer)
	return nil
}

type dashboardViewRenderer struct {
	views fiber.Views
}

func (r *dashboardViewRenderer) RenderPage(name string, page admin.AdminDashboardPage, out ...io.Writer) (string, error) {
	if r == nil || r.views == nil {
		return "", fmt.Errorf("dashboard view renderer not initialized")
	}
	templateName := strings.TrimSpace(name)
	if templateName == "" {
		templateName = "dashboard_ssr.html"
	}
	templateName = strings.TrimSuffix(templateName, ".html")
	normalized, err := normalizeDashboardTemplateData(page)
	if err != nil {
		return "", err
	}
	var rendered bytes.Buffer
	if err := r.views.Render(&rendered, templateName, normalized); err != nil {
		return "", err
	}
	html := rendered.String()
	if len(out) > 0 && out[0] != nil {
		if _, err := io.Copy(out[0], strings.NewReader(html)); err != nil {
			return "", err
		}
	}
	return html, nil
}

type dashboardTemplateRenderer struct {
	renderer *gotemplate.Engine
}

// NewDashboardTemplateRenderer builds the default dashboard SSR renderer.
func NewDashboardTemplateRenderer(opts ...DashboardRendererOption) (admin.DashboardRenderer, error) {
	return newDashboardTemplateRenderer(opts...)
}

func newDashboardTemplateRenderer(opts ...DashboardRendererOption) (*dashboardTemplateRenderer, error) {
	options := dashboardRendererOptions{
		useEmbedded: true,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	templateStack := append([]fs.FS{}, options.templateFS...)
	if options.useEmbedded {
		// The full admin shell owns the only packaged dashboard template set.
		if canonical := client.Templates(); canonical != nil {
			templateStack = append(templateStack, canonical)
		}
	}

	templateFS := fallbackFSList(templateStack)
	if templateFS == nil {
		return nil, fmt.Errorf("dashboard templates are required")
	}
	if !options.useEmbedded {
		if err := validateIsolatedDashboardTemplateSet(templateFS); err != nil {
			return nil, err
		}
	}

	templateFuncs := options.templateFuncs
	if templateFuncs == nil {
		templateFuncs = DefaultTemplateFuncs(options.templateFuncOptions...)
	}

	renderer, err := gotemplate.NewRenderer(
		gotemplate.WithFS(templateFS),
		gotemplate.WithExtension(".html"),
		gotemplate.WithTemplateFunc(templateFuncs),
	)
	if err != nil {
		return nil, err
	}
	result := &dashboardTemplateRenderer{renderer: renderer}
	if !options.useEmbedded {
		if err := validateIsolatedDashboardRenderer(result); err != nil {
			return nil, err
		}
	}
	return result, nil
}

func validateIsolatedDashboardTemplateSet(templateFS fs.FS) error {
	required := []string{
		"dashboard_ssr.html",
		"dashboard_widget.html",
		"dashboard_widget_content.html",
		"layout.html",
		"partials/admin-footer.html",
		"partials/breadcrumbs.html",
		"partials/csrf-recovery-alert.html",
		"partials/debug-toolbar.html",
		"partials/jserror-collector.html",
		"partials/menu-item.html",
		"partials/sidebar.html",
		"partials/toast-container.html",
	}
	missing := make([]string, 0)
	for _, identifier := range required {
		if info, err := fs.Stat(templateFS, identifier); err != nil || info.IsDir() {
			missing = append(missing, identifier)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("isolated dashboard template set is incomplete: missing %s", strings.Join(missing, ", "))
	}
	return nil
}

func validateIsolatedDashboardRenderer(renderer *dashboardTemplateRenderer) error {
	html, err := renderer.RenderPage("dashboard_ssr.html", admin.AdminDashboardPage{})
	if err != nil {
		return fmt.Errorf("isolated dashboard template set cannot render the canonical entry point: %w", err)
	}
	lowerHTML := strings.ToLower(html)
	if count := strings.Count(lowerHTML, "<!doctype html>"); count != 1 {
		return fmt.Errorf("isolated dashboard template set is incompatible: document owner marker %q rendered %d times", "<!doctype html>", count)
	}
	for _, check := range []struct {
		name      string
		attribute string
	}{
		{name: "admin shell", attribute: "data-admin-shell"},
		{name: "page header", attribute: "data-admin-page-header"},
		{name: "shell content", attribute: "data-admin-shell-content"},
		{name: "dashboard content", attribute: "data-widget-grid"},
	} {
		if count := countRenderedHTMLAttribute(html, check.attribute); count != 1 {
			return fmt.Errorf("isolated dashboard template set is incompatible: %s attribute %q rendered %d times", check.name, check.attribute, count)
		}
	}
	return nil
}

func countRenderedHTMLAttribute(source, attribute string) int {
	count := 0
	for offset := 0; offset < len(source); {
		index := strings.Index(source[offset:], attribute)
		if index < 0 {
			break
		}
		index += offset
		beforeOK := index > 0 && isHTMLAttributeBoundary(source[index-1])
		after := index + len(attribute)
		afterOK := after == len(source) || isHTMLAttributeBoundary(source[after]) || source[after] == '='
		if beforeOK && afterOK {
			count++
		}
		offset = after
	}
	return count
}

func isHTMLAttributeBoundary(value byte) bool {
	return value == ' ' || value == '\t' || value == '\r' || value == '\n' || value == '>' || value == '/'
}

// RenderPage renders the dashboard template with the typed admin wrapper.
func (r *dashboardTemplateRenderer) RenderPage(name string, page admin.AdminDashboardPage, out ...io.Writer) (string, error) {
	if r == nil || r.renderer == nil {
		return "", fmt.Errorf("dashboard renderer not initialized")
	}
	templateName := strings.TrimSpace(name)
	if templateName == "" {
		templateName = "dashboard_ssr.html"
	}
	normalized, err := normalizeDashboardTemplateData(page)
	if err != nil {
		return "", err
	}
	html, err := r.renderer.Render(templateName, normalized)
	if err != nil {
		return "", err
	}
	if len(out) > 0 && out[0] != nil {
		if _, err := io.Copy(out[0], bytes.NewBufferString(html)); err != nil {
			return "", err
		}
	}
	return html, nil
}

// NormalizeDashboardTemplateData converts a typed go-dashboard page or typed
// admin host wrapper into the serialized template context used by the default
// dashboard renderer.
func NormalizeDashboardTemplateData(data any) (map[string]any, error) {
	renderer := &dashboardTemplateRenderer{}
	normalized, err := renderer.normalizeData(data)
	if err != nil {
		return nil, err
	}
	serialized, err := router.SerializeAsContext(normalized)
	if err != nil {
		return nil, fmt.Errorf("serialize dashboard template context: %w", err)
	}
	templateview.NormalizeContextNumbers(serialized)
	return serialized, nil
}

func normalizeDashboardTemplateData(data any) (map[string]any, error) {
	return NormalizeDashboardTemplateData(data)
}

func (r *dashboardTemplateRenderer) normalizeData(data any) (map[string]any, error) {
	switch v := data.(type) {
	case *admin.AdminDashboardPage:
		if v == nil {
			return r.buildTemplateData(admin.AdminDashboardPage{}), nil
		}
		return r.buildTemplateData(*v), nil
	case admin.AdminDashboardPage:
		return r.buildTemplateData(v), nil
	case *dashcmp.Page:
		if v == nil {
			return r.buildTemplateData(admin.AdminDashboardPage{}), nil
		}
		return r.buildTemplateData(admin.ComposeAdminDashboardPage(*v)), nil
	case dashcmp.Page:
		return r.buildTemplateData(admin.ComposeAdminDashboardPage(v)), nil
	case nil:
		return r.buildTemplateData(admin.AdminDashboardPage{}), nil
	default:
		return nil, fmt.Errorf("unsupported dashboard payload type: %T", data)
	}
}

func (r *dashboardTemplateRenderer) buildTemplateData(page admin.AdminDashboardPage) map[string]any {
	if len(page.Dashboard.Areas) == 0 && page.Chrome.Empty() {
		return map[string]any{
			"title":                     "Dashboard",
			"base_path":                 "",
			"asset_base_path":           "",
			"nav_items":                 []any{},
			"nav_utility_items":         []any{},
			"session_user":              map[string]any{},
			"areas":                     []map[string]any{},
			"layout_json":               "{}",
			"admin_partials":            admin.DefaultAdminStructuralPartials().TemplateContext(),
			"admin_partial_diagnostics": []admin.AdminStructuralPartialDiagnostic(nil),
		}
	}

	areas := dashboardTemplateAreas(page)
	view := baseTemplateContext(page.Chrome.BasePath, page.Title())
	overlayOptionalContext(view, dashboardTemplateChromeContext(page),
		"asset_base_path",
		"api_base_path",
		"body_classes",
		"active",
		"page_title",
		"page_pretitle",
		"page_subtitle",
		"breadcrumbs",
		"hide_page_header",
		"hide_breadcrumbs",
		"page_hooks",
		"nav_items",
		"nav_utility_items",
		"nav_debug",
		"nav_items_json",
		"session_user",
		"theme",
		"external_assets",
		"template_helpers",
		"sidebar_hide_search",
		"sidebar_collapse_placement",
		"sidebar_compact_footer",
		"sidebar_hide_presence",
		"sidebar_hide_user_menu_indicator",
		"translation_capabilities",
		"users_import_available",
		"users_import_enabled",
		"locale",
		"admin_partials",
		"admin_partial_diagnostics",
	)
	view["areas"] = areas
	view["base_path"] = page.Chrome.BasePath
	for key, value := range page.Chrome.CSRFTemplateHelpers {
		if _, exists := view[key]; !exists {
			view[key] = value
		}
	}
	view["layout_json"] = page.LayoutJSON()
	return view
}

func dashboardTemplateAreas(page admin.AdminDashboardPage) []map[string]any {
	areas := make([]map[string]any, 0, len(page.Dashboard.Areas))
	for _, area := range page.Dashboard.Areas {
		widgets := make([]map[string]any, 0, len(area.Widgets))
		for _, widget := range area.Widgets {
			widgets = append(widgets, map[string]any{
				"id": widget.ID, "definition": widget.Definition, "name": widget.Name,
				"template": widget.Template, "area": widget.Area, "data": widget.Data,
				"config": widget.Config, "meta": widget.Meta, "hidden": widget.Hidden,
				"span": normalizeSpan(widget.Span),
			})
		}
		areas = append(areas, map[string]any{
			"slot": area.Slot, "code": area.Code, "title": area.Title, "widgets": widgets,
		})
	}
	return areas
}

func dashboardTemplateChromeContext(page admin.AdminDashboardPage) map[string]any {
	partials := normalizedDashboardAdminPartials(page.Chrome.AdminPartials)
	chrome := page.PageChrome()
	view := map[string]any{
		"asset_base_path":                  page.Chrome.AssetBasePath,
		"api_base_path":                    page.Chrome.APIBasePath,
		"nav_items":                        page.Chrome.NavItems,
		"nav_utility_items":                page.Chrome.NavUtilityItems,
		"nav_debug":                        page.Chrome.NavDebug,
		"nav_items_json":                   page.Chrome.NavItemsJSON,
		"session_user":                     page.Chrome.SessionUser,
		"theme":                            page.Chrome.Theme,
		"external_assets":                  page.Chrome.ExternalAssets,
		"template_helpers":                 page.Chrome.CSRFTemplateHelpers,
		"sidebar_hide_search":              page.Chrome.SidebarHideSearch,
		"sidebar_collapse_placement":       page.Chrome.SidebarCollapsePlacement,
		"sidebar_compact_footer":           page.Chrome.SidebarCompactFooter,
		"sidebar_hide_presence":            page.Chrome.SidebarHidePresence,
		"sidebar_hide_user_menu_indicator": page.Chrome.SidebarHideUserMenuIndicator,
		"translation_capabilities":         page.Chrome.TranslationCapabilities,
		"users_import_available":           page.Chrome.UsersImportAvailable,
		"users_import_enabled":             page.Chrome.UsersImportEnabled,
		"locale":                           page.Dashboard.Locale,
		"admin_partials":                   partials.TemplateContext(),
		"admin_partial_diagnostics":        partials.Diagnostics,
	}
	for key, value := range chrome.TemplateContext() {
		view[key] = value
	}
	return view
}

func normalizedDashboardAdminPartials(selection admin.AdminStructuralPartials) admin.AdminStructuralPartials {
	if selection.Sidebar == "" || selection.Breadcrumbs == "" || selection.Footer == "" {
		defaults := admin.DefaultAdminStructuralPartials()
		if selection.Sidebar == "" {
			selection.Sidebar = defaults.Sidebar
		}
		if selection.Breadcrumbs == "" {
			selection.Breadcrumbs = defaults.Breadcrumbs
		}
		if selection.Footer == "" {
			selection.Footer = defaults.Footer
		}
	}
	return selection.Clone()
}

func normalizeSpan(span int) int {
	if span < 1 || span > 12 {
		return 12
	}
	return span
}

func baseTemplateContext(basePath string, title any) map[string]any {
	resolvedTitle := "Dashboard"
	if titleStr, ok := title.(string); ok && strings.TrimSpace(titleStr) != "" {
		resolvedTitle = strings.TrimSpace(titleStr)
	}
	return map[string]any{
		"title":             resolvedTitle,
		"base_path":         basePath,
		"asset_base_path":   basePath,
		"nav_items":         []any{},
		"nav_utility_items": []any{},
		"session_user":      map[string]any{},
	}
}

func overlayOptionalContext(target map[string]any, source map[string]any, keys ...string) {
	if target == nil || source == nil {
		return
	}
	for _, key := range keys {
		if value, ok := source[key]; ok && value != nil {
			target[key] = value
		}
	}
}

func cloneTemplateFuncMap(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	out := make(map[string]any, len(src))
	maps.Copy(out, src)
	return out
}
