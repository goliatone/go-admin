package admin

import (
	"context"
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
	handler := func(c router.Context) error {
		typeKey := strings.TrimSpace(c.Param("type", ""))
		if typeKey == "" {
			return writeError(c, requiredFieldDomainError("type", map[string]any{"field": "type"}))
		}
		id := strings.TrimSpace(c.Param("id", ""))
		if id == "" {
			return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
		}

		locale := i18n.NormalizeLocale(primitives.FirstNonEmptyRaw(c.Query("locale"), a.config.DefaultLocale))
		adminCtx := a.adminContextFromRequest(c, locale)
		panelName, panel, err := a.resolveContentNavigationPanel(adminCtx.Context, typeKey)
		if err != nil {
			return writeError(c, err)
		}
		if panel == nil {
			return writeError(c, notFoundDomainError("content panel not found", map[string]any{"type": typeKey, "id": id}))
		}

		body := map[string]any{}
		if len(c.Body()) > 0 {
			parsed, parseErr := parseJSONBody(c)
			if parseErr != nil {
				return writeError(c, parseErr)
			}
			body = parsed
		}

		rawOverrides, ok := body["_navigation"]
		if !ok && len(body) > 0 {
			rawOverrides = body
			ok = true
		}
		if !ok {
			return writeError(c, requiredFieldDomainError("_navigation", map[string]any{
				"field":    "_navigation",
				"hint":     "Provide an object map with tri-state values inherit|show|hide.",
				"examples": contentNavigationExamplesContract(),
			}))
		}

		updated, err := panel.Update(adminCtx, id, map[string]any{
			"_navigation": rawOverrides,
		})
		if err != nil {
			return writeError(c, err)
		}
		if policy, ok := a.resolveContentNavigationPolicy(adminCtx.Context, typeKey); ok {
			updated = applyContentEntryNavigationReadContract(updated, policy)
		}
		return writeJSON(c, map[string]any{
			"id":                              id,
			"type":                            typeKey,
			"panel":                           panelName,
			"data":                            updated,
			"_navigation":                     updated["_navigation"],
			"effective_menu_locations":        updated["effective_menu_locations"],
			"effective_navigation_visibility": updated["effective_navigation_visibility"],
		})
	}

	if wrap := a.authWrapper(); wrap != nil {
		handler = wrap(handler)
	}
	registerPatchAdminRoute(a.router, path, handler)
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

	env := strings.TrimSpace(resolveCMSContentChannel("", ctx))
	if contentType, ok := a.resolveContentNavigationType(ctx, typeKey); ok {
		panelSlug := strings.TrimSpace(panelSlugForContentType(contentType))
		if panelSlug == "" {
			panelSlug = strings.TrimSpace(contentType.Slug)
		}
		if env != "" {
			addCandidate(panelSlug + "@" + env)
		}
		if channel := strings.TrimSpace(firstNonEmptyRaw(contentType.Channel, contentType.Environment)); channel != "" {
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
