package handlers

import (
	"net/http"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// TLSTransportGuard enforces TLS for runtime e-sign routes.
type TLSTransportGuard struct {
	AllowLocalInsecure bool
	RequestTrustPolicy quickstart.RequestTrustPolicy
	// Deprecated: use RequestTrustPolicy.
	// TrustForwardedHeaders should only be enabled behind trusted reverse proxies.
	TrustForwardedHeaders bool
}

func (g TLSTransportGuard) Ensure(c router.Context) error {
	if c == nil {
		return nil
	}
	policy := g.trustPolicy()
	if quickstart.IsSecureRequest(c, policy) {
		return nil
	}
	if g.AllowLocalInsecure && quickstart.IsLocalRequest(c, policy) {
		return nil
	}
	return goerrors.New("tls transport required", goerrors.CategoryAuthz).
		WithCode(http.StatusUpgradeRequired).
		WithTextCode(string(services.ErrorCodeTransportSecurity)).
		WithMetadata(map[string]any{"path": c.Path(), "method": c.Method()})
}

func (g TLSTransportGuard) trustPolicy() quickstart.RequestTrustPolicy {
	policy := g.RequestTrustPolicy
	if !policy.TrustForwardedHeaders && g.TrustForwardedHeaders {
		// Preserve legacy behavior for older call sites while migrating to CIDR-gated trust policy.
		policy.TrustForwardedHeaders = true
		if len(policy.TrustedProxyCIDRs) == 0 {
			policy.TrustedProxyCIDRs = quickstart.InsecureAnyTrustedProxyCIDRs()
		}
	}
	return policy
}
