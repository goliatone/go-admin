package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

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

	activityPermissionModeStrict = "strict"
	activityPermissionModeInline = "inline"
)

// UserHandlers holds dependencies for user-related HTTP handlers
type UserHandlers struct {
	Store         *stores.UserStore
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	ActivityLog   *slog.Logger
	ActivityStats UserTabActivityMetrics
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context, c router.Context) router.ViewContext
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
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context, c router.Context) router.ViewContext,
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

	bulkCtx := helpers.BuildBulkActionContext(h.Admin, "users", h.Config.BasePath, c.Context())
	viewCtx := h.WithNav(router.ViewContext{
		"title":                 h.Config.Title,
		"base_path":             h.Config.BasePath,
		"resource":              "users",
		"resource_label":        "Users",
		"routes":                routes.RoutesMap(),
		"items":                 users,
		"columns":               columns,
		"total":                 total,
		"export_config":         helpers.BuildExportConfig(h.Config, "users", ""),
		"bulk_actions_primary":  bulkCtx.Primary,
		"bulk_actions_overflow": bulkCtx.Overflow,
		"bulk_base":             bulkCtx.BaseURL,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return helpers.RenderTemplateView(c, "resources/users/list", viewCtx)
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
	tabs := h.fetchPanelTabs(c, "users", id)
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
	if activeTab == "activity" &&
		activeSpec.AreaCode == helpers.UserActivityAreaCode &&
		h.strictActivityPermissionFailures() {
		if err := h.guardActivity(c); err != nil {
			return err
		}
		if _, err := parseUserActivityLimit(c.Query("limit", "")); err != nil {
			return err
		}
	}
	tabPanel := h.buildTabPanel(c, user, activeTab, activeDef, activeSpec)

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "users")
	fields := userDetailFields(user)
	user["actions"] = routes.ActionsMap(id)
	assignedRoles := roleViewItems(fetchAssignedRoles(ctx, h.Admin, id))

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "users",
		"resource_label": "Users",
		"routes":         routes.RoutesMap(),
		"resource_item":  user,
		"fields":         fields,
		"assigned_roles": assignedRoles,
		"tabs":           tabViews,
		"active_tab":     activeTab,
		"tab_panel":      tabPanel,
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return helpers.RenderTemplateView(c, "resources/users/detail", viewCtx)
}

// TabHTML handles GET /users/:id/tabs/:tab - renders tab panel HTML for hybrid mode.
func (h *UserHandlers) TabHTML(c router.Context) error {
	id := strings.TrimSpace(c.Param("id"))
	tabID := strings.TrimSpace(c.Param("tab"))
	if tabID == "" {
		return goerrors.New("tab id required", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	if tabID == "activity" {
		if err := h.guardActivity(c); err != nil {
			h.recordActivityTabFailure(c.Context(), "tab_html", id, "permission_denied", 0, err)
			return err
		}
		if _, err := parseUserActivityLimit(c.Query("limit", "")); err != nil {
			h.recordActivityTabFailure(c.Context(), "tab_html", id, "invalid_limit", 0, err)
			return err
		}
	} else {
		if err := h.guard(c, "read"); err != nil {
			return err
		}
	}
	ctx := c.Context()
	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	tabs := h.fetchPanelTabs(c, "users", id)
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
	return helpers.RenderTemplateView(c, "partials/tab-panel", viewCtx)
}

// TabJSON handles GET /admin/api/users/:id/tabs/:tab - returns tab panel JSON for client mode.
func (h *UserHandlers) TabJSON(c router.Context) error {
	id := strings.TrimSpace(c.Param("id"))
	tabID := strings.TrimSpace(c.Param("tab"))
	if tabID == "" {
		return goerrors.New("tab id required", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	if tabID == "activity" {
		if err := h.guardActivity(c); err != nil {
			h.recordActivityTabFailure(c.Context(), "tab_json", id, "permission_denied", 0, err)
			return err
		}
		if _, err := parseUserActivityLimit(c.Query("limit", "")); err != nil {
			h.recordActivityTabFailure(c.Context(), "tab_json", id, "invalid_limit", 0, err)
			return err
		}
	} else {
		if err := h.guard(c, "read"); err != nil {
			return err
		}
	}
	ctx := c.Context()
	user, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	tabs := h.fetchPanelTabs(c, "users", id)
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
	}, h.Admin, h.Config, setup.NavigationGroupMain+".users", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return helpers.RenderTemplateView(c, "resources/users/form", viewCtx)
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

// guardActivity checks both users read AND activity read permissions.
// Returns nil if both permissions are satisfied.
func (h *UserHandlers) guardActivity(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	activityPermission := h.Config.ActivityPermission
	if activityPermission == "" {
		activityPermission = "admin.activity.view"
	}
	if !authlib.Can(c.Context(), activityPermission, "read") {
		return goerrors.New("activity view permission required", goerrors.CategoryAuthz).
			WithCode(goerrors.CodeForbidden).
			WithTextCode("FORBIDDEN").
			WithMetadata(map[string]any{
				"resource":            "users.activity",
				"required_permission": activityPermission,
				"required_action":     "read",
				"tab":                 "activity",
			})
	}
	return nil
}

// canViewActivity checks if the current user has activity read permission.
func (h *UserHandlers) canViewActivity(c router.Context) bool {
	activityPermission := h.Config.ActivityPermission
	if activityPermission == "" {
		activityPermission = "admin.activity.view"
	}
	return authlib.Can(c.Context(), activityPermission, "read")
}

func (h *UserHandlers) strictActivityPermissionFailures() bool {
	mode := strings.ToLower(strings.TrimSpace(h.Config.ActivityTabPermissionFailureMode))
	switch mode {
	case activityPermissionModeStrict:
		return true
	case activityPermissionModeInline:
		return false
	default:
		return h.Config.Errors.DevMode
	}
}

func (h *UserHandlers) activityLogger() *slog.Logger {
	if h != nil && h.ActivityLog != nil {
		return h.ActivityLog
	}
	return slog.Default()
}

func (h *UserHandlers) activityMetrics() UserTabActivityMetrics {
	if h != nil && h.ActivityStats != nil {
		return h.ActivityStats
	}
	return defaultUserTabActivityMetrics
}

func (h *UserHandlers) activityMetricTags(reason string) map[string]string {
	tags := map[string]string{
		"panel": "users",
		"tab":   "activity",
	}
	reason = strings.TrimSpace(reason)
	if reason != "" {
		tags["reason"] = reason
	}
	return tags
}

func (h *UserHandlers) recordActivityTabFailure(ctx context.Context, endpoint, userID, reason string, limit int, err error) {
	tags := h.activityMetricTags(reason)
	if endpoint != "" {
		tags["endpoint"] = endpoint
	}
	h.activityMetrics().IncrementErrorCount(ctx, tags)

	attrs := []any{
		"resource", "users.activity",
		"endpoint", endpoint,
		"reason", reason,
		"tab", "activity",
	}
	userID = strings.TrimSpace(userID)
	if userID != "" {
		attrs = append(attrs, "subject_user_id", userID)
	}
	if limit > 0 {
		attrs = append(attrs, "limit", limit)
	}
	if err != nil {
		attrs = append(attrs, "error_type", fmt.Sprintf("%T", err))
	}
	h.activityLogger().WarnContext(ctx, "users activity tab failure", attrs...)
}

func (h *UserHandlers) setActivityTabUnavailable(
	ctx context.Context,
	tabPanel map[string]any,
	userID string,
	limit int,
	reason string,
	message string,
	err error,
) {
	tabPanel["unavailable"] = true
	tabPanel["unavailable_reason"] = reason
	tabPanel["error_message"] = message
	h.recordActivityTabFailure(ctx, "detail_inline", userID, reason, limit, err)
}

func (h *UserHandlers) fetchPanelTabs(c router.Context, panelName, id string) []admin.PanelTab {
	tabs, err := helpers.FetchPanelTabs(c, h.Config, panelName, id, h.Admin)
	if err != nil {
		return nil
	}
	return tabs
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

	// Handle activity tab with shared helper and graceful degradation
	if tabID == "activity" && spec.AreaCode == helpers.UserActivityAreaCode {
		h.buildActivityTabPanel(c, user, tabPanel)
		return tabPanel
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

// buildActivityTabPanel populates the activity tab panel with user activity data.
// It uses the shared BuildUserTabActivity helper and handles graceful degradation.
func (h *UserHandlers) buildActivityTabPanel(c router.Context, user map[string]any, tabPanel map[string]any) {
	ctx := c.Context()

	// Check activity permission
	if !h.canViewActivity(c) {
		h.setActivityTabUnavailable(ctx, tabPanel, "", 0, "permission_denied", "You do not have permission to view activity data.", nil)
		return
	}

	// Get user ID from record
	userID := userRecordID(user)
	if userID == "" {
		h.setActivityTabUnavailable(ctx, tabPanel, userID, 0, "invalid_user", "Invalid user identifier.", nil)
		return
	}

	// Get activity sink from admin
	if h.Admin == nil {
		h.setActivityTabUnavailable(ctx, tabPanel, userID, 0, "service_unavailable", "Activity service is not available.", nil)
		return
	}
	activitySink := h.Admin.ActivityFeed()
	if activitySink == nil {
		h.setActivityTabUnavailable(ctx, tabPanel, userID, 0, "service_unavailable", "Activity service is not available.", nil)
		return
	}

	// Parse limit from query string with clamping
	limit, err := parseUserActivityLimit(c.Query("limit", ""))
	if err != nil {
		h.setActivityTabUnavailable(ctx, tabPanel, userID, 0, "invalid_limit", "Invalid activity limit.", err)
		return
	}

	// Build activity using shared helper
	start := time.Now()
	result := helpers.BuildUserTabActivity(ctx, activitySink, userID, limit)
	queryReason := "success"
	if result.Error != nil {
		queryReason = "query_failed"
	}
	h.activityMetrics().ObserveQueryDuration(ctx, time.Since(start), h.activityMetricTags(queryReason))
	if result.Error != nil {
		h.setActivityTabUnavailable(ctx, tabPanel, userID, limit, "query_failed", "Failed to load activity data.", result.Error)
		return
	}

	// Set activity entries
	tabPanel["entries"] = result.Entries
	tabPanel["has_entries"] = len(result.Entries) > 0
	h.activityMetrics().ObserveResultCount(ctx, len(result.Entries), h.activityMetricTags("success"))
	if len(result.Entries) == 0 {
		tabPanel["empty_message"] = "No activity recorded for this user."
	}
}

func userRecordID(user map[string]any) string {
	if user == nil {
		return ""
	}
	raw, ok := user["id"]
	if !ok || raw == nil {
		return ""
	}
	switch id := raw.(type) {
	case string:
		return strings.TrimSpace(id)
	case fmt.Stringer:
		return strings.TrimSpace(id.String())
	case []byte:
		return strings.TrimSpace(string(id))
	default:
		asString := strings.TrimSpace(fmt.Sprint(id))
		if asString == "" || strings.EqualFold(asString, "<nil>") {
			return ""
		}
		return asString
	}
}

func parseUserActivityLimit(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return helpers.UserActivityDefaultLimit, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, goerrors.New("invalid limit", goerrors.CategoryValidation).
			WithCode(goerrors.CodeBadRequest)
	}
	return helpers.ClampActivityLimit(parsed), nil
}

func fetchAssignedRoles(ctx context.Context, adm *admin.Admin, userID string) []admin.RoleRecord {
	if adm == nil || strings.TrimSpace(userID) == "" {
		return nil
	}
	service := adm.UserService()
	if service == nil {
		return nil
	}
	roles, err := service.RolesForUser(ctx, userID)
	if err != nil {
		return nil
	}
	return roles
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
