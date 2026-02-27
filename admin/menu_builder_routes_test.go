package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type menuBuilderPermissionAuthorizer struct {
	allowed map[string]bool
}

func (a menuBuilderPermissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[action]
}

func newMenuBuilderTestServer(t *testing.T, cfg Config, deps Dependencies, menus CMSMenuService) (*Admin, router.Server[*httprouter.Router]) {
	t.Helper()
	if strings.TrimSpace(cfg.BasePath) == "" {
		cfg.BasePath = "/admin"
	}
	if strings.TrimSpace(cfg.DefaultLocale) == "" {
		cfg.DefaultLocale = "en"
	}
	if strings.TrimSpace(cfg.PreviewSecret) == "" {
		cfg.PreviewSecret = "menu-builder-test-secret"
	}
	adm := mustNewAdmin(t, cfg, deps)
	if menus != nil {
		adm.menuSvc = menus
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	return adm, server
}

func menuBuilderDoRequest(server router.Server[*httprouter.Router], method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if strings.TrimSpace(body) != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	return res
}

func TestMenuBuilderRoutesEnforcePermissionsAndValidation(t *testing.T) {
	deniedCfg := Config{BasePath: "/admin", DefaultLocale: "en", PreviewSecret: "menu-builder-secret"}
	deniedDeps := Dependencies{
		Authorizer: menuBuilderPermissionAuthorizer{allowed: map[string]bool{}},
	}
	deniedMenus := &siteAPIMenuServiceStub{}
	deniedAdmin, deniedServer := newMenuBuilderTestServer(t, deniedCfg, deniedDeps, deniedMenus)
	deniedGroup := adminAPIGroupName(deniedAdmin.config)

	contractsPath := mustResolveURL(t, deniedAdmin.URLs(), deniedGroup, "menus.contracts", nil, nil)
	contractsRes := menuBuilderDoRequest(deniedServer, http.MethodGet, contractsPath, "")
	if contractsRes.Code != http.StatusForbidden {
		t.Fatalf("expected contracts route to deny permission, got %d body=%s", contractsRes.Code, contractsRes.Body.String())
	}
	contractsErr := extractMap(decodeJSONMap(t, contractsRes)["error"])
	if got := strings.ToUpper(strings.TrimSpace(toString(contractsErr["text_code"]))); got != TextCodeForbidden {
		t.Fatalf("expected forbidden text_code, got %q", got)
	}

	createPath := mustResolveURL(t, deniedAdmin.URLs(), deniedGroup, "menus", nil, nil)
	createRes := menuBuilderDoRequest(deniedServer, http.MethodPost, createPath, `{"code":"denied"}`)
	if createRes.Code != http.StatusForbidden {
		t.Fatalf("expected create route to deny permission, got %d body=%s", createRes.Code, createRes.Body.String())
	}

	publishPath := mustResolveURL(t, deniedAdmin.URLs(), deniedGroup, "menus.publish", map[string]string{"id": "denied"}, nil)
	publishRes := menuBuilderDoRequest(deniedServer, http.MethodPost, publishPath, `{}`)
	if publishRes.Code != http.StatusForbidden {
		t.Fatalf("expected publish route to deny permission, got %d body=%s", publishRes.Code, publishRes.Body.String())
	}

	allowedCfg := Config{BasePath: "/admin", DefaultLocale: "en", PreviewSecret: "menu-builder-secret"}
	allowedMenus := &siteAPIMenuServiceStub{
		byLocation: map[string]*Menu{},
		byCode:     map[string]*Menu{},
	}
	allowedDeps := Dependencies{
		Authorizer: menuBuilderPermissionAuthorizer{
			allowed: map[string]bool{
				"admin.menus.view":    true,
				"admin.menus.edit":    true,
				"admin.menus.publish": false,
			},
		},
	}
	allowedAdmin, allowedServer := newMenuBuilderTestServer(t, allowedCfg, allowedDeps, allowedMenus)
	allowedGroup := adminAPIGroupName(allowedAdmin.config)

	allowedCreatePath := mustResolveURL(t, allowedAdmin.URLs(), allowedGroup, "menus", nil, nil)
	missingCodeRes := menuBuilderDoRequest(allowedServer, http.MethodPost, allowedCreatePath, `{}`)
	if missingCodeRes.Code != http.StatusBadRequest {
		t.Fatalf("expected create validation failure, got %d body=%s", missingCodeRes.Code, missingCodeRes.Body.String())
	}
	missingCodeErr := extractMap(decodeJSONMap(t, missingCodeRes)["error"])
	if got := strings.ToUpper(strings.TrimSpace(toString(missingCodeErr["text_code"]))); got != TextCodeValidationError {
		t.Fatalf("expected validation text_code, got %q", got)
	}
	meta := extractMap(missingCodeErr["metadata"])
	if got := strings.TrimSpace(toString(meta["field"])); got != "code" {
		t.Fatalf("expected metadata.field=code, got %q", got)
	}

	validCreateRes := menuBuilderDoRequest(allowedServer, http.MethodPost, allowedCreatePath, `{"code":"main","name":"Main Menu"}`)
	if validCreateRes.Code != http.StatusOK {
		t.Fatalf("expected menu create success, got %d body=%s", validCreateRes.Code, validCreateRes.Body.String())
	}

	publishDeniedPath := mustResolveURL(t, allowedAdmin.URLs(), allowedGroup, "menus.publish", map[string]string{"id": "main"}, nil)
	publishDeniedRes := menuBuilderDoRequest(allowedServer, http.MethodPost, publishDeniedPath, `{}`)
	if publishDeniedRes.Code != http.StatusForbidden {
		t.Fatalf("expected publish permission failure, got %d body=%s", publishDeniedRes.Code, publishDeniedRes.Body.String())
	}

	contractsAllowedPath := mustResolveURL(t, allowedAdmin.URLs(), allowedGroup, "menus.contracts", nil, nil)
	contractsAllowedRes := menuBuilderDoRequest(allowedServer, http.MethodGet, contractsAllowedPath, "")
	if contractsAllowedRes.Code != http.StatusOK {
		t.Fatalf("expected contracts success, got %d body=%s", contractsAllowedRes.Code, contractsAllowedRes.Body.String())
	}
	contractsPayload := decodeJSONMap(t, contractsAllowedRes)
	contracts := extractMap(contractsPayload["contracts"])
	errorCodes := extractMap(contracts["error_codes"])
	if got := strings.TrimSpace(toString(errorCodes["cycle"])); got != TextCodeMenuValidationCycle {
		t.Fatalf("expected cycle error code mapping, got %q", got)
	}
	if got := strings.TrimSpace(toString(errorCodes["depth"])); got != TextCodeMenuValidationDepth {
		t.Fatalf("expected depth error code mapping, got %q", got)
	}
	if got := strings.TrimSpace(toString(errorCodes["invalid_target"])); got != TextCodeMenuValidationInvalidTarget {
		t.Fatalf("expected invalid_target error code mapping, got %q", got)
	}
	endpoints := extractMap(contracts["endpoints"])
	for _, key := range []string{"menus", "menus.items", "menus.preview", "menu.bindings", "menu.view_profiles"} {
		if got := strings.TrimSpace(toString(endpoints[key])); got == "" {
			t.Fatalf("expected non-empty endpoint for %s", key)
		}
	}
	contentNavigation := extractMap(contracts["content_navigation"])
	defaultsEditor := extractMap(contentNavigation["content_type_navigation_defaults"])
	if got := strings.TrimSpace(toString(defaultsEditor["field"])); got != "capabilities.navigation" {
		t.Fatalf("expected defaults editor field capabilities.navigation, got %q", got)
	}
	overrideContract := extractMap(contentNavigation["entry_navigation_overrides"])
	if got := strings.TrimSpace(toString(overrideContract["field"])); got != "_navigation" {
		t.Fatalf("expected entry override field _navigation, got %q", got)
	}
	valueEnum := toStringSlice(overrideContract["value_enum"])
	if len(valueEnum) != 3 || valueEnum[0] != NavigationOverrideInherit || valueEnum[1] != NavigationOverrideShow || valueEnum[2] != NavigationOverrideHide {
		t.Fatalf("expected tri-state enum inherit|show|hide, got %+v", valueEnum)
	}
	examples := extractMap(contentNavigation["examples"])
	if len(extractMap(examples["show_hide"])) == 0 {
		t.Fatalf("expected show_hide example payload in content_navigation contracts")
	}
	validation := extractMap(contentNavigation["validation"])
	if len(extractMap(validation["invalid_location"])) == 0 {
		t.Fatalf("expected invalid_location validation guidance in content_navigation contracts")
	}
	contentEndpoints := extractMap(contentNavigation["endpoints"])
	if got := strings.TrimSpace(toString(contentEndpoints["content.navigation"])); got == "" {
		t.Fatalf("expected content.navigation endpoint contract")
	}

	upsertPath := mustResolveURL(t, allowedAdmin.URLs(), allowedGroup, "menus.items", map[string]string{"id": "main"}, nil)
	invalidTargetRes := menuBuilderDoRequest(allowedServer, http.MethodPut, upsertPath, `{"items":[{"id":"home","label":"Home","type":"item","target":{"type":"external","url":"not-a-url"}}]}`)
	if invalidTargetRes.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid target validation failure, got %d body=%s", invalidTargetRes.Code, invalidTargetRes.Body.String())
	}
	invalidTargetErr := extractMap(decodeJSONMap(t, invalidTargetRes)["error"])
	if got := strings.TrimSpace(toString(invalidTargetErr["text_code"])); got != TextCodeMenuValidationInvalidTarget {
		t.Fatalf("expected invalid target text_code %s, got %q", TextCodeMenuValidationInvalidTarget, got)
	}

	depthBody, err := json.Marshal(map[string]any{"items": menuBuilderDeepItems(9)})
	if err != nil {
		t.Fatalf("marshal depth payload: %v", err)
	}
	depthRes := menuBuilderDoRequest(allowedServer, http.MethodPut, upsertPath, string(depthBody))
	if depthRes.Code != http.StatusBadRequest {
		t.Fatalf("expected depth validation failure, got %d body=%s", depthRes.Code, depthRes.Body.String())
	}
	depthErr := extractMap(decodeJSONMap(t, depthRes)["error"])
	if got := strings.TrimSpace(toString(depthErr["text_code"])); got != TextCodeMenuValidationDepth {
		t.Fatalf("expected depth text_code %s, got %q", TextCodeMenuValidationDepth, got)
	}
}

func TestMenuBuilderLifecyclePreviewCloneArchiveAndAudit(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", PreviewSecret: "menu-builder-secret"}
	menuSvc := &siteAPIMenuServiceStub{
		byLocation: map[string]*Menu{},
		byCode:     map[string]*Menu{},
	}
	deps := Dependencies{
		Authorizer: menuBuilderPermissionAuthorizer{
			allowed: map[string]bool{
				"admin.menus.view":    true,
				"admin.menus.edit":    true,
				"admin.menus.publish": true,
			},
		},
	}
	adm, server := newMenuBuilderTestServer(t, cfg, deps, menuSvc)
	group := adminAPIGroupName(adm.config)

	createPath := mustResolveURL(t, adm.URLs(), group, "menus", nil, nil)
	createRes := menuBuilderDoRequest(server, http.MethodPost, createPath, `{"code":"main","name":"Main Menu","locale":"en"}`)
	if createRes.Code != http.StatusOK {
		t.Fatalf("create menu status=%d body=%s", createRes.Code, createRes.Body.String())
	}

	upsertPath := mustResolveURL(t, adm.URLs(), group, "menus.items", map[string]string{"id": "main"}, nil)
	itemsPayload := `{"items":[{"id":"home","label":"Home","type":"item","target":{"type":"route","path":"/"}},{"id":"docs","label":"Docs","type":"item","target":{"type":"route","path":"/docs"}}]}`
	upsertRes := menuBuilderDoRequest(server, http.MethodPut, upsertPath, itemsPayload)
	if upsertRes.Code != http.StatusOK {
		t.Fatalf("upsert menu items status=%d body=%s", upsertRes.Code, upsertRes.Body.String())
	}

	menuSvc.byLocation["site.footer"] = menuSvc.lookupMenuByCode("main")

	publishPath := mustResolveURL(t, adm.URLs(), group, "menus.publish", map[string]string{"id": "main"}, nil)
	publishRes := menuBuilderDoRequest(server, http.MethodPost, publishPath, `{}`)
	if publishRes.Code != http.StatusOK {
		t.Fatalf("publish menu status=%d body=%s", publishRes.Code, publishRes.Body.String())
	}

	profilesPath := mustResolveURL(t, adm.URLs(), group, "menu.view_profiles", nil, nil)
	createProfileRes := menuBuilderDoRequest(server, http.MethodPost, profilesPath, `{"code":"footer","name":"Footer","mode":"top_level_limit","max_top_level":1,"status":"draft"}`)
	if createProfileRes.Code != http.StatusOK {
		t.Fatalf("create view profile status=%d body=%s", createProfileRes.Code, createProfileRes.Body.String())
	}
	createProfilePayload := decodeJSONMap(t, createProfileRes)
	createdViewProfile := extractMap(createProfilePayload["view_profile"])
	if got := strings.TrimSpace(toString(createdViewProfile["code"])); got != "footer" {
		t.Fatalf("expected view_profile.code=footer, got %q", got)
	}
	createdProfileAlias := extractMap(createProfilePayload["profile"])
	if got := strings.TrimSpace(toString(createdProfileAlias["code"])); got != "footer" {
		t.Fatalf("expected profile alias code=footer, got %q", got)
	}

	listProfilesRes := menuBuilderDoRequest(server, http.MethodGet, profilesPath, "")
	if listProfilesRes.Code != http.StatusOK {
		t.Fatalf("list view profiles status=%d body=%s", listProfilesRes.Code, listProfilesRes.Body.String())
	}
	listProfilesPayload := decodeJSONMap(t, listProfilesRes)
	viewProfiles, _ := listProfilesPayload["view_profiles"].([]any)
	profilesAlias, _ := listProfilesPayload["profiles"].([]any)
	if len(viewProfiles) == 0 {
		t.Fatalf("expected view_profiles array in list response, payload=%+v", listProfilesPayload)
	}
	if len(profilesAlias) == 0 {
		t.Fatalf("expected profiles alias array in list response, payload=%+v", listProfilesPayload)
	}

	publishProfilePath := mustResolveURL(t, adm.URLs(), group, "menu.view_profiles.publish", map[string]string{"code": "footer"}, nil)
	publishProfileRes := menuBuilderDoRequest(server, http.MethodPost, publishProfilePath, `{"publish":true}`)
	if publishProfileRes.Code != http.StatusOK {
		t.Fatalf("publish view profile status=%d body=%s", publishProfileRes.Code, publishProfileRes.Body.String())
	}
	publishedProfilePayload := decodeJSONMap(t, publishProfileRes)
	publishedViewProfile := extractMap(publishedProfilePayload["view_profile"])
	if got := strings.TrimSpace(toString(publishedViewProfile["code"])); got != "footer" {
		t.Fatalf("expected published view_profile.code=footer, got %q", got)
	}
	publishedProfileAlias := extractMap(publishedProfilePayload["profile"])
	if got := strings.TrimSpace(toString(publishedProfileAlias["code"])); got != "footer" {
		t.Fatalf("expected published profile alias code=footer, got %q", got)
	}

	bindingPath := mustResolveURL(t, adm.URLs(), group, "menu.bindings.location", map[string]string{"location": "site.footer"}, nil)
	bindingRes := menuBuilderDoRequest(server, http.MethodPut, bindingPath, `{"menu_code":"main","view_profile_code":"footer","status":"published","priority":10}`)
	if bindingRes.Code != http.StatusOK {
		t.Fatalf("upsert binding status=%d body=%s", bindingRes.Code, bindingRes.Body.String())
	}

	previewPath := mustResolveURL(t, adm.URLs(), group, "menus.preview", map[string]string{"id": "main"}, map[string]string{
		"location": "site.footer",
		"locale":   "en",
	})
	previewRes := menuBuilderDoRequest(server, http.MethodGet, previewPath, "")
	if previewRes.Code != http.StatusOK {
		t.Fatalf("preview status=%d body=%s", previewRes.Code, previewRes.Body.String())
	}
	previewPayload := decodeJSONMap(t, previewRes)
	simulation := extractMap(previewPayload["simulation"])
	if got := strings.TrimSpace(toString(simulation["location"])); got != "site.footer" {
		t.Fatalf("expected simulation.location site.footer, got %q", got)
	}
	if got := strings.TrimSpace(toString(simulation["view_profile"])); got != "footer" {
		t.Fatalf("expected simulation.view_profile footer, got %q", got)
	}
	if includeDrafts, _ := simulation["include_drafts"].(bool); includeDrafts {
		t.Fatalf("expected include_drafts=false without preview token")
	}
	if present, _ := simulation["preview_token_present"].(bool); present {
		t.Fatalf("expected preview_token_present=false without token")
	}
	binding := extractMap(simulation["binding"])
	if got := strings.TrimSpace(toString(binding["menu_code"])); got != "main" {
		t.Fatalf("expected simulation.binding.menu_code=main, got %q", got)
	}
	profile := extractMap(simulation["profile"])
	if got := strings.TrimSpace(toString(profile["code"])); got != "footer" {
		t.Fatalf("expected simulation.profile.code=footer, got %q", got)
	}
	previewMenu := extractMap(previewPayload["menu"])
	previewItems, _ := previewMenu["items"].([]any)
	if len(previewItems) == 0 {
		previewItems, _ = previewMenu["Items"].([]any)
	}
	if len(previewItems) != 1 {
		t.Fatalf("expected view profile top_level_limit projection to return 1 item, got %d body=%s", len(previewItems), previewRes.Body.String())
	}

	token, err := adm.Preview().Generate("menu@staging", "main", time.Hour)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}
	previewWithTokenPath := mustResolveURL(t, adm.URLs(), group, "menus.preview", map[string]string{"id": "main"}, map[string]string{
		"location":       "site.footer",
		"locale":         "en",
		"include_drafts": "false",
		"preview_token":  token,
	})
	previewWithTokenRes := menuBuilderDoRequest(server, http.MethodGet, previewWithTokenPath, "")
	if previewWithTokenRes.Code != http.StatusOK {
		t.Fatalf("preview with token status=%d body=%s", previewWithTokenRes.Code, previewWithTokenRes.Body.String())
	}
	previewWithTokenPayload := decodeJSONMap(t, previewWithTokenRes)
	tokenSimulation := extractMap(previewWithTokenPayload["simulation"])
	if includeDrafts, _ := tokenSimulation["include_drafts"].(bool); !includeDrafts {
		t.Fatalf("expected include_drafts=true when preview token is present")
	}
	if present, _ := tokenSimulation["preview_token_present"].(bool); !present {
		t.Fatalf("expected preview_token_present=true when preview token is present")
	}

	clonePath := mustResolveURL(t, adm.URLs(), group, "menus.clone", map[string]string{"id": "main"}, nil)
	cloneRes := menuBuilderDoRequest(server, http.MethodPost, clonePath, `{"code":"main_clone"}`)
	if cloneRes.Code != http.StatusOK {
		t.Fatalf("clone status=%d body=%s", cloneRes.Code, cloneRes.Body.String())
	}
	clonePayload := decodeJSONMap(t, cloneRes)
	clonedMenu := extractMap(clonePayload["menu"])
	if got := strings.TrimSpace(toString(clonedMenu["code"])); got != "main_clone" {
		t.Fatalf("expected cloned menu code main_clone, got %q", got)
	}

	archivePath := mustResolveURL(t, adm.URLs(), group, "menus.archive", map[string]string{"id": "main"}, nil)
	archiveRes := menuBuilderDoRequest(server, http.MethodPost, archivePath, `{"archived":true}`)
	if archiveRes.Code != http.StatusOK {
		t.Fatalf("archive status=%d body=%s", archiveRes.Code, archiveRes.Body.String())
	}
	archivePayload := decodeJSONMap(t, archiveRes)
	archivedMenu := extractMap(archivePayload["menu"])
	if archived, _ := archivedMenu["archived"].(bool); !archived {
		t.Fatalf("expected archived=true in archive response, got %+v", archivedMenu["archived"])
	}

	entries, err := adm.ActivityFeed().List(context.Background(), 100)
	if err != nil {
		t.Fatalf("list activity entries: %v", err)
	}
	actions := map[string]bool{}
	for _, entry := range entries {
		actions[strings.TrimSpace(entry.Action)] = true
	}
	requiredActions := []string{
		"menu.create",
		"menu.items.upsert",
		"menu.publish",
		"menu.view_profile.create",
		"menu.view_profile.publish",
		"menu.binding.upsert",
		"menu.clone",
		"menu.archive",
	}
	for _, action := range requiredActions {
		if !actions[action] {
			t.Fatalf("expected activity action %q in feed, actions=%v", action, actions)
		}
	}
}

func menuBuilderDeepItems(depth int) []any {
	if depth <= 0 {
		return nil
	}
	root := map[string]any{
		"id":     "n1",
		"label":  "N1",
		"type":   "item",
		"target": map[string]any{"type": "route", "path": "/n1"},
	}
	current := root
	for level := 2; level <= depth; level++ {
		child := map[string]any{
			"id":     "n" + strconv.Itoa(level),
			"label":  "N" + strconv.Itoa(level),
			"type":   "item",
			"target": map[string]any{"type": "route", "path": "/n" + strconv.Itoa(level)},
		}
		current["children"] = []any{child}
		current = child
	}
	return []any{root}
}
