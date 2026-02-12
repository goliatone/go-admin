package admin

import (
	"context"
	"reflect"
	"strings"

	"github.com/google/uuid"
)

// CreateTranslation attempts to use a first-class go-cms translation command when available.
func (a *GoCMSContentAdapter) CreateTranslation(ctx context.Context, input TranslationCreateInput) (*CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	record, err := a.createTranslationRecord(ctx, input)
	if err != nil {
		return nil, err
	}
	converted := a.convertContent(ctx, record, input.Locale)
	return &converted, nil
}

func (a *GoCMSContentAdapter) createTranslationRecord(ctx context.Context, input TranslationCreateInput) (reflect.Value, error) {
	method := reflect.ValueOf(a.content).MethodByName("CreateTranslation")
	if !method.IsValid() {
		return reflect.Value{}, ErrTranslationCreateUnsupported
	}
	sourceID := uuidFromString(input.SourceID)
	if sourceID == uuid.Nil {
		return reflect.Value{}, ErrNotFound
	}
	args, err := buildCreateTranslationMethodArgs(method, ctx, input, sourceID)
	if err != nil {
		return reflect.Value{}, err
	}
	results := method.Call(args)
	if len(results) == 0 {
		return reflect.Value{}, ErrNotFound
	}
	if last := results[len(results)-1]; last.IsValid() && last.Type().Implements(reflect.TypeOf((*error)(nil)).Elem()) && !last.IsNil() {
		if typedErr, ok := last.Interface().(error); ok {
			return reflect.Value{}, typedErr
		}
		return reflect.Value{}, ErrNotFound
	}
	record := deref(results[0])
	if !record.IsValid() {
		return reflect.Value{}, ErrNotFound
	}
	return record, nil
}

func buildCreateTranslationMethodArgs(method reflect.Value, ctx context.Context, input TranslationCreateInput, sourceID uuid.UUID) ([]reflect.Value, error) {
	signature := method.Type()
	if signature.NumIn() < 2 || !signature.In(0).Implements(reflect.TypeOf((*context.Context)(nil)).Elem()) {
		return nil, ErrTranslationCreateUnsupported
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	switch {
	case signature.NumIn() == 2 && signature.In(1).Kind() == reflect.Struct:
		req := reflect.New(signature.In(1)).Elem()
		applyCreateTranslationRequestFields(req, input, sourceID)
		args = append(args, req)
	case signature.NumIn() == 2 && signature.In(1).Kind() == reflect.Pointer && signature.In(1).Elem().Kind() == reflect.Struct:
		req := reflect.New(signature.In(1).Elem())
		applyCreateTranslationRequestFields(req.Elem(), input, sourceID)
		args = append(args, req)
	case signature.NumIn() >= 3 && signature.In(1) == reflect.TypeOf(uuid.UUID{}) && signature.In(2).Kind() == reflect.String:
		args = append(args, reflect.ValueOf(sourceID), reflect.ValueOf(input.Locale))
		if signature.NumIn() >= 4 {
			if signature.In(3).Kind() != reflect.String {
				return nil, ErrTranslationCreateUnsupported
			}
			env := strings.TrimSpace(firstNonEmpty(input.Environment, environmentFromContext(ctx)))
			args = append(args, reflect.ValueOf(env))
		}
		if signature.NumIn() > len(args) {
			return nil, ErrTranslationCreateUnsupported
		}
	default:
		return nil, ErrTranslationCreateUnsupported
	}
	return args, nil
}

func applyCreateTranslationRequestFields(req reflect.Value, input TranslationCreateInput, sourceID uuid.UUID) {
	setUUIDFieldByName(req, "ContentID", sourceID)
	setUUIDFieldByName(req, "SourceID", sourceID)
	setUUIDFieldByName(req, "ID", sourceID)

	setStringField(req, "Locale", input.Locale)
	setStringField(req, "TargetLocale", input.Locale)

	env := strings.TrimSpace(input.Environment)
	if env != "" {
		setStringField(req, "Environment", env)
		setStringField(req, "EnvironmentKey", env)
	}

	if contentType := strings.TrimSpace(input.ContentType); contentType != "" {
		setStringField(req, "ContentType", contentType)
		setStringField(req, "ContentTypeSlug", contentType)
		setStringField(req, "EntityType", contentType)
	}
	if status := strings.TrimSpace(input.Status); status != "" {
		setStringField(req, "Status", status)
	}
	setUUIDFieldByName(req, "CreatedBy", uuid.Nil)
	setUUIDFieldByName(req, "UpdatedBy", uuid.Nil)
}

func setUUIDFieldByName(target reflect.Value, fieldName string, value uuid.UUID) {
	target = deref(target)
	if !target.IsValid() || target.Kind() != reflect.Struct {
		return
	}
	field := target.FieldByName(fieldName)
	if !field.IsValid() || !field.CanSet() {
		return
	}
	if field.Kind() == reflect.Pointer && field.Type().Elem() == reflect.TypeOf(uuid.UUID{}) {
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().Set(reflect.ValueOf(value))
		field.Set(ptr)
		return
	}
	if field.Type() != reflect.TypeOf(uuid.UUID{}) {
		return
	}
	field.Set(reflect.ValueOf(value))
}
