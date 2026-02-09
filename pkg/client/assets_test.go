package client

import (
	"io/fs"
	"strings"
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
