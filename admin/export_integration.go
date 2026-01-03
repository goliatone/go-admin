package admin

import (
	"context"

	router "github.com/goliatone/go-router"
)

// ExportDefinition is the minimal shape surfaced by the export registry.
type ExportDefinition struct {
	Name     string   `json:"name"`
	Label    string   `json:"label,omitempty"`
	Variants []string `json:"variants,omitempty"`
}

// ExportRegistry lists or fetches export definitions.
type ExportRegistry interface {
	ListDefinitions(ctx context.Context) ([]ExportDefinition, error)
	GetDefinition(ctx context.Context, name string) (ExportDefinition, error)
}

// ExportColumn describes a column available for export.
type ExportColumn struct {
	Key   string `json:"key"`
	Label string `json:"label,omitempty"`
}

// ExportMetadata captures UI-facing export metadata.
type ExportMetadata struct {
	Formats []string       `json:"formats,omitempty"`
	Columns []ExportColumn `json:"columns,omitempty"`
}

// ExportMetadataProvider fetches formats/columns for a definition and variant.
type ExportMetadataProvider interface {
	ExportMetadata(ctx context.Context, definition, variant string) (ExportMetadata, error)
}

// ExportRouteWrapper wraps export handlers with auth or middleware.
type ExportRouteWrapper func(router.HandlerFunc) router.HandlerFunc

// ExportRouteOptions configures export route registration.
type ExportRouteOptions struct {
	BasePath string
	Wrap     ExportRouteWrapper
}

// ExportHTTPRegistrar registers export HTTP endpoints on a router.
type ExportHTTPRegistrar interface {
	RegisterExportRoutes(router AdminRouter, opts ExportRouteOptions) error
}
