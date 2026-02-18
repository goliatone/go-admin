package admin

import (
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
)

func cloneEmbeddedBlocks(blocks []map[string]any) []map[string]any {
	if blocks == nil {
		return nil
	}
	out := make([]map[string]any, 0, len(blocks))
	for _, block := range blocks {
		if block == nil {
			out = append(out, map[string]any{})
			continue
		}
		out = append(out, primitives.CloneAnyMap(block))
	}
	return out
}

func parseBlocksPayload(raw any) (legacy []string, embedded []map[string]any, embeddedPresent bool) {
	if raw == nil {
		return nil, nil, false
	}
	switch v := raw.(type) {
	case []map[string]any:
		return nil, cloneEmbeddedBlocks(v), true
	case []string:
		return append([]string{}, v...), nil, false
	case []any:
		if len(v) == 0 {
			return nil, []map[string]any{}, true
		}
		if embedded := embeddedBlocksFromAnySlice(v); embedded != nil {
			return nil, embedded, true
		}
		if legacy := stringSliceFromAny(v); len(legacy) > 0 {
			return legacy, nil, false
		}
		return nil, nil, false
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil, nil, false
		}
		var decoded any
		if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
			return nil, nil, false
		}
		return parseBlocksPayload(decoded)
	default:
		return nil, nil, false
	}
}

func embeddedBlocksFromData(data map[string]any) ([]map[string]any, bool) {
	if data == nil {
		return nil, false
	}
	raw, ok := data["blocks"]
	if !ok {
		return nil, false
	}
	blocks, present := extractEmbeddedBlocks(raw)
	return blocks, present
}

func extractEmbeddedBlocks(raw any) ([]map[string]any, bool) {
	if raw == nil {
		return nil, false
	}
	switch v := raw.(type) {
	case []map[string]any:
		return cloneEmbeddedBlocks(v), true
	case []any:
		if len(v) == 0 {
			return []map[string]any{}, true
		}
		if embedded := embeddedBlocksFromAnySlice(v); embedded != nil {
			return embedded, true
		}
		return nil, false
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil, false
		}
		var decoded any
		if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
			return nil, false
		}
		return extractEmbeddedBlocks(decoded)
	default:
		return nil, false
	}
}

func embeddedBlocksFromAnySlice(values []any) []map[string]any {
	if len(values) == 0 {
		return []map[string]any{}
	}
	out := []map[string]any{}
	found := false
	for _, item := range values {
		switch v := item.(type) {
		case map[string]any:
			out = append(out, primitives.CloneAnyMap(v))
			found = true
		}
	}
	if !found {
		return nil
	}
	return out
}

func stringSliceFromAny(value []any) []string {
	out := []string{}
	for _, item := range value {
		if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
			out = append(out, s)
		}
	}
	return out
}

func embeddedBlocksFromLegacy(blocks []CMSBlock) []map[string]any {
	if len(blocks) == 0 {
		return nil
	}
	ordered := append([]CMSBlock{}, blocks...)
	sort.SliceStable(ordered, func(i, j int) bool {
		if ordered[i].Position == ordered[j].Position {
			return ordered[i].ID < ordered[j].ID
		}
		return ordered[i].Position < ordered[j].Position
	})
	out := make([]map[string]any, 0, len(ordered))
	for _, block := range ordered {
		payload := primitives.CloneAnyMap(block.Data)
		if payload == nil {
			payload = map[string]any{}
		}
		if _, ok := payload["_type"]; !ok {
			if typ := blockTypeFromLegacy(block); typ != "" {
				payload["_type"] = typ
			}
		}
		if _, ok := payload["_schema"]; !ok {
			if schema := strings.TrimSpace(block.BlockSchemaKey); schema != "" {
				payload["_schema"] = schema
			}
		}
		out = append(out, payload)
	}
	return out
}

func embeddedBlocksToCMSBlocks(contentID, locale string, blocks []map[string]any) []CMSBlock {
	if len(blocks) == 0 {
		return nil
	}
	out := make([]CMSBlock, 0, len(blocks))
	for idx, block := range blocks {
		payload := primitives.CloneAnyMap(block)
		typeVal := strings.TrimSpace(toString(payload["_type"]))
		schemaKey := strings.TrimSpace(toString(payload["_schema"]))
		if schemaKey == "" {
			schemaKey = typeVal
		}
		out = append(out, CMSBlock{
			ID:             "",
			DefinitionID:   typeVal,
			BlockType:      typeVal,
			BlockSchemaKey: schemaKey,
			ContentID:      contentID,
			Locale:         locale,
			Position:       idx + 1,
			Status:         "embedded",
			Data:           payload,
		})
	}
	return out
}

func blockTypesFromEmbedded(blocks []map[string]any) []string {
	if len(blocks) == 0 {
		return nil
	}
	out := []string{}
	for _, block := range blocks {
		if block == nil {
			continue
		}
		if typ := strings.TrimSpace(toString(block["_type"])); typ != "" {
			out = append(out, typ)
			continue
		}
		if typ := strings.TrimSpace(toString(block["type"])); typ != "" {
			out = append(out, typ)
		}
	}
	return out
}

func blockTypeFromLegacy(block CMSBlock) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(block.BlockType, block.BlockSchemaKey, block.DefinitionID))
}

func blockTypesFromLegacy(blocks []CMSBlock) []string {
	if len(blocks) == 0 {
		return nil
	}
	out := []string{}
	for _, block := range blocks {
		if typ := blockTypeFromLegacy(block); typ != "" {
			out = append(out, typ)
		}
	}
	return out
}

// CMSLegacyBlockService exposes legacy block retrieval for conflict reports.
type CMSLegacyBlockService interface {
	LegacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error)
}

func blockDefinitionSchemaVersion(def CMSBlockDefinition) string {
	if strings.TrimSpace(def.SchemaVersion) != "" {
		return strings.TrimSpace(def.SchemaVersion)
	}
	return schemaVersionFromSchema(def.Schema)
}

func blockDefinitionMigrationStatus(def CMSBlockDefinition) string {
	if strings.TrimSpace(def.MigrationStatus) != "" {
		return strings.TrimSpace(def.MigrationStatus)
	}
	if status := schemaMigrationStatusFromSchema(def.Schema); status != "" {
		return status
	}
	if blockDefinitionSchemaVersion(def) == "" {
		return "unversioned"
	}
	metaVersion := schemaVersionFromSchema(def.Schema)
	if metaVersion != "" && strings.TrimSpace(def.SchemaVersion) != "" && metaVersion != def.SchemaVersion {
		return "mismatch"
	}
	return "current"
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

func schemaSlugFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if slug := strings.TrimSpace(toString(meta["slug"])); slug != "" {
			return slug
		}
	}
	if slug := strings.TrimSpace(toString(schema["slug"])); slug != "" {
		return slug
	}
	if slug := strings.TrimSpace(toString(schema["$id"])); slug != "" {
		return slug
	}
	return ""
}

func schemaBlockTypeFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if t := strings.TrimSpace(blockTypeFromSchemaDef(schema)); t != "" {
		return t
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if t := strings.TrimSpace(toString(meta["block_type"])); t != "" {
			return t
		}
		if t := strings.TrimSpace(toString(meta["type"])); t != "" {
			return t
		}
	}
	if t := strings.TrimSpace(toString(schema["$id"])); t != "" {
		return t
	}
	return ""
}

func schemaCategoryFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if cat := strings.TrimSpace(toString(meta["category"])); cat != "" {
			return cat
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if cat := strings.TrimSpace(toString(meta["category"])); cat != "" {
			return cat
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if cat := strings.TrimSpace(toString(meta["category"])); cat != "" {
			return cat
		}
	}
	if meta, ok := schema["x-formgen"].(map[string]any); ok {
		if cat := strings.TrimSpace(toString(meta["category"])); cat != "" {
			return cat
		}
	}
	if cat := strings.TrimSpace(toString(schema["category"])); cat != "" {
		return cat
	}
	return ""
}

func schemaStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if status := strings.TrimSpace(toString(meta["status"])); status != "" {
			return status
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if status := strings.TrimSpace(toString(meta["status"])); status != "" {
			return status
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if status := strings.TrimSpace(toString(meta["status"])); status != "" {
			return status
		}
	}
	if status := strings.TrimSpace(toString(schema["status"])); status != "" {
		return status
	}
	return ""
}

func schemaMigrationStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	return ""
}
