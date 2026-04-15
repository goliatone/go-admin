package admin

import (
	"strings"

	translationruntime "github.com/goliatone/go-admin/admin/internal/translationruntime"
	router "github.com/goliatone/go-router"
)

func translationChannel(values ...string) string {
	return translationruntime.Channel(values...)
}

func translationChannelFromRequest(c router.Context, adminCtx AdminContext, body map[string]any, values ...string) string {
	bodyChannel := ""
	queryChannel := ""
	if len(body) > 0 {
		bodyChannel = toString(body["channel"])
	}
	if c != nil {
		queryChannel = c.Query("channel")
	}
	return translationruntime.ChannelFromResolvedInputs(bodyChannel, queryChannel, adminCtx.Channel, values...)
}

func mergeTranslationChannelContract(payload map[string]any, channel string) map[string]any {
	return translationruntime.MergeChannelContract(payload, channel)
}

func requireCanonicalFamilyID(familyID, entityType, recordID string) error {
	if !translationruntime.MissingCanonicalFamilyID(familyID) {
		return nil
	}
	return validationDomainError("translation-enabled record missing canonical family_id", map[string]any{
		"family_id":   strings.TrimSpace(familyID),
		"entity_type": strings.TrimSpace(entityType),
		"record_id":   strings.TrimSpace(recordID),
	})
}
