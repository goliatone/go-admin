package lifecycle

import (
	"context"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunPhaseOrdersTasksByPhasePriorityAndRegistration(t *testing.T) {
	registry := NewRegistry()
	calls := []string{}
	mustRegister(t, registry, Task{Name: "post", Phase: PhasePostBind, Priority: 100, Run: record(&calls, "post")})
	mustRegister(t, registry, Task{Name: "low", Phase: PhasePreBind, Priority: 1, Run: record(&calls, "low")})
	mustRegister(t, registry, Task{Name: "high", Phase: PhasePreBind, Priority: 10, Run: record(&calls, "high")})
	mustRegister(t, registry, Task{Name: "same-a", Phase: PhasePreBind, Priority: 5, Run: record(&calls, "same-a")})
	mustRegister(t, registry, Task{Name: "same-b", Phase: PhasePreBind, Priority: 5, Run: record(&calls, "same-b")})

	runner := MustNewRunner(registry)
	if err := runner.RunPreBind(context.Background()); err != nil {
		t.Fatalf("RunPreBind() error = %v", err)
	}
	if want := []string{"high", "same-a", "same-b", "low"}; !reflect.DeepEqual(calls, want) {
		t.Fatalf("calls = %v, want %v", calls, want)
	}
}

func TestFatalFailureStopsPhaseAndRecordsSnapshot(t *testing.T) {
	registry := NewRegistry()
	calls := []string{}
	mustRegister(t, registry, Task{Name: "first", Phase: PhasePreBind, Run: func(context.Context) error {
		calls = append(calls, "first")
		return errors.New("boom")
	}})
	mustRegister(t, registry, Task{Name: "second", Phase: PhasePreBind, Run: record(&calls, "second")})

	runner := MustNewRunner(registry)
	if err := runner.RunPreBind(context.Background()); err == nil {
		t.Fatal("RunPreBind() error = nil, want fatal error")
	}
	if want := []string{"first"}; !reflect.DeepEqual(calls, want) {
		t.Fatalf("calls = %v, want %v", calls, want)
	}
	task := findTask(t, runner.Snapshot(), "first")
	if task.State != StateFailed || task.Error == "" || task.StartedAt.IsZero() || task.CompletedAt.IsZero() {
		t.Fatalf("unexpected first task snapshot: %+v", task)
	}
}

func TestDegradedRetryableAndIgnoredPoliciesRecordWithoutStopping(t *testing.T) {
	registry := NewRegistry()
	var attempts int
	mustRegister(t, registry, Task{
		Name:     "degraded",
		Phase:    PhasePostBind,
		Policy:   ErrorPolicyDegraded,
		Run:      func(context.Context) error { return errors.New("soft failure") },
		Priority: 30,
	})
	mustRegister(t, registry, Task{
		Name:        "retryable",
		Phase:       PhasePostBind,
		Policy:      ErrorPolicyRetryable,
		MaxAttempts: 3,
		Priority:    20,
		Run: func(context.Context) error {
			attempts++
			return errors.New("still failing")
		},
	})
	mustRegister(t, registry, Task{
		Name:     "ignored",
		Phase:    PhasePostBind,
		Policy:   ErrorPolicyIgnored,
		Priority: 10,
		Run:      func(context.Context) error { return errors.New("ignored failure") },
	})

	runner := MustNewRunner(registry)
	if err := runner.RunPostBind(context.Background()); err != nil {
		t.Fatalf("RunPostBind() error = %v", err)
	}
	snapshot := runner.Snapshot()
	if got := findTask(t, snapshot, "degraded").State; got != StateDegraded {
		t.Fatalf("degraded state = %s, want %s", got, StateDegraded)
	}
	retryable := findTask(t, snapshot, "retryable")
	if retryable.State != StateDegraded || retryable.Attempts != 3 || attempts != 3 {
		t.Fatalf("retryable snapshot = %+v attempts=%d", retryable, attempts)
	}
	if got := findTask(t, snapshot, "ignored").State; got != StateIgnored {
		t.Fatalf("ignored state = %s, want %s", got, StateIgnored)
	}
}

func TestTaskPanicsFollowConfiguredErrorPolicies(t *testing.T) {
	t.Run("fatal returns a typed panic error", func(t *testing.T) {
		panicCause := errors.New("fatal panic")
		registry := NewRegistry()
		mustRegister(t, registry, Task{
			Name:  "fatal-panic",
			Phase: PhasePreBind,
			Run: func(context.Context) error {
				panic(panicCause)
			},
		})

		runner := MustNewRunner(registry)
		err := runner.RunPreBind(context.Background())
		if err == nil {
			t.Fatal("RunPreBind() error = nil, want recovered panic")
		}
		if !errors.Is(err, panicCause) {
			t.Fatalf("RunPreBind() error = %v, want wrapped panic cause", err)
		}
		var panicErr *PanicError
		if !errors.As(err, &panicErr) {
			t.Fatalf("RunPreBind() error type = %T, want *PanicError", err)
		}
		if panicErr.TaskName() != "fatal-panic" || panicErr.Recovered() != panicCause {
			t.Fatalf("panic error = %#v, want task and recovered cause", panicErr)
		}
		if stack := string(panicErr.StackTrace()); !strings.Contains(stack, "TestTaskPanicsFollowConfiguredErrorPolicies") {
			t.Fatalf("panic stack does not identify test task: %q", stack)
		}
		fatal := findTask(t, runner.Snapshot(), "fatal-panic")
		if fatal.State != StateFailed || fatal.Attempts != 1 || !strings.Contains(fatal.Error, "fatal panic") {
			t.Fatalf("fatal panic snapshot = %+v", fatal)
		}
	})

	t.Run("non-fatal policies record and continue", func(t *testing.T) {
		registry := NewRegistry()
		mustRegister(t, registry, Task{
			Name:   "degraded-panic",
			Phase:  PhasePostBind,
			Policy: ErrorPolicyDegraded,
			Run:    func(context.Context) error { panic("degraded panic") },
		})
		mustRegister(t, registry, Task{
			Name:   "ignored-panic",
			Phase:  PhasePostBind,
			Policy: ErrorPolicyIgnored,
			Run:    func(context.Context) error { panic("ignored panic") },
		})

		runner := MustNewRunner(registry)
		if err := runner.RunPostBind(context.Background()); err != nil {
			t.Fatalf("RunPostBind() error = %v", err)
		}
		failures := runner.Failures()
		if len(failures) != 2 {
			t.Fatalf("Failures() count = %d, want 2", len(failures))
		}
		for _, failure := range failures {
			var panicErr *PanicError
			if !errors.As(failure, &panicErr) || len(panicErr.StackTrace()) == 0 {
				t.Fatalf("failure = %#v, want accessible PanicError stack", failure)
			}
		}
		snapshot := runner.Snapshot()
		degraded := findTask(t, snapshot, "degraded-panic")
		if degraded.State != StateDegraded || !strings.Contains(degraded.Error, "degraded panic") {
			t.Fatalf("degraded panic snapshot = %+v", degraded)
		}
		ignored := findTask(t, snapshot, "ignored-panic")
		if ignored.State != StateIgnored || !strings.Contains(ignored.Error, "ignored panic") {
			t.Fatalf("ignored panic snapshot = %+v", ignored)
		}
	})

	t.Run("retryable retries a panic", func(t *testing.T) {
		registry := NewRegistry()
		var attempts atomic.Int32
		mustRegister(t, registry, Task{
			Name:        "retryable-panic",
			Phase:       PhasePostBind,
			Policy:      ErrorPolicyRetryable,
			MaxAttempts: 2,
			Run: func(context.Context) error {
				if attempts.Add(1) == 1 {
					panic("retry me")
				}
				return nil
			},
		})

		runner := MustNewRunner(registry)
		if err := runner.RunPostBind(context.Background()); err != nil {
			t.Fatalf("RunPostBind() error = %v", err)
		}
		task := findTask(t, runner.Snapshot(), "retryable-panic")
		if task.State != StateSucceeded || task.Attempts != 2 || attempts.Load() != 2 {
			t.Fatalf("retryable panic snapshot = %+v attempts=%d", task, attempts.Load())
		}
		failures := runner.Failures()
		if len(failures) != 1 || failures[0].Terminal || failures[0].Attempt != 1 {
			t.Fatalf("retryable panic failures = %#v, want retained nonterminal first attempt", failures)
		}
	})
}

func TestBackgroundTaskPanicIsContained(t *testing.T) {
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:   "background-panic",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyDegraded,
		Run:    func(context.Context) error { panic("background panic") },
	})

	runner := MustNewRunner(registry)
	if err := runner.StartBackground(context.Background()); err != nil {
		t.Fatalf("StartBackground() error = %v", err)
	}
	failure := <-runner.BackgroundFailures()
	if failure.Policy != ErrorPolicyDegraded || !failure.Terminal {
		t.Fatalf("background failure = %#v, want terminal degraded event", failure)
	}
	var panicErr *PanicError
	if !errors.As(failure, &panicErr) || len(panicErr.StackTrace()) == 0 {
		t.Fatalf("background failure = %#v, want accessible PanicError stack", failure)
	}
	if err := runner.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	task := findTask(t, runner.Snapshot(), "background-panic")
	if task.State != StateDegraded || task.Attempts != 1 || !strings.Contains(task.Error, "background panic") {
		t.Fatalf("background panic snapshot = %+v", task)
	}
}

func TestFatalBackgroundFailureIsPublishedAndReturnedByShutdown(t *testing.T) {
	panicCause := errors.New("fatal background panic")
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:   "fatal-background",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyFatal,
		Run:    func(context.Context) error { panic(panicCause) },
	})

	runner := MustNewRunner(registry)
	if err := runner.StartBackground(context.Background()); err != nil {
		t.Fatalf("StartBackground() error = %v", err)
	}
	select {
	case failure := <-runner.BackgroundFailures():
		if failure.TaskName != "fatal-background" || failure.Policy != ErrorPolicyFatal || !failure.Terminal {
			t.Fatalf("background failure = %#v", failure)
		}
		if !errors.Is(failure, panicCause) {
			t.Fatalf("background failure = %v, want panic cause", failure)
		}
		var panicErr *PanicError
		if !errors.As(failure, &panicErr) || len(panicErr.StackTrace()) == 0 {
			t.Fatalf("background failure = %#v, want PanicError stack", failure)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for fatal background failure")
	}

	shutdownErr := runner.Shutdown(context.Background())
	if !errors.Is(shutdownErr, panicCause) {
		t.Fatalf("Shutdown() error = %v, want fatal background cause", shutdownErr)
	}
}

func TestBackgroundContextCanceledWithoutParentCancellationFollowsFatalPolicy(t *testing.T) {
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:   "independent-cancellation",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyFatal,
		Run:    func(context.Context) error { return context.Canceled },
	})

	runner := MustNewRunner(registry)
	if err := runner.StartBackground(context.Background()); err != nil {
		t.Fatalf("StartBackground() error = %v", err)
	}
	failure, ok := <-runner.BackgroundFailures()
	if !ok || failure == nil {
		t.Fatal("BackgroundFailures() closed without publishing the fatal cancellation")
	}
	if !errors.Is(failure, context.Canceled) || failure.State != StateFailed {
		t.Fatalf("failure = %#v, want failed context cancellation", failure)
	}
	if failures := runner.Failures(); len(failures) != 1 || !errors.Is(failures[0], context.Canceled) {
		t.Fatalf("Failures() = %#v, want retained context cancellation", failures)
	}
	if err := runner.Shutdown(context.Background()); !errors.Is(err, context.Canceled) {
		t.Fatalf("Shutdown() error = %v, want retained context cancellation", err)
	}
}

func TestShutdownTimeoutPreservesFatalFailureAndDefersTeardown(t *testing.T) {
	fatalCause := errors.New("fatal background failure")
	release := make(chan struct{})
	started := make(chan struct{})
	var shutdownRuns atomic.Int32
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:   "fatal-worker",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyFatal,
		Run:    func(context.Context) error { return fatalCause },
	})
	mustRegister(t, registry, Task{
		Name:   "stuck-worker",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyDegraded,
		Run: func(context.Context) error {
			close(started)
			<-release
			return nil
		},
	})
	mustRegister(t, registry, Task{
		Name:  "shutdown-hook",
		Phase: PhaseShutdown,
		Run: func(context.Context) error {
			shutdownRuns.Add(1)
			return nil
		},
	})

	runner := MustNewRunner(registry)
	if err := runner.StartBackground(context.Background()); err != nil {
		t.Fatalf("StartBackground() error = %v", err)
	}
	<-started
	failure := <-runner.BackgroundFailures()
	if !errors.Is(failure, fatalCause) {
		t.Fatalf("background failure = %v, want fatal cause", failure)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	err := runner.Shutdown(ctx)
	cancel()
	var incomplete *ShutdownIncompleteError
	if !errors.As(err, &incomplete) || !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("Shutdown() error = %v, want incomplete deadline error", err)
	}
	if !errors.Is(err, fatalCause) {
		t.Fatalf("Shutdown() error = %v, want retained fatal cause", err)
	}
	if got := shutdownRuns.Load(); got != 0 {
		t.Fatalf("shutdown hook runs = %d, want 0 while worker is running", got)
	}

	close(release)
	if err := runner.Shutdown(context.Background()); !errors.Is(err, fatalCause) {
		t.Fatalf("retry Shutdown() error = %v, want retained fatal cause", err)
	}
	if got := shutdownRuns.Load(); got != 1 {
		t.Fatalf("shutdown hook runs = %d, want 1 after worker exit", got)
	}
	if err := runner.Shutdown(context.Background()); !errors.Is(err, fatalCause) {
		t.Fatalf("repeated Shutdown() error = %v, want retained fatal cause", err)
	}
	if got := shutdownRuns.Load(); got != 1 {
		t.Fatalf("shutdown hook runs = %d, want idempotent execution", got)
	}
}

func TestShutdownBeforeBackgroundStartClosesSupervisionAndIsIdempotent(t *testing.T) {
	var shutdownRuns atomic.Int32
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:   "future-worker",
		Phase:  PhaseBackground,
		Policy: ErrorPolicyFatal,
		Run:    func(context.Context) error { return nil },
	})
	mustRegister(t, registry, Task{
		Name:  "shutdown-hook",
		Phase: PhaseShutdown,
		Run: func(context.Context) error {
			shutdownRuns.Add(1)
			return nil
		},
	})

	runner := MustNewRunner(registry)
	if err := runner.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	if _, ok := <-runner.BackgroundFailures(); ok {
		t.Fatal("BackgroundFailures() remained open after shutdown-before-start")
	}
	if err := runner.StartBackground(context.Background()); err == nil {
		t.Fatal("StartBackground() succeeded after shutdown")
	}
	if err := runner.Shutdown(context.Background()); err != nil {
		t.Fatalf("repeated Shutdown() error = %v", err)
	}
	if got := shutdownRuns.Load(); got != 1 {
		t.Fatalf("shutdown hook runs = %d, want 1", got)
	}
}

func TestPanicErrorDiagnosticIsBoundedAndRawValueIsPreserved(t *testing.T) {
	panicValue := strings.Repeat("界", maxPanicDiagnosticBytes)
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name: "bounded-panic",
		Run:  func(context.Context) error { panic(panicValue) },
	})

	err := MustNewRunner(registry).RunPreBind(context.Background())
	var panicErr *PanicError
	if !errors.As(err, &panicErr) {
		t.Fatalf("RunPreBind() error = %v, want PanicError", err)
	}
	if got := len(panicErr.Error()); got > maxPanicDiagnosticBytes {
		t.Fatalf("PanicError.Error() bytes = %d, want <= %d", got, maxPanicDiagnosticBytes)
	}
	if panicErr.Recovered() != panicValue {
		t.Fatal("PanicError.Recovered() did not retain complete panic value")
	}
	if !strings.HasSuffix(panicErr.Error(), "…") {
		t.Fatalf("PanicError.Error() = %q, want truncation marker", panicErr.Error())
	}
}

func TestTaskFailureHistoryIsBounded(t *testing.T) {
	registry := NewRegistry()
	mustRegister(t, registry, Task{
		Name:        "many-attempts",
		Phase:       PhasePostBind,
		Policy:      ErrorPolicyRetryable,
		MaxAttempts: maxTaskFailureHistory + 2,
		Run:         func(context.Context) error { return fmt.Errorf("still failing") },
	})

	runner := MustNewRunner(registry)
	if err := runner.RunPostBind(context.Background()); err != nil {
		t.Fatalf("RunPostBind() error = %v", err)
	}
	failures := runner.Failures()
	if len(failures) != maxTaskFailureHistory {
		t.Fatalf("Failures() count = %d, want %d", len(failures), maxTaskFailureHistory)
	}
	if failures[0].Attempt != 3 || failures[len(failures)-1].Attempt != maxTaskFailureHistory+2 || !failures[len(failures)-1].Terminal {
		t.Fatalf("bounded failures = first %#v last %#v", failures[0], failures[len(failures)-1])
	}
	failures[0].TaskName = "mutated"
	if got := runner.Failures()[0].TaskName; got != "many-attempts" {
		t.Fatalf("mutating Failures() changed runner history to %q", got)
	}
}

func TestRunReadyMarksRunnerReadyAndMarkServingIsExplicit(t *testing.T) {
	registry := NewRegistry()
	mustRegister(t, registry, Task{Name: "ready", Phase: PhaseReady, Run: func(context.Context) error { return nil }})
	runner := MustNewRunner(registry)
	if snapshot := runner.Snapshot(); snapshot.Serving || snapshot.Ready {
		t.Fatalf("initial snapshot = %+v, want not serving and not ready", snapshot)
	}
	runner.MarkServing()
	if err := runner.RunReady(context.Background()); err != nil {
		t.Fatalf("RunReady() error = %v", err)
	}
	snapshot := runner.Snapshot()
	if !snapshot.Serving || !snapshot.Ready {
		t.Fatalf("snapshot = %+v, want serving and ready", snapshot)
	}
}

func TestBackgroundTasksCancelBeforeShutdownTasks(t *testing.T) {
	registry := NewRegistry()
	events := make(chan string, 4)
	mustRegister(t, registry, Task{
		Name:  "worker",
		Phase: PhaseBackground,
		Run: func(ctx context.Context) error {
			events <- "worker-start"
			<-ctx.Done()
			events <- "worker-stop"
			return ctx.Err()
		},
	})
	mustRegister(t, registry, Task{
		Name:  "shutdown",
		Phase: PhaseShutdown,
		Run: func(context.Context) error {
			events <- "shutdown"
			return nil
		},
	})
	runner := MustNewRunner(registry)
	if err := runner.StartBackground(context.Background()); err != nil {
		t.Fatalf("StartBackground() error = %v", err)
	}
	expectEvent(t, events, "worker-start")
	if err := runner.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	expectEvent(t, events, "worker-stop")
	expectEvent(t, events, "shutdown")
	if got := findTask(t, runner.Snapshot(), "worker").State; got != StateCancelled {
		t.Fatalf("worker state = %s, want %s", got, StateCancelled)
	}
}

func TestRegisterModuleAdaptsStartStopAndSkipsLifecycleAwareStartStop(t *testing.T) {
	compat := &testModule{name: "compat", priority: 10}
	aware := &awareModule{testModule: testModule{name: "aware", priority: 20}}
	registry := NewRegistry()
	if err := RegisterModule(registry, compat); err != nil {
		t.Fatalf("RegisterModule(compat) error = %v", err)
	}
	if err := RegisterModule(registry, aware); err != nil {
		t.Fatalf("RegisterModule(aware) error = %v", err)
	}
	runner := MustNewRunner(registry)
	if err := runner.RunPreBind(context.Background()); err != nil {
		t.Fatalf("RunPreBind() error = %v", err)
	}
	if err := runner.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	if compat.starts.Load() != 1 || compat.stops.Load() != 1 {
		t.Fatalf("compat starts=%d stops=%d, want 1/1", compat.starts.Load(), compat.stops.Load())
	}
	if aware.starts.Load() != 0 || aware.stops.Load() != 0 || aware.registered.Load() != 1 || aware.hookRuns.Load() != 1 {
		t.Fatalf("aware starts=%d stops=%d registered=%d hookRuns=%d, want 0/0/1/1", aware.starts.Load(), aware.stops.Load(), aware.registered.Load(), aware.hookRuns.Load())
	}
}

func TestPackageImportsStayExtractable(t *testing.T) {
	fset := token.NewFileSet()
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") {
			continue
		}
		path := filepath.Join(".", entry.Name())
		file, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("ParseFile(%s): %v", path, err)
		}
		for _, imp := range file.Imports {
			importPath := strings.Trim(imp.Path.Value, `"`)
			if strings.HasPrefix(importPath, "github.com/goliatone/go-admin") {
				t.Fatalf("%s imports %s; lifecycle package must remain extractable", path, importPath)
			}
			if first := strings.Split(importPath, "/")[0]; strings.Contains(first, ".") {
				t.Fatalf("%s imports %s; lifecycle package must remain stdlib-only", path, importPath)
			}
		}
		if ast.IsGenerated(file) {
			t.Fatalf("%s should not be generated; lifecycle package is hand-maintained API code", path)
		}
	}
}

func record(calls *[]string, value string) TaskFunc {
	return func(context.Context) error {
		*calls = append(*calls, value)
		return nil
	}
}

func mustRegister(t *testing.T, registry *Registry, task Task) {
	t.Helper()
	if err := registry.Register(task); err != nil {
		t.Fatalf("Register(%s) error = %v", task.Name, err)
	}
}

func findTask(t *testing.T, snapshot Snapshot, name string) TaskSnapshot {
	t.Helper()
	for _, task := range snapshot.Tasks {
		if task.Name == name {
			return task
		}
	}
	t.Fatalf("task %q not found in snapshot %+v", name, snapshot)
	return TaskSnapshot{}
}

func expectEvent(t *testing.T, events <-chan string, want string) {
	t.Helper()
	select {
	case got := <-events:
		if got != want {
			t.Fatalf("event = %q, want %q", got, want)
		}
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for event %q", want)
	}
}

type testModule struct {
	name     string
	priority int
	starts   atomic.Int32
	stops    atomic.Int32
}

func (m *testModule) Name() string { return m.name }

func (m *testModule) Priority() int { return m.priority }

func (m *testModule) Start(context.Context) error {
	m.starts.Add(1)
	return nil
}

func (m *testModule) Stop(context.Context) error {
	m.stops.Add(1)
	return nil
}

type awareModule struct {
	testModule
	registered atomic.Int32
	hookRuns   atomic.Int32
}

func (m *awareModule) RegisterLifecycle(registry *Registry) {
	m.registered.Add(1)
	registry.MustRegister(Task{
		Name:     "aware.pre_bind",
		Phase:    PhasePreBind,
		Priority: m.Priority(),
		Run: func(context.Context) error {
			m.hookRuns.Add(1)
			return nil
		},
	})
}
