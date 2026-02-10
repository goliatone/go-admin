package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestResolveOperationForPathIncludesResendAndSubmit(t *testing.T) {
	cases := []struct {
		method string
		path   string
		want   string
	}{
		{method: http.MethodGet, path: "/api/v1/esign/signing/session/token-1", want: OperationSignerSession},
		{method: http.MethodPost, path: "/api/v1/esign/signing/consent/token-1", want: OperationSignerConsent},
		{method: http.MethodPost, path: "/api/v1/esign/signing/submit/token-1", want: OperationSignerSubmit},
		{method: http.MethodPost, path: "/admin/api/v1/esign/agreements/ag-1/resend", want: OperationAdminResend},
	}

	for _, tc := range cases {
		if got := ResolveOperationForPath(tc.method, tc.path); got != tc.want {
			t.Fatalf("ResolveOperationForPath(%s, %s) expected %q, got %q", tc.method, tc.path, tc.want, got)
		}
	}
}

func TestSignerEndpointsRateLimited(t *testing.T) {
	limiter := NewSlidingWindowRateLimiter(map[string]RateLimitRule{
		OperationSignerSession: {MaxRequests: 1, Window: time.Hour},
	})
	app := setupRegisterTestApp(t, WithRequestRateLimiter(limiter))

	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req1.Header.Set("X-Forwarded-For", "203.0.113.10")
	resp1, err := app.Test(req1, -1)
	if err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	defer resp1.Body.Close()

	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected first status 200, got %d", resp1.StatusCode)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req2.Header.Set("X-Forwarded-For", "203.0.113.10")
	resp2, err := app.Test(req2, -1)
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected second status 429, got %d", resp2.StatusCode)
	}
}
