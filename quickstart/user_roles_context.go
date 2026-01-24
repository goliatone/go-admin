package quickstart

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func withAssignedRoles(ctx router.ViewContext, adm *admin.Admin, reqCtx context.Context) router.ViewContext {
	if ctx == nil || adm == nil {
		return ctx
	}
	if _, ok := ctx["assigned_roles"]; ok {
		return ctx
	}
	resource := strings.TrimSpace(fmt.Sprint(ctx["resource"]))
	if resource != "users" {
		return ctx
	}
	item, ok := ctx["resource_item"].(map[string]any)
	if !ok {
		return ctx
	}
	userID := strings.TrimSpace(fmt.Sprint(item["id"]))
	if userID == "" {
		return ctx
	}
	service := adm.UserService()
	if service == nil {
		return ctx
	}
	roles, err := service.RolesForUser(reqCtx, userID)
	if err != nil || len(roles) == 0 {
		return ctx
	}
	ctx["assigned_roles"] = roleViewItems(roles)
	return ctx
}

func roleViewItems(roles []admin.RoleRecord) []map[string]any {
	if len(roles) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(roles))
	for _, role := range roles {
		out = append(out, map[string]any{
			"id":       role.ID,
			"name":     role.Name,
			"role_key": role.RoleKey,
		})
	}
	return out
}
