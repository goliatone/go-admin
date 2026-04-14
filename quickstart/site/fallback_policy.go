package site

import (
	"fmt"
	"net/http"
	"slices"
	"strings"

	quickstart "github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

type SiteFallbackMode string

const (
	SiteFallbackModeDisabled          SiteFallbackMode = "disabled"
	SiteFallbackModePublicContentOnly SiteFallbackMode = "public_content_only"
	SiteFallbackModeExplicitPathsOnly SiteFallbackMode = "explicit_paths_only"
	DefaultSiteFallbackMode           SiteFallbackMode = SiteFallbackModePublicContentOnly
)

const (
	DefaultReservedPrefixAdmin     = "/admin"
	DefaultReservedPrefixAPI       = "/api"
	DefaultReservedPrefixWellKnown = "/.well-known"
	DefaultReservedPrefixStatic    = "/static"
	DefaultReservedPrefixAssets    = "/assets"
)

type SiteFallbackPolicy struct {
	Mode                SiteFallbackMode                 `json:"mode"`
	AllowRoot           bool                             `json:"allow_root"`
	AllowedMethods      []router.HTTPMethod              `json:"allowed_methods,omitempty"`
	AllowedExactPaths   []string                         `json:"allowed_exact_paths,omitempty"`
	AllowedPathPrefixes []string                         `json:"allowed_path_prefixes,omitempty"`
	ReservedPrefixes    []string                         `json:"reserved_prefixes,omitempty"`
	StaticInput         quickstart.SiteStaticPrefixInput `json:"static_input,omitempty"`
}

type siteFallbackPolicyOverlay struct {
	override            *SiteFallbackPolicy
	allowedMethods      []router.HTTPMethod
	allowedExactPaths   []string
	allowedPathPrefixes []string
	reservedPrefixes    []string
}

func DefaultSiteFallbackPolicy() SiteFallbackPolicy {
	return SiteFallbackPolicy{
		Mode:             DefaultSiteFallbackMode,
		AllowRoot:        true,
		AllowedMethods:   defaultSiteFallbackMethods(),
		ReservedPrefixes: defaultSiteFallbackReservedPrefixes(),
	}
}

func NormalizeSiteFallbackPolicy(policy SiteFallbackPolicy) SiteFallbackPolicy {
	policy.Mode = normalizeSiteFallbackMode(policy.Mode)
	policy.AllowedMethods = normalizeSiteFallbackMethods(policy.AllowedMethods)
	policy.AllowedExactPaths = normalizeSiteFallbackPaths(policy.AllowedExactPaths)
	policy.AllowedPathPrefixes = normalizeSiteFallbackPaths(policy.AllowedPathPrefixes)
	policy.ReservedPrefixes = normalizeSiteFallbackPaths(policy.ReservedPrefixes)
	policy.StaticInput = normalizeSiteStaticPrefixInput(policy.StaticInput)
	if len(policy.AllowedMethods) == 0 {
		policy.AllowedMethods = defaultSiteFallbackMethods()
	}
	if len(policy.ReservedPrefixes) == 0 {
		policy.ReservedPrefixes = defaultSiteFallbackReservedPrefixes()
	}
	return policy
}

func ResolveSiteFallbackPolicy(policy SiteFallbackPolicy) SiteFallbackPolicy {
	if isZeroSiteFallbackPolicy(policy) {
		return DefaultSiteFallbackPolicy()
	}
	return NormalizeSiteFallbackPolicy(policy)
}

func normalizeSiteFallbackMode(mode SiteFallbackMode) SiteFallbackMode {
	mode = normalizeSiteFallbackModeValue(mode)
	switch mode {
	case "":
		return DefaultSiteFallbackMode
	case SiteFallbackModeDisabled:
		return SiteFallbackModeDisabled
	case SiteFallbackModePublicContentOnly:
		return SiteFallbackModePublicContentOnly
	case SiteFallbackModeExplicitPathsOnly:
		return SiteFallbackModeExplicitPathsOnly
	default:
		return mode
	}
}

func normalizeSiteFallbackModeValue(mode SiteFallbackMode) SiteFallbackMode {
	return SiteFallbackMode(strings.ToLower(strings.TrimSpace(string(mode))))
}

func defaultSiteFallbackReservedPrefixes() []string {
	return []string{
		DefaultReservedPrefixAdmin,
		DefaultReservedPrefixAPI,
		DefaultReservedPrefixAssets,
		DefaultReservedPrefixStatic,
		DefaultReservedPrefixWellKnown,
	}
}

func defaultSiteFallbackMethods() []router.HTTPMethod {
	return []router.HTTPMethod{router.GET, router.HEAD}
}

func normalizeSiteFallbackMethods(methods []router.HTTPMethod) []router.HTTPMethod {
	if len(methods) == 0 {
		return nil
	}
	seen := map[router.HTTPMethod]struct{}{}
	out := make([]router.HTTPMethod, 0, len(methods))
	appendMethod := func(method router.HTTPMethod) {
		method = router.HTTPMethod(strings.ToUpper(strings.TrimSpace(string(method))))
		if method == "" {
			return
		}
		if _, ok := seen[method]; ok {
			return
		}
		seen[method] = struct{}{}
		out = append(out, method)
	}
	for _, method := range methods {
		appendMethod(method)
	}
	slices.SortFunc(out, func(a, b router.HTTPMethod) int {
		return compareFallbackMethods(a, b)
	})
	if len(out) == 0 {
		return nil
	}
	return out
}

func compareFallbackMethods(a, b router.HTTPMethod) int {
	order := func(method router.HTTPMethod) int {
		switch method {
		case router.GET:
			return 0
		case router.HEAD:
			return 1
		default:
			return 2
		}
	}
	leftOrder := order(a)
	rightOrder := order(b)
	if leftOrder != rightOrder {
		return leftOrder - rightOrder
	}
	return strings.Compare(string(a), string(b))
}

func normalizeSiteFallbackPaths(paths []string) []string {
	if len(paths) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(paths))
	for _, value := range paths {
		normalized := normalizePath(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	slices.Sort(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeSiteStaticPrefixInput(input quickstart.SiteStaticPrefixInput) quickstart.SiteStaticPrefixInput {
	input.AssetsPrefix = strings.TrimSpace(input.AssetsPrefix)
	input.FormgenPrefix = strings.TrimSpace(input.FormgenPrefix)
	input.RuntimePrefix = strings.TrimSpace(input.RuntimePrefix)
	input.EChartsPrefix = strings.TrimSpace(input.EChartsPrefix)
	return input
}

func mergeSiteFallbackPolicy(base SiteFallbackPolicy, overlay siteFallbackPolicyOverlay) SiteFallbackPolicy {
	if overlay.override != nil {
		base = *overlay.override
	}
	if len(overlay.allowedMethods) > 0 {
		base.AllowedMethods = cloneHTTPMethods(overlay.allowedMethods)
	}
	if len(overlay.allowedExactPaths) > 0 {
		base.AllowedExactPaths = cloneStrings(overlay.allowedExactPaths)
	}
	if len(overlay.allowedPathPrefixes) > 0 {
		base.AllowedPathPrefixes = cloneStrings(overlay.allowedPathPrefixes)
	}
	if len(overlay.reservedPrefixes) > 0 {
		base.ReservedPrefixes = cloneStrings(overlay.reservedPrefixes)
	}
	return NormalizeSiteFallbackPolicy(base)
}

func cloneHTTPMethods(values []router.HTTPMethod) []router.HTTPMethod {
	if len(values) == 0 {
		return nil
	}
	out := make([]router.HTTPMethod, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(string(value))
		if trimmed == "" {
			continue
		}
		out = append(out, router.HTTPMethod(trimmed))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func isZeroSiteFallbackPolicy(policy SiteFallbackPolicy) bool {
	return strings.TrimSpace(string(policy.Mode)) == "" &&
		!policy.AllowRoot &&
		len(policy.AllowedMethods) == 0 &&
		len(policy.AllowedExactPaths) == 0 &&
		len(policy.AllowedPathPrefixes) == 0 &&
		len(policy.ReservedPrefixes) == 0
}

func ValidateSiteFallbackPolicy(policy SiteFallbackPolicy) error {
	mode := normalizeSiteFallbackModeValue(policy.Mode)
	switch mode {
	case SiteFallbackModeDisabled, SiteFallbackModePublicContentOnly, SiteFallbackModeExplicitPathsOnly:
	default:
		return fmt.Errorf("unsupported site fallback mode %q", strings.TrimSpace(string(policy.Mode)))
	}

	for _, method := range policy.AllowedMethods {
		switch router.HTTPMethod(strings.ToUpper(strings.TrimSpace(string(method)))) {
		case router.GET, router.HEAD:
		default:
			return fmt.Errorf("unsupported site fallback method %q", strings.TrimSpace(string(method)))
		}
	}

	return nil
}

func siteFallbackAllowsMethod(policy SiteFallbackPolicy, method string) bool {
	method = strings.ToUpper(strings.TrimSpace(method))
	if method == "" {
		return false
	}
	if len(policy.AllowedMethods) == 0 {
		policy.AllowedMethods = defaultSiteFallbackMethods()
	}
	for _, candidate := range policy.AllowedMethods {
		if strings.EqualFold(normalizeFallbackRequestMethod(string(candidate)), method) {
			return true
		}
	}
	return false
}

func siteFallbackAllowsPath(policy SiteFallbackPolicy, requestPath string) bool {
	requestPath = normalizePath(requestPath)
	if requestPath == "" {
		requestPath = "/"
	}
	if siteFallbackReservedPath(policy, requestPath) {
		return false
	}

	switch policy.Mode {
	case SiteFallbackModeDisabled:
		return false
	case SiteFallbackModeExplicitPathsOnly:
		if requestPath == "/" {
			return policy.AllowRoot
		}
		if slices.Contains(policy.AllowedExactPaths, requestPath) {
			return true
		}
		for _, prefix := range policy.AllowedPathPrefixes {
			if siteFallbackPrefixMatch(requestPath, prefix) {
				return true
			}
		}
		return false
	case SiteFallbackModePublicContentOnly:
		if requestPath == "/" {
			return policy.AllowRoot
		}
		return true
	default:
		return false
	}
}

func siteFallbackAllowsRequest(policy SiteFallbackPolicy, method, requestPath string) bool {
	if !siteFallbackAllowsMethod(policy, method) {
		return false
	}
	return siteFallbackAllowsPath(policy, requestPath)
}

func siteFallbackReservedPath(policy SiteFallbackPolicy, requestPath string) bool {
	requestPath = normalizePath(requestPath)
	if requestPath == "" {
		requestPath = "/"
	}
	for _, prefix := range policy.ReservedPrefixes {
		if siteFallbackPrefixMatch(requestPath, prefix) {
			return true
		}
	}
	return false
}

func siteFallbackPrefixMatch(requestPath, prefix string) bool {
	requestPath = normalizePath(requestPath)
	prefix = normalizePath(prefix)
	if requestPath == "" || prefix == "" || prefix == "/" {
		return false
	}
	if requestPath == prefix {
		return true
	}
	return strings.HasPrefix(requestPath, prefix+"/")
}

func normalizeFallbackRequestMethod(method string) string {
	method = strings.ToUpper(strings.TrimSpace(method))
	switch method {
	case http.MethodHead:
		return http.MethodHead
	case http.MethodGet:
		return http.MethodGet
	default:
		return method
	}
}
