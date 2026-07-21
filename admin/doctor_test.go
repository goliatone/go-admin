package admin

import (
	"context"
	"errors"
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
	if !errors.Is(err, ErrDoctorActionNotRunnable) {
		t.Fatalf("expected ErrDoctorActionNotRunnable, got %v", err)
	}
}

func TestDoctorCheckOutputCanProvideRequestScopedNavigationAction(t *testing.T) {
	type permissionContextKey struct{}
	adm := &Admin{}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:     "app.search",
		Action: NewManualDoctorAction("Static fallback", "Resolve manually"),
		Run: func(ctx context.Context, _ *Admin) DoctorCheckOutput {
			output := DoctorCheckOutput{Findings: []DoctorFinding{{Severity: DoctorSeverityWarn, Message: "search is not ready"}}}
			allowed, ok := ctx.Value(permissionContextKey{}).(bool)
			if ok && allowed {
				output.Action = &DoctorAction{
					Kind: DoctorActionKindNavigate,
					CTA:  "Open search repair",
					Metadata: map[string]any{
						"panel_id": "operational_commands",
						"state": map[string]any{
							"action_id": "search_repair",
							"payload":   map[string]any{"indexes": []string{"archive_media"}},
						},
					},
				}
			}
			return output
		},
	})

	denied := adm.RunDoctor(context.Background())
	if denied.Checks[0].Action == nil || denied.Checks[0].Action.Kind != DoctorActionKindManual {
		t.Fatalf("static fallback action = %#v", denied.Checks[0].Action)
	}
	authorized := adm.RunDoctor(context.WithValue(context.Background(), permissionContextKey{}, true))
	action := authorized.Checks[0].Action
	if action == nil || action.Kind != DoctorActionKindNavigate || !action.Runnable {
		t.Fatalf("dynamic navigation action = %#v", action)
	}
	if action.Metadata["panel_id"] != "operational_commands" {
		t.Fatalf("navigation metadata = %#v", action.Metadata)
	}
	state, ok := action.Metadata["state"].(map[string]any)
	if !ok || state["action_id"] != "search_repair" {
		t.Fatalf("navigation state = %#v", action.Metadata["state"])
	}
}

func TestRunDoctorActionRejectsRequestScopedNavigationBeforeStaticHandler(t *testing.T) {
	type permissionContextKey struct{}
	called := false
	adm := &Admin{}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID: "app.search",
		Action: &DoctorAction{
			Kind: DoctorActionKindAuto,
			Run: func(context.Context, *Admin, DoctorCheckResult, map[string]any) (DoctorActionExecution, error) {
				called = true
				return DoctorActionExecution{}, nil
			},
		},
		Run: func(ctx context.Context, _ *Admin) DoctorCheckOutput {
			output := DoctorCheckOutput{Findings: []DoctorFinding{{Severity: DoctorSeverityWarn, Message: "search is not ready"}}}
			allowed, ok := ctx.Value(permissionContextKey{}).(bool)
			if ok && allowed {
				output.Action = &DoctorAction{
					Kind: DoctorActionKindNavigate,
					Metadata: map[string]any{
						"panel_id": "operational_commands",
					},
				}
			}
			return output
		},
	})

	ctx := context.WithValue(context.Background(), permissionContextKey{}, true)
	_, err := adm.RunDoctorAction(ctx, "app.search", nil)
	if !errors.Is(err, ErrDoctorActionNotRunnable) {
		t.Fatalf("expected navigation action to be non-runnable, got %v", err)
	}
	if called {
		t.Fatalf("static executable handler ran for request-scoped navigation action")
	}
}

func TestDoctorCheckOutputIgnoresRequestScopedExecutableAction(t *testing.T) {
	static := NewManualDoctorAction("Static fallback", "Resolve manually")
	result := runDoctorCheck(context.Background(), &Admin{}, DoctorCheck{
		ID:     "app.search",
		Action: static,
		Run: func(context.Context, *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{
				Findings: []DoctorFinding{{Severity: DoctorSeverityWarn, Message: "search is not ready"}},
				Action: &DoctorAction{
					Kind: DoctorActionKindAuto,
					Run: func(context.Context, *Admin, DoctorCheckResult, map[string]any) (DoctorActionExecution, error) {
						return DoctorActionExecution{}, nil
					},
				},
			}
		},
	})
	if result.Action == nil || result.Action.Kind != DoctorActionKindManual {
		t.Fatalf("request-scoped executable action should use static fallback: %#v", result.Action)
	}
}

func TestDoctorNavigationActionRejectsUnsafeOrOversizedMetadata(t *testing.T) {
	nonString := doctorActionState(&DoctorAction{
		Kind:     DoctorActionKindNavigate,
		Metadata: map[string]any{"panel_id": 123},
	}, DoctorSeverityWarn)
	if nonString == nil || nonString.Runnable || len(nonString.Metadata) != 0 {
		t.Fatalf("non-string navigation target = %#v", nonString)
	}

	unsafe := doctorActionState(&DoctorAction{
		Kind:     DoctorActionKindNavigate,
		Metadata: map[string]any{"panel_id": "../commands"},
	}, DoctorSeverityWarn)
	if unsafe == nil || unsafe.Runnable || len(unsafe.Metadata) != 0 {
		t.Fatalf("unsafe navigation action = %#v", unsafe)
	}

	nonASCII := doctorActionState(&DoctorAction{
		Kind:     DoctorActionKindNavigate,
		Metadata: map[string]any{"panel_id": "opérations"},
	}, DoctorSeverityWarn)
	if nonASCII == nil || nonASCII.Runnable || len(nonASCII.Metadata) != 0 {
		t.Fatalf("non-ASCII navigation action = %#v", nonASCII)
	}

	oversized := doctorActionState(&DoctorAction{
		Kind: DoctorActionKindNavigate,
		Metadata: map[string]any{
			"panel_id": "commands",
			"state":    map[string]any{"payload": strings.Repeat("x", doctorNavigationMaxStateBytes+1)},
		},
	}, DoctorSeverityWarn)
	if oversized == nil || !oversized.Runnable {
		t.Fatalf("navigation without optional state should remain usable: %#v", oversized)
	}
	if _, retained := oversized.Metadata["state"]; retained {
		t.Fatalf("oversized navigation state retained: %#v", oversized.Metadata)
	}
}

func TestDoctorDebugPanelCollectWithoutAdmin(t *testing.T) {
	panel := NewDoctorDebugPanel(nil)
	snapshot := panel.Collect(context.Background())
	if got := strings.TrimSpace(doctorValueString(snapshot["verdict"])); got != string(DoctorSeverityError) {
		t.Fatalf("expected error verdict, got %q", got)
	}
}

func TestDoctorDebugPanelUsesRegisteredIcon(t *testing.T) {
	panel := NewDoctorDebugPanel(nil)
	if got := panel.Icon(); got != "iconoir-heart" {
		t.Fatalf("expected doctor panel iconoir heart icon, got %q", got)
	}
	meta := debugPanelDefaults[DebugPanelDoctor]
	if got := meta.Icon; got != "iconoir-heart" {
		t.Fatalf("expected doctor debug metadata iconoir heart icon, got %q", got)
	}
	if !iconDefinitionsContain(BuiltinIconoirLibrary().Icons, "heart") {
		t.Fatalf("expected built-in iconoir library to include heart icon")
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

func iconDefinitionsContain(icons []IconDefinition, name string) bool {
	for _, icon := range icons {
		if icon.Name == name {
			return true
		}
	}
	return false
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
