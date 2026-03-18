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

const (
	auditTrailSourceAgreementCreated       = "agreement.created"
	auditTrailSourceAgreementSent          = "agreement.sent"
	auditTrailSourceAgreementResent        = "agreement.resent"
	auditTrailSourceSignerViewed           = "signer.viewed"
	auditTrailSourceSignerSubmitted        = "signer.submitted"
	auditTrailSourceSignerDeclined         = "signer.declined"
	auditTrailSourceAgreementDeclined      = "agreement.declined"
	auditTrailSourceAgreementVoided        = "agreement.voided"
	auditTrailSourceAgreementExpired       = "agreement.expired"
	auditTrailSourceAgreementIncomplete    = "agreement.incomplete"
	auditTrailSourceAgreementCompleted     = "agreement.completed"
	auditTrailSourceCorrectionRequested    = "agreement.correction_requested"
	auditTrailSourceCorrectionDrafted      = "agreement.correction_draft_created"
	auditTrailSourceCorrectedFrom          = "agreement.corrected_from"
	auditTrailSourceSupersededCorrection   = "agreement.superseded_by_correction"
	auditTrailSourceAmendmentRequested     = "agreement.amendment_requested"
	auditTrailSourceAmendmentDrafted       = "agreement.amendment_draft_created"
	auditTrailSourceAmendedFrom            = "agreement.amended_from"
	auditTrailSourceReviewRequested        = "agreement.review_requested"
	auditTrailSourceReviewReopened         = "agreement.review_reopened"
	auditTrailSourceReviewApproved         = "agreement.review_approved"
	auditTrailSourceReviewChangesRequested = "agreement.review_changes_requested"
	auditTrailSourceReviewClosed           = "agreement.review_closed"
	auditTrailSourceCommentThreadCreated   = "agreement.comment_thread_created"
	auditTrailSourceCommentReplied         = "agreement.comment_replied"
	auditTrailSourceCommentResolved        = "agreement.comment_resolved"
	auditTrailSourceCommentReopened        = "agreement.comment_reopened"
)

const (
	auditTrailSourceDerivedLifecycleCreated = "derived.lifecycle.created"
	auditTrailSourceDerivedLifecycleSent    = "derived.lifecycle.sent"
	auditTrailSourceDerivedLifecycleViewed  = "derived.lifecycle.viewed"
	auditTrailSourceDerivedLifecycleSigned  = "derived.lifecycle.signed"
	auditTrailSourceDerivedStatusCompleted  = "derived.status.completed"
	auditTrailSourceDerivedStatusIncomplete = "derived.status.incomplete"
)

type auditTrailLifecycleMarker string

const (
	auditTrailLifecycleMarkerNone    auditTrailLifecycleMarker = ""
	auditTrailLifecycleMarkerCreated auditTrailLifecycleMarker = "created"
	auditTrailLifecycleMarkerSent    auditTrailLifecycleMarker = "sent"
	auditTrailLifecycleMarkerViewed  auditTrailLifecycleMarker = "viewed"
	auditTrailLifecycleMarkerSigned  auditTrailLifecycleMarker = "signed"
)

type auditTrailDescriptionKind string

const (
	auditTrailDescriptionKindCreated                auditTrailDescriptionKind = "created"
	auditTrailDescriptionKindSent                   auditTrailDescriptionKind = "sent"
	auditTrailDescriptionKindViewed                 auditTrailDescriptionKind = "viewed"
	auditTrailDescriptionKindSigned                 auditTrailDescriptionKind = "signed"
	auditTrailDescriptionKindDeclined               auditTrailDescriptionKind = "declined"
	auditTrailDescriptionKindIncomplete             auditTrailDescriptionKind = "incomplete"
	auditTrailDescriptionKindCompleted              auditTrailDescriptionKind = "completed"
	auditTrailDescriptionKindCorrectionRequested    auditTrailDescriptionKind = "correction_requested"
	auditTrailDescriptionKindCorrectionDrafted      auditTrailDescriptionKind = "correction_drafted"
	auditTrailDescriptionKindCorrectedFrom          auditTrailDescriptionKind = "corrected_from"
	auditTrailDescriptionKindSuperseded             auditTrailDescriptionKind = "superseded"
	auditTrailDescriptionKindAmendmentRequested     auditTrailDescriptionKind = "amendment_requested"
	auditTrailDescriptionKindAmendmentDrafted       auditTrailDescriptionKind = "amendment_drafted"
	auditTrailDescriptionKindAmendedFrom            auditTrailDescriptionKind = "amended_from"
	auditTrailDescriptionKindReviewRequested        auditTrailDescriptionKind = "review_requested"
	auditTrailDescriptionKindReviewReopened         auditTrailDescriptionKind = "review_reopened"
	auditTrailDescriptionKindReviewApproved         auditTrailDescriptionKind = "review_approved"
	auditTrailDescriptionKindReviewChangesRequested auditTrailDescriptionKind = "review_changes_requested"
	auditTrailDescriptionKindReviewClosed           auditTrailDescriptionKind = "review_closed"
	auditTrailDescriptionKindCommentCreated         auditTrailDescriptionKind = "comment_created"
	auditTrailDescriptionKindCommentReplied         auditTrailDescriptionKind = "comment_replied"
	auditTrailDescriptionKindCommentResolved        auditTrailDescriptionKind = "comment_resolved"
	auditTrailDescriptionKindCommentReopened        auditTrailDescriptionKind = "comment_reopened"
)

type auditTrailSourceEventPolicy struct {
	EventType         string                    `json:"event_type"`
	Severity          string                    `json:"severity"`
	ShowIPAddress     bool                      `json:"show_ip_address"`
	UseNearestActorIP bool                      `json:"use_nearest_actor_ip"`
	LifecycleMarker   auditTrailLifecycleMarker `json:"lifecycle_marker"`
	DescriptionKind   auditTrailDescriptionKind `json:"description_kind"`
}

var auditTrailSourceEventPolicies = map[string]auditTrailSourceEventPolicy{
	auditTrailSourceAgreementCreated: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		LifecycleMarker: auditTrailLifecycleMarkerCreated,
		DescriptionKind: auditTrailDescriptionKindCreated,
	},
	auditTrailSourceAgreementSent: {
		EventType:       AuditTrailEventSent,
		Severity:        "normal",
		ShowIPAddress:   false,
		LifecycleMarker: auditTrailLifecycleMarkerSent,
		DescriptionKind: auditTrailDescriptionKindSent,
	},
	auditTrailSourceAgreementResent: {
		EventType:       AuditTrailEventSent,
		Severity:        "normal",
		ShowIPAddress:   false,
		LifecycleMarker: auditTrailLifecycleMarkerSent,
		DescriptionKind: auditTrailDescriptionKindSent,
	},
	auditTrailSourceSignerViewed: {
		EventType:         AuditTrailEventViewed,
		Severity:          "normal",
		ShowIPAddress:     true,
		UseNearestActorIP: true,
		LifecycleMarker:   auditTrailLifecycleMarkerViewed,
		DescriptionKind:   auditTrailDescriptionKindViewed,
	},
	auditTrailSourceSignerSubmitted: {
		EventType:         AuditTrailEventSigned,
		Severity:          "normal",
		ShowIPAddress:     true,
		UseNearestActorIP: true,
		LifecycleMarker:   auditTrailLifecycleMarkerSigned,
		DescriptionKind:   auditTrailDescriptionKindSigned,
	},
	auditTrailSourceSignerDeclined: {
		EventType:         AuditTrailEventDeclined,
		Severity:          "warning",
		ShowIPAddress:     true,
		UseNearestActorIP: true,
		DescriptionKind:   auditTrailDescriptionKindDeclined,
	},
	auditTrailSourceAgreementDeclined: {
		EventType:       AuditTrailEventDeclined,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindDeclined,
	},
	auditTrailSourceAgreementVoided: {
		EventType:       AuditTrailEventIncomplete,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindIncomplete,
	},
	auditTrailSourceAgreementExpired: {
		EventType:       AuditTrailEventIncomplete,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindIncomplete,
	},
	auditTrailSourceAgreementIncomplete: {
		EventType:       AuditTrailEventIncomplete,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindIncomplete,
	},
	auditTrailSourceAgreementCompleted: {
		EventType:       AuditTrailEventCompleted,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCompleted,
	},
	auditTrailSourceCorrectionRequested: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCorrectionRequested,
	},
	auditTrailSourceCorrectionDrafted: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCorrectionDrafted,
	},
	auditTrailSourceCorrectedFrom: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCorrectedFrom,
	},
	auditTrailSourceSupersededCorrection: {
		EventType:       AuditTrailEventIncomplete,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindSuperseded,
	},
	auditTrailSourceAmendmentRequested: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindAmendmentRequested,
	},
	auditTrailSourceAmendmentDrafted: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindAmendmentDrafted,
	},
	auditTrailSourceAmendedFrom: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindAmendedFrom,
	},
	auditTrailSourceReviewRequested: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindReviewRequested,
	},
	auditTrailSourceReviewReopened: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindReviewReopened,
	},
	auditTrailSourceReviewApproved: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindReviewApproved,
	},
	auditTrailSourceReviewChangesRequested: {
		EventType:       AuditTrailEventCreated,
		Severity:        "warning",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindReviewChangesRequested,
	},
	auditTrailSourceReviewClosed: {
		EventType:       AuditTrailEventIncomplete,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindReviewClosed,
	},
	auditTrailSourceCommentThreadCreated: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCommentCreated,
	},
	auditTrailSourceCommentReplied: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCommentReplied,
	},
	auditTrailSourceCommentResolved: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCommentResolved,
	},
	auditTrailSourceCommentReopened: {
		EventType:       AuditTrailEventCreated,
		Severity:        "normal",
		ShowIPAddress:   false,
		DescriptionKind: auditTrailDescriptionKindCommentReopened,
	},
}

type auditTrailDerivedEventPolicy struct {
	EventType     string `json:"event_type"`
	Severity      string `json:"severity"`
	ShowIPAddress bool   `json:"show_ip_address"`
}

var auditTrailDerivedEventPolicies = map[string]auditTrailDerivedEventPolicy{
	auditTrailSourceDerivedLifecycleCreated: {
		EventType:     AuditTrailEventCreated,
		Severity:      "normal",
		ShowIPAddress: false,
	},
	auditTrailSourceDerivedLifecycleSent: {
		EventType:     AuditTrailEventSent,
		Severity:      "normal",
		ShowIPAddress: false,
	},
	auditTrailSourceDerivedLifecycleViewed: {
		EventType:     AuditTrailEventViewed,
		Severity:      "normal",
		ShowIPAddress: true,
	},
	auditTrailSourceDerivedLifecycleSigned: {
		EventType:     AuditTrailEventSigned,
		Severity:      "normal",
		ShowIPAddress: true,
	},
	auditTrailSourceDerivedStatusCompleted: {
		EventType:     AuditTrailEventCompleted,
		Severity:      "normal",
		ShowIPAddress: false,
	},
	auditTrailSourceDerivedStatusIncomplete: {
		EventType:     AuditTrailEventIncomplete,
		Severity:      "warning",
		ShowIPAddress: false,
	},
}

// AuditTrailEntry is a normalized timeline event used by executed/certificate renderers.
type AuditTrailEntry struct {
	EventType     string    `json:"event_type"`
	Timestamp     time.Time `json:"timestamp"`
	ActorName     string    `json:"actor_name"`
	ActorEmail    string    `json:"actor_email"`
	IPAddress     string    `json:"ip_address"`
	ShowIPAddress bool      `json:"show_ip_address"`
	Description   string    `json:"description"`
	Severity      string    `json:"severity"`
	SourceEvent   string    `json:"source_event"`
	SourceEventID string    `json:"source_event_id"`
}

// AuditTrailDocument provides a canonical render model for timeline-based audit artifacts.
type AuditTrailDocument struct {
	AgreementID          string            `json:"agreement_id"`
	Title                string            `json:"title"`
	FileName             string            `json:"file_name"`
	DocumentID           string            `json:"document_id"`
	DocumentHash         string            `json:"document_hash"`
	Status               string            `json:"status"`
	GeneratedAt          time.Time         `json:"generated_at"`
	ExecutedSHA256       string            `json:"executed_sha256"`
	CorrelationID        string            `json:"correlation_id"`
	RootAgreementID      string            `json:"root_agreement_id"`
	ParentAgreementID    string            `json:"parent_agreement_id"`
	ParentExecutedSHA256 string            `json:"parent_executed_sha256"`
	Entries              []AuditTrailEntry `json:"entries"`
}

// AuditTrailBuildInput carries source entities required to construct a normalized audit trail.
type AuditTrailBuildInput struct {
	Agreement            stores.AgreementRecord    `json:"agreement"`
	Recipients           []stores.RecipientRecord  `json:"recipients"`
	Events               []stores.AuditEventRecord `json:"events"`
	GeneratedAt          time.Time                 `json:"generated_at"`
	DocumentID           string                    `json:"document_id"`
	DocumentTitle        string                    `json:"document_title"`
	DocumentOriginalName string                    `json:"document_original_name"`
	DocumentHash         string                    `json:"document_hash"`
	ExecutedSHA256       string                    `json:"executed_sha256"`
	CorrelationID        string                    `json:"correlation_id"`
	RootAgreementID      string                    `json:"root_agreement_id"`
	ParentAgreementID    string                    `json:"parent_agreement_id"`
	ParentExecutedSHA256 string                    `json:"parent_executed_sha256"`
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
		AgreementID:          strings.TrimSpace(input.Agreement.ID),
		Title:                coalesce(strings.TrimSpace(input.Agreement.Title), strings.TrimSpace(input.DocumentTitle), "Agreement"),
		FileName:             fileName,
		DocumentID:           coalesce(strings.TrimSpace(input.DocumentID), strings.TrimSpace(input.Agreement.DocumentID), strings.TrimSpace(input.Agreement.ID)),
		DocumentHash:         strings.TrimSpace(input.DocumentHash),
		Status:               status,
		GeneratedAt:          now,
		ExecutedSHA256:       strings.TrimSpace(input.ExecutedSHA256),
		CorrelationID:        strings.TrimSpace(input.CorrelationID),
		RootAgreementID:      coalesce(strings.TrimSpace(input.RootAgreementID), strings.TrimSpace(input.Agreement.RootAgreementID)),
		ParentAgreementID:    coalesce(strings.TrimSpace(input.ParentAgreementID), strings.TrimSpace(input.Agreement.ParentAgreementID)),
		ParentExecutedSHA256: coalesce(strings.TrimSpace(input.ParentExecutedSHA256), strings.TrimSpace(input.Agreement.ParentExecutedSHA256)),
		Entries:              entries,
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
	policy, ok := auditTrailPolicyForSourceEvent(eventType)
	if !ok {
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
		ShowIPAddress: policy.ShowIPAddress,
		Severity:      policy.Severity,
		SourceEvent:   eventType,
		SourceEventID: sourceEventID,
		EventType:     policy.EventType,
	}
	if policy.UseNearestActorIP && base.IPAddress == "" && actorID != "" {
		base.IPAddress = actorIPIndex.Nearest(actorID, ts)
	}
	base.Description = buildAuditTrailEventDescription(policy.DescriptionKind, eventType, agreement, signerRecipients, metadata, actorID, base.ActorName, base.ActorEmail)
	if strings.TrimSpace(base.Description) == "" {
		return AuditTrailEntry{}, false
	}

	if eventType == auditTrailSourceAgreementCreated {
		creator := coalesce(
			toMetadataString(metadata, "created_by_user_id", "actor_id", "sender_email", "actor_email"),
			strings.TrimSpace(agreement.CreatedByUserID),
			strings.TrimSpace(actorID),
			"system",
		)
		base.ActorName = creator
		base.ActorEmail = ""
	}
	if eventType == auditTrailSourceAgreementSent || eventType == auditTrailSourceAgreementResent {
		sender := coalesce(toMetadataString(metadata, "sender_email"), strings.TrimSpace(agreement.CreatedByUserID), "system")
		base.ActorName = sender
		base.ActorEmail = ""
	}
	return base, true
}

func auditTrailPolicyForSourceEvent(sourceEvent string) (auditTrailSourceEventPolicy, bool) {
	sourceEvent = strings.TrimSpace(sourceEvent)
	policy, ok := auditTrailSourceEventPolicies[sourceEvent]
	return policy, ok
}

func auditTrailPolicyForDerivedSourceEvent(sourceEvent string) (auditTrailDerivedEventPolicy, bool) {
	sourceEvent = strings.TrimSpace(sourceEvent)
	policy, ok := auditTrailDerivedEventPolicies[sourceEvent]
	return policy, ok
}

func mustAuditTrailPolicyForDerivedSourceEvent(sourceEvent string) auditTrailDerivedEventPolicy {
	policy, ok := auditTrailPolicyForDerivedSourceEvent(sourceEvent)
	if ok {
		return policy
	}
	panic(fmt.Sprintf("missing derived audit trail policy for source event %q", sourceEvent))
}

func buildAuditTrailEventDescription(
	kind auditTrailDescriptionKind,
	sourceEvent string,
	agreement stores.AgreementRecord,
	signerRecipients []stores.RecipientRecord,
	metadata map[string]any,
	actorID, actorName, actorEmail string,
) string {
	switch kind {
	case auditTrailDescriptionKindCreated:
		creator := coalesce(
			toMetadataString(metadata, "created_by_user_id", "actor_id", "sender_email", "actor_email"),
			strings.TrimSpace(agreement.CreatedByUserID),
			strings.TrimSpace(actorID),
			"system",
		)
		return fmt.Sprintf("Created by %s", creator)
	case auditTrailDescriptionKindSent:
		action := "Sent"
		if strings.EqualFold(strings.TrimSpace(sourceEvent), auditTrailSourceAgreementResent) {
			action = "Re-sent"
		}
		sender := coalesce(toMetadataString(metadata, "sender_email"), strings.TrimSpace(agreement.CreatedByUserID), "system")
		return buildAuditTrailSentDescription(action, sender, signerRecipients)
	case auditTrailDescriptionKindViewed:
		return fmt.Sprintf("Viewed by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindSigned:
		return fmt.Sprintf("Signed by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindDeclined:
		reason := strings.TrimSpace(toMetadataString(metadata, "decline_reason"))
		if reason != "" {
			return fmt.Sprintf("Declined by %s. Reason: %s", formatActorIdentity(actorName, actorEmail, actorID), reason)
		}
		return fmt.Sprintf("Declined by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindIncomplete:
		return "This document has not been fully executed by all signers."
	case auditTrailDescriptionKindCompleted:
		return "This document has been fully executed by all signers."
	case auditTrailDescriptionKindCorrectionRequested:
		return fmt.Sprintf("Correction requested by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCorrectionDrafted:
		return fmt.Sprintf("Correction draft created by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCorrectedFrom:
		return fmt.Sprintf("Derived from agreement %s", toMetadataString(metadata, "source_agreement_id", "parent_agreement_id"))
	case auditTrailDescriptionKindSuperseded:
		return fmt.Sprintf("Superseded by correction %s", toMetadataString(metadata, "new_agreement_id", "superseded_by_id"))
	case auditTrailDescriptionKindAmendmentRequested:
		return fmt.Sprintf("Amendment requested by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindAmendmentDrafted:
		return fmt.Sprintf("Amendment draft created by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindAmendedFrom:
		return fmt.Sprintf("Amends agreement %s", toMetadataString(metadata, "source_agreement_id", "parent_agreement_id"))
	case auditTrailDescriptionKindReviewRequested:
		return fmt.Sprintf("Review requested by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindReviewReopened:
		return fmt.Sprintf("Review reopened by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindReviewApproved:
		return fmt.Sprintf("Review approved by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindReviewChangesRequested:
		return fmt.Sprintf("Changes requested by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindReviewClosed:
		return fmt.Sprintf("Review closed by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCommentCreated:
		return fmt.Sprintf("Comment added by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCommentReplied:
		return fmt.Sprintf("Comment replied to by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCommentResolved:
		return fmt.Sprintf("Comment resolved by %s", formatActorIdentity(actorName, actorEmail, actorID))
	case auditTrailDescriptionKindCommentReopened:
		return fmt.Sprintf("Comment reopened by %s", formatActorIdentity(actorName, actorEmail, actorID))
	default:
		return ""
	}
}

type auditTrailSourceMarkers struct {
	HasCreated            bool                `json:"has_created"`
	HasSent               bool                `json:"has_sent"`
	HasViewedWithoutActor bool                `json:"has_viewed_without_actor"`
	HasSignedWithoutActor bool                `json:"has_signed_without_actor"`
	ViewedRecipientIDs    map[string]struct{} `json:"viewed_recipient_i_ds"`
	SignedRecipientIDs    map[string]struct{} `json:"signed_recipient_i_ds"`
}

type auditTrailActorIPPoint struct {
	Timestamp time.Time `json:"timestamp"`
	IPAddress string    `json:"ip_address"`
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
		policy, ok := auditTrailPolicyForSourceEvent(strings.TrimSpace(event.EventType))
		if !ok {
			continue
		}
		switch policy.LifecycleMarker {
		case auditTrailLifecycleMarkerCreated:
			markers.HasCreated = true
		case auditTrailLifecycleMarkerSent:
			markers.HasSent = true
		case auditTrailLifecycleMarkerViewed:
			actorID := strings.TrimSpace(event.ActorID)
			if actorID == "" {
				markers.HasViewedWithoutActor = true
				continue
			}
			markers.ViewedRecipientIDs[actorID] = struct{}{}
		case auditTrailLifecycleMarkerSigned:
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
	createdPolicy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedLifecycleCreated)
	sentPolicy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedLifecycleSent)
	viewedPolicy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedLifecycleViewed)
	signedPolicy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedLifecycleSigned)

	if !markers.HasCreated && !agreement.CreatedAt.IsZero() {
		createdAt := agreement.CreatedAt.UTC()
		entries = append(entries, AuditTrailEntry{
			EventType:     createdPolicy.EventType,
			Timestamp:     createdAt,
			ActorName:     creator,
			IPAddress:     actorIPIndex.Nearest(strings.TrimSpace(agreement.CreatedByUserID), createdAt),
			ShowIPAddress: createdPolicy.ShowIPAddress,
			Description:   fmt.Sprintf("Created by %s", creator),
			Severity:      createdPolicy.Severity,
			SourceEvent:   auditTrailSourceDerivedLifecycleCreated,
			SourceEventID: "derived.created",
		})
	}
	if !markers.HasSent && agreement.SentAt != nil && !agreement.SentAt.IsZero() {
		sentAt := agreement.SentAt.UTC()
		entries = append(entries, AuditTrailEntry{
			EventType:     sentPolicy.EventType,
			Timestamp:     sentAt,
			ActorName:     creator,
			IPAddress:     actorIPIndex.Nearest(strings.TrimSpace(agreement.CreatedByUserID), sentAt),
			ShowIPAddress: sentPolicy.ShowIPAddress,
			Description:   buildAuditTrailSentDescription("Sent", creator, signerRecipients),
			Severity:      sentPolicy.Severity,
			SourceEvent:   auditTrailSourceDerivedLifecycleSent,
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
				EventType:     viewedPolicy.EventType,
				Timestamp:     viewedAtUTC,
				ActorName:     strings.TrimSpace(recipient.Name),
				ActorEmail:    strings.TrimSpace(recipient.Email),
				IPAddress:     actorIPIndex.Nearest(recipientID, viewedAtUTC),
				ShowIPAddress: viewedPolicy.ShowIPAddress,
				Description:   fmt.Sprintf("Viewed by %s", formatActorIdentity(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.Email), recipientID)),
				Severity:      viewedPolicy.Severity,
				SourceEvent:   auditTrailSourceDerivedLifecycleViewed,
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
				EventType:     signedPolicy.EventType,
				Timestamp:     completedAt,
				ActorName:     strings.TrimSpace(recipient.Name),
				ActorEmail:    strings.TrimSpace(recipient.Email),
				IPAddress:     actorIPIndex.Nearest(recipientID, completedAt),
				ShowIPAddress: signedPolicy.ShowIPAddress,
				Description:   fmt.Sprintf("Signed by %s", formatActorIdentity(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.Email), recipientID)),
				Severity:      signedPolicy.Severity,
				SourceEvent:   auditTrailSourceDerivedLifecycleSigned,
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
		policy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedStatusCompleted)
		return &AuditTrailEntry{
			EventType:     policy.EventType,
			Timestamp:     timestamp,
			Description:   "This document has been fully executed by all signers.",
			Severity:      policy.Severity,
			ShowIPAddress: policy.ShowIPAddress,
			SourceEvent:   auditTrailSourceDerivedStatusCompleted,
			SourceEventID: "derived.completed",
		}
	case stores.AgreementStatusDeclined, stores.AgreementStatusVoided, stores.AgreementStatusExpired:
		policy := mustAuditTrailPolicyForDerivedSourceEvent(auditTrailSourceDerivedStatusIncomplete)
		return &AuditTrailEntry{
			EventType:     policy.EventType,
			Timestamp:     timestamp,
			Description:   "This document has not been fully executed by all signers.",
			Severity:      policy.Severity,
			ShowIPAddress: policy.ShowIPAddress,
			SourceEvent:   auditTrailSourceDerivedStatusIncomplete,
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
