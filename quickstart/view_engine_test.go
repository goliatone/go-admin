package quickstart

import (
	"io/fs"
	"testing"
	"testing/fstest"
)

func TestViewEngineTemplateOverrides(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/partials/sidebar.html": {
			Data: []byte("host sidebar"),
		},
	}

	cfg, err := newViewEngineConfig(hostFS)
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	if len(cfg.templateFS) == 0 {
		t.Fatalf("expected template FS stack")
	}

	data, err := fs.ReadFile(cfg.templateFS[0], "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read host sidebar: %v", err)
	}
	if string(data) != "host sidebar" {
		t.Fatalf("expected host sidebar override, got %q", string(data))
	}
}

func TestNewViewEngineRequiresBaseFS(t *testing.T) {
	_, err := NewViewEngine(nil)
	if err == nil {
		t.Fatalf("expected error for nil base filesystem")
	}
}

func TestNewViewEngineBuildsWithHostFS(t *testing.T) {
	hostFS := fstest.MapFS{
		"templates/partials/sidebar.html": {
			Data: []byte("host sidebar"),
		},
	}

	views, err := NewViewEngine(hostFS)
	if err != nil {
		t.Fatalf("NewViewEngine error: %v", err)
	}
	if views == nil {
		t.Fatalf("expected view engine")
	}
}

func TestViewEngineTemplateStackAlignsRoots(t *testing.T) {
	baseFS := fstest.MapFS{
		"layout.html": {
			Data: []byte("base layout"),
		},
	}
	fallbackFS := fstest.MapFS{
		"templates/partials/debug-toolbar.html": {
			Data: []byte("toolbar"),
		},
	}

	cfg, err := newViewEngineConfig(baseFS, WithViewTemplatesFS(fallbackFS))
	if err != nil {
		t.Fatalf("newViewEngineConfig error: %v", err)
	}

	stack := WithFallbackFS(cfg.templateFS[0], cfg.templateFS[1:]...)
	data, err := fs.ReadFile(stack, "partials/debug-toolbar.html")
	if err != nil {
		t.Fatalf("read debug toolbar: %v", err)
	}
	if string(data) != "toolbar" {
		t.Fatalf("expected toolbar template, got %q", string(data))
	}
}
