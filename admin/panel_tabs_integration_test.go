package admin

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestPanelTabsListAndDetailResponses(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{Authorizer: allowAuthorizer{}})
	server := router.NewHTTPServer()

	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text"}).
		DetailFields(Field{Name: "id", Label: "ID", Type: "text"}).
		Tabs(PanelTab{
			ID:       "owner",
			Label:    "Owner",
			Position: 1,
			Target:   PanelTabTarget{Type: "panel", Panel: "owner"},
		})

	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if err := adm.RegisterPanelTab("items", PanelTab{
		ID:       "activity",
		Label:    "Activity",
		Position: 2,
		Target:   PanelTabTarget{Type: "panel", Panel: "activity"},
	}); err != nil {
		t.Fatalf("register tab: %v", err)
	}
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	createReq := httptest.NewRequest("POST", "/admin/api/panels/items", strings.NewReader(`{"name":"Item 1"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRes, createReq)
	if createRes.Code != 200 {
		t.Fatalf("create status: %d body=%s", createRes.Code, createRes.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(createRes.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("expected created ID, got %+v", created)
	}

	listReq := httptest.NewRequest("GET", "/admin/api/panels/items", nil)
	listRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRes, listReq)
	if listRes.Code != 200 {
		t.Fatalf("list status: %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload map[string]any
	_ = json.Unmarshal(listRes.Body.Bytes(), &listPayload)
	schema, ok := listPayload["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema in list response")
	}
	tabs, ok := schema["tabs"].([]any)
	if !ok || len(tabs) != 2 {
		t.Fatalf("expected 2 tabs in list schema, got %+v", schema["tabs"])
	}
	form, ok := listPayload["form"].(map[string]any)
	if !ok {
		t.Fatalf("expected form in list response")
	}
	formSchema, ok := form["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected form.schema in list response")
	}
	formTabs, ok := formSchema["tabs"].([]any)
	if !ok || len(formTabs) != 2 {
		t.Fatalf("expected 2 tabs in list form schema, got %+v", formSchema["tabs"])
	}

	detailReq := httptest.NewRequest("GET", "/admin/api/panels/items/"+id, nil)
	detailRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(detailRes, detailReq)
	if detailRes.Code != 200 {
		t.Fatalf("detail status: %d body=%s", detailRes.Code, detailRes.Body.String())
	}
	var detailPayload map[string]any
	_ = json.Unmarshal(detailRes.Body.Bytes(), &detailPayload)
	record, ok := detailPayload["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data in detail response")
	}
	if got := record["id"]; got != id {
		t.Fatalf("expected data.id %q, got %v", id, got)
	}
	detailSchema, ok := detailPayload["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema in detail response")
	}
	detailTabs, ok := detailSchema["tabs"].([]any)
	if !ok || len(detailTabs) != 2 {
		t.Fatalf("expected 2 tabs in detail schema, got %+v", detailSchema["tabs"])
	}
	detailForm, ok := detailPayload["form"].(map[string]any)
	if !ok {
		t.Fatalf("expected form in detail response")
	}
	detailFormSchema, ok := detailForm["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected form.schema in detail response")
	}
	detailFormTabs, ok := detailFormSchema["tabs"].([]any)
	if !ok || len(detailFormTabs) != 2 {
		t.Fatalf("expected 2 tabs in detail form schema, got %+v", detailFormSchema["tabs"])
	}
}

func TestPanelTabsPermissionFiltering(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{Authorizer: tabsDenyAuthorizer{}})
	server := router.NewHTTPServer()

	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text"}).
		DetailFields(Field{Name: "id", Label: "ID", Type: "text"}).
		Tabs(PanelTab{
			ID:     "public",
			Label:  "Public",
			Target: PanelTabTarget{Type: "panel", Panel: "public"},
		})

	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if err := adm.RegisterPanelTab("items", PanelTab{
		ID:         "secret",
		Label:      "Secret",
		Permission: "tabs.secret",
		Target:     PanelTabTarget{Type: "panel", Panel: "secret"},
	}); err != nil {
		t.Fatalf("register tab: %v", err)
	}
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	listReq := httptest.NewRequest("GET", "/admin/api/panels/items", nil)
	listRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRes, listReq)
	if listRes.Code != 200 {
		t.Fatalf("list status: %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload map[string]any
	_ = json.Unmarshal(listRes.Body.Bytes(), &listPayload)
	schema, ok := listPayload["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema in list response")
	}
	tabs, ok := schema["tabs"].([]any)
	if !ok || len(tabs) != 1 {
		t.Fatalf("expected 1 tab after filtering, got %+v", schema["tabs"])
	}
	tab, ok := tabs[0].(map[string]any)
	if !ok {
		t.Fatalf("expected tab object, got %+v", tabs[0])
	}
	if tab["id"] != "public" {
		t.Fatalf("expected public tab, got %+v", tab)
	}
}
