package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
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

func TestRegisterLineageDiagnosticsRoutesExposeCandidateListAndReviewAction(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	reconciliation := services.NewDefaultSourceReconciliationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithAdminRouteMiddleware(withClaimsUserPermissions("ops-reviewer", DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithSourceReadModelService(readModels),
		WithSourceReconciliationService(reconciliation),
		WithDefaultScope(scope),
	)

	listReq := httptest.NewRequest(http.MethodGet, services.DefaultLineageDiagnosticsBasePath+"/documents/doc-lineage-1/candidates?user_id=ops-user", nil)
	listResp, err := app.Test(listReq, -1)
	if err != nil {
		t.Fatalf("candidate list request failed: %v", err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("expected candidate list 200, got %d", listResp.StatusCode)
	}
	listPayload := decodeBodyMap(t, listResp.Body)
	if got := strings.TrimSpace(toString(listPayload["source_document_id"])); got != "src-doc-lineage-1" {
		t.Fatalf("expected candidate list source_document_id=src-doc-lineage-1, got %+v", listPayload)
	}
	relationships, ok := listPayload["relationships"].([]any)
	if !ok || len(relationships) != 1 {
		t.Fatalf("expected one relationship in candidate list, got %+v", listPayload)
	}

	reviewReq := httptest.NewRequest(
		http.MethodPost,
		services.DefaultLineageDiagnosticsBasePath+"/relationships/src-rel-lineage-1/review",
		bytes.NewBufferString(`{"action":"reject","reason":"false positive"}`),
	)
	reviewReq.Header.Set("Content-Type", "application/json")
	reviewResp, err := app.Test(reviewReq, -1)
	if err != nil {
		t.Fatalf("review request failed: %v", err)
	}
	defer reviewResp.Body.Close()
	if reviewResp.StatusCode != http.StatusOK {
		t.Fatalf("expected review action 200, got %d", reviewResp.StatusCode)
	}
	reviewPayload := decodeBodyMap(t, reviewResp.Body)
	candidate, ok := reviewPayload["candidate"].(map[string]any)
	if !ok || strings.TrimSpace(toString(candidate["status"])) != stores.SourceRelationshipStatusRejected {
		t.Fatalf("expected rejected candidate payload, got %+v", reviewPayload)
	}

	documentDetail, err := readModels.GetDocumentLineageDetail(listReq.Context(), scope, "doc-lineage-1")
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail after reject: %v", err)
	}
	if len(documentDetail.CandidateWarningSummary) != 0 {
		t.Fatalf("expected rejected review action to suppress document candidate warnings, got %+v", documentDetail.CandidateWarningSummary)
	}
}

func TestRegisterLineageDiagnosticsReviewActionRequiresAuthenticatedAdminActor(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	reconciliation := services.NewDefaultSourceReconciliationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithSourceReadModelService(readModels),
		WithSourceReconciliationService(reconciliation),
		WithDefaultScope(scope),
	)

	reviewReq := httptest.NewRequest(
		http.MethodPost,
		services.DefaultLineageDiagnosticsBasePath+"/relationships/src-rel-lineage-1/review",
		bytes.NewBufferString(`{"action":"reject","reason":"false positive"}`),
	)
	reviewReq.Header.Set("Content-Type", "application/json")
	reviewResp, err := app.Test(reviewReq, -1)
	if err != nil {
		t.Fatalf("review request failed: %v", err)
	}
	defer reviewResp.Body.Close()
	if reviewResp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected review action without authenticated actor to be forbidden, got %d", reviewResp.StatusCode)
	}

	relationship, err := store.GetSourceRelationship(reviewReq.Context(), scope, "src-rel-lineage-1")
	if err != nil {
		t.Fatalf("GetSourceRelationship after forbidden review: %v", err)
	}
	if relationship.Status != stores.SourceRelationshipStatusPendingReview {
		t.Fatalf("expected relationship status to remain pending_review, got %+v", relationship)
	}
}
