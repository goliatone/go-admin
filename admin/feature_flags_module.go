package admin

import "errors"

const featureFlagsModuleID = "feature_flags"

// FeatureFlagsModule registers the feature flags UI navigation entry.
type FeatureFlagsModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
}

// NewFeatureFlagsModule constructs the default feature flags module.
func NewFeatureFlagsModule() *FeatureFlagsModule {
	return &FeatureFlagsModule{}
}

func (m *FeatureFlagsModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             featureFlagsModuleID,
		NameKey:        "modules.feature_flags.name",
		DescriptionKey: "modules.feature_flags.description",
	}
}

func (m *FeatureFlagsModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return errors.New("admin is nil")
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
		m.permission = ctx.Admin.config.FeatureFlagsViewPermission
	}
	return nil
}

func (m *FeatureFlagsModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	path := joinPath(m.basePath, "feature-flags")
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Feature Flags",
			LabelKey:    "menu.feature_flags",
			Icon:        "toggle-on",
			Target:      map[string]any{"type": "url", "path": path, "key": featureFlagsModuleID},
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    intPtr(70),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the feature flags navigation under a parent menu item ID.
func (m *FeatureFlagsModule) WithMenuParent(parent string) *FeatureFlagsModule {
	m.menuParent = parent
	return m
}
