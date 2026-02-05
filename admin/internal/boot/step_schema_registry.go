package boot

import (
	"strings"

	router "github.com/goliatone/go-router"
)

// SchemaRegistryStep registers schema registry routes.
func SchemaRegistryStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootSchemaRegistry()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	base := routePath(ctx, ctx.AdminAPIGroup(), "schemas")

	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: func(c router.Context) error {
				payload, err := binding.List(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "schemas.resource"),
			Handler: func(c router.Context) error {
				resource := strings.TrimSpace(c.Param("resource", ""))
				if resource == "" {
					return responder.WriteError(c, errMissingID)
				}
				payload, err := binding.Get(c, resource)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}

	return applyRoutes(ctx, routes)
}
