package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
	"github.com/google/uuid"
)

const (
	scopeDebugPanelID  = "scope"
	scopeDebugHeader   = "X-Admin-Resolved-Scope"
	scopeDebugLogLabel = "[scope]"
)

type scopeDebugSnapshot struct {
	UpdatedAt time.Time         `json:"updated_at"`
	Count     int               `json:"count"`
	Limit     int               `json:"limit"`
	Entries   []scopeDebugEntry `json:"entries"`
}

type scopeDebugEntry struct {
	Timestamp       time.Time          `json:"timestamp"`
	Method          string             `json:"method,omitempty"`
	Path            string             `json:"path,omitempty"`
	ScopeMode       string             `json:"scope_mode,omitempty"`
	Actor           scopeDebugActor    `json:"actor,omitempty"`
	Claims          scopeDebugClaims   `json:"claims,omitempty"`
	RawScope        scopeDebugScope    `json:"raw_scope,omitempty"`
	ResolvedScope   scopeDebugScope    `json:"resolved_scope,omitempty"`
	DefaultScope    scopeDebugScope    `json:"default_scope,omitempty"`
	DefaultsApplied scopeDebugDefaults `json:"defaults_applied,omitempty"`
	Metadata        map[string]any     `json:"metadata,omitempty"`
	Headers         map[string]string  `json:"headers,omitempty"`
	Query           map[string]string  `json:"query,omitempty"`
	RouteParams     map[string]string  `json:"route_params,omitempty"`
	RequestID       string             `json:"request_id,omitempty"`
	Extra           map[string]any     `json:"extra,omitempty"`
}

type scopeDebugActor struct {
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

type scopeDebugClaims struct {
	Subject  string         `json:"subject,omitempty"`
	UserID   string         `json:"user_id,omitempty"`
	Role     string         `json:"role,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

type scopeDebugScope struct {
	TenantID string `json:"tenant_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
}

type scopeDebugDefaults struct {
	TenantID bool `json:"tenant_id,omitempty"`
	OrgID    bool `json:"org_id,omitempty"`
}

type scopeDebugBuffer struct {
	mu      sync.Mutex
	limit   int
	entries []scopeDebugEntry
}

func newScopeDebugBuffer(limit int) *scopeDebugBuffer {
	if limit <= 0 {
		limit = 200
	}
	return &scopeDebugBuffer{limit: limit}
}

func (b *scopeDebugBuffer) Add(entry scopeDebugEntry) {
	if b == nil {
		return
	}
	b.mu.Lock()
	b.entries = append(b.entries, entry)
	if b.limit > 0 && len(b.entries) > b.limit {
		b.entries = append([]scopeDebugEntry(nil), b.entries[len(b.entries)-b.limit:]...)
	}
	b.mu.Unlock()
}

func (b *scopeDebugBuffer) Snapshot() scopeDebugSnapshot {
	if b == nil {
		return scopeDebugSnapshot{UpdatedAt: time.Now().UTC()}
	}
	b.mu.Lock()
	entries := append([]scopeDebugEntry(nil), b.entries...)
	limit := b.limit
	b.mu.Unlock()
	return scopeDebugSnapshot{
		UpdatedAt: time.Now().UTC(),
		Count:     len(entries),
		Limit:     limit,
		Entries:   entries,
	}
}

func (b *scopeDebugBuffer) Clear() error {
	if b == nil {
		return nil
	}
	b.mu.Lock()
	b.entries = nil
	b.mu.Unlock()
	return nil
}

func scopeDebugEnabledFromEnv() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("ADMIN_DEBUG_SCOPE")), "true")
}

func scopeDebugLimitFromEnv() int {
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

func scopeDebugWrap(authn *admin.GoAuthAuthenticator, cfg *admin.Config, buffer *scopeDebugBuffer) func(router.HandlerFunc) router.HandlerFunc {
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
				c.SetHeader(scopeDebugHeader, header)
			}
			if buffer != nil {
				buffer.Add(entry)
			}
			logScopeDebugEntry(entry)
			return next(c)
		})
	}
}

func scopeDebugHandler(buffer *scopeDebugBuffer) router.HandlerFunc {
	return func(c router.Context) error {
		if buffer == nil {
			return c.JSON(http.StatusOK, scopeDebugSnapshot{UpdatedAt: time.Now().UTC()})
		}
		return c.JSON(http.StatusOK, buffer.Snapshot())
	}
}

func registerScopeDebugPanel(buffer *scopeDebugBuffer) {
	if buffer == nil {
		return
	}
	_ = debugregistry.RegisterPanel(scopeDebugPanelID, debugregistry.PanelConfig{
		Label:           "Scope",
		Icon:            "target",
		SnapshotKey:     scopeDebugPanelID,
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

func buildScopeDebugEntry(c router.Context, cfg *admin.Config) scopeDebugEntry {
	entry := scopeDebugEntry{
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
	rawScope := helpers.ScopeFromContextRaw(ctx)
	resolvedScope := helpers.ScopeFromContext(ctx)
	scopeCfg := scopeConfigFromAdmin(cfg)
	defaultTenantID, _ := parseScopeUUID(scopeCfg.DefaultTenantID)
	defaultOrgID, _ := parseScopeUUID(scopeCfg.DefaultOrgID)

	entry.ScopeMode = string(scopeCfg.Mode)
	entry.RawScope = scopeDebugScope{
		TenantID: formatUUID(rawScope.TenantID),
		OrgID:    formatUUID(rawScope.OrgID),
	}
	entry.ResolvedScope = scopeDebugScope{
		TenantID: formatUUID(resolvedScope.TenantID),
		OrgID:    formatUUID(resolvedScope.OrgID),
	}
	entry.DefaultScope = scopeDebugScope{
		TenantID: formatUUID(defaultTenantID),
		OrgID:    formatUUID(defaultOrgID),
	}
	entry.DefaultsApplied = scopeDebugDefaults{
		TenantID: rawScope.TenantID == uuid.Nil && defaultTenantID != uuid.Nil && resolvedScope.TenantID == defaultTenantID,
		OrgID:    rawScope.OrgID == uuid.Nil && defaultOrgID != uuid.Nil && resolvedScope.OrgID == defaultOrgID,
	}

	if actor, ok := authlib.ActorFromContext(ctx); ok && actor != nil {
		entry.Actor = scopeDebugActor{
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
		entry.Claims = scopeDebugClaims{
			Subject: strings.TrimSpace(claims.Subject()),
			UserID:  strings.TrimSpace(claims.UserID()),
			Role:    strings.TrimSpace(claims.Role()),
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
			entry.Claims.Metadata = filterScopeMetadata(carrier.ClaimsMetadata())
		}
	}

	entry.Headers = map[string]string{
		"authorization": redactHeader(c.Header("Authorization")),
		"cookie":        redactHeader(c.Header("Cookie")),
	}

	return entry
}

func logScopeDebugEntry(entry scopeDebugEntry) {
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

func formatScopeHeader(scope scopeDebugScope) string {
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

func redactHeader(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	return "[redacted]"
}

func scopeConfigFromAdmin(cfg *admin.Config) quickstart.ScopeConfig {
	if cfg == nil {
		return quickstart.ScopeConfigFromEnv()
	}
	return quickstart.ScopeConfigFromAdmin(*cfg)
}

func parseScopeUUID(value string) (uuid.UUID, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return uuid.Nil, nil
	}
	return uuid.Parse(trimmed)
}

func formatUUID(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}
