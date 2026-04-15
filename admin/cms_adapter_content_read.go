package admin

import (
	"context"
	"maps"
	"reflect"
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

func toGoCMSContentListOptions(opts ...CMSContentListOption) []cmscontent.ContentListOption {
	if len(opts) == 0 {
		return nil
	}
	out := make([]cmscontent.ContentListOption, 0, len(opts))
	for _, opt := range opts {
		if isInternalCMSContentListOption(opt) {
			continue
		}
		out = append(out, opt)
	}
	return out
}

func ensureDerivedFieldsProjection(opts ...CMSContentListOption) []CMSContentListOption {
	if len(opts) == 0 {
		return nil
	}
	if !hasCMSContentListOption(opts, WithTranslations()) {
		return opts
	}
	if hasCMSProjectionOption(opts) {
		return opts
	}
	out := append([]CMSContentListOption{}, opts...)
	out = append(out, WithDerivedFields())
	return out
}

func hasCMSContentListOption(opts []CMSContentListOption, token CMSContentListOption) bool {
	return slices.Contains(opts, token)
}

func hasCMSProjectionOption(opts []CMSContentListOption) bool {
	const prefix = "content:list:projection:"
	for _, opt := range opts {
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(opt)), prefix) {
			return true
		}
	}
	return false
}

func isInternalCMSContentListOption(opt CMSContentListOption) bool {
	return opt == WithLocaleVariants()
}

func hasLocaleVariantsOption(opts []CMSContentListOption) bool {
	return hasCMSContentListOption(opts, WithLocaleVariants())
}

func normalizeCMSRequestedListLocale(locale string) string {
	if isTranslationLocaleWildcard(locale) {
		return ""
	}
	return strings.TrimSpace(locale)
}

type goCMSContentReadBoundary struct {
	adapter *GoCMSContentAdapter
}

func (a *GoCMSContentAdapter) contentReader() goCMSContentReadBoundary {
	return goCMSContentReadBoundary{adapter: a}
}

func (a *GoCMSContentAdapter) Pages(ctx context.Context, locale string) ([]CMSPage, error) {
	return a.contentReader().Pages(ctx, locale)
}

func (r goCMSContentReadBoundary) Pages(ctx context.Context, locale string) ([]CMSPage, error) {
	return r.PagesWithOptions(ctx, locale, WithTranslations())
}

func (a *GoCMSContentAdapter) PagesWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSPage, error) {
	return a.contentReader().PagesWithOptions(ctx, locale, opts...)
}

func (r goCMSContentReadBoundary) PagesWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSPage, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	pageOpts := append([]CMSContentListOption{}, opts...)
	if len(pageOpts) == 0 {
		pageOpts = append(pageOpts, WithTranslations())
	} else if hasLocaleVariantsOption(pageOpts) && !hasCMSContentListOption(pageOpts, WithTranslations()) {
		pageOpts = append(pageOpts, WithTranslations())
	}
	contents, err := a.listContents(ctx, locale, pageOpts...)
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
	return a.contentReader().Page(ctx, id, locale)
}

func (r goCMSContentReadBoundary) Page(ctx context.Context, id, locale string) (*CMSPage, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	content, err := r.Content(ctx, id, locale)
	if err != nil {
		return nil, err
	}
	if content == nil || (!strings.EqualFold(content.ContentType, "page") && !strings.EqualFold(content.ContentTypeSlug, "page")) {
		return nil, ErrNotFound
	}
	rec := pageFromContent(*content)
	return &rec, nil
}

func (a *GoCMSContentAdapter) Contents(ctx context.Context, locale string) ([]CMSContent, error) {
	return a.contentReader().Contents(ctx, locale)
}

func (r goCMSContentReadBoundary) Contents(ctx context.Context, locale string) ([]CMSContent, error) {
	return r.listContents(ctx, locale)
}

func (a *GoCMSContentAdapter) ContentsWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	return a.contentReader().ContentsWithOptions(ctx, locale, opts...)
}

func (r goCMSContentReadBoundary) ContentsWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	return r.listContents(ctx, locale, opts...)
}

func (a *GoCMSContentAdapter) listContents(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	return a.contentReader().listContents(ctx, locale, opts...)
}

func (r goCMSContentReadBoundary) listContents(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	if a.adminRead != nil && !hasLocaleVariantsOption(opts) {
		records, _, err := a.adminRead.List(ctx, cms.AdminContentListOptions{
			Locale:                   locale,
			AllowMissingTranslations: true,
			IncludeData:              true,
			IncludeMetadata:          true,
			IncludeBlocks:            true,
		})
		if err != nil {
			return nil, err
		}
		out := make([]CMSContent, 0, len(records))
		for _, record := range records {
			converted := r.convertAdminContentRecord(ctx, record)
			applySchemaVersionToContent(&converted)
			applyEmbeddedBlocksToContent(&converted)
			out = append(out, converted)
		}
		return out, nil
	}
	listOpts := ensureDerivedFieldsProjection(opts...)
	requestedLocale := strings.TrimSpace(locale)
	listed, err := a.content.List(ctx, toGoCMSContentListOptions(listOpts...)...)
	if err != nil {
		return nil, err
	}
	out := make([]CMSContent, 0, len(listed))
	for _, item := range listed {
		if item == nil {
			continue
		}
		value := reflect.ValueOf(item)
		if hasLocaleVariantsOption(listOpts) {
			variants := r.convertContentVariants(ctx, value, requestedLocale)
			if len(variants) == 0 {
				continue
			}
			out = append(out, variants...)
			continue
		}
		converted := a.convertContent(ctx, value, normalizeCMSRequestedListLocale(requestedLocale))
		applySchemaVersionToContent(&converted)
		applyEmbeddedBlocksToContent(&converted)
		out = append(out, converted)
	}
	return out, nil
}

func (a *GoCMSContentAdapter) Content(ctx context.Context, id, locale string) (*CMSContent, error) {
	return a.contentReader().Content(ctx, id, locale)
}

func (r goCMSContentReadBoundary) Content(ctx context.Context, id, locale string) (*CMSContent, error) {
	return r.fetchContent(ctx, id, locale, true)
}

func (a *GoCMSContentAdapter) fetchContent(ctx context.Context, id, locale string, allowLegacy bool) (*CMSContent, error) {
	return a.contentReader().fetchContent(ctx, id, locale, allowLegacy)
}

func (r goCMSContentReadBoundary) fetchContent(ctx context.Context, id, locale string, allowLegacy bool) (*CMSContent, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	if a.adminRead != nil {
		record, err := a.adminRead.Get(ctx, id, cms.AdminContentGetOptions{
			Locale:                   locale,
			AllowMissingTranslations: true,
			IncludeData:              true,
			IncludeMetadata:          true,
			IncludeBlocks:            true,
		})
		if err != nil {
			return nil, err
		}
		if record == nil {
			return nil, ErrNotFound
		}
		rec := r.convertAdminContentRecord(ctx, *record)
		applySchemaVersionToContent(&rec)
		embeddedPresent := applyEmbeddedBlocksToContent(&rec)
		if !embeddedPresent && allowLegacy && (a.adminBlocks != nil || a.blocks != nil) {
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
	uid := cmsadapter.UUIDFromString(id)
	if uid == uuid.Nil {
		return nil, ErrNotFound
	}
	record, err := a.content.Get(ctx, uid, cmscontent.WithTranslations(), cmscontent.WithDerivedFields())
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, ErrNotFound
	}
	rec := a.convertContent(ctx, reflect.ValueOf(record), locale)
	applySchemaVersionToContent(&rec)
	embeddedPresent := applyEmbeddedBlocksToContent(&rec)
	if !embeddedPresent && allowLegacy && (a.adminBlocks != nil || a.blocks != nil) {
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

func (a *GoCMSContentAdapter) BlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	return a.contentReader().BlocksForContent(ctx, contentID, locale)
}

func (r goCMSContentReadBoundary) BlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	a := r.adapter
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	if content, err := r.fetchContent(ctx, contentID, locale, false); err == nil && content != nil {
		if content.EmbeddedBlocks != nil {
			loc := locale
			if strings.TrimSpace(loc) == "" {
				loc = content.Locale
			}
			return embeddedBlocksToCMSBlocks(contentID, loc, content.EmbeddedBlocks), nil
		}
	}
	if a.adminBlocks == nil && a.blocks == nil {
		return nil, ErrNotFound
	}
	return r.legacyBlocksForContent(ctx, contentID, locale)
}

func (a *GoCMSContentAdapter) LegacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	return a.contentReader().LegacyBlocksForContent(ctx, contentID, locale)
}

func (r goCMSContentReadBoundary) LegacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	return r.legacyBlocksForContent(ctx, contentID, locale)
}

func (a *GoCMSContentAdapter) legacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	return a.contentReader().legacyBlocksForContent(ctx, contentID, locale)
}

func (r goCMSContentReadBoundary) legacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	a := r.adapter
	if a == nil {
		return nil, ErrNotFound
	}
	if cmsadapter.UUIDFromString(contentID) == uuid.Nil {
		return nil, nil
	}
	if a.adminBlocks != nil {
		records, err := a.adminBlocks.ListContentBlocks(ctx, contentID, cms.AdminBlockListOptions{
			Locale:         locale,
			EnvironmentKey: cmsContentChannelFromContext(ctx, ""),
		})
		if err != nil {
			return nil, err
		}
		blocks := make([]CMSBlock, 0, len(records))
		for _, record := range records {
			blocks = append(blocks, cmsadapter.AdminBlockRecordToCMSBlock(record))
		}
		return blocks, nil
	}
	if a.blocks == nil {
		return nil, ErrNotFound
	}
	pageID := resolveContentPageID(contentID)
	if pageID == uuid.Nil {
		return nil, nil
	}
	instances, err := a.blocks.ListPageInstances(ctx, pageID)
	if err != nil {
		return nil, err
	}
	blocks := make([]CMSBlock, 0, len(instances))
	for _, instance := range instances {
		if instance == nil {
			continue
		}
		blocks = append(blocks, a.convertBlockInstance(ctx, reflect.ValueOf(instance), locale))
	}
	return blocks, nil
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

func (a *GoCMSContentAdapter) convertContent(ctx context.Context, value reflect.Value, locale string) CMSContent {
	return a.contentReader().convertContent(ctx, value, locale)
}

func (a *GoCMSContentAdapter) convertAdminContentRecord(ctx context.Context, record cms.AdminContentRecord) CMSContent {
	return a.contentReader().convertAdminContentRecord(ctx, record)
}

func (r goCMSContentReadBoundary) convertAdminContentRecord(ctx context.Context, record cms.AdminContentRecord) CMSContent {
	a := r.adapter
	out := cmsadapter.AdminContentRecordToCMSContent(record)
	if a != nil && a.contentWriter().shouldApplyStructuralMetadata(ctx, out, nil) {
		if len(out.Metadata) == 0 {
			if derived := cmsadapter.StructuralMetadataFromData(out.Data); len(derived) > 0 {
				out.Metadata = derived
			}
		} else {
			out.Metadata = cmsadapter.NormalizeStructuralMetadata(out.Metadata)
		}
		out.Data = cmsadapter.InjectStructuralMetadata(out.Metadata, out.Data)
	}
	return out
}

func (r goCMSContentReadBoundary) convertContentVariants(ctx context.Context, value reflect.Value, requestedLocale string) []CMSContent {
	val := gocmsutil.Deref(value)
	variants := buildGoCMSTranslationVariants(val)
	if len(variants) == 0 {
		converted := r.convertContent(ctx, value, normalizeCMSRequestedListLocale(requestedLocale))
		applySchemaVersionToContent(&converted)
		applyEmbeddedBlocksToContent(&converted)
		return []CMSContent{converted}
	}
	out := make([]CMSContent, 0, len(variants))
	for _, variant := range variants {
		converted := r.convertContentVariant(ctx, val, requestedLocale, variant)
		applySchemaVersionToContent(&converted)
		applyEmbeddedBlocksToContent(&converted)
		out = append(out, converted)
	}
	return out
}

func (r goCMSContentReadBoundary) convertContent(ctx context.Context, value reflect.Value, locale string) CMSContent {
	a := r.adapter
	val := gocmsutil.Deref(value)
	out := CMSContent{Data: map[string]any{}}
	if id, ok := gocmsutil.ExtractUUID(val, "ID"); ok {
		out.ID = id.String()
	}
	out.Slug = cmsadapter.StringField(val, "Slug")
	out.Status = cmsadapter.StringField(val, "Status")

	if typ := val.FieldByName("Type"); typ.IsValid() {
		typeVal := gocmsutil.Deref(typ)
		if slug := cmsadapter.StringField(typeVal, "Slug"); slug != "" {
			out.ContentTypeSlug = slug
			out.ContentType = slug
		}
		if out.ContentType == "" {
			if name := cmsadapter.StringField(typeVal, "Name"); name != "" {
				out.ContentType = name
			}
		}
	}
	if out.ContentType == "" {
		if typID, ok := gocmsutil.ExtractUUID(val, "ContentTypeID"); ok && typID != uuid.Nil {
			if ct := r.contentTypeByID(ctx, typID); ct != nil {
				if ct.Slug != "" {
					out.ContentTypeSlug = ct.Slug
					out.ContentType = ct.Slug
				} else if ct.Name != "" {
					out.ContentType = ct.Name
				}
			}
		}
	}

	projection := buildGoCMSTranslationProjection(val, locale)
	applyGoCMSTranslationProjection(&out, projection)
	if out.Locale == "" {
		out.Locale = locale
	}
	applyGoCMSTranslationLocaleState(&out, val, projection.chosen, strings.TrimSpace(locale))
	if schema := strings.TrimSpace(toString(out.Data["_schema"])); schema != "" {
		out.SchemaVersion = schema
	}
	if meta := gocmsutil.MapFieldAny(val, "Metadata"); meta != nil {
		out.Metadata = primitives.CloneAnyMap(meta)
	}
	if meta := translationMetadataMap(projection.chosen); len(meta) > 0 {
		if out.Metadata == nil {
			out.Metadata = map[string]any{}
		}
		maps.Copy(out.Metadata, meta)
	}
	out.FamilyID = cmsadapter.ResolvedFamilyID(out.FamilyID, out.Data, out.Metadata)
	out.Navigation = normalizeNavigationVisibilityMap(out.Data["_navigation"])
	out.EffectiveMenuLocations = normalizeEffectiveMenuLocations(out.Data["effective_menu_locations"])
	if len(out.Navigation) > 0 {
		out.Data["_navigation"] = navigationVisibilityMapAny(out.Navigation)
	}
	if len(out.EffectiveMenuLocations) > 0 {
		out.Data["effective_menu_locations"] = append([]string{}, out.EffectiveMenuLocations...)
	}
	if a != nil && a.contentWriter().shouldApplyStructuralMetadata(ctx, out, nil) {
		if len(out.Metadata) == 0 {
			if derived := cmsadapter.StructuralMetadataFromData(out.Data); len(derived) > 0 {
				out.Metadata = derived
			}
		} else {
			out.Metadata = cmsadapter.NormalizeStructuralMetadata(out.Metadata)
		}
		out.Data = cmsadapter.InjectStructuralMetadata(out.Metadata, out.Data)
	}
	return out
}

func (r goCMSContentReadBoundary) convertContentVariant(ctx context.Context, val reflect.Value, requestedLocale string, variant goCMSTranslationVariant) CMSContent {
	a := r.adapter
	out := CMSContent{Data: map[string]any{}}
	if id, ok := gocmsutil.ExtractUUID(val, "ID"); ok {
		out.ID = id.String()
	}
	out.Slug = cmsadapter.StringField(val, "Slug")
	out.Status = cmsadapter.StringField(val, "Status")

	if typ := val.FieldByName("Type"); typ.IsValid() {
		typeVal := gocmsutil.Deref(typ)
		if slug := cmsadapter.StringField(typeVal, "Slug"); slug != "" {
			out.ContentTypeSlug = slug
			out.ContentType = slug
		}
		if out.ContentType == "" {
			if name := cmsadapter.StringField(typeVal, "Name"); name != "" {
				out.ContentType = name
			}
		}
	}
	if out.ContentType == "" {
		if typID, ok := gocmsutil.ExtractUUID(val, "ContentTypeID"); ok && typID != uuid.Nil {
			if ct := r.contentTypeByID(ctx, typID); ct != nil {
				if ct.Slug != "" {
					out.ContentTypeSlug = ct.Slug
					out.ContentType = ct.Slug
				} else if ct.Name != "" {
					out.ContentType = ct.Name
				}
			}
		}
	}

	applyGoCMSTranslationVariant(&out, variant)
	if out.Locale == "" {
		out.Locale = strings.TrimSpace(variant.locale)
	}
	if out.Locale == "" {
		out.Locale = normalizeCMSRequestedListLocale(requestedLocale)
	}
	out.RequestedLocale = strings.TrimSpace(requestedLocale)
	if out.RequestedLocale == "" {
		out.RequestedLocale = strings.TrimSpace(cmsadapter.StringFieldAny(val, "RequestedLocale"))
	}
	out.ResolvedLocale = strings.TrimSpace(variant.locale)
	if out.ResolvedLocale == "" {
		out.ResolvedLocale = strings.TrimSpace(out.Locale)
	}
	if ok, set := cmsadapter.BoolFieldAny(val, "MissingRequestedLocale"); set && !isTranslationLocaleWildcard(out.RequestedLocale) {
		out.MissingRequestedLocale = ok
	} else {
		out.MissingRequestedLocale = false
	}
	if schema := strings.TrimSpace(toString(out.Data["_schema"])); schema != "" {
		out.SchemaVersion = schema
	}
	if meta := gocmsutil.MapFieldAny(val, "Metadata"); meta != nil {
		out.Metadata = primitives.CloneAnyMap(meta)
	}
	if meta := translationMetadataMap(variant.translation); len(meta) > 0 {
		if out.Metadata == nil {
			out.Metadata = map[string]any{}
		}
		maps.Copy(out.Metadata, meta)
	}
	out.FamilyID = cmsadapter.ResolvedFamilyID(out.FamilyID, out.Data, out.Metadata)
	out.Navigation = normalizeNavigationVisibilityMap(out.Data["_navigation"])
	out.EffectiveMenuLocations = normalizeEffectiveMenuLocations(out.Data["effective_menu_locations"])
	if len(out.Navigation) > 0 {
		out.Data["_navigation"] = navigationVisibilityMapAny(out.Navigation)
	}
	if len(out.EffectiveMenuLocations) > 0 {
		out.Data["effective_menu_locations"] = append([]string{}, out.EffectiveMenuLocations...)
	}
	if a != nil && a.contentWriter().shouldApplyStructuralMetadata(ctx, out, nil) {
		if len(out.Metadata) == 0 {
			if derived := cmsadapter.StructuralMetadataFromData(out.Data); len(derived) > 0 {
				out.Metadata = derived
			}
		} else {
			out.Metadata = cmsadapter.NormalizeStructuralMetadata(out.Metadata)
		}
		out.Data = cmsadapter.InjectStructuralMetadata(out.Metadata, out.Data)
	}
	return out
}

func (a *GoCMSContentAdapter) convertBlockInstance(ctx context.Context, value reflect.Value, locale string) CMSBlock {
	return a.contentReader().convertBlockInstance(ctx, value, locale)
}

func (r goCMSContentReadBoundary) convertBlockInstance(ctx context.Context, value reflect.Value, locale string) CMSBlock {
	a := r.adapter
	val := gocmsutil.Deref(value)
	block := CMSBlock{Data: map[string]any{}}
	if id, ok := gocmsutil.ExtractUUID(val, "ID"); ok {
		block.ID = id.String()
	}
	if defID, ok := gocmsutil.ExtractUUID(val, "DefinitionID"); ok {
		if name := r.blockDefinitionName(defID); name != "" {
			block.DefinitionID = name
			block.BlockType = name
			block.BlockSchemaKey = name
		} else {
			block.DefinitionID = defID.String()
		}
	}
	if pageID, ok := gocmsutil.ExtractUUID(val, "PageID"); ok {
		block.ContentID = pageID.String()
	}
	block.Region = cmsadapter.StringField(val, "Region")
	if pos, ok := gocmsutil.GetIntField(val, "Position"); ok {
		block.Position = pos
	}
	if pub := val.FieldByName("PublishedVersion"); pub.IsValid() && pub.Kind() == reflect.Pointer && !pub.IsNil() {
		block.Status = "published"
	} else if block.Status == "" {
		block.Status = "draft"
	}

	translations := gocmsutil.Deref(val.FieldByName("Translations"))
	var chosen reflect.Value
	localeID, hasLocaleID := gocmsutil.ResolveLocaleID(ctx, a.locales, locale)
	for i := 0; translations.IsValid() && i < translations.Len(); i++ {
		current := gocmsutil.Deref(translations.Index(i))
		if !chosen.IsValid() {
			chosen = current
		}
		if !hasLocaleID {
			continue
		}
		if trID, ok := gocmsutil.ExtractUUID(current, "LocaleID"); ok && trID == localeID {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if contentField := chosen.FieldByName("Content"); contentField.IsValid() && contentField.Kind() == reflect.Map {
			if m, ok := contentField.Interface().(map[string]any); ok {
				block.Data = primitives.CloneAnyMap(m)
			}
		}
	}
	if block.Locale == "" {
		block.Locale = locale
	}
	return block
}

func (r goCMSContentReadBoundary) contentTypeByID(ctx context.Context, id uuid.UUID) *CMSContentType {
	a := r.adapter
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

func pageFromContent(content CMSContent) CMSPage {
	data := primitives.CloneAnyMap(content.Data)
	meta := cmsadapter.NormalizeStructuralMetadata(content.Metadata)
	if meta != nil {
		data = cmsadapter.InjectStructuralMetadata(meta, data)
	}
	path := strings.TrimSpace(cmsadapter.AsString(data["path"], cmsadapter.AsString(meta["path"], "")))
	routeKey := strings.TrimSpace(cmsadapter.AsString(data["route_key"], cmsadapter.AsString(meta["route_key"], "")))
	parentID := strings.TrimSpace(cmsadapter.AsString(data["parent_id"], cmsadapter.AsString(meta["parent_id"], "")))
	templateID := strings.TrimSpace(cmsadapter.AsString(data["template_id"], cmsadapter.AsString(meta["template_id"], cmsadapter.AsString(data["template"], ""))))

	seo := map[string]any{}
	if mt := strings.TrimSpace(cmsadapter.AsString(data["meta_title"], "")); mt != "" {
		seo["title"] = mt
	}
	if md := strings.TrimSpace(cmsadapter.AsString(data["meta_description"], "")); md != "" {
		seo["description"] = md
	}

	out := CMSPage{
		ID:              content.ID,
		Title:           content.Title,
		Slug:            content.Slug,
		RouteKey:        routeKey,
		TemplateID:      templateID,
		Locale:          content.Locale,
		RequestedLocale: content.RequestedLocale,
		ResolvedLocale:  content.ResolvedLocale,
		AvailableLocales: append([]string{},
			content.AvailableLocales...,
		),
		MissingRequestedLocale: content.MissingRequestedLocale,
		FamilyID: cmsadapter.ResolvedFamilyID(
			content.FamilyID,
			data,
			content.Metadata,
		),
		ParentID:       parentID,
		Blocks:         append([]string{}, content.Blocks...),
		EmbeddedBlocks: nil,
		SchemaVersion:  strings.TrimSpace(content.SchemaVersion),
		SEO:            seo,
		Status:         content.Status,
		Data:           data,
		Metadata:       primitives.CloneAnyMap(content.Metadata),
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
