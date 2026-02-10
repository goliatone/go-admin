package handlers

import (
	"net"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// TLSTransportGuard enforces TLS for runtime e-sign routes.
type TLSTransportGuard struct {
	AllowLocalInsecure bool
}

func (g TLSTransportGuard) Ensure(c router.Context) error {
	if c == nil {
		return nil
	}
	if isSecureRequest(c) {
		return nil
	}
	if g.AllowLocalInsecure && isLocalRequest(c) {
		return nil
	}
	return goerrors.New("tls transport required", goerrors.CategoryAuthz).
		WithCode(http.StatusUpgradeRequired).
		WithTextCode(string(services.ErrorCodeTransportSecurity)).
		WithMetadata(map[string]any{"path": c.Path(), "method": c.Method()})
}

func isSecureRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	proto := strings.ToLower(strings.TrimSpace(c.Header("X-Forwarded-Proto")))
	if proto == "https" {
		return true
	}
	forwarded := strings.ToLower(strings.TrimSpace(c.Header("Forwarded")))
	if strings.Contains(forwarded, "proto=https") {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(c.Header("X-Forwarded-Ssl")), "on") {
		return true
	}
	if httpCtx, ok := c.(router.HTTPContext); ok {
		req := httpCtx.Request()
		if req != nil && req.TLS != nil {
			return true
		}
	}
	return false
}

func isLocalRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	host := strings.TrimSpace(c.Header("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Header("Host"))
	}
	if host == "" {
		return false
	}
	if strings.Contains(host, ":") {
		if parsedHost, _, err := net.SplitHostPort(host); err == nil {
			host = parsedHost
		}
	}
	host = strings.ToLower(host)
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}
