package main

import (
	"bytes"
	"context"
	"embed"
	"html/template"
	"io/fs"
	"log"
	"path"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

//go:embed assets/* templates/*
var webFS embed.FS

func main() {
	cfg := admin.Config{
		Title:         "go-admin example",
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "admin",
		ThemeVariant:  "light",
		ThemeTokens: map[string]string{
			"primary": "#2563eb",
			"accent":  "#f59e0b",
		},
		EnableDashboard:     true,
		EnableCMS:           false,
		EnableCommands:      true,
		EnableSettings:      true,
		EnableSearch:        true,
		EnableNotifications: true,
		EnableJobs:          true,
	}

	adm := admin.New(cfg)
	adm.WithThemeProvider(func(ctx context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
		_ = ctx
		selection := &admin.ThemeSelection{
			Name:       selector.Name,
			Variant:    selector.Variant,
			Tokens:     map[string]string{"primary": "#2563eb", "accent": "#f59e0b"},
			Assets:     map[string]string{"logo": path.Join(cfg.BasePath, "assets/logo.svg")},
			ChartTheme: selector.Variant,
		}
		if selection.Name == "" {
			selection.Name = "admin"
		}
		return selection, nil
	})
	server := router.NewFiberAdapter()
	r := server.Router()

	tmpl := template.Must(template.ParseFS(mustSubFS(webFS, "templates"), "admin.html"))
	assetsFS := mustSubFS(webFS, "assets")

	// Static assets for the demo UI (CSS, logos, etc).
	if assetsFS != nil {
		r.Static(path.Join(cfg.BasePath, "assets"), ".", router.Static{
			FS:   assetsFS,
			Root: ".",
		})
	}

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

	settings := adm.SettingsService()
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.tagline",
		Title:       "Site Tagline",
		Description: "Shown in headers and emails",
		Default:     "Composable admin",
		Type:        "string",
		Group:       "site",
	})
	if err := settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSite,
		Values: map[string]any{"site.tagline": "Composable admin example"},
	}); err != nil {
		log.Fatalf("failed to seed settings: %v", err)
	}

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("failed to initialize admin: %v", err)
	}

	// Seed notifications and activity feed for the demo UI.
	if svc := adm.NotificationService(); svc != nil {
		_, _ = svc.Add(context.Background(), admin.Notification{Title: "New comment", Message: "A user replied to your post"})
		_, _ = svc.Add(context.Background(), admin.Notification{Title: "Deployment", Message: "Production deploy succeeded"})
	}
	_ = adm.ActivityFeed().Record(context.Background(), admin.ActivityEntry{Actor: "system", Action: "synced", Object: "orders"})
	_ = adm.ActivityFeed().Record(context.Background(), admin.ActivityEntry{Actor: "admin", Action: "updated", Object: "settings"})

	// Sample job command with cron metadata.
	job := &backupJob{}
	adm.Commands().Register(job)

	// Simple HTML entrypoint consuming the JSON APIs.
	r.Get(cfg.BasePath, func(c router.Context) error {
		var buf bytes.Buffer
		if err := tmpl.Execute(&buf, map[string]any{
			"Title":    cfg.Title,
			"BasePath": cfg.BasePath,
		}); err != nil {
			return err
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.Send(buf.Bytes())
	})

	log.Println("Example admin available at http://localhost:8080/admin (health at /admin/health)")
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

type backupJob struct {
	runCount int
}

func (b *backupJob) Name() string { return "jobs.backup" }
func (b *backupJob) Execute(_ context.Context) error {
	b.runCount++
	log.Println("backup job executed")
	return nil
}

func (b *backupJob) CronSpec() string {
	return "@every 1h"
}

func (b *backupJob) CronHandler() func() error {
	return func() error { return b.Execute(context.Background()) }
}

// mustSubFS returns a sub-FS or nil without failing the example.
func mustSubFS(fsys embed.FS, dir string) fs.FS {
	sub, err := fs.Sub(fsys, dir)
	if err != nil {
		log.Printf("failed to access %s: %v", dir, err)
		return nil
	}
	return sub
}
