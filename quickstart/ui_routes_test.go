package quickstart

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type uiRoutesCaptureRouter struct {
	getHandlers map[string]router.HandlerFunc
	getPaths    []string
}

type stubTranslationSSRPresenter struct {
	pages map[string]admin.TranslationSSRPage
	err   error
}

type capturingTranslationSSRPresenter struct {
	stubTranslationSSRPresenter
	familyListInput admin.TranslationSSRPresenterInput
}

func (s stubTranslationSSRPresenter) Dashboard(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceDashboard)
}

func (s stubTranslationSSRPresenter) FamilyList(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceFamilyList)
}

func (p *capturingTranslationSSRPresenter) FamilyList(c router.Context, input admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	p.familyListInput = input
	return p.stubTranslationSSRPresenter.FamilyList(c, input)
}

func (s stubTranslationSSRPresenter) FamilyDetail(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceFamilyDetail)
}

func (s stubTranslationSSRPresenter) Queue(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceQueue)
}

func (s stubTranslationSSRPresenter) Editor(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceEditor)
}

func (s stubTranslationSSRPresenter) page(surface string) (admin.TranslationSSRPage, error) {
	if s.err != nil {
		return admin.TranslationSSRPage{}, s.err
	}
	if page, ok := s.pages[surface]; ok {
		return page, nil
	}
	return admin.TranslationSSRPage{Surface: surface, Data: map[string]any{"hydrated": true}}, nil
}

func newUIRoutesCaptureRouter() *uiRoutesCaptureRouter {
	return &uiRoutesCaptureRouter{
		getHandlers: map[string]router.HandlerFunc{},
	}
}

func (r *uiRoutesCaptureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *uiRoutesCaptureRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *uiRoutesCaptureRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *uiRoutesCaptureRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(r)
	}
	_ = path
	return r
}

func (r *uiRoutesCaptureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *uiRoutesCaptureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = mw
	r.getHandlers[path] = handler
	r.getPaths = append(r.getPaths, path)
	return nil
}

func (r *uiRoutesCaptureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _, _ = prefix, root, config
	return r
}

func (r *uiRoutesCaptureRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *uiRoutesCaptureRouter) Routes() []router.RouteDefinition { return nil }
func (r *uiRoutesCaptureRouter) ValidateRoutes() []error          { return nil }
func (r *uiRoutesCaptureRouter) PrintRoutes()                     {}
func (r *uiRoutesCaptureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestTranslationExchangeUIConfigForAdminReadsCapabilitySnapshot(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileCoreExchange,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
				Store:   &stubQuickstartTranslationExchangeStore{},
				UI: TranslationExchangeUIConfig{
					SourceLocale: "en",
					TargetLocales: []TranslationExchangeLocaleOption{
						{Code: "bo", Label: "BO"},
						{Code: "zh", Label: "ZH"},
					},
					Resources: []TranslationExchangeResourceOption{{ID: "archive_items", Label: "Archive items"}},
				},
			},
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	ui := translationExchangeUIConfigForAdmin(adm)
	if !ui.Configured {
		t.Fatalf("expected exchange UI config in capability snapshot")
	}
	if ui.SourceLocale != "en" {
		t.Fatalf("expected source locale en, got %q", ui.SourceLocale)
	}
	if got := strings.Join(localeOptionCodes(ui.TargetLocales), ","); got != "bo,zh" {
		t.Fatalf("expected target locales bo,zh, got %q", got)
	}
	if got := strings.Join(resourceOptionIDs(ui.Resources), ","); got != "archive_items" {
		t.Fatalf("expected archive resource, got %q", got)
	}
}

func TestTranslationExchangeTemplateSerializesUIConfigAndTemplateMetadata(t *testing.T) {
	raw, err := os.ReadFile("../pkg/client/templates/resources/translations/exchange.html")
	if err != nil {
		t.Fatalf("read exchange template: %v", err)
	}
	template := string(raw)
	for _, expected := range []string{
		"translation_exchange_ui_config.template.href",
		"translation_exchange_ui_config.template.format",
		"translation_exchange_ui_config.template.filename",
		"translation_exchange_ui_config.template.label",
		"const exchangeUIConfig = {{ toJSON(translation_exchange_ui_config)|safe }};",
		"exchangeUIConfig,",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected exchange template to contain %q", expected)
		}
	}
}

func TestTranslationFamilyDetailTemplateRendersSSRSections(t *testing.T) {
	raw, err := os.ReadFile("../pkg/client/templates/resources/translations/family-detail.html")
	if err != nil {
		t.Fatalf("read family detail template: %v", err)
	}
	template := string(raw)
	for _, expected := range []string{
		"translation_family_detail_ssr.Data",
		"Locale coverage",
		"Assignments",
		"Publish gate",
		"Activity preview",
		"data-ssr-enhanced=\"true\"",
		"data-family-assignment-action=\"claim\"",
		"data-locale-assignment-source=\"empty-panel\" aria-disabled=\"true\" disabled",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected family detail template to contain %q", expected)
		}
	}
	if strings.Contains(template, "id=\"translation-family-detail-root\"") && strings.Contains(template, "></div>") {
		t.Fatalf("expected family detail root to contain SSR markup, found empty root pattern")
	}
}

func TestTranslationDashboardAndFamiliesTemplatesRenderSSRSections(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected []string
	}{
		{
			name: "dashboard",
			path: "../pkg/client/templates/resources/translations/dashboard.html",
			expected: []string{
				"translation_dashboard_ssr.Data",
				"data-translation-dashboard-ssr=\"true\"",
				"Translation dashboard metrics",
				"Translation dashboard triage",
				"data-ssr-enhanced=\"true\"",
			},
		},
		{
			name: "families",
			path: "../pkg/client/templates/resources/translations/families.html",
			expected: []string{
				"translation_families_ssr",
				"data-translation-family-list-ssr=\"true\"",
				"data-family-list-filters=\"true\"",
				"translation_family_base_path",
				"data-ssr-enhanced=\"true\"",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, err := os.ReadFile(tt.path)
			if err != nil {
				t.Fatalf("read template: %v", err)
			}
			template := string(raw)
			for _, expected := range tt.expected {
				if !strings.Contains(template, expected) {
					t.Fatalf("expected %s template to contain %q", tt.name, expected)
				}
			}
		})
	}
}

func TestTranslationQueueTemplateRendersSSRSections(t *testing.T) {
	raw, err := os.ReadFile("../pkg/client/templates/resources/translations/shell.html")
	if err != nil {
		t.Fatalf("read queue shell template: %v", err)
	}
	template := string(raw)
	for _, expected := range []string{
		"translation_queue_ssr",
		"data-translation-queue-ssr=\"true\"",
		"data-queue-filter-summary=\"true\"",
		"data-queue-row-action=\"claim\"",
		"data-bulk-action-endpoint",
		"data-ssr-enhanced",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected queue template to contain %q", expected)
		}
	}
}

func TestTranslationQueueTemplateRendersUIPresetLinks(t *testing.T) {
	html := renderTranslationUITemplate(t, "resources/translations/shell", fiber.Map{
		"translation_shell_surface":              "queue",
		"translation_shell_title":                "Translation Queue",
		"translation_shell_description":          "Queue",
		"translation_shell_api_path":             "/admin/api/translations/assignments",
		"translation_queue_bulk_action_api_path": "/admin/api/translations/assignment-actions/bulk",
		"translation_queue_editor_base_path":     "/admin/translations/assignments",
		"translation_queue_initial_preset":       "open",
		"translation_queue_ssr": admin.TranslationSSRPage{
			Surface: admin.TranslationSSRSurfaceQueue,
			Meta: map[string]any{
				"total":        1,
				"page":         1,
				"per_page":     50,
				"channel":      "staging",
				"default_sort": map[string]any{"sort": "updated_at", "order": "desc"},
			},
			Data: map[string]any{
				"rows": []map[string]any{{
					"assignment_id": "asg-1",
					"family_id":     "family-1",
					"target_locale": "es",
					"status":        "pending",
					"row_version":   2,
					"actions": map[string]any{
						"claim":   map[string]any{"enabled": true},
						"release": map[string]any{"enabled": false, "reason": "not assigned"},
					},
				}, {
					"id":               "family:family-2",
					"row_type":         "family",
					"family_id":        "family-2",
					"family_label":     "Family Two",
					"assignment_count": 3,
					"locale_count":     2,
					"expansion": map[string]any{
						"href": "/admin/api/translations/assignments/families/family-2?channel=staging",
					},
				}},
			},
			DataGrid: map[string]any{
				"saved_filter_presets": []map[string]any{{
					"id":    "open",
					"label": "Open",
					"href":  "/admin/translations/queue?channel=staging&order=desc&preset=open&sort=updated_at&status=pending%2Cassigned",
				}},
				"grouping":       map[string]any{"mode": "none"},
				"bulk_selection": map[string]any{"mode": "current_page"},
			},
			Links:      map[string]any{"queue": "/admin/translations/queue"},
			EmptyState: map[string]any{"description": "No assignments match."},
		},
	})

	if strings.Contains(html, "/admin/api/translations/assignments?preset=") {
		t.Fatalf("expected queue preset links to use UI route, got %q", html)
	}
	if !strings.Contains(html, `href="/admin/translations/queue?channel=staging&amp;order=desc&amp;preset=open&amp;sort=updated_at&amp;status=pending%2Cassigned"`) {
		t.Fatalf("expected rendered queue preset href to preserve UI route and channel, got %q", html)
	}
	if !strings.Contains(html, `data-queue-row-type="family"`) {
		t.Fatalf("expected grouped family parent row markup, got %q", html)
	}
	if !strings.Contains(html, `href="/admin/api/translations/assignments/families/family-2?channel=staging"`) {
		t.Fatalf("expected grouped family expansion link to preserve channel, got %q", html)
	}
	if strings.Contains(html, `data-assignment-id="family:family-2"`) {
		t.Fatalf("expected grouped family parent not to render assignment action wiring, got %q", html)
	}
}

func TestTranslationFamiliesTemplateRendersActiveFilterValues(t *testing.T) {
	html := renderTranslationUITemplate(t, "resources/translations/families", fiber.Map{
		"translation_families_api_path": "/admin/api/translations/families",
		"translation_family_base_path":  "/admin/translations/families",
		"translation_matrix_path":       "/admin/translations/matrix",
		"translation_queue_path":        "/admin/translations/queue",
		"translation_families_ssr": admin.TranslationSSRPage{
			Surface: admin.TranslationSSRSurfaceFamilyList,
			Meta: map[string]any{
				"total":    1,
				"page":     1,
				"per_page": 50,
				"channel":  "staging",
			},
			Data: map[string]any{
				"families": []map[string]any{{
					"family_id":       "family-1",
					"source_title":    "Family One",
					"source_locale":   "en",
					"content_type":    "pages",
					"readiness_state": "blocked",
					"ssr_links": map[string]any{
						"detail": "/admin/translations/families/family-1?channel=staging",
						"matrix": "/admin/translations/matrix?channel=staging&content_type=pages&family_id=family-1&readiness_state=blocked",
						"queue":  "/admin/translations/queue?channel=staging&family_id=family-1",
					},
				}},
			},
			DataGrid: map[string]any{
				"filters": []map[string]any{
					{"key": "family_id", "label": "Family", "value": "family-1"},
					{"key": "readiness_state", "label": "Readiness", "value": "blocked"},
				},
			},
			Links: map[string]any{
				"matrix": "/admin/translations/matrix?channel=staging",
				"queue":  "/admin/translations/queue?channel=staging",
			},
			EmptyState: map[string]any{"description": "No families match."},
		},
	})

	for _, expected := range []string{
		`name="family_id"`,
		`value="family-1"`,
		`name="readiness_state"`,
		`value="blocked"`,
		`name="channel" value="staging"`,
		`href="/admin/translations/matrix?channel=staging"`,
		`href="/admin/translations/queue?channel=staging"`,
		`href="/admin/translations/families/family-1?channel=staging"`,
		`href="/admin/translations/matrix?channel=staging&amp;content_type=pages&amp;family_id=family-1&amp;readiness_state=blocked"`,
		`href="/admin/translations/queue?channel=staging&amp;family_id=family-1"`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected rendered family list HTML to contain %q, got %q", expected, html)
		}
	}
}

func TestMigratedTranslationTemplatesRenderHydratedSSRData(t *testing.T) {
	tests := []struct {
		name     string
		template string
		data     fiber.Map
		expected []string
	}{
		{
			name:     "dashboard",
			template: "resources/translations/dashboard",
			data: fiber.Map{
				"translation_dashboard_api_path": "/admin/api/translations/dashboard",
				"translation_queue_api_path":     "/admin/api/translations/assignments",
				"translation_families_api_path":  "/admin/api/translations/families",
				"translation_dashboard_ssr": admin.TranslationSSRPage{
					Surface: admin.TranslationSSRSurfaceDashboard,
					Meta:    map[string]any{"channel": "staging", "refresh_interval_ms": 15000},
					Data: map[string]any{
						"cards": []map[string]any{{
							"id":          "open",
							"label":       "Open assignments",
							"count":       7,
							"description": "Needs work",
							"drilldown":   map[string]any{"href": "/admin/translations/queue?channel=staging", "label": "Open queue"},
						}},
						"tables": map[string]any{
							"triage": map[string]any{
								"id":    "triage",
								"label": "Triage",
								"total": 1,
								"rows": []map[string]any{{
									"title": "Launch page",
									"href":  "/admin/translations/families/family-1?channel=staging",
								}},
							},
						},
					},
				},
			},
			expected: []string{"Open assignments", "Launch page", `data-channel="staging"`},
		},
		{
			name:     "family detail",
			template: "resources/translations/family-detail",
			data: fiber.Map{
				"translation_family_api_path": "/admin/api/translations/families/family-1",
				"translation_family_id":       "family-1",
				"translation_content_base":    "/admin/content",
				"translation_family_detail_ssr": admin.TranslationSSRPage{
					Surface: admin.TranslationSSRSurfaceFamilyDetail,
					Meta:    map[string]any{"channel": "staging"},
					Data: map[string]any{
						"family_id":       "family-1",
						"content_type":    "pages",
						"source_locale":   "en",
						"readiness_state": "blocked",
						"source_variant":  map[string]any{"fields": map[string]any{"title": "Launch page"}},
						"policy":          map[string]any{"required_locales": []string{"es"}},
						"locale_variants": []map[string]any{{"locale": "es", "status": "draft"}},
						"active_assignments": []map[string]any{{
							"assignment_id": "asg-1",
							"target_locale": "es",
							"status":        "pending",
							"row_version":   2,
							"actions": map[string]any{
								"claim":   map[string]any{"enabled": true},
								"release": map[string]any{"enabled": false, "reason": "not assigned"},
							},
						}},
					},
				},
			},
			expected: []string{"Launch page", "Locale coverage", `data-channel="staging"`},
		},
		{
			name:     "editor",
			template: "resources/translations/editor",
			data: fiber.Map{
				"translation_assignment_id":          "asg-1",
				"translation_editor_api_path":        "/admin/api/translations/assignments/asg-1?channel=staging",
				"translation_editor_action_api_base": "/admin/api/translations/assignments",
				"translation_editor_channel":         "staging",
				"translation_editor_ssr": admin.TranslationSSRPage{
					Surface: admin.TranslationSSRSurfaceEditor,
					Data: map[string]any{
						"assignment_id": "asg-1",
						"source_locale": "en",
						"target_locale": "es",
						"translation_assignment": map[string]any{
							"source_title": "Launch page",
							"status":       "pending",
							"queue_state":  "open",
							"version":      2,
						},
						"fields": []map[string]any{{
							"path":         "title",
							"label":        "Title",
							"source_value": "Hello",
							"target_value": "Hola",
						}},
						"locale_navigation":        map[string]any{"locales": []map[string]any{{"locale": "es", "label": "Spanish", "current": true}}},
						"qa_results":               map[string]any{"summary": map[string]any{"blocker_count": 0}},
						"preview_action":           map[string]any{"enabled": true},
						"assignment_action_states": map[string]any{"submit_review": map[string]any{"enabled": true}},
						"review_action_states": map[string]any{
							"approve": map[string]any{"enabled": false, "reason": "not in review"},
							"reject":  map[string]any{"enabled": false, "reason": "not in review"},
						},
					},
				},
			},
			expected: []string{"Launch page", "Hello", `data-translation-editor-ssr="true"`},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			html := renderTranslationUITemplate(t, tt.template, tt.data)
			for _, expected := range tt.expected {
				if !strings.Contains(html, expected) {
					t.Fatalf("expected rendered %s HTML to contain %q, got %q", tt.name, expected, html)
				}
			}
		})
	}
}

func TestTranslationEditorTemplateRendersSSRSections(t *testing.T) {
	raw, err := os.ReadFile("../pkg/client/templates/resources/translations/editor.html")
	if err != nil {
		t.Fatalf("read editor template: %v", err)
	}
	template := string(raw)
	for _, expected := range []string{
		"translation_editor_ssr.Data",
		"data-translation-editor-ssr=\"true\"",
		"data-translation-editor-initial-state",
		"Translation fields",
		"Review actions",
		"Management actions",
		"QA summary",
		"Workflow timeline",
		"data-ssr-enhanced=\"true\"",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected editor template to contain %q", expected)
		}
	}
	if strings.Contains(template, "id=\"translation-editor-root\"") && strings.Contains(template, "></div>") {
		t.Fatalf("expected editor root to contain SSR markup, found empty root pattern")
	}
}

func TestRegisterAdminUIRoutesTranslationExchangeRouteIsCapabilityGuarded(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS): false,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	disabledRouter := newUIRoutesCaptureRouter()
	if err = RegisterAdminUIRoutes(disabledRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes (exchange disabled): %v", err)
	}
	if disabledRouter.getHandlers["/admin/translations/exchange"] != nil {
		t.Fatalf("expected translation exchange route to be absent when disabled")
	}

	forcedRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		forcedRouter,
		cfg,
		adm,
		nil,
		WithUITranslationExchangeRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (exchange forced): %v", err)
	}
	if forcedRouter.getHandlers["/admin/translations/exchange"] != nil {
		t.Fatalf("expected translation exchange route to remain absent when capability is disabled")
	}
}

func TestRegisterAdminUIRoutesTranslationDashboardRouteIsCapabilityGuarded(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	disabledRouter := newUIRoutesCaptureRouter()
	if err = RegisterAdminUIRoutes(disabledRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes (dashboard disabled): %v", err)
	}
	if disabledRouter.getHandlers["/admin/translations/dashboard"] != nil {
		t.Fatalf("expected translation dashboard route to be absent when disabled")
	}

	forcedRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		forcedRouter,
		cfg,
		adm,
		nil,
		WithUITranslationDashboardRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (dashboard forced): %v", err)
	}
	if forcedRouter.getHandlers["/admin/translations/dashboard"] != nil {
		t.Fatalf("expected translation dashboard route to remain absent when capability is disabled")
	}
}

func TestRegisterAdminUIRoutesTranslationRoutesEnabledByCapabilityDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):                 true,
			string(admin.FeatureTranslationQueue):    true,
			string(admin.FeatureTranslationExchange): true,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}

	if captureRouter.getHandlers["/admin/translations/dashboard"] == nil {
		t.Fatalf("expected translation dashboard route handler by default when queue capability enabled")
	}
	if captureRouter.getHandlers["/admin/translations/queue"] == nil {
		t.Fatalf("expected translation queue shell route handler by default when queue capability enabled")
	}
	if captureRouter.getHandlers["/admin/translations/assignments/:assignment_id/edit"] == nil {
		t.Fatalf("expected translation editor shell route handler by default when queue capability enabled")
	}
	if captureRouter.getHandlers["/admin/translations/exchange"] == nil {
		t.Fatalf("expected translation exchange route handler by default when exchange capability enabled")
	}
}

func TestRegisterAdminUIRoutesTranslationCoreShellsAreCapabilityGuarded(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}

	disabledRouter := newUIRoutesCaptureRouter()
	if err = RegisterAdminUIRoutes(disabledRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}
	if disabledRouter.getHandlers["/admin/translations/families/:family_id"] != nil {
		t.Fatalf("expected family-detail shell route to be absent when core capability disabled")
	}
	if disabledRouter.getHandlers["/admin/translations/families"] != nil {
		t.Fatalf("expected family-list shell route to be absent when core capability disabled")
	}
	if disabledRouter.getHandlers["/admin/translations/matrix"] != nil {
		t.Fatalf("expected matrix shell route to be absent when core capability disabled")
	}

	coreAdm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS): true,
		}),
	)
	if err != nil {
		t.Fatalf("create core admin: %v", err)
	}
	registerTranslationCapabilities(
		coreAdm,
		TranslationProductConfig{Profile: TranslationProfileCore},
		nil,
		translationCapabilityModuleState{HasState: true},
	)
	enabledRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(enabledRouter, cfg, coreAdm, nil); err != nil {
		t.Fatalf("register core ui routes: %v", err)
	}
	if enabledRouter.getHandlers["/admin/translations/families/:family_id"] == nil {
		t.Fatalf("expected family-detail shell route handler when core capability enabled")
	}
	if enabledRouter.getHandlers["/admin/translations/families"] == nil {
		t.Fatalf("expected family-list shell route handler when core capability enabled")
	}
	if enabledRouter.getHandlers["/admin/translations/matrix"] == nil {
		t.Fatalf("expected matrix shell route handler when core capability enabled")
	}
	assertRouteRegisteredBefore(t, enabledRouter.getPaths, "/admin/translations/families", "/admin/translations/families/:family_id")
}

func TestRegisterAdminUIRoutesTranslationFamiliesShellContext(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS): true,
		}),
	)
	if err != nil {
		t.Fatalf("create core admin: %v", err)
	}
	registerTranslationCapabilities(
		adm,
		TranslationProductConfig{Profile: TranslationProfileCore},
		nil,
		translationCapabilityModuleState{HasState: true},
	)

	presenter := &capturingTranslationSSRPresenter{}
	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(presenter)); err != nil {
		t.Fatalf("register core ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/families"]
	if handler == nil {
		t.Fatalf("expected family-list shell route handler")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/families", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		expected := map[string]string{
			"title":                         "Translation Families",
			"base_path":                     "/admin",
			"translation_families_api_path": "/admin/api/translations/families",
			"translation_family_base_path":  "/admin/translations/families",
			"translation_matrix_path":       "/admin/translations/matrix",
			"translation_queue_path":        "",
		}
		for key, want := range expected {
			if got := strings.TrimSpace(fmt.Sprint(viewCtx[key])); got != want {
				return false
			}
		}
		return true
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render family-list shell: %v", err)
	}
	if got := strings.TrimSpace(presenter.familyListInput.MatrixPath); got != "/admin/translations/matrix" {
		t.Fatalf("expected family-list presenter to receive registered matrix path, got %q", got)
	}
	if got := strings.TrimSpace(presenter.familyListInput.QueuePath); got != "" {
		t.Fatalf("expected family-list presenter to omit disabled queue path, got %q", got)
	}
	ctx.AssertExpectations(t)
}

func TestRegisterAdminUIRoutesTranslationRoutesInjectSSRViewContext(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):              true,
			string(admin.FeatureTranslationQueue): true,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	registerTranslationCapabilities(
		adm,
		TranslationProductConfig{Profile: TranslationProfileCoreQueue},
		nil,
		translationCapabilityModuleState{HasState: true, QueueEnabled: true},
	)

	presenter := stubTranslationSSRPresenter{pages: map[string]admin.TranslationSSRPage{
		admin.TranslationSSRSurfaceFamilyDetail: {
			Surface: admin.TranslationSSRSurfaceFamilyDetail,
			Data:    map[string]any{"family_id": "family-123"},
		},
	}}
	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(presenter)); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/families/:family_id"]
	if handler == nil {
		t.Fatalf("expected family-detail route handler")
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["family_id"] = "family-123"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/family-detail", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		page, ok := viewCtx["translation_family_detail_ssr"].(router.ViewContext)
		if !ok {
			return false
		}
		if fmt.Sprint(page["Surface"]) != admin.TranslationSSRSurfaceFamilyDetail {
			return false
		}
		data, _ := page["Data"].(map[string]any)
		if fmt.Sprint(data["family_id"]) != "family-123" {
			return false
		}
		_, hasGeneric := viewCtx["translation_ssr"].(router.ViewContext)
		typed, hasTyped := viewCtx["translation_family_detail_ssr_page"].(admin.TranslationSSRPage)
		return hasGeneric && hasTyped && typed.Surface == admin.TranslationSSRSurfaceFamilyDetail
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render family-detail shell: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestTranslationSSRQueryValuesPreservesScope(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM[admin.ScopeTenantIDKey] = " tenant-1 "
	ctx.QueriesM[admin.ScopeOrgIDKey] = "org-1"
	ctx.QueriesM["status"] = "open"

	values := translationSSRQueryValues(ctx)
	if values[admin.ScopeTenantIDKey] != "tenant-1" {
		t.Fatalf("expected tenant scope to be preserved, got %q", values[admin.ScopeTenantIDKey])
	}
	if values[admin.ScopeOrgIDKey] != "org-1" {
		t.Fatalf("expected org scope to be preserved, got %q", values[admin.ScopeOrgIDKey])
	}
	if values["status"] != "open" {
		t.Fatalf("expected existing filter to be preserved, got %q", values["status"])
	}
}

func TestRegisterAdminUIRoutesMigratedTranslationRoutesExposeHydratedSSRContext(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):              true,
			string(admin.FeatureTranslationQueue): true,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	registerTranslationCapabilities(
		adm,
		TranslationProductConfig{Profile: TranslationProfileCoreQueue},
		nil,
		translationCapabilityModuleState{HasState: true, QueueEnabled: true},
	)

	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(stubTranslationSSRPresenter{})); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}

	tests := []struct {
		name       string
		route      string
		template   string
		ssrKey     string
		surface    string
		paramKey   string
		paramValue string
	}{
		{name: "dashboard", route: "/admin/translations/dashboard", template: "resources/translations/dashboard", ssrKey: "translation_dashboard_ssr", surface: admin.TranslationSSRSurfaceDashboard},
		{name: "queue", route: "/admin/translations/queue", template: "resources/translations/shell", ssrKey: "translation_queue_ssr", surface: admin.TranslationSSRSurfaceQueue},
		{name: "family list", route: "/admin/translations/families", template: "resources/translations/families", ssrKey: "translation_families_ssr", surface: admin.TranslationSSRSurfaceFamilyList},
		{name: "family detail", route: "/admin/translations/families/:family_id", template: "resources/translations/family-detail", ssrKey: "translation_family_detail_ssr", surface: admin.TranslationSSRSurfaceFamilyDetail, paramKey: "family_id", paramValue: "family-123"},
		{name: "editor", route: "/admin/translations/assignments/:assignment_id/edit", template: "resources/translations/editor", ssrKey: "translation_editor_ssr", surface: admin.TranslationSSRSurfaceEditor, paramKey: "assignment_id", paramValue: "asg-123"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := captureRouter.getHandlers[tt.route]
			if handler == nil {
				t.Fatalf("expected route handler for %s", tt.route)
			}
			ctx := router.NewMockContext()
			if tt.paramKey != "" {
				ctx.ParamsM[tt.paramKey] = tt.paramValue
			}
			ctx.On("Context").Return(context.Background())
			ctx.On("Render", tt.template, mock.MatchedBy(func(arg any) bool {
				viewCtx, ok := arg.(router.ViewContext)
				if !ok {
					return false
				}
				page, ok := viewCtx[tt.ssrKey].(router.ViewContext)
				if !ok || fmt.Sprint(page["Surface"]) != tt.surface {
					return false
				}
				generic, ok := viewCtx["translation_ssr"].(router.ViewContext)
				if !ok || fmt.Sprint(generic["Surface"]) != tt.surface {
					return false
				}
				typed, ok := viewCtx[tt.ssrKey+"_page"].(admin.TranslationSSRPage)
				return ok && typed.Surface == tt.surface
			})).Return(nil)

			if err := handler(ctx); err != nil {
				t.Fatalf("render %s: %v", tt.name, err)
			}
			ctx.AssertExpectations(t)
		})
	}
}

func TestRegisterAdminUIRoutesTranslationEditorShellContextIncludesScopedSync(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):              true,
			string(admin.FeatureTranslationQueue): true,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/assignments/:assignment_id/edit"]
	if handler == nil {
		t.Fatalf("expected translation editor shell route handler")
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["assignment_id"] = "asg-editor-1"
	ctx.QueriesM["channel"] = "staging"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/editor", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		expected := map[string]string{
			"title":                                    "Translation Editor",
			"base_path":                                "/admin",
			"translation_assignment_id":                "asg-editor-1",
			"translation_editor_api_path":              "/admin/api/translations/assignments/asg-editor-1?channel=staging",
			"translation_editor_action_api_base":       "/admin/api/translations/assignments",
			"translation_editor_sync_api_base":         "/admin/api/translations",
			"translation_editor_sync_client_base_path": "/admin/sync-client/sync-core",
			"translation_editor_channel":               "staging",
		}
		for key, want := range expected {
			if got := strings.TrimSpace(fmt.Sprint(viewCtx[key])); got != want {
				return false
			}
		}
		if _, exists := viewCtx["translation_editor_variant_api_base"]; exists {
			return false
		}
		return true
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render translation editor shell: %v", err)
	}
	ctx.AssertExpectations(t)
}

func assertRouteRegisteredBefore(t *testing.T, paths []string, before, after string) {
	t.Helper()

	beforeIndex := -1
	afterIndex := -1
	for i, path := range paths {
		if path == before {
			beforeIndex = i
		}
		if path == after {
			afterIndex = i
		}
	}
	if beforeIndex < 0 || afterIndex < 0 {
		t.Fatalf("expected routes %q and %q in %v", before, after, paths)
	}
	if beforeIndex > afterIndex {
		t.Fatalf("expected %q to be registered before %q, got %v", before, after, paths)
	}
}

func renderTranslationUITemplate(t *testing.T, template string, data fiber.Map) string {
	t.Helper()

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
	)
	if err != nil {
		t.Fatalf("NewViewEngine: %v", err)
	}

	app := fiber.New(fiber.Config{Views: views})
	app.Get("/", func(c *fiber.Ctx) error {
		viewData := fiber.Map{
			"title":             "Admin",
			"base_path":         "/admin",
			"asset_base_path":   "/admin",
			"theme":             map[string]any{"assets": map[string]any{}},
			"nav_items":         []map[string]any{},
			"nav_utility_items": []map[string]any{},
			"session_user":      map[string]any{},
			"csrf_field":        "",
			"breadcrumbs":       []BreadcrumbItem{},
		}
		for key, value := range data {
			viewData[key] = value
		}
		return c.Render(template, viewData)
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil), -1)
	if err != nil {
		t.Fatalf("render %s: %v", template, err)
	}
	defer closeResponseBody(t, resp)

	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read rendered body: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("render %s returned %d: %s", template, resp.StatusCode, body.String())
	}
	return body.String()
}
