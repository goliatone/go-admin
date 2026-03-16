package stores

import "strings"

func NormalizeAgreementReviewStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", AgreementReviewStatusNone:
		return AgreementReviewStatusNone
	case AgreementReviewStatusInReview:
		return AgreementReviewStatusInReview
	case AgreementReviewStatusChangesRequested:
		return AgreementReviewStatusChangesRequested
	case AgreementReviewStatusApproved:
		return AgreementReviewStatusApproved
	case AgreementReviewStatusClosed:
		return AgreementReviewStatusClosed
	default:
		return ""
	}
}

func normalizeAgreementReviewStatus(status string) string {
	return NormalizeAgreementReviewStatus(status)
}

func NormalizeAgreementReviewGate(gate string) string {
	switch strings.ToLower(strings.TrimSpace(gate)) {
	case "", AgreementReviewGateNone:
		return AgreementReviewGateNone
	case AgreementReviewGateApproveBeforeSend:
		return AgreementReviewGateApproveBeforeSend
	case AgreementReviewGateApproveBeforeSign:
		return AgreementReviewGateApproveBeforeSign
	default:
		return ""
	}
}

func normalizeAgreementReviewGate(gate string) string {
	return NormalizeAgreementReviewGate(gate)
}

func NormalizeAgreementReviewDecision(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", AgreementReviewDecisionPending:
		return AgreementReviewDecisionPending
	case AgreementReviewDecisionApproved:
		return AgreementReviewDecisionApproved
	case AgreementReviewDecisionChangesRequested:
		return AgreementReviewDecisionChangesRequested
	case AgreementReviewDecisionDismissed:
		return AgreementReviewDecisionDismissed
	default:
		return ""
	}
}

func NormalizeAgreementCommentVisibility(visibility string) string {
	switch strings.ToLower(strings.TrimSpace(visibility)) {
	case "", AgreementCommentVisibilityShared:
		return AgreementCommentVisibilityShared
	case AgreementCommentVisibilityInternal:
		return AgreementCommentVisibilityInternal
	default:
		return ""
	}
}

func NormalizeAgreementCommentAnchorType(anchor string) string {
	switch strings.ToLower(strings.TrimSpace(anchor)) {
	case "", AgreementCommentAnchorAgreement:
		return AgreementCommentAnchorAgreement
	case AgreementCommentAnchorPage:
		return AgreementCommentAnchorPage
	case AgreementCommentAnchorField:
		return AgreementCommentAnchorField
	default:
		return ""
	}
}

func NormalizeAgreementCommentThreadStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", AgreementCommentThreadStatusOpen:
		return AgreementCommentThreadStatusOpen
	case AgreementCommentThreadStatusResolved:
		return AgreementCommentThreadStatusResolved
	default:
		return ""
	}
}

func NormalizeAgreementReviewParticipantType(participantType string) string {
	switch strings.ToLower(strings.TrimSpace(participantType)) {
	case "", AgreementReviewParticipantTypeRecipient:
		return AgreementReviewParticipantTypeRecipient
	case AgreementReviewParticipantTypeExternal:
		return AgreementReviewParticipantTypeExternal
	default:
		return ""
	}
}

func NormalizeReviewSessionTokenStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", ReviewSessionTokenStatusActive:
		return ReviewSessionTokenStatusActive
	case ReviewSessionTokenStatusRevoked:
		return ReviewSessionTokenStatusRevoked
	default:
		return ""
	}
}

func NormalizeAgreementCommentMessageKind(kind string) string {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "", AgreementCommentMessageKindComment:
		return AgreementCommentMessageKindComment
	case AgreementCommentMessageKindReply:
		return AgreementCommentMessageKindReply
	case AgreementCommentMessageKindSystem:
		return AgreementCommentMessageKindSystem
	default:
		return ""
	}
}
