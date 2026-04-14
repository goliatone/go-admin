package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	sitereserved "github.com/goliatone/go-admin/quickstart/internal/sitereserved"
	staticprefixes "github.com/goliatone/go-admin/quickstart/internal/staticprefixes"
)

// SiteStaticPrefixInput describes the static asset mount prefixes that site
// fallback reservations should align with when the host customizes them.
type SiteStaticPrefixInput struct {
	AssetsPrefix  string `json:"assets_prefix,omitempty"`
	FormgenPrefix string `json:"formgen_prefix,omitempty"`
	RuntimePrefix string `json:"runtime_prefix,omitempty"`
	EChartsPrefix string `json:"echarts_prefix,omitempty"`
}

// ResolveSiteFallbackStaticInput returns a site fallback static-input payload
// that matches the current static asset mount options.
func ResolveSiteFallbackStaticInput(cfg admin.Config, opts ...StaticAssetsOption) SiteStaticPrefixInput {
	options := resolveStaticAssetsOptions(cfg, opts)
	return SiteStaticPrefixInput{
		AssetsPrefix:  options.assetsPrefix,
		FormgenPrefix: options.formgenPrefix,
		RuntimePrefix: options.runtimePrefix,
		EChartsPrefix: options.echartsPrefix,
	}
}

// ResolveSiteFallbackReservedPrefixes returns the site fallback reserved
// prefixes that correspond to the current admin config and static asset mount
// options. Hosts that override static asset route prefixes should use this
// helper when configuring site fallback reservations.
func ResolveSiteFallbackReservedPrefixes(cfg admin.Config, opts ...StaticAssetsOption) []string {
	input := ResolveSiteFallbackStaticInput(cfg, opts...)
	return sitereserved.ForAdminConfig(cfg, staticprefixes.Input{
		AssetsPrefix:  input.AssetsPrefix,
		FormgenPrefix: input.FormgenPrefix,
		RuntimePrefix: input.RuntimePrefix,
		EChartsPrefix: input.EChartsPrefix,
	})
}
