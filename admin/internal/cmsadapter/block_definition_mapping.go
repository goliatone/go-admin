package cmsadapter

import (
	"reflect"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/google/uuid"
)

func ConvertBlockDefinition(value reflect.Value) cmsboot.CMSBlockDefinition {
	val := gocmsutil.Deref(value)
	def := cmsboot.CMSBlockDefinition{}
	if name := strings.TrimSpace(stringField(val, "Name")); name != "" {
		def.Name = name
	}
	if slug := strings.TrimSpace(stringField(val, "Slug")); slug != "" {
		def.Slug = slug
	}
	def.ID = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.Name))
	if def.ID == "" {
		if id, ok := gocmsutil.ExtractUUID(val, "ID"); ok {
			def.ID = id.String()
		}
	}
	if desc := strings.TrimSpace(stringField(val, "Description")); desc != "" {
		def.Description = desc
		def.DescriptionSet = true
	}
	if icon := strings.TrimSpace(stringField(val, "Icon")); icon != "" {
		def.Icon = icon
		def.IconSet = true
	}
	if category := strings.TrimSpace(stringField(val, "Category")); category != "" {
		def.Category = category
		def.CategorySet = true
	}
	if status := strings.TrimSpace(stringField(val, "Status")); status != "" {
		def.Status = status
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			def.Schema = primitives.CloneAnyMap(schema)
			if def.Type == "" {
				if t := strings.TrimSpace(stringValue(schema["x-block-type"])); t != "" {
					def.Type = t
				}
			}
		}
	}
	if uiSchemaField := val.FieldByName("UISchema"); uiSchemaField.IsValid() {
		if uiSchema, ok := uiSchemaField.Interface().(map[string]any); ok {
			def.UISchema = primitives.CloneAnyMap(uiSchema)
		}
	}
	if version := strings.TrimSpace(stringField(val, "SchemaVersion")); version != "" {
		def.SchemaVersion = version
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = schemaVersionFromSchema(def.Schema)
	}
	if status := strings.TrimSpace(stringField(val, "MigrationStatus")); status != "" {
		def.MigrationStatus = status
	}
	channel := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringField(val, "Channel"),
		stringField(val, "Environment"),
		stringField(val, "Env"),
	))
	SetBlockDefinitionChannel(&def, channel)
	if def.MigrationStatus == "" {
		def.MigrationStatus = schemaMigrationStatusFromSchema(def.Schema)
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.Name, def.ID))
	}
	return def
}

func ConvertBlockDefinitionVersion(value reflect.Value) cmsboot.CMSBlockDefinitionVersion {
	val := gocmsutil.Deref(value)
	out := cmsboot.CMSBlockDefinitionVersion{}
	if id, ok := gocmsutil.ExtractUUID(val, "ID"); ok && id != uuid.Nil {
		out.ID = id.String()
	}
	if defID, ok := gocmsutil.ExtractUUID(val, "DefinitionID"); ok && defID != uuid.Nil {
		out.DefinitionID = defID.String()
	}
	if out.ID == "" {
		out.ID = strings.TrimSpace(stringField(val, "ID"))
	}
	if out.DefinitionID == "" {
		out.DefinitionID = strings.TrimSpace(stringField(val, "DefinitionID"))
	}
	if version := strings.TrimSpace(stringField(val, "SchemaVersion")); version != "" {
		out.SchemaVersion = version
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			out.Schema = primitives.CloneAnyMap(schema)
		}
	}
	if defaultsField := val.FieldByName("Defaults"); defaultsField.IsValid() {
		if defaults, ok := defaultsField.Interface().(map[string]any); ok {
			out.Defaults = primitives.CloneAnyMap(defaults)
		}
	}
	if out.MigrationStatus == "" {
		out.MigrationStatus = schemaMigrationStatusFromSchema(out.Schema)
	}
	out.CreatedAt = timeField(val, "CreatedAt")
	out.UpdatedAt = timeField(val, "UpdatedAt")
	return out
}

func stringField(val reflect.Value, field string) string {
	if val.Kind() == reflect.Pointer {
		if val.IsNil() {
			return ""
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return ""
	}
	f := val.FieldByName(field)
	if f.IsValid() {
		switch f.Kind() {
		case reflect.String:
			return f.String()
		case reflect.Pointer:
			if !f.IsNil() && f.Elem().Kind() == reflect.String {
				return f.Elem().String()
			}
		}
	}
	return ""
}

func timeField(val reflect.Value, field string) time.Time {
	f := val.FieldByName(field)
	if f.IsValid() && f.CanInterface() {
		if t, ok := f.Interface().(time.Time); ok {
			return t
		}
	}
	if f.IsValid() && f.Kind() == reflect.Pointer && !f.IsNil() && f.Elem().CanInterface() {
		if t, ok := f.Elem().Interface().(time.Time); ok {
			return t
		}
	}
	return time.Time{}
}

func schemaVersionFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if version, ok := meta["schema_version"].(string); ok {
			return strings.TrimSpace(version)
		}
	}
	if version, ok := schema["schema_version"].(string); ok {
		return strings.TrimSpace(version)
	}
	return ""
}

func schemaMigrationStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	for _, key := range []string{"metadata", "x-cms", "x-admin"} {
		meta, ok := schema[key].(map[string]any)
		if !ok {
			continue
		}
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	return ""
}
