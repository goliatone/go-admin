package admin

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	"github.com/goliatone/go-admin/internal/primitives"

	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	"github.com/google/uuid"
)

type goCMSTranslationProjection struct {
	chosen           reflect.Value
	availableLocales []string
}

func normalizeGoCMSTranslationCreateError(err error, input TranslationCreateInput) error {
	if err == nil {
		return nil
	}

	locale := normalizeCreateTranslationLocale(input.Locale)
	entityID := strings.TrimSpace(input.SourceID)
	panel := strings.TrimSpace(input.ContentType)

	var contentDup *cmscontent.TranslationAlreadyExistsError
	if errors.As(err, &contentDup) && contentDup != nil {
		return TranslationAlreadyExistsError{
			Panel:        panel,
			EntityID:     primitives.FirstNonEmptyRaw(entityID, nonNilUUIDString(contentDup.EntityID)),
			SourceLocale: normalizeCreateTranslationLocale(contentDup.SourceLocale),
			Locale:       normalizeCreateTranslationLocale(primitives.FirstNonEmptyRaw(contentDup.TargetLocale, locale)),
			FamilyID:     nonNilUUIDPtrString(contentDup.FamilyID),
		}
	}

	var pageDup *cmspages.TranslationAlreadyExistsError
	if errors.As(err, &pageDup) && pageDup != nil {
		return TranslationAlreadyExistsError{
			Panel:        panel,
			EntityID:     primitives.FirstNonEmptyRaw(entityID, nonNilUUIDString(pageDup.EntityID)),
			SourceLocale: normalizeCreateTranslationLocale(pageDup.SourceLocale),
			Locale:       normalizeCreateTranslationLocale(primitives.FirstNonEmptyRaw(pageDup.TargetLocale, locale)),
			FamilyID:     nonNilUUIDPtrString(pageDup.FamilyID),
		}
	}

	if errors.Is(err, cmscontent.ErrTranslationAlreadyExists) || errors.Is(err, cmspages.ErrTranslationAlreadyExists) {
		return TranslationAlreadyExistsError{
			Panel:    panel,
			EntityID: entityID,
			Locale:   locale,
		}
	}

	return err
}

func nonNilUUIDString(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}

func nonNilUUIDPtrString(value *uuid.UUID) string {
	if value == nil || *value == uuid.Nil {
		return ""
	}
	return value.String()
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

func buildGoCMSTranslationProjection(val reflect.Value, locale string) goCMSTranslationProjection {
	translations := gocmsutil.Deref(val.FieldByName("Translations"))
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
		current := gocmsutil.Deref(translations.Index(i))
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
		}
	}
	return goCMSTranslationProjection{
		chosen:           chosen,
		availableLocales: availableLocales,
	}
}

func applyGoCMSTranslationProjection(out *CMSContent, projection goCMSTranslationProjection) {
	if out == nil {
		return
	}
	chosen := projection.chosen
	if chosen.IsValid() {
		if groupID := uuidStringField(chosen, "FamilyID"); groupID != "" {
			out.FamilyID = groupID
		}
		if code := localeCodeFromTranslation(chosen); code != "" {
			out.Locale = code
		}
		out.Title = stringField(chosen, "Title")
		if summary := stringField(chosen, "Summary"); summary != "" {
			out.Data["excerpt"] = summary
		} else if summaryPtr := chosen.FieldByName("Summary"); summaryPtr.IsValid() && summaryPtr.Kind() == reflect.Pointer && !summaryPtr.IsNil() && summaryPtr.Elem().Kind() == reflect.String {
			out.Data["excerpt"] = summaryPtr.Elem().String()
		}
		if contentData := translationContentMap(chosen); len(contentData) > 0 {
			maps.Copy(contentData, out.Data)
			out.Data = contentData
		}
		if out.Title == "" {
			if title := strings.TrimSpace(toString(out.Data["title"])); title != "" {
				out.Title = title
			}
		}
	}
	if len(projection.availableLocales) > 0 {
		out.AvailableLocales = append([]string{}, projection.availableLocales...)
	}
}

func applyGoCMSTranslationLocaleState(out *CMSContent, source reflect.Value, chosen reflect.Value, requestedLocale string) {
	if out == nil {
		return
	}
	requestedLocale = strings.TrimSpace(requestedLocale)
	if requestedLocale == "" {
		requestedLocale = strings.TrimSpace(stringFieldAny(source, "RequestedLocale"))
	}
	out.RequestedLocale = requestedLocale
	resolvedLocale := strings.TrimSpace(stringFieldAny(source, "ResolvedLocale"))
	if resolvedLocale == "" && chosen.IsValid() {
		resolvedLocale = strings.TrimSpace(stringFieldAny(chosen, "ResolvedLocale"))
	}
	if resolvedLocale == "" {
		resolvedLocale = out.Locale
	}
	out.ResolvedLocale = resolvedLocale
	missing := false
	if ok, set := boolFieldAny(source, "MissingRequestedLocale"); set {
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
}

func localeCodeFromTranslation(val reflect.Value) string {
	if code := stringField(val, "Locale"); code != "" {
		return code
	}
	if code := stringField(val, "LocaleCode"); code != "" {
		return code
	}
	localeVal := gocmsutil.Deref(val.FieldByName("Locale"))
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
	contentField = gocmsutil.Deref(contentField)
	if !contentField.IsValid() {
		return nil
	}
	switch contentField.Kind() {
	case reflect.Map:
		if m, ok := contentField.Interface().(map[string]any); ok {
			return primitives.CloneAnyMap(m)
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
