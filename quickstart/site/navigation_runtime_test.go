package site

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteNavigationProfilesByLocation(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-home", "home", "/home")

	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []admin.MenuItem{
					{ID: "main.home", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home", "active_match": "exact"}},
					{ID: "main.products", Label: "Products", Position: intPtr(2), Target: map[string]any{"url": "/products", "active_match": "prefix"}},
					{ID: "main.company", Label: "Company", Position: intPtr(3), Target: map[string]any{"url": "/company", "active_match": "prefix"}},
				},
			},
			"site.footer": {
				Code:     "site_primary",
				Location: "site.footer",
				Items: []admin.MenuItem{
					{ID: "footer.home", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home", "active_match": "exact"}},
					{ID: "footer.company", Label: "Company", Position: intPtr(2), Target: map[string]any{"url": "/company", "active_match": "prefix"}},
				},
			},
		},
	}
	adm := adminWithMenuStub(t, menuSvc, nil)

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/home?locale=en&format=json")
	mainMenu := nestedMap(payload, "context", "main_menu")
	footerMenu := nestedMap(payload, "context", "footer_menu")

	if nestedString(payload, "context", "main_menu", "code") != "site_primary" {
		t.Fatalf("expected main menu code site_primary, got %+v", mainMenu)
	}
	if nestedString(payload, "context", "footer_menu", "code") != "site_primary" {
		t.Fatalf("expected footer menu code site_primary, got %+v", footerMenu)
	}

	mainItems := menuItemsFromContext(t, mainMenu["items"])
	footerItems := menuItemsFromContext(t, footerMenu["items"])
	if len(mainItems) != 3 {
		t.Fatalf("expected 3 main menu items, got %d", len(mainItems))
	}
	if len(footerItems) != 2 {
		t.Fatalf("expected 2 footer menu items, got %d", len(footerItems))
	}
	if menuItemLabel(mainItems[1]) != "Products" {
		t.Fatalf("expected second main menu item Products, got %+v", mainItems[1])
	}
	if menuItemLabel(footerItems[1]) != "Company" {
		t.Fatalf("expected second footer menu item Company, got %+v", footerItems[1])
	}
}

func TestSiteNavigationFiltersByPermissionsBeforeProjection(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-home", "home", "/home")

	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []admin.MenuItem{
					{ID: "public", Label: "Public", Position: intPtr(1), Target: map[string]any{"url": "/home"}},
					{ID: "secret", Label: "Secret", Position: intPtr(2), Permissions: []string{"nav.secret"}, Target: map[string]any{"url": "/secret"}},
				},
			},
		},
	}
	adm := adminWithMenuStub(t, menuSvc, siteAuthorizerStub{
		allowed: map[string]bool{
			"nav.secret": false,
		},
	})

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/home?locale=en&format=json")
	mainItems := menuItemsFromContext(t, nestedAny(payload, "context", "main_menu", "items"))
	if len(mainItems) != 1 {
		t.Fatalf("expected permission filter to keep one item, got %d (%+v)", len(mainItems), mainItems)
	}
	if menuItemLabel(mainItems[0]) != "Public" {
		t.Fatalf("expected remaining item Public, got %+v", mainItems[0])
	}
}

func TestSiteNavigationPreviewTokenEnablesDraftMenuReads(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-1", "home", "/home")

	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []admin.MenuItem{
					{ID: "home", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home"}},
				},
			},
		},
	}
	adm := adminWithMenuStub(t, menuSvc, nil)
	token, err := adm.Preview().Generate("menu", "site_primary", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	_ = performSiteRequest(t, server, "/home?locale=en&format=json&preview_token="+token)
	if !menuSvc.lastLocationOpts.IncludeDrafts {
		t.Fatalf("expected preview token to set include_drafts=true, got %+v", menuSvc.lastLocationOpts)
	}
	if menuSvc.lastLocationOpts.PreviewToken != token {
		t.Fatalf("expected preview token to be forwarded to menu read options")
	}
}

func TestSiteNavigationIgnoresNonMenuPreviewTokenForDraftReads(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-1", "home", "/home")

	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []admin.MenuItem{
					{ID: "home", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home"}},
				},
			},
		},
	}
	adm := adminWithMenuStub(t, menuSvc, nil)
	token, err := adm.Preview().Generate("pages", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	_ = performSiteRequest(t, server, "/home?locale=en&format=json&preview_token="+token)
	if menuSvc.lastLocationOpts.IncludeDrafts {
		t.Fatalf("expected non-menu preview token to keep include_drafts=false, got %+v", menuSvc.lastLocationOpts)
	}
	if menuSvc.lastLocationOpts.PreviewToken != "" {
		t.Fatalf("expected non-menu preview token to be omitted from menu options, got %+v", menuSvc.lastLocationOpts)
	}
}

func TestSiteNavigationGeneratedFallbackRequiresExplicitEnablement(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-home", "home", "/home")

	adm := adminWithMenuStub(t, &siteNavigationMenuStub{}, nil)

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/home?locale=en&format=json")
	mainItems := menuItemsFromContext(t, nestedAny(payload, "context", "main_menu", "items"))
	if len(mainItems) != 0 {
		t.Fatalf("expected generated fallback disabled by default, got %+v", mainItems)
	}
}

func TestSiteNavigationGeneratedFallbackHonorsVisibilityToggles(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)

	_, err := content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "page-home",
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path":                            "/home",
			"_navigation":                     map[string]any{"site.main": "show", "site.footer": "hide"},
			"effective_navigation_visibility": map[string]any{"site.main": true, "site.footer": false},
		},
	})
	if err != nil {
		t.Fatalf("create home content: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "page-legal",
		Title:           "Legal",
		Slug:            "legal",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path":                            "/legal",
			"_navigation":                     map[string]any{"site.main": "hide", "site.footer": "show"},
			"effective_navigation_visibility": map[string]any{"site.main": false, "site.footer": true},
		},
	})
	if err != nil {
		t.Fatalf("create legal content: %v", err)
	}

	adm := adminWithMenuStub(t, &siteNavigationMenuStub{}, nil)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
		Navigation: SiteNavigationConfig{
			EnableGeneratedFallback: true,
		},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/home?locale=en&format=json")
	mainItems := menuItemsFromContext(t, nestedAny(payload, "context", "main_menu", "items"))
	footerItems := menuItemsFromContext(t, nestedAny(payload, "context", "footer_menu", "items"))

	if len(mainItems) != 1 || menuItemLabel(mainItems[0]) != "Home" {
		t.Fatalf("expected main menu to include only Home, got %+v", mainItems)
	}
	if len(footerItems) != 1 || menuItemLabel(footerItems[0]) != "Legal" {
		t.Fatalf("expected footer menu to include only Legal, got %+v", footerItems)
	}
}

func TestSiteNavigationDebugIncludesContributionOrigin(t *testing.T) {
	content := admin.NewInMemoryContentService()
	seedDeliveryPageType(t, content)
	seedDeliveryPageRecord(t, content, "page-home", "home", "/home")

	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_primary",
				Location: "site.main",
				Items: []admin.MenuItem{
					{
						ID:       "home",
						Label:    "Home",
						Position: intPtr(1),
						Target: map[string]any{
							"url":                 "/home",
							"contribution":        true,
							"contribution_origin": "override",
							"origin":              "contribution",
						},
					},
				},
			},
		},
	}
	adm := adminWithMenuStub(t, menuSvc, nil)

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	payload := performSiteRequest(t, server, "/home?locale=en&format=json&nav_debug=true")
	if !nestedBool(payload, "context", "navigation_debug") {
		t.Fatalf("expected navigation_debug true in context")
	}
	mainItems := menuItemsFromContext(t, nestedAny(payload, "context", "main_menu", "items"))
	if len(mainItems) != 1 {
		t.Fatalf("expected one main menu item, got %+v", mainItems)
	}
	if got := stringsTrimSpace(anyString(mainItems[0]["contribution_origin"])); got != "override" {
		t.Fatalf("expected contribution origin override, got %q", got)
	}
	debug := nestedMapFromAny(mainItems[0]["debug"])
	if stringsTrimSpace(anyString(debug["contribution_origin"])) != "override" {
		t.Fatalf("expected debug contribution origin, got %+v", debug)
	}
}

func TestMenuItemActiveMatchSemantics(t *testing.T) {
	cases := []struct {
		name     string
		active   string
		href     string
		mode     string
		pattern  string
		expected bool
	}{
		{name: "exact hit", active: "/products", href: "/products", mode: "exact", expected: true},
		{name: "exact miss", active: "/products/123", href: "/products", mode: "exact", expected: false},
		{name: "prefix hit child", active: "/products/123", href: "/products", mode: "prefix", expected: true},
		{name: "prefix miss", active: "/docs/intro", href: "/products", mode: "prefix", expected: false},
		{name: "pattern wildcard", active: "/docs/getting-started", href: "/docs", mode: "pattern", pattern: "/docs/*", expected: true},
		{name: "pattern miss", active: "/blog/post", href: "/docs", mode: "pattern", pattern: "/docs/*", expected: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := menuItemActive(tc.active, tc.href, tc.mode, tc.pattern); got != tc.expected {
				t.Fatalf("expected %v, got %v", tc.expected, got)
			}
		})
	}
}

func TestProjectMenuItemsIsDeterministic(t *testing.T) {
	runtime := &navigationRuntime{}
	items := []admin.MenuItem{
		{
			ID:       "c",
			Label:    "C",
			Position: intPtr(3),
			Target:   map[string]any{"url": "/c"},
		},
		{
			ID:       "a",
			Label:    "A",
			Position: intPtr(1),
			Target:   map[string]any{"url": "/a"},
		},
		{
			ID:       "b",
			Label:    "B",
			Position: intPtr(2),
			Target:   map[string]any{"url": "/b"},
		},
	}

	first := runtime.projectMenuItems(items, "/a", menuDedupByURL, false)
	second := runtime.projectMenuItems(items, "/a", menuDedupByURL, false)
	if len(first) != len(second) || len(first) != 3 {
		t.Fatalf("expected deterministic list length, got first=%d second=%d", len(first), len(second))
	}
	for i := range first {
		if anyString(first[i]["id"]) != anyString(second[i]["id"]) {
			t.Fatalf("expected deterministic ordering, got first=%+v second=%+v", first, second)
		}
	}
	if anyString(first[0]["label"]) != "A" || anyString(first[1]["label"]) != "B" || anyString(first[2]["label"]) != "C" {
		t.Fatalf("expected position-based order A/B/C, got %+v", first)
	}
}

func seedDeliveryPageType(t *testing.T, content *admin.InMemoryContentService) {
	t.Helper()
	_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}
}

func seedDeliveryPageRecord(t *testing.T, content *admin.InMemoryContentService, id, slug, path string) {
	t.Helper()
	_, err := content.CreateContent(context.Background(), admin.CMSContent{
		ID:              id,
		Title:           stringsTrimSpace(slug),
		Slug:            slug,
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path": path,
		},
	})
	if err != nil {
		t.Fatalf("create content record: %v", err)
	}
}

func adminWithMenuStub(t *testing.T, menu admin.CMSMenuService, authorizer admin.Authorizer) *admin.Admin {
	t.Helper()
	adm := mustAdminWithTheme(t, "admin", "light")
	if authorizer != nil {
		adm.WithAuthorizer(authorizer)
	}
	container := &siteNavigationCMSContainer{
		widgets: admin.NewInMemoryWidgetService(),
		menu:    menu,
		content: admin.NewInMemoryContentService(),
		types:   admin.NewInMemoryContentService(),
	}
	adm.UseCMS(container)
	if _, ok := adm.MenuService().(*siteNavigationMenuStub); !ok {
		t.Fatalf("expected admin to use siteNavigationMenuStub, got %T", adm.MenuService())
	}
	return adm
}

type siteNavigationCMSContainer struct {
	widgets admin.CMSWidgetService
	menu    admin.CMSMenuService
	content admin.CMSContentService
	types   admin.CMSContentTypeService
}

func (c *siteNavigationCMSContainer) WidgetService() admin.CMSWidgetService { return c.widgets }
func (c *siteNavigationCMSContainer) MenuService() admin.CMSMenuService     { return c.menu }
func (c *siteNavigationCMSContainer) ContentService() admin.CMSContentService {
	return c.content
}
func (c *siteNavigationCMSContainer) ContentTypeService() admin.CMSContentTypeService {
	return c.types
}

type siteNavigationMenuStub struct {
	byLocation       map[string]*admin.Menu
	byCode           map[string]*admin.Menu
	lastLocationOpts admin.SiteMenuReadOptions
	lastCodeOpts     admin.SiteMenuReadOptions
}

func (s *siteNavigationMenuStub) CreateMenu(_ context.Context, code string) (*admin.Menu, error) {
	menu := &admin.Menu{Code: code, Slug: code, ID: code, Location: code}
	if s.byCode == nil {
		s.byCode = map[string]*admin.Menu{}
	}
	s.byCode[code] = cloneSiteMenu(menu)
	return cloneSiteMenu(menu), nil
}

func (s *siteNavigationMenuStub) AddMenuItem(_ context.Context, menuCode string, item admin.MenuItem) error {
	menu := s.lookupCode(menuCode)
	if menu == nil {
		menu = &admin.Menu{Code: menuCode, Slug: menuCode, ID: menuCode, Location: menuCode}
	}
	menu.Items = append(menu.Items, item)
	if s.byCode == nil {
		s.byCode = map[string]*admin.Menu{}
	}
	s.byCode[menuCode] = cloneSiteMenu(menu)
	return nil
}

func (s *siteNavigationMenuStub) UpdateMenuItem(context.Context, string, admin.MenuItem) error {
	return nil
}
func (s *siteNavigationMenuStub) DeleteMenuItem(context.Context, string, string) error { return nil }
func (s *siteNavigationMenuStub) ReorderMenu(context.Context, string, []string) error  { return nil }

func (s *siteNavigationMenuStub) Menu(_ context.Context, code, _ string) (*admin.Menu, error) {
	if menu := s.lookupCode(code); menu != nil {
		return cloneSiteMenu(menu), nil
	}
	return &admin.Menu{Code: code, Slug: code, ID: code, Location: code, Items: []admin.MenuItem{}}, nil
}

func (s *siteNavigationMenuStub) MenuByLocation(_ context.Context, location, _ string) (*admin.Menu, error) {
	if menu := s.lookupLocation(location); menu != nil {
		return cloneSiteMenu(menu), nil
	}
	return &admin.Menu{Code: location, Slug: location, ID: location, Location: location, Items: []admin.MenuItem{}}, nil
}

func (s *siteNavigationMenuStub) MenuByLocationWithOptions(ctx context.Context, location, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error) {
	s.lastLocationOpts = opts
	return s.MenuByLocation(ctx, location, locale)
}

func (s *siteNavigationMenuStub) MenuByCodeWithOptions(ctx context.Context, code, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error) {
	s.lastCodeOpts = opts
	return s.Menu(ctx, code, locale)
}

func (s *siteNavigationMenuStub) lookupLocation(location string) *admin.Menu {
	if s.byLocation == nil {
		return nil
	}
	return s.byLocation[stringsTrimSpace(location)]
}

func (s *siteNavigationMenuStub) lookupCode(code string) *admin.Menu {
	if s.byCode == nil {
		return nil
	}
	return s.byCode[stringsTrimSpace(code)]
}

func cloneSiteMenu(menu *admin.Menu) *admin.Menu {
	if menu == nil {
		return nil
	}
	copy := *menu
	copy.Items = cloneSiteMenuItems(menu.Items)
	return &copy
}

func cloneSiteMenuItems(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.Target = cloneAnyMap(item.Target)
		clone.Badge = cloneAnyMap(item.Badge)
		clone.Permissions = append([]string{}, item.Permissions...)
		clone.Classes = append([]string{}, item.Classes...)
		clone.Styles = cloneStringMap(item.Styles)
		clone.Children = cloneSiteMenuItems(item.Children)
		out = append(out, clone)
	}
	return out
}

type siteAuthorizerStub struct {
	allowed map[string]bool
}

func (s siteAuthorizerStub) Can(_ context.Context, action string, _ string) bool {
	if len(s.allowed) == 0 {
		return false
	}
	return s.allowed[action]
}

func menuItemsFromContext(t *testing.T, raw any) []map[string]any {
	t.Helper()
	if raw == nil {
		return []map[string]any{}
	}
	items, ok := raw.([]any)
	if ok {
		out := make([]map[string]any, 0, len(items))
		for _, item := range items {
			out = append(out, nestedMapFromAny(item))
		}
		return out
	}
	typed, ok := raw.([]map[string]any)
	if ok {
		return typed
	}
	t.Fatalf("expected []any or []map[string]any, got %T", raw)
	return nil
}

func menuItemLabel(item map[string]any) string {
	return stringsTrimSpace(primitivesFirstNonEmpty(anyString(item["label"]), anyString(item["group_title"]), anyString(item["key"])))
}

func nestedAny(payload map[string]any, keys ...string) any {
	current := any(payload)
	for _, key := range keys {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = object[key]
	}
	return current
}

func nestedMap(payload map[string]any, keys ...string) map[string]any {
	return nestedMapFromAny(nestedAny(payload, keys...))
}

func nestedMapFromAny(raw any) map[string]any {
	if typed, ok := raw.(map[string]any); ok {
		return typed
	}
	return map[string]any{}
}

func stringsTrimSpace(value string) string {
	return strings.TrimSpace(value)
}

func intPtr(value int) *int {
	return &value
}
