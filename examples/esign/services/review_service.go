package services

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

type ReviewOpenInput struct {
	Gate              string
	CommentsEnabled   bool
	ReviewerIDs       []string
	RequestedByUserID string
	ActorType         string
	ActorID           string
	IPAddress         string
}

type ReviewDecisionInput struct {
	RecipientID string
	ActorType   string
	ActorID     string
	IPAddress   string
}

type ReviewCommentThreadInput struct {
	ReviewID   string
	Visibility string
	AnchorType string
	PageNumber int
	FieldID    string
	AnchorX    float64
	AnchorY    float64
	Body       string
	ActorType  string
	ActorID    string
}

type ReviewCommentReplyInput struct {
	ThreadID  string
	Body      string
	ActorType string
	ActorID   string
}

type ReviewCommentStateInput struct {
	ThreadID  string
	ActorType string
	ActorID   string
}

type ReviewThread struct {
	Thread   stores.AgreementCommentThreadRecord    `json:"thread"`
	Messages []stores.AgreementCommentMessageRecord `json:"messages"`
}

type ReviewSummary struct {
	AgreementID         string                                    `json:"agreement_id"`
	Status              string                                    `json:"status"`
	Gate                string                                    `json:"gate"`
	CommentsEnabled     bool                                      `json:"comments_enabled"`
	Review              *stores.AgreementReviewRecord             `json:"review,omitempty"`
	Participants        []stores.AgreementReviewParticipantRecord `json:"participants,omitempty"`
	OpenThreadCount     int                                       `json:"open_thread_count"`
	ResolvedThreadCount int                                       `json:"resolved_thread_count"`
}

func (s AgreementService) OpenReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOpenInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			return domainValidationError("agreements", "status", "review requires draft agreement")
		}
		reviewerIDs, err := txSvc.validateReviewRecipients(ctx, scope, agreementID, input.ReviewerIDs)
		if err != nil {
			return err
		}
		now := txSvc.now()
		review, err := txSvc.upsertAgreementReview(ctx, scope, agreement, input, stores.AgreementReviewStatusInReview, &now, nil)
		if err != nil {
			return err
		}
		if err := txSvc.replaceReviewParticipants(ctx, scope, review, reviewerIDs, now); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateDraft(ctx, scope, agreementID, stores.AgreementDraftPatch{
			ReviewStatus:    ptrString(stores.AgreementReviewStatusInReview),
			ReviewGate:      ptrString(review.Gate),
			CommentsEnabled: new(input.CommentsEnabled),
		}, agreement.Version); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_requested", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":            review.ID,
			"review_gate":          review.Gate,
			"review_status":        review.Status,
			"comments_enabled":     input.CommentsEnabled,
			"reviewer_ids":         append([]string{}, reviewerIDs...),
			"requested_by_user_id": strings.TrimSpace(input.RequestedByUserID),
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) ReopenReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOpenInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			return domainValidationError("agreements", "status", "review requires draft agreement")
		}
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		reviewerIDs := input.ReviewerIDs
		if len(reviewerIDs) == 0 {
			participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
			if err != nil {
				return err
			}
			for _, participant := range participants {
				reviewerIDs = append(reviewerIDs, participant.RecipientID)
			}
		}
		reviewerIDs, err = txSvc.validateReviewRecipients(ctx, scope, agreementID, reviewerIDs)
		if err != nil {
			return err
		}
		now := txSvc.now()
		if input.Gate == "" {
			input.Gate = review.Gate
		}
		review, err = txSvc.upsertAgreementReview(ctx, scope, agreement, input, stores.AgreementReviewStatusInReview, &now, nil)
		if err != nil {
			return err
		}
		if err := txSvc.replaceReviewParticipants(ctx, scope, review, reviewerIDs, now); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateDraft(ctx, scope, agreementID, stores.AgreementDraftPatch{
			ReviewStatus:    ptrString(stores.AgreementReviewStatusInReview),
			ReviewGate:      ptrString(review.Gate),
			CommentsEnabled: new(input.CommentsEnabled || agreement.CommentsEnabled),
		}, agreement.Version); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_reopened", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":     review.ID,
			"review_gate":   review.Gate,
			"review_status": review.Status,
			"reviewer_ids":  append([]string{}, reviewerIDs...),
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) CloseReview(ctx context.Context, scope stores.Scope, agreementID string, actorType, actorID, ipAddress string) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		now := txSvc.now()
		review.Status = stores.AgreementReviewStatusClosed
		review.ClosedAt = &now
		review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateDraft(ctx, scope, agreementID, stores.AgreementDraftPatch{
			ReviewStatus: ptrString(stores.AgreementReviewStatusClosed),
			ReviewGate:   ptrString(review.Gate),
		}, agreement.Version); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_closed", normalizeReviewActorType(actorType), strings.TrimSpace(actorID), ipAddress, map[string]any{
			"review_id":     review.ID,
			"review_gate":   review.Gate,
			"review_status": review.Status,
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) ApproveReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewDecisionInput) (ReviewSummary, error) {
	return s.applyReviewDecision(ctx, scope, agreementID, input, stores.AgreementReviewDecisionApproved, "agreement.review_approved")
}

func (s AgreementService) RequestReviewChanges(ctx context.Context, scope stores.Scope, agreementID string, input ReviewDecisionInput) (ReviewSummary, error) {
	return s.applyReviewDecision(ctx, scope, agreementID, input, stores.AgreementReviewDecisionChangesRequested, "agreement.review_changes_requested")
}

func (s AgreementService) CreateCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentThreadInput) (ReviewThread, error) {
	var out ReviewThread
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if input.ReviewID != "" && strings.TrimSpace(input.ReviewID) != review.ID {
			return domainValidationError("agreement_comment_threads", "review_id", "review must match agreement")
		}
		if strings.EqualFold(strings.TrimSpace(input.Visibility), stores.AgreementCommentVisibilityInternal) && isRecipientActor(input.ActorType) {
			return reviewVisibilityError()
		}
		thread, err := txSvc.agreements.CreateAgreementCommentThread(ctx, scope, stores.AgreementCommentThreadRecord{
			AgreementID:    agreementID,
			ReviewID:       review.ID,
			Visibility:     input.Visibility,
			AnchorType:     input.AnchorType,
			PageNumber:     input.PageNumber,
			FieldID:        strings.TrimSpace(input.FieldID),
			AnchorX:        input.AnchorX,
			AnchorY:        input.AnchorY,
			Status:         stores.AgreementCommentThreadStatusOpen,
			CreatedByType:  normalizeReviewActorType(input.ActorType),
			CreatedByID:    strings.TrimSpace(input.ActorID),
			LastActivityAt: reviewPtrTime(txSvc.now()),
		})
		if err != nil {
			return err
		}
		message, err := txSvc.agreements.CreateAgreementCommentMessage(ctx, scope, stores.AgreementCommentMessageRecord{
			ThreadID:      thread.ID,
			Body:          strings.TrimSpace(input.Body),
			MessageKind:   stores.AgreementCommentMessageKindComment,
			CreatedByType: normalizeReviewActorType(input.ActorType),
			CreatedByID:   strings.TrimSpace(input.ActorID),
			CreatedAt:     txSvc.now(),
		})
		if err != nil {
			return err
		}
		if err := txSvc.appendAuditEvent(ctx, scope, agreementID, "agreement.comment_thread_created", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), map[string]any{
			"review_id":     review.ID,
			"thread_id":     thread.ID,
			"visibility":    thread.Visibility,
			"anchor_type":   thread.AnchorType,
			"page_number":   thread.PageNumber,
			"field_id":      thread.FieldID,
			"review_status": review.Status,
			"review_gate":   review.Gate,
		}); err != nil {
			return err
		}
		out = ReviewThread{Thread: thread, Messages: []stores.AgreementCommentMessageRecord{message}}
		return nil
	})
	return out, err
}

func (s AgreementService) ReplyCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentReplyInput) (ReviewThread, error) {
	var out ReviewThread
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		thread, err := txSvc.agreements.GetAgreementCommentThread(ctx, scope, input.ThreadID)
		if err != nil {
			return err
		}
		if thread.AgreementID != strings.TrimSpace(agreementID) {
			return domainValidationError("agreement_comment_messages", "thread_id", "thread must belong to agreement")
		}
		if thread.Visibility == stores.AgreementCommentVisibilityInternal && isRecipientActor(input.ActorType) {
			return reviewVisibilityError()
		}
		message, err := txSvc.agreements.CreateAgreementCommentMessage(ctx, scope, stores.AgreementCommentMessageRecord{
			ThreadID:      thread.ID,
			Body:          strings.TrimSpace(input.Body),
			MessageKind:   stores.AgreementCommentMessageKindReply,
			CreatedByType: normalizeReviewActorType(input.ActorType),
			CreatedByID:   strings.TrimSpace(input.ActorID),
			CreatedAt:     txSvc.now(),
		})
		if err != nil {
			return err
		}
		messages, err := txSvc.agreements.ListAgreementCommentMessages(ctx, scope, thread.ID)
		if err != nil {
			return err
		}
		messages = append(messages, message)
		if err := txSvc.appendAuditEvent(ctx, scope, agreementID, "agreement.comment_replied", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), map[string]any{
			"review_id":  thread.ReviewID,
			"thread_id":  thread.ID,
			"visibility": thread.Visibility,
		}); err != nil {
			return err
		}
		out = ReviewThread{Thread: thread, Messages: messages}
		return nil
	})
	return out, err
}

func (s AgreementService) ResolveCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentStateInput) (ReviewThread, error) {
	return s.applyCommentThreadState(ctx, scope, agreementID, input, stores.AgreementCommentThreadStatusResolved, "agreement.comment_resolved")
}

func (s AgreementService) ReopenCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentStateInput) (ReviewThread, error) {
	return s.applyCommentThreadState(ctx, scope, agreementID, input, stores.AgreementCommentThreadStatusOpen, "agreement.comment_reopened")
}

func (s AgreementService) ListReviewThreads(ctx context.Context, scope stores.Scope, agreementID string, visibility string) ([]ReviewThread, error) {
	summary, err := s.GetReviewSummary(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	query := stores.AgreementCommentThreadQuery{
		Visibility: strings.TrimSpace(visibility),
	}
	if summary.Review != nil {
		query.ReviewID = summary.Review.ID
	}
	threads, err := s.agreements.ListAgreementCommentThreads(ctx, scope, agreementID, query)
	if err != nil {
		return nil, err
	}
	out := make([]ReviewThread, 0, len(threads))
	for _, thread := range threads {
		messages, err := s.agreements.ListAgreementCommentMessages(ctx, scope, thread.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, ReviewThread{Thread: thread, Messages: messages})
	}
	return out, nil
}

func (s AgreementService) GetReviewSummary(ctx context.Context, scope stores.Scope, agreementID string) (ReviewSummary, error) {
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return ReviewSummary{}, err
	}
	summary := ReviewSummary{
		AgreementID:     agreementID,
		Status:          strings.TrimSpace(agreement.ReviewStatus),
		Gate:            strings.TrimSpace(agreement.ReviewGate),
		CommentsEnabled: agreement.CommentsEnabled,
	}
	review, err := s.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
	if err != nil {
		if isNotFoundError(err) {
			if summary.Status == "" {
				summary.Status = stores.AgreementReviewStatusNone
			}
			if summary.Gate == "" {
				summary.Gate = stores.AgreementReviewGateNone
			}
			return summary, nil
		}
		return ReviewSummary{}, err
	}
	summary.Review = &review
	summary.Status = review.Status
	summary.Gate = review.Gate
	participants, err := s.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
	if err != nil {
		return ReviewSummary{}, err
	}
	summary.Participants = participants
	threads, err := s.agreements.ListAgreementCommentThreads(ctx, scope, agreementID, stores.AgreementCommentThreadQuery{ReviewID: review.ID})
	if err != nil {
		return ReviewSummary{}, err
	}
	for _, thread := range threads {
		if thread.Status == stores.AgreementCommentThreadStatusResolved {
			summary.ResolvedThreadCount++
		} else {
			summary.OpenThreadCount++
		}
	}
	return summary, nil
}

func (s AgreementService) applyReviewDecision(ctx context.Context, scope stores.Scope, agreementID string, input ReviewDecisionInput, decisionStatus, auditEvent string) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		participant, participants, err := findReviewParticipant(participants, input.RecipientID)
		if err != nil {
			return err
		}
		if !participant.CanApprove {
			return domainValidationError("agreement_review_participants", "recipient_id", "participant cannot approve review")
		}
		now := txSvc.now()
		participant.DecisionStatus = decisionStatus
		participant.DecisionAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReviewParticipant(ctx, scope, participant); err != nil {
			return err
		}
		participants = replaceParticipantSnapshot(participants, participant)
		review.Status = deriveReviewStatus(participants, review.Status)
		review.LastActivityAt = &now
		if review.Status == stores.AgreementReviewStatusApproved || review.Status == stores.AgreementReviewStatusChangesRequested {
			review.ClosedAt = nil
		}
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateDraft(ctx, scope, agreementID, stores.AgreementDraftPatch{
			ReviewStatus: ptrString(review.Status),
			ReviewGate:   ptrString(review.Gate),
		}, agreement.Version); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, auditEvent, normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":      review.ID,
			"participant_id": participant.ID,
			"recipient_id":   participant.RecipientID,
			"review_gate":    review.Gate,
			"review_status":  review.Status,
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) applyCommentThreadState(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentStateInput, nextStatus, auditEvent string) (ReviewThread, error) {
	var out ReviewThread
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		thread, err := txSvc.agreements.GetAgreementCommentThread(ctx, scope, input.ThreadID)
		if err != nil {
			return err
		}
		if thread.AgreementID != strings.TrimSpace(agreementID) {
			return domainValidationError("agreement_comment_threads", "thread_id", "thread must belong to agreement")
		}
		now := txSvc.now()
		thread.Status = nextStatus
		thread.LastActivityAt = &now
		if nextStatus == stores.AgreementCommentThreadStatusResolved {
			thread.ResolvedAt = &now
			thread.ResolvedByType = normalizeReviewActorType(input.ActorType)
			thread.ResolvedByID = strings.TrimSpace(input.ActorID)
		} else {
			thread.ResolvedAt = nil
			thread.ResolvedByType = ""
			thread.ResolvedByID = ""
		}
		thread, err = txSvc.agreements.UpdateAgreementCommentThread(ctx, scope, thread)
		if err != nil {
			return err
		}
		messages, err := txSvc.agreements.ListAgreementCommentMessages(ctx, scope, thread.ID)
		if err != nil {
			return err
		}
		if err := txSvc.appendAuditEvent(ctx, scope, agreementID, auditEvent, normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), map[string]any{
			"review_id":     thread.ReviewID,
			"thread_id":     thread.ID,
			"visibility":    thread.Visibility,
			"review_status": nextStatus,
		}); err != nil {
			return err
		}
		out = ReviewThread{Thread: thread, Messages: messages}
		return nil
	})
	return out, err
}

func (s AgreementService) validateReviewGateBeforeSend(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord) error {
	gate := stores.NormalizeAgreementReviewGate(agreement.ReviewGate)
	if gate != stores.AgreementReviewGateApproveBeforeSend {
		return nil
	}
	summary, err := s.GetReviewSummary(ctx, scope, agreement.ID)
	if err != nil {
		return err
	}
	if summary.Status != stores.AgreementReviewStatusApproved {
		return domainValidationError("agreements", "review_status", "review approval is required before send")
	}
	for _, participant := range summary.Participants {
		if participant.DecisionStatus != stores.AgreementReviewDecisionApproved {
			return domainValidationError("agreements", "review_participants", "all selected reviewers must approve before send")
		}
	}
	return nil
}

func normalizeReviewActorType(actorType string) string {
	actorType = strings.TrimSpace(actorType)
	if actorType == "" {
		return "user"
	}
	return actorType
}

func isRecipientActor(actorType string) bool {
	actorType = strings.TrimSpace(strings.ToLower(actorType))
	return actorType == "recipient" || actorType == "signer"
}

func deriveReviewStatus(participants []stores.AgreementReviewParticipantRecord, fallback string) string {
	if strings.TrimSpace(fallback) == stores.AgreementReviewStatusClosed {
		return stores.AgreementReviewStatusClosed
	}
	if len(participants) == 0 {
		return stores.AgreementReviewStatusInReview
	}
	allApproved := true
	for _, participant := range participants {
		switch participant.DecisionStatus {
		case stores.AgreementReviewDecisionChangesRequested:
			return stores.AgreementReviewStatusChangesRequested
		case stores.AgreementReviewDecisionApproved:
		default:
			allApproved = false
		}
	}
	if allApproved {
		return stores.AgreementReviewStatusApproved
	}
	return stores.AgreementReviewStatusInReview
}

func findReviewParticipant(participants []stores.AgreementReviewParticipantRecord, recipientID string) (stores.AgreementReviewParticipantRecord, []stores.AgreementReviewParticipantRecord, error) {
	recipientID = strings.TrimSpace(recipientID)
	for _, participant := range participants {
		if participant.RecipientID == recipientID {
			return participant, participants, nil
		}
	}
	return stores.AgreementReviewParticipantRecord{}, participants, domainValidationError("agreement_review_participants", "recipient_id", "participant is not selected for review")
}

func replaceParticipantSnapshot(participants []stores.AgreementReviewParticipantRecord, updated stores.AgreementReviewParticipantRecord) []stores.AgreementReviewParticipantRecord {
	out := make([]stores.AgreementReviewParticipantRecord, 0, len(participants))
	for _, participant := range participants {
		if participant.ID == updated.ID {
			out = append(out, updated)
			continue
		}
		out = append(out, participant)
	}
	return out
}

func (s AgreementService) replaceReviewParticipants(ctx context.Context, scope stores.Scope, review stores.AgreementReviewRecord, reviewerIDs []string, now time.Time) error {
	records := make([]stores.AgreementReviewParticipantRecord, 0, len(reviewerIDs))
	for _, reviewerID := range reviewerIDs {
		records = append(records, stores.AgreementReviewParticipantRecord{
			ReviewID:       review.ID,
			RecipientID:    reviewerID,
			Role:           stores.AgreementReviewParticipantRoleReviewer,
			CanComment:     true,
			CanApprove:     true,
			DecisionStatus: stores.AgreementReviewDecisionPending,
			CreatedAt:      now,
			UpdatedAt:      now,
		})
	}
	return s.agreements.ReplaceAgreementReviewParticipants(ctx, scope, review.ID, records)
}

func (s AgreementService) validateReviewRecipients(ctx context.Context, scope stores.Scope, agreementID string, reviewerIDs []string) ([]string, error) {
	if len(reviewerIDs) == 0 {
		return nil, domainValidationError("agreement_reviews", "reviewer_ids", "at least one reviewer is required")
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	validRecipients := make(map[string]struct{}, len(recipients))
	for _, recipient := range recipients {
		validRecipients[recipient.ID] = struct{}{}
	}
	seen := make(map[string]struct{}, len(reviewerIDs))
	out := make([]string, 0, len(reviewerIDs))
	for _, reviewerID := range reviewerIDs {
		reviewerID = strings.TrimSpace(reviewerID)
		if reviewerID == "" {
			continue
		}
		if _, ok := validRecipients[reviewerID]; !ok {
			return nil, domainValidationError("agreement_reviews", "reviewer_ids", "reviewers must be existing recipients")
		}
		if _, ok := seen[reviewerID]; ok {
			continue
		}
		seen[reviewerID] = struct{}{}
		out = append(out, reviewerID)
	}
	if len(out) == 0 {
		return nil, domainValidationError("agreement_reviews", "reviewer_ids", "at least one reviewer is required")
	}
	return out, nil
}

func (s AgreementService) upsertAgreementReview(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord, input ReviewOpenInput, status string, openedAt, closedAt *time.Time) (stores.AgreementReviewRecord, error) {
	review, err := s.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreement.ID)
	if err != nil {
		if !reviewIsNotFoundError(err) {
			return stores.AgreementReviewRecord{}, err
		}
		return s.agreements.CreateAgreementReview(ctx, scope, stores.AgreementReviewRecord{
			AgreementID:       agreement.ID,
			Status:            status,
			Gate:              input.Gate,
			RequestedByUserID: strings.TrimSpace(input.RequestedByUserID),
			OpenedAt:          openedAt,
			ClosedAt:          closedAt,
			LastActivityAt:    openedAt,
		})
	}
	review.Status = status
	if gate := stores.NormalizeAgreementReviewGate(input.Gate); gate != "" {
		review.Gate = gate
	}
	review.RequestedByUserID = strings.TrimSpace(input.RequestedByUserID)
	review.OpenedAt = openedAt
	review.ClosedAt = closedAt
	review.LastActivityAt = openedAt
	return s.agreements.UpdateAgreementReview(ctx, scope, review)
}

func reviewIsNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return false
	}
	return coded.Category == goerrors.CategoryNotFound || coded.Code == http.StatusNotFound || strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND")
}

func reviewVisibilityError() error {
	return goerrors.New("internal review comments are not available on public signer flows", goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode(string(ErrorCodeScopeDenied))
}

//go:fix inline
func reviewPtrBool(value bool) *bool {
	return new(value)
}

func reviewPtrTime(value time.Time) *time.Time {
	value = value.UTC()
	return &value
}
