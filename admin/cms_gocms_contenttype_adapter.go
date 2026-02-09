package admin

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"time"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

// GoCMSContentTypeAdapter maps a go-cms content type service into CMSContentTypeService.
// It prefers the public typed go-cms contract and falls back to reflection for compatibility.
type GoCMSContentTypeAdapter struct {
	typed   cmscontent.ContentTypeService
	service any
}

// NewGoCMSContentTypeAdapter wraps a go-cms content type service (or compatible type).
func NewGoCMSContentTypeAdapter(service any) CMSContentTypeService {
	if service == nil {
		return nil
	}
	if svc, ok := service.(CMSContentTypeService); ok && svc != nil {
		return svc
	}
	typed, hasTyped := service.(cmscontent.ContentTypeService)
	if !hasTyped && !hasContentTypeMethods(service) {
		return nil
	}
	return &GoCMSContentTypeAdapter{typed: typed, service: service}
}

func hasContentTypeMethods(service any) bool {
	if service == nil {
		return false
	}
	names := []string{
		"List", "ContentTypes", "ListContentTypes",
		"Get", "ContentType", "GetBySlug", "ContentTypeBySlug",
		"Create", "CreateContentType", "RegisterContentType",
		"Update", "UpdateContentType",
		"Delete", "DeleteContentType",
	}
	value := reflect.ValueOf(service)
	for _, name := range names {
		if method := value.MethodByName(name); method.IsValid() {
			return true
		}
	}
	return false
}

func findMethod(target any, names ...string) reflect.Value {
	if target == nil {
		return reflect.Value{}
	}
	value := reflect.ValueOf(target)
	for _, name := range names {
		method := value.MethodByName(name)
		if method.IsValid() {
			return method
		}
	}
	return reflect.Value{}
}

func appendZeroArgs(args []reflect.Value, method reflect.Value, start int) []reflect.Value {
	if !method.IsValid() {
		return args
	}
	numIn := method.Type().NumIn()
	if method.Type().IsVariadic() && numIn > 0 {
		numIn--
	}
	for i := start; i < numIn; i++ {
		args = append(args, reflect.Zero(method.Type().In(i)))
	}
	return args
}

func (a *GoCMSContentTypeAdapter) ContentTypes(ctx context.Context) ([]CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	if a.typed != nil {
		items, err := a.typed.List(ctx)
		if err != nil {
			return nil, normalizeContentTypeAdapterError(err)
		}
		out := make([]CMSContentType, 0, len(items))
		for _, item := range items {
			if item == nil {
				continue
			}
			out = append(out, convertContentTypeValue(reflect.ValueOf(item)))
		}
		return out, nil
	}
	method := findMethod(a.service, "ContentTypes", "ListContentTypes", "List")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	args = appendZeroArgs(args, method, 1)
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if len(results) == 0 {
		return nil, nil
	}
	return convertContentTypeSlice(results[0]), nil
}

func (a *GoCMSContentTypeAdapter) ContentType(ctx context.Context, id string) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	if a.typed != nil {
		uid := uuidFromString(id)
		if uid == uuid.Nil {
			return nil, ErrNotFound
		}
		record, err := a.typed.Get(ctx, uid)
		if err != nil {
			return nil, normalizeContentTypeAdapterError(err)
		}
		if record == nil {
			return nil, ErrNotFound
		}
		converted := convertContentTypeValue(reflect.ValueOf(record))
		return &converted, nil
	}
	method := findMethod(a.service, "ContentType", "GetContentType", "Get")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	if method.Type().NumIn() < 2 {
		return nil, ErrNotFound
	}
	arg, err := valueForIDType(method.Type().In(1), id)
	if err != nil {
		return nil, err
	}
	args = append(args, arg)
	args = appendZeroArgs(args, method, 2)
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if len(results) == 0 || !results[0].IsValid() {
		return nil, ErrNotFound
	}
	converted := convertContentTypeValue(results[0])
	if converted.ID == "" && converted.Slug == "" && converted.Name == "" {
		return nil, ErrNotFound
	}
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) ContentTypeBySlug(ctx context.Context, slug string) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	if a.typed != nil {
		record, err := a.typed.GetBySlug(ctx, strings.TrimSpace(slug))
		if err != nil {
			normalized := normalizeContentTypeAdapterError(err)
			if errors.Is(normalized, ErrNotFound) {
				return a.contentTypeByPanelSlug(ctx, slug)
			}
			return nil, normalized
		}
		if record == nil {
			return a.contentTypeByPanelSlug(ctx, slug)
		}
		converted := convertContentTypeValue(reflect.ValueOf(record))
		if converted.ID == "" && converted.Slug == "" && converted.Name == "" {
			return a.contentTypeByPanelSlug(ctx, slug)
		}
		return &converted, nil
	}
	method := findMethod(a.service, "ContentTypeBySlug", "GetBySlug")
	if !method.IsValid() {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	if method.Type().NumIn() < 2 {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	arg, err := valueForStringType(method.Type().In(1), slug)
	if err != nil {
		return nil, err
	}
	args = append(args, arg)
	args = appendZeroArgs(args, method, 2)
	results := method.Call(args)
	if err := extractError(results); err != nil {
		normalized := normalizeContentTypeAdapterError(err)
		if errors.Is(normalized, ErrNotFound) {
			return a.contentTypeByPanelSlug(ctx, slug)
		}
		return nil, normalized
	}
	if len(results) == 0 || !results[0].IsValid() {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	converted := convertContentTypeValue(results[0])
	if converted.ID == "" && converted.Slug == "" && converted.Name == "" {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) contentTypeByPanelSlug(ctx context.Context, slug string) (*CMSContentType, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrNotFound
	}
	types, err := a.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	for _, ct := range types {
		panelSlug := capabilityString(ct.Capabilities, "panel_slug", "panelSlug", "panel-slug")
		if panelSlug != "" && strings.EqualFold(panelSlug, slug) {
			contentType := ct
			return &contentType, nil
		}
	}
	return nil, ErrNotFound
}

func (a *GoCMSContentTypeAdapter) CreateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	if a.typed != nil {
		req := cmscontent.CreateContentTypeRequest{
			Name:         strings.TrimSpace(contentType.Name),
			Slug:         strings.TrimSpace(contentType.Slug),
			Schema:       cloneAnyMap(contentType.Schema),
			UISchema:     cloneAnyMap(contentType.UISchema),
			Capabilities: cloneAnyMap(contentType.Capabilities),
		}
		if desc := strings.TrimSpace(contentType.Description); desc != "" || contentType.DescriptionSet {
			descCopy := contentType.Description
			req.Description = &descCopy
		}
		if icon := strings.TrimSpace(contentType.Icon); icon != "" || contentType.IconSet {
			iconCopy := contentType.Icon
			req.Icon = &iconCopy
		}
		if status := strings.TrimSpace(contentType.Status); status != "" {
			req.Status = status
		}
		if env := strings.TrimSpace(contentType.Environment); env != "" {
			req.EnvironmentKey = env
		}
		actor := actorUUID(ctx)
		req.CreatedBy = actor
		req.UpdatedBy = actor
		record, err := a.typed.Create(ctx, req)
		if err != nil {
			return nil, normalizeContentTypeAdapterError(err)
		}
		if record == nil {
			return nil, ErrNotFound
		}
		converted := convertContentTypeValue(reflect.ValueOf(record))
		return &converted, nil
	}
	method := findMethod(a.service, "CreateContentType", "RegisterContentType", "Create")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	if method.Type().NumIn() < 2 {
		return nil, ErrNotFound
	}
	input, err := buildContentTypeInput(method.Type().In(1), contentType, false)
	if err != nil {
		return nil, err
	}
	args := []reflect.Value{reflect.ValueOf(ctx), input}
	args = appendZeroArgs(args, method, 2)
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if len(results) == 0 {
		return nil, ErrNotFound
	}
	converted := convertContentTypeValue(results[0])
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) UpdateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	if a.typed != nil {
		req := cmscontent.UpdateContentTypeRequest{
			ID:                   uuidFromString(contentType.ID),
			Schema:               cloneAnyMap(contentType.Schema),
			UISchema:             cloneAnyMap(contentType.UISchema),
			Capabilities:         cloneAnyMap(contentType.Capabilities),
			AllowBreakingChanges: contentType.AllowBreakingChanges,
			UpdatedBy:            actorUUID(ctx),
		}
		if req.ID == uuid.Nil {
			return nil, ErrNotFound
		}
		if name := strings.TrimSpace(contentType.Name); name != "" {
			req.Name = &name
		}
		if slug := strings.TrimSpace(contentType.Slug); slug != "" {
			req.Slug = &slug
		}
		if desc := strings.TrimSpace(contentType.Description); desc != "" || contentType.DescriptionSet {
			descCopy := contentType.Description
			req.Description = &descCopy
		}
		if icon := strings.TrimSpace(contentType.Icon); icon != "" || contentType.IconSet {
			iconCopy := contentType.Icon
			req.Icon = &iconCopy
		}
		if status := strings.TrimSpace(contentType.Status); status != "" {
			req.Status = &status
		}
		if env := strings.TrimSpace(contentType.Environment); env != "" {
			req.EnvironmentKey = env
		}
		record, err := a.typed.Update(ctx, req)
		if err != nil {
			return nil, normalizeContentTypeAdapterError(err)
		}
		if record == nil {
			return nil, ErrNotFound
		}
		converted := convertContentTypeValue(reflect.ValueOf(record))
		return &converted, nil
	}
	method := findMethod(a.service, "UpdateContentType", "Update")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	if method.Type().NumIn() < 2 {
		return nil, ErrNotFound
	}
	input, err := buildContentTypeInput(method.Type().In(1), contentType, true)
	if err != nil {
		return nil, err
	}
	args := []reflect.Value{reflect.ValueOf(ctx), input}
	args = appendZeroArgs(args, method, 2)
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if len(results) == 0 {
		return nil, ErrNotFound
	}
	converted := convertContentTypeValue(results[0])
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) DeleteContentType(ctx context.Context, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	if a.typed != nil {
		req := cmscontent.DeleteContentTypeRequest{
			ID:         uuidFromString(id),
			DeletedBy:  actorUUID(ctx),
			HardDelete: true,
		}
		if req.ID == uuid.Nil {
			return ErrNotFound
		}
		return normalizeContentTypeAdapterError(a.typed.Delete(ctx, req))
	}
	method := findMethod(a.service, "DeleteContentType", "Delete")
	if !method.IsValid() {
		return ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	numIn := method.Type().NumIn()
	if method.Type().IsVariadic() && numIn > 0 {
		numIn--
	}
	switch numIn {
	case 1:
		// ctx only (unlikely)
	case 2:
		arg, err := buildContentTypeIDInput(method.Type().In(1), id)
		if err != nil {
			return err
		}
		args = append(args, arg)
	case 3:
		arg, err := valueForIDType(method.Type().In(1), id)
		if err != nil {
			return err
		}
		args = append(args, arg)
		if method.Type().In(2).Kind() == reflect.Bool {
			args = append(args, reflect.ValueOf(true))
		} else {
			args = append(args, reflect.Zero(method.Type().In(2)))
		}
	default:
		return ErrNotFound
	}
	results := method.Call(args)
	return normalizeContentTypeAdapterError(extractError(results))
}

func buildContentTypeIDInput(argType reflect.Type, id string) (reflect.Value, error) {
	if argType.Kind() == reflect.Pointer {
		value, err := buildContentTypeIDInput(argType.Elem(), id)
		if err != nil {
			return reflect.Value{}, err
		}
		ptr := reflect.New(argType.Elem())
		ptr.Elem().Set(value)
		return ptr, nil
	}
	input := reflect.New(argType).Elem()
	if err := setIDFields(input, id); err != nil {
		return reflect.Value{}, err
	}
	setBoolField(input, "HardDelete", true)
	setBoolField(input, "HardDeleteRequested", true)
	return input, nil
}

func buildContentTypeInput(argType reflect.Type, contentType CMSContentType, isUpdate bool) (reflect.Value, error) {
	ptr := false
	if argType.Kind() == reflect.Pointer {
		ptr = true
		argType = argType.Elem()
	}
	input := reflect.New(argType).Elem()

	if isUpdate {
		if err := setIDFields(input, contentType.ID); err != nil {
			return reflect.Value{}, err
		}
	}

	if name := strings.TrimSpace(contentType.Name); name != "" || !isUpdate {
		setStringPtr(input.FieldByName("Name"), name)
	}
	if slug := strings.TrimSpace(contentType.Slug); slug != "" || !isUpdate {
		setStringPtr(input.FieldByName("Slug"), slug)
	}
	if isUpdate && contentType.DescriptionSet {
		setStringPtr(input.FieldByName("Description"), contentType.Description)
	} else if desc := strings.TrimSpace(contentType.Description); desc != "" {
		setStringPtr(input.FieldByName("Description"), desc)
	}
	setOptionalClonedMapField(input, "Schema", contentType.Schema)
	setOptionalClonedMapField(input, "UISchema", contentType.UISchema)
	setOptionalClonedMapField(input, "Capabilities", contentType.Capabilities)
	if isUpdate && contentType.IconSet {
		setStringPtr(input.FieldByName("Icon"), contentType.Icon)
	} else if icon := strings.TrimSpace(contentType.Icon); icon != "" {
		setStringPtr(input.FieldByName("Icon"), icon)
	}
	if status := strings.TrimSpace(contentType.Status); status != "" {
		setStringPtr(input.FieldByName("Status"), status)
	}
	if isUpdate && contentType.AllowBreakingChanges {
		setBoolField(input, "AllowBreakingChanges", true)
		setBoolField(input, "AllowBreaking", true)
	}
	setEnvironmentFieldAliases(input, contentType.Environment)

	if ptr {
		return input.Addr(), nil
	}
	return input, nil
}

func setIDFields(input reflect.Value, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil
	}
	if field := input.FieldByName("ID"); field.IsValid() {
		if err := setIDValue(field, id); err != nil {
			return err
		}
		return nil
	}
	if field := input.FieldByName("ContentTypeID"); field.IsValid() {
		return setIDValue(field, id)
	}
	return nil
}

func setIDValue(field reflect.Value, id string) error {
	if !field.IsValid() || !field.CanSet() {
		return nil
	}
	switch field.Kind() {
	case reflect.String:
		field.SetString(id)
		return nil
	case reflect.Pointer:
		if field.Type().Elem().Kind() == reflect.String {
			ptr := reflect.New(field.Type().Elem())
			ptr.Elem().SetString(id)
			field.Set(ptr)
			return nil
		}
		if field.Type().Elem() == reflect.TypeOf(uuid.UUID{}) {
			parsed, err := parseUUID(id)
			if err != nil {
				return err
			}
			setUUIDPtr(field, &parsed)
			return nil
		}
	case reflect.Struct, reflect.Array:
		if field.Type() == reflect.TypeOf(uuid.UUID{}) {
			parsed, err := parseUUID(id)
			if err != nil {
				return err
			}
			setUUIDValue(field, parsed)
			return nil
		}
	}
	return nil
}

func valueForIDType(argType reflect.Type, id string) (reflect.Value, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return reflect.Value{}, requiredFieldDomainError("content type id", map[string]any{
			"component": "content_type_adapter",
		})
	}
	switch argType.Kind() {
	case reflect.String:
		return reflect.ValueOf(id).Convert(argType), nil
	case reflect.Pointer:
		elem := argType.Elem()
		if elem.Kind() == reflect.String {
			ptr := reflect.New(elem)
			ptr.Elem().SetString(id)
			return ptr, nil
		}
		if elem == reflect.TypeOf(uuid.UUID{}) {
			parsed, err := parseUUID(id)
			if err != nil {
				return reflect.Value{}, err
			}
			ptr := reflect.New(elem)
			ptr.Elem().Set(reflect.ValueOf(parsed))
			return ptr, nil
		}
	case reflect.Struct, reflect.Array:
		if argType == reflect.TypeOf(uuid.UUID{}) {
			parsed, err := parseUUID(id)
			if err != nil {
				return reflect.Value{}, err
			}
			return reflect.ValueOf(parsed), nil
		}
	}
	return reflect.Value{}, validationDomainError("unsupported content type id type", map[string]any{
		"component": "content_type_adapter",
		"type":      argType.String(),
	})
}

func valueForStringType(argType reflect.Type, value string) (reflect.Value, error) {
	value = strings.TrimSpace(value)
	switch argType.Kind() {
	case reflect.String:
		return reflect.ValueOf(value).Convert(argType), nil
	case reflect.Pointer:
		if argType.Elem().Kind() == reflect.String {
			ptr := reflect.New(argType.Elem())
			ptr.Elem().SetString(value)
			return ptr, nil
		}
	}
	return reflect.Value{}, validationDomainError("unsupported string type", map[string]any{
		"component": "content_type_adapter",
		"type":      argType.String(),
	})
}

func parseUUID(value string) (uuid.UUID, error) {
	parsed, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return uuid.Nil, validationDomainError("invalid uuid", map[string]any{
			"component": "content_type_adapter",
			"value":     value,
		})
	}
	return parsed, nil
}

func convertContentTypeSlice(value reflect.Value) []CMSContentType {
	value = deref(value)
	if !value.IsValid() || value.Kind() != reflect.Slice {
		return nil
	}
	out := make([]CMSContentType, 0, value.Len())
	for i := 0; i < value.Len(); i++ {
		out = append(out, convertContentTypeValue(value.Index(i)))
	}
	return out
}

func convertContentTypeValue(value reflect.Value) CMSContentType {
	value = deref(value)
	if !value.IsValid() || value.Kind() != reflect.Struct {
		return CMSContentType{}
	}
	contentType := CMSContentType{
		Schema:       map[string]any{},
		UISchema:     map[string]any{},
		Capabilities: map[string]any{},
	}

	if id, ok := extractUUID(value, "ID"); ok && id != uuid.Nil {
		contentType.ID = id.String()
	} else if id := extractStringField(value, "ID"); id != "" {
		contentType.ID = id
	}

	contentType.Name = extractStringField(value, "Name")
	contentType.Slug = extractStringField(value, "Slug")
	contentType.Description = extractStringField(value, "Description")
	contentType.Schema = extractMapField(value, "Schema")
	contentType.UISchema = extractMapField(value, "UISchema")
	contentType.Capabilities = extractMapField(value, "Capabilities")
	contentType.Icon = extractStringField(value, "Icon")
	contentType.Status = extractStringField(value, "Status")
	contentType.Environment = extractStringField(value, "Environment")
	if contentType.Environment == "" {
		contentType.Environment = extractStringField(value, "Env")
	}

	if created, ok := extractTimeField(value, "CreatedAt"); ok {
		contentType.CreatedAt = created
	}
	if updated, ok := extractTimeField(value, "UpdatedAt"); ok {
		contentType.UpdatedAt = updated
	}

	return contentType
}

func extractStringField(value reflect.Value, fieldName string) string {
	value = deref(value)
	if !value.IsValid() || value.Kind() != reflect.Struct {
		return ""
	}
	field := value.FieldByName(fieldName)
	if !field.IsValid() {
		return ""
	}
	field = deref(field)
	if !field.IsValid() {
		return ""
	}
	if field.Kind() == reflect.String {
		return strings.TrimSpace(field.String())
	}
	return ""
}

func extractMapField(value reflect.Value, fieldName string) map[string]any {
	value = deref(value)
	if !value.IsValid() || value.Kind() != reflect.Struct {
		return nil
	}
	field := value.FieldByName(fieldName)
	if !field.IsValid() {
		return nil
	}
	field = deref(field)
	if !field.IsValid() {
		return nil
	}
	if field.Kind() == reflect.Map {
		if typed, ok := field.Interface().(map[string]any); ok {
			return cloneAnyMap(typed)
		}
		if typed, ok := field.Interface().(map[string]interface{}); ok {
			return cloneAnyMap(map[string]any(typed))
		}
	}
	if field.Kind() == reflect.Interface {
		if typed, ok := field.Interface().(map[string]any); ok {
			return cloneAnyMap(typed)
		}
		if typed, ok := field.Interface().(map[string]interface{}); ok {
			return cloneAnyMap(map[string]any(typed))
		}
	}
	return nil
}

func extractTimeField(value reflect.Value, fieldName string) (time.Time, bool) {
	value = deref(value)
	if !value.IsValid() || value.Kind() != reflect.Struct {
		return time.Time{}, false
	}
	field := value.FieldByName(fieldName)
	if !field.IsValid() {
		return time.Time{}, false
	}
	field = deref(field)
	if !field.IsValid() {
		return time.Time{}, false
	}
	if t, ok := field.Interface().(time.Time); ok {
		return t, !t.IsZero()
	}
	return time.Time{}, false
}

func normalizeContentTypeAdapterError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrNotFound) {
		return ErrNotFound
	}
	if isContentTypeNotFound(err) {
		return ErrNotFound
	}
	return err
}

func isContentTypeNotFound(err error) bool {
	if err == nil {
		return false
	}
	for current := err; current != nil; current = errors.Unwrap(current) {
		message := strings.ToLower(current.Error())
		if strings.Contains(message, "not found") &&
			(strings.Contains(message, "content_type") || strings.Contains(message, "content type")) {
			return true
		}
	}
	return false
}
