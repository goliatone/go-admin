package admin

import (
	"context"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/google/uuid"
)

// createTranslationRecordViaLegacyReflection preserves old go-cms
// CreateTranslation method shapes when no typed admin write service is present.
func (a *GoCMSContentAdapter) createTranslationRecordViaLegacyReflection(ctx context.Context, input TranslationCreateInput) (reflect.Value, error) {
	var method reflect.Value
	if a.translations != nil {
		method = reflect.ValueOf(a.translations).MethodByName("CreateTranslation")
	}
	if !method.IsValid() {
		method = reflect.ValueOf(a.content).MethodByName("CreateTranslation")
	}
	if !method.IsValid() {
		return reflect.Value{}, ErrTranslationCreateUnsupported
	}
	sourceID := cmsadapter.UUIDFromString(input.SourceID)
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
	if last := results[len(results)-1]; last.IsValid() && last.Type().Implements(reflect.TypeFor[error]()) && !last.IsNil() {
		if typedErr, ok := last.Interface().(error); ok {
			return reflect.Value{}, normalizeGoCMSTranslationCreateError(typedErr, input)
		}
		return reflect.Value{}, ErrNotFound
	}
	record := gocmsutil.Deref(results[0])
	if !record.IsValid() {
		return reflect.Value{}, ErrNotFound
	}
	return record, nil
}

func buildCreateTranslationMethodArgs(method reflect.Value, ctx context.Context, input TranslationCreateInput, sourceID uuid.UUID) ([]reflect.Value, error) {
	signature := method.Type()
	if signature.NumIn() < 2 || !signature.In(0).Implements(reflect.TypeFor[context.Context]()) {
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
	case signature.NumIn() >= 3 && signature.In(1) == reflect.TypeFor[uuid.UUID]() && signature.In(2).Kind() == reflect.String:
		args = append(args, reflect.ValueOf(sourceID), reflect.ValueOf(input.Locale))
		if signature.NumIn() >= 4 {
			if signature.In(3).Kind() != reflect.String {
				return nil, ErrTranslationCreateUnsupported
			}
			env := strings.TrimSpace(primitives.FirstNonEmptyRaw(input.Environment, environmentFromContext(ctx)))
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

	gocmsutil.SetStringField(req, "Locale", input.Locale)
	gocmsutil.SetStringField(req, "TargetLocale", input.Locale)
	gocmsutil.SetStringField(req, "Path", input.Path)
	gocmsutil.SetStringField(req, "RouteKey", input.RouteKey)

	env := strings.TrimSpace(input.Environment)
	if env != "" {
		gocmsutil.SetStringField(req, "Environment", env)
		gocmsutil.SetStringField(req, "EnvironmentKey", env)
	}

	if contentType := strings.TrimSpace(input.ContentType); contentType != "" {
		gocmsutil.SetStringField(req, "ContentType", contentType)
		gocmsutil.SetStringField(req, "ContentTypeSlug", contentType)
		gocmsutil.SetStringField(req, "EntityType", contentType)
	}
	if status := strings.TrimSpace(input.Status); status != "" {
		gocmsutil.SetStringField(req, "Status", status)
	}
	if len(input.Metadata) > 0 {
		gocmsutil.SetMapField(req, "Metadata", cloneAnyMap(input.Metadata))
		if familyID := cmsadapter.UUIDFromString(toString(input.Metadata["family_id"])); familyID != uuid.Nil {
			setUUIDFieldByName(req, "FamilyID", familyID)
		}
	}
	setUUIDFieldByName(req, "CreatedBy", uuid.Nil)
	setUUIDFieldByName(req, "UpdatedBy", uuid.Nil)
}

func setUUIDFieldByName(target reflect.Value, fieldName string, value uuid.UUID) {
	target = gocmsutil.Deref(target)
	if !target.IsValid() || target.Kind() != reflect.Struct {
		return
	}
	field := target.FieldByName(fieldName)
	if !field.IsValid() || !field.CanSet() {
		return
	}
	if field.Kind() == reflect.Pointer && field.Type().Elem() == reflect.TypeFor[uuid.UUID]() {
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().Set(reflect.ValueOf(value))
		field.Set(ptr)
		return
	}
	if field.Type() != reflect.TypeFor[uuid.UUID]() {
		return
	}
	field.Set(reflect.ValueOf(value))
}
