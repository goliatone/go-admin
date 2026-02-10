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
		scope.TenantID = strings.TrimSpace(actor.TenantID)
		scope.OrgID = strings.TrimSpace(actor.OrganizationID)
	}
	if scope.TenantID == "" {
		scope.TenantID = strings.TrimSpace(fallback.TenantID)
	}
	if scope.OrgID == "" {
		scope.OrgID = strings.TrimSpace(fallback.OrgID)
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, fmt.Errorf("tenant_id and org_id are required")
	}
	return scope, nil
}

func userIDFromContext(ctx context.Context) string {
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if subject := strings.TrimSpace(actor.Subject); subject != "" {
			return subject
		}
		if actorID := strings.TrimSpace(actor.ActorID); actorID != "" {
			return actorID
		}
	}
	return ""
}
