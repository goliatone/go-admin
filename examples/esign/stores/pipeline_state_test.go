package stores

import (
	"context"
	"testing"
	"time"
)

func setupPipelineStoreAgreement(t *testing.T) (context.Context, Scope, *InMemoryStore, AgreementRecord) {
	t.Helper()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{DocumentID: "doc-1", Title: "Pipeline"})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	return ctx, scope, store, agreement
}

func TestInMemoryAgreementArtifactStoreIsImmutable(t *testing.T) {
	ctx, scope, store, agreement := setupPipelineStoreAgreement(t)

	saved, err := store.SaveAgreementArtifacts(ctx, scope, AgreementArtifactRecord{
		AgreementID:       agreement.ID,
		ExecutedObjectKey: "tenant/tenant-1/org/org-1/agreements/a/executed.pdf",
		ExecutedSHA256:    "aaa",
		CorrelationID:     "corr-1",
	})
	if err != nil {
		t.Fatalf("SaveAgreementArtifacts executed: %v", err)
	}
	if saved.ExecutedObjectKey == "" || saved.ExecutedSHA256 == "" {
		t.Fatalf("expected executed artifact data persisted, got %+v", saved)
	}
	saved, err = store.SaveAgreementArtifacts(ctx, scope, AgreementArtifactRecord{
		AgreementID:          agreement.ID,
		CertificateObjectKey: "tenant/tenant-1/org/org-1/agreements/a/certificate.pdf",
		CertificateSHA256:    "bbb",
		CorrelationID:        "corr-2",
	})
	if err != nil {
		t.Fatalf("SaveAgreementArtifacts certificate: %v", err)
	}
	if saved.CertificateObjectKey == "" || saved.CertificateSHA256 == "" {
		t.Fatalf("expected certificate artifact data persisted, got %+v", saved)
	}
	if _, err := store.SaveAgreementArtifacts(ctx, scope, AgreementArtifactRecord{
		AgreementID:       agreement.ID,
		ExecutedObjectKey: "tenant/tenant-1/org/org-1/agreements/a/other.pdf",
		ExecutedSHA256:    "ccc",
	}); err == nil {
		t.Fatal("expected immutable overwrite rejection")
	}
}

func TestInMemoryJobRunStoreSupportsRetryAndDedupe(t *testing.T) {
	ctx, scope, store, agreement := setupPipelineStoreAgreement(t)
	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)

	run, shouldRun, err := store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.pdf_generate_executed",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: now,
	})
	if err != nil {
		t.Fatalf("BeginJobRun first: %v", err)
	}
	if !shouldRun || run.AttemptCount != 1 {
		t.Fatalf("expected first run attempt, got shouldRun=%t run=%+v", shouldRun, run)
	}
	nextRetry := now.Add(5 * time.Second)
	run, err = store.MarkJobRunFailed(ctx, scope, run.ID, "transient", &nextRetry, now)
	if err != nil {
		t.Fatalf("MarkJobRunFailed retrying: %v", err)
	}
	if run.Status != JobRunStatusRetrying {
		t.Fatalf("expected retrying status, got %q", run.Status)
	}

	run, shouldRun, err = store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.pdf_generate_executed",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: nextRetry.Add(-time.Second),
	})
	if err != nil {
		t.Fatalf("BeginJobRun before retry window: %v", err)
	}
	if shouldRun {
		t.Fatalf("expected run to wait for retry window, got %+v", run)
	}

	run, shouldRun, err = store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.pdf_generate_executed",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: nextRetry.Add(time.Second),
	})
	if err != nil {
		t.Fatalf("BeginJobRun retry attempt: %v", err)
	}
	if !shouldRun || run.AttemptCount != 2 {
		t.Fatalf("expected second attempt execution, got shouldRun=%t run=%+v", shouldRun, run)
	}
	if _, err := store.MarkJobRunSucceeded(ctx, scope, run.ID, nextRetry.Add(2*time.Second)); err != nil {
		t.Fatalf("MarkJobRunSucceeded: %v", err)
	}

	run, shouldRun, err = store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.pdf_generate_executed",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: nextRetry.Add(3 * time.Second),
	})
	if err != nil {
		t.Fatalf("BeginJobRun after success: %v", err)
	}
	if shouldRun || run.Status != JobRunStatusSucceeded {
		t.Fatalf("expected dedupe no-op after success, got shouldRun=%t run=%+v", shouldRun, run)
	}
}

func TestInMemoryEmailLogStoreTracksRetryMetadata(t *testing.T) {
	ctx, scope, store, agreement := setupPipelineStoreAgreement(t)
	now := time.Date(2026, 2, 10, 11, 0, 0, 0, time.UTC)
	log, err := store.CreateEmailLog(ctx, scope, EmailLogRecord{
		AgreementID:   agreement.ID,
		TemplateCode:  "esign.sign_request",
		Status:        "queued",
		AttemptCount:  1,
		MaxAttempts:   3,
		CorrelationID: "corr-1",
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err != nil {
		t.Fatalf("CreateEmailLog: %v", err)
	}
	nextRetry := now.Add(10 * time.Second)
	log, err = store.UpdateEmailLog(ctx, scope, log.ID, EmailLogRecord{
		Status:        JobRunStatusRetrying,
		FailureReason: "provider timeout",
		AttemptCount:  1,
		MaxAttempts:   3,
		NextRetryAt:   &nextRetry,
		UpdatedAt:     now.Add(2 * time.Second),
	})
	if err != nil {
		t.Fatalf("UpdateEmailLog retrying: %v", err)
	}
	if log.Status != JobRunStatusRetrying || log.NextRetryAt == nil {
		t.Fatalf("expected retrying state persisted, got %+v", log)
	}
	sentAt := now.Add(20 * time.Second)
	log, err = store.UpdateEmailLog(ctx, scope, log.ID, EmailLogRecord{
		Status:            "sent",
		ProviderMessageID: "provider-1",
		SentAt:            &sentAt,
		AttemptCount:      2,
		MaxAttempts:       3,
		UpdatedAt:         sentAt,
	})
	if err != nil {
		t.Fatalf("UpdateEmailLog sent: %v", err)
	}
	if log.Status != "sent" || log.ProviderMessageID != "provider-1" || log.NextRetryAt != nil {
		t.Fatalf("expected sent state persisted, got %+v", log)
	}
}
