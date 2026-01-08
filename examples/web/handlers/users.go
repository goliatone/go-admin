package handlers

import (
	"context"
	"encoding/json"
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
	TabResolver   helpers.TabContentResolver
	TabMode       helpers.TabRenderModeSelector
}

func userDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "email", Label: "Email", Sortable: true, Filterable: true, Default: true},
		{Field: "username", Label: "Username", Sortable: true, Filterable: true, Default: true},
		{Field: "first_name", Label: "First Name", Sortable: true, Filterable: true, Default: false},
		{Field: "last_name", Label: "Last Name", Sortable: true, Filterable: true, Default: false},
		{Field: "role", Label: "Role", Sortable: true, Filterable: true, Default: true},
		{Field: "status", Label: "Status", Sortable: true, Filterable: true, Default: true},
		{Field: "phone_number", Label: "Phone", Sortable: true, Filterable: true, Default: false},
		{Field: "is_email_verified", Label: "Email Verified", Sortable: true, Default: false},
		{Field: "created_at", Label: "Created", Sortable: true, Filterable: true, Default: true},
		{Field: "updated_at", Label: "Updated", Sortable: true, Default: false},
		{Field: "last_login", Label: "Last Login", Sortable: true, Default: false},
	}
}

// NewUserHandlers creates a new UserHandlers instance
func NewUserHandlers(
	store *stores.UserStore,
	formGen *formgenorchestrator.Orchestrator,
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *UserHandlers {
	tabResolver := helpers.NewTabContentRegistry()
	tabResolver.Register("users", "details", helpers.TabContentSpec{
		Kind: helpers.TabContentDetails,
	})
	tabResolver.Register("users", "profile", helpers.TabContentSpec{
		Kind:     helpers.TabContentCMS,
		AreaCode: helpers.UserProfileAreaCode,
	})
	tabResolver.Register("users", "activity", helpers.TabContentSpec{
		Kind:     helpers.TabContentDashboard,
		AreaCode: helpers.UserActivityAreaCode,
	})
	tabMode := helpers.TabRenderModeSelector{
		Default: helpers.TabRenderModeSSR,
		Overrides: map[string]helpers.TabRenderMode{
			helpers.TabKey("users", "profile"):  helpers.TabRenderModeClient,
			helpers.TabKey("users", "activity"): helpers.TabRenderModeHybrid,
		},
	}
	return &UserHandlers{
		Store:         store,
		FormGenerator: formGen,
		Admin:         adm,
		Config:        cfg,
		WithNav:       withNav,
		TabResolver:   tabResolver,
		TabMode:       tabMode,
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
	columns := userDataGridColumns()
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
		"export_config":  helpers.BuildExportConfig(h.Config, "users", ""),
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/users/list", viewCtx)
}

// Columns handles GET /admin/api/users/columns - returns allowlisted user columns for UI use.
func (h *UserHandlers) Columns(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"columns": userDataGridColumns(),
	})
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
	activeTab := strings.TrimSpace(c.Query("tab", ""))
	if activeTab == "" {
		activeTab = "details"
	}

	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	tabs, err := helpers.FetchPanelTabs(c, h.Config, "users", id)
	if err != nil {
		tabs = nil
	}
	detailPath := path.Join(h.Config.BasePath, "users", id)
	tabViews := helpers.BuildPanelTabViews(tabs, helpers.PanelTabViewOptions{
		Context:      ctx,
		PanelName:    "users",
		BasePath:     h.Config.BasePath,
		DetailPath:   detailPath,
		Record:       user,
		Resolver:     h.TabResolver,
		ModeSelector: h.TabMode,
	})
	activeSpec, activeDef := h.resolveTabSpec(ctx, user, tabs, activeTab)
	if activeTab != "details" && (activeDef == nil || !helpers.IsInlineTab(activeSpec)) {
		activeTab = "details"
		activeSpec, activeDef = h.resolveTabSpec(ctx, user, tabs, activeTab)
	}
	if !helpers.IsInlineTab(activeSpec) {
		activeSpec = helpers.TabContentSpec{Kind: helpers.TabContentDetails}
	}
	tabPanel := h.buildTabPanel(c, user, activeTab, activeDef, activeSpec)

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	fields := userDetailFields(user)
	user["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "users",
		"resource_label": "Users",
		"routes":         routes.RoutesMap(),
		"resource_item":  user,
		"fields":         fields,
		"tabs":           tabViews,
		"active_tab":     activeTab,
		"tab_panel":      tabPanel,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/users/detail", viewCtx)
}

// TabHTML handles GET /users/:id/tabs/:tab - renders tab panel HTML for hybrid mode.
func (h *UserHandlers) TabHTML(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	tabID := strings.TrimSpace(c.Param("tab"))
	if tabID == "" {
		return goerrors.New("tab id required", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	ctx := c.Context()
	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	tabs, err := helpers.FetchPanelTabs(c, h.Config, "users", id)
	if err != nil {
		return err
	}
	spec, tabDef := h.resolveTabSpec(ctx, user, tabs, tabID)
	if tabID != "details" && tabDef == nil {
		return goerrors.New("tab not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound)
	}
	if !helpers.IsInlineTab(spec) {
		return goerrors.New("tab is not available for inline rendering", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	tabPanel := h.buildTabPanel(c, user, tabID, tabDef, spec)
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	user["actions"] = routes.ActionsMap(id)

	viewCtx := router.ViewContext{
		"resource":       "users",
		"resource_label": "Users",
		"resource_item":  user,
		"fields":         userDetailFields(user),
		"tab_panel":      tabPanel,
	}
	return c.Render("partials/tab-panel", viewCtx)
}

// TabJSON handles GET /admin/api/users/:id/tabs/:tab - returns tab panel JSON for client mode.
func (h *UserHandlers) TabJSON(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	tabID := strings.TrimSpace(c.Param("tab"))
	if tabID == "" {
		return goerrors.New("tab id required", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	ctx := c.Context()
	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	tabs, err := helpers.FetchPanelTabs(c, h.Config, "users", id)
	if err != nil {
		return err
	}
	spec, tabDef := h.resolveTabSpec(ctx, user, tabs, tabID)
	if tabID != "details" && tabDef == nil {
		return goerrors.New("tab not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound)
	}
	if !helpers.IsInlineTab(spec) {
		return goerrors.New("tab is not available for inline rendering", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	tabPanel := h.buildTabPanel(c, user, tabID, tabDef, spec)
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	user["actions"] = routes.ActionsMap(id)

	return c.JSON(http.StatusOK, map[string]any{
		"tab":            tabPanel,
		"record":         user,
		"fields":         userDetailFields(user),
		"resource":       "users",
		"resource_label": "Users",
	})
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

	metadataValue, metadataErr := normalizeMetadataObjectInput(c.FormValue("metadata"))

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
		"metadata":          metadataValue,
	}

	if metadataErr != nil {
		return h.renderUserForm(c, updateUserOperation, formgenrender.RenderOptions{
			Values: record,
			Errors: map[string][]string{
				"metadata": {metadataErr.Error()},
			},
			HiddenFields: map[string]string{
				"id": id,
			},
		})
	}

	if _, err := h.Store.Update(ctx, id, record); err != nil {
		return h.renderUserForm(c, updateUserOperation, formgenrender.RenderOptions{
			Values: record,
			FormErrors: []string{
				err.Error(),
			},
			HiddenFields: map[string]string{
				"id": id,
			},
		})
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

func (h *UserHandlers) resolveTabSpec(ctx context.Context, user map[string]any, tabs []admin.PanelTab, tabID string) (helpers.TabContentSpec, *admin.PanelTab) {
	if tabID == "" || tabID == "details" {
		return helpers.TabContentSpec{Kind: helpers.TabContentDetails}, findPanelTab(tabs, "details")
	}
	tabDef := findPanelTab(tabs, tabID)
	if tabDef == nil {
		return helpers.TabContentSpec{Kind: helpers.TabContentDetails}, nil
	}
	if h.TabResolver != nil {
		if spec, err := h.TabResolver.ResolveTabContent(ctx, "users", user, *tabDef); err == nil && spec.Kind != "" {
			return spec, tabDef
		}
	}
	return helpers.TabContentSpec{}, tabDef
}

func (h *UserHandlers) buildTabPanel(c router.Context, user map[string]any, tabID string, tabDef *admin.PanelTab, spec helpers.TabContentSpec) map[string]any {
	if spec.Kind == "" {
		spec.Kind = helpers.TabContentDetails
	}
	tabPanel := map[string]any{
		"id":            tabID,
		"kind":          string(spec.Kind),
		"area_code":     spec.AreaCode,
		"empty_message": helpers.UserDetailEmptyPanelNotice,
	}
	if spec.Panel != "" {
		tabPanel["panel"] = spec.Panel
	}
	if spec.Template != "" {
		tabPanel["template"] = spec.Template
	}
	if spec.Data != nil {
		tabPanel["data"] = spec.Data
	}
	if tabDef != nil {
		if spec.Kind == helpers.TabContentPanel && spec.Panel == "" && tabDef.Target.Type == "panel" {
			tabPanel["panel"] = tabDef.Target.Panel
		}
		if href := helpers.PanelTabHref(*tabDef, h.Config.BasePath, user); href != "" {
			tabPanel["href"] = href
		}
	}
	if spec.Kind == helpers.TabContentDashboard || spec.Kind == helpers.TabContentCMS {
		adminCtx := buildDashboardContext(c, h.Config)
		widgets, err := helpers.ResolveTabWidgets(adminCtx, h.Admin, h.Config.BasePath, spec.AreaCode)
		if err == nil {
			helpers.ApplyUserProfileWidgetOverrides(widgets, user)
			tabPanel["widgets"] = widgets
		}
	}
	return tabPanel
}

func userDetailFields(user map[string]any) []map[string]any {
	return []map[string]any{
		{"label": "Username", "value": user["username"]},
		{"label": "Email", "value": user["email"]},
		{"label": "Role", "value": user["role"]},
		{"label": "Status", "value": user["status"]},
		{"label": "Created", "value": user["created_at"]},
		{"label": "Last Login", "value": user["last_login"]},
	}
}

func findPanelTab(tabs []admin.PanelTab, id string) *admin.PanelTab {
	if id == "" {
		return nil
	}
	for i := range tabs {
		if tabs[i].ID == id {
			return &tabs[i]
		}
	}
	return nil
}

func buildDashboardContext(c router.Context, cfg admin.Config) admin.AdminContext {
	ctx := c.Context()
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	if actor, ok := authlib.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		ctx = authlib.WithActorContext(ctx, actor)
	}
	return admin.AdminContext{
		Context: ctx,
		UserID:  userID,
		Locale:  cfg.DefaultLocale,
	}
}

func normalizeMetadataObjectInput(raw string) (any, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		// Treat empty as "clear metadata".
		return "", nil
	}

	var decoded any
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return raw, fmt.Errorf("metadata must be a valid JSON object")
	}

	switch typed := decoded.(type) {
	case map[string]any:
		return typed, nil
	case string:
		inner := strings.TrimSpace(typed)
		if inner == "" {
			return "", nil
		}
		var innerDecoded any
		if err := json.Unmarshal([]byte(inner), &innerDecoded); err != nil {
			return raw, fmt.Errorf("metadata must be a JSON object, not a string")
		}
		if obj, ok := innerDecoded.(map[string]any); ok {
			return obj, nil
		}
		return raw, fmt.Errorf("metadata must be a JSON object")
	default:
		return raw, fmt.Errorf("metadata must be a JSON object")
	}
}
