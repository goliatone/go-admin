package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDeliveryRuntimeBootstrapNewDeliveryRuntimeRequiresContentServices(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	content := admin.NewInMemoryContentService()

	if runtime := newDeliveryRuntime(cfg, nil, nil, content); runtime != nil {
		t.Fatalf("expected nil runtime when content service is missing")
	}
	if runtime := newDeliveryRuntime(cfg, nil, content, nil); runtime != nil {
		t.Fatalf("expected nil runtime when content-type service is missing")
	}
}

func TestDeliveryRuntimeBootstrapNewDeliveryRuntimeBuildsNavigationWhenGeneratedFallbackEnabled(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Navigation: SiteNavigationConfig{EnableGeneratedFallback: true},
	})
	content := admin.NewInMemoryContentService()

	runtime := newDeliveryRuntime(cfg, nil, content, content)
	if runtime == nil {
		t.Fatalf("expected runtime instance")
	}
	if runtime.contentSvc != content || runtime.contentTypeSvc != content {
		t.Fatalf("expected runtime services to be preserved")
	}
	if runtime.navigation == nil {
		t.Fatalf("expected generated-fallback navigation runtime")
	}
}

func TestDeliveryRuntimeBootstrapListSiteContentsCachedUsesCacheAndNilFallbacks(t *testing.T) {
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {{
				ID:              "post-en",
				Slug:            "hello",
				Locale:          "en",
				Status:          "published",
				ContentType:     "post",
				ContentTypeSlug: "post",
			}},
		},
	}
	runtime := &deliveryRuntime{contentSvc: stub}

	first, err := runtime.listSiteContentsCached(context.Background(), "en", newSiteContentCache())
	if err != nil {
		t.Fatalf("unexpected first cache error: %v", err)
	}
	if len(first) != 1 || first[0].ID != "post-en" {
		t.Fatalf("expected cached result, got %+v", first)
	}
	first[0].ID = "mutated"

	second, err := runtime.listSiteContentsCached(context.Background(), "en", newSiteContentCache())
	if err != nil {
		t.Fatalf("unexpected second cache error: %v", err)
	}
	if len(second) != 1 || second[0].ID != "post-en" {
		t.Fatalf("expected cloned cache result, got %+v", second)
	}

	cache := newSiteContentCache()
	if _, err = runtime.listSiteContentsCached(context.Background(), "en", cache); err != nil {
		t.Fatalf("unexpected cached load error: %v", err)
	}
	if _, err = runtime.listSiteContentsCached(context.Background(), "en", cache); err != nil {
		t.Fatalf("unexpected cached reload error: %v", err)
	}
	if stub.listCalls["en"] != 3 {
		t.Fatalf("expected three total service calls across uncached and cached loads, got %+v", stub.listCalls)
	}

	var nilRuntime *deliveryRuntime
	items, err := nilRuntime.listSiteContentsCached(context.Background(), "en", cache)
	if err != nil {
		t.Fatalf("expected nil runtime to return nil items without error, got %v", err)
	}
	if items != nil {
		t.Fatalf("expected nil runtime to return nil items, got %+v", items)
	}
}

func TestDeliveryRuntimeBootstrapStrictLocalizedPathsEnabledRequiresBothFlags(t *testing.T) {
	if (&deliveryRuntime{}).strictLocalizedPathsEnabled() {
		t.Fatalf("expected strict localized paths disabled by default")
	}
	if (&deliveryRuntime{siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{EnableI18N: new(true), StrictLocalizedPaths: new(false)},
	})}).strictLocalizedPathsEnabled() {
		t.Fatalf("expected strict localized paths to stay disabled without strict flag")
	}
	if !(&deliveryRuntime{siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Features: SiteFeatures{EnableI18N: new(true), StrictLocalizedPaths: new(true)},
	})}).strictLocalizedPathsEnabled() {
		t.Fatalf("expected strict localized paths when both flags are enabled")
	}
}

func TestDeliveryRuntimeBootstrapSiteErrorHelpersAndTypedValues(t *testing.T) {
	err := translationMissingSiteError(" es ", []string{"en", "es"}, " post ", " /posts/hola ")
	if err.Code != siteErrorCodeTranslationMissing || err.Status != 404 {
		t.Fatalf("expected translation-missing site error, got %+v", err)
	}
	if err.RequestedLocale != "es" || err.ContentType != "post" || err.SlugOrPath != "/posts/hola" {
		t.Fatalf("expected trimmed site error payload, got %+v", err)
	}
	err.AvailableLocales[0] = "mutated"
	again := translationMissingSiteError("es", []string{"en", "es"}, "post", "/posts/hola")
	if again.AvailableLocales[0] != "en" {
		t.Fatalf("expected cloned available locales, got %+v", again.AvailableLocales)
	}
	if !hasSiteRuntimeError(err) {
		t.Fatalf("expected non-empty site error to be detected")
	}
	if hasSiteRuntimeError(SiteRuntimeError{}) {
		t.Fatalf("expected empty site error to be ignored")
	}

	values := anyStringList([]any{" alpha ", "", "beta", 7})
	if len(values) != 2 || values[0] != "alpha" || values[1] != "beta" {
		t.Fatalf("expected filtered string list, got %+v", values)
	}
	rawList := []string{"one", "two"}
	cloned := anyStringList(rawList)
	cloned[0] = "changed"
	if rawList[0] != "one" {
		t.Fatalf("expected []string input to be cloned, got %+v", rawList)
	}

	typedMap := anyMap(map[string]string{"key": "value"})
	if typedMap["key"] != "value" {
		t.Fatalf("expected map[string]string to convert, got %+v", typedMap)
	}
	if anyMap([]string{"nope"}) != nil {
		t.Fatalf("expected unsupported map input to return nil")
	}
	if anyString("hello") != "hello" || anyString(42) != "" {
		t.Fatalf("expected anyString to read strings only")
	}
	if !anyBool("YES") || !anyBool(1) || !anyBool(int64(2)) || !anyBool(3.14) {
		t.Fatalf("expected anyBool truthy conversions")
	}
	if anyBool("off") || anyBool(0) || anyBool(nil) {
		t.Fatalf("expected anyBool falsy conversions")
	}
}
