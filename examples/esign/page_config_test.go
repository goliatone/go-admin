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
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/index.js" {
		t.Fatalf("expected module path /admin/assets/dist/esign/index.js, got %q", got)
	}
}

func TestBuildESignAgreementFormPageConfigIncludesModuleAndSyncContext(t *testing.T) {
	cfg := buildESignAgreementFormPageConfig(
		"/admin",
		"/admin/api/v1",
		map[string]string{
			"index": "/admin/content/esign_agreements",
		},
		"afs_actor_scope_token",
	)
	if cfg.Page != eSignPageAgreementForm {
		t.Fatalf("expected page %q, got %q", eSignPageAgreementForm, cfg.Page)
	}
	if got := cfg.Routes["index"]; got != "/admin/content/esign_agreements" {
		t.Fatalf("expected routes.index to be preserved, got %q", got)
	}
	syncCfg, ok := cfg.Context["sync"].(map[string]any)
	if !ok || syncCfg == nil {
		t.Fatalf("expected agreement form sync context, got %+v", cfg.Context["sync"])
	}
	if got := rawToString(syncCfg["base_url"]); got != "/admin/api/v1/esign" {
		t.Fatalf("expected sync.base_url /admin/api/v1/esign, got %q", got)
	}
	if got := rawToString(syncCfg["bootstrap_path"]); got != "/admin/api/v1/esign/sync/bootstrap/agreement-draft" {
		t.Fatalf("expected sync.bootstrap_path contract, got %q", got)
	}
	if got := rawToString(syncCfg["client_base_path"]); got != "/admin/sync-client/sync-core" {
		t.Fatalf("expected sync.client_base_path contract, got %q", got)
	}
	if got := rawToString(syncCfg["resource_kind"]); got != "agreement_draft" {
		t.Fatalf("expected sync.resource_kind agreement_draft, got %q", got)
	}
	if got := rawToString(syncCfg["storage_scope"]); got != "afs_actor_scope_token" {
		t.Fatalf("expected sync.storage_scope afs_actor_scope_token, got %q", got)
	}
	if _, exists := cfg.Context["user_id"]; exists {
		t.Fatalf("expected agreement form context to omit user_id, got %+v", cfg.Context["user_id"])
	}
	ops, ok := syncCfg["action_operations"].([]string)
	if !ok || len(ops) != 2 || ops[0] != "send" || ops[1] != "dispose" {
		t.Fatalf("expected sync.action_operations=[send dispose], got %+v", syncCfg["action_operations"])
	}
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/index.js" {
		t.Fatalf("expected module path /admin/assets/dist/esign/index.js, got %q", got)
	}
}

func TestBuildESignAgreementFormStorageScopeIsOpaqueAndStable(t *testing.T) {
	first := buildESignAgreementFormStorageScope("actor-1", "tenant-1", "org-1", "/admin/content/esign_agreements/new")
	second := buildESignAgreementFormStorageScope("actor-1", "tenant-1", "org-1", "/admin/content/esign_agreements/new")
	third := buildESignAgreementFormStorageScope("actor-2", "tenant-1", "org-1", "/admin/content/esign_agreements/new")

	if first == "" {
		t.Fatal("expected non-empty storage scope")
	}
	if first != second {
		t.Fatalf("expected stable storage scope, got %q and %q", first, second)
	}
	if first == third {
		t.Fatalf("expected storage scope to vary by actor, got %q", first)
	}
	if first == "actor-1" || first == "tenant-1" || first == "org-1" {
		t.Fatalf("expected opaque storage scope, got %q", first)
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
		"dist/esign/index.js": {Data: []byte("export function bootstrapLandingPage() {}")},
	}
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAdminLanding:      "dist/esign/index.js",
		eSignPageDocumentIngestion: "dist/esign/index.js",
		eSignPageAgreementForm:     "dist/esign/index.js",
	})
	if err != nil {
		t.Fatalf("expected asset contract validation to pass, got %v", err)
	}
}

func TestValidateESignRuntimeAssetContractsWithFSRejectsInvalidModulePrefix(t *testing.T) {
	assetsFS := fstest.MapFS{
		"dist/esign/index.js": {Data: []byte("export function bootstrapLandingPage() {}")},
	}
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAdminLanding: "dist/other/index.js",
	})
	if err == nil {
		t.Fatal("expected invalid module prefix failure")
	}
}
