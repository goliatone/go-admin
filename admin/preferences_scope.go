package admin

import "context"

func preferenceScopeFromContext(ctx context.Context) PreferenceScope {
	return PreferenceScope{
		UserID:   userIDFromContext(ctx),
		TenantID: tenantIDFromContext(ctx),
		OrgID:    orgIDFromContext(ctx),
	}
}
