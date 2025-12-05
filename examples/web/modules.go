package main

import (
	"fmt"
	"path"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
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
	parentID   string
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

	// Create activity adapter to bridge command events to admin activity sink
	activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())

	// Register commands with activity hooks for event emission
	activateCmd := commands.NewUserActivateCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(activateCmd)

	deactivateCmd := commands.NewUserDeactivateCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(deactivateCmd)

	// Register panel
	builder := setup.NewUserPanelBuilder(m.store)
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
	// Use hardcoded label since translations aren't set up yet
	label := "Users"
	return []admin.MenuItem{
		{
			Label:    label,
			LabelKey: "menu.users",
			Icon:     "group",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "users"),
				"key":  "users",
			},
			ParentID:    m.parentID,
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
	if m == nil || m.store == nil {
		return fmt.Errorf("pages module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}

	// Create activity adapter
	activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())

	// Register commands with activity hooks
	publishCmd := commands.NewPagePublishCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(publishCmd)

	bulkPublishCmd := commands.NewPageBulkPublishCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(bulkPublishCmd)

	bulkUnpublishCmd := commands.NewPageBulkUnpublishCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(bulkUnpublishCmd)

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
	// Use hardcoded label since translations aren't set up yet
	label := "Pages"
	return []admin.MenuItem{
		{
			Label:    label,
			LabelKey: "menu.pages",
			Icon:     "page",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "pages"),
				"key":  "pages",
			},
			ParentID:    m.parentID,
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
	if m == nil || m.store == nil {
		return fmt.Errorf("posts module store is nil")
	}
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if ctx.Translator != nil {
		m.translator = ctx.Translator
	}

	// Create activity adapter
	activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())

	// Register commands with activity hooks
	bulkPublishCmd := commands.NewPostBulkPublishCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(bulkPublishCmd)

	bulkArchiveCmd := commands.NewPostBulkArchiveCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(bulkArchiveCmd)

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
	// Use hardcoded label since translations aren't set up yet
	label := "Posts"
	return []admin.MenuItem{
		{
			Label:    label,
			LabelKey: "menu.posts",
			Icon:     "post",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "posts"),
				"key":  "posts",
			},
			ParentID:    m.parentID,
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

	// Register commands with activity hooks
	bulkDeleteCmd := commands.NewMediaBulkDeleteCommand(m.store).
		WithActivityHooks(activityAdapter)
	ctx.Admin.Commands().Register(bulkDeleteCmd)

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
	// Use hardcoded label since translations aren't set up yet
	label := "Media"
	return []admin.MenuItem{
		{
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
	parentID   string
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
			Label:    "Notifications",
			LabelKey: "menu.notifications",
			Icon:     "bell",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(m.basePath, "notifications"),
				"key":  "notifications",
			},
			ParentID: m.parentID,
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
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLoc
	}
	// Use hardcoded label since translations aren't set up yet
	label := "Dashboard"
	return []admin.MenuItem{
		{
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
			Position: 1,
		},
	}
}

func (m *dashboardModule) WithTranslator(t admin.Translator) {
	m.translator = t
}
