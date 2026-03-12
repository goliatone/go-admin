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

	if len(provider.inputs) != 1 {
		t.Fatalf("expected 1 outbound email, got %d", len(provider.inputs))
	}
	if provider.inputs[0].Recipient.ID != signerOne.ID {
		t.Fatalf("expected recipient %q, got %q", signerOne.ID, provider.inputs[0].Recipient.ID)
	}
	if provider.inputs[0].Notification != string(services.NotificationSigningInvitation) {
		t.Fatalf("expected invitation notification type, got %q", provider.inputs[0].Notification)
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
	if _, err := store.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		Topic:       services.NotificationOutboxTopicEmailSendSigningRequest,
		PayloadJSON: string(payloadJSON),
		AvailableAt: dispatcher.now(),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}

	dispatcher.dispatchScope(context.Background(), scope)

	if len(provider.inputs) != 1 {
		t.Fatalf("expected 1 outbound email after dispatch, got %d", len(provider.inputs))
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
