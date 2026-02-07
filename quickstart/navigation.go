package quickstart

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// ErrSeedNavigationRequiresGoCMS is returned when SeedNavigation is invoked with a non go-cms backed menu service.
var ErrSeedNavigationRequiresGoCMS = fmt.Errorf("quickstart: SeedNavigation requires a go-cms backed menu service")

// goCMSMenuServiceProvider exposes the raw go-cms menu service behind the admin CMSMenuService adapter.
//
// Implemented by admin.GoCMSMenuAdapter.
type goCMSMenuServiceProvider interface {
	GoCMSMenuService() cms.MenuService
}

// SeedNavigationOptions drives the quickstart menu seeding workflow.
type SeedNavigationOptions struct {
	MenuSvc    admin.CMSMenuService
	MenuCode   string
	Items      []admin.MenuItem
	Reset      bool
	ResetEnv   string
	Locale     string
	Logf       func(format string, args ...any)
	SkipLogger bool

	// AutoCreateParents allows seeds to omit intermediate path segments; go-cms will scaffold them as group nodes.
	AutoCreateParents bool
}

// SeedNavigation seeds a menu using go-cms cms.SeedMenu.
func SeedNavigation(ctx context.Context, opts SeedNavigationOptions) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if opts.MenuSvc == nil {
		return fmt.Errorf("MenuSvc is required")
	}

	provider, ok := opts.MenuSvc.(goCMSMenuServiceProvider)
	if !ok || provider.GoCMSMenuService() == nil {
		return ErrSeedNavigationRequiresGoCMS
	}
	menus := provider.GoCMSMenuService()

	menuCode := cms.CanonicalMenuCode(opts.MenuCode)
	if menuCode == "" {
		menuCode = cms.CanonicalMenuCode("admin")
	}

	resetEnv := opts.ResetEnv
	if resetEnv == "" {
		resetEnv = "RESET_NAV_MENU"
	}
	reset := opts.Reset || strings.EqualFold(os.Getenv(resetEnv), "true")

	logf := opts.Logf
	if logf == nil && !opts.SkipLogger {
		logf = log.Printf
	}

	locale := strings.TrimSpace(opts.Locale)
	if locale == "" {
		for _, item := range opts.Items {
			if v := strings.TrimSpace(item.Locale); v != "" {
				locale = v
				break
			}
		}
	}
	if locale == "" {
		locale = "en"
	}

	if reset {
		if err := menus.ResetMenuByCode(ctx, menuCode, uuid.Nil, true); err != nil && !errors.Is(err, cms.ErrMenuNotFound) {
			return err
		}
		if logf != nil {
			logf("[nav seed] reset menu %s", menuCode)
		}
	}

	seedItems := make([]cms.SeedMenuItem, 0, len(opts.Items))
	for _, item := range opts.Items {
		seed, err := toSeedMenuItem(menuCode, locale, item)
		if err != nil {
			return err
		}
		seedItems = append(seedItems, seed)
	}

	autoCreateParents := opts.AutoCreateParents
	if !autoCreateParents {
		autoCreateParents = cms.ShouldAutoCreateParentsSeed(seedItems)
	}

	if err := cms.SeedMenu(ctx, cms.SeedMenuOptions{
		Menus:             menus,
		MenuCode:          menuCode,
		Locale:            locale,
		Actor:             uuid.Nil,
		Items:             seedItems,
		AutoCreateParents: autoCreateParents,
		Ensure:            true,
	}); err != nil {
		return err
	}

	return nil
}

func toSeedMenuItem(menuCode string, defaultLocale string, item admin.MenuItem) (cms.SeedMenuItem, error) {
	itemType := admin.NormalizeMenuItemType(item.Type)
	derived, err := cms.DeriveMenuItemPaths(
		menuCode,
		item.ID,
		firstNonEmpty(item.ParentID, item.ParentCode),
		firstNonEmpty(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey),
	)
	if err != nil {
		return cms.SeedMenuItem{}, err
	}
	parentPath := derived.ParentPath
	path := derived.Path

	target := cloneAnyMap(item.Target)
	if itemType == admin.MenuItemTypeGroup || itemType == admin.MenuItemTypeSeparator {
		target = nil
	}

	var position *int
	if item.Position != nil {
		position = cms.SeedPositionPtrForType(itemType, *item.Position)
	}

	seed := cms.SeedMenuItem{
		Path:        path,
		Position:    position,
		Type:        itemType,
		Target:      target,
		Icon:        strings.TrimSpace(item.Icon),
		Badge:       cloneAnyMap(item.Badge),
		Permissions: normalizeSeedPermissions(item.Permissions),
		Classes:     append([]string{}, item.Classes...),
		Styles:      cloneStringMap(item.Styles),
		Collapsible: item.Collapsible,
		Collapsed:   item.Collapsed,
		Metadata: map[string]any{
			"path":        path,
			"parent_path": parentPath,
		},
	}

	locale := strings.TrimSpace(item.Locale)
	if locale == "" {
		locale = strings.TrimSpace(defaultLocale)
	}
	if locale == "" {
		seed.AllowMissingTranslations = true
		return seed, nil
	}
	if itemType == admin.MenuItemTypeSeparator {
		return seed, nil
	}

	label, labelKey, groupTitle, groupTitleKey := admin.NormalizeMenuItemTranslationFields(item)
	seed.Translations = []cms.MenuItemTranslationInput{{
		Locale:        locale,
		Label:         label,
		LabelKey:      labelKey,
		GroupTitle:    groupTitle,
		GroupTitleKey: groupTitleKey,
	}}
	return seed, nil
}

func normalizeSeedPermissions(perms []string) []string {
	if len(perms) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(perms))
	for _, perm := range perms {
		trimmed := strings.TrimSpace(perm)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
