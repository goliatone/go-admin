package quickstart

import (
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

type RolesUIOption func(*rolesUIOptions)

type rolesUIOptions struct {
	basePath       string
	listTemplate   string
	formTemplate   string
	detailTemplate string
	viewContext    UIViewContextBuilder
	formGenerator  *formgenorchestrator.Orchestrator
	urls           urlkit.Resolver
}

// WithRolesBasePath overrides the base path used to build role routes.
func WithRolesBasePath(basePath string) RolesUIOption {
	return func(opts *rolesUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithRolesTemplates overrides the template names for roles UI.
func WithRolesTemplates(list, form, detail string) RolesUIOption {
	return func(opts *rolesUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(list) != "" {
			opts.listTemplate = strings.TrimSpace(list)
		}
		if strings.TrimSpace(form) != "" {
			opts.formTemplate = strings.TrimSpace(form)
		}
		if strings.TrimSpace(detail) != "" {
			opts.detailTemplate = strings.TrimSpace(detail)
		}
	}
}

// WithRolesUIViewContext overrides the view context builder for roles routes.
func WithRolesUIViewContext(builder UIViewContextBuilder) RolesUIOption {
	return func(opts *rolesUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithRolesFormGenerator uses a custom form generator.
func WithRolesFormGenerator(formGen *formgenorchestrator.Orchestrator) RolesUIOption {
	return func(opts *rolesUIOptions) {
		if opts != nil && formGen != nil {
			opts.formGenerator = formGen
		}
	}
}

// RegisterRolesUIRoutes registers HTML routes for role management.
func RegisterRolesUIRoutes[T any](r router.Router[T], cfg admin.Config, adm *admin.Admin, opts ...RolesUIOption) error {
	if r == nil {
		return nil
	}
	if adm == nil || adm.UserService() == nil {
		return errors.New("roles service not configured")
	}

	options := rolesUIOptions{
		basePath:       strings.TrimSpace(cfg.BasePath),
		listTemplate:   "resources/roles/list",
		formTemplate:   "resources/roles/form",
		detailTemplate: "resources/roles/detail",
		viewContext:    defaultUIViewContextBuilder(adm, cfg),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.urls == nil && adm != nil {
		options.urls = adm.URLs()
	}
	if resolved := resolveAdminBasePath(options.urls, options.basePath); resolved != "" {
		options.basePath = resolved
	}
	if options.formGenerator == nil {
		formGen, err := admin.NewRoleFormGenerator(cfg)
		if err != nil {
			return err
		}
		options.formGenerator = formGen
	}

	handlers := newRoleHandlersWithRoutes(adm, cfg, options.formGenerator, options.viewContext, options.formTemplate, options.listTemplate, options.detailTemplate, options.basePath, options.urls)
	listPath := resolveAdminRoutePath(options.urls, options.basePath, "roles")
	newPath := path.Join(listPath, "new")
	detailPath := path.Join(listPath, ":id")
	editPath := path.Join(listPath, ":id", "edit")
	deletePath := path.Join(listPath, ":id", "delete")

	wrap := adm.AuthWrapper()
	r.Get(listPath, wrap(handlers.list))
	r.Get(newPath, wrap(handlers.new))
	r.Post(listPath, wrap(handlers.create))
	r.Get(detailPath, wrap(handlers.detail))
	r.Get(editPath, wrap(handlers.edit))
	r.Post(detailPath, wrap(handlers.update))
	r.Post(deletePath, wrap(handlers.delete))

	return nil
}

type roleHandlers struct {
	admin          *admin.Admin
	cfg            admin.Config
	formGenerator  *formgenorchestrator.Orchestrator
	viewContext    UIViewContextBuilder
	listTemplate   string
	formTemplate   string
	detailTemplate string
	basePath       string
	rolesRoot      string
	urls           urlkit.Resolver
}

func newRoleHandlers(adm *admin.Admin, cfg admin.Config, formGen *formgenorchestrator.Orchestrator, viewCtx UIViewContextBuilder, formTemplate string, listTemplate string, detailTemplate string) *roleHandlers {
	basePath := cfg.BasePath
	var urls urlkit.Resolver
	if adm != nil {
		urls = adm.URLs()
	}
	if resolved := resolveAdminBasePath(urls, basePath); resolved != "" {
		basePath = resolved
	}
	return newRoleHandlersWithRoutes(adm, cfg, formGen, viewCtx, formTemplate, listTemplate, detailTemplate, basePath, urls)
}

func newRoleHandlersWithRoutes(adm *admin.Admin, cfg admin.Config, formGen *formgenorchestrator.Orchestrator, viewCtx UIViewContextBuilder, formTemplate string, listTemplate string, detailTemplate string, basePath string, urls urlkit.Resolver) *roleHandlers {
	rolesRoot := resolveAdminRoutePath(urls, basePath, "roles")
	return &roleHandlers{
		admin:          adm,
		cfg:            cfg,
		formGenerator:  formGen,
		viewContext:    viewCtx,
		formTemplate:   formTemplate,
		listTemplate:   listTemplate,
		detailTemplate: detailTemplate,
		basePath:       basePath,
		rolesRoot:      rolesRoot,
		urls:           urls,
	}
}

func (h *roleHandlers) list(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesPermission, "read"); err != nil {
		return err
	}
	service := h.admin.UserService()
	records, total, err := service.ListRoles(c.Context(), admin.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		return err
	}

	routes := newResourceRoutes(h.basePath, "roles")
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.basePath,
		"resource":       "roles",
		"resource_label": "Roles",
		"routes":         routes.routesMap(),
		"items":          roleRecordsToMaps(records, routes),
		"columns":        roleDataGridColumns(),
		"total":          total,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "roles", c)
	}
	return c.Render(h.listTemplate, viewCtx)
}

func (h *roleHandlers) new(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesCreatePermission, "create"); err != nil {
		return err
	}
	return h.renderForm(c, map[string]any{}, false, h.formTemplate)
}

func (h *roleHandlers) create(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesCreatePermission, "create"); err != nil {
		return err
	}
	service := h.admin.UserService()
	record, err := buildRoleFormRecord(c)
	if err != nil {
		return err
	}
	_, err = service.SaveRole(c.Context(), recordToRoleRecord(record))
	if err != nil {
		return err
	}
	return c.Redirect(h.rolesRoot)
}

func (h *roleHandlers) edit(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesUpdatePermission, "edit"); err != nil {
		return err
	}
	record, err := h.getRoleRecord(c)
	if err != nil {
		return err
	}
	return h.renderForm(c, record, true, h.formTemplate)
}

func (h *roleHandlers) update(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesUpdatePermission, "edit"); err != nil {
		return err
	}
	service := h.admin.UserService()
	id := strings.TrimSpace(c.Param("id"))
	record, err := buildRoleFormRecord(c)
	if err != nil {
		return err
	}
	role := recordToRoleRecord(record)
	role.ID = id
	_, err = service.SaveRole(c.Context(), role)
	if err != nil {
		return err
	}
	return c.Redirect(path.Join(h.rolesRoot, id))
}

func (h *roleHandlers) detail(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesPermission, "read"); err != nil {
		return err
	}
	record, err := h.getRoleRecord(c)
	if err != nil {
		return err
	}

	routes := newResourceRoutes(h.basePath, "roles")
	id := fmt.Sprint(record["id"])
	record["actions"] = routes.actionsMap(id)
	fields := []map[string]any{
		{"label": "Name", "value": record["name"]},
		{"label": "Role Key", "value": record["role_key"]},
		{"label": "Description", "value": record["description"]},
		{"label": "Permissions", "value": formatRolePermissions(record["permissions"])},
		{"label": "Metadata", "value": formatRoleMetadata(record["metadata"])},
		{"label": "System Role", "value": record["is_system"]},
		{"label": "Created", "value": record["created_at"]},
		{"label": "Updated", "value": record["updated_at"]},
	}
	tabs := []map[string]any{
		{"id": "details", "label": "Details", "href": routes.show(id), "icon": "shield"},
	}

	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.basePath,
		"resource":       "roles",
		"resource_label": "Roles",
		"routes":         routes.routesMap(),
		"resource_item":  record,
		"fields":         fields,
		"tabs":           tabs,
		"active_tab":     "details",
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "roles", c)
	}
	return c.Render(h.detailTemplate, viewCtx)
}

func (h *roleHandlers) delete(c router.Context) error {
	if err := h.guard(c, h.cfg.RolesDeletePermission, "delete"); err != nil {
		return err
	}
	service := h.admin.UserService()
	id := strings.TrimSpace(c.Param("id"))
	if err := service.DeleteRole(c.Context(), id); err != nil {
		return err
	}
	return c.Redirect(h.rolesRoot)
}

func (h *roleHandlers) renderForm(c router.Context, record map[string]any, isEdit bool, template string) error {
	if h.formGenerator == nil {
		return errors.New("role form generator is not configured")
	}
	routes := newResourceRoutes(h.basePath, "roles")
	operationID := admin.CreateRoleOperation
	opts := formgenrender.RenderOptions{}
	if isEdit {
		operationID = admin.UpdateRoleOperation
		opts.Values = roleFormValues(record)
		if id := strings.TrimSpace(fmt.Sprint(record["id"])); id != "" {
			opts.HiddenFields = map[string]string{"id": id}
		}
	}

	html, err := h.formGenerator.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(admin.RolesOpenAPISource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	formID := ""
	if isEdit {
		formID = strings.TrimSpace(fmt.Sprint(record["id"]))
		if formID == "" {
			formID = strings.TrimSpace(c.Param("id"))
		}
	}
	html = rewriteRolesFormHTML(html, h.rolesRoot, formID)

	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.basePath,
		"resource":       "roles",
		"resource_label": "Roles",
		"routes":         routes.routesMap(),
		"resource_item":  record,
		"form_html":      string(html),
		"is_edit":        isEdit,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "roles", c)
	}
	return c.Render(template, viewCtx)
}

func rewriteRolesFormHTML(raw []byte, rolesRoot string, id string) []byte {
	if len(raw) == 0 {
		return raw
	}
	rolesRoot = strings.TrimSpace(rolesRoot)
	if rolesRoot == "" {
		rolesRoot = "/roles"
	} else if !strings.HasPrefix(rolesRoot, "/") && !isAbsoluteURL(rolesRoot) {
		rolesRoot = "/" + rolesRoot
	}

	rendered := strings.ReplaceAll(string(raw), "/admin/roles", rolesRoot)
	if id != "" {
		action := prefixBasePath(rolesRoot, id)
		rendered = strings.ReplaceAll(rendered, prefixBasePath(rolesRoot, "{id}"), action)
		rendered = strings.ReplaceAll(rendered, "/admin/roles/{id}", action)
		rendered = strings.ReplaceAll(rendered, "{id}", id)
	}
	return []byte(rendered)
}

func (h *roleHandlers) getRoleRecord(c router.Context) (map[string]any, error) {
	service := h.admin.UserService()
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return nil, admin.ErrNotFound
	}
	role, err := service.GetRole(c.Context(), id)
	if err != nil {
		return nil, err
	}
	return roleToMap(role), nil
}

func (h *roleHandlers) guard(c router.Context, perm string, action string) error {
	if c == nil {
		return admin.ErrForbidden
	}
	ctx := c.Context()
	if authz := h.admin.Authorizer(); authz != nil {
		if authz.Can(ctx, perm, "") {
			return nil
		}
		return admin.ErrForbidden
	}
	if authlib.Can(ctx, "admin.roles", action) {
		return nil
	}
	return admin.ErrForbidden
}

type resourceRoutes struct {
	basePath string
	resource string
}

func newResourceRoutes(basePath, resource string) resourceRoutes {
	return resourceRoutes{basePath: strings.TrimSpace(basePath), resource: resource}
}

func (r resourceRoutes) index() string { return path.Join(r.basePath, r.resource) }
func (r resourceRoutes) new() string   { return path.Join(r.basePath, r.resource, "new") }
func (r resourceRoutes) show(id string) string {
	return path.Join(r.basePath, r.resource, id)
}
func (r resourceRoutes) edit(id string) string {
	return path.Join(r.basePath, r.resource, id, "edit")
}
func (r resourceRoutes) delete(id string) string {
	return path.Join(r.basePath, r.resource, id, "delete")
}

func (r resourceRoutes) actionsMap(id string) map[string]string {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	return map[string]string{
		"show":   r.show(id),
		"edit":   r.edit(id),
		"delete": r.delete(id),
	}
}

func (r resourceRoutes) routesMap() map[string]string {
	return map[string]string{
		"index": r.index(),
		"new":   r.new(),
	}
}

func roleDataGridColumns() []map[string]any {
	return []map[string]any{
		{"field": "name", "label": "Name", "sortable": true, "filterable": true, "default": true},
		{"field": "role_key", "label": "Role Key", "sortable": true, "filterable": true, "default": true},
		{"field": "description", "label": "Description", "sortable": true, "filterable": true, "default": true},
		{"field": "permissions", "label": "Permissions", "sortable": false, "filterable": false, "default": false},
		{"field": "is_system", "label": "System", "sortable": true, "filterable": false, "default": true},
		{"field": "created_at", "label": "Created", "sortable": true, "filterable": false, "default": true},
		{"field": "updated_at", "label": "Updated", "sortable": true, "filterable": false, "default": false},
	}
}

func roleRecordsToMaps(records []admin.RoleRecord, routes resourceRoutes) []map[string]any {
	if len(records) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(records))
	for _, role := range records {
		item := roleToMap(role)
		item["actions"] = routes.actionsMap(role.ID)
		out = append(out, item)
	}
	return out
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
		record["created_at"] = role.CreatedAt.Format(timeLayout())
	}
	if !role.UpdatedAt.IsZero() {
		record["updated_at"] = role.UpdatedAt.Format(timeLayout())
	}
	return record
}

func recordToRoleRecord(record map[string]any) admin.RoleRecord {
	return admin.RoleRecord{
		Name:        strings.TrimSpace(fmt.Sprint(record["name"])),
		RoleKey:     strings.TrimSpace(fmt.Sprint(record["role_key"])),
		Description: strings.TrimSpace(fmt.Sprint(record["description"])),
		Permissions: permissionsList(record["permissions"]),
		Metadata:    roleMetadata(record["metadata"]),
		IsSystem:    parseBool(record["is_system"]),
	}
}

func buildRoleFormRecord(c router.Context) (map[string]any, error) {
	permissions := strings.TrimSpace(c.FormValue("permissions"))
	permissionsDebug := strings.TrimSpace(c.FormValue("permissions_debug"))
	mergedPermissions := mergePermissionValues(permissions, permissionsDebug)
	metadata, err := parseRoleMetadata(strings.TrimSpace(c.FormValue("metadata")))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"name":        strings.TrimSpace(c.FormValue("name")),
		"role_key":    strings.TrimSpace(c.FormValue("role_key")),
		"description": strings.TrimSpace(c.FormValue("description")),
		"permissions": mergedPermissions,
		"metadata":    metadata,
		"is_system":   strings.TrimSpace(c.FormValue("is_system")) != "",
	}, nil
}

func roleFormValues(record map[string]any) map[string]any {
	if record == nil {
		return nil
	}
	return map[string]any{
		"name":              record["name"],
		"role_key":          record["role_key"],
		"description":       record["description"],
		"permissions":       rolePermissionsValue(record),
		"permissions_debug": roleDebugPermissionsValue(record),
		"metadata":          roleMetadataValue(record),
		"is_system":         record["is_system"],
	}
}

func rolePermissionsValue(record map[string]any) string {
	if record == nil {
		return ""
	}
	return permissionsToString(record["permissions"], "\n")
}

func roleDebugPermissionsValue(record map[string]any) string {
	if record == nil {
		return ""
	}
	permissions := permissionsList(record["permissions"])
	if len(permissions) == 0 {
		return ""
	}
	debugPermissions := make([]string, 0, 2)
	for _, permission := range permissions {
		if permission == "admin.debug.repl" || permission == "admin.debug.repl.exec" {
			debugPermissions = append(debugPermissions, permission)
		}
	}
	return strings.Join(debugPermissions, "\n")
}

func roleMetadataValue(record map[string]any) string {
	if record == nil {
		return ""
	}
	raw, ok := record["metadata"]
	if !ok || raw == nil {
		return ""
	}
	if value, ok := raw.(string); ok {
		return strings.TrimSpace(value)
	}
	encoded, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return strings.TrimSpace(fmt.Sprint(raw))
	}
	return string(encoded)
}

func formatRoleMetadata(raw any) string {
	if raw == nil {
		return ""
	}
	if value, ok := raw.(string); ok {
		return strings.TrimSpace(value)
	}
	encoded, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return strings.TrimSpace(fmt.Sprint(raw))
	}
	return string(encoded)
}

func formatRolePermissions(raw any) string {
	return permissionsToString(raw, ", ")
}

func permissionsToString(raw any, separator string) string {
	if raw == nil {
		return ""
	}
	switch typed := raw.(type) {
	case []string:
		return strings.Join(typed, separator)
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(fmt.Sprint(item)); value != "" {
				parts = append(parts, value)
			}
		}
		return strings.Join(parts, separator)
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}

func permissionsList(raw any) []string {
	return uniquePermissions(splitPermissionValue(permissionsToString(raw, "\n")))
}

func mergePermissionValues(values ...string) string {
	merged := make([]string, 0)
	seen := make(map[string]struct{})
	for _, value := range values {
		for _, permission := range splitPermissionValue(value) {
			if _, ok := seen[permission]; ok || permission == "" {
				continue
			}
			seen[permission] = struct{}{}
			merged = append(merged, permission)
		}
	}
	return strings.Join(merged, "\n")
}

func splitPermissionValue(value string) []string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == '\n' || r == '\r' || r == ','
	})
	permissions := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmedPart := strings.TrimSpace(part); trimmedPart != "" {
			permissions = append(permissions, trimmedPart)
		}
	}
	return permissions
}

func uniquePermissions(values []string) []string {
	unique := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok || value == "" {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	return unique
}

func parseRoleMetadata(raw string) (map[string]any, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	out := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func roleMetadata(value any) map[string]any {
	switch v := value.(type) {
	case map[string]any:
		return v
	case string:
		parsed, _ := parseRoleMetadata(v)
		return parsed
	default:
		return nil
	}
}

func parseBool(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		switch strings.TrimSpace(strings.ToLower(v)) {
		case "true", "1", "yes", "y", "on":
			return true
		}
	case int:
		return v != 0
	}
	return false
}

func timeLayout() string {
	return time.RFC3339
}
