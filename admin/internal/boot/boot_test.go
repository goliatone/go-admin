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
func (s *stubCtx) BootDashboard() DashboardBinding   { return nil }
func (s *stubCtx) BootNavigation() NavigationBinding { return nil }
func (s *stubCtx) BootSearch() SearchBinding         { return nil }
func (s *stubCtx) BootExport() ExportBinding         { return nil }
func (s *stubCtx) BootBulk() BulkBinding             { return nil }
func (s *stubCtx) BootMedia() MediaBinding           { return nil }
func (s *stubCtx) BootNotifications() NotificationsBinding {
	return nil
}
func (s *stubCtx) BootActivity() ActivityBinding     { return nil }
func (s *stubCtx) BootJobs() JobsBinding             { return nil }
func (s *stubCtx) BootSettings() SettingsBinding     { return nil }
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
