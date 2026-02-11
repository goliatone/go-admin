package admin

import router "github.com/goliatone/go-router"

// EnrichLayoutViewContext injects standard layout keys (paths, nav, session, theme).
// It is intended for module/host handlers rendering templates that extend layout.html.
func EnrichLayoutViewContext(adm *Admin, c router.Context, view router.ViewContext, active string) router.ViewContext {
	return buildAdminLayoutViewContext(adm, c, view, active)
}
