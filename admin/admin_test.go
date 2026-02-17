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
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type stubActivityFeedQuery struct {
	page usertypes.ActivityPage
	err  error
}

func (s stubActivityFeedQuery) Query(context.Context, usertypes.ActivityFilter) (usertypes.ActivityPage, error) {
	if s.err != nil {
		return usertypes.ActivityPage{}, s.err
	}
	return s.page, nil
}

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

func TestNewAdminContextDerivesActorFromClaims(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "claims-user-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctxWithClaims := auth.WithClaimsContext(context.Background(), claims)

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(ctxWithClaims)

	result := newAdminContextFromRouter(mockCtx, "en")
	if result.UserID != "claims-user-1" {
		t.Fatalf("expected claims user id to be used, got %s", result.UserID)
	}
	actor, ok := auth.ActorFromContext(result.Context)
	if !ok || actor == nil {
		t.Fatalf("expected actor on context from claims")
	}
	if actor.ActorID != "claims-user-1" {
		t.Fatalf("expected actor id claims-user-1, got %s", actor.ActorID)
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS, FeatureDashboard, FeatureSettings)})

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

func TestCommandBusRegistersHandlers(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
		defer adm.Commands().Reset()

		cmd := &stubCommand{name: "demo"}
		if _, err := RegisterCommand(adm.Commands(), cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(adm.Commands(), "demo", func(payload map[string]any, ids []string) (stubCommandMsg, error) {
			return stubCommandMsg{}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry initialize: %v", err)
		}
		if err := dispatcher.Dispatch(context.Background(), stubCommandMsg{}); err != nil {
			t.Fatalf("dispatch: %v", err)
		}
		if !cmd.called {
			t.Fatalf("expected command executed")
		}
	})
}

func TestBulkCommandsExposeCLI(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands, FeatureBulk, FeatureJobs, FeatureCMS)})
		defer adm.Commands().Reset()
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry initialize: %v", err)
		}
		opts, err := registry.GetCLIOptions()
		if err != nil {
			t.Fatalf("get cli options: %v", err)
		}
		if len(opts) == 0 {
			t.Fatalf("expected cli options")
		}
	})
}

type stubCommand struct {
	name   string
	called bool
}

type stubCommandMsg struct{}

func (stubCommandMsg) Type() string { return "demo" }

func (s *stubCommand) Execute(_ context.Context, _ stubCommandMsg) error {
	s.called = true
	return nil
}

type calledCommand struct {
	called  bool
	payload map[string]any
}

type calledCommandMsg struct {
	Payload map[string]any
}

func (calledCommandMsg) Type() string { return "items.refresh" }

func (c *calledCommand) Execute(_ context.Context, msg calledCommandMsg) error {
	c.called = true
	c.payload = msg.Payload
	return nil
}

type cronCommand struct {
	name   string
	called bool
}

type cronCommandMsg struct{}

func (cronCommandMsg) Type() string { return "jobs.cleanup" }

func (c *cronCommand) Execute(_ context.Context, _ cronCommandMsg) error {
	c.called = true
	return nil
}
func (c *cronCommand) CronHandler() func() error {
	return func() error { return dispatcher.Dispatch(context.Background(), cronCommandMsg{}) }
}
func (c *cronCommand) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@every 1m"}
}

func TestPanelRoutesCRUDAndActions(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
		defer adm.Commands().Reset()
		server := router.NewHTTPServer()
		r := server.Router()

		repo := NewMemoryRepository()
		cmd := &calledCommand{}
		if _, err := RegisterCommand(adm.Commands(), cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(adm.Commands(), "items.refresh", func(payload map[string]any, ids []string) (calledCommandMsg, error) {
			return calledCommandMsg{Payload: payload}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

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
		req := httptest.NewRequest("POST", "/admin/api/panels/items", strings.NewReader(`{"name":"Item 1"}`))
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
		req = httptest.NewRequest("GET", "/admin/api/panels/items/"+id, nil)
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("detail status: %d", rr.Code)
		}

		// Update
		req = httptest.NewRequest("PUT", "/admin/api/panels/items/"+id, strings.NewReader(`{"name":"Updated"}`))
		req.Header.Set("Content-Type", "application/json")
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("update status: %d body=%s", rr.Code, rr.Body.String())
		}

		// List
		req = httptest.NewRequest("GET", "/admin/api/panels/items", nil)
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
		req = httptest.NewRequest("POST", "/admin/api/panels/items/actions/refresh", strings.NewReader(`{"source":"panel"}`))
		req.Header.Set("Content-Type", "application/json")
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("action status: %d", rr.Code)
		}
		if !cmd.called {
			t.Fatalf("expected command executed")
		}
		if cmd.payload["source"] != "panel" {
			t.Fatalf("expected action payload forwarded")
		}

		// Delete
		req = httptest.NewRequest("DELETE", "/admin/api/panels/items/"+id, nil)
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("delete status: %d body=%s", rr.Code, rr.Body.String())
		}
	})
}

func TestPanelRoutesActionPayloadValidation(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
		defer adm.Commands().Reset()
		server := router.NewHTTPServer()
		r := server.Router()

		repo := NewMemoryRepository()
		cmd := &calledCommand{}
		if _, err := RegisterCommand(adm.Commands(), cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(adm.Commands(), "items.refresh", func(payload map[string]any, ids []string) (calledCommandMsg, error) {
			return calledCommandMsg{Payload: payload}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		builder := (&PanelBuilder{}).
			WithRepository(repo).
			ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
			FormFields(Field{Name: "name", Label: "Name", Type: "text"}).
			Actions(Action{
				Name:            "refresh",
				CommandName:     "items.refresh",
				PayloadRequired: []string{"source"},
				PayloadSchema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"source": map[string]any{"type": "string"},
					},
					"required":             []any{"source"},
					"additionalProperties": true,
				},
			})
		if _, err := adm.RegisterPanel("items", builder); err != nil {
			t.Fatalf("register panel: %v", err)
		}
		if err := adm.Initialize(r); err != nil {
			t.Fatalf("initialize: %v", err)
		}

		req := httptest.NewRequest("POST", "/admin/api/panels/items/actions/refresh", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 400 {
			t.Fatalf("expected validation status 400, got %d body=%s", rr.Code, rr.Body.String())
		}
		if cmd.called {
			t.Fatalf("command should not execute on payload validation error")
		}

		req = httptest.NewRequest("POST", "/admin/api/panels/items/actions/refresh", strings.NewReader(`{"source": 1}`))
		req.Header.Set("Content-Type", "application/json")
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 400 {
			t.Fatalf("expected schema validation status 400, got %d body=%s", rr.Code, rr.Body.String())
		}
		if cmd.called {
			t.Fatalf("command should not execute on schema validation error")
		}

		req = httptest.NewRequest("POST", "/admin/api/panels/items/actions/refresh", strings.NewReader(`{"source":"panel"}`))
		req.Header.Set("Content-Type", "application/json")
		rr = httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("expected success status 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		if !cmd.called {
			t.Fatalf("expected command execution for valid payload")
		}
	})
}

func TestPanelListSchemaFiltersActionsToRowScope(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		}
		adm := mustNewAdmin(t, cfg, Dependencies{})
		server := router.NewHTTPServer()
		r := server.Router()

		repo := NewMemoryRepository()
		builder := (&PanelBuilder{}).
			WithRepository(repo).
			ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
			FormFields(Field{Name: "name", Label: "Name", Type: "text"}).
			Actions(
				Action{Name: "row_action", CommandName: "noop.row", Scope: ActionScopeRow},
				Action{Name: "detail_action", CommandName: "noop.detail", Scope: ActionScopeDetail},
				Action{Name: "any_action", CommandName: "noop.any", Scope: ActionScopeAny},
			)
		if _, err := adm.RegisterPanel("items", builder); err != nil {
			t.Fatalf("register panel: %v", err)
		}
		if err := adm.Initialize(r); err != nil {
			t.Fatalf("initialize: %v", err)
		}

		req := httptest.NewRequest("GET", "/admin/api/panels/items", nil)
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("list status: %d body=%s", rr.Code, rr.Body.String())
		}

		var payload map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		schema, ok := payload["schema"].(map[string]any)
		if !ok {
			t.Fatalf("expected schema in payload")
		}
		actions, ok := schema["actions"].([]any)
		if !ok {
			t.Fatalf("expected schema.actions array, got %T", schema["actions"])
		}
		names := map[string]bool{}
		for _, entry := range actions {
			obj, _ := entry.(map[string]any)
			names[toString(obj["name"])] = true
		}
		if !names["row_action"] || !names["any_action"] {
			t.Fatalf("expected row and any actions in list schema, got %+v", names)
		}
		if names["detail_action"] {
			t.Fatalf("did not expect detail_action in list schema, got %+v", names)
		}
	})
}

func TestPanelRoutesActionIdempotentFallbackGeneratesKey(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
		defer adm.Commands().Reset()
		server := router.NewHTTPServer()
		r := server.Router()

		repo := NewMemoryRepository()
		cmd := &calledCommand{}
		if _, err := RegisterCommand(adm.Commands(), cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(adm.Commands(), "items.send", func(payload map[string]any, ids []string) (calledCommandMsg, error) {
			return calledCommandMsg{Payload: payload}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		builder := (&PanelBuilder{}).
			WithRepository(repo).
			ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
			FormFields(Field{Name: "name", Label: "Name", Type: "text"}).
			Actions(Action{
				Name:            "send",
				CommandName:     "items.send",
				Idempotent:      true,
				PayloadRequired: []string{"idempotency_key"},
			})
		if _, err := adm.RegisterPanel("items", builder); err != nil {
			t.Fatalf("register panel: %v", err)
		}
		if err := adm.Initialize(r); err != nil {
			t.Fatalf("initialize: %v", err)
		}

		req := httptest.NewRequest("POST", "/admin/api/panels/items/actions/send", strings.NewReader(`{"id":"item-1"}`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("expected success status 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		if !cmd.called {
			t.Fatalf("expected command execution for idempotent action")
		}
		idempotencyKey := toString(cmd.payload["idempotency_key"])
		if idempotencyKey == "" {
			t.Fatalf("expected generated idempotency key in command payload")
		}
	})
}

func TestNotificationsRoutes(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureNotifications, FeatureDashboard)})
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
	}
	actorID := uuid.New()
	feed := stubActivityFeedQuery{
		page: usertypes.ActivityPage{
			Records: []usertypes.ActivityRecord{
				{
					ID:         uuid.New(),
					ActorID:    actorID,
					Verb:       "created",
					ObjectType: "item",
					ObjectID:   "item-1",
					Channel:    "admin",
					OccurredAt: time.Now().UTC(),
				},
			},
			Total:      1,
			NextOffset: 1,
			HasMore:    false,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: feed,
		FeatureGate:       featureGateFromKeys(FeatureDashboard),
	})
	_ = adm.activity.Record(context.Background(), ActivityEntry{Actor: actorID.String(), Action: "created", Object: "item"})

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/activity?limit=1", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: actorID.String()}))
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard)})
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureBulk, FeatureCommands, FeatureJobs, FeatureCMS)})
	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("init: %v", err)
	}

	req := httptest.NewRequest("POST", "/admin/api/bulk", strings.NewReader(`{"name":"cleanup","total":5,"source":"tests","ref":"job-123"}`))
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
	payload, _ := first["payload"].(map[string]any)
	if payload == nil {
		t.Fatalf("expected payload metadata in bulk job")
	}
	if source, _ := payload["source"].(string); source != "tests" {
		t.Fatalf("expected payload source metadata, got %v", payload["source"])
	}
	if ref, _ := payload["ref"].(string); ref != "job-123" {
		t.Fatalf("expected payload ref metadata, got %v", payload["ref"])
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureMedia, FeatureCMS)})
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureExport, FeatureBulk, FeatureMedia, FeatureCMS, FeatureCommands, FeatureJobs)})
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

	req := httptest.NewRequest("GET", "/admin/api/panels/items", nil)
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
	registry.WithTestRegistry(func() {
		cfg := Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		}
		adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureJobs, FeatureCommands)})
		defer adm.Commands().Reset()
		cmd := &cronCommand{}
		if _, err := RegisterCommand(adm.Commands(), cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(adm.Commands(), "jobs.cleanup", func(payload map[string]any, ids []string) (cronCommandMsg, error) {
			return cronCommandMsg{}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

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
	})
}
func TestSearchRouteReturnsResults(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureSearch)})
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
