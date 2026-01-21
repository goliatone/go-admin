package handlers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/pkg/admin"
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
	FeatureFlags map[string]bool
	Registration setup.RegistrationConfig
	Notifier     *setup.OnboardingNotifier
	Config       admin.Config
	SecureLinks  userstypes.SecureLinkManager
	TokenRepo    userstypes.UserTokenRepository
	ResetRepo    userstypes.PasswordResetRepository
}

// Invite issues a new invite using go-users UserInvite command.
func (h *OnboardingHandlers) Invite(c router.Context) error {
	if err := h.requireFeature(setup.FeatureUserInvites); err != nil {
		return err
	}
	if err := requireUsersPermission(c.Context(), "create"); err != nil {
		return err
	}
	if h.UsersService == nil || h.UsersService.Commands().UserInvite == nil {
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
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	payload.Email = strings.TrimSpace(payload.Email)
	if payload.Email == "" {
		return goerrors.New("email required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("EMAIL_REQUIRED")
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
	if h.UsersService == nil || h.UsersService.Commands().UserTokenValidate == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.AuthRepo == nil {
		return goerrors.New("user repository unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	token := normalizeSecureLinkToken(c.Query("token"))
	if token == "" {
		return goerrors.New("token required", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_REQUIRED")
	}

	result := &command.UserTokenValidateResult{}
	if err := h.UsersService.Commands().UserTokenValidate.Execute(c.Context(), command.UserTokenValidateInput{
		Token:     token,
		TokenType: userstypes.UserTokenInvite,
		Scope:     helpers.ScopeFromContext(c.Context()),
		Result:    result,
	}); err != nil {
		return err
	}

	record := result.Token
	payload := result.Payload
	userID := uuid.Nil
	if record != nil {
		userID = record.UserID
	}
	if userID == uuid.Nil {
		userID = payloadUUID(payload, "user_id")
	}

	user, err := h.AuthRepo.GetByID(c.Context(), userID)
	if err != nil {
		return err
	}

	email := payloadString(payload, "email")
	if user != nil && strings.TrimSpace(user.Email) != "" {
		email = user.Email
	}
	status := ""
	if user != nil {
		status = strings.ToLower(string(user.Status))
	}

	now := time.Now().UTC()
	used := record != nil && (!record.UsedAt.IsZero() || record.Status == userstypes.UserTokenStatusUsed)
	expired := record != nil && (!record.ExpiresAt.IsZero() && record.ExpiresAt.Before(now))
	valid := !used && !expired

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id":    userID.String(),
		"email":      email,
		"status":     status,
		"expires_at": record.ExpiresAt,
		"used_at":    record.UsedAt,
		"valid":      valid,
	})
}

// AcceptInvite sets the password for an invite token and activates the account.
func (h *OnboardingHandlers) AcceptInvite(c router.Context) error {
	if err := h.requireFeature(setup.FeatureUserInvites); err != nil {
		return err
	}
	if h.UsersService == nil || h.UsersService.Commands().UserTokenConsume == nil || h.UsersService.Commands().UserPasswordReset == nil || h.UsersService.Commands().UserLifecycleTransition == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.AuthRepo == nil {
		return goerrors.New("user repository unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.Bind(&payload); err != nil {
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	payload.Token = normalizeSecureLinkToken(payload.Token)
	password := strings.TrimSpace(payload.Password)
	if payload.Token == "" || password == "" {
		return goerrors.New("token and password required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_PASSWORD_REQUIRED")
	}

	consume := &command.UserTokenConsumeResult{}
	if err := h.UsersService.Commands().UserTokenConsume.Execute(c.Context(), command.UserTokenConsumeInput{
		Token:     payload.Token,
		TokenType: userstypes.UserTokenInvite,
		Scope:     helpers.ScopeFromContext(c.Context()),
		Result:    consume,
	}); err != nil {
		return err
	}

	record := consume.Token
	payloadMap := consume.Payload
	userID := uuid.Nil
	if record != nil {
		userID = record.UserID
	}
	if userID == uuid.Nil {
		userID = payloadUUID(payloadMap, "user_id")
	}
	if userID == uuid.Nil {
		return goerrors.New("user not found", goerrors.CategoryNotFound).
			WithCode(fiber.StatusNotFound).
			WithTextCode("USER_NOT_FOUND")
	}

	if _, err := h.AuthRepo.GetByID(c.Context(), userID); err != nil {
		return err
	}

	hash, err := authlib.HashPassword(password)
	if err != nil {
		return err
	}

	scope := scopeFromPayload(payloadMap)
	if scope.TenantID == uuid.Nil && scope.OrgID == uuid.Nil {
		scope = helpers.ScopeFromContext(c.Context())
	}

	if err := h.UsersService.Commands().UserPasswordReset.Execute(c.Context(), command.UserPasswordResetInput{
		UserID:          userID,
		NewPasswordHash: hash,
		TokenJTI:        record.JTI,
		TokenExpiresAt:  record.ExpiresAt,
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
	}); err != nil {
		return err
	}

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
	if h.UsersService == nil || h.UsersService.Commands().UserRegistrationRequest == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.Registration.Mode == setup.RegistrationClosed {
		return goerrors.New("registration closed", goerrors.CategoryAuthz).
			WithCode(fiber.StatusForbidden).
			WithTextCode("FEATURE_DISABLED")
	}

	var payload struct {
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}
	if err := c.Bind(&payload); err != nil {
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	payload.Email = strings.TrimSpace(payload.Email)
	if payload.Email == "" {
		return goerrors.New("email required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("EMAIL_REQUIRED")
	}
	if h.Registration.Mode == setup.RegistrationAllowlist && !h.Registration.AllowsEmail(payload.Email) {
		return goerrors.New("email not allowed", goerrors.CategoryAuthz).
			WithCode(fiber.StatusForbidden).
			WithTextCode("FEATURE_DISABLED")
	}

	result := &command.UserRegistrationRequestResult{}
	input := command.UserRegistrationRequestInput{
		Email:     payload.Email,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Role:      normalizeRole(payload.Role),
		Metadata: map[string]any{
			"self_registration": true,
		},
		Scope:  helpers.ScopeFromContext(c.Context()),
		Result: result,
	}
	if err := h.UsersService.Commands().UserRegistrationRequest.Execute(c.Context(), input); err != nil {
		return err
	}

	return c.JSON(fiber.StatusCreated, map[string]any{
		"user_id":    result.User.ID.String(),
		"token":      result.Token,
		"expires_at": result.ExpiresAt,
		"mode":       h.Registration.Mode,
	})
}

// ConfirmRegistration validates the registration token and activates the account.
func (h *OnboardingHandlers) ConfirmRegistration(c router.Context) error {
	if err := h.requireFeature(setup.FeatureSelfRegistration); err != nil {
		return err
	}
	if h.UsersService == nil || h.UsersService.Commands().UserTokenConsume == nil || h.UsersService.Commands().UserPasswordReset == nil || h.UsersService.Commands().UserLifecycleTransition == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.AuthRepo == nil {
		return goerrors.New("user repository unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.Bind(&payload); err != nil {
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	payload.Token = normalizeSecureLinkToken(payload.Token)
	password := strings.TrimSpace(payload.Password)
	if payload.Token == "" || password == "" {
		return goerrors.New("token and password required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_PASSWORD_REQUIRED")
	}

	consume := &command.UserTokenConsumeResult{}
	if err := h.UsersService.Commands().UserTokenConsume.Execute(c.Context(), command.UserTokenConsumeInput{
		Token:     payload.Token,
		TokenType: userstypes.UserTokenRegistration,
		Scope:     helpers.ScopeFromContext(c.Context()),
		Result:    consume,
	}); err != nil {
		return err
	}

	record := consume.Token
	payloadMap := consume.Payload
	userID := uuid.Nil
	if record != nil {
		userID = record.UserID
	}
	if userID == uuid.Nil {
		userID = payloadUUID(payloadMap, "user_id")
	}
	if userID == uuid.Nil {
		return goerrors.New("user not found", goerrors.CategoryNotFound).
			WithCode(fiber.StatusNotFound).
			WithTextCode("USER_NOT_FOUND")
	}

	if _, err := h.AuthRepo.GetByID(c.Context(), userID); err != nil {
		return err
	}

	hash, err := authlib.HashPassword(password)
	if err != nil {
		return err
	}

	scope := scopeFromPayload(payloadMap)
	if scope.TenantID == uuid.Nil && scope.OrgID == uuid.Nil {
		scope = helpers.ScopeFromContext(c.Context())
	}

	if err := h.UsersService.Commands().UserPasswordReset.Execute(c.Context(), command.UserPasswordResetInput{
		UserID:          userID,
		NewPasswordHash: hash,
		TokenJTI:        record.JTI,
		TokenExpiresAt:  record.ExpiresAt,
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
	}); err != nil {
		return err
	}

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id": userID.String(),
		"status":  "active",
	})
}

// RequestPasswordReset issues a password reset token guarded by eligibility checks.
func (h *OnboardingHandlers) RequestPasswordReset(c router.Context) error {
	if err := h.requireFeature(setup.FeaturePasswordReset); err != nil {
		return err
	}
	if h.UsersService == nil || h.UsersService.Commands().UserPasswordResetRequest == nil || h.AuthRepo == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	var payload struct {
		Identifier string `json:"identifier"`
	}
	if err := c.Bind(&payload); err != nil {
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	identifier := strings.TrimSpace(payload.Identifier)
	if identifier == "" {
		return goerrors.New("identifier required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("IDENTIFIER_REQUIRED")
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

	result := &command.UserPasswordResetRequestResult{}
	input := command.UserPasswordResetRequestInput{
		UserID:   user.ID,
		Actor:    userstypes.ActorRef{},
		Scope:    helpers.ScopeFromContext(c.Context()),
		Metadata: map[string]any{"source": "self_service"},
		Result:   result,
	}
	if err := h.UsersService.Commands().UserPasswordResetRequest.Execute(c.Context(), input); err != nil {
		return err
	}

	return c.JSON(fiber.StatusAccepted, map[string]any{
		"status":     "ok",
		"expires_at": result.ExpiresAt,
	})
}

// ConfirmPasswordReset applies the password reset token and sets a new password.
func (h *OnboardingHandlers) ConfirmPasswordReset(c router.Context) error {
	if err := h.requireFeature(setup.FeaturePasswordReset); err != nil {
		return err
	}
	if h.UsersService == nil || h.UsersService.Commands().UserPasswordResetConfirm == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.Bind(&payload); err != nil {
		return goerrors.New("invalid payload", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD")
	}
	token := normalizeSecureLinkToken(payload.Token)
	password := strings.TrimSpace(payload.Password)
	if token == "" || password == "" {
		return goerrors.New("token and password required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_PASSWORD_REQUIRED")
	}

	hash, err := authlib.HashPassword(password)
	if err != nil {
		return err
	}

	result := &command.UserPasswordResetConfirmResult{}
	if err := h.UsersService.Commands().UserPasswordResetConfirm.Execute(c.Context(), command.UserPasswordResetConfirmInput{
		Token:           token,
		NewPasswordHash: hash,
		Scope:           helpers.ScopeFromContext(c.Context()),
		Result:          result,
	}); err != nil {
		return err
	}

	userID := uuid.Nil
	if result.User != nil {
		userID = result.User.ID
	}

	return c.JSON(fiber.StatusOK, map[string]any{
		"user_id": userID.String(),
		"status":  "reset",
	})
}

// TokenMetadata returns expiration/usage data for securelink tokens.
func (h *OnboardingHandlers) TokenMetadata(c router.Context) error {
	token := normalizeSecureLinkToken(c.Query("token"))
	if token == "" {
		return goerrors.New("token required", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_REQUIRED")
	}

	typeRaw := strings.TrimSpace(c.Query("token_type"))
	if typeRaw == "" {
		typeRaw = strings.TrimSpace(c.Query("type"))
	}
	if typeRaw == "" {
		typeRaw = strings.TrimSpace(c.Query("action"))
	}
	tokenType, err := parseTokenType(typeRaw)
	if err != nil {
		return goerrors.New("invalid token type", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_TOKEN_TYPE")
	}
	if h.SecureLinks == nil {
		return goerrors.New("securelink manager unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	payloadMap, err := h.SecureLinks.Validate(token)
	if err != nil {
		return err
	}
	payload := userstypes.SecureLinkPayload(payloadMap)
	jti := payloadString(payload, "jti")
	if jti == "" {
		return goerrors.New("token invalid", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("TOKEN_MALFORMED")
	}

	switch tokenType {
	case userstypes.UserTokenInvite, userstypes.UserTokenRegistration:
		if h.TokenRepo == nil {
			return goerrors.New("token repository unavailable", goerrors.CategoryInternal).
				WithCode(goerrors.CodeInternal).
				WithTextCode("SERVICE_UNAVAILABLE")
		}
		record, err := h.TokenRepo.GetTokenByJTI(c.Context(), tokenType, jti)
		if err != nil {
			return err
		}
		if record == nil {
			return goerrors.New("token not found", goerrors.CategoryNotFound).
				WithCode(fiber.StatusNotFound).
				WithTextCode("TOKEN_NOT_FOUND")
		}

		now := time.Now().UTC()
		used := !record.UsedAt.IsZero() || record.Status == userstypes.UserTokenStatusUsed
		expired := record.Status == userstypes.UserTokenStatusExpired || (!record.ExpiresAt.IsZero() && record.ExpiresAt.Before(now))
		valid := !used && !expired

		return c.JSON(fiber.StatusOK, map[string]any{
			"token_type": string(record.Type),
			"user_id":    record.UserID.String(),
			"jti":        record.JTI,
			"status":     string(record.Status),
			"issued_at":  record.IssuedAt,
			"expires_at": record.ExpiresAt,
			"used_at":    record.UsedAt,
			"valid":      valid,
		})
	case userstypes.UserTokenPasswordReset:
		if h.ResetRepo == nil {
			return goerrors.New("password reset repository unavailable", goerrors.CategoryInternal).
				WithCode(goerrors.CodeInternal).
				WithTextCode("SERVICE_UNAVAILABLE")
		}
		record, err := h.ResetRepo.GetResetByJTI(c.Context(), jti)
		if err != nil {
			return err
		}
		if record == nil {
			return goerrors.New("token not found", goerrors.CategoryNotFound).
				WithCode(fiber.StatusNotFound).
				WithTextCode("TOKEN_NOT_FOUND")
		}

		now := time.Now().UTC()
		used := !record.UsedAt.IsZero() || record.Status == userstypes.PasswordResetStatusChanged
		expired := record.Status == userstypes.PasswordResetStatusExpired || (!record.ExpiresAt.IsZero() && record.ExpiresAt.Before(now))
		valid := !used && !expired

		return c.JSON(fiber.StatusOK, map[string]any{
			"token_type": string(userstypes.UserTokenPasswordReset),
			"user_id":    record.UserID.String(),
			"email":      record.Email,
			"jti":        record.JTI,
			"status":     string(record.Status),
			"issued_at":  record.IssuedAt,
			"expires_at": record.ExpiresAt,
			"used_at":    record.UsedAt,
			"valid":      valid,
		})
	default:
		return goerrors.New("invalid token type", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_TOKEN_TYPE")
	}
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

func parseTokenType(raw string) (userstypes.UserTokenType, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "invite", "invitation":
		return userstypes.UserTokenInvite, nil
	case "register", "registration", "signup", "self_registration":
		return userstypes.UserTokenRegistration, nil
	case "password_reset", "passwordreset", "reset":
		return userstypes.UserTokenPasswordReset, nil
	default:
		return "", fmt.Errorf("unsupported token type")
	}
}

func payloadString(payload userstypes.SecureLinkPayload, key string) string {
	if payload == nil {
		return ""
	}
	value, ok := payload[key]
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func payloadUUID(payload userstypes.SecureLinkPayload, key string) uuid.UUID {
	value := payloadString(payload, key)
	if value == "" {
		return uuid.Nil
	}
	id, _ := uuid.Parse(value)
	return id
}

func payloadTime(payload userstypes.SecureLinkPayload, key string) time.Time {
	if payload == nil {
		return time.Time{}
	}
	value, ok := payload[key]
	if !ok {
		return time.Time{}
	}
	return parseTimeValue(value)
}

func parseTimeValue(value any) time.Time {
	switch v := value.(type) {
	case time.Time:
		return v
	case string:
		if parsed, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(v)); err == nil {
			return parsed
		}
		if parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(v)); err == nil {
			return parsed
		}
	}
	return time.Time{}
}

func scopeFromPayload(payload userstypes.SecureLinkPayload) userstypes.ScopeFilter {
	return userstypes.ScopeFilter{
		TenantID: payloadUUID(payload, "tenant_id"),
		OrgID:    payloadUUID(payload, "org_id"),
	}
}

func normalizeSecureLinkToken(raw string) string {
	token := strings.TrimSpace(raw)
	if token == "" {
		return ""
	}
	if !strings.Contains(token, "://") {
		return token
	}
	parsed, err := url.Parse(token)
	if err != nil {
		return token
	}
	cfg := setup.SecureLinkUIConfigFromEnv()
	queryKey := strings.TrimSpace(cfg.QueryKey)
	if queryKey == "" {
		queryKey = "token"
	}
	if value := strings.TrimSpace(parsed.Query().Get(queryKey)); value != "" {
		return value
	}
	if queryKey != "token" {
		if value := strings.TrimSpace(parsed.Query().Get("token")); value != "" {
			return value
		}
	}
	if path := strings.Trim(parsed.Path, "/"); path != "" {
		parts := strings.Split(path, "/")
		if len(parts) > 0 {
			if last := strings.TrimSpace(parts[len(parts)-1]); last != "" {
				return last
			}
		}
	}
	return token
}
