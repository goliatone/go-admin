package admin

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

func TestRuntimeRoutingAdaptersExposeCapabilityProviderHooks(t *testing.T) {
	urls := newURLKitRoutingAdapter(nil)
	if _, ok := any(urls).(routing.URLKitCapabilityProvider); !ok {
		t.Fatal("expected urlkit adapter to satisfy URLKitCapabilityProvider")
	}
	if caps := urls.RoutingURLKitCapabilities(); caps != (routing.URLKitCapabilities{}) {
		t.Fatalf("expected zero-value urlkit capabilities by default, got %+v", caps)
	}

	server := router.NewHTTPServer()
	routerAdapter := newAdminRouterRoutingAdapter(server.Router())
	if routerAdapter == nil {
		t.Fatal("expected runtime router adapter for http server")
	}
	if _, ok := any(routerAdapter).(routing.RouterCapabilityProvider); !ok {
		t.Fatal("expected router adapter to satisfy RouterCapabilityProvider")
	}
	if caps := routerAdapter.RoutingRouterCapabilities(); caps != (routing.RouterCapabilities{}) {
		t.Fatalf("expected zero-value router capabilities by default, got %+v", caps)
	}
}

func TestRoutingReportRefreshIncludesRuntimeAdapterWarnings(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	report := adm.RoutingReport()
	warnings := strings.Join(report.Warnings, "\n")
	for _, want := range []string{
		"urlkit adapter does not advertise native strict mutation support",
		"router adapter does not advertise native route-name policy support",
		"router adapter does not advertise native ownership validation",
		"router adapter does not advertise native manifest support",
	} {
		if !strings.Contains(warnings, want) {
			t.Fatalf("expected routing report warnings to include %q, got %+v", want, report.Warnings)
		}
	}
}
