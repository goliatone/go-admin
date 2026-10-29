package main

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-command/registry"
)

func TestCommerceServerPreservesAuthenticationErrorStatus(t *testing.T) {
	registry.WithTestRegistry(func() {
		dataStores, err := stores.Seed(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}
		adm, err := admin.New(cfg, admin.Dependencies{FeatureGate: featureGateFromDefaults(map[string]bool{"dashboard": true})})
		if err != nil {
			t.Fatal(err)
		}
		defer adm.Commands().Reset()
		tokens := setupAuth(adm, dataStores)
		server := newCommerceServer(cfg)
		if initErr := adm.Initialize(server.Router()); initErr != nil {
			t.Fatal(initErr)
		}
		response, err := server.WrappedRouter().Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/admin/api/dashboard", nil))
		if err != nil {
			t.Fatal(err)
		}
		defer closeResponseBody(t, response)
		body, err := io.ReadAll(response.Body)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != http.StatusBadRequest {
			t.Fatalf("missing token status=%d body=%s", response.StatusCode, body)
		}
		if !strings.Contains(response.Header.Get("Content-Type"), "application/json") || !strings.Contains(string(body), "TOKEN_MALFORMED") {
			t.Fatalf("lost structured auth error: %s", body)
		}
		request := func() (int, []byte) {
			t.Helper()
			req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/admin/api/dashboard", nil)
			req.Header.Set("Authorization", "Bearer "+tokens["Ada Lovelace"])
			resp, requestErr := server.WrappedRouter().Test(req)
			if requestErr != nil {
				t.Fatal(requestErr)
			}
			defer closeResponseBody(t, resp)
			responseBody, requestErr := io.ReadAll(resp.Body)
			if requestErr != nil {
				t.Fatal(requestErr)
			}
			return resp.StatusCode, responseBody
		}
		status, body := request()
		if status != http.StatusOK || len(body) == 0 {
			t.Fatalf("valid account did not reach dashboard: %d %s", status, body)
		}
		provider := &commerceIdentityProvider{users: dataStores.Users}
		identity, err := provider.FindIdentityByIdentifier(context.Background(), "Ada Lovelace")
		if err != nil {
			t.Fatal(err)
		}
		if err := dataStores.Users.Delete(context.Background(), identity.ID()); err != nil {
			t.Fatal(err)
		}
		status, body = request()
		if status < 400 || status >= 500 {
			t.Fatalf("deleted account was not denied: %d %s", status, body)
		}

	})
}
