package admin

import (
	"context"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"reflect"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	i18n "github.com/goliatone/go-i18n"
	router "github.com/goliatone/go-router"
)

func registerPatchAdminRoute(target AdminRouter, path string, handler router.HandlerFunc) {
	if target == nil || strings.TrimSpace(path) == "" || handler == nil {
		return
	}
	target.Patch(path, handler)
}

func (a *Admin) registerContentNavigationOverrideRoute() {
	if a == nil || a.router == nil {
		return
	}
	path := adminAPIRoutePath(a, "content.navigation")
	if strings.TrimSpace(path) == "" {
		return
	}
	handler := a.handleContentNavigationOverride

	if wrap := a.authWrapper(); wrap != nil {
		handler = wrap(handler)
	}
	registerPatchAdminRoute(a.router, path, handler)
}

func (a *Admin) handleContentNavigationOverride(c router.Context) error {
	req, err := a.parseContentNavigationOverrideRequest(c)
	if err != nil {
		return writeError(c, err)
	}
	adminCtx := a.adminContextFromRequest(c, req.locale)
	panelName, panel, err := a.resolveContentNavigationPanel(adminCtx.Context, req.typeKey)
	if err != nil {
		return writeError(c, err)
	}
	if panel == nil {
		return writeError(c, notFoundDomainError("content panel not found", map[string]any{"type": req.typeKey, "id": req.id}))
	}
	preflight, err := a.prepareContentNavigationOverrideMutation(adminCtx, req, panelName, panel)
	if err != nil {
		return writeError(c, err)
	}
	updated, err := panel.Update(adminCtx, req.id, map[string]any{"_navigation": navigationVisibilityMapAny(preflight.normalizedOverrides)})
	if err != nil {
		return writeError(c, err)
	}
	updated = applyContentEntryNavigationReadContract(updated, preflight.policy)
	a.recordContentNavigationOverrideActivity(adminCtx, req, panelName, preflight, updated)
	return writeJSON(c, contentNavigationOverrideResponse(req.id, req.typeKey, panelName, updated))
}

type contentNavigationMutationPreflight struct {
	policy              contentEntryNavigationPolicy
	contentType         *CMSContentType
	current             map[string]any
	model               EntryNavigationViewModel
	normalizedOverrides map[string]string
	evaluation          contentEntryNavigationEvaluation
}

func (a *Admin) prepareContentNavigationOverrideMutation(adminCtx AdminContext, req contentNavigationOverrideRequest, panelName string, panel *Panel) (contentNavigationMutationPreflight, error) {
	out := contentNavigationMutationPreflight{}
	if panel == nil {
		return out, notFoundDomainError("content panel not found", map[string]any{"type": req.typeKey, "id": req.id})
	}
	contentType, ok := a.resolveContentNavigationType(adminCtx.Context, req.typeKey)
	if !ok || contentType == nil {
		return out, validationDomainError("entry navigation is not available for this content type", map[string]any{
			"field": "type",
			"type":  req.typeKey,
		})
	}
	policy := entryNavigationPolicyFromOptions(*contentType, a.config.EntryNavigation)
	current, err := panel.Get(adminCtx, req.id)
	if err != nil {
		return out, err
	}
	model, err := BuildEntryNavigationViewModel(EntryNavigationViewModelInput{
		Context:     adminCtx.Context,
		Authorizer:  a.authorizer,
		Panel:       panel,
		PanelName:   panelName,
		ContentType: contentType,
		Record:      current,
		Policy:      policy,
	})
	if err != nil {
		return out, err
	}
	if !model.Visible {
		return out, entryNavigationHiddenMutationError(model, req.typeKey)
	}
	if !model.Editable {
		return out, entryNavigationReadOnlyMutationError(model, policy)
	}
	eval, err := evaluateContentEntryNavigation(req.rawOverrides, policy, true)
	if err != nil {
		return out, err
	}
	out.policy = policy
	out.contentType = contentType
	out.current = current
	out.model = model
	out.normalizedOverrides = eval.Overrides
	out.evaluation = eval
	return out, nil
}

func entryNavigationHiddenMutationError(model EntryNavigationViewModel, typeKey string) error {
	reason := strings.TrimSpace(model.Reason)
	meta := map[string]any{
		"field": "type",
		"type":  strings.TrimSpace(typeKey),
	}
	if reason != "" {
		meta["reason"] = reason
	}
	switch reason {
	case "view_permission_denied":
		if strings.TrimSpace(model.ViewPermission) != "" {
			return permissionDenied(model.ViewPermission, model.PermissionResource)
		}
		if strings.TrimSpace(model.PanelViewPermission) != "" {
			return permissionDenied(model.PanelViewPermission, model.Panel)
		}
		return ErrForbidden
	case "content_type_excluded":
		return validationDomainError("entry navigation is excluded for this content type", meta)
	case "policy_disabled", "no_eligible_locations":
		return validationDomainError("entry navigation is not enabled for this content type", meta)
	default:
		return validationDomainError("entry navigation is not available for this content type", meta)
	}
}

func entryNavigationReadOnlyMutationError(model EntryNavigationViewModel, policy contentEntryNavigationPolicy) error {
	if strings.TrimSpace(model.PanelEditPermission) != "" && !entryNavigationDebugAllowed(model.Debug, "panel_edit_allowed") {
		return permissionDenied(model.PanelEditPermission, model.Panel)
	}
	if strings.TrimSpace(model.EditPermission) != "" && !entryNavigationDebugAllowed(model.Debug, "feature_edit_allowed") {
		return permissionDenied(model.EditPermission, model.PermissionResource)
	}
	meta := map[string]any{
		"field":                   "_navigation",
		"type":                    strings.TrimSpace(model.ContentType),
		"allow_instance_override": policy.AllowInstanceOverride,
	}
	return validationDomainError("entry navigation is read-only for this content type", meta)
}

func entryNavigationDebugAllowed(debug map[string]any, key string) bool {
	if len(debug) == 0 {
		return false
	}
	return toBool(debug[key])
}

func (a *Admin) recordContentNavigationOverrideActivity(adminCtx AdminContext, req contentNavigationOverrideRequest, panelName string, preflight contentNavigationMutationPreflight, updated map[string]any) {
	if a == nil || a.activity == nil {
		return
	}
	action := strings.TrimSpace(preflight.policy.ActivityAction)
	if action == "" {
		action = DefaultEntryNavigationActivityAction
	}
	previous, ok := evaluateContentEntryNavigationFromRecord(preflight.current, preflight.policy)
	if !ok {
		return
	}
	next, ok := evaluateContentEntryNavigationFromRecord(updated, preflight.policy)
	if !ok {
		return
	}
	if reflect.DeepEqual(previous.Overrides, next.Overrides) && reflect.DeepEqual(previous.EffectiveVisibility, next.EffectiveVisibility) {
		return
	}
	changed := changedEntryNavigationLocations(previous, next)
	if len(changed) == 0 {
		return
	}
	contentType := strings.TrimSpace(req.typeKey)
	if preflight.contentType != nil {
		contentType = strings.TrimSpace(primitives.FirstNonEmptyRaw(preflight.contentType.Slug, preflight.contentType.Name, preflight.contentType.ID, contentType))
	}
	recordID := strings.TrimSpace(req.id)
	if extracted := strings.TrimSpace(extractRecordID(updated)); extracted != "" {
		recordID = extracted
	}
	metadata := map[string]any{
		"content_type":                    contentType,
		"record_id":                       recordID,
		"panel":                           strings.TrimSpace(panelName),
		"locale":                          strings.TrimSpace(req.locale),
		"channel":                         strings.TrimSpace(cmsContentChannelFromContext(adminCtx.Context, "")),
		"changed_locations":               changed,
		"previous_navigation":             navigationVisibilityMapAny(previous.Overrides),
		"next_navigation":                 navigationVisibilityMapAny(next.Overrides),
		"effective_navigation_visibility": navigationVisibilityBoolMapAny(next.EffectiveVisibility),
		"effective_menu_locations":        append([]string{}, next.EffectiveLocations...),
	}
	actor := strings.TrimSpace(adminCtx.UserID)
	if actor == "" {
		actor = actorFromContext(adminCtx.Context)
	}
	if actor == "" {
		actor = ActivityActorTypeSystem
		metadata = tagActivityActorType(metadata, ActivityActorTypeSystem)
	}
	_ = a.activity.Record(adminCtx.Context, ActivityEntry{ //nolint:errcheck // activity recording must not fail the save path.
		Actor:    actor,
		Action:   action,
		Object:   "content:" + contentType + ":" + recordID,
		Channel:  "content",
		Metadata: metadata,
	})
}

func changedEntryNavigationLocations(previous, next contentEntryNavigationEvaluation) []string {
	seen := map[string]struct{}{}
	addKeys := func(values map[string]string) {
		for key := range values {
			key = strings.TrimSpace(key)
			if key != "" {
				seen[key] = struct{}{}
			}
		}
	}
	addBoolKeys := func(values map[string]bool) {
		for key := range values {
			key = strings.TrimSpace(key)
			if key != "" {
				seen[key] = struct{}{}
			}
		}
	}
	addKeys(previous.Overrides)
	addKeys(next.Overrides)
	addBoolKeys(previous.EffectiveVisibility)
	addBoolKeys(next.EffectiveVisibility)
	locations := make([]string, 0, len(seen))
	for location := range seen {
		if previous.Overrides[location] != next.Overrides[location] || previous.EffectiveVisibility[location] != next.EffectiveVisibility[location] {
			locations = append(locations, location)
		}
	}
	return dedupeAndSortStrings(locations)
}

type contentNavigationOverrideRequest struct {
	typeKey      string
	id           string
	locale       string
	rawOverrides any
}

func (a *Admin) parseContentNavigationOverrideRequest(c router.Context) (contentNavigationOverrideRequest, error) {
	req := contentNavigationOverrideRequest{
		typeKey: strings.TrimSpace(c.Param("type", "")),
		id:      strings.TrimSpace(c.Param("id", "")),
		locale:  i18n.NormalizeLocale(primitives.FirstNonEmptyRaw(c.Query("locale"), a.config.DefaultLocale)),
	}
	if req.typeKey == "" {
		return req, requiredFieldDomainError("type", map[string]any{"field": "type"})
	}
	if req.id == "" {
		return req, requiredFieldDomainError("id", map[string]any{"field": "id"})
	}
	rawOverrides, err := parseContentNavigationOverrideBody(c)
	if err != nil {
		return req, err
	}
	req.rawOverrides = rawOverrides
	return req, nil
}

func parseContentNavigationOverrideBody(c router.Context) (any, error) {
	body := map[string]any{}
	if len(c.Body()) > 0 {
		parsed, err := parseJSONBody(c)
		if err != nil {
			return nil, err
		}
		body = parsed
	}
	if rawOverrides, ok := body["_navigation"]; ok {
		return rawOverrides, nil
	}
	if len(body) > 0 {
		return body, nil
	}
	return nil, requiredFieldDomainError("_navigation", map[string]any{
		"field":    "_navigation",
		"hint":     "Provide an object map with tri-state values inherit|show|hide.",
		"examples": contentNavigationExamplesContract(),
	})
}

func contentNavigationOverrideResponse(id, typeKey, panelName string, updated map[string]any) map[string]any {
	return map[string]any{
		"id":                              id,
		"type":                            typeKey,
		"panel":                           panelName,
		"data":                            updated,
		"_navigation":                     updated["_navigation"],
		"effective_menu_locations":        updated["effective_menu_locations"],
		"effective_navigation_visibility": updated["effective_navigation_visibility"],
	}
}

func (a *Admin) resolveContentNavigationPanel(ctx context.Context, typeKey string) (string, *Panel, error) {
	if a == nil || a.registry == nil {
		return "", nil, serviceNotConfiguredDomainError("registry", map[string]any{"component": "content_navigation"})
	}
	typeKey = strings.TrimSpace(typeKey)
	if typeKey == "" {
		return "", nil, requiredFieldDomainError("type", map[string]any{"field": "type"})
	}

	candidates := []string{}
	seen := map[string]struct{}{}
	addCandidate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		if _, ok := seen[strings.ToLower(name)]; ok {
			return
		}
		seen[strings.ToLower(name)] = struct{}{}
		candidates = append(candidates, name)
	}

	env := strings.TrimSpace(cmsContentChannelFromContext(ctx, ""))
	if contentType, ok := a.resolveContentNavigationType(ctx, typeKey); ok {
		panelSlug := strings.TrimSpace(panelSlugForContentType(contentType))
		if panelSlug == "" {
			panelSlug = strings.TrimSpace(contentType.Slug)
		}
		if env != "" {
			addCandidate(panelSlug + "@" + env)
		}
		if channel := strings.TrimSpace(cmsadapter.ContentTypeChannel(*contentType)); channel != "" {
			addCandidate(panelSlug + "@" + channel)
		}
		addCandidate(panelSlug)
		addCandidate(strings.TrimSpace(contentType.Slug))
	}
	if env != "" {
		addCandidate(typeKey + "@" + env)
	}
	addCandidate(typeKey)

	for _, name := range candidates {
		if panel, ok := a.registry.Panel(name); ok && panel != nil {
			return name, panel, nil
		}
	}

	return "", nil, notFoundDomainError("content panel not found", map[string]any{
		"type":             typeKey,
		"candidate_panels": candidates,
	})
}

func (a *Admin) resolveContentNavigationType(ctx context.Context, typeKey string) (*CMSContentType, bool) {
	if a == nil || a.contentTypeSvc == nil {
		return nil, false
	}
	typeKey = strings.TrimSpace(typeKey)
	if typeKey == "" {
		return nil, false
	}
	if record, err := a.contentTypeSvc.ContentTypeBySlug(ctx, typeKey); err == nil && record != nil {
		return record, true
	}
	if record, err := a.contentTypeSvc.ContentType(ctx, typeKey); err == nil && record != nil {
		return record, true
	}
	return nil, false
}

func (a *Admin) resolveContentNavigationPolicy(ctx context.Context, typeKey string) (contentEntryNavigationPolicy, bool) {
	if a == nil {
		return contentEntryNavigationPolicy{}, false
	}
	return ResolveEntryNavigationPolicyWithOptions(ctx, a.contentTypeSvc, typeKey, a.config.EntryNavigation)
}
