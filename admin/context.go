package admin

import (
	"context"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// AdminContext carries request-scoped information into panel operations.
type AdminContext struct {
	Context context.Context
	UserID  string
	Locale  string
	Theme   *ThemeSelection
}

type adminContextKey string
type commandContextKey string

const userIDContextKey adminContextKey = "admin.user_id"
const localeContextKey adminContextKey = "admin.locale"
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
	if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		ctx = auth.WithActorContext(ctx, actor)
	}
	if userID != "" {
		ctx = context.WithValue(ctx, userIDContextKey, userID)
	}
	if locale != "" {
		ctx = context.WithValue(ctx, localeContextKey, locale)
	}
	return AdminContext{
		Context: ctx,
		UserID:  userID,
		Locale:  locale,
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
