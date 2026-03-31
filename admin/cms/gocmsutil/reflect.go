package gocmsutil

import (
	"reflect"

	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/google/uuid"
)

func Deref(val reflect.Value) reflect.Value {
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

func ExtractUUID(val reflect.Value, fieldName string) (uuid.UUID, bool) {
	val = Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return uuid.Nil, false
	}
	field := val.FieldByName(fieldName)
	if !field.IsValid() {
		return uuid.Nil, false
	}
	field = Deref(field)
	if !field.IsValid() {
		return uuid.Nil, false
	}
	if parsed, ok := field.Interface().(uuid.UUID); ok {
		return parsed, true
	}
	return uuid.Nil, false
}

func MapFieldAny(val reflect.Value, fieldName string) map[string]any {
	val = Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return nil
	}
	field := val.FieldByName(fieldName)
	if !field.IsValid() {
		return nil
	}
	field = Deref(field)
	if !field.IsValid() {
		return nil
	}
	if typed, ok := field.Interface().(map[string]any); ok {
		return primitives.CloneAnyMap(typed)
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

func SetStringField(val reflect.Value, fieldName string, value string) {
	val = Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	field := val.FieldByName(fieldName)
	if !field.IsValid() || !field.CanSet() || field.Kind() != reflect.String {
		return
	}
	field.SetString(value)
}

func SetMapField(val reflect.Value, fieldName string, value map[string]any) {
	val = Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	field := val.FieldByName(fieldName)
	if !field.IsValid() || !field.CanSet() {
		return
	}
	if field.Kind() == reflect.Map {
		mapped := reflect.ValueOf(value)
		if mapped.IsValid() && mapped.Type().AssignableTo(field.Type()) {
			field.Set(mapped)
		}
		return
	}
	if field.Kind() == reflect.Interface {
		field.Set(reflect.ValueOf(value))
	}
}

func GetIntField(val reflect.Value, name string) (int, bool) {
	val = Deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return 0, false
	}
	field := val.FieldByName(name)
	if field.IsValid() && field.Kind() == reflect.Int {
		return int(field.Int()), true
	}
	return 0, false
}
