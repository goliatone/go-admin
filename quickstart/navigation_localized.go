package quickstart

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
)

// LocalizedMenuItemTranslation captures per-locale display and URL override values.
type LocalizedMenuItemTranslation struct {
	Locale        string `json:"locale"`
	Label         string `json:"label"`
	LabelKey      string `json:"label_key"`
	GroupTitle    string `json:"group_title"`
	GroupTitleKey string `json:"group_title_key"`
	URLOverride   string `json:"url_override"`
}

// LocalizedSeedMenuItem represents one canonical menu item and its localized variants.
type LocalizedSeedMenuItem struct {
	Item         admin.MenuItem                 `json:"item"`
	Translations []LocalizedMenuItemTranslation `json:"translations"`
}

// SeedLocalizedNavigationOptions drives localized menu seeding with stable menu IDs.
type SeedLocalizedNavigationOptions struct {
	MenuSvc       admin.CMSMenuService             `json:"menu_svc"`
	MenuCode      string                           `json:"menu_code"`
	Items         []LocalizedSeedMenuItem          `json:"items"`
	DefaultLocale string                           `json:"default_locale"`
	Reset         bool                             `json:"reset"`
	ResetEnv      string                           `json:"reset_env"`
	Logf          func(format string, args ...any) `json:"logf"`
	SkipLogger    bool                             `json:"skip_logger"`

	// AutoCreateParents allows seeds to omit intermediate path segments; missing parents are scaffolded as group nodes.
	AutoCreateParents bool `json:"auto_create_parents"`
}

type localizedSeedInputs struct {
	BaseItems          []admin.MenuItem
	CanonicalByIndex   []string
	TranslationByIndex [][]LocalizedMenuItemTranslation
}

// SeedLocalizedNavigation seeds canonical menu IDs and applies locale-specific translations.
//
// This is the preferred package-level API for localized site menus. It prevents locale-specific
// IDs such as "about.es" by keeping identity stable and attaching locale variants as translations.
func SeedLocalizedNavigation(ctx context.Context, opts SeedLocalizedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}
	menuCode := cms.CanonicalMenuCode(opts.MenuCode)
	if menuCode == "" {
		menuCode = cms.CanonicalMenuCode("admin")
	}
	defaultLocale := strings.ToLower(strings.TrimSpace(opts.DefaultLocale))
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	if len(opts.Items) == 0 {
		return SeedNavigation(ctx, SeedNavigationOptions{
			MenuSvc:           opts.MenuSvc,
			MenuCode:          menuCode,
			Reset:             opts.Reset,
			ResetEnv:          opts.ResetEnv,
			Locale:            defaultLocale,
			Logf:              opts.Logf,
			SkipLogger:        opts.SkipLogger,
			AutoCreateParents: opts.AutoCreateParents,
		})
	}

	inputs, err := buildLocalizedSeedInputs(menuCode, defaultLocale, opts.Items)
	if err != nil {
		return err
	}

	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:           opts.MenuSvc,
		MenuCode:          menuCode,
		Items:             inputs.BaseItems,
		Reset:             opts.Reset,
		ResetEnv:          opts.ResetEnv,
		Locale:            defaultLocale,
		Logf:              opts.Logf,
		SkipLogger:        opts.SkipLogger,
		AutoCreateParents: opts.AutoCreateParents,
	}); err != nil {
		return err
	}

	return applyLocalizedMenuTranslations(ctx, opts.MenuSvc, menuCode, opts.Items, inputs)
}

func buildLocalizedSeedInputs(menuCode, defaultLocale string, items []LocalizedSeedMenuItem) (localizedSeedInputs, error) {
	inputs := localizedSeedInputs{
		BaseItems:          make([]admin.MenuItem, 0, len(items)),
		CanonicalByIndex:   make([]string, len(items)),
		TranslationByIndex: make([][]LocalizedMenuItemTranslation, len(items)),
	}
	for index, entry := range items {
		base := localizedBaseMenuItem(entry, defaultLocale)
		if err := validateSeedMenuIdentity(base, defaultLocale); err != nil {
			return localizedSeedInputs{}, err
		}
		normalized, err := normalizeSeedMenuItem(menuCode, defaultLocale, base)
		if err != nil {
			return localizedSeedInputs{}, err
		}
		inputs.CanonicalByIndex[index] = strings.TrimSpace(normalized.ID)
		inputs.TranslationByIndex[index] = normalizeLocalizedTranslations(entry.Translations)
		inputs.BaseItems = append(inputs.BaseItems, base)
	}
	return inputs, nil
}

func localizedBaseMenuItem(entry LocalizedSeedMenuItem, defaultLocale string) admin.MenuItem {
	base := entry.Item
	base.Locale = defaultLocale
	base.URLOverride = nil
	tr, ok := localizedTranslationForLocale(entry.Translations, defaultLocale)
	if !ok {
		return base
	}
	base.Label = strings.TrimSpace(firstNonEmpty(tr.Label, base.Label))
	base.LabelKey = strings.TrimSpace(firstNonEmpty(tr.LabelKey, base.LabelKey))
	base.GroupTitle = strings.TrimSpace(firstNonEmpty(tr.GroupTitle, base.GroupTitle))
	base.GroupTitleKey = strings.TrimSpace(firstNonEmpty(tr.GroupTitleKey, base.GroupTitleKey))
	if override := strings.TrimSpace(tr.URLOverride); override != "" {
		if base.Target == nil {
			base.Target = map[string]any{}
		}
		base.Target["path"] = override
	}
	return base
}

func applyLocalizedMenuTranslations(
	ctx context.Context,
	menuSvc admin.CMSMenuService,
	menuCode string,
	items []LocalizedSeedMenuItem,
	inputs localizedSeedInputs,
) error {
	for index, translations := range inputs.TranslationByIndex {
		if err := applyLocalizedMenuItemTranslations(ctx, menuSvc, menuCode, items[index], inputs.CanonicalByIndex[index], translations); err != nil {
			return err
		}
	}
	return nil
}

func applyLocalizedMenuItemTranslations(
	ctx context.Context,
	menuSvc admin.CMSMenuService,
	menuCode string,
	entry LocalizedSeedMenuItem,
	itemPath string,
	translations []LocalizedMenuItemTranslation,
) error {
	itemPath = strings.TrimSpace(itemPath)
	if itemPath == "" {
		return nil
	}
	baseType := admin.NormalizeMenuItemType(entry.Item.Type)
	for _, tr := range translations {
		update, ok := localizedMenuItemUpdate(itemPath, baseType, tr)
		if !ok {
			continue
		}
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, update); err != nil {
			return err
		}
	}
	return nil
}

func localizedMenuItemUpdate(itemPath string, baseType string, tr LocalizedMenuItemTranslation) (admin.MenuItem, bool) {
	locale := strings.ToLower(strings.TrimSpace(tr.Locale))
	if locale == "" {
		return admin.MenuItem{}, false
	}
	update := admin.MenuItem{
		ID:          itemPath,
		Code:        itemPath,
		Type:        baseType,
		Locale:      locale,
		URLOverride: urlOverridePointer(tr.URLOverride),
	}
	applyLocalizedMenuItemLabels(&update, baseType, tr)
	return update, localizedMenuItemUpdateHasChanges(update)
}

func applyLocalizedMenuItemLabels(update *admin.MenuItem, baseType string, tr LocalizedMenuItemTranslation) {
	switch baseType {
	case admin.MenuItemTypeGroup:
		update.GroupTitle = strings.TrimSpace(tr.GroupTitle)
		update.GroupTitleKey = strings.TrimSpace(tr.GroupTitleKey)
	case admin.MenuItemTypeSeparator:
		return
	default:
		update.Label = strings.TrimSpace(tr.Label)
		update.LabelKey = strings.TrimSpace(tr.LabelKey)
		update.GroupTitle = strings.TrimSpace(tr.GroupTitle)
		update.GroupTitleKey = strings.TrimSpace(tr.GroupTitleKey)
	}
}

func localizedMenuItemUpdateHasChanges(update admin.MenuItem) bool {
	return update.URLOverride != nil ||
		update.Label != "" ||
		update.LabelKey != "" ||
		update.GroupTitle != "" ||
		update.GroupTitleKey != ""
}

func normalizeLocalizedTranslations(input []LocalizedMenuItemTranslation) []LocalizedMenuItemTranslation {
	if len(input) == 0 {
		return nil
	}
	indexByLocale := map[string]int{}
	out := make([]LocalizedMenuItemTranslation, 0, len(input))
	for _, entry := range input {
		normalized := entry
		normalized.Locale = strings.ToLower(strings.TrimSpace(normalized.Locale))
		normalized.Label = strings.TrimSpace(normalized.Label)
		normalized.LabelKey = strings.TrimSpace(normalized.LabelKey)
		normalized.GroupTitle = strings.TrimSpace(normalized.GroupTitle)
		normalized.GroupTitleKey = strings.TrimSpace(normalized.GroupTitleKey)
		normalized.URLOverride = strings.TrimSpace(normalized.URLOverride)
		if normalized.Locale == "" {
			continue
		}
		if idx, ok := indexByLocale[normalized.Locale]; ok {
			out[idx] = normalized
			continue
		}
		indexByLocale[normalized.Locale] = len(out)
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func localizedTranslationForLocale(input []LocalizedMenuItemTranslation, locale string) (LocalizedMenuItemTranslation, bool) {
	locale = strings.ToLower(strings.TrimSpace(locale))
	for _, entry := range normalizeLocalizedTranslations(input) {
		if strings.EqualFold(entry.Locale, locale) {
			return entry, true
		}
	}
	return LocalizedMenuItemTranslation{}, false
}

func urlOverridePointer(raw string) *string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	return &value
}
