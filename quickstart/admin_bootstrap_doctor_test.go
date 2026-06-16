package quickstart

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
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
	if !ids["quickstart.adapters"] || !ids["quickstart.go_users_scope"] || !ids["quickstart.scope_drift"] || !ids["quickstart.routing"] || !ids["quickstart.routes"] || !ids["quickstart.blocks.seeded_defaults"] || !ids["quickstart.translation"] {
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

func TestNewAdminFailsConfiguredTranslationPolicyWithoutCheckerServices(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	_, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationPolicyConfig(TranslationPolicyConfig{
			Required: map[string]TranslationPolicyEntityConfig{
				"pages": {
					"publish": {Locales: []string{"en", "es"}},
				},
			},
		}),
	)
	if !errors.Is(err, ErrTranslationPolicyServicesUnavailable) {
		t.Fatalf("expected translation policy services error, got %v", err)
	}
}

func TestNewAdminWarnsConfiguredTranslationPolicyWithoutCheckerServices(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationPolicyConfig(TranslationPolicyConfig{
			Required: map[string]TranslationPolicyEntityConfig{
				"pages": {
					"publish": {Locales: []string{"en", "es"}},
				},
			},
		}),
		WithStartupPolicy(StartupPolicyWarn),
	)
	if err != nil {
		t.Fatalf("expected warn-mode startup to continue, got %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	report := adm.RunDoctor(context.Background())
	check, ok := quickstartDoctorCheckResult(report, "quickstart.translation")
	if !ok {
		t.Fatalf("expected quickstart.translation doctor result, got %+v", report.Checks)
	}
	found := false
	for _, finding := range check.Findings {
		if finding.Code == TranslationPolicyServicesMissingCode {
			found = true
			if finding.Severity != admin.DoctorSeverityWarn || finding.Component != "translation.policy" {
				t.Fatalf("unexpected translation policy finding: %+v", finding)
			}
		}
	}
	if !found {
		t.Fatalf("expected translation policy services-missing finding, got %+v", check.Findings)
	}
}

func TestQuickstartDoctorTranslationReportsPersistedMissingNavigation(t *testing.T) {
	resetCommandRegistryForTest(t)

	ctx := context.Background()
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
				Store:   &moduleRegistrarExchangeStoreStub{},
			},
			Queue: &TranslationQueueConfig{
				Enabled:          true,
				Repository:       newQuickstartTranslationQueueRepo(),
				SupportedLocales: []string{"en", "es"},
			},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	items, _ := translationCapabilityMenuItemsWithDiagnostics(adm, cfg, cfg.NavMenuCode, cfg.DefaultLocale)
	drifted := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		if stringTargetValue(item.Target, "key") == "translation_dashboard" {
			continue
		}
		drifted = append(drifted, item)
	}
	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:    adm.MenuService(),
		MenuCode:   cfg.NavMenuCode,
		Locale:     cfg.DefaultLocale,
		Items:      drifted,
		SkipLogger: true,
	}); err != nil {
		t.Fatalf("seed drifted translation navigation: %v", err)
	}

	report := adm.RunDoctor(ctx)
	check, ok := quickstartDoctorCheckResult(report, "quickstart.translation")
	if !ok {
		t.Fatalf("expected quickstart.translation doctor result, got %+v", report.Checks)
	}
	found := false
	for _, finding := range check.Findings {
		if finding.Code != "quickstart.translation.navigation_persisted_missing" {
			continue
		}
		if !strings.Contains(strings.TrimSpace(fmt.Sprint(finding.Metadata["canonical_id"])), "translations.dashboard") {
			continue
		}
		found = true
		if finding.Severity != admin.DoctorSeverityWarn || finding.Component != "translation.navigation" {
			t.Fatalf("unexpected navigation finding: %+v", finding)
		}
	}
	if !found {
		t.Fatalf("expected persisted-missing translation dashboard finding, got %+v", check.Findings)
	}
}

func TestNewAdminAllowsConfiguredTranslationPolicyWithCheckerServices(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationPolicyConfig(TranslationPolicyConfig{
			Required: map[string]TranslationPolicyEntityConfig{
				"pages": {
					"publish": {Locales: []string{"en", "es"}},
				},
			},
		}),
		WithTranslationPolicyServices(TranslationPolicyServices{
			Pages:   stubTranslationChecker{},
			Content: stubTranslationChecker{},
		}),
	)
	if err != nil {
		t.Fatalf("expected checker services to satisfy startup diagnostics, got %v", err)
	}
	t.Cleanup(adm.Commands().Reset)
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

func TestQuickstartDoctorScopeDriftReportsUnavailableWithoutInspector(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")

	output := quickstartDoctorScopeDriftCheck(cfg, nil).Run(context.Background(), nil)
	if len(output.Findings) != 1 {
		t.Fatalf("expected one finding, got %#v", output.Findings)
	}
	finding := output.Findings[0]
	if finding.Severity != admin.DoctorSeverityInfo || finding.Code != "quickstart.scope_drift.inspector_missing" {
		t.Fatalf("unexpected finding: %#v", finding)
	}
	if got := output.Metadata["available"]; got != false {
		t.Fatalf("available = %v, want false", got)
	}
}

func TestQuickstartDoctorScopeDriftSkipsMultiTenantMode(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithScopeMode(ScopeModeMulti))
	inspector := scopeDriftInspectorStub{
		results: map[string]ScopeDriftTableCheck{
			"content_families": {Table: "content_families", Count: 3, Available: true},
		},
	}

	output := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(context.Background(), nil)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings for skipped multi-tenant check, got %#v", output.Findings)
	}
	if got := output.Metadata["skipped"]; got != true {
		t.Fatalf("skipped = %v, want true", got)
	}
	if !strings.Contains(strings.ToLower(output.Summary), "multi-tenant") {
		t.Fatalf("expected multi-tenant skip summary, got %q", output.Summary)
	}
}

func TestQuickstartDoctorScopeDriftReportsBlankRows(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	inspector := scopeDriftInspectorStub{
		results: map[string]ScopeDriftTableCheck{
			"content_families":        {Table: "content_families", Count: 2, Available: true},
			"locale_variants":         {Table: "locale_variants", Count: 0, Available: true},
			"family_blockers":         {Table: "family_blockers", Count: 1, Available: true},
			"translation_assignments": {Table: "translation_assignments", Count: 0, Available: true},
		},
	}

	output := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(context.Background(), nil)
	if len(output.Findings) != 2 {
		t.Fatalf("expected two blank-row findings, got %#v", output.Findings)
	}
	for _, finding := range output.Findings {
		if finding.Severity != admin.DoctorSeverityWarn || finding.Code != "quickstart.scope_drift.blank_rows" {
			t.Fatalf("unexpected finding: %#v", finding)
		}
	}
	if got := output.Metadata["available"]; got != true {
		t.Fatalf("available = %v, want true", got)
	}
	if !strings.Contains(output.Summary, "3 blank scoped row") {
		t.Fatalf("expected blank row summary, got %q", output.Summary)
	}
}

func TestQuickstartDoctorScopeDriftReportsCleanInspector(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	inspector := scopeDriftInspectorStub{
		results: map[string]ScopeDriftTableCheck{
			"content_families":        {Table: "content_families", Available: true},
			"locale_variants":         {Table: "locale_variants", Available: true},
			"family_blockers":         {Table: "family_blockers", Available: true},
			"translation_assignments": {Table: "translation_assignments", Available: true},
		},
	}

	output := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(context.Background(), nil)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings for clean scope drift check, got %#v", output.Findings)
	}
	if !strings.Contains(strings.ToLower(output.Summary), "no blank scoped rows") {
		t.Fatalf("expected clean summary, got %q", output.Summary)
	}
}

func TestBunScopeDriftInspectorCountsBlankRows(t *testing.T) {
	ctx := context.Background()
	db := newScopeDriftDoctorBunDB(t)
	createScopeDriftDoctorTables(t, db)
	cfg := NewAdminConfig("/admin", "Admin", "en")
	inspector := NewBunScopeDriftInspector(db)

	clean := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(ctx, nil)
	if len(clean.Findings) != 0 {
		t.Fatalf("expected clean database findings to be empty, got %#v", clean.Findings)
	}

	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (tenant_id, org_id) VALUES ('', 'org-1')`); err != nil {
		t.Fatalf("insert blank content family scope: %v", err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO family_blockers (tenant_id, org_id) VALUES ('tenant-1', NULL)`); err != nil {
		t.Fatalf("insert blank family blocker scope: %v", err)
	}

	drifted := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(ctx, nil)
	if len(drifted.Findings) != 2 {
		t.Fatalf("expected two drift findings, got %#v", drifted.Findings)
	}
	if !strings.Contains(drifted.Summary, "2 blank scoped row") {
		t.Fatalf("expected drift summary, got %q", drifted.Summary)
	}
}

func TestRepairScopeDriftDryRunReportsWithoutMutation(t *testing.T) {
	ctx := context.Background()
	db := newScopeDriftDoctorBunDB(t)
	createScopeDriftDoctorTables(t, db)
	inspector := NewBunScopeDriftInspector(db)
	cfg := NewAdminConfig("/admin", "Admin", "en")

	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (tenant_id, org_id) VALUES ('', '')`); err != nil {
		t.Fatalf("insert blank content family scope: %v", err)
	}

	report, err := RepairScopeDrift(ctx, cfg, inspector, inspector, ScopeDriftRepairInput{Tables: []string{"content_families"}})
	if err != nil {
		t.Fatalf("RepairScopeDrift dry-run error: %v", err)
	}
	if !report.DryRun || report.Applied {
		t.Fatalf("expected dry-run report, got %+v", report)
	}
	if report.TotalBeforeCount != 1 || report.TotalAfterCount != 1 || report.TotalRepairedCount != 0 {
		t.Fatalf("unexpected dry-run totals: %+v", report)
	}
	if got := scopeDriftBlankCount(t, db, "content_families"); got != 1 {
		t.Fatalf("dry-run mutated blank rows, count=%d", got)
	}
}

func TestRepairScopeDriftApplyBackfillsBlankScopeRows(t *testing.T) {
	ctx := context.Background()
	db := newScopeDriftDoctorBunDB(t)
	createScopeDriftDoctorTables(t, db)
	inspector := NewBunScopeDriftInspector(db)
	cfg := NewAdminConfig("/admin", "Admin", "en")

	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (tenant_id, org_id) VALUES ('', 'org-keep'), (NULL, NULL), ('tenant-ok', 'org-ok')`); err != nil {
		t.Fatalf("insert content family rows: %v", err)
	}

	report, err := RepairScopeDrift(ctx, cfg, inspector, inspector, ScopeDriftRepairInput{
		Apply:  true,
		Tables: []string{"content_families"},
	})
	if err != nil {
		t.Fatalf("RepairScopeDrift apply error: %v", err)
	}
	if report.DryRun || !report.Applied {
		t.Fatalf("expected apply report, got %+v", report)
	}
	if report.TotalBeforeCount != 2 || report.TotalAfterCount != 0 || report.TotalRepairedCount != 2 {
		t.Fatalf("unexpected apply totals: %+v", report)
	}
	if got := scopeDriftBlankCount(t, db, "content_families"); got != 0 {
		t.Fatalf("expected no blank rows after repair, got %d", got)
	}

	var tenantForExistingOrg string
	if err := db.QueryRowContext(ctx, `SELECT tenant_id FROM content_families WHERE org_id = 'org-keep'`).Scan(&tenantForExistingOrg); err != nil {
		t.Fatalf("read partially repaired row: %v", err)
	}
	if tenantForExistingOrg != defaultScopeTenantID {
		t.Fatalf("expected blank tenant backfilled to default, got %q", tenantForExistingOrg)
	}
	var defaultScoped int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM content_families WHERE tenant_id = ? AND org_id = ?`, defaultScopeTenantID, defaultScopeOrgID).Scan(&defaultScoped); err != nil {
		t.Fatalf("count default scoped rows: %v", err)
	}
	if defaultScoped != 1 {
		t.Fatalf("expected one fully default-scoped repaired row, got %d", defaultScoped)
	}
}

func TestRepairScopeDriftRejectsMultiTenantMode(t *testing.T) {
	ctx := context.Background()
	db := newScopeDriftDoctorBunDB(t)
	createScopeDriftDoctorTables(t, db)
	inspector := NewBunScopeDriftInspector(db)
	cfg := NewAdminConfig("/admin", "Admin", "en", WithScopeMode(ScopeModeMulti))

	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (tenant_id, org_id) VALUES ('', '')`); err != nil {
		t.Fatalf("insert blank content family scope: %v", err)
	}

	_, err := RepairScopeDrift(ctx, cfg, inspector, inspector, ScopeDriftRepairInput{
		Apply:  true,
		Tables: []string{"content_families"},
	})
	if err == nil || !strings.Contains(err.Error(), "single-tenant") {
		t.Fatalf("expected single-tenant repair error, got %v", err)
	}
	if got := scopeDriftBlankCount(t, db, "content_families"); got != 1 {
		t.Fatalf("multi-tenant repair mutated blank rows, count=%d", got)
	}
}

func TestNewAdminRegistersScopeDriftRepairCommandForRepairer(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	ctx := context.Background()
	db := newScopeDriftDoctorBunDB(t)
	createScopeDriftDoctorTables(t, db)
	inspector := NewBunScopeDriftInspector(db)
	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (tenant_id, org_id) VALUES ('', '')`); err != nil {
		t.Fatalf("insert blank content family scope: %v", err)
	}

	adm, _, err := NewAdmin(
		NewAdminConfig("/admin", "Admin", "en"),
		AdapterHooks{},
		WithScopeDriftInspector(inspector),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	err = adm.Commands().DispatchByName(ctx, ScopeDriftRepairCommandName, map[string]any{
		"apply": true,
		"table": "content_families",
	}, nil)
	if err != nil {
		t.Fatalf("DispatchByName scope repair error: %v", err)
	}
	if got := scopeDriftBlankCount(t, db, "content_families"); got != 0 {
		t.Fatalf("expected command to repair blank rows, got %d", got)
	}
}

func TestBunScopeDriftInspectorReportsMissingTablesUnavailable(t *testing.T) {
	db := newScopeDriftDoctorBunDB(t)
	cfg := NewAdminConfig("/admin", "Admin", "en")
	inspector := NewBunScopeDriftInspector(db)

	output := quickstartDoctorScopeDriftCheck(cfg, inspector).Run(context.Background(), nil)
	if len(output.Findings) != len(quickstartScopeDriftTables) {
		t.Fatalf("expected one unavailable finding per table, got %#v", output.Findings)
	}
	for _, finding := range output.Findings {
		if finding.Severity != admin.DoctorSeverityInfo || finding.Code != "quickstart.scope_drift.table_unavailable" {
			t.Fatalf("unexpected finding: %#v", finding)
		}
	}
	if got := output.Metadata["available"]; got != false {
		t.Fatalf("available = %v, want false", got)
	}
}

func scopeDriftBlankCount(t *testing.T, db *bun.DB, table string) int {
	t.Helper()
	var count int
	if err := db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM `+table+` WHERE tenant_id IS NULL OR tenant_id = '' OR org_id IS NULL OR org_id = ''`).Scan(&count); err != nil {
		t.Fatalf("count blank rows in %s: %v", table, err)
	}
	return count
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

type scopeDriftInspectorStub struct {
	results map[string]ScopeDriftTableCheck
}

func (s scopeDriftInspectorStub) CheckBlankScopeRows(_ context.Context, table string) (ScopeDriftTableCheck, error) {
	if result, ok := s.results[table]; ok {
		return result, nil
	}
	return ScopeDriftTableCheck{Table: table, Available: false, Error: "not configured"}, nil
}

func newScopeDriftDoctorBunDB(t *testing.T) *bun.DB {
	t.Helper()

	dsn := "file:" + filepath.Join(t.TempDir(), "scope_drift.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	db := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close bun db: %v", closeErr)
		}
	})
	return db
}

func createScopeDriftDoctorTables(t *testing.T, db *bun.DB) {
	t.Helper()

	ctx := context.Background()
	for _, table := range quickstartScopeDriftTables {
		if _, err := db.ExecContext(ctx, `CREATE TABLE `+table+` (tenant_id TEXT, org_id TEXT)`); err != nil {
			t.Fatalf("create %s: %v", table, err)
		}
	}
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
