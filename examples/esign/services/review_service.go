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
	Gate               string                   `json:"gate"`
	CommentsEnabled    bool                     `json:"comments_enabled"`
	ReviewParticipants []ReviewParticipantInput `json:"review_participants"`
	ReviewerIDs        []string                 `json:"reviewer_i_ds"`
	RequestedByUserID  string                   `json:"requested_by_user_id"`
	ActorType          string                   `json:"actor_type"`
	ActorID            string                   `json:"actor_id"`
	IPAddress          string                   `json:"ip_address"`
	CorrelationID      string                   `json:"correlation_id"`
}

type ReviewParticipantInput struct {
	ParticipantType string `json:"participant_type"`
	RecipientID     string `json:"recipient_id"`
	Email           string `json:"email"`
	DisplayName     string `json:"display_name"`
	CanComment      bool   `json:"can_comment"`
	CanApprove      bool   `json:"can_approve"`
}

type ReviewDecisionInput struct {
	ParticipantID string `json:"participant_id"`
	RecipientID   string `json:"recipient_id"`
	ActorType     string `json:"actor_type"`
	ActorID       string `json:"actor_id"`
	IPAddress     string `json:"ip_address"`
	Comment       string `json:"comment"`
}

type ReviewOverrideInput struct {
	ActorType string `json:"actor_type"`
	ActorID   string `json:"actor_id"`
	ActorName string `json:"actor_name"`
	IPAddress string `json:"ip_address"`
	Reason    string `json:"reason"`
}

type ReviewApproveOnBehalfInput struct {
	ParticipantID string `json:"participant_id"`
	RecipientID   string `json:"recipient_id"`
	ActorType     string `json:"actor_type"`
	ActorID       string `json:"actor_id"`
	ActorName     string `json:"actor_name"`
	IPAddress     string `json:"ip_address"`
	Reason        string `json:"reason"`
}

type ReviewNotifyInput struct {
	ParticipantIDs []string `json:"participant_ids"`
	ParticipantID  string   `json:"participant_id"`
	RecipientID    string   `json:"recipient_id"`
	RequestedByID  string   `json:"requested_by_id"`
	ActorType      string   `json:"actor_type"`
	ActorID        string   `json:"actor_id"`
	IPAddress      string   `json:"ip_address"`
	CorrelationID  string   `json:"correlation_id"`
	Source         string   `json:"source"`
	Reason         string   `json:"reason"`
}

const (
	ReviewNotificationSourceManual       = "manual"
	ReviewNotificationSourceAutoReminder = "auto_reminder"
)

type ReviewCommentThreadInput struct {
	ReviewID   string  `json:"review_id"`
	Visibility string  `json:"visibility"`
	AnchorType string  `json:"anchor_type"`
	PageNumber int     `json:"page_number"`
	FieldID    string  `json:"field_id"`
	AnchorX    float64 `json:"anchor_x"`
	AnchorY    float64 `json:"anchor_y"`
	Body       string  `json:"body"`
	ActorType  string  `json:"actor_type"`
	ActorID    string  `json:"actor_id"`
}

type ReviewCommentReplyInput struct {
	ThreadID  string `json:"thread_id"`
	Body      string `json:"body"`
	ActorType string `json:"actor_type"`
	ActorID   string `json:"actor_id"`
}

type ReviewCommentStateInput struct {
	ThreadID  string `json:"thread_id"`
	ActorType string `json:"actor_type"`
	ActorID   string `json:"actor_id"`
}

type ReviewThread struct {
	Thread   stores.AgreementCommentThreadRecord    `json:"thread"`
	Messages []stores.AgreementCommentMessageRecord `json:"messages"`
}

type ReviewActorInfo struct {
	Name      string `json:"name,omitempty"`
	Email     string `json:"email,omitempty"`
	Role      string `json:"role,omitempty"`
	ActorType string `json:"actor_type,omitempty"`
	ActorID   string `json:"actor_id,omitempty"`
}

type ReviewActorRef struct {
	ActorType string `json:"actor_type"`
	ActorID   string `json:"actor_id"`
}

type ReviewActorDirectory interface {
	ResolveReviewActors(ctx context.Context, scope stores.Scope, refs []ReviewActorRef) ([]ReviewActorInfo, error)
}

type ReviewSummary struct {
	AgreementID           string                                    `json:"agreement_id"`
	Status                string                                    `json:"status"`
	Gate                  string                                    `json:"gate"`
	CommentsEnabled       bool                                      `json:"comments_enabled"`
	OverrideActive        bool                                      `json:"override_active"`
	OverrideReason        string                                    `json:"override_reason,omitempty"`
	OverrideByUserID      string                                    `json:"override_by_user_id,omitempty"`
	OverrideByDisplayName string                                    `json:"override_by_display_name,omitempty"`
	OverrideAt            *time.Time                                `json:"override_at,omitempty"`
	Review                *stores.AgreementReviewRecord             `json:"review,omitempty"`
	Participants          []stores.AgreementReviewParticipantRecord `json:"participants,omitempty"`
	Threads               []ReviewThread                            `json:"threads,omitempty"`
	ActorMap              map[string]ReviewActorInfo                `json:"actor_map,omitempty"`
	ApprovedCount         int                                       `json:"approved_count"`
	TotalApprovers        int                                       `json:"total_approvers"`
	OpenThreadCount       int                                       `json:"open_thread_count"`
	ResolvedThreadCount   int                                       `json:"resolved_thread_count"`
}

func (s AgreementService) OpenReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOpenInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			return domainValidationError("agreements", "status", "review requires draft agreement")
		}
		participants, err := txSvc.validateReviewParticipants(ctx, scope, agreementID, input)
		if err != nil {
			return err
		}
		now := txSvc.now()
		initialStatus := deriveReviewStatus(participants, stores.AgreementReviewStatusInReview)
		review, err := txSvc.upsertAgreementReview(ctx, scope, agreement, input, initialStatus, &now, nil)
		if err != nil {
			return err
		}
		if err := txSvc.replaceReviewParticipants(ctx, scope, review, participants, now); err != nil {
			return err
		}
		storedParticipants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		issuedTokens, err := txSvc.syncReviewSessionTokens(ctx, scope, review)
		if err != nil {
			return err
		}
		correlationID := resolveReviewNotificationCorrelationID(input.CorrelationID, review.ID, now)
		enqueuedCount, err := txSvc.enqueueReviewInvitationEffects(ctx, scope, review, storedParticipants, issuedTokens, correlationID)
		if err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus:    ptrString(review.Status),
			ReviewGate:      ptrString(review.Gate),
			CommentsEnabled: reviewPtrBool(input.CommentsEnabled),
		}); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_requested", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":            review.ID,
			"review_gate":          review.Gate,
			"review_status":        review.Status,
			"comments_enabled":     input.CommentsEnabled,
			"review_participants":  normalizeReviewParticipantMetadata(storedParticipants),
			"requested_by_user_id": strings.TrimSpace(input.RequestedByUserID),
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if enqueuedCount > 0 && hooks != nil && s.notificationDispatch != nil {
			hooks.AfterCommit(func() error {
				s.notificationDispatch.NotifyScope(scope)
				return nil
			})
		}
		return nil
	})
	return summary, err
}

func (s AgreementService) ReopenReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOpenInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
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
		participantsInput := input.ReviewParticipants
		if len(participantsInput) == 0 && len(input.ReviewerIDs) == 0 {
			participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
			if err != nil {
				return err
			}
			participantsInput = reviewParticipantsFromRecords(participants)
		}
		input.ReviewParticipants = participantsInput
		participants, err := txSvc.validateReviewParticipants(ctx, scope, agreementID, input)
		if err != nil {
			return err
		}
		now := txSvc.now()
		if input.Gate == "" {
			input.Gate = review.Gate
		}
		nextStatus := deriveReviewStatus(participants, stores.AgreementReviewStatusInReview)
		review, err = txSvc.upsertAgreementReview(ctx, scope, agreement, input, nextStatus, &now, nil)
		if err != nil {
			return err
		}
		if err := txSvc.replaceReviewParticipants(ctx, scope, review, participants, now); err != nil {
			return err
		}
		storedParticipants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		issuedTokens, err := txSvc.syncReviewSessionTokens(ctx, scope, review)
		if err != nil {
			return err
		}
		correlationID := resolveReviewNotificationCorrelationID(input.CorrelationID, review.ID, now)
		enqueuedCount, err := txSvc.enqueueReviewInvitationEffects(ctx, scope, review, storedParticipants, issuedTokens, correlationID)
		if err != nil {
			return err
		}
		commentsEnabled := input.CommentsEnabled
		if !commentsEnabled && agreement.CommentsEnabled {
			commentsEnabled = agreement.CommentsEnabled
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus:    ptrString(review.Status),
			ReviewGate:      ptrString(review.Gate),
			CommentsEnabled: reviewPtrBool(commentsEnabled),
		}); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_reopened", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":           review.ID,
			"review_gate":         review.Gate,
			"review_status":       review.Status,
			"review_participants": normalizeReviewParticipantMetadata(storedParticipants),
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if enqueuedCount > 0 && hooks != nil && s.notificationDispatch != nil {
			hooks.AfterCommit(func() error {
				s.notificationDispatch.NotifyScope(scope)
				return nil
			})
		}
		return nil
	})
	return summary, err
}

func (s AgreementService) NotifyReviewers(ctx context.Context, scope stores.Scope, agreementID string, input ReviewNotifyInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTxHooks(ctx, func(txSvc AgreementService, hooks *stores.TxHooks) error {
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			return domainValidationError("agreements", "status", "review notifications require draft agreement")
		}
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_reviews", "override_active"); err != nil {
			return err
		}
		if strings.TrimSpace(review.Status) != stores.AgreementReviewStatusInReview {
			return domainValidationError("agreement_reviews", "status", "review notifications require active review")
		}
		participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		targets, err := resolveReviewNotificationTargets(participants, input.ParticipantIDs, input.ParticipantID, input.RecipientID)
		if err != nil {
			return err
		}
		issuedTokens, err := txSvc.issueReviewSessionTokensForParticipants(ctx, scope, review, targets, true)
		if err != nil {
			return err
		}
		now := txSvc.now()
		source := normalizeReviewNotificationSource(input.Source)
		correlationID := resolveReviewNotificationCorrelationID(input.CorrelationID, review.ID, now)
		enqueuedCount, err := txSvc.enqueueReviewInvitationEffects(ctx, scope, review, targets, issuedTokens, correlationID)
		if err != nil {
			return err
		}
		review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_notified", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":            review.ID,
			"review_status":        review.Status,
			"source":               source,
			"reason":               strings.TrimSpace(input.Reason),
			"requested_by_user_id": strings.TrimSpace(input.RequestedByID),
			"notified_count":       len(targets),
			"review_participants":  normalizeReviewParticipantMetadata(targets),
		}); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if enqueuedCount > 0 && hooks != nil && s.notificationDispatch != nil {
			hooks.AfterCommit(func() error {
				s.notificationDispatch.NotifyScope(scope)
				return nil
			})
		}
		return nil
	})
	return summary, err
}

func (s AgreementService) CloseReview(ctx context.Context, scope stores.Scope, agreementID string, actorType, actorID, ipAddress string) (ReviewSummary, error) {
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
		now := txSvc.now()
		review.Status = stores.AgreementReviewStatusClosed
		review.ClosedAt = &now
		review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus: ptrString(stores.AgreementReviewStatusClosed),
			ReviewGate:   ptrString(review.Gate),
		}); err != nil {
			return err
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_closed", normalizeReviewActorType(actorType), strings.TrimSpace(actorID), ipAddress, map[string]any{
			"review_id":     review.ID,
			"review_gate":   review.Gate,
			"review_status": review.Status,
		}); err != nil {
			return err
		}
		if txSvc.reviewTokens != nil {
			for _, participant := range participants {
				if strings.TrimSpace(participant.ID) == "" {
					continue
				}
				if err := txSvc.reviewTokens.Revoke(ctx, scope, agreementID, participant.ID); err != nil {
					return err
				}
			}
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

func (s AgreementService) ForceApproveReview(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOverrideInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if reviewOverrideActive(&review) {
			return domainValidationError("agreement_reviews", "override_active", "review has already been finalized by admin override")
		}
		if !strings.EqualFold(strings.TrimSpace(review.Status), stores.AgreementReviewStatusInReview) &&
			!strings.EqualFold(strings.TrimSpace(review.Status), stores.AgreementReviewStatusChangesRequested) {
			return domainValidationError("agreement_reviews", "status", "review override requires an active review")
		}
		participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		reason := strings.TrimSpace(input.Reason)
		if reason == "" {
			return domainValidationError("agreement_reviews", "reason", "override reason is required")
		}
		if err := requireReviewAdminActorIdentity("agreement_reviews", "override_by_user_id", input.ActorID); err != nil {
			return err
		}
		now := txSvc.now()
		previousStatus := strings.TrimSpace(review.Status)
		review.Status = stores.AgreementReviewStatusApproved
		review.OverrideActive = true
		review.OverrideReason = reason
		review.OverrideByUserID = strings.TrimSpace(input.ActorID)
		review.OverrideByDisplayName = strings.TrimSpace(input.ActorName)
		review.OverrideAt = &now
		review.ClosedAt = &now
		review.LastActivityAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus: ptrString(stores.AgreementReviewStatusApproved),
			ReviewGate:   ptrString(review.Gate),
		}); err != nil {
			return err
		}
		approvedCount, totalApprovers := reviewApprovalCounts(participants)
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_force_approved", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":                review.ID,
			"review_status":            review.Status,
			"previous_status":          previousStatus,
			"review_gate":              review.Gate,
			"reason":                   reason,
			"override_active":          true,
			"override_at":              now.UTC().Format(time.RFC3339Nano),
			"override_by_user_id":      strings.TrimSpace(input.ActorID),
			"override_by_display_name": strings.TrimSpace(input.ActorName),
			"approved_count":           approvedCount,
			"total_approvers":          totalApprovers,
		}); err != nil {
			return err
		}
		if err := txSvc.revokeReviewSessionTokens(ctx, scope, agreementID, participants...); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) ApproveReviewParticipantOnBehalf(ctx context.Context, scope stores.Scope, agreementID string, input ReviewApproveOnBehalfInput) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_review_participants", "decision_status"); err != nil {
			return err
		}
		if !strings.EqualFold(strings.TrimSpace(review.Status), stores.AgreementReviewStatusInReview) {
			return domainValidationError("agreement_reviews", "status", "on-behalf approval requires active review")
		}
		participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		participant, participants, err := findReviewParticipant(participants, input.ParticipantID, input.RecipientID)
		if err != nil {
			return err
		}
		if !participant.CanApprove {
			return domainValidationError("agreement_review_participants", "participant_id", "participant cannot approve review")
		}
		if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending {
			return domainValidationError("agreement_review_participants", "decision_status", "participant has already submitted a review decision")
		}
		reason := strings.TrimSpace(input.Reason)
		if reason == "" {
			return domainValidationError("agreement_review_participants", "reason", "approval reason is required")
		}
		if err := requireReviewAdminActorIdentity("agreement_review_participants", "approved_on_behalf_by_user_id", input.ActorID); err != nil {
			return err
		}
		now := txSvc.now()
		previousStatus := strings.TrimSpace(review.Status)
		participant.ApprovedOnBehalfByUserID = strings.TrimSpace(input.ActorID)
		participant.ApprovedOnBehalfByDisplayName = strings.TrimSpace(input.ActorName)
		participant.ApprovedOnBehalfReason = reason
		participant.ApprovedOnBehalfAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReviewParticipant(ctx, scope, participant); err != nil {
			return err
		}
		participants = replaceParticipantSnapshot(participants, participant)
		review.Status = deriveEffectiveReviewStatus(&review, participants, review.Status)
		review.LastActivityAt = &now
		if review.Status == stores.AgreementReviewStatusApproved {
			review.ClosedAt = &now
		}
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus: ptrString(review.Status),
			ReviewGate:   ptrString(review.Gate),
		}); err != nil {
			return err
		}
		approvedCount, totalApprovers := reviewApprovalCounts(participants)
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, "agreement.review_participant_approved_on_behalf", normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, map[string]any{
			"review_id":                          review.ID,
			"participant_id":                     participant.ID,
			"recipient_id":                       participant.RecipientID,
			"review_gate":                        review.Gate,
			"previous_status":                    previousStatus,
			"review_status":                      review.Status,
			"reason":                             reason,
			"approved_count":                     approvedCount,
			"total_approvers":                    totalApprovers,
			"approved_on_behalf_at":              now.UTC().Format(time.RFC3339Nano),
			"approved_on_behalf_by_user_id":      strings.TrimSpace(input.ActorID),
			"approved_on_behalf_by_display_name": strings.TrimSpace(input.ActorName),
		}); err != nil {
			return err
		}
		if err := txSvc.revokeReviewSessionTokens(ctx, scope, agreementID, participant); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) CreateCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentThreadInput) (ReviewThread, error) {
	var out ReviewThread
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_comment_threads", "review_id"); err != nil {
			return err
		}
		if input.ReviewID != "" && strings.TrimSpace(input.ReviewID) != review.ID {
			return domainValidationError("agreement_comment_threads", "review_id", "review must match agreement")
		}
		if strings.EqualFold(strings.TrimSpace(input.Visibility), stores.AgreementCommentVisibilityInternal) && isRecipientActor(input.ActorType) {
			return reviewVisibilityError()
		}
		normalizedInput, err := txSvc.normalizeCommentAnchor(ctx, scope, agreementID, input)
		if err != nil {
			return err
		}
		thread, err := txSvc.agreements.CreateAgreementCommentThread(ctx, scope, stores.AgreementCommentThreadRecord{
			AgreementID:    agreementID,
			ReviewID:       review.ID,
			Visibility:     normalizedInput.Visibility,
			AnchorType:     normalizedInput.AnchorType,
			PageNumber:     normalizedInput.PageNumber,
			FieldID:        strings.TrimSpace(normalizedInput.FieldID),
			AnchorX:        normalizedInput.AnchorX,
			AnchorY:        normalizedInput.AnchorY,
			Status:         stores.AgreementCommentThreadStatusOpen,
			CreatedByType:  normalizeReviewActorType(normalizedInput.ActorType),
			CreatedByID:    strings.TrimSpace(normalizedInput.ActorID),
			LastActivityAt: reviewPtrTime(txSvc.now()),
		})
		if err != nil {
			return err
		}
		message, err := txSvc.agreements.CreateAgreementCommentMessage(ctx, scope, stores.AgreementCommentMessageRecord{
			ThreadID:      thread.ID,
			Body:          strings.TrimSpace(normalizedInput.Body),
			MessageKind:   stores.AgreementCommentMessageKindComment,
			CreatedByType: normalizeReviewActorType(normalizedInput.ActorType),
			CreatedByID:   strings.TrimSpace(normalizedInput.ActorID),
			CreatedAt:     txSvc.now(),
		})
		if err != nil {
			return err
		}
		now := txSvc.now()
		review.LastActivityAt = reviewPtrTime(now)
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if err := txSvc.appendAuditEvent(ctx, scope, agreementID, "agreement.comment_thread_created", normalizeReviewActorType(normalizedInput.ActorType), strings.TrimSpace(normalizedInput.ActorID), map[string]any{
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
		if _, err := txSvc.agreements.CreateAgreementCommentMessage(ctx, scope, stores.AgreementCommentMessageRecord{
			ThreadID:      thread.ID,
			Body:          strings.TrimSpace(input.Body),
			MessageKind:   stores.AgreementCommentMessageKindReply,
			CreatedByType: normalizeReviewActorType(input.ActorType),
			CreatedByID:   strings.TrimSpace(input.ActorID),
			CreatedAt:     txSvc.now(),
		}); err != nil {
			return err
		}
		thread.LastActivityAt = reviewPtrTime(txSvc.now())
		if _, err := txSvc.agreements.UpdateAgreementCommentThread(ctx, scope, thread); err != nil {
			return err
		}
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_comment_messages", "thread_id"); err != nil {
			return err
		}
		review.LastActivityAt = thread.LastActivityAt
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		messages, err := txSvc.agreements.ListAgreementCommentMessages(ctx, scope, thread.ID)
		if err != nil {
			return err
		}
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
	summary.OverrideActive = review.OverrideActive
	summary.OverrideReason = strings.TrimSpace(review.OverrideReason)
	summary.OverrideByUserID = strings.TrimSpace(review.OverrideByUserID)
	summary.OverrideByDisplayName = strings.TrimSpace(review.OverrideByDisplayName)
	if review.OverrideAt != nil {
		overrideAt := review.OverrideAt.UTC()
		summary.OverrideAt = &overrideAt
	}
	participants, err := s.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
	if err != nil {
		return ReviewSummary{}, err
	}
	summary.Participants = participants
	summary.ApprovedCount, summary.TotalApprovers = reviewApprovalCounts(participants)
	summary.Status = deriveEffectiveReviewStatus(summary.Review, participants, summary.Status)
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return ReviewSummary{}, err
	}
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
		messages, err := s.agreements.ListAgreementCommentMessages(ctx, scope, thread.ID)
		if err != nil {
			return ReviewSummary{}, err
		}
		summary.Threads = append(summary.Threads, ReviewThread{Thread: thread, Messages: messages})
	}
	summary.ActorMap = s.buildReviewActorMap(ctx, scope, summary.Review, summary.Participants, recipients, summary.Threads)
	return summary, nil
}

func (s AgreementService) applyReviewDecision(ctx context.Context, scope stores.Scope, agreementID string, input ReviewDecisionInput, decisionStatus, auditEvent string) (ReviewSummary, error) {
	var summary ReviewSummary
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		decisionComment := strings.TrimSpace(input.Comment)
		if decisionStatus == stores.AgreementReviewDecisionChangesRequested && decisionComment == "" {
			return domainValidationError("agreement_reviews", "comment", "changes requested requires a comment")
		}
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_reviews", "status"); err != nil {
			return err
		}
		participants, err := txSvc.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
		if err != nil {
			return err
		}
		participant, participants, err := findReviewParticipant(participants, input.ParticipantID, input.RecipientID)
		if err != nil {
			return err
		}
		if !participant.CanApprove {
			return domainValidationError("agreement_review_participants", "recipient_id", "participant cannot approve review")
		}
		if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending {
			return domainValidationError("agreement_review_participants", "decision_status", "participant has already submitted a review decision")
		}
		now := txSvc.now()
		participant.DecisionStatus = decisionStatus
		participant.DecisionAt = &now
		if _, err := txSvc.agreements.UpdateAgreementReviewParticipant(ctx, scope, participant); err != nil {
			return err
		}
		participants = replaceParticipantSnapshot(participants, participant)
		review.Status = deriveEffectiveReviewStatus(&review, participants, review.Status)
		review.LastActivityAt = &now
		if review.Status == stores.AgreementReviewStatusApproved || review.Status == stores.AgreementReviewStatusChangesRequested {
			review.ClosedAt = nil
		}
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
			return err
		}
		if _, err := txSvc.agreements.UpdateAgreementReviewProjection(ctx, scope, agreementID, stores.AgreementReviewProjectionPatch{
			ReviewStatus: ptrString(review.Status),
			ReviewGate:   ptrString(review.Gate),
		}); err != nil {
			return err
		}
		var decisionThreadID string
		if decisionComment != "" {
			thread, err := txSvc.appendReviewDecisionComment(ctx, scope, agreementID, review, decisionComment, input, now)
			if err != nil {
				return err
			}
			decisionThreadID = strings.TrimSpace(thread.ID)
		}
		metadata := map[string]any{
			"review_id":      review.ID,
			"participant_id": participant.ID,
			"recipient_id":   participant.RecipientID,
			"review_gate":    review.Gate,
			"review_status":  review.Status,
		}
		if decisionComment != "" {
			metadata["decision_comment"] = decisionComment
		}
		if decisionThreadID != "" {
			metadata["thread_id"] = decisionThreadID
		}
		if err := txSvc.appendAuditEventWithIP(ctx, scope, agreementID, auditEvent, normalizeReviewActorType(input.ActorType), strings.TrimSpace(input.ActorID), input.IPAddress, metadata); err != nil {
			return err
		}
		summary, err = txSvc.GetReviewSummary(ctx, scope, agreementID)
		return err
	})
	return summary, err
}

func (s AgreementService) appendReviewDecisionComment(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	review stores.AgreementReviewRecord,
	comment string,
	input ReviewDecisionInput,
	now time.Time,
) (stores.AgreementCommentThreadRecord, error) {
	comment = strings.TrimSpace(comment)
	if comment == "" {
		return stores.AgreementCommentThreadRecord{}, nil
	}
	thread, err := s.agreements.CreateAgreementCommentThread(ctx, scope, stores.AgreementCommentThreadRecord{
		AgreementID:    agreementID,
		ReviewID:       review.ID,
		Visibility:     stores.AgreementCommentVisibilityShared,
		AnchorType:     stores.AgreementCommentAnchorAgreement,
		Status:         stores.AgreementCommentThreadStatusOpen,
		CreatedByType:  normalizeReviewActorType(input.ActorType),
		CreatedByID:    strings.TrimSpace(input.ActorID),
		LastActivityAt: reviewPtrTime(now),
	})
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	if _, err := s.agreements.CreateAgreementCommentMessage(ctx, scope, stores.AgreementCommentMessageRecord{
		ThreadID:      thread.ID,
		Body:          comment,
		MessageKind:   stores.AgreementCommentMessageKindComment,
		CreatedByType: normalizeReviewActorType(input.ActorType),
		CreatedByID:   strings.TrimSpace(input.ActorID),
		CreatedAt:     now,
	}); err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	return thread, nil
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
		review, err := txSvc.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if err := ensureReviewCycleMutable(review, "agreement_comment_threads", "thread_id"); err != nil {
			return err
		}
		review.LastActivityAt = thread.LastActivityAt
		if _, err := txSvc.agreements.UpdateAgreementReview(ctx, scope, review); err != nil {
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
	if summary.OverrideActive {
		return nil
	}
	if summary.TotalApprovers > 0 && summary.ApprovedCount != summary.TotalApprovers {
		return domainValidationError("agreements", "review_participants", "all selected approvers must approve before send")
	}
	return nil
}

func ensureReviewCycleMutable(review stores.AgreementReviewRecord, entity, field string) error {
	if review.OverrideActive {
		return domainValidationError(entity, field, "review was finalized by admin override")
	}
	return nil
}

func requireReviewAdminActorIdentity(entity, field, actorID string) error {
	if strings.TrimSpace(actorID) == "" {
		return domainValidationError(entity, field, "actor_id is required")
	}
	return nil
}

func (s AgreementService) revokeReviewSessionTokens(ctx context.Context, scope stores.Scope, agreementID string, participants ...stores.AgreementReviewParticipantRecord) error {
	if s.reviewTokens == nil {
		return nil
	}
	for _, participant := range participants {
		if strings.TrimSpace(participant.ID) == "" {
			continue
		}
		if err := s.reviewTokens.Revoke(ctx, scope, agreementID, participant.ID); err != nil {
			return err
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

func reviewActorKey(actorType, actorID string) string {
	normalizedActorType := normalizeReviewActorType(actorType)
	normalizedActorID := strings.TrimSpace(actorID)
	if normalizedActorType == "" || normalizedActorID == "" {
		return ""
	}
	return normalizedActorType + ":" + normalizedActorID
}

func (s AgreementService) buildReviewActorMap(
	ctx context.Context,
	scope stores.Scope,
	review *stores.AgreementReviewRecord,
	participants []stores.AgreementReviewParticipantRecord,
	recipients []stores.RecipientRecord,
	threads []ReviewThread,
) map[string]ReviewActorInfo {
	actorMap := map[string]ReviewActorInfo{}
	recipientIndex := make(map[string]stores.RecipientRecord, len(recipients))
	for _, recipient := range recipients {
		recipientIndex[strings.TrimSpace(recipient.ID)] = recipient
		registerReviewActor(actorMap, []string{"recipient", "signer"}, recipient.ID, recipient.Name, recipient.Email, recipient.Role)
	}
	for _, participant := range participants {
		registerReviewActor(
			actorMap,
			[]string{"reviewer"},
			participant.ID,
			firstNonEmptyString(participant.DisplayName, participant.Email),
			participant.Email,
			firstNonEmptyString(participant.Role, stores.AgreementReviewParticipantRoleReviewer),
		)
		if approvedBy := strings.TrimSpace(participant.ApprovedOnBehalfByUserID); approvedBy != "" {
			registerReviewActor(
				actorMap,
				[]string{"user", "sender"},
				approvedBy,
				strings.TrimSpace(participant.ApprovedOnBehalfByDisplayName),
				"",
				"sender",
			)
		}
		if recipientID := strings.TrimSpace(participant.RecipientID); recipientID != "" {
			recipient, ok := recipientIndex[recipientID]
			if ok {
				registerReviewActor(actorMap, []string{"recipient", "signer"}, recipient.ID, recipient.Name, recipient.Email, recipient.Role)
				continue
			}
			registerReviewActor(
				actorMap,
				[]string{"recipient", "signer"},
				recipientID,
				firstNonEmptyString(participant.DisplayName, participant.Email, recipientID),
				participant.Email,
				"signer",
			)
		}
	}
	if review != nil && strings.TrimSpace(review.RequestedByUserID) != "" {
		registerReviewActor(actorMap, []string{"user", "sender"}, review.RequestedByUserID, "", "", "sender")
	}
	if review != nil && strings.TrimSpace(review.OverrideByUserID) != "" {
		registerReviewActor(actorMap, []string{"user", "sender"}, review.OverrideByUserID, strings.TrimSpace(review.OverrideByDisplayName), "", "sender")
	}
	for _, thread := range threads {
		registerReviewActor(actorMap, reviewActorAliases(thread.Thread.CreatedByType), thread.Thread.CreatedByID, "", "", "")
		registerReviewActor(actorMap, reviewActorAliases(thread.Thread.ResolvedByType), thread.Thread.ResolvedByID, "", "", "")
		for _, message := range thread.Messages {
			registerReviewActor(actorMap, reviewActorAliases(message.CreatedByType), message.CreatedByID, "", "", "")
		}
	}
	s.enrichReviewActorMap(ctx, scope, actorMap)
	finalizeReviewActorMap(actorMap)
	if len(actorMap) == 0 {
		return nil
	}
	return actorMap
}

func (s AgreementService) enrichReviewActorMap(ctx context.Context, scope stores.Scope, actorMap map[string]ReviewActorInfo) {
	if len(actorMap) == 0 || s.reviewActorDirectory == nil {
		return
	}
	refs := collectReviewActorRefs(actorMap)
	if len(refs) == 0 {
		return
	}
	resolved, err := s.reviewActorDirectory.ResolveReviewActors(ctx, scope, refs)
	if err != nil {
		return
	}
	for _, actor := range resolved {
		actorID := strings.TrimSpace(actor.ActorID)
		if actorID == "" {
			continue
		}
		registerReviewActor(
			actorMap,
			reviewActorAliases(actor.ActorType),
			actorID,
			actor.Name,
			actor.Email,
			actor.Role,
		)
	}
}

func collectReviewActorRefs(actorMap map[string]ReviewActorInfo) []ReviewActorRef {
	if len(actorMap) == 0 {
		return nil
	}
	out := make([]ReviewActorRef, 0, len(actorMap))
	seen := make(map[string]struct{}, len(actorMap))
	for _, actor := range actorMap {
		actorID := strings.TrimSpace(actor.ActorID)
		if actorID == "" {
			continue
		}
		actorType := canonicalReviewActorType(actor.ActorType)
		key := reviewActorKey(actorType, actorID)
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, ReviewActorRef{
			ActorType: actorType,
			ActorID:   actorID,
		})
	}
	return out
}

func canonicalReviewActorType(actorType string) string {
	switch normalizeReviewActorType(actorType) {
	case "sender":
		return "user"
	case "signer":
		return "recipient"
	default:
		return normalizeReviewActorType(actorType)
	}
}

func reviewActorAliases(actorType string) []string {
	switch normalizeReviewActorType(actorType) {
	case "recipient", "signer":
		return []string{"recipient", "signer"}
	case "user", "sender":
		return []string{"user", "sender"}
	case "reviewer":
		return []string{"reviewer"}
	default:
		normalized := normalizeReviewActorType(actorType)
		if normalized == "" {
			return nil
		}
		return []string{normalized}
	}
}

func registerReviewActor(actorMap map[string]ReviewActorInfo, actorTypes []string, actorID, name, email, role string) {
	normalizedActorID := strings.TrimSpace(actorID)
	if normalizedActorID == "" {
		return
	}
	for _, actorType := range actorTypes {
		normalizedActorType := normalizeReviewActorType(actorType)
		key := reviewActorKey(normalizedActorType, normalizedActorID)
		if key == "" {
			continue
		}
		next := ReviewActorInfo{
			Name:      strings.TrimSpace(name),
			Email:     strings.TrimSpace(email),
			Role:      strings.TrimSpace(role),
			ActorType: normalizedActorType,
			ActorID:   normalizedActorID,
		}
		actorMap[key] = mergeReviewActorInfo(actorMap[key], next)
	}
}

func mergeReviewActorInfo(existing, next ReviewActorInfo) ReviewActorInfo {
	out := existing
	if out.ActorType == "" {
		out.ActorType = strings.TrimSpace(next.ActorType)
	}
	if out.ActorID == "" {
		out.ActorID = strings.TrimSpace(next.ActorID)
	}
	if out.Name == "" {
		out.Name = strings.TrimSpace(next.Name)
	}
	if out.Email == "" {
		out.Email = strings.TrimSpace(next.Email)
	}
	if out.Role == "" {
		out.Role = strings.TrimSpace(next.Role)
	}
	return out
}

func finalizeReviewActorMap(actorMap map[string]ReviewActorInfo) {
	for key, actor := range actorMap {
		actor.Name = firstNonEmptyString(actor.Name, actor.Email, actor.ActorID, humanizeReviewActorLabel(actor.Role), humanizeReviewActorLabel(actor.ActorType), "Participant")
		actor.Role = firstNonEmptyString(actor.Role, actor.ActorType)
		actorMap[key] = actor
	}
}

func humanizeReviewActorLabel(value string) string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return ""
	}
	parts := strings.Fields(strings.ReplaceAll(normalized, "_", " "))
	for index, part := range parts {
		if part == "" {
			continue
		}
		parts[index] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func normalizeReviewNotificationSource(source string) string {
	switch strings.ToLower(strings.TrimSpace(source)) {
	case ReviewNotificationSourceAutoReminder:
		return ReviewNotificationSourceAutoReminder
	default:
		return ReviewNotificationSourceManual
	}
}

func resolveReviewNotificationTargets(
	participants []stores.AgreementReviewParticipantRecord,
	participantIDs []string,
	participantID, recipientID string,
) ([]stores.AgreementReviewParticipantRecord, error) {
	cleanIDs := make([]string, 0, len(participantIDs))
	seen := make(map[string]struct{}, len(participantIDs))
	for _, rawID := range participantIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		cleanIDs = append(cleanIDs, id)
	}
	if len(cleanIDs) > 0 {
		out := make([]stores.AgreementReviewParticipantRecord, 0, len(cleanIDs))
		for _, id := range cleanIDs {
			target, _, err := findReviewParticipant(participants, id, "")
			if err != nil {
				return nil, err
			}
			if reviewParticipantEffectiveDecisionStatus(target) != stores.AgreementReviewDecisionPending {
				return nil, domainValidationError("agreement_review_participants", "decision_status", "review notifications require pending reviewers")
			}
			out = append(out, target)
		}
		if len(out) == 0 {
			return nil, domainValidationError("agreement_review_participants", "decision_status", "no pending reviewers to notify")
		}
		return out, nil
	}
	participantID = strings.TrimSpace(participantID)
	recipientID = strings.TrimSpace(recipientID)
	if participantID != "" || recipientID != "" {
		target, _, err := findReviewParticipant(participants, participantID, recipientID)
		if err != nil {
			return nil, err
		}
		if reviewParticipantEffectiveDecisionStatus(target) != stores.AgreementReviewDecisionPending {
			return nil, domainValidationError("agreement_review_participants", "decision_status", "review notifications require pending reviewers")
		}
		return []stores.AgreementReviewParticipantRecord{target}, nil
	}
	out := make([]stores.AgreementReviewParticipantRecord, 0, len(participants))
	for _, participant := range participants {
		if reviewParticipantEffectiveDecisionStatus(participant) != stores.AgreementReviewDecisionPending {
			continue
		}
		out = append(out, participant)
	}
	if len(out) == 0 {
		return nil, domainValidationError("agreement_review_participants", "decision_status", "no pending reviewers to notify")
	}
	return out, nil
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
	approvedCount, totalApprovers := reviewApprovalCounts(participants)
	for _, participant := range participants {
		if !participant.CanApprove {
			continue
		}
		if strings.TrimSpace(participant.DecisionStatus) == stores.AgreementReviewDecisionChangesRequested {
			return stores.AgreementReviewStatusChangesRequested
		}
	}
	if totalApprovers == 0 {
		return stores.AgreementReviewStatusApproved
	}
	if approvedCount == totalApprovers {
		return stores.AgreementReviewStatusApproved
	}
	return stores.AgreementReviewStatusInReview
}

func reviewApprovalCounts(participants []stores.AgreementReviewParticipantRecord) (int, int) {
	approvedCount := 0
	totalApprovers := 0
	for _, participant := range participants {
		if !participant.CanApprove {
			continue
		}
		totalApprovers++
		if reviewParticipantEffectivelyApproved(participant) {
			approvedCount++
		}
	}
	return approvedCount, totalApprovers
}

func deriveEffectiveReviewStatus(review *stores.AgreementReviewRecord, participants []stores.AgreementReviewParticipantRecord, fallback string) string {
	if reviewOverrideActive(review) {
		return stores.AgreementReviewStatusApproved
	}
	return deriveReviewStatus(participants, fallback)
}

func reviewOverrideActive(review *stores.AgreementReviewRecord) bool {
	return review != nil && review.OverrideActive
}

func reviewParticipantApprovedOnBehalf(participant stores.AgreementReviewParticipantRecord) bool {
	return participant.ApprovedOnBehalfAt != nil
}

func reviewParticipantEffectivelyApproved(participant stores.AgreementReviewParticipantRecord) bool {
	return strings.TrimSpace(participant.DecisionStatus) == stores.AgreementReviewDecisionApproved || reviewParticipantApprovedOnBehalf(participant)
}

func reviewParticipantEffectiveDecisionStatus(participant stores.AgreementReviewParticipantRecord) string {
	if reviewParticipantApprovedOnBehalf(participant) {
		return stores.AgreementReviewDecisionApproved
	}
	normalized := strings.TrimSpace(participant.DecisionStatus)
	if normalized == "" {
		return stores.AgreementReviewDecisionPending
	}
	return normalized
}

func findReviewParticipant(participants []stores.AgreementReviewParticipantRecord, participantID, recipientID string) (stores.AgreementReviewParticipantRecord, []stores.AgreementReviewParticipantRecord, error) {
	participantID = strings.TrimSpace(participantID)
	recipientID = strings.TrimSpace(recipientID)
	for _, participant := range participants {
		if participantID != "" && participant.ID == participantID {
			return participant, participants, nil
		}
		if recipientID != "" && participant.RecipientID == recipientID {
			return participant, participants, nil
		}
	}
	field := "participant_id"
	if recipientID != "" {
		field = "recipient_id"
	}
	return stores.AgreementReviewParticipantRecord{}, participants, domainValidationError("agreement_review_participants", field, "participant is not selected for review")
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

func (s AgreementService) replaceReviewParticipants(ctx context.Context, scope stores.Scope, review stores.AgreementReviewRecord, participants []stores.AgreementReviewParticipantRecord, now time.Time) error {
	records := make([]stores.AgreementReviewParticipantRecord, 0, len(participants))
	for _, participant := range participants {
		record := participant
		record.ReviewID = review.ID
		record.Role = stores.AgreementReviewParticipantRoleReviewer
		record.DecisionStatus = stores.AgreementReviewDecisionPending
		record.DecisionAt = nil
		record.CreatedAt = now
		record.UpdatedAt = now
		records = append(records, record)
	}
	return s.agreements.ReplaceAgreementReviewParticipants(ctx, scope, review.ID, records)
}

func (s AgreementService) validateReviewParticipants(ctx context.Context, scope stores.Scope, agreementID string, input ReviewOpenInput) ([]stores.AgreementReviewParticipantRecord, error) {
	participantInputs := append([]ReviewParticipantInput(nil), input.ReviewParticipants...)
	if len(participantInputs) == 0 && len(input.ReviewerIDs) > 0 {
		for _, reviewerID := range input.ReviewerIDs {
			participantInputs = append(participantInputs, ReviewParticipantInput{
				ParticipantType: stores.AgreementReviewParticipantTypeRecipient,
				RecipientID:     reviewerID,
				CanComment:      true,
				CanApprove:      true,
			})
		}
	}
	if len(participantInputs) == 0 {
		return nil, domainValidationError("agreement_reviews", "review_participants", "at least one reviewer is required")
	}
	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	validRecipients := make(map[string]stores.RecipientRecord, len(recipients))
	for _, recipient := range recipients {
		validRecipients[recipient.ID] = recipient
	}
	seen := make(map[string]struct{}, len(participantInputs))
	out := make([]stores.AgreementReviewParticipantRecord, 0, len(participantInputs))
	for _, participant := range participantInputs {
		participantType := stores.NormalizeAgreementReviewParticipantType(participant.ParticipantType)
		if participantType == "" {
			if strings.TrimSpace(participant.RecipientID) != "" {
				participantType = stores.AgreementReviewParticipantTypeRecipient
			} else if strings.TrimSpace(participant.Email) != "" {
				participantType = stores.AgreementReviewParticipantTypeExternal
			}
		}
		if participantType == "" {
			return nil, domainValidationError("agreement_reviews", "review_participants", "participant type is required")
		}
		record := stores.AgreementReviewParticipantRecord{
			ParticipantType: participantType,
			Role:            stores.AgreementReviewParticipantRoleReviewer,
			CanComment:      participant.CanComment,
			CanApprove:      participant.CanApprove,
			DecisionStatus:  stores.AgreementReviewDecisionPending,
		}
		if !record.CanComment && !record.CanApprove {
			record.CanComment = true
			record.CanApprove = true
		}
		switch participantType {
		case stores.AgreementReviewParticipantTypeRecipient:
			recipientID := strings.TrimSpace(participant.RecipientID)
			if recipientID == "" {
				return nil, domainValidationError("agreement_reviews", "review_participants", "recipient reviewers require recipient_id")
			}
			recipient, ok := validRecipients[recipientID]
			if !ok {
				return nil, domainValidationError("agreement_reviews", "review_participants", "recipient reviewers must be existing recipients")
			}
			record.RecipientID = recipientID
			record.Email = strings.TrimSpace(firstNonEmptyString(participant.Email, recipient.Email))
			record.DisplayName = strings.TrimSpace(firstNonEmptyString(participant.DisplayName, recipient.Name))
		case stores.AgreementReviewParticipantTypeExternal:
			email := strings.TrimSpace(strings.ToLower(participant.Email))
			if email == "" {
				return nil, domainValidationError("agreement_reviews", "review_participants", "external reviewers require email")
			}
			record.Email = email
			record.DisplayName = strings.TrimSpace(participant.DisplayName)
		default:
			return nil, domainValidationError("agreement_reviews", "review_participants", "unsupported participant type")
		}
		identityKey := reviewParticipantIdentityKey(record)
		if identityKey == "" {
			continue
		}
		if _, ok := seen[identityKey]; ok {
			continue
		}
		seen[identityKey] = struct{}{}
		out = append(out, record)
	}
	if len(out) == 0 {
		return nil, domainValidationError("agreement_reviews", "review_participants", "at least one reviewer is required")
	}
	return out, nil
}

func reviewParticipantsFromRecords(records []stores.AgreementReviewParticipantRecord) []ReviewParticipantInput {
	out := make([]ReviewParticipantInput, 0, len(records))
	for _, record := range records {
		out = append(out, ReviewParticipantInput{
			ParticipantType: record.ParticipantType,
			RecipientID:     record.RecipientID,
			Email:           record.Email,
			DisplayName:     record.DisplayName,
			CanComment:      record.CanComment,
			CanApprove:      record.CanApprove,
		})
	}
	return out
}

func normalizeReviewParticipantMetadata(records []stores.AgreementReviewParticipantRecord) []map[string]any {
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, map[string]any{
			"participant_type":                   strings.TrimSpace(record.ParticipantType),
			"participant_id":                     strings.TrimSpace(record.ID),
			"recipient_id":                       strings.TrimSpace(record.RecipientID),
			"email":                              strings.TrimSpace(record.Email),
			"display_name":                       strings.TrimSpace(record.DisplayName),
			"can_comment":                        record.CanComment,
			"can_approve":                        record.CanApprove,
			"decision_status":                    strings.TrimSpace(record.DecisionStatus),
			"effective_decision_status":          reviewParticipantEffectiveDecisionStatus(record),
			"approved_on_behalf":                 reviewParticipantApprovedOnBehalf(record),
			"approved_on_behalf_by_display_name": strings.TrimSpace(record.ApprovedOnBehalfByDisplayName),
		})
	}
	return out
}

func reviewParticipantIdentityKey(record stores.AgreementReviewParticipantRecord) string {
	switch stores.NormalizeAgreementReviewParticipantType(record.ParticipantType) {
	case stores.AgreementReviewParticipantTypeRecipient:
		if id := strings.TrimSpace(record.RecipientID); id != "" {
			return stores.AgreementReviewParticipantTypeRecipient + ":" + id
		}
	case stores.AgreementReviewParticipantTypeExternal:
		if email := strings.TrimSpace(strings.ToLower(record.Email)); email != "" {
			return stores.AgreementReviewParticipantTypeExternal + ":" + email
		}
	}
	return ""
}

func (s AgreementService) normalizeCommentAnchor(ctx context.Context, scope stores.Scope, agreementID string, input ReviewCommentThreadInput) (ReviewCommentThreadInput, error) {
	normalized := input
	normalized.Visibility = stores.NormalizeAgreementCommentVisibility(input.Visibility)
	if normalized.Visibility == "" {
		return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "visibility", "unsupported visibility")
	}
	normalized.AnchorType = stores.NormalizeAgreementCommentAnchorType(input.AnchorType)
	if normalized.AnchorType == "" {
		return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "anchor_type", "unsupported anchor type")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return ReviewCommentThreadInput{}, err
	}
	document, err := s.documents.Get(ctx, scope, agreement.DocumentID)
	if err != nil {
		return ReviewCommentThreadInput{}, err
	}
	switch normalized.AnchorType {
	case stores.AgreementCommentAnchorAgreement:
		normalized.PageNumber = 0
		normalized.FieldID = ""
		normalized.AnchorX = 0
		normalized.AnchorY = 0
	case stores.AgreementCommentAnchorPage:
		if normalized.PageNumber <= 0 {
			return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "page_number", "page anchors require a valid page number")
		}
		if document.PageCount > 0 && normalized.PageNumber > document.PageCount {
			return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "page_number", "page number exceeds document page count")
		}
		normalized.FieldID = ""
	case stores.AgreementCommentAnchorField:
		fieldID := strings.TrimSpace(normalized.FieldID)
		if fieldID == "" {
			return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "field_id", "field anchors require a valid field reference")
		}
		fields, err := s.agreements.ListFields(ctx, scope, agreementID)
		if err != nil {
			return ReviewCommentThreadInput{}, err
		}
		field, ok := findFieldByID(fields, fieldID)
		if !ok {
			return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "field_id", "field anchors require a valid field reference")
		}
		normalized.FieldID = field.ID
		normalized.PageNumber = field.PageNumber
		normalized.AnchorX = 0
		normalized.AnchorY = 0
	default:
		return ReviewCommentThreadInput{}, domainValidationError("agreement_comment_threads", "anchor_type", "unsupported anchor type")
	}
	return normalized, nil
}

func resolveReviewNotificationCorrelationID(correlationID, reviewID string, now time.Time) string {
	correlationID = strings.TrimSpace(correlationID)
	if correlationID != "" {
		return correlationID
	}
	reviewID = strings.TrimSpace(reviewID)
	if reviewID == "" {
		reviewID = "review"
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	return reviewID + "|" + now.UTC().Format(time.RFC3339Nano)
}

func (s AgreementService) syncReviewSessionTokens(ctx context.Context, scope stores.Scope, review stores.AgreementReviewRecord) (map[string]stores.IssuedReviewSessionToken, error) {
	if s.reviewTokens == nil {
		return nil, nil
	}
	participants, err := s.agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
	if err != nil {
		return nil, err
	}
	return s.issueReviewSessionTokensForParticipants(ctx, scope, review, participants, true)
}

func (s AgreementService) issueReviewSessionTokensForParticipants(
	ctx context.Context,
	scope stores.Scope,
	review stores.AgreementReviewRecord,
	participants []stores.AgreementReviewParticipantRecord,
	rotate bool,
) (map[string]stores.IssuedReviewSessionToken, error) {
	if s.reviewTokens == nil {
		return nil, nil
	}
	issuedTokens := make(map[string]stores.IssuedReviewSessionToken, len(participants))
	for _, participant := range participants {
		var (
			issued stores.IssuedReviewSessionToken
			err    error
		)
		if rotate {
			issued, err = s.reviewTokens.Rotate(ctx, scope, review.AgreementID, review.ID, participant.ID)
		} else {
			issued, err = s.reviewTokens.Issue(ctx, scope, review.AgreementID, review.ID, participant.ID)
		}
		if err != nil {
			return nil, err
		}
		issuedTokens[strings.TrimSpace(participant.ID)] = issued
	}
	return issuedTokens, nil
}

func (s AgreementService) enqueueReviewInvitationEffects(
	ctx context.Context,
	scope stores.Scope,
	review stores.AgreementReviewRecord,
	participants []stores.AgreementReviewParticipantRecord,
	issuedTokens map[string]stores.IssuedReviewSessionToken,
	correlationID string,
) (int, error) {
	if s.effects == nil || s.outbox == nil {
		return 0, nil
	}
	enqueuedCount := 0
	for _, participant := range participants {
		token, ok := issuedTokens[strings.TrimSpace(participant.ID)]
		if !ok || strings.TrimSpace(token.Token) == "" {
			return 0, domainValidationError("review_session_tokens", "participant_id", "review invite token is required")
		}
		notification := AgreementNotification{
			AgreementID:         strings.TrimSpace(review.AgreementID),
			ReviewID:            strings.TrimSpace(review.ID),
			RecipientID:         strings.TrimSpace(participant.RecipientID),
			ReviewParticipantID: strings.TrimSpace(participant.ID),
			RecipientEmail:      strings.TrimSpace(participant.Email),
			RecipientName:       strings.TrimSpace(participant.DisplayName),
			CorrelationID:       strings.TrimSpace(correlationID),
			Type:                NotificationReviewInvitation,
			ReviewToken:         token,
		}
		_, replayed, err := s.prepareAgreementNotificationEffect(
			ctx,
			scope,
			GuardedEffectKindAgreementReviewInvite,
			notification,
			AgreementReviewNotificationFailedAuditEvent,
			strings.TrimSpace(correlationID),
		)
		if err != nil {
			return 0, err
		}
		if !replayed {
			enqueuedCount++
		}
	}
	if enqueuedCount == 0 {
		return 0, nil
	}
	if _, _, err := ApplyAgreementNotificationSummary(ctx, s.agreements, s.effects, scope, review.AgreementID); err != nil {
		return 0, err
	}
	return enqueuedCount, nil
}

func (s AgreementService) upsertAgreementReview(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord, input ReviewOpenInput, status string, openedAt, closedAt *time.Time) (stores.AgreementReviewRecord, error) {
	review, err := s.agreements.GetAgreementReviewByAgreementID(ctx, scope, agreement.ID)
	if err != nil {
		if !reviewIsNotFoundError(err) {
			return stores.AgreementReviewRecord{}, err
		}
		return s.agreements.CreateAgreementReview(ctx, scope, stores.AgreementReviewRecord{
			AgreementID:           agreement.ID,
			Status:                status,
			Gate:                  input.Gate,
			RequestedByUserID:     strings.TrimSpace(input.RequestedByUserID),
			OverrideActive:        false,
			OverrideReason:        "",
			OverrideByUserID:      "",
			OverrideByDisplayName: "",
			OverrideAt:            nil,
			OpenedAt:              openedAt,
			ClosedAt:              closedAt,
			LastActivityAt:        openedAt,
		})
	}
	review.Status = status
	if gate := stores.NormalizeAgreementReviewGate(input.Gate); gate != "" {
		review.Gate = gate
	}
	review.RequestedByUserID = strings.TrimSpace(input.RequestedByUserID)
	review.OverrideActive = false
	review.OverrideReason = ""
	review.OverrideByUserID = ""
	review.OverrideByDisplayName = ""
	review.OverrideAt = nil
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

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

//go:fix inline
func reviewPtrBool(value bool) *bool {
	out := value
	return &out
}

func reviewPtrTime(value time.Time) *time.Time {
	value = value.UTC()
	return &value
}
