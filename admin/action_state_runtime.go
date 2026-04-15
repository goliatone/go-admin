package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

type actionStateEvaluationContext struct {
	adminContext   AdminContext
	panelName      string
	panel          *Panel
	scope          ActionScope
	action         Action
	record         map[string]any
	transitions    []WorkflowTransitionInfo
	transitionsErr error
}

func defaultEnabledActionState() ActionState {
	return ActionState{Enabled: true}
}

func (p *panelBinding) withRowActionState(ctx AdminContext, records []map[string]any, actions []Action) ([]map[string]any, error) {
	return p.withScopedActionState(ctx, records, actions, ActionScopeRow)
}

func (p *panelBinding) withScopedActionState(ctx AdminContext, records []map[string]any, actions []Action, scope ActionScope) ([]map[string]any, error) {
	if len(records) == 0 {
		return records, nil
	}
	out := cloneActionStateRecords(records)
	if len(actions) == 0 {
		return out, nil
	}

	workflowTransitionsByRecord, workflowTransitionErrByRecord := p.workflowTransitionsForRecords(ctx, out, actions)
	resolverStates, err := p.resolveBatchActionStates(ctx, out, actions, scope)
	if err != nil {
		return nil, err
	}

	for index, record := range out {
		recordID := strings.TrimSpace(toString(record["id"]))
		state := p.actionStateForRecord(
			ctx,
			record,
			actions,
			scope,
			workflowTransitionsByRecord[recordID],
			workflowTransitionErrByRecord[recordID],
			resolverStates[recordID],
		)
		if len(state) == 0 {
			continue
		}
		out[index]["_action_state"] = actionStatePayloadMap(state)
	}
	return out, nil
}

func (p *panelBinding) actionStateForRecord(
	ctx AdminContext,
	record map[string]any,
	actions []Action,
	scope ActionScope,
	transitions []WorkflowTransitionInfo,
	transitionsErr error,
	resolverStates map[string]ActionState,
) map[string]ActionState {
	if len(record) == 0 || len(actions) == 0 {
		return nil
	}
	out := make(map[string]ActionState, len(actions))
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		evalCtx := actionStateEvaluationContext{
			adminContext:   ctx,
			panelName:      p.name,
			panel:          p.panel,
			scope:          scope,
			action:         action,
			record:         record,
			transitions:    transitions,
			transitionsErr: transitionsErr,
		}

		state := defaultEnabledActionState()
		blockerStage := ""
		applyStage := func(stage string, candidate ActionState, applies bool) {
			if !applies {
				return
			}
			if blockerStage == "" && state.Enabled && !candidate.Enabled {
				blockerStage = stage
			}
			state = mergeActionState(state, candidate, true)
		}
		candidate, applies := p.evaluateBuiltInScopeAndContext(evalCtx)
		applyStage("scope_context", candidate, applies)
		candidate, applies = p.evaluateBuiltInPermission(evalCtx)
		applyStage("permission", candidate, applies)
		candidate, applies = p.evaluateBuiltInWorkflow(evalCtx)
		applyStage("workflow", candidate, applies)
		candidate, applies = p.evaluateBuiltInTranslationReadiness(evalCtx)
		applyStage("translation_readiness", candidate, applies)
		candidate, applies = p.evaluateGuard(evalCtx)
		applyStage("guard", candidate, applies)
		if candidate, ok := resolverStates[name]; ok {
			applyStage("resolver", candidate, true)
		}
		recordID := strings.TrimSpace(toString(record["id"]))
		captureActionDisablementDiagnostic(ctx.Context, p.name, action, scope, recordID, blockerStage, state)
		out[name] = state
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (p *panelBinding) resolveBatchActionStates(
	ctx AdminContext,
	records []map[string]any,
	actions []Action,
	scope ActionScope,
) (map[string]map[string]ActionState, error) {
	if p == nil || p.panel == nil || p.panel.actionStateResolver == nil || len(records) == 0 || len(actions) == 0 {
		return nil, nil
	}
	states, err := p.panel.actionStateResolver(
		ctx,
		cloneActionStateRecords(records),
		append([]Action{}, actions...),
		scope,
	)
	if err != nil {
		recordIDs := make([]string, 0, len(records))
		for _, record := range records {
			if recordID := strings.TrimSpace(toString(record["id"])); recordID != "" {
				recordIDs = append(recordIDs, recordID)
			}
		}
		captureActionResolverErrorDiagnostic(ctx.Context, p.name, scope, actions, recordIDs, err)
		return nil, err
	}
	return states, nil
}

func (p *panelBinding) workflowTransitionsForRecords(
	ctx AdminContext,
	records []map[string]any,
	actions []Action,
) (map[string][]WorkflowTransitionInfo, map[string]error) {
	transitionsByRecord := map[string][]WorkflowTransitionInfo{}
	errByRecord := map[string]error{}
	if p == nil || p.panel == nil || p.panel.workflow == nil || len(records) == 0 || !hasWorkflowBackedAction(actions) {
		return transitionsByRecord, errByRecord
	}
	for _, record := range records {
		recordID := strings.TrimSpace(toString(record["id"]))
		if recordID == "" {
			continue
		}
		if _, seen := transitionsByRecord[recordID]; seen {
			continue
		}
		state := strings.TrimSpace(toString(record["status"]))
		transitions, err := workflowSnapshotTransitions(ctx.Context, p.panel.workflow, p.name, recordID, state, record, true)
		transitionsByRecord[recordID] = append([]WorkflowTransitionInfo{}, transitions...)
		errByRecord[recordID] = err
	}
	return transitionsByRecord, errByRecord
}

func (p *panelBinding) evaluateBuiltInScopeAndContext(evalCtx actionStateEvaluationContext) (ActionState, bool) {
	action := evalCtx.action
	if action.Scope != ActionScopeAny && action.Scope != "" && action.Scope != evalCtx.scope {
		return ActionState{
			Enabled:    false,
			ReasonCode: ActionDisabledReasonCodePreconditionFailed,
			Reason:     fmt.Sprintf("action is not available in %q scope", evalCtx.scope),
		}, true
	}
	if !actionContextRequiredSatisfied(evalCtx.record, action.ContextRequired) {
		return ActionState{
			Enabled:    false,
			ReasonCode: ActionDisabledReasonCodeMissingContext,
			Reason:     "record does not include required context for this action",
		}, true
	}
	return ActionState{}, false
}

func (p *panelBinding) evaluateBuiltInPermission(evalCtx actionStateEvaluationContext) (ActionState, bool) {
	action := evalCtx.action
	required := actionRequiredPermissions(action)
	if len(required) == 0 || p == nil || p.panel == nil || p.panel.authorizer == nil {
		return ActionState{}, false
	}
	if CanAll(p.panel.authorizer, evalCtx.adminContext.Context, p.name, required...) {
		return ActionState{
			Enabled:    true,
			Permission: strings.TrimSpace(required[0]),
		}, true
	}
	missing := actionMissingPermission(p.panel.authorizer, evalCtx.adminContext.Context, p.name, required)
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodePermissionDenied,
		Reason:     "you do not have permission to execute this action",
		Permission: missing,
		Metadata: map[string]any{
			"required_permissions": append([]string{}, required...),
		},
	}, true
}

func (p *panelBinding) evaluateBuiltInWorkflow(evalCtx actionStateEvaluationContext) (ActionState, bool) {
	actionName := strings.ToLower(strings.TrimSpace(evalCtx.action.Name))
	if _, workflowAction := workflowActionNames[actionName]; !workflowAction {
		return ActionState{}, false
	}
	if p == nil || p.panel == nil || p.panel.workflow == nil {
		return ActionState{
			Enabled:    false,
			ReasonCode: ActionDisabledReasonCodeInvalidStatus,
			Reason:     "workflow is not configured for this panel",
		}, true
	}
	recordID := strings.TrimSpace(toString(evalCtx.record["id"]))
	if recordID == "" {
		return ActionState{
			Enabled:    false,
			ReasonCode: ActionDisabledReasonCodeMissingContext,
			Reason:     "record id required to evaluate workflow action",
		}, true
	}
	candidate := ActionState{
		Enabled:              true,
		AvailableTransitions: workflowTransitionNamesList(evalCtx.transitions),
	}
	if evalCtx.transitionsErr != nil {
		candidate.Enabled = false
		candidate.ReasonCode = ActionDisabledReasonCodeInvalidStatus
		candidate.Reason = "workflow transitions are unavailable"
		return candidate, true
	}
	if actionMatchesAvailableWorkflowTransition(actionName, evalCtx.transitions) {
		return candidate, true
	}
	currentState := primitives.FirstNonEmptyRaw(strings.TrimSpace(toString(evalCtx.record["status"])), "unknown")
	candidate.Enabled = false
	candidate.ReasonCode = ActionDisabledReasonCodeInvalidStatus
	candidate.Reason = fmt.Sprintf("transition %q is not available from state %q", evalCtx.action.Name, currentState)
	return candidate, true
}

func (p *panelBinding) evaluateBuiltInTranslationReadiness(evalCtx actionStateEvaluationContext) (ActionState, bool) {
	reason, blocked := translationBlockedActionReason(evalCtx.action.Name, evalCtx.record)
	if !blocked {
		return ActionState{}, false
	}
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodeTranslationMissing,
		Reason:     reason,
	}, true
}

func (p *panelBinding) evaluateGuard(evalCtx actionStateEvaluationContext) (ActionState, bool) {
	if evalCtx.action.Guard == nil {
		return ActionState{}, false
	}
	return evalCtx.action.Guard(ActionGuardContext{
		AdminContext: evalCtx.adminContext,
		Panel:        p.panel,
		Action:       evalCtx.action,
		Record:       primitives.CloneAnyMap(evalCtx.record),
		Scope:        evalCtx.scope,
	}), true
}

func (p *panelBinding) bulkActionState(ctx AdminContext, actions []Action, listOpts ListOptions) (map[string]map[string]any, error) {
	states, err := p.bulkActionStates(ctx, actions, listOpts)
	if err != nil {
		return nil, err
	}
	return actionStatePayloadMap(states), nil
}

func (p *panelBinding) bulkActionStates(ctx AdminContext, actions []Action, listOpts ListOptions) (map[string]ActionState, error) {
	if len(actions) == 0 {
		return nil, nil
	}
	out, blockerStageByAction := p.buildBulkActionStateMap(ctx, actions)
	if p != nil && p.panel != nil && p.panel.bulkActionStateResolver != nil {
		resolved, err := p.panel.bulkActionStateResolver(ctx, append([]Action{}, actions...), cloneListOptions(listOpts))
		if err != nil {
			captureActionResolverErrorDiagnostic(ctx.Context, p.name, ActionScopeBulk, actions, nil, err)
			return nil, err
		}
		mergeResolvedBulkActionStates(actions, resolved, out, blockerStageByAction)
	}

	if len(out) == 0 {
		return nil, nil
	}
	captureBulkActionStateDiagnostics(ctx, p.name, actions, blockerStageByAction, out)
	return out, nil
}

func (p *panelBinding) buildBulkActionStateMap(ctx AdminContext, actions []Action) (map[string]ActionState, map[string]string) {
	out := make(map[string]ActionState, len(actions))
	blockerStageByAction := make(map[string]string, len(actions))
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		out[name], blockerStageByAction[name] = p.evaluateBulkActionState(ctx, action)
	}
	return out, blockerStageByAction
}

func (p *panelBinding) evaluateBulkActionState(ctx AdminContext, action Action) (ActionState, string) {
	state := defaultEnabledActionState()
	blockerStage := ""
	applyStage := func(stage string, candidate ActionState, applies bool) {
		if !applies {
			return
		}
		if blockerStage == "" && state.Enabled && !candidate.Enabled {
			blockerStage = stage
		}
		state = mergeActionState(state, candidate, true)
	}
	scopeState, scopeApplies := bulkActionScopeState(action)
	applyStage("scope", scopeState, scopeApplies)
	permissionState, permissionApplies := p.bulkActionPermissionState(ctx, action)
	applyStage("permission", permissionState, permissionApplies)
	return state, blockerStage
}

func bulkActionScopeState(action Action) (ActionState, bool) {
	if action.Scope == ActionScopeAny || action.Scope == "" || action.Scope == ActionScopeBulk {
		return ActionState{}, false
	}
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodePreconditionFailed,
		Reason:     "action is not available for bulk execution",
	}, true
}

func (p *panelBinding) bulkActionPermissionState(ctx AdminContext, action Action) (ActionState, bool) {
	required := actionRequiredPermissions(action)
	if len(required) == 0 || p == nil || p.panel == nil || p.panel.authorizer == nil {
		return ActionState{}, false
	}
	if CanAll(p.panel.authorizer, ctx.Context, p.name, required...) {
		return ActionState{
			Enabled:    true,
			Permission: strings.TrimSpace(required[0]),
		}, true
	}
	missing := actionMissingPermission(p.panel.authorizer, ctx.Context, p.name, required)
	return ActionState{
		Enabled:    false,
		ReasonCode: ActionDisabledReasonCodePermissionDenied,
		Reason:     "you do not have permission to execute this action",
		Permission: missing,
		Metadata: map[string]any{
			"required_permissions": append([]string{}, required...),
		},
	}, true
}

func mergeResolvedBulkActionStates(actions []Action, resolved map[string]ActionState, out map[string]ActionState, blockerStageByAction map[string]string) {
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		candidate, ok := resolved[name]
		if !ok {
			continue
		}
		if blockerStageByAction[name] == "" && out[name].Enabled && !candidate.Enabled {
			blockerStageByAction[name] = "resolver"
		}
		out[name] = mergeActionState(out[name], candidate, true)
	}
}

func captureBulkActionStateDiagnostics(ctx AdminContext, panelName string, actions []Action, blockerStageByAction map[string]string, out map[string]ActionState) {
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		captureActionDisablementDiagnostic(ctx.Context, panelName, action, ActionScopeBulk, "", blockerStageByAction[name], out[name])
	}
}

func actionMissingPermission(authorizer Authorizer, ctx context.Context, resource string, required []string) string {
	if authorizer == nil {
		for _, permission := range compactPermissions(required...) {
			return permission
		}
		return ""
	}
	for _, permission := range compactPermissions(required...) {
		if !authorizer.Can(ctx, permission, resource) {
			return permission
		}
	}
	return ""
}

func mergeActionState(current ActionState, next ActionState, applies bool) ActionState {
	if !applies {
		return current
	}
	merged := current
	if !current.Enabled && next.Enabled {
		return enrichActionState(merged, next)
	}
	if current.Enabled && !next.Enabled {
		merged.Enabled = false
	}
	return enrichActionState(merged, next)
}

func enrichActionState(current ActionState, next ActionState) ActionState {
	current.ReasonCode = mergeActionStateText(current.ReasonCode, next.ReasonCode)
	current.Reason = mergeActionStateText(current.Reason, next.Reason)
	current.Severity = mergeActionStateText(current.Severity, next.Severity)
	current.Kind = mergeActionStateText(current.Kind, next.Kind)
	current.Permission = mergeActionStateText(current.Permission, next.Permission)
	current.Metadata = mergeActionStateMetadata(current.Metadata, next.Metadata)
	current.Remediation = mergeActionStateRemediation(current.Remediation, next.Remediation)
	current.AvailableTransitions = mergeActionStateTransitions(current.AvailableTransitions, next.AvailableTransitions)
	return current
}

func mergeActionStateText(current, next string) string {
	if strings.TrimSpace(current) != "" {
		return current
	}
	return strings.TrimSpace(next)
}

func mergeActionStateMetadata(current, next map[string]any) map[string]any {
	if len(next) == 0 {
		return current
	}
	if len(current) == 0 {
		return primitives.CloneAnyMap(next)
	}
	for key, value := range next {
		if _, exists := current[key]; exists {
			continue
		}
		current[key] = value
	}
	return current
}

func mergeActionStateRemediation(current, next *ActionRemediation) *ActionRemediation {
	if current != nil || next == nil {
		return current
	}
	return &ActionRemediation{
		Label: strings.TrimSpace(next.Label),
		Href:  strings.TrimSpace(next.Href),
		Kind:  strings.TrimSpace(next.Kind),
	}
}

func mergeActionStateTransitions(current, next []string) []string {
	if len(current) > 0 || len(next) == 0 {
		return current
	}
	return append([]string{}, next...)
}

func actionStatePayloadMap(states map[string]ActionState) map[string]map[string]any {
	if len(states) == 0 {
		return nil
	}
	out := make(map[string]map[string]any, len(states))
	for actionName, state := range states {
		out[actionName] = actionStatePayload(state)
	}
	return out
}

func actionStatePayload(state ActionState) map[string]any {
	payload := map[string]any{
		"enabled": state.Enabled,
	}
	if reasonCode := strings.TrimSpace(state.ReasonCode); reasonCode != "" {
		payload["reason_code"] = reasonCode
	}
	if reason := strings.TrimSpace(state.Reason); reason != "" {
		payload["reason"] = reason
	}
	if severity := strings.TrimSpace(state.Severity); severity != "" {
		payload["severity"] = severity
	}
	if kind := strings.TrimSpace(state.Kind); kind != "" {
		payload["kind"] = kind
	}
	if permission := strings.TrimSpace(state.Permission); permission != "" {
		payload["permission"] = permission
	}
	if len(state.Metadata) > 0 {
		payload["metadata"] = primitives.CloneAnyMap(state.Metadata)
	}
	if state.Remediation != nil {
		remediation := map[string]any{}
		if label := strings.TrimSpace(state.Remediation.Label); label != "" {
			remediation["label"] = label
		}
		if href := strings.TrimSpace(state.Remediation.Href); href != "" {
			remediation["href"] = href
		}
		if kind := strings.TrimSpace(state.Remediation.Kind); kind != "" {
			remediation["kind"] = kind
		}
		if len(remediation) > 0 {
			payload["remediation"] = remediation
		}
	}
	if len(state.AvailableTransitions) > 0 {
		payload["available_transitions"] = append([]string{}, state.AvailableTransitions...)
	}
	return payload
}

func cloneActionStateRecords(records []map[string]any) []map[string]any {
	if len(records) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, primitives.CloneAnyMap(record))
	}
	return out
}

func hasWorkflowBackedAction(actions []Action) bool {
	for _, action := range actions {
		if _, ok := workflowActionNames[strings.ToLower(strings.TrimSpace(action.Name))]; ok {
			return true
		}
	}
	return false
}
