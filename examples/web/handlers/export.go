package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-router"
)

// ExportHandlers holds dependencies for export-related handlers
type ExportHandlers struct {
	UserStore *stores.UserStore
	Config    admin.Config
}

// NewExportHandlers creates a new ExportHandlers instance
func NewExportHandlers(userStore *stores.UserStore, cfg admin.Config) *ExportHandlers {
	return &ExportHandlers{
		UserStore: userStore,
		Config:    cfg,
	}
}

// ExportUsers handles GET /users/actions/export
// Exports users based on current query parameters (filters, search, etc.)
func (h *ExportHandlers) ExportUsers(c router.Context) error {
	format := c.Query("format", "csv")
	ctx := c.Context()

	// TODO: Parse query parameters for filters, search, pagination
	// For now, fetch all users
	users, _, err := h.UserStore.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}

	switch format {
	case "csv":
		return h.exportUsersCSV(c, users)
	case "excel":
		// TODO: Implement Excel export
		return fmt.Errorf("excel export not yet implemented")
	case "pdf":
		// TODO: Implement PDF export
		return fmt.Errorf("pdf export not yet implemented")
	default:
		return fmt.Errorf("unsupported export format: %s", format)
	}
}

// exportUsersCSV exports users as CSV
func (h *ExportHandlers) exportUsersCSV(c router.Context, users []map[string]any) error {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Define columns
	columns := []string{"id", "username", "email", "role", "status", "created_at", "last_login"}

	// Write header
	if err := w.Write(columns); err != nil {
		return err
	}

	// Write rows
	for _, user := range users {
		row := make([]string, len(columns))
		for i, col := range columns {
			if val, ok := user[col]; ok && val != nil {
				row[i] = fmt.Sprintf("%v", val)
			} else {
				row[i] = ""
			}
		}
		if err := w.Write(row); err != nil {
			return err
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return err
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=users.csv")
	return c.Send(buf.Bytes())
}

// ExportMedia handles GET /media/actions/export
func (h *ExportHandlers) ExportMedia(c router.Context) error {
	format := c.Query("format", "csv")

	switch format {
	case "csv":
		return h.exportMediaCSV(c)
	default:
		return fmt.Errorf("unsupported export format: %s", format)
	}
}

// exportMediaCSV exports media as CSV (placeholder)
func (h *ExportHandlers) exportMediaCSV(c router.Context) error {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Placeholder - adapt to your media structure
	columns := []string{"id", "filename", "type", "size", "created_at"}
	if err := w.Write(columns); err != nil {
		return err
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return err
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=media.csv")
	return c.Send(buf.Bytes())
}

// Generic export helper for future use
type ExportConfig struct {
	Columns  []string
	FileName string
	Data     []map[string]any
}

// ExportToCSV is a generic CSV export function
func ExportToCSV(c router.Context, cfg ExportConfig) error {
	filename := cfg.FileName
	if !strings.HasSuffix(filename, ".csv") {
		filename += ".csv"
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Write header
	if err := w.Write(cfg.Columns); err != nil {
		return err
	}

	// Write rows
	for _, item := range cfg.Data {
		row := make([]string, len(cfg.Columns))
		for i, col := range cfg.Columns {
			if val, ok := item[col]; ok && val != nil {
				row[i] = fmt.Sprintf("%v", val)
			} else {
				row[i] = ""
			}
		}
		if err := w.Write(row); err != nil {
			return err
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return err
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	return c.Send(buf.Bytes())
}
