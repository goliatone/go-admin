package admin

import (
	"sort"
	"strings"
)

var passivePanelActionNames = map[string]struct{}{
	"view":   {},
	"edit":   {},
	"delete": {},
}

var workflowActionNames = map[string]struct{}{
	"submit_for_approval": {},
	"request_approval":    {},
	"approve":             {},
	"reject":              {},
	"publish":             {},
	"unpublish":           {},
	"archive":             {},
}

func (a *Admin) validatePanelActionWiring() error {
	if a == nil || a.registry == nil {
		return nil
	}
	panels := a.registry.Panels()
	if len(panels) == 0 {
		return nil
	}
	names := make([]string, 0, len(panels))
	for name := range panels {
		names = append(names, name)
	}
	sort.Strings(names)

	issues := make([]map[string]any, 0)
	for _, panelName := range names {
		panel := panels[panelName]
		if panel == nil {
			continue
		}
		issues = append(issues, validatePanelActionScope(panel, panelName, "row", panel.actions, a.commandBus)...)
		issues = append(issues, validatePanelActionScope(panel, panelName, "bulk", panel.bulkActions, a.commandBus)...)
	}
	if len(issues) == 0 {
		return nil
	}
	return validationDomainError("panel action wiring validation failed", map[string]any{
		"component": "panel_action_wiring",
		"issues":    issues,
	})
}

func validatePanelActionScope(panel *Panel, panelName, scope string, actions []Action, bus *CommandBus) []map[string]any {
	if panel == nil || len(actions) == 0 {
		return nil
	}
	issues := make([]map[string]any, 0)
	for _, action := range actions {
		issue := validatePanelAction(panel, panelName, scope, action, bus)
		if issue != nil {
			issues = append(issues, issue)
		}
	}
	return issues
}

func validatePanelAction(panel *Panel, panelName, scope string, action Action, bus *CommandBus) map[string]any {
	actionName := strings.ToLower(strings.TrimSpace(action.Name))
	commandName := strings.TrimSpace(action.CommandName)
	if actionName == "" {
		return panelActionIssue(panelName, scope, action, "action_name_required")
	}
	if commandName != "" {
		if bus != nil && !bus.HasFactory(commandName) {
			return panelActionIssue(panelName, scope, action, "command_factory_not_registered")
		}
		return nil
	}
	if actionHasPassiveRouting(action) {
		return nil
	}
	if scope != "bulk" {
		if _, ok := passivePanelActionNames[actionName]; ok {
			return nil
		}
	}
	if actionName == strings.ToLower(CreateTranslationKey) {
		return nil
	}
	if panel.workflow != nil {
		if workflowActionIsResolvable(panel, actionName) {
			return nil
		}
		if _, ok := workflowActionNames[actionName]; ok {
			return panelActionIssue(panelName, scope, action, "workflow_transition_not_registered")
		}
		return nil
	}
	if _, ok := workflowActionNames[actionName]; ok {
		return panelActionIssue(panelName, scope, action, "workflow_not_configured_for_action")
	}
	if scope == "bulk" {
		return panelActionIssue(panelName, scope, action, "bulk_action_missing_command")
	}
	return panelActionIssue(panelName, scope, action, "action_missing_command")
}

func actionHasPassiveRouting(action Action) bool {
	if strings.TrimSpace(action.Href) != "" {
		return true
	}
	switch strings.ToLower(strings.TrimSpace(action.Type)) {
	case "link", "url", "navigation", "route":
		return true
	default:
		return false
	}
}

func workflowActionIsResolvable(panel *Panel, actionName string) bool {
	if panel == nil || panel.workflow == nil {
		return false
	}
	candidates := workflowTransitionCandidates(actionName)
	transitions, ok := workflowTransitionNames(panel.workflow, panel.name)
	if !ok {
		// Unknown workflow engine type; avoid false positives and allow runtime handling.
		return true
	}
	for _, candidate := range candidates {
		if _, exists := transitions[strings.ToLower(strings.TrimSpace(candidate))]; exists {
			return true
		}
	}
	return false
}

func workflowTransitionNames(engine WorkflowEngine, panelName string) (map[string]struct{}, bool) {
	switch typed := engine.(type) {
	case *SimpleWorkflowEngine:
		return simpleWorkflowTransitionNames(typed, panelName), true
	case workflowAlias:
		return aliasWorkflowTransitionNames(typed), true
	case *workflowAlias:
		if typed == nil {
			return map[string]struct{}{}, true
		}
		return aliasWorkflowTransitionNames(*typed), true
	default:
		return nil, false
	}
}

func aliasWorkflowTransitionNames(alias workflowAlias) map[string]struct{} {
	entityType := strings.TrimSpace(alias.entityType)
	if entityType == "" {
		return map[string]struct{}{}
	}
	switch typed := alias.engine.(type) {
	case *SimpleWorkflowEngine:
		return simpleWorkflowTransitionNames(typed, entityType)
	default:
		return map[string]struct{}{}
	}
}

func simpleWorkflowTransitionNames(engine *SimpleWorkflowEngine, entityType string) map[string]struct{} {
	names := map[string]struct{}{}
	if engine == nil {
		return names
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return names
	}
	definition, ok := engine.definitions[entityType]
	if !ok {
		return names
	}
	for _, transition := range definition.Transitions {
		name := strings.ToLower(strings.TrimSpace(transition.Name))
		if name == "" {
			continue
		}
		names[name] = struct{}{}
	}
	return names
}

func panelActionIssue(panelName, scope string, action Action, reason string) map[string]any {
	return map[string]any{
		"panel":        strings.TrimSpace(panelName),
		"scope":        strings.TrimSpace(scope),
		"action":       strings.TrimSpace(action.Name),
		"command_name": strings.TrimSpace(action.CommandName),
		"reason":       strings.TrimSpace(reason),
	}
}
