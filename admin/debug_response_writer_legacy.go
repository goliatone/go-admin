package admin

import (
	"net/http"
	"reflect"
	"unsafe"
)

// debugSwapLegacyResponseWriterField is a bounded compatibility path for
// go-router contexts that expose Response() but not SetResponseWriter.
func debugSwapLegacyResponseWriterField(target any, fieldName string, writer http.ResponseWriter) (http.ResponseWriter, bool) {
	if target == nil {
		return nil, false
	}
	val := reflect.ValueOf(target)
	if val.Kind() != reflect.Pointer || val.IsNil() {
		return nil, false
	}
	elem := val.Elem()
	if elem.Kind() != reflect.Struct {
		return nil, false
	}
	field := elem.FieldByName(fieldName)
	if !field.IsValid() || field.Type() != reflect.TypeFor[http.ResponseWriter]() {
		return nil, false
	}
	// #nosec G103 -- legacy go-router compatibility swaps private response writer fields when no explicit setter exists.
	fieldPtr := reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem()
	current, _ := fieldPtr.Interface().(http.ResponseWriter) //nolint:errcheck // legacy dynamic payload keeps existing zero-value fallback behavior.
	next := reflect.ValueOf(writer)
	if !next.IsValid() {
		next = reflect.Zero(field.Type())
	}
	fieldPtr.Set(next)
	return current, true
}
