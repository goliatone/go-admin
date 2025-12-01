package main

import (
	"fmt"
	"path"

	"github.com/goliatone/go-admin/admin"
)

// usersModule registers the users panel and menu entry.
type usersModule struct {
	store      *UserStore
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
	builder := newUserPanelBuilder(m.store)
	ctx.Admin.Commands().Register(&userActivateCommand{store: m.store})
	ctx.Admin.Commands().Register(&userDeactivateCommand{store: m.store})
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
			Icon:  "users",
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
	store      *PageStore
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
	_, err := ctx.Admin.RegisterPanel("pages", newPagesPanelBuilder(m.store))
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
			Icon:  "file",
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
	store      *PostStore
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
	_, err := ctx.Admin.RegisterPanel("posts", newPostsPanelBuilder(m.store))
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
			Icon:  "file-text",
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
	store      *MediaStore
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
	_, err := ctx.Admin.RegisterPanel("media", newMediaPanelBuilder(m.store))
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
			Icon:  "image",
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
			Icon:  "dashboard-speed",
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
