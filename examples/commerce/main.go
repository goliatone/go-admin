package main

import (
	"context"
	"log"
	"path"
	"path/filepath"
	"runtime"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-featuregate/adapters/configadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
	"github.com/goliatone/go-router"
)

func staticRoot() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "./static"
	}
	return filepath.Join(filepath.Dir(filename), "static")
}

func featureGateFromDefaults(defaults map[string]bool) fggate.FeatureGate {
	return resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(defaults)))
}

func main() {
	ctx := context.Background()
	dataStores, err := stores.Seed(ctx)
	if err != nil {
		log.Fatalf("seed stores: %v", err)
	}

	cfg := admin.Config{
		Title:         "Commerce Admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "admin",
		ThemeVariant:  "light",
	}

	featureDefaults := map[string]bool{
		"dashboard": true,
		"search":    true,
		"cms":       true,
		"commands":  true,
		"jobs":      true,
	}
	adm, err := admin.New(cfg, admin.Dependencies{FeatureGate: featureGateFromDefaults(featureDefaults)})
	if err != nil {
		log.Fatalf("failed to construct admin: %v", err)
	}
	_ = setupAuth(adm, dataStores)

	module := &commerceModule{
		stores:        dataStores,
		basePath:      cfg.BasePath,
		menuCode:      cfg.NavMenuCode,
		defaultLocale: cfg.DefaultLocale,
	}
	if err := adm.RegisterModule(module); err != nil {
		log.Fatalf("register module: %v", err)
	}

	var fiberApp *fiber.App
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		fiberApp = fiber.New(fiber.Config{
			UnescapePath:      true,
			StrictRouting:     false,
			EnablePrintRoutes: true,
		})
		fiberApp.Use(fiberlogger.New())
		return fiberApp
	})
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("initialize admin: %v", err)
	}

	// Serve static demo UI (after admin routes so it acts as fallback)
	fiberApp.Static("/", staticRoot(), fiber.Static{
		Index: "index.html",
	})

	log.Println("Commerce admin ready at http://localhost:8081")
	log.Println("  Demo UI: http://localhost:8081/")
	log.Println("  Dashboard API:", path.Join(cfg.BasePath, "api/dashboard"))
	log.Println("  Navigation API:", path.Join(cfg.BasePath, "api/navigation"))
	log.Println("  Users API:", path.Join(cfg.BasePath, "api/users"))
	log.Println("  Products API:", path.Join(cfg.BasePath, "api/products"))
	log.Println("  Orders API:", path.Join(cfg.BasePath, "api/orders"))
	log.Println("  Search API:", path.Join(cfg.BasePath, "api/search"))
	log.Println("  Jobs API:", path.Join(cfg.BasePath, "api/jobs"))

	if err := server.Serve(":8081"); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
