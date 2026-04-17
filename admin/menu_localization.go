package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// LocalizeMenu returns a cloned menu tree with labels resolved through the
// configured translator when available. When no translator is configured it
// preserves literal labels and does not leak raw label keys into display
// fields.
func LocalizeMenu(menu *Menu, t Translator, locale string) *Menu {
	if menu == nil {
		return nil
	}
	copy := *menu
	copy.Items = LocalizeMenuItems(menu.Items, t, locale)
	return &copy
}

// LocalizeMenuItems returns a cloned slice of menu items with resolved display
// labels suitable for public and site consumers.
func LocalizeMenuItems(items []MenuItem, t Translator, locale string) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.Target = primitives.CloneAnyMap(item.Target)
		clone.Badge = primitives.CloneAnyMap(item.Badge)
		clone.Classes = append([]string{}, item.Classes...)
		clone.Styles = primitives.CloneStringMap(item.Styles)
		clone.Permissions = append([]string{}, item.Permissions...)
		clone.Children = LocalizeMenuItems(item.Children, t, locale)
		if item.URLOverride != nil {
			override := strings.TrimSpace(*item.URLOverride)
			clone.URLOverride = &override
		}

		clone.Label = localizeMenuDisplayValue(item.Label, item.LabelKey, t, locale)
		groupTitleKey := strings.TrimSpace(item.GroupTitleKey)
		if groupTitleKey == "" {
			groupTitleKey = strings.TrimSpace(item.LabelKey)
		}
		groupTitle := strings.TrimSpace(item.GroupTitle)
		if groupTitle == "" {
			groupTitle = clone.Label
		}
		clone.GroupTitleKey = groupTitleKey
		clone.GroupTitle = localizeMenuDisplayValue(groupTitle, groupTitleKey, t, locale)

		out = append(out, clone)
	}
	return out
}

func localizeMenuDisplayValue(raw, key string, t Translator, locale string) string {
	val := strings.TrimSpace(raw)
	key = strings.TrimSpace(key)
	if t != nil && key != "" {
		translated, err := t.Translate(locale, key)
		if err == nil {
			translated = strings.TrimSpace(translated)
			if translated != "" && translated != key {
				return translated
			}
		}
	}
	return val
}
