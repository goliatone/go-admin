package client

import (
	"io/fs"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/internal/releasecheck"
)

var pinnedDocumentDependencyPaths = func() []string {
	const assetsPrefix = "pkg/client/assets/"
	out := make([]string, 0, len(releasecheck.RequiredClientArchivePaths))
	for _, archivePath := range releasecheck.RequiredClientArchivePaths {
		out = append(out, strings.TrimPrefix(archivePath, assetsPrefix))
	}
	return out
}()

func TestAssetsEmbedIncludesOutputCSS(t *testing.T) {
	if _, err := fs.Stat(Assets(), "output.css"); err != nil {
		t.Fatalf("expected embedded output.css: %v", err)
	}
}

func TestAssetsEmbedIncludesSiteRuntimeAssets(t *testing.T) {
	for _, path := range []string{
		"dist/runtime/cms-relationship-actions.js",
		"dist/styles/site-runtime.css",
		"dist/runtime/site-runtime.js",
	} {
		if _, err := fs.Stat(Assets(), path); err != nil {
			t.Fatalf("expected embedded site runtime asset %q: %v", path, err)
		}
	}
}

func TestAssetsEmbedIncludesPinnedDocumentDependencies(t *testing.T) {
	for _, assetPath := range pinnedDocumentDependencyPaths {
		info, err := fs.Stat(Assets(), assetPath)
		if err != nil {
			t.Fatalf("expected embedded document dependency %q: %v", assetPath, err)
		}
		if info.Size() == 0 {
			t.Fatalf("embedded document dependency %q is empty", assetPath)
		}
	}
}

func TestPinnedDocumentDependenciesAreEligibleInActualModuleSource(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve current test source path")
	}
	moduleRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))
	if err := releasecheck.CheckRequiredModuleSource(
		moduleRoot,
		releasecheck.RequiredClientArchivePaths,
	); err != nil {
		t.Fatal(err)
	}
}

func TestAssetsEmbedExcludesFrontendTestFiles(t *testing.T) {
	if _, err := fs.Stat(Assets(), "tests/error_helpers.test.mjs"); err == nil {
		t.Fatalf("did not expect frontend test files to be embedded")
	}
}

func TestAssetsEmbedExcludesNodeModules(t *testing.T) {
	if _, err := fs.Stat(Assets(), "node_modules/.package-lock.json"); err == nil {
		t.Fatalf("did not expect node_modules to be embedded")
	}
}

func TestTemplatesEmbedIncludesDebugIndex(t *testing.T) {
	if _, err := fs.Stat(Templates(), "resources/debug/index.html"); err != nil {
		t.Fatalf("expected embedded debug index template: %v", err)
	}
	data, err := fs.ReadFile(Templates(), "resources/debug/index.html")
	if err != nil {
		t.Fatalf("read embedded debug index template: %v", err)
	}
	for _, asset := range []string{"formgen/formgen-vanilla.css", "runtime/formgen-behaviors.min.js", "runtime/formgen-relationships.min.js"} {
		if !strings.Contains(string(data), asset) {
			t.Fatalf("expected debug index template to include %q", asset)
		}
	}
}

func TestTemplatesEmbedContentTypesEditorIncludesRelationshipsRuntime(t *testing.T) {
	data, err := fs.ReadFile(Templates(), "resources/content-types/editor.html")
	if err != nil {
		t.Fatalf("expected embedded content-types editor template: %v", err)
	}
	if !strings.Contains(string(data), `runtime/formgen-relationships.min.js`) {
		t.Fatalf("expected content-types editor template to load relationships runtime script")
	}
}

func TestRolesDetailTemplateUsesStringPermissions(t *testing.T) {
	data, err := fs.ReadFile(Templates(), "resources/roles/detail.html")
	if err != nil {
		t.Fatalf("expected embedded roles detail template: %v", err)
	}

	content := string(data)
	if strings.Contains(content, `perm.name|default:perm`) {
		t.Fatalf("roles detail template must not access perm.name for string permissions")
	}
	if !strings.Contains(content, `{{ perm }}`) {
		t.Fatalf("roles detail template must render permission values directly")
	}
}
