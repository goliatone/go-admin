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
			TableID:             "content-pages",
			APIEndpoint:         "/admin/api/panels/pages",
			ActionBase:          "/admin/content/pages",
			PreferencesEndpoint: "/admin/api/panels/preferences",
			PreferencesWritable: true,
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
	if endpoint := dataGridCfg["api_endpoint"]; endpoint != "/admin/api/panels/pages" {
		t.Fatalf("expected api endpoint /admin/api/panels/pages, got %v", endpoint)
	}
	if actionBase := dataGridCfg["action_base"]; actionBase != "/admin/content/pages" {
		t.Fatalf("expected action_base /admin/content/pages, got %v", actionBase)
	}
	if endpoint := dataGridCfg["preferences_endpoint"]; endpoint != "/admin/api/panels/preferences" {
		t.Fatalf("expected preferences endpoint /admin/api/panels/preferences, got %v", endpoint)
	}
	if writable := dataGridCfg["preferences_writable"]; writable != true {
		t.Fatalf("expected writable Preferences capability, got %v", writable)
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

func TestBuildPanelViewCapabilitiesProjectsNormalizedCapabilityMatrix(t *testing.T) {
	tests := []struct {
		name       string
		bulk       bool
		export     bool
		wantExport bool
	}{
		{name: "none"},
		{name: "bulk-only", bulk: true},
		{name: "export-only", export: true, wantExport: true},
		{name: "both", bulk: true, export: true, wantExport: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			capabilities := admin.ResolvePanelListCapabilities(tc.bulk, tc.export)
			viewCtx := BuildPanelViewCapabilities(admin.Config{BasePath: "/admin"}, PanelViewCapabilityOptions{
				Capabilities: &capabilities,
				ResolvedExport: &admin.ExportConfig{
					Definition: "items",
					Endpoint:   "/admin/exports",
				},
				DataGrid: PanelDataGridConfigOptions{
					TableID:     "content-items",
					APIEndpoint: "/admin/api/panels/items",
					ActionBase:  "/admin/content/items",
				},
			})

			listCapabilities := requireViewCapabilityMap(t, viewCtx["list_capabilities"], "list_capabilities")
			if listCapabilities["bulk"] != tc.bulk || listCapabilities["export"] != tc.export || listCapabilities["selection"] != (tc.bulk || tc.export) {
				t.Fatalf("unexpected list capabilities: %+v", listCapabilities)
			}
			dataGrid := requireViewCapabilityMap(t, viewCtx["datagrid_config"], "datagrid_config")
			dataGridCapabilities := requireViewCapabilityMap(t, dataGrid["capabilities"], "datagrid_config.capabilities")
			if dataGridCapabilities["selection"] != listCapabilities["selection"] || dataGridCapabilities["bulk"] != listCapabilities["bulk"] || dataGridCapabilities["export"] != listCapabilities["export"] {
				t.Fatalf("DataGrid capabilities drifted from list capabilities: list=%+v grid=%+v", listCapabilities, dataGridCapabilities)
			}
			_, viewHasExport := viewCtx["export_config"]
			_, gridHasExport := dataGrid["export_config"]
			if viewHasExport != tc.wantExport || gridHasExport != tc.wantExport {
				t.Fatalf("unexpected export config presence: view=%t grid=%t", viewHasExport, gridHasExport)
			}
		})
	}
}

func TestBuildPanelViewCapabilitiesFailsClosedForIncompleteResolvedExport(t *testing.T) {
	tests := []struct {
		name     string
		resolved *admin.ExportConfig
	}{
		{name: "missing"},
		{name: "missing definition", resolved: &admin.ExportConfig{Endpoint: "/admin/exports"}},
		{name: "missing endpoint", resolved: &admin.ExportConfig{Definition: "items"}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			capabilities := admin.ResolvePanelListCapabilities(false, true)
			viewCtx := BuildPanelViewCapabilities(admin.Config{BasePath: "/admin"}, PanelViewCapabilityOptions{
				Capabilities:   &capabilities,
				ResolvedExport: tc.resolved,
			})

			listCapabilities := requireViewCapabilityMap(t, viewCtx["list_capabilities"], "list_capabilities")
			if listCapabilities["selection"] != false || listCapabilities["bulk"] != false || listCapabilities["export"] != false {
				t.Fatalf("incomplete export configuration must disable export and selection, got %+v", listCapabilities)
			}
			if _, ok := viewCtx["export_config"]; ok {
				t.Fatalf("incomplete export configuration must not be emitted: %+v", viewCtx)
			}
			dataGrid := requireViewCapabilityMap(t, viewCtx["datagrid_config"], "datagrid_config")
			dataGridCapabilities := requireViewCapabilityMap(t, dataGrid["capabilities"], "datagrid_config.capabilities")
			if dataGridCapabilities["selection"] != false || dataGridCapabilities["export"] != false {
				t.Fatalf("DataGrid must receive effective capabilities, got %+v", dataGridCapabilities)
			}
		})
	}
}

func TestBuildPanelViewCapabilitiesPreservesBulkWhenResolvedExportIsIncomplete(t *testing.T) {
	capabilities := admin.ResolvePanelListCapabilities(true, true)
	viewCtx := BuildPanelViewCapabilities(admin.Config{BasePath: "/admin"}, PanelViewCapabilityOptions{
		Capabilities: &capabilities,
		ResolvedExport: &admin.ExportConfig{
			Definition: "items",
		},
	})

	listCapabilities := requireViewCapabilityMap(t, viewCtx["list_capabilities"], "list_capabilities")
	if listCapabilities["selection"] != true || listCapabilities["bulk"] != true || listCapabilities["export"] != false {
		t.Fatalf("bulk-only behavior must remain available, got %+v", listCapabilities)
	}
}

func requireViewCapabilityMap(t *testing.T, value any, label string) map[string]any {
	t.Helper()
	result, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected %s map, got %T", label, value)
	}
	return result
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

func TestBuildPanelDataGridConfigIncludesPaginationPresentation(t *testing.T) {
	cfg := BuildPanelDataGridConfig(PanelDataGridConfigOptions{
		TableID:        "content-pages",
		PaginationMode: " semantic ",
	})
	if cfg == nil {
		t.Fatal("expected datagrid config")
	}
	pagination, ok := cfg["pagination"].(map[string]any)
	if !ok {
		t.Fatalf("expected pagination config map, got %T", cfg["pagination"])
	}
	if mode := pagination["mode"]; mode != "semantic" {
		t.Fatalf("expected semantic pagination mode, got %v", mode)
	}

	withoutMode := BuildPanelDataGridConfig(PanelDataGridConfigOptions{TableID: "content-pages"})
	if _, exists := withoutMode["pagination"]; exists {
		t.Fatalf("unspecified pagination mode must stay omitted: %+v", withoutMode)
	}
}

func TestBuildPanelDataGridConfigIncludesTranslationUXOptions(t *testing.T) {
	cfg := BuildPanelDataGridConfig(PanelDataGridConfigOptions{
		TableID:           "content-pages",
		APIEndpoint:       "/admin/api/panels/pages",
		ActionBase:        "/admin/content/pages",
		TranslationUX:     true,
		EnableGroupedMode: true,
		DefaultViewMode:   "grouped",
		GroupByField:      "family_id",
	})
	if cfg == nil {
		t.Fatalf("expected datagrid config")
	}
	if enabled := cfg["translation_ux_enabled"]; enabled != true {
		t.Fatalf("expected translation_ux_enabled true, got %v", enabled)
	}
	if enabled := cfg["enable_grouped_mode"]; enabled != true {
		t.Fatalf("expected enable_grouped_mode true, got %v", enabled)
	}
	if mode := cfg["default_view_mode"]; mode != "grouped" {
		t.Fatalf("expected default_view_mode grouped, got %v", mode)
	}
	if field := cfg["group_by_field"]; field != "family_id" {
		t.Fatalf("expected group_by_field family_id, got %v", field)
	}
}

func TestBuildPanelDataGridConfigIncludesStateAndURLConfig(t *testing.T) {
	enableToken := true
	cfg := BuildPanelDataGridConfig(PanelDataGridConfigOptions{
		TableID: "content-pages",
		StateStore: PanelDataGridStateStoreOptions{
			Mode:             "preferences",
			Resource:         "pages",
			SyncDebounceMS:   1200,
			HydrateTimeoutMS: 1500,
			MaxShareEntries:  25,
		},
		PreferencesEndpoint: "/admin/api/panels/preferences",
		PreferencesWritable: true,
		URLState: PanelDataGridURLStateOptions{
			MaxURLLength:     1700,
			MaxFiltersLength: 550,
			EnableStateToken: &enableToken,
		},
	})
	if cfg == nil {
		t.Fatalf("expected datagrid config")
	}

	stateStore, ok := cfg["state_store"].(map[string]any)
	if !ok {
		t.Fatalf("expected state_store map, got %T", cfg["state_store"])
	}
	if mode := stateStore["mode"]; mode != "preferences" {
		t.Fatalf("expected state_store.mode preferences, got %v", mode)
	}
	if resource := stateStore["resource"]; resource != "pages" {
		t.Fatalf("expected state_store.resource pages, got %v", resource)
	}
	if debounce := stateStore["sync_debounce_ms"]; debounce != 1200 {
		t.Fatalf("expected state_store.sync_debounce_ms 1200, got %v", debounce)
	}
	if timeout := stateStore["hydrate_timeout_ms"]; timeout != 1500 {
		t.Fatalf("expected state_store.hydrate_timeout_ms 1500, got %v", timeout)
	}
	if maxEntries := stateStore["max_share_entries"]; maxEntries != 25 {
		t.Fatalf("expected state_store.max_share_entries 25, got %v", maxEntries)
	}
	if endpoint := cfg["preferences_endpoint"]; endpoint != "/admin/api/panels/preferences" {
		t.Fatalf("expected preferences_endpoint /admin/api/panels/preferences, got %v", endpoint)
	}

	urlState, ok := cfg["url_state"].(map[string]any)
	if !ok {
		t.Fatalf("expected url_state map, got %T", cfg["url_state"])
	}
	if maxURL := urlState["max_url_length"]; maxURL != 1700 {
		t.Fatalf("expected url_state.max_url_length 1700, got %v", maxURL)
	}
	if maxFilters := urlState["max_filters_length"]; maxFilters != 550 {
		t.Fatalf("expected url_state.max_filters_length 550, got %v", maxFilters)
	}
	if enabled := urlState["enable_state_token"]; enabled != true {
		t.Fatalf("expected url_state.enable_state_token true, got %v", enabled)
	}
}
