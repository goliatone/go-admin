package client

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const updateSiteTemplateSnapshotsEnv = "UPDATE_SITE_TEMPLATE_SNAPSHOTS"

var siteTemplateVisualRegressionTargets = []string{
	"site/base.html",
	"site/partials/header.html",
	"site/partials/footer.html",
	"site/partials/menu_main.html",
	"site/partials/menu_footer.html",
	"site/error.html",
	"site/error/404.html",
	"site/error/missing_translation.html",
	"site/search.html",
}

func TestSiteTemplateVisualRegressionSnapshots(t *testing.T) {
	updateSnapshots := shouldUpdateSiteSnapshots()
	for _, templatePath := range siteTemplateVisualRegressionTargets {
		t.Run(templatePath, func(t *testing.T) {
			rawTemplate, err := fs.ReadFile(Templates(), templatePath)
			if err != nil {
				t.Fatalf("read template %s: %v", templatePath, err)
			}
			actual := normalizeSiteTemplate(string(rawTemplate))

			snapshotPath := siteTemplateSnapshotPath(templatePath)
			expectedRaw, readErr := os.ReadFile(snapshotPath)
			if readErr != nil {
				if !updateSnapshots {
					t.Fatalf("read snapshot %s: %v (set %s=1 to create)", snapshotPath, readErr, updateSiteTemplateSnapshotsEnv)
				}
				writeSiteSnapshot(t, snapshotPath, actual)
				return
			}
			expected := normalizeSiteTemplate(string(expectedRaw))
			if expected == actual {
				return
			}

			if updateSnapshots {
				writeSiteSnapshot(t, snapshotPath, actual)
				return
			}
			t.Fatalf("site template snapshot mismatch for %s (set %s=1 to refresh)", templatePath, updateSiteTemplateSnapshotsEnv)
		})
	}
}

func normalizeSiteTemplate(content string) string {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	lines := strings.Split(strings.TrimSpace(content), "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], " \t")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func siteTemplateSnapshotPath(templatePath string) string {
	sanitized := strings.ReplaceAll(strings.TrimSpace(templatePath), "/", "__")
	return filepath.Join("testdata", "site_template_snapshots", sanitized+".snap.html")
}

func shouldUpdateSiteSnapshots() bool {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv(updateSiteTemplateSnapshotsEnv)))
	return raw == "1" || raw == "true" || raw == "yes"
}

func writeSiteSnapshot(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create snapshot dir for %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content+"\n"), 0o644); err != nil {
		t.Fatalf("write snapshot %s: %v", path, err)
	}
}
