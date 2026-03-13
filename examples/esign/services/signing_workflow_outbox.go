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
	SigningWorkflowOutboxTopicStageActivation = "esign.signing.stage_activation"
	SigningWorkflowOutboxTopicCompletion      = "esign.signing.completion"

	SignerStageActivationWorkflowFailedAuditEvent = "signer.stage_activation_workflow_failed"
	SignerCompletionWorkflowFailedAuditEvent      = "signer.completion_workflow_failed"
)

// SigningWorkflowOutboxPayload captures the durable signer post-submit workflow payload.
type SigningWorkflowOutboxPayload struct {
	AgreementID       string   `json:"agreement_id"`
	RecipientID       string   `json:"recipient_id,omitempty"`
	RecipientIDs      []string `json:"recipient_ids,omitempty"`
	CorrelationID     string   `json:"correlation_id,omitempty"`
	FailureAuditEvent string   `json:"failure_audit_event,omitempty"`
}

func buildSigningWorkflowOutboxRecord(
	scope stores.Scope,
	topic string,
	payload SigningWorkflowOutboxPayload,
	now time.Time,
) (stores.OutboxMessageRecord, error) {
	normalizedRecipientIDs := make([]string, 0, len(payload.RecipientIDs))
	for _, recipientID := range payload.RecipientIDs {
		if trimmed := strings.TrimSpace(recipientID); trimmed != "" {
			normalizedRecipientIDs = append(normalizedRecipientIDs, trimmed)
		}
	}
	payload.RecipientIDs = normalizedRecipientIDs
	payload.AgreementID = strings.TrimSpace(payload.AgreementID)
	payload.RecipientID = strings.TrimSpace(payload.RecipientID)
	payload.CorrelationID = strings.TrimSpace(payload.CorrelationID)
	payload.FailureAuditEvent = strings.TrimSpace(payload.FailureAuditEvent)

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}

	keyParts := []string{
		payload.AgreementID,
		payload.RecipientID,
		strings.TrimSpace(topic),
		payload.CorrelationID,
	}
	keyParts = append(keyParts, payload.RecipientIDs...)
	messageKey := strings.Join(keyParts, "|")

	return stores.OutboxMessageRecord{
		ID:            uuid.NewString(),
		TenantID:      strings.TrimSpace(scope.TenantID),
		OrgID:         strings.TrimSpace(scope.OrgID),
		Topic:         strings.TrimSpace(topic),
		MessageKey:    messageKey,
		PayloadJSON:   string(payloadJSON),
		CorrelationID: payload.CorrelationID,
		AvailableAt:   now.UTC(),
	}, nil
}

func (s SigningService) enqueueSigningWorkflowOutbox(
	ctx context.Context,
	scope stores.Scope,
	topic string,
	payload SigningWorkflowOutboxPayload,
) error {
	if s.outbox == nil {
		return nil
	}
	record, err := buildSigningWorkflowOutboxRecord(scope, topic, payload, s.now())
	if err != nil {
		return err
	}
	_, err = s.outbox.EnqueueOutboxMessage(ctx, scope, record)
	return err
}
