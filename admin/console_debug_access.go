package admin

import (
	"context"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// CurrentContextResolver is an optional authenticator capability for long-lived
// delivery. It reloads current account/session/grants from trusted host state.
type CurrentContextResolver interface {
	ResolveCurrentContext(context.Context) (context.Context, error)
}

func debugCurrentContext(admin *Admin, cfg DebugConfig, ctx context.Context, permission string) (context.Context, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if ctx.Err() != nil {
		return ctx, ErrForbidden
	}
	before, hasBefore := auth.GetClaims(ctx)
	var beforeID, beforeSubject string
	if hasBefore && before != nil {
		beforeID, beforeSubject = before.UserID(), before.Subject()
	}
	actor, hasActor := auth.ActorFromContext(ctx)
	var priorActor auth.ActorContext
	if hasActor && actor != nil {
		priorActor = *actor
	}
	if cfg.ResolveCurrentContext != nil {
		var err error
		ctx, err = cfg.ResolveCurrentContext(ctx)
		if err != nil || ctx == nil {
			return ctx, ErrForbidden
		}
	} else if admin != nil {
		if resolver, ok := admin.authenticator.(CurrentContextResolver); ok {
			var err error
			ctx, err = resolver.ResolveCurrentContext(ctx)
			if err != nil || ctx == nil {
				return ctx, ErrForbidden
			}
		}
	}
	if ctx.Err() != nil {
		return ctx, ErrForbidden
	}
	after, hasAfter := auth.GetClaims(ctx)
	if hasActor && actor != nil {
		currentActor, ok := auth.ActorFromContext(ctx)
		if !ok || currentActor == nil || currentActor.ActorID != priorActor.ActorID || currentActor.Subject != priorActor.Subject || currentActor.TenantID != priorActor.TenantID || currentActor.OrganizationID != priorActor.OrganizationID || currentActor.ImpersonatorID != priorActor.ImpersonatorID || currentActor.IsImpersonated != priorActor.IsImpersonated {
			return ctx, ErrForbidden
		}
	}
	if hasBefore && before != nil {
		if !hasAfter || after == nil || beforeID != after.UserID() || beforeSubject != after.Subject() {
			return ctx, ErrForbidden
		}
	}
	if hasAfter && after != nil && !after.Expires().IsZero() && !time.Now().Before(after.Expires()) {
		return ctx, ErrForbidden
	}
	// Do not retain the HTTP request's permission-cache entries across deliveries.
	ctx = context.WithValue(ctx, resolvedPermissionsCacheContextKey{}, &resolvedPermissionsCache{})
	if admin != nil && debugHasAuthenticatedExposure(admin) {
		if err := requirePermissionWithAuthorizer(admin.authorizer, ctx, debugResolvedPermission(cfg, permission), debugModuleID); err != nil {
			return ctx, err
		}
	}
	return ctx, nil
}

func (m *DebugModule) debugDeliveryInterval() time.Duration {
	interval := m.config.LiveRevalidateInterval
	if interval <= 0 || interval > 30*time.Second {
		return 15 * time.Second
	}
	return interval
}

func (m *DebugModule) refreshDebugSubscription(cctx context.Context, subscription *debugSubscription, permission string) error {
	if m.consoleHost().closed() {
		return ErrForbidden
	}
	ctx := cctx
	if subscription != nil && subscription.commandRunAccess != nil {
		ctx = subscription.commandRunAccess.ctx
	}
	ctx, err := debugCurrentContext(m.admin, m.config, ctx, permission)
	if err != nil {
		return err
	}
	if subscription != nil {
		previous := subscription.commandRunAccess
		current := m.commandRunAccess(ctx)
		if previous != nil && previous.allowed && current.allowed && previous.selector.Normalize() != current.selector.Normalize() {
			return ErrForbidden
		}
		subscription.commandRunAccess = current
	}
	return nil
}

func (m *DebugModule) revalidateDebugSocket(c router.WebSocketContext, subscription *debugSubscription, permission string) error {
	err := m.refreshDebugSubscription(c.Context(), subscription, permission)
	if err != nil {
		// Tell the browser to clear retained records instead of reconnecting
		// indefinitely with revoked authority. Keep the original policy error.
		_ = c.CloseWithStatus(1008, "console access changed")
	}
	return err
}
