package handlers

import (
	"context"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-router"
)

const (
	userFormSource      = "users.json"
	createUserOperation = "createUser"
	updateUserOperation = "updateUser"
)

// UserHandlers holds dependencies for user-related HTTP handlers
type UserHandlers struct {
	Store         *stores.UserStore
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

// NewUserHandlers creates a new UserHandlers instance
func NewUserHandlers(
	store *stores.UserStore,
	formGen *formgenorchestrator.Orchestrator,
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *UserHandlers {
	return &UserHandlers{
		Store:         store,
		FormGenerator: formGen,
		Admin:         adm,
		Config:        cfg,
		WithNav:       withNav,
	}
}

// List handles GET /users - displays list of all users
func (h *UserHandlers) List(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	ctx := c.Context()
	users, total, err := h.Store.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	columns := []map[string]string{
		{"key": "username", "label": "Username"},
		{"key": "email", "label": "Email"},
		{"key": "role", "label": "Role"},
		{"key": "status", "label": "Status"},
		{"key": "created_at", "label": "Created"},
	}
	for i := range users {
		id := users[i]["id"]
		users[i]["actions"] = routes.ActionsMap(id)
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "users",
		"resource_label": "Users",
		"routes":         routes.RoutesMap(),
		"items":          users,
		"columns":        columns,
		"total":          total,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/users/list", viewCtx)
}

// New handles GET /users/new - displays user creation form
func (h *UserHandlers) New(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	return h.renderUserForm(c, createUserOperation, formgenrender.RenderOptions{
		HiddenFields: map[string]string{"_action": "create"},
	})
}

// Create handles POST /users - creates a new user
func (h *UserHandlers) Create(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	ctx := c.Context()

	record := map[string]any{
		"first_name":        c.FormValue("first_name"),
		"last_name":         c.FormValue("last_name"),
		"username":          c.FormValue("username"),
		"email":             c.FormValue("email"),
		"phone_number":      c.FormValue("phone_number"),
		"profile_picture":   c.FormValue("profile_picture"),
		"is_email_verified": c.FormValue("is_email_verified") != "",
		"role":              c.FormValue("role"),
		"status":            c.FormValue("status"),
		"metadata":          c.FormValue("metadata"),
	}

	if _, err := h.Store.Create(ctx, record); err != nil {
		return err
	}

	return c.Redirect(path.Join(h.Config.BasePath, "users"))
}

// Detail handles GET /users/:id - displays user details
func (h *UserHandlers) Detail(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	fields := []map[string]any{
		{"label": "Username", "value": user["username"]},
		{"label": "Email", "value": user["email"]},
		{"label": "Role", "value": user["role"]},
		{"label": "Status", "value": user["status"]},
		{"label": "Created", "value": user["created_at"]},
		{"label": "Last Login", "value": user["last_login"]},
	}
	user["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "users",
		"resource_label": "Users",
		"routes":         routes.RoutesMap(),
		"resource_item":  user,
		"fields":         fields,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/users/detail", viewCtx)
}

// Edit handles GET /users/:id/edit - displays user edit form
func (h *UserHandlers) Edit(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}

	return h.renderUserForm(c, updateUserOperation, formgenrender.RenderOptions{
		Values: map[string]any{
			"first_name":        user["first_name"],
			"last_name":         user["last_name"],
			"username":          user["username"],
			"email":             user["email"],
			"phone_number":      user["phone_number"],
			"profile_picture":   user["profile_picture"],
			"is_email_verified": user["is_email_verified"],
			"role":              user["role"],
			"status":            user["status"],
			"metadata":          user["metadata"],
		},
		HiddenFields: map[string]string{
			"id": id,
		},
	})
}

// Update handles POST /users/:id - updates an existing user
func (h *UserHandlers) Update(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	record := map[string]any{
		"first_name":        c.FormValue("first_name"),
		"last_name":         c.FormValue("last_name"),
		"username":          c.FormValue("username"),
		"email":             c.FormValue("email"),
		"phone_number":      c.FormValue("phone_number"),
		"profile_picture":   c.FormValue("profile_picture"),
		"is_email_verified": c.FormValue("is_email_verified") != "",
		"role":              c.FormValue("role"),
		"status":            c.FormValue("status"),
		"metadata":          c.FormValue("metadata"),
	}

	if _, err := h.Store.Update(ctx, id, record); err != nil {
		return err
	}

	return c.Redirect(path.Join(h.Config.BasePath, "users"))
}

// Delete handles POST /users/:id/delete - deletes a user
func (h *UserHandlers) Delete(c router.Context) error {
	if err := h.guard(c, "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	if err := h.Store.Delete(ctx, id); err != nil {
		return err
	}

	return c.Redirect(path.Join(h.Config.BasePath, "users"))
}

// renderUserForm is a helper function to render user forms (create/edit)
func (h *UserHandlers) renderUserForm(c router.Context, operationID string, opts formgenrender.RenderOptions) error {
	if h.FormGenerator == nil {
		return fmt.Errorf("form generator is not configured")
	}

	html, err := h.FormGenerator.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(userFormSource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	isEdit := operationID == updateUserOperation
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		if id != "" {
			action := routes.Show(id)
			rendered := strings.ReplaceAll(string(html), path.Join(h.Config.BasePath, "users", "{id}"), action)
			rendered = strings.ReplaceAll(rendered, "{id}", id)
			html = []byte(rendered)
		}
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "users",
		"resource_label": "Users",
		"routes":         routes.RoutesMap(),
		"is_edit":        isEdit,
		"form_html":      string(html),
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/users/form", viewCtx)
}

func (h *UserHandlers) guard(c router.Context, action string) error {
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

	if authlib.Can(c.Context(), "admin.users", action) {
		return nil
	}

	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}
