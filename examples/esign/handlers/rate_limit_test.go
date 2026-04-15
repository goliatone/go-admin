package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
)

func TestResolveOperationForPathIncludesResendAndSubmit(t *testing.T) {
	cases := []struct {
		method string
		path   string
		want   string
	}{
		{method: http.MethodGet, path: "/api/v1/esign/signing/session/token-1", want: OperationSignerSession},
		{method: http.MethodGet, path: "/api/v1/esign/signing/profile/token-1", want: OperationSignerSession},
		{method: http.MethodGet, path: "/api/v1/esign/signing/signatures/token-1?type=signature", want: OperationSignerSession},
		{method: http.MethodPost, path: "/api/v1/esign/signing/consent/token-1", want: OperationSignerConsent},
		{method: http.MethodPost, path: "/api/v1/esign/signing/field-values/token-1", want: OperationSignerWrite},
		{method: http.MethodPost, path: "/api/v1/esign/signing/field-values/signature/token-1", want: OperationSignerWrite},
		{method: http.MethodPut, path: "/api/v1/esign/signing/signature-upload/object?upload_token=x", want: OperationSignerWrite},
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
	defer closeHTTPResponseBody(t, resp1)

	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected first status 200, got %d", resp1.StatusCode)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req2.Header.Set("X-Forwarded-For", "203.0.113.10")
	resp2, err := app.Test(req2, -1)
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp2)

	if resp2.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected second status 429, got %d", resp2.StatusCode)
	}
}

func TestSignerWriteUsesSeparateBucketFromSubmit(t *testing.T) {
	limiter := NewSlidingWindowRateLimiter(map[string]RateLimitRule{
		OperationSignerWrite:  {MaxRequests: 2, Window: time.Hour},
		OperationSignerSubmit: {MaxRequests: 1, Window: time.Hour},
	})
	app := setupRegisterTestApp(t, WithRequestRateLimiter(limiter))

	submitReq1 := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/token-1", nil)
	submitResp1, err := app.Test(submitReq1, -1)
	if err != nil {
		t.Fatalf("first submit request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, submitResp1)
	if submitResp1.StatusCode != http.StatusNotImplemented {
		t.Fatalf("expected first submit status 501 (service unavailable in test wiring), got %d", submitResp1.StatusCode)
	}

	writeReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/token-1", bytes.NewBufferString(`{"field_instance_id":"field-1","value_text":"ok"}`))
	writeReq.Header.Set("Content-Type", "application/json")
	writeResp, err := app.Test(writeReq, -1)
	if err != nil {
		t.Fatalf("write request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, writeResp)
	if writeResp.StatusCode == http.StatusTooManyRequests {
		t.Fatalf("expected write request not to be blocked by submit bucket")
	}

	submitReq2 := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/token-1", nil)
	submitResp2, err := app.Test(submitReq2, -1)
	if err != nil {
		t.Fatalf("second submit request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, submitResp2)
	if submitResp2.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected second submit status 429, got %d", submitResp2.StatusCode)
	}
}

func TestRateLimitRulesCanBeOverriddenByPreferences(t *testing.T) {
	defaultRules := map[string]RateLimitRule{
		OperationSignerSession: {MaxRequests: 1, Window: time.Hour},
	}
	limiter := NewSlidingWindowRateLimiter(defaultRules)
	store := coreadmin.NewInMemoryPreferencesStore()
	_, _ = store.Upsert(context.Background(), coreadmin.PreferencesUpsertInput{
		Scope: coreadmin.PreferenceScope{TenantID: "tenant-1", OrgID: "org-1"},
		Level: coreadmin.PreferenceLevelOrg,
		Values: map[string]any{
			RateLimitOptionSignerSessionMaxRequests: 3,
			RateLimitOptionSignerSessionWindowSecs:  3600,
		},
	})
	app := setupRegisterTestApp(t,
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
		WithRequestRateLimiter(limiter),
		WithRateLimitRuleResolver(NewScopedRateLimitRuleResolver(store, stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, defaultRules)),
	)

	for i := range 3 {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("request %d failed: %v", i+1, err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected request %d to pass with override, got %d", i+1, resp.StatusCode)
		}
	}

	limitedReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	limitedResp, err := app.Test(limitedReq, -1)
	if err != nil {
		t.Fatalf("limited request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, limitedResp)
	if limitedResp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected request 4 to be limited, got %d", limitedResp.StatusCode)
	}
}

func TestRateLimiterIgnoresForwardedHeadersByDefault(t *testing.T) {
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
	defer closeHTTPResponseBody(t, resp1)
	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected first status 200, got %d", resp1.StatusCode)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req2.Header.Set("X-Forwarded-For", "198.51.100.25")
	resp2, err := app.Test(req2, -1)
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp2)
	if resp2.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected second status 429 with forwarded headers ignored, got %d", resp2.StatusCode)
	}
}

func TestRateLimiterCanTrustForwardedHeadersWhenEnabled(t *testing.T) {
	limiter := NewSlidingWindowRateLimiter(map[string]RateLimitRule{
		OperationSignerSession: {MaxRequests: 1, Window: time.Hour},
	})
	app := setupRegisterTestApp(t,
		WithRequestRateLimiter(limiter),
		WithRequestTrustPolicy(quickstart.RequestTrustPolicy{
			TrustForwardedHeaders: true,
			TrustedProxyCIDRs:     quickstart.InsecureAnyTrustedProxyCIDRs(),
		}),
	)

	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req1.Header.Set("X-Forwarded-For", "203.0.113.10")
	resp1, err := app.Test(req1, -1)
	if err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp1)
	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected first status 200, got %d", resp1.StatusCode)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req2.Header.Set("X-Forwarded-For", "198.51.100.25")
	resp2, err := app.Test(req2, -1)
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp2)
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("expected second status 200 with trusted forwarded headers, got %d", resp2.StatusCode)
	}
}
