package quickstart

import (
	"strings"
	"unicode"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// PanelViewCapabilityOptions configures capability context derived for panel templates.
type PanelViewCapabilityOptions struct {
	BasePath       string
	URLResolver    urlkit.Resolver
	Definition     string
	Variant        string
	ExportEndpoint string
	DataGrid       PanelDataGridConfigOptions
}

// PanelDataGridConfigOptions configures datagrid wiring for panel templates.
type PanelDataGridConfigOptions struct {
	TableID             string
	APIEndpoint         string
	ActionBase          string
	PreferencesEndpoint string
	ColumnStorageKey    string
	EnableGroupedMode   bool
	DefaultViewMode     string
	GroupByField        string
	TranslationUX       bool
	StateStore          PanelDataGridStateStoreOptions
	URLState            PanelDataGridURLStateOptions
}

// PanelDataGridStateStoreOptions configures datagrid state store wiring for templates.
type PanelDataGridStateStoreOptions struct {
	Mode            string
	Resource        string
	SyncDebounceMS  int
	MaxShareEntries int
}

// PanelDataGridURLStateOptions configures datagrid URL sync limits.
type PanelDataGridURLStateOptions struct {
	MaxURLLength     int
	MaxFiltersLength int
	EnableStateToken *bool
}

// BuildPanelViewCapabilities returns standard capability keys for panel templates.
//
// Current keys:
// - export_config
// - datagrid_config
func BuildPanelViewCapabilities(cfg admin.Config, opts PanelViewCapabilityOptions) router.ViewContext {
	viewCtx := router.ViewContext{}
	exportCfg := BuildPanelExportConfig(cfg, opts)
	if len(exportCfg) > 0 {
		viewCtx["export_config"] = exportCfg
	}
	if dataGridCfg := BuildPanelDataGridConfig(opts.DataGrid); len(dataGridCfg) > 0 {
		if len(exportCfg) > 0 {
			dataGridCfg["export_config"] = cloneAnyMap(exportCfg)
		}
		viewCtx["datagrid_config"] = dataGridCfg
	}
	return viewCtx
}

// BuildPanelExportConfig resolves export_config for datatable templates.
func BuildPanelExportConfig(cfg admin.Config, opts PanelViewCapabilityOptions) map[string]any {
	definition := strings.TrimSpace(opts.Definition)
	if definition == "" {
		return nil
	}

	endpoint := strings.TrimSpace(opts.ExportEndpoint)
	if endpoint == "" {
		endpoint = resolveAdminRoutePath(
			opts.URLResolver,
			firstNonEmpty(opts.BasePath, cfg.BasePath),
			"exports",
		)
	}
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return nil
	}

	exportConfig := map[string]any{
		"endpoint":   endpoint,
		"definition": definition,
	}
	if variant := strings.TrimSpace(opts.Variant); variant != "" {
		exportConfig["variant"] = variant
	}
	return exportConfig
}

// BuildPanelDataGridConfig resolves datagrid_config for datatable templates.
func BuildPanelDataGridConfig(opts PanelDataGridConfigOptions) map[string]any {
	tableID := strings.TrimSpace(opts.TableID)
	apiEndpoint := strings.TrimSpace(opts.APIEndpoint)
	actionBase := strings.TrimSpace(opts.ActionBase)
	preferencesEndpoint := strings.TrimSpace(opts.PreferencesEndpoint)
	columnStorageKey := strings.TrimSpace(opts.ColumnStorageKey)

	if columnStorageKey == "" && tableID != "" {
		columnStorageKey = defaultColumnStorageKeyForTable(tableID)
	}

	dataGridConfig := map[string]any{}
	if tableID != "" {
		dataGridConfig["table_id"] = tableID
	}
	if apiEndpoint != "" {
		dataGridConfig["api_endpoint"] = apiEndpoint
	}
	if actionBase != "" {
		dataGridConfig["action_base"] = actionBase
	}
	if preferencesEndpoint != "" {
		dataGridConfig["preferences_endpoint"] = preferencesEndpoint
	}
	if columnStorageKey != "" {
		dataGridConfig["column_storage_key"] = columnStorageKey
	}
	if opts.TranslationUX {
		dataGridConfig["translation_ux_enabled"] = true
	}
	if opts.EnableGroupedMode {
		dataGridConfig["enable_grouped_mode"] = true
	}
	if defaultViewMode := strings.TrimSpace(opts.DefaultViewMode); defaultViewMode != "" {
		dataGridConfig["default_view_mode"] = defaultViewMode
	}
	if groupByField := strings.TrimSpace(opts.GroupByField); groupByField != "" {
		dataGridConfig["group_by_field"] = groupByField
	}
	if stateStoreCfg := buildPanelDataGridStateStoreConfig(opts.StateStore); len(stateStoreCfg) > 0 {
		dataGridConfig["state_store"] = stateStoreCfg
	}
	if urlStateCfg := buildPanelDataGridURLStateConfig(opts.URLState); len(urlStateCfg) > 0 {
		dataGridConfig["url_state"] = urlStateCfg
	}
	if len(dataGridConfig) == 0 {
		return nil
	}
	return dataGridConfig
}

func buildPanelDataGridStateStoreConfig(opts PanelDataGridStateStoreOptions) map[string]any {
	cfg := map[string]any{}
	if mode := strings.TrimSpace(opts.Mode); mode != "" {
		cfg["mode"] = mode
	}
	if resource := strings.TrimSpace(opts.Resource); resource != "" {
		cfg["resource"] = resource
	}
	if opts.SyncDebounceMS > 0 {
		cfg["sync_debounce_ms"] = opts.SyncDebounceMS
	}
	if opts.MaxShareEntries > 0 {
		cfg["max_share_entries"] = opts.MaxShareEntries
	}
	if len(cfg) == 0 {
		return nil
	}
	return cfg
}

func buildPanelDataGridURLStateConfig(opts PanelDataGridURLStateOptions) map[string]any {
	cfg := map[string]any{}
	if opts.MaxURLLength > 0 {
		cfg["max_url_length"] = opts.MaxURLLength
	}
	if opts.MaxFiltersLength > 0 {
		cfg["max_filters_length"] = opts.MaxFiltersLength
	}
	if opts.EnableStateToken != nil {
		cfg["enable_state_token"] = *opts.EnableStateToken
	}
	if len(cfg) == 0 {
		return nil
	}
	return cfg
}

func defaultColumnStorageKeyForTable(tableID string) string {
	sanitized := sanitizeDataGridStorageKey(tableID + "-datatable")
	if sanitized == "" {
		return ""
	}
	return sanitized + "_columns"
}

func sanitizeDataGridStorageKey(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	var b strings.Builder
	b.Grow(len(trimmed))
	lastUnderscore := false
	for _, r := range trimmed {
		isWord := unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_'
		if isWord {
			b.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			b.WriteByte('_')
			lastUnderscore = true
		}
	}

	return strings.Trim(b.String(), "_")
}
