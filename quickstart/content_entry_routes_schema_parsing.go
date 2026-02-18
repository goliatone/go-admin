package quickstart

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func isJSONRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	contentType := strings.ToLower(requestContentType(c))
	return strings.Contains(contentType, "application/json")
}

type schemaPathInfo struct {
	Schema map[string]any
	Type   string
}

func flattenSchema(schema map[string]any) (map[string]schemaPathInfo, []string) {
	out := map[string]schemaPathInfo{}
	boolPaths := []string{}
	walkSchemaProperties(schema, "", out, &boolPaths)
	return out, boolPaths
}

func walkSchemaProperties(schema map[string]any, prefix string, out map[string]schemaPathInfo, boolPaths *[]string) {
	if schema == nil {
		return
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || len(props) == 0 {
		return
	}
	for key, raw := range props {
		prop, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		pathKey := key
		if prefix != "" {
			pathKey = prefix + "." + key
		}
		stype := schemaType(prop)
		out[pathKey] = schemaPathInfo{Schema: prop, Type: stype}
		if stype == "boolean" {
			*boolPaths = append(*boolPaths, pathKey)
		}
		if stype == "object" {
			walkSchemaProperties(prop, pathKey, out, boolPaths)
		}
	}
}

func schemaType(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	switch v := schema["type"].(type) {
	case string:
		return strings.TrimSpace(v)
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func parseMultiValue(values []string, info schemaPathInfo) (any, error) {
	stype := strings.TrimSpace(info.Type)
	if stype != "array" {
		return parseScalarMultiValue(values, info)
	}
	itemsSchema, _ := info.Schema["items"].(map[string]any)
	parsed := make([]any, 0, len(values))
	for _, raw := range values {
		parsed = append(parsed, parseValue(raw, schemaPathInfo{Schema: itemsSchema, Type: schemaType(itemsSchema)}))
	}
	return parsed, nil
}

func parseScalarMultiValue(values []string, info schemaPathInfo) (any, error) {
	unique := []string{}
	seen := map[string]struct{}{}
	var candidate any
	for _, raw := range values {
		parsed := parseValue(raw, info)
		candidate = parsed
		normalized := strings.TrimSpace(anyToString(parsed))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		unique = append(unique, normalized)
	}
	switch len(unique) {
	case 0:
		if candidate == nil {
			return "", nil
		}
		return candidate, nil
	case 1:
		return parseValue(unique[0], info), nil
	default:
		return nil, fmt.Errorf("conflicting duplicate scalar values %v", unique)
	}
}

func parseValue(raw string, info schemaPathInfo) any {
	trimmed := strings.TrimSpace(raw)
	stype := strings.TrimSpace(info.Type)
	switch stype {
	case "boolean":
		return parseBoolValue(trimmed)
	case "integer":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.Atoi(trimmed); err == nil {
			return n
		}
	case "number":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return n
		}
	case "array", "object":
		if parsed, ok := parseJSONValue(trimmed); ok {
			return parsed
		}
	}
	if parsed, ok := parseJSONValue(trimmed); ok {
		if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
			return parsed
		}
	}
	return raw
}

func parseJSONValue(raw string) (any, bool) {
	if raw == "" {
		return nil, false
	}
	var decoded any
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return nil, false
	}
	return decoded, true
}

func parseBoolValue(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "0", "false", "off", "no":
		return false
	default:
		return true
	}
}

func setNestedValue(record map[string]any, path string, value any) {
	if record == nil {
		return
	}
	segments := strings.Split(path, ".")
	current := record
	for i, segment := range segments {
		if i == len(segments)-1 {
			current[segment] = value
			return
		}
		next, ok := current[segment].(map[string]any)
		if !ok || next == nil {
			next = map[string]any{}
			current[segment] = next
		}
		current = next
	}
}

func hasNestedValue(record map[string]any, path string) bool {
	if record == nil {
		return false
	}
	segments := strings.Split(path, ".")
	var current any = record
	for i, segment := range segments {
		currentMap, ok := current.(map[string]any)
		if !ok {
			return false
		}
		val, ok := currentMap[segment]
		if !ok {
			return false
		}
		if i == len(segments)-1 {
			return val != nil || ok
		}
		current = val
	}
	return false
}

func titleCase(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return value
	}
	value = strings.ReplaceAll(value, "_", " ")
	value = strings.ReplaceAll(value, "-", " ")
	parts := strings.Fields(value)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

// contentEntryNeedsBlocksChips returns true if any column uses the blocks_chips renderer.
func contentEntryNeedsBlocksChips(columns []map[string]any) bool {
	for _, col := range columns {
		renderer := strings.TrimSpace(anyToString(col["renderer"]))
		if renderer == "blocks_chips" {
			return true
		}
	}
	return false
}

// contentEntryBlockIconsMap builds a map of block type slugs to icon references
// by querying the block_definitions panel for the current environment.
// Returns nil on error (logged once) so list rendering continues without icons.
func contentEntryBlockIconsMap(ctx admin.AdminContext, adm *admin.Admin) map[string]string {
	if adm == nil || adm.Registry() == nil {
		return nil
	}
	panel, ok := adm.Registry().Panel("block_definitions")
	if !ok || panel == nil {
		return nil
	}
	filters := map[string]any{
		"status": "active",
	}
	if env := strings.TrimSpace(ctx.Environment); env != "" {
		filters["environment"] = env
	}
	items, _, err := panel.List(ctx, admin.ListOptions{
		PerPage: 10000,
		Filters: filters,
	})
	if err != nil {
		// Log once per request path, but don't fail the page.
		return nil
	}
	if len(items) == 0 {
		return nil
	}
	iconMap := make(map[string]string, len(items))
	for _, item := range items {
		slug := strings.TrimSpace(anyToString(item["slug"]))
		if slug == "" {
			continue
		}
		icon := strings.TrimSpace(anyToString(item["icon"]))
		if icon == "" {
			icon = "view-grid" // default fallback
		}
		iconMap[slug] = icon
	}
	if len(iconMap) == 0 {
		return nil
	}
	return iconMap
}

// contentEntryAttachBlocksIconMap attaches the block_icons_map to renderer_options
// for columns using blocks_chips renderer, if not already provided by ui_schema.
func contentEntryAttachBlocksIconMap(columns []map[string]any, iconMap map[string]string) []map[string]any {
	if len(iconMap) == 0 {
		return columns
	}
	for i, col := range columns {
		renderer := strings.TrimSpace(anyToString(col["renderer"]))
		if renderer != "blocks_chips" {
			continue
		}
		opts, _ := col["renderer_options"].(map[string]any)
		if opts == nil {
			opts = map[string]any{}
		}
		// Only set if not already provided (user override wins).
		if _, exists := opts["block_icons_map"]; !exists {
			if _, exists := opts["blockIconsMap"]; !exists {
				opts["block_icons_map"] = iconMap
			}
		}
		columns[i]["renderer_options"] = opts
	}
	return columns
}
