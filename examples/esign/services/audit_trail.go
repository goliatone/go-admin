package services

import (
	"encoding/json"
	"fmt"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	AuditTrailEventSent       = "SENT"
	AuditTrailEventViewed     = "VIEWED"
	AuditTrailEventSigned     = "SIGNED"
	AuditTrailEventDeclined   = "DECLINED"
	AuditTrailEventIncomplete = "INCOMPLETE"
	AuditTrailEventCompleted  = "COMPLETED"
)

// AuditTrailEntry is a normalized timeline event used by executed/certificate renderers.
type AuditTrailEntry struct {
	EventType     string
	Timestamp     time.Time
	ActorName     string
	ActorEmail    string
	IPAddress     string
	Description   string
	Severity      string
	SourceEvent   string
	SourceEventID string
}

// AuditTrailDocument provides a canonical render model for timeline-based audit artifacts.
type AuditTrailDocument struct {
	AgreementID    string
	Title          string
	FileName       string
	DocumentID     string
	DocumentHash   string
	Status         string
	GeneratedAt    time.Time
	ExecutedSHA256 string
	CorrelationID  string
	Entries        []AuditTrailEntry
}

// AuditTrailBuildInput carries source entities required to construct a normalized audit trail.
type AuditTrailBuildInput struct {
	Agreement      stores.AgreementRecord
	Recipients     []stores.RecipientRecord
	Events         []stores.AuditEventRecord
	GeneratedAt    time.Time
	DocumentID     string
	DocumentTitle  string
	DocumentKey    string
	DocumentHash   string
	ExecutedSHA256 string
	CorrelationID  string
}

// BuildAuditTrailDocument maps e-sign agreement/audit data into a deterministic render contract.
func BuildAuditTrailDocument(input AuditTrailBuildInput) AuditTrailDocument {
	now := input.GeneratedAt.UTC()
	if now.IsZero() {
		now = time.Now().UTC()
	}
	recipientsByID := map[string]stores.RecipientRecord{}
	signerRecipients := make([]stores.RecipientRecord, 0)
	for _, recipient := range input.Recipients {
		recipientID := strings.TrimSpace(recipient.ID)
		if recipientID == "" {
			continue
		}
		recipientsByID[recipientID] = recipient
		if strings.EqualFold(strings.TrimSpace(recipient.Role), stores.RecipientRoleSigner) {
			signerRecipients = append(signerRecipients, recipient)
		}
	}
	sort.SliceStable(signerRecipients, func(i, j int) bool {
		if signerRecipients[i].SigningOrder == signerRecipients[j].SigningOrder {
			return strings.TrimSpace(signerRecipients[i].ID) < strings.TrimSpace(signerRecipients[j].ID)
		}
		return signerRecipients[i].SigningOrder < signerRecipients[j].SigningOrder
	})

	entries := make([]AuditTrailEntry, 0, len(input.Events)+1)
	for idx, event := range input.Events {
		entry, ok := normalizeAuditTrailEntry(event, idx, now, input.Agreement, recipientsByID, signerRecipients)
		if !ok {
			continue
		}
		entries = append(entries, entry)
	}

	terminal := buildTerminalAuditTrailEntry(input.Agreement, now)
	if terminal != nil && !auditTrailContainsEventType(entries, terminal.EventType) {
		entries = append(entries, *terminal)
	}

	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].Timestamp.Equal(entries[j].Timestamp) {
			if entries[i].SourceEventID == entries[j].SourceEventID {
				if entries[i].EventType == entries[j].EventType {
					return entries[i].Description < entries[j].Description
				}
				return entries[i].EventType < entries[j].EventType
			}
			return entries[i].SourceEventID < entries[j].SourceEventID
		}
		return entries[i].Timestamp.Before(entries[j].Timestamp)
	})

	fileName := strings.TrimSpace(path.Base(strings.TrimSpace(input.DocumentKey)))
	if fileName == "" || fileName == "." || fileName == "/" {
		title := strings.TrimSpace(input.DocumentTitle)
		if title == "" {
			title = strings.TrimSpace(input.Agreement.Title)
		}
		if title == "" {
			title = "document"
		}
		fileName = title + ".pdf"
	}

	status := strings.ToUpper(strings.TrimSpace(input.Agreement.Status))
	if status == "" {
		status = strings.ToUpper(stores.AgreementStatusDraft)
	}

	return AuditTrailDocument{
		AgreementID:    strings.TrimSpace(input.Agreement.ID),
		Title:          coalesce(strings.TrimSpace(input.Agreement.Title), strings.TrimSpace(input.DocumentTitle), "Agreement"),
		FileName:       fileName,
		DocumentID:     coalesce(strings.TrimSpace(input.DocumentID), strings.TrimSpace(input.Agreement.DocumentID), strings.TrimSpace(input.Agreement.ID)),
		DocumentHash:   strings.TrimSpace(input.DocumentHash),
		Status:         status,
		GeneratedAt:    now,
		ExecutedSHA256: strings.TrimSpace(input.ExecutedSHA256),
		CorrelationID:  strings.TrimSpace(input.CorrelationID),
		Entries:        entries,
	}
}

func normalizeAuditTrailEntry(
	event stores.AuditEventRecord,
	sequence int,
	fallbackAt time.Time,
	agreement stores.AgreementRecord,
	recipientsByID map[string]stores.RecipientRecord,
	signerRecipients []stores.RecipientRecord,
) (AuditTrailEntry, bool) {
	eventType := strings.TrimSpace(event.EventType)
	if eventType == "" {
		return AuditTrailEntry{}, false
	}
	ts := event.CreatedAt.UTC()
	if ts.IsZero() {
		ts = fallbackAt.UTC()
		if ts.IsZero() {
			ts = time.Now().UTC()
		}
	}
	metadata := parseAuditMetadata(event.MetadataJSON)
	actorID := strings.TrimSpace(event.ActorID)
	recipient := recipientsByID[actorID]
	actorName := coalesce(
		strings.TrimSpace(recipient.Name),
		toMetadataString(metadata, "recipient_name", "actor_name", "name"),
	)
	actorEmail := coalesce(
		strings.TrimSpace(recipient.Email),
		toMetadataString(metadata, "recipient_email", "actor_email", "email"),
	)
	sourceEventID := strings.TrimSpace(event.ID)
	if sourceEventID == "" {
		sourceEventID = fmt.Sprintf("event-%06d", sequence)
	}

	base := AuditTrailEntry{
		Timestamp:     ts,
		ActorName:     actorName,
		ActorEmail:    actorEmail,
		IPAddress:     strings.TrimSpace(event.IPAddress),
		Severity:      "normal",
		SourceEvent:   eventType,
		SourceEventID: sourceEventID,
	}

	switch eventType {
	case "agreement.sent":
		sender := coalesce(toMetadataString(metadata, "sender_email"), strings.TrimSpace(agreement.CreatedByUserID), "system")
		recipients := make([]string, 0, len(signerRecipients))
		for _, signer := range signerRecipients {
			name := coalesce(strings.TrimSpace(signer.Name), strings.TrimSpace(signer.ID))
			recipients = append(recipients, fmt.Sprintf("%s (%s)", name, strings.TrimSpace(signer.Email)))
		}
		joinedRecipients := "no recipients"
		if len(recipients) > 0 {
			joinedRecipients = strings.Join(recipients, ", ")
		}
		base.EventType = AuditTrailEventSent
		base.Description = fmt.Sprintf("Sent for signature to %s from %s", joinedRecipients, sender)
		base.ActorName = sender
		base.ActorEmail = ""
		return base, true
	case "signer.viewed":
		base.EventType = AuditTrailEventViewed
		base.Description = fmt.Sprintf("Viewed by %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID))
		return base, true
	case "signer.submitted":
		base.EventType = AuditTrailEventSigned
		base.Description = fmt.Sprintf("Signed by %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID))
		return base, true
	case "signer.declined", "agreement.declined":
		base.EventType = AuditTrailEventDeclined
		reason := strings.TrimSpace(toMetadataString(metadata, "decline_reason"))
		if reason != "" {
			base.Description = fmt.Sprintf("Declined by %s. Reason: %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID), reason)
		} else {
			base.Description = fmt.Sprintf("Declined by %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID))
		}
		base.Severity = "warning"
		return base, true
	case "agreement.voided", "agreement.expired", "agreement.incomplete":
		base.EventType = AuditTrailEventIncomplete
		base.Description = "This document has not been fully executed by all signers."
		base.Severity = "warning"
		return base, true
	case "agreement.completed":
		base.EventType = AuditTrailEventCompleted
		base.Description = "This document has been fully executed by all signers."
		return base, true
	default:
		return AuditTrailEntry{}, false
	}
}

func buildTerminalAuditTrailEntry(agreement stores.AgreementRecord, now time.Time) *AuditTrailEntry {
	status := strings.TrimSpace(agreement.Status)
	timestamp := now
	if agreement.CompletedAt != nil && !agreement.CompletedAt.IsZero() {
		timestamp = agreement.CompletedAt.UTC()
	} else if agreement.UpdatedAt.UTC().After(time.Time{}) {
		timestamp = agreement.UpdatedAt.UTC()
	}
	switch status {
	case stores.AgreementStatusCompleted:
		return &AuditTrailEntry{
			EventType:     AuditTrailEventCompleted,
			Timestamp:     timestamp,
			Description:   "This document has been fully executed by all signers.",
			Severity:      "normal",
			SourceEvent:   "derived.status.completed",
			SourceEventID: "derived.completed",
		}
	case stores.AgreementStatusDeclined, stores.AgreementStatusVoided, stores.AgreementStatusExpired:
		return &AuditTrailEntry{
			EventType:     AuditTrailEventIncomplete,
			Timestamp:     timestamp,
			Description:   "This document has not been fully executed by all signers.",
			Severity:      "warning",
			SourceEvent:   "derived.status.incomplete",
			SourceEventID: "derived.incomplete",
		}
	default:
		return nil
	}
}

func auditTrailContainsEventType(entries []AuditTrailEntry, eventType string) bool {
	eventType = strings.TrimSpace(eventType)
	if eventType == "" {
		return false
	}
	for _, entry := range entries {
		if strings.EqualFold(strings.TrimSpace(entry.EventType), eventType) {
			return true
		}
	}
	return false
}

func parseAuditMetadata(raw string) map[string]any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return nil
	}
	return decoded
}

func toMetadataString(metadata map[string]any, keys ...string) string {
	if len(metadata) == 0 {
		return ""
	}
	for _, key := range keys {
		value := strings.TrimSpace(fmt.Sprint(metadata[strings.TrimSpace(key)]))
		if value == "" || strings.EqualFold(value, "<nil>") {
			continue
		}
		return value
	}
	return ""
}

func formatActorIdentity(name, email, fallback string) string {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	fallback = strings.TrimSpace(fallback)
	if name == "" && email == "" {
		if fallback == "" {
			return "unknown"
		}
		return fallback
	}
	if email == "" {
		return coalesce(name, fallback)
	}
	if name == "" {
		return email
	}
	return fmt.Sprintf("%s (%s)", name, email)
}
