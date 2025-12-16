package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-router"
)

func TestCommerceExampleHappyPath(t *testing.T) {
	dataStores, err := stores.Seed(context.Background())
	if err != nil {
		t.Fatalf("seed stores: %v", err)
	}
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: admin.Features{
			Dashboard: true,
			Search:    true,
			CMS:       true,
			Commands:  true,
			Jobs:      true,
		},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	tokens := setupAuth(adm, dataStores)
	adm.WithAuth(nil, nil)
	adm.WithAuthorizer(allowAllAuthz{})
	mod := &commerceModule{
		stores:        dataStores,
		basePath:      cfg.BasePath,
		menuCode:      cfg.NavMenuCode,
		defaultLocale: cfg.DefaultLocale,
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New()
	})
	app := server.WrappedRouter()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	token := tokens["Ada Lovelace"]
	if token == "" {
		t.Fatalf("expected demo token for Ada Lovelace")
	}
	authHeader := "Bearer " + token

	// Panel CRUD (products)
	createReq := httptest.NewRequest("POST", "/admin/api/products", strings.NewReader(`{"name":"New Bag","sku":"NB-10","price":99,"inventory":3,"status":"active"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", authHeader)
	createResp, err := app.Test(createReq, -1)
	if err != nil {
		t.Fatalf("create product request failed: %v", err)
	}
	defer createResp.Body.Close()
	createBody, _ := io.ReadAll(createResp.Body)
	if createResp.StatusCode != 200 {
		t.Fatalf("create product status: %d body=%s", createResp.StatusCode, string(createBody))
	}
	var created map[string]any
	_ = json.Unmarshal(createBody, &created)
	productID, _ := created["id"].(string)
	productsAfterCreate, _, _ := dataStores.Products.List(context.Background(), admin.ListOptions{})
	if len(productsAfterCreate) < 4 {
		t.Fatalf("expected new product to be persisted, got %d", len(productsAfterCreate))
	}
	if productID == "" {
		productID = fmt.Sprintf("%v", productsAfterCreate[len(productsAfterCreate)-1]["id"])
	}

	listReq := httptest.NewRequest("GET", "/admin/api/products", nil)
	listReq.Header.Set("Authorization", authHeader)
	listResp, err := app.Test(listReq, -1)
	if err != nil {
		t.Fatalf("list products request failed: %v", err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != 200 {
		body, _ := io.ReadAll(listResp.Body)
		t.Fatalf("list products status: %d body=%s", listResp.StatusCode, string(body))
	}

	// Dashboard render
	dashReq := httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	dashReq.Header.Set("Authorization", authHeader)
	dashResp, err := app.Test(dashReq, -1)
	if err != nil {
		t.Fatalf("dashboard request failed: %v", err)
	}
	defer dashResp.Body.Close()
	if dashResp.StatusCode != 200 {
		body, _ := io.ReadAll(dashResp.Body)
		t.Fatalf("dashboard status: %d body=%s", dashResp.StatusCode, string(body))
	}
	var dashBody map[string]any
	_ = json.NewDecoder(dashResp.Body).Decode(&dashBody)
	widgets, ok := dashBody["widgets"].([]any)
	if !ok || len(widgets) == 0 {
		t.Fatalf("expected dashboard widgets, got %v", dashBody)
	}

	// Search
	searchReq := httptest.NewRequest("GET", "/admin/api/search?query=hoodie", nil)
	searchReq.Header.Set("Authorization", authHeader)
	searchResp, err := app.Test(searchReq, -1)
	if err != nil {
		t.Fatalf("search request failed: %v", err)
	}
	defer searchResp.Body.Close()
	if searchResp.StatusCode != 200 {
		body, _ := io.ReadAll(searchResp.Body)
		t.Fatalf("search status: %d body=%s", searchResp.StatusCode, string(body))
	}
	var searchBody map[string]any
	_ = json.NewDecoder(searchResp.Body).Decode(&searchBody)
	results, ok := searchBody["results"].([]any)
	if !ok || len(results) == 0 {
		t.Fatalf("expected search results, got %v", searchBody)
	}

	// Jobs (cron hooks)
	jobsReq := httptest.NewRequest("GET", "/admin/api/jobs", nil)
	jobsReq.Header.Set("Authorization", authHeader)
	jobsResp, err := app.Test(jobsReq, -1)
	if err != nil {
		t.Fatalf("jobs request failed: %v", err)
	}
	defer jobsResp.Body.Close()
	if jobsResp.StatusCode != 200 {
		body, _ := io.ReadAll(jobsResp.Body)
		t.Fatalf("jobs status: %d body=%s", jobsResp.StatusCode, string(body))
	}
	var jobsBody map[string]any
	_ = json.NewDecoder(jobsResp.Body).Decode(&jobsBody)
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
	cli := adm.Commands().CLI()
	foundRestock := false
	for _, opt := range cli {
		if strings.Join(opt.Path, " ") == "admin commerce restock-low" {
			foundRestock = true
		}
	}
	if !foundRestock {
		t.Fatalf("expected CLI entry for restock-low command")
	}
}

type allowAllAuthz struct{}

func (allowAllAuthz) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}
