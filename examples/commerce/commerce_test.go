package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-command/registry"
	"github.com/goliatone/go-router"
)

func TestCommerceExampleHappyPath(t *testing.T) {
	registry.WithTestRegistry(func() {
		dataStores, err := stores.Seed(context.Background())
		if err != nil {
			t.Fatalf("seed stores: %v", err)
		}
		cfg := admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
			AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
		}
		featureDefaults := map[string]bool{
			"dashboard": true,
			"search":    true,
			"cms":       true,
			"commands":  true,
			"jobs":      true,
		}
		adm, err := admin.New(cfg, admin.Dependencies{FeatureGate: featureGateFromDefaults(featureDefaults)})
		if err != nil {
			t.Fatalf("admin.New: %v", err)
		}
		defer adm.Commands().Reset()
		tokens := setupAuth(adm, dataStores)
		adm.WithAuth(nil, cfg.AuthConfig)
		adm.WithAuthorizer(allowAllAuthz{})
		mod := &commerceModule{
			stores:        dataStores,
			basePath:      cfg.BasePath,
			menuCode:      cfg.NavMenuCode,
			defaultLocale: cfg.DefaultLocale,
			placements: quickstart.DefaultPlacements(admin.Config{
				NavMenuCode: cfg.NavMenuCode,
			}),
		}
		if registerErr := adm.RegisterModule(mod); registerErr != nil {
			t.Fatalf("register module: %v", registerErr)
		}

		server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
			return fiber.New()
		})
		r := server.Router()
		if initErr := adm.Initialize(r); initErr != nil {
			t.Fatalf("initialize admin: %v", initErr)
		}
		app := server.WrappedRouter()

		token := tokens["Ada Lovelace"]
		if token == "" {
			t.Fatalf("expected demo token for Ada Lovelace")
		}
		authHeader := "Bearer " + token

		// Panel CRUD (products)
		createReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/admin/api/panels/products", strings.NewReader(`{"name":"New Bag","sku":"NB-10","price":99,"inventory":3,"status":"active"}`))
		createReq.Header.Set("Content-Type", "application/json")
		createReq.Header.Set("Authorization", authHeader)
		createResp, err := app.Test(createReq, -1)
		if err != nil {
			t.Fatalf("create product request failed: %v", err)
		}
		defer closeResponseBody(t, createResp)
		createBody, _ := io.ReadAll(createResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		if createResp.StatusCode != http.StatusOK {
			t.Fatalf("create product status: %d body=%s", createResp.StatusCode, string(createBody))
		}
		var created map[string]any
		_ = json.Unmarshal(createBody, &created) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		productID := mustAs[string](created["id"])
		productsAfterCreate, _, _ := dataStores.Products.List(context.Background(), admin.ListOptions{}) //nolint:errcheck // legacy test setup intentionally ignores this helper result after scenario assertions.
		if len(productsAfterCreate) < 4 {
			t.Fatalf("expected new product to be persisted, got %d", len(productsAfterCreate))
		}
		if productID == "" {
			productID = fmt.Sprintf("%v", productsAfterCreate[len(productsAfterCreate)-1]["id"])
		}

		detailReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/panels/products/"+productID, nil)
		detailReq.Header.Set("Authorization", authHeader)
		detailResp, err := app.Test(detailReq, -1)
		if err != nil {
			t.Fatalf("detail product request failed: %v", err)
		}
		defer closeResponseBody(t, detailResp)
		detailBody, _ := io.ReadAll(detailResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		if detailResp.StatusCode != http.StatusOK {
			t.Fatalf("detail product status: %d body=%s", detailResp.StatusCode, string(detailBody))
		}
		var detailPayload map[string]any
		_ = json.Unmarshal(detailBody, &detailPayload) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		if _, ok := detailPayload["data"].(map[string]any); !ok {
			t.Fatalf("expected detail payload to include data, got %v", detailPayload)
		}

		listReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/panels/products", nil)
		listReq.Header.Set("Authorization", authHeader)
		listResp, err := app.Test(listReq, -1)
		if err != nil {
			t.Fatalf("list products request failed: %v", err)
		}
		defer closeResponseBody(t, listResp)
		if listResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(listResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
			t.Fatalf("list products status: %d body=%s", listResp.StatusCode, string(body))
		}

		// Dashboard render
		dashReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/dashboard", nil)
		dashReq.Header.Set("Authorization", authHeader)
		dashResp, err := app.Test(dashReq, -1)
		if err != nil {
			t.Fatalf("dashboard request failed: %v", err)
		}
		defer closeResponseBody(t, dashResp)
		if dashResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(dashResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
			t.Fatalf("dashboard status: %d body=%s", dashResp.StatusCode, string(body))
		}
		var dashBody map[string]any
		_ = json.NewDecoder(dashResp.Body).Decode(&dashBody) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		widgets, ok := dashBody["widgets"].([]any)
		if !ok || len(widgets) == 0 {
			t.Fatalf("expected dashboard widgets, got %v", dashBody)
		}

		// Search
		searchReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/search?query=hoodie", nil)
		searchReq.Header.Set("Authorization", authHeader)
		searchResp, err := app.Test(searchReq, -1)
		if err != nil {
			t.Fatalf("search request failed: %v", err)
		}
		defer closeResponseBody(t, searchResp)
		if searchResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(searchResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
			t.Fatalf("search status: %d body=%s", searchResp.StatusCode, string(body))
		}
		var searchBody map[string]any
		_ = json.NewDecoder(searchResp.Body).Decode(&searchBody) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		results, ok := searchBody["results"].([]any)
		if !ok || len(results) == 0 {
			t.Fatalf("expected search results, got %v", searchBody)
		}

		// Jobs (cron hooks)
		jobsReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/jobs", nil)
		jobsReq.Header.Set("Authorization", authHeader)
		jobsResp, err := app.Test(jobsReq, -1)
		if err != nil {
			t.Fatalf("jobs request failed: %v", err)
		}
		defer closeResponseBody(t, jobsResp)
		if jobsResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(jobsResp.Body) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
			t.Fatalf("jobs status: %d body=%s", jobsResp.StatusCode, string(body))
		}
		var jobsBody map[string]any
		_ = json.NewDecoder(jobsResp.Body).Decode(&jobsBody) //nolint:errcheck // legacy test fixture decoding is validated by subsequent assertions.
		jobs, ok := jobsBody["jobs"].([]any)
		if !ok || len(jobs) == 0 {
			t.Fatalf("expected jobs payload, got %v", jobsBody)
		}
		foundReport := false
		for _, j := range jobs {
			if jobMap, ok := j.(map[string]any); ok {
				if jobMap["name"] == "commerce.daily_report" {
					foundReport = true
				}
			}
		}
		if !foundReport {
			t.Fatalf("expected commerce.daily_report job in payload")
		}

		// CLI options
		opts, err := registry.GetCLIOptions()
		if err != nil {
			t.Fatalf("get cli options: %v", err)
		}
		if len(opts) == 0 {
			t.Fatalf("expected cli options")
		}
	})
}

func closeResponseBody(t testing.TB, resp *http.Response) {
	t.Helper()
	if resp == nil || resp.Body == nil {
		return
	}
	if err := resp.Body.Close(); err != nil {
		t.Fatalf("close response body: %v", err)
	}
}

type allowAllAuthz struct{}

func (allowAllAuthz) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}
