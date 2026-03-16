package services

import (
	"context"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

func (s SigningService) reviewWorkflow() AgreementService {
	return AgreementService{
		agreements:   s.agreements,
		audits:       s.audits,
		tx:           s.tx,
		now:          s.now,
		customAudits: !sameInstance(s.audits, s.agreements),
	}
}

func (s SigningService) resolveSignerReviewContext(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (*SignerSessionReviewContext, error) {
	summary, err := s.reviewWorkflow().GetReviewSummary(ctx, scope, agreementID)
	if err != nil {
		return nil, err
	}
	if summary.Status == "" || summary.Status == stores.AgreementReviewStatusNone {
		return nil, nil
	}
	reviewCtx := &SignerSessionReviewContext{
		Status:              summary.Status,
		Gate:                summary.Gate,
		CommentsEnabled:     summary.CommentsEnabled,
		CanSign:             true,
		OpenThreadCount:     summary.OpenThreadCount,
		ResolvedThreadCount: summary.ResolvedThreadCount,
	}
	for _, participant := range summary.Participants {
		if participant.RecipientID != strings.TrimSpace(recipientID) {
			continue
		}
		reviewCtx.IsReviewer = true
		reviewCtx.CanComment = summary.CommentsEnabled && participant.CanComment
		reviewCtx.CanApprove = participant.CanApprove
		reviewCtx.CanRequestChanges = participant.CanApprove
		reviewCtx.ParticipantStatus = participant.DecisionStatus
		break
	}
	if reviewCtx.Gate == stores.AgreementReviewGateApproveBeforeSign && reviewCtx.IsReviewer && summary.Status != stores.AgreementReviewStatusApproved {
		reviewCtx.SignBlocked = true
		reviewCtx.CanSign = false
		switch reviewCtx.ParticipantStatus {
		case stores.AgreementReviewDecisionChangesRequested:
			reviewCtx.SignBlockReason = "requested changes must be resolved before signing"
		default:
			reviewCtx.SignBlockReason = "review approval is required before signing"
		}
	}
	return reviewCtx, nil
}

func (s SigningService) ensureSignerReviewAccess(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (ReviewSummary, *SignerSessionReviewContext, error) {
	summary, err := s.reviewWorkflow().GetReviewSummary(ctx, scope, token.AgreementID)
	if err != nil {
		return ReviewSummary{}, nil, err
	}
	if summary.Status == "" || summary.Status == stores.AgreementReviewStatusNone || summary.Review == nil {
		return ReviewSummary{}, nil, signerReviewAccessError("review is not enabled for this agreement")
	}
	reviewCtx, err := s.resolveSignerReviewContext(ctx, scope, token.AgreementID, token.RecipientID)
	if err != nil {
		return ReviewSummary{}, nil, err
	}
	if reviewCtx == nil || !reviewCtx.IsReviewer {
		return ReviewSummary{}, nil, signerReviewAccessError("recipient is not selected for review")
	}
	return summary, reviewCtx, nil
}

func (s SigningService) ListReviewThreads(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) ([]ReviewThread, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return nil, err
	}
	if !reviewCtx.CanComment && !reviewCtx.CanApprove {
		return nil, signerReviewAccessError("review access is not enabled for this recipient")
	}
	return s.reviewWorkflow().ListReviewThreads(ctx, scope, token.AgreementID, stores.AgreementCommentVisibilityShared)
}

func (s SigningService) CreateReviewThread(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input ReviewCommentThreadInput) (ReviewThread, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this recipient")
	}
	input.Visibility = stores.AgreementCommentVisibilityShared
	input.ActorType = "recipient"
	input.ActorID = strings.TrimSpace(token.RecipientID)
	return s.reviewWorkflow().CreateCommentThread(ctx, scope, token.AgreementID, input)
}

func (s SigningService) ReplyReviewThread(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input ReviewCommentReplyInput) (ReviewThread, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this recipient")
	}
	input.ActorType = "recipient"
	input.ActorID = strings.TrimSpace(token.RecipientID)
	return s.reviewWorkflow().ReplyCommentThread(ctx, scope, token.AgreementID, input)
}

func (s SigningService) ResolveReviewThread(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input ReviewCommentStateInput) (ReviewThread, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this recipient")
	}
	input.ActorType = "recipient"
	input.ActorID = strings.TrimSpace(token.RecipientID)
	return s.reviewWorkflow().ResolveCommentThread(ctx, scope, token.AgreementID, input)
}

func (s SigningService) ReopenReviewThread(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input ReviewCommentStateInput) (ReviewThread, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this recipient")
	}
	input.ActorType = "recipient"
	input.ActorID = strings.TrimSpace(token.RecipientID)
	return s.reviewWorkflow().ReopenCommentThread(ctx, scope, token.AgreementID, input)
}

func (s SigningService) ApproveReview(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (ReviewSummary, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewSummary{}, err
	}
	if !reviewCtx.CanApprove {
		return ReviewSummary{}, signerReviewAccessError("review approval is not enabled for this recipient")
	}
	return s.reviewWorkflow().ApproveReview(ctx, scope, token.AgreementID, ReviewDecisionInput{
		RecipientID: strings.TrimSpace(token.RecipientID),
		ActorType:   "recipient",
		ActorID:     strings.TrimSpace(token.RecipientID),
	})
}

func (s SigningService) RequestReviewChanges(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (ReviewSummary, error) {
	_, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewSummary{}, err
	}
	if !reviewCtx.CanRequestChanges {
		return ReviewSummary{}, signerReviewAccessError("review change requests are not enabled for this recipient")
	}
	return s.reviewWorkflow().RequestReviewChanges(ctx, scope, token.AgreementID, ReviewDecisionInput{
		RecipientID: strings.TrimSpace(token.RecipientID),
		ActorType:   "recipient",
		ActorID:     strings.TrimSpace(token.RecipientID),
	})
}

func signerReviewAccessError(message string) error {
	return goerrors.New(strings.TrimSpace(message), goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode(string(ErrorCodeInvalidSignerState))
}
