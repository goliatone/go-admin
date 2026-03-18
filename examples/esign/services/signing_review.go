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
		documents:    s.documents,
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
	for _, participant := range summary.Participants {
		if participant.RecipientID != strings.TrimSpace(recipientID) {
			continue
		}
		return buildSignerReviewContext(summary, participant, true), nil
	}
	return buildSummaryOnlyReviewContext(summary, true), nil
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

func (s SigningService) RequestReviewChanges(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input ReviewDecisionInput) (ReviewSummary, error) {
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
		IPAddress:   strings.TrimSpace(input.IPAddress),
		Comment:     strings.TrimSpace(input.Comment),
	})
}

func (s SigningService) GetReviewSession(ctx context.Context, scope stores.Scope, token PublicReviewToken) (SignerSessionContext, error) {
	switch strings.TrimSpace(token.Kind) {
	case "", PublicReviewTokenKindSigning:
		if token.SigningToken == nil {
			return SignerSessionContext{}, signerReviewAccessError("signer token is required")
		}
		return s.GetSession(ctx, scope, *token.SigningToken)
	case PublicReviewTokenKindReview:
		if token.ReviewToken == nil {
			return SignerSessionContext{}, signerReviewAccessError("review token is required")
		}
		return s.getReviewOnlySession(ctx, scope, *token.ReviewToken)
	default:
		return SignerSessionContext{}, signerReviewAccessError("unsupported review token type")
	}
}

func (s SigningService) ListPublicReviewThreads(ctx context.Context, scope stores.Scope, token PublicReviewToken) ([]ReviewThread, error) {
	_, reviewCtx, _, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return nil, err
	}
	if !reviewCtx.CanComment && !reviewCtx.CanApprove {
		return nil, signerReviewAccessError("review access is not enabled for this participant")
	}
	return filterSharedReviewThreads(reviewCtx.Threads), nil
}

func (s SigningService) CreatePublicReviewThread(ctx context.Context, scope stores.Scope, token PublicReviewToken, input ReviewCommentThreadInput) (ReviewThread, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this participant")
	}
	input.ReviewID = strings.TrimSpace(summary.Review.ID)
	input.Visibility = stores.AgreementCommentVisibilityShared
	input.ActorType = reviewActorTypeForParticipant(participant)
	input.ActorID = strings.TrimSpace(participant.ID)
	return s.reviewWorkflow().CreateCommentThread(ctx, scope, summary.AgreementID, input)
}

func (s SigningService) ReplyPublicReviewThread(ctx context.Context, scope stores.Scope, token PublicReviewToken, input ReviewCommentReplyInput) (ReviewThread, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this participant")
	}
	input.ActorType = reviewActorTypeForParticipant(participant)
	input.ActorID = strings.TrimSpace(participant.ID)
	return s.reviewWorkflow().ReplyCommentThread(ctx, scope, summary.AgreementID, input)
}

func (s SigningService) ResolvePublicReviewThread(ctx context.Context, scope stores.Scope, token PublicReviewToken, input ReviewCommentStateInput) (ReviewThread, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this participant")
	}
	input.ActorType = reviewActorTypeForParticipant(participant)
	input.ActorID = strings.TrimSpace(participant.ID)
	return s.reviewWorkflow().ResolveCommentThread(ctx, scope, summary.AgreementID, input)
}

func (s SigningService) ReopenPublicReviewThread(ctx context.Context, scope stores.Scope, token PublicReviewToken, input ReviewCommentStateInput) (ReviewThread, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewThread{}, err
	}
	if !reviewCtx.CanComment {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this participant")
	}
	input.ActorType = reviewActorTypeForParticipant(participant)
	input.ActorID = strings.TrimSpace(participant.ID)
	return s.reviewWorkflow().ReopenCommentThread(ctx, scope, summary.AgreementID, input)
}

func (s SigningService) ApprovePublicReview(ctx context.Context, scope stores.Scope, token PublicReviewToken) (ReviewSummary, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewSummary{}, err
	}
	if !reviewCtx.CanApprove {
		return ReviewSummary{}, signerReviewAccessError("review approval is not enabled for this participant")
	}
	return s.reviewWorkflow().ApproveReview(ctx, scope, summary.AgreementID, ReviewDecisionInput{
		ParticipantID: strings.TrimSpace(participant.ID),
		RecipientID:   strings.TrimSpace(participant.RecipientID),
		ActorType:     reviewActorTypeForParticipant(participant),
		ActorID:       strings.TrimSpace(participant.ID),
	})
}

func (s SigningService) RequestPublicReviewChanges(ctx context.Context, scope stores.Scope, token PublicReviewToken, input ReviewDecisionInput) (ReviewSummary, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, token)
	if err != nil {
		return ReviewSummary{}, err
	}
	if !reviewCtx.CanRequestChanges {
		return ReviewSummary{}, signerReviewAccessError("review change requests are not enabled for this participant")
	}
	return s.reviewWorkflow().RequestReviewChanges(ctx, scope, summary.AgreementID, ReviewDecisionInput{
		ParticipantID: strings.TrimSpace(participant.ID),
		RecipientID:   strings.TrimSpace(participant.RecipientID),
		ActorType:     reviewActorTypeForParticipant(participant),
		ActorID:       strings.TrimSpace(participant.ID),
		IPAddress:     strings.TrimSpace(input.IPAddress),
		Comment:       strings.TrimSpace(input.Comment),
	})
}

func (s SigningService) getReviewOnlySession(ctx context.Context, scope stores.Scope, token stores.ReviewSessionTokenRecord) (SignerSessionContext, error) {
	summary, reviewCtx, participant, err := s.ensurePublicReviewAccess(ctx, scope, PublicReviewToken{
		Kind:        PublicReviewTokenKindReview,
		ReviewToken: &token,
	})
	if err != nil {
		return SignerSessionContext{}, err
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, summary.AgreementID)
	if err != nil {
		return SignerSessionContext{}, err
	}
	fields, err := s.agreements.ListFields(ctx, scope, agreement.ID)
	if err != nil {
		return SignerSessionContext{}, err
	}
	document, compatibility, err := s.resolveSigningDocumentCompatibility(ctx, scope, agreement)
	if err != nil {
		return SignerSessionContext{}, err
	}
	documentName, pageCount, viewer, err := s.resolveSessionBootstrap(ctx, scope, document, compatibility, fields)
	if err != nil {
		return SignerSessionContext{}, err
	}
	pagesByNumber := map[int]SignerSessionViewerPage{}
	for _, page := range viewer.Pages {
		pagesByNumber[page.Page] = page
	}
	sessionFields := make([]SignerSessionField, 0, len(fields))
	tabIndex := 1
	for _, field := range fields {
		page, posX, posY, width, height, pageMeta := normalizeFieldGeometry(field, pageCount, pagesByNumber)
		sessionFields = append(sessionFields, SignerSessionField{
			ID:                field.ID,
			FieldInstanceID:   field.ID,
			FieldDefinitionID: strings.TrimSpace(field.FieldDefinitionID),
			RecipientID:       field.RecipientID,
			Type:              field.Type,
			Page:              page,
			PosX:              posX,
			PosY:              posY,
			Width:             width,
			Height:            height,
			PageWidth:         pageMeta.Width,
			PageHeight:        pageMeta.Height,
			PageRotation:      pageMeta.Rotation,
			Required:          field.Required,
			Label:             strings.TrimSpace(field.Type),
			TabIndex:          tabIndex,
		})
		tabIndex++
	}
	return SignerSessionContext{
		SessionKind:     "reviewer",
		AgreementID:     agreement.ID,
		AgreementStatus: agreement.Status,
		DocumentName:    documentName,
		PageCount:       pageCount,
		Viewer:          viewer,
		RecipientID:     participant.ID,
		RecipientRole:   stores.AgreementReviewParticipantRoleReviewer,
		RecipientEmail:  participant.Email,
		RecipientName:   firstNonEmptyString(participant.DisplayName, participant.Email),
		State:           SignerSessionStateObserver,
		Review:          reviewCtx,
		CanSign:         false,
		Fields:          sessionFields,
	}, nil
}

func (s SigningService) ensurePublicReviewAccess(ctx context.Context, scope stores.Scope, token PublicReviewToken) (ReviewSummary, *SignerSessionReviewContext, stores.AgreementReviewParticipantRecord, error) {
	switch strings.TrimSpace(token.Kind) {
	case "", PublicReviewTokenKindSigning:
		if token.SigningToken == nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("signer token is required")
		}
		summary, reviewCtx, err := s.ensureSignerReviewAccess(ctx, scope, *token.SigningToken)
		if err != nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, err
		}
		participant, _, err := findReviewParticipant(summary.Participants, "", token.SigningToken.RecipientID)
		if err != nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, err
		}
		_ = s.recordReviewParticipantView(ctx, scope, summary, participant)
		return summary, reviewCtx, participant, nil
	case PublicReviewTokenKindReview:
		if token.ReviewToken == nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review token is required")
		}
		summary, err := s.reviewWorkflow().GetReviewSummary(ctx, scope, token.ReviewToken.AgreementID)
		if err != nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, err
		}
		if summary.Status == "" || summary.Status == stores.AgreementReviewStatusNone || summary.Review == nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review is not enabled for this agreement")
		}
		if strings.TrimSpace(summary.Review.ID) != strings.TrimSpace(token.ReviewToken.ReviewID) {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review token does not match active review")
		}
		participant, _, err := findReviewParticipant(summary.Participants, token.ReviewToken.ParticipantID, "")
		if err != nil {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, err
		}
		reviewCtx := buildSignerReviewContext(summary, participant, false)
		if reviewCtx == nil || !reviewCtx.IsReviewer {
			return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("participant is not selected for review")
		}
		_ = s.recordReviewParticipantView(ctx, scope, summary, participant)
		return summary, reviewCtx, participant, nil
	default:
		return ReviewSummary{}, nil, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("unsupported review token type")
	}
}

func (s SigningService) recordReviewParticipantView(
	ctx context.Context,
	scope stores.Scope,
	summary ReviewSummary,
	participant stores.AgreementReviewParticipantRecord,
) error {
	if summary.Review == nil {
		return nil
	}
	return s.reviewWorkflow().appendAuditEvent(ctx, scope, summary.AgreementID, "agreement.review_viewed", reviewActorTypeForParticipant(participant), strings.TrimSpace(firstNonEmptyString(participant.RecipientID, participant.ID)), map[string]any{
		"review_id":         strings.TrimSpace(summary.Review.ID),
		"participant_id":    strings.TrimSpace(participant.ID),
		"recipient_id":      strings.TrimSpace(participant.RecipientID),
		"participant_type":  strings.TrimSpace(participant.ParticipantType),
		"participant_email": strings.TrimSpace(participant.Email),
	})
}

func buildSummaryOnlyReviewContext(summary ReviewSummary, canSign bool) *SignerSessionReviewContext {
	if summary.Review == nil {
		return nil
	}
	sharedThreads := filterSharedReviewThreads(summary.Threads)
	ctx := &SignerSessionReviewContext{
		ReviewID:            strings.TrimSpace(summary.Review.ID),
		Status:              summary.Status,
		Gate:                summary.Gate,
		CommentsEnabled:     summary.CommentsEnabled,
		CanSign:             canSign,
		OpenThreadCount:     countThreadsByStatus(sharedThreads, stores.AgreementCommentThreadStatusOpen),
		ResolvedThreadCount: countThreadsByStatus(sharedThreads, stores.AgreementCommentThreadStatusResolved),
		Threads:             sharedThreads,
	}
	return ctx
}

func buildSignerReviewContext(summary ReviewSummary, participant stores.AgreementReviewParticipantRecord, canSign bool) *SignerSessionReviewContext {
	ctx := buildSummaryOnlyReviewContext(summary, canSign)
	if ctx == nil {
		return nil
	}
	ctx.IsReviewer = true
	ctx.CanComment = summary.CommentsEnabled && participant.CanComment
	ctx.CanApprove = participant.CanApprove
	ctx.CanRequestChanges = participant.CanApprove
	ctx.ParticipantStatus = participant.DecisionStatus
	ctx.Participant = reviewSessionParticipantFromRecord(participant)
	if ctx.Gate == stores.AgreementReviewGateApproveBeforeSign && canSign && summary.Status != stores.AgreementReviewStatusApproved {
		ctx.SignBlocked = true
		ctx.CanSign = false
		switch ctx.ParticipantStatus {
		case stores.AgreementReviewDecisionChangesRequested:
			ctx.SignBlockReason = "requested changes must be resolved before signing"
		default:
			ctx.SignBlockReason = "review approval is required before signing"
		}
		ctx.Blockers = append(ctx.Blockers, ctx.SignBlockReason)
	}
	return ctx
}

func filterSharedReviewThreads(threads []ReviewThread) []ReviewThread {
	out := make([]ReviewThread, 0, len(threads))
	for _, thread := range threads {
		if strings.TrimSpace(thread.Thread.Visibility) != stores.AgreementCommentVisibilityShared {
			continue
		}
		out = append(out, thread)
	}
	return out
}

func countThreadsByStatus(threads []ReviewThread, status string) int {
	count := 0
	for _, thread := range threads {
		if strings.TrimSpace(thread.Thread.Status) == strings.TrimSpace(status) {
			count++
		}
	}
	return count
}

func reviewSessionParticipantFromRecord(record stores.AgreementReviewParticipantRecord) *ReviewSessionParticipant {
	return &ReviewSessionParticipant{
		ID:              strings.TrimSpace(record.ID),
		ParticipantType: strings.TrimSpace(record.ParticipantType),
		RecipientID:     strings.TrimSpace(record.RecipientID),
		Email:           strings.TrimSpace(record.Email),
		DisplayName:     strings.TrimSpace(record.DisplayName),
		DecisionStatus:  strings.TrimSpace(record.DecisionStatus),
	}
}

func reviewActorTypeForParticipant(participant stores.AgreementReviewParticipantRecord) string {
	if strings.TrimSpace(participant.RecipientID) != "" {
		return "recipient"
	}
	return "reviewer"
}

func signerReviewAccessError(message string) error {
	return goerrors.New(strings.TrimSpace(message), goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode(string(ErrorCodeInvalidSignerState))
}
