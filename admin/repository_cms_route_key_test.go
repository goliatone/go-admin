package admin

import "testing"

func TestCMSPageRecordIncludesRouteKey(t *testing.T) {
	record := cmsPageRecord(CMSPage{
		ID:       "page-1",
		Title:    "Home",
		Slug:     "home",
		RouteKey: "pages/home",
		Locale:   "en",
		PreviewURL: "/home",
		Data: map[string]any{
			"path": "/home",
		},
	}, cmsPageRecordOptions{})

	if got := toString(record["route_key"]); got != "pages/home" {
		t.Fatalf("expected route_key pages/home, got %q", got)
	}
}

func TestCMSContentRecordIncludesRouteKey(t *testing.T) {
	record := cmsContentRecord(CMSContent{
		ID:              "post-1",
		Title:           "Hello",
		Slug:            "hello",
		RouteKey:        "posts/hello",
		Locale:          "en",
		ContentType:     "posts",
		ContentTypeSlug: "posts",
		Data: map[string]any{
			"path": "/hello",
		},
	}, cmsContentRecordOptions{includeData: true})

	if got := toString(record["route_key"]); got != "posts/hello" {
		t.Fatalf("expected route_key posts/hello, got %q", got)
	}
}
