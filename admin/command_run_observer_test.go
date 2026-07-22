package admin

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	goerrors "github.com/goliatone/go-errors"
)

func TestCommandRunObserverMapsEveryLifecyclePhase(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher})
	phases := []command.CommandRunPhase{
		command.CommandRunPhaseSubmitted, command.CommandRunPhaseStarted,
		command.CommandRunPhaseCheckpoint, command.CommandRunPhaseProgress,
		command.CommandRunPhaseSucceeded, command.CommandRunPhaseFailed,
		command.CommandRunPhaseCanceled, command.CommandRunPhaseRejected,
	}
	var lastRevision uint64
	for i, phase := range phases {
		event := testUpstreamCommandRunEvent("run-phases", phase)
		if phase == command.CommandRunPhaseFailed {
			event.Error = goerrors.New("private failure", goerrors.CategoryCommand).WithTextCode("COMMAND_FAILED")
			event.FailureCategory = "command"
		}
		if err := bridge.OnCommandRunEvent(context.Background(), event); err != nil {
			t.Fatalf("phase %s: %v", phase, err)
		}
		update := publisher.last(t)
		if update.Phase != CommandRunPhase(phase) || update.Revision == 0 {
			t.Fatalf("phase %s update = %+v", phase, update)
		}
		if i > 0 && update.Revision <= lastRevision {
			t.Fatalf("phase %s revision=%d did not advance", phase, update.Revision)
		}
		lastRevision = update.Revision
		if update.EventID == "" {
			t.Fatalf("phase %s missing event id", phase)
		}
		if phase == command.CommandRunPhaseFailed {
			if update.Failure == nil || update.Failure.Code != "COMMAND_FAILED" || strings.Contains(update.Message, "private") {
				t.Fatalf("unsafe failure mapping: %+v", update)
			}
		}
	}
}

func TestCommandRunObserverPreservesDurableUpstreamRevisionAcrossBridgeInstances(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	first := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher, RevisionLimit: 1})
	submitted := testUpstreamCommandRunEvent("run-distributed", command.CommandRunPhaseSubmitted)
	if !setTestCommandRunEventRevision(&submitted, 1) {
		t.Skip("released go-command does not yet expose durable command-run revisions")
	}
	if err := first.OnCommandRunEvent(context.Background(), submitted); err != nil {
		t.Fatalf("submitted: %v", err)
	}

	// A separately constructed bridge models a delayed worker in another process.
	worker := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher, RevisionLimit: 1})
	for _, lifecycle := range []struct {
		revision uint64
		phase    command.CommandRunPhase
	}{
		{2, command.CommandRunPhaseStarted},
		{3, command.CommandRunPhaseProgress},
		{4, command.CommandRunPhaseSucceeded},
	} {
		revision, phase := lifecycle.revision, lifecycle.phase
		event := testUpstreamCommandRunEvent("run-distributed", phase)
		setTestCommandRunEventRevision(&event, revision)
		if err := worker.OnCommandRunEvent(context.Background(), event); err != nil {
			t.Fatalf("revision %d: %v", revision, err)
		}
	}

	updates := publisher.snapshot()
	if len(updates) != 4 {
		t.Fatalf("updates=%d, want 4: %+v", len(updates), updates)
	}
	for index, update := range updates {
		if update.Revision != uint64(index+1) {
			t.Fatalf("update %d revision=%d, want %d", index, update.Revision, index+1)
		}
	}
}

func TestCommandRunObserverCompatibilityRevisionOrdersSeparateProcesses(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	publisher := commandRunPublisherFunc(func(ctx context.Context, update CommandRunUpdate) error {
		_, _, err := store.Apply(ctx, update)
		return err
	})
	acceptance := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher, RevisionLimit: 1})
	worker := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher, RevisionLimit: 1})
	base := time.Now().UTC()
	for index, lifecycle := range []struct {
		bridge *CommandRunObserverBridge
		phase  command.CommandRunPhase
	}{
		{acceptance, command.CommandRunPhaseSubmitted},
		{worker, command.CommandRunPhaseStarted},
		{worker, command.CommandRunPhaseProgress},
		{worker, command.CommandRunPhaseSucceeded},
	} {
		event := testUpstreamCommandRunEvent("run-legacy-distributed", lifecycle.phase)
		event.OccurredAt = base.Add(time.Duration(index) * time.Nanosecond)
		if err := lifecycle.bridge.OnCommandRunEvent(context.Background(), event); err != nil {
			t.Fatalf("phase %s: %v", lifecycle.phase, err)
		}
	}
	rows, err := store.List(context.Background(), CommandRunSelector{Global: true})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(rows) != 1 || rows[0].Phase != CommandRunPhaseSucceeded {
		t.Fatalf("rows=%+v, want one succeeded run", rows)
	}
}

func TestCommandRunObserverUpstreamRevisionSurvivesCompatibilityCacheEviction(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher, RevisionLimit: 1})
	first := testUpstreamCommandRunEvent("run-long", command.CommandRunPhaseProgress)
	if !setTestCommandRunEventRevision(&first, 20) {
		t.Skip("released go-command does not yet expose durable command-run revisions")
	}
	if err := bridge.OnCommandRunEvent(context.Background(), first); err != nil {
		t.Fatalf("first: %v", err)
	}
	evicting := testUpstreamCommandRunEvent("run-other", command.CommandRunPhaseStarted)
	setTestCommandRunEventRevision(&evicting, 1)
	if err := bridge.OnCommandRunEvent(context.Background(), evicting); err != nil {
		t.Fatalf("evicting: %v", err)
	}
	terminal := testUpstreamCommandRunEvent("run-long", command.CommandRunPhaseSucceeded)
	setTestCommandRunEventRevision(&terminal, 21)
	if err := bridge.OnCommandRunEvent(context.Background(), terminal); err != nil {
		t.Fatalf("terminal: %v", err)
	}
	if got := publisher.last(t).Revision; got != 21 {
		t.Fatalf("terminal revision=%d, want 21", got)
	}
}

func setTestCommandRunEventRevision(event *command.CommandRunEvent, revision uint64) bool {
	if event == nil {
		return false
	}
	field := reflect.ValueOf(event).Elem().FieldByName("Revision")
	if !field.IsValid() || !field.CanSet() || field.Kind() != reflect.Uint64 {
		return false
	}
	field.SetUint(revision)
	return true
}

func TestCommandRunObserverScopeAndUnsafeMetadata(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	var reported []error
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{
		Publisher: publisher, ApplicationID: "app", EnvironmentID: "prod",
		ScopeResolver: CommandRunScopeResolverFunc(func(context.Context, CommandRunUpdate) (CommandRunScope, error) {
			return CommandRunScope{TenantID: "tenant-a", OrganizationID: "org-1"}, nil
		}),
		OnError: func(err error) { reported = append(reported, err) },
	})
	event := testUpstreamCommandRunEvent("run-scope", command.CommandRunPhaseProgress)
	event.Metadata = map[string]any{"unsafe": errors.New("secret provider cause")}
	if err := bridge.OnCommandRunEvent(context.Background(), event); err != nil {
		t.Fatalf("observe: %v", err)
	}
	update := publisher.last(t)
	if update.Scope != (CommandRunScope{ApplicationID: "app", EnvironmentID: "prod", TenantID: "tenant-a", OrganizationID: "org-1"}) {
		t.Fatalf("scope = %+v", update.Scope)
	}
	if update.Metadata != nil {
		t.Fatalf("unsafe metadata was published: %+v", update.Metadata)
	}
	if len(reported) != 1 || !strings.Contains(reported[0].Error(), "dropped unsafe metadata") {
		t.Fatalf("reported errors = %v", reported)
	}
}

func TestCommandRunObserverRejectsScopeIdentityMismatch(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{
		Publisher: publisher, ApplicationID: "app",
		ScopeResolver: CommandRunScopeResolverFunc(func(context.Context, CommandRunUpdate) (CommandRunScope, error) {
			return CommandRunScope{ApplicationID: "other"}, nil
		}),
	})
	if err := bridge.OnCommandRunEvent(context.Background(), testUpstreamCommandRunEvent("run-mismatch", command.CommandRunPhaseStarted)); err == nil {
		t.Fatal("scope mismatch should fail")
	}
	if publisher.count() != 0 {
		t.Fatal("scope mismatch reached publisher")
	}
}

func TestCommandRunObserverPublishTimeoutIsFailOpenForDispatcher(t *testing.T) {
	publisher := commandRunPublisherFunc(func(ctx context.Context, _ CommandRunUpdate) error {
		<-ctx.Done()
		return ctx.Err()
	})
	var reported error
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{
		Publisher: publisher, PublishTimeout: 20 * time.Millisecond,
		OnError: func(err error) { reported = err },
	})
	started := time.Now()
	err := bridge.OnCommandRunEvent(context.Background(), testUpstreamCommandRunEvent("run-timeout", command.CommandRunPhaseSucceeded))
	if err == nil || reported == nil {
		t.Fatalf("timeout error=%v reported=%v", err, reported)
	}
	if elapsed := time.Since(started); elapsed > 250*time.Millisecond {
		t.Fatalf("observer blocked too long: %s", elapsed)
	}
}

func TestCommandRunObserverPublishesCanceledEventFromCanceledContext(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := bridge.OnCommandRunEvent(ctx, testUpstreamCommandRunEvent("run-canceled", command.CommandRunPhaseCanceled)); err != nil {
		t.Fatalf("observe canceled: %v", err)
	}
	if publisher.last(t).Phase != CommandRunPhaseCanceled {
		t.Fatal("canceled terminal event was not published")
	}
}

func TestCommandRunObserverStartCloseStartDoesNotDuplicateRegistration(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher})
	baseline := len(dispatcher.CommandRunObservers())
	if err := bridge.Start(CommandRunRoleGateway); err != nil {
		t.Fatalf("gateway start: %v", err)
	}
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatal("gateway-only role registered observer")
	}
	if err := bridge.Start(CommandRunRolePublisher); err != nil {
		t.Fatalf("publisher start: %v", err)
	}
	if err := bridge.Start(CommandRunRolePublisher); err != nil {
		t.Fatalf("repeated start: %v", err)
	}
	if len(dispatcher.CommandRunObservers()) != baseline+1 {
		t.Fatalf("observer count=%d, want %d", len(dispatcher.CommandRunObservers()), baseline+1)
	}
	bridge.Close()
	bridge.Close()
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatalf("observer count after close=%d, want %d", len(dispatcher.CommandRunObservers()), baseline)
	}
	if err := bridge.Start(CommandRunRolePublisher); err != nil {
		t.Fatalf("restart: %v", err)
	}
	bridge.Close()
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatalf("observer count after restart close=%d, want %d", len(dispatcher.CommandRunObservers()), baseline)
	}
}

func TestCommandRunObserverInlineEndToEndSequence(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher})
	if err := bridge.Start(CommandRunRolePublisher); err != nil {
		t.Fatalf("start: %v", err)
	}
	defer bridge.Close()
	subscription := dispatcher.SubscribeCommand(command.CommandFunc[commandRunObserverTestMessage](func(ctx context.Context, _ commandRunObserverTestMessage) error {
		command.Checkpoint(ctx, "prepared")
		command.Progress(ctx, 1, 2, command.WithProgressMessage("working"))
		return nil
	}))
	if subscription == nil {
		t.Fatal("subscribe command returned nil")
	}
	defer subscription.Unsubscribe()
	if err := dispatcher.Dispatch(context.Background(), commandRunObserverTestMessage{}); err != nil {
		t.Fatalf("dispatch: %v", err)
	}
	updates := publisher.snapshot()
	if len(updates) != 4 {
		t.Fatalf("inline updates=%d, want 4: %+v", len(updates), updates)
	}
	want := []CommandRunPhase{CommandRunPhaseStarted, CommandRunPhaseCheckpoint, CommandRunPhaseProgress, CommandRunPhaseSucceeded}
	for i, phase := range want {
		if updates[i].Phase != phase || updates[i].Revision == 0 || (i > 0 && updates[i].Revision <= updates[i-1].Revision) {
			t.Fatalf("update %d = %+v, want phase %s with increasing revision", i, updates[i], phase)
		}
	}
}

func TestCommandRunObserverObservedQueuedEndToEndSequence(t *testing.T) {
	publisher := &commandRunPublisherRecorder{}
	bridge := newTestCommandRunObserver(t, CommandRunObserverConfig{Publisher: publisher})
	if err := bridge.Start(CommandRunRolePublisher); err != nil {
		t.Fatalf("start: %v", err)
	}
	defer bridge.Close()
	run := command.DispatchRunContext{
		RunID: "queued-run", CommandID: "queued.command", ExecutionMode: command.ExecutionModeQueued,
		CorrelationID: "corr-1",
	}
	if err := dispatcher.RunObservedCommand(context.Background(), run, func(ctx context.Context) error {
		command.Progress(ctx, 1, 1)
		return nil
	}); err != nil {
		t.Fatalf("run observed command: %v", err)
	}
	updates := publisher.snapshot()
	if len(updates) != 3 {
		t.Fatalf("queued updates=%d, want 3: %+v", len(updates), updates)
	}
	for i, phase := range []CommandRunPhase{CommandRunPhaseStarted, CommandRunPhaseProgress, CommandRunPhaseSucceeded} {
		if updates[i].Phase != phase || updates[i].Mode != "queued" {
			t.Fatalf("queued update %d = %+v", i, updates[i])
		}
	}
}

type commandRunObserverTestMessage struct{}

func (commandRunObserverTestMessage) Type() string { return "go-admin.command-run-observer-test" }

type commandRunPublisherRecorder struct {
	mu      sync.Mutex
	updates []CommandRunUpdate
}

func (p *commandRunPublisherRecorder) PublishCommandRun(_ context.Context, update CommandRunUpdate) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.updates = append(p.updates, update.Clone())
	return nil
}

func (p *commandRunPublisherRecorder) snapshot() []CommandRunUpdate {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]CommandRunUpdate, len(p.updates))
	for i := range p.updates {
		out[i] = p.updates[i].Clone()
	}
	return out
}

func (p *commandRunPublisherRecorder) last(t testing.TB) CommandRunUpdate {
	t.Helper()
	updates := p.snapshot()
	if len(updates) == 0 {
		t.Fatal("publisher received no updates")
	}
	return updates[len(updates)-1]
}

func (p *commandRunPublisherRecorder) count() int { return len(p.snapshot()) }

type commandRunPublisherFunc func(context.Context, CommandRunUpdate) error

func (f commandRunPublisherFunc) PublishCommandRun(ctx context.Context, update CommandRunUpdate) error {
	return f(ctx, update)
}

func newTestCommandRunObserver(t testing.TB, config CommandRunObserverConfig) *CommandRunObserverBridge {
	t.Helper()
	bridge, err := NewCommandRunObserverBridge(config)
	if err != nil {
		t.Fatalf("new observer bridge: %v", err)
	}
	return bridge
}

func testUpstreamCommandRunEvent(runID string, phase command.CommandRunPhase) command.CommandRunEvent {
	return command.CommandRunEvent{
		RunID: runID, CommandID: "test.command", Phase: phase,
		OccurredAt: time.Now().UTC(), ExecutionMode: command.ExecutionModeInline,
	}
}
