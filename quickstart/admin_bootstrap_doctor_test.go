package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestWithDoctorChecksRegistersCustomChecks(t *testing.T) {
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
		WithDoctorChecks(
			custom,
			admin.DoctorCheck{ID: "", Run: nil},
		),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}

	ids := doctorCheckIDs(adm.DoctorChecks())
	if !ids["quickstart.adapters"] || !ids["quickstart.routes"] || !ids["quickstart.blocks.seeded_defaults"] || !ids["quickstart.translation"] {
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
