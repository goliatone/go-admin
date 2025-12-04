package main

import (
	"context"
	"log"
	"path"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-router"
)

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
		Features: admin.Features{
			Dashboard: true,
			Search:    true,
			CMS:       true,
			Commands:  true,
			Jobs:      true,
		},
	}

	adm := admin.New(cfg)
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

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath: true,
		})
		app.Use(fiberlogger.New())
		return app
	})
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("initialize admin: %v", err)
	}

	log.Println("Commerce admin ready at http://localhost:8081/admin")
	log.Println("  Dashboard:", path.Join(cfg.BasePath, "api/dashboard"))
	log.Println("  Navigation:", path.Join(cfg.BasePath, "api/navigation"))
	log.Println("  Users API:", path.Join(cfg.BasePath, "api/users"))
	log.Println("  Products API:", path.Join(cfg.BasePath, "api/products"))
	log.Println("  Orders API:", path.Join(cfg.BasePath, "api/orders"))
	log.Println("  Search:", path.Join(cfg.BasePath, "api/search"))
	log.Println("  Jobs:", path.Join(cfg.BasePath, "api/jobs"))

	if err := server.Serve(":8081"); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
