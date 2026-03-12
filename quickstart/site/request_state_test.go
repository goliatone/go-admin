package site

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestResolveRequestStateContextResolution(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	previewToken, err := adm.Preview().Generate("pages@staging", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"es", "en"},
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/home")
	ctx.QueriesM["preview_token"] = previewToken
	ctx.HeadersM["Accept-Language"] = "es-MX,es;q=0.9,en;q=0.5"

	requestCtx, state := ResolveRequestState(context.Background(), ctx, adm, admin.Config{}, siteCfg, nil)

	if state.Locale != "es" {
		t.Fatalf("expected locale es, got %q", state.Locale)
	}
	if state.Environment != "prod" {
		t.Fatalf("expected runtime environment to remain config default prod, got %q", state.Environment)
	}
	if state.ContentChannel != "staging" {
		t.Fatalf("expected content channel staging from preview token, got %q", state.ContentChannel)
	}
	if !state.PreviewTokenPresent || !state.PreviewTokenValid || !state.IsPreview {
		t.Fatalf("expected valid preview state, got %+v", state)
	}
	if state.ActivePath != "/home" {
		t.Fatalf("expected active path /home, got %q", state.ActivePath)
	}
	if got := state.ViewContext["preview_token_present"]; got != true {
		t.Fatalf("expected preview_token_present true, got %v", got)
	}
	if got := state.ViewContext["base_path"]; got != "/" {
		t.Fatalf("expected base_path /, got %v", got)
	}
	if got := state.ViewContext["asset_base_path"]; got != "/" {
		t.Fatalf("expected asset_base_path /, got %v", got)
	}
	if got := state.ViewContext["content_channel"]; got != "staging" {
		t.Fatalf("expected content_channel staging, got %v", got)
	}

	if locale := admin.LocaleFromContext(requestCtx); locale != "es" {
		t.Fatalf("expected locale on context es, got %q", locale)
	}
	if env := admin.EnvironmentFromContext(requestCtx); env != "staging" {
		t.Fatalf("expected environment on context staging, got %q", env)
	}
	if !admin.LocaleFallbackAllowed(requestCtx) {
		t.Fatalf("expected locale fallback allowed")
	}

	fromCtx, ok := RequestStateFromContext(requestCtx)
	if !ok {
		t.Fatalf("expected request state in context")
	}
	if fromCtx.Locale != "es" {
		t.Fatalf("expected context state locale es, got %q", fromCtx.Locale)
	}
}

func TestResolveRequestStateModuleViewContextMergeOrder(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/merge")

	modules := []SiteModule{
		moduleStub{
			id: "first",
			viewContextFn: func(_ context.Context, in router.ViewContext) router.ViewContext {
				in["trace"] = "1"
				in["shared"] = "module-1"
				return in
			},
		},
		moduleStub{
			id: "second",
			viewContextFn: func(_ context.Context, in router.ViewContext) router.ViewContext {
				in["trace"] = in["trace"].(string) + "2"
				in["shared"] = "module-2"
				return in
			},
		},
	}

	_, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, modules)

	if got := state.ViewContext["trace"]; got != "12" {
		t.Fatalf("expected trace merge order 12, got %v", got)
	}
	if got := state.ViewContext["shared"]; got != "module-2" {
		t.Fatalf("expected later module override, got %v", got)
	}
}

func TestResolveRequestStateUsesRequestLocalePriority(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{SupportedLocales: []string{"en", "fr", "es"}})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/locales")
	ctx.ParamsM["locale"] = "fr"
	ctx.QueriesM["locale"] = "es"
	ctx.CookiesM[defaultLocaleCookieName] = "en"
	ctx.HeadersM["Accept-Language"] = "es"

	_, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)

	if state.Locale != "fr" {
		t.Fatalf("expected route locale to win, got %q", state.Locale)
	}
}

func TestResolveRequestStateLocalePriorityChain(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{SupportedLocales: []string{"en", "fr", "es"}})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/es/locales")
	ctx.ParamsM["path"] = "es/locales"
	ctx.QueriesM["locale"] = "en"
	_, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Locale != "es" {
		t.Fatalf("expected locale prefix in path to win, got %q", state.Locale)
	}

	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/locales")
	ctx.QueriesM["locale"] = "es"
	ctx.CookiesM[defaultLocaleCookieName] = "fr"
	ctx.HeadersM["Accept-Language"] = "fr-CA,fr;q=0.8,en;q=0.5"
	_, state = ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Locale != "es" {
		t.Fatalf("expected query locale to win, got %q", state.Locale)
	}

	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/locales")
	ctx.CookiesM[defaultLocaleCookieName] = "fr"
	ctx.HeadersM["Accept-Language"] = "es-MX,es;q=0.9,en;q=0.5"
	_, state = ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Locale != "fr" {
		t.Fatalf("expected cookie locale to win when query is missing, got %q", state.Locale)
	}

	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/locales")
	ctx.HeadersM["Accept-Language"] = "es-MX,es;q=0.9,en;q=0.5"
	_, state = ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Locale != "es" {
		t.Fatalf("expected Accept-Language to win before default locale, got %q", state.Locale)
	}

	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/locales")
	_, state = ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Locale != "en" {
		t.Fatalf("expected default locale fallback en, got %q", state.Locale)
	}
}

func TestResolveRequestStatePreviewValidationRequiresSecurityClaims(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})

	missingEntityToken, err := adm.Preview().Generate("", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate missing entity token: %v", err)
	}
	missingContentIDToken, err := adm.Preview().Generate("pages", "", time.Minute)
	if err != nil {
		t.Fatalf("generate missing content_id token: %v", err)
	}

	for name, token := range map[string]string{
		"missing_entity":     missingEntityToken,
		"missing_content_id": missingContentIDToken,
	} {
		ctx := router.NewMockContext()
		ctx.On("Context").Return(context.Background())
		ctx.On("Path").Return("/preview")
		ctx.QueriesM["preview_token"] = token

		_, state := ResolveRequestState(context.Background(), ctx, adm, admin.Config{}, siteCfg, nil)
		if state.PreviewTokenValid || state.IsPreview {
			t.Fatalf("%s expected preview token to be rejected, got %+v", name, state)
		}
	}
}

func TestResolveRequestStatePreviewDefaultEnvironmentOverridesContentScopeOnly(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	previewToken, err := adm.Preview().Generate("pages@default", "page-1", time.Minute)
	if err != nil {
		t.Fatalf("generate preview token: %v", err)
	}

	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "dev",
		ContentChannel: "dev",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/preview-default")
	ctx.QueriesM["preview_token"] = previewToken

	requestCtx, state := ResolveRequestState(context.Background(), ctx, adm, admin.Config{}, siteCfg, nil)

	if state.Environment != "dev" {
		t.Fatalf("expected runtime environment to remain dev, got %q", state.Environment)
	}
	if state.ContentChannel != "default" {
		t.Fatalf("expected preview token to switch content channel to default, got %q", state.ContentChannel)
	}
	if got := admin.EnvironmentFromContext(requestCtx); got != "default" {
		t.Fatalf("expected context environment default, got %q", got)
	}
}

func TestResolveRequestStateSeparatesRuntimeAndContentChannelDefaults(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "dev",
		ContentChannel: "default",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/site")

	requestCtx, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Environment != "dev" {
		t.Fatalf("expected runtime environment dev, got %q", state.Environment)
	}
	if state.ContentChannel != "default" {
		t.Fatalf("expected content channel default, got %q", state.ContentChannel)
	}
	if got := admin.EnvironmentFromContext(requestCtx); got != "default" {
		t.Fatalf("expected context environment to use content channel default, got %q", got)
	}
}

func TestResolveRequestStateRequestRuntimeEnvironmentDoesNotOverrideContentChannel(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "prod",
		ContentChannel: "default",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/site")
	ctx.QueriesM["runtime_env"] = "staging"

	requestCtx, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Environment != "staging" {
		t.Fatalf("expected runtime environment from request runtime_env=staging, got %q", state.Environment)
	}
	if state.ContentChannel != "default" {
		t.Fatalf("expected content channel to remain default, got %q", state.ContentChannel)
	}
	if got := admin.EnvironmentFromContext(requestCtx); got != "default" {
		t.Fatalf("expected context environment to remain content channel default, got %q", got)
	}
}

func TestResolveRequestStateRequestContentChannelDoesNotOverrideRuntimeEnvironment(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "prod",
		ContentChannel: "default",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/site")
	ctx.QueriesM["channel"] = "preview"

	requestCtx, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Environment != "prod" {
		t.Fatalf("expected runtime environment to remain prod, got %q", state.Environment)
	}
	if state.ContentChannel != "preview" {
		t.Fatalf("expected content channel preview from request channel, got %q", state.ContentChannel)
	}
	if got := admin.EnvironmentFromContext(requestCtx); got != "preview" {
		t.Fatalf("expected context environment preview, got %q", got)
	}
}

func TestResolveRequestStateRequestDollarChannelHasPriority(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "prod",
		ContentChannel: "default",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/site")
	ctx.QueriesM[admin.ContentChannelScopeQueryParam] = "preview"
	ctx.QueriesM["channel"] = "staging"

	_, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.ContentChannel != "preview" {
		t.Fatalf("expected $channel preview to have priority, got %q", state.ContentChannel)
	}
}

func TestPersistLocaleCookieWritesLocaleForI18NRequests(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	})
	ctx := router.NewMockContext()
	ctx.On("Cookie", mock.Anything).Return()

	persistLocaleCookie(ctx, siteCfg, RequestState{Locale: "es"})

	if got := ctx.CookiesM[defaultLocaleCookieName]; got != "es" {
		t.Fatalf("expected persisted locale cookie es, got %q", got)
	}
}

func TestPersistLocaleCookieSkipsWhenLocaleUnchanged(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	})
	ctx := router.NewMockContext()
	ctx.CookiesM[defaultLocaleCookieName] = "es"

	persistLocaleCookie(ctx, siteCfg, RequestState{Locale: "es"})

	if got := ctx.CookiesM[defaultLocaleCookieName]; got != "es" {
		t.Fatalf("expected locale cookie unchanged, got %q", got)
	}
}

func TestResolveRequestStateUsesSiteContentChannelQueryForContentChannel(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Environment:    "prod",
		ContentChannel: "default",
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/site")
	ctx.QueriesM["site_content_channel"] = "staging"

	_, state := ResolveRequestState(context.Background(), ctx, nil, admin.Config{}, siteCfg, nil)
	if state.Environment != "prod" {
		t.Fatalf("expected runtime environment to remain prod, got %q", state.Environment)
	}
	if state.ContentChannel != "staging" {
		t.Fatalf("expected content channel to use site_content_channel staging, got %q", state.ContentChannel)
	}
}
