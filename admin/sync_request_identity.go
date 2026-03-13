package admin

import (
	"fmt"
	"strings"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// AuthenticatedRequestScopeDefaults captures single-tenant scope defaults for
// consumers that resolve scope strictly from authenticated request context.
type AuthenticatedRequestScopeDefaults struct {
	TenantID string
	OrgID    string
	Enabled  bool
}

// AuthenticatedRequestIdentity captures trusted actor, scope, and trace fields
// resolved from authenticated admin request context.
type AuthenticatedRequestIdentity struct {
	ActorID       string
	Subject       string
	TenantID      string
	OrgID         string
	RequestID     string
	CorrelationID string
	TraceID       string
}

// ScopeDefaults returns the admin single-tenant scope defaults when enabled.
func (a *Admin) ScopeDefaults() AuthenticatedRequestScopeDefaults {
	if a == nil {
		return AuthenticatedRequestScopeDefaults{}
	}
	mode := strings.ToLower(strings.TrimSpace(a.config.ScopeMode))
	defaults := AuthenticatedRequestScopeDefaults{
		TenantID: strings.TrimSpace(a.config.DefaultTenantID),
		OrgID:    strings.TrimSpace(a.config.DefaultOrgID),
		Enabled:  mode == "single",
	}
	if !defaults.Enabled {
		defaults.TenantID = ""
		defaults.OrgID = ""
	}
	return defaults
}

// ResolveAuthenticatedRequestIdentity returns trusted actor, scope, and trace
// metadata without consulting browser-supplied user/tenant/org parameters.
func ResolveAuthenticatedRequestIdentity(c router.Context, defaults AuthenticatedRequestScopeDefaults) AuthenticatedRequestIdentity {
	identity := AuthenticatedRequestIdentity{}
	if c == nil {
		return identity
	}

	ctx := c.Context()
	actor := actorFromRouterOrClaims(c, ctx)
	if actor != nil {
		identity.Subject = firstNonEmptyTrimmed(actor.Subject, actor.ActorID)
		identity.ActorID = firstNonEmptyTrimmed(actor.Subject, actor.ActorID)
		identity.TenantID = firstNonEmptyTrimmed(
			actor.TenantID,
			authMetadataString(actor.Metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id"),
		)
		identity.OrgID = firstNonEmptyTrimmed(
			actor.OrganizationID,
			authMetadataString(actor.Metadata, "organization_id", "org_id", "org", "default_org_id"),
		)
	}

	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		metadata := claimsMetadata(claims)
		identity.ActorID = firstNonEmptyTrimmed(identity.ActorID, claims.Subject(), claims.UserID())
		identity.Subject = firstNonEmptyTrimmed(identity.Subject, claims.Subject(), claims.UserID())
		identity.TenantID = firstNonEmptyTrimmed(identity.TenantID, authMetadataString(metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id"))
		identity.OrgID = firstNonEmptyTrimmed(identity.OrgID, authMetadataString(metadata, "organization_id", "org_id", "org", "default_org_id"))
	}

	if defaults.Enabled {
		identity.TenantID = firstNonEmptyTrimmed(identity.TenantID, defaults.TenantID)
		identity.OrgID = firstNonEmptyTrimmed(identity.OrgID, defaults.OrgID)
	}

	identity.RequestID = firstNonEmptyTrimmed(
		requestIDFromContext(ctx),
		c.Header("X-Request-ID"),
		c.Header("X-Request-Id"),
		c.Header("x-request-id"),
	)
	identity.CorrelationID = firstNonEmptyTrimmed(
		correlationIDFromContext(ctx),
		c.Header("X-Correlation-ID"),
		c.Header("X-Correlation-Id"),
		c.Header("x-correlation-id"),
		identity.RequestID,
	)
	identity.TraceID = firstNonEmptyTrimmed(
		traceIDFromContext(ctx),
		c.Header("X-Trace-ID"),
		c.Header("X-Trace-Id"),
		c.Header("x-trace-id"),
		identity.CorrelationID,
	)

	return identity
}

func claimsMetadata(claims auth.AuthClaims) map[string]any {
	if claims == nil {
		return nil
	}
	if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
		return carrier.ClaimsMetadata()
	}
	return nil
}

func authMetadataString(metadata map[string]any, keys ...string) string {
	for _, key := range keys {
		if metadata == nil {
			return ""
		}
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		switch value := raw.(type) {
		case string:
			if trimmed := strings.TrimSpace(value); trimmed != "" {
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

func firstNonEmptyTrimmed(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
