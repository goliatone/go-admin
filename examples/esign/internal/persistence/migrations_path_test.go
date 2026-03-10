package persistence

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

func TestResolveAppLocalMigrationFSUsesConfigSiblingDataDirNotStoresDir(t *testing.T) {
	rootDir := t.TempDir()
	configDir := filepath.Join(rootDir, "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir config dir: %v", err)
	}

	preferredDir := filepath.Join(rootDir, "data", "sql", "migrations")
	storesDir := filepath.Join(rootDir, "stores", "data", "sql", "migrations")
	if err := os.MkdirAll(preferredDir, 0o755); err != nil {
		t.Fatalf("mkdir preferred migrations dir: %v", err)
	}
	if err := os.MkdirAll(storesDir, 0o755); err != nil {
		t.Fatalf("mkdir stores migrations dir: %v", err)
	}

	const preferredFile = "0001_preferred.up.sql"
	const storesFile = "9999_stores_only.up.sql"
	if err := os.WriteFile(filepath.Join(preferredDir, preferredFile), []byte("-- preferred"), 0o644); err != nil {
		t.Fatalf("write preferred migration: %v", err)
	}
	if err := os.WriteFile(filepath.Join(storesDir, storesFile), []byte("-- stores"), 0o644); err != nil {
		t.Fatalf("write stores migration: %v", err)
	}

	cfg := appcfg.Defaults()
	cfg.Migrations.LocalDir = "data/sql/migrations"
	cfg.ConfigPath = filepath.Join(configDir, "app.json")

	resolved, err := resolveAppLocalMigrationFS(cfg)
	if err != nil {
		t.Fatalf("resolveAppLocalMigrationFS: %v", err)
	}

	entries, err := fs.ReadDir(resolved, ".")
	if err != nil {
		t.Fatalf("ReadDir resolved root: %v", err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry == nil || entry.IsDir() {
			continue
		}
		names = append(names, strings.TrimSpace(entry.Name()))
	}
	if !containsStringValue(names, preferredFile) {
		t.Fatalf("expected preferred migration file %q in resolved root, got %v", preferredFile, names)
	}
	if containsStringValue(names, storesFile) {
		t.Fatalf("unexpected stores migration file %q in resolved root (%v)", storesFile, names)
	}
}

func containsStringValue(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}
