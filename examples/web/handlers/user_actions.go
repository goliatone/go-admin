package handlers

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
)

// UserActionHandlers exposes lifecycle/role/invite/reset endpoints for admin users.
type UserActionHandlers struct {
	Service      *userssvc.Service
	Roles        userstypes.RoleRegistry
	AuthRepo     userstypes.AuthRepository
	FeatureFlags map[string]bool
}

// Lifecycle transitions a single user to the target state.
func (h *UserActionHandlers) Lifecycle(target userstypes.LifecycleState) router.HandlerFunc {
	return func(c router.Context) error {
		if err := h.requireService(); err != nil {
			return err
		}
		if h.Service.Commands().UserLifecycleTransition == nil {
			return serviceUnavailableError()
		}
		action := "edit"
		if target == userstypes.LifecycleStateArchived {
			action = "delete"
		}
		if err := requireUsersPermission(c.Context(), action); err != nil {
			return err
		}
		userID, err := h.parseUserID(c.Param("id"))
		if err != nil {
			return err
		}
		actor := helpers.ActorRefFromContext(c.Context())
		if actor.ID == uuid.Nil {
			return unauthorizedError()
		}
		scope := helpers.ScopeFromContext(c.Context())
		input := command.UserLifecycleTransitionInput{
			UserID: userID,
			Target: target,
			Actor:  actor,
			Scope:  scope,
		}
		if err := h.Service.Commands().UserLifecycleTransition.Execute(c.Context(), input); err != nil {
			return err
		}

		h.logActivity(c.Context(), "user.status."+string(target), userID, map[string]any{
			"target": target,
			"scope":  scope,
		})

		return c.JSON(fiber.StatusOK, map[string]any{
			"user_id": userID.String(),
			"status":  string(target),
		})
	}
}

// BulkLifecycle transitions multiple users to the target state.
func (h *UserActionHandlers) BulkLifecycle(target userstypes.LifecycleState) router.HandlerFunc {
	return func(c router.Context) error {
		if err := h.requireService(); err != nil {
			return err
		}
		if h.Service.Commands().BulkUserTransition == nil {
			return serviceUnavailableError()
		}
		action := "edit"
		if target == userstypes.LifecycleStateArchived {
			action = "delete"
		}
		if err := requireUsersPermission(c.Context(), action); err != nil {
			return err
		}
		ids := collectUserIDs(c)
		if len(ids) == 0 {
			return goerrors.New("user ids required", goerrors.CategoryValidation).
				WithCode(fiber.StatusBadRequest).
				WithTextCode("INVALID_IDS")
		}
		actor := helpers.ActorRefFromContext(c.Context())
		if actor.ID == uuid.Nil {
			return unauthorizedError()
		}
		scope := helpers.ScopeFromContext(c.Context())
		input := command.BulkUserTransitionInput{
			UserIDs:     ids,
			Target:      target,
			Actor:       actor,
			Scope:       scope,
			StopOnError: true,
		}
		if err := h.Service.Commands().BulkUserTransition.Execute(c.Context(), input); err != nil {
			return err
		}

		h.logActivity(c.Context(), "user.status."+string(target), uuid.Nil, map[string]any{
			"target": target,
			"count":  len(ids),
			"scope":  scope,
		})

		return c.JSON(fiber.StatusOK, map[string]any{
			"processed": len(ids),
			"target":    string(target),
		})
	}
}

// ResetPassword issues a password reset token for the given user.
func (h *UserActionHandlers) ResetPassword(c router.Context) error {
	if err := h.requireService(); err != nil {
		return err
	}
	if !h.isFeatureEnabled(setup.FeaturePasswordReset) {
		return featureDisabledError()
	}
	if err := requireUsersPermission(c.Context(), "edit"); err != nil {
		return err
	}
	if h.AuthRepo == nil {
		return goerrors.New("user repository unavailable", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if h.Service.Commands().UserPasswordResetRequest == nil {
		return serviceUnavailableError()
	}

	userID, err := h.parseUserID(c.Param("id"))
	if err != nil {
		return err
	}
	user, err := h.AuthRepo.GetByID(c.Context(), userID)
	if err != nil {
		return err
	}
	if !isEligibleForReset(user) {
		return goerrors.New("user not eligible for reset", goerrors.CategoryAuthz).
			WithCode(goerrors.CodeForbidden).
			WithTextCode("RESET_NOT_ALLOWED")
	}

	actor := helpers.ActorRefFromContext(c.Context())
	if actor.ID == uuid.Nil {
		return unauthorizedError()
	}
	scope := helpers.ScopeFromContext(c.Context())
	result := &command.UserPasswordResetRequestResult{}
	if err := h.Service.Commands().UserPasswordResetRequest.Execute(c.Context(), command.UserPasswordResetRequestInput{
		UserID:   user.ID,
		Actor:    actor,
		Scope:    scope,
		Metadata: map[string]any{"source": "admin.users"},
		Result:   result,
	}); err != nil {
		return err
	}

	return c.JSON(fiber.StatusAccepted, map[string]any{
		"user_id":    user.ID.String(),
		"expires_at": result.ExpiresAt,
	})
}

// InviteByID re-issues an invite token for an existing user.
func (h *UserActionHandlers) InviteByID(c router.Context) error {
	if err := h.requireService(); err != nil {
		return err
	}
	if !h.isFeatureEnabled(setup.FeatureUserInvites) {
		return featureDisabledError()
	}
	if err := requireUsersPermission(c.Context(), "create"); err != nil {
		return err
	}
	if h.Service.Commands().UserInvite == nil {
		return serviceUnavailableError()
	}
	if h.AuthRepo == nil {
		return goerrors.New("user repository unavailable", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("SERVICE_UNAVAILABLE")
	}

	userID, err := h.parseUserID(c.Param("id"))
	if err != nil {
		return err
	}
	user, err := h.AuthRepo.GetByID(c.Context(), userID)
	if err != nil {
		return err
	}

	actor := helpers.ActorRefFromContext(c.Context())
	if actor.ID == uuid.Nil {
		return unauthorizedError()
	}
	scope := helpers.ScopeFromContext(c.Context())

	result := &command.UserInviteResult{}
	role := normalizeRole(user.Role)
	input := command.UserInviteInput{
		Email:     user.Email,
		FirstName: strings.TrimSpace(user.FirstName),
		LastName:  strings.TrimSpace(user.LastName),
		Role:      role,
		Actor:     actor,
		Scope:     scope,
		Result:    result,
		Metadata: map[string]any{
			"resend": true,
			"source": "admin.users",
		},
	}
	if err := h.Service.Commands().UserInvite.Execute(c.Context(), input); err != nil {
		return err
	}

	return c.JSON(fiber.StatusCreated, map[string]any{
		"user_id":    user.ID.String(),
		"token":      result.Token,
		"expires_at": result.ExpiresAt,
	})
}

// BulkAssignRole assigns a role to the provided users.
func (h *UserActionHandlers) BulkAssignRole(c router.Context) error {
	return h.bulkRoleChange(c, true)
}

// BulkUnassignRole removes a role from the provided users.
func (h *UserActionHandlers) BulkUnassignRole(c router.Context) error {
	return h.bulkRoleChange(c, false)
}

func (h *UserActionHandlers) bulkRoleChange(c router.Context, assign bool) error {
	if h.Roles == nil {
		return goerrors.New("role registry unavailable", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	if err := h.requireService(); err != nil {
		return err
	}
	if err := requireUsersPermission(c.Context(), "edit"); err != nil {
		return err
	}
	var payload struct {
		RoleID string   `json:"role_id"`
		IDs    []string `json:"ids"`
	}
	_ = c.Bind(&payload)
	roleID, err := uuid.Parse(strings.TrimSpace(payload.RoleID))
	if err != nil || roleID == uuid.Nil {
		return goerrors.New("role_id required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_ROLE")
	}

	ids := collectUserIDs(c)
	if len(ids) == 0 {
		for _, raw := range payload.IDs {
			if parsed, err := uuid.Parse(strings.TrimSpace(raw)); err == nil && parsed != uuid.Nil {
				ids = append(ids, parsed)
			}
		}
	}
	if len(ids) == 0 {
		return goerrors.New("user ids required", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_IDS")
	}

	actor := helpers.ActorRefFromContext(c.Context())
	if actor.ID == uuid.Nil {
		return unauthorizedError()
	}
	scope := helpers.ScopeFromContext(c.Context())

	for _, id := range ids {
		var execErr error
		if assign {
			execErr = h.Roles.AssignRole(c.Context(), id, roleID, scope, actor.ID)
		} else {
			execErr = h.Roles.UnassignRole(c.Context(), id, roleID, scope, actor.ID)
		}
		if execErr != nil {
			return execErr
		}
		h.logActivity(c.Context(), "role."+h.roleVerb(assign), id, map[string]any{
			"user_id": id.String(),
			"role_id": roleID.String(),
			"scope":   scope,
		})
	}

	return c.JSON(fiber.StatusOK, map[string]any{
		"processed": len(ids),
		"role_id":   roleID.String(),
		"action":    h.roleVerb(assign),
	})
}

func (h *UserActionHandlers) roleVerb(assign bool) string {
	if assign {
		return "assign"
	}
	return "unassign"
}

func (h *UserActionHandlers) requireService() error {
	if h == nil || h.Service == nil {
		return goerrors.New("user service unavailable", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("SERVICE_UNAVAILABLE")
	}
	return nil
}

func (h *UserActionHandlers) parseUserID(raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(strings.TrimSpace(raw))
	if err != nil || id == uuid.Nil {
		return uuid.Nil, goerrors.New("invalid user id", goerrors.CategoryBadInput).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("INVALID_ID")
	}
	return id, nil
}

func (h *UserActionHandlers) isFeatureEnabled(flag string) bool {
	if h == nil || h.FeatureFlags == nil {
		return false
	}
	return h.FeatureFlags[flag]
}

func (h *UserActionHandlers) logActivity(ctx context.Context, verb string, userID uuid.UUID, data map[string]any) {
	if h == nil || h.Service == nil {
		return
	}
	if cmd := h.Service.Commands().LogActivity; cmd != nil {
		record := userstypes.ActivityRecord{
			UserID:     userID,
			ActorID:    helpers.ActorRefFromContext(ctx).ID,
			Verb:       verb,
			ObjectType: "user",
			ObjectID:   userID.String(),
			Channel:    "users",
			Data:       data,
		}
		_ = cmd.Execute(ctx, command.ActivityLogInput{Record: record})
		return
	}
}

func unauthorizedError() error {
	return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
		WithCode(goerrors.CodeUnauthorized).
		WithTextCode("UNAUTHORIZED")
}

func featureDisabledError() error {
	return goerrors.New("feature disabled", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FEATURE_DISABLED")
}

func serviceUnavailableError() error {
	return goerrors.New("user service unavailable", goerrors.CategoryInternal).
		WithCode(fiber.StatusInternalServerError).
		WithTextCode("SERVICE_UNAVAILABLE")
}

func collectUserIDs(c router.Context) []uuid.UUID {
	ids := []string{}
	queryID := strings.TrimSpace(c.Query("id"))
	if queryID != "" {
		ids = append(ids, splitIDs(queryID)...)
	}
	if many := strings.TrimSpace(c.Query("ids")); many != "" {
		ids = append(ids, splitIDs(many)...)
	}

	var payload struct {
		ID        string   `json:"id"`
		IDs       []string `json:"ids"`
		Selection struct {
			ID  string   `json:"id"`
			IDs []string `json:"ids"`
		} `json:"selection"`
	}
	_ = c.Bind(&payload)
	if payload.ID != "" {
		ids = append(ids, payload.ID)
	}
	ids = append(ids, payload.IDs...)
	if payload.Selection.ID != "" {
		ids = append(ids, payload.Selection.ID)
	}
	ids = append(ids, payload.Selection.IDs...)

	unique := map[uuid.UUID]bool{}
	for _, raw := range ids {
		if parsed, err := uuid.Parse(strings.TrimSpace(raw)); err == nil && parsed != uuid.Nil {
			unique[parsed] = true
		}
	}
	out := make([]uuid.UUID, 0, len(unique))
	for id := range unique {
		out = append(out, id)
	}
	return out
}

func splitIDs(raw string) []string {
	parts := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ';' })
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
