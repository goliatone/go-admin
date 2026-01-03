package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestGoAuthAuthenticatorWrapsMiddleware(t *testing.T) {
	called := false
	authenticator := &GoAuthAuthenticator{
		middleware: func(next router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				called = true
				_ = c.Context()
				if next != nil {
					return next(c)
				}
				return nil
			}
		},
	}

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())

	if err := authenticator.Wrap(mockCtx); err != nil {
		t.Fatalf("wrap returned error: %v", err)
	}
	if !called {
		t.Fatalf("expected middleware to be invoked")
	}
	mockCtx.AssertExpectations(t)
}

func TestNewAdminContextPrefersActor(t *testing.T) {
	actor := &auth.ActorContext{ActorID: "actor-123", Subject: "subject-abc"}
	ctxWithActor := auth.WithActorContext(context.Background(), actor)

	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "header-user"
	mockCtx.On("Context").Return(ctxWithActor)

	result := newAdminContextFromRouter(mockCtx, "en")
	if result.UserID != "actor-123" {
		t.Fatalf("expected actor id to be used, got %s", result.UserID)
	}
	resolved, _ := auth.ActorFromContext(result.Context)
	if resolved == nil || resolved.ActorID != actor.ActorID {
		t.Fatalf("expected actor on context")
	}
	mockCtx.AssertExpectations(t)
}

func TestInitializeRegistersHealth(t *testing.T) {
	cfg := Config{
		Title:         "test admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
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

func TestInitializeRunsPreRoutePreparation(t *testing.T) {
	cfg := Config{
		Title:         "test admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})

	called := false
	if err := adm.RegisterModule(&initModule{called: &called}); err != nil {
		t.Fatalf("register module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if !called {
		t.Fatalf("expected module Register to be called during Initialize")
	}
}

type initModule struct {
	called *bool
}

func (m *initModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: "init.module"}
}

func (m *initModule) Register(_ ModuleContext) error {
	if m.called != nil {
		*m.called = true
	}
	return nil
}

func TestBootstrapSeedsWidgetsAndMenu(t *testing.T) {
	cfg := Config{
		Title:         "cms admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			CMS:       true,
			Dashboard: true,
			Settings:  true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})

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
	if len(menu.Items) != 0 {
		t.Fatalf("expected menu to be empty before module contributions, got %d", len(menu.Items))
	}
}

type fakeAuth struct{}

func (fakeAuth) Wrap(ctx router.Context) error {
	ctx.SetHeader("X-Auth", "ok")
	return nil
}

func TestCommandRegistryRegistersHandlers(t *testing.T) {
	cfg := Config{Features: Features{Commands: true}}
	adm := mustNewAdmin(t, cfg, Dependencies{})

	cmd := &stubCommand{name: "demo"}
	adm.Commands().Register(cmd)

	if len(adm.Commands().Commands()) != 1 {
		t.Fatalf("expected 1 command registration")
	}
}

func TestBulkCommandsExposeCLI(t *testing.T) {
	cfg := Config{
		Features: Features{
			Commands: true,
			Bulk:     true,
			Jobs:     true,
			CMS:      true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	opts := adm.Commands().CLI()
	if len(opts) == 0 {
		t.Fatalf("expected cli options")
	}
	hasBulk := false
	for _, opt := range opts {
		path := strings.Join(opt.Path, " ")
		if path == "admin bulk" {
			hasBulk = true
		}
	}
	if !hasBulk {
		t.Fatalf("expected admin bulk CLI entry, got %v", opts)
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
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Commands: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
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
	form, ok := list["form"].(map[string]any)
	if !ok {
		t.Fatalf("expected form payload in response")
	}
	if _, ok := form["theme"]; !ok {
		t.Fatalf("expected form.theme in response")
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
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Notifications: true,
			Dashboard:     true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	userCtx := context.WithValue(context.Background(), userIDContextKey, "tester")
	_, err := adm.NotificationService().Add(userCtx, Notification{Title: "Hello", Message: "world", UserID: "tester"})
	if err != nil {
		t.Fatalf("seed notification: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/notifications", nil)
	req.Header.Set("X-User-ID", "tester")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("notifications status: %d", rr.Code)
	}
	var listBody map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &listBody)
	if _, ok := listBody["notifications"]; !ok {
		t.Fatalf("notifications payload missing")
	}
	if _, ok := listBody["unread_count"]; !ok {
		t.Fatalf("unread_count missing from payload")
	}
	items, _ := listBody["notifications"].([]any)
	if len(items) == 0 {
		t.Fatalf("expected at least one notification in payload")
	}
	itemMap, _ := items[0].(map[string]any)
	targetID, _ := itemMap["id"].(string)
	if targetID == "" {
		t.Fatalf("expected notification id in payload")
	}

	req = httptest.NewRequest("POST", "/admin/api/notifications/read", strings.NewReader(fmt.Sprintf(`{"ids":["%s"],"read":true}`, targetID)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "tester")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("mark read status: %d body=%s", rr.Code, rr.Body.String())
	}

	itemsList, _ := adm.NotificationService().List(userCtx)
	foundMarked := false
	for _, item := range itemsList {
		if item.ID == targetID && item.Read {
			foundMarked = true
		}
	}
	if !foundMarked {
		t.Fatalf("expected notification marked as read")
	}

	widgets, err := adm.DashboardService().Resolve(AdminContext{Context: userCtx})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	found := false
	for _, w := range widgets {
		if w["definition"] == "admin.widget.notifications" {
			found = true
			data, ok := w["data"].(map[string]any)
			if !ok {
				t.Fatalf("expected widget data map")
			}
			if notifications, ok := data["notifications"].([]Notification); !ok || len(notifications) == 0 {
				t.Fatalf("expected notifications widget data")
			}
		}
	}
	if !found {
		t.Fatalf("expected notifications widget")
	}
}

func TestActivityRouteAndWidget(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Dashboard: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
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

func TestPanelActivityEmission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Dashboard: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text", Required: true})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	panel, ok := adm.Registry().Panel("items")
	if !ok || panel == nil {
		t.Fatalf("expected panel registered")
	}
	if _, err := panel.Create(AdminContext{Context: context.Background(), UserID: "tester"}, map[string]any{"name": "Alpha"}); err != nil {
		t.Fatalf("create record: %v", err)
	}

	entries, err := adm.ActivityFeed().List(context.Background(), 5)
	if err != nil {
		t.Fatalf("list activity: %v", err)
	}
	if len(entries) == 0 {
		t.Fatalf("expected activity entry from panel create")
	}
	if entries[0].Action != "panel.create" || entries[0].Metadata["panel"] != "items" {
		t.Fatalf("unexpected activity entry: %+v", entries[0])
	}
}

func TestBulkRoute(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Bulk:     true,
			Commands: true,
			Jobs:     true,
			CMS:      true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("POST", "/admin/api/bulk", strings.NewReader(`{"name":"cleanup","total":5}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("bulk start status: %d body=%s", rr.Code, rr.Body.String())
	}

	time.Sleep(10 * time.Millisecond)

	req = httptest.NewRequest("GET", "/admin/api/bulk", nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("bulk list status: %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	jobs, ok := body["jobs"].([]any)
	if !ok || len(jobs) == 0 {
		t.Fatalf("expected bulk jobs")
	}
	first, _ := jobs[0].(map[string]any)
	if progress, _ := first["progress"].(float64); progress <= 0 {
		t.Fatalf("expected progress value, got %v", progress)
	}
	if status, _ := first["status"].(string); status == "" {
		t.Fatalf("expected status in job payload")
	}
	id, _ := first["id"].(string)
	if id == "" {
		t.Fatalf("expected job id in payload")
	}

	time.Sleep(20 * time.Millisecond)
	req = httptest.NewRequest("POST", "/admin/api/bulk/"+id+"/rollback", nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("bulk rollback status: %d body=%s", rr.Code, rr.Body.String())
	}
	var rollbackBody map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &rollbackBody)
	job, _ := rollbackBody["job"].(map[string]any)
	if job == nil {
		t.Fatalf("expected rollback job payload")
	}
	if status, _ := job["status"].(string); status != "rolled_back" {
		t.Fatalf("expected rolled_back status, got %v", status)
	}
}

func TestMediaLibraryRoute(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Media: true,
			CMS:   true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/media/library", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("media list status: %d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	items, ok := body["items"].([]any)
	if !ok || len(items) == 0 {
		t.Fatalf("expected media items")
	}
	first, _ := items[0].(map[string]any)
	if meta, _ := first["metadata"].(map[string]any); len(meta) == 0 {
		t.Fatalf("expected metadata on media item")
	}
}

func TestPanelSchemaIncludesFeatureMetadata(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Export:   true,
			Bulk:     true,
			Media:    true,
			CMS:      true,
			Commands: true,
			Jobs:     true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "asset", Label: "Asset", Type: "media"})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/items", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("list status: %d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	schema, ok := body["schema"].(map[string]any)
	if !ok {
		t.Fatalf("schema missing from response")
	}
	exportConf, _ := schema["export"].(map[string]any)
	if exportConf == nil || exportConf["definition"] != "items" {
		t.Fatalf("expected export metadata for items, got %v", exportConf)
	}
	if endpoint, _ := exportConf["endpoint"].(string); endpoint == "" {
		t.Fatalf("expected export endpoint")
	}
	if variant, ok := exportConf["variant"].(string); ok && variant != "" {
		t.Fatalf("expected empty export variant, got %v", variant)
	}
	if _, ok := exportConf["resource"]; ok {
		t.Fatalf("expected legacy export resource to be omitted, got %v", exportConf["resource"])
	}
	if _, ok := exportConf["formats"]; ok {
		t.Fatalf("expected legacy export formats to be omitted, got %v", exportConf["formats"])
	}
	if _, ok := exportConf["format"]; ok {
		t.Fatalf("expected legacy export format to be omitted, got %v", exportConf["format"])
	}
	bulkConf, _ := schema["bulk"].(map[string]any)
	if bulkConf == nil {
		t.Fatalf("expected bulk metadata")
	}
	if supports, _ := bulkConf["supports_rollback"].(bool); !supports {
		t.Fatalf("expected supports_rollback true, got %v", bulkConf)
	}
	mediaConf, _ := schema["media"].(map[string]any)
	if mediaConf == nil {
		t.Fatalf("expected media metadata")
	}
	libraryPath, _ := mediaConf["library_path"].(string)
	if libraryPath == "" {
		t.Fatalf("expected media library path")
	}
	formSchema, _ := schema["form_schema"].(map[string]any)
	props, _ := formSchema["properties"].(map[string]any)
	assetField, _ := props["asset"].(map[string]any)
	if widget, _ := assetField["x-formgen:widget"].(string); widget != "media-picker" {
		t.Fatalf("expected media picker widget, got %v", widget)
	}
	if adminMeta, _ := assetField["x-admin"].(map[string]any); adminMeta["media_library_path"] == "" {
		t.Fatalf("expected media library hint on field, got %v", adminMeta)
	}
}

func TestJobsRouteAndTrigger(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Jobs:     true,
			Commands: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
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
	var jobsBody map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &jobsBody)
	rawJobs, ok := jobsBody["jobs"].([]any)
	if !ok || len(rawJobs) == 0 {
		t.Fatalf("expected jobs payload")
	}
	firstJob, ok := rawJobs[0].(map[string]any)
	if !ok {
		t.Fatalf("job payload invalid")
	}
	if schedule := firstJob["schedule"]; schedule == nil || schedule == "" {
		t.Fatalf("expected schedule in job payload, got %v", schedule)
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

	req = httptest.NewRequest("GET", "/admin/api/jobs", nil)
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	jobsBody = map[string]any{}
	_ = json.Unmarshal(rr.Body.Bytes(), &jobsBody)
	rawJobs, ok = jobsBody["jobs"].([]any)
	if !ok || len(rawJobs) == 0 {
		t.Fatalf("expected jobs payload after trigger")
	}
	firstJob, ok = rawJobs[0].(map[string]any)
	if !ok {
		t.Fatalf("job payload invalid after trigger")
	}
	if status, _ := firstJob["status"].(string); status == "pending" || status == "" {
		t.Fatalf("expected status update after trigger, got %v", status)
	}
}
func TestSearchRouteReturnsResults(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Search: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
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
