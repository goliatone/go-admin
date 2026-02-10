package commands

import (
	"fmt"
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
	return coreadmin.RegisterMessageFactory(bus, CommandTokenRotate, buildTokenRotateInput)
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
