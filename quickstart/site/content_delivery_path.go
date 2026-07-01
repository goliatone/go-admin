package site

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ContentDeliveryPathInput describes the content record and site scope used to
// compute the same delivery path shape used by the public-site runtime.
type ContentDeliveryPathInput struct {
	SiteConfig     ResolvedSiteConfig
	Content        admin.CMSContent
	ContentType    admin.CMSContentType
	Locale         string
	ContentChannel string
	IncludeBase    bool
	IncludeLocale  bool
}

// ContentDeliveryPathResult is the canonical delivery path plus optional public
// path shape for host-owned redirect capture and migration tools.
type ContentDeliveryPathResult struct {
	CanonicalPath  string `json:"canonical_path"`
	PublicPath     string `json:"public_path"`
	Locale         string `json:"locale"`
	ContentChannel string `json:"content_channel"`
	PublicRoutable bool   `json:"public_routable"`
}

// ResolveContentDeliveryPath computes the effective delivery path for a content
// record using the same content type delivery capability rules as runtime
// delivery resolution.
func ResolveContentDeliveryPath(_ context.Context, input ContentDeliveryPathInput) (ContentDeliveryPathResult, error) {
	capability, ok := capabilityFromContentType(input.ContentType)
	if !ok {
		return ContentDeliveryPathResult{}, fmt.Errorf("content type %q does not expose a delivery capability", strings.TrimSpace(firstNonEmpty(input.ContentType.Slug, input.ContentType.Name, input.ContentType.ID)))
	}

	locale := strings.ToLower(strings.TrimSpace(firstNonEmpty(
		input.Locale,
		input.Content.Locale,
		input.Content.ResolvedLocale,
		input.SiteConfig.DefaultLocale,
	)))
	contentChannel := strings.TrimSpace(firstNonEmpty(input.ContentChannel, input.SiteConfig.ContentChannel))
	canonical := recordDeliveryPath(input.Content, capability)
	result := ContentDeliveryPathResult{
		CanonicalPath:  canonical,
		PublicPath:     canonical,
		Locale:         locale,
		ContentChannel: contentChannel,
		PublicRoutable: contentDeliveryPathPublicRoutable(input.SiteConfig, canonical),
	}
	if canonical == "" {
		return result, nil
	}

	publicPath := canonical
	if input.IncludeLocale && input.SiteConfig.Features.EnableI18N {
		publicPath = localizedPublicPathForStoredPath(
			publicPath,
			locale,
			input.SiteConfig.DefaultLocale,
			input.SiteConfig.LocalePrefixMode,
			input.SiteConfig.SupportedLocales,
		)
	}
	if input.IncludeBase {
		publicPath = normalizeLocalePath(admin.PrefixBasePath(input.SiteConfig.BasePath, publicPath))
	}
	result.PublicPath = publicPath
	return result, nil
}

func contentDeliveryPathPublicRoutable(siteCfg ResolvedSiteConfig, canonical string) bool {
	canonical = strings.TrimSpace(canonical)
	if canonical == "" {
		return false
	}
	canonical = normalizeLocalePath(canonical)
	if canonical == "" {
		return false
	}
	if siteFallbackReservedPath(siteCfg.Fallback, canonical) {
		return false
	}
	return siteFallbackAllowsPath(siteCfg.Fallback, canonical)
}
