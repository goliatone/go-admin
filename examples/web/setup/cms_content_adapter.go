package setup

import (
	"context"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/google/uuid"
)

// goCMSContentBridge adapts the go-cms content service (which uses internal types)
// to the admin.CMSContentService contract using reflection.
type goCMSContentBridge struct {
	content any
	page    any
	types   map[string]uuid.UUID

	defaultTemplate uuid.UUID
}

func newGoCMSContentBridge(contentSvc any, pageSvc any, defaultTemplate uuid.UUID, typeIDs map[string]uuid.UUID) admin.CMSContentService {
	if contentSvc == nil {
		return nil
	}
	return &goCMSContentBridge{
		content:         contentSvc,
		page:            pageSvc,
		types:           typeIDs,
		defaultTemplate: defaultTemplate,
	}
}

func (b *goCMSContentBridge) Pages(ctx context.Context, locale string) ([]admin.CMSPage, error) {
	if b.page == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.page).MethodByName("List")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
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

func (b *goCMSContentBridge) Page(ctx context.Context, id, locale string) (*admin.CMSPage, error) {
	if b.page == nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.page).MethodByName("Get")
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
	rec := b.convertPage(results[0], locale)
	return &rec, nil
}

func (b *goCMSContentBridge) CreatePage(ctx context.Context, page admin.CMSPage) (*admin.CMSPage, error) {
	if b.page == nil {
		return nil, admin.ErrNotFound
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
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
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
	if b.page == nil {
		return nil, admin.ErrNotFound
	}
	pageID := uuidOrNil(page.ID)
	if pageID == uuid.Nil {
		return nil, admin.ErrNotFound
	}
	method := reflect.ValueOf(b.page).MethodByName("Update")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()
	setUUIDField(req, "ID", pageID)
	templateID := uuidOrNil(page.TemplateID)
	if templateID == uuid.Nil {
		templateID = b.defaultTemplate
	}
	setUUIDPtr(req, "TemplateID", templateID)
	setStringField(req, "Status", page.Status)
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
	if b.page == nil {
		return admin.ErrNotFound
	}
	method := reflect.ValueOf(b.page).MethodByName("Delete")
	if !method.IsValid() {
		return admin.ErrNotFound
	}
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

func (b *goCMSContentBridge) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("List")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
	if err := reflectError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, nil
	}
	slice := deref(results[0])
	out := make([]admin.CMSContent, 0, slice.Len())
	for i := 0; i < slice.Len(); i++ {
		out = append(out, b.convertContent(slice.Index(i), locale))
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
	rec := b.convertContent(results[0], locale)
	return &rec, nil
}

func (b *goCMSContentBridge) CreateContent(ctx context.Context, content admin.CMSContent) (*admin.CMSContent, error) {
	method := reflect.ValueOf(b.content).MethodByName("Create")
	if !method.IsValid() {
		return nil, admin.ErrNotFound
	}
	reqType := method.Type().In(1)
	req := reflect.New(reqType).Elem()

	setUUIDField(req, "ContentTypeID", b.contentTypeID(content.ContentType))
	setStringField(req, "Slug", content.Slug)
	setStringField(req, "Status", content.Status)
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
	rec := b.convertContent(results[0], content.Locale)
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
	rec := b.convertContent(results[0], content.Locale)
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

func (b *goCMSContentBridge) BlockDefinitions(context.Context) ([]admin.CMSBlockDefinition, error) {
	return nil, admin.ErrNotFound
}

func (b *goCMSContentBridge) CreateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, admin.ErrNotFound
}

func (b *goCMSContentBridge) UpdateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, admin.ErrNotFound
}

func (b *goCMSContentBridge) DeleteBlockDefinition(context.Context, string) error {
	return admin.ErrNotFound
}

func (b *goCMSContentBridge) BlocksForContent(context.Context, string, string) ([]admin.CMSBlock, error) {
	return nil, admin.ErrNotFound
}

func (b *goCMSContentBridge) SaveBlock(context.Context, admin.CMSBlock) (*admin.CMSBlock, error) {
	return nil, admin.ErrNotFound
}

func (b *goCMSContentBridge) DeleteBlock(context.Context, string) error {
	return admin.ErrNotFound
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
	if summary := strings.TrimSpace(asString(content.Data["excerpt"], "")); summary != "" {
		setStringPtr(tr, "Summary", summary)
	}
	if data := cloneAnyMap(content.Data); data != nil {
		setMapField(tr, "Content", data)
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

func (b *goCMSContentBridge) convertContent(value reflect.Value, locale string) admin.CMSContent {
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
		if name := b.typeName(typID); name != "" {
			out.ContentType = name
		}
	}
	if out.ContentType == "" {
		if typ := val.FieldByName("Type"); typ.IsValid() {
			if name := stringField(typ, "Name"); name != "" {
				out.ContentType = name
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

func (b *goCMSContentBridge) contentTypeID(name string) uuid.UUID {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		return uuid.Nil
	}
	if id, ok := b.types[normalized]; ok {
		return id
	}
	return uuid.Nil
}

func (b *goCMSContentBridge) typeName(id uuid.UUID) string {
	for name, cid := range b.types {
		if cid == id {
			return name
		}
	}
	return ""
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

func uuidOrNil(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.Nil
}
