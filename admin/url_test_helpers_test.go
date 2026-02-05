package admin

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

func mustResolveURL(t *testing.T, urls urlkit.Resolver, group, route string, params any, query any) string {
	t.Helper()
	manager, ok := urls.(*urlkit.RouteManager)
	if !ok || manager == nil {
		t.Fatalf("expected url manager resolver")
	}
	path, err := manager.ResolveWith(group, route, params, query)
	if err != nil {
		t.Fatalf("resolve %s.%s: %v", group, route, err)
	}
	return path
}
