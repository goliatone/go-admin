package main

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
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
	adm := admin.New(cfg)
	setupAuth(adm)
	mod := &commerceModule{
		stores:        dataStores,
		basePath:      cfg.BasePath,
		menuCode:      cfg.NavMenuCode,
		defaultLocale: cfg.DefaultLocale,
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	// Panel CRUD (products)
	createReq := httptest.NewRequest("POST", "/admin/api/products", strings.NewReader(`{"name":"New Bag","sku":"NB-10","price":99,"inventory":3,"status":"active"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-User-ID", "tester")
	createRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRec, createReq)
	if createRec.Code != 200 {
		t.Fatalf("create product status: %d body=%s", createRec.Code, createRec.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)
	productID, _ := created["id"].(string)
	if productID == "" {
		t.Fatalf("expected product id in response")
	}

	listReq := httptest.NewRequest("GET", "/admin/api/products", nil)
	listReq.Header.Set("X-User-ID", "tester")
	listRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRec, listReq)
	if listRec.Code != 200 {
		t.Fatalf("list products status: %d", listRec.Code)
	}

	// Dashboard render
	dashReq := httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	dashReq.Header.Set("X-User-ID", "tester")
	dashRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(dashRec, dashReq)
	if dashRec.Code != 200 {
		t.Fatalf("dashboard status: %d body=%s", dashRec.Code, dashRec.Body.String())
	}
	var dashBody map[string]any
	_ = json.Unmarshal(dashRec.Body.Bytes(), &dashBody)
	widgets, ok := dashBody["widgets"].([]any)
	if !ok || len(widgets) == 0 {
		t.Fatalf("expected dashboard widgets, got %v", dashBody)
	}

	// Search
	searchReq := httptest.NewRequest("GET", "/admin/api/search?query=hoodie", nil)
	searchReq.Header.Set("X-User-ID", "tester")
	searchRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(searchRec, searchReq)
	if searchRec.Code != 200 {
		t.Fatalf("search status: %d body=%s", searchRec.Code, searchRec.Body.String())
	}
	var searchBody map[string]any
	_ = json.Unmarshal(searchRec.Body.Bytes(), &searchBody)
	results, ok := searchBody["results"].([]any)
	if !ok || len(results) == 0 {
		t.Fatalf("expected search results, got %v", searchBody)
	}

	// Jobs (cron hooks)
	jobsReq := httptest.NewRequest("GET", "/admin/api/jobs", nil)
	jobsReq.Header.Set("X-User-ID", "tester")
	jobsRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(jobsRec, jobsReq)
	if jobsRec.Code != 200 {
		t.Fatalf("jobs status: %d body=%s", jobsRec.Code, jobsRec.Body.String())
	}
	var jobsBody map[string]any
	_ = json.Unmarshal(jobsRec.Body.Bytes(), &jobsBody)
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
