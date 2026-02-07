package boot

import (
	"errors"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/listquery"
	router "github.com/goliatone/go-router"
)

var (
	errMissingID     = errors.New("missing id")
	errMissingAction = errors.New("action required")
	errMissingQuery  = errors.New("query required")
)

func safeWrapper(wrap HandlerWrapper) HandlerWrapper {
	if wrap != nil {
		return wrap
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return handler
	}
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
	parsed := listquery.ParseContext(c, 1, 10)
	predicates := make([]ListPredicate, 0, len(parsed.Predicates))
	for _, predicate := range parsed.Predicates {
		predicates = append(predicates, ListPredicate{
			Field:    predicate.Field,
			Operator: predicate.Operator,
			Values:   append([]string{}, predicate.Values...),
		})
	}
	return ListOptions{
		Page:       parsed.Page,
		PerPage:    parsed.PerPage,
		SortBy:     parsed.SortBy,
		SortDesc:   parsed.SortDesc,
		Search:     parsed.Search,
		Filters:    parsed.Filters,
		Predicates: predicates,
	}
}

func atoiDefault(val string, def int) int {
	if val == "" {
		return def
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	return def
}

func toString(v any) string {
	switch val := v.(type) {
	case string:
		return val
	case int:
		return strconv.Itoa(val)
	case int64:
		return strconv.FormatInt(val, 10)
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	default:
		return ""
	}
}
