package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"path"
	"strings"

	"github.com/goliatone/go-formgen/pkg/model"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
	formgenschema "github.com/goliatone/go-formgen/pkg/schema"
	router "github.com/goliatone/go-router"
)

// blockLibraryRenderInput contains the prepared data needed to render
// a block definition's schema as form HTML. The caller (typically a
// Phase 2 endpoint or component renderer) is responsible for feeding
// Schema and Overlay into the formgen orchestrator.
type blockLibraryRenderInput struct {
	Schema  map[string]any // Schema after stripping unsupported keywords.
	Overlay []byte         // Marshaled UI overlay (ready for NormalizeOptions.Overlay), nil when no ui_schema.
	Slug    string         // Block definition slug (used as content type slug for form ID discovery).
}

// blockDefinitionsFromLibrary converts stored block definitions into
// renderable []blockDefinition structs. It queries the repository,
// filters by status/slugs, processes each schema through the strip +
// overlay pipeline, and delegates final rendering to renderChild.
//
// When includeInactive is false only definitions with status "active"
// are returned. When allowedSlugs is non-empty only definitions whose
// slug appears in the list are included.
func blockDefinitionsFromLibrary(
	ctx context.Context,
	repo *CMSBlockDefinitionRepository,
	allowedSlugs []string,
	renderChild func(any) (string, error),
	includeInactive bool,
) ([]blockDefinition, error) {
	if repo == nil {
		return nil, nil
	}

	// Build list filters.
	filters := map[string]any{}
	if !includeInactive {
		filters["status"] = "active"
	}

	// Fetch all matching definitions (high PerPage to avoid default pagination).
	items, _, err := repo.List(ctx, ListOptions{
		PerPage: 10000,
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}

	// Build slug allow-set for filtering.
	slugSet := make(map[string]struct{}, len(allowedSlugs))
	for _, s := range allowedSlugs {
		if trimmed := strings.ToLower(strings.TrimSpace(s)); trimmed != "" {
			slugSet[trimmed] = struct{}{}
		}
	}

	definitions := make([]blockDefinition, 0, len(items))
	for _, item := range items {
		slug := strings.TrimSpace(toString(item["slug"]))

		// Filter by allowed slugs (empty set = all).
		if len(slugSet) > 0 {
			if _, ok := slugSet[strings.ToLower(slug)]; !ok {
				continue
			}
		}

		// Extract schema and ui_schema maps.
		schema, _ := item["schema"].(map[string]any)
		uiSchema, _ := item["ui_schema"].(map[string]any)

		// 1.3: Strip unsupported JSON Schema keywords.
		stripped := stripUnsupportedSchemaKeywords(schema)
		if stripped != nil {
			if _, ok := stripped["$schema"]; !ok {
				stripped["$schema"] = "https://json-schema.org/draft/2020-12/schema"
			}
		}

		// 1.4: Prepare UI overlay bytes using the overlay mechanism
		// (same pattern as content_type_builder_module.go:1050-1059).
		var overlay []byte
		if len(uiSchema) > 0 {
			overlayDoc := cloneAnyMap(uiSchema)
			if overlayDoc != nil {
				if _, ok := overlayDoc["$schema"]; !ok {
					overlayDoc["$schema"] = "x-ui-overlay/v1"
				}
			}
			if raw, err := json.Marshal(overlayDoc); err == nil {
				overlay = raw
			}
		}

		// 1.5: Render HTML via renderChild.
		html := ""
		if renderChild != nil {
			rendered, renderErr := renderChild(blockLibraryRenderInput{
				Schema:  stripped,
				Overlay: overlay,
				Slug:    slug,
			})
			if renderErr != nil {
				return nil, renderErr
			}
			html = rendered
		}

		// 1.6: Derive required_fields from top-level required array,
		// excluding _type and _schema metadata keys.
		requiredFields := deriveBlockRequiredFields(schema)

		// 1.7: Map fields from the repository result.
		name := strings.TrimSpace(toString(item["name"]))
		icon := strings.TrimSpace(toString(item["icon"]))

		// Category: def.Category → schemaCategoryFromSchema → "custom"
		category := strings.TrimSpace(toString(item["category"]))

		// Status: from repository result (already resolved by repo.List).
		status := strings.TrimSpace(toString(item["status"]))

		schemaVersion := strings.TrimSpace(toString(item["schema_version"]))

		definitions = append(definitions, blockDefinition{
			Type:           slug,
			Label:          name,
			Icon:           icon,
			Category:       category,
			Status:         status,
			Schema:         schemaVersion,
			RequiredFields: requiredFields,
			HTML:           html,
		})
	}

	return definitions, nil
}

// deriveBlockRequiredFields extracts the top-level required field names
// from a JSON Schema, excluding the _type and _schema metadata keys.
func deriveBlockRequiredFields(schema map[string]any) []string {
	if schema == nil {
		return nil
	}

	raw, ok := schema["required"]
	if !ok {
		return nil
	}

	reqArr, ok := raw.([]any)
	if !ok {
		return nil
	}

	var fields []string
	for _, item := range reqArr {
		name, ok := item.(string)
		if !ok {
			continue
		}
		name = strings.TrimSpace(name)
		if name == "" || name == "_type" || name == "_schema" {
			continue
		}
		fields = append(fields, name)
	}

	return fields
}

// ---------------------------------------------------------------------------
// Phase 2: Template API Endpoints
// ---------------------------------------------------------------------------

// renderBlockTemplate generates HTML for a single block definition schema
// using the formgen orchestrator. The schema should already have unsupported
// keywords stripped. overlay (if non-nil) is applied via NormalizeOptions.
func (v *FormgenSchemaValidator) renderBlockTemplate(ctx context.Context, schema map[string]any, overlay []byte, slug string) (string, error) {
	if v == nil || v.orchestrator == nil {
		return "", serviceNotConfiguredDomainError("schema validator", map[string]any{
			"component": "block_library_picker",
		})
	}
	if schema == nil {
		return "", nil
	}

	formID, err := resolveFormID(schema, SchemaValidationOptions{Slug: slug})
	if err != nil {
		// Fallback: use slug-based form ID when schema doesn't have discoverable forms.
		formID = strings.TrimSpace(slug) + defaultFormIDOperationSuffix
	}

	doc, err := schemaDocumentFromMap(schema)
	if err != nil {
		return "", err
	}

	normalizeOptions := formgenschema.NormalizeOptions{
		ContentTypeSlug:   strings.TrimSpace(slug),
		DefaultFormSuffix: defaultFormIDOperationSuffix,
		FormID:            formID,
		Overlay:           overlay,
	}

	request := formgenorchestrator.Request{
		SchemaDocument:   &doc,
		Format:           SchemaFormatJSONSchema,
		OperationID:      formID,
		NormalizeOptions: normalizeOptions,
		Renderer:         v.renderer,
		RenderOptions: formgenrender.RenderOptions{
			ChromeClasses: &formgenrender.ChromeClasses{
				Form:     "space-y-6",
				Header:   "space-y-1",
				Section:  "space-y-4",
				Fieldset: "space-y-4",
				Actions:  "hidden",
				Grid:     "grid gap-6",
			},
		},
	}

	html, err := v.orchestrator.Generate(ctx, request)
	if err != nil {
		return "", err
	}
	return string(html), nil
}

// blockLibraryRenderFunc builds a renderChild closure that uses the
// FormgenSchemaValidator to render block definition schemas as HTML.
func blockLibraryRenderFunc(ctx context.Context, validator *FormgenSchemaValidator) func(any) (string, error) {
	return func(input any) (string, error) {
		ri, ok := input.(blockLibraryRenderInput)
		if !ok {
			return "", validationDomainError("block library invalid render input", map[string]any{
				"component": "block_library_picker",
			})
		}
		return validator.renderBlockTemplate(ctx, ri.Schema, ri.Overlay, ri.Slug)
	}
}

// blockDefinitionTemplateItem is the JSON response shape for a single
// block definition template (task 2.3).
type blockDefinitionTemplateItem struct {
	Slug           string   `json:"slug"`
	Label          string   `json:"label"`
	Icon           string   `json:"icon"`
	Category       string   `json:"category"`
	SchemaVersion  string   `json:"schema_version"`
	Status         string   `json:"status"`
	Disabled       bool     `json:"disabled"`
	RequiredFields []string `json:"required_fields"`
	HTML           string   `json:"html"`
}

// blockDefinitionsToResponse converts []blockDefinition to the response
// shape required by the template endpoints. disabled is true when
// status != "active".
func blockDefinitionsToResponse(defs []blockDefinition) []blockDefinitionTemplateItem {
	items := make([]blockDefinitionTemplateItem, 0, len(defs))
	for _, d := range defs {
		reqFields := d.RequiredFields
		if reqFields == nil {
			reqFields = []string{}
		}
		status := strings.TrimSpace(d.Status)
		items = append(items, blockDefinitionTemplateItem{
			Slug:           d.Type,
			Label:          d.Label,
			Icon:           d.Icon,
			Category:       d.Category,
			SchemaVersion:  d.Schema,
			Status:         d.Status,
			Disabled:       !strings.EqualFold(status, "active"),
			RequiredFields: reqFields,
			HTML:           d.HTML,
		})
	}
	return items
}

// registerBlockDefinitionTemplateRoutes registers the single-template
// and batch-templates endpoints for the block library picker.
func (m *ContentTypeBuilderModule) registerBlockDefinitionTemplateRoutes(admin *Admin) {
	if admin == nil || admin.router == nil || m.contentSvc == nil {
		return
	}

	// Create a FormgenSchemaValidator for rendering block templates (task 2.5).
	apiBase := ""
	if admin != nil {
		apiBase = admin.AdminAPIBasePath()
	}
	renderer, err := NewFormgenSchemaValidatorWithAPIBase(m.basePath, apiBase)
	if err != nil {
		return
	}

	repo := NewCMSBlockDefinitionRepository(m.contentSvc, m.contentTypeSvc)

	// Task 2.1: Single-template endpoint.
	singlePath := adminAPIRoutePath(admin, "block_definitions_meta.template")

	singleHandler := func(c router.Context) error {
		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}

		slug := strings.TrimSpace(c.Param("slug"))
		if slug == "" {
			return writeError(c, ErrNotFound)
		}

		includeInactive := strings.EqualFold(strings.TrimSpace(c.Query("include_inactive")), "true")

		// Look up definition by slug to verify existence and status.
		record, err := repo.Get(adminCtx.Context, slug)
		if err != nil {
			return writeError(c, ErrNotFound)
		}
		status := strings.TrimSpace(toString(record["status"]))
		if !includeInactive && !strings.EqualFold(status, "active") {
			return writeError(c, ErrNotFound)
		}

		renderChild := blockLibraryRenderFunc(adminCtx.Context, renderer)
		defs, err := blockDefinitionsFromLibrary(adminCtx.Context, repo, []string{slug}, renderChild, includeInactive)
		if err != nil {
			return writeError(c, err)
		}

		return writeJSON(c, map[string]any{"items": blockDefinitionsToResponse(defs)})
	}

	// Task 2.2: Batch-templates endpoint.
	batchPath := adminAPIRoutePath(admin, "block_definitions_meta.templates")

	batchHandler := func(c router.Context) error {
		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}

		slugsParam := strings.TrimSpace(c.Query("slugs"))
		var slugs []string
		if slugsParam != "" {
			for _, s := range strings.Split(slugsParam, ",") {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					slugs = append(slugs, trimmed)
				}
			}
		}

		includeInactive := strings.EqualFold(strings.TrimSpace(c.Query("include_inactive")), "true")

		renderChild := blockLibraryRenderFunc(adminCtx.Context, renderer)
		defs, err := blockDefinitionsFromLibrary(adminCtx.Context, repo, slugs, renderChild, includeInactive)
		if err != nil {
			return writeError(c, err)
		}

		return writeJSON(c, map[string]any{"items": blockDefinitionsToResponse(defs)})
	}

	// Task 2.4: Register routes with auth wrapper.
	authWrap := admin.authWrapper()
	if authWrap != nil {
		singleHandler = authWrap(singleHandler)
		batchHandler = authWrap(batchHandler)
	}

	// Register routes.
	admin.router.Get(batchPath, batchHandler)
	admin.router.Get(singlePath, singleHandler)
}

// ---------------------------------------------------------------------------
// Phase 3: Component Descriptor + Go Template
// ---------------------------------------------------------------------------

const (
	blockLibraryPickerTemplate = "templates/components/block_library_picker.tmpl"
	blockLibraryPickerPartial  = "forms.block-library-picker"
)

// blockLibraryPickerRenderer renders the shell DOM for the block library picker
// component. It does NOT make repository calls; block templates are loaded by
// the frontend via Phase 2 API endpoints.
func blockLibraryPickerRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	if data.Template == nil {
		return serviceNotConfiguredDomainError("block library template renderer", map[string]any{
			"component": "block_library_picker",
		})
	}

	templateName := blockLibraryPickerTemplate
	if data.ThemePartials != nil {
		if candidate := strings.TrimSpace(data.ThemePartials[blockLibraryPickerPartial]); candidate != "" {
			templateName = candidate
		}
	}

	sortable := resolveBlockBool(data.Config, field.UIHints, "sortable", false)
	addLabel := resolveBlockString(data.Config, field.UIHints, "addLabel", "")
	emptyLabel := resolveBlockString(data.Config, field.UIHints, "emptyLabel", "")
	maxBlocks := pickerIntFromConfig(data.Config, "maxBlocks", 0)
	apiBase := pickerStringFromConfig(data.Config, "apiBase")

	allowedBlocks := pickerAllowedBlocks(data.Config)
	allowedBlocksJSON := "[]"
	if len(allowedBlocks) > 0 {
		if raw, err := json.Marshal(allowedBlocks); err == nil {
			allowedBlocksJSON = string(raw)
		}
	}

	serialized := serializeBlockDefaults(field.Default)

	configJSON := ""
	if len(data.Config) > 0 {
		if raw, err := json.Marshal(data.Config); err == nil {
			configJSON = string(raw)
		}
	}

	// Pre-rendered templates (optional optimization — typically nil because
	// the picker loads templates from the API).
	preRendered := coercePreRenderedTemplates(data.Config)

	payload := map[string]any{
		"field":                  field,
		"config":                 data.Config,
		"config_json":            configJSON,
		"serialized":             serialized,
		"sortable":               sortable,
		"add_label":              addLabel,
		"empty_label":            emptyLabel,
		"max_blocks":             maxBlocks,
		"api_base":               apiBase,
		"allowed_blocks_json":    allowedBlocksJSON,
		"lazy_load":              resolveBlockBool(data.Config, field.UIHints, "lazyLoad", true),
		"include_inactive":       resolveBlockBool(data.Config, field.UIHints, "includeInactive", false),
		"searchable":             resolveBlockBool(data.Config, field.UIHints, "searchable", true),
		"group_by_category":      resolveBlockBool(data.Config, field.UIHints, "groupByCategory", true),
		"pre_rendered_templates": preRendered,
	}

	rendered, err := data.Template.RenderTemplate(templateName, payload)
	if err != nil {
		return serviceUnavailableDomainError("block library template render failed", map[string]any{
			"component": "block_library_picker",
			"template":  templateName,
			"error":     err.Error(),
		})
	}
	buf.WriteString(rendered)
	return nil
}

// BlockLibraryPickerDescriptor returns the component descriptor for registration.
func BlockLibraryPickerDescriptor(basePath string) components.Descriptor {
	return BlockLibraryPickerDescriptorWithAPIBase(basePath, "")
}

// BlockLibraryPickerDescriptorWithAPIBase returns the component descriptor with an explicit API base.
// apiBase should point to the admin API root (e.g. /admin/api or /admin/api/v0).
func BlockLibraryPickerDescriptorWithAPIBase(basePath, apiBase string) components.Descriptor {
	return components.Descriptor{
		Renderer: blockLibraryPickerRendererWithBasePath(basePath, apiBase),
		Scripts: []components.Script{
			{Src: blockLibraryPickerScript(basePath), Defer: true, Module: true},
		},
	}
}

func blockLibraryPickerScript(basePath string) string {
	assetsPrefix := path.Join(strings.TrimSuffix(strings.TrimSpace(basePath), "/"), "assets")
	if assetsPrefix == "" || assetsPrefix == "assets" {
		assetsPrefix = "/assets"
	}
	if !strings.HasPrefix(assetsPrefix, "/") {
		assetsPrefix = "/" + assetsPrefix
	}
	return path.Join(assetsPrefix, "dist/formgen/block_library_picker.js")
}

func pickerAllowedBlocks(config map[string]any) []string {
	if config == nil {
		return nil
	}
	raw, ok := config["allowedBlocks"]
	if !ok {
		return nil
	}
	switch v := raw.(type) {
	case []string:
		return v
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
		return out
	}
	return nil
}

func blockLibraryPickerRendererWithBasePath(basePath, apiBase string) func(*bytes.Buffer, model.Field, components.ComponentData) error {
	defaultAPIBase := strings.TrimSpace(apiBase)
	if defaultAPIBase == "" {
		defaultAPIBase = joinBasePath(basePath, "api")
	}
	return func(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
		data = withDefaultPickerAPIBase(data, defaultAPIBase)
		return blockLibraryPickerRenderer(buf, field, data)
	}
}

func withDefaultPickerAPIBase(data components.ComponentData, defaultAPIBase string) components.ComponentData {
	if strings.TrimSpace(defaultAPIBase) == "" {
		return data
	}
	if data.Config != nil {
		if raw, ok := data.Config["apiBase"]; ok {
			if v, ok := raw.(string); ok && strings.TrimSpace(v) != "" {
				return data
			}
		}
		cfg := make(map[string]any, len(data.Config)+1)
		for key, val := range data.Config {
			cfg[key] = val
		}
		cfg["apiBase"] = defaultAPIBase
		data.Config = cfg
		return data
	}
	data.Config = map[string]any{"apiBase": defaultAPIBase}
	return data
}

func coercePreRenderedTemplates(config map[string]any) []blockDefinition {
	if config == nil {
		return nil
	}
	raw, ok := config["preRenderedTemplates"]
	if !ok || raw == nil {
		return nil
	}
	switch v := raw.(type) {
	case []blockDefinition:
		return v
	case []any:
		out := make([]blockDefinition, 0, len(v))
		for _, item := range v {
			if def, ok := coerceBlockDefinition(item); ok {
				out = append(out, def)
			}
		}
		if len(out) == 0 {
			return nil
		}
		return out
	case []map[string]any:
		out := make([]blockDefinition, 0, len(v))
		for _, item := range v {
			if def, ok := coerceBlockDefinition(item); ok {
				out = append(out, def)
			}
		}
		if len(out) == 0 {
			return nil
		}
		return out
	}
	return nil
}

func coerceBlockDefinition(raw any) (blockDefinition, bool) {
	switch v := raw.(type) {
	case blockDefinition:
		if strings.TrimSpace(v.Type) == "" {
			return blockDefinition{}, false
		}
		return v, true
	case map[string]any:
		return coerceBlockDefinitionFromMap(v)
	case map[string]string:
		out := map[string]any{}
		for key, val := range v {
			out[key] = val
		}
		return coerceBlockDefinitionFromMap(out)
	}
	return blockDefinition{}, false
}

func coerceBlockDefinitionFromMap(raw map[string]any) (blockDefinition, bool) {
	if raw == nil {
		return blockDefinition{}, false
	}
	typ := strings.TrimSpace(toString(raw["type"]))
	if typ == "" {
		return blockDefinition{}, false
	}
	schema := strings.TrimSpace(toString(raw["schema"]))
	if schema == "" {
		schema = strings.TrimSpace(toString(raw["schema_version"]))
	}
	return blockDefinition{
		Type:      typ,
		Label:     strings.TrimSpace(toString(raw["label"])),
		Icon:      strings.TrimSpace(toString(raw["icon"])),
		Collapsed: toBool(raw["collapsed"]),
		Schema:    schema,
		HTML:      toString(raw["html"]),
	}, true
}

func pickerStringFromConfig(config map[string]any, key string) string {
	if config == nil {
		return ""
	}
	if raw, ok := config[key]; ok {
		if v, ok := raw.(string); ok {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func pickerIntFromConfig(config map[string]any, key string, fallback int) int {
	if config == nil {
		return fallback
	}
	raw, ok := config[key]
	if !ok {
		return fallback
	}
	switch v := raw.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	}
	return fallback
}
