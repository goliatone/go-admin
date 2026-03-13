package gosync_test

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestGoSyncReleaseAutomationStaysPackageLocal(t *testing.T) {
	t.Parallel()

	root := extractionPackageRoot(t)
	for _, relativePath := range []string{
		"taskfile",
		"client/scripts/sync-version.mjs",
		"client/scripts/build-sync.mjs",
		"client/scripts/verify-package.mjs",
		"client/package.json",
		"client/packages/sync-core/package.json",
	} {
		content, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(relativePath)))
		if err != nil {
			t.Fatalf("read %s: %v", relativePath, err)
		}

		text := string(content)
		for _, forbidden := range []string{
			"examples/esign",
			"agreement-form",
			"pkg/client/assets",
		} {
			if strings.Contains(text, forbidden) {
				t.Fatalf("%s must not reference host-specific path marker %q", relativePath, forbidden)
			}
		}
	}
}

func TestGoSyncPackageProvidesExtractionReadyReleaseArtifacts(t *testing.T) {
	t.Parallel()

	root := extractionPackageRoot(t)
	for _, relativePath := range []string{
		".version",
		"taskfile",
		"README.md",
		"client/packages/sync-core/README.md",
	} {
		if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(relativePath))); err != nil {
			t.Fatalf("expected package artifact %s: %v", relativePath, err)
		}
	}
}

func extractionPackageRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	return filepath.Dir(filename)
}
