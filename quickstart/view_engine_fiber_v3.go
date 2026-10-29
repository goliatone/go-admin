package quickstart

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"maps"
	"reflect"

	pongo2 "github.com/flosch/pongo2/v7"
	fiber3 "github.com/gofiber/fiber/v3"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// NewFiberV3ViewEngine builds explicit v3 views with the same template and asset
// stack as NewViewEngine. The unqualified constructor continues using v2.
func NewFiberV3ViewEngine(baseFS fs.FS, opts ...ViewEngineOption) (fiber3.Views, error) {
	cfg, err := newViewEngineConfig(baseFS, opts...)
	if err != nil {
		return nil, err
	}
	config := &fiberV3ViewEngineConfig{cfg}
	views, err := router.InitializeFiberV3ViewEngine(config)
	if err != nil {
		return nil, err
	}
	native, ok := views.(fiberV3Views)
	if !ok {
		return nil, fmt.Errorf("fiber v3 view engine %T lacks required extensions", views)
	}
	return &fiberV3ViewEngine{
		fiberV3Views: native,
		helpers:      config.GetFiberV3TemplateFunctions(),
	}, nil
}

// WithViewFiberV3TemplateFuncs supplies v7 ports of application helpers. Overrides
// apply only to NewFiberV3ViewEngine and never alter the shared v2 function map.
func WithViewFiberV3TemplateFuncs(funcs map[string]any) ViewEngineOption {
	return func(opts *viewEngineOptions) {
		if opts != nil {
			opts.fiberV3TemplateFuncs = funcs
		}
	}
}

type fiberV3ViewEngineConfig struct{ *viewEngineConfig }

var _ router.FiberV3ViewConfig = (*fiberV3ViewEngineConfig)(nil)
var _ router.FiberV3ViewFunctionsProvider = (*fiberV3ViewEngineConfig)(nil)

func (c *fiberV3ViewEngineConfig) GetFiberV3TemplateFunctions() map[string]any {
	funcs := fiberV3TemplateFuncs(c.templateFuncs)
	maps.Copy(funcs, c.fiberV3TemplateFuncs)
	return funcs
}

func (*fiberV3ViewEngineConfig) ConfigureFiberV3Views(ext router.FiberV3ViewExtensions) error {
	return ext.RegisterFilter("tojson", func(in, _ *pongo2.Value) (*pongo2.Value, error) {
		if in == nil {
			return pongo2.AsValue("null"), nil
		}
		return pongo2.AsValue(templateJSONString(in.Interface())), nil
	})
}

type fiberV3Views interface {
	fiber3.Views
	router.FiberV3ViewExtensions
	SetAutoEscape(bool)
}

type fiberV3ViewEngine struct {
	fiberV3Views
	helpers map[string]any
}

func (e *fiberV3ViewEngine) Render(out io.Writer, name string, binding any, layouts ...string) error {
	value := reflect.ValueOf(binding)
	if !value.IsValid() || value.Kind() != reflect.Map || value.Type().Key().Kind() != reflect.String {
		return e.fiberV3Views.Render(out, name, binding, layouts...)
	}
	metadata := make(map[string]any)
	for _, key := range value.MapKeys() {
		request := value.MapIndex(key).Interface()
		if boxed, ok := request.(*pongo2.Value); ok && boxed != nil {
			request = boxed.Interface()
		}
		switch request.(type) {
		case context.Context, interface{ Context() context.Context }, auth.AuthClaims:
			metadata[key.String()] = request
		}
	}
	if len(metadata) == 0 {
		return e.fiberV3Views.Render(out, name, binding, layouts...)
	}
	// Request context and authentication claims are helper metadata. Templates
	// consume the plain session_user projection instead of raw claims. Retain them in
	// per-render closures so the v7 value boundary never exposes its dynamic
	// Value method to templates. The caller map and concurrent renders are separate.
	data := make(map[string]any, value.Len()+len(e.helpers))
	for _, mapKey := range value.MapKeys() {
		if _, private := metadata[mapKey.String()]; !private {
			data[mapKey.String()] = value.MapIndex(mapKey).Interface()
		}
	}
	for helperName, helper := range e.helpers {
		if _, bound := data[helperName]; !bound {
			data[helperName] = bindFiberV3HelperContext(helper, metadata)
		}
	}
	return e.fiberV3Views.Render(out, name, data, layouts...)
}

func bindFiberV3HelperContext(helper any, metadata map[string]any) any {
	fn := reflect.ValueOf(helper)
	if !fn.IsValid() || fn.Kind() != reflect.Func || fn.Type().NumIn() == 0 || fn.Type().In(0) != reflect.TypeFor[*pongo2.ExecutionContext]() {
		return helper
	}
	return reflect.MakeFunc(fn.Type(), func(args []reflect.Value) []reflect.Value {
		ctx, ok := args[0].Interface().(*pongo2.ExecutionContext)
		if !ok {
			panic("fiber v3 helper execution context does not match its validated signature")
		}
		copy := *ctx
		copy.Public = maps.Clone(ctx.Public)
		maps.Copy(copy.Public, metadata)
		args[0] = reflect.ValueOf(&copy)
		if fn.Type().IsVariadic() {
			return fn.CallSlice(args)
		}
		return fn.Call(args)
	}).Interface()
}
