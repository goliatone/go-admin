package admin

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestRegisterModuleRejectsDuplicates(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})

	if err := adm.RegisterModule(&stubModule{id: "mod"}); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	if err := adm.RegisterModule(&stubModule{id: "mod"}); err == nil {
		t.Fatalf("expected duplicate module registration to fail")
	}
}

func TestLoadModulesRunsInOrderOnce(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	seq := []string{}

	m1 := &stubModule{id: "one", onRegister: func() { seq = append(seq, "one") }}
	m2 := &stubModule{id: "two", onRegister: func() { seq = append(seq, "two") }}

	if err := adm.RegisterModule(m1); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	if err := adm.RegisterModule(m2); err != nil {
		t.Fatalf("register module failed: %v", err)
	}

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil { // second call should no-op
		t.Fatalf("load modules second pass failed: %v", err)
	}

	expected := []string{"one", "two"}
	if len(seq) != len(expected) {
		t.Fatalf("expected sequence %v, got %v", expected, seq)
	}
	for i := range expected {
		if seq[i] != expected[i] {
			t.Fatalf("expected sequence %v, got %v", expected, seq)
		}
	}
}

func TestLoadModulesOrdersByDependencies(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	seq := []string{}

	child := &stubModule{id: "child", onRegister: func() { seq = append(seq, "child") }}
	parent := &stubModule{id: "parent", onRegister: func() { seq = append(seq, "parent") }}
	parent.manifestFn = func() ModuleManifest {
		return ModuleManifest{ID: "parent", Dependencies: []string{"child"}}
	}

	if err := adm.RegisterModule(parent); err != nil {
		t.Fatalf("register parent failed: %v", err)
	}
	if err := adm.RegisterModule(child); err != nil {
		t.Fatalf("register child failed: %v", err)
	}

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}

	expected := []string{"child", "parent"}
	if len(seq) != len(expected) {
		t.Fatalf("expected sequence %v, got %v", expected, seq)
	}
	for i := range expected {
		if seq[i] != expected[i] {
			t.Fatalf("expected sequence %v, got %v", expected, seq)
		}
	}
}

func TestModuleMenuItemsRespectPermissions(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	menu := []MenuItem{{Label: "Secret", Permissions: []string{"nav.secret"}, Locale: "en"}}

	mod := &menuModule{id: "nav", menu: menu}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	adm.WithAuthorizer(denyAuthorizer{})

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	for _, item := range items {
		if item.Label == "Secret" {
			t.Fatalf("expected secret navigation to be filtered, got %v", items)
		}
	}
}

func TestModuleMenuItemsAppearInNavigation(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	menu := []MenuItem{{Label: "Users", Icon: "users", Locale: "en"}}
	mod := &menuModule{id: "nav", menu: menu}

	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	adm.WithAuthorizer(allowAuthorizer{})

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	found := false
	for _, item := range items {
		if item.Label == "Users" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected label Users in navigation, got %v", items)
	}
}

func TestModuleDependenciesAndFeatureFlags(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
	}, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"feature.a": true})})
	child := &stubModule{id: "child"}
	parent := &stubModule{id: "parent"}
	parentManifest := ModuleManifest{ID: "parent", Dependencies: []string{"child"}, FeatureFlags: []string{"feature.a"}}
	childManifest := ModuleManifest{ID: "child"}

	parent.onRegister = func() {}
	child.onRegister = func() {}
	parent.manifestFn = func() ModuleManifest { return parentManifest }
	child.manifestFn = func() ModuleManifest { return childManifest }

	if err := adm.RegisterModule(child); err != nil {
		t.Fatalf("register child failed: %v", err)
	}
	if err := adm.RegisterModule(parent); err != nil {
		t.Fatalf("register parent failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}
}

func TestModuleDependencyMissingFails(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	parent := &stubModule{id: "parent"}
	parentManifest := ModuleManifest{ID: "parent", Dependencies: []string{"missing"}}
	parent.manifestFn = func() ModuleManifest { return parentManifest }
	if err := adm.RegisterModule(parent); err != nil {
		t.Fatalf("register parent failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err == nil {
		t.Fatalf("expected missing dependency error")
	}
}

func TestModuleFeatureFlagMissingFails(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	mod := &stubModule{id: "needs.flag"}
	mod.manifestFn = func() ModuleManifest { return ModuleManifest{ID: "needs.flag", FeatureFlags: []string{"flag.missing"}} }
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err == nil {
		t.Fatalf("expected feature flag error")
	} else if !errors.Is(err, ErrFeatureDisabled) {
		t.Fatalf("expected ErrFeatureDisabled, got %v", err)
	}
}

func TestModuleTranslatorInjection(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	tx := &captureTranslator{}
	adm.WithTranslator(tx)

	mod := &translatorModule{id: "tx"}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}
	if mod.translator == nil {
		t.Fatalf("translator not injected")
	}
}

func TestModuleFeatureFlagsHonorTypedFeatures(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureSearch)})
	mod := &stubModule{id: "needs.search"}
	mod.manifestFn = func() ModuleManifest {
		return ModuleManifest{
			ID:           "needs.search",
			FeatureFlags: []string{string(FeatureSearch)},
		}
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("expected module to load, got %v", err)
	}
}

func TestModuleContextUsesProtectedRouterByDefaultAndExposesPublicRouter(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, Dependencies{})
	authn := &moduleAuthCounter{}
	adm.WithAuth(authn, nil)
	mod := &moduleRouteProbe{id: "route.probe"}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize failed: %v", err)
	}

	protectedReq := httptest.NewRequest(http.MethodGet, "/admin/api/module-protected", nil)
	protectedRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(protectedRes, protectedReq)
	if protectedRes.Code != http.StatusOK {
		t.Fatalf("expected protected route status 200, got %d body=%s", protectedRes.Code, protectedRes.Body.String())
	}
	if authn.calls == 0 {
		t.Fatalf("expected auth middleware to run for protected route")
	}
	if !strings.Contains(protectedRes.Body.String(), `"auth":"present"`) {
		t.Fatalf("expected protected route to observe auth context, got %s", strings.TrimSpace(protectedRes.Body.String()))
	}

	callsAfterProtected := authn.calls
	publicReq := httptest.NewRequest(http.MethodGet, "/module/public", nil)
	publicRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusOK {
		t.Fatalf("expected public route status 200, got %d body=%s", publicRes.Code, publicRes.Body.String())
	}
	if authn.calls != callsAfterProtected {
		t.Fatalf("expected public route to bypass auth middleware; calls before=%d after=%d", callsAfterProtected, authn.calls)
	}
	if !strings.Contains(publicRes.Body.String(), `"auth":"missing"`) {
		t.Fatalf("expected public route without auth context, got %s", strings.TrimSpace(publicRes.Body.String()))
	}
}

func TestModuleStartupValidationFailsWhenPolicyIsEnforce(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	mod := &startupValidatorModule{
		id:          "startup.validator.enforce",
		validateErr: errors.New("startup validation failed"),
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err == nil {
		t.Fatal("expected startup validation failure when policy is enforce")
	}
	if mod.validated == 0 {
		t.Fatal("expected startup validator to be executed")
	}
}

func TestModuleStartupValidationWarnPolicyAllowsStartup(t *testing.T) {
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	adm.WithModuleStartupPolicy(ModuleStartupPolicyWarn)
	mod := &startupValidatorModule{
		id:          "startup.validator.warn",
		validateErr: errors.New("startup validation warning"),
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("expected startup to continue under warn policy, got %v", err)
	}
	if mod.validated == 0 {
		t.Fatal("expected startup validator to be executed")
	}
}

func TestLoadModulesRejectsMissingRouteContract(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	if err := adm.RegisterModule(&noContractModule{id: "missing.contract"}); err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err == nil {
		t.Fatal("expected missing route contract failure")
	}
}

func TestLoadModulesFailsFastOnRoutingConflicts(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	alpha := &stubModule{
		id: "alpha",
		contract: routing.ModuleContract{
			Slug: "alpha",
			UIRoutes: map[string]string{
				"alpha.index": "/shared",
			},
			Mount: routing.ModuleMountOverride{
				UIBase: "/admin",
			},
		},
	}
	beta := &stubModule{
		id: "beta",
		contract: routing.ModuleContract{
			Slug: "beta",
			UIRoutes: map[string]string{
				"beta.index": "/shared",
			},
			Mount: routing.ModuleMountOverride{
				UIBase: "/admin",
			},
		},
	}
	if err := adm.RegisterModule(alpha); err != nil {
		t.Fatalf("register alpha failed: %v", err)
	}
	if err := adm.RegisterModule(beta); err != nil {
		t.Fatalf("register beta failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err == nil {
		t.Fatal("expected module routing conflict failure")
	}
}

func TestModuleContextExposesResolvedRoutingSurfaces(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	mod := &routingAwareModule{id: "routing.aware"}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register failed: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize failed: %v", err)
	}

	if mod.routing.Resolved.Slug != "routing_aware" {
		t.Fatalf("expected resolved slug routing_aware, got %q", mod.routing.Resolved.Slug)
	}
	if mod.routing.RoutePath(routing.SurfaceUI, "routing_aware.page") != "/admin/routing_aware" {
		t.Fatalf("expected ui route /admin/routing_aware, got %q", mod.routing.RoutePath(routing.SurfaceUI, "routing_aware.page"))
	}
	if mod.routing.RoutePath(routing.SurfaceAPI, "routing_aware.ping") != "/admin/api/routing_aware/ping" {
		t.Fatalf("expected api route /admin/api/routing_aware/ping, got %q", mod.routing.RoutePath(routing.SurfaceAPI, "routing_aware.ping"))
	}
	if got := resolveURLWith(adm.URLs(), mod.routing.Resolved.UIGroupPath, "routing_aware.page", nil, nil); got != "/admin/routing_aware" {
		t.Fatalf("expected ui route lookup /admin/routing_aware, got %q", got)
	}
	apiPath := resolveURLWith(adm.URLs(), mod.routing.Resolved.APIGroupPath, "routing_aware.ping", nil, nil)
	if apiPath != "/admin/api/routing_aware/ping" {
		t.Fatalf("expected api route lookup /admin/api/routing_aware/ping, got %q", apiPath)
	}

	req := httptest.NewRequest(http.MethodGet, apiPath, nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected api route status 200, got %d body=%s", res.Code, res.Body.String())
	}
}

type stubModule struct {
	id         string
	onRegister func()
	manifestFn func() ModuleManifest
	contract   routing.ModuleContract
}

func (m *stubModule) Manifest() ModuleManifest {
	if m.manifestFn != nil {
		return m.manifestFn()
	}
	return ModuleManifest{ID: m.id}
}

func (m *stubModule) Register(_ ModuleContext) error {
	if m.onRegister != nil {
		m.onRegister()
	}
	return nil
}

func (m *stubModule) RouteContract() routing.ModuleContract {
	if m.contract.Slug != "" || len(m.contract.UIRoutes) > 0 || len(m.contract.APIRoutes) > 0 || len(m.contract.PublicAPIRoutes) > 0 {
		return m.contract
	}
	slug := testModuleSlug(m.id)
	return routing.ModuleContract{
		Slug: slug,
		UIRoutes: map[string]string{
			slug + ".index": "/",
		},
	}
}

type menuModule struct {
	id   string
	menu []MenuItem
}

func (m *menuModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *menuModule) Register(_ ModuleContext) error { return nil }

func (m *menuModule) RouteContract() routing.ModuleContract {
	slug := testModuleSlug(m.id)
	return routing.ModuleContract{
		Slug: slug,
		UIRoutes: map[string]string{
			slug + ".index": "/",
		},
	}
}

func (m *menuModule) MenuItems(locale string) []MenuItem {
	items := []MenuItem{}
	for _, item := range m.menu {
		item.Locale = locale
		items = append(items, item)
	}
	return items
}

type denyAuthorizer struct{}

func (denyAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = resource
	return action != "nav.secret"
}

type allowAuthorizer struct{}

func (allowAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

type captureTranslator struct{}

func (captureTranslator) Translate(locale, key string, args ...any) (string, error) {
	return key + ":" + locale, nil
}

type translatorModule struct {
	id         string
	translator Translator
}

func (m *translatorModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *translatorModule) Register(ctx ModuleContext) error {
	m.translator = ctx.Translator
	return nil
}

func (m *translatorModule) RouteContract() routing.ModuleContract {
	slug := testModuleSlug(m.id)
	return routing.ModuleContract{
		Slug: slug,
		UIRoutes: map[string]string{
			slug + ".index": "/",
		},
	}
}

type moduleAuthCounter struct {
	calls int
}

func (a *moduleAuthCounter) Wrap(c router.Context) error {
	a.calls++
	ctx := auth.WithActorContext(c.Context(), &auth.ActorContext{
		ActorID: "module-auth-user",
		Subject: "module-auth-user",
	})
	c.SetContext(ctx)
	return nil
}

type moduleRouteProbe struct {
	id string
}

func (m *moduleRouteProbe) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *moduleRouteProbe) Register(ctx ModuleContext) error {
	if ctx.Router == nil {
		return errors.New("default router is nil")
	}
	if ctx.ProtectedRouter == nil {
		return errors.New("protected router is nil")
	}
	if ctx.PublicRouter == nil {
		return errors.New("public router is nil")
	}

	ctx.Router.Get("/admin/api/module-protected", func(c router.Context) error {
		_, hasActor := auth.ActorFromContext(c.Context())
		state := "missing"
		if hasActor {
			state = "present"
		}
		return c.JSON(http.StatusOK, map[string]any{"auth": state})
	})
	ctx.PublicRouter.Get("/module/public", func(c router.Context) error {
		_, hasActor := auth.ActorFromContext(c.Context())
		state := "missing"
		if hasActor {
			state = "present"
		}
		return c.JSON(http.StatusOK, map[string]any{"auth": state})
	})
	return nil
}

func (m *moduleRouteProbe) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "route_probe",
		UIRoutes: map[string]string{
			"route_probe.index": "/",
		},
	}
}

type startupValidatorModule struct {
	id          string
	validateErr error
	validated   int
}

func (m *startupValidatorModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *startupValidatorModule) Register(_ ModuleContext) error {
	return nil
}

func (m *startupValidatorModule) ValidateStartup(context.Context) error {
	m.validated++
	return m.validateErr
}

func (m *startupValidatorModule) RouteContract() routing.ModuleContract {
	slug := testModuleSlug(m.id)
	return routing.ModuleContract{
		Slug: slug,
		UIRoutes: map[string]string{
			slug + ".index": "/",
		},
	}
}

func testModuleSlug(id string) string {
	slug := strings.TrimSpace(strings.NewReplacer(".", "_", "-", "_").Replace(id))
	if slug == "" {
		return "test_module"
	}
	return slug
}

type noContractModule struct {
	id string
}

func (m *noContractModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *noContractModule) Register(ModuleContext) error {
	return nil
}

type routingAwareModule struct {
	id      string
	routing routing.ModuleContext
}

func (m *routingAwareModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *routingAwareModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "routing_aware",
		UIRoutes: map[string]string{
			"routing_aware.page": "/",
		},
		APIRoutes: map[string]string{
			"routing_aware.ping": "/ping",
		},
	}
}

func (m *routingAwareModule) Register(ctx ModuleContext) error {
	m.routing = ctx.Routing
	ctx.ProtectedRouter.Get(ctx.Routing.RoutePath(routing.SurfaceAPI, "routing_aware.ping"), func(c router.Context) error {
		return c.JSON(http.StatusOK, map[string]any{"ok": true})
	})
	return nil
}
