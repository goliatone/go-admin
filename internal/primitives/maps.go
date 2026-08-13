package primitives

import (
	"maps"
	"reflect"
)

// CloneAnyMap returns a shallow copy and preserves nil-vs-empty input.
func CloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

// CloneAnyMapDeep recursively clones maps, slices, arrays, pointers, and
// interfaces reachable from an arbitrary-value map. It preserves concrete
// container types and nil-vs-empty values. This is intended for detached
// callback inputs whose metadata may contain nested mutable values.
func CloneAnyMapDeep(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	cloned := cloneMutableValue(reflect.ValueOf(in), make(map[cloneVisit]reflect.Value))
	var out map[string]any
	reflect.ValueOf(&out).Elem().Set(cloned)
	return out
}

type cloneVisit struct {
	typ reflect.Type
	ptr uintptr
}

func cloneMutableValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	if !value.IsValid() {
		return value
	}
	switch value.Kind() {
	case reflect.Interface:
		return cloneInterfaceValue(value, seen)
	case reflect.Map:
		return cloneMapValue(value, seen)
	case reflect.Slice:
		return cloneSliceValue(value, seen)
	case reflect.Array:
		return cloneArrayValue(value, seen)
	case reflect.Pointer:
		return clonePointerValue(value, seen)
	case reflect.Struct:
		return cloneStructValue(value, seen)
	default:
		return value
	}
}

func cloneInterfaceValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	cloned := cloneMutableValue(value.Elem(), seen)
	out := reflect.New(value.Type()).Elem()
	out.Set(cloned)
	return out
}

func cloneMapValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	visit := cloneVisit{typ: value.Type(), ptr: value.Pointer()}
	if cloned, ok := seen[visit]; ok {
		return cloned
	}
	out := reflect.MakeMapWithSize(value.Type(), value.Len())
	seen[visit] = out
	iterator := value.MapRange()
	for iterator.Next() {
		out.SetMapIndex(iterator.Key(), cloneMutableValue(iterator.Value(), seen))
	}
	return out
}

func cloneSliceValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	visit := cloneVisit{typ: value.Type(), ptr: value.Pointer()}
	if cloned, ok := seen[visit]; ok {
		return cloned
	}
	out := reflect.MakeSlice(value.Type(), value.Len(), value.Cap())
	seen[visit] = out
	for index := range value.Len() {
		out.Index(index).Set(cloneMutableValue(value.Index(index), seen))
	}
	return out
}

func cloneArrayValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	out := reflect.New(value.Type()).Elem()
	for index := range value.Len() {
		out.Index(index).Set(cloneMutableValue(value.Index(index), seen))
	}
	return out
}

func clonePointerValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	visit := cloneVisit{typ: value.Type(), ptr: value.Pointer()}
	if cloned, ok := seen[visit]; ok {
		return cloned
	}
	out := reflect.New(value.Type().Elem())
	seen[visit] = out
	out.Elem().Set(cloneMutableValue(value.Elem(), seen))
	return out
}

func cloneStructValue(value reflect.Value, seen map[cloneVisit]reflect.Value) reflect.Value {
	out := reflect.New(value.Type()).Elem()
	out.Set(value)
	for index := range value.NumField() {
		if !out.Field(index).CanSet() || !value.Field(index).CanInterface() {
			continue
		}
		out.Field(index).Set(cloneMutableValue(value.Field(index), seen))
	}
	return out
}

// CloneAnyMapNilOnEmpty returns nil when input is nil or empty.
func CloneAnyMapNilOnEmpty(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

// CloneAnyMapEmptyOnEmpty returns an empty map when input is nil or empty.
func CloneAnyMapEmptyOnEmpty(in map[string]any) map[string]any {
	if len(in) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

// CloneStringMap returns a shallow copy and preserves nil-vs-empty input.
func CloneStringMap(in map[string]string) map[string]string {
	if in == nil {
		return nil
	}
	out := make(map[string]string, len(in))
	maps.Copy(out, in)
	return out
}

// CloneStringMapNilOnEmpty returns nil when input is nil or empty.
func CloneStringMapNilOnEmpty(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	maps.Copy(out, in)
	return out
}

// CloneStringMapEmptyOnEmpty returns an empty map when input is nil or empty.
func CloneStringMapEmptyOnEmpty(in map[string]string) map[string]string {
	if len(in) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(in))
	maps.Copy(out, in)
	return out
}
