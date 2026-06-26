package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// RegisterTranslationSuggestionCommandFactories installs name-based factories
// for translation suggestion commands.
func RegisterTranslationSuggestionCommandFactories(bus *CommandBus) error {
	return RegisterMessageResultFactory[TranslationSuggestionInput, TranslationSuggestionResult](
		bus,
		TranslationSuggestionGenerateCommandName,
		buildTranslationSuggestionInput,
	)
}

func buildTranslationSuggestionInput(payload map[string]any, ids []string) (TranslationSuggestionInput, error) {
	assignmentID := ""
	resolvedIDs := commandIDsFromPayload(ids, payload)
	if len(resolvedIDs) > 0 {
		assignmentID = strings.TrimSpace(resolvedIDs[0])
	}
	if payload != nil {
		assignmentID = strings.TrimSpace(primitives.FirstNonEmptyRaw(
			assignmentID,
			toString(payload["assignment_id"]),
			toString(payload["assignmentId"]),
		))
	}
	msg := TranslationSuggestionInput{
		AssignmentID:   assignmentID,
		FieldPath:      strings.TrimSpace(firstPayloadString(payload, "field_path", "fieldPath", "path")),
		ActorID:        strings.TrimSpace(firstPayloadString(payload, "actor_id", "actorId", "user_id", "userId")),
		TenantID:       strings.TrimSpace(firstPayloadString(payload, "tenant_id", "tenantId")),
		OrgID:          strings.TrimSpace(firstPayloadString(payload, "org_id", "orgId", "organization_id", "organizationId")),
		Channel:        strings.TrimSpace(firstPayloadString(payload, "channel", "environment")),
		Environment:    strings.TrimSpace(firstPayloadString(payload, "environment", "channel")),
		RequestID:      strings.TrimSpace(firstPayloadString(payload, "request_id", "requestId")),
		CorrelationID:  strings.TrimSpace(firstPayloadString(payload, "correlation_id", "correlationId")),
		IdempotencyKey: strings.TrimSpace(firstPayloadString(payload, "idempotency_key", "idempotencyKey")),
		Metadata:       cloneAnyMap(extractMap(payloadValue(payload, "metadata"))),
		SourceText:     strings.TrimSpace(firstPayloadString(payload, "source_text", "sourceText")),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func firstPayloadString(payload map[string]any, keys ...string) string {
	if payload == nil {
		return ""
	}
	for _, key := range keys {
		if value := strings.TrimSpace(toString(payload[key])); value != "" {
			return value
		}
	}
	return ""
}

func payloadValue(payload map[string]any, key string) any {
	if payload == nil {
		return nil
	}
	return payload[key]
}
