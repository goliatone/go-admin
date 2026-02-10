package handlers

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type rejectingValidator struct{}

func (rejectingValidator) Validate(context.Context, stores.Scope, string) (stores.SigningTokenRecord, error) {
	return stores.SigningTokenRecord{}, goerrors.New("expired", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode(string(services.ErrorCodeTokenExpired))
}

type mapAuthorizer struct {
	allowed map[string]bool
}

func (a mapAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[action]
}

func setupRegisterTestApp(t *testing.T, opts ...RegisterOption) *fiber.App {
	t.Helper()

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})

	routes := BuildRouteSet(nil, "/admin", "admin.api.v1")
	Register(adapter.Router(), routes, opts...)
	adapter.Init()
	return adapter.WrappedRouter()
}

func TestRegisterAdminRoutesRequirePermission(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/esign", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestRegisterAdminRoutesAllowPermission(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestRegisterSignerRoutesRemainPublic(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/test-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected signer route to stay reachable, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "test-token") {
		t.Fatalf("expected token echo, got %s", string(body))
	}
}

func TestRegisterSignerSessionReturns410ForExpiredToken(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	baseNow := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	issuer := stores.NewTokenService(tokenStore,
		stores.WithTokenTTL(5*time.Minute),
		stores.WithTokenClock(func() time.Time { return baseNow }),
	)
	issued, err := issuer.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	expiredValidator := stores.NewTokenService(tokenStore, stores.WithTokenClock(func() time.Time { return baseNow.Add(2 * time.Hour) }))
	if _, err := expiredValidator.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatal("expected token service validation to fail for expired token")
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(expiredValidator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "TOKEN_EXPIRED") {
		t.Fatalf("expected TOKEN_EXPIRED response, got %s", string(body))
	}
}

func TestWithSignerTokenValidatorOptionSetsConfig(t *testing.T) {
	validator := stores.NewTokenService(stores.NewInMemoryStore())
	cfg := buildRegisterConfig([]RegisterOption{WithSignerTokenValidator(validator)})
	if cfg.tokenValidator == nil {
		t.Fatal("expected token validator to be configured")
	}
}

func TestSignerTokenValidatorIsUsedByRoute(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(rejectingValidator{}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
}

func TestRegisterSignerSessionReturns410ForRevokedToken(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	validator := stores.NewTokenService(tokenStore)
	issued, err := validator.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if err := validator.Revoke(ctx, scope, "agreement-1", "recipient-1"); err != nil {
		t.Fatalf("Revoke: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(validator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "TOKEN_REVOKED") {
		t.Fatalf("expected TOKEN_REVOKED response, got %s", string(body))
	}
}

func TestRegisterAdminRouteDeniesCrossTenantScope(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status?tenant_id=tenant-2&org_id=org-1", nil)
	req.Header.Set("X-Actor-Tenant-ID", "tenant-1")
	req.Header.Set("X-Actor-Org-ID", "org-1")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "SCOPE_DENIED") {
		t.Fatalf("expected SCOPE_DENIED response, got %s", string(body))
	}
}

func TestRegisterSignerRouteDeniesCrossTenantScope(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	validator := stores.NewTokenService(tokenStore)
	issued, err := validator.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(validator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token+"?tenant_id=tenant-2&org_id=org-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "SCOPE_DENIED") {
		t.Fatalf("expected SCOPE_DENIED response, got %s", string(body))
	}
}
