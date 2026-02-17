package boot

import (
	"strings"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// PanelStep registers CRUD/action routes for panels.
func PanelStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	defaultLocale := ctx.DefaultLocale()
	panelNames := make([]string, 0, len(ctx.Panels()))
	seenPanels := map[string]struct{}{}
	for _, binding := range ctx.Panels() {
		if binding == nil {
			continue
		}
		panelName := strings.TrimSpace(binding.Name())
		if panelName == "" {
			continue
		}
		if _, seen := seenPanels[panelName]; seen {
			continue
		}
		seenPanels[panelName] = struct{}{}
		panelNames = append(panelNames, panelName)
	}
	if len(panelNames) == 0 {
		return nil
	}

	panelBindingByName := func(panelName string) (PanelBinding, error) {
		panelName = strings.TrimSpace(panelName)
		if panelName == "" {
			return nil, bootValidationError("panel", "panel required")
		}
		for _, binding := range ctx.Panels() {
			if binding == nil {
				continue
			}
			if strings.TrimSpace(binding.Name()) == panelName {
				return binding, nil
			}
		}
		return nil, goerrors.New("not found", goerrors.CategoryNotFound).
			WithCode(404).
			WithTextCode("NOT_FOUND").
			WithMetadata(map[string]any{"panel": panelName})
	}
	localeFromRequest := func(c router.Context) string {
		locale := c.Query("locale")
		if locale == "" {
			locale = defaultLocale
		}
		return locale
	}
	parseBody := func(c router.Context) (map[string]any, error) {
		if raw := c.Body(); len(raw) > 0 {
			return ctx.ParseBody(c)
		}
		return map[string]any{}, nil
	}
	subresourcesForPanel := func(panelName string) []PanelSubresourceSpec {
		binding, err := panelBindingByName(panelName)
		if err != nil || binding == nil {
			return nil
		}
		declared := binding.Subresources()
		if len(declared) == 0 {
			return nil
		}
		out := make([]PanelSubresourceSpec, 0, len(declared))
		seen := map[string]struct{}{}
		for _, spec := range declared {
			name := strings.TrimSpace(spec.Name)
			if name == "" {
				continue
			}
			key := strings.ToLower(name)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			method := strings.ToUpper(strings.TrimSpace(spec.Method))
			if method == "" {
				method = "GET"
			}
			out = append(out, PanelSubresourceSpec{
				Name:   name,
				Method: method,
			})
		}
		if len(out) == 0 {
			return nil
		}
		return out
	}

	routes := make([]RouteSpec, 0, len(panelNames)*9)
	for _, panelName := range panelNames {
		params := map[string]string{"panel": panelName}
		base := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel", params)
		detail := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.id", params)
		action := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.action", params)
		bulk := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.bulk", params)
		preview := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.preview", params)

		routes = append(routes,
			RouteSpec{
				Method: "GET",
				Path:   base,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					records, total, schema, form, err := binding.List(c, localeFromRequest(c), parseListOptions(c))
					if err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, map[string]any{
						"total":   total,
						"records": records,
						"items":   records,
						"schema":  schema,
						"form":    form,
					})
				},
			},
			RouteSpec{
				Method: "GET",
				Path:   detail,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Param("id", "")
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					rec, err := binding.Detail(c, localeFromRequest(c), id)
					if err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, rec)
				},
			},
			RouteSpec{
				Method: "POST",
				Path:   base,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body, err := parseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					created, err := binding.Create(c, localeFromRequest(c), body)
					if err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, created)
				},
			},
			RouteSpec{
				Method: "PUT",
				Path:   detail,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Param("id", "")
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					body, err := parseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					updated, err := binding.Update(c, localeFromRequest(c), id, body)
					if err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, updated)
				},
			},
			RouteSpec{
				Method: "DELETE",
				Path:   base,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Query("id")
					if id == "" {
						id = c.Param("id", "")
					}
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					if err := binding.Delete(c, localeFromRequest(c), id); err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, map[string]string{"status": "deleted"})
				},
			},
			RouteSpec{
				Method: "DELETE",
				Path:   detail,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Param("id", "")
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					if err := binding.Delete(c, localeFromRequest(c), id); err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, map[string]string{"status": "deleted"})
				},
			},
			RouteSpec{
				Method: "POST",
				Path:   action,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					actionName := c.Param("action", "")
					if actionName == "" {
						return responder.WriteError(c, errMissingAction)
					}
					body, err := parseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body = mergeActionContextFromRequest(c, body, localeFromRequest(c))
					data, err := binding.Action(c, localeFromRequest(c), actionName, body)
					if err != nil {
						return responder.WriteError(c, err)
					}
					payload := map[string]any{"status": "ok"}
					if len(data) > 0 {
						payload["data"] = data
					}
					return responder.WriteJSON(c, payload)
				},
			},
			RouteSpec{
				Method: "POST",
				Path:   bulk,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					actionName := c.Param("action", "")
					if actionName == "" {
						return responder.WriteError(c, errMissingAction)
					}
					body, err := parseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					data, err := binding.Bulk(c, localeFromRequest(c), actionName, body)
					if err != nil {
						return responder.WriteError(c, err)
					}
					payload := map[string]any{"status": "ok"}
					if len(data) > 0 {
						payload["data"] = data
					}
					return responder.WriteJSON(c, payload)
				},
			},
			RouteSpec{
				Method: "GET",
				Path:   preview,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Param("id", "")
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					res, err := binding.Preview(c, localeFromRequest(c), id)
					if err != nil {
						return responder.WriteError(c, err)
					}
					return responder.WriteJSON(c, res)
				},
			},
		)

		for _, spec := range subresourcesForPanel(panelName) {
			spec := spec
			subresourcePath := routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.subresource", map[string]string{
				"panel":       panelName,
				"subresource": spec.Name,
			})
			if subresourcePath == "" {
				continue
			}
			routes = append(routes, RouteSpec{
				Method: spec.Method,
				Path:   subresourcePath,
				Handler: func(c router.Context) error {
					binding, err := panelBindingByName(panelName)
					if err != nil {
						return responder.WriteError(c, err)
					}
					id := c.Param("id", "")
					if id == "" {
						return responder.WriteError(c, errMissingID)
					}
					value := c.Param("value", "")
					if strings.TrimSpace(value) == "" {
						return responder.WriteError(c, errMissingSubresourceValue)
					}
					if err := binding.HandleSubresource(c, localeFromRequest(c), id, spec.Name, value); err != nil {
						return responder.WriteError(c, err)
					}
					return nil
				},
			})
		}
	}
	return applyRoutes(ctx, routes)
}

func mergeActionContextFromRequest(c router.Context, body map[string]any, routeLocale string) map[string]any {
	if body == nil {
		body = map[string]any{}
	}
	if strings.TrimSpace(toStringAny(body["locale"])) == "" {
		if locale := strings.TrimSpace(c.Query("locale")); locale != "" {
			body["locale"] = locale
		} else if locale := strings.TrimSpace(routeLocale); locale != "" {
			body["locale"] = locale
		}
	}
	if strings.TrimSpace(toStringAny(body["environment"])) == "" && strings.TrimSpace(toStringAny(body["env"])) == "" {
		if env := strings.TrimSpace(c.Query("environment")); env != "" {
			body["environment"] = env
		} else if env := strings.TrimSpace(c.Query("env")); env != "" {
			body["environment"] = env
		}
	}
	if strings.TrimSpace(toStringAny(body["policy_entity"])) == "" && strings.TrimSpace(toStringAny(body["policyEntity"])) == "" {
		if policyEntity := strings.TrimSpace(c.Query("policy_entity")); policyEntity != "" {
			body["policy_entity"] = policyEntity
		} else if policyEntity := strings.TrimSpace(c.Query("policyEntity")); policyEntity != "" {
			body["policy_entity"] = policyEntity
		}
	}
	return body
}

func toStringAny(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
