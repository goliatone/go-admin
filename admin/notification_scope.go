package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-auth"
	"github.com/goliatone/go-notifications/pkg/privacy"
)

// NotificationSystemAuthorityMetadataKey is the trusted actor-metadata flag
// used to opt an authenticated operator into global notification operations.
// A dedicated permission is still required by the transport.
const NotificationSystemAuthorityMetadataKey = "go_admin.notifications.system_authority"

type notificationSystemAuthorityContextKey struct{}

// WithNotificationSystemAuthority marks a trusted service/authentication
// context as authorized to perform global notification operations. Request
// payloads and query parameters cannot set this value.
func WithNotificationSystemAuthority(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, notificationSystemAuthorityContextKey{}, true)
}

// NotificationSystemAuthorityFromContext reports whether trusted middleware
// or authenticated actor metadata explicitly granted system authority.
func NotificationSystemAuthorityFromContext(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	if authorized, _ := ctx.Value(notificationSystemAuthorityContextKey{}).(bool); authorized {
		return true
	}
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil || actor.Metadata == nil {
		return false
	}
	authorized, _ := actor.Metadata[NotificationSystemAuthorityMetadataKey].(bool)
	return authorized
}

func notificationReadScope(adminCtx AdminContext) (string, error) {
	actorID, tenantID := notificationTrustedIdentity(adminCtx)
	if actorID == "" {
		return "", notificationScopeError("notification actor context is required")
	}
	if tenantID != "" {
		return "tenant:" + tenantID, nil
	}
	return "system", nil
}

func notificationRetentionScope(adminCtx AdminContext) (string, error) {
	actorID, tenantID := notificationTrustedIdentity(adminCtx)
	if actorID == "" {
		return "", notificationScopeError("notification actor context is required")
	}
	if NotificationSystemAuthorityFromContext(adminCtx.Context) {
		return "system", nil
	}
	if tenantID != "" {
		return "", notificationScopeError("notification retention requires system scope")
	}
	return "", notificationScopeError("notification retention requires explicit system authority")
}

func notificationTrustedIdentity(adminCtx AdminContext) (actorID, tenantID string) {
	actorID = strings.TrimSpace(firstNonEmpty(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	tenantID = strings.TrimSpace(firstNonEmpty(adminCtx.TenantID, tenantIDFromContext(adminCtx.Context)))
	return actorID, tenantID
}

func notificationScopeError(message string) error {
	return privacy.SafeError{Category: "authorization", Code: "notification_scope_denied", Message: message}
}
