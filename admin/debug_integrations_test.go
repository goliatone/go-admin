package admin

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/julienschmidt/httprouter"
	router "github.com/goliatone/go-router"
)

func TestDebugIsTextContentType(t *testing.T) {
	tests := []struct {
		contentType string
		want        bool
	}{
		{"application/json", true},
		{"application/json; charset=utf-8", true},
		{"application/xml", true},
		{"text/xml", true},
		{"text/plain", true},
		{"text/html", true},
		{"text/css", true},
		{"application/x-www-form-urlencoded", true},
		{"application/vnd.api+json", true},
		{"application/atom+xml", true},
		{"multipart/form-data", false},
		{"image/png", false},
		{"application/octet-stream", false},
		{"", false},
	}
	for _, tc := range tests {
		if got := debugIsTextContentType(tc.contentType); got != tc.want {
			t.Fatalf("content type %q expected %v, got %v", tc.contentType, tc.want, got)
		}
	}
}

func TestDebugCaptureBody(t *testing.T) {
	if got, truncated := debugCaptureBody([]byte(""), 10); got != "" || truncated {
		t.Fatalf("expected empty body, got %q (truncated=%v)", got, truncated)
	}
	if got, truncated := debugCaptureBody([]byte("hello"), 10); got != "hello" || truncated {
		t.Fatalf("expected full body, got %q (truncated=%v)", got, truncated)
	}
	if got, truncated := debugCaptureBody([]byte("hello"), 5); got != "hello" || truncated {
		t.Fatalf("expected at-limit body, got %q (truncated=%v)", got, truncated)
	}
	if got, truncated := debugCaptureBody([]byte("hello world"), 5); got != "hello" || !truncated {
		t.Fatalf("expected truncated body, got %q (truncated=%v)", got, truncated)
	}
}

func TestDebugContentTypeAndRemoteIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString("ok"))
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	ctx := router.NewHTTPRouterContext(httptest.NewRecorder(), req, httprouter.Params{}, nil)
	if got := debugContentType(ctx); got != "application/json; charset=utf-8" {
		t.Fatalf("expected content type, got %q", got)
	}

	mockCtx := router.NewMockContext()
	mockCtx.On("IP").Return("10.0.0.1")
	if got := debugRemoteIP(mockCtx); got != "10.0.0.1" {
		t.Fatalf("expected IP from context, got %q", got)
	}

	req.RemoteAddr = "192.168.1.10:1234"
	ctx = router.NewHTTPRouterContext(httptest.NewRecorder(), req, httprouter.Params{}, nil)
	if got := debugRemoteIP(ctx); got != "192.168.1.10:1234" {
		t.Fatalf("expected remote addr, got %q", got)
	}
}

func TestDebugRequestAndResponseSize(t *testing.T) {
	reqBody := "payload"
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(reqBody))
	req.ContentLength = int64(len(reqBody))
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)
	if got := debugRequestSize(ctx); got != int64(len(reqBody)) {
		t.Fatalf("expected request size %d, got %d", len(reqBody), got)
	}

	rec.Header().Set("Content-Length", "42")
	if got := debugResponseSize(ctx.(router.HTTPContext)); got != 42 {
		t.Fatalf("expected response size 42, got %d", got)
	}
}

func TestDebugRequestMiddlewareCapturesBodies(t *testing.T) {
	cfg := DebugConfig{
		Panels:             []string{DebugPanelRequests},
		CaptureRequestBody: true,
	}
	collector := NewDebugCollector(cfg)

	body := `{"foo":"bar"}`
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = int64(len(body))
	req.RemoteAddr = "10.0.0.1:9999"
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)

	handler := func(c router.Context) error {
		c.SetHeader("Content-Type", "application/json")
		return c.SendString(`{"ok":true}`)
	}

	if err := DebugRequestMiddleware(collector)(handler)(ctx); err != nil {
		t.Fatalf("expected handler to succeed: %v", err)
	}

	entries := collector.requestLog.Values()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.ContentType != "application/json" {
		t.Fatalf("expected content type, got %q", entry.ContentType)
	}
	if entry.RequestBody != body {
		t.Fatalf("expected request body %q, got %q", body, entry.RequestBody)
	}
	if entry.BodyTruncated {
		t.Fatalf("expected body not truncated")
	}
	if entry.RequestSize != int64(len(body)) {
		t.Fatalf("expected request size %d, got %d", len(body), entry.RequestSize)
	}
	if entry.ResponseBody != `{"ok":true}` {
		t.Fatalf("expected response body, got %q", entry.ResponseBody)
	}
	if entry.ResponseHeaders["Content-Type"] != "application/json" {
		t.Fatalf("expected response content type, got %q", entry.ResponseHeaders["Content-Type"])
	}
	if entry.ResponseSize == 0 {
		t.Fatalf("expected response size to be set")
	}
	if entry.RemoteIP != req.RemoteAddr {
		t.Fatalf("expected remote IP %q, got %q", req.RemoteAddr, entry.RemoteIP)
	}
}

func TestDebugRequestMiddlewareSkipsBodiesWhenDisabled(t *testing.T) {
	cfg := DebugConfig{
		Panels:             []string{DebugPanelRequests},
		CaptureRequestBody: false,
	}
	collector := NewDebugCollector(cfg)

	body := `{"foo":"bar"}`
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = int64(len(body))
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)

	responseBody := `{"ok":true}`
	handler := func(c router.Context) error {
		c.SetHeader("Content-Type", "application/json")
		c.SetHeader("Content-Length", strconv.Itoa(len(responseBody)))
		return c.SendString(responseBody)
	}

	if err := DebugRequestMiddleware(collector)(handler)(ctx); err != nil {
		t.Fatalf("expected handler to succeed: %v", err)
	}

	entries := collector.requestLog.Values()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.RequestBody != "" {
		t.Fatalf("expected request body to be empty, got %q", entry.RequestBody)
	}
	if entry.ResponseBody != "" {
		t.Fatalf("expected response body to be empty, got %q", entry.ResponseBody)
	}
	if entry.ResponseHeaders == nil {
		t.Fatalf("expected response headers to be captured")
	}
	if entry.ContentType != "application/json" {
		t.Fatalf("expected content type metadata, got %q", entry.ContentType)
	}
	if entry.RequestSize != int64(len(body)) {
		t.Fatalf("expected request size %d, got %d", len(body), entry.RequestSize)
	}
	if entry.ResponseSize != int64(len(responseBody)) {
		t.Fatalf("expected response size %d, got %d", len(responseBody), entry.ResponseSize)
	}
}
