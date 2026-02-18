package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

const featureFlagsModuleID = "feature_flags"

// FeatureFlagsModule registers the feature flags UI navigation entry.
type FeatureFlagsModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
	urls          urlkit.Resolver
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
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "feature_flags_module"})
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
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}
	return nil
}

func (m *FeatureFlagsModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	basePath := strings.TrimSpace(m.basePath)
	target := map[string]any{
		"type": "url",
		"key":  featureFlagsModuleID,
	}
	if path := resolveURLWith(m.urls, "admin", "feature_flags", nil, nil); path != "" {
		target["path"] = path
	} else {
		target["path"] = joinBasePath(basePath, "feature-flags")
	}
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Feature Flags",
			LabelKey:    "menu.feature_flags",
			Icon:        "switch-on",
			Target:      target,
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    primitives.Int(70),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the feature flags navigation under a parent menu item ID.
func (m *FeatureFlagsModule) WithMenuParent(parent string) *FeatureFlagsModule {
	m.menuParent = parent
	return m
}

// WithBasePath sets the base path used for menu item targets (e.g., /admin).
func (m *FeatureFlagsModule) WithBasePath(basePath string) *FeatureFlagsModule {
	m.basePath = strings.TrimSpace(basePath)
	return m
}
