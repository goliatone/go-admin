package admin

import (
	"context"
	"strings"
)

func buildWorkflowApplyRequest(
	ctx context.Context,
	machineID string,
	entityID string,
	currentState string,
	targetState string,
	payload map[string]any,
) WorkflowApplyEventRequest {
	entityID = strings.TrimSpace(entityID)
	machineID = strings.TrimSpace(machineID)
	currentState = normalizeWorkflowState(currentState)
	targetState = normalizeWorkflowState(targetState)
	metadata := workflowTransitionMetadata(ctx, machineID, entityID, currentState, targetState, payload)
	return WorkflowApplyEventRequest{
		MachineID:     machineID,
		EntityID:      entityID,
		ExecCtx:       workflowExecutionContextFromContext(ctx),
		ExpectedState: currentState,
		Msg: WorkflowMessage{
			EntityID:     entityID,
			EntityType:   machineID,
			CurrentState: currentState,
			TargetState:  targetState,
			Payload:      cloneWorkflowTransitionMetadata(payload),
		},
		IdempotencyKey: workflowIdempotencyKey(payload),
		Metadata:       metadata,
		DryRun:         workflowDryRun(payload),
		ExpectedVersion: atoiDefault(
			toString(firstNonEmptyAny(payload, "expected_version", "expectedVersion", "version")),
			0,
		),
	}
}

func workflowSnapshotTransitions(
	ctx context.Context,
	engine WorkflowEngine,
	machineID string,
	entityID string,
	currentState string,
	payload map[string]any,
	includeBlocked bool,
) ([]WorkflowTransitionInfo, error) {
	if engine == nil {
		return nil, nil
	}
	entityID = strings.TrimSpace(entityID)
	snapshot, err := engine.Snapshot(ctx, WorkflowSnapshotRequest{
		MachineID: machineID,
		EntityID:  entityID,
		Msg: WorkflowMessage{
			EntityID:     entityID,
			EntityType:   machineID,
			CurrentState: normalizeWorkflowState(currentState),
			Payload:      cloneWorkflowTransitionMetadata(payload),
		},
		ExecCtx:        workflowExecutionContextFromContext(ctx),
		EvaluateGuards: true,
		IncludeBlocked: includeBlocked,
	})
	if err != nil {
		return nil, err
	}
	if snapshot == nil || len(snapshot.AllowedTransitions) == 0 {
		return []WorkflowTransitionInfo{}, nil
	}
	out := make([]WorkflowTransitionInfo, 0, len(snapshot.AllowedTransitions))
	out = append(out, snapshot.AllowedTransitions...)
	return out, nil
}

func workflowEventForTargetState(snapshot *WorkflowSnapshot, targetState string) string {
	if snapshot == nil {
		return ""
	}
	targetState = normalizeWorkflowState(targetState)
	if targetState == "" {
		return ""
	}
	for _, transition := range snapshot.AllowedTransitions {
		if !transition.Allowed {
			continue
		}
		if workflowTransitionTargetState(transition) == targetState {
			return strings.TrimSpace(transition.Event)
		}
	}
	for _, transition := range snapshot.AllowedTransitions {
		if workflowTransitionTargetState(transition) == targetState {
			return strings.TrimSpace(transition.Event)
		}
	}
	return ""
}

func workflowTransitionTargetState(transition WorkflowTransitionInfo) string {
	if value := normalizeWorkflowState(transition.Target.ResolvedTo); value != "" {
		return value
	}
	return normalizeWorkflowState(transition.Target.To)
}

func workflowCurrentStateFromResponse(response *WorkflowApplyEventResponse) string {
	if response == nil {
		return ""
	}
	if response.Transition != nil {
		if state := normalizeWorkflowState(response.Transition.CurrentState); state != "" {
			return state
		}
	}
	if response.Snapshot != nil {
		return normalizeWorkflowState(response.Snapshot.CurrentState)
	}
	return ""
}

func containsTransitionEvent(values []string, event string) bool {
	event = normalizeWorkflowEvent(event)
	for _, value := range values {
		if normalizeWorkflowEvent(value) == event {
			return true
		}
	}
	return false
}

func workflowExecutionContextFromContext(ctx context.Context) WorkflowExecutionContext {
	return WorkflowExecutionContext{
		ActorID: strings.TrimSpace(userIDFromContext(ctx)),
		Tenant:  strings.TrimSpace(tenantIDFromContext(ctx)),
	}
}

func workflowTransitionMetadata(
	ctx context.Context,
	machineID string,
	entityID string,
	currentState string,
	targetState string,
	payload map[string]any,
) map[string]any {
	metadata := cloneWorkflowTransitionMetadata(payload)
	if metadata == nil {
		metadata = map[string]any{}
	}
	if machineID = strings.TrimSpace(machineID); machineID != "" {
		metadata["machine_id"] = machineID
	}
	if entityID = strings.TrimSpace(entityID); entityID != "" {
		metadata["entity_id"] = entityID
	}
	if currentState = normalizeWorkflowState(currentState); currentState != "" {
		metadata["current_state"] = currentState
	}
	if targetState = normalizeWorkflowState(targetState); targetState != "" {
		metadata["target_state"] = targetState
	}
	if actorID := strings.TrimSpace(userIDFromContext(ctx)); actorID != "" && strings.TrimSpace(toString(metadata["actor_id"])) == "" {
		metadata["actor_id"] = actorID
	}
	if actorID := strings.TrimSpace(userIDFromContext(ctx)); actorID != "" && strings.TrimSpace(toString(metadata["actorId"])) == "" {
		metadata["actorId"] = actorID
	}
	if tenantID := strings.TrimSpace(tenantIDFromContext(ctx)); tenantID != "" && strings.TrimSpace(toString(metadata["tenant"])) == "" {
		metadata["tenant"] = tenantID
	}
	requestID := strings.TrimSpace(toString(firstNonEmptyAny(payload, "request_id", "requestId")))
	if requestID == "" {
		requestID = strings.TrimSpace(requestIDFromContext(ctx))
	}
	if requestID != "" {
		metadata["request_id"] = requestID
		if strings.TrimSpace(toString(metadata["requestId"])) == "" {
			metadata["requestId"] = requestID
		}
	}
	correlationID := strings.TrimSpace(toString(firstNonEmptyAny(payload, "correlation_id", "correlationId")))
	if correlationID == "" {
		correlationID = strings.TrimSpace(correlationIDFromContext(ctx))
	}
	if correlationID != "" {
		metadata["correlation_id"] = correlationID
		if strings.TrimSpace(toString(metadata["correlationId"])) == "" {
			metadata["correlationId"] = correlationID
		}
	}
	return metadata
}

func workflowDryRun(payload map[string]any) bool {
	return toBool(firstNonEmptyAny(payload, "dry_run", "dryRun", "workflow_dry_run", "_workflow_dry_run"))
}

func workflowIdempotencyKey(payload map[string]any) string {
	return strings.TrimSpace(toString(firstNonEmptyAny(payload, "idempotency_key", "idempotencyKey", "_idempotency_key", "_idempotencyKey")))
}

func firstNonEmptyAny(payload map[string]any, keys ...string) any {
	if len(payload) == 0 || len(keys) == 0 {
		return nil
	}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}
		if strings.TrimSpace(toString(value)) == "" {
			continue
		}
		return value
	}
	return nil
}
