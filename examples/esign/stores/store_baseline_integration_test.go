package stores

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func phase0BaseTime() time.Time {
	return time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC)
}

func createPhase0Document(t *testing.T, ctx context.Context, store Store, scope Scope, id string, createdAt time.Time) DocumentRecord {
	t.Helper()
	record, err := store.Create(ctx, scope, DocumentRecord{
		ID:                 id,
		Title:              "Phase 0 Document " + id,
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/documents/" + id + ".pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		CreatedAt:          createdAt,
		UpdatedAt:          createdAt,
	})
	if err != nil {
		t.Fatalf("Create document %s: %v", id, err)
	}
	return record
}

func createPhase0Agreement(t *testing.T, ctx context.Context, store Store, scope Scope, id, documentID string, createdAt time.Time) AgreementRecord {
	t.Helper()
	record, err := store.CreateDraft(ctx, scope, AgreementRecord{
		ID:         id,
		DocumentID: documentID,
		Title:      "Phase 0 Agreement " + id,
		Message:    "baseline",
		CreatedAt:  createdAt,
		UpdatedAt:  createdAt,
	})
	if err != nil {
		t.Fatalf("CreateDraft agreement %s: %v", id, err)
	}
	return record
}

func TestInMemoryStorePhase0AgreementLifecycleBaseline(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-phase0", base)

	t.Run("draft-to-sent-to-completed", func(t *testing.T) {
		agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-completed", doc.ID, base.Add(time.Minute))
		sent, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			t.Fatalf("Transition sent: %v", err)
		}
		if sent.Status != AgreementStatusSent || sent.SentAt == nil || sent.Version != 2 {
			t.Fatalf("expected sent agreement version 2 with timestamp, got %+v", sent)
		}
		completed, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusCompleted,
			ExpectedVersion: sent.Version,
		})
		if err != nil {
			t.Fatalf("Transition completed: %v", err)
		}
		if completed.Status != AgreementStatusCompleted || completed.CompletedAt == nil || completed.Version != 3 {
			t.Fatalf("expected completed agreement version 3 with timestamp, got %+v", completed)
		}
	})

	t.Run("draft-to-sent-to-voided", func(t *testing.T) {
		agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-voided", doc.ID, base.Add(2*time.Minute))
		sent, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			t.Fatalf("Transition sent: %v", err)
		}
		voided, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusVoided,
			ExpectedVersion: sent.Version,
		})
		if err != nil {
			t.Fatalf("Transition voided: %v", err)
		}
		if voided.Status != AgreementStatusVoided || voided.VoidedAt == nil || voided.Version != 3 {
			t.Fatalf("expected voided agreement version 3 with timestamp, got %+v", voided)
		}
	})

	t.Run("draft-to-sent-to-declined", func(t *testing.T) {
		agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-declined", doc.ID, base.Add(3*time.Minute))
		sent, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusSent,
			ExpectedVersion: agreement.Version,
		})
		if err != nil {
			t.Fatalf("Transition sent: %v", err)
		}
		declined, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
			ToStatus:        AgreementStatusDeclined,
			ExpectedVersion: sent.Version,
		})
		if err != nil {
			t.Fatalf("Transition declined: %v", err)
		}
		if declined.Status != AgreementStatusDeclined || declined.DeclinedAt == nil || declined.Version != 3 {
			t.Fatalf("expected declined agreement version 3 with timestamp, got %+v", declined)
		}
	})
}

func TestInMemoryStorePhase0SigningTokenIssueRotateRevokeBaseline(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-token", base)
	agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-token", doc.ID, base.Add(time.Minute))

	issued, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		ID:          "token-issued",
		AgreementID: agreement.ID,
		RecipientID: "recipient-1",
		TokenHash:   "hash-issued",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   base.Add(30 * time.Minute),
		CreatedAt:   base.Add(2 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken issued: %v", err)
	}

	revokedCount, err := store.RevokeActiveSigningTokens(ctx, scope, agreement.ID, "recipient-1", base.Add(3*time.Minute))
	if err != nil {
		t.Fatalf("RevokeActiveSigningTokens: %v", err)
	}
	if revokedCount != 1 {
		t.Fatalf("expected 1 revoked token, got %d", revokedCount)
	}

	rotated, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		ID:          "token-rotated",
		AgreementID: agreement.ID,
		RecipientID: "recipient-1",
		TokenHash:   "hash-rotated",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   base.Add(60 * time.Minute),
		CreatedAt:   base.Add(4 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken rotated: %v", err)
	}

	if issued.ID == rotated.ID {
		t.Fatal("expected rotated token to have a new token id")
	}

	fetchedIssued, err := store.GetSigningTokenByHash(ctx, scope, issued.TokenHash)
	if err != nil {
		t.Fatalf("GetSigningTokenByHash issued: %v", err)
	}
	if fetchedIssued.Status != SigningTokenStatusRevoked || fetchedIssued.RevokedAt == nil {
		t.Fatalf("expected issued token revoked, got %+v", fetchedIssued)
	}

	fetchedRotated, err := store.GetSigningTokenByHash(ctx, scope, rotated.TokenHash)
	if err != nil {
		t.Fatalf("GetSigningTokenByHash rotated: %v", err)
	}
	if fetchedRotated.Status != SigningTokenStatusActive || fetchedRotated.RevokedAt != nil {
		t.Fatalf("expected rotated token active, got %+v", fetchedRotated)
	}
}

func TestInMemoryStorePhase0AuditAppendOnlyBaseline(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-audit", base)
	agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-audit", doc.ID, base.Add(time.Minute))

	event, err := store.Append(ctx, scope, AuditEventRecord{
		ID:           "event-1",
		AgreementID:  agreement.ID,
		EventType:    "agreement.created",
		ActorType:    "user",
		ActorID:      "user-1",
		MetadataJSON: `{"source":"phase0"}`,
		CreatedAt:    base.Add(2 * time.Minute),
	})
	if err != nil {
		t.Fatalf("Append: %v", err)
	}

	if err := store.UpdateAuditEvent(ctx, scope, event.ID, event); err == nil {
		t.Fatal("expected append-only update error")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY error, got %v", err)
	}

	if err := store.DeleteAuditEvent(ctx, scope, event.ID); err == nil {
		t.Fatal("expected append-only delete error")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY error, got %v", err)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	if len(events) != 1 || events[0].ID != event.ID {
		t.Fatalf("expected one preserved append-only event, got %+v", events)
	}
}

func TestInMemoryStorePhase0OutboxAndJobRunBaseline(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-jobs", base)
	agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-jobs", doc.ID, base.Add(time.Minute))

	run, shouldRun, err := store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.baseline",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: base.Add(2 * time.Minute),
	})
	if err != nil {
		t.Fatalf("BeginJobRun initial: %v", err)
	}
	if !shouldRun || run.AttemptCount != 1 {
		t.Fatalf("expected first run attempt, got shouldRun=%t run=%+v", shouldRun, run)
	}

	nextRetry := base.Add(3 * time.Minute)
	run, err = store.MarkJobRunFailed(ctx, scope, run.ID, "transient", &nextRetry, base.Add(2*time.Minute))
	if err != nil {
		t.Fatalf("MarkJobRunFailed: %v", err)
	}
	if run.Status != JobRunStatusRetrying || run.NextRetryAt == nil {
		t.Fatalf("expected retrying job run, got %+v", run)
	}

	run, shouldRun, err = store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.baseline",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: base.Add(2*time.Minute + 30*time.Second),
	})
	if err != nil {
		t.Fatalf("BeginJobRun before retry window: %v", err)
	}
	if shouldRun {
		t.Fatalf("expected no-op before retry window, got %+v", run)
	}

	run, shouldRun, err = store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.baseline",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: base.Add(4 * time.Minute),
	})
	if err != nil {
		t.Fatalf("BeginJobRun retry attempt: %v", err)
	}
	if !shouldRun || run.AttemptCount != 2 {
		t.Fatalf("expected second run attempt, got shouldRun=%t run=%+v", shouldRun, run)
	}

	run, err = store.MarkJobRunSucceeded(ctx, scope, run.ID, base.Add(5*time.Minute))
	if err != nil {
		t.Fatalf("MarkJobRunSucceeded: %v", err)
	}
	if run.Status != JobRunStatusSucceeded {
		t.Fatalf("expected succeeded job run, got %+v", run)
	}

	message, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		ID:          "outbox-1",
		Topic:       "email.send",
		MessageKey:  "agreement.sent.recipient-1",
		PayloadJSON: `{"agreement_id":"agreement-jobs"}`,
		MaxAttempts: 2,
		CreatedAt:   base.Add(6 * time.Minute),
		UpdatedAt:   base.Add(6 * time.Minute),
		AvailableAt: base.Add(6 * time.Minute),
	})
	if err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}
	if message.Status != OutboxMessageStatusPending {
		t.Fatalf("expected pending outbox message, got %+v", message)
	}

	claimed, err := store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{Consumer: "worker-a", Now: base.Add(7 * time.Minute), Limit: 10})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages initial: %v", err)
	}
	if len(claimed) != 1 || claimed[0].Status != OutboxMessageStatusProcessing {
		t.Fatalf("expected processing claim, got %+v", claimed)
	}

	outboxRetry := base.Add(9 * time.Minute)
	failed, err := store.MarkOutboxMessageFailed(ctx, scope, message.ID, "provider timeout", &outboxRetry, base.Add(8*time.Minute))
	if err != nil {
		t.Fatalf("MarkOutboxMessageFailed: %v", err)
	}
	if failed.Status != OutboxMessageStatusRetrying || !failed.AvailableAt.Equal(outboxRetry) {
		t.Fatalf("expected retrying outbox state, got %+v", failed)
	}

	claimed, err = store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{Consumer: "worker-a", Now: base.Add(8*time.Minute + 30*time.Second), Limit: 10})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages before retry window: %v", err)
	}
	if len(claimed) != 0 {
		t.Fatalf("expected no outbox claim before retry, got %+v", claimed)
	}

	claimed, err = store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{Consumer: "worker-a", Now: base.Add(10 * time.Minute), Limit: 10})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages second: %v", err)
	}
	if len(claimed) != 1 || claimed[0].AttemptCount != 2 {
		t.Fatalf("expected second claim attempt, got %+v", claimed)
	}

	succeeded, err := store.MarkOutboxMessageSucceeded(ctx, scope, message.ID, base.Add(11*time.Minute))
	if err != nil {
		t.Fatalf("MarkOutboxMessageSucceeded: %v", err)
	}
	if succeeded.Status != OutboxMessageStatusSucceeded || succeeded.PublishedAt == nil {
		t.Fatalf("expected succeeded outbox message, got %+v", succeeded)
	}
}

func TestInMemoryStorePhase0SnapshotRoundTripBaseline(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-restart", base)
	agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-restart", doc.ID, base.Add(time.Minute))

	sent, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
		ToStatus:        AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		t.Fatalf("Transition sent: %v", err)
	}
	completed, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
		ToStatus:        AgreementStatusCompleted,
		ExpectedVersion: sent.Version,
	})
	if err != nil {
		t.Fatalf("Transition completed: %v", err)
	}
	if completed.Status != AgreementStatusCompleted {
		t.Fatalf("expected completed agreement before restart, got %+v", completed)
	}

	if _, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		ID:          "token-restart",
		AgreementID: agreement.ID,
		RecipientID: "recipient-1",
		TokenHash:   "hash-restart",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   base.Add(60 * time.Minute),
		CreatedAt:   base.Add(2 * time.Minute),
	}); err != nil {
		t.Fatalf("CreateSigningToken: %v", err)
	}
	if _, err := store.RevokeActiveSigningTokens(ctx, scope, agreement.ID, "recipient-1", base.Add(3*time.Minute)); err != nil {
		t.Fatalf("RevokeActiveSigningTokens: %v", err)
	}

	if _, err := store.Append(ctx, scope, AuditEventRecord{
		ID:          "event-restart",
		AgreementID: agreement.ID,
		EventType:   "agreement.completed",
		ActorType:   "system",
		ActorID:     "worker-1",
		CreatedAt:   base.Add(4 * time.Minute),
	}); err != nil {
		t.Fatalf("Append audit event: %v", err)
	}

	if _, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		ID:          "outbox-restart",
		Topic:       "email.send",
		MessageKey:  "agreement.completed.recipient-1",
		PayloadJSON: `{"agreement_id":"agreement-restart"}`,
		CreatedAt:   base.Add(5 * time.Minute),
		UpdatedAt:   base.Add(5 * time.Minute),
		AvailableAt: base.Add(5 * time.Minute),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}

	run, shouldRun, err := store.BeginJobRun(ctx, scope, JobRunInput{
		JobName:     "jobs.esign.baseline.restart",
		DedupeKey:   agreement.ID,
		AgreementID: agreement.ID,
		MaxAttempts: 2,
		AttemptedAt: base.Add(6 * time.Minute),
	})
	if err != nil {
		t.Fatalf("BeginJobRun: %v", err)
	}
	if !shouldRun {
		t.Fatalf("expected initial restart-baseline job run to execute, got %+v", run)
	}
	if _, err := store.MarkJobRunSucceeded(ctx, scope, run.ID, base.Add(7*time.Minute)); err != nil {
		t.Fatalf("MarkJobRunSucceeded: %v", err)
	}

	reloaded := reloadInMemoryStoreFromSnapshot(t, store)

	reloadedAgreement, err := reloaded.GetAgreement(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreement after restart: %v", err)
	}
	if reloadedAgreement.Status != AgreementStatusCompleted {
		t.Fatalf("expected completed agreement after restart, got %+v", reloadedAgreement)
	}

	reloadedToken, err := reloaded.GetSigningTokenByHash(ctx, scope, "hash-restart")
	if err != nil {
		t.Fatalf("GetSigningTokenByHash after restart: %v", err)
	}
	if reloadedToken.Status != SigningTokenStatusRevoked {
		t.Fatalf("expected revoked token after restart, got %+v", reloadedToken)
	}

	events, err := reloaded.ListForAgreement(ctx, scope, agreement.ID, AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement after restart: %v", err)
	}
	if len(events) != 1 || events[0].ID != "event-restart" {
		t.Fatalf("expected one persisted audit event after restart, got %+v", events)
	}

	messages, err := reloaded.ListOutboxMessages(ctx, scope, OutboxQuery{})
	if err != nil {
		t.Fatalf("ListOutboxMessages after restart: %v", err)
	}
	if len(messages) != 1 || messages[0].ID != "outbox-restart" {
		t.Fatalf("expected one persisted outbox message after restart, got %+v", messages)
	}

	reloadedRun, err := reloaded.GetJobRunByDedupe(ctx, scope, "jobs.esign.baseline.restart", agreement.ID)
	if err != nil {
		t.Fatalf("GetJobRunByDedupe after restart: %v", err)
	}
	if reloadedRun.Status != JobRunStatusSucceeded {
		t.Fatalf("expected succeeded job run after restart, got %+v", reloadedRun)
	}
}

type phase0FixtureSnapshot struct {
	Documents      []DocumentRecord      `json:"documents"`
	Agreements     []AgreementRecord     `json:"agreements"`
	SigningTokens  []SigningTokenRecord  `json:"signing_tokens"`
	AuditEvents    []AuditEventRecord    `json:"audit_events"`
	OutboxMessages []OutboxMessageRecord `json:"outbox_messages"`
}

func TestInMemoryStorePhase0FixtureSnapshot(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase0", OrgID: "org-phase0"}
	store := NewInMemoryStore()

	base := phase0BaseTime()
	doc := createPhase0Document(t, ctx, store, scope, "doc-fixture", base)
	agreement := createPhase0Agreement(t, ctx, store, scope, "agreement-fixture", doc.ID, base.Add(time.Minute))

	tokenA, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		ID:          "token-fixture-a",
		AgreementID: agreement.ID,
		RecipientID: "recipient-1",
		TokenHash:   "hash-fixture-a",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   base.Add(30 * time.Minute),
		CreatedAt:   base.Add(2 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken token-fixture-a: %v", err)
	}
	tokenB, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		ID:          "token-fixture-b",
		AgreementID: agreement.ID,
		RecipientID: "recipient-2",
		TokenHash:   "hash-fixture-b",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   base.Add(40 * time.Minute),
		CreatedAt:   base.Add(3 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken token-fixture-b: %v", err)
	}

	if _, err := store.Append(ctx, scope, AuditEventRecord{
		ID:           "event-fixture",
		AgreementID:  agreement.ID,
		EventType:    "agreement.created",
		ActorType:    "user",
		ActorID:      "user-fixture",
		MetadataJSON: `{"fixture":true}`,
		CreatedAt:    base.Add(4 * time.Minute),
	}); err != nil {
		t.Fatalf("Append fixture event: %v", err)
	}

	if _, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		ID:          "outbox-fixture",
		Topic:       "email.send",
		MessageKey:  "agreement.created.recipient-1",
		PayloadJSON: `{"agreement_id":"agreement-fixture"}`,
		CreatedAt:   base.Add(5 * time.Minute),
		UpdatedAt:   base.Add(5 * time.Minute),
		AvailableAt: base.Add(5 * time.Minute),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage fixture: %v", err)
	}

	documents, err := store.List(ctx, scope, DocumentQuery{})
	if err != nil {
		t.Fatalf("List documents fixture: %v", err)
	}
	agreements, err := store.ListAgreements(ctx, scope, AgreementQuery{})
	if err != nil {
		t.Fatalf("List agreements fixture: %v", err)
	}
	auditEvents, err := store.ListForAgreement(ctx, scope, agreement.ID, AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement fixture: %v", err)
	}
	outboxMessages, err := store.ListOutboxMessages(ctx, scope, OutboxQuery{})
	if err != nil {
		t.Fatalf("ListOutboxMessages fixture: %v", err)
	}

	fetchedTokenA, err := store.GetSigningTokenByHash(ctx, scope, tokenA.TokenHash)
	if err != nil {
		t.Fatalf("GetSigningTokenByHash token-fixture-a: %v", err)
	}
	fetchedTokenB, err := store.GetSigningTokenByHash(ctx, scope, tokenB.TokenHash)
	if err != nil {
		t.Fatalf("GetSigningTokenByHash token-fixture-b: %v", err)
	}

	snapshot := phase0FixtureSnapshot{
		Documents:      documents,
		Agreements:     agreements,
		SigningTokens:  []SigningTokenRecord{fetchedTokenA, fetchedTokenB},
		AuditEvents:    auditEvents,
		OutboxMessages: outboxMessages,
	}

	actualCanonical := mustCanonicalJSON(t, snapshot)
	goldenPath := filepath.Join("testdata", "store_fixture_snapshot.json")
	if os.Getenv("UPDATE_PHASE0_FIXTURE") == "1" {
		if err := os.MkdirAll(filepath.Dir(goldenPath), 0o755); err != nil {
			t.Fatalf("create fixture snapshot dir: %v", err)
		}
		if err := os.WriteFile(goldenPath, []byte(actualCanonical), 0o644); err != nil {
			t.Fatalf("write fixture snapshot: %v", err)
		}
	}

	expectedBytes, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read fixture snapshot %s: %v", goldenPath, err)
	}
	expectedCanonical := mustCanonicalJSON(t, json.RawMessage(expectedBytes))
	if actualCanonical != expectedCanonical {
		t.Fatalf("phase0 fixture snapshot mismatch\nexpected:\n%s\nactual:\n%s", expectedCanonical, actualCanonical)
	}
}

func mustCanonicalJSON(t *testing.T, value any) string {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal canonical json: %v", err)
	}
	var decoded any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal canonical json: %v", err)
	}
	normalized, err := json.MarshalIndent(decoded, "", "  ")
	if err != nil {
		t.Fatalf("marshal indent canonical json: %v", err)
	}
	return string(normalized) + "\n"
}
