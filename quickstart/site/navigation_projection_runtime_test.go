package site

import (
	"context"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationProjectionRuntimeMethodsMatchFlowHelpers(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolvedSiteConfig{
			DefaultLocale:    "en",
			SupportedLocales: []string{"en", "es"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: ResolvedSiteFeatures{
				EnableI18N: true,
			},
		},
		authorizer: siteAuthorizerStub{
			allowed: map[string]bool{
				"nav.hidden": false,
			},
		},
	}
	items := []admin.MenuItem{
		{ID: "hidden", Label: "Hidden", Permissions: []string{"nav.hidden"}, Target: map[string]any{"url": "/hidden"}},
		{
			ID:    "group",
			Type:  "group",
			Label: "Group",
			Children: []admin.MenuItem{
				{ID: "child", Label: "Child", Target: map[string]any{"url": "/docs/getting-started"}},
			},
		},
	}

	filteredByMethod := runtime.filterMenuItems(context.Background(), items)
	filteredByFlow := filterNavigationMenuItems(runtime, context.Background(), items)
	if !reflect.DeepEqual(filteredByMethod, filteredByFlow) {
		t.Fatalf("expected runtime filter to delegate to flow helper, got method=%+v flow=%+v", filteredByMethod, filteredByFlow)
	}

	projectedByMethod := runtime.projectMenuItems(filteredByMethod, "/es/docs/getting-started", "es", menuDedupByURL, true)
	projectedByFlow := projectNavigationMenuItems(runtime, filteredByFlow, "/es/docs/getting-started", "es", menuDedupByURL, true)
	if !reflect.DeepEqual(projectedByMethod, projectedByFlow) {
		t.Fatalf("expected runtime projection to delegate to flow helper, got method=%+v flow=%+v", projectedByMethod, projectedByFlow)
	}

	itemByMethod := runtime.projectMenuItem(filteredByMethod[0], "/es/docs/getting-started", "es", menuDedupByURL, true)
	itemByFlow := projectNavigationMenuItem(runtime, filteredByFlow[0], "/es/docs/getting-started", "es", menuDedupByURL, true)
	if !reflect.DeepEqual(itemByMethod, itemByFlow) {
		t.Fatalf("expected runtime projectMenuItem to delegate to flow helper, got method=%+v flow=%+v", itemByMethod, itemByFlow)
	}
}
