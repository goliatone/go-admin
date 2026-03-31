package site

import (
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// RegisterSiteRoutes registers quickstart site routes with deterministic ordering.
func RegisterSiteRoutes[T any](
	r router.Router[T],
	adm *admin.Admin,
	cfg admin.Config,
	siteCfg SiteConfig,
	opts ...SiteOption,
) error {
	return registerSiteRoutes(r, adm, cfg, siteCfg, opts)
}
