package stores

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestInMemoryStoreDocumentRemediationLeaseAcquireConflictRecovery(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	documentID := createLeaseTestDocument(t, store, scope, "doc-lease-1")
	now := time.Date(2026, 3, 9, 12, 0, 0, 0, time.UTC)

	claimA, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:           now,
		TTL:           2 * time.Minute,
		WorkerID:      "worker-a",
		CorrelationID: "corr-a",
	})
	if err != nil {
		t.Fatalf("AcquireDocumentRemediationLease worker-a: %v", err)
	}
	if claimA.Lease.LeaseSeq != 1 {
		t.Fatalf("expected initial lease seq 1, got %+v", claimA.Lease)
	}

	_, err = store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:      now.Add(30 * time.Second),
		TTL:      2 * time.Minute,
		WorkerID: "worker-b",
	})
	if err == nil {
		t.Fatalf("expected active lease conflict")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_CONFLICT") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_CONFLICT, got %v", err)
	}

	claimB, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:           now.Add(3 * time.Minute),
		TTL:           2 * time.Minute,
		WorkerID:      "worker-b",
		CorrelationID: "corr-b",
	})
	if err != nil {
		t.Fatalf("AcquireDocumentRemediationLease worker-b recovery: %v", err)
	}
	if claimB.Lease.LeaseSeq != 2 {
		t.Fatalf("expected recovered lease seq 2, got %+v", claimB.Lease)
	}
	if claimB.Record.CorrelationID != "corr-b" {
		t.Fatalf("expected correlation corr-b, got %+v", claimB.Record)
	}
}

func TestInMemoryStoreDocumentRemediationLeaseRenewFencing(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	documentID := createLeaseTestDocument(t, store, scope, "doc-lease-2")
	now := time.Date(2026, 3, 9, 12, 30, 0, 0, time.UTC)

	claim, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:      now,
		TTL:      2 * time.Minute,
		WorkerID: "worker-a",
	})
	if err != nil {
		t.Fatalf("AcquireDocumentRemediationLease: %v", err)
	}

	renewed, err := store.RenewDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseRenewInput{
		Now:   now.Add(30 * time.Second),
		TTL:   2 * time.Minute,
		Lease: claim.Lease,
	})
	if err != nil {
		t.Fatalf("RenewDocumentRemediationLease: %v", err)
	}
	if renewed.Lease.LeaseSeq != claim.Lease.LeaseSeq+1 {
		t.Fatalf("expected renewed lease seq increment, got %+v", renewed.Lease)
	}

	_, err = store.RenewDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseRenewInput{
		Now:   now.Add(45 * time.Second),
		TTL:   2 * time.Minute,
		Lease: claim.Lease,
	})
	if err == nil {
		t.Fatalf("expected stale lease seq conflict")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_CONFLICT") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_CONFLICT, got %v", err)
	}

	nonOwner := renewed.Lease
	nonOwner.WorkerID = "worker-b"
	_, err = store.RenewDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseRenewInput{
		Now:   now.Add(1 * time.Minute),
		TTL:   2 * time.Minute,
		Lease: nonOwner,
	})
	if err == nil {
		t.Fatalf("expected non-owner lease renewal to fail")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_LOST") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_LOST, got %v", err)
	}

	_, err = store.RenewDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseRenewInput{
		Now:   now.Add(5 * time.Minute),
		TTL:   2 * time.Minute,
		Lease: renewed.Lease,
	})
	if err == nil {
		t.Fatalf("expected expired lease renewal to fail")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_LOST") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_LOST after expiry, got %v", err)
	}
}

func TestInMemoryStoreDocumentRemediationLeaseReleaseOwnership(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	documentID := createLeaseTestDocument(t, store, scope, "doc-lease-3")
	now := time.Date(2026, 3, 9, 13, 0, 0, 0, time.UTC)

	claim, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:      now,
		TTL:      2 * time.Minute,
		WorkerID: "worker-a",
	})
	if err != nil {
		t.Fatalf("AcquireDocumentRemediationLease: %v", err)
	}

	wrongWorker := claim.Lease
	wrongWorker.WorkerID = "worker-b"
	err = store.ReleaseDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseReleaseInput{
		Now:   now.Add(20 * time.Second),
		Lease: wrongWorker,
	})
	if err == nil {
		t.Fatalf("expected non-owner release to fail")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_LOST") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_LOST, got %v", err)
	}

	renewed, err := store.RenewDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseRenewInput{
		Now:   now.Add(30 * time.Second),
		TTL:   2 * time.Minute,
		Lease: claim.Lease,
	})
	if err != nil {
		t.Fatalf("RenewDocumentRemediationLease: %v", err)
	}

	err = store.ReleaseDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseReleaseInput{
		Now:   now.Add(35 * time.Second),
		Lease: claim.Lease,
	})
	if err == nil {
		t.Fatalf("expected stale lease release to fail")
	}
	if !strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_CONFLICT") {
		t.Fatalf("expected DOCUMENT_REMEDIATION_LEASE_CONFLICT, got %v", err)
	}

	err = store.ReleaseDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseReleaseInput{
		Now:   now.Add(40 * time.Second),
		Lease: renewed.Lease,
	})
	if err != nil {
		t.Fatalf("ReleaseDocumentRemediationLease owner: %v", err)
	}

	reacquired, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
		Now:      now.Add(45 * time.Second),
		TTL:      2 * time.Minute,
		WorkerID: "worker-b",
	})
	if err != nil {
		t.Fatalf("AcquireDocumentRemediationLease after release: %v", err)
	}
	if reacquired.Lease.WorkerID != "worker-b" {
		t.Fatalf("expected worker-b reacquire, got %+v", reacquired.Lease)
	}
}

func TestInMemoryStoreDocumentRemediationLeaseConcurrentAcquireSingleWinner(t *testing.T) {
	store := NewInMemoryStore()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	documentID := createLeaseTestDocument(t, store, scope, "doc-lease-4")
	now := time.Date(2026, 3, 9, 14, 0, 0, 0, time.UTC)

	const workers = 24
	var wg sync.WaitGroup
	var mu sync.Mutex
	successes := 0
	conflicts := 0
	otherErrs := 0

	for i := range workers {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := store.AcquireDocumentRemediationLease(context.Background(), scope, documentID, DocumentRemediationLeaseAcquireInput{
				Now:      now,
				TTL:      2 * time.Minute,
				WorkerID: "worker-" + string(rune('a'+idx)),
			})
			mu.Lock()
			defer mu.Unlock()
			if err == nil {
				successes++
				return
			}
			if strings.Contains(err.Error(), "DOCUMENT_REMEDIATION_LEASE_CONFLICT") {
				conflicts++
				return
			}
			otherErrs++
		}(i)
	}
	wg.Wait()

	if successes != 1 {
		t.Fatalf("expected exactly 1 successful lease acquisition, got %d (conflicts=%d other=%d)", successes, conflicts, otherErrs)
	}
	if conflicts != workers-1 {
		t.Fatalf("expected %d conflicts, got %d (other=%d)", workers-1, conflicts, otherErrs)
	}
	if otherErrs != 0 {
		t.Fatalf("expected 0 unexpected errors, got %d", otherErrs)
	}
}

func createLeaseTestDocument(t *testing.T, store *InMemoryStore, scope Scope, id string) string {
	t.Helper()
	record, err := store.Create(context.Background(), scope, DocumentRecord{
		ID:                 id,
		Title:              "Lease Test",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/" + id + "/source.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SourceType:         SourceTypeUpload,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("Create lease document: %v", err)
	}
	return record.ID
}
