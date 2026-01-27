package admin

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
)

// GoCMSContentTypeAdapter maps a go-cms content type service into CMSContentTypeService using reflection.
type GoCMSContentTypeAdapter struct {
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
	if !hasContentTypeMethods(service) {
		return nil
	}
	return &GoCMSContentTypeAdapter{service: service}
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

func (a *GoCMSContentTypeAdapter) ContentTypes(ctx context.Context) ([]CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	method := findMethod(a.service, "ContentTypes", "ListContentTypes", "List")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	for i := 1; i < method.Type().NumIn(); i++ {
		arg := method.Type().In(i)
		if arg.Kind() == reflect.String {
			args = append(args, reflect.ValueOf(""))
		} else {
			args = append(args, reflect.Zero(arg))
		}
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
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
	for i := 2; i < method.Type().NumIn(); i++ {
		args = append(args, reflect.Zero(method.Type().In(i)))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
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
	method := findMethod(a.service, "ContentTypeBySlug", "GetBySlug")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	if method.Type().NumIn() < 2 {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	arg, err := valueForStringType(method.Type().In(1), slug)
	if err != nil {
		return nil, err
	}
	args = append(args, arg)
	for i := 2; i < method.Type().NumIn(); i++ {
		args = append(args, reflect.Zero(method.Type().In(i)))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
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

func (a *GoCMSContentTypeAdapter) CreateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
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
	for i := 2; i < method.Type().NumIn(); i++ {
		args = append(args, reflect.Zero(method.Type().In(i)))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
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
	for i := 2; i < method.Type().NumIn(); i++ {
		args = append(args, reflect.Zero(method.Type().In(i)))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
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
	method := findMethod(a.service, "DeleteContentType", "Delete")
	if !method.IsValid() {
		return ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	switch method.Type().NumIn() {
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
	return extractError(results)
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
	if desc := strings.TrimSpace(contentType.Description); desc != "" {
		setStringPtr(input.FieldByName("Description"), desc)
	}
	if contentType.Schema != nil {
		setMapField(input, "Schema", cloneAnyMap(contentType.Schema))
	}
	if contentType.Capabilities != nil {
		setMapField(input, "Capabilities", cloneAnyMap(contentType.Capabilities))
	}
	if icon := strings.TrimSpace(contentType.Icon); icon != "" {
		setStringPtr(input.FieldByName("Icon"), icon)
	}

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
		return reflect.Value{}, fmt.Errorf("content type id required")
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
	return reflect.Value{}, fmt.Errorf("unsupported content type id type %s", argType.String())
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
	return reflect.Value{}, fmt.Errorf("unsupported string type %s", argType.String())
}

func parseUUID(value string) (uuid.UUID, error) {
	parsed, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid uuid %q", value)
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
	contentType.Capabilities = extractMapField(value, "Capabilities")
	contentType.Icon = extractStringField(value, "Icon")

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
