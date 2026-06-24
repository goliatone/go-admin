package admin

import (
	"encoding/json"
	"errors"
	"maps"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"github.com/goliatone/go-admin/internal/primitives"

	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	"github.com/google/uuid"
)

type goCMSTranslationProjection struct {
	chosen           reflect.Value
	availableLocales []string
}

type goCMSTranslationVariant struct {
	translation      reflect.Value
	locale           string
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

func buildGoCMSTranslationProjection(val reflect.Value, locale string) goCMSTranslationProjection {
	translations := gocmsutil.Deref(val.FieldByName("Translations"))
	availableLocales := cmsadapter.StringSliceFieldAny(val, "AvailableLocales", "Locales")
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
	applyGoCMSTranslationChoice(out, projection.chosen, "")
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
		requestedLocale = strings.TrimSpace(cmsadapter.StringFieldAny(source, "RequestedLocale"))
	}
	out.RequestedLocale = requestedLocale
	resolvedLocale := strings.TrimSpace(cmsadapter.StringFieldAny(source, "ResolvedLocale"))
	if resolvedLocale == "" && chosen.IsValid() {
		resolvedLocale = strings.TrimSpace(cmsadapter.StringFieldAny(chosen, "ResolvedLocale"))
	}
	if resolvedLocale == "" {
		resolvedLocale = out.Locale
	}
	out.ResolvedLocale = resolvedLocale
	missing := false
	if ok, set := cmsadapter.BoolFieldAny(source, "MissingRequestedLocale"); set {
		missing = ok
	} else if requestedLocale != "" && !isTranslationLocaleWildcard(requestedLocale) {
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

func buildGoCMSTranslationVariants(val reflect.Value) []goCMSTranslationVariant {
	translations := gocmsutil.Deref(val.FieldByName("Translations"))
	if !translations.IsValid() {
		return nil
	}
	availableLocales := cmsadapter.StringSliceFieldAny(val, "AvailableLocales", "Locales")
	seenLocales := map[string]bool{}
	for _, code := range availableLocales {
		if trimmed := strings.ToLower(strings.TrimSpace(code)); trimmed != "" {
			seenLocales[trimmed] = true
		}
	}
	for i := 0; translations.IsValid() && i < translations.Len(); i++ {
		current := gocmsutil.Deref(translations.Index(i))
		rawCode := strings.TrimSpace(localeCodeFromTranslation(current))
		if rawCode == "" {
			continue
		}
		code := strings.ToLower(rawCode)
		if !seenLocales[code] {
			availableLocales = append(availableLocales, rawCode)
			seenLocales[code] = true
		}
	}
	out := make([]goCMSTranslationVariant, 0, translations.Len())
	for i := 0; i < translations.Len(); i++ {
		current := gocmsutil.Deref(translations.Index(i))
		rawCode := strings.TrimSpace(localeCodeFromTranslation(current))
		if rawCode == "" {
			continue
		}
		out = append(out, goCMSTranslationVariant{
			translation:      current,
			locale:           rawCode,
			availableLocales: append([]string{}, availableLocales...),
		})
	}
	return out
}

func applyGoCMSTranslationVariant(out *CMSContent, variant goCMSTranslationVariant) {
	if out == nil {
		return
	}
	applyGoCMSTranslationChoice(out, variant.translation, variant.locale)
	if len(variant.availableLocales) > 0 {
		out.AvailableLocales = append([]string{}, variant.availableLocales...)
	}
}

func applyGoCMSTranslationChoice(out *CMSContent, chosen reflect.Value, locale string) {
	if out == nil || !chosen.IsValid() {
		return
	}
	if groupID := cmsadapter.UUIDStringField(chosen, "FamilyID"); groupID != "" {
		out.FamilyID = groupID
	}
	locale = strings.TrimSpace(locale)
	if locale != "" {
		out.Locale = locale
	} else if code := localeCodeFromTranslation(chosen); code != "" {
		out.Locale = code
	}
	out.Title = cmsadapter.StringField(chosen, "Title")
	applyGoCMSTranslationSummary(out, chosen)
	if contentData := translationContentMap(chosen); len(contentData) > 0 {
		merged := map[string]any{}
		maps.Copy(merged, out.Data)
		maps.Copy(merged, contentData)
		out.Data = merged
	}
	if out.Title == "" {
		if title := strings.TrimSpace(toString(out.Data["title"])); title != "" {
			out.Title = title
		}
	}
}

func applyGoCMSTranslationSummary(out *CMSContent, chosen reflect.Value) {
	if out == nil || !chosen.IsValid() {
		return
	}
	if summary := cmsadapter.StringField(chosen, "Summary"); summary != "" {
		out.Data["excerpt"] = summary
		return
	}
	summaryPtr := chosen.FieldByName("Summary")
	if summaryPtr.IsValid() && summaryPtr.Kind() == reflect.Pointer && !summaryPtr.IsNil() && summaryPtr.Elem().Kind() == reflect.String {
		out.Data["excerpt"] = summaryPtr.Elem().String()
	}
}

func localeCodeFromTranslation(val reflect.Value) string {
	if code := cmsadapter.StringField(val, "Locale"); code != "" {
		return code
	}
	if code := cmsadapter.StringField(val, "LocaleCode"); code != "" {
		return code
	}
	localeVal := gocmsutil.Deref(val.FieldByName("Locale"))
	if localeVal.IsValid() {
		if code := cmsadapter.StringField(localeVal, "Code"); code != "" {
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

func translationMetadataMap(val reflect.Value) map[string]any {
	if !val.IsValid() {
		return nil
	}
	val = gocmsutil.Deref(val)
	if !val.IsValid() {
		return nil
	}
	metadataField := val.FieldByName("Metadata")
	if !metadataField.IsValid() {
		return nil
	}
	metadataField = gocmsutil.Deref(metadataField)
	if !metadataField.IsValid() {
		return nil
	}
	switch metadataField.Kind() {
	case reflect.Map:
		if m, ok := metadataField.Interface().(map[string]any); ok {
			return primitives.CloneAnyMap(m)
		}
		if metadataField.Type().Key().Kind() == reflect.String {
			out := map[string]any{}
			iter := metadataField.MapRange()
			for iter.Next() {
				out[iter.Key().String()] = iter.Value().Interface()
			}
			return out
		}
	}
	return nil
}
