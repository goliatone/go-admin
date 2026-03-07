package config

import (
	"strings"

	"github.com/goliatone/go-admin/quickstart"
)

// RequestTrustPolicy resolves runtime forwarded-header trust policy.
func (c NetworkConfig) RequestTrustPolicy() quickstart.RequestTrustPolicy {
	policy := quickstart.RequestTrustPolicy{
		TrustForwardedHeaders: c.RateLimitTrustProxyHeaders,
		TrustedProxyCIDRs:     make([]string, 0, len(c.TrustedProxyCIDRs)),
	}
	for _, raw := range c.TrustedProxyCIDRs {
		cidr := strings.TrimSpace(raw)
		if cidr == "" {
			continue
		}
		policy.TrustedProxyCIDRs = append(policy.TrustedProxyCIDRs, cidr)
	}
	return policy
}

// ActiveRequestTrustPolicy returns trust policy from active config.
func ActiveRequestTrustPolicy() quickstart.RequestTrustPolicy {
	return Active().Network.RequestTrustPolicy()
}
