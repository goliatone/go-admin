package site

import (
	"path"
	"sort"
	"strings"
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
