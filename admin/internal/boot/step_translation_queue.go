package boot

import router "github.com/goliatone/go-router"

// TranslationQueueRouteStep registers translation queue aggregate HTTP routes.
func TranslationQueueRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootTranslationQueue()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.Assignments(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.id"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				id := c.Param("assignment_id")
				if id == "" {
					return errMissingID
				}
				payload, err := binding.AssignmentDetail(c, id)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.actions"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				id := c.Param("assignment_id")
				if id == "" {
					return errMissingID
				}
				action := c.Param("action")
				if action == "" {
					return errMissingAction
				}
				payload, err := binding.RunAssignmentAction(c, id, action, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
		{
			Method: "PATCH",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.variants.id"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				id := c.Param("variant_id")
				if id == "" {
					return errMissingID
				}
				payload, err := binding.UpdateVariant(c, id, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.my_work"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.MyWork(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.queue"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.Queue(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.entity_types"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.EntityTypesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.source_records"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.SourceRecordsOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.locales"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.LocalesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.groups"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.TranslationGroupsOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.assignees"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.AssigneesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
