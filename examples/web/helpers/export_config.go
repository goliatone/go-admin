package helpers

import (
	"path"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
)

// ExportConfig captures export wiring for templates.
type ExportConfig struct {
	Endpoint   string `json:"endpoint"`
	Definition string `json:"definition"`
	Variant    string `json:"variant,omitempty"`
}

// BuildExportConfig returns the export endpoint and definition for UI wiring.
func BuildExportConfig(cfg admin.Config, definition, variant string) ExportConfig {
	base := strings.TrimSpace(cfg.BasePath)
	endpoint := path.Join("/", base, "exports")

	definition = strings.TrimSpace(definition)
	variant = strings.TrimSpace(variant)
	config := ExportConfig{
		Endpoint:   endpoint,
		Definition: definition,
	}
	if variant != "" {
		config.Variant = variant
	}
	return config
}
