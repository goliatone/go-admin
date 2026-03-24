package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestDashboardBootDefaultsDoNotOverrideExistingProviders(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeatureSettings),
	})

	adm.Dashboard().RegisterProvider(DashboardProviderSpec{
		Code:        WidgetUserStats,
		Name:        "Custom User Stats",
		DefaultArea: "admin.dashboard.main",
		DefaultConfig: map[string]any{
			"title": "Launches",
		},
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(UserStatsWidgetPayload{
				Title:  "Launches",
				Metric: "triage.launches",
				Value:  42,
			}), nil
		},
	})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	providers := adm.Dashboard().Providers()
	found := false
	for _, provider := range providers {
		if provider.Code != WidgetUserStats {
			continue
		}
		found = true
		if provider.Name != "Custom User Stats" {
			t.Fatalf("expected custom provider to remain registered, got %q", provider.Name)
		}
	}
	if !found {
		t.Fatalf("expected user stats provider to remain registered")
	}

	widgets, err := adm.Dashboard().Resolve(AdminContext{
		Context: context.Background(),
		Locale:  "en",
	})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	if len(widgets) == 0 {
		t.Fatalf("expected dashboard widgets to resolve")
	}

	for _, widget := range widgets {
		if widget["definition"] != WidgetUserStats {
			continue
		}
		data, ok := widget["data"].(map[string]any)
		if !ok {
			t.Fatalf("expected user stats widget data map, got %T", widget["data"])
		}
		if data["title"] != "Launches" {
			t.Fatalf("expected custom widget payload title, got %#v", data["title"])
		}
		return
	}

	t.Fatalf("expected resolved layout to include %s", WidgetUserStats)
}
