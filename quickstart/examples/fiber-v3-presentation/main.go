// Command fiber-v3-presentation previews presentation inputs in a standalone
// native app. It does not assemble an authenticated quickstart production host.
package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

//go:embed templates assets
var previewFS embed.FS

func newPresentationApp() (*fiber3.App, error) {
	cfg := admin.Config{BasePath: "/admin", Title: "Presentation preview", DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		return nil, err
	}
	assets, err := fs.Sub(previewFS, "assets")
	if err != nil {
		return nil, err
	}
	views, err := quickstart.NewFiberV3ViewEngine(client.FS(), quickstart.WithViewAdmin(adm), quickstart.WithViewBasePath(cfg.BasePath), quickstart.WithViewTemplatesFS(previewFS), quickstart.WithViewAssetsFS(assets), quickstart.WithViewReload(false))
	if err != nil {
		return nil, err
	}
	if err := quickstart.WithDefaultFiberV3DashboardRenderer(adm, views, cfg); err != nil {
		return nil, err
	}
	// These are the presentation ports handed to final host composition.
	var inputs quickstart.FiberV3ServerConfig
	quickstart.WithFiberV3Views(views)(&inputs)
	quickstart.WithFiberV3ErrorHandler(quickstart.NewFiberV3ErrorHandler(adm, cfg, false))(&inputs)
	server := router.NewFiberV3Adapter(func(*fiber3.App) *fiber3.App { return fiber3.New(inputs.Config) })
	r := server.Router()
	quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithExtraAssetsFS(assets))
	r.Get("/admin", func(c router.Context) error {
		items := []string{"Template overlays", "Escaped <values>"}
		if c.Query("state") == "empty" {
			items = nil
		}
		data := quickstart.WithAdminUIViewContext(router.ViewContext{"items": items, "page_title": "Presentation preview"}, adm, cfg, "", c)
		return quickstart.RenderTemplateView(c, "preview", data)
	})
	r.Get("/admin/denied", func(router.Context) error { return admin.ErrForbidden })
	r.Get("/admin/failure", func(router.Context) error { return fmt.Errorf("private diagnostic detail") })
	r.Get("/admin/api/denied", func(router.Context) error { return admin.ErrForbidden })
	r.Get("/admin/redirect", func(c router.Context) error { return c.Redirect("/admin", 303) })
	server.Init()
	app := server.WrappedRouter()
	app.Use(quickstart.NewFiberV3RouteMissHandler(cfg))
	return app, nil
}

func main() {
	addr := flag.String("addr", "127.0.0.1:3001", "local preview address")
	flag.Parse()
	app, err := newPresentationApp()
	if err != nil {
		log.Fatal(err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := servePresentation(ctx, app, *addr, 5*time.Second); err != nil {
		log.Fatal(err)
	}
}

func servePresentation(ctx context.Context, app *fiber3.App, address string, shutdownTimeout time.Duration) error {
	served := make(chan error, 1)
	go func() { served <- app.Listen(address, fiber3.ListenConfig{DisableStartupMessage: true}) }()
	select {
	case err := <-served:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	shutdownErr := app.ShutdownWithContext(shutdownCtx)
	select {
	case err := <-served:
		return errors.Join(shutdownErr, err)
	case <-shutdownCtx.Done():
		return errors.Join(shutdownErr, shutdownCtx.Err())
	}
}
