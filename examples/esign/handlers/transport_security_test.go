package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/quickstart"
)

func TestTLSTransportGuardRejectsInsecureRequests(t *testing.T) {
	app := setupRegisterTestApp(t, WithTransportGuard(TLSTransportGuard{AllowLocalInsecure: false}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUpgradeRequired {
		t.Fatalf("expected status 426, got %d", resp.StatusCode)
	}
}

func TestTLSTransportGuardAllowsHTTPSForwardedRequests(t *testing.T) {
	app := setupRegisterTestApp(t, WithTransportGuard(TLSTransportGuard{
		AllowLocalInsecure: false,
		RequestTrustPolicy: quickstart.RequestTrustPolicy{
			TrustForwardedHeaders: true,
			TrustedProxyCIDRs:     quickstart.InsecureAnyTrustedProxyCIDRs(),
		},
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestTLSTransportGuardAllowsLocalInsecureWhenEnabled(t *testing.T) {
	app := setupRegisterTestApp(t, WithTransportGuard(TLSTransportGuard{AllowLocalInsecure: true}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req.Host = "localhost:8082"
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestTLSTransportGuardIgnoresForwardedHTTPSWhenUntrusted(t *testing.T) {
	app := setupRegisterTestApp(t, WithTransportGuard(TLSTransportGuard{
		AllowLocalInsecure: false,
		RequestTrustPolicy: quickstart.RequestTrustPolicy{
			TrustForwardedHeaders: true,
		},
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUpgradeRequired {
		t.Fatalf("expected status 426, got %d", resp.StatusCode)
	}
}

func TestTLSTransportGuardIgnoresForwardedLocalhostWhenUntrusted(t *testing.T) {
	app := setupRegisterTestApp(t, WithTransportGuard(TLSTransportGuard{
		AllowLocalInsecure: true,
		RequestTrustPolicy: quickstart.RequestTrustPolicy{
			TrustForwardedHeaders: true,
		},
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	req.Host = "example.com"
	req.Header.Set("X-Forwarded-Host", "localhost:8082")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUpgradeRequired {
		t.Fatalf("expected status 426, got %d", resp.StatusCode)
	}
}
