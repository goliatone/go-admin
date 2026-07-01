package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveContentDeliveryPathAppliesRuntimeRecordPathRules(t *testing.T) {
	enabled := true
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixAlways,
		Features: SiteFeatures{
			EnableI18N: &enabled,
		},
	})
	contentType := testDeliveryPathContentType("page-type", "page", "page", "", "")
	content := admin.CMSContent{
		ID:              "about",
		Slug:            "about",
		Locale:          "es",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	}

	result, err := ResolveContentDeliveryPath(context.Background(), ContentDeliveryPathInput{
		SiteConfig:    siteCfg,
		Content:       content,
		ContentType:   contentType,
		IncludeBase:   true,
		IncludeLocale: true,
	})
	if err != nil {
		t.Fatalf("resolve delivery path: %v", err)
	}

	if result.CanonicalPath != "/about" {
		t.Fatalf("expected canonical /about, got %q", result.CanonicalPath)
	}
	if result.PublicPath != "/site/es/about" {
		t.Fatalf("expected public path /site/es/about, got %q", result.PublicPath)
	}
	if result.Locale != "es" {
		t.Fatalf("expected locale es, got %q", result.Locale)
	}
	if !result.PublicRoutable {
		t.Fatalf("expected public routable path")
	}
}

func TestResolveContentDeliveryPathGeneratesDetailRouteFromSlug(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	contentType := testDeliveryPathContentType("post-type", "post", "detail", "", "/posts/:slug")

	result, err := ResolveContentDeliveryPath(context.Background(), ContentDeliveryPathInput{
		SiteConfig:  siteCfg,
		ContentType: contentType,
		Content: admin.CMSContent{
			ID:              "post-1",
			Slug:            "hello",
			Locale:          "en",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
		},
	})
	if err != nil {
		t.Fatalf("resolve delivery path: %v", err)
	}
	if result.CanonicalPath != "/posts/hello" || result.PublicPath != "/posts/hello" {
		t.Fatalf("expected generated detail path /posts/hello, got %+v", result)
	}
}

func TestResolveContentDeliveryPathMarksReservedPathNotRoutable(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	contentType := testDeliveryPathContentType("page-type", "page", "page", "", "")

	result, err := ResolveContentDeliveryPath(context.Background(), ContentDeliveryPathInput{
		SiteConfig:  siteCfg,
		ContentType: contentType,
		Content: admin.CMSContent{
			ID:              "admin-page",
			Slug:            "admin",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Data:            map[string]any{"path": "/admin/content"},
		},
	})
	if err != nil {
		t.Fatalf("resolve delivery path: %v", err)
	}
	if result.CanonicalPath != "/admin/content" {
		t.Fatalf("expected reserved canonical path to still be reported, got %q", result.CanonicalPath)
	}
	if result.PublicRoutable {
		t.Fatalf("expected reserved path to be marked not publicly routable")
	}
}

func TestResolveContentDeliveryPathDoesNotTreatEmptyPathAsRoot(t *testing.T) {
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	contentType := testDeliveryPathContentType("post-type", "post", "detail", "", "/posts/:slug")

	result, err := ResolveContentDeliveryPath(context.Background(), ContentDeliveryPathInput{
		SiteConfig:  siteCfg,
		ContentType: contentType,
		Content: admin.CMSContent{
			ID:              "post-empty",
			Locale:          "en",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
		},
	})
	if err != nil {
		t.Fatalf("resolve delivery path: %v", err)
	}
	if result.CanonicalPath != "" || result.PublicPath != "" {
		t.Fatalf("expected empty paths for unroutable detail record without slug, got %+v", result)
	}
	if result.PublicRoutable {
		t.Fatalf("expected empty delivery path to be not publicly routable")
	}
}

func testDeliveryPathContentType(id, slug, kind, listRoute, detailRoute string) admin.CMSContentType {
	return admin.CMSContentType{
		ID:   id,
		Name: slug,
		Slug: slug,
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    kind,
				"routes": map[string]any{
					"list":   listRoute,
					"detail": detailRoute,
				},
			},
		},
	}
}
