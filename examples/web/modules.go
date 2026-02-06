package main

import (
	"fmt"
	"path"

	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

// pagesModule registers the pages panel and menu entry.
type pagesModule struct {
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
	parentID   string
}

func (m *pagesModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "pages",
		NameKey:        "modules.pages.name",
		DescriptionKey: "modules.pages.description",
	}
}

func (m *pagesModule) Register(ctx admin.ModuleContext) error {
	if m == nil {
		return nil
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	return nil
}

func (m *pagesModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = setup.NavigationMenuCode
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	// Use hardcoded label since translations aren't set up yet
	label := "Pages"
	id := setup.NavigationSectionContent + ".pages"
	return []admin.MenuItem{
		{
			ID:       id,
			Label:    label,
			LabelKey: "menu.pages",
			Icon:     "page",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "content", "pages"),
				"key":  "pages",
			},
			ParentID:    m.parentID,
			Permissions: []string{"admin.pages.view"},
			Locale:      locale,
			Menu:        code,
			Position:    admin.IntPtr(20),
		},
	}
}

func (m *pagesModule) WithTranslator(t admin.Translator) {
	m.translator = t
}

// postsModule registers the posts panel and menu entry.
type postsModule struct {
	menuCode   string
	defaultLoc string
	basePath   string
	translator admin.Translator
	parentID   string
}

func (m *postsModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "posts",
		NameKey:        "modules.posts.name",
		DescriptionKey: "modules.posts.description",
	}
}

func (m *postsModule) Register(ctx admin.ModuleContext) error {
	if m == nil {
		return nil
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}
	return nil
}

func (m *postsModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = setup.NavigationMenuCode
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	// Use hardcoded label since translations aren't set up yet
	label := "Posts"
	id := setup.NavigationSectionContent + ".posts"
	return []admin.MenuItem{
		{
			ID:       id,
			Label:    label,
			LabelKey: "menu.posts",
			Icon:     "post",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "content", "posts"),
				"key":  "posts",
			},
			ParentID:    m.parentID,
			Permissions: []string{"admin.posts.view"},
			Locale:      locale,
			Menu:        code,
			Position:    admin.IntPtr(30),
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
	parentID   string
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

	// Create activity adapter
	activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())
	bus := ctx.Admin.Commands()
	if err := commands.RegisterMediaCommandFactories(bus); err != nil {
		return err
	}

	// Register commands with activity hooks
	bulkDeleteCmd := commands.NewMediaBulkDeleteCommand(m.store).
		WithActivityHooks(activityAdapter)
	if _, err := admin.RegisterCommand(bus, bulkDeleteCmd); err != nil {
		return err
	}

	_, err := ctx.Admin.RegisterPanel("media", setup.NewMediaPanelBuilder(m.store))
	return err
}

func (m *mediaModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = setup.NavigationMenuCode
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	// Use hardcoded label since translations aren't set up yet
	label := "Media"
	id := setup.NavigationSectionContent + ".media"
	return []admin.MenuItem{
		{
			ID:       id,
			Label:    label,
			LabelKey: "menu.media",
			Icon:     "media-image",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "media"),
				"key":  "media",
			},
			ParentID:    m.parentID,
			Permissions: []string{"admin.media.view"},
			Locale:      locale,
			Menu:        code,
			Position:    admin.IntPtr(40),
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
	parentID   string
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
		code = setup.NavigationMenuCode
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	// Use hardcoded label since translations aren't set up yet
	label := "Dashboard"
	id := "dashboard"
	if m.parentID != "" {
		id = m.parentID + ".dashboard"
	}
	return []admin.MenuItem{
		{
			ID:       id,
			Label:    label,
			LabelKey: "menu.dashboard",
			Icon:     "home",
			Target: map[string]any{
				"type": "url",
				"path": path.Join("/", m.basePath),
				"key":  "dashboard",
			},
			ParentID: m.parentID,
			Locale:   locale,
			Menu:     code,
			Position: admin.IntPtr(1),
		},
	}
}

func (m *dashboardModule) WithTranslator(t admin.Translator) {
	m.translator = t
}
