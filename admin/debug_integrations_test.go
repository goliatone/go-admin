package admin

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
	"github.com/stretchr/testify/mock"
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

func TestCaptureJSErrorContextSkipsInjectionWhenRouteDisabled(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{
		Enabled:         true,
		CaptureJSErrors: true,
		Panels:          []string{DebugPanelJSErrors},
	})
	collector.SetJSErrorRouteEnabled(false)

	viewCtx := router.ViewContext{}
	CaptureJSErrorContext(collector, nil, viewCtx)

	if _, ok := viewCtx["debug_jserror_enabled"]; ok {
		t.Fatalf("expected JS error collector injection to be skipped when route is disabled")
	}
	if _, ok := viewCtx["debug_jserror_endpoint"]; ok {
		t.Fatalf("expected JS error endpoint to be omitted when route is disabled")
	}
}

func TestCaptureViewContextForRequestInjectsToolbarTransportContract(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{
		Enabled:            true,
		BasePath:           "/admin/debug",
		ToolbarMode:        true,
		CaptureJSErrors:    true,
		Panels:             []string{DebugPanelRequests, DebugPanelJSErrors},
		ToolbarPanels:      []string{DebugPanelRequests, DebugPanelJSErrors, DebugPanelLogs},
		SlowQueryThreshold: 75 * time.Millisecond,
	})

	ctx := router.NewMockContext()
	ctx.On("Path").Return("/admin/quotes")
	ctx.On("Cookie", mock.Anything).Return()

	viewCtx := CaptureViewContextForRequest(collector, ctx, router.ViewContext{})

	if got := viewCtx["debug_path"]; got != "/admin/debug" {
		t.Fatalf("expected debug_path /admin/debug, got %#v", got)
	}
	if got := viewCtx["debug_toolbar_panels"]; got != "requests,jserrors,logs" {
		t.Fatalf("expected toolbar panels requests,jserrors,logs, got %#v", got)
	}
	if got := viewCtx["debug_slow_threshold_ms"]; got != int64(75) {
		t.Fatalf("expected slow threshold 75ms, got %#v", got)
	}
	if got := viewCtx["debug_toolbar_ws_path"]; got != "/admin/debug/ws" {
		t.Fatalf("expected debug_toolbar_ws_path /admin/debug/ws, got %#v", got)
	}
	if got := viewCtx["debug_toolbar_transport_base_path"]; got != "/admin/debug" {
		t.Fatalf("expected debug_toolbar_transport_base_path /admin/debug, got %#v", got)
	}
	if got := viewCtx["debug_toolbar_errors_path"]; got != "/admin/debug/api/errors" {
		t.Fatalf("expected debug_toolbar_errors_path /admin/debug/api/errors, got %#v", got)
	}
	if got, ok := viewCtx["debug_toolbar_live_enabled"].(bool); !ok || !got {
		t.Fatalf("expected debug_toolbar_live_enabled true, got %#v", viewCtx["debug_toolbar_live_enabled"])
	}
	if got := viewCtx["debug_jserror_endpoint"]; got != "/admin/debug/api/errors" {
		t.Fatalf("expected debug_jserror_endpoint /admin/debug/api/errors, got %#v", got)
	}
	if got, ok := viewCtx["debug_jserror_nonce"].(string); !ok || strings.TrimSpace(got) == "" {
		t.Fatalf("expected request nonce in view context, got %#v", viewCtx["debug_jserror_nonce"])
	}

	transport, ok := viewCtx["debug_toolbar_transport"].(map[string]any)
	if !ok {
		t.Fatalf("expected structured debug_toolbar_transport map, got %#v", viewCtx["debug_toolbar_transport"])
	}
	if got := transport["debug_path"]; got != "/admin/debug" {
		t.Fatalf("expected transport debug_path /admin/debug, got %#v", got)
	}
	if got := transport["transport_base_path"]; got != "/admin/debug" {
		t.Fatalf("expected transport base path /admin/debug, got %#v", got)
	}
	if got := transport["ws_path"]; got != "/admin/debug/ws" {
		t.Fatalf("expected transport ws_path /admin/debug/ws, got %#v", got)
	}
	if got := transport["errors_path"]; got != "/admin/debug/api/errors" {
		t.Fatalf("expected transport errors_path /admin/debug/api/errors, got %#v", got)
	}
	if got, ok := transport["enabled"].(bool); !ok || !got {
		t.Fatalf("expected transport enabled true, got %#v", transport["enabled"])
	}

	if got := ctx.CookiesM[debugNonceCookieName]; strings.TrimSpace(got) == "" {
		t.Fatalf("expected debug nonce cookie to be issued, got %#v", got)
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

func TestDebugRequestMiddlewareCapturesSessionPanelSnapshot(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelRequests, DebugPanelSession},
	}
	collector := NewDebugCollector(cfg)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)
	ctx.SetContext(auth.WithClaimsContext(ctx.Context(), &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:      "session-123",
			Subject: "subject-123",
		},
		UID:      "user-123",
		UserRole: "admin",
	}))

	handler := func(c router.Context) error { return nil }
	if err := DebugRequestMiddleware(collector)(handler)(ctx); err != nil {
		t.Fatalf("expected handler to succeed: %v", err)
	}

	snapshot := collector.Snapshot()
	session, ok := snapshot[DebugPanelSession].(map[string]any)
	if !ok {
		t.Fatalf("expected session panel map, got %T", snapshot[DebugPanelSession])
	}
	if got, _ := session["session_id"].(string); strings.TrimSpace(got) == "" {
		t.Fatalf("expected non-empty session_id, got %q", got)
	}
	if got, _ := session["user_id"].(string); got != "user-123" {
		t.Fatalf("expected user_id=user-123, got %q", got)
	}
	if got, _ := session["subject"].(string); got != "subject-123" {
		t.Fatalf("expected subject=subject-123, got %q", got)
	}
}
