package services

import (
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
	AgreementReviewNotificationFailedAuditEvent = "agreement.review_notification_failed"
)

// EmailSendAgreementNotificationOutboxPayload captures the durable notification dispatch payload.
type EmailSendAgreementNotificationOutboxPayload struct {
	AgreementID         string `json:"agreement_id"`
	ReviewID            string `json:"review_id,omitempty"`
	RecipientID         string `json:"recipient_id,omitempty"`
	ReviewParticipantID string `json:"review_participant_id,omitempty"`
	RecipientEmail      string `json:"recipient_email,omitempty"`
	RecipientName       string `json:"recipient_name,omitempty"`
	EffectID            string `json:"effect_id,omitempty"`
	Notification        string `json:"notification"`
	SignerToken         string `json:"signer_token,omitempty"`
	ReviewToken         string `json:"review_token,omitempty"`
	CorrelationID       string `json:"correlation_id,omitempty"`
	DedupeKey           string `json:"dedupe_key,omitempty"`
	MaxAttempts         int    `json:"max_attempts,omitempty"`
	FailureAuditEvent   string `json:"failure_audit_event,omitempty"`
}

type EmailSendSigningRequestOutboxPayload = EmailSendAgreementNotificationOutboxPayload

func buildEmailNotificationOutboxRecord(
	scope stores.Scope,
	notification AgreementNotification,
	failureAuditEvent string,
	now time.Time,
) (stores.OutboxMessageRecord, error) {
	subjectID := strings.TrimSpace(notification.RecipientID)
	if participantID := strings.TrimSpace(notification.ReviewParticipantID); participantID != "" {
		subjectID = participantID
	}
	dedupeKey := strings.Join([]string{
		strings.TrimSpace(notification.AgreementID),
		subjectID,
		strings.TrimSpace(string(notification.Type)),
		strings.TrimSpace(notification.CorrelationID),
	}, "|")
	payload := EmailSendAgreementNotificationOutboxPayload{
		AgreementID:         strings.TrimSpace(notification.AgreementID),
		ReviewID:            strings.TrimSpace(notification.ReviewID),
		RecipientID:         strings.TrimSpace(notification.RecipientID),
		ReviewParticipantID: strings.TrimSpace(notification.ReviewParticipantID),
		RecipientEmail:      strings.TrimSpace(notification.RecipientEmail),
		RecipientName:       strings.TrimSpace(notification.RecipientName),
		EffectID:            strings.TrimSpace(notification.EffectID),
		Notification:        strings.TrimSpace(string(notification.Type)),
		SignerToken:         strings.TrimSpace(notification.Token.Token),
		ReviewToken:         strings.TrimSpace(notification.ReviewToken.Token),
		CorrelationID:       strings.TrimSpace(notification.CorrelationID),
		DedupeKey:           dedupeKey,
		FailureAuditEvent:   strings.TrimSpace(failureAuditEvent),
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
