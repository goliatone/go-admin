package main

import (
	"os"
	"strings"
	"testing"
)

func TestExampleDashboardLegacyPresentationModelStaysRemoved(t *testing.T) {
	assertExampleFileDoesNotContain(t, "helpers/tab_rendering.go", "RenderLayout(")
	assertExampleFileDoesNotContain(
		t,
		"renderers/dashboard_renderer.go",
		"func (r *TemplateRenderer) normalizeData(",
	)
}

func assertExampleFileDoesNotContain(t *testing.T, path string, forbidden ...string) {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	for _, token := range forbidden {
		if strings.Contains(string(content), token) {
			t.Fatalf("expected %s to omit %q", path, token)
		}
	}
}
