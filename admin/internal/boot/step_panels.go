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
	panelNames := panelNames(ctx.Panels())
	if len(panelNames) == 0 {
		return nil
	}
	panelLookup := newPanelBindingLookup(ctx)
	routes := make([]RouteSpec, 0, len(panelNames)*9)
	for _, panelName := range panelNames {
		routes = append(routes, panelRoutes(ctx, responder, panelLookup, panelName)...)
	}
	return applyRoutes(ctx, routes)
}

type panelBindingLookup func(string) (PanelBinding, error)

func panelNames(bindings []PanelBinding) []string {
	out := make([]string, 0, len(bindings))
	seen := map[string]struct{}{}
	for _, binding := range bindings {
		if binding == nil {
			continue
		}
		panelName := strings.TrimSpace(binding.Name())
		if panelName == "" {
			continue
		}
		if _, ok := seen[panelName]; ok {
			continue
		}
		seen[panelName] = struct{}{}
		out = append(out, panelName)
	}
	return out
}

func newPanelBindingLookup(ctx BootCtx) panelBindingLookup {
	return func(panelName string) (PanelBinding, error) {
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
}

func panelRoutes(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName string) []RouteSpec {
	params := map[string]string{"panel": panelName}
	routes := []RouteSpec{
		panelListRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel", params)),
		panelDetailRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.id", params)),
		panelCreateRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel", params)),
		panelUpdateRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.id", params)),
		panelDeleteBaseRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel", params)),
		panelDeleteDetailRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.id", params)),
		panelActionRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.action", params)),
		panelBulkStateRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.bulk.state", params)),
		panelBulkRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.bulk", params)),
		panelPreviewRoute(ctx, responder, panelLookup, panelName, routePathWithParams(ctx, ctx.AdminAPIGroup(), "panel.preview", params)),
	}
	return append(routes, panelSubresourceRoutes(ctx, responder, panelLookup, panelName)...)
}

func panelLocale(ctx BootCtx, c router.Context) string {
	locale := c.Query("locale")
	if locale == "" {
		locale = ctx.DefaultLocale()
	}
	return locale
}

func panelBody(ctx BootCtx, c router.Context) (map[string]any, error) {
	if raw := c.Body(); len(raw) > 0 {
		return ctx.ParseBody(c)
	}
	return map[string]any{}, nil
}

func panelListRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			records, total, schema, form, meta, err := binding.List(c, panelLocale(ctx, c), parseListOptions(c))
			if err != nil {
				return responder.WriteError(c, err)
			}
			payload := map[string]any{
				"total":   total,
				"records": records,
				"items":   records,
				"schema":  schema,
				"form":    form,
			}
			if len(meta) > 0 {
				payload["$meta"] = meta
			}
			return responder.WriteJSON(c, payload)
		},
	}
}

func panelDetailRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			id := c.Param("id", "")
			if id == "" {
				return responder.WriteError(c, errMissingID)
			}
			rec, err := binding.Detail(c, panelLocale(ctx, c), id)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, rec)
		},
	}
}

func panelCreateRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			body, err := panelBody(ctx, c)
			if err != nil {
				return responder.WriteError(c, err)
			}
			created, err := binding.Create(c, panelLocale(ctx, c), body)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, created)
		},
	}
}

func panelUpdateRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "PUT",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			id := c.Param("id", "")
			if id == "" {
				return responder.WriteError(c, errMissingID)
			}
			body, err := panelBody(ctx, c)
			if err != nil {
				return responder.WriteError(c, err)
			}
			updated, err := binding.Update(c, panelLocale(ctx, c), id, body)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, updated)
		},
	}
}

func panelDeleteBaseRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "DELETE",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			id := c.Query("id")
			if id == "" {
				id = c.Param("id", "")
			}
			return deletePanelRecord(ctx, responder, c, binding, id)
		},
	}
}

func panelDeleteDetailRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "DELETE",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return deletePanelRecord(ctx, responder, c, binding, c.Param("id", ""))
		},
	}
}

func deletePanelRecord(ctx BootCtx, responder Responder, c router.Context, binding PanelBinding, id string) error {
	if id == "" {
		return responder.WriteError(c, errMissingID)
	}
	if err := binding.Delete(c, panelLocale(ctx, c), id); err != nil {
		return responder.WriteError(c, err)
	}
	return responder.WriteJSON(c, map[string]string{"status": "deleted"})
}

func panelActionRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			actionName := c.Param("action", "")
			if actionName == "" {
				return responder.WriteError(c, errMissingAction)
			}
			body, err := panelBody(ctx, c)
			if err != nil {
				return responder.WriteError(c, err)
			}
			locale := panelLocale(ctx, c)
			response, err := binding.Action(c, locale, actionName, mergeActionContextFromRequest(c, body, locale))
			if err != nil {
				return responder.WriteError(c, err)
			}
			response = normalizeActionResponse(response)
			payload := map[string]any{"status": "ok"}
			if len(response.Data) > 0 {
				payload["data"] = response.Data
			}
			return responder.WriteJSONStatus(c, response.StatusCode, payload)
		},
	}
}

func panelBulkStateRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			body, err := panelBody(ctx, c)
			if err != nil {
				return responder.WriteError(c, err)
			}
			data, err := binding.BulkActionState(c, panelLocale(ctx, c), body)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, data)
		},
	}
}

func panelBulkRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			actionName := c.Param("action", "")
			if actionName == "" {
				return responder.WriteError(c, errMissingAction)
			}
			body, err := panelBody(ctx, c)
			if err != nil {
				return responder.WriteError(c, err)
			}
			data, err := binding.Bulk(c, panelLocale(ctx, c), actionName, body)
			if err != nil {
				return responder.WriteError(c, err)
			}
			payload := map[string]any{"status": "ok"}
			if len(data) > 0 {
				payload["data"] = data
			}
			return responder.WriteJSON(c, payload)
		},
	}
}

func panelPreviewRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   path,
		Handler: func(c router.Context) error {
			binding, err := panelLookup(panelName)
			if err != nil {
				return responder.WriteError(c, err)
			}
			id := c.Param("id", "")
			if id == "" {
				return responder.WriteError(c, errMissingID)
			}
			res, err := binding.Preview(c, panelLocale(ctx, c), id)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, res)
		},
	}
}

func panelSubresourceRoutes(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName string) []RouteSpec {
	binding, err := panelLookup(panelName)
	if err != nil || binding == nil {
		return nil
	}
	specs := panelSubresources(binding)
	routes := make([]RouteSpec, 0, len(specs))
	for _, spec := range specs {
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
				binding, err := panelLookup(panelName)
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
				if err := binding.HandleSubresource(c, panelLocale(ctx, c), id, spec.Name, value); err != nil {
					return responder.WriteError(c, err)
				}
				return nil
			},
		})
	}
	return routes
}

func panelSubresources(binding PanelBinding) []PanelSubresourceSpec {
	if binding == nil {
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
		out = append(out, PanelSubresourceSpec{Name: name, Method: method})
	}
	return out
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
	if strings.TrimSpace(toStringAny(body["channel"])) == "" {
		if channel := strings.TrimSpace(c.Query("channel")); channel != "" {
			body["channel"] = channel
		}
	}
	if strings.TrimSpace(toStringAny(body["environment"])) == "" && strings.TrimSpace(toStringAny(body["env"])) == "" {
		if environment := strings.TrimSpace(c.Query("environment")); environment != "" {
			body["environment"] = environment
		} else if environment := strings.TrimSpace(c.Query("env")); environment != "" {
			body["environment"] = environment
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
