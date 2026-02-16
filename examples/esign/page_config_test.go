package main

import (
	"encoding/json"
	"testing"
	"testing/fstest"

	router "github.com/goliatone/go-router"
)

func TestWithESignPageConfigAddsContractPayload(t *testing.T) {
	ctx := withESignPageConfig(nil, eSignPageConfig{
		Page:        eSignPageAdminLanding,
		BasePath:    "/admin",
		APIBasePath: "/admin/api/v1",
	})
	if got := rawToString(ctx["esign_page"]); got != eSignPageAdminLanding {
		t.Fatalf("expected esign_page %q, got %q", eSignPageAdminLanding, got)
	}
	rawJSON := rawToString(ctx["esign_page_config_json"])
	if rawJSON == "" {
		t.Fatal("expected esign_page_config_json to be set")
	}
	payload := eSignPageConfig{}
	if err := json.Unmarshal([]byte(rawJSON), &payload); err != nil {
		t.Fatalf("unmarshal page config json: %v", err)
	}
	if payload.ContractVersion != eSignPageConfigContractVersion {
		t.Fatalf("expected contract version %q, got %q", eSignPageConfigContractVersion, payload.ContractVersion)
	}
	if payload.Page != eSignPageAdminLanding {
		t.Fatalf("expected page %q, got %q", eSignPageAdminLanding, payload.Page)
	}
}

func TestBuildESignDocumentIngestionPageConfigIncludesFeatureFlagsAndRoutes(t *testing.T) {
	cfg := buildESignDocumentIngestionPageConfig(
		"/admin",
		"/admin/api/v1",
		"user-1",
		true,
		false,
		map[string]string{
			"index": "/admin/content/esign_documents",
		},
	)
	if cfg.Page != eSignPageDocumentIngestion {
		t.Fatalf("expected page %q, got %q", eSignPageDocumentIngestion, cfg.Page)
	}
	if !cfg.Features["google_enabled"] {
		t.Fatalf("expected google_enabled=true in page config: %+v", cfg.Features)
	}
	if cfg.Features["google_connected"] {
		t.Fatalf("expected google_connected=false in page config: %+v", cfg.Features)
	}
	if got := cfg.Routes["index"]; got != "/admin/content/esign_documents" {
		t.Fatalf("expected routes.index to be preserved, got %q", got)
	}
	if got := rawToString(cfg.Context["user_id"]); got != "user-1" {
		t.Fatalf("expected context.user_id=user-1, got %q", got)
	}
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/document-ingestion.js" {
		t.Fatalf("expected document-ingestion module path, got %q", got)
	}
}

func TestViewContextRoutesExtractsMapAny(t *testing.T) {
	ctx := router.ViewContext{
		"routes": map[string]any{
			"index": "/admin/content/esign_documents",
		},
	}
	routes := viewContextRoutes(ctx)
	if got := routes["index"]; got != "/admin/content/esign_documents" {
		t.Fatalf("expected map conversion for routes.index, got %q", got)
	}
}

func TestValidateESignRuntimeAssetContractsWithFSPasses(t *testing.T) {
	assetsFS := fstest.MapFS{
		"dist/esign/admin-landing.js":      {Data: []byte("export function bootstrapLandingPage() {}")},
		"dist/esign/document-ingestion.js": {Data: []byte("export function bootstrapDocumentIngestionPage() {}")},
	}
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAdminLanding:      "dist/esign/admin-landing.js",
		eSignPageDocumentIngestion: "dist/esign/document-ingestion.js",
	})
	if err != nil {
		t.Fatalf("expected asset contract validation to pass, got %v", err)
	}
}

func TestValidateESignRuntimeAssetContractsWithFSRejectsInvalidModulePrefix(t *testing.T) {
	assetsFS := fstest.MapFS{
		"dist/esign/admin-landing.js": {Data: []byte("export function bootstrapLandingPage() {}")},
	}
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAdminLanding: "dist/other/admin-landing.js",
	})
	if err == nil {
		t.Fatal("expected invalid module prefix failure")
	}
}
