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
	AuditTrailEventCreated    = "CREATED"
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
	ShowIPAddress bool
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
	Agreement            stores.AgreementRecord
	Recipients           []stores.RecipientRecord
	Events               []stores.AuditEventRecord
	GeneratedAt          time.Time
	DocumentID           string
	DocumentTitle        string
	DocumentOriginalName string
	DocumentHash         string
	ExecutedSHA256       string
	CorrelationID        string
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

	actorIPIndex := buildAuditTrailActorIPIndex(input.Events)
	entries := make([]AuditTrailEntry, 0, len(input.Events)+1)
	for idx, event := range input.Events {
		entry, ok := normalizeAuditTrailEntry(event, idx, now, input.Agreement, recipientsByID, signerRecipients, actorIPIndex)
		if !ok {
			continue
		}
		entries = append(entries, entry)
	}
	sourceMarkers := collectAuditTrailSourceMarkers(input.Events)
	entries = append(entries, deriveLifecycleAuditTrailEntries(input.Agreement, signerRecipients, sourceMarkers, actorIPIndex)...)

	terminal := buildTerminalAuditTrailEntry(input.Agreement, now)
	if terminal != nil && !auditTrailContainsEventType(entries, terminal.EventType) {
		entries = append(entries, *terminal)
	}

	sort.SliceStable(entries, func(i, j int) bool {
		leftDerived := strings.HasPrefix(strings.TrimSpace(entries[i].SourceEvent), "derived.status.")
		rightDerived := strings.HasPrefix(strings.TrimSpace(entries[j].SourceEvent), "derived.status.")
		if leftDerived != rightDerived {
			return !leftDerived
		}
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

	fileName := strings.TrimSpace(path.Base(strings.TrimSpace(input.DocumentOriginalName)))
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
	actorIPIndex auditTrailActorIPIndex,
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
		IPAddress:     ResolveAuditEventIPAddress(event, metadata),
		ShowIPAddress: false,
		Severity:      "normal",
		SourceEvent:   eventType,
		SourceEventID: sourceEventID,
	}

	switch eventType {
	case "agreement.created":
		creator := coalesce(
			toMetadataString(metadata, "created_by_user_id", "actor_id", "sender_email", "actor_email"),
			strings.TrimSpace(agreement.CreatedByUserID),
			strings.TrimSpace(actorID),
			"system",
		)
		base.EventType = AuditTrailEventCreated
		base.Description = fmt.Sprintf("Created by %s", creator)
		base.ActorName = creator
		base.ActorEmail = ""
		return base, true
	case "agreement.sent", "agreement.resent":
		sender := coalesce(toMetadataString(metadata, "sender_email"), strings.TrimSpace(agreement.CreatedByUserID), "system")
		action := "Sent"
		if eventType == "agreement.resent" {
			action = "Re-sent"
		}
		base.EventType = AuditTrailEventSent
		base.Description = buildAuditTrailSentDescription(action, sender, signerRecipients)
		base.ActorName = sender
		base.ActorEmail = ""
		return base, true
	case "signer.viewed":
		if base.IPAddress == "" && actorID != "" {
			base.IPAddress = actorIPIndex.Nearest(actorID, ts)
		}
		base.ShowIPAddress = true
		base.EventType = AuditTrailEventViewed
		base.Description = fmt.Sprintf("Viewed by %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID))
		return base, true
	case "signer.submitted":
		if base.IPAddress == "" && actorID != "" {
			base.IPAddress = actorIPIndex.Nearest(actorID, ts)
		}
		base.ShowIPAddress = true
		base.EventType = AuditTrailEventSigned
		base.Description = fmt.Sprintf("Signed by %s", formatActorIdentity(base.ActorName, base.ActorEmail, actorID))
		return base, true
	case "signer.declined", "agreement.declined":
		if strings.EqualFold(eventType, "signer.declined") {
			if base.IPAddress == "" && actorID != "" {
				base.IPAddress = actorIPIndex.Nearest(actorID, ts)
			}
			base.ShowIPAddress = true
		}
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

type auditTrailSourceMarkers struct {
	HasCreated            bool
	HasSent               bool
	HasViewedWithoutActor bool
	HasSignedWithoutActor bool
	ViewedRecipientIDs    map[string]struct{}
	SignedRecipientIDs    map[string]struct{}
}

type auditTrailActorIPPoint struct {
	Timestamp time.Time
	IPAddress string
}

type auditTrailActorIPIndex map[string][]auditTrailActorIPPoint

func buildAuditTrailActorIPIndex(events []stores.AuditEventRecord) auditTrailActorIPIndex {
	index := auditTrailActorIPIndex{}
	for _, event := range events {
		actorID := strings.TrimSpace(event.ActorID)
		if actorID == "" {
			continue
		}
		metadata := parseAuditMetadata(event.MetadataJSON)
		ip := ResolveAuditEventIPAddress(event, metadata)
		if ip == "" {
			continue
		}
		index[actorID] = append(index[actorID], auditTrailActorIPPoint{
			Timestamp: event.CreatedAt.UTC(),
			IPAddress: ip,
		})
	}
	for actorID := range index {
		sort.SliceStable(index[actorID], func(i, j int) bool {
			return index[actorID][i].Timestamp.Before(index[actorID][j].Timestamp)
		})
	}
	return index
}

func (idx auditTrailActorIPIndex) Nearest(actorID string, target time.Time) string {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" || len(idx) == 0 {
		return ""
	}
	events := idx[actorID]
	if len(events) == 0 {
		return ""
	}
	if target.IsZero() {
		return strings.TrimSpace(events[len(events)-1].IPAddress)
	}
	closest := strings.TrimSpace(events[0].IPAddress)
	bestDistance := absDuration(events[0].Timestamp.Sub(target))
	for _, event := range events[1:] {
		distance := absDuration(event.Timestamp.Sub(target))
		if distance < bestDistance {
			closest = strings.TrimSpace(event.IPAddress)
			bestDistance = distance
		}
	}
	return closest
}

func collectAuditTrailSourceMarkers(events []stores.AuditEventRecord) auditTrailSourceMarkers {
	markers := auditTrailSourceMarkers{
		ViewedRecipientIDs: map[string]struct{}{},
		SignedRecipientIDs: map[string]struct{}{},
	}
	for _, event := range events {
		eventType := strings.TrimSpace(event.EventType)
		switch eventType {
		case "agreement.created":
			markers.HasCreated = true
		case "agreement.sent", "agreement.resent":
			markers.HasSent = true
		case "signer.viewed":
			actorID := strings.TrimSpace(event.ActorID)
			if actorID == "" {
				markers.HasViewedWithoutActor = true
				continue
			}
			markers.ViewedRecipientIDs[actorID] = struct{}{}
		case "signer.submitted":
			actorID := strings.TrimSpace(event.ActorID)
			if actorID == "" {
				markers.HasSignedWithoutActor = true
				continue
			}
			markers.SignedRecipientIDs[actorID] = struct{}{}
		}
	}
	return markers
}

func deriveLifecycleAuditTrailEntries(
	agreement stores.AgreementRecord,
	signerRecipients []stores.RecipientRecord,
	markers auditTrailSourceMarkers,
	actorIPIndex auditTrailActorIPIndex,
) []AuditTrailEntry {
	entries := make([]AuditTrailEntry, 0, 2+(len(signerRecipients)*2))
	creator := coalesce(strings.TrimSpace(agreement.CreatedByUserID), "system")

	if !markers.HasCreated && !agreement.CreatedAt.IsZero() {
		createdAt := agreement.CreatedAt.UTC()
		entries = append(entries, AuditTrailEntry{
			EventType:     AuditTrailEventCreated,
			Timestamp:     createdAt,
			ActorName:     creator,
			IPAddress:     actorIPIndex.Nearest(strings.TrimSpace(agreement.CreatedByUserID), createdAt),
			ShowIPAddress: false,
			Description:   fmt.Sprintf("Created by %s", creator),
			Severity:      "normal",
			SourceEvent:   "derived.lifecycle.created",
			SourceEventID: "derived.created",
		})
	}
	if !markers.HasSent && agreement.SentAt != nil && !agreement.SentAt.IsZero() {
		sentAt := agreement.SentAt.UTC()
		entries = append(entries, AuditTrailEntry{
			EventType:     AuditTrailEventSent,
			Timestamp:     sentAt,
			ActorName:     creator,
			IPAddress:     actorIPIndex.Nearest(strings.TrimSpace(agreement.CreatedByUserID), sentAt),
			ShowIPAddress: false,
			Description:   buildAuditTrailSentDescription("Sent", creator, signerRecipients),
			Severity:      "normal",
			SourceEvent:   "derived.lifecycle.sent",
			SourceEventID: "derived.sent",
		})
	}

	if !markers.HasViewedWithoutActor {
		for _, recipient := range signerRecipients {
			recipientID := strings.TrimSpace(recipient.ID)
			if recipientID == "" {
				continue
			}
			if _, seen := markers.ViewedRecipientIDs[recipientID]; seen {
				continue
			}
			viewedAt := recipient.FirstViewAt
			if viewedAt == nil || viewedAt.IsZero() {
				viewedAt = recipient.LastViewAt
			}
			if viewedAt == nil || viewedAt.IsZero() {
				continue
			}
			viewedAtUTC := viewedAt.UTC()
			entries = append(entries, AuditTrailEntry{
				EventType:     AuditTrailEventViewed,
				Timestamp:     viewedAtUTC,
				ActorName:     strings.TrimSpace(recipient.Name),
				ActorEmail:    strings.TrimSpace(recipient.Email),
				IPAddress:     actorIPIndex.Nearest(recipientID, viewedAtUTC),
				ShowIPAddress: true,
				Description:   fmt.Sprintf("Viewed by %s", formatActorIdentity(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.Email), recipientID)),
				Severity:      "normal",
				SourceEvent:   "derived.lifecycle.viewed",
				SourceEventID: "derived.viewed." + recipientID,
			})
		}
	}

	if !markers.HasSignedWithoutActor {
		for _, recipient := range signerRecipients {
			recipientID := strings.TrimSpace(recipient.ID)
			if recipientID == "" {
				continue
			}
			if _, seen := markers.SignedRecipientIDs[recipientID]; seen {
				continue
			}
			if recipient.CompletedAt == nil || recipient.CompletedAt.IsZero() {
				continue
			}
			completedAt := recipient.CompletedAt.UTC()
			entries = append(entries, AuditTrailEntry{
				EventType:     AuditTrailEventSigned,
				Timestamp:     completedAt,
				ActorName:     strings.TrimSpace(recipient.Name),
				ActorEmail:    strings.TrimSpace(recipient.Email),
				IPAddress:     actorIPIndex.Nearest(recipientID, completedAt),
				ShowIPAddress: true,
				Description:   fmt.Sprintf("Signed by %s", formatActorIdentity(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.Email), recipientID)),
				Severity:      "normal",
				SourceEvent:   "derived.lifecycle.signed",
				SourceEventID: "derived.signed." + recipientID,
			})
		}
	}

	return entries
}

func absDuration(value time.Duration) time.Duration {
	if value < 0 {
		return -value
	}
	return value
}

func buildAuditTrailSentDescription(action, sender string, signerRecipients []stores.RecipientRecord) string {
	action = strings.TrimSpace(action)
	if action == "" {
		action = "Sent"
	}
	sender = strings.TrimSpace(sender)
	if sender == "" {
		sender = "system"
	}
	recipients := make([]string, 0, len(signerRecipients))
	for _, signer := range signerRecipients {
		name := coalesce(strings.TrimSpace(signer.Name), strings.TrimSpace(signer.ID))
		recipients = append(recipients, fmt.Sprintf("%s (%s)", name, strings.TrimSpace(signer.Email)))
	}
	joinedRecipients := "no recipients"
	if len(recipients) > 0 {
		joinedRecipients = strings.Join(recipients, ", ")
	}
	return fmt.Sprintf("%s for signature to %s from %s", action, joinedRecipients, sender)
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
