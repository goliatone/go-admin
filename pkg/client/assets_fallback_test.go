package client

import (
	"io/fs"
	"strings"
	"testing"
	"testing/fstest"
)

func TestAssetsFSFallsBackToSourceCopies(t *testing.T) {
	assets := newAssetsFS(fstest.MapFS{
		"src/styles/site-runtime.css": &fstest.MapFile{Data: []byte(".site-runtime { display: block; }\n")},
		"src/site/site-runtime.js":    &fstest.MapFile{Data: []byte("console.log('site runtime');\n")},
		"src/styles/widgets.css":      &fstest.MapFile{Data: []byte(".widget { color: red; }\n")},
	})

	for _, tc := range []struct {
		path string
		want string
	}{
		{path: "dist/styles/site-runtime.css", want: ".site-runtime { display: block; }\n"},
		{path: "dist/runtime/site-runtime.js", want: "console.log('site runtime');\n"},
		{path: "dist/styles/widgets.css", want: ".widget { color: red; }\n"},
	} {
		got, err := fs.ReadFile(assets, tc.path)
		if err != nil {
			t.Fatalf("read %s: %v", tc.path, err)
		}
		if string(got) != tc.want {
			t.Fatalf("unexpected content for %s: got %q want %q", tc.path, string(got), tc.want)
		}
	}
}

func TestAssetsFSSynthesizesDebugStyles(t *testing.T) {
	assets := newAssetsFS(fstest.MapFS{
		"src/styles/debug/console.css":          &fstest.MapFile{Data: []byte(".console{}\n")},
		"src/styles/debug/prism-catppuccin.css": &fstest.MapFile{Data: []byte(".prism{}\n")},
		"src/styles/debug/expandable-rows.css":  &fstest.MapFile{Data: []byte(".rows{}\n")},
	})

	got, err := fs.ReadFile(assets, "dist/styles/debug.css")
	if err != nil {
		t.Fatalf("read debug.css: %v", err)
	}

	content := string(got)
	for _, fragment := range []string{".console{}", ".prism{}", ".rows{}"} {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected synthesized debug.css to contain %q, got %q", fragment, content)
		}
	}
}

func TestAssetsFSPrefersExistingDistAsset(t *testing.T) {
	assets := newAssetsFS(fstest.MapFS{
		"dist/styles/site-runtime.css": &fstest.MapFile{Data: []byte(".from-dist{}\n")},
		"src/styles/site-runtime.css":  &fstest.MapFile{Data: []byte(".from-src{}\n")},
	})

	got, err := fs.ReadFile(assets, "dist/styles/site-runtime.css")
	if err != nil {
		t.Fatalf("read dist asset: %v", err)
	}
	if string(got) != ".from-dist{}\n" {
		t.Fatalf("expected dist asset to win, got %q", string(got))
	}
}
