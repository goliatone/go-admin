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

type bulkRoleSummary struct {
	Processed int `json:"processed"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Skipped   int `json:"skipped"`
}

type bulkRoleResult struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

type bulkRoleResponse struct {
	Summary bulkRoleSummary  `json:"summary"`
	Results []bulkRoleResult `json:"results"`
	RoleID  string           `json:"role_id"`
	Action  string           `json:"action"`
	Replace bool             `json:"replace"`
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

	results := make([]bulkRoleResult, 0, len(userIDs))
	summary := bulkRoleSummary{Processed: len(userIDs)}
	for _, userID := range userIDs {
		result := bulkRoleResult{UserID: userID, Status: "skipped"}
		if assign && payload.Replace {
			if existing, err := service.RolesForUser(c.Context(), userID); err == nil {
				for _, role := range existing {
					if role.ID == roleID {
						continue
					}
					_ = service.UnassignRole(c.Context(), userID, role.ID)
				}
			}
		}

		if assign {
			if err := service.AssignRole(c.Context(), userID, roleID); err != nil {
				result.Status = "failed"
				result.Error = err.Error()
				summary.Failed++
			} else {
				result.Status = "success"
				summary.Succeeded++
			}
		} else {
			if err := service.UnassignRole(c.Context(), userID, roleID); err != nil {
				result.Status = "failed"
				result.Error = err.Error()
				summary.Failed++
			} else {
				result.Status = "success"
				summary.Succeeded++
			}
		}
		results = append(results, result)
	}
	summary.Skipped = summary.Processed - summary.Succeeded - summary.Failed

	action := "unassign"
	if assign {
		action = "assign"
	}
	return c.JSON(fiber.StatusOK, bulkRoleResponse{
		Summary: summary,
		Results: results,
		RoleID:  roleID,
		Action:  action,
		Replace: payload.Replace,
	})
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
