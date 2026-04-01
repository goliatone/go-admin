package cmsadapter

import (
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

func BuildGoCMSContentTranslations(content cmsboot.CMSContent) []cmscontent.ContentTranslationInput {
	tr := cmscontent.ContentTranslationInput{
		Locale:  content.Locale,
		Title:   content.Title,
		Content: primitives.CloneAnyMap(content.Data),
	}
	if summary := strings.TrimSpace(AsString(content.Data["excerpt"], "")); summary != "" {
		s := summary
		tr.Summary = &s
	}
	return []cmscontent.ContentTranslationInput{tr}
}

func UUIDFromString(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.Nil
}

func UUIDStringField(val reflect.Value, name string) string {
	val = gocmsutil.Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return ""
	}
	field := val.FieldByName(name)
	if !field.IsValid() {
		return ""
	}
	field = gocmsutil.Deref(field)
	if !field.IsValid() || !field.CanInterface() {
		return ""
	}
	if v, ok := field.Interface().(uuid.UUID); ok && v != uuid.Nil {
		return v.String()
	}
	return ""
}

func StringField(val reflect.Value, field string) string {
	val = gocmsutil.Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return ""
	}
	f := val.FieldByName(field)
	if !f.IsValid() {
		return ""
	}
	f = gocmsutil.Deref(f)
	if !f.IsValid() {
		return ""
	}
	if f.Kind() == reflect.String {
		return f.String()
	}
	return ""
}

func StringFieldAny(val reflect.Value, fields ...string) string {
	for _, field := range fields {
		if out := strings.TrimSpace(StringField(val, field)); out != "" {
			return out
		}
	}
	return ""
}

func BoolField(val reflect.Value, field string) (bool, bool) {
	val = gocmsutil.Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return false, false
	}
	f := val.FieldByName(field)
	if !f.IsValid() {
		return false, false
	}
	f = gocmsutil.Deref(f)
	if !f.IsValid() || f.Kind() != reflect.Bool {
		return false, false
	}
	return f.Bool(), true
}

func BoolFieldAny(val reflect.Value, fields ...string) (bool, bool) {
	for _, field := range fields {
		if out, ok := BoolField(val, field); ok {
			return out, true
		}
	}
	return false, false
}

func StringSliceField(val reflect.Value, field string) []string {
	val = gocmsutil.Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return nil
	}
	f := gocmsutil.Deref(val.FieldByName(field))
	if !f.IsValid() || f.Kind() != reflect.Slice {
		return nil
	}
	out := []string{}
	for i := 0; i < f.Len(); i++ {
		item := gocmsutil.Deref(f.Index(i))
		if !item.IsValid() {
			continue
		}
		if item.Kind() == reflect.String {
			if trimmed := strings.TrimSpace(item.String()); trimmed != "" {
				out = append(out, trimmed)
			}
			continue
		}
		if item.CanInterface() {
			if trimmed := strings.TrimSpace(primitives.StringFromAny(item.Interface())); trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func StringSliceFieldAny(val reflect.Value, fields ...string) []string {
	for _, field := range fields {
		if out := StringSliceField(val, field); len(out) > 0 {
			return out
		}
	}
	return nil
}

func AsString(val any, fallback string) string {
	if val == nil {
		return fallback
	}
	switch v := val.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return fallback
		}
		return v
	case []byte:
		return string(v)
	default:
		return fallback
	}
}
