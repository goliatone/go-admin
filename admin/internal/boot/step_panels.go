package boot

import router "github.com/goliatone/go-router"

// PanelStep registers CRUD/action routes for panels.
func PanelStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	panels := ctx.Panels()
	if len(panels) == 0 {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	routes := []RouteSpec{}
	basePath := ctx.BasePath()
	defaultLocale := ctx.DefaultLocale()
	for _, binding := range panels {
		b := binding
		if b == nil {
			continue
		}
		name := b.Name()
		if name == "" {
			continue
		}
		base := joinPath(basePath, "api/"+name)

		routes = append(routes, RouteSpec{
			Method: "GET",
			Path:   base,
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				opts := parseListOptions(c)
				records, total, schema, form, err := b.List(c, locale, opts)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]any{
					"total":   total,
					"records": records,
					"schema":  schema,
					"form":    form,
				})
			},
		})

		routes = append(routes, RouteSpec{
			Method: "GET",
			Path:   joinPath(base, ":id"),
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				id := c.Param("id", "")
				if id == "" {
					return responder.WriteError(c, errMissingID)
				}
				rec, err := b.Detail(c, locale, id)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, rec)
			},
		})

		routes = append(routes, RouteSpec{
			Method: "POST",
			Path:   base,
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				body := map[string]any{}
				if raw := c.Body(); len(raw) > 0 {
					parsed, err := ctx.ParseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body = parsed
				}
				created, err := b.Create(c, locale, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, created)
			},
		})

		routes = append(routes, RouteSpec{
			Method: "PUT",
			Path:   joinPath(base, ":id"),
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				id := c.Param("id", "")
				if id == "" {
					return responder.WriteError(c, errMissingID)
				}
				body := map[string]any{}
				if raw := c.Body(); len(raw) > 0 {
					parsed, err := ctx.ParseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body = parsed
				}
				updated, err := b.Update(c, locale, id, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, updated)
			},
		})

		routes = append(routes, RouteSpec{
			Method: "DELETE",
			Path:   base,
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				id := c.Query("id")
				if id == "" {
					id = c.Param("id", "")
				}
				if id == "" {
					return responder.WriteError(c, errMissingID)
				}
				if err := b.Delete(c, locale, id); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "deleted"})
			},
		})

		routes = append(routes, RouteSpec{
			Method: "DELETE",
			Path:   joinPath(base, ":id"),
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				id := c.Param("id", "")
				if id == "" {
					return responder.WriteError(c, errMissingID)
				}
				if err := b.Delete(c, locale, id); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "deleted"})
			},
		})

		routes = append(routes, RouteSpec{
			Method: "POST",
			Path:   joinPath(base, "actions/:action"),
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				body := map[string]any{}
				if raw := c.Body(); len(raw) > 0 {
					parsed, err := ctx.ParseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body = parsed
				}
				actionName := c.Param("action", "")
				if actionName == "" {
					return responder.WriteError(c, errMissingAction)
				}
				if err := b.Action(c, locale, actionName, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			},
		})

		routes = append(routes, RouteSpec{
			Method: "POST",
			Path:   joinPath(base, "bulk/:action"),
			Handler: func(c router.Context) error {
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				body := map[string]any{}
				if raw := c.Body(); len(raw) > 0 {
					parsed, err := ctx.ParseBody(c)
					if err != nil {
						return responder.WriteError(c, err)
					}
					body = parsed
				}
				actionName := c.Param("action", "")
				if actionName == "" {
					return responder.WriteError(c, errMissingAction)
				}
				if err := b.Bulk(c, locale, actionName, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			},
		})
	}
	return applyRoutes(ctx, routes)
}
