package admin

import (
	"strings"
	"sync"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

func TestRuntimeRoutingAdaptersExposeCapabilityProviderHooks(t *testing.T) {
	urls := newURLKitRoutingAdapter(nil)
	if _, ok := any(urls).(routing.URLKitCapabilityProvider); !ok {
		t.Fatal("expected urlkit adapter to satisfy URLKitCapabilityProvider")
	}
	if caps := urls.RoutingURLKitCapabilities(); !caps.NativeStrictMutations || !caps.NativeManifest {
		t.Fatalf("expected native urlkit capabilities, got %+v", caps)
	}

	server := router.NewHTTPServer()
	routerAdapter := newAdminRouterRoutingAdapter(server.Router())
	if routerAdapter == nil {
		t.Fatal("expected runtime router adapter for http server")
	}
	if _, ok := any(routerAdapter).(routing.RouterCapabilityProvider); !ok {
		t.Fatal("expected router adapter to satisfy RouterCapabilityProvider")
	}
	if caps := routerAdapter.RoutingRouterCapabilities(); !caps.NativeRouteNamePolicy || !caps.NativeOwnershipChecks || !caps.NativeManifest {
		t.Fatalf("expected native router capabilities, got %+v", caps)
	}
}

func TestRoutingReportSupportsConcurrentRefreshAndRead(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	server.Init()

	var wg sync.WaitGroup
	for range 16 {
		wg.Add(2)
		go func() {
			defer wg.Done()
			_ = adm.RefreshRoutingReport()
		}()
		go func() {
			defer wg.Done()
			_ = adm.RoutingReport()
		}()
	}
	wg.Wait()
}

func TestRoutingReportRefreshUsesNativeAdapterCapabilities(t *testing.T) {
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
	for _, warning := range report.Warnings {
		if strings.Contains(warning, "adapter does not advertise native") {
			t.Fatalf("unexpected adapter fallback warning %q in %+v", warning, report.Warnings)
		}
	}
}
