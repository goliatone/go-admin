package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// ContentEntryUIOption customizes content entry UI routes.
type ContentEntryUIOption func(*contentEntryUIOptions)

type contentEntryUIOptions struct {
	basePath       string
	listTemplate   string
	formTemplate   string
	detailTemplate string
	viewContext    UIViewContextBuilder
	permission     string
	authResource   string
	formRenderer   *admin.FormgenSchemaValidator
}

// WithContentEntryUIBasePath overrides the base path used to build content entry routes.
func WithContentEntryUIBasePath(basePath string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentEntryUITemplates overrides template names for content entry routes.
func WithContentEntryUITemplates(listTemplate, formTemplate, detailTemplate string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(listTemplate) != "" {
			opts.listTemplate = strings.TrimSpace(listTemplate)
		}
		if strings.TrimSpace(formTemplate) != "" {
			opts.formTemplate = strings.TrimSpace(formTemplate)
		}
		if strings.TrimSpace(detailTemplate) != "" {
			opts.detailTemplate = strings.TrimSpace(detailTemplate)
		}
	}
}

// WithContentEntryUIViewContext overrides the view context builder for content entry routes.
func WithContentEntryUIViewContext(builder UIViewContextBuilder) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithContentEntryUIPermission sets the permission used for authz checks.
func WithContentEntryUIPermission(permission string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.permission = strings.TrimSpace(permission)
		}
	}
}

// WithContentEntryUIAuthResource overrides the go-auth resource used for checks.
func WithContentEntryUIAuthResource(resource string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.authResource = strings.TrimSpace(resource)
		}
	}
}

// WithContentEntryFormRenderer overrides the form renderer used for content entry forms.
func WithContentEntryFormRenderer(renderer *admin.FormgenSchemaValidator) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && renderer != nil {
			opts.formRenderer = renderer
		}
	}
}

// RegisterContentEntryUIRoutes registers HTML routes for content entries.
func RegisterContentEntryUIRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentEntryUIOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	options := contentEntryUIOptions{
		basePath:       strings.TrimSpace(cfg.BasePath),
		listTemplate:   "resources/content/list",
		formTemplate:   "resources/content/form",
		detailTemplate: "resources/content/detail",
		authResource:   "admin",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.viewContext == nil {
		options.viewContext = defaultUIViewContextBuilder(adm, cfg)
	}
	if options.formRenderer == nil {
		apiBase := ""
		if adm != nil {
			apiBase = adm.AdminAPIBasePath()
		}
		renderer, err := admin.NewFormgenSchemaValidatorWithAPIBase(cfg.BasePath, apiBase)
		if err != nil {
			return err
		}
		options.formRenderer = renderer
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	handlers := newContentEntryHandlers(adm, cfg, options.viewContext, options)
	base := path.Join(options.basePath, "content")
	listPath := path.Join(base, ":name")
	newPath := path.Join(base, ":name", "new")
	createPath := path.Join(base, ":name")
	detailPath := path.Join(base, ":name", ":id")
	editPath := path.Join(base, ":name", ":id", "edit")
	updatePath := path.Join(base, ":name", ":id")
	deletePath := path.Join(base, ":name", ":id", "delete")

	r.Get(listPath, wrap(handlers.List))
	r.Get(newPath, wrap(handlers.New))
	r.Post(createPath, wrap(handlers.Create))
	r.Get(detailPath, wrap(handlers.Detail))
	r.Get(editPath, wrap(handlers.Edit))
	r.Post(updatePath, wrap(handlers.Update))
	r.Post(deletePath, wrap(handlers.Delete))
	return nil
}

type contentEntryHandlers struct {
	admin          *admin.Admin
	cfg            admin.Config
	viewContext    UIViewContextBuilder
	listTemplate   string
	formTemplate   string
	detailTemplate string
	permission     string
	authResource   string
	contentTypes   admin.CMSContentTypeService
	formRenderer   *admin.FormgenSchemaValidator
}

func newContentEntryHandlers(adm *admin.Admin, cfg admin.Config, viewCtx UIViewContextBuilder, opts contentEntryUIOptions) *contentEntryHandlers {
	var contentTypes admin.CMSContentTypeService
	if adm != nil {
		contentTypes = adm.ContentTypeService()
	}
	return &contentEntryHandlers{
		admin:          adm,
		cfg:            cfg,
		viewContext:    viewCtx,
		listTemplate:   opts.listTemplate,
		formTemplate:   opts.formTemplate,
		detailTemplate: opts.detailTemplate,
		permission:     strings.TrimSpace(opts.permission),
		authResource:   strings.TrimSpace(opts.authResource),
		contentTypes:   contentTypes,
		formRenderer:   opts.formRenderer,
	}
}

func (h *contentEntryHandlers) List(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "read"); err != nil {
		return err
	}
	items, total, err := h.listPanelItems(panel, adminCtx)
	if err != nil {
		return err
	}
	filters := contentEntryFilters(panel)
	columns := contentEntryColumns(panel, filters)
	var urls urlkit.Resolver
	if h.admin != nil {
		urls = h.admin.URLs()
	}
	basePath := resolveAdminBasePath(urls, h.cfg.BasePath)
	apiBasePath := resolveAdminAPIBasePath(urls, h.cfg, basePath)
	actionBase := path.Join(basePath, "content", contentTypeSlug(contentType, panelName))
	routes := newContentEntryRoutes(basePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)

	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      basePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"routes":         routes.routesMap(),
		"action_base":    actionBase,
		"items":          items,
		"columns":        columns,
		"filters":        filters,
		"total":          total,
		"datatable_id":   "content-" + contentTypeSlug(contentType, panelName),
		"list_api":       path.Join(apiBasePath, panelName),
		"env":            adminCtx.Environment,
		"panel_name":     panelName,
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   contentTypeSlug(contentType, panelName),
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return c.Render(h.listTemplate, viewCtx)
}

func (h *contentEntryHandlers) New(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
	}
	values := map[string]any{
		"locale": defaultLocaleValue("", h.cfg.DefaultLocale),
		"status": "draft",
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, false, "")
}

func (h *contentEntryHandlers) Create(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
	}
	record, err := h.parseFormPayload(c, contentTypeSchema(contentType, panel))
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	if status := strings.TrimSpace(anyToString(record["status"])); status == "" {
		record["status"] = "draft"
	}
	created, err := panel.Create(adminCtx, record)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	if createdID := strings.TrimSpace(anyToString(created["id"])); createdID != "" {
		return c.Redirect(routes.edit(createdID))
	}
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) Detail(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "read"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	if record != nil {
		record["actions"] = map[string]string{
			"edit":   routes.edit(id),
			"delete": routes.delete(id),
		}
	}
	fields := detailFieldsForRecord(panel, record)
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.cfg.BasePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"routes":         routes.routesMap(),
		"resource_item":  record,
		"fields":         fields,
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   contentTypeSlug(contentType, panelName),
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return c.Render(h.detailTemplate, viewCtx)
}

func (h *contentEntryHandlers) Edit(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	values := contentEntryValues(record)
	previewURL, err := h.previewURLForRecord(c.Context(), panelName, id, record)
	if err != nil {
		return err
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, true, previewURL)
}

func (h *contentEntryHandlers) Update(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := h.parseFormPayload(c, contentTypeSchema(contentType, panel))
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	updated, err := panel.Update(adminCtx, id, record)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	if updatedID := strings.TrimSpace(anyToString(updated["id"])); updatedID != "" {
		return c.Redirect(routes.edit(updatedID))
	}
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) Delete(c router.Context) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "delete"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	if err := panel.Delete(adminCtx, id); err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) resolvePanelContext(c router.Context) (*admin.Panel, string, *admin.CMSContentType, admin.AdminContext, error) {
	if h.admin == nil || h.admin.Registry() == nil {
		return nil, "", nil, admin.AdminContext{}, admin.ErrNotFound
	}
	name := strings.TrimSpace(c.Param("name"))
	if name == "" {
		return nil, "", nil, admin.AdminContext{}, admin.ErrNotFound
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	panel, panelName, err := h.panelFor(name, adminCtx.Environment)
	if err != nil {
		return nil, "", nil, adminCtx, err
	}
	contentType, err := h.contentTypeFor(adminCtx.Context, name, adminCtx.Environment)
	if err != nil {
		return nil, "", nil, adminCtx, err
	}
	return panel, panelName, contentType, adminCtx, nil
}

func (h *contentEntryHandlers) panelFor(slug string, env string) (*admin.Panel, string, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, "", admin.ErrNotFound
	}
	panelName := slug
	if strings.TrimSpace(env) != "" {
		panelName = slug + "@" + strings.TrimSpace(env)
	}
	if panel, ok := h.admin.Registry().Panel(panelName); ok && panel != nil {
		return panel, panelName, nil
	}
	if panel, ok := h.admin.Registry().Panel(slug); ok && panel != nil {
		return panel, slug, nil
	}
	return nil, panelName, admin.ErrNotFound
}

func (h *contentEntryHandlers) contentTypeFor(ctx context.Context, slug string, env string) (*admin.CMSContentType, error) {
	if h.contentTypes == nil {
		return nil, admin.ErrNotFound
	}
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, admin.ErrNotFound
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return h.contentTypes.ContentTypeBySlug(ctx, slug)
	}
	types, err := h.contentTypes.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	for _, ct := range types {
		if !strings.EqualFold(strings.TrimSpace(ct.Environment), env) {
			continue
		}
		panelSlug := contentTypePanelSlug(&ct)
		if strings.EqualFold(strings.TrimSpace(ct.Slug), slug) || (panelSlug != "" && strings.EqualFold(panelSlug, slug)) {
			contentType := ct
			return &contentType, nil
		}
	}
	return h.contentTypes.ContentTypeBySlug(ctx, slug)
}

func (h *contentEntryHandlers) listPanelItems(panel *admin.Panel, adminCtx admin.AdminContext) ([]map[string]any, int, error) {
	if panel == nil {
		return nil, 0, admin.ErrNotFound
	}
	items, total, err := panel.List(adminCtx, admin.ListOptions{Page: 1, PerPage: 1})
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (h *contentEntryHandlers) guardPanel(c router.Context, panelName string, panel *admin.Panel, action string) error {
	if c == nil {
		return admin.ErrForbidden
	}
	permission := strings.TrimSpace(h.permission)
	if permission == "" && panel != nil {
		perms := panel.Schema().Permissions
		switch action {
		case "read":
			permission = perms.View
		case "create":
			permission = perms.Create
		case "edit":
			permission = perms.Edit
		case "delete":
			permission = perms.Delete
		}
	}
	if permission != "" {
		if authz := h.admin.Authorizer(); authz != nil {
			if authz.Can(c.Context(), permission, panelName) {
				return nil
			}
			return admin.ErrForbidden
		}
	}
	resource := h.authResource
	if resource == "" {
		resource = "admin"
	}
	if authlib.Can(c.Context(), resource, action) {
		return nil
	}
	if permission == "" {
		return nil
	}
	return admin.ErrForbidden
}

func (h *contentEntryHandlers) renderForm(c router.Context, panelName string, panel *admin.Panel, contentType *admin.CMSContentType, adminCtx admin.AdminContext, values map[string]any, isEdit bool, previewURL string) error {
	if h.formRenderer == nil {
		return errors.New("form renderer is not configured")
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Environment)
	formAction := routes.create()
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		formAction = routes.update(id)
	}
	schema := contentTypeSchema(contentType, panel)
	if schema == nil {
		return admin.ErrNotFound
	}
	uiSchema := contentTypeUISchema(contentType)
	opts := admin.SchemaValidationOptions{
		Slug:     formAction,
		UISchema: uiSchema,
	}
	renderOpts := formgenrender.RenderOptions{Values: values}
	html, err := h.formRenderer.RenderForm(c.Context(), schema, opts, renderOpts)
	if err != nil {
		return err
	}
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.cfg.BasePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"routes":         routes.routesMap(),
		"form_html":      html,
		"is_edit":        isEdit,
		"preview_url":    strings.TrimSpace(previewURL),
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   baseSlug,
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return c.Render(h.formTemplate, viewCtx)
}

func (h *contentEntryHandlers) previewURLForRecord(ctx context.Context, panelName, id string, record map[string]any) (string, error) {
	if h == nil || h.admin == nil || strings.TrimSpace(id) == "" {
		return "", nil
	}
	targetPath := resolveContentEntryPreviewPath(panelName, record)
	if targetPath == "" {
		return "", nil
	}
	previewSvc := h.admin.Preview()
	if previewSvc == nil {
		return "", nil
	}
	token, err := previewSvc.Generate(strings.TrimSpace(panelName), strings.TrimSpace(id), time.Hour)
	if err != nil {
		return "", err
	}
	return buildSitePreviewURL(targetPath, token), nil
}

func resolveContentEntryPreviewPath(panelName string, record map[string]any) string {
	if record == nil {
		return ""
	}
	for _, key := range []string{"path", "preview_url"} {
		if resolved := normalizePreviewPath(anyToString(record[key])); resolved != "" {
			return resolved
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		for _, key := range []string{"path", "preview_url"} {
			if resolved := normalizePreviewPath(anyToString(data[key])); resolved != "" {
				return resolved
			}
		}
	}
	slug := strings.TrimSpace(anyToString(record["slug"]))
	if slug == "" {
		return ""
	}
	switch strings.ToLower(strings.TrimSpace(panelName)) {
	case "pages", "page":
		return normalizePreviewPath(slug)
	case "posts", "post":
		return normalizePreviewPath(path.Join("posts", strings.TrimLeft(slug, "/")))
	default:
		if strings.HasPrefix(slug, "/") {
			return normalizePreviewPath(slug)
		}
	}
	return ""
}

func normalizePreviewPath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func buildSitePreviewURL(targetPath, token string) string {
	path := strings.TrimSpace(targetPath)
	token = strings.TrimSpace(token)
	if path == "" || token == "" {
		return ""
	}
	separator := "?"
	if strings.Contains(path, "?") {
		separator = "&"
	}
	return path + separator + "preview_token=" + url.QueryEscape(token)
}

func (h *contentEntryHandlers) parseFormPayload(c router.Context, schema map[string]any) (map[string]any, error) {
	if c == nil {
		return map[string]any{}, nil
	}
	if isJSONRequest(c) {
		payload := map[string]any{}
		if err := parseJSONBody(c, &payload); err != nil {
			return nil, err
		}
		return payload, nil
	}
	body := c.Body()
	values := url.Values{}
	if len(body) > 0 {
		parsed, err := url.ParseQuery(string(body))
		if err != nil {
			return nil, goerrors.New("invalid form payload", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithTextCode("INVALID_FORM")
		}
		values = parsed
	}
	record := map[string]any{}
	schemaMap, boolPaths := flattenSchema(schema)
	for key, vals := range values {
		if key == "" {
			continue
		}
		if len(vals) == 0 {
			continue
		}
		schemaDef := schemaMap[key]
		if len(vals) > 1 {
			value := parseMultiValue(vals, schemaDef)
			setNestedValue(record, key, value)
			continue
		}
		value := parseValue(vals[0], schemaDef)
		setNestedValue(record, key, value)
	}
	for _, path := range boolPaths {
		if !hasNestedValue(record, path) {
			setNestedValue(record, path, false)
		}
	}
	return record, nil
}

func contentEntryValues(record map[string]any) map[string]any {
	values := map[string]any{}
	if record == nil {
		return values
	}
	for key, val := range record {
		if key == "data" {
			continue
		}
		values[key] = val
	}
	if data, ok := record["data"].(map[string]any); ok {
		for key, val := range data {
			if _, exists := values[key]; exists {
				continue
			}
			values[key] = val
		}
	}
	return values
}

func contentEntryColumns(panel *admin.Panel, filters []map[string]any) []map[string]any {
	fields := []admin.Field{}
	filterable := map[string]struct{}{}
	if panel != nil {
		schema := panel.Schema()
		fields = schema.ListFields
		for _, filter := range schema.Filters {
			name := strings.TrimSpace(filter.Name)
			if name == "" {
				continue
			}
			filterable[name] = struct{}{}
		}
	}
	for _, filter := range filters {
		name := strings.TrimSpace(anyToString(filter["name"]))
		if name == "" {
			continue
		}
		filterable[name] = struct{}{}
	}
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title"},
			{Name: "slug", Label: "Slug"},
			{Name: "status", Label: "Status"},
			{Name: "locale", Label: "Locale"},
		}
	}
	cols := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(strings.TrimSpace(field.Name))
		}
		sortable := contentEntryFieldSortable(field)
		col := map[string]any{
			"field":      field.Name,
			"label":      label,
			"sortable":   sortable,
			"filterable": false,
			"default":    !field.Hidden,
		}
		if _, ok := filterable[field.Name]; ok {
			col["filterable"] = true
		}
		cols = append(cols, col)
	}
	return cols
}

func contentEntryFieldSortable(field admin.Field) bool {
	if field.Hidden {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "textarea", "json", "object", "array", "block-library-picker", "blocks":
		return false
	default:
		return true
	}
}

func contentEntryFilters(panel *admin.Panel) []map[string]any {
	if panel == nil {
		return []map[string]any{}
	}
	schema := panel.Schema()
	optionsByField := map[string][]map[string]any{}
	formFieldByName := map[string]admin.Field{}
	for _, field := range schema.FormFields {
		name := strings.TrimSpace(field.Name)
		if name == "" {
			if name != "" {
				formFieldByName[name] = field
			}
			continue
		}
		if len(field.Options) > 0 {
			optionsByField[name] = contentEntryFilterOptions(field.Options)
		}
		formFieldByName[name] = field
	}
	if len(schema.Filters) == 0 {
		return contentEntryColumnFallbackFilters(schema.ListFields, formFieldByName, optionsByField)
	}
	out := make([]map[string]any, 0, len(schema.Filters))
	for _, filter := range schema.Filters {
		name := strings.TrimSpace(filter.Name)
		if name == "" {
			continue
		}
		label := strings.TrimSpace(filter.Label)
		if label == "" {
			label = titleCase(name)
		}
		entry := map[string]any{
			"name":  name,
			"label": label,
			"type":  strings.TrimSpace(filter.Type),
		}
		if len(filter.Operators) > 0 {
			entry["operators"] = append([]string{}, filter.Operators...)
		}
		if op := strings.TrimSpace(filter.DefaultOperator); op != "" {
			entry["default_operator"] = op
		}
		if len(filter.Options) > 0 {
			entry["options"] = contentEntryFilterOptions(filter.Options)
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryColumnFallbackFilters(listFields []admin.Field, formFieldByName map[string]admin.Field, optionsByField map[string][]map[string]any) []map[string]any {
	fields := listFields
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title", Type: "text"},
			{Name: "slug", Label: "Slug", Type: "text"},
			{Name: "status", Label: "Status", Type: "select"},
			{Name: "locale", Label: "Locale", Type: "select"},
		}
	}
	seen := map[string]struct{}{}
	out := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		name := strings.TrimSpace(field.Name)
		if name == "" || field.Hidden {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(name)
		}
		filterType := normalizeContentEntryFilterType(field.Type)
		if formField, ok := formFieldByName[name]; ok {
			if normalized := normalizeContentEntryFilterType(formField.Type); normalized != "" {
				filterType = normalized
			}
		}
		if filterType == "" {
			filterType = "text"
		}
		entry := map[string]any{
			"name":             name,
			"label":            label,
			"type":             filterType,
			"operators":        []string{"eq", "ilike", "in"},
			"default_operator": "ilike",
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
			entry["type"] = "select"
			entry["operators"] = []string{"eq", "in"}
			entry["default_operator"] = "eq"
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryFilterOptions(options []admin.Option) []map[string]any {
	if len(options) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		label := strings.TrimSpace(option.Label)
		if label == "" {
			label = strings.TrimSpace(anyToString(option.Value))
		}
		out = append(out, map[string]any{
			"label": label,
			"value": option.Value,
		})
	}
	return out
}

func normalizeContentEntryFilterType(raw string) string {
	return admin.NormalizeFilterType(raw)
}

func detailFieldsForRecord(panel *admin.Panel, record map[string]any) []map[string]any {
	fields := []admin.Field{}
	if panel != nil {
		schema := panel.Schema()
		if len(schema.DetailFields) > 0 {
			fields = schema.DetailFields
		} else if len(schema.ListFields) > 0 {
			fields = schema.ListFields
		}
	}
	out := []map[string]any{}
	if len(fields) > 0 {
		for _, field := range fields {
			label := strings.TrimSpace(field.Label)
			if label == "" {
				label = titleCase(strings.TrimSpace(field.Name))
			}
			out = append(out, map[string]any{
				"label": label,
				"value": record[field.Name],
			})
		}
		return out
	}
	if record == nil {
		return out
	}
	keys := make([]string, 0, len(record))
	for key := range record {
		if key == "data" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		out = append(out, map[string]any{
			"label": titleCase(key),
			"value": record[key],
		})
	}
	return out
}

func contentTypeSchema(contentType *admin.CMSContentType, panel *admin.Panel) map[string]any {
	if contentType != nil && len(contentType.Schema) > 0 {
		return cloneAnyMap(contentType.Schema)
	}
	if panel != nil {
		if schema := panel.Schema().FormSchema; len(schema) > 0 {
			return cloneAnyMap(schema)
		}
	}
	return nil
}

func contentTypeUISchema(contentType *admin.CMSContentType) map[string]any {
	if contentType == nil {
		return nil
	}
	return cloneAnyMap(contentType.UISchema)
}

func contentTypeLabel(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return titleCase(panelSlug)
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
	}
	return titleCase(strings.TrimSpace(fallback))
}

func contentTypeSlug(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return panelSlug
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
	}
	return strings.TrimSpace(fallback)
}

func contentTypePanelSlug(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return panelSlugFromCapabilities(contentType.Capabilities)
}

func contentTypeID(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.ID)
}

func contentTypeIcon(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Icon)
}

func contentTypeStatus(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Status)
}

func defaultLocaleValue(value string, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	if strings.TrimSpace(fallback) != "" {
		return strings.TrimSpace(fallback)
	}
	return "en"
}

// contentEntryRoutes builds UI routes for content entries.
type contentEntryRoutes struct {
	basePath string
	slug     string
	env      string
}

func newContentEntryRoutes(basePath, slug, env string) contentEntryRoutes {
	return contentEntryRoutes{basePath: strings.TrimSpace(basePath), slug: strings.TrimSpace(slug), env: strings.TrimSpace(env)}
}

func (r contentEntryRoutes) withEnv(raw string) string {
	if r.env == "" {
		return raw
	}
	separator := "?"
	if strings.Contains(raw, "?") {
		separator = "&"
	}
	return raw + separator + "env=" + url.QueryEscape(r.env)
}

func (r contentEntryRoutes) index() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) new() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, "new"))
}

func (r contentEntryRoutes) show(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) edit(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "edit"))
}

func (r contentEntryRoutes) update(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) create() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) delete(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "delete"))
}

func (r contentEntryRoutes) routesMap() map[string]string {
	return map[string]string{
		"index": r.index(),
		"new":   r.new(),
	}
}

func isJSONRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	raw := c.Get("Content-Type", "")
	contentType := ""
	switch v := raw.(type) {
	case string:
		contentType = v
	case []byte:
		contentType = string(v)
	default:
		if raw != nil {
			contentType = fmt.Sprint(raw)
		}
	}
	contentType = strings.ToLower(contentType)
	return strings.Contains(contentType, "application/json")
}

type schemaPathInfo struct {
	Schema map[string]any
	Type   string
}

func flattenSchema(schema map[string]any) (map[string]schemaPathInfo, []string) {
	out := map[string]schemaPathInfo{}
	boolPaths := []string{}
	walkSchemaProperties(schema, "", out, &boolPaths)
	return out, boolPaths
}

func walkSchemaProperties(schema map[string]any, prefix string, out map[string]schemaPathInfo, boolPaths *[]string) {
	if schema == nil {
		return
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || len(props) == 0 {
		return
	}
	for key, raw := range props {
		prop, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		pathKey := key
		if prefix != "" {
			pathKey = prefix + "." + key
		}
		stype := schemaType(prop)
		out[pathKey] = schemaPathInfo{Schema: prop, Type: stype}
		if stype == "boolean" {
			*boolPaths = append(*boolPaths, pathKey)
		}
		if stype == "object" {
			walkSchemaProperties(prop, pathKey, out, boolPaths)
		}
	}
}

func schemaType(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	switch v := schema["type"].(type) {
	case string:
		return strings.TrimSpace(v)
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func parseMultiValue(values []string, info schemaPathInfo) any {
	stype := strings.TrimSpace(info.Type)
	if stype != "array" {
		return values
	}
	itemsSchema, _ := info.Schema["items"].(map[string]any)
	parsed := make([]any, 0, len(values))
	for _, raw := range values {
		parsed = append(parsed, parseValue(raw, schemaPathInfo{Schema: itemsSchema, Type: schemaType(itemsSchema)}))
	}
	return parsed
}

func parseValue(raw string, info schemaPathInfo) any {
	trimmed := strings.TrimSpace(raw)
	stype := strings.TrimSpace(info.Type)
	switch stype {
	case "boolean":
		return parseBoolValue(trimmed)
	case "integer":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.Atoi(trimmed); err == nil {
			return n
		}
	case "number":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return n
		}
	case "array", "object":
		if parsed, ok := parseJSONValue(trimmed); ok {
			return parsed
		}
	}
	if parsed, ok := parseJSONValue(trimmed); ok {
		if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
			return parsed
		}
	}
	return raw
}

func parseJSONValue(raw string) (any, bool) {
	if raw == "" {
		return nil, false
	}
	var decoded any
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return nil, false
	}
	return decoded, true
}

func parseBoolValue(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "0", "false", "off", "no":
		return false
	default:
		return true
	}
}

func setNestedValue(record map[string]any, path string, value any) {
	if record == nil {
		return
	}
	segments := strings.Split(path, ".")
	current := record
	for i, segment := range segments {
		if i == len(segments)-1 {
			current[segment] = value
			return
		}
		next, ok := current[segment].(map[string]any)
		if !ok || next == nil {
			next = map[string]any{}
			current[segment] = next
		}
		current = next
	}
}

func hasNestedValue(record map[string]any, path string) bool {
	if record == nil {
		return false
	}
	segments := strings.Split(path, ".")
	var current any = record
	for i, segment := range segments {
		currentMap, ok := current.(map[string]any)
		if !ok {
			return false
		}
		val, ok := currentMap[segment]
		if !ok {
			return false
		}
		if i == len(segments)-1 {
			return val != nil || ok
		}
		current = val
	}
	return false
}

func titleCase(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return value
	}
	value = strings.ReplaceAll(value, "_", " ")
	value = strings.ReplaceAll(value, "-", " ")
	parts := strings.Fields(value)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}
