package site

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

type recordedRoute struct {
	Method string
	Path   string
}

type recordingRouter struct {
	routes      []recordedRoute
	middlewares []router.MiddlewareFunc
}

type splitRecordingRouter struct {
	*recordingRouter
	site      *recordingRouter
	publicAPI *recordingRouter
}

func (r *recordingRouter) record(method, path string) {
	r.routes = append(r.routes, recordedRoute{Method: method, Path: path})
}

func newSplitRecordingRouter() *splitRecordingRouter {
	site := &recordingRouter{}
	return &splitRecordingRouter{
		recordingRouter: site,
		site:            site,
		publicAPI:       &recordingRouter{},
	}
}

func (r *splitRecordingRouter) PublicSiteRouter() router.Router[*fiber.App] {
	return r.site
}

func (r *splitRecordingRouter) PublicAPIRouter() router.Router[*fiber.App] {
	return r.publicAPI
}

func (r *recordingRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	case router.POST:
		return r.Post(path, handler, middlewares...)
	case router.PUT:
		return r.Put(path, handler, middlewares...)
	case router.DELETE:
		return r.Delete(path, handler, middlewares...)
	case router.PATCH:
		return r.Patch(path, handler, middlewares...)
	case router.HEAD:
		return r.Head(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *recordingRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *recordingRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *recordingRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	_ = path
	if cb != nil {
		cb(r)
	}
	return r
}

func (r *recordingRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	r.middlewares = append(r.middlewares, m...)
	return r
}

func (r *recordingRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("GET", path)
	return nil
}

func (r *recordingRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("POST", path)
	return nil
}

func (r *recordingRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("PUT", path)
	return nil
}

func (r *recordingRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("DELETE", path)
	return nil
}

func (r *recordingRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("PATCH", path)
	return nil
}

func (r *recordingRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = handler
	_ = mw
	r.record("HEAD", path)
	return nil
}

func (r *recordingRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _ = prefix, root
	_ = config
	return r
}

func (r *recordingRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *recordingRouter) Routes() []router.RouteDefinition { return nil }
func (r *recordingRouter) ValidateRoutes() []error          { return nil }
func (r *recordingRouter) PrintRoutes()                     {}
func (r *recordingRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

type moduleStub struct {
	id            string
	registerRoute string
	registerErr   error
	ownership     []routing.ManifestEntry
	viewContextFn func(context.Context, router.ViewContext) router.ViewContext
}

func (m moduleStub) ID() string { return m.id }

func (m moduleStub) RegisterRoutes(ctx SiteModuleContext) error {
	if m.registerErr != nil {
		return m.registerErr
	}
	if m.registerRoute != "" {
		ctx.Router.Get(m.registerRoute, defaultNotFoundHandler)
	}
	return nil
}

func (m moduleStub) ViewContext(ctx context.Context, in router.ViewContext) router.ViewContext {
	if m.viewContextFn == nil {
		return in
	}
	return m.viewContextFn(ctx, in)
}

func (m moduleStub) RoutingOwnership(ctx SiteRoutingOwnershipContext) []routing.ManifestEntry {
	_ = ctx
	return append([]routing.ManifestEntry{}, m.ownership...)
}

type searchProviderStub struct{}

func (searchProviderStub) Search(ctx context.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	_, _ = ctx, req
	return admin.SearchResultPage{}, nil
}

func (searchProviderStub) Suggest(ctx context.Context, req admin.SuggestRequest) (admin.SuggestResult, error) {
	_, _ = ctx, req
	return admin.SuggestResult{}, nil
}

func TestRegisterSiteRoutesDeterministicOrdering(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	siteCfg := SiteConfig{
		Modules: []SiteModule{
			moduleStub{id: "a", registerRoute: "/module-a"},
			moduleStub{id: "b", registerRoute: "/module-b"},
		},
	}

	first := &recordingRouter{}
	if err := RegisterSiteRoutes(first, nil, cfg, siteCfg); err != nil {
		t.Fatalf("register first: %v", err)
	}
	second := &recordingRouter{}
	if err := RegisterSiteRoutes(second, nil, cfg, siteCfg); err != nil {
		t.Fatalf("register second: %v", err)
	}

	if !reflect.DeepEqual(first.routes, second.routes) {
		t.Fatalf("expected deterministic route order, got first=%+v second=%+v", first.routes, second.routes)
	}

	moduleA := indexOfRoute(first.routes, "GET", "/module-a")
	moduleB := indexOfRoute(first.routes, "GET", "/module-b")
	baseRoute := indexOfRoute(first.routes, "GET", "/")
	catchAll := indexOfRoute(first.routes, "GET", "/*path")
	if moduleA == -1 || moduleB == -1 || baseRoute == -1 || catchAll == -1 {
		t.Fatalf("expected module + base + catch-all routes, got %+v", first.routes)
	}
	if moduleA > baseRoute || moduleB > baseRoute || baseRoute > catchAll {
		t.Fatalf("expected module routes before base and base before catch-all, got %+v", first.routes)
	}
	if len(first.middlewares) != 1 {
		t.Fatalf("expected one site middleware, got %d", len(first.middlewares))
	}
}

func TestRegisterSiteRoutesFeatureFlagGating(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}

	routerNoProvider := &recordingRouter{}
	if err := RegisterSiteRoutes(routerNoProvider, nil, cfg, SiteConfig{}); err != nil {
		t.Fatalf("register no provider: %v", err)
	}
	if indexOfRoute(routerNoProvider.routes, "GET", "/search") != -1 {
		t.Fatalf("expected no search page route without provider")
	}

	routerDisabledFeature := &recordingRouter{}
	if err := RegisterSiteRoutes(routerDisabledFeature, nil, cfg, SiteConfig{
		Features: SiteFeatures{EnableSearch: new(false)},
	}, WithSearchProvider(searchProviderStub{})); err != nil {
		t.Fatalf("register disabled search: %v", err)
	}
	if indexOfRoute(routerDisabledFeature.routes, "GET", "/search") != -1 {
		t.Fatalf("expected no search route when search feature disabled")
	}

	routerEnabled := &recordingRouter{}
	if err := RegisterSiteRoutes(routerEnabled, nil, cfg, SiteConfig{}, WithSearchProvider(searchProviderStub{})); err != nil {
		t.Fatalf("register enabled search: %v", err)
	}
	if indexOfRoute(routerEnabled.routes, "GET", "/search") == -1 {
		t.Fatalf("expected search page route when search feature enabled")
	}
	if indexOfRoute(routerEnabled.routes, "GET", "/search/topics/:topic_slug") == -1 {
		t.Fatalf("expected topic landing route when search feature enabled")
	}
	if indexOfRoute(routerEnabled.routes, "GET", "/api/v1/site/search") == -1 {
		t.Fatalf("expected search API route when search feature enabled")
	}
	if indexOfRoute(routerEnabled.routes, "GET", "/api/v1/site/search/suggest") == -1 {
		t.Fatalf("expected search suggest route when search feature enabled")
	}
}

func TestRegisterSiteRoutesSplitPublicSiteAndPublicAPISurfaces(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	recorder := newSplitRecordingRouter()

	if err := RegisterSiteRoutes(recorder, nil, cfg, SiteConfig{
		BasePath: "/site",
		Features: SiteFeatures{
			EnableSearch: new(true),
			EnableI18N:   new(false),
		},
	}, WithSearchProvider(searchProviderStub{})); err != nil {
		t.Fatalf("register split site routes: %v", err)
	}

	if indexOfRoute(recorder.site.routes, "GET", "/site/search") == -1 {
		t.Fatalf("expected search page route on public site surface, got %+v", recorder.site.routes)
	}
	if indexOfRoute(recorder.site.routes, "GET", "/site/search/topics/:topic_slug") == -1 {
		t.Fatalf("expected search topic route on public site surface, got %+v", recorder.site.routes)
	}
	if indexOfRoute(recorder.site.routes, "GET", "/site") == -1 {
		t.Fatalf("expected site content route on public site surface, got %+v", recorder.site.routes)
	}
	if indexOfRoute(recorder.publicAPI.routes, "GET", DefaultSearchEndpoint) == -1 {
		t.Fatalf("expected search api route on public api surface, got %+v", recorder.publicAPI.routes)
	}
	if indexOfRoute(recorder.publicAPI.routes, "GET", DefaultSearchSuggestRoute) == -1 {
		t.Fatalf("expected search suggest route on public api surface, got %+v", recorder.publicAPI.routes)
	}
	if indexOfRoute(recorder.site.routes, "GET", DefaultSearchEndpoint) != -1 {
		t.Fatalf("did not expect search api route on public site surface, got %+v", recorder.site.routes)
	}
	if len(recorder.site.middlewares) != 1 || len(recorder.publicAPI.middlewares) != 1 {
		t.Fatalf("expected request-context middleware on both surfaces, got site=%d public_api=%d", len(recorder.site.middlewares), len(recorder.publicAPI.middlewares))
	}
}

func TestResolveSiteRoutingOwnershipIncludesModuleOwnershipProviders(t *testing.T) {
	flow := resolveSiteRegisterFlow[*fiber.App](
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{
			BasePath: "/site",
			Modules: []SiteModule{
				moduleStub{
					id: "marketing",
					ownership: []routing.ManifestEntry{
						{
							Owner:     "host:marketing_site",
							Surface:   routing.SurfacePublicSite,
							Domain:    routing.RouteDomainPublicSite,
							RouteKey:  "site.landing",
							RouteName: "site.landing",
							Method:    "GET",
							Path:      "/landing",
						},
					},
				},
			},
		},
		nil,
	)

	entries := flow.routingManifestEntries(nil)
	if indexOfManifestEntry(entries, "host:marketing_site", "/landing") == -1 {
		t.Fatalf("expected module ownership entry to be included, got %+v", entries)
	}
}

func TestResolveRequestStateThemePriority(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	token, err := adm.Preview().Generate("pages", "42", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	resolved := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Theme: SiteThemeConfig{Name: "site", Variant: "dark"},
	})

	devCtx := router.NewMockContext()
	devCtx.On("Context").Return(context.Background())
	devCtx.On("Path").Return("/about")
	devCtx.QueriesM["runtime_env"] = "dev"
	devCtx.QueriesM["theme"] = "custom"
	devCtx.QueriesM["variant"] = "solar"
	devCtx.QueriesM["preview_token"] = token
	devResolvedCtx, devState := ResolveRequestState(context.Background(), devCtx, adm, admin.Config{}, resolved, nil)
	if devState.ThemeName != "custom" || devState.ThemeVariant != "solar" {
		t.Fatalf("expected dev query override to win, got %q/%q", devState.ThemeName, devState.ThemeVariant)
	}
	if locale := admin.LocaleFromContext(devResolvedCtx); locale != "en" {
		t.Fatalf("expected locale from context en, got %q", locale)
	}

	prodCtx := router.NewMockContext()
	prodCtx.On("Context").Return(context.Background())
	prodCtx.On("Path").Return("/about")
	prodCtx.QueriesM["runtime_env"] = "prod"
	prodCtx.QueriesM["theme"] = "custom"
	prodCtx.QueriesM["variant"] = "solar"
	_, prodState := ResolveRequestState(context.Background(), prodCtx, adm, admin.Config{}, resolved, nil)
	if prodState.ThemeName != "site" || prodState.ThemeVariant != "dark" {
		t.Fatalf("expected site defaults in prod, got %q/%q", prodState.ThemeName, prodState.ThemeVariant)
	}
}

func indexOfManifestEntry(entries []routing.ManifestEntry, owner, path string) int {
	for idx, entry := range entries {
		if entry.Owner == owner && entry.Path == path {
			return idx
		}
	}
	return -1
}

func TestRegisterSiteRoutesUsesSingleCatchAllForLocaleModes(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}

	nonDefault := &recordingRouter{}
	if err := RegisterSiteRoutes(nonDefault, nil, cfg, SiteConfig{
		BasePath:         "/site",
		LocalePrefixMode: LocalePrefixNonDefault,
	}); err != nil {
		t.Fatalf("register non_default locale mode: %v", err)
	}
	if indexOfRoute(nonDefault.routes, "GET", "/site/*path") == -1 {
		t.Fatalf("expected generic catch-all route in non_default mode, got %+v", nonDefault.routes)
	}
	if indexOfRoute(nonDefault.routes, "GET", "/site") == -1 {
		t.Fatalf("expected base site route in non_default mode, got %+v", nonDefault.routes)
	}

	always := &recordingRouter{}
	if err := RegisterSiteRoutes(always, nil, cfg, SiteConfig{
		BasePath:         "/site",
		LocalePrefixMode: LocalePrefixAlways,
	}); err != nil {
		t.Fatalf("register always locale mode: %v", err)
	}
	if indexOfRoute(always.routes, "GET", "/site/*path") == -1 {
		t.Fatalf("expected generic catch-all route in always mode, got %+v", always.routes)
	}
	if indexOfRoute(always.routes, "GET", "/site") == -1 {
		t.Fatalf("expected base site route in always mode, got %+v", always.routes)
	}

	i18nDisabled := &recordingRouter{}
	if err := RegisterSiteRoutes(i18nDisabled, nil, cfg, SiteConfig{
		Features: SiteFeatures{EnableI18N: new(false)},
	}); err != nil {
		t.Fatalf("register i18n disabled: %v", err)
	}
	if indexOfRoute(i18nDisabled.routes, "GET", "/*path") == -1 {
		t.Fatalf("expected catch-all route when i18n disabled, got %+v", i18nDisabled.routes)
	}
	if indexOfRoute(i18nDisabled.routes, "GET", "/") == -1 {
		t.Fatalf("expected base site route when i18n disabled, got %+v", i18nDisabled.routes)
	}
}

func TestRegisterSiteRoutesUsesFiberMissHandlersForPublicContentFallback(t *testing.T) {
	adapter := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	if err := RegisterSiteRoutes(adapter.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithContentHandler(func(c router.Context) error {
		return c.JSON(200, map[string]any{"handler": "site"})
	})); err != nil {
		t.Fatalf("register site routes on fiber adapter: %v", err)
	}
	adapter.Init()

	routes := adapter.Router().Routes()
	if indexOfRouteDef(routes, router.GET, "/*") != -1 || indexOfRouteDef(routes, router.GET, "/*path") != -1 {
		t.Fatalf("did not expect explicit catch-all routes when miss handlers are available, got %+v", routes)
	}
	if rec := performSiteTestRequest(t, adapter, "GET", "/"); rec.Code != 200 {
		t.Fatalf("expected root fallback to resolve through miss handler, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec := performSiteTestRequest(t, adapter, "GET", "/posts/welcome"); rec.Code != 200 {
		t.Fatalf("expected nested fallback to resolve through miss handler, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRegisterSiteRoutesUsesHTTPRouterMissHandlersForPublicContentFallback(t *testing.T) {
	adapter := router.NewHTTPServer()
	if err := RegisterSiteRoutes(adapter.Router(), nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, WithContentHandler(func(c router.Context) error {
		return c.JSON(200, map[string]any{"handler": "site"})
	})); err != nil {
		t.Fatalf("register site routes on httprouter adapter: %v", err)
	}
	adapter.Init()

	routes := adapter.Router().Routes()
	if indexOfRouteDef(routes, router.GET, "/") != -1 || indexOfRouteDef(routes, router.GET, "/:path") != -1 || indexOfRouteDef(routes, router.GET, "/:path/*rest") != -1 || indexOfRouteDef(routes, router.GET, "/*path") != -1 {
		t.Fatalf("did not expect explicit fallback wildcard routes when miss handlers are available, got %+v", routes)
	}
	if rec := performSiteTestRequest(t, adapter, "GET", "/"); rec.Code != 200 {
		t.Fatalf("expected root fallback to resolve through miss handler, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec := performSiteTestRequest(t, adapter, "GET", "/posts/welcome"); rec.Code != 200 {
		t.Fatalf("expected nested fallback to resolve through miss handler, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestSiteRegisterFlowWrapsModuleErrors(t *testing.T) {
	flow := resolveSiteRegisterFlow[*fiber.App](nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Modules: []SiteModule{
			moduleStub{id: "broken", registerErr: errors.New("boom")},
		},
	}, nil)

	err := flow.register(&recordingRouter{}, nil, admin.Config{DefaultLocale: "en"})
	if err == nil {
		t.Fatalf("expected module registration error")
	}
	if err.Error() != `register site module "broken" routes: boom` {
		t.Fatalf("unexpected wrapped error: %v", err)
	}
}

func indexOfRoute(routes []recordedRoute, method, path string) int {
	for index, route := range routes {
		if route.Method == method && route.Path == path {
			return index
		}
	}
	return -1
}

func indexOfRouteDef(routes []router.RouteDefinition, method router.HTTPMethod, path string) int {
	for index, route := range routes {
		if route.Method == method && route.Path == path {
			return index
		}
	}
	return -1
}

func mustAdminWithTheme(t *testing.T, theme, variant string) *admin.Admin {
	t.Helper()
	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         theme,
		ThemeVariant:  variant,
		PreviewSecret: "test-preview-secret",
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	return adm
}
