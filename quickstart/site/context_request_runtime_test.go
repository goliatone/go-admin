package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestViewContextFromRequestPrefersLocalsAndFallsBackToRequestState(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[viewContextLocalsKey] = router.ViewContext{
		"source": "locals",
	}

	localsView := ViewContextFromRequest(ctx)
	if got := localsView["source"]; got != "locals" {
		t.Fatalf("expected locals view context, got %v", got)
	}
	localsView["source"] = "mutated"
	if got := ctx.LocalsMock[viewContextLocalsKey].(router.ViewContext)["source"]; got != "locals" {
		t.Fatalf("expected returned locals view context to be cloned, got %v", got)
	}

	requestState := RequestState{
		ViewContext: router.ViewContext{
			"source": "state",
		},
	}
	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.WithValue(context.Background(), requestStateContextKey, requestState))

	stateView := ViewContextFromRequest(ctx)
	if got := stateView["source"]; got != "state" {
		t.Fatalf("expected request-state view context, got %v", got)
	}
	stateView["source"] = "mutated"
	if got := requestState.ViewContext["source"]; got != "state" {
		t.Fatalf("expected returned request-state view context to be cloned, got %v", got)
	}
}

func TestMergeViewContextOverlaysRequestValues(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[viewContextLocalsKey] = router.ViewContext{
		"request_only": "yes",
		"shared":       "request",
	}

	merged := MergeViewContext(router.ViewContext{
		"base":   "present",
		"shared": "base",
	}, ctx)

	if got := merged["base"]; got != "present" {
		t.Fatalf("expected base key to remain present, got %v", got)
	}
	if got := merged["request_only"]; got != "yes" {
		t.Fatalf("expected request view context to be merged, got %v", got)
	}
	if got := merged["shared"]; got != "request" {
		t.Fatalf("expected request view context to override shared key, got %v", got)
	}
}

func TestRequestContextMiddlewareStoresResolvedStateViewContextAndLocaleCookie(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/es/home")
	ctx.On("SetContext", mock.Anything).Return()
	ctx.On("Locals", requestStateLocalsKey, mock.Anything).Return(nil)
	ctx.On("Locals", viewContextLocalsKey, mock.Anything).Return(nil)
	ctx.On("Cookie", mock.Anything).Return()
	ctx.QueriesM["locale"] = "es"

	var seenState RequestState
	var seenView router.ViewContext
	handler := requestContextMiddleware(nil, admin.Config{DefaultLocale: "en"}, siteCfg, nil)(func(c router.Context) error {
		var ok bool
		seenState, ok = RequestStateFromRequest(c)
		if !ok {
			t.Fatalf("expected request state in locals/context")
		}
		seenView = ViewContextFromRequest(c)
		return nil
	})

	if err := handler(ctx); err != nil {
		t.Fatalf("middleware handler returned error: %v", err)
	}
	if seenState.Locale != "es" {
		t.Fatalf("expected resolved locale es in stored request state, got %q", seenState.Locale)
	}
	if got := seenView["locale"]; got != "es" {
		t.Fatalf("expected stored view context locale es, got %v", got)
	}
	if got := ctx.CookiesM[defaultLocaleCookieName]; got != "es" {
		t.Fatalf("expected middleware to persist locale cookie es, got %q", got)
	}
}
