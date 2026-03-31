package site

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	router "github.com/goliatone/go-router"
)

func TestPrefixedRoutePathHandlesBasePathsAndAbsoluteRoutes(t *testing.T) {
	cases := []struct {
		name      string
		basePath  string
		routePath string
		want      string
	}{
		{name: "empty route defaults to root", basePath: "", routePath: "", want: "/"},
		{name: "relative route on root base", basePath: "/", routePath: "search", want: "/search"},
		{name: "prefixed child route", basePath: "/site", routePath: "/search", want: "/site/search"},
		{name: "absolute external route preserved", basePath: "/site", routePath: "https://example.com/search", want: "https://example.com/search"},
		{name: "protocol relative route preserved", basePath: "/site", routePath: "//example.com/search", want: "//example.com/search"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := prefixedRoutePath(tc.basePath, tc.routePath); got != tc.want {
				t.Fatalf("prefixedRoutePath(%q, %q) = %q, want %q", tc.basePath, tc.routePath, got, tc.want)
			}
		})
	}
}

func TestSearchSuggestRouteNormalizesEndpoint(t *testing.T) {
	cases := []struct {
		name     string
		endpoint string
		want     string
	}{
		{name: "default empty endpoint", endpoint: "", want: DefaultSearchSuggestRoute},
		{name: "trims trailing slash", endpoint: "/api/v1/site/search/", want: DefaultSearchSuggestRoute},
		{name: "preserves suggest suffix", endpoint: "/api/v1/site/search/suggest", want: DefaultSearchSuggestRoute},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := searchSuggestRoute(tc.endpoint); got != tc.want {
				t.Fatalf("searchSuggestRoute(%q) = %q, want %q", tc.endpoint, got, tc.want)
			}
		})
	}
}

func TestRegisterRouteSupportDetectsAdapterSpecificCatchAllPaths(t *testing.T) {
	fiberAdapter := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	if got := siteCatchAllRoutePath(fiberAdapter.Router(), "/site"); got != "/site/*" {
		t.Fatalf("expected fiber catch-all /site/*, got %q", got)
	}
	if isHTTPRouterAdapter(fiberAdapter.Router()) {
		t.Fatalf("did not expect fiber adapter to be treated as httprouter")
	}

	httpAdapter := router.NewHTTPServer()
	if got := siteCatchAllRoutePath(httpAdapter.Router(), "/site"); got != "/site/*path" {
		t.Fatalf("expected httprouter catch-all /site/*path, got %q", got)
	}
	if !isHTTPRouterAdapter(httpAdapter.Router()) {
		t.Fatalf("expected httprouter adapter to be detected")
	}

	recording := &recordingRouter{}
	if got := siteCatchAllRoutePath(recording, "/site"); got != "/site/*path" {
		t.Fatalf("expected generic router catch-all /site/*path, got %q", got)
	}
	if isHTTPRouterAdapter(recording) {
		t.Fatalf("did not expect recording router to be treated as httprouter")
	}
}

func TestRegisterRouteSupportBuildsSearchAndContentPathsForFlowConsumers(t *testing.T) {
	searchPath := prefixedRoutePath("/site", "/search")
	if searchPath != "/site/search" {
		t.Fatalf("expected prefixed search path /site/search, got %q", searchPath)
	}
	searchTopicPath := searchPath + "/topics/:topic_slug"
	if searchTopicPath != "/site/search/topics/:topic_slug" {
		t.Fatalf("expected prefixed topic path, got %q", searchTopicPath)
	}
	searchAPIPath := prefixedRoutePath("", "/api/v1/site/search")
	if searchAPIPath != "/api/v1/site/search" {
		t.Fatalf("expected search api path, got %q", searchAPIPath)
	}
	suggestAPIPath := prefixedRoutePath("", searchSuggestRoute("/api/v1/site/search"))
	if suggestAPIPath != DefaultSearchSuggestRoute {
		t.Fatalf("expected suggest api path %q, got %q", DefaultSearchSuggestRoute, suggestAPIPath)
	}
	baseRoutePath := prefixedRoutePath("/site", "/")
	if baseRoutePath != "/site" {
		t.Fatalf("expected base route path /site, got %q", baseRoutePath)
	}
	httpAdapter := router.NewHTTPServer()
	if got := siteCatchAllRoutePath(httpAdapter.Router(), "/site"); got != "/site/*path" {
		t.Fatalf("expected catch-all fallback /site/*path, got %q", got)
	}
}

var _ router.Router[*fiber.App] = (*recordingRouter)(nil)
