package admin

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-command/dispatcher"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/authctx"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/julienschmidt/httprouter"
)

type featureGatesAdapter struct {
	gate fggate.FeatureGate
}

func (f featureGatesAdapter) Enabled(key string) bool {
	enabled, err := f.enabled(context.Background(), key)
	return err == nil && enabled
}

func (f featureGatesAdapter) Require(key string) error {
	enabled, err := f.enabled(context.Background(), key)
	if err != nil {
		return err
	}
	if enabled {
		return nil
	}
	return FeatureDisabledError{Feature: key}
}

func (f featureGatesAdapter) enabled(ctx context.Context, key string) (bool, error) {
	if f.gate == nil {
		return false, nil
	}
	return f.gate.Enabled(ctx, key, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
}

type responderAdapter struct{}

func (responderAdapter) WriteJSON(c router.Context, payload any) error {
	return writeJSON(c, payload)
}

func (responderAdapter) WriteHTML(c router.Context, html string) error {
	return writeHTML(c, html)
}

func (responderAdapter) WriteError(c router.Context, err error) error {
	return writeError(c, err)
}

type panelBinding struct {
	admin *Admin
	name  string
	panel *Panel
}

func newPanelBindings(a *Admin) []boot.PanelBinding {
	if a == nil || a.registry == nil {
		return nil
	}
	out := []boot.PanelBinding{}
	preferencesEnabled := featureEnabled(a.featureGate, FeaturePreferences)
	for name, panel := range a.registry.Panels() {
		if name == preferencesModuleID && !preferencesEnabled {
			continue
		}
		out = append(out, &panelBinding{admin: a, name: name, panel: panel})
	}
	return out
}

func (p *panelBinding) Name() string { return p.name }

func (p *panelBinding) List(c router.Context, locale string, opts boot.ListOptions) ([]map[string]any, int, any, any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	listOpts := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Filters:  opts.Filters,
		Search:   opts.Search,
	}
	if len(opts.Predicates) > 0 {
		listOpts.Predicates = make([]ListPredicate, 0, len(opts.Predicates))
		for _, predicate := range opts.Predicates {
			listOpts.Predicates = append(listOpts.Predicates, ListPredicate{
				Field:    predicate.Field,
				Operator: predicate.Operator,
				Values:   append([]string{}, predicate.Values...),
			})
		}
	}
	baseSchema := p.panel.Schema()
	if baseSchema.UseBlocks || baseSchema.UseSEO || baseSchema.TreeView {
		if listOpts.Filters == nil {
			listOpts.Filters = map[string]any{}
		}
		if locale != "" {
			listOpts.Filters["locale"] = locale
		}
	}
	if listOpts.Search != "" {
		if listOpts.Filters == nil {
			listOpts.Filters = map[string]any{}
		}
		listOpts.Filters["_search"] = listOpts.Search
	}
	records, total, err := p.panel.List(ctx, listOpts)
	if err != nil {
		return nil, 0, nil, nil, err
	}
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	if p.admin != nil {
		p.admin.applyContentTypeSchemaFromContext(ctx, &schema, p.name)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, 0, nil, nil, err
	}
	var form PanelFormRequest
	if p.admin.panelForm != nil {
		form = p.admin.panelForm.Build(p.panel, ctx, nil, nil)
		if p.admin != nil {
			p.admin.applyContentTypeSchemaFromContext(ctx, &form.Schema, p.name)
		}
		if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
			return nil, 0, nil, nil, err
		}
	}
	return records, total, schema, form, nil
}

func (p *panelBinding) Detail(c router.Context, locale string, id string) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	record, err := p.panel.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	contentTypeKey := ""
	if p.name == "content" && record != nil {
		contentTypeKey = firstNonEmpty(
			toString(record["content_type_slug"]),
			toString(record["content_type"]),
			toString(record["content_type_id"]),
		)
	}
	if p.admin != nil && contentTypeKey != "" {
		p.admin.applyContentTypeSchema(ctx, &schema, contentTypeKey)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, err
	}
	var form PanelFormRequest
	if p.admin.panelForm != nil {
		form = p.admin.panelForm.Build(p.panel, ctx, record, nil)
		if p.admin != nil && contentTypeKey != "" {
			p.admin.applyContentTypeSchema(ctx, &form.Schema, contentTypeKey)
		}
		if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
			return nil, err
		}
	}

	res := map[string]any{
		"data":   record,
		"schema": schema,
		"form":   form,
	}

	if p.panel.workflow != nil {
		state := ""
		if s, ok := record["status"].(string); ok {
			state = s
		}
		if transitions, err := p.panel.workflow.AvailableTransitions(ctx.Context, p.name, state); err == nil {
			res["workflow"] = map[string]any{
				"transitions": transitions,
			}
		}
	}

	return res, nil
}

func (p *panelBinding) Create(c router.Context, locale string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.Create(ctx, body)
}

func (p *panelBinding) Update(c router.Context, locale string, id string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.Update(ctx, id, body)
}

func (p *panelBinding) Delete(c router.Context, locale string, id string) error {
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.Delete(ctx, id)
}

func (p *panelBinding) Action(c router.Context, locale, action string, body map[string]any) error {
	ctx := p.admin.adminContextFromRequest(c, locale)
	ids := parseCommandIDs(body, c.Query("id"), c.Query("ids"))

	if action == "create_translation" {
		if len(ids) == 0 {
			if raw := toString(body["id"]); raw != "" {
				ids = []string{raw}
			}
		}
		if len(ids) != 1 {
			return errors.New("translation requires a single id")
		}
		targetLocale := strings.TrimSpace(toString(body["locale"]))
		if targetLocale == "" {
			return errors.New("translation locale required")
		}
		record, err := p.panel.Get(ctx, ids[0])
		if err != nil {
			return err
		}
		clone := map[string]any{}
		for k, v := range record {
			clone[k] = v
		}
		delete(clone, "id")
		delete(clone, "ID")
		delete(clone, "created_at")
		delete(clone, "updated_at")
		delete(clone, "published_at")
		clone["locale"] = targetLocale
		groupID := strings.TrimSpace(toString(record["translation_group_id"]))
		if groupID == "" {
			groupID = ids[0]
		}
		clone["translation_group_id"] = groupID
		clone["status"] = "draft"
		_, err = p.panel.Create(ctx, clone)
		return err
	}

	if p.panel.workflow != nil && len(ids) == 1 {
		record, err := p.panel.Get(ctx, ids[0])
		if err == nil {
			state := ""
			if s, ok := record["status"].(string); ok {
				state = s
			}
			transitions, err := p.panel.workflow.AvailableTransitions(ctx.Context, p.name, state)
			if err == nil {
				for _, t := range transitions {
					if t.Name == action {
						for _, a := range p.panel.actions {
							if a.Name == action && a.Permission != "" && p.panel.authorizer != nil {
								if !p.panel.authorizer.Can(ctx.Context, a.Permission, p.name) {
									return permissionDenied(a.Permission, p.name)
								}
							}
						}
						policyInput := buildTranslationPolicyInput(ctx.Context, p.name, ids[0], state, action, body)
						if policyInput.RequestedLocale == "" && record != nil {
							policyInput.RequestedLocale = requestedLocaleFromPayload(record, localeFromContext(ctx.Context))
						}
						if policyInput.Environment == "" && record != nil {
							policyInput.Environment = resolvePolicyEnvironment(record, environmentFromContext(ctx.Context))
						}
						if policyInput.PolicyEntity == "" && record != nil {
							policyInput.PolicyEntity = resolvePolicyEntity(record, p.name)
						}
						if err := applyTranslationPolicy(ctx.Context, p.panel.translationPolicy, policyInput); err != nil {
							return err
						}
						_, err := p.panel.workflow.Transition(ctx.Context, TransitionInput{
							EntityID:     ids[0],
							EntityType:   p.name,
							CurrentState: state,
							Transition:   action,
							TargetState:  t.To,
							ActorID:      ctx.UserID,
							Metadata:     body,
						})
						if err == nil {
							// Successfully transitioned, now update the record status without re-evaluating workflow.
							_, _ = p.panel.Update(ctx, ids[0], map[string]any{"status": t.To, "_workflow_skip": true})
						}
						return err
					}
				}
			}
		}
	}

	return p.panel.RunAction(ctx, action, body, ids)
}

func (p *panelBinding) Bulk(c router.Context, locale, action string, body map[string]any) error {
	ctx := p.admin.adminContextFromRequest(c, locale)
	ids := parseCommandIDs(body, c.Query("id"), c.Query("ids"))
	return p.panel.RunBulkAction(ctx, action, body, ids)
}

func (p *panelBinding) Preview(c router.Context, locale, id string) (map[string]any, error) {
	if p.admin.preview == nil {
		return nil, FeatureDisabledError{Feature: "preview"}
	}
	format := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if format == "" {
		format = strings.ToLower(strings.TrimSpace(c.Query("token_type")))
	}
	var (
		token string
		err   error
	)
	if format == "jwt" {
		token, err = p.admin.preview.GenerateJWT(p.name, id, 1*time.Hour)
	} else {
		token, err = p.admin.preview.Generate(p.name, id, 1*time.Hour)
	}
	if err != nil {
		return nil, err
	}
	query := url.Values{}
	if strings.TrimSpace(locale) != "" {
		query.Set("locale", locale)
	}

	params := map[string]string{"token": token}
	previewURL := resolveURLWith(p.admin.urlManager, publicAPIGroupName(p.admin.config), "preview", params, query)
	adminURL := resolveURLWith(p.admin.urlManager, adminAPIGroupName(p.admin.config), "preview", params, query)
	return map[string]any{
		"token":     token,
		"url":       previewURL,
		"admin_url": adminURL,
		"format":    format,
	}, nil
}

type dashboardBinding struct {
	admin *Admin
}

func newDashboardBinding(a *Admin) boot.DashboardBinding {
	if a == nil || a.dashboard == nil {
		return nil
	}
	return &dashboardBinding{admin: a}
}

func (d *dashboardBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dashboard != nil && d.admin.dashboard.HasRenderer()
}

func (d *dashboardBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return "", nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	theme := d.admin.resolveTheme(ctx.Context)
	basePath := d.admin.config.BasePath
	if basePath == "" {
		basePath = "/"
	}
	layout, err := d.admin.dashboard.RenderLayout(ctx, theme, basePath)
	if err != nil {
		return "", err
	}
	return d.admin.dashboard.renderer.Render("dashboard_ssr.html", layout)
}

func (d *dashboardBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	widgets, err := d.admin.dashboard.Resolve(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"widgets": widgets,
		"theme":   d.admin.themePayload(ctx.Context),
	}, nil
}

func (d *dashboardBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	layout := d.admin.dashboard.resolvedInstances(adminCtx)
	areas := d.admin.dashboard.Areas()
	if len(areas) == 0 && d.admin.widgetSvc != nil {
		areas = d.admin.widgetSvc.Areas()
	}
	return map[string]any{
		"providers": d.admin.dashboard.Providers(),
		"layout":    layout,
		"areas":     areas,
	}, nil
}

func (d *dashboardBinding) SavePreferences(c router.Context, body map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, d.admin.config.DefaultLocale)

	if adminCtx.UserID != "" && d.admin.preferences != nil {
		overrides := expandDashboardOverrides(body)
		if _, err := d.admin.preferences.SaveDashboardOverrides(adminCtx.Context, adminCtx.UserID, overrides); err != nil {
			return nil, err
		}
	}

	if _, ok := body["layout_rows"]; ok {
		type widgetSlot struct {
			ID    string `json:"id"`
			Width int    `json:"width"`
		}
		type widgetLayoutRow struct {
			Widgets []widgetSlot `json:"widgets"`
		}
		rows := map[string][]widgetLayoutRow{}
		if rawRows, ok := body["layout_rows"].(map[string]any); ok {
			for area, areaRows := range rawRows {
				parsedRows := []widgetLayoutRow{}
				if rawAreaRows, ok := areaRows.([]any); ok {
					for _, r := range rawAreaRows {
						if rowMap, ok := r.(map[string]any); ok {
							wSlots := []widgetSlot{}
							if rawWidgets, ok := rowMap["widgets"].([]any); ok {
								for _, w := range rawWidgets {
									if wMap, ok := w.(map[string]any); ok {
										wSlots = append(wSlots, widgetSlot{
											ID:    toString(wMap["id"]),
											Width: atoiDefault(toString(wMap["width"]), 12),
										})
									}
								}
							}
							parsedRows = append(parsedRows, widgetLayoutRow{Widgets: wSlots})
						}
					}
				}
				rows[area] = parsedRows
			}
		}

		hiddenIDs := []string{}
		if rawHidden, ok := body["hidden_widget_ids"].([]any); ok {
			for _, id := range rawHidden {
				hiddenIDs = append(hiddenIDs, toString(id))
			}
		}

		currentLayout := d.admin.dashboard.resolvedInstances(adminCtx)
		byID := map[string]DashboardWidgetInstance{}
		for _, inst := range currentLayout {
			byID[inst.ID] = inst
		}

		newLayout := []DashboardWidgetInstance{}
		seenIDs := map[string]bool{}

		for areaCode, areaRows := range rows {
			for _, row := range areaRows {
				for _, slot := range row.Widgets {
					if inst, ok := byID[slot.ID]; ok {
						inst.AreaCode = areaCode
						inst.Span = slot.Width
						inst.Position = len(newLayout)
						inst.Hidden = false
						newLayout = append(newLayout, inst)
						seenIDs[slot.ID] = true
					}
				}
			}
		}

		for _, id := range hiddenIDs {
			if inst, ok := byID[id]; ok {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
				seenIDs[id] = true
			}
		}

		for _, inst := range currentLayout {
			if !seenIDs[inst.ID] {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
			}
		}

		if len(newLayout) > 0 {
			d.admin.dashboard.SetUserLayoutWithContext(adminCtx, newLayout)
		}
		return map[string]any{"status": "ok", "layout": newLayout}, nil
	}

	rawLayout, ok := body["layout"].([]any)
	if !ok {
		return nil, errors.New("layout must be an array or valid preferences object")
	}
	layout := []DashboardWidgetInstance{}
	for _, item := range rawLayout {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		layout = append(layout, DashboardWidgetInstance{
			DefinitionCode: toString(obj["definition"]),
			AreaCode:       toString(obj["area"]),
			Config:         extractMap(obj["config"]),
			Position:       atoiDefault(toString(obj["position"]), 0),
			Span:           atoiDefault(toString(obj["span"]), 0),
			Hidden:         toBool(obj["hidden"]),
			Locale:         toString(obj["locale"]),
		})
	}
	if len(layout) > 0 {
		d.admin.dashboard.SetUserLayoutWithContext(adminCtx, layout)
	}
	return map[string]any{"layout": layout}, nil
}

func (d *dashboardBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

type dashboardGoBinding struct {
	admin *Admin
}

func (d *dashboardGoBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardGoBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dash != nil && d.admin.dash.controller != nil
}

func (d *dashboardGoBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dash == nil || d.admin.dash.controller == nil {
		return "", nil
	}
	viewer := d.viewer(c, locale)
	var buf strings.Builder
	if err := d.admin.dash.controller.RenderTemplate(c.Context(), viewer, &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (d *dashboardGoBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	widgets, err := d.admin.dashboard.Resolve(adminCtx)
	if err != nil {
		return nil, err
	}
	payload := map[string]any{
		"widgets": widgets,
		"locale":  locale,
	}
	if base := d.admin.config.BasePath; base != "" {
		payload["base_path"] = base
	}
	if theme := d.admin.themePayload(adminCtx.Context); theme != nil {
		payload["theme"] = theme
	}
	return payload, nil
}

func (d *dashboardGoBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	return d.Widgets(c, locale)
}

func (d *dashboardGoBinding) SavePreferences(c router.Context, _ map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dash == nil {
		return nil, nil
	}
	viewer := d.viewer(c, d.admin.config.DefaultLocale)
	if viewer.UserID == "" {
		return map[string]any{"status": "skipped"}, nil
	}
	if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, dashcmp.LayoutOverrides{}); err != nil {
		return nil, err
	}
	return map[string]any{"status": "ok"}, nil
}

func (d *dashboardGoBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RegisterGoDashboardRoutes() error {
	if d.admin == nil || d.admin.dash == nil || d.admin.router == nil {
		return nil
	}
	defaultLocale := d.admin.config.DefaultLocale
	viewerResolver := func(c router.Context) dashcmp.ViewerContext {
		locale := strings.TrimSpace(c.Query("locale"))
		if locale == "" {
			locale = defaultLocale
		}
		adminCtx := d.admin.adminContextFromRequest(c, locale)
		if c != nil {
			c.SetContext(adminCtx.Context)
		}
		return dashcmp.ViewerContext{
			UserID: adminCtx.UserID,
			Locale: locale,
		}
	}
	basePath := adminBasePath(d.admin.config)
	routes := dashboardrouter.RouteConfig{
		HTML:        relativeRoutePath(basePath, adminRoutePath(d.admin, "dashboard.page")),
		Layout:      relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard")),
		Widgets:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets")),
		WidgetID:    relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widget")),
		Reorder:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.reorder")),
		Refresh:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.refresh")),
		Preferences: relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.preferences")),
	}

	//TODO: Refactor so we do not need to cast
	if rt, ok := d.admin.router.(router.Router[router.Context]); ok {
		if err := dashboardrouter.Register(dashboardrouter.Config[router.Context]{
			Router:         rt,
			Controller:     d.admin.dash.controller,
			API:            d.admin.dash.executor,
			Broadcast:      d.admin.dash.broadcast,
			ViewerResolver: viewerResolver,
			BasePath:       basePath,
			Routes:         routes,
		}); err == nil {
			return nil
		}
	}

	//TODO: Refactor so we do not need to cast
	if rt, ok := d.admin.router.(router.Router[*httprouter.Router]); ok {
		if err := dashboardrouter.Register(dashboardrouter.Config[*httprouter.Router]{
			Router:         rt,
			Controller:     d.admin.dash.controller,
			API:            d.admin.dash.executor,
			Broadcast:      d.admin.dash.broadcast,
			ViewerResolver: viewerResolver,
			BasePath:       basePath,
			Routes:         routes,
		}); err == nil {
			return nil
		}
	}
	//TODO: Refactor so we do not need to cast
	if rt, ok := d.admin.router.(router.Router[*fiber.App]); ok {
		if err := dashboardrouter.Register(dashboardrouter.Config[*fiber.App]{
			Router:         rt,
			Controller:     d.admin.dash.controller,
			API:            d.admin.dash.executor,
			Broadcast:      d.admin.dash.broadcast,
			ViewerResolver: viewerResolver,
			BasePath:       basePath,
			Routes:         routes,
		}); err == nil {
			return nil
		}
	}
	if rt, ok := d.admin.router.(AdminRouter); ok {
		dashboardPath := adminAPIRoutePath(d.admin, "dashboard")
		prefsPath := adminAPIRoutePath(d.admin, "dashboard.preferences")
		configPath := adminAPIRoutePath(d.admin, "dashboard.config")
		getLocale := func(c router.Context) string {
			locale := strings.TrimSpace(c.Query("locale"))
			if locale == "" {
				locale = defaultLocale
			}
			return locale
		}
		rt.Get(dashboardPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(prefsPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(configPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		savePrefs := func(c router.Context) error {
			locale := getLocale(c)
			adminCtx := d.admin.adminContextFromRequest(c, locale)
			viewer := dashcmp.ViewerContext{UserID: adminCtx.UserID, Locale: adminCtx.Locale}
			if viewer.UserID == "" {
				return writeError(c, ErrForbidden)
			}
			raw, err := d.admin.ParseBody(c)
			if err != nil {
				return writeError(c, err)
			}
			adminOverrides := expandDashboardOverrides(raw)
			if adminOverrides.Locale == "" {
				adminOverrides.Locale = locale
			}
			overrides := dashcmp.LayoutOverrides{
				Locale:        adminOverrides.Locale,
				AreaOrder:     cloneStringSliceMap(adminOverrides.AreaOrder),
				AreaRows:      convertDashboardRows(adminOverrides.AreaRows),
				HiddenWidgets: cloneHiddenWidgetMap(adminOverrides.HiddenWidgets),
			}
			if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, overrides); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]any{"status": "ok"})
		}
		rt.Post(prefsPath, savePrefs)
		rt.Post(configPath, savePrefs)
		return nil
	}
	return fmt.Errorf("router does not support go-dashboard routes")
}

func (d *dashboardGoBinding) viewer(c router.Context, locale string) dashcmp.ViewerContext {
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: locale,
	}
}

type navigationBinding struct {
	admin *Admin
}

func newNavigationBinding(a *Admin) boot.NavigationBinding {
	if a == nil || a.nav == nil {
		return nil
	}
	return &navigationBinding{admin: a}
}

func (n *navigationBinding) Resolve(c router.Context, locale, code string) (any, map[string]map[string]string) {
	ctx := n.admin.adminContextFromRequest(c, locale)
	items := n.admin.nav.ResolveMenu(ctx.Context, code, locale)
	return items, n.admin.themePayload(ctx.Context)
}

type searchBinding struct {
	admin *Admin
}

func newSearchBinding(a *Admin) boot.SearchBinding {
	if a == nil || a.search == nil {
		return nil
	}
	return &searchBinding{admin: a}
}

func (s *searchBinding) Query(c router.Context, locale, query string, limit int) ([]any, error) {
	ctx := s.admin.adminContextFromRequest(c, locale)
	results, err := s.admin.search.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	out := []any{}
	for _, result := range results {
		out = append(out, result)
	}
	return out, nil
}

type bulkBinding struct {
	admin *Admin
}

func newBulkBinding(a *Admin) boot.BulkBinding {
	if a == nil || a.bulkSvc == nil {
		return nil
	}
	return &bulkBinding{admin: a}
}

func (b *bulkBinding) List(c router.Context) (map[string]any, error) {
	jobs := b.admin.bulkSvc.List(c.Context())
	return map[string]any{"jobs": jobs}, nil
}

func (b *bulkBinding) Start(c router.Context, body map[string]any) (map[string]any, error) {
	total := atoiDefault(toString(body["total"]), 0)
	req := BulkRequest{
		Name:   toString(body["name"]),
		Action: toString(body["action"]),
		Total:  total,
	}
	if req.Name == "" && req.Action != "" {
		req.Name = req.Action
	}
	job, err := b.admin.bulkSvc.Start(c.Context(), req)
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.trigger", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
		"name":   job.Name,
		"action": job.Action,
	}, ActivityActorTypeTask))
	return map[string]any{"job": job}, nil
}

func (b *bulkBinding) Rollback(c router.Context, id string, body map[string]any) (map[string]any, error) {
	if rollbackSvc, ok := b.admin.bulkSvc.(BulkRollbacker); ok {
		if id == "" && body != nil {
			id = toString(body["id"])
		}
		if id == "" {
			return nil, errors.New("id required")
		}
		job, err := rollbackSvc.Rollback(c.Context(), id)
		if err != nil {
			return nil, err
		}
		b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.rollback", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
			"name":   job.Name,
			"action": job.Action,
		}, ActivityActorTypeTask))
		return map[string]any{"job": job}, nil
	}
	return nil, FeatureDisabledError{Feature: string(FeatureBulk)}
}

type mediaBinding struct {
	admin *Admin
}

func newMediaBinding(a *Admin) boot.MediaBinding {
	if a == nil || a.mediaLibrary == nil {
		return nil
	}
	return &mediaBinding{admin: a}
}

func (m *mediaBinding) List(c router.Context) (map[string]any, error) {
	items, err := m.admin.mediaLibrary.List(c.Context())
	if err != nil {
		return nil, err
	}
	return map[string]any{"items": items}, nil
}

func (m *mediaBinding) Add(c router.Context, body map[string]any) (any, error) {
	item := MediaItem{
		ID:        toString(body["id"]),
		Name:      toString(body["name"]),
		URL:       toString(body["url"]),
		Thumbnail: toString(body["thumbnail"]),
		Metadata:  extractMap(body["metadata"]),
	}
	created, err := m.admin.mediaLibrary.Add(c.Context(), item)
	if err != nil {
		return nil, err
	}
	return created, nil
}

type notificationsBinding struct {
	admin *Admin
}

func newNotificationsBinding(a *Admin) boot.NotificationsBinding {
	if a == nil || a.notifications == nil {
		return nil
	}
	return &notificationsBinding{admin: a}
}

func (n *notificationsBinding) List(c router.Context) (map[string]any, error) {
	ctx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(ctx, n.admin.config.NotificationsPermission, "notifications"); err != nil {
		return nil, err
	}
	items, err := n.admin.notifications.List(ctx.Context)
	if err != nil {
		return nil, err
	}
	unread := 0
	for _, item := range items {
		if !item.Read {
			unread++
		}
	}
	return map[string]any{
		"notifications": items,
		"unread_count":  unread,
	}, nil
}

func (n *notificationsBinding) Mark(c router.Context, body map[string]any) error {
	rawIDs, ok := body["ids"].([]any)
	if !ok {
		return errors.New("ids must be array")
	}
	read := true
	if r, ok := body["read"].(bool); ok {
		read = r
	}
	ids := []string{}
	for _, v := range rawIDs {
		if s, ok := v.(string); ok {
			ids = append(ids, s)
		}
	}
	adminCtx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(adminCtx, n.admin.config.NotificationsUpdatePermission, "notifications"); err != nil {
		return err
	}
	if n.admin.notifications != nil {
		return n.admin.notifications.Mark(adminCtx.Context, ids, read)
	}
	return FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type activityBinding struct {
	admin *Admin
}

func newActivityBinding(a *Admin) boot.ActivityBinding {
	if a == nil {
		return nil
	}
	return &activityBinding{admin: a}
}

func (aBinding *activityBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := aBinding.admin.adminContextFromRequest(c, aBinding.admin.config.DefaultLocale)
	actorRef, actorCtx, err := authctx.ResolveActor(adminCtx.Context)
	if err != nil {
		return nil, err
	}
	if err := aBinding.admin.requirePermission(adminCtx, aBinding.admin.config.ActivityPermission, "activity"); err != nil {
		return nil, err
	}
	if aBinding.admin.activityFeed == nil {
		return nil, FeatureDisabledError{Feature: "activity"}
	}
	filter, err := parseActivityFilter(c, actorRef, authctx.ScopeFromActorContext(actorCtx))
	if err != nil {
		return nil, err
	}
	page, err := aBinding.admin.activityFeed.Query(adminCtx.Context, filter)
	if err != nil {
		if errors.Is(err, usertypes.ErrMissingActivityRepository) {
			return nil, FeatureDisabledError{Feature: "activity"}
		}
		return nil, err
	}
	return map[string]any{
		"entries":     entriesFromUsersRecords(page.Records),
		"total":       page.Total,
		"next_offset": page.NextOffset,
		"has_more":    page.HasMore,
	}, nil
}

type jobsBinding struct {
	admin *Admin
}

func newJobsBinding(a *Admin) boot.JobsBinding {
	if a == nil || a.jobs == nil {
		return nil
	}
	return &jobsBinding{admin: a}
}

func (j *jobsBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsPermission, "jobs"); err != nil {
		return nil, err
	}
	return map[string]any{"jobs": j.admin.jobs.List()}, nil
}

func (j *jobsBinding) Trigger(c router.Context, body map[string]any) error {
	name, _ := body["name"].(string)
	if name == "" {
		return errors.New("name required")
	}
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsTriggerPermission, "jobs"); err != nil {
		return err
	}
	return j.admin.jobs.Trigger(adminCtx, name)
}

type settingsBinding struct {
	admin *Admin
}

func newSettingsBinding(a *Admin) boot.SettingsBinding {
	if a == nil || a.settings == nil {
		return nil
	}
	return &settingsBinding{admin: a}
}

func (s *settingsBinding) Values(c router.Context) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	return map[string]any{"values": s.admin.settings.ResolveAll(ctx.UserID)}, nil
}

func (s *settingsBinding) Form(c router.Context) (any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	form := s.admin.settingsForm.FormWithContext(ctx.Context, ctx.UserID)
	return form, nil
}

func (s *settingsBinding) Save(c router.Context, body map[string]any) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsUpdatePermission, "settings"); err != nil {
		return nil, err
	}
	valuesRaw, ok := body["values"].(map[string]any)
	if !ok {
		return nil, errors.New("values must be an object")
	}
	scope := SettingsScopeSite
	if str, ok := body["scope"].(string); ok && str != "" {
		scope = SettingsScope(str)
	}
	bundle := SettingsBundle{
		Scope:  scope,
		UserID: ctx.UserID,
		Values: valuesRaw,
	}
	if s.admin.commandBus != nil {
		payload := map[string]any{
			"values":  valuesRaw,
			"scope":   string(scope),
			"user_id": ctx.UserID,
		}
		if err := s.admin.commandBus.DispatchByName(ctx.Context, settingsUpdateCommandName, payload, nil); err != nil {
			return nil, err
		}
	} else if s.admin.settingsCommand != nil {
		if err := s.admin.settingsCommand.Execute(ctx.Context, SettingsUpdateMsg{Bundle: bundle}); err != nil {
			return nil, err
		}
	} else if s.admin.settings != nil {
		if err := s.admin.settings.Apply(ctx.Context, bundle); err != nil {
			return nil, err
		}
	}
	return map[string]any{
		"status": "ok",
		"values": s.admin.settings.ResolveAll(ctx.UserID),
	}, nil
}

func (d *dashboardBinding) Diagnostics(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	msg := DashboardDiagnosticsMsg{Locale: locale}
	report, err := dispatcher.Query[DashboardDiagnosticsMsg, DashboardDiagnosticsReport](ctx.Context, msg)
	if err != nil {
		// Fallback to direct diagnostics when the command bus/query registry isn't available.
		if fallback, ferr := (&dashboardDiagnosticsQuery{admin: d.admin}).Query(ctx.Context, msg); ferr == nil {
			report = fallback
		} else {
			return nil, err
		}
	}
	return map[string]any{
		"locale":             report.Locale,
		"areas":              report.Areas,
		"providers":          report.Providers,
		"definitions":        report.Definitions,
		"instances":          report.Instances,
		"instances_by_area":  report.InstancesByArea,
		"resolved_by_area":   report.ResolvedByArea,
		"resolve_errors":     report.ResolveErrors,
		"widget_service":     report.WidgetService,
		"has_widget_service": report.HasWidgetService,
	}, nil
}
