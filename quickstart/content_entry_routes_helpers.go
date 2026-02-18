package quickstart

import (
	"net/url"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

func registerCanonicalContentEntryPanelRoutes[T any](
	r router.Router[T],
	adm *admin.Admin,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	handlers *contentEntryHandlers,
) {
	if r == nil || adm == nil || handlers == nil || adm.Registry() == nil {
		return
	}
	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	for _, binding := range bindings {
		panelName := strings.TrimSpace(binding.Panel)
		listPath := strings.TrimSpace(binding.Path)
		entryMode := binding.EntryMode
		if panelName == "" || listPath == "" {
			continue
		}
		newPath := path.Join(listPath, "new")
		detailPath := path.Join(listPath, ":id")
		editPath := path.Join(listPath, ":id", "edit")
		deletePath := path.Join(listPath, ":id", "delete")

		r.Get(listPath, wrap(func(c router.Context) error {
			return handlers.entryForPanel(c, panelName, entryMode)
		}))
		r.Get(newPath, wrap(func(c router.Context) error {
			return handlers.newForPanel(c, panelName)
		}))
		r.Post(listPath, wrap(func(c router.Context) error {
			return handlers.createForPanel(c, panelName)
		}))
		r.Get(detailPath, wrap(func(c router.Context) error {
			return handlers.detailForPanel(c, panelName)
		}))
		r.Get(editPath, wrap(func(c router.Context) error {
			return handlers.editForPanel(c, panelName)
		}))
		r.Post(detailPath, wrap(func(c router.Context) error {
			return handlers.updateForPanel(c, panelName)
		}))
		r.Post(deletePath, wrap(func(c router.Context) error {
			return handlers.deleteForPanel(c, panelName)
		}))
	}
}

type panelRouteBinding struct {
	Panel     string
	Path      string
	EntryMode admin.PanelEntryMode
}

func canonicalPanelRouteBindings(urls urlkit.Resolver, panels map[string]*admin.Panel) []panelRouteBinding {
	if len(panels) == 0 || urls == nil {
		return nil
	}
	panelNames := make([]string, 0, len(panels))
	for panelName := range panels {
		panelNames = append(panelNames, panelName)
	}
	sort.Strings(panelNames)

	pathSeen := map[string]bool{}
	out := make([]panelRouteBinding, 0, len(panelNames))
	for _, panelName := range panelNames {
		panel := panels[panelName]
		if panel != nil && panel.UIRouteMode() == admin.PanelUIRouteModeCustom {
			continue
		}
		canonicalPanel := canonicalPanelName(panelName)
		if canonicalPanel == "" {
			continue
		}
		routePath := resolveCanonicalPanelRoutePath(urls, canonicalPanel)
		if routePath == "" || pathSeen[routePath] {
			continue
		}
		pathSeen[routePath] = true
		entryMode := admin.PanelEntryModeList
		if panel != nil {
			entryMode = panel.EntryMode()
		}
		out = append(out, panelRouteBinding{Panel: canonicalPanel, Path: routePath, EntryMode: entryMode})
	}
	return out
}

func canonicalPanelName(panelName string) string {
	trimmed := strings.TrimSpace(panelName)
	if trimmed == "" {
		return ""
	}
	if at := strings.Index(trimmed, "@"); at > 0 {
		trimmed = strings.TrimSpace(trimmed[:at])
	}
	return trimmed
}

func resolveCanonicalPanelRoutePath(urls urlkit.Resolver, panelName string) string {
	for _, routeKey := range panelRouteKeys(panelName) {
		routePath := strings.TrimSpace(resolveRoutePath(urls, "admin", routeKey))
		if routePath == "" {
			continue
		}
		// Skip template routes (e.g. /content/:panel) and keep concrete panel routes.
		if strings.Contains(routePath, ":") || strings.Contains(routePath, "*") {
			continue
		}
		return routePath
	}
	return ""
}

func panelRouteKeys(panelName string) []string {
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return nil
	}
	out := []string{panelName}
	add := func(candidate string) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return
		}
		for _, existing := range out {
			if existing == candidate {
				return
			}
		}
		out = append(out, candidate)
	}
	add(strings.ReplaceAll(panelName, "-", "_"))
	add(strings.ReplaceAll(panelName, "_", "-"))
	return out
}

// contentEntryRoutes builds UI routes for content entries.
type contentEntryRoutes struct {
	basePath string
	slug     string
	env      string
}

func newContentEntryRoutes(basePath, slug, env string) contentEntryRoutes {
	return contentEntryRoutes{basePath: strings.TrimSpace(basePath), slug: strings.TrimSpace(slug), env: strings.TrimSpace(env)}
}

func (r contentEntryRoutes) withEnv(raw string) string {
	if r.env == "" {
		return raw
	}
	separator := "?"
	if strings.Contains(raw, "?") {
		separator = "&"
	}
	return raw + separator + "env=" + url.QueryEscape(r.env)
}

func (r contentEntryRoutes) index() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) new() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, "new"))
}

func (r contentEntryRoutes) show(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) edit(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "edit"))
}

func (r contentEntryRoutes) update(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) create() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) delete(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "delete"))
}

func (r contentEntryRoutes) routesMap() map[string]string {
	return map[string]string{
		"index":  r.index(),
		"new":    r.new(),
		"create": r.create(),
	}
}

func contentEntryCreateRedirectTarget(slug, createdID string, routes contentEntryRoutes) string {
	id := strings.TrimSpace(createdID)
	if id == "" {
		return routes.index()
	}
	if shouldRedirectToDetailAfterCreate(slug) {
		return appendQueryParam(routes.show(id), "created", "1")
	}
	target := routes.edit(id)
	if shouldAppendCreateMarkerAfterCreate(slug) {
		target = appendQueryParam(target, "created", "1")
	}
	return target
}

func shouldRedirectToDetailAfterCreate(slug string) bool {
	normalized := strings.ToLower(strings.TrimSpace(slug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	switch normalized {
	case "esign_documents":
		return true
	default:
		return false
	}
}

func shouldAppendCreateMarkerAfterCreate(slug string) bool {
	normalized := strings.ToLower(strings.TrimSpace(slug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	switch normalized {
	case "esign_agreements":
		return true
	default:
		return false
	}
}

func appendQueryParam(rawPath, key, value string) string {
	pathValue := strings.TrimSpace(rawPath)
	if pathValue == "" {
		return ""
	}
	parsed, err := url.Parse(pathValue)
	if err != nil {
		separator := "?"
		if strings.Contains(pathValue, "?") {
			separator = "&"
		}
		return pathValue + separator + url.QueryEscape(strings.TrimSpace(key)) + "=" + url.QueryEscape(strings.TrimSpace(value))
	}
	query := parsed.Query()
	query.Set(strings.TrimSpace(key), strings.TrimSpace(value))
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func queryParamEnabled(c router.Context, key string) bool {
	if c == nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(c.Query(key))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
