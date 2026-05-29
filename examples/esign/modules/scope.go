package modules

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
)

var defaultModuleScope = stores.Scope{TenantID: "tenant-bootstrap", OrgID: "org-bootstrap"}

func resolveScopeFromContext(ctx context.Context, fallback stores.Scope) (stores.Scope, error) {
	scope := stores.Scope{}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		scope.TenantID = cleanScopeValue(actor.TenantID)
		scope.OrgID = cleanScopeValue(actor.OrganizationID)
		if scope.TenantID == "" {
			scope.TenantID = metadataString(actor.Metadata, "tenant_id", "tenant")
		}
		if scope.OrgID == "" {
			scope.OrgID = metadataString(actor.Metadata, "organization_id", "org_id", "org")
		}
	}
	if scope.TenantID == "" {
		scope.TenantID = cleanScopeValue(fallback.TenantID)
	}
	if scope.OrgID == "" {
		scope.OrgID = cleanScopeValue(fallback.OrgID)
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, fmt.Errorf("tenant_id and org_id are required")
	}
	return scope, nil
}

func cleanScopeValue(value string) string {
	return strings.Clone(strings.TrimSpace(value))
}

func userIDFromContext(ctx context.Context) string {
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if subject := cleanScopeValue(actor.Subject); subject != "" {
			return subject
		}
		if actorID := cleanScopeValue(actor.ActorID); actorID != "" {
			return actorID
		}
	}
	return ""
}

func metadataString(metadata map[string]any, keys ...string) string {
	for _, key := range keys {
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		switch value := raw.(type) {
		case string:
			if trimmed := cleanScopeValue(value); trimmed != "" {
				return trimmed
			}
		case []byte:
			if trimmed := strings.TrimSpace(string(value)); trimmed != "" {
				return trimmed
			}
		default:
			if trimmed := strings.TrimSpace(fmt.Sprint(value)); trimmed != "" && trimmed != "<nil>" {
				return trimmed
			}
		}
	}
	return ""
}
