package handlers

import (
	"net/http"
	"strings"

	router "github.com/goliatone/go-router"
)

const legacyDraftRouteErrorCode = "LEGACY_DRAFT_ROUTE_DISABLED"

func registerDraftRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.drafts == nil {
		return
	}

	adminRoutes.Post(routes.AdminDrafts, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminCreate))
	adminRoutes.Get(routes.AdminDrafts, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminView))
	adminRoutes.Get(routes.AdminDraft, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminView))
	adminRoutes.Put(routes.AdminDraft, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminEdit))
	adminRoutes.Delete(routes.AdminDraft, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminEdit))
	adminRoutes.Post(routes.AdminDraftSend, legacyDraftRouteHandler(cfg), requireAdminPermission(cfg, cfg.permissions.AdminSend))
}

func legacyDraftRouteHandler(cfg registerConfig) router.HandlerFunc {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if resolveAuthenticatedAdminUserID(c) == "" {
			return writeAPIError(c, nil, http.StatusUnauthorized, "UNAUTHENTICATED", "authenticated actor is required", nil)
		}
		return writeAPIError(c, nil, http.StatusGone, legacyDraftRouteErrorCode, "legacy /esign/drafts routes are disabled; use sync agreement draft endpoints", map[string]any{
			"legacy_path":           strings.TrimSpace(c.Path()),
			"authoritative_surface": "/admin/api/v1/esign/sync",
		})
	}
}
