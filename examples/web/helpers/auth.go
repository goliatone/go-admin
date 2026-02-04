package helpers

import (
	"context"
	"strings"
	"sync"

	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

var (
	tenantMetadataKeys       = []string{"tenant_id", "tenant", "default_tenant", "default_tenant_id"}
	organizationMetadataKeys = []string{"organization_id", "org_id", "org"}
	defaultScopeOnce         sync.Once
	defaultScope             userstypes.ScopeFilter
	defaultScopeEnabled      bool
)

// ActorRefFromContext maps the go-auth actor in context to a go-users ActorRef.
func ActorRefFromContext(ctx context.Context) userstypes.ActorRef {
	if actor, ok := authlib.ActorFromContext(ctx); ok && actor != nil {
		if id, err := uuid.Parse(strings.TrimSpace(actor.ActorID)); err == nil && id != uuid.Nil {
			return userstypes.ActorRef{ID: id, Type: "user"}
		}
		if subject := strings.TrimSpace(actor.Subject); subject != "" {
			if id, err := uuid.Parse(subject); err == nil && id != uuid.Nil {
				return userstypes.ActorRef{ID: id, Type: "user"}
			}
		}
	}
	return userstypes.ActorRef{}
}

// ScopeFromContext extracts tenant/org identifiers into a go-users scope filter.
func ScopeFromContext(ctx context.Context) userstypes.ScopeFilter {
	return applyDefaultScope(ScopeFromContextRaw(ctx))
}

// ScopeFromContextRaw extracts tenant/org identifiers without applying defaults.
func ScopeFromContextRaw(ctx context.Context) userstypes.ScopeFilter {
	scope := userstypes.ScopeFilter{}
	if ctx == nil {
		return scope
	}
	actor, ok := authlib.ActorFromContext(ctx)
	if ok && actor != nil {
		scope = mergeScope(scope, actor.TenantID, actor.OrganizationID, actor.Metadata)
	}

	if scope.TenantID == uuid.Nil || scope.OrgID == uuid.Nil {
		if claims, ok := authlib.GetClaims(ctx); ok && claims != nil {
			if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
				scope = mergeScope(scope, "", "", carrier.ClaimsMetadata())
			}
		}
	}

	return scope
}

// ResolveScope merges the requested scope with the actor-derived defaults.
func ResolveScope(ctx context.Context, requested userstypes.ScopeFilter) userstypes.ScopeFilter {
	scope := requested.Clone()
	defaults := ScopeFromContext(ctx)

	if scope.TenantID == uuid.Nil {
		scope.TenantID = defaults.TenantID
	}
	if scope.OrgID == uuid.Nil {
		scope.OrgID = defaults.OrgID
	}
	if len(defaults.Labels) > 0 {
		if scope.Labels == nil {
			scope.Labels = map[string]uuid.UUID{}
		}
		for key, val := range defaults.Labels {
			if val == uuid.Nil {
				continue
			}
			if current, exists := scope.Labels[key]; !exists || current == uuid.Nil {
				scope.Labels[key] = val
			}
		}
	}

	return scope
}

// NewScopeResolver returns a go-users resolver that tolerates missing claims and
// backfills tenant/org from the request context.
func NewScopeResolver() userstypes.ScopeResolver {
	return userstypes.ScopeResolverFunc(func(ctx context.Context, _ userstypes.ActorRef, requested userstypes.ScopeFilter) (userstypes.ScopeFilter, error) {
		return ResolveScope(ctx, requested), nil
	})
}

// ScopeBuilder adapts ResolveScope for admin adapters that accept a simple func.
func ScopeBuilder() func(context.Context) userstypes.ScopeFilter {
	return func(ctx context.Context) userstypes.ScopeFilter {
		return ResolveScope(ctx, userstypes.ScopeFilter{})
	}
}

// NewScopeAuthorizationPolicy guards cross-tenant/org access unless the caller
// holds tenant/org admin permissions.
func NewScopeAuthorizationPolicy() userstypes.AuthorizationPolicy {
	return userstypes.AuthorizationPolicyFunc(func(ctx context.Context, check userstypes.PolicyCheck) error {
		target := check.Scope.Clone()
		if target.TenantID == uuid.Nil && target.OrgID == uuid.Nil {
			return nil
		}

		actorScope := ScopeFromContext(ctx)
		if target.TenantID != uuid.Nil && (actorScope.TenantID == uuid.Nil || actorScope.TenantID != target.TenantID) {
			if !canAccessAcrossScopes(ctx) {
				return userstypes.ErrUnauthorizedScope
			}
		}
		if target.OrgID != uuid.Nil && (actorScope.OrgID == uuid.Nil || actorScope.OrgID != target.OrgID) {
			if !canAccessAcrossScopes(ctx) {
				return userstypes.ErrUnauthorizedScope
			}
		}

		return nil
	})
}

func canAccessAcrossScopes(ctx context.Context) bool {
	return authlib.Can(ctx, "admin.tenants", "create") || authlib.Can(ctx, "admin.organizations", "create")
}

func mergeScope(scope userstypes.ScopeFilter, tenantID, orgID string, metadata map[string]any) userstypes.ScopeFilter {
	if scope.TenantID == uuid.Nil {
		if parsed := parseUUID(tenantID); parsed != uuid.Nil {
			scope.TenantID = parsed
		}
	}
	if scope.OrgID == uuid.Nil {
		if parsed := parseUUID(orgID); parsed != uuid.Nil {
			scope.OrgID = parsed
		}
	}
	if len(metadata) > 0 {
		if scope.TenantID == uuid.Nil {
			scope.TenantID = firstUUID(metadata, tenantMetadataKeys...)
		}
		if scope.OrgID == uuid.Nil {
			scope.OrgID = firstUUID(metadata, organizationMetadataKeys...)
		}
	}
	return scope
}

func applyDefaultScope(scope userstypes.ScopeFilter) userstypes.ScopeFilter {
	defaults, ok := defaultScopeFromEnv()
	if !ok {
		return scope
	}
	if scope.TenantID == uuid.Nil && defaults.TenantID != uuid.Nil {
		scope.TenantID = defaults.TenantID
	}
	if scope.OrgID == uuid.Nil && defaults.OrgID != uuid.Nil {
		scope.OrgID = defaults.OrgID
	}
	return scope
}

func defaultScopeFromEnv() (userstypes.ScopeFilter, bool) {
	defaultScopeOnce.Do(func() {
		cfg := quickstart.ScopeConfigFromEnv()
		if cfg.Mode != quickstart.ScopeModeSingle {
			return
		}
		defaultScopeEnabled = true
		if tenantID := parseUUID(cfg.DefaultTenantID); tenantID != uuid.Nil {
			defaultScope.TenantID = tenantID
		}
		if orgID := parseUUID(cfg.DefaultOrgID); orgID != uuid.Nil {
			defaultScope.OrgID = orgID
		}
	})
	return defaultScope, defaultScopeEnabled
}

func parseUUID(val string) uuid.UUID {
	if strings.TrimSpace(val) == "" {
		return uuid.Nil
	}
	id, err := uuid.Parse(strings.TrimSpace(val))
	if err != nil {
		return uuid.Nil
	}
	return id
}

func firstUUID(metadata map[string]any, keys ...string) uuid.UUID {
	for _, key := range keys {
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		if val, ok := raw.(string); ok {
			if id := parseUUID(val); id != uuid.Nil {
				return id
			}
		}
	}
	return uuid.Nil
}
