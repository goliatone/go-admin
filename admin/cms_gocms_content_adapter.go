package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
)

// GoCMSContentAdapter maps go-cms content/block services into CMSContentService using reflection.
type GoCMSContentAdapter struct {
	content      any
	blocks       any
	contentTypes CMSContentTypeService

	blockDefinitions  map[string]uuid.UUID
	blockDefinitionBy map[uuid.UUID]string
}

// NewGoCMSContentAdapter wraps go-cms services into the admin CMSContentService contract.
func NewGoCMSContentAdapter(contentSvc any, blockSvc any, contentTypeSvc CMSContentTypeService) CMSContentService {
	if contentSvc == nil {
		return nil
	}
	if svc, ok := contentSvc.(CMSContentService); ok && svc != nil {
		return svc
	}
	if !hasContentMethods(contentSvc) {
		return nil
	}
	return &GoCMSContentAdapter{
		content:           contentSvc,
		blocks:            blockSvc,
		contentTypes:      contentTypeSvc,
		blockDefinitions:  map[string]uuid.UUID{},
		blockDefinitionBy: map[uuid.UUID]string{},
	}
}

func hasContentMethods(service any) bool {
	if service == nil {
		return false
	}
	required := []string{"List", "Get", "Create", "Update", "Delete"}
	value := reflect.ValueOf(service)
	for _, name := range required {
		if !value.MethodByName(name).IsValid() {
			return false
		}
	}
	return true
}

func (a *GoCMSContentAdapter) hasBlockService() bool {
	if a == nil || a.blocks == nil {
		return false
	}
	value := reflect.ValueOf(a.blocks)
	for _, name := range []string{"ListDefinitions", "RegisterDefinition", "UpdateDefinition", "DeleteDefinition", "CreateInstance", "UpdateInstance", "DeleteInstance", "ListPageInstances"} {
		if !value.MethodByName(name).IsValid() {
			return false
		}
	}
	return true
}

func (a *GoCMSContentAdapter) Pages(ctx context.Context, locale string) ([]CMSPage, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	contents, err := a.listContents(ctx, locale, WithTranslations())
	if err != nil {
		return nil, err
	}
	out := make([]CMSPage, 0, len(contents))
	for _, item := range contents {
		if !strings.EqualFold(item.ContentType, "page") && !strings.EqualFold(item.ContentTypeSlug, "page") {
			continue
		}
		out = append(out, pageFromContent(item))
	}
	return out, nil
}

func (a *GoCMSContentAdapter) Page(ctx context.Context, id, locale string) (*CMSPage, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	content, err := a.Content(ctx, id, locale)
	if err != nil {
		return nil, err
	}
	if content == nil || (!strings.EqualFold(content.ContentType, "page") && !strings.EqualFold(content.ContentTypeSlug, "page")) {
		return nil, ErrNotFound
	}
	rec := pageFromContent(*content)
	return &rec, nil
}

func (a *GoCMSContentAdapter) CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	return a.createPageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	return a.updatePageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) DeletePage(ctx context.Context, id string) error {
	if a == nil || a.content == nil {
		return ErrNotFound
	}
	return a.deletePageFromContent(ctx, id)
}

func (a *GoCMSContentAdapter) Contents(ctx context.Context, locale string) ([]CMSContent, error) {
	return a.listContents(ctx, locale)
}

// ContentsWithOptions lists CMS content using go-cms list options (for example WithTranslations).
// Contents remains the default behavior (no opt-in options).
func (a *GoCMSContentAdapter) ContentsWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	return a.listContents(ctx, locale, opts...)
}

func (a *GoCMSContentAdapter) listContents(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.content).MethodByName("List")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	if method.Type().NumIn() > 1 {
		if len(opts) > 0 {
			if method.Type().IsVariadic() {
				for _, opt := range opts {
					args = append(args, reflect.ValueOf(string(opt)))
				}
			} else {
				args = append(args, reflect.ValueOf(string(opts[0])))
			}
		} else if !method.Type().IsVariadic() {
			args = append(args, reflect.Zero(method.Type().In(1)))
		}
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	out := make([]CMSContent, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		item := a.convertContent(ctx, slice.Index(i), locale)
		applySchemaVersionToContent(&item)
		applyEmbeddedBlocksToContent(&item)
		out = append(out, item)
	}
	return out, nil
}

func (a *GoCMSContentAdapter) Content(ctx context.Context, id, locale string) (*CMSContent, error) {
	return a.fetchContent(ctx, id, locale, true)
}

func (a *GoCMSContentAdapter) fetchContent(ctx context.Context, id, locale string, allowLegacy bool) (*CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.content).MethodByName("Get")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	arg, err := valueForIDType(method.Type().In(1), id)
	if err != nil {
		return nil, err
	}
	args := []reflect.Value{reflect.ValueOf(ctx), arg}
	if method.Type().IsVariadic() {
		args = append(args, reflect.ValueOf(string(WithTranslations())))
	} else if method.Type().NumIn() > 2 {
		args = append(args, reflect.ValueOf(string(WithTranslations())))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, results[0], locale)
	applySchemaVersionToContent(&rec)
	embeddedPresent := applyEmbeddedBlocksToContent(&rec)
	if !embeddedPresent && allowLegacy && a.blocks != nil {
		if legacy, err := a.legacyBlocksForContent(ctx, rec.ID, rec.Locale); err == nil && len(legacy) > 0 {
			rec.Blocks = blockTypesFromLegacy(legacy)
			rec.EmbeddedBlocks = embeddedBlocksFromLegacy(legacy)
			if rec.Data == nil {
				rec.Data = map[string]any{}
			}
			if rec.EmbeddedBlocks != nil {
				rec.Data["blocks"] = cloneEmbeddedBlocks(rec.EmbeddedBlocks)
			}
		}
	}
	return &rec, nil
}

func (a *GoCMSContentAdapter) CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.content).MethodByName("Create")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	contentTypeID, err := a.resolveContentTypeID(ctx, content)
	if err != nil {
		return nil, err
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ContentTypeID", contentTypeID)
	setStringField(req, "Slug", content.Slug)
	setStringField(req, "Status", content.Status)
	actor := actorUUID(ctx)
	setUUIDField(req, "CreatedBy", actor)
	setUUIDField(req, "UpdatedBy", actor)
	meta, cleaned, includeMeta := a.prepareContentMetadata(ctx, content, nil)
	content.Data = cleaned
	applySchemaVersionToContent(&content)
	applyEmbeddedBlocksToContent(&content)
	if tr := a.buildContentTranslation(req.FieldByName("Translations"), content); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}
	if allow := req.FieldByName("AllowMissingTranslations"); allow.IsValid() && allow.CanSet() && allow.Kind() == reflect.Bool {
		allow.SetBool(true)
	}
	if includeMeta {
		setMapField(req, "Metadata", meta)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, results[0], content.Locale)
	return &rec, nil
}

func (a *GoCMSContentAdapter) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.content).MethodByName("Update")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ID", uuidFromString(content.ID))
	setStringField(req, "Status", content.Status)
	setUUIDField(req, "UpdatedBy", actorUUID(ctx))
	var existing *CMSContent
	if content.ID != "" {
		if current, err := a.fetchContent(ctx, content.ID, content.Locale, false); err == nil && current != nil {
			existing = current
		}
	}
	meta, cleaned, includeMeta := a.prepareContentMetadata(ctx, content, existing)
	content.Data = cleaned
	applySchemaVersionToContent(&content)
	applyEmbeddedBlocksToContent(&content)
	if tr := a.buildContentTranslation(req.FieldByName("Translations"), content); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}
	if allow := req.FieldByName("AllowMissingTranslations"); allow.IsValid() && allow.CanSet() && allow.Kind() == reflect.Bool {
		allow.SetBool(true)
	}
	if includeMeta {
		setMapField(req, "Metadata", meta)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, results[0], content.Locale)
	return &rec, nil
}

func (a *GoCMSContentAdapter) DeleteContent(ctx context.Context, id string) error {
	if a == nil || a.content == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.content).MethodByName("Delete")
	if !method.IsValid() {
		return ErrNotFound
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ID", uuidFromString(id))
	setUUIDField(req, "DeletedBy", actorUUID(ctx))
	if f := req.FieldByName("HardDelete"); f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
		f.SetBool(true)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return extractError(results)
}

func (a *GoCMSContentAdapter) BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return nil, nil
	}
	defs := make([]CMSBlockDefinition, 0, value.Len())
	for i := 0; i < value.Len(); i++ {
		def := convertBlockDefinition(value.Index(i))
		if def.ID != "" {
			if id, ok := extractUUID(deref(value.Index(i)), "ID"); ok {
				env := blockDefinitionCacheEnv(ctx, def)
				primary := strings.TrimSpace(firstNonEmpty(def.Slug, def.ID, def.Name))
				if primary != "" {
					a.blockDefinitions[blockDefinitionCacheKey(env, primary)] = id
					a.blockDefinitionBy[id] = primary
				}
				if def.Name != "" {
					a.blockDefinitions[blockDefinitionCacheKey(env, def.Name)] = id
				}
				if def.Slug != "" {
					a.blockDefinitions[blockDefinitionCacheKey(env, def.Slug)] = id
				}
			}
		}
		defs = append(defs, def)
	}
	return defs, nil
}

func (a *GoCMSContentAdapter) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("RegisterDefinition")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	name := strings.TrimSpace(firstNonEmpty(def.ID, def.Name))
	if name == "" {
		return nil, fmt.Errorf("block definition name required")
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setStringField(input, "Name", name)
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		setStringField(input, "Slug", slug)
	}
	if def.DescriptionSet {
		setStringPtr(input.FieldByName("Description"), def.Description)
	} else if desc := strings.TrimSpace(def.Description); desc != "" {
		setStringPtr(input.FieldByName("Description"), desc)
	}
	if def.IconSet {
		setStringPtr(input.FieldByName("Icon"), def.Icon)
	} else if icon := strings.TrimSpace(def.Icon); icon != "" {
		setStringPtr(input.FieldByName("Icon"), icon)
	}
	if def.CategorySet {
		setStringPtr(input.FieldByName("Category"), def.Category)
	} else if category := strings.TrimSpace(def.Category); category != "" {
		setStringPtr(input.FieldByName("Category"), category)
	}
	if status := strings.TrimSpace(def.Status); status != "" {
		setStringField(input, "Status", status)
	}
	if env := strings.TrimSpace(def.Environment); env != "" {
		setStringPtr(input.FieldByName("Environment"), env)
		setStringPtr(input.FieldByName("Env"), env)
	}
	setMapField(input, "Schema", cloneAnyMap(def.Schema))
	if def.UISchema != nil {
		setMapField(input, "UISchema", cloneAnyMap(def.UISchema))
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	created := convertBlockDefinition(results[0])
	return &created, nil
}

func (a *GoCMSContentAdapter) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("UpdateDefinition")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	defID, err := a.resolveBlockDefinitionID(ctx, def.ID)
	if err != nil {
		return nil, err
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "ID", defID)
	if name := strings.TrimSpace(def.Name); name != "" {
		setStringPtr(input.FieldByName("Name"), name)
	}
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		setStringPtr(input.FieldByName("Slug"), slug)
	}
	if desc := strings.TrimSpace(def.Description); desc != "" {
		setStringPtr(input.FieldByName("Description"), desc)
	}
	if icon := strings.TrimSpace(def.Icon); icon != "" {
		setStringPtr(input.FieldByName("Icon"), icon)
	}
	if category := strings.TrimSpace(def.Category); category != "" {
		setStringPtr(input.FieldByName("Category"), category)
	}
	if status := strings.TrimSpace(def.Status); status != "" {
		setStringPtr(input.FieldByName("Status"), status)
	}
	if env := strings.TrimSpace(def.Environment); env != "" {
		setStringPtr(input.FieldByName("Environment"), env)
		setStringPtr(input.FieldByName("Env"), env)
	}
	if len(def.Schema) > 0 {
		setMapField(input, "Schema", cloneAnyMap(def.Schema))
	}
	if def.UISchema != nil {
		setMapField(input, "UISchema", cloneAnyMap(def.UISchema))
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	updated := convertBlockDefinition(results[0])
	return &updated, nil
}

func (a *GoCMSContentAdapter) DeleteBlockDefinition(ctx context.Context, id string) error {
	if a == nil || a.blocks == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("DeleteDefinition")
	if !method.IsValid() {
		return ErrNotFound
	}
	defID, err := a.resolveBlockDefinitionID(ctx, id)
	if err != nil {
		return err
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ID", defID)
	setBoolField(req, "HardDelete", true)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return extractError(results)
}

// BlockDefinitionVersions returns the schema version history for a block definition.
func (a *GoCMSContentAdapter) BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("ListDefinitionVersions")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	defID, err := a.resolveBlockDefinitionID(ctx, id)
	if err != nil {
		return nil, err
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(defID)})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return nil, nil
	}
	out := make([]CMSBlockDefinitionVersion, 0, value.Len())
	for i := 0; i < value.Len(); i++ {
		out = append(out, convertBlockDefinitionVersion(value.Index(i)))
	}
	return out, nil
}

func (a *GoCMSContentAdapter) BlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	if content, err := a.fetchContent(ctx, contentID, locale, false); err == nil && content != nil {
		if content.EmbeddedBlocks != nil {
			loc := locale
			if strings.TrimSpace(loc) == "" {
				loc = content.Locale
			}
			return embeddedBlocksToCMSBlocks(contentID, loc, content.EmbeddedBlocks), nil
		}
	}
	if a.blocks == nil {
		return nil, ErrNotFound
	}
	return a.legacyBlocksForContent(ctx, contentID, locale)
}

func (a *GoCMSContentAdapter) LegacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	return a.legacyBlocksForContent(ctx, contentID, locale)
}

func (a *GoCMSContentAdapter) legacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	pageID := a.resolvePageID(ctx, contentID)
	if pageID == uuid.Nil {
		return nil, nil
	}
	method := reflect.ValueOf(a.blocks).MethodByName("ListPageInstances")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(pageID)})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return nil, nil
	}
	blocks := make([]CMSBlock, 0, value.Len())
	for i := 0; i < value.Len(); i++ {
		blocks = append(blocks, a.convertBlockInstance(value.Index(i), locale))
	}
	return blocks, nil
}

func (a *GoCMSContentAdapter) SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error) {
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	defID, err := a.resolveBlockDefinitionID(ctx, block.DefinitionID)
	if err != nil {
		return nil, err
	}
	pageID := a.resolvePageID(ctx, block.ContentID)
	if pageID == uuid.Nil {
		return nil, ErrNotFound
	}
	if strings.TrimSpace(block.ID) == "" {
		return a.createBlockInstance(ctx, defID, pageID, block)
	}
	return a.updateBlockInstance(ctx, defID, pageID, block)
}

func (a *GoCMSContentAdapter) DeleteBlock(ctx context.Context, id string) error {
	if a == nil || a.blocks == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.blocks).MethodByName("DeleteInstance")
	if !method.IsValid() {
		return ErrNotFound
	}
	uid := uuidFromString(id)
	if uid == uuid.Nil {
		return ErrNotFound
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDValue(req.FieldByName("ID"), uid)
	setUUIDField(req, "DeletedBy", actorUUID(ctx))
	setBoolField(req, "HardDelete", true)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return extractError(results)
}

func (a *GoCMSContentAdapter) createBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	method := reflect.ValueOf(a.blocks).MethodByName("CreateInstance")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "DefinitionID", defID)
	if pageID != uuid.Nil {
		setUUIDPtr(input.FieldByName("PageID"), &pageID)
	}
	if region := strings.TrimSpace(block.Region); region != "" {
		setStringField(input, "Region", region)
	}
	if block.Position > 0 {
		setIntField(input, "Position", block.Position)
	}
	if len(block.Data) > 0 {
		setMapField(input, "Configuration", cloneAnyMap(block.Data))
	}
	actor := actorUUID(ctx)
	setUUIDField(input, "CreatedBy", actor)
	setUUIDField(input, "UpdatedBy", actor)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	instance := results[0]
	if err := a.upsertBlockTranslation(ctx, instance, block, false); err != nil {
		return nil, err
	}
	converted := a.convertBlockInstance(instance, block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = cloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (a *GoCMSContentAdapter) updateBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	method := reflect.ValueOf(a.blocks).MethodByName("UpdateInstance")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	instanceID := uuidFromString(block.ID)
	if instanceID == uuid.Nil {
		return nil, ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDValue(input.FieldByName("InstanceID"), instanceID)
	if pageID != uuid.Nil {
		setUUIDPtr(input.FieldByName("PageID"), &pageID)
	}
	if region := strings.TrimSpace(block.Region); region != "" {
		setStringPtr(input.FieldByName("Region"), region)
	}
	if block.Position > 0 {
		setIntPtr(input.FieldByName("Position"), block.Position)
	}
	if len(block.Data) > 0 {
		setMapField(input, "Configuration", cloneAnyMap(block.Data))
	}
	setUUIDField(input, "UpdatedBy", actorUUID(ctx))
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, ErrNotFound
	}
	instance := results[0]
	if err := a.upsertBlockTranslation(ctx, instance, block, true); err != nil {
		return nil, err
	}
	converted := a.convertBlockInstance(instance, block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = cloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (a *GoCMSContentAdapter) upsertBlockTranslation(ctx context.Context, instance reflect.Value, block CMSBlock, allowCreate bool) error {
	instance = deref(instance)
	instID, ok := extractUUID(instance, "ID")
	if !ok || instID == uuid.Nil {
		return nil
	}
	locale := strings.TrimSpace(block.Locale)
	if locale == "" {
		return nil
	}
	payload := cloneAnyMap(block.Data)
	if payload == nil {
		payload = map[string]any{}
	}
	localeID := localeUUID(locale)
	if localeID == uuid.Nil {
		return nil
	}
	updateMethod := reflect.ValueOf(a.blocks).MethodByName("UpdateTranslation")
	if updateMethod.IsValid() {
		req := reflect.New(updateMethod.Type().In(1)).Elem()
		setUUIDField(req, "BlockInstanceID", instID)
		setUUIDField(req, "LocaleID", localeID)
		setMapField(req, "Content", payload)
		setUUIDField(req, "UpdatedBy", actorUUID(ctx))
		results := updateMethod.Call([]reflect.Value{reflect.ValueOf(ctx), req})
		if err := extractError(results); err == nil {
			return nil
		} else if !allowCreate {
			return err
		}
	}
	createMethod := reflect.ValueOf(a.blocks).MethodByName("AddTranslation")
	if !createMethod.IsValid() {
		return nil
	}
	req := reflect.New(createMethod.Type().In(1)).Elem()
	setUUIDField(req, "BlockInstanceID", instID)
	setUUIDField(req, "LocaleID", localeID)
	setMapField(req, "Content", payload)
	results := createMethod.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return extractError(results)
}

func (a *GoCMSContentAdapter) resolveContentTypeID(ctx context.Context, content CMSContent) (uuid.UUID, error) {
	for _, candidate := range []string{content.ContentType, content.ContentTypeSlug} {
		if id := uuidFromString(candidate); id != uuid.Nil {
			return id, nil
		}
	}
	if a.contentTypes != nil {
		if slug := strings.TrimSpace(content.ContentTypeSlug); slug != "" {
			if ct, err := a.contentTypes.ContentTypeBySlug(ctx, slug); err == nil && ct != nil {
				if id := uuidFromString(ct.ID); id != uuid.Nil {
					return id, nil
				}
			}
		}
		if key := strings.TrimSpace(content.ContentType); key != "" {
			if ct, err := a.contentTypes.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
				if id := uuidFromString(ct.ID); id != uuid.Nil {
					return id, nil
				}
			}
			if ct, err := a.contentTypes.ContentType(ctx, key); err == nil && ct != nil {
				if id := uuidFromString(ct.ID); id != uuid.Nil {
					return id, nil
				}
			}
		}
	}
	return uuid.Nil, fmt.Errorf("content type not found: %s", content.ContentType)
}

func (a *GoCMSContentAdapter) resolveBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return uuid.Nil, ErrNotFound
	}
	if parsed := uuidFromString(id); parsed != uuid.Nil {
		return parsed, nil
	}
	a.refreshBlockDefinitions(ctx)
	if defID, ok := a.blockDefinitions[blockDefinitionCacheKey(EnvironmentFromContext(ctx), id)]; ok {
		return defID, nil
	}
	if defID, ok := a.blockDefinitions[blockDefinitionCacheKey("", id)]; ok {
		return defID, nil
	}
	return uuid.Nil, ErrNotFound
}

func (a *GoCMSContentAdapter) blockDefinitionName(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	if name, ok := a.blockDefinitionBy[id]; ok {
		return name
	}
	return ""
}

func (a *GoCMSContentAdapter) refreshBlockDefinitions(ctx context.Context) {
	if a == nil || a.blocks == nil {
		return
	}
	method := reflect.ValueOf(a.blocks).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
	if err := extractError(results); err != nil {
		return
	}
	if len(results) == 0 || !results[0].IsValid() {
		return
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return
	}
	for i := 0; i < value.Len(); i++ {
		item := deref(value.Index(i))
		name := strings.TrimSpace(stringField(item, "Name"))
		slug := strings.TrimSpace(stringField(item, "Slug"))
		env := strings.TrimSpace(stringField(item, "Environment"))
		if env == "" {
			env = strings.TrimSpace(stringField(item, "Env"))
		}
		if env == "" {
			env = EnvironmentFromContext(ctx)
		}
		id, ok := extractUUID(item, "ID")
		if !ok || id == uuid.Nil || (name == "" && slug == "") {
			continue
		}
		primary := strings.TrimSpace(firstNonEmpty(slug, name))
		if primary != "" {
			a.blockDefinitions[blockDefinitionCacheKey(env, primary)] = id
			a.blockDefinitionBy[id] = primary
		}
		if name != "" {
			a.blockDefinitions[blockDefinitionCacheKey(env, name)] = id
		}
		if slug != "" {
			a.blockDefinitions[blockDefinitionCacheKey(env, slug)] = id
		}
	}
}

func (a *GoCMSContentAdapter) resolvePageID(ctx context.Context, contentID string) uuid.UUID {
	parsed := uuidFromString(contentID)
	if parsed == uuid.Nil {
		return uuid.Nil
	}
	return parsed
}

func applySchemaVersionToContent(content *CMSContent) {
	if content == nil {
		return
	}
	schema := strings.TrimSpace(content.SchemaVersion)
	if schema == "" && content.Data != nil {
		schema = strings.TrimSpace(toString(content.Data["_schema"]))
		content.SchemaVersion = schema
	}
	if schema == "" {
		return
	}
	if content.Data == nil {
		content.Data = map[string]any{}
	}
	content.Data["_schema"] = schema
	content.SchemaVersion = schema
}

func applySchemaVersionToPage(page *CMSPage) {
	if page == nil {
		return
	}
	schema := strings.TrimSpace(page.SchemaVersion)
	if schema == "" && page.Data != nil {
		schema = strings.TrimSpace(toString(page.Data["_schema"]))
		page.SchemaVersion = schema
	}
	if schema == "" {
		return
	}
	if page.Data == nil {
		page.Data = map[string]any{}
	}
	page.Data["_schema"] = schema
	page.SchemaVersion = schema
}

func applyEmbeddedBlocksToContent(content *CMSContent) bool {
	if content == nil {
		return false
	}
	embedded, present := embeddedBlocksFromData(content.Data)
	if !present && content.EmbeddedBlocks != nil {
		embedded = cloneEmbeddedBlocks(content.EmbeddedBlocks)
		present = true
	}
	if !present {
		return false
	}
	if content.Data == nil {
		content.Data = map[string]any{}
	}
	content.Data["blocks"] = embedded
	content.EmbeddedBlocks = embedded
	return true
}

func applyEmbeddedBlocksToPage(page *CMSPage) bool {
	if page == nil {
		return false
	}
	embedded, present := embeddedBlocksFromData(page.Data)
	if !present && page.EmbeddedBlocks != nil {
		embedded = cloneEmbeddedBlocks(page.EmbeddedBlocks)
		present = true
	}
	if !present {
		return false
	}
	if page.Data == nil {
		page.Data = map[string]any{}
	}
	page.Data["blocks"] = embedded
	page.EmbeddedBlocks = embedded
	return true
}

func mergePageContentData(page *CMSPage, content *CMSContent) {
	if page == nil || content == nil {
		return
	}
	merged := cloneAnyMap(content.Data)
	if merged == nil {
		merged = map[string]any{}
	}
	if page.Data != nil {
		for key, value := range page.Data {
			merged[key] = value
		}
	}
	page.Data = merged
	if page.SchemaVersion == "" {
		page.SchemaVersion = content.SchemaVersion
	}
	if page.EmbeddedBlocks == nil && content.EmbeddedBlocks != nil {
		page.EmbeddedBlocks = cloneEmbeddedBlocks(content.EmbeddedBlocks)
	}
}

func (a *GoCMSContentAdapter) embeddedBlocksForContent(ctx context.Context, contentID, locale string) ([]map[string]any, bool) {
	content, err := a.fetchContent(ctx, contentID, locale, false)
	if err != nil || content == nil {
		return nil, false
	}
	if content.EmbeddedBlocks != nil {
		return cloneEmbeddedBlocks(content.EmbeddedBlocks), true
	}
	if embedded, present := embeddedBlocksFromData(content.Data); present {
		return embedded, true
	}
	return nil, false
}

func (a *GoCMSContentAdapter) prepareContentMetadata(ctx context.Context, content CMSContent, existing *CMSContent) (map[string]any, map[string]any, bool) {
	data := cloneAnyMap(content.Data)
	metadata := cloneAnyMap(content.Metadata)
	if existing != nil {
		if content.ContentType == "" {
			content.ContentType = existing.ContentType
		}
		if content.ContentTypeSlug == "" {
			content.ContentTypeSlug = existing.ContentTypeSlug
		}
	}
	applyStructural := a.shouldApplyStructuralMetadata(ctx, content, existing)
	if applyStructural {
		extracted, cleaned := extractStructuralMetadata(data)
		data = cleaned
		var base map[string]any
		if existing != nil && existing.Metadata != nil {
			base = cloneAnyMap(existing.Metadata)
		}
		metadata = mergeMetadata(base, metadata)
		metadata = mergeMetadata(metadata, extracted)
		metadata = normalizeStructuralMetadata(metadata)
		metadata = pruneNilMapValues(metadata)
		if metadata == nil {
			metadata = map[string]any{}
		}
		return metadata, data, true
	}
	if metadata != nil {
		metadata = pruneNilMapValues(metadata)
		return metadata, data, true
	}
	return nil, data, false
}

func (a *GoCMSContentAdapter) shouldApplyStructuralMetadata(ctx context.Context, content CMSContent, existing *CMSContent) bool {
	if existing != nil {
		if content.ContentType == "" {
			content.ContentType = existing.ContentType
		}
		if content.ContentTypeSlug == "" {
			content.ContentTypeSlug = existing.ContentTypeSlug
		}
	}
	ct := a.contentTypeForMetadata(ctx, content)
	if ct != nil {
		if enabled, ok := capabilityFlag(ct.Capabilities, "structural_fields", "structuralFields", "entry_metadata", "entryMetadata", "entry-metadata"); ok {
			return enabled
		}
		if hasTreeCapability(ct.Capabilities) {
			return true
		}
		if strings.EqualFold(panelSlugForContentType(ct), "pages") {
			return true
		}
		if strings.EqualFold(ct.Slug, "page") {
			return true
		}
	}
	if strings.EqualFold(content.ContentTypeSlug, "page") || strings.EqualFold(content.ContentType, "page") {
		return true
	}
	return false
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
	cleaned := cloneAnyMap(data)
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
	normalized := cloneAnyMap(metadata)
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
	for k, v := range base {
		merged[k] = v
	}
	for k, v := range updates {
		merged[k] = v
	}
	return merged
}

func (a *GoCMSContentAdapter) buildContentTranslation(field reflect.Value, content CMSContent) reflect.Value {
	field = deref(field)
	if !field.IsValid() || field.Kind() != reflect.Slice {
		return reflect.Value{}
	}
	elemType := field.Type().Elem()
	tr := reflect.New(elemType).Elem()
	setStringField(tr, "Locale", content.Locale)
	setStringField(tr, "Title", content.Title)
	if summary := strings.TrimSpace(asString(content.Data["excerpt"], "")); summary != "" {
		setStringPtr(tr.FieldByName("Summary"), summary)
	}
	if data := cloneAnyMap(content.Data); data != nil {
		setMapField(tr, "Content", data)
	}
	slice := reflect.MakeSlice(field.Type(), 0, 1)
	return reflect.Append(slice, tr)
}

func (a *GoCMSContentAdapter) buildPageTranslation(field reflect.Value, page CMSPage, path, locale string) reflect.Value {
	field = deref(field)
	if !field.IsValid() || field.Kind() != reflect.Slice {
		return reflect.Value{}
	}
	elemType := field.Type().Elem()
	tr := reflect.New(elemType).Elem()
	setStringField(tr, "Locale", locale)
	setStringField(tr, "Title", page.Title)
	setStringField(tr, "Path", path)
	if groupID := uuidFromString(page.TranslationGroupID); groupID != uuid.Nil {
		setUUIDPtr(tr.FieldByName("TranslationGroupID"), &groupID)
	}
	if summary := asString(page.Data["summary"], ""); summary != "" {
		setStringPtr(tr.FieldByName("Summary"), summary)
	}
	if mt := asString(page.SEO["title"], asString(page.Data["meta_title"], "")); mt != "" {
		setStringPtr(tr.FieldByName("SEOTitle"), mt)
	}
	if md := asString(page.SEO["description"], asString(page.Data["meta_description"], "")); md != "" {
		setStringPtr(tr.FieldByName("SEODescription"), md)
	}
	slice := reflect.MakeSlice(field.Type(), 0, 1)
	return reflect.Append(slice, tr)
}

func (a *GoCMSContentAdapter) createPageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}
	data := cloneAnyMap(page.Data)
	if mt := asString(page.SEO["title"], asString(data["meta_title"], "")); strings.TrimSpace(mt) != "" {
		data["meta_title"] = mt
	}
	if md := asString(page.SEO["description"], asString(data["meta_description"], "")); strings.TrimSpace(md) != "" {
		data["meta_description"] = md
	}
	if strings.TrimSpace(page.ParentID) != "" {
		data["parent_id"] = page.ParentID
	}
	if strings.TrimSpace(page.TemplateID) != "" {
		data["template_id"] = page.TemplateID
	}
	path := strings.TrimSpace(asString(data["path"], page.PreviewURL))
	if path == "" {
		path = "/" + strings.TrimPrefix(page.Slug, "/")
	}
	data["path"] = path
	if schema := strings.TrimSpace(page.SchemaVersion); schema != "" {
		data["_schema"] = schema
	} else if schema := strings.TrimSpace(toString(data["_schema"])); schema != "" {
		data["_schema"] = schema
	}
	if page.EmbeddedBlocks != nil {
		data["blocks"] = cloneEmbeddedBlocks(page.EmbeddedBlocks)
	} else if embedded, present := embeddedBlocksFromData(data); present {
		data["blocks"] = embedded
	}

	created, err := a.CreateContent(ctx, CMSContent{
		Title:       page.Title,
		Slug:        page.Slug,
		Status:      page.Status,
		Locale:      locale,
		ContentType: "page",
		Blocks:      append([]string{}, page.Blocks...),
		Data:        data,
		Metadata:    cloneAnyMap(page.Metadata),
	})
	if err != nil {
		return nil, err
	}
	rec := pageFromContent(*created)
	return &rec, nil
}

func (a *GoCMSContentAdapter) updatePageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}
	existing, err := a.Content(ctx, page.ID, locale)
	if err != nil {
		return nil, err
	}
	if existing == nil || (!strings.EqualFold(existing.ContentType, "page") && !strings.EqualFold(existing.ContentTypeSlug, "page")) {
		return nil, ErrNotFound
	}

	data := cloneAnyMap(existing.Data)
	for k, v := range cloneAnyMap(page.Data) {
		data[k] = v
	}
	if mt := asString(page.SEO["title"], asString(data["meta_title"], "")); strings.TrimSpace(mt) != "" {
		data["meta_title"] = mt
	}
	if md := asString(page.SEO["description"], asString(data["meta_description"], "")); strings.TrimSpace(md) != "" {
		data["meta_description"] = md
	}
	if strings.TrimSpace(page.ParentID) != "" {
		data["parent_id"] = page.ParentID
	}
	if strings.TrimSpace(page.TemplateID) != "" {
		data["template_id"] = page.TemplateID
	}
	path := strings.TrimSpace(asString(data["path"], page.PreviewURL))
	if path == "" {
		path = "/" + strings.TrimPrefix(asString(page.Slug, existing.Slug), "/")
	}
	data["path"] = path
	if schema := strings.TrimSpace(page.SchemaVersion); schema != "" {
		data["_schema"] = schema
	} else if schema := strings.TrimSpace(toString(data["_schema"])); schema != "" {
		data["_schema"] = schema
	}
	if page.EmbeddedBlocks != nil {
		data["blocks"] = cloneEmbeddedBlocks(page.EmbeddedBlocks)
	} else if embedded, present := embeddedBlocksFromData(data); present {
		data["blocks"] = embedded
	}

	title := strings.TrimSpace(page.Title)
	if title == "" {
		title = existing.Title
	}
	slug := strings.TrimSpace(page.Slug)
	if slug == "" {
		slug = existing.Slug
	}
	status := strings.TrimSpace(page.Status)
	if status == "" {
		status = existing.Status
	}
	blocks := append([]string{}, existing.Blocks...)
	if len(page.Blocks) > 0 {
		blocks = append([]string{}, page.Blocks...)
	}

	updated, err := a.UpdateContent(ctx, CMSContent{
		ID:          existing.ID,
		Title:       title,
		Slug:        slug,
		Status:      status,
		Locale:      locale,
		ContentType: "page",
		Blocks:      blocks,
		Data:        data,
		Metadata:    cloneAnyMap(page.Metadata),
		EmbeddedBlocks: func() []map[string]any {
			if page.EmbeddedBlocks != nil {
				return cloneEmbeddedBlocks(page.EmbeddedBlocks)
			}
			if embedded, present := embeddedBlocksFromData(data); present {
				return embedded
			}
			return nil
		}(),
		SchemaVersion: strings.TrimSpace(toString(data["_schema"])),
	})
	if err != nil {
		return nil, err
	}
	rec := pageFromContent(*updated)
	return &rec, nil
}

func (a *GoCMSContentAdapter) deletePageFromContent(ctx context.Context, id string) error {
	existing, err := a.Content(ctx, id, "")
	if err != nil {
		return err
	}
	if existing == nil || (!strings.EqualFold(existing.ContentType, "page") && !strings.EqualFold(existing.ContentTypeSlug, "page")) {
		return ErrNotFound
	}
	return a.DeleteContent(ctx, existing.ID)
}

func (a *GoCMSContentAdapter) convertContent(ctx context.Context, value reflect.Value, locale string) CMSContent {
	val := deref(value)
	out := CMSContent{Data: map[string]any{}}
	if id, ok := extractUUID(val, "ID"); ok {
		out.ID = id.String()
	}
	out.Slug = stringField(val, "Slug")
	out.Status = stringField(val, "Status")

	if typ := val.FieldByName("Type"); typ.IsValid() {
		typeVal := deref(typ)
		if slug := stringField(typeVal, "Slug"); slug != "" {
			out.ContentTypeSlug = slug
			out.ContentType = slug
		}
		if out.ContentType == "" {
			if name := stringField(typeVal, "Name"); name != "" {
				out.ContentType = name
			}
		}
	}
	if out.ContentType == "" {
		if typID, ok := extractUUID(val, "ContentTypeID"); ok && typID != uuid.Nil {
			if ct := a.contentTypeByID(ctx, typID); ct != nil {
				if ct.Slug != "" {
					out.ContentTypeSlug = ct.Slug
					out.ContentType = ct.Slug
				} else if ct.Name != "" {
					out.ContentType = ct.Name
				}
			}
		}
	}

	translations := deref(val.FieldByName("Translations"))
	availableLocales := stringSliceFieldAny(val, "AvailableLocales", "Locales")
	var chosen reflect.Value
	localeLower := strings.ToLower(strings.TrimSpace(locale))
	seenLocales := map[string]bool{}
	for _, code := range availableLocales {
		if trimmed := strings.ToLower(strings.TrimSpace(code)); trimmed != "" {
			seenLocales[trimmed] = true
		}
	}
	for i := 0; translations.IsValid() && i < translations.Len(); i++ {
		current := deref(translations.Index(i))
		rawCode := strings.TrimSpace(localeCodeFromTranslation(current))
		code := strings.ToLower(rawCode)
		if rawCode != "" && !seenLocales[code] {
			availableLocales = append(availableLocales, rawCode)
			seenLocales[code] = true
		}
		if !chosen.IsValid() {
			chosen = current
		}
		if localeLower == "" {
			continue
		}
		if code != "" && code == localeLower {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if groupID := uuidStringField(chosen, "TranslationGroupID"); groupID != "" {
			out.TranslationGroupID = groupID
		}
		if code := localeCodeFromTranslation(chosen); code != "" {
			out.Locale = code
		}
		out.Title = stringField(chosen, "Title")
		if summary := stringField(chosen, "Summary"); summary != "" {
			out.Data["excerpt"] = summary
		} else if summaryPtr := chosen.FieldByName("Summary"); summaryPtr.IsValid() && summaryPtr.Kind() == reflect.Ptr && !summaryPtr.IsNil() && summaryPtr.Elem().Kind() == reflect.String {
			out.Data["excerpt"] = summaryPtr.Elem().String()
		}
		if contentData := translationContentMap(chosen); len(contentData) > 0 {
			for key, value := range out.Data {
				contentData[key] = value
			}
			out.Data = contentData
		}
		if out.Title == "" {
			if title := strings.TrimSpace(toString(out.Data["title"])); title != "" {
				out.Title = title
			}
		}
	}
	if out.Locale == "" {
		out.Locale = locale
	}
	if len(availableLocales) > 0 {
		out.AvailableLocales = append([]string{}, availableLocales...)
	}
	requestedLocale := strings.TrimSpace(locale)
	if requestedLocale == "" {
		requestedLocale = strings.TrimSpace(stringFieldAny(val, "RequestedLocale"))
	}
	out.RequestedLocale = requestedLocale
	resolvedLocale := strings.TrimSpace(stringFieldAny(val, "ResolvedLocale"))
	if resolvedLocale == "" && chosen.IsValid() {
		resolvedLocale = strings.TrimSpace(stringFieldAny(chosen, "ResolvedLocale"))
	}
	if resolvedLocale == "" {
		resolvedLocale = out.Locale
	}
	out.ResolvedLocale = resolvedLocale
	missing := false
	if ok, set := boolFieldAny(val, "MissingRequestedLocale"); set {
		missing = ok
	} else if requestedLocale != "" {
		found := false
		for _, code := range out.AvailableLocales {
			if strings.EqualFold(code, requestedLocale) {
				found = true
				break
			}
		}
		if !found && len(out.AvailableLocales) > 0 {
			missing = true
		}
	}
	out.MissingRequestedLocale = missing
	if schema := strings.TrimSpace(toString(out.Data["_schema"])); schema != "" {
		out.SchemaVersion = schema
	}
	if meta := mapFieldAny(val, "Metadata"); meta != nil {
		out.Metadata = cloneAnyMap(meta)
	}
	if a.shouldApplyStructuralMetadata(ctx, out, nil) {
		if len(out.Metadata) == 0 {
			if derived := structuralMetadataFromData(out.Data); len(derived) > 0 {
				out.Metadata = derived
			}
		} else {
			out.Metadata = normalizeStructuralMetadata(out.Metadata)
		}
		out.Data = injectStructuralMetadata(out.Metadata, out.Data)
	}
	return out
}

func (a *GoCMSContentAdapter) convertPage(value reflect.Value, locale string) CMSPage {
	val := deref(value)
	out := CMSPage{Data: map[string]any{}, SEO: map[string]any{}}
	if id, ok := extractUUID(val, "ID"); ok {
		out.ID = id.String()
	}
	if tpl, ok := extractUUID(val, "TemplateID"); ok {
		out.TemplateID = tpl.String()
	}
	if pid, ok := extractUUID(val, "ParentID"); ok {
		out.ParentID = pid.String()
	}
	out.Slug = stringField(val, "Slug")
	out.Status = stringField(val, "Status")

	translations := deref(val.FieldByName("Translations"))
	availableLocales := stringSliceFieldAny(val, "AvailableLocales", "Locales")
	var chosen reflect.Value
	localeLower := strings.ToLower(strings.TrimSpace(locale))
	seenLocales := map[string]bool{}
	for _, code := range availableLocales {
		if trimmed := strings.ToLower(strings.TrimSpace(code)); trimmed != "" {
			seenLocales[trimmed] = true
		}
	}
	for i := 0; translations.IsValid() && i < translations.Len(); i++ {
		current := deref(translations.Index(i))
		rawCode := strings.TrimSpace(localeCodeFromTranslation(current))
		code := strings.ToLower(rawCode)
		if rawCode != "" && !seenLocales[code] {
			availableLocales = append(availableLocales, rawCode)
			seenLocales[code] = true
		}
		if !chosen.IsValid() {
			chosen = current
		}
		if localeLower == "" {
			continue
		}
		if code != "" && code == localeLower {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if groupID := uuidStringField(chosen, "TranslationGroupID"); groupID != "" {
			out.TranslationGroupID = groupID
		}
		if code := localeCodeFromTranslation(chosen); code != "" {
			out.Locale = code
		}
		out.Title = stringField(chosen, "Title")
		if path := stringField(chosen, "Path"); path != "" {
			out.Data["path"] = path
			out.PreviewURL = path
		}
		if seoTitle := stringField(chosen, "SEOTitle"); seoTitle != "" {
			out.SEO["title"] = seoTitle
			out.Data["meta_title"] = seoTitle
		}
		if seoDesc := stringField(chosen, "SEODescription"); seoDesc != "" {
			out.SEO["description"] = seoDesc
			out.Data["meta_description"] = seoDesc
		}
		if summary := stringField(chosen, "Summary"); summary != "" {
			out.Data["summary"] = summary
		}
		if contentData := translationContentMap(chosen); len(contentData) > 0 {
			for key, value := range out.Data {
				contentData[key] = value
			}
			out.Data = contentData
		}
		if out.Title == "" {
			if title := strings.TrimSpace(toString(out.Data["title"])); title != "" {
				out.Title = title
			}
		}
		if path := strings.TrimSpace(toString(out.Data["path"])); path != "" {
			out.Data["path"] = path
			if out.PreviewURL == "" {
				out.PreviewURL = path
			}
		} else if out.PreviewURL != "" {
			out.Data["path"] = out.PreviewURL
		}
		if out.SEO == nil {
			out.SEO = map[string]any{}
		}
		if strings.TrimSpace(toString(out.SEO["title"])) == "" {
			if seoTitle := strings.TrimSpace(toString(out.Data["meta_title"])); seoTitle != "" {
				out.SEO["title"] = seoTitle
			}
		}
		if strings.TrimSpace(toString(out.SEO["description"])) == "" {
			if seoDesc := strings.TrimSpace(toString(out.Data["meta_description"])); seoDesc != "" {
				out.SEO["description"] = seoDesc
			}
		}
		if strings.TrimSpace(toString(out.Data["meta_title"])) == "" {
			if seoTitle := strings.TrimSpace(toString(out.SEO["title"])); seoTitle != "" {
				out.Data["meta_title"] = seoTitle
			}
		}
		if strings.TrimSpace(toString(out.Data["meta_description"])) == "" {
			if seoDesc := strings.TrimSpace(toString(out.SEO["description"])); seoDesc != "" {
				out.Data["meta_description"] = seoDesc
			}
		}
	}
	if out.Locale == "" {
		out.Locale = locale
	}
	if len(availableLocales) > 0 {
		out.AvailableLocales = append([]string{}, availableLocales...)
	}
	requestedLocale := strings.TrimSpace(locale)
	if requestedLocale == "" {
		requestedLocale = strings.TrimSpace(stringFieldAny(val, "RequestedLocale"))
	}
	out.RequestedLocale = requestedLocale
	resolvedLocale := strings.TrimSpace(stringFieldAny(val, "ResolvedLocale"))
	if resolvedLocale == "" && chosen.IsValid() {
		resolvedLocale = strings.TrimSpace(stringFieldAny(chosen, "ResolvedLocale"))
	}
	if resolvedLocale == "" {
		resolvedLocale = out.Locale
	}
	out.ResolvedLocale = resolvedLocale
	missing := false
	if ok, set := boolFieldAny(val, "MissingRequestedLocale"); set {
		missing = ok
	} else if requestedLocale != "" {
		found := false
		for _, code := range out.AvailableLocales {
			if strings.EqualFold(code, requestedLocale) {
				found = true
				break
			}
		}
		if !found && len(out.AvailableLocales) > 0 {
			missing = true
		}
	}
	out.MissingRequestedLocale = missing
	if schema := strings.TrimSpace(toString(out.Data["_schema"])); schema != "" {
		out.SchemaVersion = schema
	}
	if meta := mapFieldAny(val, "Metadata"); meta != nil {
		out.Metadata = cloneAnyMap(meta)
	}
	return out
}

func (a *GoCMSContentAdapter) convertBlockInstance(value reflect.Value, locale string) CMSBlock {
	val := deref(value)
	block := CMSBlock{Data: map[string]any{}}
	if id, ok := extractUUID(val, "ID"); ok {
		block.ID = id.String()
	}
	if defID, ok := extractUUID(val, "DefinitionID"); ok {
		if name := a.blockDefinitionName(defID); name != "" {
			block.DefinitionID = name
			block.BlockType = name
			block.BlockSchemaKey = name
		} else {
			block.DefinitionID = defID.String()
		}
	}
	if pageID, ok := extractUUID(val, "PageID"); ok {
		block.ContentID = pageID.String()
	}
	block.Region = stringField(val, "Region")
	if pos, ok := getIntField(val, "Position"); ok {
		block.Position = pos
	}
	if pub := val.FieldByName("PublishedVersion"); pub.IsValid() && pub.Kind() == reflect.Ptr && !pub.IsNil() {
		block.Status = "published"
	} else if block.Status == "" {
		block.Status = "draft"
	}

	translations := deref(val.FieldByName("Translations"))
	var chosen reflect.Value
	localeID := localeUUID(locale)
	for i := 0; translations.IsValid() && i < translations.Len(); i++ {
		current := deref(translations.Index(i))
		if !chosen.IsValid() {
			chosen = current
		}
		if localeID == uuid.Nil {
			continue
		}
		if trID, ok := extractUUID(current, "LocaleID"); ok && trID == localeID {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if contentField := chosen.FieldByName("Content"); contentField.IsValid() && contentField.Kind() == reflect.Map {
			if m, ok := contentField.Interface().(map[string]any); ok {
				block.Data = cloneAnyMap(m)
			}
		}
	}
	if block.Locale == "" {
		block.Locale = locale
	}
	return block
}

func (a *GoCMSContentAdapter) contentTypeByID(ctx context.Context, id uuid.UUID) *CMSContentType {
	if a == nil || a.contentTypes == nil || id == uuid.Nil {
		return nil
	}
	ct, err := a.contentTypes.ContentType(ctx, id.String())
	if err == nil && ct != nil {
		return ct
	}
	items, err := a.contentTypes.ContentTypes(ctx)
	if err != nil {
		return nil
	}
	for _, item := range items {
		if strings.EqualFold(item.ID, id.String()) {
			copy := item
			return &copy
		}
	}
	return nil
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
	def.ID = strings.TrimSpace(firstNonEmpty(def.Slug, def.Name))
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
			def.Schema = cloneAnyMap(schema)
			if def.Type == "" {
				if t := strings.TrimSpace(toString(schema["x-block-type"])); t != "" {
					def.Type = t
				}
			}
		}
	}
	if uiSchemaField := val.FieldByName("UISchema"); uiSchemaField.IsValid() {
		if uiSchema, ok := uiSchemaField.Interface().(map[string]any); ok {
			def.UISchema = cloneAnyMap(uiSchema)
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
	if env := strings.TrimSpace(stringField(val, "Environment")); env != "" {
		def.Environment = env
	} else if env := strings.TrimSpace(stringField(val, "Env")); env != "" {
		def.Environment = env
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = schemaMigrationStatusFromSchema(def.Schema)
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(firstNonEmpty(def.Slug, def.Name, def.ID))
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
			out.Schema = cloneAnyMap(schema)
		}
	}
	if defaultsField := val.FieldByName("Defaults"); defaultsField.IsValid() {
		if defaults, ok := defaultsField.Interface().(map[string]any); ok {
			out.Defaults = cloneAnyMap(defaults)
		}
	}
	if out.MigrationStatus == "" {
		out.MigrationStatus = schemaMigrationStatusFromSchema(out.Schema)
	}
	out.CreatedAt = timeField(val, "CreatedAt")
	out.UpdatedAt = timeField(val, "UpdatedAt")
	return out
}

func blockDefinitionCacheKey(env, key string) string {
	normalized := strings.ToLower(strings.TrimSpace(key))
	if normalized == "" {
		return ""
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return normalized
	}
	return env + "::" + normalized
}

func blockDefinitionCacheEnv(ctx context.Context, def CMSBlockDefinition) string {
	if env := strings.TrimSpace(def.Environment); env != "" {
		return env
	}
	return strings.TrimSpace(EnvironmentFromContext(ctx))
}

func pageFromContent(content CMSContent) CMSPage {
	data := cloneAnyMap(content.Data)
	meta := normalizeStructuralMetadata(content.Metadata)
	if meta != nil {
		data = injectStructuralMetadata(meta, data)
	}
	path := strings.TrimSpace(asString(data["path"], asString(meta["path"], "")))
	parentID := strings.TrimSpace(asString(data["parent_id"], asString(meta["parent_id"], "")))
	templateID := strings.TrimSpace(asString(data["template_id"], asString(meta["template_id"], asString(data["template"], ""))))

	seo := map[string]any{}
	if mt := strings.TrimSpace(asString(data["meta_title"], "")); mt != "" {
		seo["title"] = mt
	}
	if md := strings.TrimSpace(asString(data["meta_description"], "")); md != "" {
		seo["description"] = md
	}

	out := CMSPage{
		ID:             content.ID,
		Title:          content.Title,
		Slug:           content.Slug,
		TemplateID:     templateID,
		Locale:         content.Locale,
		ParentID:       parentID,
		Blocks:         append([]string{}, content.Blocks...),
		EmbeddedBlocks: nil,
		SchemaVersion:  strings.TrimSpace(content.SchemaVersion),
		SEO:            seo,
		Status:         content.Status,
		Data:           data,
		Metadata:       cloneAnyMap(content.Metadata),
		PreviewURL:     path,
	}
	if out.SchemaVersion == "" {
		out.SchemaVersion = strings.TrimSpace(toString(data["_schema"]))
	}
	if content.EmbeddedBlocks != nil {
		out.EmbeddedBlocks = cloneEmbeddedBlocks(content.EmbeddedBlocks)
	} else if embedded, present := embeddedBlocksFromData(data); present {
		out.EmbeddedBlocks = embedded
	}
	if out.PreviewURL == "" && strings.TrimSpace(out.Slug) != "" {
		out.PreviewURL = "/" + strings.TrimPrefix(out.Slug, "/")
	}
	return out
}

func localeCodeFromTranslation(val reflect.Value) string {
	if code := stringField(val, "Locale"); code != "" {
		return code
	}
	if code := stringField(val, "LocaleCode"); code != "" {
		return code
	}
	localeVal := deref(val.FieldByName("Locale"))
	if localeVal.IsValid() {
		if code := stringField(localeVal, "Code"); code != "" {
			return code
		}
	}
	return ""
}

func translationContentMap(val reflect.Value) map[string]any {
	contentField := val.FieldByName("Content")
	if !contentField.IsValid() {
		return nil
	}
	contentField = deref(contentField)
	if !contentField.IsValid() {
		return nil
	}
	switch contentField.Kind() {
	case reflect.Map:
		if m, ok := contentField.Interface().(map[string]any); ok {
			return cloneAnyMap(m)
		}
		if contentField.Type().Key().Kind() == reflect.String {
			out := map[string]any{}
			iter := contentField.MapRange()
			for iter.Next() {
				out[iter.Key().String()] = iter.Value().Interface()
			}
			return out
		}
	case reflect.String:
		raw := strings.TrimSpace(contentField.String())
		if raw == "" {
			return nil
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(raw), &decoded); err == nil {
			return decoded
		}
	case reflect.Slice:
		if contentField.Type().Elem().Kind() == reflect.Uint8 {
			raw := contentField.Bytes()
			if len(raw) == 0 {
				return nil
			}
			var decoded map[string]any
			if err := json.Unmarshal(raw, &decoded); err == nil {
				return decoded
			}
		}
	}
	return nil
}

func uuidFromString(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.Nil
}

func uuidStringField(val reflect.Value, name string) string {
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
	if field.Kind() == reflect.Ptr && !field.IsNil() && field.Elem().CanInterface() {
		if v, ok := field.Elem().Interface().(uuid.UUID); ok && v != uuid.Nil {
			return v.String()
		}
	}
	return ""
}

func stringField(val reflect.Value, field string) string {
	f := val.FieldByName(field)
	if f.IsValid() {
		switch f.Kind() {
		case reflect.String:
			return f.String()
		case reflect.Ptr:
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
	f := val.FieldByName(field)
	if !f.IsValid() {
		return false, false
	}
	switch f.Kind() {
	case reflect.Bool:
		return f.Bool(), true
	case reflect.Ptr:
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
	if f.IsValid() && f.Kind() == reflect.Ptr && !f.IsNil() && f.Elem().CanInterface() {
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
