package quickstart

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
	debugregistry "github.com/goliatone/go-admin/debug"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
	"github.com/google/uuid"
)

const (
	ScopeDebugPanelID  = "scope"
	ScopeDebugHeader   = "X-Admin-Resolved-Scope"
	scopeDebugLogLabel = "[scope]"
)

// ScopeDebugSnapshot holds scope debug entries for the debug API.
type ScopeDebugSnapshot struct {
	UpdatedAt time.Time         `json:"updated_at"`
	Count     int               `json:"count"`
	Limit     int               `json:"limit"`
	Entries   []ScopeDebugEntry `json:"entries"`
}

// ScopeDebugEntry captures a request scope resolution snapshot.
type ScopeDebugEntry struct {
	Timestamp       time.Time          `json:"timestamp"`
	Method          string             `json:"method,omitempty"`
	Path            string             `json:"path,omitempty"`
	ScopeMode       string             `json:"scope_mode,omitempty"`
	Actor           ScopeDebugActor    `json:"actor,omitempty"`
	Claims          ScopeDebugClaims   `json:"claims,omitempty"`
	RawScope        ScopeDebugScope    `json:"raw_scope,omitempty"`
	ResolvedScope   ScopeDebugScope    `json:"resolved_scope,omitempty"`
	DefaultScope    ScopeDebugScope    `json:"default_scope,omitempty"`
	DefaultsApplied ScopeDebugDefaults `json:"defaults_applied,omitempty"`
	Metadata        map[string]any     `json:"metadata,omitempty"`
	Headers         map[string]string  `json:"headers,omitempty"`
	Query           map[string]string  `json:"query,omitempty"`
	RouteParams     map[string]string  `json:"route_params,omitempty"`
	RequestID       string             `json:"request_id,omitempty"`
	Extra           map[string]any     `json:"extra,omitempty"`
}

// ScopeDebugActor captures actor context for a scope entry.
type ScopeDebugActor struct {
	ID             string            `json:"id,omitempty"`
	Subject        string            `json:"subject,omitempty"`
	Role           string            `json:"role,omitempty"`
	TenantID       string            `json:"tenant_id,omitempty"`
	OrganizationID string            `json:"organization_id,omitempty"`
	Metadata       map[string]any    `json:"metadata,omitempty"`
	ImpersonatorID string            `json:"impersonator_id,omitempty"`
	IsImpersonated bool              `json:"is_impersonated,omitempty"`
	ResourceRoles  map[string]string `json:"resource_roles,omitempty"`
}

// ScopeDebugClaims captures JWT claims context for a scope entry.
type ScopeDebugClaims struct {
	Subject  string         `json:"subject,omitempty"`
	UserID   string         `json:"user_id,omitempty"`
	Role     string         `json:"role,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// ScopeDebugScope represents tenant/org values in scope debug.
type ScopeDebugScope struct {
	TenantID string `json:"tenant_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
}

// ScopeDebugDefaults records which defaults were applied.
type ScopeDebugDefaults struct {
	TenantID bool `json:"tenant_id,omitempty"`
	OrgID    bool `json:"org_id,omitempty"`
}

// ScopeDebugBuffer stores recent scope debug entries.
type ScopeDebugBuffer struct {
	mu      sync.Mutex
	limit   int
	entries []ScopeDebugEntry
}

// NewScopeDebugBuffer allocates a buffer for scope debug entries.
func NewScopeDebugBuffer(limit int) *ScopeDebugBuffer {
	if limit <= 0 {
		limit = 200
	}
	return &ScopeDebugBuffer{limit: limit}
}

// Add appends a scope debug entry to the buffer.
func (b *ScopeDebugBuffer) Add(entry ScopeDebugEntry) {
	if b == nil {
		return
	}
	b.mu.Lock()
	b.entries = append(b.entries, entry)
	if b.limit > 0 && len(b.entries) > b.limit {
		b.entries = append([]ScopeDebugEntry(nil), b.entries[len(b.entries)-b.limit:]...)
	}
	b.mu.Unlock()
}

// Snapshot returns a copy of the buffered scope debug entries.
func (b *ScopeDebugBuffer) Snapshot() ScopeDebugSnapshot {
	if b == nil {
		return ScopeDebugSnapshot{UpdatedAt: time.Now().UTC()}
	}
	b.mu.Lock()
	entries := append([]ScopeDebugEntry(nil), b.entries...)
	limit := b.limit
	b.mu.Unlock()
	return ScopeDebugSnapshot{
		UpdatedAt: time.Now().UTC(),
		Count:     len(entries),
		Limit:     limit,
		Entries:   entries,
	}
}

// Clear removes all buffered scope debug entries.
func (b *ScopeDebugBuffer) Clear() error {
	if b == nil {
		return nil
	}
	b.mu.Lock()
	b.entries = nil
	b.mu.Unlock()
	return nil
}

// ScopeDebugEnabledFromEnv returns true when ADMIN_DEBUG_SCOPE is set.
func ScopeDebugEnabledFromEnv() bool {
	enabled, ok := envBool("ADMIN_DEBUG_SCOPE")
	return ok && enabled
}

// ScopeDebugLimitFromEnv reads ADMIN_DEBUG_SCOPE_LIMIT or returns 200.
func ScopeDebugLimitFromEnv() int {
	const defaultLimit = 200
	val := strings.TrimSpace(os.Getenv("ADMIN_DEBUG_SCOPE_LIMIT"))
	if val == "" {
		return defaultLimit
	}
	parsed, err := strconv.Atoi(val)
	if err != nil || parsed <= 0 {
		return defaultLimit
	}
	return parsed
}

// ScopeDebugWrap captures scope debug info for authenticated requests.
func ScopeDebugWrap(authn *admin.GoAuthAuthenticator, cfg *admin.Config, buffer *ScopeDebugBuffer) func(router.HandlerFunc) router.HandlerFunc {
	if authn == nil {
		return func(next router.HandlerFunc) router.HandlerFunc {
			return next
		}
	}
	return func(next router.HandlerFunc) router.HandlerFunc {
		if next == nil {
			next = func(c router.Context) error { return nil }
		}
		return authn.WrapHandler(func(c router.Context) error {
			entry := buildScopeDebugEntry(c, cfg)
			if header := formatScopeHeader(entry.ResolvedScope); header != "" {
				c.SetHeader(ScopeDebugHeader, header)
			}
			if buffer != nil {
				buffer.Add(entry)
			}
			logScopeDebugEntry(entry)
			return next(c)
		})
	}
}

// ScopeDebugHandler returns a handler that serves scope debug snapshots.
func ScopeDebugHandler(buffer *ScopeDebugBuffer) router.HandlerFunc {
	return func(c router.Context) error {
		if buffer == nil {
			return c.JSON(http.StatusOK, ScopeDebugSnapshot{UpdatedAt: time.Now().UTC()})
		}
		return c.JSON(http.StatusOK, buffer.Snapshot())
	}
}

// RegisterScopeDebugPanel registers the scope debug panel with the registry.
func RegisterScopeDebugPanel(buffer *ScopeDebugBuffer) {
	if buffer == nil {
		return
	}
	_ = debugregistry.RegisterPanel(ScopeDebugPanelID, debugregistry.PanelConfig{
		Label:           "Scope",
		Icon:            "target",
		SnapshotKey:     ScopeDebugPanelID,
		SupportsToolbar: admin.BoolPtr(true),
		Category:        "auth",
		Order:           70,
		Snapshot: func(ctx context.Context) any {
			return buffer.Snapshot()
		},
		Clear: func(ctx context.Context) error {
			return buffer.Clear()
		},
	})
}

func buildScopeDebugEntry(c router.Context, cfg *admin.Config) ScopeDebugEntry {
	entry := ScopeDebugEntry{
		Timestamp: time.Now().UTC(),
	}
	if c == nil {
		return entry
	}
	entry.Method = c.Method()
	entry.Path = c.Path()
	entry.Query = cloneStringMap(c.Queries())
	entry.RouteParams = cloneStringMap(c.RouteParams())
	entry.RequestID = strings.TrimSpace(c.Header("X-Request-ID"))

	ctx := c.Context()
	rawScope := ScopeFromContext(ctx)
	scopeCfg := scopeConfigFromAdmin(cfg)
	defaultTenantID := parseScopeID(scopeCfg.DefaultTenantID)
	defaultOrgID := parseScopeID(scopeCfg.DefaultOrgID)

	resolvedScope := rawScope
	if scopeCfg.Mode == ScopeModeSingle {
		if resolvedScope.TenantID == uuid.Nil {
			resolvedScope.TenantID = defaultTenantID
		}
		if resolvedScope.OrgID == uuid.Nil {
			resolvedScope.OrgID = defaultOrgID
		}
	}

	entry.ScopeMode = string(scopeCfg.Mode)
	entry.RawScope = ScopeDebugScope{
		TenantID: formatUUID(rawScope.TenantID),
		OrgID:    formatUUID(rawScope.OrgID),
	}
	entry.ResolvedScope = ScopeDebugScope{
		TenantID: formatUUID(resolvedScope.TenantID),
		OrgID:    formatUUID(resolvedScope.OrgID),
	}
	entry.DefaultScope = ScopeDebugScope{
		TenantID: formatUUID(defaultTenantID),
		OrgID:    formatUUID(defaultOrgID),
	}
	entry.DefaultsApplied = ScopeDebugDefaults{
		TenantID: rawScope.TenantID == uuid.Nil && defaultTenantID != uuid.Nil && resolvedScope.TenantID == defaultTenantID,
		OrgID:    rawScope.OrgID == uuid.Nil && defaultOrgID != uuid.Nil && resolvedScope.OrgID == defaultOrgID,
	}

	if actor, ok := authlib.ActorFromContext(ctx); ok && actor != nil {
		entry.Actor = ScopeDebugActor{
			ID:             strings.TrimSpace(actor.ActorID),
			Subject:        strings.TrimSpace(actor.Subject),
			Role:           strings.TrimSpace(actor.Role),
			TenantID:       strings.TrimSpace(actor.TenantID),
			OrganizationID: strings.TrimSpace(actor.OrganizationID),
			Metadata:       filterScopeMetadata(actor.Metadata),
			ImpersonatorID: strings.TrimSpace(actor.ImpersonatorID),
			IsImpersonated: actor.IsImpersonated,
			ResourceRoles:  cloneStringMap(actor.ResourceRoles),
		}
	}

	if claims, ok := authlib.GetClaims(ctx); ok && claims != nil {
		entry.Claims = ScopeDebugClaims{
			Subject: strings.TrimSpace(claims.Subject()),
			UserID:  strings.TrimSpace(claims.UserID()),
			Role:    strings.TrimSpace(claims.Role()),
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
			entry.Claims.Metadata = filterScopeMetadata(carrier.ClaimsMetadata())
		}
	}
	// TODO: Should we use masker?
	entry.Headers = map[string]string{
		"authorization": redactHeader(c.Header("Authorization")),
		"cookie":        redactHeader(c.Header("Cookie")),
	}

	return entry
}

func logScopeDebugEntry(entry ScopeDebugEntry) {
	msg := []string{
		entry.Method,
		entry.Path,
	}
	rawTenant := entry.RawScope.TenantID
	rawOrg := entry.RawScope.OrgID
	resTenant := entry.ResolvedScope.TenantID
	resOrg := entry.ResolvedScope.OrgID
	defaults := entry.DefaultsApplied

	log.Printf("%s %s raw_tenant=%s raw_org=%s resolved_tenant=%s resolved_org=%s defaults_applied=%t/%t actor=%s role=%s",
		scopeDebugLogLabel,
		strings.Join(msg, " "),
		rawTenant,
		rawOrg,
		resTenant,
		resOrg,
		defaults.TenantID,
		defaults.OrgID,
		entry.Actor.ID,
		entry.Actor.Role,
	)
}

func formatScopeHeader(scope ScopeDebugScope) string {
	parts := make([]string, 0, 2)
	if strings.TrimSpace(scope.TenantID) != "" {
		parts = append(parts, "tenant="+strings.TrimSpace(scope.TenantID))
	}
	if strings.TrimSpace(scope.OrgID) != "" {
		parts = append(parts, "org="+strings.TrimSpace(scope.OrgID))
	}
	return strings.Join(parts, ";")
}

func filterScopeMetadata(metadata map[string]any) map[string]any {
	if len(metadata) == 0 {
		return nil
	}
	keys := []string{
		"tenant_id",
		"tenant",
		"default_tenant",
		"default_tenant_id",
		"organization_id",
		"org_id",
		"org",
		"default_org",
		"default_org_id",
	}
	out := map[string]any{}
	for _, key := range keys {
		if val, ok := metadata[key]; ok && val != nil {
			out[key] = val
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// TODO: Should we use masker?
func redactHeader(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	return "[redacted]"
}

func scopeConfigFromAdmin(cfg *admin.Config) ScopeConfig {
	if cfg == nil {
		return ScopeConfigFromEnv()
	}
	return ScopeConfigFromAdmin(*cfg)
}

func formatUUID(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}
