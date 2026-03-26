package main

import (
	"context"
	"path"
	"path/filepath"
	"runtime"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-featuregate/adapters/configadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
	glog "github.com/goliatone/go-logger/glog"
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
	rootLogger := glog.NewLogger(
		glog.WithName("examples.commerce"),
		glog.WithLoggerTypeConsole(),
	)
	configureCommerceLogging(rootLogger, rootLogger)
	logger := commerceNamedLogger("examples.commerce.bootstrap")

	ctx := context.Background()
	dataStores, err := stores.Seed(ctx)
	if err != nil {
		logger.Fatal("seed stores failed", "error", err)
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
	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate:    featureGateFromDefaults(featureDefaults),
		LoggerProvider: rootLogger,
		Logger:         rootLogger,
	})
	if err != nil {
		logger.Fatal("failed to construct admin", "error", err)
	}
	_ = setupAuth(adm, dataStores)

	module := &commerceModule{
		stores:        dataStores,
		basePath:      cfg.BasePath,
		menuCode:      cfg.NavMenuCode,
		defaultLocale: cfg.DefaultLocale,
		placements: quickstart.DefaultPlacements(admin.Config{
			NavMenuCode: cfg.NavMenuCode,
		}),
	}
	if err := adm.RegisterModule(module); err != nil {
		logger.Fatal("register module failed", "error", err)
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
		logger.Fatal("initialize admin failed", "error", err)
	}

	// Serve static demo UI (after admin routes so it acts as fallback)
	fiberApp.Static("/", staticRoot(), fiber.Static{
		Index: "index.html",
	})

	logger.Info("commerce admin ready", "url", "http://localhost:8081")
	logger.Info("demo ui", "url", "http://localhost:8081/")
	logger.Info("dashboard api", "path", path.Join(cfg.BasePath, "api/dashboard"))
	logger.Info("navigation api", "path", path.Join(cfg.BasePath, "api/navigation"))
	logger.Info("users api", "path", path.Join(cfg.BasePath, "api/users"))
	logger.Info("products api", "path", path.Join(cfg.BasePath, "api/products"))
	logger.Info("orders api", "path", path.Join(cfg.BasePath, "api/orders"))
	logger.Info("search api", "path", path.Join(cfg.BasePath, "api/search"))
	logger.Info("jobs api", "path", path.Join(cfg.BasePath, "api/jobs"))

	if err := server.Serve(":8081"); err != nil {
		logger.Fatal("server stopped", "error", err)
	}
}
