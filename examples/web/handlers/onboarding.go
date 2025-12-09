package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
)

// OnboardingHandlers surfaces invite, registration, and password reset flows.
type OnboardingHandlers struct {
	UsersService *userssvc.Service
	AuthRepo     userstypes.AuthRepository
	UserRepo     authlib.Users
	FeatureFlags map[string]bool
	Registration setup.RegistrationConfig
	Notifier     *setup.OnboardingNotifier
	Config       admin.Config
}

// Invite issues a new invite using go-users UserInvite command.
func (h *OnboardingHandlers) Invite(c router.Context) error {
	if err := h.requireFeature(setup.FeatureUserInvites); err != nil {
		return err
	}
	if err := requireUsersPermission(c.Context(), "create"); err != nil {
		return err
	}
	if h.UsersService == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	var payload struct {
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	payload.Email = strings.TrimSpace(payload.Email)
	if payload.Email == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "email required"})
	}

	actor := helpers.ActorRefFromContext(c.Context())
	if actor.ID == uuid.Nil {
		return goerrors.New("missing actor", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	result := &command.UserInviteResult{}
	input := command.UserInviteInput{
		Email:     payload.Email,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Role:      normalizeRole(payload.Role),
		Metadata:  map[string]any{"source": "admin.invite"},
		Actor:     actor,
		Scope:     helpers.ScopeFromContext(c.Context()),
		Result:    result,
	}
	if err := h.UsersService.Commands().UserInvite.Execute(c.Context(), input); err != nil {
		return err
	}

	return c.JSON(fiber.StatusCreated, map[string]any{
		"user_id":    result.User.ID.String(),
		"token":      result.Token,
		"expires_at": result.ExpiresAt,
	})
}

// VerifyInvite validates an invite token without mutating state.
func (h *OnboardingHandlers) VerifyInvite(c router.Context) error {
	if err := h.requireFeature(setup.FeatureUserInvites); err != nil {
		return err
	}
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "token required"})
	}

	user, invite, err := h.findUserByToken(c.Context(), "invite", token)
	if err != nil {
		return err
	}

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id":    user.ID.String(),
		"email":      user.Email,
		"status":     strings.ToLower(string(user.Status)),
		"expires_at": invite.ExpiresAt,
		"valid":      !invite.ExpiresAt.Before(time.Now()),
	})
}

// AcceptInvite sets the password for an invite token and activates the account.
func (h *OnboardingHandlers) AcceptInvite(c router.Context) error {
	if err := h.requireFeature(setup.FeatureUserInvites); err != nil {
		return err
	}
	if h.UsersService == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	payload.Token = strings.TrimSpace(payload.Token)
	if payload.Token == "" || strings.TrimSpace(payload.Password) == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "token and password required"})
	}

	user, invite, err := h.findUserByToken(c.Context(), "invite", payload.Token)
	if err != nil {
		return err
	}
	if !invite.UsedAt.IsZero() {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invite already used"})
	}
	if invite.ExpiresAt.Before(time.Now()) {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invite expired"})
	}

	hash, err := authlib.HashPassword(strings.TrimSpace(payload.Password))
	if err != nil {
		return err
	}

	userID := user.ID
	scope := invite.Scope
	if scope.TenantID == uuid.Nil && scope.OrgID == uuid.Nil {
		scope = helpers.ScopeFromContext(c.Context())
	}
	if err := h.UsersService.Commands().UserPasswordReset.Execute(c.Context(), command.UserPasswordResetInput{
		UserID:          userID,
		NewPasswordHash: hash,
		Actor:           userstypes.ActorRef{ID: userID, Type: "user"},
		Scope:           scope,
	}); err != nil {
		return err
	}

	if err := h.UsersService.Commands().UserLifecycleTransition.Execute(c.Context(), command.UserLifecycleTransitionInput{
		UserID: userID,
		Target: userstypes.LifecycleStateActive,
		Actor:  userstypes.ActorRef{ID: userID, Type: "user"},
		Scope:  scope,
		Metadata: map[string]any{
			"invite_token": payload.Token,
		},
	}); err != nil {
		return err
	}

	_ = h.updateTokenUsage(c.Context(), "invite", userID, payload.Token)

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id": userID.String(),
		"status":  "active",
	})
}

// SelfRegister creates a pending user when self-registration is enabled.
func (h *OnboardingHandlers) SelfRegister(c router.Context) error {
	if err := h.requireFeature(setup.FeatureSelfRegistration); err != nil {
		return err
	}
	if h.UsersService == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.Registration.Mode == setup.RegistrationClosed {
		return c.JSON(fiber.StatusForbidden, map[string]any{"error": "registration closed"})
	}

	var payload struct {
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	payload.Email = strings.TrimSpace(payload.Email)
	if payload.Email == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "email required"})
	}
	if h.Registration.Mode == setup.RegistrationAllowlist && !h.Registration.AllowsEmail(payload.Email) {
		return c.JSON(fiber.StatusForbidden, map[string]any{"error": "email not allowed"})
	}

	result := &command.UserInviteResult{}
	input := command.UserInviteInput{
		Email:     payload.Email,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Role:      normalizeRole(payload.Role),
		Metadata: map[string]any{
			"self_registration": true,
		},
		Actor:  userstypes.ActorRef{ID: selfRegistrationActorID(), Type: "system"},
		Scope:  helpers.ScopeFromContext(c.Context()),
		Result: result,
	}
	if err := h.UsersService.Commands().UserInvite.Execute(c.Context(), input); err != nil {
		return err
	}

	return c.JSON(fiber.StatusCreated, map[string]any{
		"user_id":    result.User.ID.String(),
		"token":      result.Token,
		"expires_at": result.ExpiresAt,
		"mode":       h.Registration.Mode,
	})
}

// RequestPasswordReset issues a password reset token guarded by rate limits.
func (h *OnboardingHandlers) RequestPasswordReset(c router.Context) error {
	if err := h.requireFeature(setup.FeaturePasswordReset); err != nil {
		return err
	}
	if h.UsersService == nil || h.AuthRepo == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	var payload struct {
		Identifier string `json:"identifier"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	identifier := strings.TrimSpace(payload.Identifier)
	if identifier == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "identifier required"})
	}

	user, err := h.AuthRepo.GetByIdentifier(c.Context(), identifier)
	if err != nil {
		return err
	}
	if !isEligibleForReset(user) {
		return goerrors.New("user not eligible for reset", goerrors.CategoryAuthz).
			WithCode(goerrors.CodeForbidden).
			WithTextCode("RESET_NOT_ALLOWED")
	}

	reset := parseTokenEnvelope(user.Metadata, "password_reset")
	now := time.Now().UTC()
	if !reset.IssuedAt.IsZero() && now.Sub(reset.IssuedAt) < 5*time.Minute {
		return goerrors.New("reset already requested", goerrors.CategoryRateLimit).
			WithCode(goerrors.CodeTooManyRequests).
			WithTextCode("RESET_RATE_LIMIT")
	}

	reset = tokenEnvelope{
		Token:     uuid.NewString(),
		IssuedAt:  now,
		ExpiresAt: now.Add(1 * time.Hour),
	}
	setTokenEnvelope(user, "password_reset", reset)
	if _, err := h.AuthRepo.Update(c.Context(), user); err != nil {
		return err
	}

	if h.UsersService != nil && h.UsersService.Commands().LogActivity != nil {
		_ = h.UsersService.Commands().LogActivity.Execute(c.Context(), command.ActivityLogInput{
			Record: userstypes.ActivityRecord{
				UserID:     user.ID,
				ActorID:    user.ID,
				Verb:       "user.password.reset.request",
				ObjectType: "user",
				ObjectID:   user.ID.String(),
				Channel:    "users",
				Data: map[string]any{
					"user_email": user.Email,
				},
			},
		})
	}

	return c.JSON(http.StatusAccepted, map[string]any{
		"status":     "ok",
		"expires_at": reset.ExpiresAt,
	})
}

// ConfirmPasswordReset applies the password reset token and sets a new password.
func (h *OnboardingHandlers) ConfirmPasswordReset(c router.Context) error {
	if err := h.requireFeature(setup.FeaturePasswordReset); err != nil {
		return err
	}
	if h.UsersService == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	token := strings.TrimSpace(payload.Token)
	if token == "" || strings.TrimSpace(payload.Password) == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "token and password required"})
	}

	user, reset, err := h.findUserByToken(c.Context(), "password_reset", token)
	if err != nil {
		return err
	}
	if !reset.UsedAt.IsZero() {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "token already used"})
	}
	if reset.ExpiresAt.Before(time.Now()) {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "token expired"})
	}

	hash, err := authlib.HashPassword(strings.TrimSpace(payload.Password))
	if err != nil {
		return err
	}

	if err := h.UsersService.Commands().UserPasswordReset.Execute(c.Context(), command.UserPasswordResetInput{
		UserID:          user.ID,
		NewPasswordHash: hash,
		Actor:           userstypes.ActorRef{ID: user.ID, Type: "user"},
		Scope:           reset.Scope,
	}); err != nil {
		return err
	}
	if err := h.updateTokenUsage(c.Context(), "password_reset", user.ID, token); err != nil {
		return err
	}

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id": user.ID.String(),
		"status":  "reset",
	})
}

func (h *OnboardingHandlers) requireFeature(flag string) error {
	if h == nil || h.FeatureFlags == nil {
		return goerrors.New("feature flags unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("FEATURES_MISSING")
	}
	if h.FeatureFlags[flag] {
		return nil
	}
	return goerrors.New("feature disabled", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FEATURE_DISABLED")
}

func requireUsersPermission(ctx context.Context, action string) error {
	if _, ok := authlib.GetClaims(ctx); !ok {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}
	if authlib.Can(ctx, "admin.users", action) {
		return nil
	}
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

type tokenEnvelope struct {
	Token     string
	IssuedAt  time.Time
	ExpiresAt time.Time
	Scope     userstypes.ScopeFilter
	UsedAt    time.Time
}

func parseTokenEnvelope(meta map[string]any, key string) tokenEnvelope {
	if len(meta) == 0 {
		return tokenEnvelope{}
	}
	raw, ok := meta[key].(map[string]any)
	if !ok {
		return tokenEnvelope{}
	}
	return tokenEnvelope{
		Token:     strings.TrimSpace(fmt.Sprint(raw["token"])),
		IssuedAt:  parseTime(raw["issued_at"]),
		ExpiresAt: parseTime(raw["expires_at"]),
		Scope: userstypes.ScopeFilter{
			TenantID: parseUUID(raw["tenant_id"]),
			OrgID:    parseUUID(raw["org_id"]),
		},
		UsedAt: parseTime(raw["used_at"]),
	}
}

func setTokenEnvelope(user *userstypes.AuthUser, key string, token tokenEnvelope) {
	if user == nil {
		return
	}
	if user.Metadata == nil {
		user.Metadata = map[string]any{}
	}
	user.Metadata[key] = map[string]any{
		"token":      token.Token,
		"issued_at":  token.IssuedAt.Format(time.RFC3339Nano),
		"expires_at": token.ExpiresAt.Format(time.RFC3339Nano),
		"tenant_id":  token.Scope.TenantID,
		"org_id":     token.Scope.OrgID,
	}
}

func parseTime(val any) time.Time {
	switch v := val.(type) {
	case time.Time:
		return v
	case string:
		if t, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(v)); err == nil {
			return t
		}
		if t, err := time.Parse(time.RFC3339, strings.TrimSpace(v)); err == nil {
			return t
		}
	}
	return time.Time{}
}

func parseUUID(val any) uuid.UUID {
	switch v := val.(type) {
	case uuid.UUID:
		return v
	case string:
		id, _ := uuid.Parse(strings.TrimSpace(v))
		return id
	}
	return uuid.Nil
}

func (h *OnboardingHandlers) findUserByToken(ctx context.Context, key, token string) (*authlib.User, tokenEnvelope, error) {
	if h == nil || h.UserRepo == nil {
		return nil, tokenEnvelope{}, goerrors.New("user repository not configured", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal)
	}
	users, _, err := h.UserRepo.List(ctx)
	if err != nil {
		return nil, tokenEnvelope{}, err
	}
	for _, u := range users {
		if u == nil || len(u.Metadata) == 0 {
			continue
		}
		env := parseTokenEnvelope(u.Metadata, key)
		if env.Token == "" || env.Token != token {
			continue
		}
		return u, env, nil
	}
	return nil, tokenEnvelope{}, goerrors.New("token not found", goerrors.CategoryNotFound).
		WithCode(goerrors.CodeNotFound).
		WithTextCode("TOKEN_NOT_FOUND")
}

func (h *OnboardingHandlers) updateTokenUsage(ctx context.Context, key string, userID uuid.UUID, token string) error {
	if h == nil || h.UserRepo == nil {
		return nil
	}
	user, err := h.UserRepo.GetByID(ctx, userID.String())
	if err != nil || user == nil {
		return err
	}
	if user.Metadata == nil {
		return nil
	}
	raw, ok := user.Metadata[key].(map[string]any)
	if !ok {
		return nil
	}
	if tok := strings.TrimSpace(fmt.Sprint(raw["token"])); tok != "" && tok == token {
		raw["used_at"] = time.Now().UTC().Format(time.RFC3339Nano)
		user.Metadata[key] = raw
		_, _ = h.UserRepo.Update(ctx, user)
	}
	return nil
}

func normalizeRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin", "owner":
		return "admin"
	case "editor", "member":
		return "member"
	default:
		return "guest"
	}
}

func isEligibleForReset(user *userstypes.AuthUser) bool {
	if user == nil {
		return false
	}
	switch strings.ToLower(string(user.Status)) {
	case "disabled", "archived":
		return false
	default:
		return true
	}
}

func selfRegistrationActorID() uuid.UUID {
	return uuid.MustParse("00000000-0000-0000-0000-000000000001")
}
