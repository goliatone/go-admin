package services

import (
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestBuildAuditTrailDocumentNormalizesSortsAndAddsCompletedTerminal(t *testing.T) {
	now := time.Date(2026, 3, 5, 12, 0, 0, 0, time.UTC)
	agreementCompletedAt := now.Add(-time.Hour)
	agreement := stores.AgreementRecord{
		ID:          "agreement-1",
		DocumentID:  "doc-1",
		Title:       "Agreement",
		Status:      stores.AgreementStatusCompleted,
		CreatedByUserID: "sender@example.com",
		CompletedAt: &agreementCompletedAt,
		UpdatedAt:   now,
	}
	recipients := []stores.RecipientRecord{
		{ID: "recipient-1", Name: "Signer One", Email: "one@example.com", Role: stores.RecipientRoleSigner, SigningOrder: 1},
		{ID: "recipient-2", Name: "Signer Two", Email: "two@example.com", Role: stores.RecipientRoleSigner, SigningOrder: 2},
	}
	events := []stores.AuditEventRecord{
		{
			ID:        "evt-3",
			EventType: "signer.submitted",
			ActorID:   "recipient-1",
			CreatedAt: now.Add(-40 * time.Minute),
		},
		{
			ID:        "evt-1",
			EventType: "agreement.sent",
			CreatedAt: now.Add(-80 * time.Minute),
		},
		{
			ID:        "evt-2",
			EventType: "signer.viewed",
			ActorID:   "recipient-1",
			IPAddress: "27.34.67.5",
			CreatedAt: now.Add(-50 * time.Minute),
		},
	}

	doc := BuildAuditTrailDocument(AuditTrailBuildInput{
		Agreement:     agreement,
		Recipients:    recipients,
		Events:        events,
		GeneratedAt:   now,
		DocumentID:    "doc-1",
		DocumentTitle: "Agreement Source",
		DocumentKey:   "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		DocumentHash:  strings.Repeat("a", 64),
	})

	if got := doc.FileName; got != "original.pdf" {
		t.Fatalf("expected file name original.pdf, got %q", got)
	}
	if len(doc.Entries) != 4 {
		t.Fatalf("expected 4 normalized entries, got %d", len(doc.Entries))
	}
	if doc.Entries[0].EventType != AuditTrailEventSent {
		t.Fatalf("expected first event SENT, got %+v", doc.Entries[0])
	}
	if !strings.Contains(doc.Entries[0].Description, "Sent for signature to") {
		t.Fatalf("expected SENT description, got %q", doc.Entries[0].Description)
	}
	if doc.Entries[1].EventType != AuditTrailEventViewed {
		t.Fatalf("expected second event VIEWED, got %+v", doc.Entries[1])
	}
	if doc.Entries[2].EventType != AuditTrailEventSigned {
		t.Fatalf("expected third event SIGNED, got %+v", doc.Entries[2])
	}
	if doc.Entries[3].EventType != AuditTrailEventCompleted {
		t.Fatalf("expected terminal COMPLETED event, got %+v", doc.Entries[3])
	}
}

func TestBuildAuditTrailDocumentAddsIncompleteForTerminalNonCompletedStates(t *testing.T) {
	now := time.Date(2026, 3, 5, 12, 0, 0, 0, time.UTC)
	agreement := stores.AgreementRecord{
		ID:         "agreement-2",
		DocumentID: "doc-2",
		Title:      "Agreement 2",
		Status:     stores.AgreementStatusDeclined,
		UpdatedAt:  now,
	}
	doc := BuildAuditTrailDocument(AuditTrailBuildInput{
		Agreement:    agreement,
		GeneratedAt:  now,
		DocumentID:   "doc-2",
		DocumentHash: strings.Repeat("b", 64),
	})

	if len(doc.Entries) != 1 {
		t.Fatalf("expected single terminal entry for declined agreement, got %d", len(doc.Entries))
	}
	entry := doc.Entries[0]
	if entry.EventType != AuditTrailEventIncomplete {
		t.Fatalf("expected INCOMPLETE event, got %+v", entry)
	}
	if entry.Severity != "warning" {
		t.Fatalf("expected warning severity, got %q", entry.Severity)
	}
	if !strings.Contains(entry.Description, "not been fully executed") {
		t.Fatalf("unexpected incomplete description %q", entry.Description)
	}
}

func TestBuildAuditTrailDocumentUsesMetadataAndFallbacks(t *testing.T) {
	now := time.Date(2026, 3, 5, 12, 0, 0, 0, time.UTC)
	agreement := stores.AgreementRecord{
		ID:              "agreement-3",
		Title:           "Agreement 3",
		Status:          stores.AgreementStatusSent,
		CreatedByUserID: "sender-id",
		UpdatedAt:       now,
	}
	doc := BuildAuditTrailDocument(AuditTrailBuildInput{
		Agreement: agreement,
		Events: []stores.AuditEventRecord{{
			ID:           "evt-1",
			EventType:    "agreement.sent",
			MetadataJSON: `{"sender_email":"owner@example.com"}`,
			CreatedAt:    now,
		}},
		DocumentID:    "doc-3",
		DocumentTitle: "Contract",
		GeneratedAt:   now,
	})
	if len(doc.Entries) != 1 {
		t.Fatalf("expected one SENT event, got %d", len(doc.Entries))
	}
	entry := doc.Entries[0]
	if entry.EventType != AuditTrailEventSent {
		t.Fatalf("expected SENT event, got %+v", entry)
	}
	if !strings.Contains(entry.Description, "owner@example.com") {
		t.Fatalf("expected sender email in description, got %q", entry.Description)
	}
}
