package quickstart

import (
	"bytes"
	"context"
	"fmt"
	"maps"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
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
	familyListInput        admin.TranslationSSRPresenterInput
	familyAssignmentsInput admin.TranslationSSRPresenterInput
	queueInput             admin.TranslationSSRPresenterInput
	matrixInput            admin.TranslationSSRPresenterInput
	exchangeInput          admin.TranslationSSRPresenterInput
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

func (s stubTranslationSSRPresenter) FamilyAssignments(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceFamilyAssignments)
}

func (p *capturingTranslationSSRPresenter) FamilyAssignments(c router.Context, input admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	p.familyAssignmentsInput = input
	return p.stubTranslationSSRPresenter.FamilyAssignments(c, input)
}

func (s stubTranslationSSRPresenter) Queue(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceQueue)
}

func (p *capturingTranslationSSRPresenter) Queue(c router.Context, input admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	p.queueInput = input
	return p.stubTranslationSSRPresenter.Queue(c, input)
}

func (s stubTranslationSSRPresenter) Editor(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceEditor)
}

func (s stubTranslationSSRPresenter) Matrix(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceMatrix)
}

func (p *capturingTranslationSSRPresenter) Matrix(c router.Context, input admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	p.matrixInput = input
	return p.stubTranslationSSRPresenter.Matrix(c, input)
}

func (s stubTranslationSSRPresenter) Exchange(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	return s.page(admin.TranslationSSRSurfaceExchange)
}

func (p *capturingTranslationSSRPresenter) Exchange(c router.Context, input admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error) {
	p.exchangeInput = input
	return p.stubTranslationSSRPresenter.Exchange(c, input)
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
		"translation_exchange_ssr",
		"page.Data.template.href",
		"page.Data.template.filename",
		"page.Data.template.label",
		"const exchangeSSREnhancement = {{ toJSON(translation_exchange_ssr.Enhancement)|safe }};",
		"const exchangeUIConfig = exchangeSSREnhancement?.ui_config || {{ toJSON(translation_exchange_ui_config)|safe }};",
		"includeExamples: exchangeSSREnhancement?.include_examples === true",
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
		"family.locale_coverage_rows",
		"data-locale-coverage-kind=\"{{ row.kind|default:\"variant\" }}\"",
		"data-family-assignee-select=\"{{ row.locale_assignment_key }}\"",
		"data-formgen-relationship=\"true\"",
		"data-formgen-auto-init=\"true\"",
		"data-endpoint-renderer=\"{{ translation_family_detail_ssr.Assignee.endpoint_renderer|default:\"typeahead\" }}\"",
		"data-translation-create-locale-trigger=\"true\"",
		"runtime/formgen-relationships.min.js",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected family detail template to contain %q", expected)
		}
	}
	if regexp.MustCompile(`<div\s+id="translation-family-detail-root"[^>]*>\s*</div>`).MatchString(template) {
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
				"data-translation-table-tab",
				"data-translation-table-panel",
				"iconoir-nav-arrow-right",
				"data-ssr-enhanced=\"true\"",
			},
		},
		{
			name: "families",
			path: "../pkg/client/templates/resources/translations/families.html",
			expected: []string{
				"translation_families_ssr",
				"data-translation-family-list-ssr=\"true\"",
				"data-translation-filter-form=\"true\"",
				"data-action-menu-trigger",
				"Translation family views",
				"translation_family_base_path",
				"data-ssr-enhanced=\"true\"",
			},
		},
		{
			name: "matrix",
			path: "../pkg/client/templates/resources/translations/matrix.html",
			expected: []string{
				"translation_matrix_ssr",
				"data-translation-matrix-ssr=\"true\"",
				"data-matrix-grid=\"true\"",
				"data-matrix-viewport=\"true\"",
				"data-matrix-filter-form=\"true\"",
				"locale_offset",
				"locale_limit",
			},
		},
		{
			name: "exchange",
			path: "../pkg/client/templates/resources/translations/exchange.html",
			expected: []string{
				"translation_exchange_ssr",
				"data-translation-exchange-ssr=\"true\"",
				"data-exchange-history-baseline=\"true\"",
				"data-export-form=\"true\"",
				"data-validate-form=\"true\"",
				"data-apply-form=\"true\"",
				"includeExamples: exchangeSSREnhancement?.include_examples === true",
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

func TestTranslationExchangeTemplateRendersSSRBaseline(t *testing.T) {
	html := renderTranslationUITemplate(t, "resources/translations/exchange", fiber.Map{
		"base_path":                     "/admin",
		"api_base_path":                 "/admin/api",
		"translation_exchange_api_path": "/admin/api/translations/exchange",
		"translation_exchange_ui_config": admin.TranslationExchangeUIConfig{
			Configured: true,
		},
		"translation_exchange_ssr": router.ViewContext{
			"Surface": admin.TranslationSSRSurfaceExchange,
			"Data": map[string]any{
				"ui_config": map[string]any{"configured": true},
				"template": map[string]any{
					"href":     "/admin/api/translations/exchange/template?format=json",
					"filename": "translations.json",
					"label":    "Download JSON Template",
				},
				"resource_options": []map[string]any{{
					"id":       "pages",
					"label":    "Pages",
					"selected": true,
				}},
				"source_locale_options": []map[string]any{{
					"code":     "en",
					"label":    "English",
					"selected": true,
				}},
				"target_locale_options": []map[string]any{{
					"code":     "es",
					"label":    "Spanish",
					"selected": true,
				}},
				"apply_defaults": map[string]any{
					"allow_create_missing":       false,
					"allow_source_hash_override": false,
					"continue_on_error":          true,
					"dry_run":                    true,
					"include_source_hash":        true,
				},
				"history": map[string]any{
					"items":    []map[string]any{},
					"total":    0,
					"page":     1,
					"per_page": 20,
				},
			},
			"Meta": map[string]any{
				"history_source_policy": map[string]any{"source": "runtime", "include_examples": false},
			},
			"Actions": map[string]any{
				"export":          map[string]any{"enabled": true},
				"import_validate": map[string]any{"enabled": true},
				"import_apply":    map[string]any{"enabled": true},
			},
			"Links": map[string]any{
				"history": "/admin/api/translations/exchange/jobs",
			},
			"Enhancement": map[string]any{
				"api_path":         "/admin/api/translations/exchange",
				"history_path":     "/admin/api/translations/exchange/jobs",
				"include_examples": false,
				"ui_config":        map[string]any{"configured": true},
			},
			"EmptyState": map[string]any{
				"title":       "No exchange jobs",
				"description": "Recent import and export jobs will appear after translation exchange activity.",
			},
		},
	})

	for _, expected := range []string{
		`data-translation-exchange-ssr="true"`,
		`data-export-form="true"`,
		`Download JSON Template`,
		`Pages`,
		`English`,
		`Spanish`,
		`Create export package`,
		`Validate package`,
		`Apply validated rows`,
		`No exchange jobs`,
		`includeExamples: exchangeSSREnhancement?.include_examples === true`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected rendered exchange HTML to contain %q: %s", expected, html)
		}
	}
	if regexp.MustCompile(`<div\s+id="translation-exchange-app"[^>]*>\s*</div>`).MatchString(html) {
		t.Fatalf("expected exchange root to contain SSR markup, found empty root pattern")
	}
}

func TestTranslationMatrixTemplateRendersSSRGrid(t *testing.T) {
	html := renderTranslationUITemplate(t, "resources/translations/matrix", fiber.Map{
		"translation_matrix_api_path": "/admin/api/translations/matrix",
		"translation_matrix_ssr": router.ViewContext{
			"Surface": admin.TranslationSSRSurfaceMatrix,
			"Meta": map[string]any{
				"channel":       "production",
				"total":         1,
				"total_locales": 1,
				"page":          1,
				"per_page":      25,
				"locale_offset": 0,
				"locale_limit":  1,
			},
			"Data": map[string]any{
				"columns": []map[string]any{{
					"locale":            "es",
					"label":             "Spanish",
					"required_by_count": 1,
				}},
				"rows": []map[string]any{{
					"family_id":       "tg-page-1",
					"content_type":    "pages",
					"source_locale":   "en",
					"source_title":    "About us",
					"readiness_state": "blocked",
					"blocker_codes":   []string{"missing_locale"},
					"links": map[string]any{
						"family": map[string]any{"href": "/admin/translations/families/tg-page-1"},
					},
					"cells": map[string]any{
						"es": map[string]any{
							"state": "missing",
							"quick_actions": map[string]any{
								"create": map[string]any{"enabled": true, "label": "Create"},
							},
						},
					},
				}},
			},
			"Actions": map[string]any{
				"bulk_actions": map[string]any{
					"create_missing":  map[string]any{"enabled": true},
					"export_selected": map[string]any{"enabled": true},
				},
			},
			"Links": map[string]any{
				"matrix":         "/admin/translations/matrix?readiness_state=blocked&locales=es&locale_offset=0&locale_limit=1",
				"matrix_all":     "/admin/translations/matrix?locales=es&locale_offset=0&locale_limit=1",
				"matrix_ready":   "/admin/translations/matrix?readiness_state=ready&locales=es&locale_offset=0&locale_limit=1&page=1",
				"matrix_blocked": "/admin/translations/matrix?readiness_state=blocked&locales=es&locale_offset=0&locale_limit=1&page=1",
				"queue":          "/admin/translations/queue",
				"preserve_query": map[string]any{
					"locales":       "es",
					"locale_offset": "0",
					"locale_limit":  "1",
					"page":          "2",
					"per_page":      "25",
				},
			},
			"Enhancement": map[string]any{"query": map[string]any{"readiness_state": "blocked", "locales": "es", "locale_offset": "0", "locale_limit": "1"}},
			"EmptyState":  map[string]any{"title": "No matrix rows", "description": "No rows"},
		},
	})

	for _, expected := range []string{
		`data-translation-matrix-ssr="true"`,
		`data-matrix-grid="true"`,
		`About us`,
		`Spanish`,
		`Missing Locale`,
		`Create missing`,
		`data-matrix-cell-action="true"`,
		`href="/admin/translations/matrix?locales=es&amp;locale_offset=0&amp;locale_limit=1"`,
		`name="locales" value="es"`,
		`name="locale_offset" value="0"`,
		`name="locale_limit" value="1"`,
		`name="readiness_state" value="blocked"`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected rendered matrix HTML to contain %q: %s", expected, html)
		}
	}
	if regexp.MustCompile(`<div\s+id="translation-matrix-root"[^>]*>\s*</div>`).MatchString(html) {
		t.Fatalf("expected matrix root to contain SSR markup, found empty root pattern")
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
		"data-translation-filter-summary",
		"data-translation-action=\"claim\"",
		"data-bulk-action-endpoint",
		"data-ssr-enhanced",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected queue template to contain %q", expected)
		}
	}
}

func TestTranslationFamilyAssignmentsTemplateRendersSSRSections(t *testing.T) {
	raw, err := os.ReadFile("../pkg/client/templates/resources/translations/family-assignments.html")
	if err != nil {
		t.Fatalf("read family assignments template: %v", err)
	}
	template := string(raw)
	for _, expected := range []string{
		"translation_family_assignments_ssr",
		`data-translation-family-assignments-ssr="true"`,
		"Family assignments",
		"page.Data.rows",
		"Open editor",
		"Family detail",
		"Family assignments pagination",
		"data-action-menu-trigger",
		"data-translation-action=\"claim\"",
		"dist/translation-actions/assignment-row-actions.js",
		"initAssignmentSSRRowActions",
	} {
		if !strings.Contains(template, expected) {
			t.Fatalf("expected family assignments template to contain %q", expected)
		}
	}
	if strings.Contains(template, "dist/translation-queue/index.js") {
		t.Fatalf("expected family assignments template to use the lightweight row action enhancer, not the full queue bundle")
	}
	if regexp.MustCompile(`<div\s+id="translation-family-assignments-root"[^>]*>\s*</div>`).MatchString(template) {
		t.Fatalf("expected family assignments root to contain SSR markup, found empty root pattern")
	}
}

func TestTranslationFamilyAssignmentsTemplateRendersEmptyAndErrorStates(t *testing.T) {
	emptyHTML := renderTranslationUITemplate(t, "resources/translations/family-assignments", fiber.Map{
		"translation_family_id": "family-empty",
		"translation_family_assignments_ssr": admin.TranslationSSRPage{
			Surface:    admin.TranslationSSRSurfaceFamilyAssignments,
			Meta:       map[string]any{"family_id": "family-empty", "page": 1, "per_page": 25, "total": 0},
			Data:       map[string]any{"rows": []map[string]any{}},
			Links:      map[string]any{"family_detail": "/admin/translations/families/family-empty", "queue": "/admin/translations/queue"},
			EmptyState: map[string]any{"description": "No family assignments."},
		},
	})
	if !strings.Contains(emptyHTML, "No family assignments.") {
		t.Fatalf("expected empty state copy, got %q", emptyHTML)
	}
	if !strings.Contains(emptyHTML, `aria-label="Family assignments pagination"`) {
		t.Fatalf("expected pagination controls in empty state, got %q", emptyHTML)
	}

	errorHTML := renderTranslationUITemplate(t, "resources/translations/family-assignments", fiber.Map{
		"translation_family_id": "family-error",
		"translation_family_assignments_ssr": admin.TranslationSSRPage{
			Surface:    admin.TranslationSSRSurfaceFamilyAssignments,
			ErrorState: map[string]any{"title": "Family unavailable", "description": "Repository unavailable"},
		},
	})
	if !strings.Contains(errorHTML, `data-translation-ssr-error="true"`) || !strings.Contains(errorHTML, "Repository unavailable") {
		t.Fatalf("expected rendered error state, got %q", errorHTML)
	}

	missingActionEndpointHTML := renderTranslationUITemplate(t, "resources/translations/family-assignments", fiber.Map{
		"translation_family_id":                   "family-1",
		"translation_family_assignments_api_path": "/admin/api/translations/families/family-1/assignments",
		"translation_queue_editor_base_path":      "/admin/translations/assignments",
		"translation_family_assignments_ssr": admin.TranslationSSRPage{
			Surface: admin.TranslationSSRSurfaceFamilyAssignments,
			Meta:    map[string]any{"family_id": "family-1", "page": 1, "per_page": 25, "total": 1},
			Data: map[string]any{
				"rows": []map[string]any{{
					"assignment_id":  "asg-1",
					"display_title":  "Launch page",
					"target_locale":  "es",
					"status":         "assigned",
					"row_version":    2,
					"display_status": "Assigned",
					"actions": map[string]any{
						"claim":   map[string]any{"enabled": true},
						"release": map[string]any{"enabled": true},
					},
				}},
			},
		},
	})
	if strings.Contains(missingActionEndpointHTML, `data-action-endpoint="/admin/api/translations/families/family-1/assignments"`) {
		t.Fatalf("expected family assignments action endpoint not to fall back to JSON expansion endpoint, got %q", missingActionEndpointHTML)
	}
	if !strings.Contains(missingActionEndpointHTML, `title="Action endpoint unavailable"`) || !strings.Contains(missingActionEndpointHTML, "Action endpoint unavailable.") {
		t.Fatalf("expected enabled lifecycle controls to render disabled without an action endpoint, got %q", missingActionEndpointHTML)
	}
}

func TestTranslationQueueTemplateRendersUIPresetLinks(t *testing.T) {
	html := renderTranslationUITemplate(t, "resources/translations/shell", fiber.Map{
		"translation_shell_surface":              "queue",
		"translation_shell_title":                "Translation Queue",
		"translation_shell_description":          "Queue",
		"translation_shell_api_path":             "/admin/api/translations/assignments",
		"translation_assignment_action_api_path": "/admin/api/translations/assignments?tenant_id=tenant-1",
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
					"assignments_href": "/admin/translations/families/family-2/assignments?channel=staging&page=1&per_page=25",
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
				"review_filter_presets": []map[string]any{{
					"id":    "review_inbox",
					"label": "Review Inbox",
					"href":  "/admin/translations/queue?channel=staging&preset=review_inbox&status=in_review",
				}},
				"filters": []map[string]any{
					{"key": "status", "name": "status", "label": "Status", "type": "select", "current_value": "", "options": []map[string]any{{"value": "open", "label": "Open"}}},
					{"key": "entity_type", "name": "entity_type", "label": "Type", "current_value": ""},
				},
				"filter_action":       "/admin/translations/queue?channel=staging&page=1&status=assigned",
				"active_filter_count": 0,
				"active_filter_chips": []map[string]any{},
				"grouping":            map[string]any{"mode": "none"},
				"bulk_selection":      map[string]any{"mode": "current_page"},
				"sort":                map[string]any{"label": "Updated At, descending"},
				"view_mode":           "list",
				"view_links": map[string]any{
					"clear_all": "/admin/translations/queue?channel=staging&page=1&per_page=25",
					"list":      "/admin/translations/queue?channel=staging&page=1",
					"grouped":   "/admin/translations/queue?channel=staging&group_by=family_id&group_strategy=page_local&page=1",
					"families":  "/admin/translations/queue?channel=staging&group_by=family_id&group_strategy=server_family&page=1",
				},
				"pagination": map[string]any{
					"range_label":       "Showing 1-2 of 2 assignments",
					"page_label":        "Assignment page 1 of 1",
					"previous_disabled": true,
					"next_disabled":     true,
					"previous_href":     "/admin/translations/queue?channel=staging&page=1&per_page=50",
					"next_href":         "/admin/translations/queue?channel=staging&page=1&per_page=50",
					"page_size_choices": []map[string]any{
						{"value": 25, "label": "25", "href": "/admin/translations/queue?channel=staging&page=1&per_page=25"},
						{"value": 50, "label": "50", "active": true, "href": "/admin/translations/queue?channel=staging&page=1&per_page=50"},
						{"value": 100, "label": "100", "href": "/admin/translations/queue?channel=staging&page=1&per_page=100"},
					},
				},
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
	if !strings.Contains(html, `data-action-endpoint="/admin/api/translations/assignments?tenant_id=tenant-1"`) {
		t.Fatalf("expected queue shell to expose assignment action endpoint separately, got %q", html)
	}
	if !strings.Contains(html, `data-translation-row-type="family"`) {
		t.Fatalf("expected grouped family parent row markup, got %q", html)
	}
	if !strings.Contains(html, `href="/admin/translations/families/family-2/assignments?channel=staging&amp;page=1&amp;per_page=25"`) {
		t.Fatalf("expected grouped family view link to use SSR family assignments URL, got %q", html)
	}
	if strings.Contains(html, `href="/admin/api/translations/assignments/families/family-2?channel=staging"`) {
		t.Fatalf("expected grouped family view link not to use API expansion URL, got %q", html)
	}
	if strings.Contains(html, `data-assignment-id="family:family-2"`) {
		t.Fatalf("expected grouped family parent not to render assignment action wiring, got %q", html)
	}
	if !strings.Contains(html, `data-translation-filter-panel`) || !strings.Contains(html, `Advanced Filters`) {
		t.Fatalf("expected queue filters to render a no-JS disclosure control, got %q", html)
	}
	if !strings.Contains(html, `action="/admin/translations/queue?channel=staging&amp;page=1&amp;status=assigned"`) {
		t.Fatalf("expected filter form to use apply URL with active query state, got %q", html)
	}
	if !strings.Contains(html, `href="/admin/translations/queue?channel=staging&amp;page=1&amp;per_page=25" class="btn btn-secondary h-10 px-4 py-2">Clear</a>`) {
		t.Fatalf("expected filter Clear link to use clear-all URL without active filters, got %q", html)
	}
	if strings.Contains(html, `href="/admin/translations/queue?channel=staging&amp;page=1&amp;status=assigned" class="btn btn-secondary h-10 px-4 py-2">Clear</a>`) {
		t.Fatalf("expected filter Clear link not to reuse apply URL, got %q", html)
	}
	for _, expected := range []string{
		`All visible assignments`,
		`Review Inbox`,
		`Showing 1-2 of 2 assignments`,
		`Assignment page 1 of 1`,
		`Previous`,
		`Next`,
		`>25</a>`,
		`>50</a>`,
		`>100</a>`,
		`>List</a>`,
		`>Grouped</a>`,
		`>Families</a>`,
		`name="entity_type"`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected rendered queue HTML to contain %q, got %q", expected, html)
		}
	}
	if strings.Contains(html, `id="queue-filters-panel" class="mt-4 hidden`) {
		t.Fatalf("expected queue filters not to be hidden without a disclosure control, got %q", html)
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
						"ordered_tables": []map[string]any{{
							"id":            "triage",
							"display_label": "Triage",
							"variant":       "generic",
							"total":         1,
							"rows": []map[string]any{{
								"title": "Launch page",
								"href":  "/admin/translations/families/family-1?channel=staging",
							}},
						}},
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
							"assignment_id":     "asg-1",
							"target_locale":     "es",
							"status":            "pending",
							"row_version":       2,
							"activity_sentence": "Manager One assigned ES to Translator One on Jun 7, 2026",
							"actions": map[string]any{
								"claim":   map[string]any{"enabled": true},
								"release": map[string]any{"enabled": false, "reason": "not assigned"},
							},
						}},
					},
				},
			},
			expected: []string{"Launch page", "Locale coverage", "Manager One assigned ES to Translator One on Jun 7, 2026", `data-channel="staging"`},
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
							"source_title":     "Launch page",
							"status":           "pending",
							"queue_state":      "open",
							"version":          2,
							"assignee_id":      "9e838c81-6d3e-49d7-ad8f-b6616a040a44",
							"display_assignee": "translator.jane",
							"reviewer_id":      "173c7e5b-50cb-37d0-8ced-a24b570863e6",
							"display_reviewer": "reviewer.sam@example.com",
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
			expected: []string{"Launch page", "Hello", "Assignee translator.jane", "Reviewer reviewer.sam@example.com", `data-translation-editor-ssr="true"`},
		},
		{
			name:     "family assignments",
			template: "resources/translations/family-assignments",
			data: fiber.Map{
				"translation_family_id":                   "family-1",
				"translation_family_assignments_api_path": "/admin/api/translations/families/family-1/assignments",
				"translation_assignment_action_api_path":  "/admin/api/translations/assignments",
				"translation_queue_editor_base_path":      "/admin/translations/assignments",
				"translation_family_assignments_ssr": admin.TranslationSSRPage{
					Surface: admin.TranslationSSRSurfaceFamilyAssignments,
					Meta: map[string]any{
						"family_id": "family-1",
						"total":     1,
						"page":      2,
						"per_page":  25,
						"has_next":  true,
						"sort":      "updated_at",
						"order":     "desc",
						"channel":   "staging",
					},
					Data: map[string]any{
						"rows": []map[string]any{{
							"assignment_id":    "asg-1",
							"family_id":        "family-1",
							"display_title":    "Launch page",
							"source_path":      "/launch",
							"display_locale":   "EN -> ES",
							"status":           "assigned",
							"display_status":   "Assigned",
							"priority":         "high",
							"display_priority": "High",
							"display_assignee": "Translator One",
							"display_reviewer": "Reviewer One",
							"due_state":        "overdue",
							"display_due_date": "Jun 12, 2026",
							"row_version":      2,
							"editor_href":      "/admin/translations/assignments/asg-1/edit?channel=staging",
							"actions": map[string]any{
								"claim":   map[string]any{"enabled": false, "reason": "already assigned"},
								"release": map[string]any{"enabled": true},
							},
						}},
					},
					Links: map[string]any{
						"family_detail": "/admin/translations/families/family-1?channel=staging",
						"queue":         "/admin/translations/queue?channel=staging",
						"editor_base":   "/admin/translations/assignments",
						"previous":      "/admin/translations/families/family-1/assignments?channel=staging&page=1",
						"next":          "/admin/translations/families/family-1/assignments?channel=staging&page=3",
					},
					EmptyState: map[string]any{"description": "No family assignments."},
				},
			},
			expected: []string{
				`data-translation-family-assignments-ssr="true"`,
				`data-endpoint="/admin/api/translations/families/family-1/assignments"`,
				`data-action-endpoint="/admin/api/translations/assignments"`,
				`Launch page`,
				`Translator One`,
				`href="/admin/translations/assignments/asg-1/edit?channel=staging"`,
				`href="/admin/translations/families/family-1?channel=staging"`,
				`href="/admin/translations/families/family-1/assignments?channel=staging&amp;page=3"`,
				`already assigned`,
			},
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

func TestTranslationEditorTemplateRendersResumeWorkState(t *testing.T) {
	baseData := func(claim map[string]any) fiber.Map {
		assignmentActionStates := map[string]any{
			"submit_review": map[string]any{"enabled": false, "reason": "assignment must be in progress"},
		}
		if claim != nil {
			assignmentActionStates["claim"] = claim
		}
		return fiber.Map{
			"translation_assignment_id":          "asg-changes",
			"translation_editor_api_path":        "/admin/api/translations/assignments/asg-changes?channel=staging",
			"translation_editor_action_api_base": "/admin/api/translations/assignments",
			"translation_editor_channel":         "staging",
			"translation_editor_ssr": admin.TranslationSSRPage{
				Surface: admin.TranslationSSRSurfaceEditor,
				Data: map[string]any{
					"assignment_id": "asg-changes",
					"source_locale": "en",
					"target_locale": "es",
					"translation_assignment": map[string]any{
						"source_title": "Launch page",
						"status":       "changes_requested",
						"queue_state":  "changes_requested",
						"version":      7,
					},
					"status": "changes_requested",
					"fields": []map[string]any{{
						"path":         "title",
						"label":        "Title",
						"source_value": "Hello",
						"target_value": "Hola",
					}},
					"locale_navigation":        map[string]any{"locales": []map[string]any{{"locale": "es", "label": "Spanish", "current": true}}},
					"qa_results":               map[string]any{"summary": map[string]any{"blocker_count": 0}},
					"preview_action":           map[string]any{"enabled": true},
					"assignment_action_states": assignmentActionStates,
					"review_action_states": map[string]any{
						"approve": map[string]any{"enabled": false, "reason": "assignment must be in review"},
						"reject":  map[string]any{"enabled": false, "reason": "assignment must be in review"},
					},
				},
			},
		}
	}

	enabledHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData(map[string]any{"enabled": true}))
	for _, expected := range []string{
		`data-editor-panel="resume-actions"`,
		`data-action="resume-work"`,
		`Resume work`,
		`assignment must be in progress`,
		`Changes Requested`,
		`status-chip status-chip--error`,
	} {
		if !strings.Contains(enabledHTML, expected) {
			t.Fatalf("expected enabled resume HTML to contain %q, got %q", expected, enabledHTML)
		}
	}
	if strings.Contains(enabledHTML, `data-resume-unavailable-reason="true"`) {
		t.Fatalf("did not expect enabled resume state to render disabled reason: %s", enabledHTML)
	}
	for _, blockedAction := range []string{`data-action="approve"`, `data-action="reject"`} {
		if strings.Contains(enabledHTML, blockedAction) {
			t.Fatalf("did not expect changes-requested editor to render %q: %s", blockedAction, enabledHTML)
		}
	}

	disabledHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData(map[string]any{
		"enabled": false,
		"reason":  "assignment is assigned to a different translator",
	}))
	for _, expected := range []string{
		`data-action="resume-work"`,
		`disabled aria-disabled="true"`,
		`data-resume-unavailable-reason="true"`,
		`assignment is assigned to a different translator`,
	} {
		if !strings.Contains(disabledHTML, expected) {
			t.Fatalf("expected disabled resume HTML to contain %q, got %q", expected, disabledHTML)
		}
	}

	missingClaimHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData(nil))
	for _, expected := range []string{
		`data-action="resume-work"`,
		`disabled aria-disabled="true"`,
		`data-resume-unavailable-reason="true"`,
		`Resume unavailable`,
	} {
		if !strings.Contains(missingClaimHTML, expected) {
			t.Fatalf("expected missing claim HTML to contain %q, got %q", expected, missingClaimHTML)
		}
	}
}

func TestTranslationEditorTemplateRendersSuggestionActionOnlyWhenDispatchable(t *testing.T) {
	baseData := func(status string, action map[string]any) fiber.Map {
		return fiber.Map{
			"translation_assignment_id":          "asg-suggest",
			"translation_editor_api_path":        "/admin/api/translations/assignments/asg-suggest?channel=staging",
			"translation_editor_action_api_base": "/admin/api/translations/assignments",
			"translation_editor_channel":         "staging",
			"translation_editor_ssr": admin.TranslationSSRPage{
				Surface: admin.TranslationSSRSurfaceEditor,
				Data: map[string]any{
					"assignment_id":  "asg-suggest",
					"source_locale":  "en",
					"target_locale":  "es",
					"row_version":    3,
					"source_fields":  map[string]any{"title": "Hello"},
					"target_fields":  map[string]any{"title": "Hola"},
					"field_drift":    map[string]any{},
					"qa_results":     map[string]any{"summary": map[string]any{"blocker_count": 0}},
					"preview_action": map[string]any{"enabled": true},
					"translation_assignment": map[string]any{
						"source_title": "Launch page",
						"status":       status,
						"queue_state":  status,
						"version":      3,
					},
					"fields": []map[string]any{{
						"path":                       "title",
						"label":                      "Title",
						"source_value":               "Hello",
						"target_value":               "Hola",
						"suggest_translation_action": action,
					}},
					"locale_navigation":        map[string]any{"locales": []map[string]any{{"locale": "es", "label": "Spanish", "current": true}}},
					"assignment_action_states": map[string]any{"submit_review": map[string]any{"enabled": true}},
					"review_action_states": map[string]any{
						"approve": map[string]any{"enabled": false, "reason": "assignment must be in review"},
						"reject":  map[string]any{"enabled": false, "reason": "assignment must be in review"},
					},
				},
			},
		}
	}
	enabledAction := map[string]any{
		"enabled":         true,
		"command_name":    "translations.suggestions.generate",
		"endpoint":        "/admin/api/rpc",
		"rpc_invoke_path": "/admin/api/rpc",
	}

	enabledHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData("assigned", enabledAction))
	if !strings.Contains(enabledHTML, `data-suggest-translation="title"`) {
		t.Fatalf("expected enabled SSR suggestion action to render button: %s", enabledHTML)
	}
	if !strings.Contains(enabledHTML, `Generate suggestion`) {
		t.Fatalf("expected enabled SSR suggestion action to render label: %s", enabledHTML)
	}

	deniedAction := map[string]any{
		"enabled":      false,
		"reason":       "Provider policy denied this assignment.",
		"reason_code":  "provider_policy_denied",
		"command_name": "translations.suggestions.generate",
		"endpoint":     "/admin/api/rpc",
	}
	deniedHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData("assigned", deniedAction))
	if strings.Contains(deniedHTML, `data-suggest-translation="title"`) {
		t.Fatalf("did not expect denied SSR suggestion action to render button: %s", deniedHTML)
	}

	transportlessAction := map[string]any{
		"enabled":      true,
		"command_name": "translations.suggestions.generate",
	}
	transportlessHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData("assigned", transportlessAction))
	if strings.Contains(transportlessHTML, `data-suggest-translation="title"`) {
		t.Fatalf("did not expect transportless SSR suggestion action to render button: %s", transportlessHTML)
	}

	readOnlyHTML := renderTranslationUITemplate(t, "resources/translations/editor", baseData("approved", enabledAction))
	if strings.Contains(readOnlyHTML, `data-suggest-translation="title"`) {
		t.Fatalf("did not expect read-only SSR suggestion action to render button: %s", readOnlyHTML)
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
	if captureRouter.getHandlers["/admin/translations/families/:family_id/assignments"] == nil {
		t.Fatalf("expected family assignments route handler by default when queue capability enabled")
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
	if disabledRouter.getHandlers["/admin/translations/families/:family_id/assignments"] != nil {
		t.Fatalf("expected family assignments route to be absent when queue capability disabled")
	}

	coreAdm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):                 true,
			string(admin.FeatureTranslationExchange): true,
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
	if enabledRouter.getHandlers["/admin/translations/families/:family_id/assignments"] != nil {
		t.Fatalf("expected family assignments route to remain absent without queue capability")
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

func TestRegisterAdminUIRoutesTranslationMatrixHydratesSSRContext(t *testing.T) {
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
	handler := captureRouter.getHandlers["/admin/translations/matrix"]
	if handler == nil {
		t.Fatalf("expected matrix shell route handler")
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["channel"] = "production"
	ctx.QueriesM["locales"] = "fr,de"
	ctx.QueriesM["locale_offset"] = "10"
	ctx.QueriesM["locale_limit"] = "5"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/matrix", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if got := strings.TrimSpace(fmt.Sprint(viewCtx["translation_matrix_api_path"])); got != "/admin/api/translations/matrix" {
			return false
		}
		page, ok := viewCtx["translation_matrix_ssr"].(router.ViewContext)
		if !ok {
			return false
		}
		return fmt.Sprint(page["Surface"]) == admin.TranslationSSRSurfaceMatrix
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render matrix shell: %v", err)
	}
	if got := strings.TrimSpace(presenter.matrixInput.MatrixAPIPath); got != "/admin/api/translations/matrix" {
		t.Fatalf("expected matrix API path, got %q", got)
	}
	for key, want := range map[string]string{
		"locales":       "fr,de",
		"locale_offset": "10",
		"locale_limit":  "5",
	} {
		if got := presenter.matrixInput.Query[key]; got != want {
			t.Fatalf("expected matrix query %s=%q, got %q in %+v", key, want, got, presenter.matrixInput.Query)
		}
	}
	ctx.AssertExpectations(t)
}

func TestRegisterAdminUIRoutesTranslationExchangeHydratesSSRContext(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):                 true,
			string(admin.FeatureTranslationExchange): true,
		}),
	)
	if err != nil {
		t.Fatalf("create core admin: %v", err)
	}
	registerTranslationCapabilities(
		adm,
		TranslationProductConfig{Profile: TranslationProfileCore},
		nil,
		translationCapabilityModuleState{HasState: true, ExchangeEnabled: true},
	)

	presenter := &capturingTranslationSSRPresenter{}
	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(presenter), WithUITranslationExchangeRoute(true)); err != nil {
		t.Fatalf("register core ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/exchange"]
	if handler == nil {
		t.Fatalf("expected exchange shell route handler")
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["channel"] = "production"
	ctx.QueriesM["include_examples"] = "true"
	ctx.QueriesM["kind"] = "export"
	ctx.QueriesM["status"] = "completed"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/exchange", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if got := strings.TrimSpace(fmt.Sprint(viewCtx["translation_exchange_api_path"])); got != "/admin/api/translations/exchange" {
			return false
		}
		page, ok := viewCtx["translation_exchange_ssr"].(router.ViewContext)
		if !ok {
			return false
		}
		return fmt.Sprint(page["Surface"]) == admin.TranslationSSRSurfaceExchange
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render exchange shell: %v", err)
	}
	if got := strings.TrimSpace(presenter.exchangeInput.ExchangeAPIPath); got != "/admin/api/translations/exchange" {
		t.Fatalf("expected exchange API path, got %q", got)
	}
	for key, want := range map[string]string{
		"include_examples": "true",
		"kind":             "export",
		"status":           "completed",
	} {
		if got := presenter.exchangeInput.Query[key]; got != want {
			t.Fatalf("expected exchange query %s=%q, got %q in %+v", key, want, got, presenter.exchangeInput.Query)
		}
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
		data, ok := page["Data"].(map[string]any)
		if !ok {
			return false
		}
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

func TestRegisterAdminUIRoutesTranslationFamilyAssignmentsHydratesPresenterView(t *testing.T) {
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

	presenter := &capturingTranslationSSRPresenter{}
	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(presenter)); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/families/:family_id/assignments"]
	if handler == nil {
		t.Fatalf("expected family assignments route handler")
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["family_id"] = "family-123"
	ctx.QueriesM["channel"] = "production"
	ctx.QueriesM["status"] = "assigned"
	ctx.QueriesM["review_state"] = "needs_review"
	ctx.QueriesM["sort"] = "due_date"
	ctx.QueriesM["order"] = "asc"
	ctx.QueriesM["page"] = "2"
	ctx.QueriesM["per_page"] = "10"
	ctx.QueriesM[admin.ScopeTenantIDKey] = "tenant-1"
	ctx.QueriesM[admin.ScopeOrgIDKey] = "org-1"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/family-assignments", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if got := strings.TrimSpace(fmt.Sprint(viewCtx["translation_family_assignments_api_path"])); got != "/admin/api/translations/families/family-123/assignments" {
			return false
		}
		actionPath := strings.TrimSpace(fmt.Sprint(viewCtx["translation_assignment_action_api_path"]))
		actionURL, err := url.Parse(actionPath)
		if err != nil || actionURL.Path != "/admin/api/translations/assignments" {
			return false
		}
		if actionURL.Query().Get(admin.ScopeTenantIDKey) != "tenant-1" || actionURL.Query().Get(admin.ScopeOrgIDKey) != "org-1" {
			return false
		}
		page, ok := viewCtx["translation_family_assignments_ssr"].(router.ViewContext)
		return ok && fmt.Sprint(page["Surface"]) == admin.TranslationSSRSurfaceFamilyAssignments
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render family assignments shell: %v", err)
	}
	if got := presenter.familyAssignmentsInput.FamilyID; got != "family-123" {
		t.Fatalf("expected family id family-123, got %q", got)
	}
	if got := presenter.familyAssignmentsInput.Channel; got != "production" {
		t.Fatalf("expected channel production, got %q", got)
	}
	for key, want := range map[string]string{
		"status":               "assigned",
		"review_state":         "needs_review",
		"sort":                 "due_date",
		"order":                "asc",
		"page":                 "2",
		"per_page":             "10",
		admin.ScopeTenantIDKey: "tenant-1",
		admin.ScopeOrgIDKey:    "org-1",
	} {
		if got := presenter.familyAssignmentsInput.Query[key]; got != want {
			t.Fatalf("expected query %s=%q, got %q in %+v", key, want, got, presenter.familyAssignmentsInput.Query)
		}
	}
	ctx.AssertExpectations(t)
}

func TestTranslationSSRQueryValuesPreservesScope(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM[admin.ScopeTenantIDKey] = " tenant-1 "
	ctx.QueriesM[admin.ScopeOrgIDKey] = "org-1"
	ctx.QueriesM["status"] = "open"
	ctx.QueriesM["entity_type"] = "pages"
	ctx.QueriesM["type"] = "articles"
	ctx.QueriesM["preset"] = "overdue"
	ctx.QueriesM["target_locale"] = "fr"
	ctx.QueriesM["group_by"] = "family_id"
	ctx.QueriesM["group_strategy"] = "server_family"
	ctx.QueriesM["sort_by"] = "due_date"
	ctx.QueriesM["locales"] = "fr,de"
	ctx.QueriesM["locale_offset"] = "10"
	ctx.QueriesM["locale_limit"] = "5"
	ctx.QueriesM["include_examples"] = "true"
	ctx.QueriesM["kind"] = "export"

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
	if values["entity_type"] != "pages" || values["type"] != "articles" {
		t.Fatalf("expected queue type query keys to be preserved for presenter normalization, got %+v", values)
	}
	if values["preset"] != "overdue" {
		t.Fatalf("expected preset to be preserved, got %q", values["preset"])
	}
	if values["target_locale"] != "fr" || values["group_by"] != "family_id" || values["group_strategy"] != "server_family" || values["sort_by"] != "due_date" {
		t.Fatalf("expected queue view query to be preserved, got %+v", values)
	}
	if values["locales"] != "fr,de" || values["locale_offset"] != "10" || values["locale_limit"] != "5" {
		t.Fatalf("expected matrix locale viewport query to be preserved, got %+v", values)
	}
	if values["include_examples"] != "true" || values["kind"] != "export" {
		t.Fatalf("expected exchange history query to be preserved, got %+v", values)
	}
}

func TestRegisterAdminUIRoutesTranslationQueueUsesPresetFromQuery(t *testing.T) {
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

	presenter := &capturingTranslationSSRPresenter{}
	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationSSRPresenter(presenter)); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}
	handler := captureRouter.getHandlers["/admin/translations/queue"]
	if handler == nil {
		t.Fatalf("expected queue route handler")
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["preset"] = "overdue"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/translations/shell", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		return fmt.Sprint(viewCtx["translation_queue_initial_preset"]) == "overdue"
	})).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("render queue shell: %v", err)
	}
	if presenter.queueInput.InitialPresetID != "overdue" {
		t.Fatalf("expected queue initial preset from query, got %+v", presenter.queueInput)
	}
	if presenter.queueInput.Query["preset"] != "overdue" {
		t.Fatalf("expected queue input query to preserve preset, got %+v", presenter.queueInput.Query)
	}
	ctx.AssertExpectations(t)
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
		{name: "family assignments", route: "/admin/translations/families/:family_id/assignments", template: "resources/translations/family-assignments", ssrKey: "translation_family_assignments_ssr", surface: admin.TranslationSSRSurfaceFamilyAssignments, paramKey: "family_id", paramValue: "family-123"},
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
		maps.Copy(viewData, data)
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
