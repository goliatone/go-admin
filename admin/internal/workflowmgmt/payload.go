package workflowmgmt

import (
	"strings"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"
	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

func WorkflowListOptionsFromContext(c router.Context) workflowcore.PersistedWorkflowListOptions {
	if c == nil {
		return workflowcore.PersistedWorkflowListOptions{}
	}
	return workflowcore.PersistedWorkflowListOptions{
		Status:      workflowcore.PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(c.Query("status")))),
		Environment: strings.TrimSpace(c.Query("environment")),
	}
}

func WorkflowBindingListOptionsFromContext(c router.Context) workflowcore.WorkflowBindingListOptions {
	if c == nil {
		return workflowcore.WorkflowBindingListOptions{}
	}
	return workflowcore.WorkflowBindingListOptions{
		ScopeType:   workflowcore.WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(c.Query("scope_type")))),
		ScopeRef:    strings.TrimSpace(c.Query("scope_ref")),
		Environment: strings.TrimSpace(c.Query("environment")),
		Status:      workflowcore.WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(c.Query("status")))),
	}
}

func PersistedWorkflowFromPayload(id string, body map[string]any, atoi func(string, int) int, toString func(any) string) workflowcore.PersistedWorkflow {
	workflow := workflowcore.PersistedWorkflow{
		ID:             strings.TrimSpace(primitives.FirstNonEmptyRaw(id, toString(body["id"]))),
		MachineID:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["machine_id"]), toString(body["machineId"]))),
		MachineVersion: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["machine_version"]), toString(body["machineVersion"]))),
		Name:           strings.TrimSpace(toString(body["name"])),
		Status:         workflowcore.PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment:    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["environment"]), toString(body["env"]))),
		Version:        atoi(toString(body["version"]), 0),
	}
	workflow.Definition = workflowDefinitionFromPayload(body, toString)
	return workflow
}

func ExpectedVersionFromPayload(body map[string]any, atoi func(string, int) int, toString func(any) string) int {
	return atoi(primitives.FirstNonEmptyRaw(toString(body["expected_version"]), toString(body["expectedVersion"]), toString(body["version"])), 0)
}

func RollbackVersionFromPayload(body map[string]any, atoi func(string, int) int, toString func(any) string) int {
	return atoi(toString(body["rollback_to_version"]), 0)
}

func WorkflowBindingFromPayload(id string, body map[string]any, atoi func(string, int) int, toString func(any) string) workflowcore.WorkflowBinding {
	return workflowcore.WorkflowBinding{
		ID:          strings.TrimSpace(primitives.FirstNonEmptyRaw(id, toString(body["id"]))),
		ScopeType:   workflowcore.WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["scope_type"]), toString(body["scopeType"]))))),
		ScopeRef:    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["scope_ref"]), toString(body["scopeRef"]))),
		WorkflowID:  strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["workflow_id"]), toString(body["workflowId"]))),
		Priority:    atoi(toString(body["priority"]), 0),
		Status:      workflowcore.WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["environment"]), toString(body["env"]))),
		Version:     atoi(toString(body["version"]), 0),
	}
}

func workflowDefinitionFromPayload(body map[string]any, toString func(any) string) workflowcore.WorkflowDefinition {
	rawDef, ok := body["definition"].(map[string]any)
	if !ok || rawDef == nil {
		return workflowcore.WorkflowDefinition{}
	}
	def := workflowcore.WorkflowDefinition{
		InitialState:   strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(rawDef["initial_state"]), toString(rawDef["initialState"]))),
		MachineVersion: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(rawDef["machine_version"]), toString(rawDef["machineVersion"]))),
	}
	if rawTransitions, ok := rawDef["transitions"].([]any); ok {
		for _, raw := range rawTransitions {
			item, ok := raw.(map[string]any)
			if !ok || item == nil {
				continue
			}
			def.Transitions = append(def.Transitions, cmsboot.WorkflowTransition{
				Name:        strings.TrimSpace(toString(item["name"])),
				Description: strings.TrimSpace(toString(item["description"])),
				From:        strings.TrimSpace(toString(item["from"])),
				To:          strings.TrimSpace(toString(item["to"])),
				Guard:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(item["guard"]), toString(item["guard_ref"]))),
				DynamicTo:   strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(item["dynamic_to"]), toString(item["dynamicTo"]))),
				Metadata:    extractMap(item["metadata"], toString),
			})
		}
	}
	return def
}

func extractMap(raw any, toString func(any) string) map[string]any {
	value, ok := raw.(map[string]any)
	if !ok || value == nil {
		return nil
	}
	out := make(map[string]any, len(value))
	for key, item := range value {
		key = strings.TrimSpace(primitives.FirstNonEmptyRaw(key, toString(key)))
		if key == "" {
			continue
		}
		out[key] = item
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
