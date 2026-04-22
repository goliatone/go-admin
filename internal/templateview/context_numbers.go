package templateview

import (
	"math"
	"reflect"
)

// NormalizeContextNumbers converts whole-number float64 values to int64
// recursively across maps/slices to avoid float artifacts in templates.
func NormalizeContextNumbers(value any) any {
	if normalized, ok := normalizeWholeFloat(value); ok {
		return normalized
	}

	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return value
	}

	switch rv.Kind() {
	case reflect.Map:
		normalizeMapNumbers(rv)
	case reflect.Slice:
		normalizeSliceNumbers(rv)
	}

	return value
}

func normalizeWholeFloat(value any) (any, bool) {
	typed, ok := value.(float64)
	if !ok {
		return nil, false
	}
	if typed == math.Trunc(typed) && typed >= math.MinInt64 && typed <= math.MaxInt64 {
		return int64(typed), true
	}
	return typed, true
}

func normalizeMapNumbers(rv reflect.Value) {
	if rv.Type().Key().Kind() != reflect.String {
		return
	}
	for _, key := range rv.MapKeys() {
		normalized := NormalizeContextNumbers(rv.MapIndex(key).Interface())
		if normalizedValue, ok := normalizedValueForType(normalized, rv.Type().Elem()); ok {
			rv.SetMapIndex(key, normalizedValue)
		}
	}
}

func normalizeSliceNumbers(rv reflect.Value) {
	for idx := 0; idx < rv.Len(); idx++ {
		item := rv.Index(idx)
		if !item.CanSet() {
			continue
		}
		normalized := NormalizeContextNumbers(item.Interface())
		if normalizedValue, ok := normalizedValueForType(normalized, item.Type()); ok {
			item.Set(normalizedValue)
		}
	}
}

func normalizedValueForType(value any, target reflect.Type) (reflect.Value, bool) {
	normalizedValue := reflect.ValueOf(value)
	if !normalizedValue.IsValid() {
		return reflect.Value{}, false
	}
	if normalizedValue.Type().AssignableTo(target) {
		return normalizedValue, true
	}
	if normalizedValue.Type().ConvertibleTo(target) {
		return normalizedValue.Convert(target), true
	}
	return reflect.Value{}, false
}
