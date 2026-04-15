package admin

import (
	"context"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
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
	updated, err := panel.Update(adminCtx, req.id, map[string]any{"_navigation": req.rawOverrides})
	if err != nil {
		return writeError(c, err)
	}
	if policy, ok := a.resolveContentNavigationPolicy(adminCtx.Context, req.typeKey); ok {
		updated = applyContentEntryNavigationReadContract(updated, policy)
	}
	return writeJSON(c, contentNavigationOverrideResponse(req.id, req.typeKey, panelName, updated))
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
	return resolveContentEntryNavigationPolicy(ctx, a.contentTypeSvc, typeKey)
}
