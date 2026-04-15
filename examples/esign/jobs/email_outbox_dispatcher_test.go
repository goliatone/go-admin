package jobs

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

func TestEmailOutboxPublisherDispatchesSigningRequest(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	publisher := NewEmailOutboxPublisher(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))

	payloadJSON, err := json.Marshal(services.EmailSendSigningRequestOutboxPayload{
		AgreementID:   agreement.ID,
		RecipientID:   signerOne.ID,
		Notification:  string(services.NotificationSigningInvitation),
		SignerToken:   "token-outbox-1",
		CorrelationID: "corr-outbox-1",
		DedupeKey:     strings.Join([]string{agreement.ID, signerOne.ID, string(services.NotificationSigningInvitation), "corr-outbox-1"}, "|"),
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}

	if err := publisher.PublishOutboxMessage(ctx, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
	}); err != nil {
		t.Fatalf("PublishOutboxMessage: %v", err)
	}

	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound email, got %d", len(inputs))
	}
	if inputs[0].Recipient.ID != signerOne.ID {
		t.Fatalf("expected recipient %q, got %q", signerOne.ID, inputs[0].Recipient.ID)
	}
	if inputs[0].Notification != string(services.NotificationSigningInvitation) {
		t.Fatalf("expected invitation notification type, got %q", inputs[0].Notification)
	}
}

func TestEmailOutboxPublisherDispatchesReviewInvitationForExternalReviewer(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-review", OrgID: "org-review"}
	store := stores.NewInMemoryStore()
	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Review Source",
		ObjectKey:          "tenant/tenant-review/org/org-review/docs/review/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Review Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	summary, err := agreementSvc.OpenReview(ctx, scope, agreement.ID, services.ReviewOpenInput{
		Gate: stores.AgreementReviewGateApproveBeforeSend,
		ReviewParticipants: []services.ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "outside-reviewer@example.com",
				DisplayName:     "Outside Reviewer",
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "user-1",
		ActorType:         "user",
		ActorID:           "user-1",
		CorrelationID:     "review-outbox-corr",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}

	var external stores.AgreementReviewParticipantRecord
	foundExternal := false
	for _, participant := range summary.Participants {
		if strings.TrimSpace(participant.ParticipantType) != stores.AgreementReviewParticipantTypeExternal {
			continue
		}
		external = participant
		foundExternal = true
		break
	}
	if !foundExternal {
		t.Fatalf("expected external participant in %+v", summary.Participants)
	}

	provider := &captureEmailProvider{}
	publisher := NewEmailOutboxPublisher(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))

	payloadJSON, err := json.Marshal(services.EmailSendAgreementNotificationOutboxPayload{
		AgreementID:         agreement.ID,
		ReviewID:            summary.Review.ID,
		ReviewParticipantID: external.ID,
		RecipientEmail:      external.Email,
		RecipientName:       external.DisplayName,
		Notification:        string(services.NotificationReviewInvitation),
		ReviewToken:         "review-token-1",
		CorrelationID:       "review-outbox-corr",
		DedupeKey:           strings.Join([]string{agreement.ID, external.ID, string(services.NotificationReviewInvitation), "review-outbox-corr"}, "|"),
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}

	if err := publisher.PublishOutboxMessage(ctx, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
	}); err != nil {
		t.Fatalf("PublishOutboxMessage: %v", err)
	}

	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound review email, got %d", len(inputs))
	}
	if strings.TrimSpace(inputs[0].Recipient.Email) != external.Email {
		t.Fatalf("expected external reviewer email %q, got %+v", external.Email, inputs[0])
	}
	if inputs[0].Notification != string(services.NotificationReviewInvitation) {
		t.Fatalf("expected review invitation notification type, got %q", inputs[0].Notification)
	}
	if strings.TrimSpace(inputs[0].ReviewURL) == "" {
		t.Fatalf("expected review URL in payload, got %+v", inputs[0])
	}
}

func TestEmailOutboxDispatcherDrainsPendingMessages(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	publisher := NewEmailOutboxPublisher(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))
	dispatcher, err := NewEmailOutboxDispatcher(store, publisher)
	if err != nil {
		t.Fatalf("NewEmailOutboxDispatcher: %v", err)
	}
	defer dispatcher.Close()
	dispatcher.now = func() time.Time { return time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC) }

	payloadJSON, err := json.Marshal(services.EmailSendSigningRequestOutboxPayload{
		AgreementID:   agreement.ID,
		RecipientID:   signerOne.ID,
		Notification:  string(services.NotificationSigningInvitation),
		SignerToken:   "token-outbox-dispatch",
		CorrelationID: "corr-outbox-dispatch",
		DedupeKey:     strings.Join([]string{agreement.ID, signerOne.ID, string(services.NotificationSigningInvitation), "corr-outbox-dispatch"}, "|"),
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}
	if _, enqueueErr := store.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
		AvailableAt: dispatcher.now(),
	}); enqueueErr != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", enqueueErr)
	}

	dispatcher.dispatchScope(context.Background(), scope)

	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound email after dispatch, got %d", len(inputs))
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{
		Topic:  services.NotificationOutboxTopicEmailSendSigningRequest,
		Status: stores.OutboxMessageStatusSucceeded,
	})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 || outbox[0].Status != stores.OutboxMessageStatusSucceeded {
		t.Fatalf("expected succeeded outbox message, got %+v", outbox)
	}
}

func TestEmailOutboxDispatcherNotifyScopeSchedulesDelayedDispatch(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	publisher := NewEmailOutboxPublisher(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))
	dispatcher, err := NewEmailOutboxDispatcher(store, publisher)
	if err != nil {
		t.Fatalf("NewEmailOutboxDispatcher: %v", err)
	}
	defer dispatcher.Close()
	dispatcher.notifyDelay = 5 * time.Millisecond
	dispatcher.now = func() time.Time { return time.Date(2026, 3, 12, 11, 0, 0, 0, time.UTC) }

	payloadJSON, err := json.Marshal(services.EmailSendSigningRequestOutboxPayload{
		AgreementID:   agreement.ID,
		RecipientID:   signerOne.ID,
		Notification:  string(services.NotificationSigningInvitation),
		SignerToken:   "token-outbox-notify",
		CorrelationID: "corr-outbox-notify",
		DedupeKey:     strings.Join([]string{agreement.ID, signerOne.ID, string(services.NotificationSigningInvitation), "corr-outbox-notify"}, "|"),
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}
	if _, err := store.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
		AvailableAt: dispatcher.now(),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}

	dispatcher.NotifyScope(scope)

	deadline := time.Now().Add(500 * time.Millisecond)
	for len(provider.Snapshot()) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected delayed notify to dispatch exactly one email, got %d", len(inputs))
	}
}

func TestEmailOutboxPublisherAppendsFailureAuditOnDispatchError(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	publisher := NewEmailOutboxPublisher(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		Audits:        store,
		EmailProvider: alwaysFailEmailProvider{},
	}))

	payloadJSON, err := json.Marshal(services.EmailSendSigningRequestOutboxPayload{
		AgreementID:       agreement.ID,
		RecipientID:       signerOne.ID,
		Notification:      string(services.NotificationSigningInvitation),
		SignerToken:       "token-outbox-fail",
		CorrelationID:     "corr-outbox-fail",
		DedupeKey:         strings.Join([]string{agreement.ID, signerOne.ID, string(services.NotificationSigningInvitation), "corr-outbox-fail"}, "|"),
		FailureAuditEvent: services.AgreementSendNotificationFailedAuditEvent,
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}

	err = publisher.PublishOutboxMessage(ctx, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
	})
	if err == nil {
		t.Fatal("expected publish failure")
	}

	events, listErr := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if listErr != nil {
		t.Fatalf("ListForAgreement: %v", listErr)
	}
	found := false
	for _, event := range events {
		if event.EventType == services.AgreementSendNotificationFailedAuditEvent {
			found = true
			if !strings.Contains(event.MetadataJSON, "provider permanent error") {
				t.Fatalf("expected provider failure in metadata, got %s", event.MetadataJSON)
			}
		}
	}
	if !found {
		t.Fatalf("expected %s audit event in %+v", services.AgreementSendNotificationFailedAuditEvent, events)
	}
}
