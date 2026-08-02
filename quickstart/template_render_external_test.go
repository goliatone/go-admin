package quickstart_test

import (
	"errors"
	"testing"

	quickstart "github.com/goliatone/go-admin/quickstart"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestRenderTemplateViewRejectsNilContext(t *testing.T) {
	if err := quickstart.RenderTemplateView(nil, "admin", nil); err == nil {
		t.Fatal("expected nil context error")
	}
}

func TestRenderTemplateViewPreservesPublicRenderingContract(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[csrfmw.DefaultTemplateHelpersKey] = map[string]any{
		"csrf_field": "field",
		"csrf_meta":  "meta",
	}
	renderErr := errors.New("render failed")
	var rendered router.ViewContext
	ctx.On("Render", "admin", mock.Anything).Run(func(args mock.Arguments) {
		var ok bool
		rendered, ok = args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected router.ViewContext, got %T", args.Get(1))
		}
	}).Return(renderErr)

	err := quickstart.RenderTemplateView(ctx, "admin", router.ViewContext{
		"count":      2.0,
		"csrf_field": "caller-field",
	})
	if !errors.Is(err, renderErr) {
		t.Fatalf("expected render error propagation, got %v", err)
	}
	if got, ok := rendered["count"].(int64); !ok || got != 2 {
		t.Fatalf("expected normalized int64 count, got %#v (%T)", rendered["count"], rendered["count"])
	}
	if rendered["csrf_field"] != "caller-field" {
		t.Fatalf("expected caller CSRF helper to win, got %#v", rendered["csrf_field"])
	}
	if rendered["csrf_meta"] != "meta" {
		t.Fatalf("expected request CSRF helper propagation, got %#v", rendered["csrf_meta"])
	}
	if _, ok := rendered[csrfmw.DefaultTemplateHelpersKey].(map[string]any); !ok {
		t.Fatal("expected namespaced request template helpers")
	}
	ctx.AssertExpectations(t)
}
