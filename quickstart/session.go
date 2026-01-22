package quickstart

import (
	"context"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	fggate "github.com/goliatone/go-featuregate/gate"
)

var (
	sessionTenantMetadataKeys       = []string{"tenant_id", "tenant", "default_tenant", "default_tenant_id"}
	sessionOrganizationMetadataKeys = []string{"organization_id", "org_id", "org"}
)

// SessionUser captures session metadata to expose in templates and APIs.
type SessionUser struct {
	ID              string            `json:"id,omitempty"`
	Subject         string            `json:"subject,omitempty"`
	Username        string            `json:"username,omitempty"`
	Email           string            `json:"email,omitempty"`
	Role            string            `json:"role,omitempty"`
	TenantID        string            `json:"tenant_id,omitempty"`
	OrganizationID  string            `json:"organization_id,omitempty"`
	ResourceRoles   map[string]string `json:"resource_roles,omitempty"`
	Metadata        map[string]any    `json:"metadata,omitempty"`
	Scopes          []string          `json:"scopes,omitempty"`
	IssuedAt        *time.Time        `json:"issued_at,omitempty"`
	ExpiresAt       *time.Time        `json:"expires_at,omitempty"`
	IsAuthenticated bool              `json:"is_authenticated"`
	DisplayName     string            `json:"display_name,omitempty"`
	Subtitle        string            `json:"subtitle,omitempty"`
	Initial         string            `json:"initial,omitempty"`
	AvatarURL       string            `json:"avatar_url,omitempty"`
}

// BuildSessionUser extracts actor/claims data from the request context.
func BuildSessionUser(ctx context.Context) SessionUser {
	session := SessionUser{}
	if ctx == nil {
		return session
	}

	actor, _ := authlib.ActorFromContext(ctx)
	claims, _ := authlib.GetClaims(ctx)

	if actor != nil {
		session.ID = firstNonEmpty(session.ID, actor.ActorID, actor.Subject)
		session.Subject = firstNonEmpty(session.Subject, actor.Subject, actor.ActorID)
		session.Role = firstNonEmpty(session.Role, actor.Role)
		session.TenantID = actor.TenantID
		session.OrganizationID = actor.OrganizationID
		session.ResourceRoles = cloneStringMap(actor.ResourceRoles)
		session.Metadata = cloneAnyMap(actor.Metadata)
	}

	if claims != nil {
		if session.ID == "" {
			session.ID = claims.UserID()
		}
		session.Subject = firstNonEmpty(session.Subject, claims.Subject(), claims.UserID())
		session.Role = firstNonEmpty(session.Role, claims.Role())

		if carrier, ok := claims.(interface{ ResourceRoles() map[string]string }); ok {
			if session.ResourceRoles == nil {
				session.ResourceRoles = cloneStringMap(carrier.ResourceRoles())
			} else {
				session.ResourceRoles = mergeStringMaps(session.ResourceRoles, carrier.ResourceRoles())
			}
		}

		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
			session.Metadata = mergeAnyMaps(session.Metadata, carrier.ClaimsMetadata())
		}

		if issued := claims.IssuedAt(); !issued.IsZero() {
			session.IssuedAt = ptrTime(issued)
		}
		if exp := claims.Expires(); !exp.IsZero() {
			session.ExpiresAt = ptrTime(exp)
		}
	}

	session.IsAuthenticated = actor != nil || claims != nil

	session.Email = firstNonEmpty(session.Email,
		stringFromMetadata(session.Metadata, "email", "user_email"),
	)
	session.Username = firstNonEmpty(session.Username,
		stringFromMetadata(session.Metadata, "username", "user", "name"),
	)
	session.TenantID = firstNonEmpty(session.TenantID,
		stringFromMetadata(session.Metadata, "tenant_id", "tenant", "default_tenant"),
	)
	session.OrganizationID = firstNonEmpty(session.OrganizationID,
		stringFromMetadata(session.Metadata, "organization_id", "org_id", "org"),
	)
	session.AvatarURL = firstNonEmpty(session.AvatarURL,
		stringFromMetadata(session.Metadata, "avatar", "avatar_url", "picture", "image_url"),
	)

	session.Scopes = collectScopes(session.Metadata, session.ResourceRoles)

	session.DisplayName = firstNonEmpty(session.DisplayName,
		stringFromMetadata(session.Metadata, "name", "display_name"),
		session.Username,
		session.Email,
	)
	if session.DisplayName == "" {
		if session.IsAuthenticated {
			session.DisplayName = "Authenticated User"
		} else {
			session.DisplayName = "Guest"
		}
	}

	session.Subtitle = buildSubtitle(session)
	session.Initial = strings.ToUpper(initialRune(session.DisplayName))

	return session
}

// FilterSessionUser hides tenant/org data when those features are disabled.
func FilterSessionUser(session SessionUser, gate fggate.FeatureGate) SessionUser {
	if !featureEnabled(gate, string(admin.FeatureTenants)) {
		session.TenantID = ""
		session.Metadata = pruneSessionMetadata(session.Metadata, sessionTenantMetadataKeys)
	}
	if !featureEnabled(gate, string(admin.FeatureOrganizations)) {
		session.OrganizationID = ""
		session.Metadata = pruneSessionMetadata(session.Metadata, sessionOrganizationMetadataKeys)
	}
	return session
}

// ToViewContext converts the session into snake_case keys for templates.
func (s SessionUser) ToViewContext() map[string]any {
	view := map[string]any{
		"id":               s.ID,
		"subject":          s.Subject,
		"username":         s.Username,
		"email":            s.Email,
		"role":             s.Role,
		"tenant_id":        s.TenantID,
		"organization_id":  s.OrganizationID,
		"resource_roles":   s.ResourceRoles,
		"metadata":         s.Metadata,
		"scopes":           s.Scopes,
		"is_authenticated": s.IsAuthenticated,
		"display_name":     s.DisplayName,
		"subtitle":         s.Subtitle,
		"initial":          s.Initial,
		"avatar_url":       s.AvatarURL,
	}

	if s.IssuedAt != nil {
		view["issued_at"] = *s.IssuedAt
	}
	if s.ExpiresAt != nil {
		view["expires_at"] = *s.ExpiresAt
	}

	return view
}

func stringFromMetadata(metadata map[string]any, keys ...string) string {
	if len(metadata) == 0 {
		return ""
	}
	for _, key := range keys {
		if val, ok := metadata[key]; ok {
			if str, ok := val.(string); ok && strings.TrimSpace(str) != "" {
				return strings.TrimSpace(str)
			}
		}
	}
	return ""
}

func mergeAnyMaps(base map[string]any, src map[string]any) map[string]any {
	if len(src) == 0 {
		return cloneAnyMap(base)
	}

	out := cloneAnyMap(base)
	if out == nil {
		out = map[string]any{}
	}
	for k, v := range src {
		out[k] = v
	}
	return out
}

func mergeStringMaps(base map[string]string, src map[string]string) map[string]string {
	if len(src) == 0 {
		return cloneStringMap(base)
	}
	out := cloneStringMap(base)
	if out == nil {
		out = map[string]string{}
	}
	for k, v := range src {
		out[k] = v
	}
	return out
}

func pruneSessionMetadata(metadata map[string]any, keys []string) map[string]any {
	if len(metadata) == 0 || len(keys) == 0 {
		return metadata
	}
	out := cloneAnyMap(metadata)
	for _, key := range keys {
		delete(out, key)
	}
	return out
}

func collectScopes(meta map[string]any, roles map[string]string) []string {
	out := []string{}
	if len(roles) > 0 {
		for k, v := range roles {
			if strings.TrimSpace(k) != "" && strings.TrimSpace(v) != "" {
				out = append(out, k+":"+v)
			}
		}
	}
	if len(meta) > 0 {
		if sc, ok := meta["scopes"].([]string); ok {
			out = append(out, sc...)
		}
		if raw, ok := meta["scopes"]; ok {
			if list, ok := raw.([]any); ok {
				for _, item := range list {
					if str, ok := item.(string); ok && strings.TrimSpace(str) != "" {
						out = append(out, strings.TrimSpace(str))
					}
				}
			}
		}
	}
	sort.Strings(out)
	return out
}

func buildSubtitle(session SessionUser) string {
	if session.Role != "" && session.TenantID != "" {
		return session.Role + " @ " + session.TenantID
	}
	if session.Role != "" {
		return session.Role
	}
	return ""
}

func initialRune(s string) string {
	if s == "" {
		return ""
	}
	r, _ := utf8.DecodeRuneInString(strings.TrimSpace(s))
	if r == utf8.RuneError {
		return ""
	}
	return string(r)
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
