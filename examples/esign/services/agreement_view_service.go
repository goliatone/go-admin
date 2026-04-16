package services

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

// AgreementViewActor describes the authenticated sender/admin actor using the agreement viewer.
type AgreementViewActor struct {
	ActorID    string `json:"actor_id"`
	CanComment bool   `json:"can_comment"`
}

// AgreementViewService assembles sender-authenticated agreement viewer sessions and assets.
type AgreementViewService struct {
	signing SigningService
	assets  SignerAssetContractService
}

type senderSessionBootstrap struct {
	agreement     stores.AgreementRecord
	recipients    []stores.RecipientRecord
	fields        []stores.FieldRecord
	documentName  string
	pageCount     int
	viewer        SignerSessionViewerContext
	reviewSummary ReviewSummary
}

func NewAgreementViewService(signing SigningService, store stores.Store, opts ...SignerAssetContractOption) AgreementViewService {
	return AgreementViewService{
		signing: signing,
		assets:  NewSignerAssetContractService(store, opts...),
	}
}

func (s AgreementViewService) loadSenderSessionBootstrap(ctx context.Context, scope stores.Scope, agreementID string) (senderSessionBootstrap, error) {
	agreement, err := s.signing.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	recipients, err := s.signing.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	fields, err := s.signing.agreements.ListFields(ctx, scope, agreementID)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	document, compatibility, err := s.signing.resolveSigningDocumentCompatibility(ctx, scope, agreement)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	if compatibility.Tier == PDFCompatibilityTierUnsupported && !policyAllowsAnalyzeOnlyUpload(s.signing.pdfs.Policy(ctx, scope)) {
		return senderSessionBootstrap{}, pdfUnsupportedError("agreement_view.bootstrap", string(compatibility.Tier), compatibility.Reason, map[string]any{
			"agreement_id": agreement.ID,
			"document_id":  document.ID,
		})
	}
	documentName, pageCount, viewer, err := s.signing.resolveSessionBootstrap(ctx, scope, document, compatibility, fields)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	reviewSummary, err := s.signing.reviewWorkflow().GetReviewSummary(ctx, scope, agreementID)
	if err != nil {
		return senderSessionBootstrap{}, err
	}
	return senderSessionBootstrap{
		agreement:     agreement,
		recipients:    recipients,
		fields:        fields,
		documentName:  documentName,
		pageCount:     pageCount,
		viewer:        viewer,
		reviewSummary: reviewSummary,
	}, nil
}

func (s AgreementViewService) buildSenderSessionFields(ctx context.Context, scope stores.Scope, agreementID string, recipients []stores.RecipientRecord, fields []stores.FieldRecord, pageCount int, viewer SignerSessionViewerContext, agreementStatus string) ([]SignerSessionField, error) {
	pagesByNumber := map[int]SignerSessionViewerPage{}
	for _, page := range viewer.Pages {
		pagesByNumber[page.Page] = page
	}
	valuesByField, err := s.listAgreementFieldValues(ctx, scope, agreementID, recipients)
	if err != nil {
		return nil, err
	}
	showFieldValues := ResolveSenderViewerPolicy().CanExposeInProgressFieldValues(strings.TrimSpace(agreementStatus))
	sessionFields := make([]SignerSessionField, 0, len(fields))
	tabIndex := 1
	for _, field := range fields {
		page, posX, posY, width, height, pageMeta := normalizeFieldGeometry(field, pageCount, pagesByNumber)
		sessionField := SignerSessionField{
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
		}
		if showFieldValues {
			value := valuesByField[strings.TrimSpace(field.ID)]
			sessionField.ValueText = strings.TrimSpace(value.ValueText)
			sessionField.ValueBool = value.ValueBool
		}
		sessionFields = append(sessionFields, sessionField)
		tabIndex++
	}
	return sessionFields, nil
}

func (s AgreementViewService) GetSenderSession(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor) (SignerSessionContext, error) {
	if s.signing.agreements == nil {
		return SignerSessionContext{}, domainValidationError("agreements", "store", "not configured")
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return SignerSessionContext{}, domainValidationError("agreements", "id", "required")
	}
	bootstrap, err := s.loadSenderSessionBootstrap(ctx, scope, agreementID)
	if err != nil {
		return SignerSessionContext{}, err
	}
	sessionFields, err := s.buildSenderSessionFields(ctx, scope, agreementID, bootstrap.recipients, bootstrap.fields, bootstrap.pageCount, bootstrap.viewer, bootstrap.agreement.Status)
	if err != nil {
		return SignerSessionContext{}, err
	}
	reviewCtx := buildSenderReviewContext(bootstrap.reviewSummary, actor.CanComment)
	viewMode := deriveAgreementViewerMode(strings.TrimSpace(bootstrap.agreement.Status), bootstrap.reviewSummary.Review != nil)
	uiMode, defaultTab, reviewMarkersVisible, reviewMarkersInteractive := deriveAgreementViewerUIPresentation(viewMode, reviewCtx != nil)

	activeStage, activeSigners, _ := activeSignerStageFromRecipients(bootstrap.recipients)
	activeRecipientIDs := recipientIDs(activeSigners)

	return SignerSessionContext{
		SessionKind:              "sender",
		UIMode:                   uiMode,
		DefaultTab:               defaultTab,
		ViewerMode:               viewMode,
		ViewerBanner:             deriveAgreementViewerBanner(viewMode),
		ReviewMarkersVisible:     reviewMarkersVisible,
		ReviewMarkersInteractive: reviewMarkersInteractive,
		AgreementID:              bootstrap.agreement.ID,
		AgreementStatus:          bootstrap.agreement.Status,
		DocumentName:             bootstrap.documentName,
		PageCount:                bootstrap.pageCount,
		Viewer:                   bootstrap.viewer,
		RecipientRole:            "sender",
		ActiveStage:              activeStage,
		State:                    SignerSessionStateObserver,
		ActiveRecipientID:        coalesceFirst(activeRecipientIDs),
		ActiveRecipientIDs:       activeRecipientIDs,
		Review:                   reviewCtx,
		CanSign:                  false,
		Fields:                   sessionFields,
	}, nil
}

func (s AgreementViewService) ResolveSenderAssets(ctx context.Context, scope stores.Scope, agreementID string) (SignerAssetContract, error) {
	if s.signing.agreements == nil {
		return SignerAssetContract{}, domainValidationError("agreements", "store", "not configured")
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return SignerAssetContract{}, domainValidationError("agreements", "id", "required")
	}

	agreement, err := s.signing.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return SignerAssetContract{}, err
	}
	contract := SignerAssetContract{
		AgreementID:     agreementID,
		AgreementStatus: strings.TrimSpace(agreement.Status),
		RecipientRole:   "sender",
	}
	s.assets.populateDocumentAssets(ctx, scope, strings.TrimSpace(agreement.DocumentID), &contract)
	s.assets.populateAgreementArtifactAssets(ctx, scope, agreementID, &contract)
	return contract, nil
}

func (s AgreementViewService) CreateSenderReviewThread(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor, input ReviewCommentThreadInput) (ReviewThread, error) {
	if !s.senderCommentMutationsAllowed(ctx, scope, agreementID, actor) {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this sender")
	}
	input.Visibility = stores.AgreementCommentVisibilityShared
	input.ActorType = "user"
	input.ActorID = strings.TrimSpace(actor.ActorID)
	thread, err := s.signing.reviewWorkflow().CreateCommentThread(ctx, scope, agreementID, input)
	if err != nil {
		return ReviewThread{}, err
	}
	s.notifyAgreementChange(ctx, scope, agreementID, "Review comment thread created", map[string]any{
		"thread_id": strings.TrimSpace(thread.Thread.ID),
		"actor_id":  strings.TrimSpace(actor.ActorID),
	})
	return thread, nil
}

func mutateSenderReviewThread[T any](
	s AgreementViewService,
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	actor AgreementViewActor,
	threadID string,
	input T,
	message string,
	prepare func(T, string) T,
	mutate func(T) (ReviewThread, error),
) (ReviewThread, error) {
	if !s.senderCommentMutationsAllowed(ctx, scope, agreementID, actor) {
		return ReviewThread{}, signerReviewAccessError("comments are not enabled for this sender")
	}
	if err := s.ensureSharedViewerThread(ctx, scope, agreementID, threadID); err != nil {
		return ReviewThread{}, err
	}
	actorID := strings.TrimSpace(actor.ActorID)
	thread, err := mutate(prepare(input, actorID))
	if err != nil {
		return ReviewThread{}, err
	}
	s.notifyAgreementChange(ctx, scope, agreementID, message, map[string]any{
		"thread_id": strings.TrimSpace(thread.Thread.ID),
		"actor_id":  actorID,
	})
	return thread, nil
}

func (s AgreementViewService) ReplySenderReviewThread(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor, input ReviewCommentReplyInput) (ReviewThread, error) {
	return mutateSenderReviewThread(s, ctx, scope, agreementID, actor, input.ThreadID, input, "Review reply created",
		func(input ReviewCommentReplyInput, actorID string) ReviewCommentReplyInput {
			input.ActorType = "user"
			input.ActorID = actorID
			return input
		},
		func(input ReviewCommentReplyInput) (ReviewThread, error) {
			return s.signing.reviewWorkflow().ReplyCommentThread(ctx, scope, agreementID, input)
		},
	)
}

func (s AgreementViewService) ResolveSenderReviewThread(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor, input ReviewCommentStateInput) (ReviewThread, error) {
	return mutateSenderReviewThread(s, ctx, scope, agreementID, actor, input.ThreadID, input, "Review thread resolved",
		func(input ReviewCommentStateInput, actorID string) ReviewCommentStateInput {
			input.ActorType = "user"
			input.ActorID = actorID
			return input
		},
		func(input ReviewCommentStateInput) (ReviewThread, error) {
			return s.signing.reviewWorkflow().ResolveCommentThread(ctx, scope, agreementID, input)
		},
	)
}

func (s AgreementViewService) ReopenSenderReviewThread(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor, input ReviewCommentStateInput) (ReviewThread, error) {
	return mutateSenderReviewThread(s, ctx, scope, agreementID, actor, input.ThreadID, input, "Review thread reopened",
		func(input ReviewCommentStateInput, actorID string) ReviewCommentStateInput {
			input.ActorType = "user"
			input.ActorID = actorID
			return input
		},
		func(input ReviewCommentStateInput) (ReviewThread, error) {
			return s.signing.reviewWorkflow().ReopenCommentThread(ctx, scope, agreementID, input)
		},
	)
}

func (s AgreementViewService) listAgreementFieldValues(ctx context.Context, scope stores.Scope, agreementID string, recipients []stores.RecipientRecord) (map[string]stores.FieldValueRecord, error) {
	valuesByField := map[string]stores.FieldValueRecord{}
	if s.signing.signing == nil {
		return valuesByField, nil
	}
	for _, recipient := range recipients {
		recipientID := strings.TrimSpace(recipient.ID)
		if recipientID == "" {
			continue
		}
		values, err := s.signing.signing.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
		if err != nil {
			return nil, err
		}
		for _, value := range values {
			fieldID := strings.TrimSpace(value.FieldID)
			if fieldID == "" {
				continue
			}
			valuesByField[fieldID] = value
		}
	}
	return valuesByField, nil
}

func (s AgreementViewService) ensureSharedViewerThread(ctx context.Context, scope stores.Scope, agreementID, threadID string) error {
	if s.signing.agreements == nil {
		return domainValidationError("agreements", "store", "not configured")
	}
	thread, err := s.signing.agreements.GetAgreementCommentThread(ctx, scope, strings.TrimSpace(threadID))
	if err != nil {
		return err
	}
	if strings.TrimSpace(thread.AgreementID) != strings.TrimSpace(agreementID) {
		return domainValidationError("agreement_comment_threads", "thread_id", "thread must belong to agreement")
	}
	if strings.TrimSpace(thread.Visibility) != stores.AgreementCommentVisibilityShared {
		return reviewVisibilityError()
	}
	return nil
}

func buildSenderReviewContext(summary ReviewSummary, canComment bool) *SignerSessionReviewContext {
	ctx := buildSummaryOnlyReviewContext(summary, false)
	if ctx == nil {
		return nil
	}
	ctx.IsReviewer = false
	ctx.CanComment = canComment && ctx.CommentsEnabled && !ctx.OverrideActive
	ctx.CanApprove = false
	ctx.CanRequestChanges = false
	ctx.CanSign = false
	ctx.ParticipantStatus = ""
	ctx.Participant = nil
	return ctx
}

func senderReviewCommentsAllowed(summary ReviewSummary, actor AgreementViewActor) bool {
	if !actor.CanComment {
		return false
	}
	if summary.Review == nil {
		return false
	}
	return summary.CommentsEnabled && !summary.OverrideActive
}

func (s AgreementViewService) senderCommentMutationsAllowed(ctx context.Context, scope stores.Scope, agreementID string, actor AgreementViewActor) bool {
	if s.signing.agreements == nil {
		return false
	}
	summary, err := s.signing.reviewWorkflow().GetReviewSummary(ctx, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return false
	}
	return senderReviewCommentsAllowed(summary, actor)
}

func deriveAgreementViewerMode(agreementStatus string, hasReview bool) string {
	switch strings.ToLower(strings.TrimSpace(agreementStatus)) {
	case stores.AgreementStatusCompleted:
		return "complete"
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		return "sign"
	default:
		if hasReview {
			return "review"
		}
		return "read_only"
	}
}

func deriveAgreementViewerUIPresentation(mode string, hasReview bool) (string, string, bool, bool) {
	switch strings.TrimSpace(mode) {
	case "review":
		return SignerSessionUIModeReview, SignerSessionDefaultTabReview, hasReview, hasReview
	case "sign", "complete", "read_only":
		if hasReview {
			return SignerSessionUIModeSignAndReview, SignerSessionDefaultTabSign, true, true
		}
	}
	return SignerSessionUIModeSign, SignerSessionDefaultTabSign, false, false
}

func deriveAgreementViewerBanner(mode string) string {
	switch strings.TrimSpace(mode) {
	case "review":
		return "sender_review"
	case "sign":
		return "sender_progress"
	case "complete":
		return "sender_complete"
	default:
		return "sender_read_only"
	}
}

func (s AgreementViewService) notifyAgreementChange(ctx context.Context, scope stores.Scope, agreementID, message string, metadata map[string]any) {
	s.signing.notifyAgreementChanged(ctx, scope, AgreementChangeNotification{
		AgreementID: strings.TrimSpace(agreementID),
		Sections:    []string{"review_status", "comments", "timeline"},
		Status:      "completed",
		Message:     strings.TrimSpace(message),
		Metadata:    metadata,
	})
}
