package admin

import (
	"context"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestPreferencesFormSaveMergesRawUIAndClearKeys(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	if _, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
		Raw: map[string]any{
			"ui.keep":     map[string]any{"ok": true},
			"system.flag": true,
		},
	}); err != nil {
		t.Fatalf("seed preferences: %v", err)
	}

	prefPath := joinBasePath(cfg.BasePath, preferencesModuleID)
	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("FormValue", preferencesKeyTheme).Return("")
	mockCtx.On("FormValue", preferencesKeyThemeVariant).Return("")
	mockCtx.On("FormValue", "raw_ui").Return(`{"ui.new":{"value":1}}`)
	mockCtx.On("FormValue", "clear_ui_keys").Return("ui.keep")
	mockCtx.On("Redirect", prefPath).Return(nil)

	mod := NewPreferencesModule()
	if err := mod.savePreferencesForm(adm, mockCtx, prefPath); err != nil {
		t.Fatalf("save preferences form: %v", err)
	}

	prefs, err := adm.preferences.Get(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("load preferences: %v", err)
	}
	if _, ok := prefs.Raw["ui.keep"]; ok {
		t.Fatalf("expected cleared ui key removed, got %v", prefs.Raw)
	}
	if _, ok := prefs.Raw["ui.new"]; !ok {
		t.Fatalf("expected new ui key merged, got %v", prefs.Raw)
	}
	if _, ok := prefs.Raw["system.flag"]; !ok {
		t.Fatalf("expected non-ui key preserved, got %v", prefs.Raw)
	}

	mockCtx.AssertExpectations(t)
}

func TestPreferencesFormSaveRejectsInvalidRawUI(t *testing.T) {
	tests := []struct {
		name  string
		rawUI string
	}{
		{name: "invalid json", rawUI: "{invalid"},
		{name: "invalid key", rawUI: `{"not.allowed":true}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := Config{
				BasePath:      "/admin",
				DefaultLocale: "en",
			}
			adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
			adm.WithAuthorizer(allowAll{})
			if _, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
				Raw: map[string]any{
					"ui.keep":     map[string]any{"ok": true},
					"system.flag": true,
				},
			}); err != nil {
				t.Fatalf("seed preferences: %v", err)
			}

			mockCtx := router.NewMockContext()
			mockCtx.HeadersM["X-User-ID"] = "user-1"
			mockCtx.On("Context").Return(context.Background())
			mockCtx.On("FormValue", preferencesKeyTheme).Return("")
			mockCtx.On("FormValue", preferencesKeyThemeVariant).Return("")
			mockCtx.On("FormValue", "raw_ui").Return(tc.rawUI)
			mockCtx.On("FormValue", "clear_ui_keys").Return("")

			mod := NewPreferencesModule()
			if err := mod.savePreferencesForm(adm, mockCtx, joinBasePath(cfg.BasePath, preferencesModuleID)); err == nil {
				t.Fatalf("expected raw_ui validation error")
			}

			prefs, err := adm.preferences.Get(context.Background(), "user-1")
			if err != nil {
				t.Fatalf("load preferences: %v", err)
			}
			if _, ok := prefs.Raw["ui.keep"]; !ok {
				t.Fatalf("expected existing ui key preserved, got %v", prefs.Raw)
			}
			if _, ok := prefs.Raw["system.flag"]; !ok {
				t.Fatalf("expected non-ui key preserved, got %v", prefs.Raw)
			}

			mockCtx.AssertExpectations(t)
		})
	}
}

func TestPreferencesFormSaveRejectsInvalidClearUIKeys(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	if _, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
		Raw: map[string]any{
			"ui.keep":     map[string]any{"ok": true},
			"system.flag": true,
		},
	}); err != nil {
		t.Fatalf("seed preferences: %v", err)
	}

	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("FormValue", preferencesKeyTheme).Return("")
	mockCtx.On("FormValue", preferencesKeyThemeVariant).Return("")
	mockCtx.On("FormValue", "raw_ui").Return(`{"ui.new":true}`)
	mockCtx.On("FormValue", "clear_ui_keys").Return("not.allowed")

	mod := NewPreferencesModule()
	if err := mod.savePreferencesForm(adm, mockCtx, joinBasePath(cfg.BasePath, preferencesModuleID)); err == nil {
		t.Fatalf("expected clear_ui_keys validation error")
	}

	prefs, err := adm.preferences.Get(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("load preferences: %v", err)
	}
	if _, ok := prefs.Raw["ui.keep"]; !ok {
		t.Fatalf("expected existing ui key preserved, got %v", prefs.Raw)
	}
	if _, ok := prefs.Raw["system.flag"]; !ok {
		t.Fatalf("expected non-ui key preserved, got %v", prefs.Raw)
	}

	mockCtx.AssertExpectations(t)
}

func TestPreferencesViewContextIncludesSchemaMetadata(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	mod := NewPreferencesModule()
	mod.WithJSONEditorStrict(true)

	prefPath := joinBasePath(cfg.BasePath, preferencesModuleID)
	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("Path").Return(prefPath)
	mockCtx.On("Render", preferencesFormTemplate, mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		strict, ok := viewCtx["json_editor_strict"].(bool)
		if !ok || !strict {
			return false
		}
		schemaVal, ok := viewCtx["preferences_schema"]
		if !ok {
			return false
		}
		schema, ok := schemaVal.(map[string]any)
		if !ok {
			return false
		}
		source, ok := schema["source"].(string)
		if !ok || source == "" {
			return false
		}
		path, ok := schema["path"].(string)
		if !ok || path == "" {
			return false
		}
		formID, ok := schema["form_id"].(string)
		if !ok || formID == "" {
			return false
		}
		if schema["schema"] == nil {
			return false
		}
		return true
	})).Return(nil)

	if err := mod.renderPreferencesForm(adm, mockCtx, prefPath); err != nil {
		t.Fatalf("render preferences form: %v", err)
	}
	mockCtx.AssertExpectations(t)
}

func TestPreferencesViewContextIncludesAdminLayoutContext(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := New(cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuthorizer(allowAll{})
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(NavigationItem{
		ID:    "admin.main.dashboard",
		Label: "Dashboard",
		Target: map[string]any{
			"path": "/admin",
			"key":  "dashboard",
		},
	})

	mod := NewPreferencesModule()
	prefPath := joinBasePath(cfg.BasePath, preferencesModuleID)
	reqCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "user-1",
		Subject: "user-1",
		Role:    "admin",
		Metadata: map[string]any{
			"display_name": "Admin User",
		},
	})
	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(reqCtx)
	mockCtx.On("Path").Return(prefPath)
	mockCtx.On("Render", preferencesFormTemplate, mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		navItems, ok := viewCtx["nav_items"].([]map[string]any)
		if !ok || len(navItems) == 0 {
			return false
		}
		sessionUser, ok := viewCtx["session_user"].(map[string]any)
		if !ok {
			return false
		}
		displayName := strings.TrimSpace(toString(sessionUser["display_name"]))
		if displayName == "" || strings.EqualFold(displayName, "Guest") {
			return false
		}
		if _, ok := viewCtx["theme"].(map[string]map[string]string); !ok {
			return false
		}
		if strings.TrimSpace(toString(viewCtx["api_base_path"])) == "" {
			return false
		}
		return true
	})).Return(nil)

	if err := mod.renderPreferencesForm(adm, mockCtx, prefPath); err != nil {
		t.Fatalf("render preferences form: %v", err)
	}
	mockCtx.AssertExpectations(t)
}

func TestPreferencesViewContextRehydratesAdminLayoutAfterCustomBuilder(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := New(cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuthorizer(allowAll{})
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(NavigationItem{
		ID:    "admin.main.dashboard",
		Label: "Dashboard",
		Target: map[string]any{
			"path": "/admin",
			"key":  "dashboard",
		},
	})

	mod := NewPreferencesModule()
	mod.WithViewContextBuilder(func(_ *Admin, _ router.Context, _ router.ViewContext, _ string) router.ViewContext {
		return router.ViewContext{
			"title": "Custom",
		}
	})

	prefPath := joinBasePath(cfg.BasePath, preferencesModuleID)
	reqCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "user-1",
		Subject: "user-1",
	})
	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(reqCtx)
	mockCtx.On("Path").Return(prefPath)
	mockCtx.On("Render", preferencesFormTemplate, mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if toString(viewCtx["title"]) != "Custom" {
			return false
		}
		navItems, ok := viewCtx["nav_items"].([]map[string]any)
		if !ok || len(navItems) == 0 {
			return false
		}
		sessionUser, ok := viewCtx["session_user"].(map[string]any)
		if !ok {
			return false
		}
		if strings.TrimSpace(toString(sessionUser["display_name"])) == "" {
			return false
		}
		return true
	})).Return(nil)

	if err := mod.renderPreferencesForm(adm, mockCtx, prefPath); err != nil {
		t.Fatalf("render preferences form: %v", err)
	}
	mockCtx.AssertExpectations(t)
}
