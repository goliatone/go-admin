package admin

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestCommandRunDiagnosticsTrackLifecycleProjectionAndSafeFailures(t *testing.T) {
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{Enabled: true})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if diagnostics := runtime.Diagnostics(); diagnostics.Status != CommandRunDiagnosticNotStarted || !diagnostics.Local || diagnostics.Transport != "local" {
		t.Fatalf("initial diagnostics = %+v", diagnostics)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start: %v", err)
	}
	update := localTransportTestUpdate("diagnostics", 1)
	if err := runtime.Publisher().PublishCommandRun(context.Background(), update); err != nil {
		t.Fatalf("publish: %v", err)
	}
	waitForCommandRunDiagnostics(t, runtime, func(diagnostics CommandRunDiagnostics) bool {
		return diagnostics.ProjectionCount == 1 && diagnostics.LastSuccessfulEventAt != nil
	})

	runtime.reportError(ErrCommandRunPublishFailed)
	runtime.reportError(ErrCommandRunSubscriptionFailed)
	runtime.reportError(ErrCommandRunEnvelopeRejected)
	runtime.reportError(ErrCommandRunScopeRejected)
	runtime.reportError(ErrCommandRunTransportBackpressure)
	runtime.reportProjectionError(errors.New("secret database detail"))
	runtime.reportError(errors.New("secret provider detail"))
	diagnostics := runtime.Diagnostics()
	if diagnostics.Status != CommandRunDiagnosticDegraded || diagnostics.PublishFailures != 1 ||
		diagnostics.SubscriptionFailures != 1 || diagnostics.RejectedEvents != 2 || diagnostics.DroppedEvents != 1 ||
		diagnostics.ProjectionFailures != 1 || diagnostics.OtherFailures != 1 || diagnostics.LastFailureAt == nil {
		t.Fatalf("failure diagnostics = %+v", diagnostics)
	}
	encoded, err := json.Marshal(diagnostics)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if containsBytes(encoded, []byte("secret")) || diagnostics.LastFailureCode != "other_failure" {
		t.Fatalf("unsafe diagnostics: %s", encoded)
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
	if diagnostics := runtime.Diagnostics(); diagnostics.Status != CommandRunDiagnosticClosed || diagnostics.Ready {
		t.Fatalf("closed diagnostics = %+v", diagnostics)
	}
}

func TestCommandRunDoctorDistinguishesLocalRemoteAndFailureStates(t *testing.T) {
	local, err := NewCommandRunRuntime(CommandRunRuntimeConfig{Enabled: true})
	if err != nil {
		t.Fatal(err)
	}
	if err := local.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	defer local.Close(context.Background())
	localResult := runCommandRunDoctorCheck(t, local)
	if localResult.Status != DoctorSeverityInfo || !hasDoctorFindingCode(localResult, "command_runs.local_ephemeral") {
		t.Fatalf("local doctor result = %+v", localResult)
	}

	notReady := newDiagnosticRemoteRuntime(t, false)
	notReadyResult := runCommandRunDoctorCheck(t, notReady)
	if notReadyResult.Status != DoctorSeverityWarn || !hasDoctorFindingCode(notReadyResult, "command_runs.not_ready") {
		t.Fatalf("not-ready doctor result = %+v", notReadyResult)
	}

	remote := newDiagnosticRemoteRuntime(t, true)
	defer remote.Close(context.Background())
	remoteResult := runCommandRunDoctorCheck(t, remote)
	if remoteResult.Status != DoctorSeverityOK || remoteResult.Metadata["transport"] != "remote" {
		t.Fatalf("healthy remote doctor result = %+v", remoteResult)
	}
	remoteTransport := remote.subscriber.(*diagnosticRemoteTransport)
	remoteTransport.subscription.errors <- ErrCommandRunScopeRejected
	waitForCommandRunDiagnostics(t, remote, func(diagnostics CommandRunDiagnostics) bool {
		return diagnostics.RejectedEvents == 1
	})
	remoteTransport.subscription.errors <- errors.New("secret provider interruption")
	waitForCommandRunDiagnostics(t, remote, func(diagnostics CommandRunDiagnostics) bool {
		return diagnostics.SubscriptionFailures == 1
	})
	failedResult := runCommandRunDoctorCheck(t, remote)
	if failedResult.Status != DoctorSeverityWarn || !hasDoctorFindingCode(failedResult, "command_runs.subscription_failed") ||
		!hasDoctorFindingCode(failedResult, "command_runs.events_rejected") {
		t.Fatalf("failed remote doctor result = %+v", failedResult)
	}
}

func TestCommandRunDoctorReportsUnconfiguredRuntimeAsIntentional(t *testing.T) {
	result := runDoctorCheck(context.Background(), &Admin{}, commandRunDoctorCheck())
	if result.Status != DoctorSeverityOK || result.Summary != "Command Runs runtime is not configured" || result.Metadata["enabled"] != false {
		t.Fatalf("unconfigured result = %+v", result)
	}
}

func TestCommandRunDiagnosticsClearReadinessWhenSubscriptionEnds(t *testing.T) {
	runtime := newDiagnosticRemoteRuntime(t, true)
	subscription := runtime.subscriber.(*diagnosticRemoteTransport).subscription
	if err := subscription.Close(context.Background()); err != nil {
		t.Fatalf("end subscription: %v", err)
	}
	waitForCommandRunDiagnostics(t, runtime, func(diagnostics CommandRunDiagnostics) bool {
		return !diagnostics.Ready && diagnostics.SubscriptionFailures == 1
	})
	if diagnostics := runtime.Diagnostics(); diagnostics.Status != CommandRunDiagnosticDegraded {
		t.Fatalf("ended subscription diagnostics = %+v", diagnostics)
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close runtime: %v", err)
	}
}

type diagnosticRemoteTransport struct {
	subscription *diagnosticSubscription
}

func (t *diagnosticRemoteTransport) PublishCommandRun(context.Context, CommandRunUpdate) error {
	return nil
}
func (t *diagnosticRemoteTransport) SubscribeCommandRuns(context.Context, CommandRunSelector, CommandRunHandler) (CommandRunSubscription, error) {
	return t.subscription, nil
}
func (*diagnosticRemoteTransport) Capabilities() CommandRunTransportCapabilities {
	return CommandRunTransportCapabilities{
		Name: "remote", Fanout: true, Durability: CommandRunTransportDurabilityEphemeral,
	}
}

type diagnosticSubscription struct {
	ready  chan struct{}
	errors chan error
	done   chan struct{}
	once   sync.Once
}

func (s *diagnosticSubscription) Ready() <-chan struct{} { return s.ready }
func (s *diagnosticSubscription) Errors() <-chan error   { return s.errors }
func (s *diagnosticSubscription) Close(context.Context) error {
	s.once.Do(func() {
		close(s.done)
		close(s.errors)
	})
	return nil
}

func newDiagnosticRemoteRuntime(t testing.TB, start bool) *CommandRunRuntime {
	t.Helper()
	ready := make(chan struct{})
	close(ready)
	transport := &diagnosticRemoteTransport{subscription: &diagnosticSubscription{
		ready: ready, errors: make(chan error, 4), done: make(chan struct{}),
	}}
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleGateway, Subscriber: transport,
	})
	if err != nil {
		t.Fatalf("new remote runtime: %v", err)
	}
	if start {
		if err := runtime.Start(context.Background()); err != nil {
			t.Fatalf("start remote runtime: %v", err)
		}
	}
	return runtime
}

func runCommandRunDoctorCheck(t testing.TB, runtime *CommandRunRuntime) DoctorCheckResult {
	t.Helper()
	adm := &Admin{commandRunRuntime: runtime}
	return runDoctorCheck(context.Background(), adm, commandRunDoctorCheck())
}

func waitForCommandRunDiagnostics(t testing.TB, runtime *CommandRunRuntime, condition func(CommandRunDiagnostics) bool) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if condition(runtime.Diagnostics()) {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("diagnostics condition not met: %+v", runtime.Diagnostics())
}

func hasDoctorFindingCode(result DoctorCheckResult, code string) bool {
	for _, finding := range result.Findings {
		if finding.Code == code {
			return true
		}
	}
	return false
}

func containsBytes(value, fragment []byte) bool {
	if len(fragment) == 0 {
		return true
	}
	for index := 0; index+len(fragment) <= len(value); index++ {
		match := true
		for offset := range fragment {
			if value[index+offset] != fragment[offset] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
