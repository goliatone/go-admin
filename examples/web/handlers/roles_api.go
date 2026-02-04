package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// RolesAPIHandlers serves the DataGrid JSON payload for roles.
type RolesAPIHandlers struct {
	Admin  *admin.Admin
	Config admin.Config
}

// NewRolesAPIHandlers constructs a roles API handler.
func NewRolesAPIHandlers(adm *admin.Admin, cfg admin.Config) *RolesAPIHandlers {
	return &RolesAPIHandlers{Admin: adm, Config: cfg}
}

// List handles GET /admin/api/roles.
func (h *RolesAPIHandlers) List(c router.Context) error {
	if err := h.guard(c); err != nil {
		return err
	}
	if h == nil || h.Admin == nil || h.Admin.UserService() == nil {
		return goerrors.New("roles service not configured", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("INTERNAL_ERROR")
	}

	opts := parseRoleListOptions(c)
	records, total, err := h.Admin.UserService().ListRoles(c.Context(), opts)
	if err != nil {
		return err
	}

	items := make([]map[string]any, 0, len(records))
	for _, role := range records {
		items = append(items, roleToMap(role))
	}

	return c.JSON(http.StatusOK, map[string]any{
		"data":  items,
		"total": total,
	})
}

func (h *RolesAPIHandlers) guard(c router.Context) error {
	if c == nil {
		return goerrors.New("missing context", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	claims, ok := authlib.GetClaims(c.Context())
	if !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	if h != nil && h.Admin != nil {
		if authz := h.Admin.Authorizer(); authz != nil {
			if authz.Can(c.Context(), h.Config.RolesPermission, "") {
				return nil
			}
			return goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}
	}

	if authlib.Can(c.Context(), "admin.roles", "read") {
		return nil
	}

	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func parseRoleListOptions(c router.Context) admin.ListOptions {
	opts := admin.ListOptions{
		Page:    1,
		PerPage: 10,
		Filters: map[string]any{},
	}
	if c == nil {
		return opts
	}

	if page := parseOptionalInt(strings.TrimSpace(c.Query("page", ""))); page > 0 {
		opts.Page = page
	}
	if perPage := parseOptionalInt(strings.TrimSpace(c.Query("per_page", ""))); perPage > 0 {
		opts.PerPage = perPage
	}

	search := strings.TrimSpace(c.Query("search", ""))
	if search == "" {
		search = strings.TrimSpace(c.Query("filter_name", ""))
	}
	if search == "" {
		search = strings.TrimSpace(c.Query("filter_description", ""))
	}
	opts.Search = search

	if roleKey := strings.TrimSpace(c.Query("filter_role_key", "")); roleKey != "" {
		opts.Filters["role_key"] = roleKey
	}

	return opts
}

func roleToMap(role admin.RoleRecord) map[string]any {
	record := map[string]any{
		"id":          role.ID,
		"name":        role.Name,
		"role_key":    role.RoleKey,
		"description": role.Description,
		"permissions": append([]string{}, role.Permissions...),
		"metadata":    role.Metadata,
		"is_system":   role.IsSystem,
	}
	if !role.CreatedAt.IsZero() {
		record["created_at"] = role.CreatedAt.Format(time.RFC3339)
	}
	if !role.UpdatedAt.IsZero() {
		record["updated_at"] = role.UpdatedAt.Format(time.RFC3339)
	}
	return record
}
