package admin

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path"
	"strings"
	"unicode"

	gerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// ActivityIngestionHTTPOptions opts into a producer-authenticated JSON route.
// Mount on the root router outside cookie/login middleware. Service must be the
// registered inline command service; verifiers must enforce producer-specific
// issuer/audience/purpose and never accept ordinary browser session credentials.
// No endpoint path option exists: configure URLs.URLKit[activity.ingest] instead.
type ActivityIngestionHTTPOptions struct {
	Enabled             bool
	Service             *ActivityIngestionService
	Verifier            ActivityProducerVerifier
	AttributionVerifier ActivityAttributionVerifier
}

// ActivityIngestionURL resolves the sole ingestion route in the effective,
// version-aware admin API group. Invalid/unresolved paths fail without a fallback.
func (a *Admin) ActivityIngestionURL() (string, error) {
	if a == nil || a.urlManager == nil {
		return "", ErrActivityIngestionUnavailable
	}
	resolved, err := a.urlManager.Resolve(adminAPIGroupName(a.config), ActivityIngestionRouteKey, nil, nil)
	if err != nil || !validActivityIngestionPath(resolved) {
		return "", ErrActivityIngestionUnavailable
	}
	return resolved, nil
}
func validActivityIngestionPath(value string) bool {
	if value == "" || !strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") || path.Clean(value) != value || strings.ContainsAny(value, "%\\:*{}?#") {
		return false
	}
	for _, r := range value {
		if unicode.IsSpace(r) || unicode.IsControl(r) {
			return false
		}
	}
	parsed, err := url.ParseRequestURI(value)
	return err == nil && parsed.Host == "" && parsed.Scheme == "" && parsed.Path == value
}

// RegisterActivityIngestionRoutes mounts exactly one POST when enabled, after
// checking migrations, command readiness, URLKit resolution and collisions.
// Responses are no-store JSON: 201 new commit, 200 replay, 400/401/403/409/413/415
// for client failures, 503 dependency outages, and safe 500 for unexpected errors.
// Bearer/assertion headers are transient and bounded to 8 KiB each. Host ingress
// limits still apply before framework adapters buffer a request body.
func RegisterActivityIngestionRoutes[T any](ctx context.Context, r router.Router[T], a *Admin, opts ActivityIngestionHTTPOptions) (err error) {
	if !opts.Enabled {
		return nil
	}
	if activityIngestionNil(r) || a == nil || opts.Service == nil || activityIngestionNil(opts.Verifier) || a.Commands() == nil {
		return ErrActivityIngestionUnavailable
	}
	if !a.Commands().CommandRegistration(ActivityIngestCommandName).SupportsInlineResult() {
		return ErrActivityIngestionUnavailable
	}
	if err = opts.Service.CheckReady(ctx); err != nil {
		return err
	}
	route, err := a.ActivityIngestionURL()
	if err != nil {
		return err
	}
	if prefixed, ok := any(r).(router.PrefixedRouter); ok && strings.Trim(prefixed.GetPrefix(), "/") != "" {
		return ErrActivityIngestionUnavailable
	}
	for _, existing := range r.Routes() {
		if existing.Name == ActivityIngestionRouteKey || (existing.Method == router.POST && activityIngestionRouteMatches(existing.Path, route)) {
			return ErrActivityIngestionConflict
		}
	}
	defer func() {
		if recover() != nil {
			err = ErrActivityIngestionConflict
		}
	}()
	r.Post(route, activityIngestionHTTPHandler(a.Commands(), opts)).SetName(ActivityIngestionRouteKey)
	return nil
}
func activityIngestionRouteMatches(pattern, target string) bool {
	a := strings.Split(strings.Trim(pattern, "/"), "/")
	b := strings.Split(strings.Trim(target, "/"), "/")
	for i, part := range a {
		if strings.HasPrefix(part, "*") {
			return true
		}
		if i >= len(b) {
			return false
		}
		if part != b[i] && !strings.HasPrefix(part, ":") {
			return false
		}
	}
	return len(a) == len(b)
}
func activityIngestionHTTPHandler(bus *CommandBus, opts ActivityIngestionHTTPOptions) router.HandlerFunc {
	return func(c router.Context) error {
		c.SetHeader("Cache-Control", "no-store")
		hc, ok := c.(router.HTTPContext)
		if !ok || hc.Request() == nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionUnavailable)
		}
		request := hc.Request()
		authorization, err := activityIngestionHeader(request.Header, "Authorization", 8192, true)
		if err != nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionUnauthenticated)
		}
		parts := strings.Split(authorization, " ")
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" || strings.ContainsAny(parts[1], ",\t\r\n") {
			return activityIngestionHTTPError(c, ErrActivityIngestionUnauthenticated)
		}
		principal, err := opts.Verifier.VerifyActivityProducer(c.Context(), ActivityProducerCredential{Bearer: parts[1]})
		if err != nil {
			return activityIngestionHTTPError(c, safeActivityAuthorityError(err))
		}
		if err = validateActivityProducer(principal, opts.Service.config.Issuer, opts.Service.config.Audience, opts.Service.config.Clock()); err != nil {
			return activityIngestionHTTPError(c, err)
		}
		// Never inherit actor evidence from an unrelated browser/middleware context.
		ctx := context.WithValue(c.Context(), activityAttributionContextKey{}, struct{}{})
		ctx = WithVerifiedActivityProducer(ctx, principal)
		proof, err := activityIngestionHeader(request.Header, "X-Activity-Actor-Assertion", 8192, false)
		if err != nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionForbidden)
		}
		if proof != "" {
			if activityIngestionNil(opts.AttributionVerifier) {
				return activityIngestionHTTPError(c, ErrActivityIngestionForbidden)
			}
			evidence, err := opts.AttributionVerifier.VerifyActivityAttribution(ctx, principal, proof)
			if err != nil {
				if errors.Is(err, ErrActivityIngestionForbidden) || errors.Is(err, ErrActivityIngestionUnauthenticated) {
					return activityIngestionHTTPError(c, ErrActivityIngestionForbidden)
				}
				return activityIngestionHTTPError(c, ErrActivityIngestionUnavailable)
			}
			ctx = WithVerifiedActivityAttribution(ctx, evidence)
		}
		if request.URL.RawQuery != "" || request.URL.ForceQuery {
			return activityIngestionHTTPError(c, ErrActivityIngestionInvalid)
		}
		media, err := activityIngestionHeader(request.Header, "Content-Type", 256, true)
		if err != nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionMediaType)
		}
		mediaType, _, err := mime.ParseMediaType(media)
		if err != nil || mediaType != "application/json" {
			return activityIngestionHTTPError(c, ErrActivityIngestionMediaType)
		}
		limit := int64(opts.Service.config.MaxEnvelopeBytes)
		if request.ContentLength > limit {
			return activityIngestionHTTPError(c, ErrActivityIngestionTooLarge)
		}
		if request.Body == nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionInvalid)
		}
		raw, err := io.ReadAll(io.LimitReader(request.Body, limit+1))
		if err != nil {
			return activityIngestionHTTPError(c, ErrActivityIngestionInvalid)
		}
		if int64(len(raw)) > limit {
			return activityIngestionHTTPError(c, ErrActivityIngestionTooLarge)
		}
		event, err := DecodeActivityIngestionEvent(raw)
		if err != nil {
			return activityIngestionHTTPError(c, err)
		}
		key, err := activityIngestionHeader(request.Header, "Idempotency-Key", 128, false)
		if err != nil || (key != "" && key != event.EventID) {
			return activityIngestionHTTPError(c, ErrActivityIngestionInvalid)
		}
		result, err := DispatchActivityIngestion(ctx, bus, ActivityIngestMsg{Event: event})
		if err != nil {
			return activityIngestionHTTPError(c, err)
		}
		status := http.StatusCreated
		if result.Replayed {
			status = http.StatusOK
		}
		return c.JSON(status, result)
	}
}
func activityIngestionHeader(headers http.Header, name string, limit int, required bool) (string, error) {
	values := []string{}
	for key, v := range headers {
		if strings.EqualFold(key, name) {
			values = append(values, v...)
		}
	}
	if len(values) == 0 && !required {
		return "", nil
	}
	if len(values) != 1 || values[0] == "" || len(values[0]) > limit || strings.TrimSpace(values[0]) != values[0] || strings.ContainsAny(values[0], "\r\n,") {
		return "", ErrActivityIngestionInvalid
	}
	return values[0], nil
}
func activityIngestionHTTPError(c router.Context, err error) error {
	safe := ErrActivityIngestionInternal
	for _, candidate := range []*gerrors.Error{ErrActivityIngestionInvalid, ErrActivityIngestionUnauthenticated, ErrActivityIngestionForbidden, ErrActivityIngestionConflict, ErrActivityIngestionTooLarge, ErrActivityIngestionMediaType, ErrActivityIngestionUnavailable, ErrActivityIngestionReplayVersion} {
		if errors.Is(err, candidate) {
			safe = candidate
			break
		}
	}
	if safe.Code == 401 {
		c.SetHeader("WWW-Authenticate", `Bearer realm="activity-ingestion"`)
	}
	c.SetHeader("Cache-Control", "no-store")
	return c.JSON(safe.Code, map[string]any{"error": safe.ToErrorResponse(false, nil)})
}
