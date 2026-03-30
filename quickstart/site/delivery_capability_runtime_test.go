package site

import (
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDeliveryCapabilityDefaultsAndTemplateCandidates(t *testing.T) {
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
}

func TestCapabilityFromContentTypeParsesDeliveryContractAndPolicy(t *testing.T) {
	capability, ok := capabilityFromContentType(admin.CMSContentType{
		Name: "News",
		Slug: "news",
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/news/:slug",
				},
				"templates": map[string]any{
					"detail": "site/news/detail",
				},
				"path_policy": map[string]any{
					"allow_external_urls": true,
					"allow_root":          false,
					"allowed_prefixes":    []any{"/news", "/news", "/", " "},
				},
			},
		},
	})
	if !ok {
		t.Fatalf("expected capability to resolve")
	}

	if capability.TypeSlug != "news" || capability.normalizedKind() != "detail" {
		t.Fatalf("unexpected capability identity %+v", capability)
	}
	if capability.DetailRoute != "/news/:slug" || capability.DetailTemplate != "site/news/detail" {
		t.Fatalf("unexpected detail contract %+v", capability)
	}

	policy := effectiveDeliveryPathPolicy(capability)
	if !policy.AllowExternalURLs {
		t.Fatalf("expected allow_external_urls to be preserved")
	}
	if policy.AllowRoot {
		t.Fatalf("expected allow_root override to remain false")
	}
	if got, want := policy.AllowedPrefixes, []string{"/news"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected normalized allowed prefixes %v, got %v", want, got)
	}
}

func TestCapabilityFromContentTypeAppliesDefaultPathPrefixPolicy(t *testing.T) {
	capability, ok := capabilityFromContentType(admin.CMSContentType{
		Name: "Posts",
		Slug: "post",
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "hybrid",
				"routes": map[string]any{
					"list":   "/blog",
					"detail": "/blog/:slug",
				},
			},
		},
	})
	if !ok {
		t.Fatalf("expected hybrid capability to resolve")
	}

	policy := effectiveDeliveryPathPolicy(capability)
	if policy.AllowRoot {
		t.Fatalf("expected non-page capability to default allow_root to false")
	}
	if got, want := policy.AllowedPrefixes, []string{"/blog"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected hybrid default prefix %v, got %v", want, got)
	}
}

func TestCapabilityFromContentTypeSkipsMissingOrDisabledContracts(t *testing.T) {
	tests := []admin.CMSContentType{
		{},
		{
			Name: "Page",
			Slug: "page",
		},
		{
			Name: "Page",
			Slug: "page",
			Capabilities: map[string]any{
				"delivery": map[string]any{
					"enabled": false,
				},
			},
		},
	}

	for _, test := range tests {
		if capability, ok := capabilityFromContentType(test); ok {
			t.Fatalf("expected capability to be skipped, got %+v", capability)
		}
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
