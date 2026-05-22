package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestWithDoctorChecksRegistersCustomChecks(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	custom := admin.DoctorCheck{
		ID:    "app.custom.health",
		Label: "App Custom Health",
		Run: func(_ context.Context, _ *admin.Admin) admin.DoctorCheckOutput {
			return admin.DoctorCheckOutput{Summary: "custom check ok"}
		},
	}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(quickstartRoutingFeatureDefaults()),
		WithDoctorChecks(
			custom,
			admin.DoctorCheck{ID: "", Run: nil},
		),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	ids := doctorCheckIDs(adm.DoctorChecks())
	if !ids["quickstart.adapters"] || !ids["quickstart.go_users_scope"] || !ids["quickstart.routing"] || !ids["quickstart.routes"] || !ids["quickstart.blocks.seeded_defaults"] || !ids["quickstart.translation"] {
		t.Fatalf("expected quickstart default doctor checks, got %v", ids)
	}
	if !ids["app.custom.health"] {
		t.Fatalf("expected custom doctor check, got %v", ids)
	}

	report := adm.RunDoctor(context.Background())
	foundCustom := false
	for _, check := range report.Checks {
		if check.ID != "app.custom.health" {
			continue
		}
		foundCustom = true
		if check.Status != admin.DoctorSeverityOK {
			t.Fatalf("expected custom check status ok, got %q", check.Status)
		}
		if !strings.Contains(strings.ToLower(check.Summary), "custom") {
			t.Fatalf("expected custom summary, got %q", check.Summary)
		}
	}
	if !foundCustom {
		t.Fatalf("expected custom check result in report")
	}
}

func TestQuickstartDoctorGoUsersScopeReportsDefaultedResolver(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	options := adminOptions{}
	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  stubRoleRegistry{},
		ProfileRepo:   stubProfileRepo{},
	})(&options)
	finalizeGoUsersUserManagement(cfg, &options)

	output := quickstartDoctorGoUsersScopeCheck(cfg, options).Run(context.Background(), nil)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings, got %#v", output.Findings)
	}
	wiring := metadataMap(t, output.Metadata, "wiring")
	if got := wiring["resolver_source"]; got != goUsersScopeResolverSourceDefaulted {
		t.Fatalf("resolver_source = %v, want %s", got, goUsersScopeResolverSourceDefaulted)
	}
	if got := wiring["resolver_finalized"]; got != true {
		t.Fatalf("expected resolver_finalized true, got %v", got)
	}
	owned := metadataBoolMap(t, wiring, "quickstart_owned")
	if !owned["user_repository"] || !owned["role_repository"] || !owned["profile_store"] {
		t.Fatalf("expected quickstart-owned user/role/profile adapters, got %v", owned)
	}
	scope := metadataMap(t, output.Metadata, "scope")
	applied := metadataBoolMap(t, scope, "defaults_applied")
	if !applied["tenant_id"] || !applied["org_id"] {
		t.Fatalf("expected default scope to be applied for empty doctor context, got %v", applied)
	}
}

func TestNewAdminFinalizesGoUsersUserManagementDefaultResolver(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(quickstartRoutingFeatureDefaults()),
		WithGoUsersUserManagement(GoUsersUserManagementConfig{
			AuthRepo:      stubAuthRepo{},
			InventoryRepo: stubInventoryRepo{},
			RoleRegistry:  stubRoleRegistry{},
			ProfileRepo:   stubProfileRepo{},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	report := adm.RunDoctor(context.Background())
	check, ok := quickstartDoctorCheckResult(report, "quickstart.go_users_scope")
	if !ok {
		t.Fatalf("expected quickstart.go_users_scope doctor result, got %+v", report.Checks)
	}
	if check.Status != admin.DoctorSeverityOK {
		t.Fatalf("expected go-users scope check status ok, got %q findings=%#v", check.Status, check.Findings)
	}
	wiring := metadataMap(t, check.Metadata, "wiring")
	if got := wiring["resolver_source"]; got != goUsersScopeResolverSourceDefaulted {
		t.Fatalf("resolver_source = %v, want %s", got, goUsersScopeResolverSourceDefaulted)
	}
	if got := wiring["resolver_finalized"]; got != true {
		t.Fatalf("expected resolver_finalized true, got %v", got)
	}
	owned := metadataBoolMap(t, wiring, "quickstart_owned")
	if !owned["user_repository"] || !owned["role_repository"] || !owned["profile_store"] {
		t.Fatalf("expected quickstart-owned user/role/profile adapters, got %v", owned)
	}
	scope := metadataMap(t, check.Metadata, "scope")
	applied := metadataBoolMap(t, scope, "defaults_applied")
	if !applied["tenant_id"] || !applied["org_id"] {
		t.Fatalf("expected default scope to be applied through NewAdmin, got %v", applied)
	}
}

func TestQuickstartDoctorGoUsersScopeReportsExplicitResolverAsBestEffort(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	options := adminOptions{}
	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  stubRoleRegistry{},
		ScopeResolver: stubScopeResolver,
	})(&options)
	finalizeGoUsersUserManagement(cfg, &options)

	output := quickstartDoctorGoUsersScopeCheck(cfg, options).Run(context.Background(), nil)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings for explicit quickstart resolver, got %#v", output.Findings)
	}
	wiring := metadataMap(t, output.Metadata, "wiring")
	if got := wiring["resolver_source"]; got != goUsersScopeResolverSourceExplicit {
		t.Fatalf("resolver_source = %v, want %s", got, goUsersScopeResolverSourceExplicit)
	}
	if !strings.Contains(strings.ToLower(output.Summary), "explicit") {
		t.Fatalf("expected explicit summary, got %q", output.Summary)
	}
}

func TestQuickstartDoctorGoUsersScopeWarnsForUnknownSingleTenantResolver(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	options := adminOptions{
		deps: admin.Dependencies{
			UserRepository: admin.NewGoUsersUserRepository(nil, nil, nil),
			RoleRepository: admin.NewGoUsersRoleRepository(nil, nil),
		},
	}

	output := quickstartDoctorGoUsersScopeCheck(cfg, options).Run(context.Background(), nil)
	if len(output.Findings) != 1 {
		t.Fatalf("expected one finding, got %#v", output.Findings)
	}
	finding := output.Findings[0]
	if finding.Severity != admin.DoctorSeverityWarn || finding.Code != "quickstart.go_users_scope.unknown_resolver" {
		t.Fatalf("unexpected finding: %#v", finding)
	}
	wiring := metadataMap(t, output.Metadata, "wiring")
	if got := wiring["resolver_source"]; got != goUsersScopeResolverSourceUnknown {
		t.Fatalf("resolver_source = %v, want %s", got, goUsersScopeResolverSourceUnknown)
	}
}

func TestQuickstartDoctorGoUsersScopeDoesNotWarnForMultiTenantUnknownResolver(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithScopeMode(ScopeModeMulti))
	options := adminOptions{
		deps: admin.Dependencies{
			UserRepository: admin.NewGoUsersUserRepository(nil, nil, nil),
			RoleRepository: admin.NewGoUsersRoleRepository(nil, nil),
		},
	}

	output := quickstartDoctorGoUsersScopeCheck(cfg, options).Run(context.Background(), nil)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings for multi-tenant unknown resolver, got %#v", output.Findings)
	}
}

func doctorCheckIDs(checks []admin.DoctorCheck) map[string]bool {
	ids := map[string]bool{}
	for _, check := range checks {
		id := strings.ToLower(strings.TrimSpace(check.ID))
		if id == "" {
			continue
		}
		ids[id] = true
	}
	return ids
}

func metadataMap(t *testing.T, metadata map[string]any, key string) map[string]any {
	t.Helper()
	out, ok := metadata[key].(map[string]any)
	if !ok {
		t.Fatalf("metadata[%q] = %T, want map[string]any", key, metadata[key])
	}
	return out
}

func metadataBoolMap(t *testing.T, metadata map[string]any, key string) map[string]bool {
	t.Helper()
	if out, ok := metadata[key].(map[string]bool); ok {
		return out
	}
	raw, ok := metadata[key].(map[string]any)
	if !ok {
		t.Fatalf("metadata[%q] = %T, want bool map", key, metadata[key])
	}
	out := map[string]bool{}
	for k, v := range raw {
		val, ok := v.(bool)
		if !ok {
			t.Fatalf("metadata[%q][%q] = %T, want bool", key, k, v)
		}
		out[k] = val
	}
	return out
}
