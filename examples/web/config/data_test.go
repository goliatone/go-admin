package config

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestDataConfigIndependentOfDebug(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "app.json")
	if err := os.WriteFile(filename, []byte(`{}`), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("APP_ADMIN__DEBUG__ENABLED", "false")
	t.Setenv("APP_ADMIN__DATA__ENABLED", "true")
	t.Setenv("APP_ADMIN__DATA__WRITES_ENABLED", "false")
	t.Setenv("APP_ADMIN__DATA__STORE_PATH", filepath.Join(t.TempDir(), "isolated.db"))
	cfg, _, err := Load(context.Background(), filename)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Admin.Debug.Enabled || !cfg.Admin.Data.Enabled || cfg.Admin.Data.WritesEnabled || filepath.Base(cfg.Admin.Data.StorePath) != "isolated.db" {
		t.Fatal(cfg.Admin.Data, cfg.Admin.Debug)
	}
	cfg.Admin.Data.StorePath = ""
	if err = cfg.Validate(); err == nil {
		t.Fatal("missing store accepted")
	}
	cfg.Admin.Data.Enabled = false
	if err = cfg.Validate(); err != nil {
		t.Fatal("disabled Data requires a store", err)
	}
}
