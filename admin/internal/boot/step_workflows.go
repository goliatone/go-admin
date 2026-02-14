package boot

import router "github.com/goliatone/go-router"

// WorkflowRouteStep registers persisted workflow management routes.
func WorkflowRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootWorkflows()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}

	base := routePath(ctx, ctx.AdminAPIGroup(), "workflows")
	workflowIDPath := routePath(ctx, ctx.AdminAPIGroup(), "workflows.id")
	bindingsPath := routePath(ctx, ctx.AdminAPIGroup(), "workflows.bindings")
	bindingIDPath := routePath(ctx, ctx.AdminAPIGroup(), "workflows.bindings.id")

	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: func(c router.Context) error {
				payload, err := binding.ListWorkflows(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		{
			Method: "POST",
			Path:   base,
			Handler: withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.CreateWorkflow(c, body)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "PUT",
			Path:   workflowIDPath,
			Handler: withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				id := c.Param("id", "")
				if id == "" {
					return errMissingID
				}
				payload, err := binding.UpdateWorkflow(c, id, body)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   bindingsPath,
			Handler: func(c router.Context) error {
				payload, err := binding.ListBindings(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		{
			Method: "POST",
			Path:   bindingsPath,
			Handler: withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.CreateBinding(c, body)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "PUT",
			Path:   bindingIDPath,
			Handler: withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				id := c.Param("id", "")
				if id == "" {
					return errMissingID
				}
				payload, err := binding.UpdateBinding(c, id, body)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "DELETE",
			Path:   bindingIDPath,
			Handler: func(c router.Context) error {
				id := c.Param("id", "")
				if id == "" {
					return errMissingID
				}
				return writeJSONOrError(responder, c, map[string]any{"status": "ok"}, binding.DeleteBinding(c, id))
			},
		},
	}
	return applyRoutes(ctx, routes)
}
