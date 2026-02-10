package quickstart

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type bulkRolePayload struct {
	RoleID  string   `json:"role_id"`
	IDs     []string `json:"ids"`
	Replace bool     `json:"replace"`
}

// RegisterUserRoleBulkRoutes registers bulk assign/unassign endpoints.
func RegisterUserRoleBulkRoutes(r admin.AdminRouter, cfg admin.Config, adm *admin.Admin) error {
	if r == nil || adm == nil || adm.UserService() == nil {
		return nil
	}
	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureUsers)) {
		return nil
	}
	urls := adm.URLs()
	group := adminAPIGroupName(cfg)
	assignPath := resolveRoutePath(urls, group, UserRoleBulkAssignRouteKey)
	unassignPath := resolveRoutePath(urls, group, UserRoleBulkUnassignRouteKey)
	if assignPath == "" || unassignPath == "" {
		return errors.New("user role bulk routes require URLKit route keys")
	}
	wrap := adm.AuthWrapper()

	r.Post(assignPath, wrap(func(c router.Context) error {
		return bulkRoleChange(c, adm, cfg, true)
	}))
	r.Post(unassignPath, wrap(func(c router.Context) error {
		return bulkRoleChange(c, adm, cfg, false)
	}))
	return nil
}

func bulkRoleChange(c router.Context, adm *admin.Admin, cfg admin.Config, assign bool) error {
	if c == nil || adm == nil {
		return admin.ErrForbidden
	}
	if !authlib.Can(c.Context(), "admin.users", "edit") {
		if authz := adm.Authorizer(); authz != nil && authz.Can(c.Context(), cfg.UsersUpdatePermission, "") {
			// ok
		} else {
			return admin.ErrForbidden
		}
	}
	service := adm.UserService()
	if service == nil {
		return errors.New("user service not configured")
	}

	var payload bulkRolePayload
	if err := c.Bind(&payload); err != nil {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "invalid payload"})
	}
	roleID := strings.TrimSpace(payload.RoleID)
	if roleID == "" {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "role_id required"})
	}
	userIDs := filterNonEmpty(payload.IDs)
	if len(userIDs) == 0 {
		return c.JSON(fiber.StatusBadRequest, map[string]any{"error": "ids required"})
	}

	result, err := service.BulkRoleChange(c.Context(), admin.BulkRoleChangeRequest{
		UserIDs: userIDs,
		RoleID:  roleID,
		Assign:  assign,
		Replace: payload.Replace,
	})
	if err != nil {
		return err
	}
	return c.JSON(fiber.StatusOK, result)
}

func filterNonEmpty(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
