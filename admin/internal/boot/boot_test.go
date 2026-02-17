package boot

import (
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

type stubResponder struct {
	jsonCalled int
	htmlCalled int
	errCalled  int
	lastJSON   any
}

func (s *stubResponder) WriteJSON(_ router.Context, payload any) error {
	s.jsonCalled++
	s.lastJSON = payload
	return nil
}
func (s *stubResponder) WriteHTML(_ router.Context, _ string) error { s.htmlCalled++; return nil }
func (s *stubResponder) WriteError(_ router.Context, _ error) error { s.errCalled++; return nil }

type stubCtx struct {
	router     Router
	wrapper    HandlerWrapper
	basePath   string
	adminAPI   string
	urls       urlkit.Resolver
	responder  Responder
	parseBody  func(router.Context) (map[string]any, error)
	panels     []PanelBinding
	dashboard  DashboardBinding
	navigation NavigationBinding
	settings   SettingsBinding
	workflows  WorkflowManagementBinding
	exchange   TranslationExchangeBinding
	queue      TranslationQueueBinding
	registry   SchemaRegistryBinding
	overrides  FeatureOverridesBinding
	gates      FeatureGates
	defaultLoc string
	navCode    string
	widgetErr  error
}

func (s *stubCtx) Router() Router              { return s.router }
func (s *stubCtx) AuthWrapper() HandlerWrapper { return s.wrapper }
func (s *stubCtx) BasePath() string            { return s.basePath }
func (s *stubCtx) AdminAPIGroup() string {
	if s.adminAPI != "" {
		return s.adminAPI
	}
	return "admin.api"
}
func (s *stubCtx) URLs() urlkit.Resolver {
	if s.urls != nil {
		return s.urls
	}
	return newTestURLManager(s.basePath)
}
func (s *stubCtx) DefaultLocale() string { return s.defaultLoc }
func (s *stubCtx) NavMenuCode() string   { return s.navCode }
func (s *stubCtx) Gates() FeatureGates   { return s.gates }
func (s *stubCtx) Responder() Responder  { return s.responder }
func (s *stubCtx) ParseBody(c router.Context) (map[string]any, error) {
	if s.parseBody != nil {
		return s.parseBody(c)
	}
	return map[string]any{}, nil
}
func (s *stubCtx) Panels() []PanelBinding            { return s.panels }
func (s *stubCtx) BootDashboard() DashboardBinding   { return s.dashboard }
func (s *stubCtx) BootNavigation() NavigationBinding { return s.navigation }
func (s *stubCtx) BootSearch() SearchBinding         { return nil }
func (s *stubCtx) ExportRegistrar() ExportRegistrar  { return nil }
func (s *stubCtx) BootBulk() BulkBinding             { return nil }
func (s *stubCtx) BootMedia() MediaBinding           { return nil }
func (s *stubCtx) BootUserImport() UserImportBinding { return nil }
func (s *stubCtx) BootTranslationExchange() TranslationExchangeBinding {
	return s.exchange
}
func (s *stubCtx) BootTranslationQueue() TranslationQueueBinding {
	return s.queue
}
func (s *stubCtx) BootNotifications() NotificationsBinding {
	return nil
}
func (s *stubCtx) BootActivity() ActivityBinding { return nil }
func (s *stubCtx) BootJobs() JobsBinding         { return nil }
func (s *stubCtx) BootSettings() SettingsBinding { return s.settings }
func (s *stubCtx) BootWorkflows() WorkflowManagementBinding {
	return s.workflows
}
func (s *stubCtx) BootSchemaRegistry() SchemaRegistryBinding {
	return s.registry
}
func (s *stubCtx) BootFeatureOverrides() FeatureOverridesBinding {
	return s.overrides
}
func (s *stubCtx) BootIcons() IconsBinding           { return nil }
func (s *stubCtx) SettingsWidget() error             { return nil }
func (s *stubCtx) ActivityWidget() error             { return nil }
func (s *stubCtx) NotificationsWidget() error        { return nil }
func (s *stubCtx) RegisterWidgetAreas() error        { return s.widgetErr }
func (s *stubCtx) RegisterWidgetDefinitions() error  { return s.widgetErr }
func (s *stubCtx) RegisterDashboardProviders() error { return s.widgetErr }

type routeCall struct {
	method  string
	path    string
	handler router.HandlerFunc
}

type recordRouter struct {
	calls []routeCall
}

func (r *recordRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.calls = append(r.calls, routeCall{method: "GET", path: path, handler: handler})
	return nil
}
func (r *recordRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.calls = append(r.calls, routeCall{method: "POST", path: path, handler: handler})
	return nil
}
func (r *recordRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.calls = append(r.calls, routeCall{method: "PUT", path: path, handler: handler})
	return nil
}
func (r *recordRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.calls = append(r.calls, routeCall{method: "DELETE", path: path, handler: handler})
	return nil
}

func newTestURLManager(basePath string) *urlkit.RouteManager {
	cfg := &urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: basePath,
				Routes: map[string]string{
					"dashboard":      "/",
					"dashboard.page": "/dashboard",
					"health":         "/health",
				},
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Routes: map[string]string{
							"dashboard":                    "/dashboard",
							"dashboard.preferences":        "/dashboard/preferences",
							"dashboard.config":             "/dashboard/config",
							"dashboard.debug":              "/dashboard/debug",
							"navigation":                   "/navigation",
							"settings":                     "/settings",
							"settings.form":                "/settings/form",
							"workflows":                    "/workflows",
							"workflows.id":                 "/workflows/:id",
							"workflows.bindings":           "/workflows/bindings",
							"workflows.bindings.id":        "/workflows/bindings/:id",
							"translations.export":          "/translations/export",
							"translations.template":        "/translations/template",
							"translations.my_work":         "/translations/my-work",
							"translations.queue":           "/translations/queue",
							"translations.jobs.id":         "/translations/jobs/:id",
							"translations.import.validate": "/translations/import/validate",
							"translations.import.apply":    "/translations/import/apply",
							"schemas":                      "/schemas",
							"schemas.resource":             "/schemas/:resource",
							"panel":                        "/:panel",
							"panel.id":                     "/:panel/:id",
							"panel.action":                 "/:panel/actions/:action",
							"panel.bulk":                   "/:panel/bulk/:action",
							"panel.preview":                "/:panel/:id/preview",
							"panel.subresource":            "/:panel/:id/:subresource/:value",
						},
					},
				},
			},
		},
	}
	manager, _ := urlkit.NewRouteManagerFromConfig(cfg)
	return manager
}

func mustRoutePath(t *testing.T, ctx BootCtx, group, route string) string {
	t.Helper()
	path := routePath(ctx, group, route)
	if path == "" {
		t.Fatalf("expected route path for %s.%s", group, route)
	}
	return path
}

func mustRoutePathWithParams(t *testing.T, ctx BootCtx, group, route string, params map[string]string) string {
	t.Helper()
	path := routePathWithParams(ctx, group, route, params)
	if path == "" {
		t.Fatalf("expected route path for %s.%s", group, route)
	}
	return path
}

func TestRunShortCircuitsOnError(t *testing.T) {
	ctx := &stubCtx{}
	seen := []string{}
	steps := []Step{
		func(BootCtx) error {
			seen = append(seen, "first")
			return nil
		},
		func(BootCtx) error {
			seen = append(seen, "second")
			return errors.New("boom")
		},
		func(BootCtx) error {
			seen = append(seen, "third")
			return nil
		},
	}

	err := Run(ctx, steps...)

	require.Error(t, err)
	require.Equal(t, []string{"first", "second"}, seen)
}

func TestHealthStepRegistersRouteWithWrapper(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	wrapped := false
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		wrapper: func(handler router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				wrapped = true
				return handler(c)
			}
		},
	}

	err := HealthStep(ctx)

	require.NoError(t, err)
	require.Len(t, rr.calls, 1)
	require.Equal(t, "GET", rr.calls[0].method)
	require.Equal(t, mustRoutePath(t, ctx, "admin", "health"), rr.calls[0].path)
	require.NotNil(t, rr.calls[0].handler)
	require.False(t, wrapped)

	require.NoError(t, rr.calls[0].handler(nil))
	require.True(t, wrapped)
	require.Equal(t, 1, resp.jsonCalled)
	require.Equal(t, map[string]string{"status": "ok"}, resp.lastJSON)
}

type stubPanelBinding struct {
	name              string
	listCalled        int
	actionCalled      int
	bulkCalled        int
	subresourceCalled int
	lastLocale        string
	lastActionBody    map[string]any
	actionResult      map[string]any
	bulkResult        map[string]any
	subresources      []PanelSubresourceSpec
	lastSubresource   struct {
		id    string
		name  string
		value string
	}
}

func (s *stubPanelBinding) Name() string { return s.name }
func (s *stubPanelBinding) List(_ router.Context, locale string, _ ListOptions) ([]map[string]any, int, any, any, error) {
	s.listCalled++
	s.lastLocale = locale
	return []map[string]any{{"id": "1"}}, 1, map[string]any{"schema": true}, map[string]any{"form": true}, nil
}
func (s *stubPanelBinding) Detail(router.Context, string, string) (map[string]any, error) {
	return map[string]any{"id": "1"}, nil
}
func (s *stubPanelBinding) Create(router.Context, string, map[string]any) (map[string]any, error) {
	return map[string]any{"id": "2"}, nil
}
func (s *stubPanelBinding) Update(router.Context, string, string, map[string]any) (map[string]any, error) {
	return map[string]any{"id": "3"}, nil
}
func (s *stubPanelBinding) Delete(router.Context, string, string) error { return nil }
func (s *stubPanelBinding) Action(_ router.Context, locale, action string, body map[string]any) (map[string]any, error) {
	s.actionCalled++
	s.lastLocale = locale
	s.lastActionBody = body
	if action == "" {
		return nil, errors.New("missing action")
	}
	return s.actionResult, nil
}
func (s *stubPanelBinding) Bulk(_ router.Context, locale, action string, body map[string]any) (map[string]any, error) {
	s.bulkCalled++
	s.lastLocale = locale
	s.lastActionBody = body
	if action == "" {
		return nil, errors.New("missing action")
	}
	return s.bulkResult, nil
}

func (s *stubPanelBinding) Preview(router.Context, string, string) (map[string]any, error) {
	return map[string]any{"token": "preview-token"}, nil
}

func (s *stubPanelBinding) Subresources() []PanelSubresourceSpec {
	return append([]PanelSubresourceSpec{}, s.subresources...)
}

func (s *stubPanelBinding) HandleSubresource(_ router.Context, locale, id, subresource, value string) error {
	s.subresourceCalled++
	s.lastLocale = locale
	s.lastSubresource.id = id
	s.lastSubresource.name = subresource
	s.lastSubresource.value = value
	return nil
}

func TestPanelStepRegistersHandlers(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{name: "users"}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"id": "x"}, nil
		},
	}

	err := PanelStep(ctx)
	require.NoError(t, err)
	require.Len(t, rr.calls, 9)

	actionCtx := router.NewMockContext()
	actionCtx.ParamsM["panel"] = "users"
	actionCtx.ParamsM["action"] = "run"
	actionCtx.On("Body").Return([]byte{})
	bulkCtx := router.NewMockContext()
	bulkCtx.ParamsM["panel"] = "users"
	bulkCtx.ParamsM["action"] = "bulk"
	bulkCtx.On("Body").Return([]byte{})

	require.NoError(t, rr.calls[6].handler(actionCtx))
	require.NoError(t, rr.calls[7].handler(bulkCtx))
	require.Equal(t, 1, binding.actionCalled)
	require.Equal(t, 1, binding.bulkCalled)
	require.Equal(t, "en", binding.lastLocale)
}

func TestPanelStepActionSuccessEnvelopeWithData(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{
		name:         "users",
		actionResult: map[string]any{"id": "2", "locale": "es"},
	}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
	}

	require.NoError(t, PanelStep(ctx))
	require.Len(t, rr.calls, 9)

	actionCtx := router.NewMockContext()
	actionCtx.ParamsM["panel"] = "users"
	actionCtx.ParamsM["action"] = "create_translation"
	actionCtx.On("Body").Return([]byte{})

	require.NoError(t, rr.calls[6].handler(actionCtx))
	payload, ok := resp.lastJSON.(map[string]any)
	require.True(t, ok)
	require.Equal(t, "ok", payload["status"])
	data, ok := payload["data"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "2", data["id"])
	require.Equal(t, "es", data["locale"])
}

func TestPanelStepBulkSuccessEnvelopeWithData(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{
		name:       "users",
		bulkResult: map[string]any{"processed": 2, "failed": 0},
	}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
	}

	require.NoError(t, PanelStep(ctx))
	require.Len(t, rr.calls, 9)

	bulkCtx := router.NewMockContext()
	bulkCtx.ParamsM["panel"] = "users"
	bulkCtx.ParamsM["action"] = "create-missing-translations"
	bulkCtx.On("Body").Return([]byte{})

	require.NoError(t, rr.calls[7].handler(bulkCtx))
	payload, ok := resp.lastJSON.(map[string]any)
	require.True(t, ok)
	require.Equal(t, "ok", payload["status"])
	data, ok := payload["data"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, 2, int(data["processed"].(int)))
	require.Equal(t, 0, int(data["failed"].(int)))
}

func TestPanelStepActionMergesQueryContextIntoPayload(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{name: "content"}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"id": "x"}, nil
		},
	}

	require.NoError(t, PanelStep(ctx))

	actionCtx := router.NewMockContext()
	actionCtx.ParamsM["panel"] = "content"
	actionCtx.ParamsM["action"] = "publish"
	actionCtx.QueriesM["locale"] = "es"
	actionCtx.QueriesM["environment"] = "staging"
	actionCtx.QueriesM["policy_entity"] = "posts"
	actionCtx.On("Body").Return([]byte(`{"id":"x"}`))

	require.NoError(t, rr.calls[6].handler(actionCtx))
	require.Equal(t, "es", binding.lastActionBody["locale"])
	require.Equal(t, "staging", binding.lastActionBody["environment"])
	require.Equal(t, "posts", binding.lastActionBody["policy_entity"])
}

func TestPanelStepActionPayloadWinsOverQueryContext(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{name: "content"}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{
				"id":            "x",
				"locale":        "fr",
				"environment":   "production",
				"policy_entity": "pages",
			}, nil
		},
	}

	require.NoError(t, PanelStep(ctx))

	actionCtx := router.NewMockContext()
	actionCtx.ParamsM["panel"] = "content"
	actionCtx.ParamsM["action"] = "publish"
	actionCtx.QueriesM["locale"] = "es"
	actionCtx.QueriesM["environment"] = "staging"
	actionCtx.QueriesM["policy_entity"] = "posts"
	actionCtx.On("Body").Return([]byte(`{"id":"x"}`))

	require.NoError(t, rr.calls[6].handler(actionCtx))
	require.Equal(t, "fr", binding.lastActionBody["locale"])
	require.Equal(t, "production", binding.lastActionBody["environment"])
	require.Equal(t, "pages", binding.lastActionBody["policy_entity"])
}

func TestPanelStepRegistersPanelSubresourceRoutes(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubPanelBinding{
		name: "agreements",
		subresources: []PanelSubresourceSpec{
			{Name: "artifact", Method: "GET"},
		},
	}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{binding},
	}

	require.NoError(t, PanelStep(ctx))
	require.Len(t, rr.calls, 10)

	expectedPath := mustRoutePathWithParams(t, ctx, ctx.AdminAPIGroup(), "panel.subresource", map[string]string{
		"panel":       "agreements",
		"subresource": "artifact",
	})
	var subresourceHandler router.HandlerFunc
	for _, call := range rr.calls {
		if call.path == expectedPath && call.method == "GET" {
			subresourceHandler = call.handler
			break
		}
	}
	require.NotNil(t, subresourceHandler)

	mockCtx := router.NewMockContext()
	mockCtx.ParamsM["panel"] = "agreements"
	mockCtx.ParamsM["id"] = "ag-1"
	mockCtx.ParamsM["value"] = "executed"

	require.NoError(t, subresourceHandler(mockCtx))
	require.Equal(t, 1, binding.subresourceCalled)
	require.Equal(t, "en", binding.lastLocale)
	require.Equal(t, "ag-1", binding.lastSubresource.id)
	require.Equal(t, "artifact", binding.lastSubresource.name)
	require.Equal(t, "executed", binding.lastSubresource.value)
}

func TestPanelStepDoesNotRegisterPreflightRoute(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{&stubPanelBinding{name: "users"}},
	}

	require.NoError(t, PanelStep(ctx))
	for _, call := range rr.calls {
		if strings.Contains(call.path, "preflight") {
			t.Fatalf("unexpected preflight route registered: %s", call.path)
		}
	}
}

func TestPanelStepResolvesPanelBindingAtRequestTime(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	usersBinding := &stubPanelBinding{name: "users"}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		panels:     []PanelBinding{usersBinding},
	}

	err := PanelStep(ctx)
	require.NoError(t, err)
	require.Len(t, rr.calls, 9)

	replacementUsersBinding := &stubPanelBinding{name: "users"}
	ctx.panels = []PanelBinding{replacementUsersBinding}

	listCtx := router.NewMockContext()
	require.NoError(t, rr.calls[0].handler(listCtx))
	require.Equal(t, 1, replacementUsersBinding.listCalled)
	require.Equal(t, 0, usersBinding.listCalled)

	ctx.panels = nil
	missingCtx := router.NewMockContext()
	require.NoError(t, rr.calls[0].handler(missingCtx))
	require.Equal(t, 1, resp.errCalled)
}

type stubNavigationBinding struct {
	locale   string
	menuCode string
	items    any
	theme    map[string]map[string]string
}

func (s *stubNavigationBinding) Resolve(_ router.Context, locale, menuCode string) (any, map[string]map[string]string) {
	s.locale = locale
	s.menuCode = menuCode
	return s.items, s.theme
}

func TestNavigationStepRegistersRouteAndUsesDefaults(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	wrapped := false
	binding := &stubNavigationBinding{
		items: []any{map[string]any{"label": "Home"}},
		theme: map[string]map[string]string{"tokens": {"primary": "#000"}},
	}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		navCode:    "admin.main",
		navigation: binding,
		wrapper: func(handler router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				wrapped = true
				return handler(c)
			}
		},
	}

	require.NoError(t, NavigationStep(ctx))
	require.Len(t, rr.calls, 1)
	require.Equal(t, "GET", rr.calls[0].method)
	require.Equal(t, mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "navigation"), rr.calls[0].path)

	mockCtx := router.NewMockContext()
	require.NoError(t, rr.calls[0].handler(mockCtx))
	require.True(t, wrapped)
	require.Equal(t, "en", binding.locale)
	require.Equal(t, "admin.main", binding.menuCode)

	payload, ok := resp.lastJSON.(map[string]any)
	require.True(t, ok)
	require.NotNil(t, payload["items"])
	require.NotNil(t, payload["theme"])

	// Query overrides
	wrapped = false
	mockCtx = router.NewMockContext()
	mockCtx.QueriesM["locale"] = "es"
	mockCtx.QueriesM["code"] = "custom.menu"
	require.NoError(t, rr.calls[0].handler(mockCtx))
	require.True(t, wrapped)
	require.Equal(t, "es", binding.locale)
	require.Equal(t, "custom.menu", binding.menuCode)
}

type stubFeatureGates struct {
	required []string
	err      error
}

func (s *stubFeatureGates) Enabled(_ string) bool { return s.err == nil }
func (s *stubFeatureGates) Require(key string) error {
	s.required = append(s.required, key)
	return s.err
}

type stubDashboardBinding struct {
	enabled       bool
	hasRenderer   bool
	renderCalled  int
	widgetsCalled int
	prefsCalled   int
	saveCalled    int
}

func (s *stubDashboardBinding) Enabled() bool     { return s.enabled }
func (s *stubDashboardBinding) HasRenderer() bool { return s.hasRenderer }
func (s *stubDashboardBinding) RenderHTML(_ router.Context, _ string) (string, error) {
	s.renderCalled++
	return "<html/>", nil
}
func (s *stubDashboardBinding) Widgets(_ router.Context, _ string) (map[string]any, error) {
	s.widgetsCalled++
	return map[string]any{"widgets": []any{}}, nil
}
func (s *stubDashboardBinding) Preferences(_ router.Context, _ string) (map[string]any, error) {
	s.prefsCalled++
	return map[string]any{"layout": map[string]any{}}, nil
}
func (s *stubDashboardBinding) SavePreferences(_ router.Context, _ map[string]any) (map[string]any, error) {
	s.saveCalled++
	return map[string]any{"ok": true}, nil
}

func (s *stubDashboardBinding) Diagnostics(_ router.Context, _ string) (map[string]any, error) {
	return map[string]any{"diag": true}, nil
}

type stubDashboardPermissionBinding struct {
	stubDashboardBinding
	prefPermCalled   int
	updatePermCalled int
	prefPermErr      error
	updatePermErr    error
}

func (s *stubDashboardPermissionBinding) RequirePreferencesPermission(_ router.Context, _ string) error {
	s.prefPermCalled++
	return s.prefPermErr
}

func (s *stubDashboardPermissionBinding) RequirePreferencesUpdatePermission(_ router.Context, _ string) error {
	s.updatePermCalled++
	return s.updatePermErr
}

func TestDashboardStepRegistersRoutesAndWrapsHandlers(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	wrapped := false
	gates := &stubFeatureGates{}
	binding := &stubDashboardBinding{enabled: true}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		dashboard:  binding,
		gates:      gates,
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"k": "v"}, nil
		},
		wrapper: func(handler router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				wrapped = true
				return handler(c)
			}
		},
	}

	require.NoError(t, DashboardStep(ctx))
	require.Len(t, rr.calls, 6)

	paths := map[string]bool{}
	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		paths[call.path] = true
		methodPaths[call.method+" "+call.path] = true
	}
	dashboardPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard")
	prefsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard.preferences")
	configPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard.config")
	debugPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard.debug")
	badPrefsPath := strings.Replace(prefsPath, "/preferences", ".preferences", 1)
	require.True(t, paths[dashboardPath])
	require.True(t, paths[prefsPath])
	require.True(t, paths[configPath])
	require.True(t, paths[debugPath])
	require.True(t, methodPaths["GET "+prefsPath])
	require.False(t, methodPaths["POST "+badPrefsPath]) // sanity: no typo route
	require.True(t, methodPaths["POST "+prefsPath])
	require.True(t, methodPaths["GET "+configPath])
	require.True(t, methodPaths["POST "+configPath])
	require.True(t, methodPaths["GET "+debugPath])

	// Execute one handler to ensure wrapper and gate are applied.
	mockCtx := router.NewMockContext()
	require.NoError(t, rr.calls[0].handler(mockCtx))
	require.True(t, wrapped)
	require.NotEmpty(t, gates.required)
}

func TestDashboardStepHonorsGateErrors(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	gates := &stubFeatureGates{err: errors.New("disabled")}
	binding := &stubDashboardBinding{enabled: true}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		dashboard:  binding,
		gates:      gates,
	}

	require.NoError(t, DashboardStep(ctx))
	require.NotEmpty(t, rr.calls)
	require.NoError(t, rr.calls[0].handler(router.NewMockContext()))
	require.Equal(t, 1, resp.errCalled)
	require.Equal(t, 0, binding.widgetsCalled)
}

func TestDashboardStepEnforcesPreferencesPermissions(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubDashboardPermissionBinding{
		stubDashboardBinding: stubDashboardBinding{enabled: true},
	}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		dashboard:  binding,
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"layout": map[string]any{}}, nil
		},
	}

	require.NoError(t, DashboardStep(ctx))

	var getHandler router.HandlerFunc
	var postHandler router.HandlerFunc
	prefsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard.preferences")
	for _, call := range rr.calls {
		if call.path == prefsPath {
			if call.method == "GET" {
				getHandler = call.handler
			}
			if call.method == "POST" {
				postHandler = call.handler
			}
		}
	}

	require.NotNil(t, getHandler)
	require.NoError(t, getHandler(router.NewMockContext()))
	require.Equal(t, 1, binding.prefPermCalled)
	require.Equal(t, 1, binding.prefsCalled)

	require.NotNil(t, postHandler)
	require.NoError(t, postHandler(router.NewMockContext()))
	require.Equal(t, 1, binding.updatePermCalled)
	require.Equal(t, 1, binding.saveCalled)
}

func TestDashboardStepStopsOnPreferencesPermissionError(t *testing.T) {
	tests := []struct {
		name           string
		prefErr        error
		updateErr      error
		method         string
		expectedErrs   int
		expectPrefs    int
		expectSave     int
		expectPrefCall int
		expectUpdCall  int
	}{
		{
			name:           "get denied",
			prefErr:        errors.New("nope"),
			method:         "GET",
			expectedErrs:   1,
			expectPrefs:    0,
			expectSave:     0,
			expectPrefCall: 1,
			expectUpdCall:  0,
		},
		{
			name:           "post denied",
			updateErr:      errors.New("nope"),
			method:         "POST",
			expectedErrs:   1,
			expectPrefs:    0,
			expectSave:     0,
			expectPrefCall: 0,
			expectUpdCall:  1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rr := &recordRouter{}
			resp := &stubResponder{}
			binding := &stubDashboardPermissionBinding{
				stubDashboardBinding: stubDashboardBinding{enabled: true},
				prefPermErr:          tc.prefErr,
				updatePermErr:        tc.updateErr,
			}
			ctx := &stubCtx{
				router:     rr,
				responder:  resp,
				basePath:   "/admin",
				defaultLoc: "en",
				dashboard:  binding,
				parseBody: func(router.Context) (map[string]any, error) {
					return map[string]any{"layout": map[string]any{}}, nil
				},
			}

			require.NoError(t, DashboardStep(ctx))

			var handler router.HandlerFunc
			prefsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "dashboard.preferences")
			for _, call := range rr.calls {
				if call.path == prefsPath && call.method == tc.method {
					handler = call.handler
				}
			}
			require.NotNil(t, handler)
			require.NoError(t, handler(router.NewMockContext()))
			require.Equal(t, tc.expectedErrs, resp.errCalled)
			require.Equal(t, tc.expectPrefs, binding.prefsCalled)
			require.Equal(t, tc.expectSave, binding.saveCalled)
			require.Equal(t, tc.expectPrefCall, binding.prefPermCalled)
			require.Equal(t, tc.expectUpdCall, binding.updatePermCalled)
		})
	}
}

type stubSettingsBinding struct {
	valuesCalled int
	formCalled   int
	saveCalled   int
	lastBody     map[string]any
}

type stubTranslationExchangeBinding struct {
	exportCalled   int
	templateCalled int
	validateCalled int
	applyCalled    int
	jobCalled      int
}

func (s *stubTranslationExchangeBinding) Export(_ router.Context) (any, error) {
	s.exportCalled++
	return map[string]any{"row_count": 1}, nil
}

func (s *stubTranslationExchangeBinding) Template(_ router.Context) error {
	s.templateCalled++
	return nil
}

func (s *stubTranslationExchangeBinding) ImportValidate(_ router.Context) (any, error) {
	s.validateCalled++
	return map[string]any{"summary": map[string]any{"processed": 1}}, nil
}

func (s *stubTranslationExchangeBinding) ImportApply(_ router.Context) (any, error) {
	s.applyCalled++
	return map[string]any{"summary": map[string]any{"processed": 1}}, nil
}

func (s *stubTranslationExchangeBinding) JobStatus(_ router.Context, _ string) (any, error) {
	s.jobCalled++
	return map[string]any{"status": "ok"}, nil
}

func TestTranslationExchangeRouteStepRegistersRoutes(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubTranslationExchangeBinding{}
	ctx := &stubCtx{
		router:    rr,
		responder: resp,
		basePath:  "/admin",
		exchange:  binding,
	}

	require.NoError(t, TranslationExchangeRouteStep(ctx))
	require.Len(t, rr.calls, 5)

	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		methodPaths[call.method+" "+call.path] = true
	}
	require.True(t, methodPaths["POST "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.export")])
	require.True(t, methodPaths["GET "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.template")])
	require.True(t, methodPaths["POST "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.import.validate")])
	require.True(t, methodPaths["POST "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.import.apply")])
	require.True(t, methodPaths["GET "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.jobs.id")])

	for _, call := range rr.calls {
		require.NoError(t, call.handler(router.NewMockContext()))
	}
	require.Equal(t, 1, binding.exportCalled)
	require.Equal(t, 1, binding.templateCalled)
	require.Equal(t, 1, binding.validateCalled)
	require.Equal(t, 1, binding.applyCalled)
	require.Equal(t, 1, binding.jobCalled)
}

type stubTranslationQueueBinding struct {
	myWorkCalled int
	queueCalled  int
}

func (s *stubTranslationQueueBinding) MyWork(_ router.Context) (any, error) {
	s.myWorkCalled++
	return map[string]any{"scope": "my_work"}, nil
}

func (s *stubTranslationQueueBinding) Queue(_ router.Context) (any, error) {
	s.queueCalled++
	return map[string]any{"scope": "queue"}, nil
}

func TestTranslationQueueRouteStepRegistersRoutes(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubTranslationQueueBinding{}
	ctx := &stubCtx{
		router:    rr,
		responder: resp,
		basePath:  "/admin",
		queue:     binding,
	}

	require.NoError(t, TranslationQueueRouteStep(ctx))
	require.Len(t, rr.calls, 2)
	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		methodPaths[call.method+" "+call.path] = true
	}
	require.True(t, methodPaths["GET "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.my_work")])
	require.True(t, methodPaths["GET "+mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "translations.queue")])

	for _, call := range rr.calls {
		require.NoError(t, call.handler(router.NewMockContext()))
	}
	require.Equal(t, 1, binding.myWorkCalled)
	require.Equal(t, 1, binding.queueCalled)
}

func (s *stubSettingsBinding) Values(_ router.Context) (map[string]any, error) {
	s.valuesCalled++
	return map[string]any{"values": map[string]any{}}, nil
}
func (s *stubSettingsBinding) Form(_ router.Context) (any, error) {
	s.formCalled++
	return map[string]any{"schema": true}, nil
}
func (s *stubSettingsBinding) Save(_ router.Context, body map[string]any) (map[string]any, error) {
	s.saveCalled++
	s.lastBody = body
	return map[string]any{"ok": true}, nil
}

func TestSettingsRouteStepRegistersRoutesAndParsesBody(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	gates := &stubFeatureGates{}
	binding := &stubSettingsBinding{}
	ctx := &stubCtx{
		router:     rr,
		responder:  resp,
		basePath:   "/admin",
		defaultLoc: "en",
		settings:   binding,
		gates:      gates,
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"values": map[string]any{"k": "v"}}, nil
		},
	}

	require.NoError(t, SettingsRouteStep(ctx))
	require.Len(t, rr.calls, 3)

	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		methodPaths[call.method+" "+call.path] = true
	}
	settingsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "settings")
	settingsFormPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "settings.form")
	require.True(t, methodPaths["GET "+settingsPath])
	require.True(t, methodPaths["GET "+settingsFormPath])
	require.True(t, methodPaths["POST "+settingsPath])

	var postHandler router.HandlerFunc
	for _, call := range rr.calls {
		if call.method == "POST" && call.path == settingsPath {
			postHandler = call.handler
		}
	}
	require.NotNil(t, postHandler)
	require.NoError(t, postHandler(router.NewMockContext()))
	require.Equal(t, 1, binding.saveCalled)
	require.NotNil(t, binding.lastBody)
	require.NotEmpty(t, gates.required)
}

type stubSchemaRegistryBinding struct {
	listCalled   int
	getCalled    int
	lastResource string
}

type stubWorkflowManagementBinding struct {
	listWorkflowsCalled  int
	createWorkflowCalled int
	updateWorkflowCalled int
	listBindingsCalled   int
	createBindingCalled  int
	updateBindingCalled  int
	deleteBindingCalled  int
	lastBody             map[string]any
}

func (s *stubWorkflowManagementBinding) ListWorkflows(_ router.Context) (map[string]any, error) {
	s.listWorkflowsCalled++
	return map[string]any{"workflows": []map[string]any{}, "total": 0}, nil
}

func (s *stubWorkflowManagementBinding) CreateWorkflow(_ router.Context, body map[string]any) (map[string]any, error) {
	s.createWorkflowCalled++
	s.lastBody = body
	return map[string]any{"workflow": map[string]any{"id": "editorial.default"}}, nil
}

func (s *stubWorkflowManagementBinding) UpdateWorkflow(_ router.Context, _ string, body map[string]any) (map[string]any, error) {
	s.updateWorkflowCalled++
	s.lastBody = body
	return map[string]any{"workflow": map[string]any{"id": "editorial.default"}}, nil
}

func (s *stubWorkflowManagementBinding) ListBindings(_ router.Context) (map[string]any, error) {
	s.listBindingsCalled++
	return map[string]any{"bindings": []map[string]any{}, "total": 0}, nil
}

func (s *stubWorkflowManagementBinding) CreateBinding(_ router.Context, body map[string]any) (map[string]any, error) {
	s.createBindingCalled++
	s.lastBody = body
	return map[string]any{"binding": map[string]any{"id": "wfb_1"}}, nil
}

func (s *stubWorkflowManagementBinding) UpdateBinding(_ router.Context, _ string, body map[string]any) (map[string]any, error) {
	s.updateBindingCalled++
	s.lastBody = body
	return map[string]any{"binding": map[string]any{"id": "wfb_1"}}, nil
}

func (s *stubWorkflowManagementBinding) DeleteBinding(_ router.Context, _ string) error {
	s.deleteBindingCalled++
	return nil
}

func (s *stubSchemaRegistryBinding) List(_ router.Context) (any, error) {
	s.listCalled++
	return map[string]any{"schemas": []map[string]any{{"resource": "content"}}}, nil
}

func (s *stubSchemaRegistryBinding) Get(_ router.Context, resource string) (any, error) {
	s.getCalled++
	s.lastResource = resource
	return map[string]any{"resource": resource}, nil
}

func TestSchemaRegistryStepRegistersRoutes(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubSchemaRegistryBinding{}
	ctx := &stubCtx{
		router:    rr,
		responder: resp,
		basePath:  "/admin",
		registry:  binding,
	}

	require.NoError(t, SchemaRegistryStep(ctx))
	require.Len(t, rr.calls, 2)

	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		methodPaths[call.method+" "+call.path] = true
	}
	schemasPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "schemas")
	schemaResourcePath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "schemas.resource")
	require.True(t, methodPaths["GET "+schemasPath])
	require.True(t, methodPaths["GET "+schemaResourcePath])

	var listHandler router.HandlerFunc
	for _, call := range rr.calls {
		if call.method == "GET" && call.path == schemasPath {
			listHandler = call.handler
			break
		}
	}
	require.NotNil(t, listHandler)
	require.NoError(t, listHandler(router.NewMockContext()))
	require.Equal(t, 1, binding.listCalled)
	require.Equal(t, 1, resp.jsonCalled)
}

func TestWorkflowRouteStepRegistersRoutesAndParsesBody(t *testing.T) {
	rr := &recordRouter{}
	resp := &stubResponder{}
	binding := &stubWorkflowManagementBinding{}
	ctx := &stubCtx{
		router:    rr,
		responder: resp,
		basePath:  "/admin",
		workflows: binding,
		parseBody: func(router.Context) (map[string]any, error) {
			return map[string]any{"name": "Editorial"}, nil
		},
	}

	require.NoError(t, WorkflowRouteStep(ctx))
	require.Len(t, rr.calls, 7)

	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		methodPaths[call.method+" "+call.path] = true
	}
	workflowsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "workflows")
	workflowIDPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "workflows.id")
	bindingsPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "workflows.bindings")
	bindingIDPath := mustRoutePath(t, ctx, ctx.AdminAPIGroup(), "workflows.bindings.id")
	require.True(t, methodPaths["GET "+workflowsPath])
	require.True(t, methodPaths["POST "+workflowsPath])
	require.True(t, methodPaths["PUT "+workflowIDPath])
	require.True(t, methodPaths["GET "+bindingsPath])
	require.True(t, methodPaths["POST "+bindingsPath])
	require.True(t, methodPaths["PUT "+bindingIDPath])
	require.True(t, methodPaths["DELETE "+bindingIDPath])

	for _, call := range rr.calls {
		mock := router.NewMockContext()
		mock.ParamsM["id"] = "wfb_1"
		require.NoError(t, call.handler(mock))
	}
	require.Equal(t, 1, binding.listWorkflowsCalled)
	require.Equal(t, 1, binding.createWorkflowCalled)
	require.Equal(t, 1, binding.updateWorkflowCalled)
	require.Equal(t, 1, binding.listBindingsCalled)
	require.Equal(t, 1, binding.createBindingCalled)
	require.Equal(t, 1, binding.updateBindingCalled)
	require.Equal(t, 1, binding.deleteBindingCalled)
	require.NotNil(t, binding.lastBody)
}
