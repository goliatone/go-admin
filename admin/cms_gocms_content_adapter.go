package admin

import (
	"context"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"reflect"
	"strings"
	"time"

	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type goCMSContentService interface {
	List(ctx context.Context, opts ...cmscontent.ContentListOption) ([]*cmscontent.Content, error)
	Get(ctx context.Context, id uuid.UUID, opts ...cmscontent.ContentGetOption) (*cmscontent.Content, error)
	Create(ctx context.Context, req cmscontent.CreateContentRequest) (*cmscontent.Content, error)
	Update(ctx context.Context, req cmscontent.UpdateContentRequest) (*cmscontent.Content, error)
	Delete(ctx context.Context, req cmscontent.DeleteContentRequest) error
}

type goCMSBlockService interface {
	ListDefinitions(ctx context.Context, env ...string) ([]*cmsblocks.Definition, error)
	RegisterDefinition(ctx context.Context, input cmsblocks.RegisterDefinitionInput) (*cmsblocks.Definition, error)
	UpdateDefinition(ctx context.Context, input cmsblocks.UpdateDefinitionInput) (*cmsblocks.Definition, error)
	DeleteDefinition(ctx context.Context, req cmsblocks.DeleteDefinitionRequest) error
	ListDefinitionVersions(ctx context.Context, definitionID uuid.UUID) ([]*cmsblocks.DefinitionVersion, error)
	ListPageInstances(ctx context.Context, pageID uuid.UUID) ([]*cmsblocks.Instance, error)
	CreateInstance(ctx context.Context, input cmsblocks.CreateInstanceInput) (*cmsblocks.Instance, error)
	UpdateInstance(ctx context.Context, input cmsblocks.UpdateInstanceInput) (*cmsblocks.Instance, error)
	DeleteInstance(ctx context.Context, req cmsblocks.DeleteInstanceRequest) error
	UpdateTranslation(ctx context.Context, input cmsblocks.UpdateTranslationInput) (*cmsblocks.Translation, error)
	AddTranslation(ctx context.Context, input cmsblocks.AddTranslationInput) (*cmsblocks.Translation, error)
}

// GoCMSContentAdapter maps go-cms content/block services into CMSContentService.
// It uses the typed public go-cms contracts.
type GoCMSContentAdapter struct {
	content      goCMSContentService
	translations any
	blocks       goCMSBlockService
	contentTypes CMSContentTypeService
	locales      *goCMSLocaleIDCache

	blockDefinitionCache *cmsadapter.BlockDefinitionCache
}

// NewGoCMSContentAdapter wraps go-cms services into the admin CMSContentService contract.
func NewGoCMSContentAdapter(contentSvc any, blockSvc any, contentTypeSvc CMSContentTypeService) CMSContentService {
	return newGoCMSContentAdapter(contentSvc, nil, blockSvc, contentTypeSvc, nil)
}

func newGoCMSContentAdapter(contentSvc any, translationSvc any, blockSvc any, contentTypeSvc CMSContentTypeService, localeResolver goCMSLocaleResolver) CMSContentService {
	if contentSvc == nil {
		return nil
	}
	if svc, ok := contentSvc.(CMSContentService); ok && svc != nil {
		return svc
	}
	typedContent, hasTypedContent := contentSvc.(goCMSContentService)
	if !hasTypedContent || typedContent == nil {
		return nil
	}
	typedBlocks, _ := blockSvc.(goCMSBlockService)
	return &GoCMSContentAdapter{
		content:              typedContent,
		translations:         translationSvc,
		blocks:               typedBlocks,
		contentTypes:         contentTypeSvc,
		locales:              newGoCMSLocaleIDCache(localeResolver),
		blockDefinitionCache: cmsadapter.NewBlockDefinitionCache(),
	}
}

func buildGoCMSContentTranslations(content CMSContent) []cmscontent.ContentTranslationInput {
	tr := cmscontent.ContentTranslationInput{
		Locale:  content.Locale,
		Title:   content.Title,
		Content: primitives.CloneAnyMap(content.Data),
	}
	if summary := strings.TrimSpace(asString(content.Data["excerpt"], "")); summary != "" {
		s := summary
		tr.Summary = &s
	}
	return []cmscontent.ContentTranslationInput{tr}
}

func (a *GoCMSContentAdapter) resolveLocaleID(ctx context.Context, localeCode string) (uuid.UUID, bool) {
	if a == nil || a.locales == nil {
		return uuid.Nil, false
	}
	return a.locales.Resolve(ctx, localeCode)
}

func (a *GoCMSContentAdapter) CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().CreatePage(ctx, page)
}

func (a *GoCMSContentAdapter) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().UpdatePage(ctx, page)
}

func (a *GoCMSContentAdapter) DeletePage(ctx context.Context, id string) error {
	return a.contentWriter().DeletePage(ctx, id)
}

func (a *GoCMSContentAdapter) CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	return a.contentWriter().CreateContent(ctx, content)
}

func (a *GoCMSContentAdapter) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	return a.contentWriter().UpdateContent(ctx, content)
}

func (a *GoCMSContentAdapter) DeleteContent(ctx context.Context, id string) error {
	return a.contentWriter().DeleteContent(ctx, id)
}

func (a *GoCMSContentAdapter) BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error) {
	return a.contentWriter().BlockDefinitions(ctx)
}

func (a *GoCMSContentAdapter) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return a.contentWriter().CreateBlockDefinition(ctx, def)
}

func (a *GoCMSContentAdapter) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return a.contentWriter().UpdateBlockDefinition(ctx, def)
}

func (a *GoCMSContentAdapter) DeleteBlockDefinition(ctx context.Context, id string) error {
	return a.contentWriter().DeleteBlockDefinition(ctx, id)
}

// BlockDefinitionVersions returns the schema version history for a block definition.
func (a *GoCMSContentAdapter) BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error) {
	return a.contentWriter().BlockDefinitionVersions(ctx, id)
}

func (a *GoCMSContentAdapter) SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().SaveBlock(ctx, block)
}

func (a *GoCMSContentAdapter) DeleteBlock(ctx context.Context, id string) error {
	return a.contentWriter().DeleteBlock(ctx, id)
}

func (a *GoCMSContentAdapter) createBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().createBlockInstance(ctx, defID, pageID, block)
}

func (a *GoCMSContentAdapter) updateBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().updateBlockInstance(ctx, defID, pageID, block)
}

func (a *GoCMSContentAdapter) upsertBlockTranslation(ctx context.Context, instanceID uuid.UUID, block CMSBlock, allowCreate bool) error {
	return a.contentWriter().upsertBlockTranslation(ctx, instanceID, block, allowCreate)
}

func (a *GoCMSContentAdapter) resolveContentTypeID(ctx context.Context, content CMSContent) (uuid.UUID, error) {
	return a.contentWriter().resolveContentTypeID(ctx, content)
}

func (a *GoCMSContentAdapter) resolveBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, error) {
	return a.contentWriter().resolveBlockDefinitionID(ctx, id)
}

func (a *GoCMSContentAdapter) blockDefinitionName(id uuid.UUID) string {
	if a == nil {
		return ""
	}
	return a.blockDefinitionCache.Name(id)
}

func (a *GoCMSContentAdapter) refreshBlockDefinitions(ctx context.Context) {
	if a == nil || a.blocks == nil {
		return
	}
	definitions, err := a.blocks.ListDefinitions(ctx)
	if err != nil {
		return
	}
	defCache := map[string]uuid.UUID{}
	defNames := map[uuid.UUID]string{}
	for _, definition := range definitions {
		if definition == nil {
			continue
		}
		id := definition.ID
		if id == uuid.Nil {
			continue
		}
		collectGoCMSBlockDefinitionCacheEntries(defCache, defNames, ctx, convertBlockDefinition(reflect.ValueOf(definition)), id, true)
	}
	a.publishBlockDefinitionCache(defCache, defNames)
}

func collectGoCMSBlockDefinitionCacheEntries(target map[string]uuid.UUID, names map[uuid.UUID]string, ctx context.Context, def CMSBlockDefinition, id uuid.UUID, includeGlobal bool) {
	cmsadapter.CollectBlockDefinitionCacheEntry(target, names, cmsadapter.NewBlockDefinitionCacheEntry(
		def,
		id,
		cmsadapter.ResolveBlockDefinitionCacheEnv(def, cmsContentChannelFromContext(ctx, "")),
		includeGlobal,
	))
}

func (a *GoCMSContentAdapter) publishBlockDefinitionCache(defs map[string]uuid.UUID, names map[uuid.UUID]string) {
	if a == nil {
		return
	}
	a.blockDefinitionCache.Publish(defs, names)
}

func (a *GoCMSContentAdapter) lookupBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, bool) {
	if a == nil {
		return uuid.Nil, false
	}
	envKey := cmsadapter.CacheKey(cmsContentChannelFromContext(ctx, ""), id)
	globalKey := cmsadapter.CacheKey("", id)
	return a.blockDefinitionCache.Lookup(envKey, globalKey)
}

func (a *GoCMSContentAdapter) resolvePageID(ctx context.Context, contentID string) uuid.UUID {
	parsed := uuidFromString(contentID)
	if parsed == uuid.Nil {
		return uuid.Nil
	}
	return parsed
}

func (a *GoCMSContentAdapter) prepareContentMetadata(ctx context.Context, content CMSContent, existing *CMSContent) (map[string]any, map[string]any, bool) {
	return a.contentWriter().prepareContentMetadata(ctx, content, existing)
}

func (a *GoCMSContentAdapter) shouldApplyStructuralMetadata(ctx context.Context, content CMSContent, existing *CMSContent) bool {
	return a.contentWriter().shouldApplyStructuralMetadata(ctx, content, existing)
}

func (a *GoCMSContentAdapter) contentTypeForMetadata(ctx context.Context, content CMSContent) *CMSContentType {
	if a == nil || a.contentTypes == nil {
		return nil
	}
	for _, slug := range []string{content.ContentTypeSlug, content.ContentType} {
		if key := strings.TrimSpace(slug); key != "" {
			if ct, err := a.contentTypes.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
				return ct
			}
		}
	}
	for _, key := range []string{content.ContentType, content.ContentTypeSlug} {
		if id := uuidFromString(key); id != uuid.Nil {
			if ct, err := a.contentTypes.ContentType(ctx, id.String()); err == nil && ct != nil {
				return ct
			}
		}
	}
	if key := strings.TrimSpace(content.ContentType); key != "" {
		if ct, err := a.contentTypes.ContentType(ctx, key); err == nil && ct != nil {
			return ct
		}
	}
	return nil
}

func extractStructuralMetadata(data map[string]any) (map[string]any, map[string]any) {
	if data == nil {
		return nil, data
	}
	cleaned := primitives.CloneAnyMap(data)
	meta := map[string]any{}
	if val, ok := cleaned["path"]; ok {
		meta["path"] = val
		delete(cleaned, "path")
	}
	if val, ok := cleaned["template_id"]; ok {
		meta["template_id"] = val
		delete(cleaned, "template_id")
	}
	if val, ok := cleaned["template"]; ok {
		if _, exists := meta["template_id"]; !exists {
			meta["template_id"] = val
		}
		delete(cleaned, "template")
	}
	if val, ok := cleaned["parent_id"]; ok {
		meta["parent_id"] = val
		delete(cleaned, "parent_id")
	}
	sortVal, sortOk := cleaned["sort_order"]
	orderVal, orderOk := cleaned["order"]
	if sortOk {
		meta["sort_order"] = sortVal
		delete(cleaned, "sort_order")
	}
	if orderOk {
		if !sortOk {
			meta["sort_order"] = orderVal
		}
		delete(cleaned, "order")
	}
	if len(meta) == 0 {
		return nil, cleaned
	}
	return meta, cleaned
}

func structuralMetadataFromData(data map[string]any) map[string]any {
	meta, _ := extractStructuralMetadata(data)
	return normalizeStructuralMetadata(meta)
}

func normalizeStructuralMetadata(metadata map[string]any) map[string]any {
	if metadata == nil {
		return nil
	}
	normalized := primitives.CloneAnyMap(metadata)
	if _, ok := normalized["template_id"]; !ok {
		if val, ok := normalized["template"]; ok {
			normalized["template_id"] = val
		}
	}
	delete(normalized, "template")
	if _, ok := normalized["sort_order"]; ok {
		delete(normalized, "order")
	} else if val, ok := normalized["order"]; ok {
		normalized["sort_order"] = val
		delete(normalized, "order")
	}
	return normalized
}

func injectStructuralMetadata(metadata map[string]any, data map[string]any) map[string]any {
	if metadata == nil {
		return data
	}
	if data == nil {
		data = map[string]any{}
	}
	if val, ok := metadata["path"]; ok {
		data["path"] = val
	}
	if val, ok := metadata["template_id"]; ok {
		data["template_id"] = val
	}
	if val, ok := metadata["parent_id"]; ok {
		data["parent_id"] = val
	}
	if val, ok := metadata["sort_order"]; ok {
		data["sort_order"] = val
	}
	return data
}

func mergeMetadata(base map[string]any, updates map[string]any) map[string]any {
	if len(base) == 0 && len(updates) == 0 {
		return nil
	}
	merged := map[string]any{}
	maps.Copy(merged, base)
	maps.Copy(merged, updates)
	return merged
}

func (a *GoCMSContentAdapter) createPageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().createPageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) updatePageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().updatePageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) deletePageFromContent(ctx context.Context, id string) error {
	return a.contentWriter().deletePageFromContent(ctx, id)
}

func convertBlockDefinition(value reflect.Value) CMSBlockDefinition {
	val := deref(value)
	def := CMSBlockDefinition{}
	if name := strings.TrimSpace(stringField(val, "Name")); name != "" {
		def.Name = name
	}
	if slug := strings.TrimSpace(stringField(val, "Slug")); slug != "" {
		def.Slug = slug
	}
	def.ID = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.Name))
	if def.ID == "" {
		if id, ok := extractUUID(val, "ID"); ok {
			def.ID = id.String()
		}
	}
	if desc := strings.TrimSpace(stringField(val, "Description")); desc != "" {
		def.Description = desc
	}
	if icon := strings.TrimSpace(stringField(val, "Icon")); icon != "" {
		def.Icon = icon
	}
	if category := strings.TrimSpace(stringField(val, "Category")); category != "" {
		def.Category = category
	}
	if status := strings.TrimSpace(stringField(val, "Status")); status != "" {
		def.Status = status
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			def.Schema = primitives.CloneAnyMap(schema)
			if def.Type == "" {
				if t := strings.TrimSpace(toString(schema["x-block-type"])); t != "" {
					def.Type = t
				}
			}
		}
	}
	if uiSchemaField := val.FieldByName("UISchema"); uiSchemaField.IsValid() {
		if uiSchema, ok := uiSchemaField.Interface().(map[string]any); ok {
			def.UISchema = primitives.CloneAnyMap(uiSchema)
		}
	}
	if version := strings.TrimSpace(stringField(val, "SchemaVersion")); version != "" {
		def.SchemaVersion = version
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = schemaVersionFromSchema(def.Schema)
	}
	if status := strings.TrimSpace(stringField(val, "MigrationStatus")); status != "" {
		def.MigrationStatus = status
	}
	channel := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringField(val, "Channel"),
		stringField(val, "Environment"),
		stringField(val, "Env"),
	))
	cmsadapter.SetBlockDefinitionChannel(&def, channel)
	if def.MigrationStatus == "" {
		def.MigrationStatus = schemaMigrationStatusFromSchema(def.Schema)
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.Name, def.ID))
	}
	return def
}

func convertBlockDefinitionVersion(value reflect.Value) CMSBlockDefinitionVersion {
	val := deref(value)
	out := CMSBlockDefinitionVersion{}
	if id, ok := extractUUID(val, "ID"); ok && id != uuid.Nil {
		out.ID = id.String()
	}
	if defID, ok := extractUUID(val, "DefinitionID"); ok && defID != uuid.Nil {
		out.DefinitionID = defID.String()
	}
	if out.ID == "" {
		out.ID = strings.TrimSpace(stringField(val, "ID"))
	}
	if out.DefinitionID == "" {
		out.DefinitionID = strings.TrimSpace(stringField(val, "DefinitionID"))
	}
	if version := strings.TrimSpace(stringField(val, "SchemaVersion")); version != "" {
		out.SchemaVersion = version
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			out.Schema = primitives.CloneAnyMap(schema)
		}
	}
	if defaultsField := val.FieldByName("Defaults"); defaultsField.IsValid() {
		if defaults, ok := defaultsField.Interface().(map[string]any); ok {
			out.Defaults = primitives.CloneAnyMap(defaults)
		}
	}
	if out.MigrationStatus == "" {
		out.MigrationStatus = schemaMigrationStatusFromSchema(out.Schema)
	}
	out.CreatedAt = timeField(val, "CreatedAt")
	out.UpdatedAt = timeField(val, "UpdatedAt")
	return out
}

func adapterResolvedFamilyID(groupID string, maps ...map[string]any) string {
	for _, source := range maps {
		if source == nil {
			continue
		}
		if resolved := strings.TrimSpace(toString(source["family_id"])); resolved != "" {
			return resolved
		}
	}
	return strings.TrimSpace(groupID)
}

func adapterRequestedFamilyID(groupID string, maps ...map[string]any) string {
	groupID = strings.TrimSpace(groupID)
	if groupID != "" {
		return groupID
	}
	return adapterResolvedFamilyID("", maps...)
}

func adapterPersistTranslationGroupMetadata(groupID string, data, metadata map[string]any) (map[string]any, map[string]any) {
	groupID = strings.TrimSpace(groupID)
	data = primitives.CloneAnyMap(data)
	metadata = primitives.CloneAnyMap(metadata)
	if groupID == "" {
		return data, metadata
	}
	if data == nil {
		data = map[string]any{}
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	data["family_id"] = groupID
	metadata["family_id"] = groupID
	return data, metadata
}

func uuidFromString(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.Nil
}

func uuidStringField(val reflect.Value, name string) string {
	if val.Kind() == reflect.Pointer {
		if val.IsNil() {
			return ""
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return ""
	}
	field := val.FieldByName(name)
	if !field.IsValid() {
		return ""
	}
	if field.CanInterface() {
		switch v := field.Interface().(type) {
		case uuid.UUID:
			if v != uuid.Nil {
				return v.String()
			}
		}
	}
	if field.Kind() == reflect.Pointer && !field.IsNil() && field.Elem().CanInterface() {
		if v, ok := field.Elem().Interface().(uuid.UUID); ok && v != uuid.Nil {
			return v.String()
		}
	}
	return ""
}

func stringField(val reflect.Value, field string) string {
	if val.Kind() == reflect.Pointer {
		if val.IsNil() {
			return ""
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return ""
	}
	f := val.FieldByName(field)
	if f.IsValid() {
		switch f.Kind() {
		case reflect.String:
			return f.String()
		case reflect.Pointer:
			if !f.IsNil() && f.Elem().Kind() == reflect.String {
				return f.Elem().String()
			}
		}
	}
	return ""
}

func stringFieldAny(val reflect.Value, fields ...string) string {
	for _, field := range fields {
		if out := strings.TrimSpace(stringField(val, field)); out != "" {
			return out
		}
	}
	return ""
}

func boolField(val reflect.Value, field string) (bool, bool) {
	if val.Kind() == reflect.Pointer {
		if val.IsNil() {
			return false, false
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return false, false
	}
	f := val.FieldByName(field)
	if !f.IsValid() {
		return false, false
	}
	switch f.Kind() {
	case reflect.Bool:
		return f.Bool(), true
	case reflect.Pointer:
		if !f.IsNil() && f.Elem().Kind() == reflect.Bool {
			return f.Elem().Bool(), true
		}
	}
	return false, false
}

func boolFieldAny(val reflect.Value, fields ...string) (bool, bool) {
	for _, field := range fields {
		if out, ok := boolField(val, field); ok {
			return out, true
		}
	}
	return false, false
}

func stringSliceField(val reflect.Value, field string) []string {
	f := val.FieldByName(field)
	if !f.IsValid() {
		return nil
	}
	f = deref(f)
	switch f.Kind() {
	case reflect.Slice:
		out := []string{}
		for i := 0; i < f.Len(); i++ {
			item := f.Index(i)
			if item.Kind() == reflect.String {
				if trimmed := strings.TrimSpace(item.String()); trimmed != "" {
					out = append(out, trimmed)
				}
				continue
			}
			if item.CanInterface() {
				if trimmed := strings.TrimSpace(toString(item.Interface())); trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	return nil
}

func stringSliceFieldAny(val reflect.Value, fields ...string) []string {
	for _, field := range fields {
		if out := stringSliceField(val, field); len(out) > 0 {
			return out
		}
	}
	return nil
}

func timeField(val reflect.Value, field string) time.Time {
	f := val.FieldByName(field)
	if f.IsValid() && f.CanInterface() {
		if t, ok := f.Interface().(time.Time); ok {
			return t
		}
	}
	if f.IsValid() && f.Kind() == reflect.Pointer && !f.IsNil() && f.Elem().CanInterface() {
		if t, ok := f.Elem().Interface().(time.Time); ok {
			return t
		}
	}
	return time.Time{}
}

func asString(val any, fallback string) string {
	if val == nil {
		return fallback
	}
	switch v := val.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return fallback
		}
		return v
	case []byte:
		return string(v)
	default:
		return fallback
	}
}
