package admin

import (
	urlkit "github.com/goliatone/go-urlkit"
)

const activityModuleID = "activity"

// ActivityModule registers the activity log navigation and user detail tab.
type ActivityModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
	urls          urlkit.Resolver
}

// NewActivityModule constructs the default activity module.
func NewActivityModule() *ActivityModule {
	return &ActivityModule{}
}

// Manifest describes the module metadata.
func (m *ActivityModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             activityModuleID,
		NameKey:        "modules.activity.name",
		DescriptionKey: "modules.activity.description",
	}
}

// Register wires the activity module metadata and user tab integration.
func (m *ActivityModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "activity_module"})
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.permission == "" {
		m.permission = ctx.Admin.config.ActivityPermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}
	return nil
}

// MenuItems contributes navigation for the activity module.
func (m *ActivityModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	path := resolveURLWith(m.urls, "admin", activityModuleID, nil, nil)
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Activity",
			LabelKey:    "menu.activity",
			Icon:        "clock",
			Target:      map[string]any{"type": "url", "path": path, "key": activityModuleID},
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    intPtr(45),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the activity navigation under a parent menu item ID.
func (m *ActivityModule) WithMenuParent(parent string) *ActivityModule {
	m.menuParent = parent
	return m
}
