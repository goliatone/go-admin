package site

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const (
	defaultDeliveryListTemplate   = "site/content/list"
	defaultDeliveryDetailTemplate = "site/content/detail"
)

type deliveryCapability struct {
	TypeSlug       string             `json:"type_slug"`
	Kind           string             `json:"kind"`
	ListRoute      string             `json:"list_route"`
	DetailRoute    string             `json:"detail_route"`
	ListTemplate   string             `json:"list_template"`
	DetailTemplate string             `json:"detail_template"`
	PathPolicy     deliveryPathPolicy `json:"path_policy"`
}

type deliveryPathPolicy struct {
	AllowExternalURLs bool     `json:"allow_external_ur_ls"`
	AllowRoot         bool     `json:"allow_root"`
	AllowedPrefixes   []string `json:"allowed_prefixes"`
	allowRootSet      bool
	allowedPrefixSet  bool
}

func (c deliveryCapability) normalizedKind() string {
	switch strings.ToLower(strings.TrimSpace(c.Kind)) {
	case "page", "collection", "detail", "hybrid":
		return strings.ToLower(strings.TrimSpace(c.Kind))
	default:
		if strings.EqualFold(c.TypeSlug, "page") || strings.EqualFold(c.TypeSlug, "pages") {
			return "page"
		}
		return "detail"
	}
}

func (c deliveryCapability) listRoutePattern() string {
	if route := normalizeLocalePath(c.ListRoute); route != "/" || strings.TrimSpace(c.ListRoute) != "" {
		return route
	}
	return normalizeLocalePath("/" + pluralTypeSlug(c.TypeSlug))
}

func (c deliveryCapability) detailRoutePattern() string {
	if route := normalizeLocalePath(c.DetailRoute); route != "/" || strings.TrimSpace(c.DetailRoute) != "" {
		return route
	}
	return normalizeLocalePath("/" + pluralTypeSlug(c.TypeSlug) + "/:slug")
}

func (c deliveryCapability) detailTemplateCandidates() []string {
	out := []string{}
	appendTemplate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		for _, existing := range out {
			if existing == name {
				return
			}
		}
		out = append(out, name)
	}
	appendTemplate(c.DetailTemplate)
	appendTemplate("site/" + singularTypeSlug(c.TypeSlug))
	appendTemplate(defaultDeliveryDetailTemplate)
	return out
}

func (c deliveryCapability) listTemplateCandidates() []string {
	out := []string{}
	appendTemplate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		for _, existing := range out {
			if existing == name {
				return
			}
		}
		out = append(out, name)
	}
	appendTemplate(c.ListTemplate)
	appendTemplate("site/" + pluralTypeSlug(c.TypeSlug))
	appendTemplate(defaultDeliveryListTemplate)
	return out
}

type deliveryResolution struct {
	Mode               string             `json:"mode"`
	Capability         deliveryCapability `json:"capability"`
	Record             *admin.CMSContent  `json:"record"`
	Records            []admin.CMSContent `json:"records"`
	RequestedLocale    string             `json:"requested_locale"`
	ResolvedLocale     string             `json:"resolved_locale"`
	AvailableLocales   []string           `json:"available_locales"`
	MissingRequested   bool               `json:"missing_requested"`
	FamilyID           string             `json:"family_id"`
	PathsByLocale      map[string]string  `json:"paths_by_locale"`
	TemplateCandidates []string           `json:"template_candidates"`
}

type localizedCapabilityRecordSet struct {
	locales  []string
	byLocale map[string][]admin.CMSContent
}

type deliveryRuntime struct {
	siteCfg        ResolvedSiteConfig
	contentSvc     admin.CMSContentService
	contentTypeSvc admin.CMSContentTypeService
	navigation     *navigationRuntime
}

func newDeliveryRuntime(
	siteCfg ResolvedSiteConfig,
	adm *admin.Admin,
	contentSvc admin.CMSContentService,
	contentTypeSvc admin.CMSContentTypeService,
) *deliveryRuntime {
	if contentSvc == nil || contentTypeSvc == nil {
		return nil
	}
	return &deliveryRuntime{
		siteCfg:        siteCfg,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
		navigation:     newNavigationRuntime(siteCfg, adm, contentSvc, contentTypeSvc),
	}
}

func (r *deliveryRuntime) listSiteContentsCached(ctx context.Context, locale string, cache *siteContentCache) ([]admin.CMSContent, error) {
	if r == nil || r.contentSvc == nil {
		return nil, nil
	}
	return cache.List(ctx, r.contentSvc, locale)
}

func (r *deliveryRuntime) Handler() router.HandlerFunc {
	if r == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		flow := r.prepareDeliveryFlow(c)
		if hasSiteRuntimeError(flow.err) {
			return renderSiteRuntimeError(c, flow.state, r.siteCfg, flow.err)
		}
		if flow.resolution == nil {
			return renderSiteRuntimeError(c, flow.state, r.siteCfg, SiteRuntimeError{
				Status:          404,
				RequestedLocale: flow.state.Locale,
			})
		}
		return r.renderResolution(c, flow.state, flow.resolution, flow.requestPath, flow.cache)
	}
}

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

func capabilityFromContentType(contentType admin.CMSContentType) (deliveryCapability, bool) {
	slug := strings.TrimSpace(contentType.Slug)
	if slug == "" {
		slug = strings.TrimSpace(contentType.Name)
	}
	if slug == "" {
		return deliveryCapability{}, false
	}
	slug = strings.ToLower(slug)

	contracts := admin.ReadContentTypeCapabilityContracts(contentType)
	delivery := anyMap(contracts.Delivery)
	if len(delivery) == 0 {
		return deliveryCapability{}, false
	}

	enabled := true
	if raw, ok := delivery["enabled"]; ok {
		enabled = anyBool(raw)
	}
	if !enabled {
		return deliveryCapability{}, false
	}

	routes := anyMap(delivery["routes"])
	templates := anyMap(delivery["templates"])
	out := deliveryCapability{
		TypeSlug:       slug,
		Kind:           strings.ToLower(strings.TrimSpace(anyString(delivery["kind"]))),
		ListRoute:      strings.TrimSpace(anyString(routes["list"])),
		DetailRoute:    strings.TrimSpace(anyString(routes["detail"])),
		ListTemplate:   strings.TrimSpace(anyString(templates["list"])),
		DetailTemplate: strings.TrimSpace(anyString(templates["detail"])),
	}
	out.PathPolicy = deliveryPathPolicyFromContract(delivery, out)
	return out, true
}

func (r *deliveryRuntime) strictLocalizedPathsEnabled() bool {
	if r == nil {
		return false
	}
	return r.siteCfg.Features.EnableI18N && r.siteCfg.Features.StrictLocalizedPaths
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

func translationMissingSiteError(requestedLocale string, availableLocales []string, contentType, slugOrPath string) SiteRuntimeError {
	return SiteRuntimeError{
		Code:             siteErrorCodeTranslationMissing,
		Status:           404,
		Message:          "translation missing",
		RequestedLocale:  strings.TrimSpace(requestedLocale),
		AvailableLocales: cloneStrings(availableLocales),
		ContentType:      strings.TrimSpace(contentType),
		SlugOrPath:       strings.TrimSpace(slugOrPath),
	}
}

func hasSiteRuntimeError(err SiteRuntimeError) bool {
	return err.Status > 0 || strings.TrimSpace(err.Code) != "" || strings.TrimSpace(err.Message) != ""
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

func singularTypeSlug(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.Trim(value, "/")
	if value == "" {
		return "content"
	}
	if strings.HasSuffix(value, "ies") && len(value) > 3 {
		return strings.TrimSuffix(value, "ies") + "y"
	}
	if strings.HasSuffix(value, "s") && !strings.HasSuffix(value, "ss") {
		return strings.TrimSuffix(value, "s")
	}
	return value
}

func pluralTypeSlug(value string) string {
	value = singularTypeSlug(value)
	if strings.HasSuffix(value, "y") && len(value) > 1 {
		return strings.TrimSuffix(value, "y") + "ies"
	}
	if strings.HasSuffix(value, "s") {
		return value
	}
	return value + "s"
}

func deliveryPathPolicyFromContract(delivery map[string]any, capability deliveryCapability) deliveryPathPolicy {
	policy := deliveryPathPolicy{
		AllowExternalURLs: false,
		AllowRoot:         capability.normalizedKind() == "page",
		AllowedPrefixes:   defaultDeliveryPathPrefixes(capability),
		allowRootSet:      false,
		allowedPrefixSet:  false,
	}
	raw := anyMap(delivery["path_policy"])
	if len(raw) == 0 {
		return policy
	}
	if _, exists := raw["allow_external_urls"]; exists {
		policy.AllowExternalURLs = anyBool(raw["allow_external_urls"])
	}
	if _, exists := raw["allow_root"]; exists {
		policy.AllowRoot = anyBool(raw["allow_root"])
		policy.allowRootSet = true
	}
	if _, exists := raw["allowed_prefixes"]; exists {
		policy.allowedPrefixSet = true
		policy.AllowedPrefixes = normalizePolicyPrefixes(anyStringList(raw["allowed_prefixes"]))
		return policy
	}
	if values := normalizePolicyPrefixes(anyStringList(raw["allowed_prefixes"])); len(values) > 0 {
		policy.AllowedPrefixes = values
	}
	return policy
}

func effectiveDeliveryPathPolicy(capability deliveryCapability) deliveryPathPolicy {
	policy := capability.PathPolicy
	if !policy.allowRootSet {
		policy.AllowRoot = capability.normalizedKind() == "page"
	}
	if !policy.allowedPrefixSet {
		policy.AllowedPrefixes = defaultDeliveryPathPrefixes(capability)
	}
	policy.AllowedPrefixes = normalizePolicyPrefixes(policy.AllowedPrefixes)
	return policy
}

func defaultDeliveryPathPrefixes(capability deliveryCapability) []string {
	switch capability.normalizedKind() {
	case "collection":
		if prefix := staticRoutePrefix(capability.listRoutePattern()); prefix != "" && prefix != "/" {
			return []string{prefix}
		}
	case "detail", "hybrid":
		if prefix := staticRoutePrefix(capability.detailRoutePattern()); prefix != "" && prefix != "/" {
			return []string{prefix}
		}
	}
	return nil
}

func staticRoutePrefix(pattern string) string {
	pattern = normalizeLocalePath(pattern)
	segments := splitPathSegments(pattern)
	if len(segments) == 0 {
		return "/"
	}
	prefix := make([]string, 0, len(segments))
	for _, segment := range segments {
		if strings.HasPrefix(segment, ":") || strings.Contains(segment, "*") {
			break
		}
		prefix = append(prefix, segment)
	}
	if len(prefix) == 0 {
		return "/"
	}
	return normalizeLocalePath("/" + strings.Join(prefix, "/"))
}

func normalizePolicyPrefixes(items []string) []string {
	if len(items) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(items))
	for _, item := range items {
		path := normalizeLocalePath(item)
		if path == "" || path == "/" {
			continue
		}
		if _, exists := seen[path]; exists {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	if len(out) == 0 {
		return nil
	}
	sort.Strings(out)
	return out
}

func sanitizeDeliveryPath(raw string, policy deliveryPathPolicy) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !policy.AllowExternalURLs {
		lower := strings.ToLower(raw)
		if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(raw, "//") {
			return ""
		}
	}
	if strings.Contains(raw, "\\") {
		return ""
	}
	if idx := strings.IndexAny(raw, "?#"); idx >= 0 {
		raw = strings.TrimSpace(raw[:idx])
	}
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "/") {
		raw = "/" + strings.TrimLeft(raw, "/")
	}
	for _, segment := range strings.Split(strings.Trim(raw, "/"), "/") {
		if segment == "." || segment == ".." {
			return ""
		}
	}
	cleaned := path.Clean(raw)
	if !strings.HasPrefix(cleaned, "/") {
		cleaned = "/" + cleaned
	}
	cleaned = normalizeLocalePath(cleaned)
	if cleaned == "" {
		return ""
	}
	if cleaned == "/" && !policy.AllowRoot {
		return ""
	}
	if len(policy.AllowedPrefixes) > 0 && !pathMatchesAllowedPrefixes(cleaned, policy.AllowedPrefixes) {
		return ""
	}
	return cleaned
}

func pathMatchesAllowedPrefixes(path string, prefixes []string) bool {
	path = normalizeLocalePath(path)
	if path == "" || len(prefixes) == 0 {
		return false
	}
	for _, prefix := range prefixes {
		prefix = normalizeLocalePath(prefix)
		if prefix == "" || prefix == "/" {
			continue
		}
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func anyStringList(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			value := strings.TrimSpace(anyString(item))
			if value == "" {
				continue
			}
			out = append(out, value)
		}
		return out
	default:
		return nil
	}
}

func anyMap(raw any) map[string]any {
	if raw == nil {
		return nil
	}
	if typed, ok := raw.(map[string]any); ok {
		return typed
	}
	if typed, ok := raw.(map[string]string); ok {
		out := map[string]any{}
		for key, value := range typed {
			out[key] = value
		}
		return out
	}
	return nil
}

func anyString(raw any) string {
	switch typed := raw.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func anyBool(raw any) bool {
	switch typed := raw.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on":
			return true
		}
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case float64:
		return typed != 0
	}
	return false
}
