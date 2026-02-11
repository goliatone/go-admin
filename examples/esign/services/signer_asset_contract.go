package services

import (
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
	SourceDocumentAvailable   bool   `json:"source_document_available"`
	ExecutedArtifactAvailable bool   `json:"executed_artifact_available"`
	CertificateAvailable      bool   `json:"certificate_available"`
}

// SignerAssetContractService resolves token-scoped signer/completion asset contract metadata.
type SignerAssetContractService struct {
	agreements stores.AgreementStore
	documents  stores.DocumentStore
	artifacts  stores.AgreementArtifactStore
}

func NewSignerAssetContractService(
	agreements stores.AgreementStore,
	documents stores.DocumentStore,
	artifacts stores.AgreementArtifactStore,
) SignerAssetContractService {
	return SignerAssetContractService{
		agreements: agreements,
		documents:  documents,
		artifacts:  artifacts,
	}
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

	if s.documents != nil {
		if _, err := s.documents.Get(ctx, scope, strings.TrimSpace(agreement.DocumentID)); err == nil {
			contract.SourceDocumentAvailable = true
		}
	}
	if s.artifacts != nil {
		if artifacts, err := s.artifacts.GetAgreementArtifacts(ctx, scope, agreementID); err == nil {
			contract.ExecutedArtifactAvailable = strings.TrimSpace(artifacts.ExecutedObjectKey) != ""
			contract.CertificateAvailable = strings.TrimSpace(artifacts.CertificateObjectKey) != ""
		}
	}

	return contract, nil
}
