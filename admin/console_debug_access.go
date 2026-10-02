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
	ctx, err := debugResolveCurrentContext(admin, cfg, ctx)
	if err != nil {
		return ctx, err
	}
	if admin != nil && debugHasAuthenticatedExposure(admin) {
		if err := requirePermissionWithAuthorizer(admin.authorizer, ctx, debugResolvedPermission(cfg, permission), debugModuleID); err != nil {
			return ctx, err
		}
	}
	return ctx, nil
}

// Resolution is shared with REPL, whose grants use the debug.repl resource.
func debugResolveCurrentContext(admin *Admin, cfg DebugConfig, ctx context.Context) (context.Context, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if ctx.Err() != nil {
		return ctx, ErrForbidden
	}
	prior := debugContextIdentityFrom(ctx)
	ctx, err := resolveDebugCurrentContext(admin, cfg, ctx)
	if err != nil || ctx == nil || ctx.Err() != nil {
		return ctx, ErrForbidden
	}
	if !prior.matches(ctx) || debugClaimsExpired(ctx) {
		return ctx, ErrForbidden
	}
	// Do not retain the HTTP request's permission-cache entries across deliveries.
	ctx = context.WithValue(ctx, resolvedPermissionsCacheContextKey{}, &resolvedPermissionsCache{})
	return ctx, nil
}

func resolveDebugCurrentContext(admin *Admin, cfg DebugConfig, ctx context.Context) (context.Context, error) {
	if cfg.ResolveCurrentContext != nil {
		return cfg.ResolveCurrentContext(ctx)
	}
	if admin != nil {
		if resolver, ok := admin.authenticator.(CurrentContextResolver); ok {
			return resolver.ResolveCurrentContext(ctx)
		}
	}
	return ctx, nil
}

type debugContextIdentity struct {
	hasClaims       bool
	userID, subject string
	hasActor        bool
	actor           auth.ActorContext
}

func debugContextIdentityFrom(ctx context.Context) debugContextIdentity {
	var identity debugContextIdentity
	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		identity.hasClaims = true
		identity.userID, identity.subject = claims.UserID(), claims.Subject()
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		identity.hasActor = true
		identity.actor = *actor
	}
	return identity
}

func (prior debugContextIdentity) matches(ctx context.Context) bool {
	if prior.hasActor {
		actor, ok := auth.ActorFromContext(ctx)
		if !ok || actor == nil || !debugActorsMatch(prior.actor, *actor) {
			return false
		}
	}
	if prior.hasClaims {
		claims, ok := auth.GetClaims(ctx)
		if !ok || claims == nil || prior.userID != claims.UserID() || prior.subject != claims.Subject() {
			return false
		}
	}
	return true
}

func debugActorsMatch(prior, current auth.ActorContext) bool {
	return current.ActorID == prior.ActorID && current.Subject == prior.Subject &&
		current.TenantID == prior.TenantID && current.OrganizationID == prior.OrganizationID &&
		current.ImpersonatorID == prior.ImpersonatorID && current.IsImpersonated == prior.IsImpersonated
}

func debugClaimsExpired(ctx context.Context) bool {
	claims, ok := auth.GetClaims(ctx)
	return ok && claims != nil && !claims.Expires().IsZero() && !time.Now().Before(claims.Expires())
}

func (m *DebugModule) debugDeliveryInterval() time.Duration {
	return debugDeliveryInterval(m.config)
}

func debugDeliveryInterval(cfg DebugConfig) time.Duration {
	interval := cfg.LiveRevalidateInterval
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
		err = preserveDebugWebSocketPrimaryError(err, c.CloseWithStatus(1008, "console access changed"))
	}
	return err
}
