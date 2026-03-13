package data

import (
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
)

func TestClientFSIncludesSyncCorePackageDirectory(t *testing.T) {
	content, err := fs.ReadFile(ClientFS(), "sync-core/index.js")
	if err != nil {
		t.Fatalf("read sync-core/index.js from root client fs: %v", err)
	}
	if len(content) == 0 {
		t.Fatal("embedded sync-core/index.js is empty")
	}
}

func TestClientSyncCoreFSIsSubRooted(t *testing.T) {
	content, err := fs.ReadFile(ClientSyncCoreFS(), "index.js")
	if err != nil {
		t.Fatalf("read index.js from sync-core fs: %v", err)
	}
	if !strings.Contains(string(content), "SYNC_CORE_PACKAGE_VERSION") {
		t.Fatal("expected embedded sync-core artifact to expose sync-core runtime metadata")
	}
	if _, err := fs.ReadFile(ClientSyncCoreFS(), "sync-core/index.js"); err == nil {
		t.Fatal("sync-core fs should be rooted at data/client/sync-core")
	}
}

func TestEmbeddedSyncCoreArtifactMatchesWorkspaceDistOutput(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	distRoot := filepath.Join(filepath.Dir(filename), "..", "client", "packages", "sync-core", "dist")

	distFiles, err := fs.Glob(os.DirFS(distRoot), "*")
	if err != nil {
		t.Fatalf("list sync-core dist output: %v", err)
	}
	embeddedFiles, err := fs.Glob(ClientSyncCoreFS(), "*")
	if err != nil {
		t.Fatalf("list embedded sync-core output: %v", err)
	}

	sort.Strings(distFiles)
	sort.Strings(embeddedFiles)
	if strings.Join(distFiles, ",") != strings.Join(embeddedFiles, ",") {
		t.Fatalf("embedded sync-core files mismatch dist output: dist=%v embedded=%v", distFiles, embeddedFiles)
	}

	for _, name := range distFiles {
		distContent, readErr := os.ReadFile(filepath.Join(distRoot, name))
		if readErr != nil {
			t.Fatalf("read sync-core dist output %s: %v", name, readErr)
		}
		embeddedContent, readErr := fs.ReadFile(ClientSyncCoreFS(), name)
		if readErr != nil {
			t.Fatalf("read embedded sync-core artifact %s: %v", name, readErr)
		}

		if string(embeddedContent) != string(distContent) {
			t.Fatalf("embedded sync-core artifact %s must match workspace dist output", name)
		}
	}
}
