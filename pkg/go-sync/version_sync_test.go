package gosync_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	gosync "github.com/goliatone/go-admin/pkg/go-sync"
)

func TestVersionSynchronizationAcrossVendoredPackageSurfaces(t *testing.T) {
	t.Parallel()

	root := packageRoot(t)
	version := strings.TrimSpace(readFile(t, filepath.Join(root, ".version")))
	if version == "" {
		t.Fatal(".version must not be empty")
	}
	if gosync.Version != version {
		t.Fatalf("go package version mismatch: go=%q file=%q", gosync.Version, version)
	}

	workspaceVersion := packageJSONVersion(t, filepath.Join(root, "client", "package.json"))
	if workspaceVersion != version {
		t.Fatalf("client workspace version mismatch: workspace=%q file=%q", workspaceVersion, version)
	}

	syncCoreVersion := packageJSONVersion(t, filepath.Join(root, "client", "packages", "sync-core", "package.json"))
	if syncCoreVersion != version {
		t.Fatalf("sync-core package version mismatch: sync-core=%q file=%q", syncCoreVersion, version)
	}

	metadata := readFile(t, filepath.Join(root, "client", "packages", "sync-core", "src", "metadata.ts"))
	expectedLine := `export const SYNC_CORE_PACKAGE_VERSION = "` + version + `";`
	if !strings.Contains(metadata, expectedLine) {
		t.Fatalf("sync-core metadata version must match .version, expected line %q", expectedLine)
	}
}

func packageRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	return filepath.Dir(filename)
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func packageJSONVersion(t *testing.T, path string) string {
	t.Helper()
	var payload struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal([]byte(readFile(t, path)), &payload); err != nil {
		t.Fatalf("decode package json %s: %v", path, err)
	}
	return payload.Version
}
