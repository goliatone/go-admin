package admin

import (
	"errors"
	"strings"

	router "github.com/goliatone/go-router"
)

func clonePanelSubresources(subresources []PanelSubresource) []PanelSubresource {
	if len(subresources) == 0 {
		return nil
	}
	out := make([]PanelSubresource, len(subresources))
	copy(out, subresources)
	return out
}

func normalizePanelSubresourceMethod(method string) string {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case "POST":
		return "POST"
	case "PUT":
		return "PUT"
	case "DELETE":
		return "DELETE"
	default:
		return "GET"
	}
}

// Get returns a single record if permitted.
func (p *Panel) Get(ctx AdminContext, id string) (map[string]any, error) {
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, p.permissions.View, p.name); err != nil {
		return nil, err
	}
	return p.repo.Get(ctx.Context, id)
}

// List retrieves records with permissions enforced.
func (p *Panel) List(ctx AdminContext, opts ListOptions) ([]map[string]any, int, error) {
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, p.permissions.View, p.name); err != nil {
		return nil, 0, err
	}
	return p.repo.List(ctx.Context, opts)
}

// Create inserts a record with hooks and permissions.
func (p *Panel) Create(ctx AdminContext, record map[string]any) (map[string]any, error) {
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, p.permissions.Create, p.name); err != nil {
		return nil, err
	}
	if p.hooks.BeforeCreate != nil {
		if err := p.hooks.BeforeCreate(ctx, record); err != nil {
			return nil, err
		}
	}
	res, err := p.repo.Create(ctx.Context, record)
	if err != nil {
		return nil, err
	}
	if p.hooks.AfterCreate != nil {
		if err := p.hooks.AfterCreate(ctx, res); err != nil {
			return nil, err
		}
	}
	p.recordActivity(ctx, "panel.create", map[string]any{
		"id":    extractRecordID(res),
		"panel": p.name,
	})
	return res, nil
}

// Update modifies a record with hooks and permissions.
func (p *Panel) Update(ctx AdminContext, id string, record map[string]any) (map[string]any, error) {
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, p.permissions.Edit, p.name); err != nil {
		return nil, err
	}
	if p.hooks.BeforeUpdateWithID != nil {
		if err := p.hooks.BeforeUpdateWithID(ctx, id, record); err != nil {
			p.recordBlockedTranslation(ctx, id, record, err)
			return nil, err
		}
	}
	if p.hooks.BeforeUpdate != nil {
		if err := p.hooks.BeforeUpdate(ctx, record); err != nil {
			p.recordBlockedTranslation(ctx, id, record, err)
			return nil, err
		}
	}
	res, err := p.repo.Update(ctx.Context, id, record)
	if err != nil {
		return nil, err
	}
	if p.hooks.AfterUpdate != nil {
		if err := p.hooks.AfterUpdate(ctx, res); err != nil {
			return nil, err
		}
	}
	p.recordActivity(ctx, "panel.update", map[string]any{
		"id":    extractRecordID(res, id),
		"panel": p.name,
	})
	return res, nil
}

// Delete removes a record with hooks and permissions.
func (p *Panel) Delete(ctx AdminContext, id string) error {
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, p.permissions.Delete, p.name); err != nil {
		captureActionExecutionFailureDiagnostic(ctx.Context, p.name, "delete", ActionScopeDetail, "permission", id, []string{id}, err)
		return err
	}
	if p.hooks.BeforeDelete != nil {
		if err := p.hooks.BeforeDelete(ctx, id); err != nil {
			captureActionExecutionFailureDiagnostic(ctx.Context, p.name, "delete", ActionScopeDetail, "before_delete_hook", id, []string{id}, err)
			return err
		}
	}
	if err := p.repo.Delete(ctx.Context, id); err != nil {
		captureActionExecutionFailureDiagnostic(ctx.Context, p.name, "delete", ActionScopeDetail, "repository_delete", id, []string{id}, err)
		return err
	}
	if p.hooks.AfterDelete != nil {
		if err := p.hooks.AfterDelete(ctx, id); err != nil {
			captureActionExecutionFailureDiagnostic(ctx.Context, p.name, "delete", ActionScopeDetail, "after_delete_hook", id, []string{id}, err)
			return err
		}
	}
	p.recordActivity(ctx, "panel.delete", map[string]any{
		"id":    id,
		"panel": p.name,
	})
	return nil
}

// Subresources returns normalized panel subresource declarations.
func (p *Panel) Subresources() []PanelSubresource {
	if p == nil {
		return nil
	}
	return clonePanelSubresources(normalizePanelSubresources(p.subresources))
}

// ServeSubresource resolves a panel subresource request.
func (p *Panel) ServeSubresource(ctx AdminContext, c router.Context, id, subresource, value string) error {
	if p == nil {
		return ErrNotFound
	}
	if c == nil {
		return validationDomainError("subresource context required", map[string]any{
			"panel": p.name,
		})
	}
	spec, ok := p.findSubresource(subresource)
	if !ok {
		return ErrNotFound
	}
	if err := requirePermissionWithAuthorizer(p.authorizer, ctx.Context, spec.Permission, p.name); err != nil {
		return err
	}
	id = strings.TrimSpace(id)
	value = strings.TrimSpace(value)
	if responder, ok := p.repo.(PanelSubresourceResponder); ok && responder != nil {
		return responder.ServePanelSubresource(ctx, c, id, spec.Name, value)
	}
	if repo, ok := p.repo.(PanelSubresourceRepository); ok && repo != nil {
		payload, err := repo.ResolvePanelSubresource(ctx.Context, id, spec.Name, value)
		if err != nil {
			return err
		}
		return c.JSON(200, payload)
	}
	return ErrNotFound
}

func (p *Panel) findSubresource(name string) (PanelSubresource, bool) {
	target := strings.ToLower(strings.TrimSpace(name))
	if target == "" {
		return PanelSubresource{}, false
	}
	for _, subresource := range p.Subresources() {
		if strings.ToLower(strings.TrimSpace(subresource.Name)) == target {
			return subresource, true
		}
	}
	return PanelSubresource{}, false
}

func (p *Panel) recordActivity(ctx AdminContext, action string, metadata map[string]any) {
	if p == nil || p.activity == nil {
		return
	}
	actor := ctx.UserID
	if actor == "" {
		actor = actorFromContext(ctx.Context)
	}
	entry := ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   "panel:" + p.name,
		Metadata: metadata,
	}
	_ = p.activity.Record(ctx.Context, entry)
}

func (p *Panel) recordBlockedTranslation(ctx AdminContext, id string, record map[string]any, err error) {
	if p == nil || err == nil {
		return
	}
	var missing MissingTranslationsError
	if !errors.As(err, &missing) {
		return
	}
	metadata := map[string]any{
		"panel":            p.name,
		"entity_id":        strings.TrimSpace(id),
		"transition":       strings.TrimSpace(toString(record["transition"])),
		"locale":           strings.TrimSpace(requestedLocaleFromPayload(record, localeFromContext(ctx.Context))),
		"channel":          strings.TrimSpace(resolvePolicyEnvironment(record, environmentFromContext(ctx.Context))),
		"policy_entity":    strings.TrimSpace(resolvePolicyEntity(record, p.name)),
		"translation_code": TextCodeTranslationMissing,
		"missing_locales":  normalizeLocaleList(missing.MissingLocales),
	}
	p.recordActivity(ctx, "panel.transition.blocked", metadata)
}

func extractRecordID(values ...any) string {
	for _, val := range values {
		switch v := val.(type) {
		case map[string]any:
			if id, ok := v["id"].(string); ok && id != "" {
				return id
			}
			if id, ok := v["ID"].(string); ok && id != "" {
				return id
			}
		case string:
			if v != "" {
				return v
			}
		}
	}
	return ""
}
