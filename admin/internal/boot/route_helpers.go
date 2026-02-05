package boot

import (
	"errors"
	"strconv"
	"strings"

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
	page := atoiDefault(c.Query("page"), 0)
	per := atoiDefault(c.Query("per_page"), 0)
	if per <= 0 {
		per = atoiDefault(c.Query("limit"), 0)
	}
	if page <= 0 && per > 0 {
		offset := atoiDefault(c.Query("offset"), 0)
		page = (offset / per) + 1
	}
	if page <= 0 {
		page = 1
	}
	if per <= 0 {
		per = 10
	}
	sort := c.Query("sort")
	sortDesc := c.Query("sort_desc") == "true"
	search := c.Query("search")

	if sort == "" {
		if order := c.Query("order"); order != "" {
			first := strings.Split(order, ",")[0]
			parts := strings.Fields(first)
			if len(parts) > 0 {
				sort = parts[0]
				if len(parts) > 1 {
					sortDesc = strings.ToLower(parts[1]) == "desc"
				}
			}
		}
	}

	filters := map[string]any{}
	reservedKeys := map[string]struct{}{
		"page":        {},
		"per_page":    {},
		"sort":        {},
		"sort_desc":   {},
		"search":      {},
		"limit":       {},
		"offset":      {},
		"order":       {},
		"env":         {},
		"environment": {},
		"locale":      {},
	}
	for key, val := range c.Queries() {
		if len(val) == 0 {
			continue
		}
		if len(key) > len("filter_") && key[:7] == "filter_" {
			filters[key[7:]] = val
			continue
		}
		if _, reserved := reservedKeys[key]; reserved {
			continue
		}
		if strings.HasSuffix(key, "__ilike") || strings.HasSuffix(key, "__like") {
			if search == "" {
				term := strings.Trim(val, "%")
				if idx := strings.Index(term, ","); idx != -1 {
					term = term[:idx]
				}
				search = strings.TrimSpace(term)
			}
			continue
		}
		if base := strings.SplitN(key, "__", 2); len(base) > 1 {
			if _, exists := filters[base[0]]; !exists && base[0] != "" {
				filters[base[0]] = val
			}
			continue
		}
		if _, exists := filters[key]; !exists {
			filters[key] = val
		}
	}
	if _, ok := filters["environment"]; !ok {
		if env := strings.TrimSpace(c.Query("env")); env != "" {
			filters["environment"] = env
		} else if env := strings.TrimSpace(c.Query("environment")); env != "" {
			filters["environment"] = env
		}
	}

	return ListOptions{
		Page:     page,
		PerPage:  per,
		SortBy:   sort,
		SortDesc: sortDesc,
		Search:   search,
		Filters:  filters,
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
