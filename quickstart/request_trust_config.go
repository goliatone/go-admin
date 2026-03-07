package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// WithRequestTrustPolicy applies request trust settings to admin debug secure checks.
func WithRequestTrustPolicy(policy RequestTrustPolicy) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		normalized := normalizeRequestTrustPolicy(policy)
		cfg.Debug.SecureRequestResolver = func(c router.Context) bool {
			return IsSecureRequest(c, normalized)
		}
	}
}
