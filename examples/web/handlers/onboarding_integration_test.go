package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type onboardingTestEnv struct {
	app  *fiber.App
	deps stores.UserDependencies
}

type passwordResetRow struct {
	JTI       string     `bun:"jti"`
	UserID    uuid.UUID  `bun:"user_id"`
	IssuedAt  *time.Time `bun:"issued_at"`
	ExpiresAt *time.Time `bun:"expires_at"`
}

func TestOnboardingInviteAcceptFlow(t *testing.T) {
	t.Helper()

	env := setupOnboardingTestEnv(t, map[string]bool{
		setup.FeatureUserInvites:      true,
		setup.FeaturePasswordReset:    true,
		setup.FeatureSelfRegistration: true,
	}, setup.RegistrationConfig{Mode: setup.RegistrationOpen})

	invitePayload := map[string]any{
		"email":      "invitee@example.com",
		"first_name": "Invite",
		"last_name":  "User",
		"role":       "admin",
	}
	inviteResp, status := doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/invite", invitePayload)
	if status != http.StatusCreated {
		t.Fatalf("expected invite status 201, got %d", status)
	}

	token := payloadString(inviteResp, "token")
	if token == "" {
		t.Fatalf("expected invite token")
	}
	userID := payloadString(inviteResp, "user_id")
	if userID == "" {
		t.Fatalf("expected invite user id")
	}

	acceptResp, status := doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/invite/accept", map[string]any{
		"token":    token,
		"password": "NewInvitePass123!",
	})
	if status != http.StatusOK {
		t.Fatalf("expected invite accept status 200, got %d", status)
	}
	if payloadString(acceptResp, "status") != "active" {
		t.Fatalf("expected invite accept status active, got %v", acceptResp["status"])
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		t.Fatalf("parse user id: %v", err)
	}
	user, err := env.deps.AuthRepo.GetByID(context.Background(), userUUID)
	if err != nil {
		t.Fatalf("load invited user: %v", err)
	}
	if user == nil || user.Status != userstypes.LifecycleStateActive {
		t.Fatalf("expected invited user to be active, got %#v", user)
	}

	payloadMap, err := env.deps.SecureLinks.Validate(token)
	if err != nil {
		t.Fatalf("validate invite token: %v", err)
	}
	jti := strings.TrimSpace(fmt.Sprint(payloadMap["jti"]))
	if jti == "" {
		t.Fatalf("expected invite jti in payload")
	}
	record, err := env.deps.UserTokenRepo.GetTokenByJTI(context.Background(), userstypes.UserTokenInvite, jti)
	if err != nil {
		t.Fatalf("load invite token record: %v", err)
	}
	if record == nil {
		t.Fatalf("expected invite token record")
	}
	if record.Status != userstypes.UserTokenStatusUsed && record.UsedAt.IsZero() {
		t.Fatalf("expected invite token consumed, got status=%s used_at=%v", record.Status, record.UsedAt)
	}
}

func TestOnboardingPasswordResetRequestConfirmFlow(t *testing.T) {
	t.Helper()

	env := setupOnboardingTestEnv(t, map[string]bool{
		setup.FeatureUserInvites:      true,
		setup.FeaturePasswordReset:    true,
		setup.FeatureSelfRegistration: true,
	}, setup.RegistrationConfig{Mode: setup.RegistrationOpen})

	user, err := env.deps.AuthRepo.GetByIdentifier(context.Background(), "admin@example.com")
	if err != nil || user == nil {
		t.Fatalf("load seed user: %v user=%v", err, user)
	}

	resetResp, status := doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/password/reset/request", map[string]any{
		"identifier": user.Email,
	})
	if status != http.StatusAccepted {
		t.Fatalf("expected reset request status 202, got %d", status)
	}
	if payloadString(resetResp, "expires_at") == "" {
		t.Fatalf("expected reset request expires_at")
	}

	resetRow, err := loadLatestResetRow(context.Background(), env.deps.DB, user.ID)
	if err != nil {
		t.Fatalf("load reset row: %v", err)
	}

	payload := map[string]any{
		"action":  "password_reset",
		"jti":     resetRow.JTI,
		"user_id": resetRow.UserID.String(),
	}
	if resetRow.IssuedAt != nil && !resetRow.IssuedAt.IsZero() {
		payload["issued_at"] = resetRow.IssuedAt.UTC().Format(time.RFC3339Nano)
	}
	if resetRow.ExpiresAt != nil && !resetRow.ExpiresAt.IsZero() {
		payload["expires_at"] = resetRow.ExpiresAt.UTC().Format(time.RFC3339Nano)
	}

	token, err := env.deps.SecureLinks.Generate(command.SecureLinkRoutePasswordReset, payload)
	if err != nil {
		t.Fatalf("generate reset token: %v", err)
	}

	confirmResp, status := doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/password/reset/confirm", map[string]any{
		"token":    token,
		"password": "ResetPass123!",
	})
	if status != http.StatusOK {
		t.Fatalf("expected reset confirm status 200, got %d", status)
	}
	if payloadString(confirmResp, "status") != "reset" {
		t.Fatalf("expected reset status reset, got %v", confirmResp["status"])
	}

	record, err := env.deps.ResetRepo.GetResetByJTI(context.Background(), resetRow.JTI)
	if err != nil {
		t.Fatalf("load reset record: %v", err)
	}
	if record == nil {
		t.Fatalf("expected reset record")
	}
	if record.Status != userstypes.PasswordResetStatusChanged && record.UsedAt.IsZero() {
		t.Fatalf("expected reset record consumed, got status=%s used_at=%v", record.Status, record.UsedAt)
	}
}

func TestOnboardingSelfRegistrationToggle(t *testing.T) {
	t.Helper()

	flags := map[string]bool{
		setup.FeatureUserInvites:      true,
		setup.FeaturePasswordReset:    true,
		setup.FeatureSelfRegistration: false,
	}
	env := setupOnboardingTestEnv(t, flags, setup.RegistrationConfig{Mode: setup.RegistrationOpen})

	registerPayload := map[string]any{
		"email":      "new.user@example.com",
		"first_name": "New",
		"last_name":  "User",
	}
	resp, status := doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/register", registerPayload)
	if status != http.StatusForbidden {
		t.Fatalf("expected registration disabled status 403, got %d", status)
	}
	if textCode := errorTextCode(resp); textCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED text_code, got %q", textCode)
	}

	flags[setup.FeatureSelfRegistration] = true
	resp, status = doOnboardingJSONRequest(t, env.app, http.MethodPost, "/admin/api/onboarding/register", registerPayload)
	if status != http.StatusCreated {
		t.Fatalf("expected registration enabled status 201, got %d", status)
	}
	if payloadString(resp, "token") == "" {
		t.Fatalf("expected registration token")
	}
	if payloadString(resp, "mode") != string(setup.RegistrationOpen) {
		t.Fatalf("expected registration mode open, got %v", resp["mode"])
	}
}

func setupOnboardingTestEnv(t *testing.T, flags map[string]bool, registration setup.RegistrationConfig) onboardingTestEnv {
	t.Helper()

	dsn := fmt.Sprintf("file:onboarding_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, svc, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}
	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en", Title: "Admin"}
	app := setupOnboardingTestApp(t, cfg, deps, svc, flags, registration)
	return onboardingTestEnv{app: app, deps: deps}
}

func setupOnboardingTestApp(t *testing.T, cfg admin.Config, deps stores.UserDependencies, svc *userssvc.Service, flags map[string]bool, registration setup.RegistrationConfig) *fiber.App {
	t.Helper()

	onboardingHandlers := &OnboardingHandlers{
		UsersService: svc,
		AuthRepo:     deps.AuthRepo,
		FeatureFlags: flags,
		Registration: registration,
		Config:       cfg,
		SecureLinks:  deps.SecureLinks,
		TokenRepo:    deps.UserTokenRepo,
		ResetRepo:    deps.ResetRepo,
	}

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: false,
			StrictRouting:     false,
			ErrorHandler:      quickstart.NewFiberErrorHandler(nil, cfg, true),
		})
		app.Use(func(c *fiber.Ctx) error {
			claims := &authlib.JWTClaims{
				UID:      uuid.NewString(),
				UserRole: string(authlib.RoleAdmin),
				Resources: map[string]string{
					"admin.users": string(authlib.RoleOwner),
				},
			}
			ctx := authlib.WithClaimsContext(c.UserContext(), claims)
			if actor := authlib.ActorContextFromClaims(claims); actor != nil {
				ctx = authlib.WithActorContext(ctx, actor)
			}
			c.SetUserContext(ctx)
			return c.Next()
		})
		return app
	})

	r := adapter.Router()
	err := quickstart.RegisterOnboardingRoutes(r, cfg, quickstart.OnboardingHandlers{
		Invite:               onboardingHandlers.Invite,
		VerifyInvite:         onboardingHandlers.VerifyInvite,
		AcceptInvite:         onboardingHandlers.AcceptInvite,
		SelfRegister:         onboardingHandlers.SelfRegister,
		ConfirmRegistration:  onboardingHandlers.ConfirmRegistration,
		RequestPasswordReset: onboardingHandlers.RequestPasswordReset,
		ConfirmPasswordReset: onboardingHandlers.ConfirmPasswordReset,
		TokenMetadata:        onboardingHandlers.TokenMetadata,
	})
	if err != nil {
		t.Fatalf("register onboarding routes: %v", err)
	}

	adapter.Init()
	return adapter.WrappedRouter()
}

func doOnboardingJSONRequest(t *testing.T, app *fiber.App, method, url string, body map[string]any) (map[string]any, int) {
	t.Helper()

	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}
	req := httptest.NewRequest(method, url, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
	}

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request %s %s: %v", method, url, err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	payload := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &payload); err != nil {
			t.Fatalf("decode response for %s %s (status %d): %v\nbody: %s", method, url, resp.StatusCode, err, string(raw))
		}
	}
	return payload, resp.StatusCode
}

func payloadString(payload map[string]any, key string) string {
	if payload == nil {
		return ""
	}
	value, ok := payload[key]
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func errorTextCode(payload map[string]any) string {
	raw, ok := payload["error"]
	if !ok {
		return ""
	}
	errMap, ok := raw.(map[string]any)
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(errMap["text_code"]))
}

func loadLatestResetRow(ctx context.Context, db *bun.DB, userID uuid.UUID) (passwordResetRow, error) {
	row := passwordResetRow{}
	err := db.NewSelect().
		Table("password_reset").
		Column("jti", "user_id", "issued_at", "expires_at").
		Where("user_id = ?", userID).
		OrderExpr("created_at DESC").
		Limit(1).
		Scan(ctx, &row)
	return row, err
}
