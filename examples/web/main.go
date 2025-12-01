package main

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func main() {
	cfg := admin.Config{
		Title:           "go-admin example",
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableDashboard: false,
		EnableCMS:       false,
		EnableCommands:  true,
	}

	adm := admin.New(cfg)
	server := router.NewFiberAdapter()
	r := server.Router()

	// Dashboard: register simple providers and default instances.
	dash := adm.DashboardService()
	dash.RegisterProvider("admin.widget.user_stats", func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
		_ = ctx
		metric := cfg["metric"]
		return map[string]any{
			"title":  cfg["title"],
			"metric": metric,
			"value":  42,
		}, nil
	})
	dash.AddInstance("admin.dashboard.main", "admin.widget.user_stats", map[string]any{
		"title":  "Total Users",
		"metric": "total",
	})

	// Enable CMS demo panels with seed data.
	if err := adm.RegisterCMSDemoPanels(); err != nil {
		log.Fatalf("failed to register CMS demo panels: %v", err)
	}

	// Stub panel with in-memory repo and a sample action backed by command registry.
	repo := admin.NewMemoryRepository()
	panelBuilder := &admin.PanelBuilder{}
	panelBuilder.
		WithRepository(repo).
		ListFields(admin.Field{Name: "id", Label: "ID", Type: "text"}, admin.Field{Name: "name", Label: "Name", Type: "text"}).
		FormFields(admin.Field{Name: "name", Label: "Name", Type: "text", Required: true}).
		DetailFields(admin.Field{Name: "id", Label: "ID", Type: "text"}, admin.Field{Name: "name", Label: "Name", Type: "text"}).
		Actions(admin.Action{Name: "refresh", CommandName: "example.refresh"})

	cmd := &refreshCommand{}
	adm.Commands().Register(cmd)
	if _, err := adm.RegisterPanel("items", panelBuilder); err != nil {
		log.Fatalf("failed to register panel: %v", err)
	}

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("failed to initialize admin: %v", err)
	}

	log.Println("Example admin available at http://localhost:8080/admin/health")
	if err := server.Serve(":8080"); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

type refreshCommand struct{}

func (refreshCommand) Name() string { return "example.refresh" }

func (refreshCommand) Execute(_ context.Context) error {
	log.Println("refresh command executed")
	return nil
}
