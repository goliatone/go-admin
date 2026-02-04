package quickstart

import (
	"context"
	"os"
	"strings"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// ScopeMode controls how tenant/org defaults are applied.
type ScopeMode string

const (
	ScopeModeSingle ScopeMode = "single"
	ScopeModeMulti  ScopeMode = "multi"
)

const (
	defaultScopeTenantID = "11111111-1111-1111-1111-111111111111"
	defaultScopeOrgID    = "22222222-2222-2222-2222-222222222222"
)

// ScopeConfig captures the quickstart scope behavior.
type ScopeConfig struct {
	Mode            ScopeMode
	DefaultTenantID string
	DefaultOrgID    string
}

// DefaultScopeConfig returns single-tenant defaults aligned with demo seeds.
func DefaultScopeConfig() ScopeConfig {
	return ScopeConfig{
		Mode:            ScopeModeSingle,
		DefaultTenantID: defaultScopeTenantID,
		DefaultOrgID:    defaultScopeOrgID,
	}
}

// NormalizeScopeConfig ensures mode/defaults are set consistently.
func NormalizeScopeConfig(cfg ScopeConfig) ScopeConfig {
	mode := strings.ToLower(strings.TrimSpace(string(cfg.Mode)))
	if mode == "" {
		mode = string(ScopeModeSingle)
	}
	cfg.Mode = ScopeMode(mode)
	if cfg.Mode == ScopeModeSingle {
		if strings.TrimSpace(cfg.DefaultTenantID) == "" {
			cfg.DefaultTenantID = defaultScopeTenantID
		}
		if strings.TrimSpace(cfg.DefaultOrgID) == "" {
			cfg.DefaultOrgID = defaultScopeOrgID
		}
	}
	return cfg
}

// ScopeConfigFromEnv reads ADMIN_SCOPE_MODE and ADMIN_DEFAULT_* envs.
func ScopeConfigFromEnv() ScopeConfig {
	cfg := DefaultScopeConfig()
	if val := strings.TrimSpace(os.Getenv("ADMIN_SCOPE_MODE")); val != "" {
		cfg.Mode = ScopeMode(strings.ToLower(val))
	}
	if val := strings.TrimSpace(os.Getenv("ADMIN_DEFAULT_TENANT_ID")); val != "" {
		cfg.DefaultTenantID = val
	}
	if val := strings.TrimSpace(os.Getenv("ADMIN_DEFAULT_ORG_ID")); val != "" {
		cfg.DefaultOrgID = val
	}
	return NormalizeScopeConfig(cfg)
}

// ScopeConfigFromAdmin maps admin.Config into a normalized ScopeConfig.
func ScopeConfigFromAdmin(cfg admin.Config) ScopeConfig {
	return NormalizeScopeConfig(ScopeConfig{
		Mode:            ScopeMode(strings.ToLower(strings.TrimSpace(cfg.ScopeMode))),
		DefaultTenantID: strings.TrimSpace(cfg.DefaultTenantID),
		DefaultOrgID:    strings.TrimSpace(cfg.DefaultOrgID),
	})
}

// ApplyScopeConfig writes scope defaults back into admin.Config.
func ApplyScopeConfig(cfg *admin.Config, scope ScopeConfig) {
	if cfg == nil {
		return
	}
	scope = NormalizeScopeConfig(scope)
	cfg.ScopeMode = string(scope.Mode)
	cfg.DefaultTenantID = scope.DefaultTenantID
	cfg.DefaultOrgID = scope.DefaultOrgID
}

// DefaultScopeFilter returns the default scope for single-tenant mode.
func DefaultScopeFilter(cfg admin.Config) userstypes.ScopeFilter {
	scopeCfg := ScopeConfigFromAdmin(cfg)
	if scopeCfg.Mode != ScopeModeSingle {
		return userstypes.ScopeFilter{}
	}
	return userstypes.ScopeFilter{
		TenantID: parseScopeID(scopeCfg.DefaultTenantID),
		OrgID:    parseScopeID(scopeCfg.DefaultOrgID),
	}
}

// ScopeBuilder returns a scope resolver that applies defaults for single-tenant mode.
func ScopeBuilder(cfg admin.Config) func(context.Context) userstypes.ScopeFilter {
	return func(ctx context.Context) userstypes.ScopeFilter {
		scope := ScopeFromContext(ctx)
		return applyDefaultScope(scope, cfg)
	}
}

// ScopeFromContext extracts scope from go-auth actor/claims metadata.
func ScopeFromContext(ctx context.Context) userstypes.ScopeFilter {
	scope := userstypes.ScopeFilter{}
	if ctx == nil {
		return scope
	}

	if actor, ok := authlib.ActorFromContext(ctx); ok && actor != nil {
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

// ApplyScopeDefaultsToMetadata injects default tenant/org metadata when enabled.
func ApplyScopeDefaultsToMetadata(metadata map[string]any, cfg admin.Config) map[string]any {
	scopeCfg := ScopeConfigFromAdmin(cfg)
	if scopeCfg.Mode != ScopeModeSingle {
		return metadata
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	if _, ok := metadata["tenant_id"]; !ok && strings.TrimSpace(scopeCfg.DefaultTenantID) != "" {
		metadata["tenant_id"] = scopeCfg.DefaultTenantID
	}
	if _, ok := metadata["organization_id"]; !ok && strings.TrimSpace(scopeCfg.DefaultOrgID) != "" {
		metadata["organization_id"] = scopeCfg.DefaultOrgID
	}
	return metadata
}

// ApplyScopeDefaultsToSession backfills tenant/org values for single-tenant mode.
func ApplyScopeDefaultsToSession(session SessionUser, cfg admin.Config) SessionUser {
	scopeCfg := ScopeConfigFromAdmin(cfg)
	if scopeCfg.Mode != ScopeModeSingle {
		return session
	}
	if strings.TrimSpace(session.TenantID) == "" {
		session.TenantID = scopeCfg.DefaultTenantID
	}
	if strings.TrimSpace(session.OrganizationID) == "" {
		session.OrganizationID = scopeCfg.DefaultOrgID
	}
	session.Metadata = ApplyScopeDefaultsToMetadata(session.Metadata, cfg)
	return session
}

func applyDefaultScope(scope userstypes.ScopeFilter, cfg admin.Config) userstypes.ScopeFilter {
	scopeCfg := ScopeConfigFromAdmin(cfg)
	if scopeCfg.Mode != ScopeModeSingle {
		return scope
	}
	if scope.TenantID == uuid.Nil {
		scope.TenantID = parseScopeID(scopeCfg.DefaultTenantID)
	}
	if scope.OrgID == uuid.Nil {
		scope.OrgID = parseScopeID(scopeCfg.DefaultOrgID)
	}
	return scope
}

func mergeScope(scope userstypes.ScopeFilter, tenantID, orgID string, metadata map[string]any) userstypes.ScopeFilter {
	if scope.TenantID == uuid.Nil {
		if parsed := parseScopeID(tenantID); parsed != uuid.Nil {
			scope.TenantID = parsed
		}
	}
	if scope.OrgID == uuid.Nil {
		if parsed := parseScopeID(orgID); parsed != uuid.Nil {
			scope.OrgID = parsed
		}
	}
	if len(metadata) > 0 {
		if scope.TenantID == uuid.Nil {
			scope.TenantID = firstScopeUUID(metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id")
		}
		if scope.OrgID == uuid.Nil {
			scope.OrgID = firstScopeUUID(metadata, "organization_id", "org_id", "org")
		}
	}
	return scope
}

func parseScopeID(val string) uuid.UUID {
	if strings.TrimSpace(val) == "" {
		return uuid.Nil
	}
	id, err := uuid.Parse(strings.TrimSpace(val))
	if err != nil {
		return uuid.Nil
	}
	return id
}

func firstScopeUUID(metadata map[string]any, keys ...string) uuid.UUID {
	for _, key := range keys {
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		if val, ok := raw.(string); ok {
			if id := parseScopeID(val); id != uuid.Nil {
				return id
			}
		}
	}
	return uuid.Nil
}
