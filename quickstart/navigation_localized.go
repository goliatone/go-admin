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
	Locale        string
	Label         string
	LabelKey      string
	GroupTitle    string
	GroupTitleKey string
	URLOverride   string
}

// LocalizedSeedMenuItem represents one canonical menu item and its localized variants.
type LocalizedSeedMenuItem struct {
	Item         admin.MenuItem
	Translations []LocalizedMenuItemTranslation
}

// SeedLocalizedNavigationOptions drives localized menu seeding with stable menu IDs.
type SeedLocalizedNavigationOptions struct {
	MenuSvc       admin.CMSMenuService
	MenuCode      string
	Items         []LocalizedSeedMenuItem
	DefaultLocale string
	Reset         bool
	ResetEnv      string
	Logf          func(format string, args ...any)
	SkipLogger    bool

	// AutoCreateParents allows seeds to omit intermediate path segments; missing parents are scaffolded as group nodes.
	AutoCreateParents bool
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

	baseItems := make([]admin.MenuItem, 0, len(opts.Items))
	canonicalByIndex := make([]string, len(opts.Items))
	translationByIndex := make([][]LocalizedMenuItemTranslation, len(opts.Items))

	for index, entry := range opts.Items {
		base := entry.Item
		base.Locale = defaultLocale
		base.URLOverride = nil

		if tr, ok := localizedTranslationForLocale(entry.Translations, defaultLocale); ok {
			base.Label = strings.TrimSpace(firstNonEmpty(tr.Label, base.Label))
			base.LabelKey = strings.TrimSpace(firstNonEmpty(tr.LabelKey, base.LabelKey))
			base.GroupTitle = strings.TrimSpace(firstNonEmpty(tr.GroupTitle, base.GroupTitle))
			base.GroupTitleKey = strings.TrimSpace(firstNonEmpty(tr.GroupTitleKey, base.GroupTitleKey))
			if override := strings.TrimSpace(tr.URLOverride); override != "" {
				if base.Target == nil {
					base.Target = map[string]any{}
				}
				// Keep base target path aligned with default locale.
				base.Target["path"] = override
			}
		}
		if err := validateSeedMenuIdentity(base, defaultLocale); err != nil {
			return err
		}
		normalized, err := normalizeSeedMenuItem(menuCode, defaultLocale, base)
		if err != nil {
			return err
		}
		canonicalByIndex[index] = strings.TrimSpace(normalized.ID)
		translationByIndex[index] = normalizeLocalizedTranslations(entry.Translations)
		baseItems = append(baseItems, base)
	}

	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:           opts.MenuSvc,
		MenuCode:          menuCode,
		Items:             baseItems,
		Reset:             opts.Reset,
		ResetEnv:          opts.ResetEnv,
		Locale:            defaultLocale,
		Logf:              opts.Logf,
		SkipLogger:        opts.SkipLogger,
		AutoCreateParents: opts.AutoCreateParents,
	}); err != nil {
		return err
	}

	for index, translations := range translationByIndex {
		itemPath := strings.TrimSpace(canonicalByIndex[index])
		if itemPath == "" {
			continue
		}
		baseType := admin.NormalizeMenuItemType(opts.Items[index].Item.Type)
		for _, tr := range translations {
			locale := strings.ToLower(strings.TrimSpace(tr.Locale))
			if locale == "" {
				continue
			}
			update := admin.MenuItem{
				ID:          itemPath,
				Code:        itemPath,
				Type:        baseType,
				Locale:      locale,
				URLOverride: urlOverridePointer(tr.URLOverride),
			}
			if baseType == admin.MenuItemTypeGroup {
				update.GroupTitle = strings.TrimSpace(tr.GroupTitle)
				update.GroupTitleKey = strings.TrimSpace(tr.GroupTitleKey)
			} else if baseType != admin.MenuItemTypeSeparator {
				update.Label = strings.TrimSpace(tr.Label)
				update.LabelKey = strings.TrimSpace(tr.LabelKey)
				update.GroupTitle = strings.TrimSpace(tr.GroupTitle)
				update.GroupTitleKey = strings.TrimSpace(tr.GroupTitleKey)
			}
			if update.URLOverride == nil &&
				update.Label == "" &&
				update.LabelKey == "" &&
				update.GroupTitle == "" &&
				update.GroupTitleKey == "" {
				continue
			}
			if err := opts.MenuSvc.UpdateMenuItem(ctx, menuCode, update); err != nil {
				return err
			}
		}
	}

	return nil
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
