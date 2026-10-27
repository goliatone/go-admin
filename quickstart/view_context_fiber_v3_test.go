package quickstart

import (
	"bytes"
	"context"
	"fmt"
	"sync"
	"testing"
	"testing/fstest"

	p6 "github.com/flosch/pongo2/v6"
	p7 "github.com/flosch/pongo2/v7"
	"github.com/goliatone/go-featuregate/gate"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
	router "github.com/goliatone/go-router"
)

type viewIsolationGate struct{}

func (viewIsolationGate) Enabled(ctx context.Context, key string, opts ...gate.ResolveOption) (bool, error) {
	var req gate.ResolveRequest
	for _, opt := range opts {
		opt(&req)
	}
	return ctx.Err() == nil && ctx.Value(viewPortContextKey{}) == key && req.ScopeChain != nil && len(*req.ScopeChain) == 1 && (*req.ScopeChain)[0].ID == key, nil
}

func TestFiberV3ViewRequestContextParityAndIsolation(t *testing.T) {
	fsys := fstest.MapFS{"page.html": {Data: []byte(`{% if feature(actor) %}allowed{% else %}denied{% endif %}|{{ actorName() }}`)}}
	shared := MergeTemplateFuncs(map[string]any{
		"actorName": func(ctx *p6.ExecutionContext) string {
			requestCtx, ok := ctx.Public["request_ctx"].(context.Context)
			if !ok {
				t.Errorf("request context has type %T", ctx.Public["request_ctx"])
				return ""
			}
			actor, ok := requestCtx.Value(viewPortContextKey{}).(string)
			if !ok {
				t.Error("missing actor in request context")
			}
			return actor
		},
	}, WithTemplateFeatureGate(viewIsolationGate{}, fgtemplates.WithContextKey("request_ctx"), fgtemplates.WithScopeKey("request_scope")))
	opts := []ViewEngineOption{WithViewReload(false), WithViewTemplateFuncs(shared),
		WithViewFiberV3TemplateFuncs(map[string]any{"actorName": func(ctx *p7.ExecutionContext) string {
			requestCtx, ok := ctx.Public["request_ctx"].(context.Context)
			if !ok {
				t.Errorf("request context has type %T", ctx.Public["request_ctx"])
				return ""
			}
			actor, ok := requestCtx.Value(viewPortContextKey{}).(string)
			if !ok {
				t.Error("missing actor in request context")
			}
			return actor
		}})}
	legacy, err := NewViewEngine(fsys, opts...)
	if err != nil {
		t.Fatal(err)
	}
	modern, err := NewFiberV3ViewEngine(fsys, opts...)
	if err != nil {
		t.Fatal(err)
	}
	for _, canceled := range []bool{false, true} {
		ctx, cancel := context.WithCancel(context.WithValue(context.Background(), viewPortContextKey{}, "actor"))
		if canceled {
			cancel()
		}
		data := map[string]any{"actor": "actor", "request_ctx": ctx, "request_scope": gate.ScopeChain{{Kind: gate.ScopeTenant, ID: "actor"}}}
		for _, views := range []router.Views{legacy, modern} {
			var out bytes.Buffer
			if err := views.Render(&out, "page", data); err != nil {
				cancel()
				t.Fatal(err)
			}
			want := "allowed|actor"
			if canceled {
				want = "denied|actor"
			}
			if out.String() != want {
				cancel()
				t.Fatalf("got %q want %q", out.String(), want)
			}
		}
		if data["request_ctx"] != ctx || len(data) != 3 {
			cancel()
			t.Fatal("caller binding was changed")
		}
		cancel()
	}
	var workers sync.WaitGroup
	for i := range 8 {
		workers.Go(func() {
			actor := fmt.Sprint("actor-", i)
			ctx := context.WithValue(context.Background(), viewPortContextKey{}, actor)
			for range 8 {
				var out bytes.Buffer
				err := modern.Render(&out, "page", map[string]any{"actor": actor, "request_ctx": ctx, "request_scope": gate.ScopeChain{{Kind: gate.ScopeTenant, ID: actor}}})
				if err != nil || out.String() != "allowed|"+actor {
					t.Errorf("concurrent render: %q %v", out.String(), err)
					return
				}
			}
		})
	}
	workers.Wait()
}
