package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func TestRegisterReconciliationQueueRoutesExposeQueueDetailAndReviewAction(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
		services.WithSourceReadModelClock(func() time.Time {
			return time.Date(2026, time.March, 22, 12, 0, 0, 0, time.UTC)
		}),
	)
	reconciliation := services.NewDefaultSourceReconciliationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithAdminRouteMiddleware(withClaimsUserPermissions("ops-reviewer", DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithSourceReadModelService(readModels),
		WithSourceReconciliationService(reconciliation),
		WithDefaultScope(scope),
	)

	queueReq := httptest.NewRequest(http.MethodGet, services.DefaultSourceManagementBasePath+"/reconciliation-queue?user_id=ops-user&confidence_band=medium", nil)
	queueResp, err := app.Test(queueReq, -1)
	if err != nil {
		t.Fatalf("queue request failed: %v", err)
	}
	defer queueResp.Body.Close()
	if queueResp.StatusCode != http.StatusOK {
		t.Fatalf("expected queue status 200, got %d", queueResp.StatusCode)
	}
	queuePayload := decodeBodyMap(t, queueResp.Body)
	items, ok := queuePayload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one queue item, got %+v", queuePayload)
	}

	detailReq := httptest.NewRequest(http.MethodGet, services.DefaultSourceManagementBasePath+"/reconciliation-queue/src-rel-lineage-1?user_id=ops-user", nil)
	detailResp, err := app.Test(detailReq, -1)
	if err != nil {
		t.Fatalf("detail request failed: %v", err)
	}
	defer detailResp.Body.Close()
	if detailResp.StatusCode != http.StatusOK {
		t.Fatalf("expected queue detail 200, got %d", detailResp.StatusCode)
	}
	detailPayload := decodeBodyMap(t, detailResp.Body)
	candidate, ok := detailPayload["candidate"].(map[string]any)
	if !ok || strings.TrimSpace(toString(candidate["id"])) != "src-rel-lineage-1" {
		t.Fatalf("expected queue detail candidate, got %+v", detailPayload)
	}

	reviewReq := httptest.NewRequest(
		http.MethodPost,
		services.DefaultSourceManagementBasePath+"/reconciliation-queue/src-rel-lineage-1/review",
		bytes.NewBufferString(`{"action":"attach_handle_to_existing_source","reason":"validated queue-driven continuity"}`),
	)
	reviewReq.Header.Set("Content-Type", "application/json")
	reviewResp, err := app.Test(reviewReq, -1)
	if err != nil {
		t.Fatalf("queue review request failed: %v", err)
	}
	defer reviewResp.Body.Close()
	if reviewResp.StatusCode != http.StatusOK {
		t.Fatalf("expected queue review 200, got %d", reviewResp.StatusCode)
	}
	reviewPayload := decodeBodyMap(t, reviewResp.Body)
	refreshed, ok := reviewPayload["candidate"].(map[string]any)
	if !ok {
		t.Fatalf("expected refreshed queue candidate payload, got %+v", reviewPayload)
	}
	refreshedCandidate, ok := refreshed["candidate"].(map[string]any)
	if !ok || strings.TrimSpace(toString(refreshedCandidate["status"])) != stores.SourceRelationshipStatusConfirmed {
		t.Fatalf("expected confirmed queue candidate detail, got %+v", reviewPayload)
	}
}

func TestRegisterReconciliationQueueReviewReturnsConflictForResolvedCandidate(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(store, store, store, services.WithSourceReadModelImportRuns(store))
	reconciliation := services.NewDefaultSourceReconciliationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithAdminRouteMiddleware(withClaimsUserPermissions("ops-reviewer", DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithSourceReadModelService(readModels),
		WithSourceReconciliationService(reconciliation),
		WithDefaultScope(scope),
	)

	for _, body := range []string{
		`{"action":"reject","reason":"first review"}`,
		`{"action":"reject","reason":"duplicate review"}`,
	} {
		req := httptest.NewRequest(http.MethodPost, services.DefaultSourceManagementBasePath+"/reconciliation-queue/src-rel-lineage-1/review", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("queue conflict request failed: %v", err)
		}
		if strings.Contains(body, "duplicate review") {
			if resp.StatusCode != http.StatusConflict {
				resp.Body.Close()
				t.Fatalf("expected duplicate queue review to conflict, got %d", resp.StatusCode)
			}
		} else if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			t.Fatalf("expected initial queue review to succeed, got %d", resp.StatusCode)
		}
		resp.Body.Close()
	}
}

func TestRegisterSourceManagementRoutesExposeReadModelContracts(t *testing.T) {
	stub := stubSourceReadModelService{
		listSourcesResult: services.SourceListPage{
			Items: []services.SourceListItem{{
				Source:            &services.LineageReference{ID: "stub-source", Label: "Stub Source", URL: services.DefaultSourceManagementBasePath + "/sources/stub-source"},
				Status:            stores.SourceDocumentStatusActive,
				LineageConfidence: stores.LineageConfidenceBandExact,
				LatestRevision:    &services.SourceRevisionSummary{ID: "stub-revision-list"},
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceDetailResult: services.SourceDetail{
			Source:         &services.LineageReference{ID: "stub-source-detail", Label: "Stub Detail", URL: services.DefaultSourceManagementBasePath + "/sources/stub-source-detail"},
			Status:         stores.SourceDocumentStatusActive,
			LatestRevision: &services.SourceRevisionSummary{ID: "stub-detail-revision"},
			Permissions:    services.SourceManagementPermissions{},
			EmptyState:     services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
		},
		sourceRevisionPageResult: services.SourceRevisionPage{
			Items: []services.SourceRevisionListItem{{
				Revision: &services.SourceRevisionSummary{ID: "stub-revision-page"},
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceRelationshipPageResult: services.SourceRelationshipPage{
			Items: []services.SourceRelationshipSummary{{
				ID:                "stub-relationship",
				CounterpartSource: &services.LineageReference{ID: "stub-counterpart"},
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceHandlePageResult: services.SourceHandlePage{
			Items: []services.SourceHandleSummary{{
				ID:             "stub-handle",
				ExternalFileID: "stub-external-file",
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceRevisionDetailResult: services.SourceRevisionDetail{
			Revision:    &services.SourceRevisionSummary{ID: "stub-revision-detail"},
			Permissions: services.SourceManagementPermissions{},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
		},
		sourceArtifactPageResult: services.SourceArtifactPage{
			Items: []services.SourceArtifactSummary{{
				ID: "stub-artifact",
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceCommentPageResult: services.SourceCommentPage{
			SyncStatus:  "stub-sync-status",
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 0, TotalCount: 0},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNoComments},
			Permissions: services.SourceManagementPermissions{},
		},
		sourceSearchResult: services.SourceSearchResults{
			Items: []services.SourceSearchResultSummary{{
				ResultKind: services.SourceManagementSearchResultSourceRevision,
				Source:     &services.LineageReference{ID: "stub-search-source"},
				Revision:   &services.SourceRevisionSummary{ID: "stub-search-revision"},
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		reconciliationQueuePageResult: services.ReconciliationQueuePage{
			Items: []services.ReconciliationQueueItem{{
				Candidate: &services.SourceRelationshipSummary{ID: "stub-queue-relationship"},
			}},
			PageInfo:    services.SourceManagementPageInfo{Mode: services.SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
			Permissions: services.SourceManagementPermissions{},
		},
		reconciliationCandidateResult: services.ReconciliationCandidateDetail{
			Candidate:   &services.SourceRelationshipSummary{ID: "stub-queue-candidate"},
			Permissions: services.SourceManagementPermissions{},
			EmptyState:  services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
		},
	}
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(stub),
	)

	for _, tc := range []struct {
		name  string
		path  string
		check func(map[string]any)
	}{
		{
			name: "sources",
			path: services.DefaultSourceManagementBasePath + "/sources?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != 1 {
					t.Fatalf("expected stub source list items, got %+v", payload)
				}
				first, _ := items[0].(map[string]any)
				source, _ := first["source"].(map[string]any)
				if got := strings.TrimSpace(toString(source["id"])); got != "stub-source" {
					t.Fatalf("expected stub source id, got %+v", payload)
				}
			},
		},
		{
			name: "source detail",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				source, _ := payload["source"].(map[string]any)
				if got := strings.TrimSpace(toString(source["id"])); got != "stub-source-detail" {
					t.Fatalf("expected stub source detail, got %+v", payload)
				}
			},
		},
		{
			name: "source revisions",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/revisions?user_id=ops-user",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				revision, _ := first["revision"].(map[string]any)
				if got := strings.TrimSpace(toString(revision["id"])); got != "stub-revision-page" {
					t.Fatalf("expected stub revision page payload, got %+v", payload)
				}
			},
		},
		{
			name: "source relationships",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/relationships?user_id=ops-user",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				if got := strings.TrimSpace(toString(first["id"])); got != "stub-relationship" {
					t.Fatalf("expected stub relationship payload, got %+v", payload)
				}
			},
		},
		{
			name: "source handles",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/handles?user_id=ops-user",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				if got := strings.TrimSpace(toString(first["id"])); got != "stub-handle" {
					t.Fatalf("expected stub handle payload, got %+v", payload)
				}
			},
		},
		{
			name: "source comments",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/comments?user_id=ops-user",
			check: func(payload map[string]any) {
				if got := strings.TrimSpace(toString(payload["sync_status"])); got != "stub-sync-status" {
					t.Fatalf("expected stub source comment payload, got %+v", payload)
				}
			},
		},
		{
			name: "revision detail",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				revision, _ := payload["revision"].(map[string]any)
				if got := strings.TrimSpace(toString(revision["id"])); got != "stub-revision-detail" {
					t.Fatalf("expected stub revision detail payload, got %+v", payload)
				}
			},
		},
		{
			name: "revision artifacts",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1/artifacts?user_id=ops-user",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				if got := strings.TrimSpace(toString(first["id"])); got != "stub-artifact" {
					t.Fatalf("expected stub artifact payload, got %+v", payload)
				}
			},
		},
		{
			name: "revision comments",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1/comments?user_id=ops-user",
			check: func(payload map[string]any) {
				if got := strings.TrimSpace(toString(payload["sync_status"])); got != "stub-sync-status" {
					t.Fatalf("expected stub comment payload, got %+v", payload)
				}
			},
		},
		{
			name: "source search",
			path: services.DefaultSourceManagementBasePath + "/source-search?user_id=ops-user&q=google-lineage-file-1",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				revision, _ := first["revision"].(map[string]any)
				if got := strings.TrimSpace(toString(revision["id"])); got != "stub-search-revision" {
					t.Fatalf("expected stub source search payload, got %+v", payload)
				}
			},
		},
		{
			name: "reconciliation queue",
			path: services.DefaultSourceManagementBasePath + "/reconciliation-queue?user_id=ops-user",
			check: func(payload map[string]any) {
				items, _ := payload["items"].([]any)
				first, _ := items[0].(map[string]any)
				candidate, _ := first["candidate"].(map[string]any)
				if got := strings.TrimSpace(toString(candidate["id"])); got != "stub-queue-relationship" {
					t.Fatalf("expected stub reconciliation queue payload, got %+v", payload)
				}
			},
		},
		{
			name: "reconciliation candidate",
			path: services.DefaultSourceManagementBasePath + "/reconciliation-queue/src-rel-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				candidate, _ := payload["candidate"].(map[string]any)
				if got := strings.TrimSpace(toString(candidate["id"])); got != "stub-queue-candidate" {
					t.Fatalf("expected stub reconciliation candidate payload, got %+v", payload)
				}
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("%s request failed: %v", tc.name, err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("expected %s status 200, got %d", tc.name, resp.StatusCode)
			}
			tc.check(decodeBodyMap(t, resp.Body))
		})
	}
}

func TestRegisterSourceManagementRoutesApplyRequestScopedPermissions(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	viewOnlyApp := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(readModels),
		WithDefaultScope(scope),
	)
	viewEditApp := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView, DefaultPermissions.AdminEdit)),
		WithSourceReadModelService(readModels),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, services.DefaultSourceManagementBasePath+"/sources/src-doc-lineage-1?user_id=ops-user", nil)
	resp, err := viewOnlyApp.Test(req, -1)
	if err != nil {
		t.Fatalf("view-only source detail request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected view-only source detail status 200, got %d", resp.StatusCode)
	}
	payload := decodeBodyMap(t, resp.Body)
	permissions, ok := payload["permissions"].(map[string]any)
	if !ok {
		t.Fatalf("expected permissions payload, got %+v", payload)
	}
	if !toBool(permissions["can_view_diagnostics"]) || !toBool(permissions["can_open_provider_links"]) {
		t.Fatalf("expected view-only request to retain view capabilities, got %+v", permissions)
	}
	if toBool(permissions["can_review_candidates"]) || !toBool(permissions["can_view_comments"]) {
		t.Fatalf("expected view-only request to deny candidate review and allow comment visibility, got %+v", permissions)
	}

	relationshipsReq := httptest.NewRequest(http.MethodGet, services.DefaultSourceManagementBasePath+"/sources/src-doc-lineage-1/relationships?user_id=ops-user", nil)
	relationshipsResp, err := viewOnlyApp.Test(relationshipsReq, -1)
	if err != nil {
		t.Fatalf("view-only source relationships request failed: %v", err)
	}
	defer relationshipsResp.Body.Close()
	if relationshipsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected view-only source relationships status 200, got %d", relationshipsResp.StatusCode)
	}
	relationshipsPayload := decodeBodyMap(t, relationshipsResp.Body)
	relationshipItems, ok := relationshipsPayload["items"].([]any)
	if !ok || len(relationshipItems) != 1 {
		t.Fatalf("expected one relationship item, got %+v", relationshipsPayload)
	}
	firstRelationship, _ := relationshipItems[0].(map[string]any)
	if got := strings.TrimSpace(toString(firstRelationship["review_action_visible"])); got != "" {
		t.Fatalf("expected view-only request to redact review action visibility, got %+v", firstRelationship)
	}

	editRelationshipsResp, err := viewEditApp.Test(relationshipsReq, -1)
	if err != nil {
		t.Fatalf("view+edit source relationships request failed: %v", err)
	}
	defer editRelationshipsResp.Body.Close()
	if editRelationshipsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected view+edit source relationships status 200, got %d", editRelationshipsResp.StatusCode)
	}
	editRelationshipsPayload := decodeBodyMap(t, editRelationshipsResp.Body)
	editPermissions, ok := editRelationshipsPayload["permissions"].(map[string]any)
	if !ok || !toBool(editPermissions["can_review_candidates"]) {
		t.Fatalf("expected view+edit request to enable candidate review, got %+v", editRelationshipsPayload)
	}
	editRelationshipItems, _ := editRelationshipsPayload["items"].([]any)
	editFirstRelationship, _ := editRelationshipItems[0].(map[string]any)
	if got := strings.TrimSpace(toString(editFirstRelationship["review_action_visible"])); got != services.LineageReviewVisibilityAdminOnly {
		t.Fatalf("expected view+edit request to expose review action visibility, got %+v", editFirstRelationship)
	}
}

func TestRegisterSourceManagementRoutesReturnNotFoundForMissingResources(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(readModels),
		WithDefaultScope(scope),
	)

	for _, path := range []string{
		services.DefaultSourceManagementBasePath + "/sources/missing-source?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/sources/missing-source/revisions?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/sources/missing-source/relationships?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/sources/missing-source/handles?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/sources/missing-source/comments?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/source-revisions/missing-revision?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/source-revisions/missing-revision/artifacts?user_id=ops-user",
		services.DefaultSourceManagementBasePath + "/source-revisions/missing-revision/comments?user_id=ops-user",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("missing-resource request %q failed: %v", path, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected %q to return 404, got %d", path, resp.StatusCode)
		}
	}
}

func TestRegisterSourceManagementRoutesWithRealReadModelServiceRemainConsistent(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(readModels),
		WithDefaultScope(scope),
	)

	sourceList, err := readModels.ListSources(context.Background(), scope, services.SourceListQuery{})
	if err != nil {
		t.Fatalf("ListSources: %v", err)
	}
	sourceDetail, err := readModels.GetSourceDetail(context.Background(), scope, "src-doc-lineage-1")
	if err != nil {
		t.Fatalf("GetSourceDetail: %v", err)
	}
	revisions, err := readModels.ListSourceRevisions(context.Background(), scope, "src-doc-lineage-1", services.SourceRevisionListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRevisions: %v", err)
	}
	relationships, err := readModels.ListSourceRelationships(context.Background(), scope, "src-doc-lineage-1", services.SourceRelationshipListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRelationships: %v", err)
	}
	handles, err := readModels.ListSourceHandles(context.Background(), scope, "src-doc-lineage-1")
	if err != nil {
		t.Fatalf("ListSourceHandles: %v", err)
	}
	sourceComments, err := readModels.ListSourceComments(context.Background(), scope, "src-doc-lineage-1", services.SourceCommentListQuery{})
	if err != nil {
		t.Fatalf("ListSourceComments: %v", err)
	}
	revisionDetail, err := readModels.GetSourceRevisionDetail(context.Background(), scope, "src-rev-lineage-1")
	if err != nil {
		t.Fatalf("GetSourceRevisionDetail: %v", err)
	}
	artifacts, err := readModels.ListSourceRevisionArtifacts(context.Background(), scope, "src-rev-lineage-1")
	if err != nil {
		t.Fatalf("ListSourceRevisionArtifacts: %v", err)
	}
	comments, err := readModels.ListSourceRevisionComments(context.Background(), scope, "src-rev-lineage-1", services.SourceCommentListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRevisionComments: %v", err)
	}
	searchResults, err := readModels.SearchSources(context.Background(), scope, services.SourceSearchQuery{Query: "google-lineage-file-1"})
	if err != nil {
		t.Fatalf("SearchSources: %v", err)
	}

	for _, tc := range []struct {
		name  string
		path  string
		check func(map[string]any)
	}{
		{
			name: "sources",
			path: services.DefaultSourceManagementBasePath + "/sources?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(sourceList.Items) {
					t.Fatalf("expected %d source list items, got %+v", len(sourceList.Items), payload)
				}
				first, ok := items[0].(map[string]any)
				if !ok {
					t.Fatalf("expected source list item object, got %+v", items[0])
				}
				source, ok := first["source"].(map[string]any)
				if !ok || strings.TrimSpace(toString(source["id"])) != "src-doc-lineage-1" {
					t.Fatalf("expected first source list item to come from read model, got %+v", first)
				}
			},
		},
		{
			name: "source detail",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				source, ok := payload["source"].(map[string]any)
				if !ok || strings.TrimSpace(toString(source["id"])) != sourceDetail.Source.ID {
					t.Fatalf("expected source detail source id %q, got %+v", sourceDetail.Source.ID, payload)
				}
				latestRevision, ok := payload["latest_revision"].(map[string]any)
				if !ok || strings.TrimSpace(toString(latestRevision["id"])) != sourceDetail.LatestRevision.ID {
					t.Fatalf("expected source detail latest revision id %q, got %+v", sourceDetail.LatestRevision.ID, payload)
				}
			},
		},
		{
			name: "source revisions",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/revisions?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(revisions.Items) {
					t.Fatalf("expected %d revision items, got %+v", len(revisions.Items), payload)
				}
			},
		},
		{
			name: "source relationships",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/relationships?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(relationships.Items) {
					t.Fatalf("expected %d relationship items, got %+v", len(relationships.Items), payload)
				}
				first, ok := items[0].(map[string]any)
				if !ok || strings.TrimSpace(toString(first["relationship_kind"])) == "" {
					t.Fatalf("expected relationship summary semantics, got %+v", items[0])
				}
			},
		},
		{
			name: "source handles",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/handles?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(handles.Items) {
					t.Fatalf("expected %d handle items, got %+v", len(handles.Items), payload)
				}
			},
		},
		{
			name: "source comments",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/comments?user_id=ops-user",
			check: func(payload map[string]any) {
				if got := strings.TrimSpace(toString(payload["sync_status"])); got != sourceComments.SyncStatus {
					t.Fatalf("expected source comment sync status %q, got %+v", sourceComments.SyncStatus, payload)
				}
			},
		},
		{
			name: "revision detail",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				revision, ok := payload["revision"].(map[string]any)
				if !ok || strings.TrimSpace(toString(revision["id"])) != revisionDetail.Revision.ID {
					t.Fatalf("expected revision detail id %q, got %+v", revisionDetail.Revision.ID, payload)
				}
				historyLabels, ok := revision["history_labels"].([]any)
				if !ok || len(historyLabels) == 0 {
					t.Fatalf("expected revision detail history labels, got %+v", payload)
				}
			},
		},
		{
			name: "revision artifacts",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1/artifacts?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(artifacts.Items) {
					t.Fatalf("expected %d artifact items, got %+v", len(artifacts.Items), payload)
				}
			},
		},
		{
			name: "revision comments",
			path: services.DefaultSourceManagementBasePath + "/source-revisions/src-rev-lineage-1/comments?user_id=ops-user",
			check: func(payload map[string]any) {
				if got := strings.TrimSpace(toString(payload["sync_status"])); got != comments.SyncStatus {
					t.Fatalf("expected comment sync status %q, got %+v", comments.SyncStatus, payload)
				}
			},
		},
		{
			name: "source search",
			path: services.DefaultSourceManagementBasePath + "/source-search?user_id=ops-user&q=google-lineage-file-1",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) != len(searchResults.Items) {
					t.Fatalf("expected %d search results, got %+v", len(searchResults.Items), payload)
				}
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("%s request failed: %v", tc.name, err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("expected %s status 200, got %d", tc.name, resp.StatusCode)
			}
			tc.check(decodeBodyMap(t, resp.Body))
		})
	}
}

type stubSourceReadModelService struct {
	listSourcesResult             services.SourceListPage
	sourceDetailResult            services.SourceDetail
	sourceWorkspaceResult         services.SourceWorkspace
	sourceRevisionPageResult      services.SourceRevisionPage
	sourceRelationshipPageResult  services.SourceRelationshipPage
	sourceAgreementPageResult     services.SourceAgreementPage
	sourceHandlePageResult        services.SourceHandlePage
	sourceRevisionDetailResult    services.SourceRevisionDetail
	sourceArtifactPageResult      services.SourceArtifactPage
	sourceCommentPageResult       services.SourceCommentPage
	sourceSearchResult            services.SourceSearchResults
	reconciliationQueuePageResult services.ReconciliationQueuePage
	reconciliationCandidateResult services.ReconciliationCandidateDetail
}

func (s stubSourceReadModelService) GetDocumentLineageDetail(ctx context.Context, scope stores.Scope, documentID string) (services.DocumentLineageDetail, error) {
	return services.DocumentLineageDetail{}, nil
}

func (s stubSourceReadModelService) GetAgreementLineageDetail(ctx context.Context, scope stores.Scope, agreementID string) (services.AgreementLineageDetail, error) {
	return services.AgreementLineageDetail{}, nil
}

func (s stubSourceReadModelService) GetGoogleImportLineageStatus(ctx context.Context, scope stores.Scope, importRunID string) (services.GoogleImportLineageStatus, error) {
	return services.GoogleImportLineageStatus{}, nil
}

func (s stubSourceReadModelService) ListCandidateWarnings(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]services.CandidateWarningSummary, error) {
	return nil, nil
}

func (s stubSourceReadModelService) ListSources(ctx context.Context, scope stores.Scope, query services.SourceListQuery) (services.SourceListPage, error) {
	return s.listSourcesResult, nil
}

func (s stubSourceReadModelService) GetSourceDetail(ctx context.Context, scope stores.Scope, sourceDocumentID string) (services.SourceDetail, error) {
	return s.sourceDetailResult, nil
}

func (s stubSourceReadModelService) GetSourceWorkspace(ctx context.Context, scope stores.Scope, sourceDocumentID string, query services.SourceWorkspaceQuery) (services.SourceWorkspace, error) {
	return s.sourceWorkspaceResult, nil
}

func (s stubSourceReadModelService) ListSourceRevisions(ctx context.Context, scope stores.Scope, sourceDocumentID string, query services.SourceRevisionListQuery) (services.SourceRevisionPage, error) {
	return s.sourceRevisionPageResult, nil
}

func (s stubSourceReadModelService) ListSourceRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string, query services.SourceRelationshipListQuery) (services.SourceRelationshipPage, error) {
	return s.sourceRelationshipPageResult, nil
}

func (s stubSourceReadModelService) ListSourceAgreements(ctx context.Context, scope stores.Scope, sourceDocumentID string, query services.SourceAgreementListQuery) (services.SourceAgreementPage, error) {
	return s.sourceAgreementPageResult, nil
}

func (s stubSourceReadModelService) ListSourceHandles(ctx context.Context, scope stores.Scope, sourceDocumentID string) (services.SourceHandlePage, error) {
	return s.sourceHandlePageResult, nil
}

func (s stubSourceReadModelService) GetSourceRevisionDetail(ctx context.Context, scope stores.Scope, sourceRevisionID string) (services.SourceRevisionDetail, error) {
	return s.sourceRevisionDetailResult, nil
}

func (s stubSourceReadModelService) ListSourceRevisionArtifacts(ctx context.Context, scope stores.Scope, sourceRevisionID string) (services.SourceArtifactPage, error) {
	return s.sourceArtifactPageResult, nil
}

func (s stubSourceReadModelService) ListSourceComments(ctx context.Context, scope stores.Scope, sourceDocumentID string, query services.SourceCommentListQuery) (services.SourceCommentPage, error) {
	return s.sourceCommentPageResult, nil
}

func (s stubSourceReadModelService) ListSourceRevisionComments(ctx context.Context, scope stores.Scope, sourceRevisionID string, query services.SourceCommentListQuery) (services.SourceCommentPage, error) {
	return s.sourceCommentPageResult, nil
}

func (s stubSourceReadModelService) SearchSources(ctx context.Context, scope stores.Scope, query services.SourceSearchQuery) (services.SourceSearchResults, error) {
	return s.sourceSearchResult, nil
}

func (s stubSourceReadModelService) ListReconciliationQueue(ctx context.Context, scope stores.Scope, query services.ReconciliationQueueQuery) (services.ReconciliationQueuePage, error) {
	return s.reconciliationQueuePageResult, nil
}

func (s stubSourceReadModelService) GetReconciliationCandidate(ctx context.Context, scope stores.Scope, relationshipID string) (services.ReconciliationCandidateDetail, error) {
	return s.reconciliationCandidateResult, nil
}

func toBool(value any) bool {
	typed, _ := value.(bool)
	return typed
}

func TestRegisterSourceManagementRoutesRemainConsistentWithLineageProvenanceReads(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	_ = seedGoogleImportRunLineageFixture(t, store, scope)

	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelImportRuns(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminView)),
		WithSourceReadModelService(readModels),
		WithDefaultScope(scope),
	)

	documentDetail, err := readModels.GetDocumentLineageDetail(context.Background(), scope, "doc-lineage-1")
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail: %v", err)
	}
	agreementDetail, err := readModels.GetAgreementLineageDetail(context.Background(), scope, "agr-lineage-1")
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail: %v", err)
	}

	for _, tc := range []struct {
		name  string
		path  string
		check func(map[string]any)
	}{
		{
			name: "source detail",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1?user_id=ops-user",
			check: func(payload map[string]any) {
				source, ok := payload["source"].(map[string]any)
				if !ok || strings.TrimSpace(toString(source["id"])) != documentDetail.SourceDocument.ID {
					t.Fatalf("expected source detail to match document provenance source %q, got %+v", documentDetail.SourceDocument.ID, payload)
				}
			},
		},
		{
			name: "revision history",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/revisions?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) == 0 {
					t.Fatalf("expected revision history items, got %+v", payload)
				}
				revision, ok := items[0].(map[string]any)
				if !ok {
					t.Fatalf("expected revision history item, got %+v", items[0])
				}
				revisionSummary, ok := revision["revision"].(map[string]any)
				if !ok || strings.TrimSpace(toString(revisionSummary["id"])) != agreementDetail.SourceRevision.ID {
					t.Fatalf("expected revision history to include pinned agreement revision %q, got %+v", agreementDetail.SourceRevision.ID, revision)
				}
			},
		},
		{
			name: "relationship summaries",
			path: services.DefaultSourceManagementBasePath + "/sources/src-doc-lineage-1/relationships?user_id=ops-user",
			check: func(payload map[string]any) {
				items, ok := payload["items"].([]any)
				if !ok || len(items) == 0 {
					t.Fatalf("expected relationship summary items, got %+v", payload)
				}
				first, ok := items[0].(map[string]any)
				if !ok || strings.TrimSpace(toString(first["id"])) != documentDetail.CandidateWarningSummary[0].ID {
					t.Fatalf("expected relationship summary to stay aligned with document candidate warning %q, got %+v", documentDetail.CandidateWarningSummary[0].ID, payload)
				}
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("%s request failed: %v", tc.name, err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("expected %s status 200, got %d", tc.name, resp.StatusCode)
			}
			tc.check(decodeBodyMap(t, resp.Body))
		})
	}
}
