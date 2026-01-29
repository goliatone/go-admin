package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// ContentTypeBuilderHandlers renders content type builder views.
type ContentTypeBuilderHandlers struct {
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext

	versions *contentTypeVersionStore
}

type panelReader interface {
	Get(ctx admin.AdminContext, id string) (map[string]any, error)
	Create(ctx admin.AdminContext, record map[string]any) (map[string]any, error)
	Update(ctx admin.AdminContext, id string, record map[string]any) (map[string]any, error)
}

type schemaChange struct {
	Type        string `json:"type"`
	Path        string `json:"path"`
	Field       string `json:"field,omitempty"`
	Description string `json:"description,omitempty"`
	IsBreaking  bool   `json:"is_breaking,omitempty"`
}

type contentTypeSchemaVersion struct {
	Version         string         `json:"version"`
	Schema          map[string]any `json:"schema"`
	UISchema        map[string]any `json:"ui_schema,omitempty"`
	CreatedAt       string         `json:"created_at"`
	CreatedBy       string         `json:"created_by,omitempty"`
	IsBreaking      bool           `json:"is_breaking,omitempty"`
	MigrationStatus string         `json:"migration_status,omitempty"`
	MigratedCount   *int           `json:"migrated_count,omitempty"`
	TotalCount      *int           `json:"total_count,omitempty"`
	Changes         []schemaChange `json:"changes,omitempty"`
}

type contentTypeVersionStore struct {
	mu       sync.Mutex
	versions map[string][]contentTypeSchemaVersion
	pending  map[string]contentTypeSchemaVersion
	counters map[string]int
}

func newContentTypeVersionStore() *contentTypeVersionStore {
	return &contentTypeVersionStore{
		versions: map[string][]contentTypeSchemaVersion{},
		pending:  map[string]contentTypeSchemaVersion{},
		counters: map[string]int{},
	}
}

func (s *contentTypeVersionStore) setPending(key string, entry contentTypeSchemaVersion) {
	if s == nil || key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pending[key] = entry
}

func (s *contentTypeVersionStore) flushPending(key string) (contentTypeSchemaVersion, bool) {
	if s == nil || key == "" {
		return contentTypeSchemaVersion{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.pending[key]
	if ok {
		delete(s.pending, key)
	}
	return entry, ok
}

func (s *contentTypeVersionStore) addVersion(key string, entry contentTypeSchemaVersion) {
	if s == nil || key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(entry.Version) == "" {
		s.counters[key]++
		entry.Version = fmt.Sprintf("%d", s.counters[key])
	} else if parsed := parseVersionNumber(entry.Version); parsed > s.counters[key] {
		s.counters[key] = parsed
	}
	s.versions[key] = append(s.versions[key], entry)
}

func (s *contentTypeVersionStore) listVersions(key string) []contentTypeSchemaVersion {
	if s == nil || key == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	versions := s.versions[key]
	if len(versions) == 0 {
		return nil
	}
	out := make([]contentTypeSchemaVersion, 0, len(versions))
	for i := len(versions) - 1; i >= 0; i-- {
		out = append(out, versions[i])
	}
	return out
}

func NewContentTypeBuilderHandlers(
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *ContentTypeBuilderHandlers {
	return &ContentTypeBuilderHandlers{
		Admin:    adm,
		Config:   cfg,
		versions: newContentTypeVersionStore(),
		WithNav: func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
			if withNav == nil {
				return ctx
			}
			return withNav(ctx, adm, cfg, active, reqCtx)
		},
	}
}

func (h *ContentTypeBuilderHandlers) ContentTypes(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	contentTypes, _, err := h.listPanelRecords(c, "content_types")
	if err != nil {
		return err
	}
	selectedID := strings.TrimSpace(c.Query("id"))
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("slug"))
	}
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("content_type"))
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":                      h.Config.Title,
		"base_path":                  h.Config.BasePath,
		"resource":                   "content_types",
		"content_types":              contentTypes,
		"selected_content_type_id":   selectedID,
		"selected_content_type_slug": selectedID,
	}, h.Admin, h.Config, "content_types", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/content-types/editor", viewCtx)
}

func (h *ContentTypeBuilderHandlers) BlockDefinitions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	blockDefs, _, err := h.listPanelRecords(c, "block_definitions")
	if err != nil {
		return err
	}
	viewCtx := h.WithNav(router.ViewContext{
		"title":             h.Config.Title,
		"base_path":         h.Config.BasePath,
		"resource":          "block_definitions",
		"block_definitions": blockDefs,
	}, h.Admin, h.Config, "block_definitions", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/block-definitions/index", viewCtx)
}

func (h *ContentTypeBuilderHandlers) PublishContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "active")
}

func (h *ContentTypeBuilderHandlers) DeprecateContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "deprecated")
}

func (h *ContentTypeBuilderHandlers) CloneContentType(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	req := struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newSlug := strings.TrimSpace(req.Slug)
	if newSlug == "" {
		return goerrors.New("slug required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SLUG_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "content_type_id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	delete(clone, "schema_version")
	clone["slug"] = newSlug
	clone["name"] = strings.TrimSpace(req.Name)
	if clone["name"] == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	clone["status"] = "draft"
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *ContentTypeBuilderHandlers) ContentTypeCompatibility(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	req := struct {
		Schema   map[string]any `json:"schema"`
		UISchema map[string]any `json:"ui_schema"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	if req.Schema == nil {
		return goerrors.New("schema required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SCHEMA_REQUIRED")
	}

	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	currentSchema := normalizeSchemaValue(record["schema"])
	breaking, warnings := diffSchemas(currentSchema, req.Schema)
	payload := map[string]any{
		"compatible":             len(breaking) == 0,
		"breaking_changes":       breaking,
		"warnings":               warnings,
		"migration_required":     len(breaking) > 0,
		"affected_entries_count": 0,
	}

	key := contentTypeKey(id, record)
	if h.versions != nil {
		changes := make([]schemaChange, 0, len(breaking)+len(warnings))
		changes = append(changes, breaking...)
		changes = append(changes, warnings...)
		entry := contentTypeSchemaVersion{
			Schema:     req.Schema,
			UISchema:   req.UISchema,
			CreatedAt:  time.Now().UTC().Format(time.RFC3339),
			IsBreaking: len(breaking) > 0,
			Changes:    changes,
		}
		h.versions.setPending(key, entry)
	}
	return c.JSON(http.StatusOK, payload)
}

func (h *ContentTypeBuilderHandlers) ContentTypeVersions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	key := contentTypeKey(id, record)
	versions := h.versions.listVersions(key)
	if len(versions) == 0 {
		entry := buildVersionFromRecord(record)
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
			versions = h.versions.listVersions(key)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": versions})
}

func (h *ContentTypeBuilderHandlers) PublishBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	return h.updateBlockDefinitionStatus(c, "active")
}

func (h *ContentTypeBuilderHandlers) DeprecateBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	return h.updateBlockDefinitionStatus(c, "deprecated")
}

func (h *ContentTypeBuilderHandlers) CloneBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	req := struct {
		Type string `json:"type"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newType := strings.TrimSpace(req.Type)
	if newType == "" {
		return goerrors.New("type required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("TYPE_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	clone["type"] = newType
	if strings.TrimSpace(anyToString(clone["name"])) == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *ContentTypeBuilderHandlers) BlockDefinitionVersions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": []map[string]any{}})
}

func (h *ContentTypeBuilderHandlers) BlockDefinitionCategories(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"categories": []string{"content", "media", "layout", "interactive", "custom"},
	})
}

func (h *ContentTypeBuilderHandlers) listPanelRecords(c router.Context, panelName string) ([]map[string]any, int, error) {
	if h.Admin == nil || h.Admin.Registry() == nil {
		return nil, 0, nil
	}
	panel, ok := h.Admin.Registry().Panel(panelName)
	if !ok || panel == nil {
		return nil, 0, nil
	}
	search := strings.TrimSpace(c.Query("search"))
	opts := admin.ListOptions{
		PerPage: 200,
		Search:  search,
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	return panel.List(adminCtx, opts)
}

func (h *ContentTypeBuilderHandlers) panelFor(name string) (panelReader, error) {
	if h.Admin == nil || h.Admin.Registry() == nil {
		return nil, goerrors.New("admin not configured", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("ADMIN_UNAVAILABLE")
	}
	panel, ok := h.Admin.Registry().Panel(name)
	if !ok || panel == nil {
		return nil, goerrors.New("panel not found", goerrors.CategoryInternal).
			WithCode(http.StatusNotFound).
			WithTextCode("PANEL_NOT_FOUND")
	}
	return panel, nil
}

func (h *ContentTypeBuilderHandlers) updateContentTypeStatus(c router.Context, status string) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	if record, err := panel.Get(adminCtx, id); err == nil && record != nil {
		if actualID := strings.TrimSpace(anyToString(record["content_type_id"])); actualID != "" {
			id = actualID
		}
	}
	updated, err := panel.Update(adminCtx, id, map[string]any{
		"status": status,
	})
	if err != nil {
		return err
	}
	if status == "active" && h.versions != nil {
		key := contentTypeKey(id, updated)
		entry, ok := h.versions.flushPending(key)
		if !ok {
			entry = buildVersionFromRecord(updated)
		}
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
		}
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *ContentTypeBuilderHandlers) updateBlockDefinitionStatus(c router.Context, status string) error {
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	updated, err := panel.Update(adminCtx, id, map[string]any{
		"status": status,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func parseJSONBody(c router.Context, target any) error {
	if c == nil || target == nil {
		return nil
	}
	body := c.Body()
	if len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, target); err != nil {
		return goerrors.New("invalid json payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_JSON")
	}
	return nil
}

func contentTypeKey(id string, record map[string]any) string {
	if record != nil {
		if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
			return val
		}
	}
	return strings.TrimSpace(id)
}

func buildVersionFromRecord(record map[string]any) contentTypeSchemaVersion {
	schema := normalizeSchemaValue(record["schema"])
	if schema == nil || len(schema) == 0 {
		return contentTypeSchemaVersion{}
	}
	entry := contentTypeSchemaVersion{
		Schema:   schema,
		UISchema: normalizeSchemaValue(record["ui_schema"]),
	}
	if version := strings.TrimSpace(anyToString(record["schema_version"])); version != "" {
		entry.Version = version
	}
	if created := strings.TrimSpace(anyToString(record["updated_at"])); created != "" {
		entry.CreatedAt = created
	} else if created := strings.TrimSpace(anyToString(record["created_at"])); created != "" {
		entry.CreatedAt = created
	} else {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return entry
}

func normalizeSchemaValue(value any) map[string]any {
	switch v := value.(type) {
	case map[string]any:
		return v
	case map[string]interface{}:
		out := map[string]any{}
		for key, val := range v {
			out[key] = val
		}
		return out
	case string:
		var out map[string]any
		if err := json.Unmarshal([]byte(v), &out); err == nil {
			return out
		}
	}
	return map[string]any{}
}

func diffSchemas(oldSchema, newSchema map[string]any) ([]schemaChange, []schemaChange) {
	breaking := []schemaChange{}
	warnings := []schemaChange{}
	if oldSchema == nil {
		oldSchema = map[string]any{}
	}
	if newSchema == nil {
		newSchema = map[string]any{}
	}
	oldProps := extractProperties(oldSchema)
	newProps := extractProperties(newSchema)
	oldRequired := requiredSet(oldSchema)
	newRequired := requiredSet(newSchema)

	for field, oldDef := range oldProps {
		newDef, ok := newProps[field]
		if !ok {
			isBreaking := oldRequired[field]
			change := schemaChange{
				Type:       "removed",
				Path:       "properties." + field,
				Field:      field,
				IsBreaking: isBreaking,
			}
			if isBreaking {
				change.Description = "Required field removed"
				breaking = append(breaking, change)
			} else {
				change.Description = "Field removed"
				warnings = append(warnings, change)
			}
			continue
		}
		breaking = append(breaking, compareField(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
		warnings = append(warnings, compareFieldWarnings(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
	}

	for field := range newProps {
		if _, ok := oldProps[field]; ok {
			continue
		}
		if newRequired[field] {
			breaking = append(breaking, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Required field added",
				IsBreaking:  true,
			})
		} else {
			warnings = append(warnings, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Field added",
			})
		}
	}

	return breaking, warnings
}

func extractProperties(schema map[string]any) map[string]any {
	propsRaw, ok := schema["properties"]
	if !ok {
		return map[string]any{}
	}
	switch props := propsRaw.(type) {
	case map[string]any:
		return props
	case map[string]interface{}:
		out := map[string]any{}
		for k, v := range props {
			out[k] = v
		}
		return out
	default:
		return map[string]any{}
	}
}

func requiredSet(schema map[string]any) map[string]bool {
	required := map[string]bool{}
	raw, ok := schema["required"]
	if !ok || raw == nil {
		return required
	}
	switch vals := raw.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				required[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				required[s] = true
			}
		}
	}
	return required
}

func compareField(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldType := strings.TrimSpace(anyToString(oldMap["type"]))
	newType := strings.TrimSpace(anyToString(newMap["type"]))
	if oldType != "" && newType != "" && oldType != newType {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".type",
			Field:       field,
			Description: fmt.Sprintf("Type changed from %s to %s", oldType, newType),
			IsBreaking:  true,
		})
	}

	if oldRequired && !newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is no longer required",
			IsBreaking:  true,
		})
	}

	if !oldRequired && newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is now required",
			IsBreaking:  true,
		})
	}

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 {
		if enumShrink(oldEnum, newEnum) {
			out = append(out, schemaChange{
				Type:        "modified",
				Path:        "properties." + field + ".enum",
				Field:       field,
				Description: "Enum values removed",
				IsBreaking:  true,
			})
		}
	}

	return out
}

func compareFieldWarnings(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 && enumExpand(oldEnum, newEnum) {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".enum",
			Field:       field,
			Description: "Enum values added",
		})
	}

	oldDesc := strings.TrimSpace(anyToString(oldMap["description"]))
	newDesc := strings.TrimSpace(anyToString(newMap["description"]))
	if oldDesc != "" && newDesc != "" && oldDesc != newDesc {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".description",
			Field:       field,
			Description: "Description changed",
		})
	}

	return out
}

func extractEnumSet(value any) map[string]bool {
	out := map[string]bool{}
	switch vals := value.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				out[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				out[s] = true
			}
		}
	}
	return out
}

func enumShrink(oldSet, newSet map[string]bool) bool {
	for val := range oldSet {
		if !newSet[val] {
			return true
		}
	}
	return false
}

func enumExpand(oldSet, newSet map[string]bool) bool {
	for val := range newSet {
		if !oldSet[val] {
			return true
		}
	}
	return false
}

func parseVersionNumber(version string) int {
	if version == "" {
		return 0
	}
	num := 0
	for _, ch := range version {
		if ch < '0' || ch > '9' {
			break
		}
		num = num*10 + int(ch-'0')
	}
	return num
}
