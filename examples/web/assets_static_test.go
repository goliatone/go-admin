package main

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-router"
)

func TestEmbeddedAssetsServed(t *testing.T) {
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: false,
			StrictRouting:     false,
		})
	})
	r := adapter.Router()

	assetsFS := helpers.MustSubFS(webFS, "assets")
	if assetsFS == nil {
		t.Fatal("expected embedded assets FS")
	}

	r.Static("/admin/assets", ".", router.Static{FS: assetsFS, Root: "."})
	adapter.Init()
	app := adapter.WrappedRouter()

	tests := []struct {
		path string
	}{
		{path: "/admin/assets/output.css"},
		{path: "/admin/assets/logo.svg"},
		{path: "/admin/assets/sidebar.js"},
		{path: "/admin/assets/dist/dashboard/index.js"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.path, nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("request %s failed: %v", tt.path, err)
		}
		if resp.StatusCode != 200 {
			body, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			t.Fatalf("GET %s status=%d body=%q", tt.path, resp.StatusCode, string(body))
		}
		_ = resp.Body.Close()
	}
}

func TestEmbeddedAssetsServedWithCatchAll(t *testing.T) {
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: false,
			StrictRouting:     false,
		})
	})
	r := adapter.Router()

	assetsFS := helpers.MustSubFS(webFS, "assets")
	if assetsFS == nil {
		t.Fatal("expected embedded assets FS")
	}

	r.Static("/admin/assets", ".", router.Static{FS: assetsFS, Root: "."})
	r.Get("/*", func(c router.Context) error {
		return c.Status(418).SendString("catch-all")
	})

	adapter.Init()
	app := adapter.WrappedRouter()

	req := httptest.NewRequest("GET", "/admin/assets/output.css", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected static assets handler to win; status=%d body=%q", resp.StatusCode, string(body))
	}
}
