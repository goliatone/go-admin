package quickstart

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type uiRoutesCaptureRouter struct {
	getHandlers map[string]router.HandlerFunc
	getPaths    []string
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

	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil); err != nil {
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
	ctx.AssertExpectations(t)
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
