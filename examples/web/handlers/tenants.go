package handlers

import (
	"context"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/helpers"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-router"
)

const (
	tenantFormSource      = "tenants.json"
	createTenantOperation = "createTenant"
	updateTenantOperation = "updateTenant"
)

// TenantHandlers manages HTML CRUD for tenants using generic resource templates.
type TenantHandlers struct {
	Service       *admin.TenantService
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

// NewTenantHandlers constructs tenant handlers.
func NewTenantHandlers(
	service *admin.TenantService,
	formGen *formgenorchestrator.Orchestrator,
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *TenantHandlers {
	return &TenantHandlers{
		Service:       service,
		FormGenerator: formGen,
		Admin:         adm,
		Config:        cfg,
		WithNav:       withNav,
	}
}

// List renders the tenants list page.
func (h *TenantHandlers) List(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "tenants")
	records, total, err := h.Service.ListTenants(c.Context(), admin.ListOptions{})
	if err != nil {
		return err
	}

	items := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		items = append(items, tenantRecordToMap(rec, routes))
	}

	columns := []map[string]string{
		{"key": "name", "label": "Name"},
		{"key": "slug", "label": "Slug"},
		{"key": "domain", "label": "Domain"},
		{"key": "status", "label": "Status"},
		{"key": "created_at", "label": "Created"},
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "tenants",
		"resource_label": "Tenants",
		"routes":         routes.RoutesMap(),
		"items":          items,
		"columns":        columns,
		"total":          total,
	}, h.Admin, h.Config, "tenants", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/tenants/list", viewCtx)
}

// New renders the create tenant form.
func (h *TenantHandlers) New(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "tenants")
	html, err := h.generateForm(c.Context(), admin.TenantRecord{}, false, routes)
	if err != nil {
		return err
	}
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "tenants",
		"resource_label": "Tenants",
		"routes":         routes.RoutesMap(),
		"is_edit":        false,
		"form_html":      string(html),
	}, h.Admin, h.Config, "tenants", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/tenants/form", viewCtx)
}

// Create handles POST /tenants.
func (h *TenantHandlers) Create(c router.Context) error {
	if err := h.guard(c, "create"); err != nil {
		return err
	}
	rec := admin.TenantRecord{
		Name:   strings.TrimSpace(c.FormValue("name")),
		Slug:   strings.TrimSpace(c.FormValue("slug")),
		Domain: strings.TrimSpace(c.FormValue("domain")),
		Status: strings.TrimSpace(c.FormValue("status")),
	}
	if _, err := h.Service.SaveTenant(c.Context(), rec); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "tenants"))
}

// Detail renders the tenant detail page.
func (h *TenantHandlers) Detail(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	id := c.Param("id")
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "tenants")
	record, err := h.Service.GetTenant(c.Context(), id)
	if err != nil {
		return err
	}
	item := tenantRecordToMap(record, routes)
	fields := []map[string]any{
		{"label": "Name", "value": record.Name},
		{"label": "Slug", "value": record.Slug},
		{"label": "Domain", "value": record.Domain},
		{"label": "Status", "value": record.Status},
		{"label": "Created", "value": record.CreatedAt},
		{"label": "Updated", "value": record.UpdatedAt},
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "tenants",
		"resource_label": "Tenants",
		"routes":         routes.RoutesMap(),
		"resource_item":  item,
		"fields":         fields,
	}, h.Admin, h.Config, "tenants", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/tenants/detail", viewCtx)
}

// Edit renders the edit form.
func (h *TenantHandlers) Edit(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "tenants")
	record, err := h.Service.GetTenant(c.Context(), id)
	if err != nil {
		return err
	}
	html, err := h.generateForm(c.Context(), record, true, routes)
	if err != nil {
		return err
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "tenants",
		"resource_label": "Tenants",
		"routes":         routes.RoutesMap(),
		"is_edit":        true,
		"form_html":      string(html),
	}, h.Admin, h.Config, "tenants", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/tenants/form", viewCtx)
}

// Update handles POST /tenants/:id.
func (h *TenantHandlers) Update(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	rec := admin.TenantRecord{
		ID:     id,
		Name:   strings.TrimSpace(c.FormValue("name")),
		Slug:   strings.TrimSpace(c.FormValue("slug")),
		Domain: strings.TrimSpace(c.FormValue("domain")),
		Status: strings.TrimSpace(c.FormValue("status")),
	}
	if _, err := h.Service.SaveTenant(c.Context(), rec); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "tenants"))
}

// Delete handles POST /tenants/:id/delete.
func (h *TenantHandlers) Delete(c router.Context) error {
	if err := h.guard(c, "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	if err := h.Service.DeleteTenant(c.Context(), id); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "tenants"))
}

func (h *TenantHandlers) generateForm(ctx context.Context, rec admin.TenantRecord, isEdit bool, routes helpers.ResourceRoutes) ([]byte, error) {
	if h.FormGenerator == nil {
		return nil, goerrors.New("form generator not configured", goerrors.CategoryInternal)
	}
	values := map[string]any{}
	if isEdit {
		values["id"] = rec.ID
		values["name"] = rec.Name
		values["slug"] = rec.Slug
		values["domain"] = rec.Domain
		values["status"] = rec.Status
	}

	opts := formgenrender.RenderOptions{
		Values: values,
	}
	opts.HiddenFields = map[string]string{
		"_action": func() string {
			if isEdit {
				return "update"
			}
			return "create"
		}(),
	}
	if isEdit {
		opts.HiddenFields["id"] = rec.ID
	}
	opts.HiddenFields["resource"] = "tenants"

	html, err := h.FormGenerator.Generate(ctx, formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(tenantFormSource),
		OperationID:   ternary(isEdit, updateTenantOperation, createTenantOperation),
		RenderOptions: opts,
	})
	if err != nil {
		return nil, err
	}
	// Override action with resolved route to avoid {id} placeholders being submitted.
	action := routes.Index()
	if isEdit {
		action = routes.Show(rec.ID)
	}
	rendered := strings.ReplaceAll(string(html), "/admin/tenants/{id}", action)
	rendered = strings.ReplaceAll(rendered, "{id}", rec.ID)
	return []byte(rendered), nil
}

func ternary[T any](cond bool, a, b T) T {
	if cond {
		return a
	}
	return b
}

func (h *TenantHandlers) guard(c router.Context, action string) error {
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
	if authlib.Can(c.Context(), "admin.tenants", action) {
		return nil
	}
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func tenantRecordToMap(rec admin.TenantRecord, routes helpers.ResourceRoutes) map[string]any {
	m := map[string]any{
		"id":         rec.ID,
		"name":       rec.Name,
		"slug":       rec.Slug,
		"domain":     rec.Domain,
		"status":     rec.Status,
		"created_at": rec.CreatedAt,
		"updated_at": rec.UpdatedAt,
	}
	m["actions"] = routes.ActionsMap(rec.ID)
	return m
}
