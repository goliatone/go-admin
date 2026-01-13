package admin

import (
	"context"
	"strings"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// AdminContext carries request-scoped information into panel operations.
type AdminContext struct {
	Context  context.Context
	UserID   string
	TenantID string
	OrgID    string
	Locale   string
	Theme    *ThemeSelection
}

type adminContextKey string
type commandContextKey string

const userIDContextKey adminContextKey = "admin.user_id"
const localeContextKey adminContextKey = "admin.locale"
const tenantIDContextKey adminContextKey = "admin.tenant_id"
const orgIDContextKey adminContextKey = "admin.org_id"
const queryParamsContextKey adminContextKey = "admin.query_params"
const (
	commandPayloadKey commandContextKey = "admin.command.payload"
	commandIDsKey     commandContextKey = "admin.command.ids"
)

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// newAdminContext builds an AdminContext from an HTTP request.
func newAdminContextFromRouter(c router.Context, locale string) AdminContext {
	ctx := c.Context()
	userID := c.Header("X-User-ID")
	tenantID := ""
	orgID := ""
	if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		if actor.TenantID != "" {
			tenantID = actor.TenantID
		}
		if actor.OrganizationID != "" {
			orgID = actor.OrganizationID
		}
		ctx = auth.WithActorContext(ctx, actor)
	}
	if tenantID == "" {
		tenantID = strings.TrimSpace(c.Query("tenant_id"))
	}
	if orgID == "" {
		orgID = strings.TrimSpace(c.Query("org_id"))
	}
	if userID != "" {
		ctx = context.WithValue(ctx, userIDContextKey, userID)
	}
	if tenantID != "" {
		ctx = context.WithValue(ctx, tenantIDContextKey, tenantID)
	}
	if orgID != "" {
		ctx = context.WithValue(ctx, orgIDContextKey, orgID)
	}
	if locale != "" {
		ctx = context.WithValue(ctx, localeContextKey, locale)
	}
	if queries := c.Queries(); len(queries) > 0 {
		ctx = withQueryParams(ctx, queries)
	}
	return AdminContext{
		Context:  ctx,
		UserID:   userID,
		TenantID: tenantID,
		OrgID:    orgID,
		Locale:   locale,
	}
}

func userIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if id, ok := ctx.Value(userIDContextKey).(string); ok && id != "" {
		return id
	}
	if actor := actorFromContext(ctx); actor != "" {
		return actor
	}
	return ""
}

func localeFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if locale, ok := ctx.Value(localeContextKey).(string); ok && locale != "" {
		return locale
	}
	return ""
}

func tenantIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if tenantID, ok := ctx.Value(tenantIDContextKey).(string); ok && tenantID != "" {
		return tenantID
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if actor.TenantID != "" {
			return actor.TenantID
		}
	}
	return ""
}

func orgIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if orgID, ok := ctx.Value(orgIDContextKey).(string); ok && orgID != "" {
		return orgID
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if actor.OrganizationID != "" {
			return actor.OrganizationID
		}
	}
	return ""
}

func withQueryParams(ctx context.Context, params map[string][]string) context.Context {
	if ctx == nil || len(params) == 0 {
		return ctx
	}
	clone := map[string][]string{}
	for key, values := range params {
		if len(values) == 0 {
			continue
		}
		copied := append([]string(nil), values...)
		clone[key] = copied
	}
	if len(clone) == 0 {
		return ctx
	}
	return context.WithValue(ctx, queryParamsContextKey, clone)
}

func queryParamsFromContext(ctx context.Context) map[string][]string {
	if ctx == nil {
		return nil
	}
	if params, ok := ctx.Value(queryParamsContextKey).(map[string][]string); ok {
		return params
	}
	return nil
}

// WithCommandPayload stores an arbitrary command payload on the context so command handlers
// can inspect request-scoped parameters (e.g., selected IDs or filters).
func WithCommandPayload(ctx context.Context, payload map[string]any) context.Context {
	if ctx == nil || len(payload) == 0 {
		return ctx
	}
	return context.WithValue(ctx, commandPayloadKey, payload)
}

// CommandPayload retrieves the payload stored by WithCommandPayload.
func CommandPayload(ctx context.Context) map[string]any {
	if ctx == nil {
		return nil
	}
	if payload, ok := ctx.Value(commandPayloadKey).(map[string]any); ok {
		return payload
	}
	return nil
}

// WithCommandIDs stores normalized command target IDs on the context.
func WithCommandIDs(ctx context.Context, ids []string) context.Context {
	clean := dedupeStrings(ids)
	if ctx == nil || len(clean) == 0 {
		return ctx
	}
	return context.WithValue(ctx, commandIDsKey, clean)
}

// CommandIDs retrieves any target IDs attached to the context.
func CommandIDs(ctx context.Context) []string {
	if ctx == nil {
		return nil
	}
	if ids, ok := ctx.Value(commandIDsKey).([]string); ok {
		return ids
	}
	return nil
}
