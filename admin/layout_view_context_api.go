package admin

import router "github.com/goliatone/go-router"

// EnrichLayoutViewContext injects standard layout keys (paths, nav, session, theme, capabilities).
// It is intended for module/host handlers rendering templates that extend layout.html.
func EnrichLayoutViewContext(adm *Admin, c router.Context, view router.ViewContext, active string) router.ViewContext {
	return buildAdminLayoutViewContext(adm, c, view, active)
}

// EnrichLayoutViewContextWithChrome projects typed page presentation into a
// cloned view context, then adds request-scoped shell dependencies. Non-zero
// typed page values win over legacy page keys; arbitrary action markup remains
// owned by the page_header_actions template block.
func EnrichLayoutViewContextWithChrome(adm *Admin, c router.Context, view router.ViewContext, chrome AdminPageChrome) router.ViewContext {
	return buildAdminLayoutViewContextWithChrome(adm, c, view, chrome)
}
