package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestInitializeRegistersHealth(t *testing.T) {
	cfg := Config{
		Title:         "test admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := New(cfg)
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/health", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 health, got %d", rr.Code)
	}
}

func TestBootstrapSeedsWidgetsAndMenu(t *testing.T) {
	cfg := Config{
		Title:           "cms admin",
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableCMS:       true,
		EnableDashboard: true,
		EnableSettings:  true,
	}
	adm := New(cfg)

	if err := adm.Bootstrap(context.Background()); err != nil {
		t.Fatalf("bootstrap: %v", err)
	}

	widgets := adm.widgetSvc.Definitions()
	if len(widgets) < 3 {
		t.Fatalf("expected at least 3 widget definitions, got %d", len(widgets))
	}

	areas := adm.widgetSvc.Areas()
	if len(areas) != 3 {
		t.Fatalf("expected 3 widget areas, got %d", len(areas))
	}

	menu, err := adm.menuSvc.Menu(context.Background(), "admin.main", cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("menu fetch: %v", err)
	}
	if len(menu.Items) != 5 {
		t.Fatalf("expected 5 base menu items, got %d", len(menu.Items))
	}
}

type fakeAuth struct{}

func (fakeAuth) Wrap(ctx router.Context) error {
	ctx.SetHeader("X-Auth", "ok")
	return nil
}

func TestCommandRegistryRegistersHandlers(t *testing.T) {
	cfg := Config{EnableCommands: true}
	adm := New(cfg)

	cmd := &stubCommand{name: "demo"}
	adm.Commands().Register(cmd)

	if len(adm.Commands().Commands()) != 1 {
		t.Fatalf("expected 1 command registration")
	}
}

type stubCommand struct {
	name string
}

func (s *stubCommand) Name() string { return s.name }

func (s *stubCommand) Execute(_ context.Context) error { return nil }

type calledCommand struct {
	name   string
	called bool
}

func (c *calledCommand) Name() string { return c.name }
func (c *calledCommand) Execute(_ context.Context) error {
	c.called = true
	return nil
}

type cronCommand struct {
	name   string
	called bool
}

func (c *cronCommand) Name() string { return c.name }
func (c *cronCommand) Execute(_ context.Context) error {
	c.called = true
	return nil
}
func (c *cronCommand) CronSpec() string { return "@every 1m" }
func (c *cronCommand) CronHandler() func() error {
	return func() error { return c.Execute(context.Background()) }
}

func TestPanelRoutesCRUDAndActions(t *testing.T) {
	cfg := Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableCommands:  true,
		EnableDashboard: false,
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	r := server.Router()

	repo := NewMemoryRepository()
	cmd := &calledCommand{name: "items.refresh"}
	adm.Commands().Register(cmd)

	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}, Field{Name: "name", Label: "Name", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text", Required: true}).
		DetailFields(Field{Name: "id", Label: "ID", Type: "text"}, Field{Name: "name", Label: "Name", Type: "text"}).
		Actions(Action{Name: "refresh", CommandName: "items.refresh"})

	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	// Create
	req := httptest.NewRequest("POST", "/admin/api/items", strings.NewReader(`{"name":"Item 1"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("create status: %d body=%s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id := created["id"].(string)

	// Detail
	req = httptest.NewRequest("GET", "/admin/api/items/"+id, nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("detail status: %d", rr.Code)
	}

	// Update
	req = httptest.NewRequest("PUT", "/admin/api/items/"+id, strings.NewReader(`{"name":"Updated"}`))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("update status: %d body=%s", rr.Code, rr.Body.String())
	}

	// List
	req = httptest.NewRequest("GET", "/admin/api/items", nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("list status: %d", rr.Code)
	}
	var list map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &list)
	if total := int(list["total"].(float64)); total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}

	// Action
	req = httptest.NewRequest("POST", "/admin/api/items/actions/refresh", nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("action status: %d", rr.Code)
	}
	if !cmd.called {
		t.Fatalf("expected command executed")
	}

	// Delete
	req = httptest.NewRequest("DELETE", "/admin/api/items/"+id, nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("delete status: %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestNotificationsRoutes(t *testing.T) {
	cfg := Config{
		BasePath:            "/admin",
		DefaultLocale:       "en",
		EnableNotifications: true,
		EnableDashboard:     false,
		EnableSettings:      false,
		EnableCommands:      false,
	}
	adm := New(cfg)
	_, _ = adm.NotificationService().Add(context.Background(), Notification{Title: "Hello", Message: "world"})

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/notifications", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("notifications status: %d", rr.Code)
	}

	req = httptest.NewRequest("POST", "/admin/api/notifications/read", strings.NewReader(`{"ids":["1"],"read":true}`))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("mark read status: %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityRouteAndWidget(t *testing.T) {
	cfg := Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableDashboard: true,
	}
	adm := New(cfg)
	_ = adm.activity.Record(context.Background(), ActivityEntry{Actor: "user", Action: "created", Object: "item"})

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/activity?limit=1", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("activity status: %d", rr.Code)
	}

	widgets, err := adm.DashboardService().Resolve(AdminContext{Context: context.Background()})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	found := false
	for _, w := range widgets {
		if w["definition"] == "admin.widget.activity_feed" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected activity widget")
	}
}

func TestJobsRouteAndTrigger(t *testing.T) {
	cfg := Config{
		BasePath:       "/admin",
		DefaultLocale:  "en",
		EnableJobs:     true,
		EnableCommands: true,
	}
	adm := New(cfg)
	cmd := &cronCommand{name: "jobs.cleanup"}
	adm.Commands().Register(cmd)

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/jobs", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("jobs status: %d", rr.Code)
	}

	req = httptest.NewRequest("POST", "/admin/api/jobs/trigger", strings.NewReader(`{"name":"jobs.cleanup"}`))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("trigger status: %d body=%s", rr.Code, rr.Body.String())
	}
	if !cmd.called {
		t.Fatalf("expected job command executed")
	}
}
func TestSearchRouteReturnsResults(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		EnableSearch:  true,
	}
	adm := New(cfg)
	adm.search.Register("items", &stubSearchAdapter{
		results: []SearchResult{{ID: "1", Title: "Alpha"}},
	})

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/search?query=Alpha&limit=5", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("search status: %d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	results := body["results"].([]any)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
}
