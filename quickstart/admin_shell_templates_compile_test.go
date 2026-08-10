package quickstart

import (
	"bytes"
	"io/fs"
	"sort"
	"strings"
	"testing"

	"github.com/flosch/pongo2/v6"
	"github.com/goliatone/go-admin/admin"
	client "github.com/goliatone/go-admin/pkg/client"
)

func TestEveryPackagedClientTemplateCompiles(t *testing.T) {
	registerTemplateFilterAliases()
	set := pongo2.NewSet("packaged-admin-template-compile-check", rootFSLoader{fsys: client.Templates()})

	paths := packagedHTMLTemplatePaths(t)
	for _, path := range paths {
		if _, err := set.FromFile(path); err != nil {
			t.Errorf("template %s failed to compile: %v", path, err)
		}
	}
}

func TestAuthenticatedTemplatePathMatrixRendersCanonicalDefaults(t *testing.T) {
	views, err := NewViewEngine(client.Templates(), WithViewBasePath("/admin"), WithViewReload(false))
	if err != nil {
		t.Fatalf("NewViewEngine: %v", err)
	}
	if err := views.Load(); err != nil {
		t.Fatalf("load packaged templates: %v", err)
	}

	selection := admin.DefaultAdminStructuralPartials()
	for _, path := range packagedHTMLTemplatePaths(t) {
		content, err := fs.ReadFile(client.Templates(), path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		source := strings.TrimSpace(string(content))
		if !strings.HasPrefix(source, `{% extends "layout.html" %}`) &&
			!strings.HasPrefix(source, `{% extends "resources/shared/`) {
			continue
		}

		name := strings.TrimSuffix(path, ".html")
		var rendered bytes.Buffer
		if err := views.Render(&rendered, name, structuralSurfaceRenderContext(selection)); err != nil {
			t.Errorf("render authenticated template %s: %v", path, err)
			continue
		}
		if !strings.Contains(rendered.String(), "data-admin-shell") {
			t.Errorf("authenticated template %s omitted canonical shell", path)
		}
	}
}

func packagedHTMLTemplatePaths(t *testing.T) []string {
	t.Helper()
	paths := []string{}
	err := fs.WalkDir(client.Templates(), ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry == nil || entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return walkErr
		}
		paths = append(paths, path)
		return nil
	})
	if err != nil {
		t.Fatalf("walk packaged templates: %v", err)
	}
	sort.Strings(paths)
	return paths
}
