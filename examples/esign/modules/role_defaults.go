package modules

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/permissions"
)

func ensureDefaultRoleMappings(adm *coreadmin.Admin) error {
	if adm == nil || adm.UserService() == nil {
		return nil
	}
	service := adm.UserService()
	existing, _, err := service.ListRoles(context.Background(), coreadmin.ListOptions{PerPage: 500})
	if err != nil {
		return err
	}
	byKey := map[string]coreadmin.RoleRecord{}
	for _, role := range existing {
		key := strings.ToLower(strings.TrimSpace(role.RoleKey))
		if key == "" {
			continue
		}
		byKey[key] = role
	}

	for _, mapping := range permissions.DefaultRoleMappings() {
		key := strings.ToLower(strings.TrimSpace(mapping.RoleKey))
		if key == "" {
			continue
		}
		role := coreadmin.RoleRecord{
			Name:        strings.TrimSpace(mapping.Name),
			RoleKey:     key,
			Description: strings.TrimSpace(mapping.Description),
			Permissions: append([]string{}, mapping.Permissions...),
			IsSystem:    true,
			Metadata: map[string]any{
				"module": "esign",
			},
		}
		if existingRole, ok := byKey[key]; ok {
			role.ID = strings.TrimSpace(existingRole.ID)
		}
		if _, err := service.SaveRole(context.Background(), role); err != nil {
			return err
		}
	}
	return nil
}
