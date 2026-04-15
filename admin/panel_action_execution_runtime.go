package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	command "github.com/goliatone/go-command"
)

// RunActionResponse dispatches a command-backed action and returns a structured response.
func (p *Panel) RunActionResponse(ctx AdminContext, name string, payload map[string]any, ids []string) (ActionResponse, error) {
	for _, action := range p.actions {
		if action.Name == name && action.CommandName != "" && p.commandBus != nil {
			required := actionRequiredPermissions(action)
			if len(required) > 0 && !CanAll(p.authorizer, ctx.Context, p.name, required...) {
				err := permissionDenied(actionMissingPermission(p.authorizer, ctx.Context, p.name, required), p.name)
				captureActionExecutionFailureDiagnostic(ctx.Context, p.name, name, action.Scope, "permission", resolvePrimaryActionID(payload, ids), ids, err)
				return ActionResponse{}, err
			}
			collector := &ActionResponseCollector{}
			actionCtx := ContextWithActionResponseCollector(ctx.Context, collector)
			err := p.commandBus.DispatchByName(actionCtx, action.CommandName, payload, ids)
			if err == nil {
				p.recordActivity(ctx, "panel.action", map[string]any{
					"panel":  p.name,
					"action": name,
				})
			}
			if err != nil {
				captureActionExecutionFailureDiagnostic(ctx.Context, p.name, name, action.Scope, "dispatch", resolvePrimaryActionID(payload, ids), ids, err)
				return ActionResponse{}, err
			}
			if response, ok := collector.Load(); ok {
				return normalizeActionResponse(response), nil
			}
			// Fall back to generic command result when a command stored one directly.
			result := command.ResultFromContext[map[string]any](actionCtx)
			if result != nil {
				if value, stored := result.Load(); stored && len(value) > 0 {
					return normalizeActionResponse(ActionResponse{Data: value}), nil
				}
			}
			return normalizeActionResponse(ActionResponse{}), nil
		}
	}
	err := notFoundDomainError("action not found", map[string]any{
		"panel":  p.name,
		"action": name,
	})
	captureActionExecutionFailureDiagnostic(ctx.Context, p.name, name, ActionScopeAny, "lookup", resolvePrimaryActionID(payload, ids), ids, err)
	return ActionResponse{}, err
}

// RunAction dispatches a command-backed action.
func (p *Panel) RunAction(ctx AdminContext, name string, payload map[string]any, ids []string) (map[string]any, error) {
	response, err := p.RunActionResponse(ctx, name, payload, ids)
	if err != nil {
		return nil, err
	}
	return primitives.CloneAnyMapNilOnEmpty(response.Data), nil
}

// RunBulkAction dispatches a command-backed bulk action.
func (p *Panel) RunBulkAction(ctx AdminContext, name string, payload map[string]any, ids []string) error {
	action, ok := p.findBulkActionDefinition(name)
	if !ok {
		return p.bulkActionFailure(ctx, name, ActionScopeBulk, "lookup", ids, notFoundDomainError("bulk action not found", map[string]any{
			"panel":  p.name,
			"action": name,
		}))
	}
	selection := dedupeStrings(append([]string{}, ids...))
	if len(selection) == 0 {
		selection = parseCommandIDs(payload, "", "")
	}
	requiresSelection := isBuiltInBulkDeleteAction(action.Name) || action.CommandName == "" || p.commandBus == nil
	if len(selection) == 0 && requiresSelection {
		return p.bulkActionFailure(ctx, name, ActionScopeBulk, "selection", selection, invalidSelectionDomainError("bulk action requires at least one selected record", map[string]any{
			"panel":  p.name,
			"action": strings.TrimSpace(name),
			"field":  "ids",
		}))
	}
	required := actionRequiredPermissions(action)
	if len(required) > 0 && p.authorizer != nil && !CanAll(p.authorizer, ctx.Context, p.name, required...) {
		return p.bulkActionFailure(ctx, name, ActionScopeBulk, "permission", selection, permissionDenied(actionMissingPermission(p.authorizer, ctx.Context, p.name, required), p.name))
	}
	if action.CommandName != "" && p.commandBus != nil {
		err := p.commandBus.DispatchByName(ctx.Context, action.CommandName, payload, selection)
		if err != nil {
			return p.bulkActionFailure(ctx, name, ActionScopeBulk, "dispatch", selection, err)
		}
		p.recordBulkAction(ctx, name, 0)
		return nil
	}
	if isBuiltInBulkDeleteAction(action.Name) {
		if err := p.runBuiltInBulkDelete(ctx, selection); err != nil {
			return p.bulkActionFailure(ctx, name, ActionScopeBulk, "built_in_bulk_delete", selection, err)
		}
		p.recordBulkAction(ctx, name, len(selection))
		return nil
	}
	return p.bulkActionFailure(ctx, name, ActionScopeBulk, "lookup", selection, notFoundDomainError("bulk action not found", map[string]any{
		"panel":  p.name,
		"action": name,
	}))
}

func (p *Panel) bulkActionFailure(ctx AdminContext, name string, scope ActionScope, stage string, ids []string, err error) error {
	captureActionExecutionFailureDiagnostic(ctx.Context, p.name, name, scope, stage, "", ids, err)
	return err
}

func (p *Panel) recordBulkAction(ctx AdminContext, name string, count int) {
	entry := map[string]any{
		"panel":  p.name,
		"action": strings.TrimSpace(name),
	}
	if count > 0 {
		entry["count"] = count
	}
	p.recordActivity(ctx, "panel.bulk_action", entry)
}

func (p *Panel) findAction(name string) (Action, bool) {
	target := strings.TrimSpace(name)
	if target == "" {
		return Action{}, false
	}
	for _, action := range normalizePanelActionsForSchema(p.actions, p.permissions, p.actionDefaultsMode) {
		if strings.EqualFold(strings.TrimSpace(action.Name), target) {
			return action, true
		}
	}
	return Action{}, false
}

func (p *Panel) findBulkAction(name string) (Action, bool) {
	return p.findBulkActionDefinition(name)
}

func (p *Panel) findBulkActionDefinition(name string) (Action, bool) {
	target := strings.TrimSpace(name)
	if target == "" {
		return Action{}, false
	}
	for _, action := range normalizeBulkActionsForSchema(p.bulkActions, p.permissions, p.actionDefaultsMode) {
		if strings.EqualFold(strings.TrimSpace(action.Name), target) {
			return action, true
		}
	}
	return Action{}, false
}

func (p *Panel) runBuiltInBulkDelete(ctx AdminContext, ids []string) error {
	seen := map[string]struct{}{}
	for _, rawID := range ids {
		id := strings.TrimSpace(rawID)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		if err := p.Delete(ctx, id); err != nil {
			return err
		}
	}
	return nil
}

func isBuiltInBulkDeleteAction(name string) bool {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "delete", "bulk_delete":
		return true
	default:
		return false
	}
}
