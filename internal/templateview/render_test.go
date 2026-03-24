package templateview

import (
	"testing"

	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestRenderTemplateViewMergesRequestTemplateHelpers(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[csrfmw.DefaultTemplateHelpersKey] = map[string]any{
		"csrf_field": `<input type="hidden" name="_token" value="token">`,
		"csrf_meta":  `<meta name="csrf-token" content="token">`,
	}

	var rendered any
	ctx.On("Render", "admin", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)

	if err := RenderTemplateView(ctx, "admin", router.ViewContext{"title": "Admin"}); err != nil {
		t.Fatalf("RenderTemplateView error: %v", err)
	}

	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected rendered view context, got %T", rendered)
	}
	if viewCtx["csrf_field"] == "" {
		t.Fatalf("expected csrf_field in rendered context")
	}
	if viewCtx["csrf_meta"] == "" {
		t.Fatalf("expected csrf_meta in rendered context")
	}
	if _, ok := viewCtx[csrfmw.DefaultTemplateHelpersKey].(map[string]any); !ok {
		t.Fatalf("expected template_helpers map in rendered context")
	}
}
