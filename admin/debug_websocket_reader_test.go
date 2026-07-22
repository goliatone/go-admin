package admin

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

var errDebugWebSocketTestWrite = errors.New("forced websocket write failure")

type blockingDebugWebSocketContext struct {
	*stubWebSocketContext

	ctx context.Context

	readStarted  chan struct{}
	readReleased chan struct{}
	readReturned chan struct{}
	startOnce    sync.Once
	releaseOnce  sync.Once
	returnOnce   sync.Once

	readActive           atomic.Bool
	writeCount           atomic.Int32
	deadlineCalls        atomic.Int32
	deadlineReleaseAfter atomic.Int32
	closeCalls           atomic.Int32
	closeBeforeRead      atomic.Bool
	liveWriteFailure     error
}

func newBlockingDebugWebSocketContext(ctx context.Context, liveWriteFailure error) *blockingDebugWebSocketContext {
	if ctx == nil {
		ctx = context.Background()
	}
	ws := &blockingDebugWebSocketContext{
		stubWebSocketContext: newStubWebSocketContext(),
		ctx:                  ctx,
		readStarted:          make(chan struct{}),
		readReleased:         make(chan struct{}),
		readReturned:         make(chan struct{}),
		liveWriteFailure:     liveWriteFailure,
	}
	ws.deadlineReleaseAfter.Store(1)
	return ws
}

func (c *blockingDebugWebSocketContext) Context() context.Context {
	return c.ctx
}

func (c *blockingDebugWebSocketContext) ReadJSON(_ any) error {
	c.readActive.Store(true)
	c.startOnce.Do(func() { close(c.readStarted) })
	<-c.readReleased
	c.readActive.Store(false)
	c.returnOnce.Do(func() { close(c.readReturned) })
	return context.DeadlineExceeded
}

func (c *blockingDebugWebSocketContext) WriteJSON(v any) error {
	if c.writeCount.Add(1) > 1 && c.liveWriteFailure != nil {
		return c.liveWriteFailure
	}
	return c.stubWebSocketContext.WriteJSON(v)
}

func (c *blockingDebugWebSocketContext) SetReadDeadline(_ time.Time) error {
	calls := c.deadlineCalls.Add(1)
	if calls < c.deadlineReleaseAfter.Load() {
		return nil
	}
	c.releaseOnce.Do(func() { close(c.readReleased) })
	return nil
}

func TestDebugWebSocketReaderStopRetriesReadInterruption(t *testing.T) {
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)
	ws.deadlineReleaseAfter.Store(2)
	reader := startDebugWebSocketJSONReader[debugCommand](ws, 0, false)
	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")

	stopped := make(chan struct{})
	go func() {
		reader.Stop(ws)
		close(stopped)
	}()
	waitForDebugWebSocketSignal(t, stopped, "retried read interruption")

	if got := ws.deadlineCalls.Load(); got < 2 {
		t.Fatalf("read deadline calls = %d, want at least 2", got)
	}
}

func (c *blockingDebugWebSocketContext) Close() error {
	c.closeCalls.Add(1)
	if c.readActive.Load() {
		c.closeBeforeRead.Store(true)
	}
	return nil
}

func TestDebugWebSocketWriteFailureQuiescesReaderBeforeClose(t *testing.T) {
	mod := NewDebugModule(DebugConfig{})
	mod.collector = NewDebugCollector(DebugConfig{})
	ws := newBlockingDebugWebSocketContext(context.Background(), errDebugWebSocketTestWrite)

	result := make(chan error, 1)
	go func() {
		result <- mod.handleDebugWebSocket(ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")
	mod.collector.publish(debugEventSnapshotInvalidated, nil)

	select {
	case err := <-result:
		if !errors.Is(err, errDebugWebSocketTestWrite) {
			t.Fatalf("handler error = %v, want forced write failure", err)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not finish after write failure")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

func TestDebugWebSocketContextCancellationQuiescesReaderBeforeClose(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	mod := NewDebugModule(DebugConfig{})
	mod.collector = NewDebugCollector(DebugConfig{})
	ws := newBlockingDebugWebSocketContext(ctx, nil)

	result := make(chan error, 1)
	go func() {
		result <- mod.handleDebugWebSocket(ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")
	cancel()

	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("handler error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not finish after context cancellation")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

func TestDebugWebSocketSubscriberClosureQuiescesReaderBeforeClose(t *testing.T) {
	mod := NewDebugModule(DebugConfig{})
	mod.collector = NewDebugCollector(DebugConfig{})
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)

	result := make(chan error, 1)
	go func() {
		result <- mod.handleDebugWebSocket(ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")
	mod.collector.mu.RLock()
	var subscriber *debugEventSubscriber
	for _, candidate := range mod.collector.subscribers {
		subscriber = candidate
		break
	}
	mod.collector.mu.RUnlock()
	if subscriber == nil {
		t.Fatal("debug subscriber was not registered")
	}
	subscriber.Close()

	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("handler error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not finish after subscriber closure")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

func TestDebugREPLAppTimeoutQuiescesReaderBeforeClose(t *testing.T) {
	repl := DebugREPLConfig{
		Enabled:           true,
		AppEnabled:        true,
		ReadOnly:          new(true),
		MaxSessionSeconds: 1,
	}
	debugCfg := DebugConfig{Enabled: true, Repl: repl}
	adm := mustNewAdmin(t, Config{DefaultLocale: "en", Debug: debugCfg}, Dependencies{})
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)

	result := make(chan error, 1)
	go func() {
		result <- handleDebugREPLAppWebSocket(adm, debugCfg, ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "app REPL reader start")
	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("app REPL handler error = %v, want nil", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("app REPL handler did not finish after session timeout")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

func TestDebugREPLShellTimeoutQuiescesReaderBeforeClose(t *testing.T) {
	repl := DebugREPLConfig{
		Enabled:           true,
		ShellEnabled:      true,
		ReadOnly:          new(true),
		MaxSessionSeconds: 1,
	}
	debugCfg := DebugConfig{Enabled: true, Repl: repl}
	adm := mustNewAdmin(t, Config{DefaultLocale: "en", Debug: debugCfg}, Dependencies{})
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)

	result := make(chan error, 1)
	go func() {
		result <- handleDebugREPLShellWebSocket(adm, debugCfg, ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "shell REPL reader start")
	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("shell REPL handler error = %v, want nil", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("shell REPL handler did not finish after session timeout")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

func TestDebugSessionWebSocketWriteFailureQuiescesReaderBeforeClose(t *testing.T) {
	mod := NewDebugModule(DebugConfig{})
	mod.collector = NewDebugCollector(DebugConfig{})
	ws := newBlockingDebugWebSocketContext(context.Background(), errDebugWebSocketTestWrite)
	ws.ParamsM["sessionId"] = "session-a"

	result := make(chan error, 1)
	go func() {
		result <- mod.handleDebugSessionWebSocket(nil, ws)
	}()

	waitForDebugWebSocketSignal(t, ws.readStarted, "session reader start")
	mod.collector.publish(debugEventSnapshotInvalidated, nil)

	select {
	case err := <-result:
		if !errors.Is(err, errDebugWebSocketTestWrite) {
			t.Fatalf("handler error = %v, want forced write failure", err)
		}
	case <-time.After(time.Second):
		t.Fatal("session handler did not finish after write failure")
	}

	assertDebugWebSocketReaderQuiesced(t, ws)
}

type blockedDeliveryWebSocketContext struct {
	*stubWebSocketContext
	readCompleted chan struct{}
	readOnce      sync.Once
	deadlineCalls atomic.Int32
}

func (c *blockedDeliveryWebSocketContext) ReadJSON(v any) error {
	command, ok := v.(*debugREPLAppCommand)
	if !ok {
		return errors.New("unexpected command type")
	}
	*command = debugREPLAppCommand{Type: debugREPLAppCommandClose}
	c.readOnce.Do(func() { close(c.readCompleted) })
	return nil
}

func (c *blockedDeliveryWebSocketContext) SetReadDeadline(_ time.Time) error {
	c.deadlineCalls.Add(1)
	return nil
}

func TestDebugWebSocketReaderStopReleasesBlockedMessageDelivery(t *testing.T) {
	ws := &blockedDeliveryWebSocketContext{
		stubWebSocketContext: newStubWebSocketContext(),
		readCompleted:        make(chan struct{}),
	}
	reader := startDebugWebSocketJSONReader[debugREPLAppCommand](ws, 0, false)
	waitForDebugWebSocketSignal(t, ws.readCompleted, "first decoded command")

	stopped := make(chan struct{})
	go func() {
		reader.Stop(ws)
		close(stopped)
	}()
	waitForDebugWebSocketSignal(t, stopped, "blocked delivery stop")

	select {
	case <-reader.done:
	default:
		t.Fatal("reader remained active after Stop")
	}
}

func waitForDebugWebSocketSignal(t *testing.T, signal <-chan struct{}, description string) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for %s", description)
	}
}

func assertDebugWebSocketReaderQuiesced(t *testing.T, ws *blockingDebugWebSocketContext) {
	t.Helper()
	waitForDebugWebSocketSignal(t, ws.readReturned, "reader completion")
	if ws.deadlineCalls.Load() == 0 {
		t.Fatal("blocked reader was not interrupted with a read deadline")
	}
	if got := ws.closeCalls.Load(); got != 1 {
		t.Fatalf("websocket close calls = %d, want 1", got)
	}
	if ws.closeBeforeRead.Load() {
		t.Fatal("websocket closed before the reader returned")
	}
}
