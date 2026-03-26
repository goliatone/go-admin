package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type siteAPIContentServiceStub struct {
	byLocale map[string][]CMSContent
}

func (s *siteAPIContentServiceStub) Pages(_ context.Context, _ string) ([]CMSPage, error) {
	return []CMSPage{}, nil
}

func (s *siteAPIContentServiceStub) Page(_ context.Context, _, _ string) (*CMSPage, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) CreatePage(context.Context, CMSPage) (*CMSPage, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) UpdatePage(context.Context, CMSPage) (*CMSPage, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) DeletePage(context.Context, string) error {
	return ErrNotFound
}

func (s *siteAPIContentServiceStub) Contents(_ context.Context, locale string) ([]CMSContent, error) {
	if s == nil {
		return []CMSContent{}, nil
	}
	if records, ok := s.byLocale[strings.TrimSpace(locale)]; ok {
		return cloneSiteContents(records), nil
	}
	if records, ok := s.byLocale[""]; ok {
		return cloneSiteContents(records), nil
	}
	return []CMSContent{}, nil
}

func (s *siteAPIContentServiceStub) Content(ctx context.Context, id, locale string) (*CMSContent, error) {
	records, err := s.Contents(ctx, locale)
	if err != nil {
		return nil, err
	}
	for _, record := range records {
		if strings.TrimSpace(record.ID) == strings.TrimSpace(id) {
			copy := record
			return &copy, nil
		}
	}
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) CreateContent(context.Context, CMSContent) (*CMSContent, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) UpdateContent(context.Context, CMSContent) (*CMSContent, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) DeleteContent(context.Context, string) error {
	return ErrNotFound
}

func (s *siteAPIContentServiceStub) BlockDefinitions(context.Context) ([]CMSBlockDefinition, error) {
	return []CMSBlockDefinition{}, nil
}

func (s *siteAPIContentServiceStub) CreateBlockDefinition(context.Context, CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) UpdateBlockDefinition(context.Context, CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) DeleteBlockDefinition(context.Context, string) error {
	return ErrNotFound
}

func (s *siteAPIContentServiceStub) BlockDefinitionVersions(context.Context, string) ([]CMSBlockDefinitionVersion, error) {
	return []CMSBlockDefinitionVersion{}, nil
}

func (s *siteAPIContentServiceStub) BlocksForContent(context.Context, string, string) ([]CMSBlock, error) {
	return []CMSBlock{}, nil
}

func (s *siteAPIContentServiceStub) SaveBlock(context.Context, CMSBlock) (*CMSBlock, error) {
	return nil, ErrNotFound
}

func (s *siteAPIContentServiceStub) DeleteBlock(context.Context, string) error {
	return ErrNotFound
}

func cloneSiteContents(in []CMSContent) []CMSContent {
	out := make([]CMSContent, 0, len(in))
	for _, record := range in {
		clone := record
		clone.AvailableLocales = append([]string{}, record.AvailableLocales...)
		clone.Data = primitives.CloneAnyMap(record.Data)
		clone.Metadata = primitives.CloneAnyMap(record.Metadata)
		out = append(out, clone)
	}
	return out
}

type siteAPIMenuServiceStub struct {
	byLocation       map[string]*Menu
	byCode           map[string]*Menu
	lastLocationOpts SiteMenuReadOptions
	lastCodeOpts     SiteMenuReadOptions
}

func (s *siteAPIMenuServiceStub) CreateMenu(_ context.Context, code string) (*Menu, error) {
	menu := &Menu{Code: code, Slug: code, ID: code}
	if s.byCode == nil {
		s.byCode = map[string]*Menu{}
	}
	s.byCode[code] = cloneMenu(menu)
	return cloneMenu(menu), nil
}

func (s *siteAPIMenuServiceStub) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	menu := s.lookupMenuByCode(menuCode)
	if menu == nil {
		menu = &Menu{Code: menuCode, Slug: menuCode, ID: menuCode}
	}
	menu.Items = append(menu.Items, item)
	s.storeMenu(menu)
	return nil
}

func (s *siteAPIMenuServiceStub) UpdateMenuItem(context.Context, string, MenuItem) error { return nil }
func (s *siteAPIMenuServiceStub) DeleteMenuItem(context.Context, string, string) error   { return nil }
func (s *siteAPIMenuServiceStub) ReorderMenu(context.Context, string, []string) error    { return nil }

func (s *siteAPIMenuServiceStub) Menu(_ context.Context, code, _ string) (*Menu, error) {
	if menu := s.lookupMenuByCode(code); menu != nil {
		return cloneMenu(menu), nil
	}
	return &Menu{Code: code, Slug: code, ID: code}, nil
}

func (s *siteAPIMenuServiceStub) MenuByLocation(_ context.Context, location, _ string) (*Menu, error) {
	if menu := s.lookupMenuByLocation(location); menu != nil {
		return cloneMenu(menu), nil
	}
	return &Menu{Code: location, Slug: location, ID: location, Location: location}, nil
}

func (s *siteAPIMenuServiceStub) MenuByLocationWithOptions(ctx context.Context, location, locale string, opts SiteMenuReadOptions) (*Menu, error) {
	s.lastLocationOpts = opts
	return s.MenuByLocation(ctx, location, locale)
}

func (s *siteAPIMenuServiceStub) MenuByCodeWithOptions(ctx context.Context, code, locale string, opts SiteMenuReadOptions) (*Menu, error) {
	s.lastCodeOpts = opts
	return s.Menu(ctx, code, locale)
}

func (s *siteAPIMenuServiceStub) lookupMenuByLocation(location string) *Menu {
	if s.byLocation == nil {
		return nil
	}
	return s.byLocation[strings.TrimSpace(location)]
}

func (s *siteAPIMenuServiceStub) lookupMenuByCode(code string) *Menu {
	if s.byCode == nil {
		return nil
	}
	return s.byCode[strings.TrimSpace(code)]
}

func (s *siteAPIMenuServiceStub) storeMenu(menu *Menu) {
	if menu == nil {
		return
	}
	if s.byCode == nil {
		s.byCode = map[string]*Menu{}
	}
	s.byCode[strings.TrimSpace(menu.Code)] = cloneMenu(menu)
}

func cloneMenu(menu *Menu) *Menu {
	if menu == nil {
		return nil
	}
	copy := *menu
	copy.Items = cloneMenuItems(menu.Items)
	return &copy
}

func cloneMenuItems(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.Target = primitives.CloneAnyMap(item.Target)
		clone.Children = cloneMenuItems(item.Children)
		out = append(out, clone)
	}
	return out
}

func newSiteTestServer(t *testing.T, cfg Config, deps Dependencies, content CMSContentService, menus CMSMenuService) (*Admin, router.Server[*httprouter.Router]) {
	t.Helper()
	cfg.EnablePublicAPI = true
	adm := mustNewAdmin(t, cfg, deps)
	if content != nil {
		adm.contentSvc = content
	}
	if menus != nil {
		adm.menuSvc = menus
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	return adm, server
}

func TestSitePublicAPIContentRoutesAndQueryModel(t *testing.T) {
	contentSvc := &siteAPIContentServiceStub{byLocale: map[string][]CMSContent{
		"en": {
			{ID: "1", Title: "Alpha", Slug: "alpha", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Status: "published", Data: map[string]any{"category": "news"}},
			{ID: "2", Title: "Beta", Slug: "beta", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Status: "draft", Data: map[string]any{"category": "news"}},
			{ID: "3", Title: "Zeta", Slug: "zeta", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Status: "published", Data: map[string]any{"category": "updates"}},
		},
	}}
	adm, server := newSiteTestServer(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{}, contentSvc, nil)
	publicGroup := publicAPIGroupName(adm.config)

	legacyPath := mustResolveURL(t, adm.URLs(), publicGroup, "content.type", map[string]string{"type": "article"}, map[string]string{"locale": "en"})
	legacyReq := httptest.NewRequest(http.MethodGet, legacyPath, nil)
	legacyRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(legacyRes, legacyReq)
	if legacyRes.Code != http.StatusOK {
		t.Fatalf("legacy list status=%d body=%s", legacyRes.Code, legacyRes.Body.String())
	}
	var legacyRows []map[string]any
	if err := json.Unmarshal(legacyRes.Body.Bytes(), &legacyRows); err != nil {
		t.Fatalf("decode legacy list: %v", err)
	}
	if len(legacyRows) != 2 {
		t.Fatalf("expected legacy list to hide drafts, got %d rows", len(legacyRows))
	}

	sitePath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{
		"locale":    "en",
		"page":      "2",
		"per_page":  "1",
		"sort":      "title",
		"sort_desc": "true",
		"fields":    "id,title",
		"q":         "a",
	})
	siteReq := httptest.NewRequest(http.MethodGet, sitePath, nil)
	siteRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(siteRes, siteReq)
	if siteRes.Code != http.StatusOK {
		t.Fatalf("site list status=%d body=%s", siteRes.Code, siteRes.Body.String())
	}
	payload := decodeJSONMap(t, siteRes)
	rows, ok := payload["data"].([]any)
	if !ok || len(rows) != 1 {
		t.Fatalf("expected paged data with one row, got %+v", payload["data"])
	}
	row := extractMap(rows[0])
	if got := strings.TrimSpace(toString(row["title"])); got != "Alpha" {
		t.Fatalf("expected page 2 row title Alpha, got %q", got)
	}
	if _, exists := row["slug"]; exists {
		t.Fatalf("expected fields projection to remove slug, got %+v", row)
	}
	meta := extractMap(payload["meta"])
	if got := int(toFloat64(meta["total"])); got != 2 {
		t.Fatalf("expected total 2, got %d", got)
	}

	siteDetailPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteContentDetail, map[string]string{"type": "article", "slug": "alpha"}, map[string]string{"locale": "en"})
	siteDetailReq := httptest.NewRequest(http.MethodGet, siteDetailPath, nil)
	siteDetailRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(siteDetailRes, siteDetailReq)
	if siteDetailRes.Code != http.StatusOK {
		t.Fatalf("site detail status=%d body=%s", siteDetailRes.Code, siteDetailRes.Body.String())
	}
	detailPayload := decodeJSONMap(t, siteDetailRes)
	detail := extractMap(detailPayload["data"])
	if got := strings.TrimSpace(toString(detail["slug"])); got != "alpha" {
		t.Fatalf("expected detail slug alpha, got %q", got)
	}

	legacyDetailPath := mustResolveURL(t, adm.URLs(), publicGroup, "content.item", map[string]string{"type": "article", "slug": "alpha"}, map[string]string{"locale": "en"})
	legacyDetailReq := httptest.NewRequest(http.MethodGet, legacyDetailPath, nil)
	legacyDetailRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(legacyDetailRes, legacyDetailReq)
	if legacyDetailRes.Code != http.StatusOK {
		t.Fatalf("legacy detail status=%d body=%s", legacyDetailRes.Code, legacyDetailRes.Body.String())
	}
	legacyDetail := decodeJSONMap(t, legacyDetailRes)
	legacySlug := strings.TrimSpace(toString(legacyDetail["slug"]))
	if legacySlug == "" {
		legacySlug = strings.TrimSpace(toString(legacyDetail["Slug"]))
	}
	if got := legacySlug; got != "alpha" {
		t.Fatalf("expected legacy detail slug alpha, got %q", got)
	}
}

func TestSitePublicAPILocaleFallbackPolicy(t *testing.T) {
	fallbackRows := map[string][]CMSContent{
		"es": {
			{
				ID:                     "welcome-1",
				Title:                  "Welcome",
				Slug:                   "welcome",
				Locale:                 "en",
				RequestedLocale:        "es",
				ResolvedLocale:         "en",
				AvailableLocales:       []string{"en"},
				MissingRequestedLocale: true,
				ContentType:            "article",
				ContentTypeSlug:        "article",
				Status:                 "published",
				Data:                   map[string]any{"path": "/welcome"},
			},
		},
	}

	t.Run("fallback allowed", func(t *testing.T) {
		adm, server := newSiteTestServer(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{}, &siteAPIContentServiceStub{byLocale: fallbackRows}, nil)
		publicGroup := publicAPIGroupName(adm.config)
		path := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteContentDetail, map[string]string{"type": "article", "slug": "welcome"}, map[string]string{"locale": "es"})
		req := httptest.NewRequest(http.MethodGet, path, nil)
		res := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected fallback-allowed request success, got %d body=%s", res.Code, res.Body.String())
		}
		payload := decodeJSONMap(t, res)
		record := extractMap(payload["data"])
		if missing, _ := record["missing_requested_locale"].(bool); !missing {
			t.Fatalf("expected missing_requested_locale=true, got %+v", record)
		}
	})

	t.Run("fallback disabled parity", func(t *testing.T) {
		allow := false
		cfg := Config{BasePath: "/admin", DefaultLocale: "en", Site: SiteConfig{AllowLocaleFallback: &allow}}
		adm, server := newSiteTestServer(t, cfg, Dependencies{}, &siteAPIContentServiceStub{byLocale: fallbackRows}, nil)
		publicGroup := publicAPIGroupName(adm.config)

		for _, route := range []string{SiteRouteContentDetail, "content.item"} {
			path := mustResolveURL(t, adm.URLs(), publicGroup, route, map[string]string{"type": "article", "slug": "welcome"}, map[string]string{"locale": "es"})
			req := httptest.NewRequest(http.MethodGet, path, nil)
			res := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(res, req)
			if res.Code != http.StatusNotFound {
				t.Fatalf("route %s expected 404, got %d body=%s", route, res.Code, res.Body.String())
			}
			payload := decodeJSONMap(t, res)
			errObj := extractMap(payload["error"])
			if got := strings.ToUpper(strings.TrimSpace(toString(errObj["text_code"]))); got != TextCodeTranslationMissing {
				t.Fatalf("route %s expected %s, got %q payload=%+v", route, TextCodeTranslationMissing, got, payload)
			}
			meta := extractMap(errObj["metadata"])
			if got := strings.TrimSpace(toString(meta["requested_locale"])); got != "es" {
				t.Fatalf("route %s expected requested_locale es, got %q", route, got)
			}
		}
	})
}

func TestSitePublicAPIDraftReadAndProtectedEnforcement(t *testing.T) {
	contentSvc := &siteAPIContentServiceStub{byLocale: map[string][]CMSContent{
		"en": {
			{ID: "1", Title: "Published", Slug: "published", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Status: "published"},
			{ID: "2", Title: "Draft", Slug: "draft", Locale: "en", ContentType: "article", ContentTypeSlug: "article", Status: "draft"},
		},
	}}

	adm, server := newSiteTestServer(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{}, contentSvc, nil)
	publicGroup := publicAPIGroupName(adm.config)
	path := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en", "include_drafts": "true"})

	publicReq := httptest.NewRequest(http.MethodGet, path, nil)
	publicRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusForbidden {
		t.Fatalf("expected include_drafts denied for public request, got %d body=%s", publicRes.Code, publicRes.Body.String())
	}

	internalReq := httptest.NewRequest(http.MethodGet, path, nil)
	internalReq.RemoteAddr = "127.0.0.1:12345"
	internalRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(internalRes, internalReq)
	if internalRes.Code != http.StatusForbidden {
		t.Fatalf("expected include_drafts denied for private-network request by default, got %d body=%s", internalRes.Code, internalRes.Body.String())
	}

	trustedCfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Site: SiteConfig{
			TrustPrivateNetworkDraftReads: true,
		},
	}
	admTrusted, trustedServer := newSiteTestServer(t, trustedCfg, Dependencies{}, contentSvc, nil)
	trustedPath := mustResolveURL(t, admTrusted.URLs(), publicAPIGroupName(admTrusted.config), SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en", "include_drafts": "true"})
	trustedReq := httptest.NewRequest(http.MethodGet, trustedPath, nil)
	trustedReq.RemoteAddr = "127.0.0.1:12345"
	trustedRes := httptest.NewRecorder()
	trustedServer.WrappedRouter().ServeHTTP(trustedRes, trustedReq)
	if trustedRes.Code != http.StatusOK {
		t.Fatalf("expected include_drafts allowed for trusted private-network request, got %d body=%s", trustedRes.Code, trustedRes.Body.String())
	}
	trustedPayload := decodeJSONMap(t, trustedRes)
	trustedMeta := extractMap(trustedPayload["meta"])
	if got := int(toFloat64(trustedMeta["total"])); got != 2 {
		t.Fatalf("expected trusted private-network include_drafts total=2, got %d", got)
	}

	internalPayload := decodeJSONMap(t, internalRes)
	internalErr := extractMap(internalPayload["error"])
	if got := strings.ToUpper(strings.TrimSpace(toString(internalErr["text_code"]))); got != TextCodeForbidden {
		t.Fatalf("expected internal denied text_code=%s, got %q", TextCodeForbidden, got)
	}

	protectedCfg := Config{BasePath: "/admin", DefaultLocale: "en", Site: SiteConfig{Protected: true, ReadPermission: "admin.site.read"}}
	admDenied, deniedServer := newSiteTestServer(t, protectedCfg, Dependencies{Authorizer: denyAllAuthz{}}, contentSvc, nil)
	deniedPath := mustResolveURL(t, admDenied.URLs(), publicAPIGroupName(admDenied.config), SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en"})
	deniedReq := httptest.NewRequest(http.MethodGet, deniedPath, nil)
	deniedRes := httptest.NewRecorder()
	deniedServer.WrappedRouter().ServeHTTP(deniedRes, deniedReq)
	if deniedRes.Code != http.StatusForbidden {
		t.Fatalf("expected protected site read denied, got %d body=%s", deniedRes.Code, deniedRes.Body.String())
	}

	admAllowed, allowedServer := newSiteTestServer(t, protectedCfg, Dependencies{Authorizer: allowAuthorizer{}}, contentSvc, nil)
	allowedPath := mustResolveURL(t, admAllowed.URLs(), publicAPIGroupName(admAllowed.config), SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en"})
	missingActorReq := httptest.NewRequest(http.MethodGet, allowedPath, nil)
	missingActorRes := httptest.NewRecorder()
	allowedServer.WrappedRouter().ServeHTTP(missingActorRes, missingActorReq)
	if missingActorRes.Code != http.StatusForbidden {
		t.Fatalf("expected protected site read without actor denied, got %d body=%s", missingActorRes.Code, missingActorRes.Body.String())
	}
	allowedReq := httptest.NewRequest(http.MethodGet, allowedPath, nil)
	allowedReq = allowedReq.WithContext(auth.WithActorContext(allowedReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	allowedRes := httptest.NewRecorder()
	allowedServer.WrappedRouter().ServeHTTP(allowedRes, allowedReq)
	if allowedRes.Code != http.StatusOK {
		t.Fatalf("expected protected site read allowed, got %d body=%s", allowedRes.Code, allowedRes.Body.String())
	}

	draftProtectedCfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Site: SiteConfig{
			Protected:           true,
			ReadPermission:      "admin.site.read",
			DraftReadPermission: "admin.site.read_drafts",
		},
	}
	draftPath := mustResolveURL(t, admAllowed.URLs(), publicAPIGroupName(admAllowed.config), SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en", "include_drafts": "true"})

	actorDeniedAdmin, actorDeniedServer := newSiteTestServer(t, draftProtectedCfg, Dependencies{
		Authorizer: permissionAuthorizer{allowed: map[string]bool{
			"admin.site.read": true,
		}},
	}, contentSvc, nil)
	actorDeniedReq := httptest.NewRequest(http.MethodGet, draftPath, nil)
	actorDeniedReq = actorDeniedReq.WithContext(auth.WithActorContext(actorDeniedReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	actorDeniedRes := httptest.NewRecorder()
	actorDeniedServer.WrappedRouter().ServeHTTP(actorDeniedRes, actorDeniedReq)
	if actorDeniedRes.Code != http.StatusForbidden {
		t.Fatalf("expected authenticated draft read without draft permission denied, got %d body=%s", actorDeniedRes.Code, actorDeniedRes.Body.String())
	}

	actorAllowedPath := mustResolveURL(t, actorDeniedAdmin.URLs(), publicAPIGroupName(actorDeniedAdmin.config), SiteRouteContentList, map[string]string{"type": "article"}, map[string]string{"locale": "en", "include_drafts": "true"})
	_, actorAllowedServer := newSiteTestServer(t, draftProtectedCfg, Dependencies{
		Authorizer: permissionAuthorizer{allowed: map[string]bool{
			"admin.site.read":        true,
			"admin.site.read_drafts": true,
		}},
	}, contentSvc, nil)
	actorAllowedReq := httptest.NewRequest(http.MethodGet, actorAllowedPath, nil)
	actorAllowedReq = actorAllowedReq.WithContext(auth.WithActorContext(actorAllowedReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	actorAllowedRes := httptest.NewRecorder()
	actorAllowedServer.WrappedRouter().ServeHTTP(actorAllowedRes, actorAllowedReq)
	if actorAllowedRes.Code != http.StatusOK {
		t.Fatalf("expected authenticated draft read with draft permission allowed, got %d body=%s", actorAllowedRes.Code, actorAllowedRes.Body.String())
	}
}

func TestSitePublicAPIMenuRoutesAndQueryContracts(t *testing.T) {
	menuSvc := &siteAPIMenuServiceStub{
		byLocation: map[string]*Menu{
			"site.main": {
				ID:       "main",
				Code:     "primary",
				Slug:     "primary",
				Location: "site.main",
				Items: []MenuItem{{
					ID:    "home",
					Label: "Home",
					Type:  MenuItemTypeItem,
					Target: map[string]any{
						"url": "/",
					},
				}},
			},
		},
		byCode: map[string]*Menu{
			"primary": {
				ID:       "main",
				Code:     "primary",
				Slug:     "primary",
				Location: "site.main",
				Items:    []MenuItem{{ID: "home", Label: "Home", Type: MenuItemTypeItem, Target: map[string]any{"url": "/"}}},
			},
		},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", PreviewSecret: "secret"}
	adm, server := newSiteTestServer(t, cfg, Dependencies{}, nil, menuSvc)
	publicGroup := publicAPIGroupName(adm.config)

	defaultPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{"locale": "en"})
	defaultReq := httptest.NewRequest(http.MethodGet, defaultPath, nil)
	defaultRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(defaultRes, defaultReq)
	if defaultRes.Code != http.StatusOK {
		t.Fatalf("default menu read status=%d body=%s", defaultRes.Code, defaultRes.Body.String())
	}
	if !menuSvc.lastLocationOpts.IncludeContributions {
		t.Fatalf("expected include_contributions default true")
	}

	token, err := adm.Preview().Generate("menu@staging", "menu-1", time.Hour)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}
	overridePath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":                "en",
		"include_contributions": "false",
		"preview_token":         token,
		"view_profile":          "footer",
	})
	overrideReq := httptest.NewRequest(http.MethodGet, overridePath, nil)
	overrideRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(overrideRes, overrideReq)
	if overrideRes.Code != http.StatusOK {
		t.Fatalf("override menu read status=%d body=%s", overrideRes.Code, overrideRes.Body.String())
	}
	if menuSvc.lastLocationOpts.IncludeContributions {
		t.Fatalf("expected include_contributions=false override")
	}
	if !menuSvc.lastLocationOpts.IncludeDrafts {
		t.Fatalf("expected preview_token to promote include_drafts=true")
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "footer" {
		t.Fatalf("expected preview token to retain view profile override, got %q", got)
	}
	overridePayload := decodeJSONMap(t, overrideRes)
	overrideMeta := extractMap(overridePayload["meta"])
	overrideQuery := extractMap(overrideMeta["query"])
	if includeDrafts, _ := overrideQuery["include_drafts"].(bool); !includeDrafts {
		t.Fatalf("expected meta.query.include_drafts=true, got %+v", overrideQuery)
	}

	nonMenuToken, err := adm.Preview().Generate("page@staging", "page-1", time.Hour)
	if err != nil {
		t.Fatalf("generate non-menu preview token: %v", err)
	}
	nonMenuPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":         "en",
		"include_drafts": "true",
		"preview_token":  nonMenuToken,
	})
	nonMenuReq := httptest.NewRequest(http.MethodGet, nonMenuPath, nil)
	nonMenuRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(nonMenuRes, nonMenuReq)
	if nonMenuRes.Code != http.StatusForbidden {
		t.Fatalf("expected non-menu preview token to be rejected for menu draft reads, got %d body=%s", nonMenuRes.Code, nonMenuRes.Body.String())
	}

	runtimeEnvPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":       "en",
		"runtime_env":  "staging",
		"view_profile": "footer",
	})
	runtimeEnvReq := httptest.NewRequest(http.MethodGet, runtimeEnvPath, nil)
	runtimeEnvRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(runtimeEnvRes, runtimeEnvReq)
	if runtimeEnvRes.Code != http.StatusOK {
		t.Fatalf("runtime_env menu read status=%d body=%s", runtimeEnvRes.Code, runtimeEnvRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "" {
		t.Fatalf("expected runtime_env query ignored for view profile override, got %q", got)
	}

	siteRuntimeEnvPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":           "en",
		"site_runtime_env": "staging",
		"view_profile":     "footer",
	})
	siteRuntimeEnvReq := httptest.NewRequest(http.MethodGet, siteRuntimeEnvPath, nil)
	siteRuntimeEnvRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(siteRuntimeEnvRes, siteRuntimeEnvReq)
	if siteRuntimeEnvRes.Code != http.StatusOK {
		t.Fatalf("site_runtime_env menu read status=%d body=%s", siteRuntimeEnvRes.Code, siteRuntimeEnvRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "" {
		t.Fatalf("expected site_runtime_env query ignored for view profile override, got %q", got)
	}

	actorDeniedPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":       "en",
		"view_profile": "footer",
	})
	actorDeniedAdmin, actorDeniedServer := newSiteTestServer(t, cfg, Dependencies{
		Authorizer: permissionAuthorizer{allowed: map[string]bool{}},
	}, nil, menuSvc)
	actorDeniedReq := httptest.NewRequest(http.MethodGet, actorDeniedPath, nil)
	actorDeniedReq = actorDeniedReq.WithContext(auth.WithActorContext(actorDeniedReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	actorDeniedRes := httptest.NewRecorder()
	actorDeniedServer.WrappedRouter().ServeHTTP(actorDeniedRes, actorDeniedReq)
	if actorDeniedRes.Code != http.StatusOK {
		t.Fatalf("actor denied menu read status=%d body=%s", actorDeniedRes.Code, actorDeniedRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "" {
		t.Fatalf("expected authenticated actor without override permission to be ignored, got %q", got)
	}

	nilAuthzPath := mustResolveURL(t, actorDeniedAdmin.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":       "en",
		"view_profile": "footer",
	})
	nilAuthzAdmin, nilAuthzServer := newSiteTestServer(t, cfg, Dependencies{}, nil, menuSvc)
	nilAuthzReq := httptest.NewRequest(http.MethodGet, nilAuthzPath, nil)
	nilAuthzReq = nilAuthzReq.WithContext(auth.WithActorContext(nilAuthzReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	nilAuthzRes := httptest.NewRecorder()
	nilAuthzServer.WrappedRouter().ServeHTTP(nilAuthzRes, nilAuthzReq)
	if nilAuthzRes.Code != http.StatusOK {
		t.Fatalf("actor nil-authz menu read status=%d body=%s", nilAuthzRes.Code, nilAuthzRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "" {
		t.Fatalf("expected authenticated actor without authorizer to be ignored, got %q", got)
	}

	actorAllowedPath := mustResolveURL(t, nilAuthzAdmin.URLs(), publicGroup, SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, map[string]string{
		"locale":       "en",
		"view_profile": "footer",
	})
	_, actorAllowedServer := newSiteTestServer(t, cfg, Dependencies{
		Authorizer: permissionAuthorizer{allowed: map[string]bool{
			"admin.site.view_profile_override": true,
		}},
	}, nil, menuSvc)
	actorAllowedReq := httptest.NewRequest(http.MethodGet, actorAllowedPath, nil)
	actorAllowedReq = actorAllowedReq.WithContext(auth.WithActorContext(actorAllowedReq.Context(), &auth.ActorContext{
		ActorID: "user-1",
	}))
	actorAllowedRes := httptest.NewRecorder()
	actorAllowedServer.WrappedRouter().ServeHTTP(actorAllowedRes, actorAllowedReq)
	if actorAllowedRes.Code != http.StatusOK {
		t.Fatalf("actor allowed menu read status=%d body=%s", actorAllowedRes.Code, actorAllowedRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastLocationOpts.ViewProfile); got != "footer" {
		t.Fatalf("expected authenticated actor with override permission to retain view profile, got %q", got)
	}

	codePath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteMenuByCode, map[string]string{"code": "primary"}, map[string]string{"locale": "en"})
	codeReq := httptest.NewRequest(http.MethodGet, codePath, nil)
	codeRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(codeRes, codeReq)
	if codeRes.Code != http.StatusOK {
		t.Fatalf("menu by code status=%d body=%s", codeRes.Code, codeRes.Body.String())
	}
	if got := strings.TrimSpace(menuSvc.lastCodeOpts.Locale); got != "en" {
		t.Fatalf("expected menu-by-code locale en, got %q", got)
	}

	aliasPath := mustResolveURL(t, adm.URLs(), publicGroup, SiteRouteNavigationLegacy, map[string]string{"location": "site.main"}, map[string]string{"locale": "en"})
	aliasReq := httptest.NewRequest(http.MethodGet, aliasPath, nil)
	aliasRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(aliasRes, aliasReq)
	if aliasRes.Code != http.StatusOK {
		t.Fatalf("legacy site/navigation alias status=%d body=%s", aliasRes.Code, aliasRes.Body.String())
	}
}

func toFloat64(raw any) float64 {
	switch typed := raw.(type) {
	case float64:
		return typed
	case int:
		return float64(typed)
	default:
		return 0
	}
}
