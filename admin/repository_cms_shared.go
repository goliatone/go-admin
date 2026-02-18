package admin

import (
	"encoding/json"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

func ensureCMSContentService(content CMSContentService) error {
	if content == nil {
		return ErrNotFound
	}
	return nil
}

func ensureCMSWidgetService(widgets CMSWidgetService) error {
	if widgets == nil {
		return ErrNotFound
	}
	return nil
}

func cmsBlockRecord(block CMSBlock) map[string]any {
	return map[string]any{
		"id":               block.ID,
		"definition_id":    block.DefinitionID,
		"content_id":       block.ContentID,
		"region":           block.Region,
		"locale":           block.Locale,
		"status":           block.Status,
		"position":         block.Position,
		"data":             primitives.CloneAnyMap(block.Data),
		"block_type":       block.BlockType,
		"block_schema_key": block.BlockSchemaKey,
	}
}

func widgetDefinitionRecord(def WidgetDefinition) map[string]any {
	return map[string]any{
		"code":   def.Code,
		"name":   def.Name,
		"schema": primitives.CloneAnyMap(def.Schema),
	}
}

func widgetInstanceRecord(instance WidgetInstance) map[string]any {
	return map[string]any{
		"id":              instance.ID,
		"definition_code": instance.DefinitionCode,
		"area":            instance.Area,
		"page_id":         instance.PageID,
		"locale":          instance.Locale,
		"config":          primitives.CloneAnyMap(instance.Config),
		"position":        instance.Position,
	}
}

type cmsCommonRecordFields struct {
	ID                 string
	TranslationGroupID string
	Title              string
	Slug               string
	Locale             string
	Status             string
}

type cmsMappedDataFields struct {
	Data          map[string]any
	Blocks        []string
	Embedded      []map[string]any
	SchemaVersion string
}

func assignStringIfPresent(record map[string]any, key string, target *string) {
	if record == nil || target == nil {
		return
	}
	if value, ok := record[key].(string); ok {
		*target = value
	}
}

func extractCMSCommonRecordFields(record map[string]any) cmsCommonRecordFields {
	fields := cmsCommonRecordFields{}
	assignStringIfPresent(record, "id", &fields.ID)
	assignStringIfPresent(record, "translation_group_id", &fields.TranslationGroupID)
	assignStringIfPresent(record, "title", &fields.Title)
	assignStringIfPresent(record, "slug", &fields.Slug)
	assignStringIfPresent(record, "locale", &fields.Locale)
	assignStringIfPresent(record, "status", &fields.Status)
	return fields
}

func mapCMSDataFields(record map[string]any) cmsMappedDataFields {
	mapped := cmsMappedDataFields{
		Data: map[string]any{},
	}
	if record == nil {
		return mapped
	}
	if rawBlocks, ok := record["blocks"]; ok {
		legacy, embedded, embeddedPresent := parseBlocksPayload(rawBlocks)
		if embeddedPresent {
			mapped.Embedded = embedded
			mapped.Data["blocks"] = embedded
		} else if len(legacy) > 0 {
			mapped.Blocks = legacy
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		mapped.Data = primitives.CloneAnyMap(data)
	}
	if mapped.Embedded == nil {
		if embedded, present := embeddedBlocksFromData(mapped.Data); present {
			mapped.Embedded = embedded
		}
	}
	if mapped.Embedded != nil {
		if mapped.Data == nil {
			mapped.Data = map[string]any{}
		}
		mapped.Data["blocks"] = cloneEmbeddedBlocks(mapped.Embedded)
	}
	if schema := schemaVersionFromRecord(record, mapped.Data); schema != "" {
		mapped.SchemaVersion = schema
		if mapped.Data == nil {
			mapped.Data = map[string]any{}
		}
		mapped.Data["_schema"] = schema
	}
	return mapped
}

func normalizedLocaleList(raw any) []string {
	if raw == nil {
		return nil
	}
	locales := []string{}
	switch typed := raw.(type) {
	case []string:
		locales = append(locales, typed...)
	case []any:
		for _, item := range typed {
			if val := strings.TrimSpace(toString(item)); val != "" {
				locales = append(locales, val)
			}
		}
	case string:
		for _, item := range strings.Split(typed, ",") {
			if val := strings.TrimSpace(item); val != "" {
				locales = append(locales, val)
			}
		}
	default:
		if val := strings.TrimSpace(toString(raw)); val != "" {
			locales = append(locales, val)
		}
	}
	if len(locales) == 0 {
		return nil
	}
	return locales
}

func preserveStringField(record map[string]any, key string, target *string, fallback string) {
	if target == nil {
		return
	}
	if !recordHasKey(record, key) {
		*target = fallback
	}
}

func mergeCMSBlocksUpdate(record map[string]any, blocks *[]string, embedded *[]map[string]any, existingBlocks []string, existingEmbedded []map[string]any) {
	if blocks == nil || embedded == nil {
		return
	}
	if recordHasKey(record, "blocks") {
		return
	}
	*blocks = append([]string{}, existingBlocks...)
	if *embedded == nil && existingEmbedded != nil {
		*embedded = cloneEmbeddedBlocks(existingEmbedded)
	}
}

func mergeCMSMetadataUpdate(record map[string]any, metadata *map[string]any, existing map[string]any) {
	if metadata == nil {
		return
	}
	if !recordHasKey(record, "metadata") {
		*metadata = primitives.CloneAnyMap(existing)
		return
	}
	*metadata = primitives.CloneAnyMap(*metadata)
}

func mergeCMSDataUpdate(existingData map[string]any, incomingData map[string]any, shouldMerge bool) map[string]any {
	if shouldMerge {
		return mergeAnyMap(existingData, incomingData)
	}
	return primitives.CloneAnyMap(existingData)
}

func finalizeCMSDataSchemaAndBlocks(record map[string]any, data map[string]any, schemaVersion string, existingSchema string, embedded []map[string]any) (map[string]any, string, []map[string]any) {
	if schemaVersion == "" && !recordHasKey(record, "_schema") {
		schemaVersion = existingSchema
	}
	if schemaVersion == "" {
		schemaVersion = strings.TrimSpace(toString(data["_schema"]))
	}
	if schemaVersion != "" {
		if data == nil {
			data = map[string]any{}
		}
		data["_schema"] = schemaVersion
	}
	if embedded == nil && data != nil {
		if next, present := embeddedBlocksFromData(data); present {
			embedded = next
		}
	}
	if embedded != nil {
		if data == nil {
			data = map[string]any{}
		}
		data["blocks"] = cloneEmbeddedBlocks(embedded)
	}
	return data, schemaVersion, embedded
}

func mapToCMSPage(record map[string]any) CMSPage {
	page := CMSPage{
		Data: map[string]any{},
		SEO:  map[string]any{},
	}
	if record == nil {
		return page
	}
	common := extractCMSCommonRecordFields(record)
	page.ID = common.ID
	page.TranslationGroupID = common.TranslationGroupID
	page.Title = common.Title
	page.Slug = common.Slug
	page.Locale = common.Locale
	page.Status = common.Status
	if parentID, ok := record["parent_id"].(string); ok {
		page.ParentID = parentID
	}
	mapped := mapCMSDataFields(record)
	page.Data = mapped.Data
	page.Blocks = mapped.Blocks
	page.EmbeddedBlocks = mapped.Embedded
	page.SchemaVersion = mapped.SchemaVersion
	if seo, ok := record["seo"].(map[string]any); ok {
		page.SEO = primitives.CloneAnyMap(seo)
	}
	if path, ok := record["path"].(string); ok && strings.TrimSpace(path) != "" {
		page.Data["path"] = path
		if page.PreviewURL == "" {
			page.PreviewURL = path
		}
		if page.Slug == "" {
			page.Slug = path
		}
	}
	if preview, ok := record["preview_url"].(string); ok {
		page.PreviewURL = preview
	}
	if tpl, ok := record["template_id"].(string); ok {
		page.TemplateID = tpl
	}
	if tpl, ok := record["template"].(string); ok && page.TemplateID == "" {
		page.TemplateID = tpl
	}
	if meta, ok := record["metadata"].(map[string]any); ok {
		page.Metadata = primitives.CloneAnyMap(meta)
	}
	return page
}

func mergeCMSPageUpdate(existing CMSPage, page CMSPage, record map[string]any) CMSPage {
	if record == nil {
		return existing
	}
	preserveStringField(record, "title", &page.Title, existing.Title)
	preserveStringField(record, "slug", &page.Slug, existing.Slug)
	preserveStringField(record, "locale", &page.Locale, existing.Locale)
	preserveStringField(record, "translation_group_id", &page.TranslationGroupID, existing.TranslationGroupID)
	preserveStringField(record, "status", &page.Status, existing.Status)
	preserveStringField(record, "parent_id", &page.ParentID, existing.ParentID)
	if !recordHasKey(record, "preview_url") {
		page.PreviewURL = existing.PreviewURL
	}
	mergeCMSBlocksUpdate(record, &page.Blocks, &page.EmbeddedBlocks, existing.Blocks, existing.EmbeddedBlocks)
	if !recordHasKey(record, "template_id") && !recordHasKey(record, "template") {
		page.TemplateID = existing.TemplateID
	}
	mergeCMSMetadataUpdate(record, &page.Metadata, existing.Metadata)
	if recordHasKey(record, "seo") {
		page.SEO = mergeAnyMap(existing.SEO, page.SEO)
	} else {
		page.SEO = primitives.CloneAnyMap(existing.SEO)
	}
	page.Data = mergeCMSDataUpdate(existing.Data, page.Data, recordHasKey(record, "data") || recordHasKey(record, "path") || recordHasKey(record, "blocks") || recordHasKey(record, "_schema"))
	page.Data, page.SchemaVersion, page.EmbeddedBlocks = finalizeCMSDataSchemaAndBlocks(record, page.Data, page.SchemaVersion, existing.SchemaVersion, page.EmbeddedBlocks)
	return page
}

var cmsContentReservedKeys = map[string]struct{}{
	"id":                       {},
	"title":                    {},
	"slug":                     {},
	"locale":                   {},
	"status":                   {},
	"content_type":             {},
	"content_type_slug":        {},
	"content_type_id":          {},
	"translation_group_id":     {},
	"requested_locale":         {},
	"resolved_locale":          {},
	"available_locales":        {},
	"missing_requested_locale": {},
	"blocks":                   {},
	"data":                     {},
	"metadata":                 {},
	"schema":                   {},
	"_schema":                  {},
}

func mapToCMSContent(record map[string]any) CMSContent {
	content := CMSContent{
		Data: map[string]any{},
	}
	if record == nil {
		return content
	}
	common := extractCMSCommonRecordFields(record)
	content.ID = common.ID
	content.TranslationGroupID = common.TranslationGroupID
	content.Title = common.Title
	content.Slug = common.Slug
	content.Locale = common.Locale
	content.Status = common.Status
	if requested, ok := record["requested_locale"].(string); ok {
		content.RequestedLocale = strings.TrimSpace(requested)
	} else if requested := strings.TrimSpace(toString(record["requested_locale"])); requested != "" {
		content.RequestedLocale = requested
	}
	if resolved, ok := record["resolved_locale"].(string); ok {
		content.ResolvedLocale = strings.TrimSpace(resolved)
	} else if resolved := strings.TrimSpace(toString(record["resolved_locale"])); resolved != "" {
		content.ResolvedLocale = resolved
	}
	if missing, ok := record["missing_requested_locale"].(bool); ok {
		content.MissingRequestedLocale = missing
	}
	if locales := normalizedLocaleList(record["available_locales"]); len(locales) > 0 {
		content.AvailableLocales = append([]string{}, locales...)
	}
	if ctype, ok := record["content_type"].(string); ok {
		if content.ContentTypeSlug == "" {
			content.ContentTypeSlug = ctype
		}
		if content.ContentType == "" {
			content.ContentType = ctype
		}
	}
	if ctype, ok := record["content_type_slug"].(string); ok {
		content.ContentTypeSlug = ctype
	}
	if ctype, ok := record["content_type_id"].(string); ok && ctype != "" {
		content.ContentType = ctype
	}
	if content.ContentType == "" && content.ContentTypeSlug != "" {
		content.ContentType = content.ContentTypeSlug
	}
	mapped := mapCMSDataFields(record)
	content.Data = mapped.Data
	content.Blocks = mapped.Blocks
	content.EmbeddedBlocks = mapped.Embedded
	content.SchemaVersion = mapped.SchemaVersion
	if meta, ok := record["metadata"].(map[string]any); ok {
		content.Metadata = primitives.CloneAnyMap(meta)
	}
	for key, val := range record {
		if _, skip := cmsContentReservedKeys[key]; skip {
			continue
		}
		if strings.HasPrefix(key, "_") {
			continue
		}
		content.Data[key] = val
	}
	return content
}

func mergeCMSContentUpdate(existing CMSContent, content CMSContent, record map[string]any) CMSContent {
	if record == nil {
		return existing
	}
	preserveStringField(record, "title", &content.Title, existing.Title)
	preserveStringField(record, "slug", &content.Slug, existing.Slug)
	preserveStringField(record, "locale", &content.Locale, existing.Locale)
	preserveStringField(record, "translation_group_id", &content.TranslationGroupID, existing.TranslationGroupID)
	preserveStringField(record, "status", &content.Status, existing.Status)
	mergeCMSBlocksUpdate(record, &content.Blocks, &content.EmbeddedBlocks, existing.Blocks, existing.EmbeddedBlocks)
	if !recordHasKey(record, "content_type") && !recordHasKey(record, "content_type_slug") && !recordHasKey(record, "content_type_id") {
		content.ContentType = existing.ContentType
		content.ContentTypeSlug = existing.ContentTypeSlug
	}
	mergeCMSMetadataUpdate(record, &content.Metadata, existing.Metadata)
	content.Data = mergeCMSDataUpdate(existing.Data, content.Data, cmsContentDataUpdated(record))
	content.Data, content.SchemaVersion, content.EmbeddedBlocks = finalizeCMSDataSchemaAndBlocks(record, content.Data, content.SchemaVersion, existing.SchemaVersion, content.EmbeddedBlocks)
	content.Data = pruneNilMapValues(content.Data)
	return content
}

func recordHasKey(record map[string]any, key string) bool {
	if record == nil {
		return false
	}
	_, ok := record[key]
	return ok
}

func cmsContentDataUpdated(record map[string]any) bool {
	if record == nil {
		return false
	}
	if _, ok := record["_schema"]; ok {
		return true
	}
	if _, ok := record["blocks"]; ok {
		return true
	}
	if _, ok := record["data"]; ok {
		return true
	}
	for key := range record {
		if _, skip := cmsContentReservedKeys[key]; skip {
			continue
		}
		if strings.HasPrefix(key, "_") {
			continue
		}
		return true
	}
	return false
}

func mergeAnyMap(base map[string]any, updates map[string]any) map[string]any {
	merged := map[string]any{}
	for key, val := range base {
		merged[key] = val
	}
	for key, val := range updates {
		merged[key] = val
	}
	return merged
}

func pruneNilMapValues(input map[string]any) map[string]any {
	if input == nil {
		return nil
	}
	clean := map[string]any{}
	for key, val := range input {
		if val == nil {
			continue
		}
		clean[key] = val
	}
	return clean
}

func mergeCMSRecordData(record map[string]any, data map[string]any, reserved map[string]struct{}) {
	if record == nil || len(data) == 0 {
		return
	}
	for key, val := range data {
		if _, skip := reserved[key]; skip {
			continue
		}
		if _, exists := record[key]; exists {
			continue
		}
		record[key] = val
	}
}

func schemaVersionFromRecord(record map[string]any, data map[string]any) string {
	if record != nil {
		if schema := strings.TrimSpace(toString(record["_schema"])); schema != "" {
			return schema
		}
	}
	if data != nil {
		if schema := strings.TrimSpace(toString(data["_schema"])); schema != "" {
			return schema
		}
	}
	return ""
}

func blocksPayloadFromContent(content CMSContent) any {
	if content.EmbeddedBlocks != nil {
		return cloneEmbeddedBlocks(content.EmbeddedBlocks)
	}
	if embedded, present := embeddedBlocksFromData(content.Data); present {
		return embedded
	}
	if content.Blocks != nil {
		return append([]string{}, content.Blocks...)
	}
	return nil
}

func blocksPayloadFromPage(page CMSPage) any {
	if page.EmbeddedBlocks != nil {
		return cloneEmbeddedBlocks(page.EmbeddedBlocks)
	}
	if embedded, present := embeddedBlocksFromData(page.Data); present {
		return embedded
	}
	if page.Blocks != nil {
		return append([]string{}, page.Blocks...)
	}
	return nil
}

func resolveCMSPagePath(page CMSPage) string {
	if page.Data != nil {
		if path := strings.TrimSpace(toString(page.Data["path"])); path != "" {
			return path
		}
	}
	if strings.TrimSpace(page.PreviewURL) != "" {
		return page.PreviewURL
	}
	return page.Slug
}

func mapToCMSContentType(record map[string]any) CMSContentType {
	ct := CMSContentType{}
	if record == nil {
		return ct
	}
	if id, ok := record["content_type_id"].(string); ok {
		ct.ID = id
	}
	if id, ok := record["type_id"].(string); ok && ct.ID == "" {
		ct.ID = id
	}
	if id, ok := record["id"].(string); ok && ct.ID == "" {
		ct.ID = id
	}
	if name, ok := record["name"].(string); ok {
		ct.Name = name
	}
	if slug, ok := record["slug"].(string); ok {
		ct.Slug = slug
	} else if slug, ok := record["content_type_slug"].(string); ok && ct.Slug == "" {
		ct.Slug = slug
	}
	if desc, ok := record["description"].(string); ok {
		ct.Description = desc
	}
	if _, ok := record["description"]; ok {
		ct.DescriptionSet = true
	}
	if icon, ok := record["icon"].(string); ok {
		ct.Icon = icon
	}
	if _, ok := record["icon"]; ok {
		ct.IconSet = true
	}
	if status, ok := record["status"].(string); ok {
		ct.Status = status
	}
	if raw, ok := record["allow_breaking_changes"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	} else if raw, ok := record["allow_breaking"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	} else if raw, ok := record["force"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	}
	if raw, ok := record["replace_capabilities"]; ok {
		ct.ReplaceCapabilities = toBool(raw)
	} else if raw, ok := record["replaceCapabilities"]; ok {
		ct.ReplaceCapabilities = toBool(raw)
	}
	if env, ok := record["environment"].(string); ok {
		ct.Environment = env
	} else if env, ok := record["env"].(string); ok && ct.Environment == "" {
		ct.Environment = env
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		ct.Schema = stripUnsupportedSchemaKeywords(primitives.CloneAnyMap(schema))
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.Schema = stripUnsupportedSchemaKeywords(m)
		}
	}
	if uiSchema, ok := record["ui_schema"].(map[string]any); ok {
		ct.UISchema = primitives.CloneAnyMap(uiSchema)
	} else if uiSchema, ok := record["uiSchema"].(map[string]any); ok && ct.UISchema == nil {
		ct.UISchema = primitives.CloneAnyMap(uiSchema)
	} else if raw, ok := record["ui_schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.UISchema = m
		}
	}
	if caps, ok := record["capabilities"].(map[string]any); ok {
		ct.Capabilities = primitives.CloneAnyMap(caps)
	} else if raw, ok := record["capabilities"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.Capabilities = m
		}
	}
	return ct
}

func capabilitiesReplaceRequested(record map[string]any) bool {
	if record == nil {
		return false
	}
	if raw, ok := record["replace_capabilities"]; ok {
		return toBool(raw)
	}
	if raw, ok := record["replaceCapabilities"]; ok {
		return toBool(raw)
	}
	return false
}

func mergeCMSContentTypeSchema(base, incoming map[string]any) map[string]any {
	if incoming == nil {
		return base
	}
	if base == nil {
		return incoming
	}
	merged := cloneAnyMapDeep(incoming)
	mergeSchemaSection(merged, base, "$defs")
	mergeSchemaSection(merged, base, "metadata")
	return merged
}

func mergeSchemaSection(target, base map[string]any, key string) {
	if target == nil || base == nil {
		return
	}
	baseSection, ok := base[key].(map[string]any)
	if !ok || len(baseSection) == 0 {
		return
	}
	section, _ := target[key].(map[string]any)
	if section == nil {
		section = map[string]any{}
	}
	for k, v := range baseSection {
		if _, exists := section[k]; exists {
			continue
		}
		section[k] = cloneAnyValueDeep(v)
	}
	target[key] = section
}

func cloneAnyMapDeep(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = cloneAnyValueDeep(v)
	}
	return out
}

func cloneAnySliceDeep(in []any) []any {
	if in == nil {
		return nil
	}
	out := make([]any, len(in))
	for i, v := range in {
		out[i] = cloneAnyValueDeep(v)
	}
	return out
}

func cloneAnyValueDeep(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneAnyMapDeep(typed)
	case []any:
		return cloneAnySliceDeep(typed)
	default:
		return typed
	}
}

func mapToCMSBlockDefinition(record map[string]any) CMSBlockDefinition {
	def := CMSBlockDefinition{}
	if record == nil {
		return def
	}
	if id, ok := record["id"].(string); ok {
		def.ID = id
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if slug, ok := record["slug"].(string); ok {
		def.Slug = slug
	}
	if typ, ok := record["type"].(string); ok {
		def.Type = typ
	}
	if desc, ok := record["description"].(string); ok {
		def.Description = desc
	}
	if _, ok := record["description"]; ok {
		def.DescriptionSet = true
	}
	if icon, ok := record["icon"].(string); ok {
		def.Icon = icon
	}
	if _, ok := record["icon"]; ok {
		def.IconSet = true
	}
	if category, ok := record["category"].(string); ok {
		def.Category = category
	}
	if _, ok := record["category"]; ok {
		def.CategorySet = true
	}
	if status, ok := record["status"].(string); ok {
		def.Status = status
	}
	if env, ok := record["environment"].(string); ok {
		def.Environment = env
	} else if env, ok := record["env"].(string); ok && def.Environment == "" {
		def.Environment = env
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = primitives.CloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			def.Schema = m
		}
	}
	if uiSchema, ok := record["ui_schema"].(map[string]any); ok {
		def.UISchema = primitives.CloneAnyMap(uiSchema)
	} else if uiSchema, ok := record["uiSchema"].(map[string]any); ok && def.UISchema == nil {
		def.UISchema = primitives.CloneAnyMap(uiSchema)
	} else if raw, ok := record["ui_schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			def.UISchema = m
		}
	}
	if version, ok := record["schema_version"].(string); ok {
		def.SchemaVersion = version
	}
	if status, ok := record["migration_status"].(string); ok {
		def.MigrationStatus = status
	}
	if locale, ok := record["locale"].(string); ok {
		def.Locale = locale
	}
	return def
}

func applyBlockDefinitionDefaults(def *CMSBlockDefinition) {
	if def == nil {
		return
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = strings.TrimSpace(schemaVersionFromSchema(def.Schema))
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = strings.TrimSpace(schemaMigrationStatusFromSchema(def.Schema))
	}
	if def.Status == "" {
		def.Status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
	}
	if def.Status == "" {
		def.Status = "draft"
	}
	if def.Category == "" && !def.CategorySet {
		def.Category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
	}
	if def.Slug == "" {
		def.Slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
	}
	if def.Slug == "" {
		if name := strings.TrimSpace(def.Name); name != "" {
			def.Slug = normalizeContentTypeSlug(name, def.Slug)
		}
	}
	if def.Slug == "" {
		def.Slug = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Type, def.Name, def.ID))
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.Name, def.ID))
	}
}

func mapToCMSBlock(record map[string]any) CMSBlock {
	block := CMSBlock{
		Data: map[string]any{},
	}
	if record == nil {
		return block
	}
	if id, ok := record["id"].(string); ok {
		block.ID = id
	}
	if defID, ok := record["definition_id"].(string); ok {
		block.DefinitionID = defID
	}
	if contentID, ok := record["content_id"].(string); ok {
		block.ContentID = contentID
	}
	if region, ok := record["region"].(string); ok {
		block.Region = region
	}
	if locale, ok := record["locale"].(string); ok {
		block.Locale = locale
	}
	if status, ok := record["status"].(string); ok {
		block.Status = status
	}
	if pos, ok := record["position"].(int); ok {
		block.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		block.Position = int(posf)
	}
	if data, ok := record["data"].(map[string]any); ok {
		block.Data = primitives.CloneAnyMap(data)
	} else if raw, ok := record["data"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			block.Data = parsed
		}
	}
	if btype, ok := record["block_type"].(string); ok {
		block.BlockType = btype
	}
	if key, ok := record["block_schema_key"].(string); ok {
		block.BlockSchemaKey = key
	}
	return block
}

func mapToMenuItem(record map[string]any, defaultMenu string) (MenuItem, string) {
	item := MenuItem{}
	menuCode := defaultMenu
	if record == nil {
		return item, menuCode
	}
	if id, ok := record["id"].(string); ok {
		item.ID = id
	}
	if label, ok := record["label"].(string); ok {
		item.Label = label
	}
	if icon, ok := record["icon"].(string); ok {
		item.Icon = icon
	}
	if pos, ok := record["position"].(int); ok {
		item.Position = primitives.Int(pos)
	} else if posf, ok := record["position"].(float64); ok {
		item.Position = primitives.Int(int(posf))
	}
	if locale, ok := record["locale"].(string); ok {
		item.Locale = locale
	}
	if parent, ok := record["parent_id"].(string); ok {
		item.ParentID = parent
	}
	if badge, ok := record["badge"].(map[string]any); ok {
		item.Badge = primitives.CloneAnyMap(badge)
	}
	if perms, ok := record["permissions"].([]string); ok {
		item.Permissions = append([]string{}, perms...)
	} else if permsAny, ok := record["permissions"].([]any); ok {
		for _, p := range permsAny {
			if ps, ok := p.(string); ok {
				item.Permissions = append(item.Permissions, ps)
			}
		}
	}
	if classes, ok := record["classes"].([]string); ok {
		item.Classes = append([]string{}, classes...)
	} else if classesAny, ok := record["classes"].([]any); ok {
		for _, c := range classesAny {
			if cs, ok := c.(string); ok {
				item.Classes = append(item.Classes, cs)
			}
		}
	}
	if styles, ok := record["styles"].(map[string]string); ok {
		item.Styles = primitives.CloneStringMapNilOnEmpty(styles)
	} else if stylesAny, ok := record["styles"].(map[string]any); ok {
		item.Styles = map[string]string{}
		for k, v := range stylesAny {
			if vs, ok := v.(string); ok {
				item.Styles[k] = vs
			}
		}
	}
	if target, ok := record["target"].(map[string]any); ok {
		item.Target = primitives.CloneAnyMap(target)
	}
	if menu, ok := record["menu"].(string); ok && menu != "" {
		menuCode = menu
	}
	item.Menu = menuCode
	return item, menuCode
}

func mapToWidgetDefinition(record map[string]any) WidgetDefinition {
	def := WidgetDefinition{}
	if record == nil {
		return def
	}
	if code, ok := record["code"].(string); ok {
		def.Code = code
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = primitives.CloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			def.Schema = parsed
		}
	}
	return def
}

func mapToWidgetInstance(record map[string]any) WidgetInstance {
	inst := WidgetInstance{Config: map[string]any{}}
	if record == nil {
		return inst
	}
	if id, ok := record["id"].(string); ok {
		inst.ID = id
	}
	if code, ok := record["definition_code"].(string); ok {
		inst.DefinitionCode = code
	}
	if area, ok := record["area"].(string); ok {
		inst.Area = area
	}
	if pageID, ok := record["page_id"].(string); ok {
		inst.PageID = pageID
	}
	if locale, ok := record["locale"].(string); ok {
		inst.Locale = locale
	}
	if pos, ok := record["position"].(int); ok {
		inst.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		inst.Position = int(posf)
	}
	if cfg, ok := record["config"].(map[string]any); ok {
		inst.Config = primitives.CloneAnyMap(cfg)
	} else if raw, ok := record["config"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			inst.Config = parsed
		}
	}
	return inst
}

func extractLocale(opts ListOptions, fallback string) string {
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && loc != "" {
			return loc
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && loc != "" {
			return loc
		}
	}
	if fallback != "" {
		return fallback
	}
	return ""
}

func extractSearch(opts ListOptions) string {
	if opts.Search != "" {
		return opts.Search
	}
	if opts.Filters != nil {
		if s, ok := opts.Filters["_search"].(string); ok {
			return s
		}
	}
	return ""
}

func paginateCMS[T any](items []T, opts ListOptions) ([]T, int) {
	total := len(items)
	pageNum := opts.Page
	if pageNum < 1 {
		pageNum = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (pageNum - 1) * per
	if start > total {
		return []T{}, total
	}
	end := start + per
	if end > total {
		end = total
	}
	return items[start:end], total
}

func paginateMenu(items []MenuItem, opts ListOptions) ([]MenuItem, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetDefs(items []WidgetDefinition, opts ListOptions) ([]WidgetDefinition, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetInstances(items []WidgetInstance, opts ListOptions) ([]WidgetInstance, int) {
	return paginateCMS(items, opts)
}

func flattenMenuItems(items []MenuItem, parent string) []MenuItem {
	out := []MenuItem{}
	for _, item := range items {
		item.ParentID = parent
		out = append(out, item)
		if len(item.Children) > 0 {
			out = append(out, flattenMenuItems(item.Children, item.ID)...)
		}
	}
	return out
}

func stringFromFilter(filters map[string]any, key string) string {
	if filters == nil {
		return ""
	}
	if v, ok := filters[key].(string); ok {
		return v
	}
	return ""
}
