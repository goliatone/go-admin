package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

func TestPDFRemediationServiceLifecycleAgreementAuditAndProjection(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-remediation", OrgID: "org-remediation"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	now := time.Date(2026, 3, 8, 10, 0, 0, 0, time.UTC)

	source := GenerateDeterministicPDF(2)
	document := seedPDFRemediationDocument(t, ctx, store, objects, scope, "doc-remediation-success", "tenant/tenant-remediation/org/org-remediation/docs/doc-remediation-success/source.pdf", source, now)

	runner := &stubPDFRemediationRunner{outputPDF: GenerateDeterministicPDF(2)}
	activity := &recordingRemediationActivitySink{}
	audits := &recordingRemediationAuditStore{}
	projector := &recordingRemediationProjector{}
	service := NewPDFRemediationService(store, objects, runner,
		WithPDFRemediationClock(func() time.Time { return now }),
		WithPDFRemediationActivitySink(activity),
		WithPDFRemediationAuditStore(audits),
		WithPDFRemediationActivityProjector(projector),
		WithPDFRemediationLeaseTTL(2*time.Second),
	)

	result, err := service.Remediate(ctx, scope, PDFRemediationRequest{
		DocumentID:    document.ID,
		AgreementID:   "agreement-123",
		ActorID:       "admin-user-1",
		CommandID:     "esign.pdf.remediate",
		DispatchID:    "dispatch-123",
		CorrelationID: "corr-123",
		ExecutionMode: "queued",
		RequestedAt:   &now,
	})
	if err != nil {
		t.Fatalf("Remediate: %v", err)
	}
	if runner.calls != 1 {
		t.Fatalf("expected runner call count 1, got %d", runner.calls)
	}
	if result.Document.SourceObjectKey != document.SourceObjectKey {
		t.Fatalf("expected immutable source object key %q, got %q", document.SourceObjectKey, result.Document.SourceObjectKey)
	}
	if result.Document.RemediationStatus != PDFRemediationStatusSucceeded {
		t.Fatalf("expected remediation status %q, got %q", PDFRemediationStatusSucceeded, result.Document.RemediationStatus)
	}
	if result.Document.RemediationOriginalKey != document.SourceObjectKey {
		t.Fatalf("expected remediation original key %q, got %q", document.SourceObjectKey, result.Document.RemediationOriginalKey)
	}
	if result.Document.RemediationOutputKey == "" {
		t.Fatalf("expected remediation output key to be persisted")
	}
	if result.OutputObjectKey != result.Document.RemediationOutputKey {
		t.Fatalf("expected result output key %q to match persisted %q", result.OutputObjectKey, result.Document.RemediationOutputKey)
	}
	if _, getErr := objects.GetFile(ctx, result.OutputObjectKey); getErr != nil {
		t.Fatalf("GetFile remediation output: %v", getErr)
	}

	updated, err := store.Get(ctx, scope, document.ID)
	if err != nil {
		t.Fatalf("Get updated document: %v", err)
	}
	if updated.SourceObjectKey != document.SourceObjectKey {
		t.Fatalf("expected source object key to remain immutable, got %q", updated.SourceObjectKey)
	}
	if updated.PDFCompatibilityTier == "" || updated.PDFNormalizationStatus == "" {
		t.Fatalf("expected compatibility metadata to be re-analyzed, got %+v", updated)
	}

	assertRemediationActivityStatuses(t, activity.entries, []string{
		PDFRemediationStatusRequested,
		PDFRemediationStatusStarted,
		PDFRemediationStatusSucceeded,
	}, scope, document.ID, "esign.pdf.remediate", "dispatch-123", "corr-123", "queued")

	if len(audits.events) != 3 {
		t.Fatalf("expected 3 agreement audit events, got %d", len(audits.events))
	}
	for i, expectedStatus := range []string{
		PDFRemediationStatusRequested,
		PDFRemediationStatusStarted,
		PDFRemediationStatusSucceeded,
	} {
		event := audits.events[i]
		expectedType := "document.remediation." + expectedStatus
		if event.EventType != expectedType {
			t.Fatalf("expected audit event type %q, got %q", expectedType, event.EventType)
		}
		meta := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &meta); err != nil {
			t.Fatalf("unmarshal audit metadata: %v", err)
		}
		assertCanonicalRemediationMetadata(t, meta, scope, document.ID, "esign.pdf.remediate", "dispatch-123", "corr-123", "queued")
	}
	if projector.calls != 3 {
		t.Fatalf("expected projector called 3 times, got %d", projector.calls)
	}
	if projector.lastAgreementID != "agreement-123" {
		t.Fatalf("expected projector agreement agreement-123, got %q", projector.lastAgreementID)
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationCandidateTotal != 1 || snapshot.RemediationStartedTotal != 1 || snapshot.RemediationSucceededTotal != 1 {
		t.Fatalf("expected remediation lifecycle success counters, got %+v", snapshot)
	}
	if snapshot.RemediationFailedTotal != 0 {
		t.Fatalf("expected no remediation failure metrics on success path, got %+v", snapshot)
	}
}

func TestPDFRemediationServiceDocumentOnlyPathSkipsAuditAndEmitsFailedActivity(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-remediation", OrgID: "org-remediation"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	now := time.Date(2026, 3, 8, 11, 0, 0, 0, time.UTC)

	source := GenerateDeterministicPDF(1)
	document := seedPDFRemediationDocument(t, ctx, store, objects, scope, "doc-remediation-failed", "tenant/tenant-remediation/org/org-remediation/docs/doc-remediation-failed/source.pdf", source, now)

	runner := &stubPDFRemediationRunner{runErr: fmt.Errorf("conversion failed")}
	activity := &recordingRemediationActivitySink{}
	audits := &recordingRemediationAuditStore{}
	projector := &recordingRemediationProjector{}
	service := NewPDFRemediationService(store, objects, runner,
		WithPDFRemediationClock(func() time.Time { return now }),
		WithPDFRemediationActivitySink(activity),
		WithPDFRemediationAuditStore(audits),
		WithPDFRemediationActivityProjector(projector),
		WithPDFRemediationLeaseTTL(2*time.Second),
	)

	_, err := service.Remediate(ctx, scope, PDFRemediationRequest{
		DocumentID:    document.ID,
		ActorID:       "admin-user-1",
		CommandID:     "esign.pdf.remediate",
		DispatchID:    "dispatch-456",
		CorrelationID: "corr-456",
		ExecutionMode: "inline",
		RequestedAt:   &now,
	})
	if err == nil {
		t.Fatal("expected remediation error for runner failure")
	}

	assertRemediationActivityStatuses(t, activity.entries, []string{
		PDFRemediationStatusRequested,
		PDFRemediationStatusStarted,
		PDFRemediationStatusFailed,
	}, scope, document.ID, "esign.pdf.remediate", "dispatch-456", "corr-456", "inline")
	if len(audits.events) != 0 {
		t.Fatalf("expected document-only remediation to skip agreement audit append, got %d events", len(audits.events))
	}
	if projector.calls != 0 {
		t.Fatalf("expected no projector invocations for document-only remediation, got %d", projector.calls)
	}

	updated, getErr := store.Get(ctx, scope, document.ID)
	if getErr != nil {
		t.Fatalf("Get updated document: %v", getErr)
	}
	if updated.RemediationStatus != PDFRemediationStatusFailed {
		t.Fatalf("expected remediation status %q, got %q", PDFRemediationStatusFailed, updated.RemediationStatus)
	}
	if updated.RemediationFailure == "" {
		t.Fatalf("expected remediation failure message to be persisted")
	}
	if updated.SourceObjectKey != document.SourceObjectKey {
		t.Fatalf("expected source object key to remain immutable, got %q", updated.SourceObjectKey)
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationCandidateTotal != 1 || snapshot.RemediationStartedTotal != 1 || snapshot.RemediationFailedTotal != 1 {
		t.Fatalf("expected remediation failure lifecycle counters, got %+v", snapshot)
	}
	if snapshot.RemediationFailureByReason["conversion_failed"] == 0 {
		t.Fatalf("expected remediation failure reason metric for conversion_failed, got %+v", snapshot.RemediationFailureByReason)
	}
}

func TestPDFRemediationServiceRecordsLockContentionMetric(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-remediation", OrgID: "org-remediation"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	now := time.Date(2026, 3, 8, 12, 0, 0, 0, time.UTC)

	source := GenerateDeterministicPDF(1)
	document := seedPDFRemediationDocument(t, ctx, store, objects, scope, "doc-remediation-lock-contention", "tenant/tenant-remediation/org/org-remediation/docs/doc-remediation-lock-contention/source.pdf", source, now)

	if _, err := store.AcquireDocumentRemediationLease(ctx, scope, document.ID, stores.DocumentRemediationLeaseAcquireInput{
		Now:           now,
		TTL:           2 * time.Minute,
		WorkerID:      "worker-lock-holder",
		CorrelationID: "corr-lock-holder",
	}); err != nil {
		t.Fatalf("AcquireDocumentRemediationLease: %v", err)
	}

	service := NewPDFRemediationService(store, objects, &stubPDFRemediationRunner{outputPDF: GenerateDeterministicPDF(1)},
		WithPDFRemediationClock(func() time.Time { return now }),
	)
	_, err := service.Remediate(ctx, scope, PDFRemediationRequest{
		DocumentID:    document.ID,
		CommandID:     "esign.pdf.remediate",
		DispatchID:    "dispatch-lock-contention",
		CorrelationID: "corr-lock-contention",
		ExecutionMode: "queued",
		RequestedAt:   &now,
	})
	if err == nil {
		t.Fatal("expected remediation error while lease is already held")
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationLockContentionTotal != 1 {
		t.Fatalf("expected remediation lock contention metric, got %+v", snapshot)
	}
}

func TestPDFRemediationServiceRecordsLockTimeoutMetric(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-remediation", OrgID: "org-remediation"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	now := time.Date(2026, 3, 8, 13, 0, 0, 0, time.UTC)

	source := GenerateDeterministicPDF(1)
	document := seedPDFRemediationDocument(t, ctx, store, objects, scope, "doc-remediation-lock-timeout", "tenant/tenant-remediation/org/org-remediation/docs/doc-remediation-lock-timeout/source.pdf", source, now)

	service := NewPDFRemediationService(store, objects, &stubPDFRemediationRunner{runErr: context.DeadlineExceeded},
		WithPDFRemediationClock(func() time.Time { return now }),
	)
	_, err := service.Remediate(ctx, scope, PDFRemediationRequest{
		DocumentID:    document.ID,
		CommandID:     "esign.pdf.remediate",
		DispatchID:    "dispatch-lock-timeout",
		CorrelationID: "corr-lock-timeout",
		ExecutionMode: "queued",
		RequestedAt:   &now,
	})
	if err == nil {
		t.Fatal("expected remediation timeout error")
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationLockTimeoutTotal != 1 {
		t.Fatalf("expected remediation lock timeout metric, got %+v", snapshot)
	}
}

func seedPDFRemediationDocument(
	t *testing.T,
	ctx context.Context,
	store stores.DocumentStore,
	objects *uploader.Manager,
	scope stores.Scope,
	documentID string,
	objectKey string,
	sourcePDF []byte,
	now time.Time,
) stores.DocumentRecord {
	t.Helper()
	sum := sha256.Sum256(sourcePDF)
	record, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     documentID,
		Title:                  "Remediation Candidate",
		SourceObjectKey:        objectKey,
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           hex.EncodeToString(sum[:]),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(PDFCompatibilityTierUnsupported),
		PDFCompatibilityReason: string(PDFReasonParseFailed),
		PDFNormalizationStatus: string(PDFNormalizationStatusFailed),
		SizeBytes:              int64(len(sourcePDF)),
		PageCount:              1,
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatalf("Create remediation document: %v", err)
	}
	if _, err := objects.UploadFile(ctx, objectKey, sourcePDF, uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("Upload source pdf: %v", err)
	}
	return record
}

func assertRemediationActivityStatuses(
	t *testing.T,
	entries []coreadmin.ActivityEntry,
	expectedStatuses []string,
	scope stores.Scope,
	documentID string,
	commandID string,
	dispatchID string,
	correlationID string,
	executionMode string,
) {
	t.Helper()
	if len(entries) != len(expectedStatuses) {
		t.Fatalf("expected %d activity entries, got %d", len(expectedStatuses), len(entries))
	}
	for i, expectedStatus := range expectedStatuses {
		entry := entries[i]
		expectedAction := "esign.pdf_remediation." + expectedStatus
		if entry.Action != expectedAction {
			t.Fatalf("expected activity action %q, got %q", expectedAction, entry.Action)
		}
		expectedObject := "document:" + documentID
		if entry.Object != expectedObject {
			t.Fatalf("expected activity object %q, got %q", expectedObject, entry.Object)
		}
		if entry.Metadata == nil {
			t.Fatalf("expected activity metadata for status %q", expectedStatus)
		}
		if status := entry.Metadata["status"]; status != expectedStatus {
			t.Fatalf("expected activity metadata.status %q, got %+v", expectedStatus, status)
		}
		assertCanonicalRemediationMetadata(t, entry.Metadata, scope, documentID, commandID, dispatchID, correlationID, executionMode)
	}
}

func assertCanonicalRemediationMetadata(
	t *testing.T,
	metadata map[string]any,
	scope stores.Scope,
	documentID string,
	commandID string,
	dispatchID string,
	correlationID string,
	executionMode string,
) {
	t.Helper()
	if got := fmt.Sprint(metadata["tenant_id"]); got != scope.TenantID {
		t.Fatalf("expected tenant_id %q, got %q", scope.TenantID, got)
	}
	if got := fmt.Sprint(metadata["org_id"]); got != scope.OrgID {
		t.Fatalf("expected org_id %q, got %q", scope.OrgID, got)
	}
	if got := fmt.Sprint(metadata["document_id"]); got != documentID {
		t.Fatalf("expected document_id %q, got %q", documentID, got)
	}
	if got := fmt.Sprint(metadata["command_id"]); got != commandID {
		t.Fatalf("expected command_id %q, got %q", commandID, got)
	}
	if got := fmt.Sprint(metadata["dispatch_id"]); got != dispatchID {
		t.Fatalf("expected dispatch_id %q, got %q", dispatchID, got)
	}
	if got := fmt.Sprint(metadata["correlation_id"]); got != correlationID {
		t.Fatalf("expected correlation_id %q, got %q", correlationID, got)
	}
	if got := fmt.Sprint(metadata["execution_mode"]); got != executionMode {
		t.Fatalf("expected execution_mode %q, got %q", executionMode, got)
	}
}

type stubPDFRemediationRunner struct {
	mu        sync.Mutex
	calls     int
	outputPDF []byte
	runErr    error
}

func (s *stubPDFRemediationRunner) Run(_ context.Context, _ PDFRemediationRunInput) (PDFRemediationRunResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls++
	if s.runErr != nil {
		return PDFRemediationRunResult{}, s.runErr
	}
	return PDFRemediationRunResult{
		OutputPDF:   append([]byte{}, s.outputPDF...),
		CompletedAt: time.Now().UTC(),
	}, nil
}

type recordingRemediationActivitySink struct {
	mu      sync.Mutex
	entries []coreadmin.ActivityEntry
}

func (s *recordingRemediationActivitySink) Record(_ context.Context, entry coreadmin.ActivityEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry.Metadata = cloneRemediationMetadata(entry.Metadata)
	s.entries = append(s.entries, entry)
	return nil
}

func (s *recordingRemediationActivitySink) List(_ context.Context, _ int, _ ...coreadmin.ActivityFilter) ([]coreadmin.ActivityEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]coreadmin.ActivityEntry, len(s.entries))
	copy(out, s.entries)
	return out, nil
}

type recordingRemediationAuditStore struct {
	mu     sync.Mutex
	events []stores.AuditEventRecord
}

func (s *recordingRemediationAuditStore) Append(_ context.Context, scope stores.Scope, event stores.AuditEventRecord) (stores.AuditEventRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	event.TenantID = scope.TenantID
	event.OrgID = scope.OrgID
	s.events = append(s.events, event)
	return event, nil
}

func (s *recordingRemediationAuditStore) ListForAgreement(_ context.Context, _ stores.Scope, _ string, _ stores.AuditEventQuery) ([]stores.AuditEventRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]stores.AuditEventRecord, len(s.events))
	copy(out, s.events)
	return out, nil
}

type recordingRemediationProjector struct {
	mu              sync.Mutex
	calls           int
	lastScope       stores.Scope
	lastAgreementID string
}

func (p *recordingRemediationProjector) ProjectAgreement(_ context.Context, scope stores.Scope, agreementID string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls++
	p.lastScope = scope
	p.lastAgreementID = agreementID
	return nil
}
