package site

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"maps"
	neturl "net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	"github.com/goliatone/go-cache/stores/memory"
	"github.com/goliatone/go-cache/stores/valkey"
	vk "github.com/valkey-io/valkey-go"
)

const (
	RenderCacheBackendMemory = "memory"
	RenderCacheBackendValkey = "valkey"

	RenderCacheDebugPanelID       = "site-render-cache"
	RenderCacheDebugPanelSnapshot = "site-render-cache"

	RenderCacheAllSiteTag = "site:render"
	RenderCacheKeyPrefix  = "site-render:"

	renderCacheDebugOperationsCap = 100
	renderCacheDebugKeysCap       = 100
	renderCacheDebugErrorsCap     = 50
	renderCacheDebugReasonsCap    = 32
)

var (
	renderCacheURLUserinfoPattern         = regexp.MustCompile(`(?i)([a-z][a-z0-9+.-]*://)([^/\s?#"'<>@]*@)`)
	renderCacheCredentialQueryPattern     = regexp.MustCompile(`(?i)([?&](?:password|pass|token|access_token|refresh_token|api_key|client_secret|auth|authorization)=)[^&\s"'<>]+`)
	errRenderCacheInvalidConfiguration    = errors.New("site render cache configuration is invalid")
	errRenderCacheUnsupportedBackend      = errors.New("site render cache backend must be one of memory|valkey")
	defaultRenderCacheValkeyAddress       = "127.0.0.1:6379"
	defaultRenderCacheValkeyNamespace     = "site-render-cache"
	defaultRenderCacheValkeyDialKeepAlive = 30 * time.Second
)

type RenderCacheConfig struct {
	Enabled            bool
	Backend            string
	FreshTTL           time.Duration
	StaleTTL           time.Duration
	ExpirationMode     RenderCacheExpirationMode
	RenderVersion      string
	Namespace          string
	DebugHeaders       bool
	DebugKeys          bool
	FailClosed         bool
	RequireTagIndex    bool
	MaxCaptureBodySize int64
	Valkey             RenderCacheValkeyConfig
}

type RenderCacheValkeyConfig struct {
	URL           string
	Address       string
	Username      string
	Password      string
	DB            int
	Namespace     string
	TLSEnabled    bool
	TLSSkipVerify bool
}

type RenderCacheRuntime struct {
	Config           RenderCacheConfig
	Store            RenderCacheStore
	Generations      RenderCacheGenerationStore
	Policy           RenderCachePolicy
	Diagnostic       RenderCacheStartupDiagnostic
	Observer         *RenderCacheDebugObserver
	RequestObservers []RenderCacheRequestObserver
}

type RenderCacheStartupDiagnostic struct {
	Configured bool
	Active     bool
	Backend    string
	FailClosed bool
	Error      string
	ErrorKind  string
	RecordedAt time.Time
}

type renderCacheInvalidConfigError struct {
	field string
	err   error
}

func (e *renderCacheInvalidConfigError) Error() string {
	if e == nil || strings.TrimSpace(e.field) == "" {
		return errRenderCacheInvalidConfiguration.Error()
	}
	return e.field + " is invalid"
}

func (e *renderCacheInvalidConfigError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.err
}

type renderCacheBackendStore struct {
	RenderCacheStore
	kind string
}

type renderCacheBackendStoreWithClose struct {
	*renderCacheBackendStore
	closeFn func()
}

type renderCacheBackendStoreWithRenewal struct {
	*renderCacheBackendStore
	updater RenderCacheSetIfPresentStore
}

type renderCacheBackendStoreWithCloseAndRenewal struct {
	*renderCacheBackendStoreWithClose
	updater RenderCacheSetIfPresentStore
}

func (s *renderCacheBackendStore) RenderCacheBackendKind() string {
	if s == nil {
		return ""
	}
	return s.kind
}

func (s *renderCacheBackendStore) AddTagsForKey(ctx context.Context, key string, tags []string) error {
	invalidator, ok := s.RenderCacheStore.(RenderCacheTagInvalidator)
	if !ok || invalidator == nil {
		return fmt.Errorf("site render cache backend %q does not support tag indexing", s.kind)
	}
	return invalidator.AddTagsForKey(ctx, key, tags)
}

func (s *renderCacheBackendStore) InvalidateTags(ctx context.Context, tags []string) error {
	invalidator, ok := s.RenderCacheStore.(RenderCacheTagInvalidator)
	if !ok || invalidator == nil {
		return fmt.Errorf("site render cache backend %q does not support tag invalidation", s.kind)
	}
	return invalidator.InvalidateTags(ctx, tags)
}

func (s *renderCacheBackendStore) DeleteByKeyPrefix(ctx context.Context, prefix string) error {
	invalidator, ok := s.RenderCacheStore.(RenderCachePrefixInvalidator)
	if !ok || invalidator == nil {
		return fmt.Errorf("site render cache backend %q does not support prefix invalidation", s.kind)
	}
	return invalidator.DeleteByKeyPrefix(ctx, prefix)
}

func (s *renderCacheBackendStoreWithRenewal) SetIfPresent(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) (bool, error) {
	return s.updater.SetIfPresent(ctx, key, value, ttl)
}

func (s *renderCacheBackendStoreWithCloseAndRenewal) SetIfPresent(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) (bool, error) {
	return s.updater.SetIfPresent(ctx, key, value, ttl)
}

func (s *renderCacheBackendStoreWithClose) Close() error {
	if s == nil || s.RenderCacheStore == nil {
		return nil
	}
	var err error
	if closer, ok := s.RenderCacheStore.(interface{ Close() error }); ok && closer != nil {
		err = closer.Close()
	}
	if s.closeFn != nil {
		s.closeFn()
	}
	return err
}

func NewRenderCacheRuntime(ctx context.Context, cfg RenderCacheConfig, policy RenderCachePolicy) (*RenderCacheRuntime, error) {
	_ = ctx
	policy = normalizeRenderCachePolicy(policy)
	cfg = normalizeRenderCacheRuntimeConfig(cfg, policy)
	if modeErr := ValidateRenderCachePolicy(RenderCachePolicy{ExpirationMode: cfg.ExpirationMode}); modeErr != nil {
		err := &renderCacheInvalidConfigError{field: "site.render_cache.expiration_mode", err: modeErr}
		diagnostic := RenderCacheStartupDiagnostic{
			Configured: cfg.Enabled,
			Backend:    cfg.Backend,
			FailClosed: cfg.FailClosed,
			Error:      sanitizeRenderCacheStartupError(cfg, err),
			ErrorKind:  "invalid_configuration",
			RecordedAt: time.Now().UTC(),
		}
		return &RenderCacheRuntime{Config: cfg, Policy: policy, Diagnostic: diagnostic}, err
	}
	policy = applyRenderCacheRuntimeConfigToPolicy(cfg, policy)
	diagnostic := RenderCacheStartupDiagnostic{
		Configured: cfg.Enabled,
		Backend:    cfg.Backend,
		FailClosed: cfg.FailClosed,
		RecordedAt: time.Now().UTC(),
	}
	runtime := &RenderCacheRuntime{
		Config:     cfg,
		Policy:     policy,
		Diagnostic: diagnostic,
	}
	if !cfg.Enabled {
		return runtime, nil
	}
	store, generations, err := buildRenderCacheStore(cfg)
	if err != nil {
		diagnostic.Error = sanitizeRenderCacheStartupError(cfg, err)
		diagnostic.ErrorKind = "store_initialization_failed"
		if isRenderCacheInvalidConfigError(err) {
			diagnostic.ErrorKind = "invalid_configuration"
			runtime.Diagnostic = diagnostic
			return runtime, err
		}
		runtime.Diagnostic = diagnostic
		if !cfg.FailClosed {
			return runtime, nil
		}
		return runtime, err
	}
	runtime.Observer = NewRenderCacheDebugObserver(store, cfg)
	runtime.Generations = generations
	if runtime.Observer != nil {
		runtime.RequestObservers = composeRenderCacheRequestObservers([]RenderCacheRequestObserver{runtime.Observer})
		runtime.Store = NewRenderCacheDebugObservedStore(runtime.Observer)
	} else {
		runtime.Store = store
	}
	diagnostic.Active = runtime.Store != nil
	runtime.Diagnostic = diagnostic
	return runtime, nil
}

func normalizeRenderCacheRuntimeConfig(cfg RenderCacheConfig, policy RenderCachePolicy) RenderCacheConfig {
	cfg.Backend = strings.ToLower(strings.TrimSpace(cfg.Backend))
	if cfg.Backend == "" {
		cfg.Backend = RenderCacheBackendMemory
	}
	if cfg.FreshTTL <= 0 {
		cfg.FreshTTL = policy.FreshTTL
	}
	if cfg.StaleTTL < 0 {
		cfg.StaleTTL = 0
	}
	if strings.TrimSpace(string(cfg.ExpirationMode)) == "" {
		cfg.ExpirationMode = policy.ExpirationMode
	}
	cfg.ExpirationMode = normalizeRenderCacheExpirationMode(cfg.ExpirationMode)
	if cfg.RenderVersion == "" {
		cfg.RenderVersion = strings.TrimSpace(policy.RenderVersion)
	}
	if cfg.Namespace == "" {
		cfg.Namespace = strings.TrimSpace(policy.SiteNamespace)
	}
	if cfg.MaxCaptureBodySize <= 0 {
		cfg.MaxCaptureBodySize = policy.MaxCaptureBodySize
	}
	if cfg.Valkey.Address == "" {
		cfg.Valkey.Address = defaultRenderCacheValkeyAddress
	}
	if cfg.Valkey.Namespace == "" {
		cfg.Valkey.Namespace = firstNonEmpty(cfg.Namespace, defaultRenderCacheValkeyNamespace)
	}
	return cfg
}

func applyRenderCacheRuntimeConfigToPolicy(cfg RenderCacheConfig, policy RenderCachePolicy) RenderCachePolicy {
	policy.Enabled = cfg.Enabled
	policy.FreshTTL = cfg.FreshTTL
	policy.StaleTTL = cfg.StaleTTL
	policy.ExpirationMode = cfg.ExpirationMode
	policy.RenderVersion = strings.TrimSpace(firstNonEmpty(cfg.RenderVersion, policy.RenderVersion))
	policy.SiteNamespace = strings.TrimSpace(firstNonEmpty(cfg.Namespace, policy.SiteNamespace))
	policy.DebugHeaders = cfg.DebugHeaders
	policy.DebugKeys = cfg.DebugKeys
	policy.FailClosed = cfg.FailClosed
	policy.RequireTagIndex = cfg.RequireTagIndex
	policy.MaxCaptureBodySize = cfg.MaxCaptureBodySize
	return normalizeRenderCachePolicy(policy)
}

func buildRenderCacheStore(cfg RenderCacheConfig) (RenderCacheStore, RenderCacheGenerationStore, error) {
	if !cfg.Enabled {
		return nil, nil, nil
	}
	switch cfg.Backend {
	case RenderCacheBackendMemory:
		store, err := memory.NewStore[string, RenderedSiteResponse]()
		if err != nil {
			return nil, nil, fmt.Errorf("site render cache memory store: %w", err)
		}
		backend := &renderCacheBackendStore{RenderCacheStore: store, kind: RenderCacheBackendMemory}
		if updater, ok := any(store).(RenderCacheSetIfPresentStore); ok && updater != nil {
			return &renderCacheBackendStoreWithRenewal{renderCacheBackendStore: backend, updater: updater}, newMemoryRenderCacheGenerationStore(), nil
		}
		return backend, newMemoryRenderCacheGenerationStore(), nil
	case RenderCacheBackendValkey:
		clientOption, err := buildRenderCacheValkeyClientOption(cfg.Valkey)
		if err != nil {
			return nil, nil, err
		}
		client, err := vk.NewClient(clientOption)
		if err != nil {
			return nil, nil, fmt.Errorf("site render cache valkey client: %w", err)
		}
		store, err := valkey.NewStore[string, RenderedSiteResponse](
			valkey.WithNamespace[string, RenderedSiteResponse](cfg.Valkey.Namespace),
			valkey.WithClient[string, RenderedSiteResponse](client),
		)
		if err != nil {
			client.Close()
			return nil, nil, fmt.Errorf("site render cache valkey store: %w", err)
		}
		backend := &renderCacheBackendStoreWithClose{
			renderCacheBackendStore: &renderCacheBackendStore{RenderCacheStore: store, kind: RenderCacheBackendValkey},
			closeFn:                 client.Close,
		}
		generations := &valkeyRenderCacheGenerationStore{client: client, namespace: cfg.Valkey.Namespace}
		if updater, ok := any(store).(RenderCacheSetIfPresentStore); ok && updater != nil {
			return &renderCacheBackendStoreWithCloseAndRenewal{renderCacheBackendStoreWithClose: backend, updater: updater}, generations, nil
		}
		return backend, generations, nil
	default:
		return nil, nil, errRenderCacheUnsupportedBackend
	}
}

func buildRenderCacheValkeyClientOption(cfg RenderCacheValkeyConfig) (vk.ClientOption, error) {
	var option vk.ClientOption
	if rawURL := strings.TrimSpace(cfg.URL); rawURL != "" {
		parsed, err := vk.ParseURL(rawURL)
		if err != nil {
			return option, &renderCacheInvalidConfigError{field: "site.render_cache.valkey.url", err: err}
		}
		option = parsed
	} else {
		address := strings.TrimSpace(cfg.Address)
		if address == "" {
			address = defaultRenderCacheValkeyAddress
		}
		option.InitAddress = []string{address}
	}
	if username := strings.TrimSpace(cfg.Username); username != "" {
		option.Username = username
	}
	if password := strings.TrimSpace(cfg.Password); password != "" {
		option.Password = password
	}
	if cfg.DB > 0 {
		option.SelectDB = cfg.DB
	}
	if cfg.TLSEnabled && option.TLSConfig == nil {
		option.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	if cfg.TLSSkipVerify {
		if option.TLSConfig == nil {
			option.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
		}
		option.TLSConfig.InsecureSkipVerify = true
	}
	option.DisableCache = true
	option.ForceSingleClient = true
	option.Dialer.KeepAlive = defaultRenderCacheValkeyDialKeepAlive
	return option, nil
}

func sanitizeRenderCacheStartupError(cfg RenderCacheConfig, err error) string {
	if err == nil {
		return ""
	}
	message := err.Error()
	if rawURL := strings.TrimSpace(cfg.Valkey.URL); rawURL != "" {
		message = strings.ReplaceAll(message, rawURL, sanitizeRenderCacheURL(rawURL))
	}
	message = replaceRenderCacheCredentialValue(message, cfg.Valkey.Password)
	message = replaceRenderCacheCredentialValue(message, cfg.Valkey.Username)
	return scrubRenderCacheCredentialText(message)
}

func isRenderCacheInvalidConfigError(err error) bool {
	if errors.Is(err, errRenderCacheUnsupportedBackend) {
		return true
	}
	var invalidConfig *renderCacheInvalidConfigError
	return errors.As(err, &invalidConfig)
}

func sanitizeRenderCacheURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if parsed, err := neturl.Parse(raw); err == nil {
		parsed.User = nil
		parsed.RawQuery = ""
		parsed.Fragment = ""
		return parsed.String()
	}
	scheme, rest, ok := strings.Cut(raw, "://")
	if !ok {
		return "[redacted-url]"
	}
	rest = sanitizeRenderCacheMalformedURLUserinfo(rest)
	if queryIndex := strings.Index(rest, "?"); queryIndex >= 0 {
		rest = rest[:queryIndex] + "?[redacted]"
	}
	if fragmentIndex := strings.Index(rest, "#"); fragmentIndex >= 0 {
		rest = rest[:fragmentIndex]
	}
	return scheme + "://" + rest
}

func sanitizeRenderCacheMalformedURLUserinfo(rest string) string {
	authEnd := len(rest)
	if index := strings.IndexAny(rest, "/?#"); index >= 0 {
		authEnd = index
	}
	if at := strings.LastIndex(rest[:authEnd], "@"); at >= 0 {
		return rest[at+1:]
	}
	return rest
}

func replaceRenderCacheCredentialValue(message string, value string) string {
	credential := strings.TrimSpace(value)
	if credential == "" {
		return message
	}
	return strings.ReplaceAll(message, credential, "[redacted]")
}

func scrubRenderCacheCredentialText(message string) string {
	message = renderCacheURLUserinfoPattern.ReplaceAllString(message, "${1}")
	message = renderCacheCredentialQueryPattern.ReplaceAllString(message, "${1}[redacted]")
	return message
}

type RenderCacheDebugObserver struct {
	store           RenderCacheStore
	cfg             RenderCacheConfig
	mu              sync.Mutex
	counters        RenderCacheDebugCounters
	requestCounters RenderCacheDebugRequestCounters

	recentOperations []RenderCacheDebugOperation
	observedKeys     []RenderCacheDebugKey
	observedKeyIndex map[string]int
	recentErrors     []RenderCacheDebugError
	latestCached     *RenderCacheDebugCachedResponse
	lastCommand      *RenderCacheDebugCommand
}

type RenderCacheDebugCounters struct {
	Lookups       int64    `json:"lookups"`
	Hits          int64    `json:"hits"`
	Misses        int64    `json:"misses"`
	Writes        int64    `json:"writes"`
	Deletes       int64    `json:"deletes"`
	Invalidations int64    `json:"invalidations"`
	Errors        int64    `json:"errors"`
	Clears        int64    `json:"clears"`
	HitRatio      *float64 `json:"hit_ratio,omitempty"`
}

// RenderCacheDebugRequestCounters describes request-level public HTML cache
// decisions. It is separate from RenderCacheDebugCounters because bypassed
// requests intentionally perform no backend operation.
type RenderCacheDebugRequestCounters struct {
	Evaluated        int64            `json:"evaluated"`
	Eligible         int64            `json:"eligible"`
	Bypassed         int64            `json:"bypassed"`
	Terminal         int64            `json:"terminal"`
	ServedHits       int64            `json:"served_hits"`
	ServedStale      int64            `json:"served_stale"`
	StoredResponses  int64            `json:"stored_responses"`
	RenderedUncached int64            `json:"rendered_uncached"`
	Failed           int64            `json:"failed"`
	BypassReasons    map[string]int64 `json:"bypass_reasons"`
	ReasonCounts     map[string]int64 `json:"reason_counts"`
}

type RenderCacheDebugKey struct {
	ObservedAt   time.Time `json:"observed_at"`
	KeyRedacted  bool      `json:"key_redacted"`
	KeyHash      string    `json:"key_hash"`
	RawKey       string    `json:"raw_key,omitempty"`
	RouteHint    string    `json:"route_hint,omitempty"`
	RenderPrefix bool      `json:"render_prefix"`
}

type RenderCacheDebugOperation struct {
	Timestamp   time.Time            `json:"timestamp"`
	Operation   string               `json:"operation"`
	Backend     string               `json:"backend"`
	Outcome     string               `json:"outcome"`
	Key         *RenderCacheDebugKey `json:"key,omitempty"`
	TTLSeconds  int64                `json:"ttl_seconds,omitempty"`
	TargetCount int                  `json:"target_count,omitempty"`
	Mode        string               `json:"mode,omitempty"`
	Message     string               `json:"message,omitempty"`
}

type RenderCacheDebugError struct {
	Timestamp time.Time            `json:"timestamp"`
	Operation string               `json:"operation"`
	Backend   string               `json:"backend"`
	Key       *RenderCacheDebugKey `json:"key,omitempty"`
	Message   string               `json:"message"`
}

type RenderCacheDebugCachedResponse struct {
	Timestamp   time.Time            `json:"timestamp"`
	Status      int                  `json:"status"`
	ContentType string               `json:"content_type,omitempty"`
	BodySize    int                  `json:"body_size"`
	HeaderCount int                  `json:"header_count"`
	TagCount    int                  `json:"tag_count"`
	FreshUntil  *time.Time           `json:"fresh_until,omitempty"`
	StaleUntil  *time.Time           `json:"stale_until,omitempty"`
	TTLSeconds  int64                `json:"ttl_seconds,omitempty"`
	TTLClass    string               `json:"ttl_class,omitempty"`
	Key         *RenderCacheDebugKey `json:"key,omitempty"`
}

type RenderCacheDebugCommand struct {
	Timestamp   time.Time `json:"timestamp"`
	Command     string    `json:"command"`
	Mode        string    `json:"mode"`
	Backend     string    `json:"backend"`
	Outcome     string    `json:"outcome"`
	TargetCount int       `json:"target_count"`
	Message     string    `json:"message,omitempty"`
}

type RenderCacheDebugSnapshot struct {
	Configured       bool                            `json:"configured"`
	Active           bool                            `json:"active"`
	Backend          string                          `json:"backend"`
	Status           string                          `json:"status"`
	Scope            string                          `json:"scope"`
	ObservedBy       string                          `json:"observed_by"`
	Engagement       string                          `json:"engagement"`
	StartupError     *RenderCacheStartupError        `json:"startup_error,omitempty"`
	Config           RenderCacheDebugConfig          `json:"config"`
	Capabilities     RenderCacheDebugCapabilities    `json:"capabilities"`
	Counters         RenderCacheDebugCounters        `json:"counters"`
	RequestCounters  RenderCacheDebugRequestCounters `json:"request_counters"`
	LatestCached     *RenderCacheDebugCachedResponse `json:"latest_cached,omitempty"`
	ObservedKeys     []RenderCacheDebugKey           `json:"observed_keys"`
	RecentOperations []RenderCacheDebugOperation     `json:"recent_operations"`
	RecentErrors     []RenderCacheDebugError         `json:"recent_errors"`
	LastCommand      *RenderCacheDebugCommand        `json:"last_command,omitempty"`
}

type RenderCacheStartupError struct {
	Timestamp  time.Time `json:"timestamp"`
	Backend    string    `json:"backend"`
	ErrorKind  string    `json:"error_kind"`
	Message    string    `json:"message"`
	FailClosed bool      `json:"fail_closed"`
}

type RenderCacheDebugConfig struct {
	Enabled            bool                      `json:"enabled"`
	Backend            string                    `json:"backend"`
	FreshTTL           string                    `json:"fresh_ttl"`
	StaleTTL           string                    `json:"stale_ttl"`
	ExpirationMode     RenderCacheExpirationMode `json:"expiration_mode"`
	RenderVersion      string                    `json:"render_version"`
	Namespace          string                    `json:"namespace"`
	DebugHeaders       bool                      `json:"debug_headers"`
	DebugKeys          bool                      `json:"debug_keys"`
	FailClosed         bool                      `json:"fail_closed"`
	RequireTagIndex    bool                      `json:"require_tag_index"`
	MaxCaptureBodySize int64                     `json:"max_capture_body_size"`
	Valkey             RenderCacheValkeyDebugCfg `json:"valkey"`
}

type RenderCacheValkeyDebugCfg struct {
	Address       string `json:"address,omitempty"`
	Namespace     string `json:"namespace,omitempty"`
	URLConfigured bool   `json:"url_configured"`
	UsernameSet   bool   `json:"username_set"`
	PasswordSet   bool   `json:"password_set"`
	DB            int    `json:"db"`
	TLSEnabled    bool   `json:"tls_enabled"`
	TLSSkipVerify bool   `json:"tls_skip_verify"`
}

type RenderCacheDebugCapabilities struct {
	ConditionalUpdate         bool `json:"conditional_update"`
	TagInvalidation           bool `json:"tag_invalidation"`
	PrefixInvalidation        bool `json:"prefix_invalidation"`
	Close                     bool `json:"close"`
	BackendDescriptor         bool `json:"backend_descriptor"`
	AppWideTagClearPreferred  bool `json:"app_wide_tag_clear_preferred"`
	ProcessLocalObservedKeys  bool `json:"process_local_observed_keys"`
	BackendKeyScanningEnabled bool `json:"backend_key_scanning_enabled"`
}

type renderCacheDebugPanel struct {
	runtime *RenderCacheRuntime
	mu      sync.Mutex

	lastCommand  *RenderCacheDebugCommand
	recentErrors []RenderCacheDebugError
}

type RenderCacheDebugObservedStore interface {
	RenderCacheDebugObserver() *RenderCacheDebugObserver
}

func NewRenderCacheDebugObserver(store RenderCacheStore, cfg RenderCacheConfig) *RenderCacheDebugObserver {
	if store == nil {
		return nil
	}
	return &RenderCacheDebugObserver{
		store: store,
		cfg:   cfg,
		requestCounters: RenderCacheDebugRequestCounters{
			BypassReasons: map[string]int64{renderCacheReasonHostBypass: 0},
			ReasonCounts:  map[string]int64{renderCacheReasonHostBypass: 0},
		},
		observedKeyIndex: map[string]int{},
	}
}

func (s *RenderCacheDebugObserver) RenderCacheDebugObserver() *RenderCacheDebugObserver {
	return s
}

// ObserveRenderCacheRequest records bounded request-level cache decisions while
// store operations continue to be recorded by the decorated RenderCacheStore.
func (s *RenderCacheDebugObserver) ObserveRenderCacheRequest(_ context.Context, observation RenderCacheRequestObservation) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.requestCounters.BypassReasons == nil {
		s.requestCounters.BypassReasons = map[string]int64{}
	}
	if s.requestCounters.ReasonCounts == nil {
		s.requestCounters.ReasonCounts = map[string]int64{}
	}
	reason := normalizeRenderCacheReasonToken(observation.Reason)
	switch observation.Phase {
	case RenderCacheRequestPhaseEvaluated:
		s.requestCounters.Evaluated++
		switch observation.Outcome {
		case RenderCacheRequestOutcomeEligible:
			s.requestCounters.Eligible++
		case RenderCacheRequestOutcomeBypassed:
			s.requestCounters.Bypassed++
			incrementBoundedRenderCacheReason(s.requestCounters.BypassReasons, reason)
		}
	case RenderCacheRequestPhaseTerminal:
		s.requestCounters.Terminal++
		switch observation.Outcome {
		case RenderCacheRequestOutcomeHit:
			s.requestCounters.ServedHits++
		case RenderCacheRequestOutcomeStale:
			s.requestCounters.ServedStale++
		case RenderCacheRequestOutcomeStored:
			s.requestCounters.StoredResponses++
		case RenderCacheRequestOutcomeRenderedUncached:
			s.requestCounters.RenderedUncached++
		case RenderCacheRequestOutcomeFailed:
			s.requestCounters.Failed++
		}
		incrementBoundedRenderCacheReason(s.requestCounters.ReasonCounts, reason)
	}
}

func incrementBoundedRenderCacheReason(counts map[string]int64, reason string) {
	if counts == nil || reason == "" {
		return
	}
	if _, ok := counts[reason]; ok {
		counts[reason]++
		return
	}
	if len(counts) < renderCacheDebugReasonsCap {
		counts[reason] = 1
		return
	}
	if renderCacheBuiltInObservationReason(reason) {
		for existing, count := range counts {
			if renderCacheBuiltInObservationReason(existing) {
				continue
			}
			delete(counts, existing)
			counts[renderCacheReasonHostBypass] += count
			counts[reason] = 1
			return
		}
	}
	counts[renderCacheReasonHostBypass]++
}

func cloneRenderCacheDebugRequestCounters(in RenderCacheDebugRequestCounters) RenderCacheDebugRequestCounters {
	in.BypassReasons = maps.Clone(in.BypassReasons)
	in.ReasonCounts = maps.Clone(in.ReasonCounts)
	if in.BypassReasons == nil {
		in.BypassReasons = map[string]int64{}
	}
	if in.ReasonCounts == nil {
		in.ReasonCounts = map[string]int64{}
	}
	return in
}

func renderCacheDebugEngagement(counters RenderCacheDebugRequestCounters) string {
	switch {
	case counters.Failed > 0:
		return "degraded"
	case counters.Evaluated == 0:
		return "no_traffic"
	case counters.Eligible == 0 && counters.Bypassed > 0:
		return "all_bypassed"
	case counters.ServedHits > 0 || counters.ServedStale > 0:
		return "engaged"
	default:
		return "warming"
	}
}

type renderCacheDebugTagMethods struct {
	observer *RenderCacheDebugObserver
}

func (m renderCacheDebugTagMethods) AddTagsForKey(ctx context.Context, key string, tags []string) error {
	return m.observer.addTagsForKey(ctx, key, tags)
}

func (m renderCacheDebugTagMethods) InvalidateTags(ctx context.Context, tags []string) error {
	return m.observer.invalidateTags(ctx, tags)
}

type renderCacheDebugPrefixMethods struct {
	observer *RenderCacheDebugObserver
}

func (m renderCacheDebugPrefixMethods) DeleteByKeyPrefix(ctx context.Context, prefix string) error {
	return m.observer.deleteByKeyPrefix(ctx, prefix)
}

type renderCacheDebugBackendMethods struct {
	observer *RenderCacheDebugObserver
}

func (m renderCacheDebugBackendMethods) RenderCacheBackendKind() string {
	if m.observer == nil || m.observer.store == nil {
		return ""
	}
	describer, ok := m.observer.store.(RenderCacheBackendDescriber)
	if !ok || describer == nil {
		return ""
	}
	return describer.RenderCacheBackendKind()
}

type renderCacheDebugCloseMethods struct {
	observer *RenderCacheDebugObserver
}

type renderCacheDebugRenewalMethods struct {
	observer *RenderCacheDebugObserver
}

func (m renderCacheDebugRenewalMethods) SetIfPresent(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) (bool, error) {
	return m.observer.setIfPresent(ctx, key, value, ttl)
}

func (m renderCacheDebugCloseMethods) Close() error {
	if m.observer == nil || m.observer.store == nil {
		return nil
	}
	closer, ok := m.observer.store.(interface{ Close() error })
	if !ok || closer == nil {
		return nil
	}
	return closer.Close()
}

type renderCacheDebugWrapperT struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
}
type renderCacheDebugWrapperP struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
}
type renderCacheDebugWrapperB struct {
	*RenderCacheDebugObserver
	renderCacheDebugBackendMethods
}
type renderCacheDebugWrapperC struct {
	*RenderCacheDebugObserver
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperTP struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
}
type renderCacheDebugWrapperTB struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugBackendMethods
}
type renderCacheDebugWrapperTC struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperPB struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
}
type renderCacheDebugWrapperPC struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperBC struct {
	*RenderCacheDebugObserver
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperTPB struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
}
type renderCacheDebugWrapperTPC struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperTBC struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperPBC struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperTPBC struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
}
type renderCacheDebugWrapperR struct {
	*RenderCacheDebugObserver
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperPR struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTPR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperBR struct {
	*RenderCacheDebugObserver
	renderCacheDebugBackendMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTBR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugBackendMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperPBR struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTPBR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperPCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTPCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperBCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTBCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperPBCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}
type renderCacheDebugWrapperTPBCR struct {
	*RenderCacheDebugObserver
	renderCacheDebugTagMethods
	renderCacheDebugPrefixMethods
	renderCacheDebugBackendMethods
	renderCacheDebugCloseMethods
	renderCacheDebugRenewalMethods
}

type renderCacheDebugWrapperParts struct {
	observer    *RenderCacheDebugObserver
	tag         renderCacheDebugTagMethods
	prefix      renderCacheDebugPrefixMethods
	backend     renderCacheDebugBackendMethods
	closeMethod renderCacheDebugCloseMethods
	renewal     renderCacheDebugRenewalMethods
}

type renderCacheDebugWrapperFactory func(renderCacheDebugWrapperParts) RenderCacheStore

var renderCacheDebugWrapperFactories = [...]renderCacheDebugWrapperFactory{
	func(parts renderCacheDebugWrapperParts) RenderCacheStore { return parts.observer },
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperT{parts.observer, parts.tag}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperP{parts.observer, parts.prefix}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTP{parts.observer, parts.tag, parts.prefix}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperB{parts.observer, parts.backend}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTB{parts.observer, parts.tag, parts.backend}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPB{parts.observer, parts.prefix, parts.backend}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPB{parts.observer, parts.tag, parts.prefix, parts.backend}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperC{parts.observer, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTC{parts.observer, parts.tag, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPC{parts.observer, parts.prefix, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPC{parts.observer, parts.tag, parts.prefix, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperBC{parts.observer, parts.backend, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTBC{parts.observer, parts.tag, parts.backend, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPBC{parts.observer, parts.prefix, parts.backend, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPBC{parts.observer, parts.tag, parts.prefix, parts.backend, parts.closeMethod}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperR{parts.observer, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTR{parts.observer, parts.tag, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPR{parts.observer, parts.prefix, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPR{parts.observer, parts.tag, parts.prefix, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperBR{parts.observer, parts.backend, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTBR{parts.observer, parts.tag, parts.backend, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPBR{parts.observer, parts.prefix, parts.backend, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPBR{parts.observer, parts.tag, parts.prefix, parts.backend, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperCR{parts.observer, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTCR{parts.observer, parts.tag, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPCR{parts.observer, parts.prefix, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPCR{parts.observer, parts.tag, parts.prefix, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperBCR{parts.observer, parts.backend, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTBCR{parts.observer, parts.tag, parts.backend, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperPBCR{parts.observer, parts.prefix, parts.backend, parts.closeMethod, parts.renewal}
	},
	func(parts renderCacheDebugWrapperParts) RenderCacheStore {
		return &renderCacheDebugWrapperTPBCR{parts.observer, parts.tag, parts.prefix, parts.backend, parts.closeMethod, parts.renewal}
	},
}

const (
	renderCacheDebugCapabilityTag = 1 << iota
	renderCacheDebugCapabilityPrefix
	renderCacheDebugCapabilityBackend
	renderCacheDebugCapabilityClose
	renderCacheDebugCapabilityRenewal
)

func NewRenderCacheDebugObservedStore(observer *RenderCacheDebugObserver) RenderCacheStore {
	if observer == nil {
		return nil
	}
	parts := renderCacheDebugWrapperParts{
		observer:    observer,
		tag:         renderCacheDebugTagMethods{observer: observer},
		prefix:      renderCacheDebugPrefixMethods{observer: observer},
		backend:     renderCacheDebugBackendMethods{observer: observer},
		closeMethod: renderCacheDebugCloseMethods{observer: observer},
		renewal:     renderCacheDebugRenewalMethods{observer: observer},
	}
	return renderCacheDebugWrapperFactories[renderCacheDebugCapabilityMask(observer.store)](parts)
}

func renderCacheDebugCapabilityMask(store RenderCacheStore) int {
	mask := 0
	if RenderCacheStoreSupportsTagInvalidation(store) {
		mask |= renderCacheDebugCapabilityTag
	}
	if RenderCacheStoreSupportsPrefixInvalidation(store) {
		mask |= renderCacheDebugCapabilityPrefix
	}
	if RenderCacheStoreSupportsBackendDescriptor(store) {
		mask |= renderCacheDebugCapabilityBackend
	}
	if RenderCacheStoreSupportsClose(store) {
		mask |= renderCacheDebugCapabilityClose
	}
	if RenderCacheStoreSupportsSetIfPresent(store) {
		mask |= renderCacheDebugCapabilityRenewal
	}
	return mask
}

func (s *RenderCacheDebugObserver) Get(ctx context.Context, key string) (RenderedSiteResponse, bool, error) {
	value, ok, err := s.store.Get(ctx, key)
	outcome := "miss"
	if ok {
		outcome = "hit"
	}
	if err != nil {
		outcome = "error"
	}
	s.recordLookup("cache_lookup", key, outcome, 0, value, ok, err)
	return value, ok, err
}

func (s *RenderCacheDebugObserver) Set(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) error {
	err := s.store.Set(ctx, key, value, ttl)
	outcome := "ok"
	if err != nil {
		outcome = "error"
	}
	s.recordWrite("cache_write", key, outcome, ttl, value, err)
	return err
}

func (s *RenderCacheDebugObserver) setIfPresent(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) (bool, error) {
	updater, ok := s.store.(RenderCacheSetIfPresentStore)
	if !ok || updater == nil {
		err := errors.New(renderCacheReasonRenewalUnsupported)
		s.recordWrite("cache_renewal", key, "unsupported", ttl, value, err)
		return false, err
	}
	updated, err := updater.SetIfPresent(ctx, key, value, ttl)
	outcome := "ok"
	if !updated {
		outcome = "missing"
	}
	if err != nil {
		outcome = "error"
	}
	s.recordWrite("cache_renewal", key, outcome, ttl, value, err)
	return updated, err
}

func (s *RenderCacheDebugObserver) Delete(ctx context.Context, key string) error {
	err := s.store.Delete(ctx, key)
	outcome := "ok"
	if err != nil {
		outcome = "error"
	}
	s.recordDelete("cache_delete", key, outcome, err)
	return err
}

func (s *RenderCacheDebugObserver) addTagsForKey(ctx context.Context, key string, tags []string) error {
	invalidator, ok := s.store.(RenderCacheTagInvalidator)
	if !ok || invalidator == nil {
		err := fmt.Errorf("site render cache backend %q does not support tag indexing", RenderCacheBackendKind(s.store))
		s.recordOperation("tag_attachment", key, "unsupported", 0, len(tags), "tag", err.Error(), err)
		return err
	}
	err := invalidator.AddTagsForKey(ctx, key, tags)
	outcome := "ok"
	if err != nil {
		outcome = "error"
	}
	s.recordOperation("tag_attachment", key, outcome, 0, len(tags), "tag", "", err)
	return err
}

func (s *RenderCacheDebugObserver) invalidateTags(ctx context.Context, tags []string) error {
	invalidator, ok := s.store.(RenderCacheTagInvalidator)
	if !ok || invalidator == nil {
		err := fmt.Errorf("site render cache backend %q does not support tag invalidation", RenderCacheBackendKind(s.store))
		s.recordInvalidation("tag_invalidation", "", "unsupported", len(tags), "tag", err.Error(), err)
		return err
	}
	err := invalidator.InvalidateTags(ctx, tags)
	outcome := "ok"
	if err != nil {
		outcome = "error"
	}
	s.recordInvalidation("tag_invalidation", "", outcome, len(tags), "tag", "", err)
	return err
}

func (s *RenderCacheDebugObserver) deleteByKeyPrefix(ctx context.Context, prefix string) error {
	invalidator, ok := s.store.(RenderCachePrefixInvalidator)
	if !ok || invalidator == nil {
		err := fmt.Errorf("site render cache backend %q does not support prefix invalidation", RenderCacheBackendKind(s.store))
		s.recordInvalidation("prefix_invalidation", prefix, "unsupported", 1, "prefix", err.Error(), err)
		return err
	}
	err := invalidator.DeleteByKeyPrefix(ctx, prefix)
	outcome := "ok"
	if err != nil {
		outcome = "error"
	}
	s.recordInvalidation("prefix_invalidation", prefix, outcome, 1, "prefix", "", err)
	return err
}

func (s *RenderCacheDebugObserver) ClearAll(ctx context.Context) RenderCacheDebugCommand {
	backend := "unknown"
	if s != nil {
		backend = RenderCacheBackendKind(s.store)
	}
	command := RenderCacheDebugCommand{
		Timestamp: time.Now().UTC(),
		Command:   "clear",
		Backend:   backend,
	}
	if s == nil || s.store == nil {
		command.Mode = "none"
		command.Outcome = "unsupported"
		command.Message = "site render cache is inactive"
		return command
	}
	if RenderCacheBackendKind(s.store) != RenderCacheBackendMemory {
		if invalidator, ok := s.store.(RenderCacheTagInvalidator); ok && invalidator != nil {
			command.Mode = "tag"
			command.TargetCount = 1
			err := invalidator.InvalidateTags(ctx, []string{RenderCacheAllSiteTag})
			command.Outcome = "ok"
			if err != nil {
				command.Outcome = "error"
				command.Message = err.Error()
			}
			s.recordClear(command, err)
			return command
		}
	}
	if invalidator, ok := s.store.(RenderCachePrefixInvalidator); ok && invalidator != nil {
		command.Mode = "prefix"
		command.TargetCount = 1
		err := invalidator.DeleteByKeyPrefix(ctx, RenderCacheKeyPrefix)
		command.Outcome = "ok"
		if err != nil {
			command.Outcome = "error"
			command.Message = err.Error()
		}
		s.recordClear(command, err)
		return command
	}
	command.Mode = "none"
	command.Outcome = "unsupported"
	command.Message = "site render cache backend does not support tag or prefix invalidation"
	s.recordClear(command, nil)
	return command
}

func (s *RenderCacheDebugObserver) Snapshot(runtime *RenderCacheRuntime) RenderCacheDebugSnapshot {
	if runtime == nil {
		runtime = &RenderCacheRuntime{}
	}
	if s == nil {
		s = &RenderCacheDebugObserver{}
	}
	cfg := runtime.Config
	s.mu.Lock()
	counters := s.counters
	requestCounters := cloneRenderCacheDebugRequestCounters(s.requestCounters)
	if counters.Lookups > 0 {
		ratio := float64(counters.Hits) / float64(counters.Lookups)
		counters.HitRatio = &ratio
	}
	recentOperations := append([]RenderCacheDebugOperation(nil), s.recentOperations...)
	observedKeys := append([]RenderCacheDebugKey(nil), s.observedKeys...)
	recentErrors := append([]RenderCacheDebugError(nil), s.recentErrors...)
	var latestCached *RenderCacheDebugCachedResponse
	if s.latestCached != nil {
		copyValue := *s.latestCached
		latestCached = &copyValue
	}
	var lastCommand *RenderCacheDebugCommand
	if s.lastCommand != nil {
		copyValue := *s.lastCommand
		lastCommand = &copyValue
	}
	s.mu.Unlock()

	backend := RenderCacheBackendKind(s.store)
	status := "healthy"
	if counters.Errors > 0 || requestCounters.Failed > 0 {
		status = "degraded"
	}
	return RenderCacheDebugSnapshot{
		Configured:       cfg.Enabled,
		Active:           s.store != nil,
		Backend:          firstNonEmpty(backend, "unknown"),
		Status:           status,
		Scope:            "process_local",
		ObservedBy:       "current_instance",
		Engagement:       renderCacheDebugEngagement(requestCounters),
		StartupError:     renderCacheStartupErrorFromDiagnostic(runtime.Diagnostic),
		Config:           renderCacheDebugConfigFromConfig(cfg),
		Capabilities:     RenderCacheDebugCapabilitiesForStore(s.store),
		Counters:         counters,
		RequestCounters:  requestCounters,
		LatestCached:     latestCached,
		ObservedKeys:     observedKeys,
		RecentOperations: recentOperations,
		RecentErrors:     recentErrors,
		LastCommand:      lastCommand,
	}
}

func (s *RenderCacheDebugObserver) recordLookup(operation, key, outcome string, ttl time.Duration, value RenderedSiteResponse, cached bool, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters.Lookups++
	switch {
	case err != nil:
		s.counters.Errors++
	case cached:
		s.counters.Hits++
	default:
		s.counters.Misses++
	}
	keyEntry := s.observeKeyLocked(key)
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp:  time.Now().UTC(),
		Operation:  operation,
		Backend:    RenderCacheBackendKind(s.store),
		Outcome:    outcome,
		Key:        keyEntry,
		TTLSeconds: int64(ttl.Seconds()),
	})
	if cached {
		s.latestCached = renderCacheDebugCachedResponseFromValue(keyEntry, value, ttl)
	}
	if err != nil {
		s.appendErrorLocked(operation, keyEntry, err)
	}
}

func (s *RenderCacheDebugObserver) recordWrite(operation, key, outcome string, ttl time.Duration, value RenderedSiteResponse, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters.Writes++
	if err != nil {
		s.counters.Errors++
	}
	keyEntry := s.observeKeyLocked(key)
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp:  time.Now().UTC(),
		Operation:  operation,
		Backend:    RenderCacheBackendKind(s.store),
		Outcome:    outcome,
		Key:        keyEntry,
		TTLSeconds: int64(ttl.Seconds()),
	})
	if err == nil {
		s.latestCached = renderCacheDebugCachedResponseFromValue(keyEntry, value, ttl)
	} else {
		s.appendErrorLocked(operation, keyEntry, err)
	}
}

func (s *RenderCacheDebugObserver) recordDelete(operation, key, outcome string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters.Deletes++
	if err != nil {
		s.counters.Errors++
	}
	keyEntry := s.observeKeyLocked(key)
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp: time.Now().UTC(),
		Operation: operation,
		Backend:   RenderCacheBackendKind(s.store),
		Outcome:   outcome,
		Key:       keyEntry,
	})
	if err != nil {
		s.appendErrorLocked(operation, keyEntry, err)
	}
}

func (s *RenderCacheDebugObserver) recordInvalidation(operation, key, outcome string, targetCount int, mode, message string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters.Invalidations++
	if err != nil {
		s.counters.Errors++
	}
	keyEntry := s.observeKeyLocked(key)
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp:   time.Now().UTC(),
		Operation:   operation,
		Backend:     RenderCacheBackendKind(s.store),
		Outcome:     outcome,
		Key:         keyEntry,
		TargetCount: targetCount,
		Mode:        mode,
		Message:     message,
	})
	if err != nil {
		s.appendErrorLocked(operation, keyEntry, err)
	}
}

func (s *RenderCacheDebugObserver) recordOperation(operation, key, outcome string, ttl time.Duration, targetCount int, mode, message string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.counters.Errors++
	}
	keyEntry := s.observeKeyLocked(key)
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp:   time.Now().UTC(),
		Operation:   operation,
		Backend:     RenderCacheBackendKind(s.store),
		Outcome:     outcome,
		Key:         keyEntry,
		TTLSeconds:  int64(ttl.Seconds()),
		TargetCount: targetCount,
		Mode:        mode,
		Message:     message,
	})
	if err != nil {
		s.appendErrorLocked(operation, keyEntry, err)
	}
}

func (s *RenderCacheDebugObserver) recordClear(command RenderCacheDebugCommand, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters.Clears++
	if err != nil {
		s.counters.Errors++
	}
	s.lastCommand = &command
	s.appendOperationLocked(RenderCacheDebugOperation{
		Timestamp:   command.Timestamp,
		Operation:   "clear",
		Backend:     command.Backend,
		Outcome:     command.Outcome,
		TargetCount: command.TargetCount,
		Mode:        command.Mode,
		Message:     command.Message,
	})
	if err != nil {
		s.appendErrorLocked("clear", nil, err)
	}
}

func (s *RenderCacheDebugObserver) observeKeyLocked(key string) *RenderCacheDebugKey {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	keyHash := renderCacheDebugKeyHash(key)
	if index, ok := s.observedKeyIndex[keyHash]; ok && index >= 0 && index < len(s.observedKeys) {
		s.observedKeys[index].ObservedAt = time.Now().UTC()
		entry := s.observedKeys[index]
		return &entry
	}
	entry := RenderCacheDebugKey{
		ObservedAt:   time.Now().UTC(),
		KeyRedacted:  !s.cfg.DebugKeys,
		KeyHash:      keyHash,
		RouteHint:    renderCacheRouteHint(key),
		RenderPrefix: strings.HasPrefix(key, RenderCacheKeyPrefix),
	}
	if s.cfg.DebugKeys {
		entry.RawKey = key
	}
	s.observedKeys = append(s.observedKeys, entry)
	s.observedKeyIndex[keyHash] = len(s.observedKeys) - 1
	for len(s.observedKeys) > renderCacheDebugKeysCap {
		delete(s.observedKeyIndex, s.observedKeys[0].KeyHash)
		s.observedKeys = s.observedKeys[1:]
		for i := range s.observedKeys {
			s.observedKeyIndex[s.observedKeys[i].KeyHash] = i
		}
	}
	copyEntry := entry
	return &copyEntry
}

func (s *RenderCacheDebugObserver) appendOperationLocked(entry RenderCacheDebugOperation) {
	s.recentOperations = append(s.recentOperations, entry)
	if len(s.recentOperations) > renderCacheDebugOperationsCap {
		s.recentOperations = s.recentOperations[len(s.recentOperations)-renderCacheDebugOperationsCap:]
	}
}

func (s *RenderCacheDebugObserver) appendErrorLocked(operation string, key *RenderCacheDebugKey, err error) {
	if err == nil {
		return
	}
	s.recentErrors = append(s.recentErrors, RenderCacheDebugError{
		Timestamp: time.Now().UTC(),
		Operation: operation,
		Backend:   RenderCacheBackendKind(s.store),
		Key:       key,
		Message:   err.Error(),
	})
	if len(s.recentErrors) > renderCacheDebugErrorsCap {
		s.recentErrors = s.recentErrors[len(s.recentErrors)-renderCacheDebugErrorsCap:]
	}
}

func RegisterRenderCacheDebugPanel(runtime *RenderCacheRuntime) error {
	panel := &renderCacheDebugPanel{runtime: runtime}
	debugregistry.UnregisterPanel(RenderCacheDebugPanelID)
	return debugregistry.RegisterPanel(RenderCacheDebugPanelID, debugregistry.PanelConfig{
		Label:       "Site Render Cache",
		Icon:        "database",
		Span:        2,
		Category:    "site",
		Order:       80,
		SnapshotKey: RenderCacheDebugPanelSnapshot,
		Snapshot: func(ctx context.Context) any {
			return panel.snapshot(ctx)
		},
		Clear: func(ctx context.Context) error {
			panel.clear(ctx)
			return nil
		},
	})
}

func (p *renderCacheDebugPanel) snapshot(_ context.Context) RenderCacheDebugSnapshot {
	if p != nil && p.runtime != nil && p.runtime.Observer != nil {
		return p.runtime.Observer.Snapshot(p.runtime)
	}
	return p.inactiveSnapshot()
}

func (p *renderCacheDebugPanel) clear(ctx context.Context) {
	if p != nil && p.runtime != nil && p.runtime.Observer != nil {
		p.runtime.Observer.ClearAll(ctx)
		return
	}
	if p == nil {
		return
	}
	command := RenderCacheDebugCommand{
		Timestamp: time.Now().UTC(),
		Command:   "clear",
		Mode:      "none",
		Backend:   renderCacheBackendFromRuntime(p.runtime),
		Outcome:   "unsupported",
		Message:   "site render cache is inactive",
	}
	p.mu.Lock()
	p.lastCommand = &command
	p.recentErrors = append(p.recentErrors, RenderCacheDebugError{
		Timestamp: command.Timestamp,
		Operation: "clear",
		Backend:   command.Backend,
		Message:   command.Message,
	})
	if len(p.recentErrors) > renderCacheDebugErrorsCap {
		p.recentErrors = p.recentErrors[len(p.recentErrors)-renderCacheDebugErrorsCap:]
	}
	p.mu.Unlock()
}

func (p *renderCacheDebugPanel) inactiveSnapshot() RenderCacheDebugSnapshot {
	runtime := (*RenderCacheRuntime)(nil)
	if p != nil {
		runtime = p.runtime
	}
	cfg := RenderCacheConfig{}
	diagnostic := RenderCacheStartupDiagnostic{}
	if runtime != nil {
		cfg = runtime.Config
		diagnostic = runtime.Diagnostic
	}
	p.mu.Lock()
	recentErrors := append([]RenderCacheDebugError(nil), p.recentErrors...)
	var lastCommand *RenderCacheDebugCommand
	if p.lastCommand != nil {
		copyValue := *p.lastCommand
		lastCommand = &copyValue
	}
	p.mu.Unlock()
	backend := renderCacheBackendFromConfig(cfg)
	status := "disabled"
	if cfg.Enabled {
		status = "unavailable"
		if diagnostic.Error != "" {
			status = "error"
		}
	}
	return RenderCacheDebugSnapshot{
		Configured:   cfg.Enabled,
		Active:       false,
		Backend:      backend,
		Status:       status,
		Scope:        "process_local",
		ObservedBy:   "current_instance",
		Engagement:   "no_traffic",
		StartupError: renderCacheStartupErrorFromDiagnostic(diagnostic),
		Config:       renderCacheDebugConfigFromConfig(cfg),
		Capabilities: RenderCacheDebugCapabilities{},
		Counters:     RenderCacheDebugCounters{},
		RequestCounters: RenderCacheDebugRequestCounters{
			BypassReasons: map[string]int64{renderCacheReasonHostBypass: 0},
			ReasonCounts:  map[string]int64{renderCacheReasonHostBypass: 0},
		},
		ObservedKeys:     []RenderCacheDebugKey{},
		RecentOperations: []RenderCacheDebugOperation{},
		RecentErrors:     recentErrors,
		LastCommand:      lastCommand,
	}
}

func renderCacheDebugConfigFromConfig(cfg RenderCacheConfig) RenderCacheDebugConfig {
	return RenderCacheDebugConfig{
		Enabled:            cfg.Enabled,
		Backend:            firstNonEmpty(strings.TrimSpace(cfg.Backend), RenderCacheBackendMemory),
		FreshTTL:           cfg.FreshTTL.String(),
		StaleTTL:           cfg.StaleTTL.String(),
		ExpirationMode:     normalizeRenderCacheExpirationMode(cfg.ExpirationMode),
		RenderVersion:      cfg.RenderVersion,
		Namespace:          cfg.Namespace,
		DebugHeaders:       cfg.DebugHeaders,
		DebugKeys:          cfg.DebugKeys,
		FailClosed:         cfg.FailClosed,
		RequireTagIndex:    cfg.RequireTagIndex,
		MaxCaptureBodySize: cfg.MaxCaptureBodySize,
		Valkey: RenderCacheValkeyDebugCfg{
			Address:       strings.TrimSpace(cfg.Valkey.Address),
			Namespace:     strings.TrimSpace(cfg.Valkey.Namespace),
			URLConfigured: strings.TrimSpace(cfg.Valkey.URL) != "",
			UsernameSet:   strings.TrimSpace(cfg.Valkey.Username) != "",
			PasswordSet:   strings.TrimSpace(cfg.Valkey.Password) != "",
			DB:            cfg.Valkey.DB,
			TLSEnabled:    cfg.Valkey.TLSEnabled,
			TLSSkipVerify: cfg.Valkey.TLSSkipVerify,
		},
	}
}

func RenderCacheDebugCapabilitiesForStore(store RenderCacheStore) RenderCacheDebugCapabilities {
	if store == nil {
		return RenderCacheDebugCapabilities{}
	}
	tag := RenderCacheStoreSupportsTagInvalidation(store)
	prefix := RenderCacheStoreSupportsPrefixInvalidation(store)
	closer := RenderCacheStoreSupportsClose(store)
	backend := RenderCacheStoreSupportsBackendDescriptor(store)
	renewal := RenderCacheStoreSupportsSetIfPresent(store)
	return RenderCacheDebugCapabilities{
		ConditionalUpdate:         renewal,
		TagInvalidation:           tag,
		PrefixInvalidation:        prefix,
		Close:                     closer,
		BackendDescriptor:         backend,
		AppWideTagClearPreferred:  tag && RenderCacheBackendKind(store) != RenderCacheBackendMemory,
		ProcessLocalObservedKeys:  true,
		BackendKeyScanningEnabled: false,
	}
}

func RenderCacheStoreSupportsTagInvalidation(store RenderCacheStore) bool {
	invalidator, ok := store.(RenderCacheTagInvalidator)
	return ok && invalidator != nil
}

func RenderCacheStoreSupportsPrefixInvalidation(store RenderCacheStore) bool {
	invalidator, ok := store.(RenderCachePrefixInvalidator)
	return ok && invalidator != nil
}

func RenderCacheStoreSupportsSetIfPresent(store RenderCacheStore) bool {
	updater, ok := store.(RenderCacheSetIfPresentStore)
	return ok && updater != nil
}

func RenderCacheStoreSupportsBackendDescriptor(store RenderCacheStore) bool {
	describer, ok := store.(RenderCacheBackendDescriber)
	return ok && describer != nil
}

func RenderCacheStoreSupportsClose(store RenderCacheStore) bool {
	closer, ok := store.(interface{ Close() error })
	return ok && closer != nil
}

func renderCacheStartupErrorFromDiagnostic(diagnostic RenderCacheStartupDiagnostic) *RenderCacheStartupError {
	if diagnostic.Error == "" {
		return nil
	}
	return &RenderCacheStartupError{
		Timestamp:  diagnostic.RecordedAt,
		Backend:    diagnostic.Backend,
		ErrorKind:  diagnostic.ErrorKind,
		Message:    diagnostic.Error,
		FailClosed: diagnostic.FailClosed,
	}
}

func renderCacheDebugCachedResponseFromValue(key *RenderCacheDebugKey, value RenderedSiteResponse, ttl time.Duration) *RenderCacheDebugCachedResponse {
	headerCount := 0
	for _, values := range value.Headers {
		if len(values) == 0 {
			headerCount++
			continue
		}
		headerCount += len(values)
	}
	response := &RenderCacheDebugCachedResponse{
		Timestamp:   time.Now().UTC(),
		Status:      value.Status,
		ContentType: value.ContentType,
		BodySize:    len(value.Body),
		HeaderCount: headerCount,
		TagCount:    len(value.Tags),
		TTLSeconds:  int64(ttl.Seconds()),
		TTLClass:    renderCacheTTLClass(value),
		Key:         key,
	}
	if !value.FreshUntil.IsZero() {
		fresh := value.FreshUntil
		response.FreshUntil = &fresh
	}
	if !value.StaleUntil.IsZero() {
		stale := value.StaleUntil
		response.StaleUntil = &stale
	}
	return response
}

func renderCacheTTLClass(value RenderedSiteResponse) string {
	now := time.Now()
	if !value.FreshUntil.IsZero() && now.Before(value.FreshUntil) {
		return "fresh"
	}
	if !value.StaleUntil.IsZero() && now.Before(value.StaleUntil) {
		return "stale"
	}
	if !value.FreshUntil.IsZero() || !value.StaleUntil.IsZero() {
		return "expired"
	}
	return ""
}

func renderCacheDebugKeyHash(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])[:16]
}

func renderCacheRouteHint(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	if after, ok := strings.CutPrefix(key, RenderCacheKeyPrefix); ok {
		key = after
	}
	parts := strings.SplitSeq(key, "|")
	for part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "/") {
			return part
		}
		if after, ok := strings.CutPrefix(part, "path="); ok {
			unescaped, err := neturl.QueryUnescape(after)
			if err == nil && strings.HasPrefix(unescaped, "/") {
				return unescaped
			}
		}
	}
	return ""
}

func renderCacheBackendFromRuntime(runtime *RenderCacheRuntime) string {
	if runtime == nil {
		return "unknown"
	}
	if runtime.Store != nil {
		return RenderCacheBackendKind(runtime.Store)
	}
	return renderCacheBackendFromConfig(runtime.Config)
}

func renderCacheBackendFromConfig(cfg RenderCacheConfig) string {
	if !cfg.Enabled {
		return "disabled"
	}
	backend := strings.TrimSpace(cfg.Backend)
	if backend == "" {
		return RenderCacheBackendMemory
	}
	return backend
}

func RenderCacheBackendKind(store RenderCacheStore) string {
	if describer, ok := store.(RenderCacheBackendDescriber); ok && describer != nil {
		if kind := strings.ToLower(strings.TrimSpace(describer.RenderCacheBackendKind())); kind != "" {
			return kind
		}
	}
	return "unknown"
}
