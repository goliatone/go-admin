package services

import (
	"bytes"
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

// SignerAssetContract summarizes token-scoped document/artifact availability without exposing storage keys.
type SignerAssetContract struct {
	AgreementID               string `json:"agreement_id"`
	AgreementStatus           string `json:"agreement_status"`
	RecipientID               string `json:"recipient_id"`
	RecipientRole             string `json:"recipient_role"`
	PreviewDocumentAvailable  bool   `json:"preview_document_available"`
	SourceDocumentAvailable   bool   `json:"source_document_available"`
	ExecutedArtifactAvailable bool   `json:"executed_artifact_available"`
	CertificateAvailable      bool   `json:"certificate_available"`
	PreviewObjectKey          string `json:"-"`
	SourceObjectKey           string `json:"-"`
	ExecutedObjectKey         string `json:"-"`
	CertificateObjectKey      string `json:"-"`
}

// SignerAssetContractService resolves token-scoped signer/completion asset contract metadata.
type SignerAssetContractService struct {
	agreements stores.AgreementStore
	documents  stores.DocumentStore
	artifacts  stores.AgreementArtifactStore
	objects    signerAssetObjectStore
	pdfs       PDFService
}

type signerAssetObjectStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// SignerAssetContractOption customizes signer asset contract resolution.
type SignerAssetContractOption func(*SignerAssetContractService)

// WithSignerAssetObjectStore enables availability checks against persisted object storage.
func WithSignerAssetObjectStore(store signerAssetObjectStore) SignerAssetContractOption {
	return func(s *SignerAssetContractService) {
		if s == nil {
			return
		}
		s.objects = store
	}
}

// WithSignerAssetPDFService configures preview asset selection to match active PDF policy.
func WithSignerAssetPDFService(service PDFService) SignerAssetContractOption {
	return func(s *SignerAssetContractService) {
		if s == nil {
			return
		}
		s.pdfs = service
	}
}

func NewSignerAssetContractService(store stores.Store, opts ...SignerAssetContractOption) SignerAssetContractService {
	svc := SignerAssetContractService{
		agreements: store,
		documents:  store,
		artifacts:  store,
		pdfs:       NewPDFService(),
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s SignerAssetContractService) Resolve(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (SignerAssetContract, error) {
	if s.agreements == nil {
		return SignerAssetContract{}, domainValidationError("signing_assets", "agreements", "not configured")
	}
	agreementID := strings.TrimSpace(token.AgreementID)
	recipientID := strings.TrimSpace(token.RecipientID)
	if agreementID == "" || recipientID == "" {
		return SignerAssetContract{}, domainValidationError("signing_tokens", "agreement_id|recipient_id", "required")
	}

	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return SignerAssetContract{}, err
	}

	recipients, err := s.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return SignerAssetContract{}, err
	}
	recipientRole := ""
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.ID) != recipientID {
			continue
		}
		recipientRole = strings.TrimSpace(recipient.Role)
		break
	}
	if recipientRole == "" {
		return SignerAssetContract{}, domainValidationError("recipients", "id", "not found for token")
	}

	contract := SignerAssetContract{
		AgreementID:     agreementID,
		AgreementStatus: strings.TrimSpace(agreement.Status),
		RecipientID:     recipientID,
		RecipientRole:   recipientRole,
	}
	s.populateDocumentAssets(ctx, scope, strings.TrimSpace(agreement.DocumentID), &contract)
	s.populateAgreementArtifactAssets(ctx, scope, agreementID, &contract)

	return contract, nil
}

// ResolvePublic resolves a token-scoped asset contract for either signer or review sessions.
// Review sessions are intentionally restricted to source-document preview access only.
func (s SignerAssetContractService) ResolvePublic(ctx context.Context, scope stores.Scope, token PublicReviewToken) (SignerAssetContract, error) {
	switch strings.TrimSpace(token.Kind) {
	case "", PublicReviewTokenKindSigning:
		if token.SigningToken == nil {
			return SignerAssetContract{}, domainValidationError("signing_tokens", "token", "required")
		}
		return s.Resolve(ctx, scope, *token.SigningToken)
	case PublicReviewTokenKindReview:
		if s.agreements == nil {
			return SignerAssetContract{}, domainValidationError("signing_assets", "agreements", "not configured")
		}
		if token.ReviewToken == nil {
			return SignerAssetContract{}, domainValidationError("review_session_tokens", "token", "required")
		}
		agreementID := strings.TrimSpace(token.ReviewToken.AgreementID)
		participantID := strings.TrimSpace(token.ReviewToken.ParticipantID)
		if agreementID == "" || participantID == "" {
			return SignerAssetContract{}, domainValidationError("review_session_tokens", "agreement_id|participant_id", "required")
		}
		review, participant, err := ensureActiveReviewParticipant(ctx, scope, s.agreements, *token.ReviewToken)
		if err != nil {
			return SignerAssetContract{}, err
		}
		if strings.TrimSpace(review.AgreementID) != "" && strings.TrimSpace(review.AgreementID) != agreementID {
			return SignerAssetContract{}, signerReviewAccessError("review token does not match active review")
		}

		agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return SignerAssetContract{}, err
		}

		contract := SignerAssetContract{
			AgreementID:     agreementID,
			AgreementStatus: strings.TrimSpace(agreement.Status),
			RecipientID:     participantID,
			RecipientRole:   firstNonEmptyString(strings.TrimSpace(participant.Role), stores.AgreementReviewParticipantRoleReviewer),
		}
		s.populatePreviewDocumentAsset(ctx, scope, strings.TrimSpace(agreement.DocumentID), &contract)

		return contract, nil
	default:
		return SignerAssetContract{}, domainValidationError("public_review_tokens", "kind", "unsupported")
	}
}

func (s SignerAssetContractService) objectAvailable(ctx context.Context, objectKey string) bool {
	objectKey = strings.TrimSpace(objectKey)
	if objectKey == "" {
		return false
	}
	if s.objects == nil {
		return true
	}
	payload, err := s.objects.GetFile(ctx, objectKey)
	return err == nil && len(payload) > 0
}

func (s SignerAssetContractService) populateDocumentAssets(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
	contract *SignerAssetContract,
) {
	document, ok := s.lookupAgreementDocument(ctx, scope, documentID)
	if !ok {
		return
	}
	s.assignPreviewDocumentAsset(ctx, scope, contract, document)
	s.assignSourceDocumentAsset(ctx, contract, document)
}

func (s SignerAssetContractService) populatePreviewDocumentAsset(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
	contract *SignerAssetContract,
) {
	document, ok := s.lookupAgreementDocument(ctx, scope, documentID)
	if !ok {
		return
	}
	s.assignPreviewDocumentAsset(ctx, scope, contract, document)
}

func (s SignerAssetContractService) lookupAgreementDocument(
	ctx context.Context,
	scope stores.Scope,
	documentID string,
) (stores.DocumentRecord, bool) {
	if s.documents == nil || strings.TrimSpace(documentID) == "" {
		return stores.DocumentRecord{}, false
	}
	document, err := s.documents.Get(ctx, scope, strings.TrimSpace(documentID))
	if err != nil {
		return stores.DocumentRecord{}, false
	}
	return document, true
}

func (s SignerAssetContractService) assignPreviewDocumentAsset(
	ctx context.Context,
	scope stores.Scope,
	contract *SignerAssetContract,
	document stores.DocumentRecord,
) {
	if contract == nil {
		return
	}
	if previewKey := s.resolvePreviewObjectKey(ctx, scope, document); previewKey != "" {
		contract.PreviewDocumentAvailable = true
		contract.PreviewObjectKey = previewKey
	}
}

func (s SignerAssetContractService) assignSourceDocumentAsset(ctx context.Context, contract *SignerAssetContract, document stores.DocumentRecord) {
	if contract == nil {
		return
	}
	objectKey := strings.TrimSpace(document.SourceObjectKey)
	if s.objectAvailable(ctx, objectKey) {
		contract.SourceDocumentAvailable = true
		contract.SourceObjectKey = objectKey
	}
}

func (s SignerAssetContractService) populateAgreementArtifactAssets(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	contract *SignerAssetContract,
) {
	if s.artifacts == nil || contract == nil {
		return
	}
	artifacts, err := s.artifacts.GetAgreementArtifacts(ctx, scope, agreementID)
	if err != nil {
		return
	}
	s.assignAgreementArtifactAsset(ctx, contract, strings.TrimSpace(artifacts.ExecutedObjectKey), true)
	s.assignAgreementArtifactAsset(ctx, contract, strings.TrimSpace(artifacts.CertificateObjectKey), false)
}

func (s SignerAssetContractService) assignAgreementArtifactAsset(
	ctx context.Context,
	contract *SignerAssetContract,
	objectKey string,
	executed bool,
) {
	if contract == nil || !s.objectAvailable(ctx, objectKey) {
		return
	}
	if executed {
		contract.ExecutedArtifactAvailable = true
		contract.ExecutedObjectKey = objectKey
		return
	}
	contract.CertificateAvailable = true
	contract.CertificateObjectKey = objectKey
}

func (s SignerAssetContractService) resolvePreviewObjectKey(ctx context.Context, scope stores.Scope, document stores.DocumentRecord) string {
	policy := s.pdfs.Policy(ctx, scope)
	if policy.PreviewFallbackEnabled {
		return ""
	}

	sourceObjectKey := strings.TrimSpace(document.SourceObjectKey)
	normalizedObjectKey := strings.TrimSpace(document.NormalizedObjectKey)

	if !policyPrefersNormalizedSource(policy) {
		if s.previewObjectUsable(ctx, scope, sourceObjectKey, document.PageCount) {
			return sourceObjectKey
		}
		if s.previewObjectUsable(ctx, scope, normalizedObjectKey, document.PageCount) {
			return normalizedObjectKey
		}
		return ""
	}

	if s.previewObjectUsable(ctx, scope, normalizedObjectKey, document.PageCount) {
		return normalizedObjectKey
	}
	if !policyAllowsOriginalFallback(policy) {
		return ""
	}
	if s.previewObjectUsable(ctx, scope, sourceObjectKey, document.PageCount) {
		return sourceObjectKey
	}
	return ""
}

func (s SignerAssetContractService) previewObjectUsable(ctx context.Context, scope stores.Scope, objectKey string, pageCount int) bool {
	objectKey = strings.TrimSpace(objectKey)
	if objectKey == "" {
		return false
	}
	if s.objects == nil {
		return true
	}

	payload, err := s.objects.GetFile(ctx, objectKey)
	if err != nil || len(payload) == 0 || !bytes.HasPrefix(payload, []byte("%PDF-")) {
		return false
	}
	if pageCount <= 0 {
		pageCount = 1
	}
	_, err = s.pdfs.PageGeometry(ctx, scope, payload, pageCount)
	return err == nil
}
