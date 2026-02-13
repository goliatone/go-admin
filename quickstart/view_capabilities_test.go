package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestBuildPanelExportConfigUsesResolvedAdminExportsPath(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	got := BuildPanelExportConfig(cfg, PanelViewCapabilityOptions{
		Definition: "users",
	})
	if got == nil {
		t.Fatalf("expected export config")
	}
	if endpoint := got["endpoint"]; endpoint != "/admin/exports" {
		t.Fatalf("expected endpoint /admin/exports, got %v", endpoint)
	}
	if definition := got["definition"]; definition != "users" {
		t.Fatalf("expected definition users, got %v", definition)
	}
}

func TestBuildPanelViewCapabilitiesIncludesVariantWhenProvided(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}

	viewCtx := BuildPanelViewCapabilities(cfg, PanelViewCapabilityOptions{
		Definition: "pages",
		Variant:    "staging",
		DataGrid: PanelDataGridConfigOptions{
			TableID:     "content-pages",
			APIEndpoint: "/admin/api/pages",
			ActionBase:  "/admin/content/pages",
		},
	})
	exportCfg, ok := viewCtx["export_config"].(map[string]any)
	if !ok {
		t.Fatalf("expected export_config map, got %T", viewCtx["export_config"])
	}
	if endpoint := exportCfg["endpoint"]; endpoint != "/admin/exports" {
		t.Fatalf("expected endpoint /admin/exports, got %v", endpoint)
	}
	if definition := exportCfg["definition"]; definition != "pages" {
		t.Fatalf("expected definition pages, got %v", definition)
	}
	if variant := exportCfg["variant"]; variant != "staging" {
		t.Fatalf("expected variant staging, got %v", variant)
	}

	dataGridCfg, ok := viewCtx["datagrid_config"].(map[string]any)
	if !ok {
		t.Fatalf("expected datagrid_config map, got %T", viewCtx["datagrid_config"])
	}
	if tableID := dataGridCfg["table_id"]; tableID != "content-pages" {
		t.Fatalf("expected table_id content-pages, got %v", tableID)
	}
	if endpoint := dataGridCfg["api_endpoint"]; endpoint != "/admin/api/pages" {
		t.Fatalf("expected api endpoint /admin/api/pages, got %v", endpoint)
	}
	if actionBase := dataGridCfg["action_base"]; actionBase != "/admin/content/pages" {
		t.Fatalf("expected action_base /admin/content/pages, got %v", actionBase)
	}
	if key := dataGridCfg["column_storage_key"]; key != "content_pages_datatable_columns" {
		t.Fatalf("expected derived column storage key content_pages_datatable_columns, got %v", key)
	}
	embeddedExport, ok := dataGridCfg["export_config"].(map[string]any)
	if !ok {
		t.Fatalf("expected datagrid export_config map, got %T", dataGridCfg["export_config"])
	}
	if embeddedExport["definition"] != "pages" || embeddedExport["variant"] != "staging" {
		t.Fatalf("expected datagrid export config to mirror panel export config, got %+v", embeddedExport)
	}
}

func TestBuildPanelExportConfigReturnsNilWithoutDefinition(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	if got := BuildPanelExportConfig(cfg, PanelViewCapabilityOptions{}); got != nil {
		t.Fatalf("expected nil export config when definition missing, got %+v", got)
	}
}

func TestBuildPanelDataGridConfigReturnsNilWhenUnset(t *testing.T) {
	if got := BuildPanelDataGridConfig(PanelDataGridConfigOptions{}); got != nil {
		t.Fatalf("expected nil datagrid config when options unset, got %+v", got)
	}
}

func TestBuildPanelDataGridConfigHonorsExplicitColumnStorageKey(t *testing.T) {
	cfg := BuildPanelDataGridConfig(PanelDataGridConfigOptions{
		TableID:          "roles",
		ColumnStorageKey: "roles_custom_columns",
	})
	if cfg == nil {
		t.Fatalf("expected datagrid config")
	}
	if key := cfg["column_storage_key"]; key != "roles_custom_columns" {
		t.Fatalf("expected explicit column storage key roles_custom_columns, got %v", key)
	}
}
