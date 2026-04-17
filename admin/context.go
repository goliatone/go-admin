package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	auth "github.com/goliatone/go-auth"
	i18n "github.com/goliatone/go-i18n"
	router "github.com/goliatone/go-router"
	usersactivity "github.com/goliatone/go-users/activity"
)

// AdminContext carries request-scoped information into panel operations.
type AdminContext struct {
	Context         context.Context `json:"context"`
	UserID          string          `json:"user_id"`
	TenantID        string          `json:"tenant_id"`
	OrgID           string          `json:"org_id"`
	Channel         string          `json:"channel"`
	Environment     string          `json:"environment"`
	Locale          string          `json:"locale"`
	FallbackLocales []string        `json:"fallback_locales,omitempty"`
	Theme           *ThemeSelection `json:"theme"`
	Translator      Translator      `json:"translator"`
}

type adminContextKey string

const userIDContextKey adminContextKey = "admin.user_id"
const localeContextKey adminContextKey = "admin.locale"
const tenantIDContextKey adminContextKey = "admin.tenant_id"
const orgIDContextKey adminContextKey = "admin.org_id"
const environmentContextKey adminContextKey = "admin.environment"
const contentChannelContextKey adminContextKey = "admin.content_channel"
const requestIDContextKey adminContextKey = "admin.request_id"
const correlationIDContextKey adminContextKey = "admin.correlation_id"
const traceIDContextKey adminContextKey = "admin.trace_id"
const requestIPContextKey adminContextKey = "admin.request_ip"
const queryParamsContextKey adminContextKey = "admin.query_params"
const localeFallbackContextKey adminContextKey = "admin.locale_fallback_allowed"
const authenticatedRequestContextKey adminContextKey = "admin.authenticated_request"
const translationFamilyExpansionContextKey adminContextKey = "admin.translation_family_expansion"

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

func WithAuthenticatedRequest(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, authenticatedRequestContextKey, true)
}

func withTranslationFamilyExpansion(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, translationFamilyExpansionContextKey, true)
}

func translationFamilyExpansionFromContext(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	enabled, _ := ctx.Value(translationFamilyExpansionContextKey).(bool)
	return enabled
}

func authenticatedRequestFromContext(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	authenticated, _ := ctx.Value(authenticatedRequestContextKey).(bool)
	return authenticated
}

func markAuthenticatedRequest(c router.Context) {
	if c == nil {
		return
	}
	c.SetContext(WithAuthenticatedRequest(c.Context()))
}

func resolveContentChannelFromRouter(c router.Context) string {
	if c == nil {
		return ""
	}
	candidates := []string{
		c.Query(ContentChannelScopeQueryParam),
		c.Query("channel"),
		c.Query("content_channel"),
		c.Header("X-Admin-Channel"),
		c.Header("X-Content-Channel"),
		c.Cookies("admin_channel"),
	}
	for _, candidate := range candidates {
		if channel := strings.TrimSpace(candidate); channel != "" {
			return channel
		}
	}
	return ""
}

func resolveAdminLocaleFromRouter(c router.Context, fallback string, activeLocales []string) string {
	fallback = i18n.NormalizeLocale(fallback)
	if c == nil {
		return fallback
	}
	if requested := i18n.NormalizeLocale(c.Query("locale")); requested != "" {
		return requested
	}
	if requested := i18n.NormalizeLocale(c.Query("requested_locale")); requested != "" {
		return requested
	}
	contextLocale := i18n.NormalizeLocale(localeFromContext(c.Context()))
	headerCandidates := normalizeLocaleCandidates(activeLocales...)
	if len(headerCandidates) == 0 {
		headerCandidates = normalizeLocaleCandidates(contextLocale, fallback)
	}
	headerLocale := resolveAcceptLanguageLocale(c.Header("Accept-Language"), headerCandidates...)
	if headerLocale != "" {
		return headerLocale
	}
	if contextLocale != "" {
		return contextLocale
	}
	return fallback
}

func normalizeLocaleCandidates(values ...string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := i18n.NormalizeLocale(value)
		if normalized == "" {
			continue
		}
		key := strings.ToLower(normalized)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveAcceptLanguageLocale(header string, candidates ...string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}
	normalized := i18n.NormalizeLocales(candidates)
	if len(normalized) == 0 {
		return ""
	}
	catalog, err := i18n.NewLocaleCatalogFromLocales(normalized[0], normalized)
	if err != nil {
		return ""
	}
	if catalog == nil {
		return ""
	}
	if meta, ok := catalog.MatchAcceptLanguageWithOptions(header, i18n.MatchOptions{
		Scope: i18n.ScopeActiveOnly,
	}); ok {
		return meta.Code
	}
	return ""
}

type adminRequestMetadata struct {
	requestID     string
	correlationID string
	traceID       string
	requestIP     string
}

func newAdminRequestMetadata(c router.Context) adminRequestMetadata {
	if c == nil {
		return adminRequestMetadata{}
	}
	meta := adminRequestMetadata{
		requestID: strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Header("X-Request-ID"), c.Header("X-Request-Id"), c.Header("x-request-id"))),
		correlationID: strings.TrimSpace(primitives.FirstNonEmptyRaw(
			c.Header("X-Correlation-ID"),
			c.Header("X-Correlation-Id"),
			c.Header("x-correlation-id"),
		)),
		traceID: strings.TrimSpace(primitives.FirstNonEmptyRaw(
			c.Header("X-Trace-ID"),
			c.Header("X-Trace-Id"),
			c.Header("x-trace-id"),
			c.Header("traceparent"),
		)),
		requestIP: strings.TrimSpace(c.IP()),
	}
	if meta.requestID == "" {
		meta.requestID = strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("request_id"), c.Query("requestId")))
	}
	if meta.correlationID == "" {
		meta.correlationID = strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("correlation_id"), c.Query("correlationId")))
	}
	if meta.traceID == "" {
		meta.traceID = strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("trace_id"), c.Query("traceId"), meta.correlationID))
	}
	return meta
}

type adminRouterIdentity struct {
	userID   string
	tenantID string
	orgID    string
	actor    *auth.ActorContext
}

func newAdminRouterIdentity(c router.Context, ctx context.Context) adminRouterIdentity {
	identity := adminRouterIdentity{
		userID:   strings.TrimSpace(c.Header("X-User-ID")),
		tenantID: strings.TrimSpace(c.Query("tenant_id")),
		orgID:    strings.TrimSpace(c.Query("org_id")),
		actor:    actorFromRouterOrClaims(c, ctx),
	}
	if identity.actor == nil {
		return identity
	}
	if identity.actor.ActorID != "" {
		identity.userID = identity.actor.ActorID
	} else if identity.actor.Subject != "" {
		identity.userID = identity.actor.Subject
	}
	if identity.actor.TenantID != "" {
		identity.tenantID = identity.actor.TenantID
	}
	if identity.actor.OrganizationID != "" {
		identity.orgID = identity.actor.OrganizationID
	}
	return identity
}

func ensureAdminRouterActor(identity adminRouterIdentity) adminRouterIdentity {
	if identity.actor == nil && identity.userID != "" {
		identity.actor = &auth.ActorContext{
			ActorID:        identity.userID,
			Subject:        identity.userID,
			TenantID:       identity.tenantID,
			OrganizationID: identity.orgID,
		}
	}
	if identity.actor == nil {
		return identity
	}
	if identity.actor.ActorID == "" {
		identity.actor.ActorID = identity.userID
	}
	if identity.actor.Subject == "" {
		identity.actor.Subject = identity.actor.ActorID
	}
	if identity.actor.TenantID == "" {
		identity.actor.TenantID = identity.tenantID
	}
	if identity.actor.OrganizationID == "" {
		identity.actor.OrganizationID = identity.orgID
	}
	if identity.userID == "" {
		identity.userID = primitives.FirstNonEmptyRaw(identity.actor.ActorID, identity.actor.Subject)
	}
	return identity
}

func withAdminRouterIdentity(ctx context.Context, identity adminRouterIdentity) context.Context {
	if identity.actor != nil {
		ctx = auth.WithActorContext(ctx, identity.actor)
	}
	if identity.userID != "" {
		ctx = context.WithValue(ctx, userIDContextKey, identity.userID)
	}
	if identity.tenantID != "" {
		ctx = context.WithValue(ctx, tenantIDContextKey, identity.tenantID)
	}
	if identity.orgID != "" {
		ctx = context.WithValue(ctx, orgIDContextKey, identity.orgID)
	}
	return ctx
}

func withAdminRequestMetadata(ctx context.Context, meta adminRequestMetadata) context.Context {
	if meta.requestID != "" {
		ctx = context.WithValue(ctx, requestIDContextKey, meta.requestID)
	}
	if meta.correlationID != "" {
		ctx = context.WithValue(ctx, correlationIDContextKey, meta.correlationID)
	}
	if meta.traceID != "" {
		ctx = context.WithValue(ctx, traceIDContextKey, meta.traceID)
	}
	if meta.requestIP != "" {
		ctx = WithRequestIP(ctx, meta.requestIP)
	}
	return ctx
}

// newAdminContext builds an AdminContext from an HTTP request.
func newAdminContextFromRouter(c router.Context, locale string) AdminContext {
	ctx := c.Context()
	channel := resolveContentChannelFromRouter(c)
	environment := channel
	meta := newAdminRequestMetadata(c)
	identity := ensureAdminRouterActor(newAdminRouterIdentity(c, ctx))
	ctx = withAdminRouterIdentity(ctx, identity)
	if channel != "" {
		ctx = WithContentChannel(ctx, channel)
	}
	if environment != "" {
		ctx = WithEnvironment(ctx, environment)
	}
	ctx = withAdminRequestMetadata(ctx, meta)
	locale = i18n.NormalizeLocale(locale)
	if locale != "" {
		ctx = context.WithValue(ctx, localeContextKey, locale)
	}
	if queries := c.Queries(); len(queries) > 0 {
		ctx = withQueryParams(ctx, queries)
	}
	return AdminContext{
		Context:     ctx,
		UserID:      identity.userID,
		TenantID:    identity.tenantID,
		OrgID:       identity.orgID,
		Channel:     strings.TrimSpace(primitives.FirstNonEmptyRaw(channel, environment)),
		Environment: environment,
		Locale:      locale,
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
		return i18n.NormalizeLocale(locale)
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
	locale = i18n.NormalizeLocale(locale)
	if locale == "" {
		return ctx
	}
	return context.WithValue(ctx, localeContextKey, locale)
}

// WithRequestIP stores the request IP on the context for downstream modules/services.
func WithRequestIP(ctx context.Context, requestIP string) context.Context {
	if ctx == nil {
		return ctx
	}
	requestIP = strings.TrimSpace(requestIP)
	if requestIP == "" {
		return ctx
	}
	return context.WithValue(ctx, requestIPContextKey, requestIP)
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

// WithContentChannel stores the active content channel on the context.
func WithContentChannel(ctx context.Context, channel string) context.Context {
	if ctx == nil {
		return ctx
	}
	channel = strings.TrimSpace(channel)
	if channel == "" {
		return ctx
	}
	ctx = context.WithValue(ctx, contentChannelContextKey, channel)
	// Keep environment key in sync for compatibility with existing call sites.
	return context.WithValue(ctx, environmentContextKey, channel)
}

// WithLocaleFallback stores locale fallback policy on the context.
// The default behavior remains enabled when this value is not set.
func WithLocaleFallback(ctx context.Context, allow bool) context.Context {
	if ctx == nil {
		return ctx
	}
	return context.WithValue(ctx, localeFallbackContextKey, allow)
}

// LocaleFallbackAllowed reports locale fallback policy from context.
// When no explicit value exists, fallback remains enabled.
func LocaleFallbackAllowed(ctx context.Context) bool {
	return localeFallbackAllowed(ctx)
}

// EnvironmentFromContext returns the active environment stored on the context.
func EnvironmentFromContext(ctx context.Context) string {
	return environmentFromContext(ctx)
}

// ContentChannelFromContext returns the active content channel stored on the context.
func ContentChannelFromContext(ctx context.Context) string {
	return contentChannelFromContext(ctx)
}

func environmentFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if env, ok := ctx.Value(environmentContextKey).(string); ok && env != "" {
		return env
	}
	if channel, ok := ctx.Value(contentChannelContextKey).(string); ok && channel != "" {
		return channel
	}
	return ""
}

func contentChannelFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if channel, ok := ctx.Value(contentChannelContextKey).(string); ok && channel != "" {
		return channel
	}
	if env, ok := ctx.Value(environmentContextKey).(string); ok && env != "" {
		return env
	}
	return ""
}

func localeFallbackAllowed(ctx context.Context) bool {
	if ctx == nil {
		return true
	}
	if allow, ok := ctx.Value(localeFallbackContextKey).(bool); ok {
		return allow
	}
	return true
}

func requestIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if requestID, ok := ctx.Value(requestIDContextKey).(string); ok && requestID != "" {
		return requestID
	}
	return ""
}

func correlationIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if correlationID, ok := ctx.Value(correlationIDContextKey).(string); ok && correlationID != "" {
		return correlationID
	}
	return ""
}

func traceIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if traceID, ok := ctx.Value(traceIDContextKey).(string); ok && traceID != "" {
		return traceID
	}
	return strings.TrimSpace(correlationIDFromContext(ctx))
}

// RequestIPFromContext returns the request IP address captured for the active admin context.
func RequestIPFromContext(ctx context.Context) string {
	return requestIPFromContext(ctx)
}

func requestIPFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if requestIP, ok := ctx.Value(requestIPContextKey).(string); ok && requestIP != "" {
		return requestIP
	}
	return ""
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
