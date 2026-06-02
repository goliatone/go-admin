package admin

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

type stubResponseWriter struct {
	header   http.Header
	status   int
	body     bytes.Buffer
	flushed  bool
	hijacked bool
	pushed   bool
}

func (s *stubResponseWriter) Header() http.Header {
	if s.header == nil {
		s.header = make(http.Header)
	}
	return s.header
}

func (s *stubResponseWriter) WriteHeader(code int) {
	s.status = code
}

func (s *stubResponseWriter) Write(p []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	return s.body.Write(p)
}

func (s *stubResponseWriter) Flush() {
	s.flushed = true
}

func (s *stubResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	s.hijacked = true
	conn, peer := net.Pipe()
	_ = peer.Close() //nolint:errcheck // test cleanup failure cannot change the already-asserted behavior.
	rw := bufio.NewReadWriter(bufio.NewReader(bytes.NewBuffer(nil)), bufio.NewWriter(io.Discard))
	return conn, rw, nil
}

func (s *stubResponseWriter) Push(_ string, _ *http.PushOptions) error {
	s.pushed = true
	return nil
}

func TestDebugResponseWriterCapture(t *testing.T) {
	stub := &stubResponseWriter{}
	writer := newDebugResponseWriter(stub, 5)

	n, err := writer.Write([]byte("hello world"))
	if err != nil {
		t.Fatalf("expected write to succeed: %v", err)
	}
	if n != len("hello world") {
		t.Fatalf("expected write length %d, got %d", len("hello world"), n)
	}
	if got := writer.Body(); got != "hello" {
		t.Fatalf("expected truncated body, got %q", got)
	}
	if !writer.truncated {
		t.Fatalf("expected truncated flag to be true")
	}
	if got := writer.BodySize(); got != int64(len("hello world")) {
		t.Fatalf("expected body size %d, got %d", len("hello world"), got)
	}
}

func TestDebugResponseWriterStatus(t *testing.T) {
	stub := &stubResponseWriter{}
	writer := newDebugResponseWriter(stub, 10)

	if got := writer.StatusCode(); got != http.StatusOK {
		t.Fatalf("expected default status 200, got %d", got)
	}
	if got := writer.StatusCodeRaw(); got != 0 {
		t.Fatalf("expected raw status 0, got %d", got)
	}

	writer.WriteHeader(http.StatusCreated)
	if got := writer.StatusCode(); got != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", got)
	}
	if got := writer.StatusCodeRaw(); got != http.StatusCreated {
		t.Fatalf("expected raw status 201, got %d", got)
	}
}

func TestDebugResponseWriterDelegatesInterfaces(t *testing.T) {
	stub := &stubResponseWriter{}
	writer := newDebugResponseWriter(stub, 10)

	writer.Flush()
	if !stub.flushed {
		t.Fatalf("expected flush to delegate")
	}

	if _, _, err := writer.Hijack(); err != nil {
		t.Fatalf("expected hijack to succeed: %v", err)
	}
	if !stub.hijacked {
		t.Fatalf("expected hijack to delegate")
	}

	if err := writer.Push("/test", nil); err != nil {
		t.Fatalf("expected push to succeed: %v", err)
	}
	if !stub.pushed {
		t.Fatalf("expected push to delegate")
	}
}

func TestDebugResponseWriterMissingInterfaces(t *testing.T) {
	rec := httptest.NewRecorder()
	writer := newDebugResponseWriter(rec, 10)

	if _, _, err := writer.Hijack(); !errors.Is(err, http.ErrNotSupported) {
		t.Fatalf("expected hijack not supported, got %v", err)
	}
	if err := writer.Push("/test", nil); !errors.Is(err, http.ErrNotSupported) {
		t.Fatalf("expected push not supported, got %v", err)
	}
}

type debugSetterContext struct {
	*router.MockContext
	writer http.ResponseWriter
	calls  int
}

func newDebugSetterContext(writer http.ResponseWriter) *debugSetterContext {
	return &debugSetterContext{
		MockContext: router.NewMockContext(),
		writer:      writer,
	}
}

func (c *debugSetterContext) Response() http.ResponseWriter {
	return c.writer
}

func (c *debugSetterContext) SetResponseWriter(writer http.ResponseWriter) {
	c.calls++
	c.writer = writer
}

type debugNoSetterContext struct {
	*router.MockContext
	writer http.ResponseWriter
}

func (c *debugNoSetterContext) Response() http.ResponseWriter {
	return c.writer
}

type debugLegacyWriterContext struct {
	*router.MockContext
	w http.ResponseWriter
}

func (c *debugLegacyWriterContext) Response() http.ResponseWriter {
	return c.w
}

func TestDebugSwapResponseWriterUsesSetterAndRestores(t *testing.T) {
	original := httptest.NewRecorder()
	wrapped := httptest.NewRecorder()
	ctx := newDebugSetterContext(original)

	restore := debugSwapResponseWriter(ctx, original, wrapped)
	if restore == nil {
		t.Fatalf("expected restore callback")
	}
	if ctx.writer != wrapped {
		t.Fatalf("expected setter to install wrapped writer")
	}
	if ctx.calls != 1 {
		t.Fatalf("expected one setter call, got %d", ctx.calls)
	}

	restore()
	if ctx.writer != original {
		t.Fatalf("expected restore to reinstall original writer")
	}
	if ctx.calls != 2 {
		t.Fatalf("expected restore setter call, got %d", ctx.calls)
	}
}

func TestDebugSwapResponseWriterMissingSetterReturnsNil(t *testing.T) {
	ctx := &debugNoSetterContext{
		MockContext: router.NewMockContext(),
		writer:      httptest.NewRecorder(),
	}
	if restore := debugSwapResponseWriter(ctx, ctx.writer, httptest.NewRecorder()); restore != nil {
		t.Fatalf("expected no restore callback without setter or legacy field")
	}
}

func TestDebugSwapResponseWriterLegacyFieldFallbackRestores(t *testing.T) {
	original := httptest.NewRecorder()
	wrapped := httptest.NewRecorder()
	ctx := &debugLegacyWriterContext{
		MockContext: router.NewMockContext(),
		w:           original,
	}

	restore := debugSwapResponseWriter(ctx, original, wrapped)
	if restore == nil {
		t.Fatalf("expected legacy restore callback")
	}
	if ctx.w != wrapped {
		t.Fatalf("expected legacy fallback to install wrapped writer")
	}

	restore()
	if ctx.w != original {
		t.Fatalf("expected legacy fallback to restore original writer")
	}
}
