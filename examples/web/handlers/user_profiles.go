package handlers

import (
	"context"
	"fmt"
	"net/http"
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
	userProfileFormSource      = "user_profiles.json"
	createUserProfileOperation = "createUserProfile"
	updateUserProfileOperation = "updateUserProfile"
)

// userProfileDataGridColumns returns the allowlisted columns for user profiles DataGrid.
// Filterable flags align with what the store actually filters: id, display_name, email, locale, timezone, bio.
// created_at/updated_at are sortable but not filterable.
func userProfileDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "id", Label: "User ID", Sortable: true, Filterable: true, Default: false},
		{Field: "display_name", Label: "Display Name", Sortable: true, Filterable: true, Default: true},
		{Field: "email", Label: "Email", Sortable: true, Filterable: true, Default: true},
		{Field: "avatar_url", Label: "Avatar", Sortable: false, Filterable: false, Default: false},
		{Field: "locale", Label: "Locale", Sortable: true, Filterable: true, Default: true},
		{Field: "timezone", Label: "Timezone", Sortable: true, Filterable: true, Default: true},
		{Field: "bio", Label: "Bio", Sortable: true, Filterable: true, Default: false},
		{Field: "created_at", Label: "Created", Sortable: true, Filterable: false, Default: false},
		{Field: "updated_at", Label: "Updated", Sortable: true, Filterable: false, Default: true},
	}
}

// UserProfileHandlers holds dependencies for user-profile HTML handlers.
type UserProfileHandlers struct {
	Store         *stores.UserProfileStore
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewUserProfileHandlers(
	store *stores.UserProfileStore,
	formGen *formgenorchestrator.Orchestrator,
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *UserProfileHandlers {
	return &UserProfileHandlers{
		Store:         store,
		FormGenerator: formGen,
		Admin:         adm,
		Config:        cfg,
		WithNav:       withNav,
	}
}

func (h *UserProfileHandlers) List(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	ctx := c.Context()

	items, total, err := h.Store.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "user-profiles")
	columns := userProfileDataGridColumns()
	for i := range items {
		id := items[i]["id"]
		items[i]["actions"] = routes.ActionsMap(id)
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "user-profiles",
		"resource_label": "User Profiles",
		"routes":         routes.RoutesMap(),
		"items":          items,
		"columns":        columns,
		"total":          total,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".user-profiles", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/user-profiles/list", viewCtx)
}

// Columns handles GET /admin/api/user-profiles/columns - returns allowlisted columns for UI use.
func (h *UserProfileHandlers) Columns(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"columns": userProfileDataGridColumns(),
	})
}

func (h *UserProfileHandlers) New(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	return h.renderProfileForm(c, createUserProfileOperation, formgenrender.RenderOptions{})
}

func (h *UserProfileHandlers) Create(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	ctx := c.Context()

	record := map[string]any{
		"id":           strings.TrimSpace(c.FormValue("user")),
		"display_name": strings.TrimSpace(c.FormValue("display_name")),
		"avatar_url":   strings.TrimSpace(c.FormValue("avatar_url")),
		"email":        strings.TrimSpace(c.FormValue("email")),
		"locale":       strings.TrimSpace(c.FormValue("locale")),
		"timezone":     strings.TrimSpace(c.FormValue("timezone")),
		"bio":          strings.TrimSpace(c.FormValue("bio")),
	}

	if _, err := h.Store.Create(ctx, record); err != nil {
		return h.renderProfileForm(c, createUserProfileOperation, formgenrender.RenderOptions{
			Values: map[string]any{
				"user":         record["id"],
				"display_name": record["display_name"],
				"avatar_url":   record["avatar_url"],
				"email":        record["email"],
				"locale":       record["locale"],
				"timezone":     record["timezone"],
				"bio":          record["bio"],
			},
			FormErrors: []string{err.Error()},
		})
	}

	return c.Redirect(path.Join(h.Config.BasePath, "user-profiles"))
}

func (h *UserProfileHandlers) Detail(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	item, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "user-profiles")
	fields := []map[string]any{
		{"label": "User ID", "value": item["id"]},
		{"label": "Display Name", "value": item["display_name"]},
		{"label": "Avatar URL", "value": item["avatar_url"]},
		{"label": "Email", "value": item["email"]},
		{"label": "Locale", "value": item["locale"]},
		{"label": "Timezone", "value": item["timezone"]},
		{"label": "Bio", "value": item["bio"]},
		{"label": "Created", "value": item["created_at"]},
		{"label": "Updated", "value": item["updated_at"]},
	}
	item["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "user-profiles",
		"resource_label": "User Profiles",
		"routes":         routes.RoutesMap(),
		"resource_item":  item,
		"fields":         fields,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".user-profiles", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/user-profiles/detail", viewCtx)
}

func (h *UserProfileHandlers) Edit(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	item, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	idValue := strings.TrimSpace(anyToString(item["id"]))
	values := map[string]any{
		"user": formgenrender.ValueWithProvenance{
			Value:    idValue,
			Disabled: true,
		},
		"avatar_url":   strings.TrimSpace(anyToString(item["avatar_url"])),
		"display_name": strings.TrimSpace(anyToString(item["display_name"])),
		"email":        strings.TrimSpace(anyToString(item["email"])),
		"locale":       strings.TrimSpace(anyToString(item["locale"])),
		"timezone":     strings.TrimSpace(anyToString(item["timezone"])),
		"bio":          strings.TrimSpace(anyToString(item["bio"])),
	}
	return h.renderProfileForm(c, updateUserProfileOperation, formgenrender.RenderOptions{
		Values: values,
		HiddenFields: map[string]string{
			"user": idValue,
		},
	})
}

func (h *UserProfileHandlers) Update(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	userID := strings.TrimSpace(c.FormValue("user"))
	if userID == "" {
		userID = strings.TrimSpace(id)
	}

	record := map[string]any{
		"id":           userID,
		"display_name": strings.TrimSpace(c.FormValue("display_name")),
		"avatar_url":   strings.TrimSpace(c.FormValue("avatar_url")),
		"email":        strings.TrimSpace(c.FormValue("email")),
		"locale":       strings.TrimSpace(c.FormValue("locale")),
		"timezone":     strings.TrimSpace(c.FormValue("timezone")),
		"bio":          strings.TrimSpace(c.FormValue("bio")),
	}

	if _, err := h.Store.Update(ctx, id, record); err != nil {
		values := map[string]any{
			"user": formgenrender.ValueWithProvenance{
				Value:    userID,
				Disabled: true,
			},
			"avatar_url":   record["avatar_url"],
			"display_name": record["display_name"],
			"email":        record["email"],
			"locale":       record["locale"],
			"timezone":     record["timezone"],
			"bio":          record["bio"],
		}
		return h.renderProfileForm(c, updateUserProfileOperation, formgenrender.RenderOptions{
			Values:     values,
			FormErrors: []string{err.Error()},
			HiddenFields: map[string]string{
				"user": userID,
			},
		})
	}

	return c.Redirect(path.Join(h.Config.BasePath, "user-profiles"))
}

func (h *UserProfileHandlers) Delete(c router.Context) error {
	if err := h.guard(c, "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()

	if err := h.Store.Delete(ctx, id); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "user-profiles"))
}

func (h *UserProfileHandlers) renderProfileForm(c router.Context, operationID string, opts formgenrender.RenderOptions) error {
	if h.FormGenerator == nil {
		return fmt.Errorf("form generator is not configured")
	}

	html, err := h.FormGenerator.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(userProfileFormSource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	isEdit := operationID == updateUserProfileOperation
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "user-profiles")
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		if id != "" {
			action := routes.Show(id)
			rendered := strings.ReplaceAll(string(html), path.Join(h.Config.BasePath, "user-profiles", "{id}"), action)
			rendered = strings.ReplaceAll(rendered, "{id}", id)
			html = []byte(rendered)
		}
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "user-profiles",
		"resource_label": "User Profiles",
		"routes":         routes.RoutesMap(),
		"is_edit":        isEdit,
		"form_html":      string(html),
	}, h.Admin, h.Config, setup.NavigationGroupMain+".user-profiles", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/user-profiles/form", viewCtx)
}

func (h *UserProfileHandlers) guard(c router.Context, action string) error {
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

func anyToString(value any) string {
	if value == nil {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return fmt.Sprint(value)
}
