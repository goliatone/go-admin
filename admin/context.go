package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	usersactivity "github.com/goliatone/go-users/activity"
)

// AdminContext carries request-scoped information into panel operations.
type AdminContext struct {
	Context     context.Context
	UserID      string
	TenantID    string
	OrgID       string
	Environment string
	Locale      string
	RenderMode  DashboardRenderMode
	Theme       *ThemeSelection
	Translator  Translator
}

type DashboardRenderMode string

const (
	DashboardRenderModeClient DashboardRenderMode = "client"
	DashboardRenderModeSSR    DashboardRenderMode = "ssr"
)

type adminContextKey string

const userIDContextKey adminContextKey = "admin.user_id"
const localeContextKey adminContextKey = "admin.locale"
const tenantIDContextKey adminContextKey = "admin.tenant_id"
const orgIDContextKey adminContextKey = "admin.org_id"
const environmentContextKey adminContextKey = "admin.environment"
const renderModeContextKey adminContextKey = "admin.render_mode"
const queryParamsContextKey adminContextKey = "admin.query_params"

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// BatchAuthorizer allows evaluating multiple permissions in one call.
type BatchAuthorizer interface {
	Authorizer
	CanAny(ctx context.Context, resource string, permissions ...string) bool
	CanAll(ctx context.Context, resource string, permissions ...string) bool
}

// CanAny returns true when any provided permission is allowed.
func CanAny(authorizer Authorizer, ctx context.Context, resource string, permissions ...string) bool {
	if authorizer == nil {
		return false
	}
	filtered := compactPermissions(permissions...)
	if len(filtered) == 0 {
		return false
	}
	if batch, ok := authorizer.(BatchAuthorizer); ok && batch != nil {
		return batch.CanAny(ctx, resource, filtered...)
	}
	for _, permission := range filtered {
		if authorizer.Can(ctx, permission, resource) {
			return true
		}
	}
	return false
}

// CanAll returns true when all provided permissions are allowed.
func CanAll(authorizer Authorizer, ctx context.Context, resource string, permissions ...string) bool {
	if authorizer == nil {
		return false
	}
	filtered := compactPermissions(permissions...)
	if len(filtered) == 0 {
		return true
	}
	if batch, ok := authorizer.(BatchAuthorizer); ok && batch != nil {
		return batch.CanAll(ctx, resource, filtered...)
	}
	for _, permission := range filtered {
		if !authorizer.Can(ctx, permission, resource) {
			return false
		}
	}
	return true
}

func compactPermissions(values ...string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// newAdminContext builds an AdminContext from an HTTP request.
func newAdminContextFromRouter(c router.Context, locale string) AdminContext {
	ctx := c.Context()
	renderMode := dashboardRenderModeFromContext(ctx)
	if renderMode == "" {
		renderMode = DashboardRenderModeClient
	}
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	tenantID := ""
	orgID := ""
	environment := strings.TrimSpace(c.Query("env"))
	if environment == "" {
		environment = strings.TrimSpace(c.Query("environment"))
	}
	actor := actorFromRouterOrClaims(c, ctx)
	if actor != nil {
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
	}
	if tenantID == "" {
		tenantID = strings.TrimSpace(c.Query("tenant_id"))
	}
	if orgID == "" {
		orgID = strings.TrimSpace(c.Query("org_id"))
	}
	if actor == nil && userID != "" {
		actor = &auth.ActorContext{
			ActorID:        userID,
			Subject:        userID,
			TenantID:       tenantID,
			OrganizationID: orgID,
		}
	}
	if actor != nil {
		if actor.ActorID == "" {
			actor.ActorID = userID
		}
		if actor.Subject == "" {
			actor.Subject = actor.ActorID
		}
		if actor.TenantID == "" {
			actor.TenantID = tenantID
		}
		if actor.OrganizationID == "" {
			actor.OrganizationID = orgID
		}
		if userID == "" {
			userID = primitives.FirstNonEmptyRaw(actor.ActorID, actor.Subject)
		}
		ctx = auth.WithActorContext(ctx, actor)
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
	if environment != "" {
		ctx = WithEnvironment(ctx, environment)
	}
	if locale != "" {
		ctx = context.WithValue(ctx, localeContextKey, locale)
	}
	ctx = withDashboardRenderMode(ctx, renderMode)
	if queries := c.Queries(); len(queries) > 0 {
		ctx = withQueryParams(ctx, queries)
	}
	return AdminContext{
		Context:     ctx,
		UserID:      userID,
		TenantID:    tenantID,
		OrgID:       orgID,
		Environment: environment,
		Locale:      locale,
		RenderMode:  renderMode,
	}
}

func actorFromRouterOrClaims(c router.Context, ctx context.Context) *auth.ActorContext {
	if c != nil {
		if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
			return actor
		}
	}
	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		if actor := auth.ActorContextFromClaims(claims); actor != nil {
			return actor
		}
	}
	return nil
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

// WithLocale stores the active locale on the context.
func WithLocale(ctx context.Context, locale string) context.Context {
	if ctx == nil {
		return ctx
	}
	locale = strings.TrimSpace(locale)
	if locale == "" {
		return ctx
	}
	return context.WithValue(ctx, localeContextKey, locale)
}

// WithEnvironment stores the active environment on the context.
func WithEnvironment(ctx context.Context, environment string) context.Context {
	if ctx == nil {
		return ctx
	}
	environment = strings.TrimSpace(environment)
	if environment == "" {
		return ctx
	}
	return context.WithValue(ctx, environmentContextKey, environment)
}

// EnvironmentFromContext returns the active environment stored on the context.
func EnvironmentFromContext(ctx context.Context) string {
	return environmentFromContext(ctx)
}

// WithDashboardRenderMode stores the active dashboard render mode on context.
func WithDashboardRenderMode(ctx context.Context, mode DashboardRenderMode) context.Context {
	return withDashboardRenderMode(ctx, mode)
}

// DashboardRenderModeFromContext returns the active dashboard render mode.
func DashboardRenderModeFromContext(ctx context.Context) DashboardRenderMode {
	return dashboardRenderModeFromContext(ctx)
}

func environmentFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if env, ok := ctx.Value(environmentContextKey).(string); ok && env != "" {
		return env
	}
	return ""
}

func withDashboardRenderMode(ctx context.Context, mode DashboardRenderMode) context.Context {
	if ctx == nil {
		return ctx
	}
	mode = normalizeDashboardRenderMode(mode)
	if mode == "" {
		return ctx
	}
	return context.WithValue(ctx, renderModeContextKey, string(mode))
}

func dashboardRenderModeFromContext(ctx context.Context) DashboardRenderMode {
	if ctx == nil {
		return ""
	}
	if mode, ok := ctx.Value(renderModeContextKey).(string); ok {
		return normalizeDashboardRenderMode(DashboardRenderMode(mode))
	}
	return ""
}

func normalizeDashboardRenderMode(mode DashboardRenderMode) DashboardRenderMode {
	switch DashboardRenderMode(strings.TrimSpace(string(mode))) {
	case DashboardRenderModeSSR:
		return DashboardRenderModeSSR
	case DashboardRenderModeClient:
		return DashboardRenderModeClient
	default:
		return ""
	}
}

func defaultSessionIDProvider() usersactivity.SessionIDProvider {
	return usersactivity.SessionIDProviderFunc(sessionIDFromContext)
}

func sessionIDFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		if sessionID, ok := sessionIDFromClaims(claims); ok {
			return sessionID, true
		}
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if sessionID := strings.TrimSpace(toString(actor.Metadata["session_id"])); sessionID != "" {
			return sessionID, true
		}
	}
	return "", false
}

func sessionIDFromClaims(claims auth.AuthClaims) (string, bool) {
	if claims == nil {
		return "", false
	}
	type tokenIDProvider interface {
		TokenID() string
	}
	if provider, ok := claims.(tokenIDProvider); ok && provider != nil {
		if id := strings.TrimSpace(provider.TokenID()); id != "" {
			return id, true
		}
	}
	type jtiProvider interface {
		JTI() string
	}
	if provider, ok := claims.(jtiProvider); ok && provider != nil {
		if id := strings.TrimSpace(provider.JTI()); id != "" {
			return id, true
		}
	}
	if jwtClaims, ok := claims.(*auth.JWTClaims); ok {
		if id := strings.TrimSpace(jwtClaims.ID); id != "" {
			return id, true
		}
	}
	if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok && carrier != nil {
		if metadata := carrier.ClaimsMetadata(); len(metadata) > 0 {
			if sessionID := strings.TrimSpace(toString(metadata["session_id"])); sessionID != "" {
				return sessionID, true
			}
		}
	}
	return "", false
}

func withQueryParams(ctx context.Context, params map[string]string) context.Context {
	if ctx == nil || len(params) == 0 {
		return ctx
	}
	clone := map[string][]string{}
	for key, value := range params {
		if strings.TrimSpace(value) == "" {
			continue
		}
		clone[key] = []string{value}
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
