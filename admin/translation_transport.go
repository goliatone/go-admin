package admin

import (
	"strings"

	translationcore "github.com/goliatone/go-admin/translations/core"
)

type translationTransportIdentity struct {
	ActorID  string `json:"actor_id"`
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
}

func translationIdentityFromAdminContext(ctx AdminContext) translationTransportIdentity {
	return translationTransportIdentity{
		ActorID:  strings.TrimSpace(firstNonEmpty(ctx.UserID, userIDFromContext(ctx.Context), actorFromContext(ctx.Context))),
		TenantID: strings.TrimSpace(firstNonEmpty(ctx.TenantID, tenantIDFromContext(ctx.Context))),
		OrgID:    strings.TrimSpace(firstNonEmpty(ctx.OrgID, orgIDFromContext(ctx.Context))),
	}
}

func rejectTranslationClientIdentityFields(payload map[string]any) error {
	field, ok := translationcore.ForbiddenIdentityField(payload)
	if !ok {
		return nil
	}
	return validationDomainError("translation payload cannot set auth-derived identity fields", map[string]any{
		"field":     field,
		"component": "translation_transport",
	})
}
