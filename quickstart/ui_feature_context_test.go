package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	usertypes "github.com/goliatone/go-users/pkg/types"
)

type stubActivityFeedQuery struct{}

func (stubActivityFeedQuery) Query(context.Context, usertypes.ActivityFilter) (usertypes.ActivityPage, error) {
	return usertypes.ActivityPage{}, nil
}

func TestWithUIFeatureContextMarksActivityDisabledByDefault(t *testing.T) {
	adm, err := admin.New(admin.Config{}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	viewCtx := withUIFeatureContext(nil, adm, "activity")
	if enabled, ok := viewCtx["activity_enabled"].(bool); !ok || enabled {
		t.Fatalf("expected activity_enabled=false, got %v", viewCtx["activity_enabled"])
	}
	if enabled, ok := viewCtx["activity_feature_enabled"].(bool); !ok || enabled {
		t.Fatalf("expected activity_feature_enabled=false, got %v", viewCtx["activity_feature_enabled"])
	}
	assertBodyClass(t, viewCtx, "feature-activity")
	assertBodyClass(t, viewCtx, "feature-activity-disabled")
	assertBodyClass(t, viewCtx, "feature-disabled")
}

func TestWithUIFeatureContextMarksActivityEnabledWhenFeedConfigured(t *testing.T) {
	adm, err := admin.New(admin.Config{}, admin.Dependencies{
		ActivityFeedQuery: stubActivityFeedQuery{},
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	viewCtx := withUIFeatureContext(nil, adm, "dashboard")
	if enabled, ok := viewCtx["activity_enabled"].(bool); !ok || !enabled {
		t.Fatalf("expected activity_enabled=true, got %v", viewCtx["activity_enabled"])
	}
	assertBodyClass(t, viewCtx, "feature-activity")
	assertBodyClass(t, viewCtx, "feature-activity-enabled")
	if hasBodyClass(viewCtx, "feature-enabled") {
		t.Fatalf("did not expect feature-enabled when active route is not activity")
	}
}

func TestWithFeatureBodyClassesPreservesExistingBodyClasses(t *testing.T) {
	viewCtx := withFeatureBodyClasses(map[string]any{
		"body_classes": "layout-shell feature-activity",
	}, "activity", false, true)

	assertBodyClass(t, viewCtx, "layout-shell")
	assertBodyClass(t, viewCtx, "feature-activity")
	assertBodyClass(t, viewCtx, "feature-activity-disabled")
	assertBodyClass(t, viewCtx, "feature-disabled")

	classes := strings.Fields(strings.TrimSpace(viewCtx["body_classes"].(string)))
	count := 0
	for _, className := range classes {
		if className == "feature-activity" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected feature-activity class once, got %d (%v)", count, classes)
	}
}

func TestWithUIFeatureContextIncludesTranslationCapabilities(t *testing.T) {
	adm, err := admin.New(admin.Config{}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	viewCtx := withUIFeatureContext(nil, adm, "dashboard")
	caps, ok := viewCtx["translation_capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_capabilities map in view context")
	}
	if profile, _ := caps["profile"].(string); profile == "" {
		t.Fatalf("expected translation capability profile")
	}
	if schemaVersion, _ := caps["schema_version"].(int); schemaVersion != TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema_version %d, got %v", TranslationProductSchemaVersionCurrent, caps["schema_version"])
	}
}

func assertBodyClass(t *testing.T, viewCtx map[string]any, className string) {
	t.Helper()
	if !hasBodyClass(viewCtx, className) {
		t.Fatalf("expected body class %q in %v", className, viewCtx["body_classes"])
	}
}

func hasBodyClass(viewCtx map[string]any, className string) bool {
	raw, _ := viewCtx["body_classes"].(string)
	for _, candidate := range strings.Fields(strings.TrimSpace(raw)) {
		if candidate == className {
			return true
		}
	}
	return false
}
