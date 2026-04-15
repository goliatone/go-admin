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
	routes := translationQueueRouteSpecs(ctx, responder, ctx.Gates(), binding)
	return applyRoutes(ctx, routes)
}

func translationQueueRouteSpecs(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) []RouteSpec {
	return []RouteSpec{
		translationQueueReadRoute(ctx, responder, gates, "translations.dashboard", binding.Dashboard),
		translationQueueReadRoute(ctx, responder, gates, "translations.assignments", binding.Assignments),
		translationQueueAssignmentDetailRoute(ctx, responder, gates, binding),
		translationQueueAssignmentActionRoute(ctx, responder, gates, binding),
		translationQueueVariantUpdateRoute(ctx, responder, gates, binding),
		translationQueueReadRoute(ctx, responder, gates, "translations.my_work", binding.MyWork),
		translationQueueReadRoute(ctx, responder, gates, "translations.queue", binding.Queue),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.entity_types", binding.EntityTypesOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.source_records", binding.SourceRecordsOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.locales", binding.LocalesOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.families", binding.TranslationGroupsOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.assignees", binding.AssigneesOptions),
	}
}

func translationQueueReadRoute(ctx BootCtx, responder Responder, gates FeatureGates, name string, fn func(router.Context) (any, error)) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), name),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
			payload, err := fn(c)
			return writeJSONOrError(responder, c, payload, err)
		}),
	}
}

func translationQueueAssignmentDetailRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
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
	}
}

func translationQueueAssignmentActionRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
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
	}
}

func translationQueueVariantUpdateRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
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
	}
}
