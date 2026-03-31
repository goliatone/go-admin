package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestBuildResolvedRequestStateUsesResolvedInputsAndPathFallbacks(t *testing.T) {
	siteCfg := ResolveSiteConfig(adminConfigWithDefaultLocale("en"), SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "es"},
		ContentChannel:   "default",
		Views: SiteViewConfig{
			AssetBasePath: "",
		},
	})

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/es/articles")

	state := buildResolvedRequestState(siteCfg, ctx, requestStateFlowInputs{
		Environment:    "staging",
		ContentChannel: "preview",
		Locale:         "es",
		Preview: previewResolution{
			Present:    true,
			Valid:      true,
			Token:      "preview-123",
			EntityType: "pages",
			ContentID:  "page-1",
		},
		ThemeName:    "editorial",
		ThemeVariant: "night",
	})

	if state.AssetBasePath != "/site" {
		t.Fatalf("expected asset base path fallback /site, got %q", state.AssetBasePath)
	}
	if state.ActivePath != "/es/articles" {
		t.Fatalf("expected active path /es/articles, got %q", state.ActivePath)
	}
	if !state.PreviewTokenPresent || !state.PreviewTokenValid || !state.IsPreview {
		t.Fatalf("expected preview flags to be preserved, got %+v", state)
	}
	if state.ThemeName != "editorial" || state.ThemeVariant != "night" {
		t.Fatalf("expected theme metadata to be preserved, got %+v", state)
	}

	state = buildResolvedRequestState(siteCfg, nil, requestStateFlowInputs{Locale: "en"})
	if state.ActivePath != "/" {
		t.Fatalf("expected default active path /, got %q", state.ActivePath)
	}
}

func TestBuildResolvedRequestViewContextIncludesThemeAndLocaleSwitcher(t *testing.T) {
	siteCfg := ResolveSiteConfig(adminConfigWithDefaultLocale("en"), SiteConfig{
		BasePath:         "/site",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	})

	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		Environment:         "staging",
		ContentChannel:      "preview",
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewToken:        "preview-123",
		ThemeName:           "editorial",
		ThemeVariant:        "night",
		Theme: map[string]map[string]string{
			"colors": {"primary": "#000"},
		},
		BasePath:      "/site",
		AssetBasePath: "/assets",
		ActivePath:    "/es/articles",
	}

	viewCtx := buildResolvedRequestViewContext(siteCfg, state)
	if got := viewCtx["theme_name"]; got != "editorial" {
		t.Fatalf("expected theme_name editorial, got %v", got)
	}
	if got := viewCtx["theme_variant"]; got != "night" {
		t.Fatalf("expected theme_variant night, got %v", got)
	}
	if got := viewCtx["content_channel"]; got != "preview" {
		t.Fatalf("expected content_channel preview, got %v", got)
	}
	switcher, ok := viewCtx["locale_switcher"].(map[string]any)
	if !ok {
		t.Fatalf("expected locale_switcher contract, got %#v", viewCtx["locale_switcher"])
	}
	if items := localeSwitcherItems(t, switcher["items"]); len(items) != 2 {
		t.Fatalf("expected locale switcher items, got %#v", switcher["items"])
	}
	if got := anyString(localeSwitcherItemByLocale(t, switcher["items"], "es")["url"]); got == "" {
		t.Fatalf("expected localized active URL")
	}

	theme, ok := viewCtx["theme"].(map[string]map[string]string)
	if !ok || theme["colors"]["primary"] != "#000" {
		t.Fatalf("expected cloned theme payload, got %#v", viewCtx["theme"])
	}
	state.Theme["colors"]["primary"] = "#fff"
	theme = viewCtx["theme"].(map[string]map[string]string)
	if theme["colors"]["primary"] != "#000" {
		t.Fatalf("expected theme payload clone to remain unchanged, got %#v", theme)
	}
}

func TestResolveRequestStateFlowAppliesModulesAndStoresState(t *testing.T) {
	siteCfg := ResolveSiteConfig(adminConfigWithDefaultLocale("en"), SiteConfig{
		SupportedLocales: []string{"en", "es"},
	})

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/flow")

	requestCtx := context.WithValue(context.Background(), contextKey("trace"), "runtime")
	requestCtx, state := resolveRequestStateFlow(requestCtx, ctx, siteCfg, []SiteModule{
		moduleStub{
			id: "first",
			viewContextFn: func(ctx context.Context, in router.ViewContext) router.ViewContext {
				if got := ctx.Value(contextKey("trace")); got != "runtime" {
					t.Fatalf("expected request context passthrough, got %v", got)
				}
				in["trace"] = "1"
				return in
			},
		},
		moduleStub{
			id: "second",
			viewContextFn: func(_ context.Context, in router.ViewContext) router.ViewContext {
				in["trace"] = in["trace"].(string) + "2"
				return in
			},
		},
	}, requestStateFlowInputs{
		Environment:    "prod",
		ContentChannel: "default",
		Locale:         "en",
	})

	if got := state.ViewContext["trace"]; got != "12" {
		t.Fatalf("expected merged module trace 12, got %v", got)
	}
	stored, ok := RequestStateFromContext(requestCtx)
	if !ok {
		t.Fatalf("expected request state stored on request context")
	}
	if stored.ActivePath != "/flow" {
		t.Fatalf("expected stored active path /flow, got %q", stored.ActivePath)
	}
	if stored.ViewContext["trace"] != "12" {
		t.Fatalf("expected stored view context trace 12, got %v", stored.ViewContext["trace"])
	}
}

func adminConfigWithDefaultLocale(locale string) admin.Config {
	return admin.Config{DefaultLocale: locale}
}
