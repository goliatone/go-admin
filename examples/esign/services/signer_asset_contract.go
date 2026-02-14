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

func NewSignerAssetContractService(store stores.Store, opts ...SignerAssetContractOption) SignerAssetContractService {
	svc := SignerAssetContractService{
		agreements: store,
		documents:  store,
		artifacts:  store,
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

	if s.documents != nil {
		if document, err := s.documents.Get(ctx, scope, strings.TrimSpace(agreement.DocumentID)); err == nil {
			objectKey := strings.TrimSpace(document.SourceObjectKey)
			if s.objectAvailable(ctx, objectKey) {
				contract.SourceDocumentAvailable = true
				contract.SourceObjectKey = objectKey
			}
		}
	}
	if s.artifacts != nil {
		if artifacts, err := s.artifacts.GetAgreementArtifacts(ctx, scope, agreementID); err == nil {
			executedKey := strings.TrimSpace(artifacts.ExecutedObjectKey)
			certificateKey := strings.TrimSpace(artifacts.CertificateObjectKey)
			if s.objectAvailable(ctx, executedKey) {
				contract.ExecutedArtifactAvailable = true
				contract.ExecutedObjectKey = executedKey
			}
			if s.objectAvailable(ctx, certificateKey) {
				contract.CertificateAvailable = true
				contract.CertificateObjectKey = certificateKey
			}
		}
	}

	return contract, nil
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
