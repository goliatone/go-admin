package jobs

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

type captureCompletionWorkflow struct {
	calls        int
	agreementIDs []string
}

func (c *captureCompletionWorkflow) RunCompletionWorkflow(_ context.Context, _ stores.Scope, agreementID, _ string) error {
	c.calls++
	c.agreementIDs = append(c.agreementIDs, agreementID)
	return nil
}

type captureStageWorkflow struct {
	calls         int
	agreementIDs  []string
	recipientSets [][]string
}

func (c *captureStageWorkflow) RunStageActivationWorkflow(_ context.Context, _ stores.Scope, agreementID string, recipientIDs []string, _ string) error {
	c.calls++
	c.agreementIDs = append(c.agreementIDs, agreementID)
	c.recipientSets = append(c.recipientSets, append([]string{}, recipientIDs...))
	return nil
}

func TestSigningWorkflowOutboxPublisherDispatchesCompletionWorkflow(t *testing.T) {
	ctx, scope, _, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	completionFlow := &captureCompletionWorkflow{}
	publisher := NewSigningWorkflowOutboxPublisher(Handlers{}, completionFlow, nil)

	payloadJSON, err := json.Marshal(services.SigningWorkflowOutboxPayload{
		AgreementID:       agreement.ID,
		RecipientID:       signerOne.ID,
		CorrelationID:     "corr-signing-completion-1",
		FailureAuditEvent: services.SignerCompletionWorkflowFailedAuditEvent,
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}

	if err := publisher.PublishOutboxMessage(ctx, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		Topic:       services.SigningWorkflowOutboxTopicCompletion,
		PayloadJSON: string(payloadJSON),
	}); err != nil {
		t.Fatalf("PublishOutboxMessage: %v", err)
	}

	if completionFlow.calls != 1 {
		t.Fatalf("expected completion workflow once, got %d", completionFlow.calls)
	}
	if len(completionFlow.agreementIDs) != 1 || completionFlow.agreementIDs[0] != agreement.ID {
		t.Fatalf("expected completion agreement id %q, got %+v", agreement.ID, completionFlow.agreementIDs)
	}
}

func TestSigningWorkflowOutboxPublisherDispatchesStageActivationWorkflow(t *testing.T) {
	ctx, scope, _, agreement, _, signerTwo := setupSentAgreementForWorkflow(t)
	stageFlow := &captureStageWorkflow{}
	publisher := NewSigningWorkflowOutboxPublisher(Handlers{}, nil, stageFlow)

	payloadJSON, err := json.Marshal(services.SigningWorkflowOutboxPayload{
		AgreementID:       agreement.ID,
		RecipientID:       "completed-recipient-1",
		RecipientIDs:      []string{signerTwo.ID},
		CorrelationID:     "corr-signing-stage-1",
		FailureAuditEvent: services.SignerStageActivationWorkflowFailedAuditEvent,
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}

	if err := publisher.PublishOutboxMessage(ctx, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		Topic:       services.SigningWorkflowOutboxTopicStageActivation,
		PayloadJSON: string(payloadJSON),
	}); err != nil {
		t.Fatalf("PublishOutboxMessage: %v", err)
	}

	if stageFlow.calls != 1 {
		t.Fatalf("expected stage workflow once, got %d", stageFlow.calls)
	}
	if len(stageFlow.recipientSets) != 1 || len(stageFlow.recipientSets[0]) != 1 || stageFlow.recipientSets[0][0] != signerTwo.ID {
		t.Fatalf("expected stage workflow recipients to include %q, got %+v", signerTwo.ID, stageFlow.recipientSets)
	}
}

func TestSigningWorkflowOutboxDispatcherDrainsPendingMessages(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	completionFlow := &captureCompletionWorkflow{}
	publisher := NewSigningWorkflowOutboxPublisher(Handlers{}, completionFlow, nil)
	dispatcher, err := NewSigningWorkflowOutboxDispatcher(store, publisher)
	if err != nil {
		t.Fatalf("NewSigningWorkflowOutboxDispatcher: %v", err)
	}
	defer dispatcher.Close()
	dispatcher.now = func() time.Time { return time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC) }

	payloadJSON, err := json.Marshal(services.SigningWorkflowOutboxPayload{
		AgreementID:       agreement.ID,
		RecipientID:       signerOne.ID,
		CorrelationID:     "corr-signing-dispatch-1",
		FailureAuditEvent: services.SignerCompletionWorkflowFailedAuditEvent,
	})
	if err != nil {
		t.Fatalf("Marshal payload: %v", err)
	}
	if _, err := store.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
		ID:          uuid.NewString(),
		Topic:       services.SigningWorkflowOutboxTopicCompletion,
		PayloadJSON: string(payloadJSON),
		AvailableAt: dispatcher.now(),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}

	dispatcher.dispatchScope(context.Background(), scope)

	if completionFlow.calls != 1 {
		t.Fatalf("expected completion workflow once after dispatch, got %d", completionFlow.calls)
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{
		Topic:  services.SigningWorkflowOutboxTopicCompletion,
		Status: stores.OutboxMessageStatusSucceeded,
	})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 || outbox[0].Status != stores.OutboxMessageStatusSucceeded {
		t.Fatalf("expected succeeded outbox message, got %+v", outbox)
	}
}
