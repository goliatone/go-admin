package admin

import (
	"context"
	"maps"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type goCMSContentWriteBoundary struct {
	adapter *GoCMSContentAdapter
}

func (a *GoCMSContentAdapter) contentWriter() goCMSContentWriteBoundary {
	return goCMSContentWriteBoundary{adapter: a}
}

func (r goCMSContentWriteBoundary) CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	return r.createPageFromContent(ctx, page)
}

func (r goCMSContentWriteBoundary) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	return r.updatePageFromContent(ctx, page)
}

func (r goCMSContentWriteBoundary) DeletePage(ctx context.Context, id string) error {
	a := r.adapter
	if a == nil || a.content == nil {
		return ErrNotFound
	}
	return r.deletePageFromContent(ctx, id)
}

func (r goCMSContentWriteBoundary) CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	contentTypeID, err := r.resolveContentTypeID(ctx, content)
	if err != nil {
		return nil, err
	}
	actor := actorUUID(ctx)
	meta, cleaned, includeMeta := r.prepareContentMetadata(ctx, content, nil)
	content.Data = cleaned
	applySchemaVersionToContent(&content)
	applyEmbeddedBlocksToContent(&content)
	req := cmscontent.CreateContentRequest{
		ContentTypeID:            contentTypeID,
		Slug:                     content.Slug,
		Status:                   content.Status,
		CreatedBy:                actor,
		UpdatedBy:                actor,
		Translations:             buildGoCMSContentTranslations(content),
		AllowMissingTranslations: true,
	}
	if includeMeta {
		req.Metadata = meta
	}
	created, err := a.content.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, reflect.ValueOf(created), content.Locale)
	return &rec, nil
}

func (r goCMSContentWriteBoundary) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	var existing *CMSContent
	if content.ID != "" {
		if current, err := a.fetchContent(ctx, content.ID, content.Locale, false); err == nil && current != nil {
			existing = current
		}
	}
	meta, cleaned, includeMeta := r.prepareContentMetadata(ctx, content, existing)
	content.Data = cleaned
	applySchemaVersionToContent(&content)
	applyEmbeddedBlocksToContent(&content)
	req := cmscontent.UpdateContentRequest{
		ID:                       uuidFromString(content.ID),
		Status:                   content.Status,
		UpdatedBy:                actorUUID(ctx),
		Translations:             buildGoCMSContentTranslations(content),
		AllowMissingTranslations: true,
	}
	if req.ID == uuid.Nil {
		return nil, ErrNotFound
	}
	if includeMeta {
		req.Metadata = meta
	}
	updated, err := a.content.Update(ctx, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, reflect.ValueOf(updated), content.Locale)
	return &rec, nil
}

func (r goCMSContentWriteBoundary) DeleteContent(ctx context.Context, id string) error {
	a := r.adapter
	if a == nil || a.content == nil {
		return ErrNotFound
	}
	req := cmscontent.DeleteContentRequest{
		ID:         uuidFromString(id),
		DeletedBy:  actorUUID(ctx),
		HardDelete: true,
	}
	if req.ID == uuid.Nil {
		return ErrNotFound
	}
	return a.content.Delete(ctx, req)
}

func (r goCMSContentWriteBoundary) BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error) {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	records, err := a.blocks.ListDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	defs := make([]CMSBlockDefinition, 0, len(records))
	defCache := map[string]uuid.UUID{}
	defNames := map[uuid.UUID]string{}
	for _, record := range records {
		if record == nil {
			continue
		}
		def := convertBlockDefinition(reflect.ValueOf(record))
		if def.ID != "" {
			collectGoCMSBlockDefinitionCacheEntries(defCache, defNames, ctx, def, record.ID, false)
		}
		defs = append(defs, def)
	}
	a.publishBlockDefinitionCache(defCache, defNames)
	return defs, nil
}

func (r goCMSContentWriteBoundary) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	name := strings.TrimSpace(primitives.FirstNonEmptyRaw(def.ID, def.Name))
	if name == "" {
		return nil, requiredFieldDomainError("block definition name", map[string]any{"component": "content_adapter"})
	}
	req := cmsblocks.RegisterDefinitionInput{
		Name:   name,
		Slug:   strings.TrimSpace(def.Slug),
		Status: strings.TrimSpace(def.Status),
		Schema: primitives.CloneAnyMap(def.Schema),
	}
	if channel := strings.TrimSpace(cmsBlockDefinitionChannel(def)); channel != "" {
		req.EnvironmentKey = channel
	}
	if def.DescriptionSet {
		desc := def.Description
		req.Description = &desc
	} else if desc := strings.TrimSpace(def.Description); desc != "" {
		req.Description = &desc
	}
	if def.IconSet {
		icon := def.Icon
		req.Icon = &icon
	} else if icon := strings.TrimSpace(def.Icon); icon != "" {
		req.Icon = &icon
	}
	if def.CategorySet {
		category := def.Category
		req.Category = &category
	} else if category := strings.TrimSpace(def.Category); category != "" {
		req.Category = &category
	}
	if len(def.UISchema) > 0 {
		req.UISchema = primitives.CloneAnyMap(def.UISchema)
	}
	created, err := a.blocks.RegisterDefinition(ctx, req)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	converted := convertBlockDefinition(reflect.ValueOf(created))
	defCache := map[string]uuid.UUID{}
	defNames := map[uuid.UUID]string{}
	collectGoCMSBlockDefinitionCacheEntries(defCache, defNames, ctx, converted, created.ID, true)
	a.publishBlockDefinitionCache(defCache, defNames)
	return &converted, nil
}

func (r goCMSContentWriteBoundary) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	defID, err := r.resolveBlockDefinitionID(ctx, def.ID)
	if err != nil {
		return nil, err
	}
	req := cmsblocks.UpdateDefinitionInput{ID: defID}
	if name := strings.TrimSpace(def.Name); name != "" {
		req.Name = &name
	}
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		req.Slug = &slug
	}
	if desc := strings.TrimSpace(def.Description); desc != "" {
		req.Description = &desc
	}
	if icon := strings.TrimSpace(def.Icon); icon != "" {
		req.Icon = &icon
	}
	if category := strings.TrimSpace(def.Category); category != "" {
		req.Category = &category
	}
	if status := strings.TrimSpace(def.Status); status != "" {
		req.Status = &status
	}
	if channel := strings.TrimSpace(cmsBlockDefinitionChannel(def)); channel != "" {
		req.EnvironmentKey = &channel
	}
	if len(def.Schema) > 0 {
		req.Schema = primitives.CloneAnyMap(def.Schema)
	}
	if len(def.UISchema) > 0 {
		req.UISchema = primitives.CloneAnyMap(def.UISchema)
	}
	updated, err := a.blocks.UpdateDefinition(ctx, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrNotFound
	}
	converted := convertBlockDefinition(reflect.ValueOf(updated))
	defCache := map[string]uuid.UUID{}
	defNames := map[uuid.UUID]string{}
	collectGoCMSBlockDefinitionCacheEntries(defCache, defNames, ctx, converted, updated.ID, true)
	a.publishBlockDefinitionCache(defCache, defNames)
	return &converted, nil
}

func (r goCMSContentWriteBoundary) DeleteBlockDefinition(ctx context.Context, id string) error {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return ErrNotFound
	}
	defID, err := r.resolveBlockDefinitionID(ctx, id)
	if err != nil {
		return err
	}
	return a.blocks.DeleteDefinition(ctx, cmsblocks.DeleteDefinitionRequest{ID: defID, HardDelete: true})
}

func (r goCMSContentWriteBoundary) BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error) {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	defID, err := r.resolveBlockDefinitionID(ctx, id)
	if err != nil {
		return nil, err
	}
	versions, err := a.blocks.ListDefinitionVersions(ctx, defID)
	if err != nil {
		return nil, err
	}
	out := make([]CMSBlockDefinitionVersion, 0, len(versions))
	for _, version := range versions {
		if version == nil {
			continue
		}
		out = append(out, convertBlockDefinitionVersion(reflect.ValueOf(version)))
	}
	return out, nil
}

func (r goCMSContentWriteBoundary) SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error) {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return nil, ErrNotFound
	}
	defID, err := r.resolveBlockDefinitionID(ctx, block.DefinitionID)
	if err != nil {
		return nil, err
	}
	pageID := a.resolvePageID(ctx, block.ContentID)
	if pageID == uuid.Nil {
		return nil, ErrNotFound
	}
	if strings.TrimSpace(block.ID) == "" {
		return r.createBlockInstance(ctx, defID, pageID, block)
	}
	return r.updateBlockInstance(ctx, defID, pageID, block)
}

func (r goCMSContentWriteBoundary) DeleteBlock(ctx context.Context, id string) error {
	a := r.adapter
	if a == nil || a.blocks == nil {
		return ErrNotFound
	}
	uid := uuidFromString(id)
	if uid == uuid.Nil {
		return ErrNotFound
	}
	return a.blocks.DeleteInstance(ctx, cmsblocks.DeleteInstanceRequest{
		ID:         uid,
		DeletedBy:  actorUUID(ctx),
		HardDelete: true,
	})
}

func (r goCMSContentWriteBoundary) createBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	a := r.adapter
	req := cmsblocks.CreateInstanceInput{
		DefinitionID:  defID,
		Region:        strings.TrimSpace(block.Region),
		Position:      block.Position,
		Configuration: primitives.CloneAnyMap(block.Data),
		CreatedBy:     actorUUID(ctx),
		UpdatedBy:     actorUUID(ctx),
	}
	if pageID != uuid.Nil {
		req.PageID = &pageID
	}
	created, err := a.blocks.CreateInstance(ctx, req)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	if err := r.upsertBlockTranslation(ctx, created.ID, block, false); err != nil {
		return nil, err
	}
	converted := a.convertBlockInstance(ctx, reflect.ValueOf(created), block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = primitives.CloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (r goCMSContentWriteBoundary) updateBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	a := r.adapter
	_ = defID
	instanceID := uuidFromString(block.ID)
	if instanceID == uuid.Nil {
		return nil, ErrNotFound
	}
	req := cmsblocks.UpdateInstanceInput{
		InstanceID:    instanceID,
		Configuration: primitives.CloneAnyMap(block.Data),
		UpdatedBy:     actorUUID(ctx),
	}
	if pageID != uuid.Nil {
		req.PageID = &pageID
	}
	if region := strings.TrimSpace(block.Region); region != "" {
		req.Region = &region
	}
	if block.Position > 0 {
		position := block.Position
		req.Position = &position
	}
	updated, err := a.blocks.UpdateInstance(ctx, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrNotFound
	}
	if err := r.upsertBlockTranslation(ctx, updated.ID, block, true); err != nil {
		return nil, err
	}
	converted := a.convertBlockInstance(ctx, reflect.ValueOf(updated), block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = primitives.CloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (r goCMSContentWriteBoundary) upsertBlockTranslation(ctx context.Context, instanceID uuid.UUID, block CMSBlock, allowCreate bool) error {
	a := r.adapter
	if instanceID == uuid.Nil {
		return nil
	}
	locale := strings.TrimSpace(block.Locale)
	if locale == "" {
		return nil
	}
	payload := primitives.CloneAnyMap(block.Data)
	if payload == nil {
		payload = map[string]any{}
	}
	localeID, ok := a.resolveLocaleID(ctx, locale)
	if !ok {
		return nil
	}
	updateReq := cmsblocks.UpdateTranslationInput{
		BlockInstanceID: instanceID,
		LocaleID:        localeID,
		Content:         payload,
		UpdatedBy:       actorUUID(ctx),
	}
	if _, err := a.blocks.UpdateTranslation(ctx, updateReq); err == nil {
		return nil
	} else if !allowCreate {
		return err
	}
	_, err := a.blocks.AddTranslation(ctx, cmsblocks.AddTranslationInput{
		BlockInstanceID: instanceID,
		LocaleID:        localeID,
		Content:         payload,
	})
	return err
}

func (r goCMSContentWriteBoundary) resolveContentTypeID(ctx context.Context, content CMSContent) (uuid.UUID, error) {
	a := r.adapter
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
	return uuid.Nil, notFoundDomainError("content type not found", map[string]any{"component": "content_adapter", "content_type": content.ContentType})
}

func (r goCMSContentWriteBoundary) resolveBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, error) {
	a := r.adapter
	id = strings.TrimSpace(id)
	if id == "" {
		return uuid.Nil, ErrNotFound
	}
	if parsed := uuidFromString(id); parsed != uuid.Nil {
		return parsed, nil
	}
	a.refreshBlockDefinitions(ctx)
	if defID, ok := a.lookupBlockDefinitionID(ctx, id); ok {
		return defID, nil
	}
	return uuid.Nil, ErrNotFound
}

func (r goCMSContentWriteBoundary) prepareContentMetadata(ctx context.Context, content CMSContent, existing *CMSContent) (map[string]any, map[string]any, bool) {
	data := primitives.CloneAnyMap(content.Data)
	metadata := primitives.CloneAnyMap(content.Metadata)
	if existing != nil {
		content.FamilyID = strings.TrimSpace(primitives.FirstNonEmptyRaw(content.FamilyID, existing.FamilyID))
	}
	groupID := adapterRequestedFamilyID(content.FamilyID, data, metadata)
	if existing != nil {
		groupID = adapterRequestedFamilyID(groupID, existing.Data, existing.Metadata)
	}
	data, metadata = adapterPersistTranslationGroupMetadata(groupID, data, metadata)
	if existing != nil {
		if content.ContentType == "" {
			content.ContentType = existing.ContentType
		}
		if content.ContentTypeSlug == "" {
			content.ContentTypeSlug = existing.ContentTypeSlug
		}
	}
	applyStructural := r.shouldApplyStructuralMetadata(ctx, content, existing)
	if applyStructural {
		extracted, cleaned := extractStructuralMetadata(data)
		data = cleaned
		var base map[string]any
		if existing != nil && existing.Metadata != nil {
			base = primitives.CloneAnyMap(existing.Metadata)
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

func (r goCMSContentWriteBoundary) shouldApplyStructuralMetadata(ctx context.Context, content CMSContent, existing *CMSContent) bool {
	a := r.adapter
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
	}
	return false
}

func (r goCMSContentWriteBoundary) createPageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	a := r.adapter
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}
	data := primitives.CloneAnyMap(page.Data)
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
	groupID := adapterRequestedFamilyID(page.FamilyID, data, page.Metadata)
	data, metadata := adapterPersistTranslationGroupMetadata(groupID, data, page.Metadata)

	created, err := r.CreateContent(ctx, CMSContent{
		Title:       page.Title,
		Slug:        page.Slug,
		Status:      page.Status,
		Locale:      locale,
		FamilyID:    groupID,
		ContentType: "page",
		Blocks:      append([]string{}, page.Blocks...),
		Data:        data,
		Metadata:    metadata,
	})
	if err != nil {
		return nil, err
	}
	rec := pageFromContent(*created)
	_ = a
	return &rec, nil
}

func (r goCMSContentWriteBoundary) updatePageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}
	existing, err := r.adapter.Content(ctx, page.ID, locale)
	if err != nil {
		return nil, err
	}
	if existing == nil || (!strings.EqualFold(existing.ContentType, "page") && !strings.EqualFold(existing.ContentTypeSlug, "page")) {
		return nil, ErrNotFound
	}

	data := primitives.CloneAnyMap(existing.Data)
	maps.Copy(data, primitives.CloneAnyMap(page.Data))
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
	metadata := mergeMetadata(primitives.CloneAnyMap(existing.Metadata), primitives.CloneAnyMap(page.Metadata))
	groupID := adapterRequestedFamilyID(primitives.FirstNonEmptyRaw(page.FamilyID, existing.FamilyID), data, metadata)
	data, metadata = adapterPersistTranslationGroupMetadata(groupID, data, metadata)

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

	updated, err := r.UpdateContent(ctx, CMSContent{
		ID:          existing.ID,
		Title:       title,
		Slug:        slug,
		Status:      status,
		Locale:      locale,
		FamilyID:    groupID,
		ContentType: "page",
		Blocks:      blocks,
		Data:        data,
		Metadata:    metadata,
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

func (r goCMSContentWriteBoundary) deletePageFromContent(ctx context.Context, id string) error {
	existing, err := r.adapter.Content(ctx, id, "")
	if err != nil {
		return err
	}
	if existing == nil || (!strings.EqualFold(existing.ContentType, "page") && !strings.EqualFold(existing.ContentTypeSlug, "page")) {
		return ErrNotFound
	}
	return r.DeleteContent(ctx, existing.ID)
}
