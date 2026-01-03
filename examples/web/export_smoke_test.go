package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-router"
)

func TestExampleExportSmokeFilters(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:export_smoke_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	userDeps, _, _, err := setup.SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	contentSvc := admin.NewInMemoryContentService()
	dataStores, err := stores.Initialize(contentSvc, "en", userDeps)
	if err != nil {
		t.Fatalf("init stores: %v", err)
	}

	bundle := quickstart.NewExportBundle(
		quickstart.WithExportHistoryPath("exports-history"),
	)
	if err := registerExampleExports(bundle, dataStores, nil); err != nil {
		t.Fatalf("register exports: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := bundle.Registrar.RegisterExportRoutes(r, coreadmin.ExportRouteOptions{BasePath: "/admin"}); err != nil {
		t.Fatalf("register export routes: %v", err)
	}

	filteredPayload := map[string]any{
		"definition": "users",
		"format":     "json",
		"delivery":   "sync",
		"columns":    []string{"username", "status"},
		"query": map[string]any{
			"filters": []map[string]any{
				{"field": "status", "op": "eq", "value": "suspended"},
			},
		},
	}

	jsonBody, _ := json.Marshal(filteredPayload)
	req := httptest.NewRequest(http.MethodPost, "/admin/exports", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("json export status %d: %s", rec.Code, rec.Body.String())
	}

	var rows []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &rows); err != nil {
		t.Fatalf("decode json export: %v", err)
	}
	if len(rows) == 0 {
		t.Fatalf("expected filtered json export rows")
	}

	foundSuspended := false
	for _, row := range rows {
		status := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["status"])))
		if status != "suspended" {
			t.Fatalf("expected suspended status, got %q", status)
		}
		if fmt.Sprint(row["username"]) == "inactive.user" {
			foundSuspended = true
		}
	}
	if !foundSuspended {
		t.Fatalf("expected suspended user in export results")
	}

	filteredPayload["format"] = "csv"
	csvBody, _ := json.Marshal(filteredPayload)
	req = httptest.NewRequest(http.MethodPost, "/admin/exports", bytes.NewReader(csvBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("csv export status %d: %s", rec.Code, rec.Body.String())
	}

	reader := csv.NewReader(bytes.NewReader(rec.Body.Bytes()))
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("parse csv export: %v", err)
	}
	if len(records) < 2 {
		t.Fatalf("expected csv header and data rows, got %d rows", len(records))
	}

	header := records[0]
	usernameIdx := indexOfColumn(header, "Username")
	statusIdx := indexOfColumn(header, "Status")
	if usernameIdx < 0 || statusIdx < 0 {
		t.Fatalf("expected username/status headers, got %v", header)
	}

	foundCSV := false
	for _, record := range records[1:] {
		if statusIdx >= len(record) || usernameIdx >= len(record) {
			t.Fatalf("unexpected csv record: %v", record)
		}
		status := strings.ToLower(strings.TrimSpace(record[statusIdx]))
		if status != "suspended" {
			t.Fatalf("expected suspended status in csv, got %q", status)
		}
		if strings.TrimSpace(record[usernameIdx]) == "inactive.user" {
			foundCSV = true
		}
	}
	if !foundCSV {
		t.Fatalf("expected suspended user in csv export results")
	}
}

func indexOfColumn(columns []string, target string) int {
	for i, column := range columns {
		if strings.EqualFold(strings.TrimSpace(column), target) {
			return i
		}
	}
	return -1
}
