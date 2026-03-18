package services

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func ensureActiveReviewParticipant(
	ctx context.Context,
	scope stores.Scope,
	agreements stores.AgreementStore,
	token stores.ReviewSessionTokenRecord,
) (stores.AgreementReviewRecord, stores.AgreementReviewParticipantRecord, error) {
	if agreements == nil {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review workflow is not configured")
	}

	agreementID := strings.TrimSpace(token.AgreementID)
	reviewID := strings.TrimSpace(token.ReviewID)
	participantID := strings.TrimSpace(token.ParticipantID)
	if agreementID == "" || reviewID == "" || participantID == "" {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review token is incomplete")
	}

	review, err := agreements.GetAgreementReviewByAgreementID(ctx, scope, agreementID)
	if err != nil {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, err
	}
	status := strings.TrimSpace(review.Status)
	if review.ID == "" || status == "" || status == stores.AgreementReviewStatusNone || status == stores.AgreementReviewStatusClosed {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review is not enabled for this agreement")
	}
	if strings.TrimSpace(review.ID) != reviewID {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review token does not match active review")
	}

	participants, err := agreements.ListAgreementReviewParticipants(ctx, scope, review.ID)
	if err != nil {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, err
	}
	participant, _, err := findReviewParticipant(participants, participantID, "")
	if err != nil {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, err
	}
	if strings.TrimSpace(participant.ReviewID) != "" && strings.TrimSpace(participant.ReviewID) != review.ID {
		return stores.AgreementReviewRecord{}, stores.AgreementReviewParticipantRecord{}, signerReviewAccessError("review token does not match active review")
	}
	return review, participant, nil
}
