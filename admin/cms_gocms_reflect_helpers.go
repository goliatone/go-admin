package admin

import (
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

func extractError(results []reflect.Value) error {
	if len(results) == 0 {
		return nil
	}
	// Most go-cms methods return (T, error) or just error.
	last := results[len(results)-1]
	if last.IsValid() {
		if err, ok := last.Interface().(error); ok && err != nil {
			return err
		}
	}
	for _, res := range results {
		if !res.IsValid() {
			continue
		}
		if err, ok := res.Interface().(error); ok && err != nil {
			return err
		}
	}
	return nil
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

func setUUIDField(val reflect.Value, fieldName string, id uuid.UUID) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	f := val.FieldByName(fieldName)
	setUUIDValue(f, id)
}

func setUUIDValue(field reflect.Value, id uuid.UUID) {
	if !field.IsValid() || !field.CanSet() {
		return
	}
	switch field.Kind() {
	case reflect.Array:
		if field.Type() == reflect.TypeOf(uuid.UUID{}) {
			field.Set(reflect.ValueOf(id))
		}
	case reflect.Struct:
		if field.Type() == reflect.TypeOf(uuid.UUID{}) {
			field.Set(reflect.ValueOf(id))
		}
	case reflect.Pointer:
		if field.Type().Elem() == reflect.TypeOf(uuid.UUID{}) {
			ptr := reflect.New(field.Type().Elem())
			ptr.Elem().Set(reflect.ValueOf(id))
			field.Set(ptr)
		}
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

func setIntField(val reflect.Value, fieldName string, value int) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	f := val.FieldByName(fieldName)
	if !f.IsValid() || !f.CanSet() || f.Kind() != reflect.Int {
		return
	}
	f.SetInt(int64(value))
}

func setIntPtr(field reflect.Value, value int) {
	if !field.IsValid() || !field.CanSet() {
		return
	}
	switch field.Kind() {
	case reflect.Pointer:
		if field.Type().Elem().Kind() != reflect.Int {
			return
		}
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().SetInt(int64(value))
		field.Set(ptr)
	}
}

func setBoolField(val reflect.Value, fieldName string, value bool) {
	val = deref(val)
	if !val.IsValid() || val.Kind() != reflect.Struct {
		return
	}
	f := val.FieldByName(fieldName)
	if !f.IsValid() || !f.CanSet() || f.Kind() != reflect.Bool {
		return
	}
	f.SetBool(value)
}

func setBoolPtr(field reflect.Value, value bool) {
	if !field.IsValid() || !field.CanSet() {
		return
	}
	switch field.Kind() {
	case reflect.Pointer:
		if field.Type().Elem().Kind() != reflect.Bool {
			return
		}
		ptr := reflect.New(field.Type().Elem())
		ptr.Elem().SetBool(value)
		field.Set(ptr)
	}
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
