package quickstart

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestContentTypesDashboardShellContract(t *testing.T) {
	shell, err := contentTypesDashboardShell().Normalize()
	if err != nil {
		t.Fatalf("normalize content types shell: %v", err)
	}
	if shell.SurfaceID != "content-types" {
		t.Fatalf("expected content-types surface, got %q", shell.SurfaceID)
	}
	if got := shell.Storage.StorageKey(shell.SurfaceID); got != "go-dashboard:shell:v1:content-types:viewer:anonymous" {
		t.Fatalf("unexpected storage key %q", got)
	}
	assertShellRegion(t, shell, "list", dashboardcmp.ShellRegionRoleNavigation, dashboardcmp.ShellRegionPlacementLeading, 240, 320, 420)
	assertShellRegion(t, shell, "builder", dashboardcmp.ShellRegionRoleMain, dashboardcmp.ShellRegionPlacementMain, 0, 0, 0)
	assertShellRegion(t, shell, "preview", dashboardcmp.ShellRegionRolePreview, dashboardcmp.ShellRegionPlacementTrailing, 320, 400, 720)
}

func TestBlockLibraryDashboardShellContract(t *testing.T) {
	shell, err := blockLibraryDashboardShell().Normalize()
	if err != nil {
		t.Fatalf("normalize block library shell: %v", err)
	}
	if shell.SurfaceID != "block-library" {
		t.Fatalf("expected block-library surface, got %q", shell.SurfaceID)
	}
	if got := shell.Storage.StorageKey(shell.SurfaceID); got != "go-dashboard:shell:v1:block-library:viewer:anonymous" {
		t.Fatalf("unexpected storage key %q", got)
	}
	assertShellRegion(t, shell, "list", dashboardcmp.ShellRegionRoleNavigation, dashboardcmp.ShellRegionPlacementLeading, 200, 240, 380)
	assertShellRegion(t, shell, "builder", dashboardcmp.ShellRegionRoleMain, dashboardcmp.ShellRegionPlacementMain, 0, 0, 0)
	assertShellRegion(t, shell, "palette", dashboardcmp.ShellRegionRolePalette, dashboardcmp.ShellRegionPlacementTrailing, 220, 260, 400)
}

func TestDashboardShellTemplateContextIncludesStorageKey(t *testing.T) {
	payload, err := dashboardShellTemplateContext(contentTypesDashboardShell())
	if err != nil {
		t.Fatalf("build shell template context: %v", err)
	}
	storage, ok := payload["storage"].(map[string]any)
	if !ok {
		t.Fatalf("expected storage payload, got %#v", payload["storage"])
	}
	if got := storage["key"]; got != "go-dashboard:shell:v1:content-types:viewer:anonymous" {
		t.Fatalf("unexpected storage key %v", got)
	}
}

func TestContentBuilderTemplatesUseSharedDashboardShellContract(t *testing.T) {
	files := []string{
		filepath.Join("..", "pkg", "client", "templates", "resources", "content-types", "editor.html"),
		filepath.Join("..", "pkg", "client", "templates", "resources", "block-definitions", "index.html"),
	}
	for _, file := range files {
		t.Run(filepath.Base(filepath.Dir(file))+"/"+filepath.Base(file), func(t *testing.T) {
			data, err := os.ReadFile(file)
			if err != nil {
				t.Fatalf("read template: %v", err)
			}
			html := string(data)
			if !strings.Contains(html, "data-dashboard-shell") {
				t.Fatalf("expected shared dashboard shell marker in %s", file)
			}
			if strings.Count(html, "shell.css") != 0 || strings.Count(html, "shell.js") != 0 {
				t.Fatalf("expected shell assets to be data-driven, not hardcoded in %s", file)
			}
			for _, retired := range []string{"data-content-modeling-shell", "data-pane-", "cm-shell", "cm-rail", "cm-splitter", "cm-icon-btn"} {
				if strings.Contains(html, retired) {
					t.Fatalf("template %s still contains retired shell marker %q", file, retired)
				}
			}
		})
	}
}

func assertShellRegion(t *testing.T, shell dashboardcmp.Shell, id, role, placement string, min, def, max int) {
	t.Helper()
	for _, region := range shell.Regions {
		if region.ID != id {
			continue
		}
		if region.Role != role || region.Placement != placement {
			t.Fatalf("region %s expected role/place %s/%s, got %s/%s", id, role, placement, region.Role, region.Placement)
		}
		if min > 0 || def > 0 || max > 0 {
			if region.Sizing.Min != min || region.Sizing.Default != def || region.Sizing.Max != max {
				t.Fatalf("region %s expected sizing %d/%d/%d, got %+v", id, min, def, max, region.Sizing)
			}
		}
		return
	}
	t.Fatalf("missing region %s", id)
}
