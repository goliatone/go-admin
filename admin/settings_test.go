package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	opts "github.com/goliatone/go-options"
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

func TestSettingsServiceDisabledReturnsFeatureFlag(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{Key: "admin.title", Default: "Admin", Type: "string"})
	svc.Enable(false)

	err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSite, Values: map[string]any{"admin.title": "New"}})
	if !errors.Is(err, ErrFeatureDisabled) {
		t.Fatalf("expected feature disabled error, got %v", err)
	}
	if values := svc.ResolveAll(""); len(values) != 0 {
		t.Fatalf("expected no values when settings disabled, got %+v", values)
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
	if validation.Scope != SettingsScopeSite {
		t.Fatalf("expected scope to round-trip, got %s", validation.Scope)
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
	if form.SchemaFormat != opts.SchemaFormatOpenAPI {
		t.Fatalf("expected openapi schema format, got %s", form.SchemaFormat)
	}
	if len(form.Scopes) == 0 {
		t.Fatalf("expected scopes from go-options schema")
	}
	props := form.Schema["properties"].(map[string]any)
	if _, ok := props["admin.title"]; !ok {
		t.Fatalf("expected schema property for admin.title")
	}
}

func TestSettingsFormAdapterCarriesScopesAndWidgets(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{
		Key:           "site.description",
		Type:          "textarea",
		AllowedScopes: []SettingsScope{SettingsScopeSite},
	})
	adapter := NewSettingsFormAdapter(svc, "admin", map[string]string{})

	form := adapter.Form("")
	props := form.Schema["properties"].(map[string]any)
	field, ok := props["site.description"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema property for site.description")
	}
	xAdmin, ok := field["x-admin"].(map[string]any)
	if !ok {
		t.Fatalf("expected x-admin metadata on settings field")
	}
	scopes, ok := xAdmin["allowed_scopes"].([]string)
	if !ok || len(scopes) != 1 || scopes[0] != string(SettingsScopeSite) {
		t.Fatalf("expected allowed scopes to include site, got %+v", scopes)
	}
	if widget, ok := field["x-formgen:widget"].(string); !ok || widget != "textarea" {
		t.Fatalf("expected textarea widget hint, got %v", field["x-formgen:widget"])
	}
}

func TestSettingsFormAdapterOptionsAndVisibility(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{
		Key:            "site.locale",
		Type:           "string",
		VisibilityRule: "feature.enabled == true",
		OptionsProvider: func(ctx context.Context) ([]SettingOption, error) {
			return []SettingOption{
				{Label: "English", Value: "en"},
				{Label: "Spanish", Value: "es"},
			}, nil
		},
		Enrichers: []SettingFieldEnricher{
			func(ctx context.Context, field map[string]any) {
				field["placeholder"] = "select a locale"
			},
		},
	})
	adapter := NewSettingsFormAdapter(svc, "admin", map[string]string{})

	form := adapter.Form("")
	props := form.Schema["properties"].(map[string]any)
	field, ok := props["site.locale"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema property for site.locale")
	}
	optsRaw, ok := field["x-formgen:options"].([]SettingOption)
	if !ok || len(optsRaw) != 2 {
		t.Fatalf("expected options from provider, got %v", field["x-formgen:options"])
	}
	xAdmin, ok := field["x-admin"].(map[string]any)
	if !ok || xAdmin["visibility_rule"] != "feature.enabled == true" {
		t.Fatalf("expected visibility rule preserved, got %+v", xAdmin)
	}
	if placeholder := field["placeholder"]; placeholder != "select a locale" {
		t.Fatalf("expected enricher to run, got %v", placeholder)
	}
}

func TestSettingsValidationWithOptionsAndValidator(t *testing.T) {
	svc := NewSettingsService()
	svc.RegisterDefinition(SettingDefinition{
		Key:  "features.mode",
		Type: "string",
		Options: []SettingOption{
			{Value: "simple"},
			{Value: "advanced"},
		},
		Validator: func(ctx context.Context, value any) error {
			if v, ok := value.(string); ok && v == "advanced" {
				return errors.New("advanced mode unavailable")
			}
			return nil
		},
	})

	err := svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSite, Values: map[string]any{"features.mode": "unknown"}})
	var validation SettingsValidationErrors
	if err == nil || !errors.As(err, &validation) {
		t.Fatalf("expected validation error for unknown option, got %v", err)
	}
	if validation.Fields["features.mode"] == "" {
		t.Fatalf("expected option validation message")
	}

	err = svc.Apply(context.Background(), SettingsBundle{Scope: SettingsScopeSite, Values: map[string]any{"features.mode": "advanced"}})
	if err == nil || !errors.As(err, &validation) {
		t.Fatalf("expected validator failure, got %v", err)
	}
	if validation.Fields["features.mode"] != "advanced mode unavailable" {
		t.Fatalf("expected validator message propagated, got %v", validation.Fields["features.mode"])
	}
}

func TestSettingsRoutesUseCommandAndReturnValidation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Settings: true,
		},
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
	var firstResp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &firstResp)
	meta, _ := firstResp["error"].(map[string]any)["metadata"].(map[string]any)
	if meta["scope"] != string(SettingsScopeSite) {
		t.Fatalf("expected validation metadata to include scope, got %v", meta["scope"])
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
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Settings:  true,
			Dashboard: true,
		},
		Title: "test admin",
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

func TestSettingsNavigationRespectsPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Settings: true,
		},
	}
	denyAdmin := New(cfg)
	denyAdmin.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()
	if err := denyAdmin.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if items := denyAdmin.nav.Resolve(context.Background(), "en"); len(items) != 0 {
		t.Fatalf("expected navigation to be filtered by permission, got %d items", len(items))
	}

	allowAdmin := New(cfg)
	allowAdmin.WithAuthorizer(stubAuthorizer{allow: true})
	server = router.NewHTTPServer()
	if err := allowAdmin.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	items := allowAdmin.nav.Resolve(context.Background(), "en")
	if len(items) == 0 {
		t.Fatalf("expected settings menu item to be present")
	}
	found := false
	for _, item := range items {
		if key, ok := item.Target["key"].(string); ok && key == "settings" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected navigation to include settings target")
	}
}
