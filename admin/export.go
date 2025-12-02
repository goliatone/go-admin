package admin

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ExportRequest captures export parameters.
type ExportRequest struct {
	Resource string
	Format   string
	Filters  map[string]any
}

// ExportResult holds the exported payload.
type ExportResult struct {
	Content     []byte
	ContentType string
	Filename    string
}

// ExportService produces export payloads in multiple formats.
type ExportService interface {
	Export(ctx context.Context, req ExportRequest) (ExportResult, error)
	Seed(resource string, rows []map[string]any)
}

// InMemoryExportService returns seeded data as JSON or CSV.
type InMemoryExportService struct {
	mu     sync.Mutex
	data   map[string][]map[string]any
	suffix string
}

// NewInMemoryExportService constructs a seeded export service.
func NewInMemoryExportService() *InMemoryExportService {
	svc := &InMemoryExportService{
		data:   map[string][]map[string]any{},
		suffix: time.Now().Format("20060102"),
	}
	svc.Seed("sample", []map[string]any{
		{"id": "1", "name": "Example", "email": "example@example.com"},
	})
	return svc
}

// Seed sets or replaces data for a resource.
func (s *InMemoryExportService) Seed(resource string, rows []map[string]any) {
	if s == nil || resource == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		copied = append(copied, cloneAnyMap(row))
	}
	s.data[resource] = copied
}

// Export returns data for a resource in the requested format.
func (s *InMemoryExportService) Export(ctx context.Context, req ExportRequest) (ExportResult, error) {
	_ = ctx
	if req.Resource == "" {
		return ExportResult{}, errors.New("resource required")
	}
	format := strings.ToLower(req.Format)
	if format == "" {
		format = "json"
	}
	s.mu.Lock()
	rows, ok := s.data[req.Resource]
	s.mu.Unlock()
	if !ok || len(rows) == 0 {
		return ExportResult{}, ErrNotFound
	}

	switch format {
	case "csv":
		return s.exportCSV(req.Resource, rows)
	default:
		return s.exportJSON(req.Resource, rows)
	}
}

func (s *InMemoryExportService) exportJSON(resource string, rows []map[string]any) (ExportResult, error) {
	content, err := json.Marshal(rows)
	if err != nil {
		return ExportResult{}, err
	}
	return ExportResult{
		Content:     content,
		ContentType: "application/json",
		Filename:    resource + "-" + s.suffix + ".json",
	}, nil
}

func (s *InMemoryExportService) exportCSV(resource string, rows []map[string]any) (ExportResult, error) {
	keys := collectKeys(rows)
	builder := &strings.Builder{}
	writer := csv.NewWriter(builder)
	if err := writer.Write(keys); err != nil {
		return ExportResult{}, err
	}
	for _, row := range rows {
		record := []string{}
		for _, key := range keys {
			record = append(record, exportToString(row[key]))
		}
		if err := writer.Write(record); err != nil {
			return ExportResult{}, err
		}
	}
	writer.Flush()
	return ExportResult{
		Content:     []byte(builder.String()),
		ContentType: "text/csv",
		Filename:    resource + "-" + s.suffix + ".csv",
	}, nil
}

// DisabledExportService returns explicit errors when export is disabled.
type DisabledExportService struct{}

func (DisabledExportService) Export(ctx context.Context, req ExportRequest) (ExportResult, error) {
	_ = ctx
	_ = req
	return ExportResult{}, FeatureDisabledError{Feature: string(FeatureExport)}
}

func (DisabledExportService) Seed(resource string, rows []map[string]any) {
	_ = resource
	_ = rows
}

func collectKeys(rows []map[string]any) []string {
	seen := map[string]bool{}
	for _, row := range rows {
		for k := range row {
			seen[k] = true
		}
	}
	keys := make([]string, 0, len(seen))
	for k := range seen {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func exportToString(val any) string {
	switch v := val.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		if v {
			return "true"
		}
		return "false"
	default:
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

type exportContextKey string

const (
	exportResourceKey exportContextKey = "export_resource"
	exportFormatKey   exportContextKey = "export_format"
)

func withExportContext(ctx context.Context, req ExportRequest) context.Context {
	ctx = context.WithValue(ctx, exportResourceKey, req.Resource)
	ctx = context.WithValue(ctx, exportFormatKey, req.Format)
	return ctx
}

func exportRequestFromContext(ctx context.Context) ExportRequest {
	req := ExportRequest{}
	if ctx == nil {
		return req
	}
	if resource, ok := ctx.Value(exportResourceKey).(string); ok {
		req.Resource = resource
	}
	if format, ok := ctx.Value(exportFormatKey).(string); ok {
		req.Format = format
	}
	return req
}

// ExportCommand triggers an export through the command bus.
type ExportCommand struct {
	Service ExportService
}

func (c *ExportCommand) Name() string { return "admin.export" }

func (c *ExportCommand) Execute(ctx context.Context) error {
	if c == nil || c.Service == nil {
		return FeatureDisabledError{Feature: string(FeatureExport)}
	}
	req := exportRequestFromContext(ctx)
	if req.Resource == "" {
		return errors.New("resource required")
	}
	_, err := c.Service.Export(ctx, req)
	return err
}

func (c *ExportCommand) CLIOptions() *CLIOptions {
	if c == nil {
		return nil
	}
	return &CLIOptions{
		Path:        []string{"admin", "export"},
		Description: "Export admin resources (resource/format taken from context)",
		Group:       "admin",
	}
}
