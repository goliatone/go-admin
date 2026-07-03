package commands

import (
	"fmt"
	"maps"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/internal/primitives"
)

var toString = primitives.StringFromAny

type agreementCommandEnvelope struct {
	Scope         stores.Scope
	AgreementID   string
	ActorID       string
	CorrelationID string
}

// RegisterCommandFactories registers payload parsers for panel action command dispatch.
func RegisterCommandFactories(bus *coreadmin.CommandBus) error {
	if err := registerAgreementCommandFactories(bus); err != nil {
		return err
	}
	if err := registerReviewCommandFactories(bus); err != nil {
		return err
	}
	if err := registerReminderCommandFactories(bus); err != nil {
		return err
	}
	return registerMaintenanceCommandFactories(bus)
}

func registerAgreementCommandFactories(bus *coreadmin.CommandBus) error {
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementSend, buildAgreementSendInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementVoid, buildAgreementVoidInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementResend, buildAgreementResendInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementRequestCorrection, buildAgreementRequestCorrectionInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementRequestAmendment, buildAgreementRequestAmendmentInput); err != nil {
		return err
	}
	return coreadmin.RegisterMessageFactory(bus, CommandAgreementDeliveryResume, buildAgreementDeliveryResumeInput)
}

func registerReviewCommandFactories(bus *coreadmin.CommandBus) error {
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementRequestReview, buildAgreementRequestReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReopenReview, buildAgreementReopenReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementNotifyReviewers, buildAgreementNotifyReviewersInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReviewReminderPause, buildAgreementReviewReminderPauseInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReviewReminderResume, buildAgreementReviewReminderResumeInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReviewReminderSendNow, buildAgreementReviewReminderSendNowInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementCloseReview, buildAgreementCloseReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementForceApproveReview, buildAgreementForceApproveReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementApproveReviewOnBehalf, buildAgreementApproveReviewOnBehalfInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementApproveReview, buildAgreementApproveReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementRequestReviewChanges, buildAgreementRequestReviewChangesInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementCreateCommentThread, buildAgreementCreateCommentThreadInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReplyCommentThread, buildAgreementReplyCommentThreadInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementResolveCommentThread, buildAgreementResolveCommentThreadInput); err != nil {
		return err
	}
	return coreadmin.RegisterMessageFactory(bus, CommandAgreementReopenCommentThread, buildAgreementReopenCommentThreadInput)
}

func registerReminderCommandFactories(bus *coreadmin.CommandBus) error {
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderSweep, buildAgreementReminderSweepInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderCleanup, buildAgreementReminderCleanupInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderPause, buildAgreementReminderPauseInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderResume, buildAgreementReminderResumeInput); err != nil {
		return err
	}
	return coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderSendNow, buildAgreementReminderSendNowInput)
}

func registerMaintenanceCommandFactories(bus *coreadmin.CommandBus) error {
	if err := coreadmin.RegisterMessageFactory(bus, CommandPDFRemediate, buildPDFRemediationInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandTokenRotate, buildTokenRotateInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandGuardedEffectResume, buildGuardedEffectResumeInput); err != nil {
		return err
	}
	return coreadmin.RegisterMessageFactory(bus, CommandDraftCleanup, buildDraftCleanupInput)
}

func buildAgreementSendInput(payload map[string]any, ids []string) (AgreementSendInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementSendInput{}, err
	}
	msg := AgreementSendInput{
		Scope:          scopeFromPayload(payload),
		AgreementID:    agreementID,
		IdempotencyKey: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "idempotency_key"))),
		CorrelationID:  strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementVoidInput(payload map[string]any, ids []string) (AgreementVoidInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementVoidInput{}, err
	}
	msg := AgreementVoidInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		Reason:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "reason"))),
		RevokeTokens:  boolWithDefault(payloadValue(payload, "revoke_tokens"), true),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementResendInput(payload map[string]any, ids []string) (AgreementResendInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementResendInput{}, err
	}
	msg := AgreementResendInput{
		Scope:              scopeFromPayload(payload),
		AgreementID:        agreementID,
		RecipientID:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		RotateToken:        boolWithDefault(payloadValue(payload, "rotate_token"), false),
		InvalidateExisting: boolWithDefault(payloadValue(payload, "invalidate_existing"), true),
		AllowOutOfOrder:    boolWithDefault(payloadValue(payload, "allow_out_of_order"), false),
		IdempotencyKey:     strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "idempotency_key"))),
		CorrelationID:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementRequestCorrectionInput(payload map[string]any, ids []string) (AgreementRequestCorrectionInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementRequestCorrectionInput{}, err
	}
	msg := AgreementRequestCorrectionInput{
		AgreementRevisionRequestInput: AgreementRevisionRequestInput{
			Scope:          scopeFromPayload(payload),
			AgreementID:    agreementID,
			ActorID:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
			IdempotencyKey: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "idempotency_key"))),
			CorrelationID:  strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
		},
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementRequestAmendmentInput(payload map[string]any, ids []string) (AgreementRequestAmendmentInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementRequestAmendmentInput{}, err
	}
	msg := AgreementRequestAmendmentInput{
		AgreementRevisionRequestInput: AgreementRevisionRequestInput{
			Scope:          scopeFromPayload(payload),
			AgreementID:    agreementID,
			ActorID:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
			IdempotencyKey: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "idempotency_key"))),
			CorrelationID:  strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
		},
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementRequestReviewInput(payload map[string]any, ids []string) (AgreementRequestReviewInput, error) {
	base, err := buildAgreementReviewInput(payload, ids)
	if err != nil {
		return AgreementRequestReviewInput{}, err
	}
	msg := AgreementRequestReviewInput{AgreementReviewInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReopenReviewInput(payload map[string]any, ids []string) (AgreementReopenReviewInput, error) {
	base, err := buildAgreementReviewInput(payload, ids)
	if err != nil {
		return AgreementReopenReviewInput{}, err
	}
	msg := AgreementReopenReviewInput{AgreementReviewInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementCloseReviewInput(payload map[string]any, ids []string) (AgreementCloseReviewInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementCloseReviewInput{}, err
	}
	msg := AgreementCloseReviewInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementForceApproveReviewInput(payload map[string]any, ids []string) (AgreementForceApproveReviewInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementForceApproveReviewInput{}, err
	}
	msg := AgreementForceApproveReviewInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		Reason:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "reason"))),
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementApproveReviewOnBehalfInput(payload map[string]any, ids []string) (AgreementApproveReviewOnBehalfInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementApproveReviewOnBehalfInput{}, err
	}
	msg := AgreementApproveReviewOnBehalfInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ParticipantID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "participant_id"))),
		RecipientID:   strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		Reason:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "reason"))),
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementNotifyReviewersInput(payload map[string]any, ids []string) (AgreementNotifyReviewersInput, error) {
	base, err := buildAgreementCommandEnvelope(payload, ids)
	if err != nil {
		return AgreementNotifyReviewersInput{}, err
	}
	msg := AgreementNotifyReviewersInput{
		Scope:         base.Scope,
		AgreementID:   base.AgreementID,
		ParticipantID: stringPayloadValue(payload, "participant_id"),
		RecipientID:   stringPayloadValue(payload, "recipient_id"),
		ActorID:       base.ActorID,
		CorrelationID: base.CorrelationID,
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReviewReminderPauseInput(payload map[string]any, ids []string) (AgreementReviewReminderPauseInput, error) {
	base, err := buildAgreementReviewReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReviewReminderPauseInput{}, err
	}
	msg := AgreementReviewReminderPauseInput{AgreementReviewReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReviewReminderResumeInput(payload map[string]any, ids []string) (AgreementReviewReminderResumeInput, error) {
	base, err := buildAgreementReviewReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReviewReminderResumeInput{}, err
	}
	msg := AgreementReviewReminderResumeInput{AgreementReviewReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReviewReminderSendNowInput(payload map[string]any, ids []string) (AgreementReviewReminderSendNowInput, error) {
	base, err := buildAgreementReviewReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReviewReminderSendNowInput{}, err
	}
	msg := AgreementReviewReminderSendNowInput{AgreementReviewReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReviewReminderControlInput(payload map[string]any, ids []string) (AgreementReviewReminderControlInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReviewReminderControlInput{}, err
	}
	return AgreementReviewReminderControlInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ParticipantID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "participant_id"))),
		RecipientID:   strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildAgreementApproveReviewInput(payload map[string]any, ids []string) (AgreementApproveReviewInput, error) {
	base, err := buildAgreementReviewDecisionInput(payload, ids)
	if err != nil {
		return AgreementApproveReviewInput{}, err
	}
	msg := AgreementApproveReviewInput{AgreementReviewDecisionCommandInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementRequestReviewChangesInput(payload map[string]any, ids []string) (AgreementRequestReviewChangesInput, error) {
	base, err := buildAgreementReviewDecisionInput(payload, ids)
	if err != nil {
		return AgreementRequestReviewChangesInput{}, err
	}
	msg := AgreementRequestReviewChangesInput{AgreementReviewDecisionCommandInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementCreateCommentThreadInput(payload map[string]any, ids []string) (AgreementCreateCommentThreadInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementCreateCommentThreadInput{}, err
	}
	msg := AgreementCreateCommentThreadInput{
		AgreementCommentThreadInput: AgreementCommentThreadInput{
			Scope:         scopeFromPayload(payload),
			AgreementID:   agreementID,
			ReviewID:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "review_id"))),
			Visibility:    strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "visibility"))),
			AnchorType:    strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "anchor_type"))),
			PageNumber:    intWithDefault(payloadValue(payload, "page_number"), 0),
			FieldID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "field_id"))),
			AnchorX:       floatWithDefault(payloadValue(payload, "anchor_x"), 0),
			AnchorY:       floatWithDefault(payloadValue(payload, "anchor_y"), 0),
			Body:          strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "body"))),
			ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
			CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
		},
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReplyCommentThreadInput(payload map[string]any, ids []string) (AgreementReplyCommentThreadInput, error) {
	base, err := buildAgreementCommandEnvelope(payload, ids)
	if err != nil {
		return AgreementReplyCommentThreadInput{}, err
	}
	msg := AgreementReplyCommentThreadInput{
		Scope:         base.Scope,
		AgreementID:   base.AgreementID,
		ThreadID:      stringPayloadValue(payload, "thread_id"),
		Body:          stringPayloadValue(payload, "body"),
		ActorID:       base.ActorID,
		CorrelationID: base.CorrelationID,
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementResolveCommentThreadInput(payload map[string]any, ids []string) (AgreementResolveCommentThreadInput, error) {
	base, err := buildAgreementCommentThreadStateInput(payload, ids)
	if err != nil {
		return AgreementResolveCommentThreadInput{}, err
	}
	msg := AgreementResolveCommentThreadInput{AgreementCommentThreadStateInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReopenCommentThreadInput(payload map[string]any, ids []string) (AgreementReopenCommentThreadInput, error) {
	base, err := buildAgreementCommentThreadStateInput(payload, ids)
	if err != nil {
		return AgreementReopenCommentThreadInput{}, err
	}
	msg := AgreementReopenCommentThreadInput{AgreementCommentThreadStateInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementDeliveryResumeInput(payload map[string]any, ids []string) (AgreementDeliveryResumeInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementDeliveryResumeInput{}, err
	}
	msg := AgreementDeliveryResumeInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReviewInput(payload map[string]any, ids []string) (AgreementReviewInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReviewInput{}, err
	}
	return AgreementReviewInput{
		Scope:              scopeFromPayload(payload),
		AgreementID:        agreementID,
		ReviewParticipants: toReviewParticipants(payloadValue(payload, "review_participants")),
		ReviewerIDs:        primitives.CSVStringSliceFromAny(payloadValue(payload, "reviewer_ids")),
		Gate:               strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "gate"))),
		CommentsEnabled:    boolWithDefault(payloadValue(payload, "comments_enabled"), false),
		ActorID:            strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildAgreementCommandEnvelope(payload map[string]any, ids []string) (agreementCommandEnvelope, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return agreementCommandEnvelope{}, err
	}
	return agreementCommandEnvelope{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ActorID:       stringPayloadValue(payload, "actor_id"),
		CorrelationID: stringPayloadValue(payload, "correlation_id"),
	}, nil
}

func stringPayloadValue(payload map[string]any, key string) string {
	return strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, key)))
}

func buildAgreementReviewDecisionInput(payload map[string]any, ids []string) (AgreementReviewDecisionCommandInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReviewDecisionCommandInput{}, err
	}
	return AgreementReviewDecisionCommandInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ParticipantID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "participant_id"))),
		RecipientID:   strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		Comment:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "comment"))),
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildAgreementCommentThreadStateInput(payload map[string]any, ids []string) (AgreementCommentThreadStateInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementCommentThreadStateInput{}, err
	}
	return AgreementCommentThreadStateInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ThreadID:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "thread_id"))),
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildGuardedEffectResumeInput(payload map[string]any, ids []string) (GuardedEffectResumeInput, error) {
	effectID := ""
	if len(ids) > 0 {
		effectID = strings.TrimSpace(ids[0])
	}
	if effectID == "" {
		effectID = strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "effect_id")))
	}
	msg := GuardedEffectResumeInput{
		Scope:         scopeFromPayload(payload),
		EffectID:      effectID,
		ActorID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTokenRotateInput(payload map[string]any, ids []string) (TokenRotateInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return TokenRotateInput{}, err
	}
	msg := TokenRotateInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		RecipientID:   strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderSweepInput(payload map[string]any, _ []string) (AgreementReminderSweepInput, error) {
	msg := AgreementReminderSweepInput{
		Scope:         scopeFromPayload(payload),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderCleanupInput(payload map[string]any, _ []string) (AgreementReminderCleanupInput, error) {
	msg := AgreementReminderCleanupInput{
		Scope:         scopeFromPayload(payload),
		Before:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "before"))),
		Limit:         intWithDefault(payloadValue(payload, "limit"), 1000),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderPauseInput(payload map[string]any, ids []string) (AgreementReminderPauseInput, error) {
	base, err := buildAgreementReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReminderPauseInput{}, err
	}
	msg := AgreementReminderPauseInput{AgreementReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderResumeInput(payload map[string]any, ids []string) (AgreementReminderResumeInput, error) {
	base, err := buildAgreementReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReminderResumeInput{}, err
	}
	msg := AgreementReminderResumeInput{AgreementReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderSendNowInput(payload map[string]any, ids []string) (AgreementReminderSendNowInput, error) {
	base, err := buildAgreementReminderControlInput(payload, ids)
	if err != nil {
		return AgreementReminderSendNowInput{}, err
	}
	msg := AgreementReminderSendNowInput{AgreementReminderControlInput: base}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderControlInput(payload map[string]any, ids []string) (AgreementReminderControlInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReminderControlInput{}, err
	}
	msg := AgreementReminderControlInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		RecipientID:   strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "recipient_id"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	return msg, nil
}

func buildDraftCleanupInput(payload map[string]any, _ []string) (DraftCleanupInput, error) {
	msg := DraftCleanupInput{
		Scope:         scopeFromPayload(payload),
		Before:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "before"))),
		CorrelationID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildPDFRemediationInput(payload map[string]any, ids []string) (PDFRemediationInput, error) {
	documentID := ""
	if len(ids) > 0 {
		documentID = strings.TrimSpace(ids[0])
	}
	if documentID == "" {
		documentID = strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "document_id")))
	}
	if documentID == "" {
		documentID = strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "id")))
	}

	msg := PDFRemediationInput{
		Scope:            scopeFromPayload(payload),
		DocumentID:       documentID,
		AgreementID:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "agreement_id"))),
		ActorID:          strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "actor_id"))),
		Force:            boolWithDefault(payloadValue(payload, "force"), false),
		CorrelationID:    strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "correlation_id"))),
		CommandID:        strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "command_id"))),
		DispatchID:       strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "dispatch_id"))),
		ExecutionMode:    strings.TrimSpace(strings.ToLower(primitives.StringFromAny(payloadValue(payload, "execution_mode")))),
		RequestedAt:      strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "requested_at"))),
		DispatchMetadata: toAnyMap(payloadValue(payload, "_dispatch_metadata")),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func agreementIDFromPayload(payload map[string]any, ids []string) (string, error) {
	if len(ids) > 0 {
		if id := strings.TrimSpace(ids[0]); id != "" {
			return id, nil
		}
	}
	if id := strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "agreement_id"))); id != "" {
		return id, nil
	}
	if id := strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "id"))); id != "" {
		return id, nil
	}
	return "", fmt.Errorf("agreement_id required")
}

func scopeFromPayload(payload map[string]any) stores.Scope {
	return stores.Scope{
		TenantID: strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "tenant_id"))),
		OrgID:    strings.TrimSpace(primitives.StringFromAny(payloadValue(payload, "org_id"))),
	}
}

func payloadValue(payload map[string]any, key string) any {
	if payload == nil {
		return nil
	}
	return payload[key]
}

func toAnyMap(value any) map[string]any {
	if value == nil {
		return nil
	}
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		maps.Copy(out, typed)
		return out
	case map[string]string:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			out[key] = item
		}
		return out
	default:
		return nil
	}
}

func boolWithDefault(value any, fallback bool) bool {
	if parsed, ok := primitives.BoolFromAny(value); ok {
		return parsed
	}
	return fallback
}

func intWithDefault(value any, fallback int) int {
	if parsed, ok := primitives.IntFromAny(value); ok {
		return parsed
	}
	return fallback
}

func floatWithDefault(value any, fallback float64) float64 {
	if parsed, ok := primitives.Float64FromAny(value); ok {
		return parsed
	}
	return fallback
}

func toReviewParticipants(value any) []services.ReviewParticipantInput {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	out := make([]services.ReviewParticipantInput, 0, len(items))
	for _, item := range items {
		record := toAnyMap(item)
		if len(record) == 0 {
			continue
		}
		out = append(out, services.ReviewParticipantInput{
			ParticipantType: strings.TrimSpace(primitives.StringFromAny(record["participant_type"])),
			RecipientID:     strings.TrimSpace(primitives.StringFromAny(record["recipient_id"])),
			Email:           strings.TrimSpace(primitives.StringFromAny(record["email"])),
			DisplayName:     strings.TrimSpace(primitives.StringFromAny(record["display_name"])),
			CanComment:      boolWithDefault(record["can_comment"], false),
			CanApprove:      boolWithDefault(record["can_approve"], false),
		})
	}
	return out
}
