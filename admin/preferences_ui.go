package admin

import (
	"encoding/json"
	"fmt"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const preferencesFormTemplate = "resources/preferences/form"

func (m *PreferencesModule) registerPreferencesRoutes(admin *Admin) {
	if m == nil || admin == nil || admin.router == nil {
		return
	}
	basePath := strings.TrimSpace(m.basePath)
	if basePath == "" {
		basePath = strings.TrimSpace(admin.config.BasePath)
	}
	prefPath := adminRoutePath(admin, preferencesModuleID)
	if prefPath == "" {
		prefPath = joinBasePath(basePath, preferencesModuleID)
	}

	viewHandler := func(c router.Context) error {
		return m.renderPreferencesForm(admin, c, prefPath)
	}
	saveHandler := func(c router.Context) error {
		return m.savePreferencesForm(admin, c, prefPath)
	}

	if authWrap := admin.authWrapper(); authWrap != nil {
		viewHandler = authWrap(viewHandler)
		saveHandler = authWrap(saveHandler)
	}

	admin.router.Get(prefPath, viewHandler)
	admin.router.Post(prefPath, saveHandler)
}

func (m *PreferencesModule) renderPreferencesForm(admin *Admin, c router.Context, prefPath string) error {
	if admin == nil || c == nil {
		return ErrNotFound
	}
	if !featureEnabled(admin.featureGate, FeaturePreferences) {
		return FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if admin.preferences == nil {
		return FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	if err := admin.requirePermission(adminCtx, admin.config.PreferencesPermission, preferencesModuleID); err != nil {
		return err
	}
	userID := strings.TrimSpace(adminCtx.UserID)
	if userID == "" {
		return ErrForbidden
	}
	prefs, err := admin.preferences.Get(adminCtx.Context, userID)
	if err != nil {
		return err
	}

	themeOptions := ensurePreferenceOption(
		m.themeOptions(admin),
		prefs.Theme,
		prefs.Theme,
	)
	variantOptions := ensurePreferenceOption(
		m.variantOptions(admin),
		prefs.ThemeVariant,
		titleCase(prefs.ThemeVariant),
	)

	formHTML, schemaInfo, err := m.preferencesFormHTML(adminCtx.Context, prefPath, prefs, themeOptions, variantOptions)
	if err != nil {
		return err
	}

	basePath := strings.TrimSpace(admin.config.BasePath)
	viewCtx := router.ViewContext{
		"title":          admin.config.Title,
		"base_path":      basePath,
		"resource":       preferencesModuleID,
		"resource_label": "Preferences",
		"active":         preferencesModuleID,
		"routes": map[string]string{
			"save": prefPath,
		},
		"preferences": map[string]any{
			"theme":               prefs.Theme,
			"theme_variant":       prefs.ThemeVariant,
			"dashboard_layout":    preferencesLayoutJSON(prefs.DashboardLayout),
			"dashboard_overrides": preferencesOverridesJSON(prefs.DashboardPrefs),
			"raw_ui":              preferencesRawUIJSON(prefs.Raw),
			"clear_ui_keys":       "",
		},
		"theme_options":   preferencesOptionsToView(themeOptions),
		"variant_options": preferencesOptionsToView(variantOptions),
		"form_html":       formHTML,
		"preferences_schema": map[string]any{
			"source":  schemaInfo.Source,
			"path":    schemaInfo.Path,
			"form_id": schemaInfo.FormID,
			"schema":  schemaInfo.Schema,
		},
		"json_editor_strict": m.jsonEditorStrict,
	}
	viewCtx = buildAdminLayoutViewContext(admin, c, viewCtx, preferencesModuleID)
	if m != nil && m.viewBuilder != nil {
		if updated := m.viewBuilder(admin, c, viewCtx, preferencesModuleID); updated != nil {
			viewCtx = updated
		}
	}
	viewCtx = buildAdminLayoutViewContext(admin, c, viewCtx, preferencesModuleID)
	viewCtx = CaptureViewContextForRequest(admin.Debug(), c, viewCtx)
	return c.Render(preferencesFormTemplate, viewCtx)
}

func (m *PreferencesModule) savePreferencesForm(admin *Admin, c router.Context, prefPath string) error {
	if admin == nil || c == nil {
		return ErrNotFound
	}
	if !featureEnabled(admin.featureGate, FeaturePreferences) {
		return FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	if admin.preferences == nil {
		return FeatureDisabledError{Feature: string(FeaturePreferences)}
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	if err := admin.requirePermission(adminCtx, admin.config.PreferencesUpdatePermission, preferencesModuleID); err != nil {
		return err
	}
	userID := strings.TrimSpace(adminCtx.UserID)
	if userID == "" {
		return ErrForbidden
	}

	theme := strings.TrimSpace(c.FormValue(preferencesKeyTheme))
	themeVariant := strings.TrimSpace(c.FormValue(preferencesKeyThemeVariant))
	rawUIInput := strings.TrimSpace(c.FormValue("raw_ui"))
	clearUIKeysInput := strings.TrimSpace(c.FormValue("clear_ui_keys"))

	rawUI, err := parsePreferencesRawUI(rawUIInput)
	if err != nil {
		return err
	}
	clearUIKeys, err := parsePreferencesClearUIKeys(clearUIKeysInput)
	if err != nil {
		return err
	}

	prefs := UserPreferences{UserID: userID}
	clearKeys := []string{}
	rawUpdateNeeded := len(rawUI) > 0 || len(clearUIKeys) > 0
	if rawUpdateNeeded {
		existing, err := admin.preferences.Get(adminCtx.Context, userID)
		if err != nil {
			return err
		}
		mergedRaw := cloneAnyMap(existing.Raw)
		if mergedRaw == nil {
			mergedRaw = map[string]any{}
		}
		delete(mergedRaw, preferencesKeyTheme)
		delete(mergedRaw, preferencesKeyThemeVariant)
		for _, key := range clearUIKeys {
			delete(mergedRaw, key)
		}
		for key, val := range rawUI {
			mergedRaw[key] = val
		}
		prefs.Raw = mergedRaw
	}
	if theme == "" {
		clearKeys = append(clearKeys, preferencesKeyTheme)
	} else {
		prefs.Theme = theme
	}
	if themeVariant == "" {
		clearKeys = append(clearKeys, preferencesKeyThemeVariant)
	} else {
		prefs.ThemeVariant = themeVariant
	}
	if len(clearUIKeys) > 0 {
		clearKeys = append(clearKeys, clearUIKeys...)
	}
	clearKeys = normalizePreferenceKeys(clearKeys)

	if len(clearKeys) > 0 {
		if _, err := admin.preferences.Clear(adminCtx.Context, userID, clearKeys); err != nil {
			return err
		}
	}
	if prefs.Theme != "" || prefs.ThemeVariant != "" || (prefs.Raw != nil && len(prefs.Raw) > 0) {
		if _, err := admin.preferences.Save(adminCtx.Context, userID, prefs); err != nil {
			return err
		}
	}

	return c.Redirect(prefPath)
}

func preferencesLayoutJSON(layout []DashboardWidgetInstance) string {
	if len(layout) == 0 {
		return ""
	}
	encoded, err := json.MarshalIndent(layout, "", "  ")
	if err != nil {
		return ""
	}
	return string(encoded)
}

func preferencesOverridesJSON(overrides DashboardLayoutOverrides) string {
	if dashboardOverridesEmpty(overrides) {
		return ""
	}
	encoded, err := json.MarshalIndent(overrides, "", "  ")
	if err != nil {
		return ""
	}
	return string(encoded)
}

func preferencesRawUIJSON(raw map[string]any) string {
	if len(raw) == 0 {
		return ""
	}
	filtered := filterAllowedRawPreferences(raw)
	if len(filtered) == 0 {
		return ""
	}
	encoded, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return ""
	}
	return string(encoded)
}

func preferencesOptionsToView(options []Option) []map[string]any {
	if len(options) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(options))
	for _, opt := range options {
		entry := map[string]any{
			"value": opt.Value,
			"label": opt.Label,
		}
		if opt.LabelKey != "" {
			entry["label_key"] = opt.LabelKey
		}
		out = append(out, entry)
	}
	return out
}

func ensurePreferenceOption(options []Option, value, label string) []Option {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return options
	}
	for _, opt := range options {
		if toString(opt.Value) == trimmed {
			return options
		}
	}
	return append(options, Option{Value: trimmed, Label: label})
}

func parsePreferencesRawUI(value string) (map[string]any, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	var decoded any
	if err := json.Unmarshal([]byte(value), &decoded); err != nil {
		return nil, preferencesUIValidationError("raw_ui", "must be valid JSON")
	}
	raw, ok := decoded.(map[string]any)
	if !ok {
		return nil, preferencesUIValidationError("raw_ui", "must be a JSON object")
	}
	for key := range raw {
		if !isAllowedRawPreferenceKey(key) {
			return nil, preferencesUIValidationError("raw_ui", fmt.Sprintf("invalid key %q", key))
		}
	}
	return raw, nil
}

func parsePreferencesClearUIKeys(value string) ([]string, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	parts := splitPreferenceQueryValues([]string{value})
	keys := normalizePreferenceKeys(parts)
	for _, key := range keys {
		if !isAllowedRawPreferenceKey(key) {
			return nil, preferencesUIValidationError("clear_ui_keys", fmt.Sprintf("invalid key %q", key))
		}
	}
	return keys, nil
}

func preferencesUIValidationError(field, message string) error {
	return goerrors.NewValidationFromMap("validation failed", map[string]string{
		field: message,
	})
}
