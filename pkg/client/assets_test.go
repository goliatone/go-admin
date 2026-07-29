package client

import (
	archivezip "archive/zip"
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/mod/module"
	modzip "golang.org/x/mod/zip"
)

var pinnedDocumentDependencyPaths = []string{
	"dist/third-party/iconoir/iconoir.css",
	"dist/third-party/iconoir/LICENSE",
	"dist/third-party/simple-datatables/style.css",
	"dist/third-party/simple-datatables/LICENSE",
	"dist/third-party/echarts/echarts.min.js",
	"dist/third-party/echarts/LICENSE",
	"dist/third-party/echarts/NOTICE",
}

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

func TestPinnedDocumentDependenciesSurviveModuleZipConstruction(t *testing.T) {
	const (
		modulePath    = "github.com/goliatone/go-admin"
		moduleVersion = "v0.0.0"
		archivePrefix = modulePath + "@" + moduleVersion + "/pkg/client/assets/"
	)

	fixtureRoot := t.TempDir()
	if err := os.WriteFile(
		filepath.Join(fixtureRoot, "go.mod"),
		[]byte("module "+modulePath+"\n\ngo 1.26.5\n"),
		0o644,
	); err != nil {
		t.Fatalf("write fixture go.mod: %v", err)
	}
	for _, assetPath := range pinnedDocumentDependencyPaths {
		content, err := fs.ReadFile(Assets(), assetPath)
		if err != nil {
			t.Fatalf("read embedded dependency %q: %v", assetPath, err)
		}
		target := filepath.Join(fixtureRoot, "pkg", "client", "assets", filepath.FromSlash(assetPath))
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			t.Fatalf("create fixture directory for %q: %v", assetPath, err)
		}
		if err := os.WriteFile(target, content, 0o644); err != nil {
			t.Fatalf("write fixture dependency %q: %v", assetPath, err)
		}
	}

	var moduleArchive bytes.Buffer
	if err := modzip.CreateFromDir(
		&moduleArchive,
		module.Version{Path: modulePath, Version: moduleVersion},
		fixtureRoot,
	); err != nil {
		t.Fatalf("create module zip: %v", err)
	}
	archive, err := archivezip.NewReader(bytes.NewReader(moduleArchive.Bytes()), int64(moduleArchive.Len()))
	if err != nil {
		t.Fatalf("open module zip: %v", err)
	}
	archived := make(map[string]bool, len(archive.File))
	for _, file := range archive.File {
		archived[file.Name] = true
	}
	for _, assetPath := range pinnedDocumentDependencyPaths {
		archivePath := archivePrefix + assetPath
		if !archived[archivePath] {
			t.Errorf("module zip omitted packaged dependency %q", archivePath)
		}
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
