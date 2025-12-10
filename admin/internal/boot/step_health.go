package boot

import router "github.com/goliatone/go-router"

// HealthStep registers the health route.
func HealthStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	path := joinPath(ctx.BasePath(), "health")
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	return applyRoutes(ctx, []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			},
		},
	})
}
