package site

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func localeSwitcherItems(t *testing.T, raw any) []map[string]any {
	t.Helper()
	if items, ok := raw.([]map[string]any); ok {
		return items
	}
	if items, ok := raw.([]any); ok {
		out := make([]map[string]any, 0, len(items))
		for _, item := range items {
			typed, ok := item.(map[string]any)
			if !ok {
				t.Fatalf("expected locale switcher item map, got %#v", item)
			}
			out = append(out, typed)
		}
		return out
	}
	t.Fatalf("expected locale switcher items slice, got %#v", raw)
	return nil
}

func localeSwitcherItemByLocale(t *testing.T, raw any, locale string) map[string]any {
	t.Helper()
	target := normalizeRequestedLocale(locale, "", []string{locale})
	for _, item := range localeSwitcherItems(t, raw) {
		if normalizeRequestedLocale(anyString(item["locale"]), "", []string{anyString(item["locale"])}) == target {
			return item
		}
	}
	t.Fatalf("expected locale switcher item for locale %q, got %#v", locale, raw)
	return nil
}

func TestLocaleSwitcherQueryFromRequestState(t *testing.T) {
	if got := localeSwitcherQueryFromRequestState(RequestState{}); got != nil {
		t.Fatalf("expected nil query without preview token, got %#v", got)
	}

	got := localeSwitcherQueryFromRequestState(RequestState{PreviewToken: " preview-123 "})
	if len(got) != 1 || got["preview_token"] != "preview-123" {
		t.Fatalf("expected trimmed preview token query, got %#v", got)
	}
}

func TestApplyLocaleSwitcherViewContextUsesRequestStatePreviewToken(t *testing.T) {
	viewCtx := applyLocaleSwitcherViewContext(
		router.ViewContext{},
		ResolvedSiteConfig{
			DefaultLocale:    "en",
			SupportedLocales: []string{"en", "es"},
			LocalePrefixMode: LocalePrefixNonDefault,
		},
		"/news/welcome",
		"en",
		"en",
		"family-1",
		[]string{"en", "es"},
		map[string]string{"es": "/noticias/bienvenida"},
		RequestState{PreviewToken: "preview-123"},
	)

	switcher, ok := viewCtx["locale_switcher"].(map[string]any)
	if !ok {
		t.Fatalf("expected locale switcher map, got %#v", viewCtx["locale_switcher"])
	}
	items := localeSwitcherItems(t, switcher["items"])
	if len(items) != 2 {
		t.Fatalf("expected two locale switcher items, got %#v", switcher["items"])
	}
	first := localeSwitcherItemByLocale(t, switcher["items"], "en")
	second := localeSwitcherItemByLocale(t, switcher["items"], "es")
	if first["url"] != "/news/welcome?locale=en&preview_token=preview-123" {
		t.Fatalf("expected default locale URL to keep preview token, got %#v", first["url"])
	}
	if second["url"] != "/es/noticias/bienvenida?preview_token=preview-123" {
		t.Fatalf("expected translated locale URL to keep preview token, got %#v", second["url"])
	}
}
