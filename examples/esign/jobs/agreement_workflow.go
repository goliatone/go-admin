package jobs

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AgreementWorkflow bridges agreement lifecycle hooks to e-sign job handlers.
type AgreementWorkflow struct {
	handlers Handlers
}

// NewAgreementWorkflow builds a lifecycle workflow backed by job handlers.
func NewAgreementWorkflow(handlers Handlers) AgreementWorkflow {
	return AgreementWorkflow{handlers: handlers}
}

// OnAgreementSent dispatches the initial signing-request email to the active signer.
func (w AgreementWorkflow) OnAgreementSent(ctx context.Context, scope stores.Scope, notification services.AgreementNotification) error {
	if w.handlers.agreements == nil {
		return nil
	}
	agreementID := strings.TrimSpace(notification.AgreementID)
	recipientID := strings.TrimSpace(notification.RecipientID)
	if agreementID == "" {
		return nil
	}
	if recipientID == "" {
		recipients, err := w.handlers.agreements.ListRecipients(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		recipient, ok := firstActiveSigner(recipients)
		if !ok {
			return nil
		}
		recipientID = recipient.ID
	}
	notificationType := notification.Type
	if strings.TrimSpace(string(notificationType)) == "" {
		notificationType = services.NotificationSigningInvitation
	}
	return w.handlers.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   agreementID,
		RecipientID:   recipientID,
		Notification:  string(notificationType),
		SignerToken:   strings.TrimSpace(notification.Token.Token),
		CorrelationID: strings.TrimSpace(notification.CorrelationID),
		DedupeKey:     notificationDedupeKey(agreementID, recipientID, notificationType, notification.CorrelationID),
	})
}

// OnAgreementResent dispatches a signing-request email for the targeted recipient.
func (w AgreementWorkflow) OnAgreementResent(ctx context.Context, scope stores.Scope, notification services.AgreementNotification) error {
	agreementID := strings.TrimSpace(notification.AgreementID)
	recipientID := strings.TrimSpace(notification.RecipientID)
	if recipientID == "" {
		return nil
	}
	notificationType := notification.Type
	if strings.TrimSpace(string(notificationType)) == "" {
		notificationType = services.NotificationSigningReminder
	}
	return w.handlers.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   agreementID,
		RecipientID:   recipientID,
		Notification:  string(notificationType),
		SignerToken:   strings.TrimSpace(notification.Token.Token),
		CorrelationID: strings.TrimSpace(notification.CorrelationID),
		DedupeKey:     notificationDedupeKey(agreementID, recipientID, notificationType, notification.CorrelationID),
	})
}

// RunCompletionWorkflow forwards completion orchestration to job handlers.
func (w AgreementWorkflow) RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error {
	return w.handlers.RunCompletionWorkflow(ctx, scope, agreementID, correlationID)
}

func firstActiveSigner(recipients []stores.RecipientRecord) (stores.RecipientRecord, bool) {
	var (
		selected stores.RecipientRecord
		found    bool
	)
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.Role) != stores.RecipientRoleSigner {
			continue
		}
		if recipient.CompletedAt != nil || recipient.DeclinedAt != nil {
			continue
		}
		if !found || recipient.SigningOrder < selected.SigningOrder || (recipient.SigningOrder == selected.SigningOrder && recipient.ID < selected.ID) {
			selected = recipient
			found = true
		}
	}
	return selected, found
}

func notificationDedupeKey(agreementID, recipientID string, notificationType services.AgreementNotificationType, correlationID string) string {
	parts := []string{
		strings.TrimSpace(agreementID),
		strings.TrimSpace(recipientID),
		strings.TrimSpace(string(notificationType)),
		strings.TrimSpace(correlationID),
	}
	return strings.Join(parts, "|")
}
