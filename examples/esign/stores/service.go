package stores

import "context"

// AgreementMutationService adds service-layer write guards around AgreementStore operations.
type AgreementMutationService struct {
	agreements AgreementStore
}

func NewAgreementMutationService(agreements AgreementStore) AgreementMutationService {
	return AgreementMutationService{agreements: agreements}
}

func (s AgreementMutationService) UpdateDraft(ctx context.Context, scope Scope, agreementID string, patch AgreementDraftPatch, expectedVersion int64) (AgreementRecord, error) {
	if s.agreements == nil {
		return AgreementRecord{}, invalidRecordError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return AgreementRecord{}, err
	}
	if agreement.Status != AgreementStatusDraft {
		return AgreementRecord{}, immutableAgreementError(agreementID, agreement.Status)
	}
	return s.agreements.UpdateDraft(ctx, scope, agreementID, patch, expectedVersion)
}

func (s AgreementMutationService) UpsertRecipientDraft(ctx context.Context, scope Scope, agreementID string, patch RecipientDraftPatch, expectedVersion int64) (RecipientRecord, error) {
	if s.agreements == nil {
		return RecipientRecord{}, invalidRecordError("agreements", "store", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return RecipientRecord{}, err
	}
	if agreement.Status != AgreementStatusDraft {
		return RecipientRecord{}, immutableAgreementError(agreementID, agreement.Status)
	}
	return s.agreements.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion)
}
