package site

import (
	"net/http"
	"net/url"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) requestPathForResolution(c router.Context) string {
	path := strings.TrimSpace(c.Path())
	if routePath := strings.TrimSpace(c.Param("path", "")); routePath != "" {
		path = "/" + strings.Trim(routePath, "/")
		if rest := strings.TrimSpace(c.Param("rest", "")); rest != "" {
			path = path + "/" + strings.Trim(rest, "/")
		}
	}
	path = normalizeLocalePath(path)
	basePath := normalizeLocalePath(r.siteCfg.BasePath)
	if basePath != "/" && strings.HasPrefix(path, basePath) {
		path = normalizeLocalePath(strings.TrimPrefix(path, basePath))
	}
	if r.siteCfg.Features.EnableI18N {
		if stripped, _ := StripSupportedLocalePrefix(path, r.siteCfg.SupportedLocales); stripped != "" {
			path = stripped
		}
	}
	return normalizeLocalePath(path)
}

func (r *deliveryRuntime) canonicalRedirectTarget(c router.Context, resolution *deliveryResolution) string {
	if r == nil || c == nil || resolution == nil || resolution.Record == nil {
		return ""
	}
	if !r.siteCfg.Features.EnableCanonicalRedirect || wantsJSONResponse(c) {
		return ""
	}
	method := strings.ToUpper(strings.TrimSpace(c.Method()))
	if method != http.MethodGet && method != http.MethodHead {
		return ""
	}
	canonical := recordDeliveryPath(*resolution.Record, resolution.Capability)
	if canonical == "" {
		return ""
	}
	resolvedLocale := normalizeRequestedLocale(
		r.canonicalRedirectLocale(resolution),
		firstNonEmpty(resolution.RequestedLocale, r.siteCfg.DefaultLocale),
		r.siteCfg.SupportedLocales,
	)
	publicPath := canonical
	if r.siteCfg.Features.EnableI18N {
		publicPath = LocalizedPath(publicPath, resolvedLocale, r.siteCfg.DefaultLocale, r.siteCfg.LocalePrefixMode)
	}
	publicPath = normalizeLocalePath(admin.PrefixBasePath(r.siteCfg.BasePath, publicPath))
	if publicPath == "" {
		return ""
	}
	currentPath := normalizeLocalePath(c.Path())
	if currentPath == publicPath {
		return ""
	}
	if query := encodeRequestQuery(c); query != "" {
		return publicPath + "?" + query
	}
	return publicPath
}

func (r *deliveryRuntime) canonicalRedirectLocale(resolution *deliveryResolution) string {
	if resolution == nil {
		return ""
	}
	switch r.siteCfg.Features.CanonicalRedirectMode {
	case CanonicalRedirectRequestedLocaleSticky:
		if resolution.MissingRequested {
			return resolution.RequestedLocale
		}
	}
	return resolution.ResolvedLocale
}

func encodeRequestQuery(c router.Context) string {
	if c == nil {
		return ""
	}
	values := url.Values{}
	keys := make([]string, 0, len(c.Queries()))
	for key := range c.Queries() {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		added := false
		func() {
			defer func() { _ = recover() }()
			for _, value := range c.QueryValues(key) {
				values.Add(key, value)
				added = true
			}
		}()
		if !added {
			if value := strings.TrimSpace(c.Query(key)); value != "" {
				values.Add(key, value)
			}
		}
	}
	return values.Encode()
}

func wantsJSONResponse(c router.Context) bool {
	if c == nil {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(c.Query("format")), "json") {
		return true
	}
	accept := strings.ToLower(strings.TrimSpace(c.Header("Accept")))
	return strings.Contains(accept, "application/json")
}
