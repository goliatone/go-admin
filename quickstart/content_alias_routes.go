package quickstart

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// ContentAliasRouteOption customizes the content entry alias route registration.
type ContentAliasRouteOption func(*contentAliasRouteOptions)

type contentAliasRouteOptions struct {
	basePath string
	aliases  []string
}

// WithContentAliasBasePath overrides the base path used to build alias routes.
func WithContentAliasBasePath(basePath string) ContentAliasRouteOption {
	return func(opts *contentAliasRouteOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentAliasRoutes overrides the aliases that should be registered.
func WithContentAliasRoutes(aliases ...string) ContentAliasRouteOption {
	return func(opts *contentAliasRouteOptions) {
		if opts == nil {
			return
		}
		opts.aliases = nil
		for _, alias := range aliases {
			if trimmed := strings.TrimSpace(alias); trimmed != "" {
				opts.aliases = append(opts.aliases, trimmed)
			}
		}
	}
}

// RegisterContentEntryAliasRoutes registers content entry alias routes for content panels.
func RegisterContentEntryAliasRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentAliasRouteOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := contentAliasRouteOptions{
		basePath: strings.TrimSpace(cfg.BasePath),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.basePath == "" {
		options.basePath = "/"
	}
	if len(options.aliases) == 0 {
		options.aliases = contentEntryAliasesFromAdmin(adm)
	}
	if len(options.aliases) == 0 {
		return nil
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	for _, alias := range options.aliases {
		aliasBase := path.Join(options.basePath, alias)
		handler := wrap(contentAliasHandler(adm, alias, aliasBase, options.basePath))
		r.Get(aliasBase, handler)
		r.Get(aliasBase+"/*path", handler)
	}
	return nil
}

func contentEntryAliasesFromAdmin(adm *admin.Admin) []string {
	if adm == nil || adm.ContentTypeService() == nil {
		return nil
	}
	types, err := adm.ContentTypeService().ContentTypes(context.Background())
	if err != nil {
		return nil
	}
	seen := map[string]string{}
	for _, ct := range types {
		for _, candidate := range []string{
			strings.TrimSpace(ct.Slug),
			panelSlugFromCapabilities(ct.Capabilities),
		} {
			candidate = strings.TrimSpace(candidate)
			if candidate == "" {
				continue
			}
			key := strings.ToLower(candidate)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = candidate
		}
	}
	if len(seen) == 0 {
		return nil
	}
	out := make([]string, 0, len(seen))
	for _, alias := range seen {
		out = append(out, alias)
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i]) < strings.ToLower(out[j])
	})
	return out
}

func contentAliasHandler(adm *admin.Admin, alias string, aliasBase string, basePath string) router.HandlerFunc {
	return func(c router.Context) error {
		if c == nil {
			return admin.ErrNotFound
		}
		ctx := c.Context()
		if env := resolveEnvironment(c); env != "" {
			ctx = admin.WithEnvironment(ctx, env)
		}
		panelSlug := resolveContentEntryAliasPanelSlug(ctx, adm, alias)
		if panelSlug == "" {
			panelSlug = alias
		}
		target := path.Join(basePath, "content", panelSlug)

		suffix := strings.TrimPrefix(c.Path(), aliasBase)
		if suffix != "" && !strings.HasPrefix(suffix, "/") {
			suffix = "/" + suffix
		}
		if suffix != "" {
			target += suffix
		}

		if rawQuery := rawQueryFromOriginalURL(c.OriginalURL()); rawQuery != "" {
			if strings.Contains(target, "?") {
				target = target + "&" + rawQuery
			} else {
				target = target + "?" + rawQuery
			}
		}
		return c.Redirect(target, http.StatusFound)
	}
}

func resolveContentEntryAliasPanelSlug(ctx context.Context, adm *admin.Admin, alias string) string {
	alias = strings.TrimSpace(alias)
	if alias == "" {
		return ""
	}
	if adm == nil {
		return alias
	}
	contentTypes := adm.ContentTypeService()
	if contentTypes == nil {
		return alias
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if ct, err := contentTypes.ContentTypeBySlug(ctx, alias); err == nil && ct != nil {
		if slug := panelSlugFromCapabilities(ct.Capabilities); slug != "" {
			return slug
		}
		if ctSlug := strings.TrimSpace(ct.Slug); ctSlug != "" {
			return ctSlug
		}
	}
	types, err := contentTypes.ContentTypes(ctx)
	if err != nil {
		return alias
	}
	for _, ct := range types {
		panelSlug := panelSlugFromCapabilities(ct.Capabilities)
		if panelSlug != "" && strings.EqualFold(panelSlug, alias) {
			return panelSlug
		}
		if strings.EqualFold(strings.TrimSpace(ct.Slug), alias) {
			if panelSlug != "" {
				return panelSlug
			}
			return alias
		}
	}
	return alias
}

func panelSlugFromCapabilities(capabilities map[string]any) string {
	if len(capabilities) == 0 {
		return ""
	}
	for _, key := range []string{"panel_slug", "panelSlug", "panel-slug"} {
		if raw, ok := capabilities[key]; ok {
			if value := capabilityStringValue(raw); value != "" {
				return value
			}
		}
	}
	return ""
}

func capabilityStringValue(raw any) string {
	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value)
	case []string:
		if len(value) == 0 {
			return ""
		}
		return strings.TrimSpace(value[0])
	case []any:
		if len(value) == 0 {
			return ""
		}
		if v, ok := value[0].(string); ok {
			return strings.TrimSpace(v)
		}
		return strings.TrimSpace(fmt.Sprint(value[0]))
	case map[string]any:
		for _, key := range []string{"value", "name", "key", "slug", "id"} {
			if nested, ok := value[key]; ok {
				if out := capabilityStringValue(nested); out != "" {
					return out
				}
			}
		}
		return ""
	default:
		return strings.TrimSpace(fmt.Sprint(raw))
	}
}

func rawQueryFromOriginalURL(raw string) string {
	if raw == "" {
		return ""
	}
	if parsed, err := url.Parse(raw); err == nil {
		return parsed.RawQuery
	}
	if idx := strings.Index(raw, "?"); idx >= 0 && idx+1 < len(raw) {
		return raw[idx+1:]
	}
	return ""
}
