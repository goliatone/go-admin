package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	debugregistry "github.com/goliatone/go-admin/debug"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type headerDebugAuthenticator struct{}

func (headerDebugAuthenticator) Wrap(c router.Context) error {
	userID := strings.TrimSpace(c.Header("X-Test-User"))
	if userID == "" {
		userID = "auth-user"
	}
	actor := &auth.ActorContext{ActorID: userID, Subject: userID}
	c.SetContext(auth.WithActorContext(c.Context(), actor))
	return nil
}

type allowAllDebugAuthorizer struct{}

func (allowAllDebugAuthorizer) Can(context.Context, string, string) bool {
	return true
}

func TestDebugRoutesRequirePermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(denyAllAuthz{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected debug snapshot to enforce permissions, got %d", rr.Code)
	}
}

func TestDebugRoutesDenyWhenNoAuthorizerOrIPAllowlistConfigured(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected debug snapshot denied without authorizer or IP allowlist, got %d", rr.Code)
	}
}

func TestDebugRoutesAllowStandaloneIPAccessWithoutAuthorizer(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			AllowedIPs: []string{"1.1.1.1"},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected debug snapshot allowed for allowlisted IP, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestDebugPanelsEndpointExposesEnabledRichUIDefinitions(t *testing.T) {
	const panelID = "rich_transport_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:           "Rich Transport",
		SnapshotKey:     panelID,
		SupportsToolbar: new(true),
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererTable, Bind: "items"},
				Toolbar: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererMetrics, Bind: "summary"},
			},
		},
	}); err != nil {
		t.Fatalf("register rich panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled:    true,
		AllowedIPs: []string{"1.1.1.1"},
		Panels:     []string{panelID},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, debugCfg, "panels"), nil)
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected debug panels ok, got %d body=%s", rr.Code, rr.Body.String())
	}

	var response debugPanelsResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Panels) != 1 {
		t.Fatalf("expected one panel, got %+v", response.Panels)
	}
	panel := response.Panels[0]
	if panel.ID != panelID || panel.UI == nil || panel.UI.Views.Console == nil {
		t.Fatalf("expected rich panel definition, got %+v", panel)
	}
	if panel.UI.Views.Console.Renderer != debugregistry.PanelRendererTable {
		t.Fatalf("expected table renderer, got %+v", panel.UI.Views.Console)
	}
}

func TestDebugPanelsEndpointAppliesContextDefinitionFilter(t *testing.T) {
	const panelID = "filtered_transport_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Filtered Transport",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON},
			},
			Actions: []debugregistry.PanelUIAction{
				{ID: "read_action", Label: "Read", Payload: map[string]any{"command_id": "safe.read"}},
				{ID: "super_action", Label: "Super", Payload: map[string]any{"command_id": "secret.mutate"}},
			},
		},
		Definition: func(ctx context.Context, definition debugregistry.PanelDefinition) debugregistry.PanelDefinition {
			actor, _ := auth.ActorFromContext(ctx)
			filtered := definition
			if definition.UI != nil {
				ui := *definition.UI
				ui.Actions = append([]debugregistry.PanelUIAction(nil), definition.UI.Actions...)
				filtered.UI = &ui
			}
			if actor != nil && actor.ActorID == "read-admin" {
				filtered.UI.Actions = filtered.UI.Actions[:1]
			}
			return filtered
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"read_action": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				return debugregistry.PanelActionResult{OK: true}, nil
			},
			"super_action": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				return debugregistry.PanelActionResult{OK: true}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register filtered panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled: true,
		Panels:  []string{panelID},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAllDebugAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, debugCfg, "panels"), nil)
	req.Header.Set("X-Test-User", "read-admin")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected debug panels ok, got %d body=%s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "secret.mutate") {
		t.Fatalf("filtered action payload leaked through transport response: %s", rr.Body.String())
	}

	var response debugPanelsResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Panels) != 1 || response.Panels[0].UI == nil {
		t.Fatalf("expected one rich panel response, got %+v", response.Panels)
	}
	actions := response.Panels[0].UI.Actions
	if len(actions) != 1 || actions[0].ID != "read_action" {
		t.Fatalf("expected request-filtered actions, got %+v", actions)
	}
}

func TestDebugPanelActionEndpointDispatchesRegisteredHandler(t *testing.T) {
	const panelID = "action_transport_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	called := false
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Action Transport",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON},
			},
			Actions: []debugregistry.PanelUIAction{{ID: "refresh", Label: "Refresh", Refresh: true}},
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"refresh": func(_ context.Context, req debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				called = req.PanelID == panelID && req.ActionID == "refresh" && req.Payload["source"] == "test"
				return debugregistry.PanelActionResult{OK: true, Message: "refreshed", Refresh: true}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register action panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled:    true,
		AllowedIPs: []string{"1.1.1.1"},
		Panels:     []string{panelID},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := strings.Replace(debugAPIPath(t, adm, debugCfg, "panel.action"), ":panel", panelID, 1)
	path = strings.Replace(path, ":action", "refresh", 1)
	req := httptest.NewRequestWithContext(context.Background(), "POST", path, strings.NewReader(`{"source":"test"}`))
	req.RemoteAddr = "1.1.1.1:12345"
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected panel action ok, got %d body=%s", rr.Code, rr.Body.String())
	}
	if !called {
		t.Fatalf("expected registered action handler to be called")
	}
	var result debugregistry.PanelActionResult
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode result: %v", err)
	}
	if !result.OK || result.Message != "refreshed" || !result.Refresh {
		t.Fatalf("unexpected action result: %+v", result)
	}
}

func TestDebugAPIAuthFailuresReturnJSONWithoutBrowserRedirect(t *testing.T) {
	const panelID = "authenticated_action_transport_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	called := false
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Authenticated Action Transport",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON},
			},
			Actions: []debugregistry.PanelUIAction{{ID: "refresh", Label: "Refresh"}},
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"refresh": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				called = true
				return debugregistry.PanelActionResult{OK: true, Message: "refreshed"}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register action panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled:    true,
		Permission: debugDefaultPermission,
		Panels:     []string{panelID},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})

	authCfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: cfg}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, authCfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	redirectCalls := 0
	goAuth := NewGoAuthAuthenticator(routeAuth, authCfg, WithAuthErrorHandler(func(c router.Context, _ error) error {
		redirectCalls++
		status := http.StatusFound
		if c.Method() != http.MethodGet {
			status = http.StatusSeeOther
		}
		return c.Redirect("/login", status)
	}))
	adm.WithAuth(goAuth, &AuthConfig{LoginPath: "/login", RedirectPath: "/admin"})
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	actionPath := strings.Replace(debugAPIPath(t, adm, debugCfg, "panel.action"), ":panel", panelID, 1)
	actionPath = strings.Replace(actionPath, ":action", "refresh", 1)
	unauthenticatedReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, actionPath, strings.NewReader(`{}`))
	unauthenticatedReq.Header.Set("Accept", "application/json")
	unauthenticatedReq.Header.Set("Content-Type", "application/json")
	unauthenticatedRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(unauthenticatedRes, unauthenticatedReq)

	if unauthenticatedRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated debug API status 401, got %d body=%s", unauthenticatedRes.Code, unauthenticatedRes.Body.String())
	}
	if location := strings.TrimSpace(unauthenticatedRes.Header().Get("Location")); location != "" {
		t.Fatalf("expected debug API auth failure without redirect, got Location %q", location)
	}
	if contentType := unauthenticatedRes.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
		t.Fatalf("expected debug API auth failure JSON content type, got %q", contentType)
	}
	if redirectCalls != 0 {
		t.Fatalf("expected debug API to bypass browser auth error handler, got %d calls", redirectCalls)
	}
	if called {
		t.Fatal("expected rejected debug API request not to invoke the panel action")
	}
	var authError map[string]any
	if err := json.Unmarshal(unauthenticatedRes.Body.Bytes(), &authError); err != nil {
		t.Fatalf("decode debug API auth error: %v", err)
	}
	if _, ok := authError["error"].(map[string]any); !ok {
		t.Fatalf("expected structured debug API auth error, got %#v", authError)
	}

	dashboardPath := debugRoutePath(adm, debugCfg, "admin.debug", "index")
	dashboardReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, dashboardPath, nil)
	dashboardRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(dashboardRes, dashboardReq)
	if dashboardRes.Code != http.StatusFound {
		t.Fatalf("expected unauthenticated debug dashboard redirect, got %d body=%s", dashboardRes.Code, dashboardRes.Body.String())
	}
	if location := dashboardRes.Header().Get("Location"); location != "/login" {
		t.Fatalf("expected debug dashboard redirect to /login, got %q", location)
	}
	if redirectCalls != 1 {
		t.Fatalf("expected browser auth error handler for dashboard only, got %d calls", redirectCalls)
	}

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	cookieReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, actionPath, strings.NewReader(`{}`))
	cookieReq.Header.Set("Content-Type", "application/json")
	cookieReq.AddCookie(&http.Cookie{Name: authCfg.GetContextKey(), Value: token})
	cookieRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(cookieRes, cookieReq)
	if cookieRes.Code != http.StatusBadRequest {
		t.Fatalf("expected cookie-authenticated debug API request without CSRF to fail, got %d body=%s", cookieRes.Code, cookieRes.Body.String())
	}
	if location := strings.TrimSpace(cookieRes.Header().Get("Location")); location != "" {
		t.Fatalf("expected debug API CSRF failure without redirect, got Location %q", location)
	}
	if called {
		t.Fatal("expected debug API CSRF failure not to invoke the panel action")
	}

	bearerReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, actionPath, strings.NewReader(`{}`))
	bearerReq.Header.Set("Authorization", "Bearer "+token)
	bearerReq.Header.Set("Content-Type", "application/json")
	bearerRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(bearerRes, bearerReq)
	if bearerRes.Code != http.StatusOK {
		t.Fatalf("expected bearer-authenticated debug API request to succeed, got %d body=%s", bearerRes.Code, bearerRes.Body.String())
	}
	if !called {
		t.Fatal("expected authenticated debug API request to invoke the panel action")
	}
}

func TestDebugCollectorRunPanelActionRequiresContextVisibleAction(t *testing.T) {
	type contextKey string
	const allowActionKey contextKey = "allow-action"
	const panelID = "context_visible_action_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	called := false
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Context Visible Action",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON},
			},
			Actions: []debugregistry.PanelUIAction{{ID: "refresh", Label: "Refresh"}},
		},
		Definition: func(ctx context.Context, definition debugregistry.PanelDefinition) debugregistry.PanelDefinition {
			if ctx.Value(allowActionKey) == true {
				return definition
			}
			filtered := definition
			if definition.UI != nil {
				ui := *definition.UI
				ui.Actions = nil
				filtered.UI = &ui
			}
			return filtered
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"refresh": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				called = true
				return debugregistry.PanelActionResult{OK: true, Message: "refreshed"}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register action panel: %v", err)
	}

	collector := NewDebugCollector(DebugConfig{Panels: []string{panelID}})
	_, err := collector.RunPanelAction(context.Background(), debugregistry.PanelActionRequest{PanelID: panelID, ActionID: "refresh"})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected hidden action to return not found, got %v", err)
	}
	if called {
		t.Fatalf("hidden action handler must not be called")
	}

	ctx := context.WithValue(context.Background(), allowActionKey, true)
	result, err := collector.RunPanelAction(ctx, debugregistry.PanelActionRequest{PanelID: panelID, ActionID: "refresh"})
	if err != nil {
		t.Fatalf("expected visible action to dispatch: %v", err)
	}
	if !result.OK || result.Message != "refreshed" || !called {
		t.Fatalf("expected visible action handler result, got result=%+v called=%v", result, called)
	}
}

func TestDebugPanelActionEndpointMasksActionResultPayloads(t *testing.T) {
	const panelID = "masked_action_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Masked Action",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views:   debugregistry.PanelUIViews{Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON}},
			Actions: []debugregistry.PanelUIAction{{ID: "inspect", Label: "Inspect"}},
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"inspect": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				return debugregistry.PanelActionResult{
					OK:      true,
					Message: "inspected secret=open-sesame",
					Data:    map[string]any{"secret": "open-sesame"},
					Event: &debugregistry.PanelActionEvent{
						Type:    "masked-event",
						Payload: map[string]any{"client_secret": "client-open-sesame"},
					},
					Errors: map[string]any{"token": "token-open-sesame"},
				}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register action panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled:    true,
		AllowedIPs: []string{"1.1.1.1"},
		Panels:     []string{panelID},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := strings.Replace(debugAPIPath(t, adm, debugCfg, "panel.action"), ":panel", panelID, 1)
	path = strings.Replace(path, ":action", "inspect", 1)
	req := httptest.NewRequestWithContext(context.Background(), "POST", path, nil)
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected panel action ok, got %d body=%s", rr.Code, rr.Body.String())
	}

	var result debugregistry.PanelActionResult
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode result: %v", err)
	}
	data, ok := result.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected masked data map, got %T", result.Data)
	}
	if data["secret"] == "open-sesame" {
		t.Fatalf("expected data secret to be masked, got %+v", data)
	}
	if strings.Contains(result.Message, "open-sesame") {
		t.Fatalf("expected message secret to be masked, got %q", result.Message)
	}
	if result.Errors["token"] == "token-open-sesame" {
		t.Fatalf("expected error token to be masked, got %+v", result.Errors)
	}
	eventPayload, ok := result.Event.Payload.(map[string]any)
	if !ok {
		t.Fatalf("expected masked event payload, got %T", result.Event.Payload)
	}
	if eventPayload["client_secret"] == "client-open-sesame" {
		t.Fatalf("expected event payload secret to be masked, got %+v", eventPayload)
	}
}

func TestDebugPanelActionEndpointRejectsDisabledPanel(t *testing.T) {
	const panelID = "disabled_action_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		UI: &debugregistry.PanelUI{
			Views:   debugregistry.PanelUIViews{Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON}},
			Actions: []debugregistry.PanelUIAction{{ID: "refresh", Label: "Refresh"}},
		},
		Actions: map[string]debugregistry.PanelActionHandler{
			"refresh": func(context.Context, debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
				return debugregistry.PanelActionResult{OK: true}, nil
			},
		},
	}); err != nil {
		t.Fatalf("register action panel: %v", err)
	}

	debugCfg := DebugConfig{
		Enabled:    true,
		AllowedIPs: []string{"1.1.1.1"},
		Panels:     []string{"other_panel"},
	}
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", Debug: debugCfg}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := strings.Replace(debugAPIPath(t, adm, debugCfg, "panel.action"), ":panel", panelID, 1)
	path = strings.Replace(path, ":action", "refresh", 1)
	req := httptest.NewRequestWithContext(context.Background(), "POST", path, nil)
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected disabled panel action not found, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestDebugPanelOrderPreferenceEndpointPersistsNormalizedUserOrder(t *testing.T) {
	store := NewInMemoryPreferencesStore()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelTemplate, DebugPanelSQL, DebugPanelConfig},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate:      featureGateFromFlags(map[string]bool{"debug": true}),
		PreferencesStore: store,
	})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	mod := NewDebugModule(cfg.Debug)
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := debugAPIPath(t, adm, cfg.Debug, "preferences.panel_order")
	body := `{"panel_order":[" sql ","unknown","template","sql","bad panel","sessions"]}`
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPut, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected panel order save ok, got %d body=%s", rr.Code, rr.Body.String())
	}

	var saveResp debugPanelOrderPreferenceResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &saveResp); err != nil {
		t.Fatalf("decode save response: %v", err)
	}
	if !saveResp.Available || !saveResp.Found || saveResp.UserID != "user-1" {
		t.Fatalf("unexpected save response metadata: %+v", saveResp)
	}
	if got, want := strings.Join(saveResp.PanelOrder, ","), "sql,template,sessions"; got != want {
		t.Fatalf("expected normalized panel order %q, got %q", want, got)
	}

	getReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil)
	getReq.Header.Set("X-Test-User", "user-1")
	getRR := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getRR, getReq)
	if getRR.Code != http.StatusOK {
		t.Fatalf("expected panel order get ok, got %d body=%s", getRR.Code, getRR.Body.String())
	}
	var getResp debugPanelOrderPreferenceResponse
	if err := json.Unmarshal(getRR.Body.Bytes(), &getResp); err != nil {
		t.Fatalf("decode get response: %v", err)
	}
	if got, want := strings.Join(getResp.PanelOrder, ","), "sql,template,sessions"; got != want {
		t.Fatalf("expected stored panel order %q, got %q", want, got)
	}

	fresh := NewPreferencesService(store)
	prefs, err := fresh.Get(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("fresh service get: %v", err)
	}
	if got, want := strings.Join(normalizeDebugPanelOrderPreference(mod, prefs.Raw[debugPanelOrderPreferenceKey]), ","), "sql,template,sessions"; got != want {
		t.Fatalf("expected fresh service to load %q, got %q", want, got)
	}
}

func TestDebugPanelOrderPreferenceEndpointRejectsGloballyRegisteredDisabledPanel(t *testing.T) {
	const panelID = "disabled_pref_panel"

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		Label:       "Disabled Preference Panel",
		SnapshotKey: panelID,
		UI: &debugregistry.PanelUI{
			Views: debugregistry.PanelUIViews{
				Console: &debugregistry.PanelUIView{Renderer: debugregistry.PanelRendererJSON},
			},
		},
	}); err != nil {
		t.Fatalf("register disabled preference panel: %v", err)
	}

	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelTemplate, DebugPanelSQL, DebugPanelConfig},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := debugAPIPath(t, adm, cfg.Debug, "preferences.panel_order")
	body := `{"panel_order":["sql","` + panelID + `","template"]}`
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPut, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected panel order save ok, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp debugPanelOrderPreferenceResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode save response: %v", err)
	}
	if got, want := strings.Join(resp.PanelOrder, ","), "sql,template"; got != want {
		t.Fatalf("expected disabled global panel to be filtered from stored order %q, got %q", want, got)
	}
}

func TestDebugPanelOrderPreferenceEndpointIsUserScoped(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelTemplate, DebugPanelSQL, DebugPanelConfig},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := debugAPIPath(t, adm, cfg.Debug, "preferences.panel_order")
	for _, tc := range []struct {
		user  string
		order string
	}{
		{user: "user-1", order: `["sql"]`},
		{user: "user-2", order: `["config"]`},
	} {
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPut, path, strings.NewReader(`{"panel_order":`+tc.order+`}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-User", tc.user)
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected save ok for %s, got %d body=%s", tc.user, rr.Code, rr.Body.String())
		}
	}

	for _, tc := range []struct {
		user string
		want string
	}{
		{user: "user-1", want: "sql"},
		{user: "user-2", want: "config"},
	} {
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil)
		req.Header.Set("X-Test-User", tc.user)
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected get ok for %s, got %d body=%s", tc.user, rr.Code, rr.Body.String())
		}
		var resp debugPanelOrderPreferenceResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode get response: %v", err)
		}
		if got := strings.Join(resp.PanelOrder, ","); got != tc.want {
			t.Fatalf("expected order %q for %s, got %q", tc.want, tc.user, got)
		}
	}
}

func TestDebugPanelOrderPreferenceEndpointFallsBackForUserlessAccess(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			AllowedIPs: []string{"1.1.1.1"},
			Panels:     []string{DebugPanelTemplate, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := debugAPIPath(t, adm, cfg.Debug, "preferences.panel_order")
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPut, path, strings.NewReader(`{"panel_order":["sql"]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "spoofed-user")
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected userless fallback ok, got %d body=%s", rr.Code, rr.Body.String())
	}
	var resp debugPanelOrderPreferenceResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode fallback response: %v", err)
	}
	if resp.Available || resp.Found || len(resp.PanelOrder) != 0 {
		t.Fatalf("expected unavailable empty fallback response, got %+v", resp)
	}
	prefs, err := adm.PreferencesService().Get(context.Background(), "spoofed-user")
	if err != nil {
		t.Fatalf("get spoofed preferences: %v", err)
	}
	if _, ok := prefs.Raw[debugPanelOrderPreferenceKey]; ok {
		t.Fatalf("expected userless request not to persist spoofed user preference, got %+v", prefs.Raw)
	}
}

func TestDebugRoutesUseAuthenticator(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	authn := &recordingAuthenticator{}
	adm.WithAuth(authn, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected debug snapshot ok, got %d", rr.Code)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator to be invoked")
	}
}

func TestDebugRoutesDenyWhenAuthenticatorMissingEvenWithAuthorizer(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequestWithContext(context.Background(), "GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected debug snapshot denied without authenticator, got %d", rr.Code)
	}
}

func TestDebugDoctorActionEndpointRunsCheckAction(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuth(&recordingAuthenticator{}, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	called := false
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:          "debug.autofix",
		Description: "test",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{
				Findings: []DoctorFinding{{Severity: DoctorSeverityWarn, Message: "fix me"}},
			}
		},
		Action: &DoctorAction{
			CTA: "Run auto fix",
			Run: func(_ context.Context, _ *Admin, _ DoctorCheckResult, input map[string]any) (DoctorActionExecution, error) {
				called = input["source"] == "transport-test"
				return DoctorActionExecution{Status: "ok", Message: "fixed"}, nil
			},
		},
	})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := strings.Replace(debugAPIPath(t, adm, cfg.Debug, "doctor.action"), ":check", "debug.autofix", 1)
	req := httptest.NewRequestWithContext(context.Background(), "POST", path, strings.NewReader(`{"source":"transport-test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 doctor action, got %d: %s", rr.Code, rr.Body.String())
	}
	if !called {
		t.Fatalf("expected doctor action handler invocation")
	}
}

// jsErrorTestConfig returns a DebugConfig with CaptureJSErrors enabled.
func jsErrorTestConfig() DebugConfig {
	return DebugConfig{
		Enabled:         true,
		CaptureJSErrors: true,
		Panels:          []string{DebugPanelJSErrors},
	}
}

// addNonceCookie adds the nonce cookie and returns a body with the nonce field.
func addNonceCookie(req *http.Request, nonce string) {
	req.AddCookie(&http.Cookie{
		Name:  debugNonceCookieName,
		Value: nonce,
	})
}

func TestJSErrorReportEndpointAcceptsValidPayload(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-abc123"
	body := `{"type":"uncaught","message":"ReferenceError: foo is not defined","source":"app.js","line":42,"nonce":"` + nonce + `"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for valid payload, got %d: %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("expected status ok in response, got %s", rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsEmptyMessage(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-empty-msg"
	body := `{"type":"uncaught","message":"","nonce":"` + nonce + `"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 for empty message, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsInvalidJSON(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `not json`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	addNonceCookie(req, "some-nonce")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 for invalid JSON, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointReturns404WithoutExposureBoundary(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-no-auth"
	body := `{"type":"uncaught","message":"test error","nonce":"` + nonce + `"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404 without a configured debug exposure boundary, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsMismatchedNonce(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"type":"uncaught","message":"test error","nonce":"body-nonce"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	addNonceCookie(req, "cookie-nonce") // Different from body nonce
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for mismatched nonce, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsMissingNonce(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	// No nonce cookie, no nonce in body
	body := `{"type":"uncaught","message":"test error"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for missing nonce, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointReturns404WhenDisabled(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:         true,
			CaptureJSErrors: false, // Explicitly disabled
			Panels:          []string{DebugPanelJSErrors},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"type":"uncaught","message":"test error"}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, cfg.Debug, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 when CaptureJSErrors is disabled, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointAcceptsNetworkErrorType(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	debugCfg.AllowedIPs = []string{"1.1.1.1"}
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-network"
	body := `{"type":"network_error","message":"GET http://localhost/api/test 404 (Not Found)","nonce":"` + nonce + `","extra":{"method":"GET","status":404,"status_text":"Not Found","request_url":"http://localhost/api/test"}}`
	req := httptest.NewRequestWithContext(context.Background(), "POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.1.1.1:12345"
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for network_error type, got %d: %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("expected status ok in response, got %s", rr.Body.String())
	}
}

func debugAPIPath(t *testing.T, adm *Admin, cfg DebugConfig, route string) string {
	t.Helper()
	path := debugAPIRoutePath(adm, cfg, route)
	if path == "" {
		t.Fatalf("expected debug api path for %s", route)
	}
	return path
}

func TestDebugRoutesRespectRoutingMountOverrides(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
		Routing: routing.Config{
			Roots: routing.RootsConfig{
				AdminRoot: "/control",
				APIRoot:   "/control/api",
			},
			Modules: map[string]routing.ModuleConfig{
				debugRoutingSlug: {
					Mount: routing.ModuleMountOverride{
						UIBase: "/control/workbench/debug",
					},
				},
			},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if got := debugRoutePath(adm, cfg.Debug, "admin.debug", "index"); got != "/control/workbench/debug" {
		t.Fatalf("expected planner-backed debug path, got %q", got)
	}
	if got := debugAPIPath(t, adm, cfg.Debug, "snapshot"); got != "/control/workbench/debug/api/snapshot" {
		t.Fatalf("expected planner-backed debug api path, got %q", got)
	}
}
