package setup

import (
	"context"
	"reflect"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	hashid "github.com/goliatone/hashid/pkg/hashid"
	"github.com/google/uuid"
)

// goCMSContentBridge adapts the go-cms content service (which uses internal types)
// to the admin.CMSContentService contract using reflection.
type goCMSContentBridge struct {
	content   any
	page      any
	blocks    any
	types     map[string]uuid.UUID
	typeNames map[string]string

	contentTypes admin.CMSContentTypeService

	defaultTemplate uuid.UUID
	blockDefs       map[string]uuid.UUID
	blockDefNames   map[uuid.UUID]string
}

func newGoCMSContentBridge(contentSvc any, pageSvc any, blockSvc any, defaultTemplate uuid.UUID, typeIDs map[string]uuid.UUID, contentTypes admin.CMSContentTypeService) admin.CMSContentService {
	if contentSvc == nil {
		return nil
	}
	typeNames := map[string]string{}
	for name, id := range typeIDs {
		if id == uuid.Nil {
			continue
		}
		typeNames[id.String()] = name
	}
	return &goCMSContentBridge{
		content:         contentSvc,
		page:            pageSvc,
		blocks:          blockSvc,
		types:           typeIDs,
		typeNames:       typeNames,
		contentTypes:    contentTypes,
		defaultTemplate: defaultTemplate,
		blockDefs:       map[string]uuid.UUID{},
		blockDefNames:   map[uuid.UUID]string{},
	}
}

func (b *goCMSContentBridge) hasPageService() bool {
	if b == nil || b.page == nil {
		return false
	}
	v := reflect.ValueOf(b.page)
	for _, name := range []string{"List", "Get", "Create", "Update", "Delete"} {
		if !v.MethodByName(name).IsValid() {
			return false
		}
	}
	return true
}

func (b *goCMSContentBridge) Pages(ctx context.Context, locale string) ([]admin.CMSPage, error) {
	if b.hasPageService() {
		method := reflect.ValueOf(b.page).MethodByName("List")
		env := environmentKeyFromContext(ctx)
		results := callWithOptionalEnv(method, ctx, env)
		if err := reflectError(results); err != nil {
			return nil, err
		}
		if len(results) == 0 || !results[0].IsValid() {
			return nil, nil
		}
		slice := deref(results[0])
		out := make([]admin.CMSPage, 0, slice.Len())
		for i := 0; i < slice.Len(); i++ {
			out = append(out, b.convertPage(slice.Index(i), locale))
		}
		return out, nil
	}

	// Fallback: when go-cms doesn't expose a page service matching the expected
	// contract, surface "page" content types as CMS pages so the example can
	// still list/seed pages.
	contents, err := b.Contents(ctx, locale)
	if err != nil {
		return nil, err
	}
	out := make([]admin.CMSPage, 0, len(contents))
	for _, item := range contents {
		if !strings.EqualFold(item.ContentType, "page") {
			continue
		}
		out = append(out, b.pageFromContent(item))
	}
	return out, nil
}

func (b *goCMSContentBridge) Page(ctx context.Context, id, locale string) (*admin.CMSPage, error) {
	if b.hasPageService() {
		method := reflect.ValueOf(b.page).MethodByName("Get")
		u, err := uuid.Parse(strings.TrimSpace(id))
		if err != nil {
			return nil, err
		}
		results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(u)})
		if err := reflectError(results); err != nil {
			return nil, err
		}
		if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
			return nil, admin.ErrNotFound
		}
		rec := b.convertPage(results[0], locale)
		return &rec, nil
	}

	content, err := b.Content(ctx, id, locale)
	if err != nil {
		return nil, err
	}
	if content == nil || !strings.EqualFold(content.ContentType, "page") {
		return nil, admin.ErrNotFound
	}
	rec := b.pageFromContent(*content)
	return &rec, nil
}

func (b *goCMSContentBridge) CreatePage(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	if !b.hasPageService() {
		return b.createPageFromContent(ctx, page)
	}
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}

	contentData := cloneAnyMap(page.Data)
	if contentData == nil {
		contentData = map[string]any{}
	}
	if mt := asString(page.SEO["title"], asString(contentData["meta_title"], "")); mt != "" {
		contentData["meta_title"] = mt
	}
	if md := asString(page.SEO["description"], asString(contentData["meta_description"], "")); md != "" {
		contentData["meta_description"] = md
	}
	path := asString(contentData["path"], page.PreviewURL)
	if path == "" {
		path = "/" + strings.TrimPrefix(page.Slug, "/")
	}
	contentData["path"] = path

	contentRes, err := b.CreateContent(ctx, admin.CMSContent{
		Title:       page.Title,
		Slug:        page.Slug,
		Status:      page.Status,
		Locale:      locale,
		ContentType: "page",
		Data:        contentData,
	})
	if err != nil {
		return nil, err
	}

	method := reflect.ValueOf(b.page).MethodByName("Create")
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "ContentID", uuidOrNil(contentRes.ID))
	templateID := uuidOrNil(page.TemplateID)
	if templateID == uuid.Nil {
		templateID = b.defaultTemplate
	}
	setUUIDField(req, "TemplateID", templateID)
	if pid := uuidOrNil(page.ParentID); pid != uuid.Nil {
		setUUIDPtr(req, "ParentID", pid)
	}
	setStringField(req, "Slug", page.Slug)
	setStringField(req, "Status", page.Status)
	if env := environmentKeyFromContext(ctx); env != "" {
		setStringField(req, "EnvironmentKey", env)
	}
	setUUIDField(req, "CreatedBy", uuid.Nil)
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	if tr := b.buildPageTranslation(req.FieldByName("Translations"), page, path, locale); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}

	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	if err := b.ensurePageTranslation(ctx, results[0], page, path, locale); err != nil {
		return nil, err
	}
	rec := b.convertPage(results[0], locale)
	if rec.Data == nil {
		rec.Data = cloneAnyMap(contentRes.Data)
	}
	return &rec, nil
}

func (b *goCMSContentBridge) UpdatePage(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	if !b.hasPageService() {
		return b.updatePageFromContent(ctx, page)
	}
	pageID := uuidOrNil(page.ID)
	if pageID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.page).MethodByName("Update")
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "ID", pageID)
	templateID := uuidOrNil(page.TemplateID)
	if templateID == uuid.Nil {
		templateID = b.defaultTemplate
	}
	setUUIDPtr(req, "TemplateID", templateID)
	setStringField(req, "Status", page.Status)
	if env := environmentKeyFromContext(ctx); env != "" {
		setStringField(req, "EnvironmentKey", env)
	}
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	path := asString(page.Data["path"], page.PreviewURL)
	if path == "" {
		path = "/" + strings.TrimPrefix(page.Slug, "/")
	}
	if tr := b.buildPageTranslation(req.FieldByName("Translations"), page, path, page.Locale); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}

	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	if err := b.ensurePageTranslation(ctx, results[0], page, path, page.Locale); err != nil {
		return nil, err
	}
	rec := b.convertPage(results[0], page.Locale)
	return &rec, nil
}

func (b *goCMSContentBridge) DeletePage(ctx context.Context, id string) error {
	if b.hasPageService() {
		method := reflect.ValueOf(b.page).MethodByName("Delete")
		pageID := uuidOrNil(id)
		if pageID == uuid.Nil {
			return admin.ErrNotFound
		}
		reqType := method.Type().In(1)
		req := reflect.New(reqType).Elem()
		setUUIDField(req, "ID", pageID)
		setUUIDField(req, "DeletedBy", uuid.Nil)
		if f := req.FieldByName("HardDelete"); f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
			f.SetBool(true)
		}
		results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
		return reflectError(results)
	}

	return b.deletePageFromContent(ctx, id)
}

func (b *goCMSContentBridge) pageFromContent(content admin.CMSContent) admin.CMSPage {
	data := cloneAnyMap(content.Data)
	path := strings.TrimSpace(asString(data["path"], ""))
	if path == "" && strings.TrimSpace(content.Slug) != "" {
		path = "/" + strings.TrimPrefix(content.Slug, "/")
		data["path"] = path
	}

	templateID := strings.TrimSpace(asString(data["template_id"], asString(data["template"], "")))
	parentID := strings.TrimSpace(asString(data["parent_id"], ""))

	seo := map[string]any{}
	if mt := strings.TrimSpace(asString(data["meta_title"], "")); mt != "" {
		seo["title"] = mt
	}
	if md := strings.TrimSpace(asString(data["meta_description"], "")); md != "" {
		seo["description"] = md
	}

	out := admin.CMSPage{
		ID:         content.ID,
		Title:      content.Title,
		Slug:       content.Slug,
		TemplateID: templateID,
		Locale:     content.Locale,
		ParentID:   parentID,
		Blocks:     append([]string{}, content.Blocks...),
		SEO:        seo,
		Status:     content.Status,
		Data:       data,
		PreviewURL: path,
	}
	if out.PreviewURL == "" && strings.TrimSpace(out.Slug) != "" {
		out.PreviewURL = "/" + strings.TrimPrefix(out.Slug, "/")
	}
	return out
}

func (b *goCMSContentBridge) createPageFromContent(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
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

	created, err := b.CreateContent(ctx, admin.CMSContent{
		Title:       page.Title,
		Slug:        page.Slug,
		Status:      page.Status,
		Locale:      locale,
		ContentType: "page",
		Blocks:      append([]string{}, page.Blocks...),
		Data:        data,
	})
	if err != nil {
		return nil, err
	}
	rec := b.pageFromContent(*created)
	return &rec, nil
}

func (b *goCMSContentBridge) updatePageFromContent(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	locale := strings.TrimSpace(page.Locale)
	if locale == "" {
		locale = "en"
	}
	existing, err := b.Content(ctx, page.ID, locale)
	if err != nil {
		return nil, err
	}
	if existing == nil || !strings.EqualFold(existing.ContentType, "page") {
		return nil, admin.ErrNotFound
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

	updated, err := b.UpdateContent(ctx, admin.CMSContent{
		ID:          existing.ID,
		Title:       title,
		Slug:        slug,
		Status:      status,
		Locale:      locale,
		ContentType: "page",
		Blocks:      blocks,
		Data:        data,
	})
	if err != nil {
		return nil, err
	}
	rec := b.pageFromContent(*updated)
	return &rec, nil
}

func (b *goCMSContentBridge) deletePageFromContent(ctx context.Context, id string) error {
	existing, err := b.Content(ctx, id, "")
	if err != nil {
		return err
	}
	if existing == nil || !strings.EqualFold(existing.ContentType, "page") {
		return admin.ErrNotFound
	}
	return b.DeleteContent(ctx, existing.ID)
}

func (b *goCMSContentBridge) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("List")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	env := environmentKeyFromContext(ctx)
	results := callWithOptionalEnv(method, ctx, env)
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	out := make([]admin.CMSContent, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		out = append(out, b.convertContent(slice.Index(i), locale, ctx))
	}
	return out, nil
}

func (b *goCMSContentBridge) Content(ctx context.Context, id, locale string) (*admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("Get")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	u, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(u)})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	rec := b.convertContent(results[0], locale, ctx)
	return &rec, nil
}

func (b *goCMSContentBridge) CreateContent(ctx context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("Create")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()

	contentTypeKey := strings.TrimSpace(content.ContentType)
	if contentTypeKey == "" {
		contentTypeKey = strings.TrimSpace(content.ContentTypeSlug)
	}
	setUUIDField(req, "ContentTypeID", b.contentTypeID(ctx, contentTypeKey))
	setStringField(req, "Slug", content.Slug)
	setStringField(req, "Status", content.Status)
	if env := environmentKeyFromContext(ctx); env != "" {
		setStringField(req, "EnvironmentKey", env)
	}
	setUUIDField(req, "CreatedBy", uuid.Nil)
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	if tr := b.buildTranslation(req.FieldByName("Translations"), content); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}

	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	rec := b.convertContent(results[0], content.Locale, ctx)
	return &rec, nil
}

func (b *goCMSContentBridge) UpdateContent(ctx context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("Update")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()

	setUUIDField(req, "ID", uuidOrNil(content.ID))
	setStringField(req, "Status", content.Status)
	if env := environmentKeyFromContext(ctx); env != "" {
		setStringField(req, "EnvironmentKey", env)
	}
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	if tr := b.buildTranslation(req.FieldByName("Translations"), content); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}

	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	rec := b.convertContent(results[0], content.Locale, ctx)
	return &rec, nil
}

func (b *goCMSContentBridge) DeleteContent(ctx context.Context, id string) error {
	method := reflect.ValueOf(b.content).MethodByName("Delete")
	if !method.IsValid() {
		return admin.ErrNotFound
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "ID", uuidOrNil(id))
	setUUIDField(req, "DeletedBy", uuid.Nil)
	if f := req.FieldByName("HardDelete"); f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
		f.SetBool(true)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return reflectError(results)
}

func (b *goCMSContentBridge) BlockDefinitions(ctx context.Context) ([]admin.CMSBlockDefinition, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	env := environmentKeyFromContext(ctx)
	results := callWithOptionalEnv(method, ctx, env)
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	out := make([]admin.CMSBlockDefinition, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		def := b.convertBlockDefinition(slice.Index(i))
		if def.Environment == "" && env != "" {
			def.Environment = env
		}
		out = append(out, def)
	}
	return out, nil
}

func (b *goCMSContentBridge) CreateBlockDefinition(ctx context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("RegisterDefinition")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	name := strings.TrimSpace(def.ID)
	if name == "" {
		name = strings.TrimSpace(def.Name)
	}
	if name == "" {
		return nil, admin.ErrNotFound
	}
	setStringField(input, "Name", name)
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		setStringField(input, "Slug", slug)
	}
	if desc := strings.TrimSpace(def.Description); desc != "" {
		setStringPtr(input, "Description", desc)
	}
	if icon := strings.TrimSpace(def.Icon); icon != "" {
		setStringPtr(input, "Icon", icon)
	}
	if category := strings.TrimSpace(def.Category); category != "" {
		setStringPtr(input, "Category", category)
	}
	if status := strings.TrimSpace(def.Status); status != "" {
		setStringField(input, "Status", status)
	}
	if def.UISchema != nil {
		setMapField(input, "UISchema", cloneAnyMap(def.UISchema))
	}
	env := strings.TrimSpace(def.Environment)
	if env == "" {
		env = environmentKeyFromContext(ctx)
	}
	if env != "" {
		setStringField(input, "EnvironmentKey", env)
	}
	if len(def.Schema) > 0 {
		setMapField(input, "Schema", cloneAnyMap(def.Schema))
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	created := b.convertBlockDefinition(results[0])
	return &created, nil
}

func (b *goCMSContentBridge) UpdateBlockDefinition(ctx context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("UpdateDefinition")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	defID := b.resolveBlockDefinitionID(ctx, def.ID)
	if defID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "ID", defID)
	if name := strings.TrimSpace(def.Name); name != "" {
		setStringPtr(input, "Name", name)
	}
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		setStringPtr(input, "Slug", slug)
	}
	if def.DescriptionSet {
		setStringPtr(input, "Description", def.Description)
	}
	if def.IconSet {
		setStringPtr(input, "Icon", def.Icon)
	}
	if def.CategorySet {
		setStringPtr(input, "Category", def.Category)
	} else if category := strings.TrimSpace(def.Category); category != "" {
		setStringPtr(input, "Category", category)
	}
	if status := strings.TrimSpace(def.Status); status != "" {
		setStringPtr(input, "Status", status)
	}
	if def.UISchema != nil {
		setMapField(input, "UISchema", cloneAnyMap(def.UISchema))
	}
	env := strings.TrimSpace(def.Environment)
	if env == "" {
		env = environmentKeyFromContext(ctx)
	}
	if env != "" {
		setStringPtr(input, "EnvironmentKey", env)
	}
	if len(def.Schema) > 0 {
		setMapField(input, "Schema", cloneAnyMap(def.Schema))
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	updated := b.convertBlockDefinition(results[0])
	return &updated, nil
}

func (b *goCMSContentBridge) DeleteBlockDefinition(ctx context.Context, id string) error {
	if b == nil || b.blocks == nil {
		return admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("DeleteDefinition")
	if !method.IsValid() {
		return admin.ErrNotFound
	}
	defID := b.resolveBlockDefinitionID(ctx, id)
	if defID == uuid.Nil {
		return admin.ErrNotFound
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ID", defID)
	if f := req.FieldByName("HardDelete"); f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
		f.SetBool(true)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return reflectError(results)
}

func (b *goCMSContentBridge) BlockDefinitionVersions(ctx context.Context, id string) ([]admin.CMSBlockDefinitionVersion, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("ListDefinitionVersions")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	defID := b.resolveBlockDefinitionID(ctx, id)
	if defID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(defID)})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	if slice.Kind() != reflect.Slice {
		return nil, nil
	}
	out := make([]admin.CMSBlockDefinitionVersion, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		out = append(out, b.convertBlockDefinitionVersion(slice.Index(i)))
	}
	return out, nil
}

func (b *goCMSContentBridge) BlocksForContent(ctx context.Context, contentID, locale string) ([]admin.CMSBlock, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	pageID := b.resolvePageID(ctx, contentID)
	if pageID == uuid.Nil {
		return nil, nil
	}
	method := reflect.ValueOf(b.blocks).MethodByName("ListPageInstances")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(pageID)})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	out := make([]admin.CMSBlock, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		out = append(out, b.convertBlockInstance(slice.Index(i), locale))
	}
	return out, nil
}

func (b *goCMSContentBridge) SaveBlock(ctx context.Context, block admin.CMSBlock) (*admin.CMSBlock, error) {
	if b == nil || b.blocks == nil {
		return nil, admin.ErrNotFound
	}
	defID := b.resolveBlockDefinitionID(ctx, block.DefinitionID)
	if defID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	pageID := b.resolvePageID(ctx, block.ContentID)
	if pageID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	if strings.TrimSpace(block.ID) == "" {
		return b.createBlockInstance(ctx, defID, pageID, block)
	}
	return b.updateBlockInstance(ctx, defID, pageID, block)
}

func (b *goCMSContentBridge) DeleteBlock(ctx context.Context, id string) error {
	if b == nil || b.blocks == nil {
		return admin.ErrNotFound
	}
	method := reflect.ValueOf(b.blocks).MethodByName("DeleteInstance")
	if !method.IsValid() {
		return admin.ErrNotFound
	}
	uid := uuidOrNil(id)
	if uid == uuid.Nil {
		return admin.ErrNotFound
	}
	req := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(req, "ID", uid)
	if f := req.FieldByName("HardDelete"); f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
		f.SetBool(true)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return reflectError(results)
}

func (b *goCMSContentBridge) buildTranslation(field reflect.Value, content admin.CMSContent) reflect.Value {
	field = deref(field)
	if !field.IsValid() || field.Kind() != reflect.Slice {
		return reflect.Value{}
	}
	elemType := field.Type().Elem()
	tr := reflect.New(elemType).Elem()
	setStringField(tr, "Locale", content.Locale)
	setStringField(tr, "Title", content.Title)
	if groupID := uuidOrNil(content.TranslationGroupID); groupID != uuid.Nil {
		setUUIDPtr(tr, "TranslationGroupID", groupID)
	}
	if summary := strings.TrimSpace(asString(content.Data["excerpt"], "")); summary != "" {
		setStringPtr(tr, "Summary", summary)
	}
	if data := cloneAnyMap(content.Data); data != nil {
		setMapField(tr, "Content", data)
	}
	if blocks := embeddedBlocksFromContent(content); len(blocks) > 0 {
		setSliceField(tr, "Blocks", blocks)
	}
	slice := reflect.MakeSlice(field.Type(), 0, 1)
	return reflect.Append(slice, tr)
}

func (b *goCMSContentBridge) buildPageTranslation(field reflect.Value, page admin.CMSPage, path, locale string) reflect.Value {
	field = deref(field)
	if !field.IsValid() || field.Kind() != reflect.Slice {
		return reflect.Value{}
	}
	elemType := field.Type().Elem()
	tr := reflect.New(elemType).Elem()
	setStringField(tr, "Locale", locale)
	setStringField(tr, "Title", page.Title)
	setStringField(tr, "Path", path)
	if groupID := uuidOrNil(page.TranslationGroupID); groupID != uuid.Nil {
		setUUIDPtr(tr, "TranslationGroupID", groupID)
	}
	if summary := asString(page.Data["summary"], ""); summary != "" {
		setStringPtr(tr, "Summary", summary)
	}
	if mt := asString(page.SEO["title"], asString(page.Data["meta_title"], "")); mt != "" {
		setStringPtr(tr, "SEOTitle", mt)
	}
	if md := asString(page.SEO["description"], asString(page.Data["meta_description"], "")); md != "" {
		setStringPtr(tr, "SEODescription", md)
	}
	slice := reflect.MakeSlice(field.Type(), 0, 1)
	return reflect.Append(slice, tr)
}

func (b *goCMSContentBridge) ensurePageTranslation(ctx context.Context, pageVal reflect.Value, page admin.CMSPage, path, locale string) error {
	pageVal = deref(pageVal)
	pageID, ok := extractUUID(pageVal, "ID")
	if !ok || pageID == uuid.Nil {
		return nil
	}
	method := reflect.ValueOf(b.page).MethodByName("UpdateTranslation")
	if !method.IsValid() {
		return b.ensurePageTranslationViaUpdate(ctx, pageVal, page, path, locale, pageID)
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "PageID", pageID)
	setStringField(req, "Locale", locale)
	setStringField(req, "Title", page.Title)
	setStringField(req, "Path", path)
	if groupID := uuidOrNil(page.TranslationGroupID); groupID != uuid.Nil {
		setUUIDPtr(req, "TranslationGroupID", groupID)
	}
	if summary := asString(page.Data["summary"], ""); summary != "" {
		setStringPtr(req, "Summary", summary)
	}
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	if err := reflectError(method.Call([]reflect.Value{reflect.ValueOf(ctx), req})); err == nil {
		return nil
	}
	return b.ensurePageTranslationViaUpdate(ctx, pageVal, page, path, locale, pageID)
}

func (b *goCMSContentBridge) ensurePageTranslationViaUpdate(ctx context.Context, pageVal reflect.Value, page admin.CMSPage, path, locale string, pageID uuid.UUID) error {
	updateMethod := reflect.ValueOf(b.page).MethodByName("Update")
	if !updateMethod.IsValid() {
		return nil
	}
	reqType := updateMethod.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "ID", pageID)
	if tpl, ok := extractUUID(pageVal, "TemplateID"); ok && tpl != uuid.Nil {
		setUUIDPtr(req, "TemplateID", tpl)
	}
	status := page.Status
	if status == "" {
		status = stringField(pageVal, "Status")
	}
	setStringField(req, "Status", status)
	if env := environmentKeyFromContext(ctx); env != "" {
		setStringField(req, "EnvironmentKey", env)
	}
	setUUIDField(req, "UpdatedBy", uuid.Nil)
	if allow := req.FieldByName("AllowMissingTranslations"); allow.IsValid() && allow.CanSet() && allow.Kind() == reflect.Bool {
		allow.SetBool(true)
	}
	if tr := b.buildPageTranslation(req.FieldByName("Translations"), page, path, locale); tr.IsValid() {
		req.FieldByName("Translations").Set(tr)
	}
	results := updateMethod.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return reflectError(results)
}

func (b *goCMSContentBridge) convertContent(value reflect.Value, locale string, ctx context.Context) admin.CMSContent {
	val := deref(value)
	out := admin.CMSContent{
		Data: map[string]any{},
	}
	if id, ok := extractUUID(val, "ID"); ok {
		out.ID = id.String()
	}
	out.Slug = stringField(val, "Slug")
	out.Status = stringField(val, "Status")

	if typID, ok := extractUUID(val, "ContentTypeID"); ok {
		if name := b.typeName(ctx, typID); name != "" {
			out.ContentType = name
			out.ContentTypeSlug = name
		}
	}
	if out.ContentType == "" {
		if typ := val.FieldByName("Type"); typ.IsValid() {
			if name := stringField(typ, "Name"); name != "" {
				out.ContentType = name
				if out.ContentTypeSlug == "" {
					out.ContentTypeSlug = name
				}
			}
		}
	}

	translations := deref(val.FieldByName("Translations"))
	var chosen reflect.Value
	for i := 0; i < translations.Len(); i++ {
		current := deref(translations.Index(i))
		code := strings.ToLower(stringField(current, "Locale"))
		if chosen.IsValid() == false {
			chosen = current
		}
		if locale == "" {
			continue
		}
		if strings.EqualFold(code, locale) {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if groupID := uuidStringField(chosen, "TranslationGroupID"); groupID != "" {
			out.TranslationGroupID = groupID
		}
		out.Locale = stringField(chosen, "Locale")
		out.Title = stringField(chosen, "Title")
		if summary := stringField(chosen, "Summary"); summary != "" {
			out.Data["excerpt"] = summary
		} else if summaryPtr := chosen.FieldByName("Summary"); summaryPtr.IsValid() && summaryPtr.Kind() == reflect.Ptr && !summaryPtr.IsNil() && summaryPtr.Elem().Kind() == reflect.String {
			out.Data["excerpt"] = summaryPtr.Elem().String()
		}
		if contentField := chosen.FieldByName("Content"); contentField.IsValid() && contentField.Kind() == reflect.Map {
			if m, ok := contentField.Interface().(map[string]any); ok {
				out.Data = cloneAnyMap(m)
			}
		}
	}
	if out.Locale == "" {
		out.Locale = locale
	}
	return out
}

func (b *goCMSContentBridge) convertPage(value reflect.Value, locale string) admin.CMSPage {
	val := deref(value)
	out := admin.CMSPage{
		Data: map[string]any{},
		SEO:  map[string]any{},
	}
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
	var chosen reflect.Value
	for i := 0; i < translations.Len(); i++ {
		current := deref(translations.Index(i))
		code := strings.ToLower(stringField(current, "Locale"))
		if !chosen.IsValid() {
			chosen = current
		}
		if locale == "" {
			continue
		}
		if strings.EqualFold(code, locale) {
			chosen = current
			break
		}
	}
	if chosen.IsValid() {
		if groupID := uuidStringField(chosen, "TranslationGroupID"); groupID != "" {
			out.TranslationGroupID = groupID
		}
		out.Locale = stringField(chosen, "Locale")
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
	}
	if out.Locale == "" {
		out.Locale = locale
	}
	return out
}

func (b *goCMSContentBridge) contentTypeID(ctx context.Context, name string) uuid.UUID {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		return uuid.Nil
	}
	if id, ok := b.types[normalized]; ok {
		return id
	}
	if parsed := uuidOrNil(normalized); parsed != uuid.Nil {
		if b.typeNames != nil {
			b.typeNames[parsed.String()] = normalized
		}
		return parsed
	}
	if b.contentTypes != nil {
		if ct, err := b.contentTypes.ContentTypeBySlug(ctx, normalized); err == nil && ct != nil {
			if parsed := uuidOrNil(ct.ID); parsed != uuid.Nil {
				b.cacheContentType(normalized, parsed, ct.Slug, ct.Name)
				return parsed
			}
		}
	}
	return uuid.Nil
}

func (b *goCMSContentBridge) typeName(ctx context.Context, id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	if b.typeNames != nil {
		if name, ok := b.typeNames[id.String()]; ok && name != "" {
			return name
		}
	}
	for name, cid := range b.types {
		if cid == id {
			if b.typeNames != nil {
				b.typeNames[id.String()] = name
			}
			return name
		}
	}
	if b.contentTypes != nil {
		if ct, err := b.contentTypes.ContentType(ctx, id.String()); err == nil && ct != nil {
			name := strings.TrimSpace(firstNonEmpty(ct.Slug, ct.Name))
			if name != "" {
				b.cacheContentType(name, id, ct.Slug, ct.Name)
				return name
			}
		}
	}
	return ""
}

func (b *goCMSContentBridge) cacheContentType(key string, id uuid.UUID, slug, name string) {
	if b == nil || id == uuid.Nil {
		return
	}
	if b.types == nil {
		b.types = map[string]uuid.UUID{}
	}
	if b.typeNames == nil {
		b.typeNames = map[string]string{}
	}
	normalized := strings.ToLower(strings.TrimSpace(key))
	if normalized != "" {
		b.types[normalized] = id
		b.typeNames[id.String()] = normalized
		return
	}
	if slug = strings.TrimSpace(slug); slug != "" {
		b.types[strings.ToLower(slug)] = id
		b.typeNames[id.String()] = slug
		return
	}
	if name = strings.TrimSpace(name); name != "" {
		b.types[strings.ToLower(name)] = id
		b.typeNames[id.String()] = name
	}
}

func environmentKeyFromContext(ctx context.Context) string {
	return strings.TrimSpace(admin.EnvironmentFromContext(ctx))
}

func callWithOptionalEnv(method reflect.Value, ctx context.Context, env string) []reflect.Value {
	if !method.IsValid() {
		return nil
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	if env != "" && method.Type().NumIn() > 1 && method.Type().In(1).Kind() == reflect.String {
		args = append(args, reflect.ValueOf(env))
	}
	return method.Call(args)
}

func reflectError(results []reflect.Value) error {
	if len(results) == 0 {
		return nil
	}
	last := results[len(results)-1]
	if last.IsValid() && last.Type().Implements(reflect.TypeOf((*error)(nil)).Elem()) && !last.IsNil() {
		if err, ok := last.Interface().(error); ok {
			return err
		}
	}
	return nil
}

func deref(val reflect.Value) reflect.Value {
	for val.IsValid() && val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	return val
}

func setStringField(val reflect.Value, name, value string) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.String {
		field.SetString(value)
	}
}

func setStringPtr(val reflect.Value, name, value string) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.Ptr {
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().SetString(value)
		field.Set(ptr)
	}
}

func setMapField(val reflect.Value, name string, m map[string]any) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.Map {
		field.Set(reflect.ValueOf(m))
	}
}

func setSliceField(val reflect.Value, name string, slice any) {
	field := val.FieldByName(name)
	if !field.IsValid() || !field.CanSet() {
		return
	}
	value := reflect.ValueOf(slice)
	if !value.IsValid() {
		return
	}
	if value.Type().AssignableTo(field.Type()) {
		field.Set(value)
	} else if value.Type().ConvertibleTo(field.Type()) {
		field.Set(value.Convert(field.Type()))
	}
}

func setUUIDField(val reflect.Value, name string, id uuid.UUID) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Type() == reflect.TypeOf(uuid.UUID{}) {
		field.Set(reflect.ValueOf(id))
	}
}

func setUUIDPtr(val reflect.Value, name string, id uuid.UUID) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.Ptr && field.Type().Elem() == reflect.TypeOf(uuid.UUID{}) {
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().Set(reflect.ValueOf(id))
		field.Set(ptr)
	}
}

func extractUUID(val reflect.Value, field string) (uuid.UUID, bool) {
	f := val.FieldByName(field)
	if f.IsValid() && f.CanInterface() {
		if id, ok := f.Interface().(uuid.UUID); ok {
			return id, true
		}
	}
	return uuid.Nil, false
}

func stringField(val reflect.Value, field string) string {
	f := val.FieldByName(field)
	if f.IsValid() {
		if f.Kind() == reflect.String {
			return f.String()
		}
		if f.Kind() == reflect.Ptr && !f.IsNil() && f.Elem().Kind() == reflect.String {
			return f.Elem().String()
		}
	}
	return ""
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
	if s, ok := val.(string); ok {
		if strings.TrimSpace(s) == "" {
			return fallback
		}
		return s
	}
	if b, ok := val.([]byte); ok {
		return string(b)
	}
	return fallback
}

func embeddedBlocksFromContent(content admin.CMSContent) []map[string]any {
	if len(content.EmbeddedBlocks) > 0 {
		return cloneBlockList(content.EmbeddedBlocks)
	}
	if content.Data != nil {
		if raw, ok := content.Data["blocks"].([]map[string]any); ok {
			return cloneBlockList(raw)
		}
		if raw, ok := content.Data["blocks"].([]any); ok {
			out := make([]map[string]any, 0, len(raw))
			for _, item := range raw {
				if m, ok := item.(map[string]any); ok {
					out = append(out, cloneAnyMap(m))
				}
			}
			if len(out) > 0 {
				return out
			}
		}
	}
	return nil
}

func cloneBlockList(blocks []map[string]any) []map[string]any {
	if blocks == nil {
		return nil
	}
	out := make([]map[string]any, 0, len(blocks))
	for _, block := range blocks {
		out = append(out, cloneAnyMap(block))
	}
	return out
}

func schemaMigrationStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	return ""
}

func uuidOrNil(id string) uuid.UUID {
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

func (b *goCMSContentBridge) resolvePageID(ctx context.Context, contentID string) uuid.UUID {
	parsed := uuidOrNil(contentID)
	if parsed == uuid.Nil {
		return uuid.Nil
	}
	if b.hasPageService() {
		getMethod := reflect.ValueOf(b.page).MethodByName("Get")
		if getMethod.IsValid() {
			results := getMethod.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(parsed)})
			if reflectError(results) == nil && len(results) > 0 && results[0].IsValid() && !results[0].IsNil() {
				return parsed
			}
		}
		listMethod := reflect.ValueOf(b.page).MethodByName("List")
		if listMethod.IsValid() {
			results := listMethod.Call([]reflect.Value{reflect.ValueOf(ctx)})
			if reflectError(results) == nil && len(results) > 0 && results[0].IsValid() {
				slice := deref(results[0])
				for i := 0; i < slice.Len(); i++ {
					pageVal := deref(slice.Index(i))
					if cid, ok := extractUUID(pageVal, "ContentID"); ok && cid == parsed {
						if pageID, ok := extractUUID(pageVal, "ID"); ok {
							return pageID
						}
					}
				}
			}
		}
	}
	return parsed
}

func (b *goCMSContentBridge) convertBlockDefinition(val reflect.Value) admin.CMSBlockDefinition {
	val = deref(val)
	def := admin.CMSBlockDefinition{}
	name := strings.TrimSpace(stringField(val, "Name"))
	if name != "" {
		def.ID = name
		def.Name = name
	}
	if def.ID == "" {
		if id, ok := extractUUID(val, "ID"); ok {
			def.ID = id.String()
		}
	}
	def.Slug = strings.TrimSpace(stringField(val, "Slug"))
	if desc := strings.TrimSpace(stringField(val, "Description")); desc != "" {
		def.Description = desc
		def.DescriptionSet = true
	}
	if icon := strings.TrimSpace(stringField(val, "Icon")); icon != "" {
		def.Icon = icon
		def.IconSet = true
	}
	if category := strings.TrimSpace(stringField(val, "Category")); category != "" {
		def.Category = category
		def.CategorySet = true
	}
	def.Status = strings.TrimSpace(stringField(val, "Status"))
	def.SchemaVersion = strings.TrimSpace(stringField(val, "SchemaVersion"))
	def.MigrationStatus = strings.TrimSpace(stringField(val, "MigrationStatus"))
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			def.Schema = cloneAnyMap(schema)
			if def.Type == "" {
				def.Type = strings.TrimSpace(asString(schema["x-block-type"], ""))
			}
		}
	}
	if uiSchemaField := val.FieldByName("UISchema"); uiSchemaField.IsValid() {
		if uiSchema, ok := uiSchemaField.Interface().(map[string]any); ok {
			def.UISchema = cloneAnyMap(uiSchema)
		}
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(def.Slug)
	}
	if id, ok := extractUUID(val, "ID"); ok && def.ID != "" {
		if key := strings.TrimSpace(def.ID); key != "" {
			b.blockDefs[strings.ToLower(key)] = id
		}
		if key := strings.TrimSpace(def.Slug); key != "" {
			b.blockDefs[strings.ToLower(key)] = id
		}
		if key := strings.TrimSpace(def.Type); key != "" {
			b.blockDefs[strings.ToLower(key)] = id
		}
		b.blockDefNames[id] = def.ID
	}
	return def
}

func (b *goCMSContentBridge) convertBlockDefinitionVersion(val reflect.Value) admin.CMSBlockDefinitionVersion {
	val = deref(val)
	version := admin.CMSBlockDefinitionVersion{}
	if id, ok := extractUUID(val, "ID"); ok && id != uuid.Nil {
		version.ID = id.String()
	}
	if defID, ok := extractUUID(val, "DefinitionID"); ok && defID != uuid.Nil {
		if name := b.blockDefinitionName(defID); name != "" {
			version.DefinitionID = name
		} else {
			version.DefinitionID = defID.String()
		}
	}
	if version.ID == "" {
		version.ID = strings.TrimSpace(stringField(val, "ID"))
	}
	if version.DefinitionID == "" {
		version.DefinitionID = strings.TrimSpace(stringField(val, "DefinitionID"))
	}
	if schemaVersion := strings.TrimSpace(stringField(val, "SchemaVersion")); schemaVersion != "" {
		version.SchemaVersion = schemaVersion
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			version.Schema = cloneAnyMap(schema)
		}
	}
	if defaultsField := val.FieldByName("Defaults"); defaultsField.IsValid() {
		if defaults, ok := defaultsField.Interface().(map[string]any); ok {
			version.Defaults = cloneAnyMap(defaults)
		}
	}
	if version.MigrationStatus == "" {
		version.MigrationStatus = schemaMigrationStatusFromSchema(version.Schema)
	}
	version.CreatedAt = timeField(val, "CreatedAt")
	version.UpdatedAt = timeField(val, "UpdatedAt")
	return version
}

func (b *goCMSContentBridge) resolveBlockDefinitionID(ctx context.Context, key string) uuid.UUID {
	key = strings.TrimSpace(key)
	if key == "" {
		return uuid.Nil
	}
	if parsed := uuidOrNil(key); parsed != uuid.Nil {
		return parsed
	}
	b.refreshBlockDefinitions(ctx)
	if id, ok := b.blockDefs[strings.ToLower(key)]; ok {
		return id
	}
	return uuid.Nil
}

func (b *goCMSContentBridge) refreshBlockDefinitions(ctx context.Context) {
	if b == nil || b.blocks == nil {
		return
	}
	method := reflect.ValueOf(b.blocks).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
	if reflectError(results) != nil || len(results) == 0 || !results[0].IsValid() {
		return
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return
	}
	for i := 0; i < value.Len(); i++ {
		item := deref(value.Index(i))
		name := strings.TrimSpace(stringField(item, "Name"))
		id, ok := extractUUID(item, "ID")
		if !ok || id == uuid.Nil || name == "" {
			continue
		}
		lower := strings.ToLower(name)
		b.blockDefs[lower] = id
		b.blockDefNames[id] = name
		if slug := strings.TrimSpace(stringField(item, "Slug")); slug != "" {
			b.blockDefs[strings.ToLower(slug)] = id
		}
	}
}

func (b *goCMSContentBridge) blockDefinitionName(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	if name, ok := b.blockDefNames[id]; ok {
		return name
	}
	return ""
}

func (b *goCMSContentBridge) convertBlockInstance(val reflect.Value, locale string) admin.CMSBlock {
	val = deref(val)
	block := admin.CMSBlock{Data: map[string]any{}}
	if id, ok := extractUUID(val, "ID"); ok {
		block.ID = id.String()
	}
	if defID, ok := extractUUID(val, "DefinitionID"); ok {
		if name := b.blockDefinitionName(defID); name != "" {
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
	if pos, ok := intField(val, "Position"); ok {
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

func (b *goCMSContentBridge) createBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block admin.CMSBlock) (*admin.CMSBlock, error) {
	method := reflect.ValueOf(b.blocks).MethodByName("CreateInstance")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "DefinitionID", defID)
	if pageID != uuid.Nil {
		setUUIDPtr(input, "PageID", pageID)
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
	setUUIDField(input, "CreatedBy", uuid.Nil)
	setUUIDField(input, "UpdatedBy", uuid.Nil)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	inst := results[0]
	if err := b.upsertBlockTranslation(ctx, inst, block, false); err != nil {
		return nil, err
	}
	converted := b.convertBlockInstance(inst, block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = cloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (b *goCMSContentBridge) updateBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block admin.CMSBlock) (*admin.CMSBlock, error) {
	method := reflect.ValueOf(b.blocks).MethodByName("UpdateInstance")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	instanceID := uuidOrNil(block.ID)
	if instanceID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "InstanceID", instanceID)
	if pageID != uuid.Nil {
		setUUIDPtr(input, "PageID", pageID)
	}
	if region := strings.TrimSpace(block.Region); region != "" {
		setStringPtr(input, "Region", region)
	}
	if block.Position > 0 {
		setIntPtr(input, "Position", block.Position)
	}
	if len(block.Data) > 0 {
		setMapField(input, "Configuration", cloneAnyMap(block.Data))
	}
	setUUIDField(input, "UpdatedBy", uuid.Nil)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() || results[0].IsNil() {
		return nil, admin.ErrNotFound
	}
	inst := results[0]
	if err := b.upsertBlockTranslation(ctx, inst, block, true); err != nil {
		return nil, err
	}
	converted := b.convertBlockInstance(inst, block.Locale)
	if len(converted.Data) == 0 && len(block.Data) > 0 {
		converted.Data = cloneAnyMap(block.Data)
	}
	if converted.Locale == "" {
		converted.Locale = block.Locale
	}
	return &converted, nil
}

func (b *goCMSContentBridge) upsertBlockTranslation(ctx context.Context, instance reflect.Value, block admin.CMSBlock, allowCreate bool) error {
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
	updateMethod := reflect.ValueOf(b.blocks).MethodByName("UpdateTranslation")
	if updateMethod.IsValid() {
		req := reflect.New(updateMethod.Type().In(1)).Elem()
		setUUIDField(req, "BlockInstanceID", instID)
		setUUIDField(req, "LocaleID", localeID)
		setMapField(req, "Content", payload)
		setUUIDField(req, "UpdatedBy", uuid.Nil)
		results := updateMethod.Call([]reflect.Value{reflect.ValueOf(ctx), req})
		if err := reflectError(results); err == nil {
			return nil
		} else if !allowCreate {
			return err
		}
	}
	createMethod := reflect.ValueOf(b.blocks).MethodByName("AddTranslation")
	if !createMethod.IsValid() {
		return nil
	}
	req := reflect.New(createMethod.Type().In(1)).Elem()
	setUUIDField(req, "BlockInstanceID", instID)
	setUUIDField(req, "LocaleID", localeID)
	setMapField(req, "Content", payload)
	results := createMethod.Call([]reflect.Value{reflect.ValueOf(ctx), req})
	return reflectError(results)
}

func intField(val reflect.Value, name string) (int, bool) {
	field := val.FieldByName(name)
	if field.IsValid() && field.Kind() == reflect.Int {
		return int(field.Int()), true
	}
	return 0, false
}

func setIntField(val reflect.Value, name string, value int) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.Int {
		field.SetInt(int64(value))
	}
}

func setIntPtr(val reflect.Value, name string, value int) {
	field := val.FieldByName(name)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.Ptr {
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().SetInt(int64(value))
		field.Set(ptr)
	}
}

func localeUUID(localeCode string) uuid.UUID {
	trimmed := strings.ToLower(strings.TrimSpace(localeCode))
	if trimmed == "" {
		return uuid.Nil
	}
	key := "go-cms:locale:" + trimmed
	if uid, err := hashid.NewUUID(key, hashid.WithHashAlgorithm(hashid.SHA256), hashid.WithNormalization(true)); err == nil && uid != uuid.Nil {
		return uid
	}
	return uuid.NewSHA1(uuid.NameSpaceOID, []byte(key))
}
