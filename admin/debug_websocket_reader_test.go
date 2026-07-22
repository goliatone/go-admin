package admin

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
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

	readActive       atomic.Bool
	writeCount       atomic.Int32
	interruptCalls   atomic.Int32
	closeCalls       atomic.Int32
	closeBeforeRead  atomic.Bool
	liveWriteFailure error
	interruptErr     error
	onInterrupt      func()
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

func (c *blockingDebugWebSocketContext) InterruptRead() error {
	c.interruptCalls.Add(1)
	if c.onInterrupt != nil {
		c.onInterrupt()
	}
	c.releaseOnce.Do(func() { close(c.readReleased) })
	return c.interruptErr
}

func TestDebugWebSocketReaderStopInterruptsReadOnceAndReturnsPermanentError(t *testing.T) {
	ws := newBlockingDebugWebSocketContext(context.Background(), nil)
	interruptErr := errors.New("forced terminal interrupt error")
	ws.interruptErr = interruptErr
	reader, err := startDebugWebSocketJSONReader[debugCommand](ws, 0, false)
	if err != nil {
		t.Fatalf("start reader: %v", err)
	}
	waitForDebugWebSocketSignal(t, ws.readStarted, "reader start")

	stopped := make(chan error, 1)
	go func() {
		stopped <- reader.Stop()
	}()
	select {
	case err := <-stopped:
		if !errors.Is(err, interruptErr) {
			t.Fatalf("Stop error = %v, want permanent interrupt error", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Stop did not return after permanent interrupt error")
	}

	if got := ws.interruptCalls.Load(); got != 1 {
		t.Fatalf("InterruptRead calls = %d, want 1", got)
	}
	if err := reader.Stop(); !errors.Is(err, interruptErr) {
		t.Fatalf("second Stop error = %v, want permanent interrupt error", err)
	}
	if got := ws.interruptCalls.Load(); got != 1 {
		t.Fatalf("InterruptRead calls after repeated Stop = %d, want 1", got)
	}
}

func TestDebugWebSocketReaderRequiresSafeInterruptionCapability(t *testing.T) {
	unsupported := struct{ router.WebSocketContext }{WebSocketContext: newStubWebSocketContext()}
	reader, err := startDebugWebSocketJSONReader[debugCommand](unsupported, 0, false)
	if reader != nil {
		t.Fatal("reader was created without a WebSocketReadInterrupter")
	}
	if !errors.Is(err, errDebugWebSocketReadInterruptionUnsupported) {
		t.Fatalf("start error = %v, want unsupported interruption error", err)
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
	var subscribersAtInterrupt atomic.Int32
	ws.onInterrupt = func() {
		mod.collector.mu.RLock()
		defer mod.collector.mu.RUnlock()
		subscribersAtInterrupt.Store(int32(len(mod.collector.subscribers)))
	}

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
	if got := subscribersAtInterrupt.Load(); got != 0 {
		t.Fatalf("subscribers at read interruption = %d, want 0", got)
	}
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
	readCompleted  chan struct{}
	readOnce       sync.Once
	interruptCalls atomic.Int32
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

func (c *blockedDeliveryWebSocketContext) InterruptRead() error {
	c.interruptCalls.Add(1)
	return nil
}

func TestDebugWebSocketReaderStopReleasesBlockedMessageDelivery(t *testing.T) {
	ws := &blockedDeliveryWebSocketContext{
		stubWebSocketContext: newStubWebSocketContext(),
		readCompleted:        make(chan struct{}),
	}
	reader, err := startDebugWebSocketJSONReader[debugREPLAppCommand](ws, 0, false)
	if err != nil {
		t.Fatalf("start reader: %v", err)
	}
	waitForDebugWebSocketSignal(t, ws.readCompleted, "first decoded command")

	stopped := make(chan error, 1)
	go func() {
		stopped <- reader.Stop()
	}()
	select {
	case err := <-stopped:
		if err != nil {
			t.Fatalf("Stop error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for blocked delivery stop")
	}

	select {
	case <-reader.done:
	default:
		t.Fatal("reader remained active after Stop")
	}
}

func TestDebugREPLAppLoopPreservesTerminalReadErrorWhenMessagesClose(t *testing.T) {
	readErr := errors.New("forced app websocket read error")
	for range 100 {
		commands := make(chan debugREPLAppCommand)
		close(commands)
		readErrors := make(chan error, 1)
		readErrors <- readErr
		closeReason := debugREPLAppCloseReasonUser

		err := runDebugREPLAppLoop(nil, AdminContext{}, DebugREPLConfig{}, DebugREPLSession{}, nil, newStubWebSocketContext(), commands, readErrors, nil, &closeReason)
		if !errors.Is(err, readErr) {
			t.Fatalf("loop error = %v, want terminal read error", err)
		}
		if closeReason != debugREPLAppCloseReasonError {
			t.Fatalf("close reason = %q, want %q", closeReason, debugREPLAppCloseReasonError)
		}
	}
}

func TestDebugREPLShellLoopPreservesTerminalReadErrorWhenMessagesClose(t *testing.T) {
	readErr := errors.New("forced shell websocket read error")
	for range 100 {
		commands := make(chan debugREPLShellCommand)
		close(commands)
		readErrors := make(chan error, 1)
		readErrors <- readErr
		closeReason := debugREPLShellCloseReasonUser

		err := runDebugREPLShellLoop(nil, context.Background(), DebugREPLConfig{}, DebugREPLSession{}, nil, newStubWebSocketContext(), commands, readErrors, nil, nil, nil, nil, &closeReason)
		if !errors.Is(err, readErr) {
			t.Fatalf("loop error = %v, want terminal read error", err)
		}
		if closeReason != debugREPLShellCloseReasonError {
			t.Fatalf("close reason = %q, want %q", closeReason, debugREPLShellCloseReasonError)
		}
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
	if ws.interruptCalls.Load() == 0 {
		t.Fatal("blocked reader was not interrupted")
	}
	if got := ws.closeCalls.Load(); got != 1 {
		t.Fatalf("websocket close calls = %d, want 1", got)
	}
	if ws.closeBeforeRead.Load() {
		t.Fatal("websocket closed before the reader returned")
	}
}
