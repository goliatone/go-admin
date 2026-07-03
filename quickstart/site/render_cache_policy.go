package site

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

const (
	defaultRenderCacheSchemaVersion = "v1"
	defaultRenderCacheNamespace     = "site"
	defaultRenderCacheRenderVersion = "1"
)

// RenderCacheStore is the local public-site render cache contract. It matches
// go-cache-style typed stores without coupling quickstart/site to a backend.
type RenderCacheStore interface {
	Get(ctx context.Context, key string) (RenderedSiteResponse, bool, error)
	Set(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

// RenderCacheTagInvalidator is implemented by stores that can associate and
// invalidate cache keys by tag.
type RenderCacheTagInvalidator interface {
	AddTagsForKey(ctx context.Context, key string, tags []string) error
	InvalidateTags(ctx context.Context, tags []string) error
}

// RenderCachePrefixInvalidator is implemented by stores that can delete keys
// by prefix.
type RenderCachePrefixInvalidator interface {
	DeleteByKeyPrefix(ctx context.Context, prefix string) error
}

// RenderCacheBackendDescriber lets host stores declare whether they are memory
// or shared backends without quickstart/site importing a concrete cache package.
type RenderCacheBackendDescriber interface {
	RenderCacheBackendKind() string
}

// RenderCacheBypassPredicate lets host applications block caching when they
// know about auth, session, or personalization state that quickstart/site does
// not own.
type RenderCacheBypassPredicate func(c router.Context, state RequestState) (bool, string)

// RenderCacheRevalidationRequest describes a stale cache hit that can be
// refreshed by a host-owned background worker.
type RenderCacheRevalidationRequest struct {
	Key         string
	RequestPath string
	State       RequestState
	Response    RenderedSiteResponse
}

// RenderCacheStaleRevalidator is called asynchronously after a stale response
// is replayed. Hosts should use it to schedule safe background regeneration.
type RenderCacheStaleRevalidator func(ctx context.Context, request RenderCacheRevalidationRequest)

// RenderCachePolicy controls public-site rendered HTML caching.
type RenderCachePolicy struct {
	Enabled bool `json:"enabled"`

	SchemaVersion        string        `json:"schema_version"`
	ApplicationNamespace string        `json:"application_namespace"`
	EnvironmentNamespace string        `json:"environment_namespace"`
	SiteNamespace        string        `json:"site_namespace"`
	RenderVersion        string        `json:"render_version"`
	FreshTTL             time.Duration `json:"fresh_ttl"`
	StaleTTL             time.Duration `json:"stale_ttl"`

	CacheableMethods  []string `json:"cacheable_methods"`
	CacheableStatuses []int    `json:"cacheable_statuses"`
	QueryAllowlist    []string `json:"query_allowlist"`
	HeaderAllowlist   []string `json:"header_allowlist"`
	AuthCookieNames   []string `json:"auth_cookie_names"`

	DebugHeaders bool `json:"debug_headers"`
	DebugKeys    bool `json:"debug_keys"`
	FailClosed   bool `json:"fail_closed"`

	// RequireTagIndex makes page storage depend on production-safe tag indexing.
	// When enabled, stores must implement RenderCacheTagInvalidator and must not
	// be a memory backend. This is intended for production invalidation rollout.
	RequireTagIndex bool `json:"require_tag_index"`

	MaxCaptureBodySize int64 `json:"max_capture_body_size"`

	TemplateRenderer RenderCacheTemplateRenderer  `json:"-"`
	BypassPredicates []RenderCacheBypassPredicate `json:"-"`
	StaleRevalidator RenderCacheStaleRevalidator  `json:"-"`
}

type renderCacheConfig struct {
	store  RenderCacheStore
	policy RenderCachePolicy
}

// WithRenderCache configures public-site rendered response caching. The policy
// remains disabled unless policy.Enabled is true.
func WithRenderCache(store RenderCacheStore, policy RenderCachePolicy) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.renderCache = renderCacheConfig{
			store:  store,
			policy: normalizeRenderCachePolicy(policy),
		}
	}
}

func normalizeRenderCachePolicy(policy RenderCachePolicy) RenderCachePolicy {
	policy.SchemaVersion = firstNonEmpty(
		strings.TrimSpace(policy.SchemaVersion),
		defaultRenderCacheSchemaVersion,
	)
	policy.ApplicationNamespace = firstNonEmpty(
		strings.TrimSpace(policy.ApplicationNamespace),
		defaultRenderCacheNamespace,
	)
	policy.EnvironmentNamespace = strings.TrimSpace(policy.EnvironmentNamespace)
	policy.SiteNamespace = firstNonEmpty(strings.TrimSpace(policy.SiteNamespace), defaultRenderCacheNamespace)
	policy.RenderVersion = firstNonEmpty(strings.TrimSpace(policy.RenderVersion), defaultRenderCacheRenderVersion)
	if policy.FreshTTL <= 0 {
		policy.FreshTTL = 30 * time.Second
	}
	if policy.StaleTTL < 0 {
		policy.StaleTTL = 0
	}
	if policy.MaxCaptureBodySize <= 0 {
		policy.MaxCaptureBodySize = router.DefaultMaxCapturedBodySize
	}
	if len(policy.CacheableMethods) == 0 {
		policy.CacheableMethods = []string{http.MethodGet, http.MethodHead}
	} else {
		policy.CacheableMethods = normalizeMethodList(policy.CacheableMethods)
	}
	if len(policy.CacheableStatuses) == 0 {
		policy.CacheableStatuses = []int{http.StatusOK}
	} else {
		policy.CacheableStatuses = normalizeStatusList(policy.CacheableStatuses)
	}
	policy.QueryAllowlist = primitives.NormalizeUniqueStringSliceEmpty(policy.QueryAllowlist)
	policy.AuthCookieNames = primitives.NormalizeUniqueStringSliceEmpty(policy.AuthCookieNames)
	if len(policy.HeaderAllowlist) == 0 {
		policy.HeaderAllowlist = []string{"Content-Type", "Cache-Control", "ETag", "Last-Modified"}
	} else {
		policy.HeaderAllowlist = normalizeHeaderList(policy.HeaderAllowlist)
	}
	policy.BypassPredicates = append([]RenderCacheBypassPredicate{}, policy.BypassPredicates...)
	return policy
}

func normalizeMethodList(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.ToUpper(strings.TrimSpace(value))
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	return out
}

func normalizeStatusList(values []int) []int {
	out := make([]int, 0, len(values))
	seen := map[int]bool{}
	for _, value := range values {
		if value <= 0 || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func normalizeHeaderList(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		value = http.CanonicalHeaderKey(strings.TrimSpace(value))
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func renderCacheStoreBackendKind(store RenderCacheStore) string {
	if store == nil {
		return ""
	}
	if describer, ok := store.(RenderCacheBackendDescriber); ok {
		return strings.ToLower(strings.TrimSpace(describer.RenderCacheBackendKind()))
	}
	return ""
}

func renderCacheStoreHasDeclaredBackendKind(store RenderCacheStore) bool {
	if store == nil {
		return false
	}
	describer, ok := store.(RenderCacheBackendDescriber)
	if !ok {
		return false
	}
	return strings.TrimSpace(describer.RenderCacheBackendKind()) != ""
}

func renderCacheStoreIsMemoryBackend(store RenderCacheStore) bool {
	return renderCacheStoreBackendKind(store) == "memory"
}
