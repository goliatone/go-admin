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
	if err := applyRoutes(ctx, routes); err != nil {
		return err
	}
	return nil
}

func translationQueueRouteSpecs(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) []RouteSpec {
	return []RouteSpec{
		translationQueueReadRoute(ctx, responder, gates, "translations.dashboard", binding.Dashboard),
		translationQueueReadRoute(ctx, responder, gates, "translations.assignments", binding.Assignments),
		translationQueueFamilyAssignmentsRoute(ctx, responder, gates, binding),
		translationQueueAssignmentDetailRoute(ctx, responder, gates, binding),
		translationQueueAssignmentPreviewRoute(ctx, responder, gates, binding),
		translationQueueAssignmentBulkSnapshotRoute(ctx, responder, gates, binding),
		translationQueueAssignmentBulkActionRoute(ctx, responder, gates, binding),
		translationQueueAssignmentActionRoute(ctx, responder, gates, binding),
		translationQueueDraftSyncReadRoute(ctx, responder, gates, binding),
		translationQueueDraftSyncMutateRoute(ctx, responder, gates, binding),
		translationQueueReadRoute(ctx, responder, gates, "translations.my_work", binding.MyWork),
		translationQueueReadRoute(ctx, responder, gates, "translations.queue", binding.Queue),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.entity_types", binding.EntityTypesOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.source_records", binding.SourceRecordsOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.locales", binding.LocalesOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.families", binding.TranslationGroupsOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.assignees", binding.AssigneesOptions),
		translationQueueReadRoute(ctx, responder, gates, "translations.options.reviewers", binding.ReviewersOptions),
	}
}

func translationQueueFamilyAssignmentsRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.family_assignments"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
			familyID := c.Param("family_id")
			if familyID == "" {
				return errMissingID
			}
			payload, err := binding.FamilyAssignments(c, familyID)
			return writeJSONOrError(responder, c, payload, err)
		}),
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

func translationQueueAssignmentPreviewRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.preview"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
			id := c.Param("assignment_id")
			if id == "" {
				return errMissingID
			}
			payload, err := binding.AssignmentPreview(c, id)
			return writeJSONOrError(responder, c, payload, err)
		}),
	}
}

func translationQueueAssignmentBulkActionRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.bulk_actions"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
			payload, err := binding.RunAssignmentBulkAction(c, body)
			return writeJSONOrError(responder, c, payload, err)
		})),
	}
}

func translationQueueAssignmentBulkSnapshotRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.assignments.bulk_snapshot"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
			payload, err := binding.CreateAssignmentBulkSnapshot(c, body)
			return writeJSONOrError(responder, c, payload, err)
		})),
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

func translationQueueDraftSyncReadRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.sync.resources.id"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
			if err := binding.ReadDraftSync(c); err != nil {
				return responder.WriteError(c, err)
			}
			return nil
		}),
	}
}

func translationQueueDraftSyncMutateRoute(ctx BootCtx, responder Responder, gates FeatureGates, binding TranslationQueueBinding) RouteSpec {
	return RouteSpec{
		Method: "PATCH",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.sync.resources.id"),
		Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
			if err := binding.MutateDraftSync(c); err != nil {
				return responder.WriteError(c, err)
			}
			return nil
		}),
	}
}
