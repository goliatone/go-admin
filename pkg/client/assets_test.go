package client

import (
	"io/fs"
	"testing"
)

func TestAssetsEmbedIncludesOutputCSS(t *testing.T) {
	if _, err := fs.Stat(Assets(), "output.css"); err != nil {
		t.Fatalf("expected embedded output.css: %v", err)
	}
}

func TestTemplatesEmbedIncludesDebugIndex(t *testing.T) {
	if _, err := fs.Stat(Templates(), "resources/debug/index.html"); err != nil {
		t.Fatalf("expected embedded debug index template: %v", err)
	}
}
