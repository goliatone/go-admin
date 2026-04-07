package admin

import (
	"os"
	"strings"
	"testing"
)

func TestDashboardLegacyPresentationModelRemoved(t *testing.T) {
	assertFileDoesNotContain(t, "dashboard_renderer.go",
		"type DashboardLayout struct",
		"type LegacyDashboardRenderer interface",
		"type WidgetArea struct",
		"type ResolvedWidget struct",
		"type WidgetMetadata struct",
		"type WidgetLayout struct",
		"func (page AdminDashboardPage) LegacyPayload(",
	)
	assertFileDoesNotContain(t, "dashboard.go", "func (d *Dashboard) RenderLayout(")
	assertFileDoesNotContain(t, "dashboard_godash.go", "func orderedDashboardAreasPayload(")
	assertFileDoesNotContain(t, "../examples/web/helpers/tab_rendering.go", "RenderLayout(")
	assertFileDoesNotContain(t, "../examples/web/renderers/dashboard_renderer.go", "func (r *TemplateRenderer) normalizeData(")
}

func assertFileDoesNotContain(t *testing.T, path string, forbidden ...string) {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	text := string(content)
	for _, token := range forbidden {
		if strings.Contains(text, token) {
			t.Fatalf("expected %s to omit %q", path, token)
		}
	}
}
