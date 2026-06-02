package admin

import (
	"context"
	"strings"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// ScopePolicyMode controls how effective tenant/org scope is resolved.
type ScopePolicyMode string

const (
	ScopePolicySingle ScopePolicyMode = "single"
	ScopePolicyMulti  ScopePolicyMode = "multi"
)

const (
	// ScopeTenantIDKey and ScopeOrgIDKey are the canonical tenant/org keys used
	// in scope metadata maps, request filters, and Bun column references.
	ScopeTenantIDKey = "tenant_id"
	ScopeOrgIDKey    = "org_id"

	ScopeTenantKey        = "tenant"
	ScopeOrgKey           = "org"
	ScopeOrganizationIDKey = "organization_id"
	ScopeDefaultTenantKey = "default_tenant"
	ScopeDefaultTenantIDKey = "default_tenant_id"
	ScopeDefaultOrgIDKey  = "default_org_id"
)

// ScopePolicy captures the go-admin tenant/org scope policy.
type ScopePolicy struct {
	Mode            ScopePolicyMode `json:"mode"`
	DefaultTenantID string          `json:"default_tenant_id"`
	DefaultOrgID    string          `json:"default_org_id"`
}

// ScopeInput carries trusted scope values supplied by a service path.
type ScopeInput struct {
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
}

// EffectiveScope is the resolved tenant/org scope for a request or background operation.
type EffectiveScope struct {
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
	Source   string `json:"source,omitempty"`
}

// ScopePolicy returns the configured go-admin scope policy.
func (a *Admin) ScopePolicy() ScopePolicy {
	if a == nil {
		return ScopePolicy{Mode: ScopePolicyMulti}
	}
	mode := ScopePolicyMode(strings.ToLower(strings.TrimSpace(a.config.ScopeMode)))
	switch mode {
	case ScopePolicySingle:
	default:
		mode = ScopePolicyMulti
	}
	policy := ScopePolicy{
		Mode:            mode,
		DefaultTenantID: strings.TrimSpace(a.config.DefaultTenantID),
		DefaultOrgID:    strings.TrimSpace(a.config.DefaultOrgID),
	}
	if policy.Mode != ScopePolicySingle {
		policy.DefaultTenantID = ""
		policy.DefaultOrgID = ""
	}
	return policy
}

// EffectiveScope resolves trusted input, context actor scope, and configured
// single-tenant defaults into one scope value.
//
//nolint:gocyclo,nestif // Scope precedence is explicit so tenant/org source attribution stays readable.
func (a *Admin) EffectiveScope(ctx context.Context, input ScopeInput) EffectiveScope {
	input = normalizeScopeInput(input)
	scope := EffectiveScope{
		TenantID: input.TenantID,
		OrgID:    input.OrgID,
	}
	if scope.TenantID != "" || scope.OrgID != "" {
		scope.Source = "input"
	}

	if ctx != nil {
		if scope.TenantID == "" {
			if tenantID := strings.TrimSpace(tenantIDFromContext(ctx)); tenantID != "" {
				scope.TenantID = tenantID
				scope.Source = appendScopeSource(scope.Source, "context")
			}
		}
		if scope.OrgID == "" {
			if orgID := strings.TrimSpace(orgIDFromContext(ctx)); orgID != "" {
				scope.OrgID = orgID
				scope.Source = appendScopeSource(scope.Source, "context")
			}
		}
		if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
			if scope.TenantID == "" {
				if tenantID := strings.TrimSpace(authMetadataString(actor.Metadata, ScopeTenantIDKey, ScopeTenantKey, ScopeDefaultTenantKey, ScopeDefaultTenantIDKey)); tenantID != "" {
					scope.TenantID = tenantID
					scope.Source = appendScopeSource(scope.Source, "actor_metadata")
				}
			}
			if scope.OrgID == "" {
				if orgID := strings.TrimSpace(authMetadataString(actor.Metadata, ScopeOrganizationIDKey, ScopeOrgIDKey, ScopeOrgKey, ScopeDefaultOrgIDKey)); orgID != "" {
					scope.OrgID = orgID
					scope.Source = appendScopeSource(scope.Source, "actor_metadata")
				}
			}
		}
	}

	policy := a.ScopePolicy()
	if policy.Mode == ScopePolicySingle {
		if scope.TenantID == "" && policy.DefaultTenantID != "" {
			scope.TenantID = policy.DefaultTenantID
			scope.Source = appendScopeSource(scope.Source, "single_default")
		}
		if scope.OrgID == "" && policy.DefaultOrgID != "" {
			scope.OrgID = policy.DefaultOrgID
			scope.Source = appendScopeSource(scope.Source, "single_default")
		}
	}
	return scope
}

// EffectiveScopeFromRequest resolves scope from trusted request actor/claims
// plus optional trusted service input. Browser query parameters are ignored.
func (a *Admin) EffectiveScopeFromRequest(c router.Context, input ScopeInput) EffectiveScope {
	input = normalizeScopeInput(input)
	if c == nil {
		return a.EffectiveScope(context.Background(), input)
	}
	identity := ResolveAuthenticatedRequestIdentity(c, a.ScopeDefaults())
	if input.TenantID == "" {
		input.TenantID = identity.TenantID
	}
	if input.OrgID == "" {
		input.OrgID = identity.OrgID
	}
	return a.EffectiveScope(c.Context(), input)
}

func normalizeScopeInput(input ScopeInput) ScopeInput {
	return ScopeInput{
		TenantID: strings.TrimSpace(input.TenantID),
		OrgID:    strings.TrimSpace(input.OrgID),
	}
}

func appendScopeSource(existing, next string) string {
	next = strings.TrimSpace(next)
	if next == "" {
		return existing
	}
	if existing == "" {
		return next
	}
	for part := range strings.SplitSeq(existing, "+") {
		if strings.TrimSpace(part) == next {
			return existing
		}
	}
	return existing + "+" + next
}
