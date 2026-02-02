package admin

import (
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	admindata "github.com/goliatone/go-admin/data"
)

func TestPreferencesSchemaResolutionEmbedded(t *testing.T) {
	mod := NewPreferencesModule()

	_, info, err := mod.resolvePreferencesSchema(nil, nil)
	if err != nil {
		t.Fatalf("resolve preferences schema: %v", err)
	}

	if info.Source != preferencesSchemaSourceEmbed {
		t.Fatalf("expected embedded schema source, got %q", info.Source)
	}
	if info.Path != preferencesSchemaDefaultPath {
		t.Fatalf("expected embedded schema path %q, got %q", preferencesSchemaDefaultPath, info.Path)
	}
	if info.FormID == "" {
		t.Fatalf("expected schema form ID")
	}
	if info.Schema == nil {
		t.Fatalf("expected schema map")
	}
}

func TestPreferencesSchemaResolutionOverride(t *testing.T) {
	payload, err := fs.ReadFile(admindata.UISchemas(), preferencesSchemaDefaultPath)
	if err != nil {
		t.Fatalf("read embedded schema: %v", err)
	}

	tmpDir := t.TempDir()
	schemaPath := filepath.Join(tmpDir, preferencesSchemaFileName)
	if err := os.WriteFile(schemaPath, payload, 0o600); err != nil {
		t.Fatalf("write override schema: %v", err)
	}

	mod := NewPreferencesModule()
	mod.WithSchemaPath(tmpDir)

	_, info, err := mod.resolvePreferencesSchema(nil, nil)
	if err != nil {
		t.Fatalf("resolve override schema: %v", err)
	}
	if info.Source != preferencesSchemaSourceFile {
		t.Fatalf("expected file schema source, got %q", info.Source)
	}
	if info.Path != schemaPath {
		t.Fatalf("expected override schema path %q, got %q", schemaPath, info.Path)
	}
	if info.Schema == nil {
		t.Fatalf("expected schema map")
	}
}
