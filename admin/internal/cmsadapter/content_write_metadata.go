package cmsadapter

import (
	"maps"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

func ExtractStructuralMetadata(data map[string]any) (map[string]any, map[string]any) {
	if data == nil {
		return nil, data
	}
	cleaned := primitives.CloneAnyMap(data)
	meta := map[string]any{}
	if val, ok := cleaned["path"]; ok {
		meta["path"] = val
		delete(cleaned, "path")
	}
	if val, ok := cleaned["template_id"]; ok {
		meta["template_id"] = val
		delete(cleaned, "template_id")
	}
	if val, ok := cleaned["template"]; ok {
		if _, exists := meta["template_id"]; !exists {
			meta["template_id"] = val
		}
		delete(cleaned, "template")
	}
	if val, ok := cleaned["parent_id"]; ok {
		meta["parent_id"] = val
		delete(cleaned, "parent_id")
	}
	sortVal, sortOk := cleaned["sort_order"]
	orderVal, orderOk := cleaned["order"]
	if sortOk {
		meta["sort_order"] = sortVal
		delete(cleaned, "sort_order")
	}
	if orderOk {
		if !sortOk {
			meta["sort_order"] = orderVal
		}
		delete(cleaned, "order")
	}
	if len(meta) == 0 {
		return nil, cleaned
	}
	return meta, cleaned
}

func StructuralMetadataFromData(data map[string]any) map[string]any {
	meta, _ := ExtractStructuralMetadata(data)
	return NormalizeStructuralMetadata(meta)
}

func NormalizeStructuralMetadata(metadata map[string]any) map[string]any {
	if metadata == nil {
		return nil
	}
	normalized := primitives.CloneAnyMap(metadata)
	if _, ok := normalized["template_id"]; !ok {
		if val, ok := normalized["template"]; ok {
			normalized["template_id"] = val
		}
	}
	delete(normalized, "template")
	if _, ok := normalized["sort_order"]; ok {
		delete(normalized, "order")
	} else if val, ok := normalized["order"]; ok {
		normalized["sort_order"] = val
		delete(normalized, "order")
	}
	return normalized
}

func InjectStructuralMetadata(metadata map[string]any, data map[string]any) map[string]any {
	if metadata == nil {
		return data
	}
	if data == nil {
		data = map[string]any{}
	}
	if val, ok := metadata["path"]; ok {
		data["path"] = val
	}
	if val, ok := metadata["template_id"]; ok {
		data["template_id"] = val
	}
	if val, ok := metadata["parent_id"]; ok {
		data["parent_id"] = val
	}
	if val, ok := metadata["sort_order"]; ok {
		data["sort_order"] = val
	}
	return data
}

func MergeMetadata(base map[string]any, updates map[string]any) map[string]any {
	if len(base) == 0 && len(updates) == 0 {
		return nil
	}
	merged := map[string]any{}
	maps.Copy(merged, base)
	maps.Copy(merged, updates)
	return merged
}

func ResolvedFamilyID(groupID string, mapsToCheck ...map[string]any) string {
	for _, source := range mapsToCheck {
		if source == nil {
			continue
		}
		if resolved := strings.TrimSpace(stringValue(source["family_id"])); resolved != "" {
			return resolved
		}
	}
	return strings.TrimSpace(groupID)
}

func RequestedFamilyID(groupID string, mapsToCheck ...map[string]any) string {
	groupID = strings.TrimSpace(groupID)
	if groupID != "" {
		return groupID
	}
	return ResolvedFamilyID("", mapsToCheck...)
}

func PersistTranslationGroupMetadata(groupID string, data, metadata map[string]any) (map[string]any, map[string]any) {
	groupID = strings.TrimSpace(groupID)
	data = primitives.CloneAnyMap(data)
	metadata = primitives.CloneAnyMap(metadata)
	if groupID == "" {
		return data, metadata
	}
	if data == nil {
		data = map[string]any{}
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	data["family_id"] = groupID
	metadata["family_id"] = groupID
	return data, metadata
}

func stringValue(val any) string {
	return primitives.StringFromAny(val)
}
