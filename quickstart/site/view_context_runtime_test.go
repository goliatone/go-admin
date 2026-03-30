package site

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestNewRuntimeViewContextClonesRequestStateViewContext(t *testing.T) {
	state := RequestState{
		ViewContext: router.ViewContext{
			"locale": "en",
			"theme":  map[string]any{"name": "admin"},
		},
	}

	view := newRuntimeViewContext(state)
	view["locale"] = "es"

	if got := anyString(state.ViewContext["locale"]); got != "en" {
		t.Fatalf("expected request state view context to remain unchanged, got %q", got)
	}
}

func TestApplyResolvedLocaleViewContext(t *testing.T) {
	view := applyResolvedLocaleViewContext(
		router.ViewContext{},
		"es",
		"en",
		[]string{"en", "es"},
		true,
	)

	if got := anyString(view["requested_locale"]); got != "es" {
		t.Fatalf("expected requested_locale es, got %q", got)
	}
	if got := anyString(view["resolved_locale"]); got != "en" {
		t.Fatalf("expected resolved_locale en, got %q", got)
	}
	if got := anyString(view["locale"]); got != "en" {
		t.Fatalf("expected locale en, got %q", got)
	}
	if got := anyBool(view["missing_requested_locale"]); !got {
		t.Fatalf("expected missing_requested_locale true, got %#v", view["missing_requested_locale"])
	}
}

func TestApplyContentTypeViewContext(t *testing.T) {
	view := applyContentTypeViewContext(router.ViewContext{}, "post")
	if got := anyString(view["content_type"]); got != "post" {
		t.Fatalf("expected content_type post, got %q", got)
	}
	if got := anyString(view["content_type_slug"]); got != "post" {
		t.Fatalf("expected content_type_slug post, got %q", got)
	}
}
