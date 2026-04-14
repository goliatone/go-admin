package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	sitereserved "github.com/goliatone/go-admin/quickstart/internal/sitereserved"
	staticprefixes "github.com/goliatone/go-admin/quickstart/internal/staticprefixes"
)

// ResolveSiteFallbackReservedPrefixes returns the site fallback reserved
// prefixes that correspond to the current admin config and static asset mount
// options. Hosts that override static asset route prefixes should use this
// helper when configuring site fallback reservations.
func ResolveSiteFallbackReservedPrefixes(cfg admin.Config, opts ...StaticAssetsOption) []string {
	options := resolveStaticAssetsOptions(cfg, opts)
	return sitereserved.ForAdminConfig(cfg, staticprefixes.Input{
		AssetsPrefix:  options.assetsPrefix,
		FormgenPrefix: options.formgenPrefix,
		RuntimePrefix: options.runtimePrefix,
		EChartsPrefix: options.echartsPrefix,
	})
}
