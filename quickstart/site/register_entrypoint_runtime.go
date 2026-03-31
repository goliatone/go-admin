package site

import (
	"fmt"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func registerSiteRoutes[T any](
	r router.Router[T],
	adm *admin.Admin,
	cfg admin.Config,
	siteCfg SiteConfig,
	opts []SiteOption,
) error {
	if r == nil {
		return fmt.Errorf("site router is required")
	}

	flow := resolveSiteRegisterFlow[T](adm, cfg, siteCfg, opts)
	return flow.register(r, adm, cfg)
}
