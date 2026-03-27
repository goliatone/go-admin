package admin

import (
	"context"
	"github.com/google/uuid"
	"reflect"
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
	if last := results[len(results)-1]; last.IsValid() && last.Type().Implements(reflect.TypeFor[error]()) && !last.IsNil() {
		if typedErr, ok := last.Interface().(error); ok {
			return reflect.Value{}, normalizeGoCMSTranslationCreateError(typedErr, input)
		}
		return reflect.Value{}, ErrNotFound
	}
	record := deref(results[0])
	if !record.IsValid() {
		return reflect.Value{}, ErrNotFound
	}
	return record, nil
}
