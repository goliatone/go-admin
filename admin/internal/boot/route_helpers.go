package boot

import (
	"strings"

	"github.com/goliatone/go-admin/admin/internal/listquery"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

var (
	errMissingID     = bootValidationError("id", "missing id")
	errMissingAction = bootValidationError("action", "action required")
	errMissingQuery  = bootValidationError("query", "query required")
)

func bootValidationError(field, message string) error {
	return goerrors.New(message, goerrors.CategoryValidation).
		WithCode(400).
		WithTextCode("VALIDATION_ERROR").
		WithMetadata(map[string]any{
			"field": field,
		})
}

func safeWrapper(wrap HandlerWrapper) HandlerWrapper {
	if wrap != nil {
		return wrap
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return handler
	}
}

func withFeatureGate(responder Responder, gates FeatureGates, feature string, handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return nil
	}
	return func(c router.Context) error {
		if gates != nil {
			if err := gates.Require(feature); err != nil {
				if responder != nil {
					return responder.WriteError(c, err)
				}
				return err
			}
		}
		return handler(c)
	}
}

func withParsedBody(ctx BootCtx, responder Responder, handler func(router.Context, map[string]any) error) router.HandlerFunc {
	if handler == nil {
		return nil
	}
	return func(c router.Context) error {
		if ctx == nil {
			return errMissingAction
		}
		body, err := ctx.ParseBody(c)
		if err != nil {
			if responder != nil {
				return responder.WriteError(c, err)
			}
			return err
		}
		return handler(c, body)
	}
}

func writeJSONOrError(responder Responder, c router.Context, payload any, err error) error {
	if err != nil {
		if responder == nil {
			return err
		}
		return responder.WriteError(c, err)
	}
	if responder == nil {
		return nil
	}
	return responder.WriteJSON(c, payload)
}

func applyRoutes(ctx BootCtx, routes []RouteSpec) error {
	if ctx == nil {
		return nil
	}
	r := ctx.Router()
	if r == nil || len(routes) == 0 {
		return nil
	}
	wrap := safeWrapper(ctx.AuthWrapper())
	for _, route := range routes {
		if route.Handler == nil || route.Path == "" {
			continue
		}
		handler := wrap(route.Handler)
		switch strings.ToUpper(route.Method) {
		case "GET", "":
			r.Get(route.Path, handler)
		case "POST":
			r.Post(route.Path, handler)
		case "PUT":
			r.Put(route.Path, handler)
		case "DELETE":
			r.Delete(route.Path, handler)
		default:
			return nil
		}
	}
	return nil
}

type routePathResolver interface {
	RoutePath(groupPath, route string) (string, error)
}

func routePath(ctx BootCtx, groupPath, route string) string {
	if ctx == nil {
		return ""
	}
	resolver, ok := ctx.URLs().(routePathResolver)
	if !ok || resolver == nil {
		return ""
	}
	path, err := resolver.RoutePath(groupPath, route)
	if err != nil {
		return ""
	}
	return prefixBasePath(ctx.BasePath(), path)
}

func routePathWithParams(ctx BootCtx, groupPath, route string, params map[string]string) string {
	path := routePath(ctx, groupPath, route)
	if path == "" || len(params) == 0 {
		return path
	}
	for key, value := range params {
		if key == "" {
			continue
		}
		path = strings.ReplaceAll(path, ":"+key, value)
	}
	return path
}

func adminBasePath(ctx BootCtx) string {
	if ctx == nil {
		return ""
	}
	path := routePath(ctx, "admin", "dashboard")
	if path == "" {
		return normalizeBasePath(ctx.BasePath())
	}
	if path == "/" {
		return ""
	}
	return strings.TrimSuffix(path, "/")
}

func prefixBasePath(basePath, path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	path = ensureLeadingSlash(path)
	basePath = normalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return path
	}
	if path == basePath || strings.HasPrefix(path, basePath+"/") {
		return path
	}
	return joinBasePath(basePath, path)
}

func joinBasePath(basePath, routePath string) string {
	basePath = normalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return ensureLeadingSlash(routePath)
	}
	trimmed := strings.TrimPrefix(strings.TrimSpace(routePath), "/")
	if trimmed == "" {
		return basePath
	}
	return basePath + "/" + trimmed
}

func normalizeBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.Trim(trimmed, "/")
}

func ensureLeadingSlash(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}

func parseListOptions(c router.Context) ListOptions {
	opts := listquery.ParseOptions(c, 1, 10, func(predicate listquery.Predicate) ListPredicate {
		return ListPredicate{
			Field:    predicate.Field,
			Operator: predicate.Operator,
			Values:   append([]string{}, predicate.Values...),
		}
	})
	return ListOptions(opts)
}

func atoiDefault(val string, def int) int {
	return listquery.AtoiDefault(val, def)
}

func toString(v any) string {
	return listquery.ToString(v)
}

func queryInt(c router.Context, key string, def int) int {
	val := c.Query(key)
	return atoiDefault(val, def)
}
