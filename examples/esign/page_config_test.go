package main

import (
	"encoding/json"
	"os"
	"path/filepath"
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
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/document-form.js" {
		t.Fatalf("expected module path /admin/assets/dist/esign/document-form.js, got %q", got)
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
	if !ok || len(ops) != 3 || ops[0] != "send" || ops[1] != "start_review" || ops[2] != "dispose" {
		t.Fatalf("expected sync.action_operations=[send start_review dispose], got %+v", syncCfg["action_operations"])
	}
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/agreement-form.js" {
		t.Fatalf("expected module path /admin/assets/dist/esign/agreement-form.js, got %q", got)
	}
}

func TestEnrichESignAgreementFormPageConfigAddsResourceContext(t *testing.T) {
	cfg := buildESignAgreementFormPageConfig(
		"/admin",
		"/admin/api/v1",
		map[string]string{
			"index":                "/admin/content/esign_agreements",
			"create":               "/admin/content/esign_agreements/new",
			"documents_upload_url": "/admin/content/esign_documents/new",
		},
		"afs_actor_scope_token",
	)
	enriched := enrichESignAgreementFormPageConfig(cfg, router.ViewContext{
		"is_edit":        true,
		"create_success": false,
		"resource_item": map[string]any{
			"id":                         "agreement-123",
			"active_agreement_id":        "agreement-123",
			"workflow_kind":              "standard",
			"root_agreement_id":          "agreement-123",
			"participants":               []any{map[string]any{"email": "reviewer@example.com"}},
			"field_instances":            []any{map[string]any{"type": "signature"}},
			"related_agreements":         []any{map[string]any{"id": "agreement-122"}},
			"parent_agreement_id":        "",
			"superseded_by_agreement_id": "",
		},
	})

	if got := rawToString(enriched.Context["submit_mode"]); got != "form" {
		t.Fatalf("expected submit_mode=form, got %q", got)
	}
	initialParticipants, ok := enriched.Context["initial_participants"].([]any)
	if !ok || len(initialParticipants) != 1 {
		t.Fatalf("expected initial_participants in context, got %#v", enriched.Context["initial_participants"])
	}
	initialFieldInstances, ok := enriched.Context["initial_field_instances"].([]any)
	if !ok || len(initialFieldInstances) != 1 {
		t.Fatalf("expected initial_field_instances in context, got %#v", enriched.Context["initial_field_instances"])
	}
	if got := rawToString(enriched.Context["agreement_id"]); got != "agreement-123" {
		t.Fatalf("expected agreement_id in context, got %q", got)
	}
}

func TestBuildESignGoogleIntegrationPageConfigIncludesOAuthContext(t *testing.T) {
	cfg := buildESignGoogleIntegrationPageConfig(
		eSignPageGoogleIntegration,
		"/admin",
		"/admin/api/v1",
		"user-1",
		"account-1",
		"http://localhost:8082/admin/esign/integrations/google/callback",
		"google-client-id",
		true,
		map[string]string{
			"esign_settings": "/admin/esign",
		},
	)
	if cfg.Page != eSignPageGoogleIntegration {
		t.Fatalf("expected page %q, got %q", eSignPageGoogleIntegration, cfg.Page)
	}
	if got := rawToString(cfg.Context["google_account_id"]); got != "account-1" {
		t.Fatalf("expected google_account_id account-1, got %q", got)
	}
	if got := rawToString(cfg.Context["google_redirect_uri"]); got == "" {
		t.Fatal("expected google_redirect_uri in page config context")
	}
	if got := rawToString(cfg.Context["google_client_id"]); got != "google-client-id" {
		t.Fatalf("expected google_client_id google-client-id, got %q", got)
	}
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/google-integration.js" {
		t.Fatalf("expected module path /admin/assets/dist/esign/google-integration.js, got %q", got)
	}
}

func TestBuildESignSourceManagementPageConfigIncludesRuntimeRoutesAndContext(t *testing.T) {
	cfg := buildESignSourceManagementPageConfig(
		eSignPageSourceDetail,
		"/admin",
		"/admin/api/v1/esign",
		map[string]string{
			"source_browser": "/admin/esign/sources",
			"source_search":  "/admin/esign/source-search",
		},
		map[string]any{
			"surface":            "source_detail",
			"source_document_id": "src-123",
		},
	)
	if cfg.Page != eSignPageSourceDetail {
		t.Fatalf("expected page %q, got %q", eSignPageSourceDetail, cfg.Page)
	}
	if got := cfg.Routes["source_browser"]; got != "/admin/esign/sources" {
		t.Fatalf("expected source_browser route, got %q", got)
	}
	if !cfg.Features["source_management_enabled"] {
		t.Fatalf("expected source_management_enabled feature flag, got %+v", cfg.Features)
	}
	if got := rawToString(cfg.Context["surface"]); got != "source_detail" {
		t.Fatalf("expected surface context source_detail, got %q", got)
	}
	if got := rawToString(cfg.Context["source_document_id"]); got != "src-123" {
		t.Fatalf("expected source_document_id context src-123, got %q", got)
	}
	if got := cfg.ModulePath; got != "/admin/assets/dist/esign/source-management-runtime.js" {
		t.Fatalf("expected source-management module path /admin/assets/dist/esign/source-management-runtime.js, got %q", got)
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
		"dist/esign/admin-landing.js":  {Data: []byte("export function bootstrapLandingPage() {}")},
		"dist/esign/document-form.js":  {Data: []byte("export function bootstrapDocumentForm() {}")},
		"dist/esign/agreement-form.js": {Data: []byte("export function bootstrapAgreementForm() {}")},
	}
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAdminLanding:      "dist/esign/admin-landing.js",
		eSignPageDocumentIngestion: "dist/esign/document-form.js",
		eSignPageAgreementForm:     "dist/esign/agreement-form.js",
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
		eSignPageAdminLanding: "dist/other/index.js",
	})
	if err == nil {
		t.Fatal("expected invalid module prefix failure")
	}
}

func TestResolveESignRuntimeAssetsFSWithDiskPrefersDiskAssets(t *testing.T) {
	tmpDir := t.TempDir()
	assetPath := filepath.Join(tmpDir, "dist", "esign", "agreement-form.js")
	if err := os.MkdirAll(filepath.Dir(assetPath), 0o755); err != nil {
		t.Fatalf("mkdir asset dir: %v", err)
	}
	if err := os.WriteFile(assetPath, []byte("export const source = 'disk';"), 0o644); err != nil {
		t.Fatalf("write disk asset: %v", err)
	}

	assetsFS := resolveESignRuntimeAssetsFSWithDisk(fstest.MapFS{}, tmpDir)
	err := validateESignRuntimeAssetContractsWithFS(assetsFS, map[string]string{
		eSignPageAgreementForm: "dist/esign/agreement-form.js",
	})
	if err != nil {
		t.Fatalf("expected disk-backed asset contract validation to pass, got %v", err)
	}
}
