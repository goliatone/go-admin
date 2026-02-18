package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"reflect"

	"github.com/google/uuid"
)

func deref(val reflect.Value) reflect.Value {
	for val.IsValid() {
		switch val.Kind() {
		case reflect.Interface, reflect.Pointer:
			if val.IsNil() {
				return reflect.Value{}
			}
			val = val.Elem()
		default:
			return val
		}
	}
	return val
}

func extractUUID(val reflect.Value, fieldName string) (uuid.UUID, bool) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return uuid.Nil, false
	}
	f := val.FieldByName(fieldName)
	if !f.IsValid() {
		return uuid.Nil, false
	}
	f = deref(f)
	if !f.IsValid() {
		return uuid.Nil, false
	}
	if u, ok := f.Interface().(uuid.UUID); ok {
		return u, true
	}
	return uuid.Nil, false
}

func mapFieldAny(val reflect.Value, fieldName string) map[string]any {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return nil
	}
	field := val.FieldByName(fieldName)
	if !field.IsValid() {
		return nil
	}
	field = deref(field)
	if !field.IsValid() {
		return nil
	}
	if m, ok := field.Interface().(map[string]any); ok {
		return primitives.CloneAnyMap(m)
	}
	if field.Kind() == reflect.Map && field.Type().Key().Kind() == reflect.String {
		out := map[string]any{}
		iter := field.MapRange()
		for iter.Next() {
			out[iter.Key().String()] = iter.Value().Interface()
		}
		return out
	}
	return nil
}

func setStringField(val reflect.Value, fieldName string, value string) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	f := val.FieldByName(fieldName)
	if !f.IsValid() || !f.CanSet() || f.Kind() != reflect.String {
		return
	}
	f.SetString(value)
}

func setStringPtr(field reflect.Value, value string) {
	if !field.IsValid() || !field.CanSet() {
		return
	}
	switch field.Kind() {
	case reflect.String:
		field.SetString(value)
		return
	case reflect.Pointer:
		if field.Type().Elem().Kind() != reflect.String {
			return
		}
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().SetString(value)
		field.Set(ptr)
	}
}

func setUUIDPtr(field reflect.Value, id *uuid.UUID) {
	if !field.IsValid() || !field.CanSet() || field.Kind() != reflect.Pointer {
		return
	}
	if id == nil {
		field.Set(reflect.Zero(field.Type()))
		return
	}
	if field.Type().Elem() != reflect.TypeOf(uuid.UUID{}) {
		return
	}
	ptr := reflect.New(field.Type().Elem())
	ptr.Elem().Set(reflect.ValueOf(*id))
	field.Set(ptr)
}

func setMapField(val reflect.Value, fieldName string, value map[string]any) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	f := val.FieldByName(fieldName)
	if !f.IsValid() || !f.CanSet() {
		return
	}
	if f.Kind() == reflect.Map {
		v := reflect.ValueOf(value)
		if v.IsValid() && v.Type().AssignableTo(f.Type()) {
			f.Set(v)
		}
		return
	}
	if f.Kind() == reflect.Interface {
		f.Set(reflect.ValueOf(value))
	}
}

func getIntField(val reflect.Value, name string) (int, bool) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return 0, false
	}
	f := val.FieldByName(name)
	if f.IsValid() && f.Kind() == reflect.Int {
		return int(f.Int()), true
	}
	return 0, false
}
