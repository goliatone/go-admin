package quickstart

import (
	p6 "github.com/flosch/pongo2/v6"
	p7 "github.com/flosch/pongo2/v7"
)

// DefaultFiberV3TemplateFuncs preserves the default template helper names and
// behavior while accepting v7 execution contexts for feature and CSRF helpers.
func DefaultFiberV3TemplateFuncs(opts ...TemplateFuncOption) map[string]any {
	return fiberV3TemplateFuncs(DefaultTemplateFuncs(opts...))
}

func fiberV3TemplateFuncs(shared map[string]any) map[string]any {
	funcs := make(map[string]any, len(shared))
	for name, helper := range shared {
		funcs[name] = fiberV3ContextHelper(helper)
	}
	return funcs
}

// Port the known read-only helper signatures, reusing upstream gate, scope,
// snapshot, logging and CSRF policies. This never executes a v6 template/parser
// or passes a boxed v6 value into the v7 evaluator.
func fiberV3ContextHelper(helper any) any {
	switch fn := helper.(type) {
	case func(*p6.ExecutionContext) string:
		return func(ctx *p7.ExecutionContext) string {
			return fn(fiberV3HelperData(ctx))
		}
	case func(*p6.ExecutionContext, any) bool:
		return func(ctx *p7.ExecutionContext, key any) bool {
			return fn(fiberV3HelperData(ctx), key)
		}
	case func(*p6.ExecutionContext, ...any) bool:
		return func(ctx *p7.ExecutionContext, keys ...any) bool {
			return fn(fiberV3HelperData(ctx), keys...)
		}
	case func(*p6.ExecutionContext, any, any, ...any) any:
		return func(ctx *p7.ExecutionContext, key, on any, off ...any) any {
			return fn(fiberV3HelperData(ctx), key, on, off...)
		}
	case func(*p6.ExecutionContext, any) any:
		return func(ctx *p7.ExecutionContext, key any) any {
			return fn(fiberV3HelperData(ctx), key)
		}
	default:
		return helper
	}
}

func fiberV3HelperData(ctx *p7.ExecutionContext) *p6.ExecutionContext {
	if ctx == nil {
		return nil
	}
	data := make(p6.Context, len(ctx.Public))
	for key, value := range ctx.Public {
		if boxed, ok := value.(*p7.Value); ok && boxed != nil {
			value = boxed.Interface()
		}
		data[key] = value
	}
	return &p6.ExecutionContext{Public: data, Autoescape: ctx.Autoescape}
}
