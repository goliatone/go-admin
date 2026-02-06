package quickstart

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// AdminPageSpec configures a simple admin HTML page route.
type AdminPageSpec struct {
	Route              string
	Path               string
	Template           string
	Title              string
	Active             string
	Feature            string
	Permission         string
	ViewContextBuilder UIViewContextBuilder
	BuildContext       func(router.Context) (router.ViewContext, error)
	Guard              func(router.Context) error
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
		template := strings.TrimSpace(spec.Template)
		if template == "" {
			return fmt.Errorf("admin page template is required")
		}
		routePath := strings.TrimSpace(spec.Path)
		if routePath == "" {
			routeKey := strings.TrimSpace(spec.Route)
			if routeKey == "" {
				return fmt.Errorf("admin page route is required")
			}
			routePath = resolveAdminRoutePath(urls, basePath, routeKey)
		}
		if routePath == "" {
			return fmt.Errorf("admin page route %q unresolved", spec.Route)
		}

		active := strings.TrimSpace(spec.Active)
		if active == "" {
			active = strings.TrimSpace(spec.Route)
		}
		viewBuilder := spec.ViewContextBuilder
		if viewBuilder == nil {
			viewBuilder = defaultViewBuilder
		}

		handler := func(c router.Context) error {
			if strings.TrimSpace(spec.Feature) != "" {
				if adm == nil || !featureEnabled(adm.FeatureGate(), spec.Feature) {
					return admin.FeatureDisabledError{Feature: strings.TrimSpace(spec.Feature)}
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

			viewCtx := router.ViewContext{}
			if strings.TrimSpace(spec.Title) != "" {
				viewCtx["title"] = strings.TrimSpace(spec.Title)
			}
			if spec.BuildContext != nil {
				extra, err := spec.BuildContext(c)
				if err != nil {
					return err
				}
				viewCtx = mergeViewContext(viewCtx, extra)
			}
			if viewBuilder != nil {
				viewCtx = viewBuilder(viewCtx, active, c)
			}
			return c.Render(template, viewCtx)
		}

		if auth != nil {
			handler = auth.WrapHandler(handler)
		}
		r.Get(routePath, handler)
	}

	return nil
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
