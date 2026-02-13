package admin

import (
	"context"
	"strings"

	router "github.com/goliatone/go-router"
)

// buildAdminLayoutViewContext injects common layout context used by admin templates.
// It is shared by module-owned pages that render layout.html directly.
func buildAdminLayoutViewContext(adm *Admin, c router.Context, view router.ViewContext, active string) router.ViewContext {
	if view == nil {
		view = router.ViewContext{}
	}

	basePath := strings.TrimSpace(toString(view["base_path"]))
	if basePath == "" && adm != nil {
		basePath = strings.TrimSpace(adm.config.BasePath)
	}
	if _, ok := view["base_path"]; !ok && basePath != "" {
		view["base_path"] = basePath
	}
	if _, ok := view["asset_base_path"]; !ok && basePath != "" {
		view["asset_base_path"] = basePath
	}

	if _, ok := view["active"]; !ok && strings.TrimSpace(active) != "" {
		view["active"] = strings.TrimSpace(active)
	}

	if _, ok := view["api_base_path"]; !ok && adm != nil {
		if apiBasePath := strings.TrimSpace(adminAPIBasePath(adm)); apiBasePath != "" {
			view["api_base_path"] = apiBasePath
		}
	}

	if _, ok := view["nav_items"]; !ok {
		view["nav_items"] = debugViewNavItems(adm, c, basePath)
	}
	if _, ok := view["session_user"]; !ok {
		view["session_user"] = debugViewSessionUser(c, basePath)
	}
	if _, ok := view["theme"]; !ok && adm != nil {
		ctx := context.Background()
		if c != nil && c.Context() != nil {
			ctx = c.Context()
		}
		view["theme"] = adm.themePayload(ctx)
	}

	return view
}
