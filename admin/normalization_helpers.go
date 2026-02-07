package admin

import "strings"

// NormalizeMenuItemType normalizes menu item type values.
func NormalizeMenuItemType(raw string) string {
	switch strings.TrimSpace(raw) {
	case MenuItemTypeGroup:
		return MenuItemTypeGroup
	case MenuItemTypeSeparator:
		return MenuItemTypeSeparator
	default:
		return MenuItemTypeItem
	}
}

// NormalizeMenuItemTranslationFields derives translation display fallbacks.
func NormalizeMenuItemTranslationFields(item MenuItem) (label, labelKey, groupTitle, groupTitleKey string) {
	label = strings.TrimSpace(item.Label)
	labelKey = strings.TrimSpace(item.LabelKey)
	groupTitle = strings.TrimSpace(item.GroupTitle)
	groupTitleKey = strings.TrimSpace(item.GroupTitleKey)

	if label == "" && labelKey != "" {
		label = labelKey
	}
	if groupTitle == "" && groupTitleKey != "" {
		groupTitle = groupTitleKey
	}
	return
}

// NormalizeFilterType normalizes field/filter input types into UI filter types.
func NormalizeFilterType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "select", "enum", "radio", "chip":
		return "select"
	case "number", "integer", "float", "decimal":
		return "number"
	case "date", "datetime", "time":
		return "date"
	case "bool", "boolean", "toggle", "checkbox":
		return "select"
	case "text", "textarea", "string", "slug", "email", "url":
		return "text"
	default:
		return "text"
	}
}

// NormalizeBasePath exposes admin base-path normalization.
func NormalizeBasePath(basePath string) string {
	return normalizeBasePath(basePath)
}

// PrefixBasePath exposes admin path prefix behavior.
func PrefixBasePath(basePath, routePath string) string {
	return prefixBasePath(basePath, routePath)
}
