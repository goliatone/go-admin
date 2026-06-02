package admin

import "reflect"

// resolveLegacyGoCMSContentTranslations preserves discovery for old go-cms
// containers that expose ContentTranslations() without a typed admin contract.
func resolveLegacyGoCMSContentTranslations(container any) any {
	method := reflect.ValueOf(container).MethodByName("ContentTranslations")
	return reflectNoArgMethodResult(method)
}

func reflectNoArgMethodResult(method reflect.Value) any {
	if !method.IsValid() {
		return nil
	}
	signature := method.Type()
	if signature.NumIn() != 0 || signature.NumOut() < 1 {
		return nil
	}
	results := method.Call(nil)
	if len(results) == 0 {
		return nil
	}
	return reflectInterfaceValue(results[0])
}

func reflectInterfaceValue(result reflect.Value) any {
	if !result.IsValid() {
		return nil
	}
	if result.Kind() == reflect.Pointer || result.Kind() == reflect.Interface {
		if result.IsNil() {
			return nil
		}
	}
	return result.Interface()
}
