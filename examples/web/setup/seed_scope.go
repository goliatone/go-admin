package setup

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

func seedScopeDefaults() types.ScopeFilter {
	cfg := quickstart.ScopeConfigFromEnv()
	if cfg.Mode == quickstart.ScopeModeSingle {
		tenantID, _ := parseScopeUUID(cfg.DefaultTenantID, "tenant")
		orgID, _ := parseScopeUUID(cfg.DefaultOrgID, "org")
		return types.ScopeFilter{TenantID: tenantID, OrgID: orgID}
	}
	seedDefaults := quickstart.DefaultScopeConfig()
	tenantID, _ := parseScopeUUID(seedDefaults.DefaultTenantID, "tenant")
	orgID, _ := parseScopeUUID(seedDefaults.DefaultOrgID, "org")
	return types.ScopeFilter{TenantID: tenantID, OrgID: orgID}
}

func rewriteSeedScope(ctx context.Context, db *bun.DB, cfg quickstart.ScopeConfig) error {
	if db == nil {
		return nil
	}
	cfg = quickstart.NormalizeScopeConfig(cfg)
	if cfg.Mode != quickstart.ScopeModeSingle {
		return nil
	}
	seedDefaults := quickstart.DefaultScopeConfig()
	fromTenant, _ := parseScopeUUID(seedDefaults.DefaultTenantID, "tenant")
	fromOrg, _ := parseScopeUUID(seedDefaults.DefaultOrgID, "org")
	toTenant, _ := parseScopeUUID(cfg.DefaultTenantID, "tenant")
	toOrg, _ := parseScopeUUID(cfg.DefaultOrgID, "org")
	if fromTenant == uuid.Nil || fromOrg == uuid.Nil || toTenant == uuid.Nil || toOrg == uuid.Nil {
		return nil
	}
	if fromTenant == toTenant && fromOrg == toOrg {
		return nil
	}
	legacyTenant := uuid.Nil
	legacyOrg := uuid.Nil
	if ctx == nil {
		ctx = context.Background()
	}

	if _, err := db.ExecContext(ctx, `
UPDATE custom_roles
SET tenant_id = ?, org_id = ?
WHERE (tenant_id = ? AND org_id = ?) OR (tenant_id = ? AND org_id = ?)`,
		toTenant, toOrg, fromTenant, fromOrg, legacyTenant, legacyOrg); err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `
UPDATE user_custom_roles
SET tenant_id = ?, org_id = ?
WHERE (tenant_id = ? AND org_id = ?) OR (tenant_id = ? AND org_id = ?)`,
		toTenant, toOrg, fromTenant, fromOrg, legacyTenant, legacyOrg); err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `
UPDATE user_profiles
SET tenant_id = ?, org_id = ?
WHERE (tenant_id = ? AND org_id = ?) OR (tenant_id = ? AND org_id = ?)`,
		toTenant, toOrg, fromTenant, fromOrg, legacyTenant, legacyOrg); err != nil {
		return err
	}

	return nil
}

func parseScopeUUID(raw string, _ string) (uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil, nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}
