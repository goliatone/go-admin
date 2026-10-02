package admin

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"

	"github.com/goliatone/go-admin/console"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestConsoleDashboardUsesSeparateProvidersAndRecordPolicy(t *testing.T) {
	var revoked, execute atomic.Bool
	a, b := consoleTestHost(t, "alpha", &revoked, &execute), consoleTestHost(t, "beta", &revoked, &execute)
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"dashboard": true})})
	for _, host := range []*ConsoleHost{a, b} {
		cfg := ConsoleDashboardConfig{Identity: func(AdminContext) (console.Identity, error) { return consoleTestIdentity(host.config.ID), nil }}
		if err := host.RegisterDashboard(adm, cfg); err != nil {
			t.Fatal(err)
		}
		if err := host.RegisterDashboard(adm, cfg); err == nil {
			t.Fatal("dashboard callback replaced by duplicate")
		}
	}
	if a.DashboardArea() == b.DashboardArea() {
		t.Fatal("area crossed consoles")
	}
	for _, provider := range adm.Dashboard().Providers() {
		if provider.Code != "console.alpha.operations" && provider.Code != "console.beta.operations" {
			continue
		}
		payload, err := provider.Handler(AdminContext{Context: context.Background(), UserID: "alice"}, nil)
		if err != nil {
			t.Fatal(err)
		}
		panel, ok := payload.Value().(ConsolePanelWidgetPayload)
		if !ok {
			t.Fatalf("unexpected widget payload: %T", payload.Value())
		}
		if len(panel.Panel.Records) != 1 || len(panel.Panel.UI.Actions) != 0 {
			t.Fatalf("dashboard reused action eligibility or leaked hidden rows: %+v", panel)
		}
		revoked.Store(true)
		if _, err := provider.Handler(AdminContext{Context: context.Background()}, nil); !errors.Is(err, ErrForbidden) {
			t.Fatal("dashboard retained revoked policy")
		}
		revoked.Store(false)
	}
}

func TestDebugDashboardBroadcastIsAnAuthorizedAreaInvalidation(t *testing.T) {
	event := dashcmp.WidgetEvent{AreaCode: debugWidgetAreaCode, Instance: dashcmp.WidgetInstance{ID: "private", DefinitionID: "private", Configuration: map[string]any{"password": "secret"}, Metadata: map[string]any{"foreign_records": "secret"}}, Reason: "update"}
	projected, ok := projectDebugDashboardEvent(event)
	if !ok || projected.Instance.ID != "" || len(projected.Instance.Configuration) != 0 || len(projected.Instance.Metadata) != 0 {
		t.Fatal("broadcast forwarded viewer-specific payload", projected)
	}
	event.AreaCode = "console.data"
	if _, ok := projectDebugDashboardEvent(event); ok {
		t.Fatal("Data event reached Debug dashboard")
	}
}
