package admin

import (
	"maps"
	"strings"

	router "github.com/goliatone/go-router"
)

func translationChannel(values ...string) string {
	return strings.TrimSpace(firstNonEmpty(values...))
}

func translationChannelFromRequest(c router.Context, adminCtx AdminContext, body map[string]any, values ...string) string {
	resolved := make([]string, 0, len(values)+3)
	resolved = append(resolved, values...)
	if len(body) > 0 {
		resolved = append(resolved, toString(body["channel"]))
	}
	if c != nil {
		resolved = append(resolved, c.Query("channel"))
	}
	resolved = append(resolved, adminCtx.Channel)
	return translationChannel(resolved...)
}

func translationChannelContract(channel string) map[string]any {
	channel = strings.TrimSpace(channel)
	return map[string]any{
		"channel": channel,
	}
}

func mergeTranslationChannelContract(payload map[string]any, channel string) map[string]any {
	if payload == nil {
		payload = map[string]any{}
	}
	maps.Copy(payload, translationChannelContract(channel))
	return payload
}

func requireCanonicalFamilyID(familyID, entityType, recordID string) error {
	familyID = strings.TrimSpace(familyID)
	if familyID != "" {
		return nil
	}
	return validationDomainError("translation-enabled record missing canonical family_id", map[string]any{
		"family_id":   familyID,
		"entity_type": strings.TrimSpace(entityType),
		"record_id":   strings.TrimSpace(recordID),
	})
}
