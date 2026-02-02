package admin

import (
	"bufio"
	"bytes"
	"net"
	"net/http"
	"reflect"
	"unsafe"

	router "github.com/goliatone/go-router"
)

type debugResponseWriter struct {
	http.ResponseWriter
	statusCode int
	buf        bytes.Buffer
	maxBytes   int64
	truncated  bool
	bodySize   int64
}

func newDebugResponseWriter(w http.ResponseWriter, maxBytes int64) *debugResponseWriter {
	if maxBytes < 0 {
		maxBytes = 0
	}
	return &debugResponseWriter{ResponseWriter: w, maxBytes: maxBytes}
}

func (w *debugResponseWriter) WriteHeader(code int) {
	if w == nil {
		return
	}
	if w.statusCode == 0 {
		w.statusCode = code
	}
	if w.ResponseWriter != nil {
		w.ResponseWriter.WriteHeader(code)
	}
}

func (w *debugResponseWriter) Write(b []byte) (int, error) {
	if w == nil || w.ResponseWriter == nil {
		return 0, http.ErrBodyNotAllowed
	}
	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(b)
	if n > 0 {
		w.bodySize += int64(n)
		w.capture(b[:n])
	}
	return n, err
}

func (w *debugResponseWriter) StatusCode() int {
	if w == nil || w.statusCode == 0 {
		return http.StatusOK
	}
	return w.statusCode
}

func (w *debugResponseWriter) StatusCodeRaw() int {
	if w == nil {
		return 0
	}
	return w.statusCode
}

func (w *debugResponseWriter) Body() string {
	if w == nil {
		return ""
	}
	return w.buf.String()
}

func (w *debugResponseWriter) BodySize() int64 {
	if w == nil {
		return 0
	}
	return w.bodySize
}

func (w *debugResponseWriter) Flush() {
	if w == nil {
		return
	}
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *debugResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if w == nil {
		return nil, nil, http.ErrNotSupported
	}
	if hijacker, ok := w.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}

func (w *debugResponseWriter) Push(target string, opts *http.PushOptions) error {
	if w == nil {
		return http.ErrNotSupported
	}
	if pusher, ok := w.ResponseWriter.(http.Pusher); ok {
		return pusher.Push(target, opts)
	}
	return http.ErrNotSupported
}

func (w *debugResponseWriter) capture(b []byte) {
	if w.maxBytes <= 0 || len(b) == 0 {
		return
	}
	remaining := w.maxBytes - int64(w.buf.Len())
	if remaining <= 0 {
		w.truncated = true
		return
	}
	if int64(len(b)) > remaining {
		_, _ = w.buf.Write(b[:remaining])
		w.truncated = true
		return
	}
	_, _ = w.buf.Write(b)
}

func debugWrapResponseWriter(c router.Context, maxBytes int64) (*debugResponseWriter, func()) {
	if c == nil {
		return nil, nil
	}
	httpCtx, ok := c.(router.HTTPContext)
	if !ok {
		return nil, nil
	}
	base := httpCtx.Response()
	if base == nil {
		return nil, nil
	}
	wrapped := newDebugResponseWriter(base, maxBytes)
	restore := debugSwapResponseWriter(c, base, wrapped)
	if restore == nil {
		return nil, nil
	}
	return wrapped, restore
}

func debugSwapResponseWriter(c router.Context, original http.ResponseWriter, wrapped http.ResponseWriter) func() {
	if c == nil {
		return nil
	}
	type responseWriterSetter interface {
		SetResponseWriter(http.ResponseWriter)
	}
	if setter, ok := c.(responseWriterSetter); ok {
		setter.SetResponseWriter(wrapped)
		return func() {
			setter.SetResponseWriter(original)
		}
	}
	if prev, ok := debugSetResponseWriterField(c, "w", wrapped); ok {
		return func() {
			debugSetResponseWriterField(c, "w", prev)
		}
	}
	if prev, ok := debugSetResponseWriterField(c, "httpRes", wrapped); ok {
		return func() {
			debugSetResponseWriterField(c, "httpRes", prev)
		}
	}
	return nil
}

func debugSetResponseWriterField(target any, fieldName string, writer http.ResponseWriter) (http.ResponseWriter, bool) {
	if target == nil {
		return nil, false
	}
	val := reflect.ValueOf(target)
	if val.Kind() != reflect.Pointer || val.IsNil() {
		return nil, false
	}
	elem := val.Elem()
	if elem.Kind() != reflect.Struct {
		return nil, false
	}
	field := elem.FieldByName(fieldName)
	if !field.IsValid() || field.Type() != reflect.TypeOf((*http.ResponseWriter)(nil)).Elem() {
		return nil, false
	}
	fieldPtr := reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem()
	current, _ := fieldPtr.Interface().(http.ResponseWriter)
	next := reflect.ValueOf(writer)
	if !next.IsValid() {
		next = reflect.Zero(field.Type())
	}
	fieldPtr.Set(next)
	return current, true
}
