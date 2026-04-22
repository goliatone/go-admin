package quickstart

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// SeedWorkflowRuntimeFromConfig upserts canonical workflow definitions + bindings into a runtime service.
func SeedWorkflowRuntimeFromConfig(ctx context.Context, runtime admin.WorkflowRuntime, cfg WorkflowConfig) error {
	if runtime == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	cfg = NormalizeWorkflowConfig(cfg)
	if err := ValidateWorkflowConfig(cfg); err != nil {
		return err
	}
	if err := upsertWorkflowDefinitionsFromConfig(ctx, runtime, cfg); err != nil {
		return err
	}
	return upsertWorkflowBindingsFromConfig(ctx, runtime, cfg)
}

func upsertWorkflowDefinitionsFromConfig(ctx context.Context, runtime admin.WorkflowRuntime, cfg WorkflowConfig) error {
	definitions := WorkflowDefinitionsFromConfig(cfg)
	if len(definitions) == 0 {
		return nil
	}
	existing, _, err := runtime.ListWorkflows(ctx, admin.PersistedWorkflowListOptions{})
	if err != nil {
		return err
	}
	known := map[string]struct{}{}
	for _, workflow := range existing {
		known[strings.TrimSpace(workflow.ID)] = struct{}{}
	}
	for _, workflowID := range sortedKeys(definitions) {
		if _, ok := known[workflowID]; ok {
			continue
		}
		definition := definitions[workflowID]
		if _, err := runtime.CreateWorkflow(ctx, admin.PersistedWorkflow{
			ID:             workflowID,
			MachineID:      workflowID,
			MachineVersion: strings.TrimSpace(definition.MachineVersion),
			Name:           workflowID,
			Definition:     definition,
			Status:         admin.WorkflowStatusActive,
		}); err != nil {
			return err
		}
	}
	return nil
}

func upsertWorkflowBindingsFromConfig(ctx context.Context, runtime admin.WorkflowRuntime, cfg WorkflowConfig) error {
	desired := WorkflowBindingsFromConfig(cfg)
	if len(desired) == 0 {
		return nil
	}
	existing, _, err := runtime.ListBindings(ctx, admin.WorkflowBindingListOptions{})
	if err != nil {
		return err
	}
	for _, binding := range desired {
		if hasEquivalentWorkflowBinding(existing, binding) {
			continue
		}
		if _, err := runtime.CreateBinding(ctx, binding); err != nil {
			return err
		}
	}
	return nil
}

func hasEquivalentWorkflowBinding(existing []admin.WorkflowBinding, target admin.WorkflowBinding) bool {
	for _, candidate := range existing {
		if strings.TrimSpace(candidate.ID) != "" && strings.TrimSpace(target.ID) != "" && strings.TrimSpace(candidate.ID) == strings.TrimSpace(target.ID) {
			return true
		}
		if candidate.ScopeType != target.ScopeType {
			continue
		}
		if normalizeLookupKey(candidate.ScopeRef) != normalizeLookupKey(target.ScopeRef) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(candidate.Environment), strings.TrimSpace(target.Environment)) {
			continue
		}
		if candidate.Priority != target.Priority {
			continue
		}
		if candidate.Status != target.Status {
			continue
		}
		if strings.TrimSpace(candidate.WorkflowID) != strings.TrimSpace(target.WorkflowID) {
			continue
		}
		return true
	}
	return false
}
