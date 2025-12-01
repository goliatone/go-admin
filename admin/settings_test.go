package admin

import (
	"context"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestSettingsResolutionWithProvenance(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{Key: "site.name", Default: "Default", Type: "string"})
	svc.RegisterDefinition(SettingDefinition{Key: "feature.enabled", Default: false, Type: "boolean"})

	if err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSystem, Values: map[string]any{"site.name": "System"}}); err != nil {
		t.Fatalf("apply system: %v", err)
	}
	if err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSite, Values: map[string]any{"site.name": "Site"}}); err != nil {
		t.Fatalf("apply site: %v", err)
	}
	if err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeUser, UserID: "user-1", Values: map[string]any{"site.name": "User"}}); err != nil {
		t.Fatalf("apply user: %v", err)
	}

	res := svc.Resolve("site.name", "user-1")
	if res.Value != "User" || res.Provenance != string(SettingsScopeUser) {
		t.Fatalf("unexpected resolution: %+v", res)
	}
	boolRes := svc.Resolve("feature.enabled", "")
	if boolRes.Provenance != string(SettingsScopeDefault) || boolRes.Value != false {
		t.Fatalf("expected default provenance for boolean, got %+v", boolRes)
	}
}

func TestSettingsValidationErrorsSurfaced(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{Key: "feature.enabled", Default: false, Type: "boolean"})

	err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSite, Values: map[string]any{"feature.enabled": "yes"}})
	var validation SettingsValidationErrors
	if err == nil || !errors.As(err, &validation) {
		t.Fatalf("expected validation errors, got %v", err)
	}
	if validation.Fields["feature.enabled"] == "" {
		t.Fatalf("expected field error populated")
	}
}

func TestSettingsFormAdapterIncludesTheme(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{Key: "admin.title", Default: "Admin", Type: "string"})
	adapter := NewSettingsFormAdapter(svc, "admin", map[string]string{"primary": "#000"})

	form := adapter.Form("")
	if form.Theme["selection"]["name"] != "admin" {
		t.Fatalf("expected theme name carried through")
	}
	props := form.Schema["properties"].(map[string]any)
	if _, ok := props["admin.title"]; !ok {
		t.Fatalf("expected schema property for admin.title")
	}
}

func TestSettingsRoutesUseCommandAndReturnValidation(t *testing.T) {
	cfg := Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableSettings:  true,
		EnableDashboard: false,
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("POST", "/admin/api/settings", strings.NewReader(`{"values":{"admin.dashboard_enabled":"yes"},"scope":"site"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 for validation, got %d", rr.Code)
	}

	req = httptest.NewRequest("POST", "/admin/api/settings", strings.NewReader(`{"values":{"admin.title":"New Title"},"scope":"site"}`))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	resolved := adm.SettingsService().Resolve("admin.title", "")
	if resolved.Value != "New Title" || resolved.Provenance != string(SettingsScopeSite) {
		t.Fatalf("unexpected resolved value: %+v", resolved)
	}
}

func TestSettingsWidgetResolvesValues(t *testing.T) {
	cfg := Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableSettings:  true,
		EnableDashboard: true,
		Title:           "test admin",
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	widgets, err := adm.DashboardService().Resolve(AdminContext{Context: context.Background()})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	if len(widgets) == 0 {
		t.Fatalf("expected settings widget instance")
	}
	found := false
	for _, w := range widgets {
		if w["definition"] == "admin.widget.settings_overview" {
			data, _ := w["data"].(map[string]any)
			values, _ := data["values"].(map[string]any)
			titleVal, ok := values["admin.title"].(map[string]any)
			if !ok {
				t.Fatalf("expected admin.title in widget payload")
			}
			if titleVal["provenance"] != string(SettingsScopeSystem) {
				t.Fatalf("expected system provenance in widget, got %v", titleVal["provenance"])
			}
			found = true
		}
	}
	if !found {
		t.Fatalf("settings widget not found in dashboard output")
	}
}
