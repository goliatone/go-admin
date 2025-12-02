package main

import (
	"fmt"
	"path"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// usersModule registers the users panel and menu entry.
type usersModule struct {
	store      *stores.UserStore
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
}

func (m *usersModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "users",
		NameKey:        "modules.users.name",
		DescriptionKey: "modules.users.description",
	}
}

func (m *usersModule) Register(ctx admin.ModuleContext) error {
	if m == nil || m.store == nil {
		return fmt.Errorf("users module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	builder := setup.NewUserPanelBuilder(m.store)
	ctx.Admin.Commands().Register(commands.NewUserActivateCommand(m.store))
	ctx.Admin.Commands().Register(commands.NewUserDeactivateCommand(m.store))
	_, err := ctx.Admin.RegisterPanel("users", builder)
	return err
}

func (m *usersModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	label := "Users"
	if m.translator != nil {
		label = m.translator.Translate("modules.users.label", locale)
	}
	return []admin.MenuItem{
		{
			Label: label,
			Icon:  "group",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "users"),
				"key":  "users",
			},
			Permissions: []string{"admin.users.view"},
			Locale:      locale,
			Menu:        code,
			Position:    10,
		},
	}
}

func (m *usersModule) WithTranslator(t admin.Translator) {
	m.translator = t
}

// pagesModule registers the pages panel and menu entry.
type pagesModule struct {
	store      *stores.PageStore
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
}

func (m *pagesModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "pages",
		NameKey:        "modules.pages.name",
		DescriptionKey: "modules.pages.description",
	}
}

func (m *pagesModule) Register(ctx admin.ModuleContext) error {
	if m == nil || m.store == nil {
		return fmt.Errorf("pages module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	ctx.Admin.Commands().Register(commands.NewPagePublishCommand(m.store))
	ctx.Admin.Commands().Register(commands.NewPageBulkPublishCommand(m.store))
	ctx.Admin.Commands().Register(commands.NewPageBulkUnpublishCommand(m.store))
	_, err := ctx.Admin.RegisterPanel("pages", setup.NewPagesPanelBuilder(m.store))
	return err
}

func (m *pagesModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	label := "Pages"
	if m.translator != nil {
		label = m.translator.Translate("modules.pages.label", locale)
	}
	return []admin.MenuItem{
		{
			Label: label,
			Icon:  "page",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "pages"),
				"key":  "pages",
			},
			Permissions: []string{"admin.pages.view"},
			Locale:      locale,
			Menu:        code,
			Position:    20,
		},
	}
}

func (m *pagesModule) WithTranslator(t admin.Translator) {
	m.translator = t
}

// postsModule registers the posts panel and menu entry.
type postsModule struct {
	store      *stores.PostStore
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
}

func (m *postsModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "posts",
		NameKey:        "modules.posts.name",
		DescriptionKey: "modules.posts.description",
	}
}

func (m *postsModule) Register(ctx admin.ModuleContext) error {
	if m == nil || m.store == nil {
		return fmt.Errorf("posts module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	ctx.Admin.Commands().Register(commands.NewPostBulkPublishCommand(m.store))
	ctx.Admin.Commands().Register(commands.NewPostBulkArchiveCommand(m.store))
	_, err := ctx.Admin.RegisterPanel("posts", setup.NewPostsPanelBuilder(m.store))
	return err
}

func (m *postsModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	label := "Posts"
	if m.translator != nil {
		label = m.translator.Translate("modules.posts.label", locale)
	}
	return []admin.MenuItem{
		{
			Label: label,
			Icon:  "post",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "posts"),
				"key":  "posts",
			},
			Permissions: []string{"admin.posts.view"},
			Locale:      locale,
			Menu:        code,
			Position:    30,
			Badge: map[string]any{
				"text": "3",
			},
			Classes: []string{"has-badge"},
		},
	}
}

func (m *postsModule) WithTranslator(t admin.Translator) {
	m.translator = t
}

// mediaModule registers the media panel and menu entry.
type mediaModule struct {
	store      *stores.MediaStore
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
}

func (m *mediaModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "media",
		NameKey:        "modules.media.name",
		DescriptionKey: "modules.media.description",
		FeatureFlags:   []string{string(admin.FeatureMedia)},
	}
}

func (m *mediaModule) Register(ctx admin.ModuleContext) error {
	if m == nil || m.store == nil {
		return fmt.Errorf("media module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	ctx.Admin.Commands().Register(commands.NewMediaBulkDeleteCommand(m.store))
	_, err := ctx.Admin.RegisterPanel("media", setup.NewMediaPanelBuilder(m.store))
	return err
}

func (m *mediaModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	label := "Media"
	if m.translator != nil {
		label = m.translator.Translate("modules.media.label", locale)
	}
	return []admin.MenuItem{
		{
			Label: label,
			Icon:  "media-image",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "media"),
				"key":  "media",
			},
			Permissions: []string{"admin.media.view"},
			Locale:      locale,
			Menu:        code,
			Position:    40,
		},
	}
}

func (m *mediaModule) WithTranslator(t admin.Translator) {
	m.translator = t
}

// notificationsModule contributes the notifications center menu entry.
type notificationsModule struct {
	menuCode   string
	defaultLoc string
	basePath   string
}

func (m *notificationsModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:           "notifications",
		FeatureFlags: []string{string(admin.FeatureNotifications)},
	}
}

func (m *notificationsModule) Register(ctx admin.ModuleContext) error {
	return nil
}

func (m *notificationsModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	return []admin.MenuItem{
		{
			Label: "Notifications",
			Icon:  "notifications",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "notifications"),
				"key":  "notifications",
			},
			Locale:   locale,
			Menu:     code,
			Position: 50,
		},
	}
}

// dashboardModule contributes the dashboard menu item.
type dashboardModule struct {
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
}

func (m *dashboardModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "dashboard",
		NameKey:        "modules.dashboard.name",
		DescriptionKey: "modules.dashboard.description",
		FeatureFlags:   []string{string(admin.FeatureDashboard)},
	}
}

func (m *dashboardModule) Register(ctx admin.ModuleContext) error {
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	return nil
}

func (m *dashboardModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	label := "Dashboard"
	if m.translator != nil {
		label = m.translator.Translate("modules.dashboard.label", locale)
	}
	return []admin.MenuItem{
		{
			Label: label,
			Icon:  "home",
			Target: map[string]any{
				"type": "url",
				"path": path.Join("/", m.basePath),
				"key":  "dashboard",
			},
			Locale:   locale,
			Menu:     code,
			Position: 0,
		},
	}
}

func (m *dashboardModule) WithTranslator(t admin.Translator) {
	m.translator = t
}
