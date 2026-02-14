package admin

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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

type stubModule struct {
	id         string
	onRegister func()
	manifestFn func() ModuleManifest
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

type menuModule struct {
	id   string
	menu []MenuItem
}

func (m *menuModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *menuModule) Register(_ ModuleContext) error { return nil }

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
