package templateview

import (
	"math"
	"reflect"
)

// NormalizeContextNumbers converts whole-number float64 values to int64
// recursively across maps/slices to avoid float artifacts in templates.
func NormalizeContextNumbers(value any) any {
	switch typed := value.(type) {
	case float64:
		if typed == math.Trunc(typed) && typed >= math.MinInt64 && typed <= math.MaxInt64 {
			return int64(typed)
		}
		return typed
	}

	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return value
	}

	switch rv.Kind() {
	case reflect.Map:
		if rv.Type().Key().Kind() != reflect.String {
			return value
		}
		for _, key := range rv.MapKeys() {
			current := rv.MapIndex(key)
			normalized := NormalizeContextNumbers(current.Interface())
			normalizedValue := reflect.ValueOf(normalized)
			if !normalizedValue.IsValid() {
				continue
			}
			if normalizedValue.Type().AssignableTo(rv.Type().Elem()) {
				rv.SetMapIndex(key, normalizedValue)
				continue
			}
			if normalizedValue.Type().ConvertibleTo(rv.Type().Elem()) {
				rv.SetMapIndex(key, normalizedValue.Convert(rv.Type().Elem()))
			}
		}
	case reflect.Slice:
		for idx := 0; idx < rv.Len(); idx++ {
			item := rv.Index(idx)
			normalized := NormalizeContextNumbers(item.Interface())
			if !item.CanSet() {
				continue
			}
			normalizedValue := reflect.ValueOf(normalized)
			if !normalizedValue.IsValid() {
				continue
			}
			if normalizedValue.Type().AssignableTo(item.Type()) {
				item.Set(normalizedValue)
				continue
			}
			if normalizedValue.Type().ConvertibleTo(item.Type()) {
				item.Set(normalizedValue.Convert(item.Type()))
			}
		}
	}

	return value
}
