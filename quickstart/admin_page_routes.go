package quickstart

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// AdminPageSpec configures a simple admin HTML page route.
type AdminPageSpec struct {
	Route              string                                           `json:"route"`
	Path               string                                           `json:"path"`
	Template           string                                           `json:"template"`
	Title              string                                           `json:"title"`
	Active             string                                           `json:"active"`
	Feature            string                                           `json:"feature"`
	Permission         string                                           `json:"permission"`
	ViewContextBuilder UIViewContextBuilder                             `json:"view_context_builder"`
	BuildContext       func(router.Context) (router.ViewContext, error) `json:"build_context"`
	Guard              func(router.Context) error                       `json:"guard"`
}

// RegisterAdminPageRoutes registers simple admin HTML page routes with URLKit resolution.
func RegisterAdminPageRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	specs ...AdminPageSpec,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	if len(specs) == 0 {
		return nil
	}

	basePath := strings.TrimSpace(cfg.BasePath)
	var urls urlkit.Resolver
	if adm != nil {
		basePath = strings.TrimSpace(adm.BasePath())
		urls = adm.URLs()
	}

	defaultViewBuilder := DefaultAdminUIViewContextBuilder(adm, cfg)
	fallbackAuthz := admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{DefaultResource: "admin"})

	for _, spec := range specs {
		spec := spec
		routePath, template, err := resolveAdminPageRouteSpec(spec, urls, basePath)
		if err != nil {
			return err
		}
		active := resolveAdminPageActive(spec)
		viewBuilder := resolveAdminPageViewBuilder(spec, defaultViewBuilder)

		handler := func(c router.Context) error {
			if err := guardAdminPageRoute(c, adm, spec, fallbackAuthz); err != nil {
				return err
			}
			viewCtx, err := buildAdminPageViewContext(c, spec, viewBuilder, active)
			if err != nil {
				return err
			}
			return templateview.RenderTemplateView(c, template, viewCtx)
		}

		if auth != nil {
			handler = auth.WrapHandler(handler)
		}
		r.Get(routePath, handler)
		r.Head(routePath, handler)
	}

	return nil
}

func resolveAdminPageRouteSpec(spec AdminPageSpec, urls urlkit.Resolver, basePath string) (string, string, error) {
	template := strings.TrimSpace(spec.Template)
	if template == "" {
		return "", "", fmt.Errorf("admin page template is required")
	}
	routePath := strings.TrimSpace(spec.Path)
	if routePath == "" {
		routeKey := strings.TrimSpace(spec.Route)
		if routeKey == "" {
			return "", "", fmt.Errorf("admin page route is required")
		}
		routePath = resolveAdminRoutePath(urls, basePath, routeKey)
	}
	if routePath == "" {
		return "", "", fmt.Errorf("admin page route %q unresolved", spec.Route)
	}
	return routePath, template, nil
}

func resolveAdminPageActive(spec AdminPageSpec) string {
	if active := strings.TrimSpace(spec.Active); active != "" {
		return active
	}
	return strings.TrimSpace(spec.Route)
}

func resolveAdminPageViewBuilder(spec AdminPageSpec, fallback UIViewContextBuilder) UIViewContextBuilder {
	if spec.ViewContextBuilder != nil {
		return spec.ViewContextBuilder
	}
	return fallback
}

func guardAdminPageRoute(c router.Context, adm *admin.Admin, spec AdminPageSpec, fallbackAuthz admin.Authorizer) error {
	if feature := strings.TrimSpace(spec.Feature); feature != "" {
		if adm == nil || !featureEnabled(adm.FeatureGate(), feature) {
			return admin.FeatureDisabledError{Feature: feature}
		}
	}
	if spec.Guard != nil {
		if err := spec.Guard(c); err != nil {
			return err
		}
	}
	if perm := strings.TrimSpace(spec.Permission); perm != "" {
		if !permissionAllowed(c, adm, perm, fallbackAuthz) {
			return admin.ErrForbidden
		}
	}
	return nil
}

func buildAdminPageViewContext(c router.Context, spec AdminPageSpec, viewBuilder UIViewContextBuilder, active string) (router.ViewContext, error) {
	viewCtx := router.ViewContext{}
	if title := strings.TrimSpace(spec.Title); title != "" {
		viewCtx["title"] = title
	}
	if spec.BuildContext != nil {
		extra, err := spec.BuildContext(c)
		if err != nil {
			return nil, err
		}
		viewCtx = mergeViewContext(viewCtx, extra)
	}
	if viewBuilder != nil {
		viewCtx = viewBuilder(viewCtx, active, c)
	}
	return viewCtx, nil
}

func mergeViewContext(base router.ViewContext, extra router.ViewContext) router.ViewContext {
	if base == nil {
		base = router.ViewContext{}
	}
	for key, value := range extra {
		base[key] = value
	}
	return base
}

func permissionAllowed(c router.Context, adm *admin.Admin, permission string, fallback admin.Authorizer) bool {
	if strings.TrimSpace(permission) == "" {
		return true
	}
	if c == nil {
		return false
	}
	if adm != nil {
		if authz := adm.Authorizer(); authz != nil {
			return authz.Can(c.Context(), permission, "")
		}
	}
	if fallback != nil {
		return fallback.Can(c.Context(), permission, "")
	}
	return false
}
