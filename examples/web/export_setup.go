package main

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-export/export"
	exportcrud "github.com/goliatone/go-export/sources/crud"
)

type listProvider interface {
	List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error)
}

type exportResource struct {
	name       string
	columns    []helpers.DataGridColumn
	list       listProvider
	primaryKey string
}

func registerExampleExports(bundle *quickstart.ExportBundle, dataStores *stores.DataStores, tenantSvc *admin.TenantService, usersSvc *admin.UserManagementService) error {
	if bundle == nil || bundle.Runner == nil || dataStores == nil {
		return nil
	}

	resources := []exportResource{
		{name: "users", columns: handlers.UserDataGridColumns(), list: dataStores.Users},
		{name: "roles", columns: handlers.RoleDataGridColumns(), list: rolesListProvider{svc: usersSvc}},
		{name: "user-profiles", columns: handlers.UserProfileDataGridColumns(), list: dataStores.UserProfiles},
		{name: "pages", columns: handlers.PageDataGridColumns(), list: dataStores.Pages},
		{name: "posts", columns: handlers.PostDataGridColumns(), list: dataStores.Posts},
		{name: "media", columns: handlers.MediaDataGridColumns(), list: dataStores.Media},
	}
	if tenantSvc != nil {
		resources = append(resources, exportResource{
			name:    "tenants",
			columns: handlers.TenantDataGridColumns(),
			list:    tenantListProvider{svc: tenantSvc},
		})
	}

	for _, resource := range resources {
		if resource.list == nil {
			continue
		}
		if err := registerExportResource(bundle, resource); err != nil {
			return err
		}
	}
	return nil
}

func registerExportResource(bundle *quickstart.ExportBundle, resource exportResource) error {
	registry := bundle.Runner.Definitions
	rowSources := bundle.Runner.RowSources
	if registry == nil || rowSources == nil {
		return nil
	}

	primaryKey := strings.TrimSpace(resource.primaryKey)
	if primaryKey == "" {
		primaryKey = "id"
	}

	definition := export.ExportDefinition{
		Name:           resource.name,
		Resource:       resource.name,
		Schema:         export.Schema{Columns: exportColumns(resource.columns)},
		RowSourceKey:   resource.name,
		AllowedFormats: defaultExportFormats(),
		Template: export.TemplateOptions{
			TemplateName: "export",
		},
	}

	if _, ok := registry.Get(definition.Name); !ok {
		if err := registry.Register(definition); err != nil {
			return err
		}
	}

	if err := rowSources.Register(resource.name, func(req export.ExportRequest, def export.ResolvedDefinition) (export.RowSource, error) {
		_ = req
		_ = def
		streamer := listStreamer{
			list:       resource.list,
			primaryKey: primaryKey,
			columns:    exportColumnNames(resource.columns),
		}
		return exportcrud.NewSource(streamer, exportcrud.Config{PrimaryKey: primaryKey}), nil
	}); err != nil {
		return err
	}
	return nil
}

func exportColumns(columns []helpers.DataGridColumn) []export.Column {
	if len(columns) == 0 {
		return nil
	}
	out := make([]export.Column, 0, len(columns))
	for _, col := range columns {
		label := strings.TrimSpace(col.Label)
		if label == "" {
			label = col.Field
		}
		out = append(out, export.Column{
			Name:  col.Field,
			Label: label,
		})
	}
	return out
}

func defaultExportFormats() []export.Format {
	return []export.Format{
		export.FormatCSV,
		export.FormatJSON,
		export.FormatNDJSON,
		export.FormatXLSX,
		export.FormatPDF,
	}
}

func exportColumnNames(columns []helpers.DataGridColumn) []string {
	if len(columns) == 0 {
		return nil
	}
	out := make([]string, 0, len(columns))
	for _, col := range columns {
		field := strings.TrimSpace(col.Field)
		if field == "" {
			continue
		}
		out = append(out, field)
	}
	return out
}

type listStreamer struct {
	list       listProvider
	primaryKey string
	columns    []string
}

func (s listStreamer) Stream(ctx context.Context, spec exportcrud.Spec) (export.RowIterator, error) {
	if s.list == nil {
		return nil, export.NewError(export.KindValidation, "list provider is required", nil)
	}
	if spec.Selection.Mode == export.SelectionQuery {
		return nil, export.NewError(export.KindNotImpl, "selection queries not supported", nil)
	}

	opts := listOptionsFromQuery(spec.Query)
	records, _, err := s.list.List(ctx, opts)
	if err != nil {
		return nil, err
	}
	records = applySelection(records, spec.Selection, s.primaryKey)

	columns := spec.Columns
	if len(columns) == 0 {
		columns = s.columns
	}
	return &mapRowIterator{
		records: records,
		columns: columns,
	}, nil
}

type mapRowIterator struct {
	records []map[string]any
	columns []string
	index   int
}

func (it *mapRowIterator) Next(ctx context.Context) (export.Row, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if it.index >= len(it.records) {
		return nil, io.EOF
	}
	record := it.records[it.index]
	it.index++

	row := make(export.Row, len(it.columns))
	for i, col := range it.columns {
		row[i] = record[col]
	}
	return row, nil
}

func (it *mapRowIterator) Close() error {
	return nil
}

func listOptionsFromQuery(query exportcrud.Query) admin.ListOptions {
	opts := admin.ListOptions{}
	if strings.TrimSpace(query.Search) != "" {
		opts.Search = strings.TrimSpace(query.Search)
	}

	if query.Limit > 0 {
		opts.PerPage = query.Limit
		if query.Offset > 0 {
			opts.Page = (query.Offset / query.Limit) + 1
		}
	}

	if len(query.Sort) > 0 {
		opts.SortBy = query.Sort[0].Field
		opts.SortDesc = query.Sort[0].Desc
	}

	if len(query.Filters) > 0 {
		opts.Filters = map[string]any{}
		for _, filter := range query.Filters {
			field := strings.TrimSpace(filter.Field)
			if field == "" {
				continue
			}
			op := strings.TrimSpace(filter.Op)
			key := field
			if op != "" && op != "eq" {
				key = fmt.Sprintf("%s__%s", field, op)
			}
			opts.Filters[key] = normalizeFilterValue(op, filter.Value)
		}
	}

	return opts
}

func normalizeFilterValue(op string, value any) any {
	switch v := value.(type) {
	case []string:
		values := make([]string, 0, len(v))
		for _, item := range v {
			item = strings.TrimSpace(item)
			if op == "ilike" {
				item = strings.Trim(item, "%")
			}
			if item != "" {
				values = append(values, item)
			}
		}
		return strings.Join(values, ",")
	case []any:
		values := make([]string, 0, len(v))
		for _, item := range v {
			value := strings.TrimSpace(fmt.Sprintf("%v", item))
			if op == "ilike" {
				value = strings.Trim(value, "%")
			}
			if value != "" {
				values = append(values, value)
			}
		}
		return strings.Join(values, ",")
	case string:
		if op == "ilike" {
			return strings.Trim(v, "%")
		}
		return v
	default:
		return value
	}
}

func applySelection(records []map[string]any, selection export.Selection, primaryKey string) []map[string]any {
	if selection.Mode != export.SelectionIDs {
		return records
	}
	if len(selection.IDs) == 0 {
		return nil
	}
	key := strings.TrimSpace(primaryKey)
	if key == "" {
		key = "id"
	}

	ids := make(map[string]struct{}, len(selection.IDs))
	for _, id := range selection.IDs {
		ids[id] = struct{}{}
	}

	filtered := make([]map[string]any, 0, len(records))
	for _, record := range records {
		raw, ok := record[key]
		if !ok {
			continue
		}
		value := fmt.Sprintf("%v", raw)
		if value == "" {
			continue
		}
		if _, ok := ids[value]; ok {
			filtered = append(filtered, record)
		}
	}
	return filtered
}

type tenantListProvider struct {
	svc *admin.TenantService
}

type rolesListProvider struct {
	svc *admin.UserManagementService
}

func (r rolesListProvider) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	if r.svc == nil {
		return nil, 0, fmt.Errorf("roles service not configured")
	}
	records, total, err := r.svc.ListRoles(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		item := map[string]any{
			"id":          rec.ID,
			"name":        rec.Name,
			"role_key":    rec.RoleKey,
			"description": rec.Description,
			"permissions": append([]string{}, rec.Permissions...),
			"metadata":    rec.Metadata,
			"is_system":   rec.IsSystem,
		}
		if !rec.CreatedAt.IsZero() {
			item["created_at"] = rec.CreatedAt
		}
		if !rec.UpdatedAt.IsZero() {
			item["updated_at"] = rec.UpdatedAt
		}
		items = append(items, item)
	}
	return items, total, nil
}

func (t tenantListProvider) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	if t.svc == nil {
		return nil, 0, fmt.Errorf("tenant service not configured")
	}
	records, total, err := t.svc.ListTenants(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		items = append(items, tenantRecordToMap(rec))
	}
	return items, total, nil
}

func tenantRecordToMap(rec admin.TenantRecord) map[string]any {
	return map[string]any{
		"id":         rec.ID,
		"name":       rec.Name,
		"slug":       rec.Slug,
		"domain":     rec.Domain,
		"status":     rec.Status,
		"created_at": rec.CreatedAt,
		"updated_at": rec.UpdatedAt,
	}
}
