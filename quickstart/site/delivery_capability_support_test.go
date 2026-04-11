package site

import (
	"reflect"
	"testing"
)

func TestDeliveryCapabilitySupportDefaultsAndTemplateCandidates(t *testing.T) {
	capability := deliveryCapability{
		TypeSlug:       "pages",
		ListTemplate:   "site/pages",
		DetailTemplate: "site/page",
	}

	if got := capability.normalizedKind(); got != "page" {
		t.Fatalf("expected page fallback kind, got %q", got)
	}
	if got := capability.listRoutePattern(); got != "/pages" {
		t.Fatalf("expected default list route /pages, got %q", got)
	}
	if got := capability.detailRoutePattern(); got != "/pages/:slug" {
		t.Fatalf("expected default detail route /pages/:slug, got %q", got)
	}
	if got, want := capability.listTemplateCandidates(), []string{"site/pages", defaultDeliveryListTemplate}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected list templates %v, got %v", want, got)
	}
	if got, want := capability.detailTemplateCandidates(), []string{"site/page", defaultDeliveryDetailTemplate}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected detail templates %v, got %v", want, got)
	}
	if got, want := capability.homeTemplateCandidates(map[string]any{
		"manifest_partials": map[string]any{
			siteThemeTemplateKeyHomePage: "templates/site/home/page.html",
		},
	}), []string{"site/home/page", "site/page", defaultDeliveryDetailTemplate}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected homepage templates %v, got %v", want, got)
	}
}

func TestDeliveryCapabilitySupportPathPolicyHelpers(t *testing.T) {
	capability := deliveryCapability{
		TypeSlug:    "post",
		Kind:        "hybrid",
		ListRoute:   "/blog",
		DetailRoute: "/blog/:slug",
	}

	if got, want := defaultDeliveryPathPrefixes(capability), []string{"/blog"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected default prefixes %v, got %v", want, got)
	}

	policy := effectiveDeliveryPathPolicy(deliveryCapability{
		TypeSlug: "page",
		Kind:     "page",
		PathPolicy: deliveryPathPolicy{
			AllowedPrefixes:  []string{"/pages", "/pages", "/", " "},
			allowedPrefixSet: true,
		},
	})
	if !policy.AllowRoot {
		t.Fatalf("expected page capabilities to allow root by default")
	}
	if got, want := policy.AllowedPrefixes, []string{"/pages"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected normalized prefixes %v, got %v", want, got)
	}
	if !pathMatchesAllowedPrefixes("/pages/example", policy.AllowedPrefixes) {
		t.Fatalf("expected nested page path to match allowed prefixes")
	}
	if sanitized := sanitizeDeliveryPath("/pages/example?draft=1", policy); sanitized != "/pages/example" {
		t.Fatalf("expected sanitized path /pages/example, got %q", sanitized)
	}
	if sanitized := sanitizeDeliveryPath("https://example.com/page", policy); sanitized != "" {
		t.Fatalf("expected external url to be rejected, got %q", sanitized)
	}
}

func TestSingularTypeSlugFallsBackToContentForBlankValues(t *testing.T) {
	if got := singularTypeSlug(""); got != "content" {
		t.Fatalf("expected blank singular slug to fall back to content, got %q", got)
	}
	if got := pluralTypeSlug(""); got != "contents" {
		t.Fatalf("expected blank plural slug to fall back to contents, got %q", got)
	}
}
