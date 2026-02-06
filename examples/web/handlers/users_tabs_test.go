package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestUserDetailTabSelection(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "activity" {
			t.Fatalf("expected active_tab=activity, got %q", got)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserDetailTabDefaultsToDetails(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "details" {
			t.Fatalf("expected active_tab=details, got %q", got)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserTabHTMLEndpoint(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab_panel payload")
		}
		if got := fmt.Sprint(tabPanel["id"]); got != "activity" {
			t.Fatalf("expected tab_panel id activity, got %q", got)
		}
	})

	if err := h.TabHTML(ctx); err != nil {
		t.Fatalf("tab html handler: %v", err)
	}
}

func TestUserTabJSONEndpoint(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		payload, ok := args.Get(1).(map[string]any)
		if !ok {
			t.Fatalf("expected json payload map")
		}
		tab, ok := payload["tab"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab payload")
		}
		if got := fmt.Sprint(tab["id"]); got != "activity" {
			t.Fatalf("expected tab id activity, got %q", got)
		}
	})

	if err := h.TabJSON(ctx); err != nil {
		t.Fatalf("tab json handler: %v", err)
	}
}

func TestUserDetailTabSelectionFallsBackToRegistryTabs(t *testing.T) {
	h, user := setupUserHandlersWithRegistryTabs(t)

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "activity" {
			t.Fatalf("expected active_tab=activity, got %q", got)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserTabHTMLEndpointFallsBackToRegistryTabs(t *testing.T) {
	h, user := setupUserHandlersWithRegistryTabs(t)

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab_panel payload")
		}
		if got := fmt.Sprint(tabPanel["id"]); got != "activity" {
			t.Fatalf("expected tab_panel id activity, got %q", got)
		}
	})

	if err := h.TabHTML(ctx); err != nil {
		t.Fatalf("tab html handler: %v", err)
	}
}

func setupUserHandlersTest(t *testing.T) (*UserHandlers, map[string]any) {
	t.Helper()
	dsn := fmt.Sprintf("file:users_tabs_test_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("new user store: %v", err)
	}
	store.Teardown()

	user, err := store.Create(context.Background(), map[string]any{
		"username": "tab.user",
		"email":    "tab.user@example.com",
		"role":     "admin",
		"status":   "active",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	cfg := admin.Config{
		BasePath:      "/admin",
		Title:         "Tabs Test",
		DefaultLocale: "en",
	}
	handler := &UserHandlers{
		Store:  store,
		Config: cfg,
		WithNav: func(ctx router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context, _ router.Context) router.ViewContext {
			return ctx
		},
		TabResolver: helpers.TabContentResolverFunc(func(context.Context, string, map[string]any, admin.PanelTab) (helpers.TabContentSpec, error) {
			return helpers.TabContentSpec{Kind: helpers.TabContentDetails}, nil
		}),
		TabMode: helpers.TabRenderModeSelector{Default: helpers.TabRenderModeSSR},
	}
	return handler, user
}

type allowAllTabAuthorizer struct{}

func (allowAllTabAuthorizer) Can(context.Context, string, string) bool { return true }

func setupUserHandlersWithRegistryTabs(t *testing.T) (*UserHandlers, map[string]any) {
	t.Helper()
	handler, user := setupUserHandlersTest(t)
	adm, err := admin.New(handler.Config, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllTabAuthorizer{})
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "profile",
		Label:      "Profile",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}
	handler.Admin = adm
	return handler, user
}

func newTabsTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	tabs := []map[string]any{
		{
			"id":    "details",
			"label": "Details",
			"scope": "detail",
			"target": map[string]any{
				"type":  "panel",
				"panel": "users",
			},
		},
		{
			"id":    "activity",
			"label": "Activity",
			"scope": "detail",
			"target": map[string]any{
				"type": "path",
				"path": "/admin/activity",
			},
		},
		{
			"id":    "profile",
			"label": "Profile",
			"scope": "detail",
			"target": map[string]any{
				"type":  "panel",
				"panel": "user-profiles",
			},
		},
	}
	payload, err := json.Marshal(map[string]any{
		"schema": map[string]any{
			"tabs": tabs,
		},
	})
	if err != nil {
		t.Fatalf("encode tabs payload: %v", err)
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/admin/api/users/") {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(payload)
	}))
}

func serverHost(t *testing.T, server *httptest.Server) string {
	t.Helper()
	parsed, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse server url: %v", err)
	}
	return parsed.Host
}

func serverScheme(t *testing.T, server *httptest.Server) string {
	t.Helper()
	parsed, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse server url: %v", err)
	}
	return parsed.Scheme
}

func withUsersClaims() context.Context {
	claims := &authlib.JWTClaims{
		UserRole: string(authlib.RoleAdmin),
		Resources: map[string]string{
			"admin.users": string(authlib.RoleOwner),
		},
	}
	return authlib.WithClaimsContext(context.Background(), claims)
}
