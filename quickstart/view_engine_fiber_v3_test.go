package quickstart

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"maps"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"

	p6 "github.com/flosch/pongo2/v6"
	p7 "github.com/flosch/pongo2/v7"
	fiber2 "github.com/gofiber/fiber/v2"
	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	csrf "github.com/goliatone/go-auth/middleware/csrf"
	"github.com/goliatone/go-featuregate/gate"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
	router "github.com/goliatone/go-router"
)

type viewPortContextKey struct{}

type viewPortGate struct {
	ctx   context.Context
	chain gate.ScopeChain
	calls int
}

func (g *viewPortGate) Enabled(ctx context.Context, key string, opts ...gate.ResolveOption) (bool, error) {
	g.ctx = ctx
	g.calls++
	var req gate.ResolveRequest
	for _, opt := range opts {
		opt(&req)
	}
	if req.ScopeChain != nil {
		g.chain = *req.ScopeChain
	}
	if err := ctx.Err(); err != nil {
		return false, err
	}
	return key == "visible", nil
}

func (g *viewPortGate) ResolveWithTrace(ctx context.Context, key string, opts ...gate.ResolveOption) (bool, gate.ResolveTrace, error) {
	value, err := g.Enabled(ctx, key, opts...)
	return value, gate.ResolveTrace{Value: value}, err
}

func TestFiberV3TemplateContextHelperPorts(t *testing.T) {
	featureGate := &viewPortGate{}
	opts := []TemplateFuncOption{WithTemplateFeatureGate(featureGate,
		fgtemplates.WithContextKey("request_ctx"), fgtemplates.WithScopeKey("request_scope"), fgtemplates.WithSnapshotKey("request_snapshot"))}
	legacy, modern := DefaultTemplateFuncs(opts...), DefaultFiberV3TemplateFuncs(opts...)
	ctx, cancel := context.WithCancel(context.WithValue(context.Background(), viewPortContextKey{}, "actor"))
	defer cancel()
	chain := gate.ScopeChain{{Kind: gate.ScopeTenant, ID: "tenant"}}
	data := map[string]any{"request_ctx": ctx, "request_scope": chain,
		csrf.DefaultTemplateHelpersKey: map[string]any{"csrf_token": "token", "csrf_field": "field", "csrf_meta": "meta", "csrf_header_name": "X-Test-CSRF"}}
	oldCtx := &p6.ExecutionContext{Public: p6.Context(data)}
	newCtx := &p7.ExecutionContext{Public: p7.Context(data)}
	for _, test := range []struct {
		name string
		args []any
	}{
		{"feature", []any{"visible"}}, {"feature", []any{"denied"}},
		{"feature_any", []any{"denied", "visible"}}, {"feature_all", []any{"visible", "denied"}},
		{"feature_none", []any{"denied"}}, {"feature_if", []any{"visible", "on", "off"}},
		{"feature_class", []any{"denied", "on", "off"}}, {"feature_trace", []any{"visible"}},
		{"csrf_token", nil}, {"csrf_field", nil}, {"csrf_meta", nil}, {"csrf_header_name", nil},
	} {
		args := func(exec any) []reflect.Value {
			values := []reflect.Value{reflect.ValueOf(exec)}
			for _, arg := range test.args {
				values = append(values, reflect.ValueOf(arg))
			}
			return values
		}
		old := reflect.ValueOf(legacy[test.name]).Call(args(oldCtx))[0].Interface()
		modernValue := reflect.ValueOf(modern[test.name]).Call(args(newCtx))[0].Interface()
		if !reflect.DeepEqual(old, modernValue) {
			t.Errorf("%s: v2=%#v v3=%#v", test.name, old, modernValue)
		}
	}
	if featureGate.ctx != ctx || featureGate.ctx.Value(viewPortContextKey{}) != "actor" || !reflect.DeepEqual(featureGate.chain, chain) {
		t.Fatalf("request context/scope lost: ctx=%v chain=%v", featureGate.ctx, featureGate.chain)
	}
	feature, ok := modern["feature"].(func(*p7.ExecutionContext, any) bool)
	if !ok {
		t.Fatalf("unexpected feature helper type %T", modern["feature"])
	}
	before := featureGate.calls
	newCtx.Public["request_snapshot"] = p7.AsValue(map[string]bool{"snapshot": true})
	if !feature(newCtx, "snapshot") || featureGate.calls != before {
		t.Fatal("v7 snapshot was not used before the gate")
	}
	delete(newCtx.Public, "request_snapshot")
	cancel()
	if feature(newCtx, "visible") || featureGate.ctx.Err() != context.Canceled {
		t.Fatal("request cancellation was lost")
	}
}

func TestFiberV3ViewRealTemplateParity(t *testing.T) {
	host := fstest.MapFS{
		"partials/breadcrumbs.html": {Data: []byte(`<nav data-port-overlay>breadcrumbs</nav>`)},
		"compat/helpers.html":       {Data: []byte(`{{ payload|tojson }}|{{ toJSON(payload) }}|{{ csrf_token }}|{{ csrf_field|safe }}|{{ safeHTML(input) }}|{{ renderIcon("users")|safe }}|{{ adminURL("login") }}|{{ singularize("users") }}|{{ translate("menu.home") }}|{{ translate_count("items.count", 2) }}|{% if feature("visible") %}visible{% endif %}{% if feature("denied") %}bad{% else %}denied{% endif %}|{{ feature_if("visible", "on", "off") }}|{{ feature_class("denied", "on", "off") }}`)},
	}
	for _, reload := range []bool{false, true} {
		t.Run(fmt.Sprint(reload), func(t *testing.T) {
			opts := []ViewEngineOption{WithViewReload(reload), WithViewBasePath("/admin"), WithViewTemplatesFS(host),
				WithViewTranslator(templateTranslatorStub{values: map[string]string{"en:menu.home": "Home"}, countValues: map[string]string{"en:items.count:2": "2 items"}}), WithViewDefaultLocale("en")}
			legacy, err := NewViewEngine(client.Templates(), opts...)
			if err != nil {
				t.Fatal(err)
			}
			modern, err := NewFiberV3ViewEngine(client.Templates(), opts...)
			if err != nil {
				t.Fatal(err)
			}
			for _, page := range []string{"login", "resources/users/list", "resources/translations/shell", "resources/activity/list", "resources/feature-flags/index", "resources/media/list", "compat/helpers"} {
				for _, enabled := range []bool{false, true} {
					data := structuralSurfaceRenderContext(admin.DefaultAdminStructuralPartials())
					data["input"] = `<script>alert("unsafe")</script>`
					data["payload"] = map[string]any{"unsafe": data["input"], "enabled": enabled}
					if enabled {
						data["items"] = []map[string]any{{"id": "user-1", "name": data["input"], "email": "user@example.test", "role": "member", "status": "active"}}
						data["columns"] = []map[string]any{{"field": "name", "label": "<Name>", "sortable": true, "filterable": true}, {"field": "role", "label": "Role", "filterable": true}}
						data["can_edit"] = true
					}
					data[fgtemplates.TemplateSnapshotKey] = map[string]bool{"visible": true, "denied": false, "users.signup": enabled, "users.password_reset": enabled}
					data["register_path"] = "/admin/register"
					data["sso_providers"] = []map[string]any{{"key": "okta", "label": "Okta", "login_url": "/admin/auth/sso/okta"}}
					data[csrf.DefaultTemplateHelpersKey] = map[string]any{"csrf_token": "token<unsafe>", "csrf_field": `<input type="hidden" name="csrf" value="token">`}
					for range 2 {
						var old, current bytes.Buffer
						if err := legacy.Render(&old, page, maps.Clone(data)); err != nil {
							t.Fatalf("v2 %s: %v", page, err)
						}
						if err := modern.Render(&current, page, maps.Clone(data)); err != nil {
							t.Fatalf("v3 %s: %v", page, err)
						}
						if old.String() != current.String() {
							t.Fatalf("%s enabled=%t differs\nv2: %s\nv3: %s", page, enabled, old.String(), current.String())
						}
						if strings.Contains(current.String(), `<script>alert("unsafe")</script>`) {
							t.Fatalf("%s emitted unsafe input", page)
						}
					}
				}
			}
			// Preserve the legacy null fallback for nil and non-JSON values.
			for _, payload := range []any{nil, make(chan int)} {
				data := map[string]any{"payload": payload, "input": ""}
				for _, views := range []router.Views{legacy, modern} {
					var out bytes.Buffer
					if err := views.Render(&out, "compat/helpers", data); err != nil || !strings.HasPrefix(out.String(), "null|null|") {
						t.Fatalf("null fallback: %q %v", out.String(), err)
					}
				}
			}
		})
	}
}

func TestFiberV3ViewHelperOverridesAndHTTPParity(t *testing.T) {
	if views, err := NewFiberV3ViewEngine(nil); err == nil || views != nil {
		t.Fatal("missing filesystem accepted")
	}
	fsys := fstest.MapFS{"page.html": {Data: []byte(`{{ echo(input) }}|{{ csrf_field|safe }}|{{ payload|tojson }}`)}}
	shared := map[string]any{"echo": func(v *p6.Value) *p6.Value { return v }}
	opts := []ViewEngineOption{WithViewReload(true), WithViewTemplateFuncs(MergeTemplateFuncs(shared)),
		WithViewFiberV3TemplateFuncs(map[string]any{"echo": func(v *p7.Value) *p7.Value { return v }})}
	legacy, err := NewViewEngine(fsys, opts...)
	if err != nil {
		t.Fatal(err)
	}
	modern, err := NewFiberV3ViewEngine(fsys, opts...)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := shared["echo"].(func(*p6.Value) *p6.Value); !ok {
		t.Fatal("legacy helper map changed")
	}
	handler := func(c router.Context) error {
		c.Locals("input", "wrong local")
		c.Locals(csrf.DefaultTemplateHelpersKey, map[string]any{"csrf_field": `<input name="csrf" value="token">`})
		return RenderTemplateView(c, "page", router.ViewContext{"input": "<x>", "payload": map[string]any{"enabled": true}})
	}
	oldServer := router.NewFiberAdapter(func(*fiber2.App) *fiber2.App {
		return fiber2.New(fiber2.Config{Views: legacy, PassLocalsToViews: true})
	})
	oldServer.Router().Get("/page", handler)
	newServer := router.NewFiberV3Adapter(func(*fiber3.App) *fiber3.App {
		return fiber3.New(fiber3.Config{Views: modern, PassLocalsToViews: true})
	})
	newServer.Router().Get("/page", handler)
	oldResp, err := oldServer.WrappedRouter().Test(httptest.NewRequestWithContext(t.Context(), "GET", "/page", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer closeResponseBody(t, oldResp)
	newResp, err := newServer.WrappedRouter().Test(httptest.NewRequestWithContext(t.Context(), "GET", "/page", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer closeResponseBody(t, newResp)
	oldBody, err := io.ReadAll(oldResp.Body)
	if err != nil {
		t.Fatal(err)
	}
	newBody, err := io.ReadAll(newResp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if oldResp.StatusCode != http.StatusOK || newResp.StatusCode != http.StatusOK || oldResp.Header.Get("Content-Type") != newResp.Header.Get("Content-Type") || !bytes.Equal(oldBody, newBody) || !strings.HasPrefix(string(newBody), `&lt;x&gt;|<input name="csrf" value="token">|`) {
		t.Fatalf("HTTP parity: v2=%d %q v3=%d %q", oldResp.StatusCode, oldBody, newResp.StatusCode, newBody)
	}
}
