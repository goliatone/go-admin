package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type recordingAuthenticator struct {
	calls int
}

func (a *recordingAuthenticator) Wrap(ctx router.Context) error {
	a.calls++
	actor := &auth.ActorContext{ActorID: "auth-user", Subject: "auth-user"}
	ctx.SetContext(auth.WithActorContext(ctx.Context(), actor))
	return nil
}

type recordingAuthorizer struct {
	allow bool
	calls []string
}

func (r *recordingAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	r.calls = append(r.calls, action+":"+resource)
	return r.allow
}

type repositorySearchAdapter struct {
	repo *MemoryRepository
	perm string
}

func (a *repositorySearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	records, _, err := a.repo.List(ctx, ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	if err != nil {
		return nil, err
	}
	results := []SearchResult{}
	for _, rec := range records {
		results = append(results, SearchResult{
			Type:        "items",
			ID:          toString(rec["id"]),
			Title:       toString(rec["name"]),
			Description: toString(rec["name"]),
		})
	}
	return results, nil
}

func (a *repositorySearchAdapter) Permission() string { return a.perm }

func TestEndToEndFlowCoversAuthDashboardSearchSettings(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Integration Admin",
		Theme:         "admin",
		Features: Features{
			Dashboard: true,
			Search:    true,
			Settings:  true,
			Commands:  true,
		},
	}
	adm := New(cfg)
	authn := &recordingAuthenticator{}
	adm.WithAuth(authn, nil)
	authz := &recordingAuthorizer{allow: true}
	adm.WithAuthorizer(authz)

	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}, Field{Name: "name", Label: "Name", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text", Required: true})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	adm.SearchService().Register("items", &repositorySearchAdapter{repo: repo, perm: "admin.search.items"})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	createReq := httptest.NewRequest("POST", "/admin/api/items", strings.NewReader(`{"name":"Alpha"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "request-user")
	createRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRes, createReq)
	if createRes.Code != 200 {
		t.Fatalf("create status: %d body=%s", createRes.Code, createRes.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(createRes.Body.Bytes(), &created)
	id := toString(created["id"])
	if id == "" {
		t.Fatalf("expected created id, got %+v", created)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator to run")
	}

	searchReq := httptest.NewRequest("GET", "/admin/api/search?query=Alpha&limit=5", nil)
	searchReq.Header.Set("X-User-ID", "request-user")
	searchRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(searchRes, searchReq)
	if searchRes.Code != 200 {
		t.Fatalf("search status: %d body=%s", searchRes.Code, searchRes.Body.String())
	}
	var searchBody map[string]any
	_ = json.Unmarshal(searchRes.Body.Bytes(), &searchBody)
	rawResults, ok := searchBody["results"].([]any)
	if !ok || len(rawResults) != 1 {
		t.Fatalf("expected one search result, got %v", searchBody["results"])
	}
	firstResult, _ := rawResults[0].(map[string]any)
	if toString(firstResult["id"]) != id {
		t.Fatalf("expected search result id %s, got %v", id, firstResult["id"])
	}
	if len(authz.calls) == 0 {
		t.Fatalf("expected authorizer to be used for search")
	}

	settingsPayload := `{"values":{"admin.title":"Custom Admin"},"scope":"user"}`
	settingsReq := httptest.NewRequest("POST", "/admin/api/settings", strings.NewReader(settingsPayload))
	settingsReq.Header.Set("Content-Type", "application/json")
	settingsReq.Header.Set("X-User-ID", "request-user")
	settingsRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(settingsRes, settingsReq)
	if settingsRes.Code != 200 {
		t.Fatalf("settings status: %d body=%s", settingsRes.Code, settingsRes.Body.String())
	}

	dashboardReq := httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	dashboardReq.Header.Set("X-User-ID", "request-user")
	dashboardRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(dashboardRes, dashboardReq)
	if dashboardRes.Code != 200 {
		t.Fatalf("dashboard status: %d body=%s", dashboardRes.Code, dashboardRes.Body.String())
	}
	var dashboardBody map[string]any
	_ = json.Unmarshal(dashboardRes.Body.Bytes(), &dashboardBody)
	rawWidgets, ok := dashboardBody["widgets"].([]any)
	if !ok || len(rawWidgets) == 0 {
		t.Fatalf("expected dashboard widgets, got %v", dashboardBody["widgets"])
	}
	foundSettingsWidget := false
	for _, raw := range rawWidgets {
		widget, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if toString(widget["definition"]) != "admin.widget.settings_overview" {
			continue
		}
		data, _ := widget["data"].(map[string]any)
		values, _ := data["values"].(map[string]any)
		titleVal, _ := values["admin.title"].(map[string]any)
		if titleVal["value"] != "Custom Admin" {
			t.Fatalf("expected updated settings value, got %v", titleVal["value"])
		}
		if titleVal["provenance"] != string(SettingsScopeUser) {
			t.Fatalf("expected user provenance, got %v", titleVal["provenance"])
		}
		foundSettingsWidget = true
	}
	if !foundSettingsWidget {
		t.Fatalf("expected settings overview widget in dashboard payload")
	}

	listReq := httptest.NewRequest("GET", "/admin/api/items", nil)
	listReq.Header.Set("X-User-ID", "request-user")
	listRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRes, listReq)
	if listRes.Code != 200 {
		t.Fatalf("list status: %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listBody map[string]any
	_ = json.Unmarshal(listRes.Body.Bytes(), &listBody)
	if total := int(listBody["total"].(float64)); total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}
	form, ok := listBody["form"].(map[string]any)
	if !ok {
		t.Fatalf("expected form payload on list response")
	}
	theme, ok := form["theme"].(map[string]any)
	if !ok || len(theme) == 0 {
		t.Fatalf("expected theme metadata on form, got %v", form["theme"])
	}
}
