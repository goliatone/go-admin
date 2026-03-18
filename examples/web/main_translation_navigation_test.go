package main

import (
	"context"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/quickstart"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

func TestExamplesWebSeedsCanonicalTranslationMenuForCapabilityProfiles(t *testing.T) {
	tests := []struct {
		name            string
		profile         quickstart.TranslationProfile
		translationCfg  appcfg.TranslationConfig
		expectDashboard bool
		expectQueue     bool
		expectExchange  bool
	}{
		{
			name:    "full profile",
			profile: quickstart.TranslationProfileFull,
			translationCfg: appcfg.TranslationConfig{
				Profile:  "full",
				Exchange: new(true),
				Queue:    new(true),
			},
			expectDashboard: true,
			expectQueue:     true,
			expectExchange:  true,
		},
		{
			name:            "core profile",
			profile:         quickstart.TranslationProfileCore,
			translationCfg:  appcfg.TranslationConfig{Profile: "core"},
			expectDashboard: false,
			expectQueue:     false,
			expectExchange:  false,
		},
		{
			name:            "none profile",
			profile:         quickstart.TranslationProfileNone,
			translationCfg:  appcfg.TranslationConfig{Profile: "none"},
			expectDashboard: false,
			expectQueue:     false,
			expectExchange:  false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			adm, cfg := newExampleTranslationAdmin(t, tc.profile, tc.translationCfg)

			if err := quickstart.NewModuleRegistrar(
				adm,
				cfg,
				nil,
				false,
				quickstart.WithTranslationCapabilityMenuMode(quickstart.TranslationCapabilityMenuModeTools),
			); err != nil {
				t.Fatalf("NewModuleRegistrar: %v", err)
			}

			menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
			if err != nil {
				t.Fatalf("menu lookup: %v", err)
			}
			if menu == nil {
				t.Fatal("expected seeded navigation menu")
			}

			assertMenuRoutePresence(t, menu.Items, "admin.translations.dashboard", tc.expectDashboard)
			assertMenuRoutePresence(t, menu.Items, "admin.translations.queue", tc.expectQueue)
			assertMenuRoutePresence(t, menu.Items, "admin.translations.exchange", tc.expectExchange)

			if item := findMenuItemByRouteName(menu.Items, "admin.translations.queue"); item != nil {
				path, _ := item.Target["path"].(string)
				if !strings.Contains(strings.TrimSpace(path), "/content/translations") {
					t.Fatalf("expected queue menu item path to include /content/translations, got %q", path)
				}
			}
			if item := findMenuItemByRouteName(menu.Items, "admin.translations.dashboard"); item != nil {
				path, _ := item.Target["path"].(string)
				if !strings.Contains(strings.TrimSpace(path), "/translations/dashboard") {
					t.Fatalf("expected dashboard menu item path to include /translations/dashboard, got %q", path)
				}
			}
			if item := findMenuItemByRouteName(menu.Items, "admin.translations.exchange"); item != nil {
				path, _ := item.Target["path"].(string)
				if !strings.Contains(strings.TrimSpace(path), "/translations/exchange") {
					t.Fatalf("expected exchange menu item path to include /translations/exchange, got %q", path)
				}
			}

			if item := findMenuItemByIDPrefix(menu.Items, "example.translation.qa."); item != nil {
				t.Fatalf("expected QA shortcut menu items removed, found %+v", *item)
			}
		})
	}
}

func TestExamplesWebRegistersProductionTranslationRoutesWithoutQAShortcuts(t *testing.T) {
	tests := []struct {
		name            string
		profile         quickstart.TranslationProfile
		translationCfg  appcfg.TranslationConfig
		expectCore      bool
		expectDashboard bool
		expectQueue     bool
		expectEditor    bool
		expectExchange  bool
	}{
		{
			name:    "full profile",
			profile: quickstart.TranslationProfileFull,
			translationCfg: appcfg.TranslationConfig{
				Profile:  "full",
				Exchange: new(true),
				Queue:    new(true),
			},
			expectCore:      true,
			expectDashboard: true,
			expectQueue:     true,
			expectEditor:    true,
			expectExchange:  true,
		},
		{
			name:            "core profile",
			profile:         quickstart.TranslationProfileCore,
			translationCfg:  appcfg.TranslationConfig{Profile: "core"},
			expectCore:      true,
			expectDashboard: false,
			expectQueue:     false,
			expectEditor:    false,
			expectExchange:  false,
		},
		{
			name:            "none profile",
			profile:         quickstart.TranslationProfileNone,
			translationCfg:  appcfg.TranslationConfig{Profile: "none"},
			expectCore:      false,
			expectDashboard: false,
			expectQueue:     false,
			expectEditor:    false,
			expectExchange:  false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			adm, cfg := newExampleTranslationAdmin(t, tc.profile, tc.translationCfg)

			capture := newTranslationRoutesCaptureRouter()
			uiOpts := []quickstart.UIRouteOption{
				quickstart.WithUIDashboardRoute(false),
			}
			if featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationQueue)) {
				uiOpts = append(uiOpts, quickstart.WithUITranslationDashboardRoute(true))
			}
			if featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationExchange)) {
				uiOpts = append(uiOpts, quickstart.WithUITranslationExchangeRoute(true))
			}

			if err := quickstart.RegisterAdminUIRoutes(capture, cfg, adm, nil, uiOpts...); err != nil {
				t.Fatalf("RegisterAdminUIRoutes: %v", err)
			}

			assertRoutePresence(t, capture.getHandlers, "/admin/translations/families/:family_id", tc.expectCore)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/matrix", tc.expectCore)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/dashboard", tc.expectDashboard)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/queue", tc.expectQueue)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/assignments/:assignment_id/edit", tc.expectEditor)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/exchange", tc.expectExchange)

			assertRoutePresence(t, capture.getHandlers, "/admin/translations/qa/family", false)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/qa/content-summary", false)
			assertRoutePresence(t, capture.getHandlers, "/admin/translations/qa/fallback-edit", false)
		})
	}
}

func newExampleTranslationAdmin(
	t *testing.T,
	profile quickstart.TranslationProfile,
	translationCfg appcfg.TranslationConfig,
) (*coreadmin.Admin, coreadmin.Config) {
	t.Helper()
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationProductConfig(buildTranslationProductConfig(
			profile,
			noopExchangeStore{},
			coreadmin.NewInMemoryTranslationAssignmentRepository(),
			translationCfg,
		)),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	return adm, cfg
}

type translationRoutesCaptureRouter struct {
	getHandlers map[string]router.HandlerFunc
}

func newTranslationRoutesCaptureRouter() *translationRoutesCaptureRouter {
	return &translationRoutesCaptureRouter{
		getHandlers: map[string]router.HandlerFunc{},
	}
}

func (r *translationRoutesCaptureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *translationRoutesCaptureRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *translationRoutesCaptureRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *translationRoutesCaptureRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	_ = path
	if cb != nil {
		cb(r)
	}
	return r
}

func (r *translationRoutesCaptureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *translationRoutesCaptureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = mw
	r.getHandlers[path] = handler
	return nil
}

func (r *translationRoutesCaptureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *translationRoutesCaptureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *translationRoutesCaptureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *translationRoutesCaptureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *translationRoutesCaptureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *translationRoutesCaptureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _, _ = prefix, root, config
	return r
}

func (r *translationRoutesCaptureRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *translationRoutesCaptureRouter) Routes() []router.RouteDefinition { return nil }
func (r *translationRoutesCaptureRouter) ValidateRoutes() []error          { return nil }
func (r *translationRoutesCaptureRouter) PrintRoutes()                     {}

func (r *translationRoutesCaptureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func assertRoutePresence(t *testing.T, handlers map[string]router.HandlerFunc, path string, want bool) {
	t.Helper()
	_, ok := handlers[path]
	if ok != want {
		t.Fatalf("expected route %s present=%t, got %t", path, want, ok)
	}
}

func assertMenuRoutePresence(t *testing.T, items []coreadmin.MenuItem, routeName string, want bool) {
	t.Helper()
	item := findMenuItemByRouteName(items, routeName)
	if (item != nil) != want {
		t.Fatalf("expected menu route %s present=%t, got %t", routeName, want, item != nil)
	}
}

func findMenuItemByRouteName(items []coreadmin.MenuItem, routeName string) *coreadmin.MenuItem {
	target := strings.TrimSpace(routeName)
	if target == "" {
		return nil
	}
	for idx := range items {
		item := &items[idx]
		if item.Target != nil {
			name, _ := item.Target["name"].(string)
			if strings.EqualFold(strings.TrimSpace(name), target) {
				return item
			}
		}
		if child := findMenuItemByRouteName(item.Children, target); child != nil {
			return child
		}
	}
	return nil
}

func findMenuItemByIDPrefix(items []coreadmin.MenuItem, prefix string) *coreadmin.MenuItem {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return nil
	}
	for idx := range items {
		item := &items[idx]
		if strings.HasPrefix(strings.TrimSpace(item.ID), prefix) {
			return item
		}
		if child := findMenuItemByIDPrefix(item.Children, prefix); child != nil {
			return child
		}
	}
	return nil
}
