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

type legacyTranslationMove struct {
	baseID string
	locale string
	item   admin.MenuItem
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

	moves, legacyIDs, err := collectLegacyLocalizedMenuMoves(ctx, opts.MenuSvc, menuCode, locales, localeSet)
	if err != nil {
		return report, err
	}

	applyLegacyLocalizedMenuMoves(ctx, opts.MenuSvc, menuCode, moves, &report)
	ids := sortedLegacyMenuItemIDs(legacyIDs)
	report.LegacyItemIDs = append([]string{}, ids...)
	deleteLegacyLocalizedMenuItems(ctx, opts.MenuSvc, menuCode, ids, &report)

	return report, nil
}

func collectLegacyLocalizedMenuMoves(
	ctx context.Context,
	menuSvc admin.CMSMenuService,
	menuCode string,
	locales []string,
	localeSet map[string]struct{},
) ([]legacyTranslationMove, map[string]struct{}, error) {
	moves := []legacyTranslationMove{}
	legacyIDs := map[string]struct{}{}
	moveSeen := map[string]struct{}{}
	for _, locale := range locales {
		menu, err := menuSvc.Menu(ctx, menuCode, locale)
		if err != nil {
			return nil, nil, err
		}
		for _, item := range flattenMenuItems(menu.Items) {
			move, ok := legacyLocalizedMenuMove(item, locale, localeSet, moveSeen)
			if !ok {
				continue
			}
			legacyIDs[item.ID] = struct{}{}
			moves = append(moves, move)
		}
	}
	return moves, legacyIDs, nil
}

func legacyLocalizedMenuMove(item admin.MenuItem, locale string, localeSet map[string]struct{}, moveSeen map[string]struct{}) (legacyTranslationMove, bool) {
	baseID, suffix, ok := splitLegacyLocaleSuffix(strings.TrimSpace(item.ID), localeSet)
	if !ok || !strings.EqualFold(suffix, locale) {
		return legacyTranslationMove{}, false
	}
	key := strings.ToLower(baseID + "::" + suffix)
	if _, exists := moveSeen[key]; exists {
		return legacyTranslationMove{}, false
	}
	moveSeen[key] = struct{}{}
	return legacyTranslationMove{
		baseID: baseID,
		locale: suffix,
		item:   item,
	}, true
}

func applyLegacyLocalizedMenuMoves(
	ctx context.Context,
	menuSvc admin.CMSMenuService,
	menuCode string,
	moves []legacyTranslationMove,
	report *LegacyLocalizedMenuMigrationReport,
) {
	for _, move := range moves {
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, legacyLocalizedMenuUpdate(move)); err != nil {
			report.SkippedLegacyItems++
			continue
		}
		report.MigratedTranslations++
	}
}

func legacyLocalizedMenuUpdate(move legacyTranslationMove) admin.MenuItem {
	return admin.MenuItem{
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
}

func sortedLegacyMenuItemIDs(legacyIDs map[string]struct{}) []string {
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
	return ids
}

func deleteLegacyLocalizedMenuItems(
	ctx context.Context,
	menuSvc admin.CMSMenuService,
	menuCode string,
	ids []string,
	report *LegacyLocalizedMenuMigrationReport,
) {
	for _, id := range ids {
		if err := menuSvc.DeleteMenuItem(ctx, menuCode, id); err != nil {
			if !errors.Is(err, admin.ErrNotFound) {
				report.SkippedLegacyItems++
			}
			continue
		}
		report.DeletedLegacyItems++
	}
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
