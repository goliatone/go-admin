package main

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

// ensureCoreContentPanels guarantees pages/posts panels exist even when
// dynamic CMS content-type panel registration is unavailable.
func ensureCoreContentPanels(adm *admin.Admin, pages stores.PageRepository, posts stores.PostRepository) error {
	if adm == nil || adm.Registry() == nil {
		return fmt.Errorf("admin registry is required")
	}

	specs := []struct {
		name     string
		required string
		builder  func() *admin.PanelBuilder
	}{
		{
			name:     "pages",
			required: "pages store is required",
			builder: func() *admin.PanelBuilder {
				if pages == nil {
					return nil
				}
				return setup.NewPagesPanelBuilder(pages)
			},
		},
		{
			name:     "posts",
			required: "posts store is required",
			builder: func() *admin.PanelBuilder {
				if posts == nil {
					return nil
				}
				return setup.NewPostsPanelBuilder(posts)
			},
		},
	}

	for _, spec := range specs {
		if panel, ok := adm.Registry().Panel(spec.name); ok && panel != nil {
			continue
		}
		builder := spec.builder()
		if builder == nil {
			return errors.New(spec.required)
		}
		if _, err := adm.RegisterPanel(spec.name, builder); err != nil {
			return fmt.Errorf("register %s panel: %w", spec.name, err)
		}
	}
	if err := ensureCoreContentPanelCommandWiring(adm, pages, posts); err != nil {
		return err
	}
	if err := ensureCoreContentMenuItems(adm); err != nil {
		return err
	}

	return nil
}

func ensureCoreContentPanelCommandWiring(adm *admin.Admin, pages stores.PageRepository, posts stores.PostRepository) error {
	if adm == nil {
		return nil
	}
	bus := adm.Commands()
	if bus == nil {
		return nil
	}

	if err := commands.RegisterPageCommandFactories(bus); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register page command factories: %w", err)
	}
	if err := commands.RegisterPostCommandFactories(bus); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register post command factories: %w", err)
	}

	if _, err := admin.RegisterCommand(bus, commands.NewPagePublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPageBulkPublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.bulk_publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPageBulkUnpublishCommand(pages)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register pages.bulk_unpublish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkPublishCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_publish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkUnpublishCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_unpublish command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkScheduleCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_schedule command: %w", err)
	}
	if _, err := admin.RegisterCommand(bus, commands.NewPostBulkArchiveCommand(posts)); err != nil && !isDuplicateRegistrationError(err) {
		return fmt.Errorf("register posts.bulk_archive command: %w", err)
	}

	return nil
}

func isDuplicateRegistrationError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.Contains(msg, "already registered") || strings.Contains(msg, "already exists")
}

func ensureCoreContentMenuItems(adm *admin.Admin) error {
	if adm == nil || adm.MenuService() == nil {
		return nil
	}
	ctx := context.Background()
	menuCode := strings.TrimSpace(adm.NavMenuCode())
	if menuCode == "" {
		menuCode = setup.NavigationMenuCode
	}
	locale := strings.TrimSpace(adm.DefaultLocale())
	if locale == "" {
		locale = "en"
	}
	contentParentID := strings.TrimSpace(setup.NavigationSectionContent)
	if menuCode != "" && !strings.EqualFold(menuCode, setup.NavigationMenuCode) {
		contentParentID = strings.TrimSpace(menuCode) + ".nav-group-main.content"
	}
	if err := quickstart.EnsureDefaultMenuParents(ctx, adm.MenuService(), menuCode, locale); err != nil {
		return fmt.Errorf("ensure navigation parents: %w", err)
	}

	basePath := strings.TrimSpace(adm.BasePath())
	if basePath == "" {
		basePath = "/admin"
	}
	urls := adm.URLs()
	pagesPath := strings.TrimSpace(quickstart.ResolveAdminPanelURL(urls, basePath, "pages"))
	if pagesPath == "" {
		pagesPath = path.Join(basePath, "content", "pages")
	}
	postsPath := strings.TrimSpace(quickstart.ResolveAdminPanelURL(urls, basePath, "posts"))
	if postsPath == "" {
		postsPath = path.Join(basePath, "content", "posts")
	}

	items := []admin.MenuItem{
		{
			ID:       contentParentID + ".pages",
			Label:    "Pages",
			LabelKey: "menu.content.pages",
			Icon:     "page",
			Target: map[string]any{
				"type": "url",
				"path": pagesPath,
				"key":  "pages",
			},
			Position:    admin.IntPtr(20),
			Menu:        menuCode,
			ParentID:    contentParentID,
			Locale:      locale,
			Permissions: []string{"admin.pages.view"},
		},
		{
			ID:       contentParentID + ".posts",
			Label:    "Posts",
			LabelKey: "menu.content.posts",
			Icon:     "page",
			Target: map[string]any{
				"type": "url",
				"path": postsPath,
				"key":  "posts",
			},
			Position:    admin.IntPtr(30),
			Menu:        menuCode,
			ParentID:    contentParentID,
			Locale:      locale,
			Permissions: []string{"admin.posts.view"},
		},
	}

	menu, err := adm.MenuService().Menu(ctx, menuCode, locale)
	if err != nil {
		return fmt.Errorf("resolve navigation menu: %w", err)
	}
	existingItems := []admin.MenuItem{}
	if menu != nil {
		existingItems = menu.Items
	}

	for _, item := range items {
		if contentMenuItemExists(existingItems, strings.TrimSpace(item.ID), contentMenuTargetKey(item.Target)) {
			continue
		}
		if err := adm.MenuService().AddMenuItem(ctx, menuCode, item); err != nil && !isMenuDuplicateError(err) {
			return fmt.Errorf("add menu item %s: %w", item.ID, err)
		}
	}
	return nil
}

func contentMenuItemExists(items []admin.MenuItem, id string, targetKey string) bool {
	for _, item := range items {
		itemID := strings.TrimSpace(item.ID)
		if id != "" && itemID == id {
			return true
		}
		if targetKey != "" && strings.EqualFold(contentMenuTargetKey(item.Target), targetKey) {
			return true
		}
		if len(item.Children) > 0 && contentMenuItemExists(item.Children, id, targetKey) {
			return true
		}
	}
	return false
}

func contentMenuTargetKey(target map[string]any) string {
	if target == nil {
		return ""
	}
	if key, ok := target["key"].(string); ok && strings.TrimSpace(key) != "" {
		return strings.TrimSpace(key)
	}
	if pathVal, ok := target["path"].(string); ok && strings.TrimSpace(pathVal) != "" {
		return strings.TrimSpace(pathVal)
	}
	return ""
}

func isMenuDuplicateError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.Contains(msg, "already exists") || strings.Contains(msg, "duplicate")
}
