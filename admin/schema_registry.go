package admin

import (
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/internal/boot"
	crud "github.com/goliatone/go-crud"
	formgenjsonschema "github.com/goliatone/go-formgen/pkg/jsonschema"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	router "github.com/goliatone/go-router"
)

const (
	// SchemaFormatOpenAPI identifies OpenAPI documents for formgen.
	SchemaFormatOpenAPI = formgenopenapi.DefaultAdapterName
	// SchemaFormatJSONSchema identifies JSON Schema documents for formgen.
	SchemaFormatJSONSchema = formgenjsonschema.DefaultAdapterName
)

// SchemaRegistryEntry captures a projected schema document from the registry.
type SchemaRegistryEntry struct {
	Resource     string         `json:"resource"`
	Plural       string         `json:"plural,omitempty"`
	SchemaFormat string         `json:"schema_format"`
	Document     map[string]any `json:"document"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// SchemaRegistryPayload wraps schema registry entries for UI consumption.
type SchemaRegistryPayload struct {
	Schemas []SchemaRegistryEntry `json:"schemas"`
}

type schemaRegistryBinding struct{}

func newSchemaRegistryBinding(_ *Admin) boot.SchemaRegistryBinding {
	return schemaRegistryBinding{}
}

func (schemaRegistryBinding) List(router.Context) (any, error) {
	entries := crud.ListSchemas()
	payload := SchemaRegistryPayload{
		Schemas: make([]SchemaRegistryEntry, 0, len(entries)),
	}
	for _, entry := range entries {
		payload.Schemas = append(payload.Schemas, schemaRegistryEntry(entry))
	}
	return payload, nil
}

func (schemaRegistryBinding) Get(_ router.Context, resource string) (any, error) {
	resource = strings.TrimSpace(resource)
	if resource == "" {
		return nil, ErrNotFound
	}
	entry, ok := crud.GetSchema(resource)
	if !ok {
		return nil, ErrNotFound
	}
	return schemaRegistryEntry(entry), nil
}

func schemaRegistryEntry(entry crud.SchemaEntry) SchemaRegistryEntry {
	format := schemaFormatFromDocument(entry.Document)
	if format == "" {
		format = SchemaFormatOpenAPI
	}
	return SchemaRegistryEntry{
		Resource:     entry.Resource,
		Plural:       entry.Plural,
		SchemaFormat: format,
		Document:     entry.Document,
		UpdatedAt:    entry.UpdatedAt,
	}
}

func schemaFormatFromDocument(doc map[string]any) string {
	if len(doc) == 0 {
		return ""
	}
	if _, ok := doc["openapi"]; ok {
		return SchemaFormatOpenAPI
	}
	if _, ok := doc["swagger"]; ok {
		return SchemaFormatOpenAPI
	}
	if _, ok := doc["$schema"]; ok {
		return SchemaFormatJSONSchema
	}
	if rawType, ok := doc["type"].(string); ok && strings.TrimSpace(rawType) != "" {
		return SchemaFormatJSONSchema
	}
	if _, ok := doc["properties"]; ok {
		return SchemaFormatJSONSchema
	}
	return ""
}
