package boot

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	router "github.com/goliatone/go-router"
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
	responder  Responder
	parseBody  func(router.Context) (map[string]any, error)
	panels     []PanelBinding
	dashboard  DashboardBinding
	navigation NavigationBinding
	settings   SettingsBinding
	gates      FeatureGates
	defaultLoc string
	navCode    string
	widgetErr  error
}

func (s *stubCtx) Router() Router              { return s.router }
func (s *stubCtx) AuthWrapper() HandlerWrapper { return s.wrapper }
func (s *stubCtx) BasePath() string            { return s.basePath }
func (s *stubCtx) DefaultLocale() string       { return s.defaultLoc }
func (s *stubCtx) NavMenuCode() string         { return s.navCode }
func (s *stubCtx) Gates() FeatureGates         { return s.gates }
func (s *stubCtx) Responder() Responder        { return s.responder }
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
func (s *stubCtx) BootExport() ExportBinding         { return nil }
func (s *stubCtx) BootBulk() BulkBinding             { return nil }
func (s *stubCtx) BootMedia() MediaBinding           { return nil }
func (s *stubCtx) BootNotifications() NotificationsBinding {
	return nil
}
func (s *stubCtx) BootActivity() ActivityBinding     { return nil }
func (s *stubCtx) BootJobs() JobsBinding             { return nil }
func (s *stubCtx) BootSettings() SettingsBinding     { return s.settings }
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
	require.Equal(t, "/admin/health", rr.calls[0].path)
	require.NotNil(t, rr.calls[0].handler)
	require.False(t, wrapped)

	require.NoError(t, rr.calls[0].handler(nil))
	require.True(t, wrapped)
	require.Equal(t, 1, resp.jsonCalled)
	require.Equal(t, map[string]string{"status": "ok"}, resp.lastJSON)
}

type stubPanelBinding struct {
	name           string
	listCalled     int
	actionCalled   int
	bulkCalled     int
	lastLocale     string
	lastActionBody map[string]any
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
func (s *stubPanelBinding) Action(_ router.Context, locale, action string, body map[string]any) error {
	s.actionCalled++
	s.lastLocale = locale
	s.lastActionBody = body
	if action == "" {
		return errors.New("missing action")
	}
	return nil
}
func (s *stubPanelBinding) Bulk(_ router.Context, locale, action string, body map[string]any) error {
	s.bulkCalled++
	s.lastLocale = locale
	s.lastActionBody = body
	if action == "" {
		return errors.New("missing action")
	}
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
	require.Len(t, rr.calls, 8)

	actionCtx := router.NewMockContext()
	actionCtx.ParamsM["action"] = "run"
	actionCtx.On("Body").Return([]byte{})
	bulkCtx := router.NewMockContext()
	bulkCtx.ParamsM["action"] = "bulk"
	bulkCtx.On("Body").Return([]byte{})

	require.NoError(t, rr.calls[6].handler(actionCtx))
	require.NoError(t, rr.calls[7].handler(bulkCtx))
	require.Equal(t, 1, binding.actionCalled)
	require.Equal(t, 1, binding.bulkCalled)
	require.Equal(t, "en", binding.lastLocale)
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
	require.Equal(t, "/admin/api/navigation", rr.calls[0].path)

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
	require.Len(t, rr.calls, 5)

	paths := map[string]bool{}
	methodPaths := map[string]bool{}
	for _, call := range rr.calls {
		paths[call.path] = true
		methodPaths[call.method+" "+call.path] = true
	}
	require.True(t, paths["/admin/api/dashboard"])
	require.True(t, paths["/admin/api/dashboard/preferences"])
	require.True(t, paths["/admin/api/dashboard/config"])
	require.True(t, methodPaths["GET /admin/api/dashboard/preferences"])
	require.False(t, methodPaths["POST /admin/api/dashboard.preferences"]) // sanity: no typo route
	require.True(t, methodPaths["POST /admin/api/dashboard/preferences"])
	require.True(t, methodPaths["GET /admin/api/dashboard/config"])
	require.True(t, methodPaths["POST /admin/api/dashboard/config"])

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

type stubSettingsBinding struct {
	valuesCalled int
	formCalled   int
	saveCalled   int
	lastBody     map[string]any
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
	require.True(t, methodPaths["GET /admin/api/settings"])
	require.True(t, methodPaths["GET /admin/api/settings/form"])
	require.True(t, methodPaths["POST /admin/api/settings"])

	var postHandler router.HandlerFunc
	for _, call := range rr.calls {
		if call.method == "POST" && call.path == "/admin/api/settings" {
			postHandler = call.handler
		}
	}
	require.NotNil(t, postHandler)
	require.NoError(t, postHandler(router.NewMockContext()))
	require.Equal(t, 1, binding.saveCalled)
	require.NotNil(t, binding.lastBody)
	require.NotEmpty(t, gates.required)
}
