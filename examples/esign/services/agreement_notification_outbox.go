package services

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

const (
	NotificationOutboxTopicEmailSendSigningRequest = "esign.email.send_signing_request"

	AgreementSendNotificationFailedAuditEvent   = "agreement.send_notification_failed"
	AgreementResendNotificationFailedAuditEvent = "agreement.resend_notification_failed"
)

// EmailSendSigningRequestOutboxPayload captures the durable notification dispatch payload.
type EmailSendSigningRequestOutboxPayload struct {
	AgreementID       string `json:"agreement_id"`
	RecipientID       string `json:"recipient_id"`
	Notification      string `json:"notification"`
	SignerToken       string `json:"signer_token,omitempty"`
	CorrelationID     string `json:"correlation_id,omitempty"`
	DedupeKey         string `json:"dedupe_key,omitempty"`
	MaxAttempts       int    `json:"max_attempts,omitempty"`
	FailureAuditEvent string `json:"failure_audit_event,omitempty"`
}

func buildEmailNotificationOutboxRecord(
	scope stores.Scope,
	notification AgreementNotification,
	failureAuditEvent string,
	now time.Time,
) (stores.OutboxMessageRecord, error) {
	dedupeKey := strings.Join([]string{
		strings.TrimSpace(notification.AgreementID),
		strings.TrimSpace(notification.RecipientID),
		strings.TrimSpace(string(notification.Type)),
		strings.TrimSpace(notification.CorrelationID),
	}, "|")
	payload := EmailSendSigningRequestOutboxPayload{
		AgreementID:       strings.TrimSpace(notification.AgreementID),
		RecipientID:       strings.TrimSpace(notification.RecipientID),
		Notification:      strings.TrimSpace(string(notification.Type)),
		SignerToken:       strings.TrimSpace(notification.Token.Token),
		CorrelationID:     strings.TrimSpace(notification.CorrelationID),
		DedupeKey:         dedupeKey,
		FailureAuditEvent: strings.TrimSpace(failureAuditEvent),
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	return stores.OutboxMessageRecord{
		ID:            uuid.NewString(),
		TenantID:      strings.TrimSpace(scope.TenantID),
		OrgID:         strings.TrimSpace(scope.OrgID),
		Topic:         NotificationOutboxTopicEmailSendSigningRequest,
		MessageKey:    dedupeKey,
		PayloadJSON:   string(payloadJSON),
		CorrelationID: strings.TrimSpace(notification.CorrelationID),
		AvailableAt:   now.UTC(),
	}, nil
}

func (s AgreementService) enqueueEmailNotificationOutbox(
	ctx context.Context,
	scope stores.Scope,
	notification AgreementNotification,
	failureAuditEvent string,
) error {
	if s.outbox == nil {
		return nil
	}
	record, err := buildEmailNotificationOutboxRecord(scope, notification, failureAuditEvent, s.now())
	if err != nil {
		return err
	}
	_, err = s.outbox.EnqueueOutboxMessage(ctx, scope, record)
	return err
}
