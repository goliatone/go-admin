package quickstart

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// LegacyLocalizedMenuMigrationOptions configures migration from locale-suffixed menu IDs.
type LegacyLocalizedMenuMigrationOptions struct {
	MenuSvc  admin.CMSMenuService `json:"menu_svc"`
	MenuCode string               `json:"menu_code"`
	Locales  []string             `json:"locales"`
}

// LegacyLocalizedMenuMigrationReport summarizes migration effects.
type LegacyLocalizedMenuMigrationReport struct {
	MigratedTranslations int      `json:"migrated_translations"`
	DeletedLegacyItems   int      `json:"deleted_legacy_items"`
	SkippedLegacyItems   int      `json:"skipped_legacy_items"`
	LegacyItemIDs        []string `json:"legacy_item_i_ds"`
}

// MigrateLegacyLocalizedMenuItems folds legacy locale-suffixed item IDs (for example
// "site_main.about.es") into canonical base IDs by transferring localized translations and
// then removing the suffix nodes.
func MigrateLegacyLocalizedMenuItems(ctx context.Context, opts LegacyLocalizedMenuMigrationOptions) (LegacyLocalizedMenuMigrationReport, error) {
	report := LegacyLocalizedMenuMigrationReport{}
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return report, errors.New("MenuSvc is required")
	}
	menuCode := strings.TrimSpace(opts.MenuCode)
	if menuCode == "" {
		return report, errors.New("MenuCode is required")
	}
	locales := uniqueLocaleList(opts.Locales)
	if len(locales) == 0 {
		locales = []string{"en"}
	}
	localeSet := map[string]struct{}{}
	for _, locale := range locales {
		localeSet[locale] = struct{}{}
	}

	type translationMove struct {
		baseID string
		locale string
		item   admin.MenuItem
	}
	moves := []translationMove{}
	legacyIDs := map[string]struct{}{}
	moveSeen := map[string]struct{}{}

	for _, locale := range locales {
		menu, err := opts.MenuSvc.Menu(ctx, menuCode, locale)
		if err != nil {
			return report, err
		}
		for _, item := range flattenMenuItems(menu.Items) {
			baseID, suffix, ok := splitLegacyLocaleSuffix(strings.TrimSpace(item.ID), localeSet)
			if !ok || !strings.EqualFold(suffix, locale) {
				continue
			}
			legacyIDs[item.ID] = struct{}{}
			key := strings.ToLower(baseID + "::" + suffix)
			if _, exists := moveSeen[key]; exists {
				continue
			}
			moveSeen[key] = struct{}{}
			moves = append(moves, translationMove{
				baseID: baseID,
				locale: suffix,
				item:   item,
			})
		}
	}

	for _, move := range moves {
		update := admin.MenuItem{
			ID:            move.baseID,
			Code:          move.baseID,
			Type:          admin.NormalizeMenuItemType(move.item.Type),
			Locale:        move.locale,
			Label:         strings.TrimSpace(move.item.Label),
			LabelKey:      strings.TrimSpace(move.item.LabelKey),
			GroupTitle:    strings.TrimSpace(move.item.GroupTitle),
			GroupTitleKey: strings.TrimSpace(move.item.GroupTitleKey),
			URLOverride:   extractMenuURLOverride(move.item.Target),
		}
		if err := opts.MenuSvc.UpdateMenuItem(ctx, menuCode, update); err != nil {
			report.SkippedLegacyItems++
			continue
		}
		report.MigratedTranslations++
	}

	ids := make([]string, 0, len(legacyIDs))
	for id := range legacyIDs {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool {
		if len(ids[i]) == len(ids[j]) {
			return ids[i] > ids[j]
		}
		return len(ids[i]) > len(ids[j])
	})
	report.LegacyItemIDs = append([]string{}, ids...)
	for _, id := range ids {
		if err := opts.MenuSvc.DeleteMenuItem(ctx, menuCode, id); err != nil {
			if errors.Is(err, admin.ErrNotFound) {
				continue
			}
			report.SkippedLegacyItems++
			continue
		}
		report.DeletedLegacyItems++
	}

	return report, nil
}

func splitLegacyLocaleSuffix(id string, localeSet map[string]struct{}) (baseID string, locale string, ok bool) {
	id = strings.TrimSpace(id)
	if id == "" {
		return "", "", false
	}
	index := strings.LastIndex(id, ".")
	if index <= 0 || index+1 >= len(id) {
		return "", "", false
	}
	suffix := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(id[index+1:]), "_", "-"))
	if _, exists := localeSet[suffix]; !exists {
		return "", "", false
	}
	base := strings.TrimSpace(id[:index])
	if base == "" {
		return "", "", false
	}
	return base, suffix, true
}

func flattenMenuItems(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		if len(item.Children) > 0 {
			out = append(out, flattenMenuItems(item.Children)...)
		}
	}
	return out
}

func uniqueLocaleList(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	out := make([]string, 0, len(locales))
	seen := map[string]struct{}{}
	for _, locale := range locales {
		normalized := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(locale), "_", "-"))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func extractMenuURLOverride(target map[string]any) *string {
	if len(target) == 0 {
		return nil
	}
	for _, key := range []string{"url", "href", "path"} {
		value := strings.TrimSpace(stringValue(target[key]))
		if value == "" {
			continue
		}
		return &value
	}
	return nil
}

func stringValue(raw any) string {
	if raw == nil {
		return ""
	}
	switch value := raw.(type) {
	case string:
		return value
	default:
		return fmt.Sprint(raw)
	}
}
