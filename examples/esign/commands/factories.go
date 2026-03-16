package commands

import (
	"fmt"
	"maps"
	"strconv"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

// RegisterCommandFactories registers payload parsers for panel action command dispatch.
func RegisterCommandFactories(bus *coreadmin.CommandBus) error {
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
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementRequestReview, buildAgreementRequestReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReopenReview, buildAgreementReopenReviewInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementCloseReview, buildAgreementCloseReviewInput); err != nil {
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
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReopenCommentThread, buildAgreementReopenCommentThreadInput); err != nil {
		return err
	}
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementDeliveryResume, buildAgreementDeliveryResumeInput); err != nil {
		return err
	}
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
	if err := coreadmin.RegisterMessageFactory(bus, CommandAgreementReminderSendNow, buildAgreementReminderSendNowInput); err != nil {
		return err
	}
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
		IdempotencyKey: strings.TrimSpace(toString(payloadValue(payload, "idempotency_key"))),
		CorrelationID:  strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		Reason:        strings.TrimSpace(toString(payloadValue(payload, "reason"))),
		RevokeTokens:  boolWithDefault(payloadValue(payload, "revoke_tokens"), true),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		RecipientID:        strings.TrimSpace(toString(payloadValue(payload, "recipient_id"))),
		RotateToken:        boolWithDefault(payloadValue(payload, "rotate_token"), false),
		InvalidateExisting: boolWithDefault(payloadValue(payload, "invalidate_existing"), true),
		AllowOutOfOrder:    boolWithDefault(payloadValue(payload, "allow_out_of_order"), false),
		IdempotencyKey:     strings.TrimSpace(toString(payloadValue(payload, "idempotency_key"))),
		CorrelationID:      strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
			ActorID:        strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
			IdempotencyKey: strings.TrimSpace(toString(payloadValue(payload, "idempotency_key"))),
			CorrelationID:  strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
			ActorID:        strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
			IdempotencyKey: strings.TrimSpace(toString(payloadValue(payload, "idempotency_key"))),
			CorrelationID:  strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
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
			ReviewID:      strings.TrimSpace(toString(payloadValue(payload, "review_id"))),
			Visibility:    strings.TrimSpace(toString(payloadValue(payload, "visibility"))),
			AnchorType:    strings.TrimSpace(toString(payloadValue(payload, "anchor_type"))),
			PageNumber:    intWithDefault(payloadValue(payload, "page_number"), 0),
			FieldID:       strings.TrimSpace(toString(payloadValue(payload, "field_id"))),
			AnchorX:       floatWithDefault(payloadValue(payload, "anchor_x"), 0),
			AnchorY:       floatWithDefault(payloadValue(payload, "anchor_y"), 0),
			Body:          strings.TrimSpace(toString(payloadValue(payload, "body"))),
			ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
			CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
		},
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReplyCommentThreadInput(payload map[string]any, ids []string) (AgreementReplyCommentThreadInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReplyCommentThreadInput{}, err
	}
	msg := AgreementReplyCommentThreadInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		ThreadID:      strings.TrimSpace(toString(payloadValue(payload, "thread_id"))),
		Body:          strings.TrimSpace(toString(payloadValue(payload, "body"))),
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		Scope:           scopeFromPayload(payload),
		AgreementID:     agreementID,
		ReviewerIDs:     toStringSlice(payloadValue(payload, "reviewer_ids")),
		Gate:            strings.TrimSpace(toString(payloadValue(payload, "gate"))),
		CommentsEnabled: boolWithDefault(payloadValue(payload, "comments_enabled"), false),
		ActorID:         strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID:   strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildAgreementReviewDecisionInput(payload map[string]any, ids []string) (AgreementReviewDecisionCommandInput, error) {
	agreementID, err := agreementIDFromPayload(payload, ids)
	if err != nil {
		return AgreementReviewDecisionCommandInput{}, err
	}
	return AgreementReviewDecisionCommandInput{
		Scope:         scopeFromPayload(payload),
		AgreementID:   agreementID,
		RecipientID:   strings.TrimSpace(toString(payloadValue(payload, "recipient_id"))),
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		ThreadID:      strings.TrimSpace(toString(payloadValue(payload, "thread_id"))),
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}, nil
}

func buildGuardedEffectResumeInput(payload map[string]any, ids []string) (GuardedEffectResumeInput, error) {
	effectID := ""
	if len(ids) > 0 {
		effectID = strings.TrimSpace(ids[0])
	}
	if effectID == "" {
		effectID = strings.TrimSpace(toString(payloadValue(payload, "effect_id")))
	}
	msg := GuardedEffectResumeInput{
		Scope:         scopeFromPayload(payload),
		EffectID:      effectID,
		ActorID:       strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		RecipientID:   strings.TrimSpace(toString(payloadValue(payload, "recipient_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderSweepInput(payload map[string]any, _ []string) (AgreementReminderSweepInput, error) {
	msg := AgreementReminderSweepInput{
		Scope:         scopeFromPayload(payload),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildAgreementReminderCleanupInput(payload map[string]any, _ []string) (AgreementReminderCleanupInput, error) {
	msg := AgreementReminderCleanupInput{
		Scope:         scopeFromPayload(payload),
		Before:        strings.TrimSpace(toString(payloadValue(payload, "before"))),
		Limit:         intWithDefault(payloadValue(payload, "limit"), 1000),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		RecipientID:   strings.TrimSpace(toString(payloadValue(payload, "recipient_id"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
	}
	return msg, nil
}

func buildDraftCleanupInput(payload map[string]any, _ []string) (DraftCleanupInput, error) {
	msg := DraftCleanupInput{
		Scope:         scopeFromPayload(payload),
		Before:        strings.TrimSpace(toString(payloadValue(payload, "before"))),
		CorrelationID: strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
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
		documentID = strings.TrimSpace(toString(payloadValue(payload, "document_id")))
	}
	if documentID == "" {
		documentID = strings.TrimSpace(toString(payloadValue(payload, "id")))
	}

	msg := PDFRemediationInput{
		Scope:            scopeFromPayload(payload),
		DocumentID:       documentID,
		AgreementID:      strings.TrimSpace(toString(payloadValue(payload, "agreement_id"))),
		ActorID:          strings.TrimSpace(toString(payloadValue(payload, "actor_id"))),
		Force:            boolWithDefault(payloadValue(payload, "force"), false),
		CorrelationID:    strings.TrimSpace(toString(payloadValue(payload, "correlation_id"))),
		CommandID:        strings.TrimSpace(toString(payloadValue(payload, "command_id"))),
		DispatchID:       strings.TrimSpace(toString(payloadValue(payload, "dispatch_id"))),
		ExecutionMode:    strings.TrimSpace(strings.ToLower(toString(payloadValue(payload, "execution_mode")))),
		RequestedAt:      strings.TrimSpace(toString(payloadValue(payload, "requested_at"))),
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
	if id := strings.TrimSpace(toString(payloadValue(payload, "agreement_id"))); id != "" {
		return id, nil
	}
	if id := strings.TrimSpace(toString(payloadValue(payload, "id"))); id != "" {
		return id, nil
	}
	return "", fmt.Errorf("agreement_id required")
}

func scopeFromPayload(payload map[string]any) stores.Scope {
	return stores.Scope{
		TenantID: strings.TrimSpace(toString(payloadValue(payload, "tenant_id"))),
		OrgID:    strings.TrimSpace(toString(payloadValue(payload, "org_id"))),
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

func toString(value any) string {
	if value == nil {
		return ""
	}
	switch raw := value.(type) {
	case string:
		return strings.TrimSpace(raw)
	case []byte:
		return strings.TrimSpace(string(raw))
	default:
		return strings.TrimSpace(fmt.Sprint(raw))
	}
}

func boolWithDefault(value any, fallback bool) bool {
	if value == nil {
		return fallback
	}
	switch raw := value.(type) {
	case bool:
		return raw
	case string:
		parsed, err := strconv.ParseBool(strings.TrimSpace(raw))
		if err != nil {
			return fallback
		}
		return parsed
	default:
		return fallback
	}
}

func intWithDefault(value any, fallback int) int {
	if value == nil {
		return fallback
	}
	switch raw := value.(type) {
	case int:
		return raw
	case int32:
		return int(raw)
	case int64:
		return int(raw)
	case float32:
		return int(raw)
	case float64:
		return int(raw)
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(raw))
		if err != nil {
			return fallback
		}
		return parsed
	default:
		return fallback
	}
}

func floatWithDefault(value any, fallback float64) float64 {
	if value == nil {
		return fallback
	}
	switch raw := value.(type) {
	case float32:
		return float64(raw)
	case float64:
		return raw
	case int:
		return float64(raw)
	case int32:
		return float64(raw)
	case int64:
		return float64(raw)
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
		if err != nil {
			return fallback
		}
		return parsed
	default:
		return fallback
	}
}

func toStringSlice(value any) []string {
	switch typed := value.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			item = strings.TrimSpace(item)
			if item != "" {
				out = append(out, item)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			itemString := strings.TrimSpace(toString(item))
			if itemString != "" {
				out = append(out, itemString)
			}
		}
		return out
	case string:
		raw := strings.TrimSpace(typed)
		if raw == "" {
			return nil
		}
		parts := strings.Split(raw, ",")
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part != "" {
				out = append(out, part)
			}
		}
		return out
	default:
		return nil
	}
}
