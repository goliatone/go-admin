package site

import (
	"io/fs"
	"testing"
	"testing/fstest"
)

func TestReadTemplateFromStackHonorsFSOrder(t *testing.T) {
	primary := fstest.MapFS{
		"site/base.html": &fstest.MapFile{Data: []byte("primary")},
	}
	fallback := fstest.MapFS{
		"site/base.html": &fstest.MapFile{Data: []byte("fallback")},
	}

	content, err := ReadTemplateFromStack("site/base.html", primary, fallback)
	if err != nil {
		t.Fatalf("read template: %v", err)
	}
	if string(content) != "primary" {
		t.Fatalf("expected primary template to win, got %q", string(content))
	}

	content, err = ReadTemplateFromStack("site/base.html", fallback, primary)
	if err != nil {
		t.Fatalf("read template reversed: %v", err)
	}
	if string(content) != "fallback" {
		t.Fatalf("expected fallback template to win in reversed order, got %q", string(content))
	}
}

func TestTemplateFSStackIncludesDefaultsThenOverrides(t *testing.T) {
	base := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("base")}}
	override := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("override")}}

	stack := TemplateFSStack(ResolvedSiteViewConfig{TemplateFS: []fs.FS{override}}, base)
	if len(stack) != 2 {
		t.Fatalf("expected 2 fs entries, got %d", len(stack))
	}
	content, err := ReadTemplateFromStack("site/base.html", stack...)
	if err != nil {
		t.Fatalf("read template from stack: %v", err)
	}
	if string(content) != "base" {
		t.Fatalf("expected default stack precedence, got %q", string(content))
	}
}

func TestShouldReloadTemplatesByEnvironment(t *testing.T) {
	viewCfg := ResolvedSiteViewConfig{ReloadInDevelopment: true}

	if !ShouldReloadTemplates(viewCfg, "dev") {
		t.Fatalf("expected reload in dev")
	}
	if !ShouldReloadTemplates(viewCfg, "staging") {
		t.Fatalf("expected reload in staging")
	}
	if ShouldReloadTemplates(viewCfg, "prod") {
		t.Fatalf("expected no reload in prod")
	}

	always := ResolvedSiteViewConfig{Reload: true, ReloadInDevelopment: false}
	if !ShouldReloadTemplates(always, "prod") {
		t.Fatalf("expected explicit reload=true to win")
	}
}

func TestResolveViewRuntime(t *testing.T) {
	base := fstest.MapFS{"site/base.html": &fstest.MapFile{Data: []byte("base")}}
	runtime := ResolveViewRuntime(ResolvedSiteViewConfig{ReloadInDevelopment: true}, "dev", base)

	if !runtime.Reload {
		t.Fatalf("expected runtime reload true in dev")
	}
	if len(runtime.TemplateFS) != 1 {
		t.Fatalf("expected one fs entry, got %d", len(runtime.TemplateFS))
	}
}
