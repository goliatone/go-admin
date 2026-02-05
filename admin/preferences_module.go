package admin

import (
	"context"
	"errors"
	"net/http"
	"sort"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
	urlkit "github.com/goliatone/go-urlkit"
)

const preferencesModuleID = "preferences"
const preferencesRawNamespacePrefix = "ui."

// PreferencesModule registers a user preferences panel and navigation entry.
// It is feature-gated via FeaturePreferences and backed by PreferencesService.
type PreferencesModule struct {
	basePath         string
	menuCode         string
	defaultLocale    string
	permission       string
	menuParent       string
	viewBuilder      PreferencesViewContextBuilder
	schemaPath       string
	jsonEditorStrict bool
	skipMenu         bool
	urls             urlkit.Resolver
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
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}

	builder := ctx.Admin.Panel("preferences").
		WithRepository(NewPreferencesRepository(ctx.Admin)).
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
	m.registerPreferencesRoutes(ctx.Admin)
	return nil
}

func (m *PreferencesModule) MenuItems(locale string) []MenuItem {
	if m.skipMenu {
		return nil
	}
	if locale == "" {
		locale = m.defaultLocale
	}
	basePath := strings.TrimSpace(m.basePath)
	target := map[string]any{
		"type": "url",
		"key":  preferencesModuleID,
		"name": "admin." + preferencesModuleID,
	}
	if basePath != "" || m.urls != nil {
		if path := resolveURLWith(m.urls, "admin", preferencesModuleID, nil, nil); path != "" {
			target["path"] = path
		} else if basePath != "" {
			target["path"] = joinBasePath(basePath, "preferences")
		}
	}
	return []MenuItem{
		{
			Label:       "Preferences",
			LabelKey:    "menu.preferences",
			Icon:        "user-circle",
			Target:      target,
			Permissions: []string{m.permission},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    intPtr(60),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the preferences navigation under a parent menu item ID.
func (m *PreferencesModule) WithMenuParent(parent string) *PreferencesModule {
	m.menuParent = parent
	return m
}

// WithSkipMenu suppresses navigation menu contribution while keeping panel registration.
func (m *PreferencesModule) WithSkipMenu(skip bool) *PreferencesModule {
	m.skipMenu = skip
	return m
}

// WithBasePath sets the base path used for menu item targets (e.g., /admin).
func (m *PreferencesModule) WithBasePath(basePath string) *PreferencesModule {
	m.basePath = strings.TrimSpace(basePath)
	return m
}

// WithSchemaPath overrides the default preferences form schema path.
func (m *PreferencesModule) WithSchemaPath(path string) *PreferencesModule {
	if m == nil {
		return m
	}
	m.schemaPath = strings.TrimSpace(path)
	return m
}

// WithJSONEditorStrict toggles client-side JSON editor strictness.
func (m *PreferencesModule) WithJSONEditorStrict(strict bool) *PreferencesModule {
	if m == nil {
		return m
	}
	m.jsonEditorStrict = strict
	return m
}

// PreferencesViewContextBuilder augments the view context for the preferences UI.
type PreferencesViewContextBuilder func(adm *Admin, c router.Context, view router.ViewContext, active string) router.ViewContext

// WithViewContextBuilder injects navigation/session/theme data for the preferences UI.
func (m *PreferencesModule) WithViewContextBuilder(builder PreferencesViewContextBuilder) *PreferencesModule {
	m.viewBuilder = builder
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
	if manifestOptions := manifestVariantOptions(admin.themeManifest); len(manifestOptions) > 0 {
		options = append(options, manifestOptions...)
		sort.Slice(options, func(i, j int) bool {
			return strings.ToLower(options[i].Label) < strings.ToLower(options[j].Label)
		})
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

func manifestVariantOptions(manifest *theme.Manifest) []Option {
	if manifest == nil {
		return nil
	}
	if strings.TrimSpace(manifest.Name) == "" {
		return nil
	}
	if len(manifest.Variants) == 0 {
		return nil
	}
	options := []Option{}
	seen := map[string]bool{}
	for name := range manifest.Variants {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		options = append(options, Option{Value: trimmed, Label: titleCase(trimmed)})
	}
	if len(options) == 0 {
		return nil
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
	service                *PreferencesService
	authorizer             Authorizer
	manageTenantPermission string
	manageOrgPermission    string
	manageSystemPermission string
}

// NewPreferencesRepository constructs a repository backed by PreferencesService.
func NewPreferencesRepository(admin *Admin) *PreferencesRepository {
	if admin == nil {
		return &PreferencesRepository{}
	}
	return &PreferencesRepository{
		service:                admin.preferences,
		authorizer:             admin.authorizer,
		manageTenantPermission: admin.config.PreferencesManageTenantPermission,
		manageOrgPermission:    admin.config.PreferencesManageOrgPermission,
		manageSystemPermission: admin.config.PreferencesManageSystemPermission,
	}
}

func (r *PreferencesRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	_ = opts
	scope := preferenceScopeFromContext(ctx)
	userID := scope.UserID
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" {
		return nil, 0, ErrForbidden
	}
	queryOpts, err := preferenceQueryOptionsFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}
	snapshot, err := r.resolveSnapshot(ctx, scope, queryOpts)
	if err != nil {
		return nil, 0, err
	}
	record := r.recordFromSnapshot(scope, snapshot, queryOpts)
	return []map[string]any{record}, 1, nil
}

func (r *PreferencesRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	scope := preferenceScopeFromContext(ctx)
	userID := scope.UserID
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	queryOpts, err := preferenceQueryOptionsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	snapshot, err := r.resolveSnapshot(ctx, scope, queryOpts)
	if err != nil {
		return nil, err
	}
	return r.recordFromSnapshot(scope, snapshot, queryOpts), nil
}

func (r *PreferencesRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	scope := preferenceScopeFromContext(ctx)
	return r.Update(ctx, scope.UserID, record)
}

func (r *PreferencesRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	scope := preferenceScopeFromContext(ctx)
	userID := scope.UserID
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	if _, ok := record["raw_ui"]; ok {
		return nil, preferencesRawUINotSupportedError()
	}
	if _, ok := record["clear_keys"]; ok {
		return nil, preferencesClearKeysNotSupportedError()
	}
	queryOpts, err := preferenceQueryOptionsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	level, err := preferenceLevelFromRecord(record)
	if err != nil {
		return nil, err
	}
	if err := r.requireScopePermission(ctx, level); err != nil {
		return nil, err
	}
	prefs, clearKeys := r.preferencesFromRecord(record, level)
	if toBool(record["clear"]) {
		rawKeys, err := r.rawPreferenceKeysForLevel(ctx, scope, level)
		if err != nil {
			return nil, err
		}
		clearKeys = append(clearKeys, rawKeys...)
	}
	clearKeys = filterClearPreferenceKeys(clearKeys)
	if len(clearKeys) > 0 {
		if level == PreferenceLevelUser {
			if _, err := r.service.Clear(ctx, userID, clearKeys); err != nil {
				return nil, err
			}
		} else {
			if err := r.service.Store().Delete(ctx, PreferencesDeleteInput{
				Scope: scope,
				Level: level,
				Keys:  clearKeys,
			}); err != nil {
				return nil, err
			}
		}
	}
	updateValues := preferencesToMap(prefs)
	var updated UserPreferences
	if len(updateValues) == 0 {
		updated, err = r.service.Get(ctx, userID)
	} else {
		if level == PreferenceLevelUser {
			updated, err = r.service.Save(ctx, userID, prefs)
		} else {
			if _, err := r.service.Store().Upsert(ctx, PreferencesUpsertInput{
				Scope:  scope,
				Level:  level,
				Values: updateValues,
			}); err != nil {
				return nil, err
			}
			updated, err = r.service.Get(ctx, userID)
		}
	}
	if err != nil {
		return nil, err
	}
	if queryOpts.IncludeEffective {
		snapshot, err := r.resolveSnapshot(ctx, scope, queryOpts)
		if err != nil {
			return nil, err
		}
		return r.recordFromSnapshot(scope, snapshot, queryOpts), nil
	}
	return r.recordFromPreferences(updated), nil
}

func (r *PreferencesRepository) Delete(ctx context.Context, id string) error {
	_ = ctx
	_ = id
	return ErrForbidden
}

func (r *PreferencesRepository) resolveSnapshot(ctx context.Context, scope PreferenceScope, opts preferenceQueryOptions) (PreferenceSnapshot, error) {
	return r.service.Resolve(ctx, PreferencesResolveInput{
		Scope:          scope,
		Keys:           opts.Keys,
		Levels:         opts.Levels,
		Base:           opts.Base,
		IncludeTraces:  opts.IncludeTraces,
		IncludeVersion: opts.IncludeVersions,
	})
}

func (r *PreferencesRepository) recordFromSnapshot(scope PreferenceScope, snapshot PreferenceSnapshot, opts preferenceQueryOptions) map[string]any {
	prefs := preferencesFromMap(scope.UserID, snapshot.Effective)
	record := r.recordFromPreferences(prefs)
	if opts.IncludeEffective {
		effective := snapshot.Effective
		if effective == nil {
			effective = map[string]any{}
		}
		record["effective"] = cloneAnyMap(effective)
	}
	if opts.IncludeTraces {
		record["traces"] = snapshot.Traces
	}
	if opts.IncludeVersions {
		versions := snapshot.Versions
		if versions == nil {
			versions = map[string]int{}
		}
		record["versions"] = versions
	}
	return record
}

func (r *PreferencesRepository) recordFromPreferences(prefs UserPreferences) map[string]any {
	record := map[string]any{
		"id":            prefs.UserID,
		"theme":         prefs.Theme,
		"theme_variant": prefs.ThemeVariant,
		"raw":           filterAllowedRawPreferences(prefs.Raw),
	}
	if len(prefs.DashboardLayout) > 0 {
		record["dashboard_layout"] = flattenDashboardLayout(prefs.DashboardLayout)
	}
	if !dashboardOverridesEmpty(prefs.DashboardPrefs) {
		record["dashboard_overrides"] = flattenDashboardOverrides(prefs.DashboardPrefs)
	}
	return record
}

func (r *PreferencesRepository) preferencesFromRecord(record map[string]any, level PreferenceLevel) (UserPreferences, []string) {
	prefs := UserPreferences{
		Raw: map[string]any{},
	}
	if rawVal, ok := record["raw"]; ok {
		prefs.Raw = filterAllowedRawPreferences(extractMap(rawVal))
	}
	clearKeys := filterRawPreferenceKeys(toStringSlice(record["clear_raw_keys"]))
	if level == PreferenceLevelUser {
		if val, ok := record["theme"]; ok && isEmptyPreferenceValue(val) {
			clearKeys = append(clearKeys, preferencesKeyTheme)
		}
		if val, ok := record["theme_variant"]; ok && isEmptyPreferenceValue(val) {
			clearKeys = append(clearKeys, preferencesKeyThemeVariant)
		}
	}
	clearKeys = filterClearPreferenceKeys(clearKeys)
	clearSet := map[string]bool{}
	for _, key := range clearKeys {
		clearSet[key] = true
	}
	if val, ok := record["theme"]; ok && !clearSet[preferencesKeyTheme] {
		if level != PreferenceLevelUser || !isEmptyPreferenceValue(val) {
			prefs.Theme = toString(val)
			prefs.Raw[preferencesKeyTheme] = prefs.Theme
		}
	}
	if val, ok := record["theme_variant"]; ok && !clearSet[preferencesKeyThemeVariant] {
		if level != PreferenceLevelUser || !isEmptyPreferenceValue(val) {
			prefs.ThemeVariant = toString(val)
			prefs.Raw[preferencesKeyThemeVariant] = prefs.ThemeVariant
		}
	}
	if val, ok := record["dashboard_layout"]; ok && !clearSet[preferencesKeyDashboardLayout] {
		prefs.DashboardLayout = expandDashboardLayout(val)
		prefs.Raw[preferencesKeyDashboardLayout] = flattenDashboardLayout(prefs.DashboardLayout)
	}
	if val, ok := record["dashboard_overrides"]; ok && !clearSet[preferencesKeyDashboardPrefs] {
		prefs.DashboardPrefs = expandDashboardOverrides(val)
		prefs.Raw[preferencesKeyDashboardPrefs] = flattenDashboardOverrides(prefs.DashboardPrefs)
	}
	if len(clearSet) > 0 && len(prefs.Raw) > 0 {
		for key := range clearSet {
			delete(prefs.Raw, key)
		}
	}
	return prefs, clearKeys
}

func filterAllowedRawPreferences(raw map[string]any) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, val := range raw {
		if isAllowedRawPreferenceKey(key) {
			out[key] = val
		}
	}
	return out
}

func isAllowedRawPreferenceKey(key string) bool {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" || trimmed != key {
		return false
	}
	if key == "id" || key == "raw" {
		return false
	}
	if !strings.HasPrefix(key, preferencesRawNamespacePrefix) {
		return false
	}
	if key == preferencesRawNamespacePrefix ||
		key == preferencesRawNamespacePrefix+"id" ||
		key == preferencesRawNamespacePrefix+"raw" {
		return false
	}
	for i := 0; i < len(key); i++ {
		ch := key[i]
		switch {
		case ch >= 'a' && ch <= 'z':
		case ch >= 'A' && ch <= 'Z':
		case ch >= '0' && ch <= '9':
		case ch == '.' || ch == '_' || ch == '-':
		default:
			return false
		}
	}
	return true
}

func filterClearPreferenceKeys(keys []string) []string {
	if len(keys) == 0 {
		return nil
	}
	out := []string{}
	seen := map[string]bool{}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" || seen[key] {
			continue
		}
		if isClearablePreferenceKey(key) {
			out = append(out, key)
			seen[key] = true
		}
	}
	return out
}

func filterRawPreferenceKeys(keys []string) []string {
	if len(keys) == 0 {
		return nil
	}
	out := []string{}
	seen := map[string]bool{}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" || seen[key] {
			continue
		}
		if isAllowedRawPreferenceKey(key) {
			out = append(out, key)
			seen[key] = true
		}
	}
	return out
}

func (r *PreferencesRepository) rawPreferenceKeysForLevel(ctx context.Context, scope PreferenceScope, level PreferenceLevel) ([]string, error) {
	if r == nil || r.service == nil || r.service.Store() == nil {
		return nil, preferencesConfigError("preferences store not configured")
	}
	snapshot, err := r.service.Store().Resolve(ctx, PreferencesResolveInput{
		Scope:  scope,
		Levels: []PreferenceLevel{level},
	})
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(snapshot.Effective))
	for key := range snapshot.Effective {
		if isAllowedRawPreferenceKey(key) {
			keys = append(keys, key)
		}
	}
	return keys, nil
}

func preferencesRawUINotSupportedError() error {
	return goerrors.New("raw_ui not supported; use raw", goerrors.CategoryBadInput).
		WithCode(http.StatusBadRequest).
		WithTextCode(TextCodeRawUINotSupported).
		WithMetadata(map[string]any{
			"field": "raw_ui",
			"hint":  "use raw instead",
		})
}

func preferencesClearKeysNotSupportedError() error {
	return goerrors.New("clear_keys not supported; use clear_raw_keys", goerrors.CategoryBadInput).
		WithCode(http.StatusBadRequest).
		WithTextCode(TextCodeClearKeysNotSupported).
		WithMetadata(map[string]any{
			"field": "clear_keys",
			"hint":  "use clear_raw_keys",
		})
}

func isClearablePreferenceKey(key string) bool {
	switch key {
	case preferencesKeyTheme, preferencesKeyThemeVariant, preferencesKeyDashboardLayout, preferencesKeyDashboardPrefs:
		return true
	default:
		return isAllowedRawPreferenceKey(key)
	}
}

func isEmptyPreferenceValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	default:
		return false
	}
}

func (r *PreferencesRepository) requireScopePermission(ctx context.Context, level PreferenceLevel) error {
	if level == PreferenceLevelUser {
		return nil
	}
	if r == nil || r.authorizer == nil {
		return nil
	}
	permission := ""
	switch level {
	case PreferenceLevelTenant:
		permission = r.manageTenantPermission
	case PreferenceLevelOrg:
		permission = r.manageOrgPermission
	case PreferenceLevelSystem:
		permission = r.manageSystemPermission
	default:
		return goerrors.New("unsupported preference level", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithMetadata(map[string]any{"level": string(level)})
	}
	if permission == "" {
		return nil
	}
	if !r.authorizer.Can(ctx, permission, preferencesModuleID) {
		return permissionDenied(permission, preferencesModuleID)
	}
	return nil
}

func preferenceLevelFromRecord(record map[string]any) (PreferenceLevel, error) {
	if record == nil {
		return PreferenceLevelUser, nil
	}
	if val, ok := record["level"]; ok {
		level := strings.ToLower(strings.TrimSpace(toString(val)))
		if level == "" {
			return PreferenceLevelUser, nil
		}
		switch level {
		case string(PreferenceLevelSystem):
			return PreferenceLevelSystem, nil
		case string(PreferenceLevelTenant):
			return PreferenceLevelTenant, nil
		case string(PreferenceLevelOrg):
			return PreferenceLevelOrg, nil
		case string(PreferenceLevelUser):
			return PreferenceLevelUser, nil
		default:
			return "", goerrors.New("invalid preference level", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithMetadata(map[string]any{"level": level})
		}
	}
	return PreferenceLevelUser, nil
}
