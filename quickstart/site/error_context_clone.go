package site

import (
	"reflect"

	router "github.com/goliatone/go-router"
)

type siteErrorCloneVisit struct {
	kind  reflect.Kind
	type_ reflect.Type
	ptr   uintptr
}

// cloneSiteErrorViewContext recursively isolates mutable presentation
// containers while preserving opaque pointers such as services and request
// capabilities. Providers should project mutable values into maps, slices, or
// arrays before returning them as view data.
func cloneSiteErrorViewContext(input router.ViewContext) router.ViewContext {
	if input == nil {
		return router.ViewContext{}
	}
	cloned := cloneSiteErrorViewValue(reflect.ValueOf(input), map[siteErrorCloneVisit]reflect.Value{})
	if !cloned.IsValid() {
		return router.ViewContext{}
	}
	if out, ok := cloned.Interface().(router.ViewContext); ok && out != nil {
		return out
	}
	return router.ViewContext{}
}

func cloneSiteErrorViewValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	if !value.IsValid() {
		return reflect.Value{}
	}

	switch value.Kind() {
	case reflect.Interface:
		return cloneSiteErrorInterfaceValue(value, seen)

	case reflect.Map:
		return cloneSiteErrorMapValue(value, seen)

	case reflect.Slice:
		return cloneSiteErrorSliceValue(value, seen)

	case reflect.Array:
		return cloneSiteErrorArrayValue(value, seen)

	case reflect.Struct:
		return cloneSiteErrorStructValue(value, seen)

	default:
		return value
	}
}

func cloneSiteErrorInterfaceValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	cloned := cloneSiteErrorViewValue(value.Elem(), seen)
	if !cloned.IsValid() || !cloned.Type().AssignableTo(value.Elem().Type()) {
		return value
	}
	out := reflect.New(value.Type()).Elem()
	out.Set(cloned)
	return out
}

func cloneSiteErrorMapValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	visit := siteErrorCloneVisit{kind: value.Kind(), type_: value.Type(), ptr: value.Pointer()}
	if cloned, ok := seen[visit]; ok {
		return cloned
	}
	out := reflect.MakeMapWithSize(value.Type(), value.Len())
	seen[visit] = out
	iter := value.MapRange()
	for iter.Next() {
		out.SetMapIndex(iter.Key(), cloneSiteErrorViewValue(iter.Value(), seen))
	}
	return out
}

func cloneSiteErrorSliceValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	if value.IsNil() {
		return reflect.Zero(value.Type())
	}
	visit := siteErrorCloneVisit{kind: value.Kind(), type_: value.Type(), ptr: value.Pointer()}
	if cloned, ok := seen[visit]; ok {
		return cloned
	}
	out := reflect.MakeSlice(value.Type(), value.Len(), value.Len())
	seen[visit] = out
	for idx := 0; idx < value.Len(); idx++ {
		out.Index(idx).Set(cloneSiteErrorViewValue(value.Index(idx), seen))
	}
	return out
}

func cloneSiteErrorArrayValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	out := reflect.New(value.Type()).Elem()
	for idx := 0; idx < value.Len(); idx++ {
		out.Index(idx).Set(cloneSiteErrorViewValue(value.Index(idx), seen))
	}
	return out
}

func cloneSiteErrorStructValue(value reflect.Value, seen map[siteErrorCloneVisit]reflect.Value) reflect.Value {
	out := reflect.New(value.Type()).Elem()
	out.Set(value)
	for idx := 0; idx < value.NumField(); idx++ {
		if value.Type().Field(idx).IsExported() {
			out.Field(idx).Set(cloneSiteErrorViewValue(value.Field(idx), seen))
		}
	}
	return out
}
