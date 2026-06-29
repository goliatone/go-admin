package admin

import (
	"context"
	"testing"
)

func TestNavigationPermissionRegistryValidatePolicyReportsMissingGrants(t *testing.T) {
	registry := NewNavigationPermissionRegistry(NavigationPermissionDeclaration{
		Permission: "admin.news.view",
		Owner:      "news",
		Resource:   "news",
	})

	report := registry.ValidatePolicy([]RoleRecord{
		{RoleKey: "editor", Permissions: []string{"admin.pages.view"}},
		{RoleKey: "admin", Permissions: []string{"admin.*"}},
	})

	if len(report.Missing) != 1 {
		t.Fatalf("expected one missing permission finding, got %#v", report)
	}
	if report.Missing[0].Permission != "admin.news.view" || len(report.Missing[0].Missing) != 1 || report.Missing[0].Missing[0] != "editor" {
		t.Fatalf("unexpected missing finding: %#v", report.Missing[0])
	}
}

func TestNavigationPermissionRegistryValidatePolicyReportsRenamedGrants(t *testing.T) {
	registry := NewNavigationPermissionRegistry(NavigationPermissionDeclaration{
		Permission: "admin.guides.view",
		Owner:      "guides",
		Resource:   "guides",
		Renames:    []string{"admin.guide.view"},
	})

	report := registry.ValidatePolicy([]RoleRecord{
		{RoleKey: "writer", Permissions: []string{"admin.guide.view"}},
	})

	if len(report.Stale) != 1 {
		t.Fatalf("expected one stale rename finding, got %#v", report)
	}
	if report.Stale[0].Permission != "admin.guide.view" || report.Stale[0].RenamedBy != "admin.guides.view" {
		t.Fatalf("unexpected stale finding: %#v", report.Stale[0])
	}
}

func TestNavigationPermissionPolicyDoctorReportsMissingRoleGrants(t *testing.T) {
	ctx := context.Background()
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{})
	if _, err := adm.users.SaveRole(ctx, RoleRecord{RoleKey: "editor", Permissions: []string{"admin.pages.view"}}); err != nil {
		t.Fatalf("save role: %v", err)
	}
	adm.RegisterNavigationPermissions(NavigationPermissionDeclaration{
		Permission: "admin.news.view",
		Owner:      "news",
		Resource:   "news",
	})

	check, ok := adm.doctorCheckByID("navigation.permission_policy")
	if !ok {
		t.Fatalf("expected navigation permission policy doctor check")
	}
	result := runDoctorCheck(ctx, adm, check)
	if result.Status != DoctorSeverityWarn {
		t.Fatalf("expected warn status, got %#v", result)
	}
	if len(result.Findings) == 0 || result.Findings[0].Code != "navigation.permission_policy.missing_grant" {
		t.Fatalf("expected missing grant finding, got %#v", result.Findings)
	}
}
