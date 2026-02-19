package admin

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

func TestNewAdminRegistersDefaultDoctorChecks(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	checks := adm.DoctorChecks()
	if len(checks) == 0 {
		t.Fatalf("expected default doctor checks")
	}
	required := []string{
		"admin.core.dependencies",
		"admin.auth.wiring",
		"admin.features.wiring",
		"admin.cms.wiring",
	}
	for _, id := range required {
		if !doctorCheckIDsContain(checks, id) {
			t.Fatalf("expected default check %q to be registered", id)
		}
	}
}

func TestRunDoctorRecoversPanics(t *testing.T) {
	adm := &Admin{}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID: "panic.check",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			panic("boom")
		},
	})

	report := adm.RunDoctor(context.Background())
	if report.Verdict != DoctorSeverityError {
		t.Fatalf("expected error verdict, got %q", report.Verdict)
	}
	if report.Summary.Error != 1 {
		t.Fatalf("expected one error check, got %+v", report.Summary)
	}
	if len(report.Checks) != 1 {
		t.Fatalf("expected one check result, got %d", len(report.Checks))
	}
	result := report.Checks[0]
	if result.Status != DoctorSeverityError {
		t.Fatalf("expected panic check to error, got %q", result.Status)
	}
	if len(result.Findings) == 0 || result.Findings[0].Code != "doctor.check.panic" {
		t.Fatalf("expected panic finding code, got %+v", result.Findings)
	}
	if strings.TrimSpace(result.Help) == "" {
		t.Fatalf("expected help text on check result")
	}
	if result.Action == nil {
		t.Fatalf("expected action metadata on check result")
	}
}

func TestRunDoctorActionRunsExecutable(t *testing.T) {
	adm := &Admin{}
	ran := false
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:          "app.autofix",
		Description: "autofix",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{
				Findings: []DoctorFinding{
					{
						Severity: DoctorSeverityWarn,
						Message:  "needs autofix",
					},
				},
			}
		},
		Action: &DoctorAction{
			Label:       "Auto fix",
			CTA:         "Run auto fix",
			Description: "Runs remediation automatically.",
			Run: func(_ context.Context, _ *Admin, check DoctorCheckResult, input map[string]any) (DoctorActionExecution, error) {
				ran = true
				if check.ID != "app.autofix" {
					t.Fatalf("unexpected check id: %q", check.ID)
				}
				if input["source"] != "test" {
					t.Fatalf("expected input payload to flow into action handler")
				}
				return DoctorActionExecution{
					Status:  "ok",
					Message: "fixed",
				}, nil
			},
		},
	})

	exec, err := adm.RunDoctorAction(context.Background(), "app.autofix", map[string]any{"source": "test"})
	if err != nil {
		t.Fatalf("expected action to run, got error: %v", err)
	}
	if !ran {
		t.Fatalf("expected action handler invocation")
	}
	if exec.CheckID != "app.autofix" {
		t.Fatalf("expected check id on execution, got %q", exec.CheckID)
	}
	if exec.Snapshot.ID != "app.autofix" {
		t.Fatalf("expected snapshot for executed check, got %+v", exec.Snapshot)
	}
}

func TestRunDoctorActionReturnsNotRunnableForManualChecks(t *testing.T) {
	adm := &Admin{}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:          "app.manual",
		Description: "manual check",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{
				Findings: []DoctorFinding{
					{
						Severity: DoctorSeverityError,
						Message:  "manual work required",
					},
				},
			}
		},
		Action: NewManualDoctorAction("manual steps", "Fix manually"),
	})

	_, err := adm.RunDoctorAction(context.Background(), "app.manual", nil)
	if err == nil {
		t.Fatalf("expected manual action to be non-runnable")
	}
	if err != ErrDoctorActionNotRunnable {
		t.Fatalf("expected ErrDoctorActionNotRunnable, got %v", err)
	}
}

func TestDoctorDebugPanelCollectWithoutAdmin(t *testing.T) {
	panel := NewDoctorDebugPanel(nil)
	snapshot := panel.Collect(context.Background())
	if got := strings.TrimSpace(doctorValueString(snapshot["verdict"])); got != string(DoctorSeverityError) {
		t.Fatalf("expected error verdict, got %q", got)
	}
}

func TestRegisterDoctorDebugPanelExposesSnapshot(t *testing.T) {
	adm := &Admin{
		doctorChecks: map[string]DoctorCheck{},
		debugCollector: NewDebugCollector(DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelDoctor},
		}),
	}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID: "app.custom.check",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{Summary: "custom ok"}
		},
	})

	RegisterDoctorDebugPanel(adm)
	snapshot := adm.debugCollector.Snapshot()
	payload, ok := snapshot[DebugPanelDoctor]
	if !ok {
		t.Fatalf("expected doctor panel snapshot")
	}
	panelData, ok := payload.(map[string]any)
	if !ok {
		t.Fatalf("expected doctor snapshot payload map, got %T", payload)
	}
	if _, ok := panelData["verdict"]; !ok {
		t.Fatalf("expected verdict in doctor snapshot, got %+v", panelData)
	}
}

func doctorCheckIDsContain(checks []DoctorCheck, id string) bool {
	for _, check := range checks {
		if strings.EqualFold(strings.TrimSpace(check.ID), strings.TrimSpace(id)) {
			return true
		}
	}
	return false
}

func doctorValueString(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(strings.ToLower(fmt.Sprint(value)))
}
