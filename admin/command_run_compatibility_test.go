package admin

import (
	"context"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
)

func TestCommandRunRecordMapsToLauncherCompatibilityStates(t *testing.T) {
	for phase, want := range map[CommandRunPhase]string{
		CommandRunPhaseSubmitted:  "accepted",
		CommandRunPhaseStarted:    "running",
		CommandRunPhaseCheckpoint: "running",
		CommandRunPhaseProgress:   "running",
		CommandRunPhaseSucceeded:  "completed",
		CommandRunPhaseFailed:     "failed",
		CommandRunPhaseCanceled:   "canceled",
		CommandRunPhaseRejected:   "rejected",
	} {
		record := commandRunWebSocketTestRecord("run-1", "tenant-a")
		record.Phase = phase
		record.Revision = 7
		record.CorrelationID = "corr-1"
		record.DispatchID = "dispatch-1"
		record.Failure = &CommandRunFailure{Category: "command", Code: "COMMAND_FAILED"}
		status := commandStatusEventFromCommandRunRecord(record)
		if status.State != want || status.RunID != "run-1" || status.Revision != 7 || status.CorrelationID != "corr-1" || status.Code != "COMMAND_FAILED" {
			t.Fatalf("phase %s status = %+v", phase, status)
		}
	}
}

func TestPublishCommandStatusForwardsWithoutDebugCollector(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRolePublisher, Publisher: publisher,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(func() { _ = runtime.Close(context.Background()) })
	adm := &Admin{commandRunRuntime: runtime}
	adm.PublishCommandStatus(CommandStatusEvent{
		RunID: "run-external", CorrelationID: "corr-external", CommandID: "external.command", State: "completed",
	})
	update := publisher.last(t)
	if update.RunID != "run-external" || update.CorrelationID != "corr-external" || update.Phase != CommandRunPhaseSucceeded || update.Revision != 1 {
		t.Fatalf("forwarded update = %+v", update)
	}
}

func TestDirectRuntimeKeepsLegacyStatusFallback(t *testing.T) {
	debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
	if err := debugregistry.RegisterPanel(DebugPanelCommandLauncher, debugregistry.PanelConfig{EventTypes: []string{commandStatusEventType}}); err != nil {
		t.Fatalf("register launcher panel: %v", err)
	}
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommandLauncher) })
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandLauncher}})
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{Enabled: true})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(func() { _ = runtime.Close(context.Background()) })
	adm := &Admin{commandRunRuntime: runtime, debugCollector: collector}
	events := collector.Subscribe("direct-runtime-status")
	defer collector.Unsubscribe("direct-runtime-status")
	adm.PublishCommandStatus(CommandStatusEvent{RunID: "run-direct", CommandID: "direct.command", CorrelationID: "corr-direct", State: "running"})
	select {
	case event := <-events:
		if event.Type != commandStatusEventType {
			t.Fatalf("legacy fallback event = %+v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("direct runtime silenced legacy command_status")
	}
	deadline := time.Now().Add(time.Second)
	for {
		rows, listErr := runtime.Store().List(context.Background(), CommandRunSelector{Global: true})
		if listErr != nil {
			t.Fatalf("list: %v", listErr)
		}
		if len(rows) == 1 && rows[0].Phase == CommandRunPhaseStarted {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("legacy status was not forwarded canonically: %+v", rows)
		}
		time.Sleep(time.Millisecond)
	}
}

func TestCanonicalCompatibilityPublishesOneLauncherEventAndRejectsLateRegression(t *testing.T) {
	debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
	if err := debugregistry.RegisterPanel(DebugPanelCommandLauncher, debugregistry.PanelConfig{EventTypes: []string{commandStatusEventType}}); err != nil {
		t.Fatalf("register launcher panel: %v", err)
	}
	t.Cleanup(func() {
		debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
		debugregistry.UnregisterPanel(DebugPanelCommandRuns)
	})

	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandLauncher, DebugPanelCommandRuns}})
	adm := &Admin{authorizer: allowAuthorizer{}, debugCollector: collector}
	mod := NewDebugModule(DebugConfig{})
	mod.admin = adm
	mod.collector = collector
	if err := mod.startCommandRunRuntime(adm, DebugConfig{CommandRuns: CommandRunRuntimeConfig{Enabled: true}}); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(func() { _ = adm.CloseCommandRunRuntime(context.Background()) })
	RegisterCommandRunsDebugPanel(adm)

	events := collector.Subscribe("compatibility-client")
	defer collector.Unsubscribe("compatibility-client")
	adm.PublishCommandStatus(CommandStatusEvent{
		RunID: "run-one", CorrelationID: "corr-one", CommandID: "demo.command", State: "completed", Mode: "queued",
	})
	counts := waitForCommandCompatibilityEvents(t, events, 1, 1)
	if counts[commandRunDebugEventType] != 1 || counts[commandStatusEventType] != 1 {
		t.Fatalf("event counts = %+v", counts)
	}
	rows, err := adm.CommandRunRuntime().Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 1 || rows[0].Phase != CommandRunPhaseSucceeded {
		t.Fatalf("canonical rows=%+v err=%v", rows, err)
	}

	adm.PublishCommandStatus(CommandStatusEvent{
		RunID: "run-one", CorrelationID: "corr-one", CommandID: "demo.command", State: "accepted", Mode: "queued",
	})
	select {
	case event := <-events:
		t.Fatalf("late non-terminal status produced duplicate event: %+v", event)
	case <-time.After(100 * time.Millisecond):
	}

	commandLauncherPublishDispatchStatus(adm, "demo.command", "Command completed", RPCCommandDispatchResponse{})
	select {
	case event := <-events:
		t.Fatalf("launcher dispatch fallback double-published canonical status: %+v", event)
	case <-time.After(100 * time.Millisecond):
	}
}

func TestCommandRunBrowserDeliveryOverflowDegradesRuntimeDiagnostics(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{})
	adm := &Admin{authorizer: allowAuthorizer{}, debugCollector: collector}
	mod := NewDebugModule(DebugConfig{})
	mod.admin, mod.collector = adm, collector
	if err := mod.startCommandRunRuntime(adm, DebugConfig{CommandRuns: CommandRunRuntimeConfig{Enabled: true}}); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(func() { _ = adm.CloseCommandRunRuntime(context.Background()) })

	events := collector.Subscribe("stalled-command-run-client")
	for index := 0; index < debugSubscriberBuffer+2; index++ {
		collector.publish(commandRunDebugEventType, CommandRunRecord{CommandRunUpdate: CommandRunUpdate{
			RunID:    "diagnostic-run-" + toString(index),
			Revision: 1,
			Phase:    CommandRunPhaseProgress,
			Scope:    CommandRunScope{TenantID: "tenant-a"},
		}})
	}

	select {
	case _, ok := <-events:
		if ok {
			t.Fatal("expected overflowed subscriber to close")
		}
	case <-time.After(time.Second):
		t.Fatal("overflowed subscriber was not disconnected")
	}
	diagnostics := adm.CommandRunRuntime().Diagnostics()
	if diagnostics.DroppedEvents != 1 || diagnostics.Status != CommandRunDiagnosticDegraded {
		t.Fatalf("diagnostics = %+v", diagnostics)
	}
}

func TestObservedDispatchConvergesLauncherAndCommandRuns(t *testing.T) {
	debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
	if err := debugregistry.RegisterPanel(DebugPanelCommandLauncher, debugregistry.PanelConfig{EventTypes: []string{commandStatusEventType}}); err != nil {
		t.Fatalf("register launcher panel: %v", err)
	}
	t.Cleanup(func() {
		debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
		debugregistry.UnregisterPanel(DebugPanelCommandRuns)
	})
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandLauncher, DebugPanelCommandRuns}})
	adm := &Admin{authorizer: allowAuthorizer{}, debugCollector: collector}
	mod := NewDebugModule(DebugConfig{})
	mod.admin, mod.collector = adm, collector
	if err := mod.startCommandRunRuntime(adm, DebugConfig{CommandRuns: CommandRunRuntimeConfig{Enabled: true}}); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	t.Cleanup(func() { _ = adm.CloseCommandRunRuntime(context.Background()) })
	RegisterCommandRunsDebugPanel(adm)

	handler := dispatcher.SubscribeCommand(command.CommandFunc[commandRunObserverTestMessage](func(context.Context, commandRunObserverTestMessage) error {
		return nil
	}))
	if handler == nil {
		t.Fatal("subscribe command returned nil")
	}
	t.Cleanup(handler.Unsubscribe)
	events := collector.Subscribe("observed-dispatch-client")
	defer collector.Unsubscribe("observed-dispatch-client")
	if _, err := dispatcher.DispatchWith(context.Background(), commandRunObserverTestMessage{}, command.DispatchOptions{
		Mode: command.ExecutionModeInline, CorrelationID: "corr-dispatch",
	}); err != nil {
		t.Fatalf("dispatch: %v", err)
	}
	counts := waitForCommandCompatibilityEvents(t, events, 2, 2)
	if counts[commandRunDebugEventType] != 2 || counts[commandStatusEventType] != 2 {
		t.Fatalf("dispatch event counts = %+v", counts)
	}
	rows, err := adm.CommandRunRuntime().Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 1 || rows[0].Phase != CommandRunPhaseSucceeded || rows[0].CorrelationID != "corr-dispatch" {
		t.Fatalf("dispatch canonical rows=%+v err=%v", rows, err)
	}
	status := commandStatusEventFromCommandRunRecord(rows[0])
	if status.State != "completed" || status.RunID != rows[0].RunID || status.CorrelationID != rows[0].CorrelationID {
		t.Fatalf("launcher terminal status diverged: %+v row=%+v", status, rows[0])
	}
}

func waitForCommandCompatibilityEvents(t *testing.T, events <-chan DebugEvent, wantRuns, wantStatuses int) map[string]int {
	t.Helper()
	counts := map[string]int{}
	deadline := time.NewTimer(time.Second)
	defer deadline.Stop()
	for counts[commandRunDebugEventType] < wantRuns || counts[commandStatusEventType] < wantStatuses {
		select {
		case event := <-events:
			counts[event.Type]++
		case <-deadline.C:
			t.Fatalf("timed out waiting for compatibility events: %+v", counts)
		}
	}
	return counts
}
