package boot

import (
	"strings"

	"github.com/goliatone/go-admin/admin/internal/adminkeys"
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
	locale := c.Query(adminkeys.KeyLocale)
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
				return responder.WriteError(c, panelRouteError(panelName, "list records", nil, err))
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

type panelReadHandler func(router.Context, PanelBinding, string) (map[string]any, error)

func panelReadRoute(
	ctx BootCtx,
	responder Responder,
	panelLookup panelBindingLookup,
	panelName, path, operation string,
	read panelReadHandler,
) RouteSpec {
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
			rec, err := read(c, binding, id)
			if err != nil {
				return responder.WriteError(c, panelRouteError(panelName, operation, map[string]string{"id": id}, err))
			}
			return responder.WriteJSON(c, rec)
		},
	}
}

func panelDetailRoute(ctx BootCtx, responder Responder, panelLookup panelBindingLookup, panelName, path string) RouteSpec {
	return panelReadRoute(ctx, responder, panelLookup, panelName, path, "load record", func(c router.Context, binding PanelBinding, id string) (map[string]any, error) {
		return binding.Detail(c, panelLocale(ctx, c), id)
	})
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
				return responder.WriteError(c, panelRouteError(panelName, "create record", nil, err))
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
				return responder.WriteError(c, panelRouteError(panelName, "update record", map[string]string{"id": id}, err))
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
			id := c.Query(adminkeys.KeyID)
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
		return responder.WriteError(c, panelRouteError(binding.Name(), "delete record", map[string]string{"id": id}, err))
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
				return responder.WriteError(c, panelRouteError(panelName, "run action", map[string]string{"action": actionName}, err))
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
				return responder.WriteError(c, panelRouteError(panelName, "load bulk action state", nil, err))
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
				return responder.WriteError(c, panelRouteError(panelName, "run bulk action", map[string]string{"bulk_action": actionName}, err))
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
	return panelReadRoute(ctx, responder, panelLookup, panelName, path, "preview record", func(c router.Context, binding PanelBinding, id string) (map[string]any, error) {
		return binding.Preview(c, panelLocale(ctx, c), id)
	})
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
					return responder.WriteError(c, panelRouteError(panelName, "handle subresource", map[string]string{
						"id":          id,
						"subresource": spec.Name,
						"value":       value,
					}, err))
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
	if strings.TrimSpace(toStringAny(body[adminkeys.KeyLocale])) == "" {
		if locale := strings.TrimSpace(c.Query(adminkeys.KeyLocale)); locale != "" {
			body[adminkeys.KeyLocale] = locale
		} else if locale := strings.TrimSpace(routeLocale); locale != "" {
			body[adminkeys.KeyLocale] = locale
		}
	}
	if strings.TrimSpace(toStringAny(body[adminkeys.KeyChannel])) == "" {
		if channel := strings.TrimSpace(c.Query(adminkeys.KeyChannel)); channel != "" {
			body[adminkeys.KeyChannel] = channel
		}
	}
	if strings.TrimSpace(toStringAny(body[adminkeys.KeyEnvironment])) == "" && strings.TrimSpace(toStringAny(body[adminkeys.KeyEnv])) == "" {
		if environment := strings.TrimSpace(c.Query(adminkeys.KeyEnvironment)); environment != "" {
			body[adminkeys.KeyEnvironment] = environment
		} else if environment := strings.TrimSpace(c.Query(adminkeys.KeyEnv)); environment != "" {
			body[adminkeys.KeyEnvironment] = environment
		}
	}
	if strings.TrimSpace(toStringAny(body[adminkeys.KeyPolicyEntity])) == "" && strings.TrimSpace(toStringAny(body["policyEntity"])) == "" {
		if policyEntity := strings.TrimSpace(c.Query(adminkeys.KeyPolicyEntity)); policyEntity != "" {
			body[adminkeys.KeyPolicyEntity] = policyEntity
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
