package core_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/admin-shell/internal/config"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	apphttp "github.com/goliatone/go-admin/examples/admin-shell/internal/http"
	auth "github.com/goliatone/go-auth"
	fggate "github.com/goliatone/go-featuregate/gate"
)

func TestStarterBuildsAndServesCompleteRouteGraph(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithRouteRegistrar(apphttp.Register),
	)
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if err := appCore.Shutdown(context.Background()); err != nil {
			t.Errorf("shutdown starter: %v", err)
		}
	})

	app := appCore.Server.WrappedRouter()
	cases := []struct {
		path       string
		wantStatus int
		wantBody   string
	}{
		{path: "/", wantStatus: http.StatusOK, wantBody: "Demo auth"},
		{path: "/healthz", wantStatus: http.StatusOK, wantBody: `"ok":true`},
		{path: "/readyz", wantStatus: http.StatusOK, wantBody: `"ready":true`},
		{path: "/admin/login", wantStatus: http.StatusOK, wantBody: "admin.pwd"},
		{path: "/admin/api/dashboard", wantStatus: http.StatusUnauthorized, wantBody: "unauthorized"},
		{path: "/admin/assets/output.css", wantStatus: http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			response, err := app.Test(httptest.NewRequest(http.MethodGet, tc.path, nil), -1)
			if err != nil {
				t.Fatalf("request %s: %v", tc.path, err)
			}
			defer response.Body.Close()
			body, err := io.ReadAll(response.Body)
			if err != nil {
				t.Fatalf("read %s: %v", tc.path, err)
			}
			if response.StatusCode != tc.wantStatus {
				t.Fatalf("%s status=%d body=%s", tc.path, response.StatusCode, body)
			}
			if tc.wantBody != "" && !strings.Contains(string(body), tc.wantBody) {
				t.Fatalf("%s body does not contain %q", tc.path, tc.wantBody)
			}
		})
	}
}

func TestStarterUsesCompleteQuickstartFeatureCatalog(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false

	appCore, err := core.New(context.Background(), &cfg, core.WithRouteRegistrar(apphttp.Register))
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if err := appCore.Shutdown(context.Background()); err != nil {
			t.Errorf("shutdown starter: %v", err)
		}
	})
	if _, ok := appCore.FeatureGate.(fggate.MutableFeatureGate); !ok {
		t.Fatalf("quickstart feature gate does not retain runtime override support")
	}

	statuses := appCore.Features()
	if len(statuses) != 21 {
		t.Fatalf("expected all 21 quickstart feature keys, got %d: %+v", len(statuses), statuses)
	}
	features := make(map[string]bool, len(statuses))
	for _, status := range statuses {
		features[status.Name] = status.Enabled
	}
	for _, key := range []string{"dashboard", "cms", "search"} {
		if !features[key] {
			t.Fatalf("expected %s enabled by minimal profile plus overrides", key)
		}
	}
	if features["activity"] {
		t.Fatalf("expected activity disabled by the minimal profile")
	}
}

func TestProductionCompositionRequiresProviderAndNeverExposesDemoSecrets(t *testing.T) {
	cfg := config.Defaults()
	cfg.Env = "production"
	cfg.Server.PrintRoutes = false
	cfg.Auth.DemoEnabled = false
	cfg.Auth.ShowDemoCredentials = false
	cfg.Auth.SigningKey = strings.Repeat("p", 32)

	if _, err := core.New(context.Background(), &cfg, core.WithRouteRegistrar(apphttp.Register)); err == nil ||
		!strings.Contains(err.Error(), "identity provider is required") {
		t.Fatalf("expected missing production identity provider error, got %v", err)
	}

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithIdentityProvider(unconfiguredIdentityProvider{}),
		core.WithRouteRegistrar(apphttp.Register),
	)
	if err != nil {
		t.Fatalf("build production starter: %v", err)
	}
	t.Cleanup(func() {
		if err := appCore.Shutdown(context.Background()); err != nil {
			t.Errorf("shutdown starter: %v", err)
		}
	})
	app := appCore.Server.WrappedRouter()
	for _, requestPath := range []string{"/", "/admin/login"} {
		response, err := app.Test(httptest.NewRequest(http.MethodGet, requestPath, nil), -1)
		if err != nil {
			t.Fatalf("request production path %s: %v", requestPath, err)
		}
		body, readErr := io.ReadAll(response.Body)
		response.Body.Close()
		if readErr != nil {
			t.Fatalf("read production path %s: %v", requestPath, readErr)
		}
		for _, secret := range []string{"Demo auth", "admin.pwd", "superadmin.pwd", "bearer token"} {
			if strings.Contains(string(body), secret) {
				t.Fatalf("production path %s exposed %q", requestPath, secret)
			}
		}
	}
}

type unconfiguredIdentityProvider struct{}

func (unconfiguredIdentityProvider) VerifyIdentity(context.Context, string, string) (auth.Identity, error) {
	return nil, auth.ErrIdentityNotFound
}

func (unconfiguredIdentityProvider) FindIdentityByIdentifier(context.Context, string) (auth.Identity, error) {
	return nil, auth.ErrIdentityNotFound
}
