package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
)

type timezoneOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type timezoneResponse struct {
	Data []timezoneOption `json:"data"`
}

func setupTimezonesTestApp() *fiber.App {
	adapter := router.NewFiberV3Adapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath: true,

			DisableHeadAutoRegister: true,
			StrictRouting:           false,
			ErrorHandler:            quickstart.NewFiberV3ErrorHandler(nil, admin.Config{BasePath: "/admin"}, true),
		})

		app.Use(func(c fiber.Ctx) error {
			role := strings.TrimSpace(c.Get("X-Role"))
			if role == "" {
				return c.Next()
			}

			resourceRole := ""
			switch role {
			case string(authlib.RoleAdmin):
				resourceRole = string(authlib.RoleOwner)
			case string(authlib.RoleMember):
				resourceRole = string(authlib.RoleMember)
			default:
				resourceRole = ""
			}

			claims := &authlib.JWTClaims{
				UserRole:  role,
				Resources: map[string]string{"admin.users": ""},
			}
			if strings.EqualFold(c.Get("X-Allow-Users"), "true") {
				claims.Resources["admin.users"] = resourceRole
			}

			ctx := authlib.WithClaimsContext(c.Context(), claims)
			if actor := authlib.ActorContextFromClaims(claims); actor != nil {
				ctx = authlib.WithActorContext(ctx, actor)
			}
			c.SetContext(ctx)
			return c.Next()
		})

		return app
	})

	r := adapter.Router()
	r.Get("/admin/api/timezones", ListTimezones)
	adapter.Init()
	return adapter.WrappedRouter()
}

func TestListTimezones_Unauthorized(t *testing.T) {
	app := setupTimezonesTestApp()

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/timezones?q=utc&limit=1", nil)
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 0})
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
}

func TestListTimezones_Forbidden(t *testing.T) {
	app := setupTimezonesTestApp()

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/timezones?q=utc&limit=1", nil)
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 0})
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestListTimezones_OK(t *testing.T) {
	t.Helper()
	app := setupTimezonesTestApp()

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/timezones?q=utc&limit=1", nil)
	req = req.WithContext(context.Background())
	req.Header.Set("X-Role", string(authlib.RoleAdmin))
	req.Header.Set("X-Allow-Users", "true")
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 0})
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var payload timezoneResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 option, got %d: %#v", len(payload.Data), payload.Data)
	}
	if payload.Data[0].Value != "UTC" || payload.Data[0].Label != "UTC" {
		t.Fatalf("unexpected option: %#v", payload.Data[0])
	}
}
