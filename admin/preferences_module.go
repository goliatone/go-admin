package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
)

const preferencesModuleID = "preferences"

// PreferencesModule registers a user preferences panel and navigation entry.
// It is feature-gated via FeaturePreferences and backed by PreferencesService.
type PreferencesModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
}

// NewPreferencesModule constructs the default preferences module.
func NewPreferencesModule() *PreferencesModule {
	return &PreferencesModule{}
}

func (m *PreferencesModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             preferencesModuleID,
		NameKey:        "modules.preferences.name",
		DescriptionKey: "modules.preferences.description",
		FeatureFlags:   []string{string(FeaturePreferences)},
	}
}

func (m *PreferencesModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return errors.New("admin is nil")
	}
	if ctx.Admin.preferences == nil {
		return FeatureDisabledError{Feature: string(FeaturePreferences)}
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
		m.permission = ctx.Admin.config.PreferencesPermission
	}

	builder := ctx.Admin.Panel("preferences").
		WithRepository(NewPreferencesRepository(ctx.Admin.preferences)).
		ListFields(
			Field{Name: "theme", Label: "Theme", Type: "text"},
			Field{Name: "theme_variant", Label: "Theme Variant", Type: "text"},
		).
		FormFields(
			Field{Name: "theme", Label: "Theme", Type: "select", Options: m.themeOptions(ctx.Admin)},
			Field{Name: "theme_variant", Label: "Theme Variant", Type: "select", Options: m.variantOptions(ctx.Admin)},
		).
		DetailFields(
			Field{Name: "theme", Label: "Theme", Type: "text"},
			Field{Name: "theme_variant", Label: "Theme Variant", Type: "text"},
			Field{Name: "dashboard_layout", Label: "Dashboard Layout", Type: "textarea", ReadOnly: true},
		).
		Permissions(PanelPermissions{
			View:   ctx.Admin.config.PreferencesPermission,
			Create: ctx.Admin.config.PreferencesUpdatePermission,
			Edit:   ctx.Admin.config.PreferencesUpdatePermission,
			Delete: ctx.Admin.config.PreferencesUpdatePermission,
		})

	if _, err := ctx.Admin.RegisterPanel("preferences", builder); err != nil {
		return err
	}
	return nil
}

func (m *PreferencesModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	path := joinPath(m.basePath, "preferences")
	return []MenuItem{
		{
			Label:       "Preferences",
			LabelKey:    "menu.preferences",
			Icon:        "user-circle",
			Target:      map[string]any{"type": "url", "path": path, "key": preferencesModuleID},
			Permissions: []string{m.permission},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    60,
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the preferences navigation under a parent menu item ID.
func (m *PreferencesModule) WithMenuParent(parent string) *PreferencesModule {
	m.menuParent = parent
	return m
}

func (m *PreferencesModule) themeOptions(admin *Admin) []Option {
	options := []Option{{Value: "", Label: "System Default"}}
	if admin == nil {
		return options
	}
	seen := map[string]bool{"": true}
	if admin.config.Theme != "" {
		options = append(options, Option{Value: admin.config.Theme, Label: admin.config.Theme})
		seen[admin.config.Theme] = true
	}
	if pref := admin.preferences; pref != nil {
		if sel := pref.ThemeSelectorForUser(context.Background(), ""); sel.Name != "" && !seen[sel.Name] {
			options = append(options, Option{Value: sel.Name, Label: sel.Name})
		}
	}
	return options
}

func (m *PreferencesModule) variantOptions(admin *Admin) []Option {
	options := []Option{{Value: "", Label: "System Default"}}
	if admin == nil {
		return options
	}
	variantSet := map[string]bool{"": true}
	if admin.config.ThemeVariant != "" {
		options = append(options, Option{Value: admin.config.ThemeVariant, Label: titleCase(admin.config.ThemeVariant)})
		variantSet[admin.config.ThemeVariant] = true
	}
	if admin.defaultTheme != nil && admin.defaultTheme.ChartTheme != "" && !variantSet[admin.defaultTheme.ChartTheme] {
		options = append(options, Option{Value: admin.defaultTheme.ChartTheme, Label: titleCase(admin.defaultTheme.ChartTheme)})
		variantSet[admin.defaultTheme.ChartTheme] = true
	}
	sort.Slice(options, func(i, j int) bool {
		return strings.ToLower(options[i].Label) < strings.ToLower(options[j].Label)
	})
	return options
}

func titleCase(val string) string {
	if val == "" {
		return ""
	}
	return strings.ToUpper(val[:1]) + strings.ToLower(val[1:])
}

// PreferencesRepository adapts PreferencesService to the panel Repository contract.
type PreferencesRepository struct {
	service *PreferencesService
}

// NewPreferencesRepository constructs a repository backed by PreferencesService.
func NewPreferencesRepository(service *PreferencesService) *PreferencesRepository {
	return &PreferencesRepository{service: service}
}

func (r *PreferencesRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	_ = opts
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" {
		return nil, 0, ErrForbidden
	}
	prefs, err := r.service.Get(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return []map[string]any{r.recordFromPreferences(prefs)}, 1, nil
}

func (r *PreferencesRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	prefs, err := r.service.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	return r.recordFromPreferences(prefs), nil
}

func (r *PreferencesRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, userIDFromContext(ctx), record)
}

func (r *PreferencesRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	prefs := r.preferencesFromRecord(record)
	updated, err := r.service.Save(ctx, userID, prefs)
	if err != nil {
		return nil, err
	}
	return r.recordFromPreferences(updated), nil
}

func (r *PreferencesRepository) Delete(ctx context.Context, id string) error {
	_ = ctx
	_ = id
	return ErrForbidden
}

func (r *PreferencesRepository) recordFromPreferences(prefs UserPreferences) map[string]any {
	record := map[string]any{
		"id":            prefs.UserID,
		"theme":         prefs.Theme,
		"theme_variant": prefs.ThemeVariant,
	}
	if len(prefs.DashboardLayout) > 0 {
		record["dashboard_layout"] = flattenDashboardLayout(prefs.DashboardLayout)
	}
	return record
}

func (r *PreferencesRepository) preferencesFromRecord(record map[string]any) UserPreferences {
	prefs := UserPreferences{
		Raw: cloneAnyMap(record),
	}
	if val, ok := record["theme"]; ok {
		prefs.Theme = toString(val)
	}
	if val, ok := record["theme_variant"]; ok {
		prefs.ThemeVariant = toString(val)
	}
	if val, ok := record["dashboard_layout"]; ok {
		prefs.DashboardLayout = expandDashboardLayout(val)
	}
	return prefs
}
