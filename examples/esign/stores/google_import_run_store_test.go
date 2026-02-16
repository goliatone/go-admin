package stores

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestInMemoryGoogleImportRunLifecycleAndDedupe(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	now := time.Date(2026, 2, 16, 12, 0, 0, 0, time.UTC)

	run, created, err := store.BeginGoogleImportRun(ctx, scope, GoogleImportRunInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported Doc",
		AgreementTitle:    "Imported Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-1",
		RequestedAt:       now,
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun: %v", err)
	}
	if !created {
		t.Fatal("expected first run create=true")
	}
	if run.Status != GoogleImportRunStatusQueued {
		t.Fatalf("expected queued status, got %q", run.Status)
	}

	replay, replayCreated, err := store.BeginGoogleImportRun(ctx, scope, GoogleImportRunInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DedupeKey:         run.DedupeKey,
		RequestedAt:       now.Add(1 * time.Minute),
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun replay: %v", err)
	}
	if replayCreated {
		t.Fatal("expected replay create=false")
	}
	if replay.ID != run.ID {
		t.Fatalf("expected replay id %q, got %q", run.ID, replay.ID)
	}

	running, err := store.MarkGoogleImportRunRunning(ctx, scope, run.ID, now.Add(2*time.Minute))
	if err != nil {
		t.Fatalf("MarkGoogleImportRunRunning: %v", err)
	}
	if running.Status != GoogleImportRunStatusRunning {
		t.Fatalf("expected running status, got %q", running.Status)
	}

	succeeded, err := store.MarkGoogleImportRunSucceeded(ctx, scope, run.ID, GoogleImportRunSuccessInput{
		DocumentID:     "doc-1",
		AgreementID:    "agreement-1",
		SourceMimeType: "application/vnd.google-apps.document",
		IngestionMode:  "google_export_pdf",
		CompletedAt:    now.Add(3 * time.Minute),
	})
	if err != nil {
		t.Fatalf("MarkGoogleImportRunSucceeded: %v", err)
	}
	if succeeded.Status != GoogleImportRunStatusSucceeded {
		t.Fatalf("expected succeeded status, got %q", succeeded.Status)
	}
	if succeeded.DocumentID != "doc-1" || succeeded.AgreementID != "agreement-1" {
		t.Fatalf("expected terminal ids to persist, got %+v", succeeded)
	}
	if succeeded.SourceMimeType == "" || succeeded.IngestionMode == "" {
		t.Fatalf("expected diagnostics metadata, got %+v", succeeded)
	}
}

func TestInMemoryGoogleImportRunListPaginationByUser(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	base := time.Date(2026, 2, 16, 12, 0, 0, 0, time.UTC)

	for idx := 0; idx < 3; idx++ {
		_, _, err := store.BeginGoogleImportRun(ctx, scope, GoogleImportRunInput{
			UserID:            "ops-user",
			GoogleFileID:      fmt.Sprintf("google-file-%d", idx+1),
			SourceVersionHint: "v1",
			RequestedAt:       base.Add(time.Duration(idx) * time.Minute),
		})
		if err != nil {
			t.Fatalf("BeginGoogleImportRun(%d): %v", idx, err)
		}
	}
	_, _, err := store.BeginGoogleImportRun(ctx, scope, GoogleImportRunInput{
		UserID:            "other-user",
		GoogleFileID:      "other-file",
		SourceVersionHint: "v1",
		RequestedAt:       base.Add(10 * time.Minute),
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun(other-user): %v", err)
	}

	page, next, err := store.ListGoogleImportRuns(ctx, scope, GoogleImportRunQuery{
		UserID:   "ops-user",
		Limit:    2,
		SortDesc: true,
	})
	if err != nil {
		t.Fatalf("ListGoogleImportRuns page1: %v", err)
	}
	if len(page) != 2 {
		t.Fatalf("expected 2 rows in page1, got %d", len(page))
	}
	if next == "" {
		t.Fatal("expected next cursor on page1")
	}
	if page[0].CreatedAt.Before(page[1].CreatedAt) {
		t.Fatalf("expected desc order, got %+v", page)
	}

	page2, next2, err := store.ListGoogleImportRuns(ctx, scope, GoogleImportRunQuery{
		UserID:   "ops-user",
		Limit:    2,
		Cursor:   next,
		SortDesc: true,
	})
	if err != nil {
		t.Fatalf("ListGoogleImportRuns page2: %v", err)
	}
	if len(page2) != 1 {
		t.Fatalf("expected 1 row in page2, got %d", len(page2))
	}
	if next2 != "" {
		t.Fatalf("expected terminal cursor empty, got %q", next2)
	}
}
