package admin

import (
	"context"
	"net/http/httptest"
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
