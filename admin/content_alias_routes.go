package admin

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"

	router "github.com/goliatone/go-router"
)

func (a *Admin) registerContentEntryAliases() {
	if a == nil || a.router == nil || a.contentAliasRoutesRegistered {
		return
	}
	if !featureEnabled(a.featureGate, FeatureCMS) {
		return
	}
	aliases := a.contentEntryAliases()
	if len(aliases) == 0 {
		return
	}
	a.contentAliasRoutesRegistered = true

	wrap := a.authWrapper()
	for _, alias := range aliases {
		aliasBase := joinBasePath(adminBasePath(a.config), alias)
		handler := a.contentAliasHandler(alias, aliasBase)
		a.router.Get(aliasBase, wrap(handler))
		a.router.Get(aliasBase+"/*path", wrap(handler))
	}
}

func (a *Admin) contentEntryAliases() []string {
	if a == nil || a.contentTypeSvc == nil {
		return nil
	}
	types, err := a.contentTypeSvc.ContentTypes(context.Background())
	if err != nil {
		return nil
	}
	seen := map[string]string{}
	for _, ct := range types {
		for _, candidate := range []string{
			strings.TrimSpace(ct.Slug),
			panelSlugForContentType(&ct),
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

func (a *Admin) contentAliasHandler(alias string, aliasBase string) router.HandlerFunc {
	return func(c router.Context) error {
		if c == nil {
			return ErrNotFound
		}
		ctx := c.Context()
		if env := aliasEnvironment(c); env != "" {
			ctx = WithEnvironment(ctx, env)
		}

		panelSlug := a.resolvePanelSlugAlias(ctx, alias)
		if panelSlug == "" {
			panelSlug = alias
		}
		target := resolveURLWith(a.urlManager, "admin", "content.panel", map[string]string{"panel": panelSlug}, nil)
		if target == "" {
			target = joinBasePath(adminBasePath(a.config), path.Join("content", panelSlug))
		}

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

func (a *Admin) resolvePanelSlugAlias(ctx context.Context, alias string) string {
	alias = strings.TrimSpace(alias)
	if alias == "" {
		return ""
	}
	if a == nil || a.contentTypeSvc == nil {
		return alias
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if contentType, err := a.contentTypeSvc.ContentTypeBySlug(ctx, alias); err == nil && contentType != nil {
		if slug := panelSlugForContentType(contentType); slug != "" {
			return slug
		}
	}
	types, err := a.contentTypeSvc.ContentTypes(ctx)
	if err != nil {
		return alias
	}
	for _, ct := range types {
		panelSlug := panelSlugForContentType(&ct)
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

func aliasEnvironment(c router.Context) string {
	if c == nil {
		return ""
	}
	env := strings.TrimSpace(c.Query("env"))
	if env == "" {
		env = strings.TrimSpace(c.Query("environment"))
	}
	return env
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
