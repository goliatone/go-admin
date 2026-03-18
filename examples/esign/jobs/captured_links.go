package jobs

import (
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

// CapturedRecipientLink stores the signer/completion links emitted by email dispatch.
type CapturedRecipientLink struct {
	Scope               stores.Scope `json:"scope"`
	AgreementID         string       `json:"agreement_id"`
	RecipientID         string       `json:"recipient_id"`
	ReviewParticipantID string       `json:"review_participant_id"`
	RecipientEmail      string       `json:"recipient_email"`
	TemplateCode        string       `json:"template_code"`
	Notification        string       `json:"notification"`
	SignURL             string       `json:"sign_url"`
	ReviewURL           string       `json:"review_url"`
	CompletionURL       string       `json:"completion_url"`
	CorrelationID       string       `json:"correlation_id"`
	CapturedAt          time.Time    `json:"captured_at"`
}

var capturedRecipientLinks = struct {
	mu      sync.RWMutex
	entries []CapturedRecipientLink
}{}

// CaptureRecipientLink records link payloads produced by email providers in-process.
func CaptureRecipientLink(input EmailSendInput) {
	entry := CapturedRecipientLink{
		Scope: stores.Scope{
			TenantID: strings.TrimSpace(input.Scope.TenantID),
			OrgID:    strings.TrimSpace(input.Scope.OrgID),
		},
		AgreementID:    strings.TrimSpace(input.Agreement.ID),
		RecipientID:    strings.TrimSpace(input.Recipient.ID),
		RecipientEmail: strings.TrimSpace(input.Recipient.Email),
		TemplateCode:   strings.TrimSpace(input.TemplateCode),
		Notification:   strings.TrimSpace(input.Notification),
		SignURL:        strings.TrimSpace(input.SignURL),
		ReviewURL:      strings.TrimSpace(input.ReviewURL),
		CompletionURL:  strings.TrimSpace(input.CompletionURL),
		CorrelationID:  strings.TrimSpace(input.CorrelationID),
		CapturedAt:     time.Now().UTC(),
	}
	if entry.SignURL == "" && entry.ReviewURL == "" && entry.CompletionURL == "" {
		return
	}
	capturedRecipientLinks.mu.Lock()
	defer capturedRecipientLinks.mu.Unlock()
	capturedRecipientLinks.entries = append(capturedRecipientLinks.entries, entry)
}

// LookupCapturedRecipientLink resolves the latest captured recipient-link payload.
func LookupCapturedRecipientLink(scope stores.Scope, agreementID, recipientID, notification string) (CapturedRecipientLink, bool) {
	tenantID := strings.TrimSpace(scope.TenantID)
	orgID := strings.TrimSpace(scope.OrgID)
	agreementID = strings.TrimSpace(agreementID)
	recipientID = strings.TrimSpace(recipientID)
	notification = strings.TrimSpace(notification)

	capturedRecipientLinks.mu.RLock()
	defer capturedRecipientLinks.mu.RUnlock()
	for idx := len(capturedRecipientLinks.entries) - 1; idx >= 0; idx-- {
		entry := capturedRecipientLinks.entries[idx]
		if tenantID != "" && entry.Scope.TenantID != tenantID {
			continue
		}
		if orgID != "" && entry.Scope.OrgID != orgID {
			continue
		}
		if agreementID != "" && entry.AgreementID != agreementID {
			continue
		}
		if recipientID != "" && entry.RecipientID != recipientID {
			continue
		}
		if notification != "" && !strings.EqualFold(entry.Notification, notification) {
			continue
		}
		return entry, true
	}
	return CapturedRecipientLink{}, false
}

// ResetCapturedRecipientLinks clears in-process link capture state.
func ResetCapturedRecipientLinks() {
	capturedRecipientLinks.mu.Lock()
	defer capturedRecipientLinks.mu.Unlock()
	capturedRecipientLinks.entries = nil
}
