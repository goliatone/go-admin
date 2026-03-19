package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
)

func TestRegisterLineageDiagnosticsRoutesExposeDocumentAndAgreementDiagnostics(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	diagnostics := services.NewDefaultLineageDiagnosticsService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(readModels),
		WithLineageDiagnosticsService(diagnostics),
		WithDefaultScope(scope),
	)

	documentReq := httptest.NewRequest(http.MethodGet, services.DefaultLineageDiagnosticsBasePath+"/documents/doc-lineage-1?user_id=ops-user", nil)
	documentResp, err := app.Test(documentReq, -1)
	if err != nil {
		t.Fatalf("document diagnostics request failed: %v", err)
	}
	defer documentResp.Body.Close()
	if documentResp.StatusCode != http.StatusOK {
		t.Fatalf("expected document diagnostics 200, got %d", documentResp.StatusCode)
	}
	documentPayload := decodeBodyMap(t, documentResp.Body)
	if got := strings.TrimSpace(toString(documentPayload["resource_kind"])); got != "document" {
		t.Fatalf("expected document diagnostics resource_kind=document, got %+v", documentPayload)
	}
	sourceDocument, ok := documentPayload["source_document"].(map[string]any)
	if !ok || strings.TrimSpace(toString(sourceDocument["id"])) != "src-doc-lineage-1" {
		t.Fatalf("expected document diagnostics source_document, got %+v", documentPayload)
	}

	agreementReq := httptest.NewRequest(http.MethodGet, services.DefaultLineageDiagnosticsBasePath+"/agreements/agr-lineage-1?user_id=ops-user", nil)
	agreementResp, err := app.Test(agreementReq, -1)
	if err != nil {
		t.Fatalf("agreement diagnostics request failed: %v", err)
	}
	defer agreementResp.Body.Close()
	if agreementResp.StatusCode != http.StatusOK {
		t.Fatalf("expected agreement diagnostics 200, got %d", agreementResp.StatusCode)
	}
	agreementPayload := decodeBodyMap(t, agreementResp.Body)
	if got := strings.TrimSpace(toString(agreementPayload["resource_kind"])); got != "agreement" {
		t.Fatalf("expected agreement diagnostics resource_kind=agreement, got %+v", agreementPayload)
	}
	sourceRevision, ok := agreementPayload["source_revision"].(map[string]any)
	if !ok || strings.TrimSpace(toString(sourceRevision["id"])) != "src-rev-lineage-1" {
		t.Fatalf("expected agreement diagnostics source_revision, got %+v", agreementPayload)
	}
}
