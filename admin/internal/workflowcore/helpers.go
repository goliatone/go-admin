package workflowcore

import (
	"strconv"
	"strings"
)

func WorkflowBindingConflictKey(binding WorkflowBinding) string {
	return strings.Join([]string{
		strings.ToLower(strings.TrimSpace(string(binding.ScopeType))),
		strings.ToLower(strings.TrimSpace(binding.ScopeRef)),
		strings.ToLower(strings.TrimSpace(binding.Environment)),
		strconv.Itoa(binding.Priority),
	}, "::")
}

func NormalizePersistedWorkflow(in PersistedWorkflow) PersistedWorkflow {
	in.ID = strings.TrimSpace(in.ID)
	in.MachineID = strings.TrimSpace(in.MachineID)
	in.MachineVersion = strings.TrimSpace(in.MachineVersion)
	in.Name = strings.TrimSpace(in.Name)
	in.Environment = strings.TrimSpace(strings.ToLower(in.Environment))
	in.Status = PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(string(in.Status))))
	in.Definition = CloneWorkflowDefinition(in.Definition)
	in.Definition.EntityType = strings.TrimSpace(in.Definition.EntityType)
	in.Definition.MachineVersion = strings.TrimSpace(in.Definition.MachineVersion)
	if in.MachineID == "" {
		in.MachineID = strings.TrimSpace(in.Definition.EntityType)
	}
	if in.MachineID == "" {
		in.MachineID = strings.TrimSpace(in.ID)
	}
	if in.MachineID == "" {
		in.MachineID = in.ID
	}
	if in.MachineID != "" {
		in.Definition.EntityType = in.MachineID
	}
	if in.MachineVersion == "" {
		in.MachineVersion = strings.TrimSpace(in.Definition.MachineVersion)
	}
	if in.MachineVersion == "" && in.Version > 0 {
		in.MachineVersion = strconv.Itoa(in.Version)
	}
	if in.MachineVersion == "" {
		in.MachineVersion = "1"
	}
	in.Definition.MachineVersion = in.MachineVersion
	in.Definition.InitialState = strings.TrimSpace(in.Definition.InitialState)
	for i := range in.Definition.Transitions {
		in.Definition.Transitions[i].Name = strings.TrimSpace(in.Definition.Transitions[i].Name)
		in.Definition.Transitions[i].Description = strings.TrimSpace(in.Definition.Transitions[i].Description)
		in.Definition.Transitions[i].From = strings.TrimSpace(in.Definition.Transitions[i].From)
		in.Definition.Transitions[i].To = strings.TrimSpace(in.Definition.Transitions[i].To)
		in.Definition.Transitions[i].Guard = strings.TrimSpace(in.Definition.Transitions[i].Guard)
		in.Definition.Transitions[i].DynamicTo = strings.TrimSpace(in.Definition.Transitions[i].DynamicTo)
	}
	return in
}

func NormalizeWorkflowBinding(in WorkflowBinding) WorkflowBinding {
	in.ID = strings.TrimSpace(in.ID)
	in.ScopeType = WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(string(in.ScopeType))))
	in.ScopeRef = strings.ToLower(strings.TrimSpace(in.ScopeRef))
	in.WorkflowID = strings.TrimSpace(in.WorkflowID)
	in.Environment = strings.TrimSpace(strings.ToLower(in.Environment))
	in.Status = WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(string(in.Status))))
	if in.Priority == 0 {
		in.Priority = 100
	}
	if in.ScopeType == WorkflowBindingScopeGlobal && in.ScopeRef == "" {
		in.ScopeRef = "global"
	}
	return in
}

func ClonePersistedWorkflow(in PersistedWorkflow) PersistedWorkflow {
	copy := in
	copy.Definition = CloneWorkflowDefinition(in.Definition)
	return copy
}

func CloneWorkflowDefinition(in WorkflowDefinition) WorkflowDefinition {
	copy := in
	copy.Transitions = append(copy.Transitions[:0:0], in.Transitions...)
	return copy
}

func CloneWorkflowBinding(in WorkflowBinding) WorkflowBinding {
	return in
}

func SortWorkflowBindingsForResolution(bindings []WorkflowBinding) {
	if len(bindings) <= 1 {
		return
	}
	for i := 0; i < len(bindings)-1; i++ {
		for j := i + 1; j < len(bindings); j++ {
			left := bindings[i]
			right := bindings[j]
			leftEnv := strings.TrimSpace(left.Environment)
			rightEnv := strings.TrimSpace(right.Environment)
			if (leftEnv == "") != (rightEnv == "") {
				if leftEnv == "" {
					bindings[i], bindings[j] = bindings[j], bindings[i]
				}
				continue
			}
			switch {
			case left.Priority != right.Priority:
				if right.Priority < left.Priority {
					bindings[i], bindings[j] = bindings[j], bindings[i]
				}
			case left.ScopeType != right.ScopeType:
				if right.ScopeType < left.ScopeType {
					bindings[i], bindings[j] = bindings[j], bindings[i]
				}
			case left.ScopeRef != right.ScopeRef:
				if right.ScopeRef < left.ScopeRef {
					bindings[i], bindings[j] = bindings[j], bindings[i]
				}
			case right.ID < left.ID:
				bindings[i], bindings[j] = bindings[j], bindings[i]
			}
		}
	}
}

func BindingCandidates(bindings []WorkflowBinding, scopeType WorkflowBindingScopeType, scopeRef string, environment string) []WorkflowBinding {
	scopeRef = strings.ToLower(strings.TrimSpace(scopeRef))
	environment = strings.ToLower(strings.TrimSpace(environment))

	out := make([]WorkflowBinding, 0, len(bindings))
	for _, binding := range bindings {
		if binding.ScopeType != scopeType {
			continue
		}
		if scopeType == WorkflowBindingScopeGlobal {
			if !BindingMatchesEnvironment(binding, environment) {
				continue
			}
			out = append(out, binding)
			continue
		}
		if strings.ToLower(strings.TrimSpace(binding.ScopeRef)) != scopeRef {
			continue
		}
		if !BindingMatchesEnvironment(binding, environment) {
			continue
		}
		out = append(out, binding)
	}
	return out
}

func BindingMatchesEnvironment(binding WorkflowBinding, environment string) bool {
	bindingEnv := strings.ToLower(strings.TrimSpace(binding.Environment))
	if bindingEnv == "" {
		return true
	}
	if environment == "" {
		return false
	}
	return bindingEnv == environment
}

func BindingResolutionFrom(binding WorkflowBinding, workflow PersistedWorkflow, source string) WorkflowBindingResolution {
	return WorkflowBindingResolution{
		WorkflowID:      binding.WorkflowID,
		WorkflowVersion: workflow.Version,
		MachineID:       CanonicalMachineIDForWorkflow(workflow),
		MachineVersion:  CanonicalMachineVersionForWorkflow(workflow),
		Source:          source,
		BindingID:       binding.ID,
		ScopeType:       binding.ScopeType,
		ScopeRef:        binding.ScopeRef,
		Priority:        binding.Priority,
		Environment:     binding.Environment,
	}
}

func CanonicalMachineIDForWorkflow(workflow PersistedWorkflow) string {
	machineID := strings.TrimSpace(workflow.MachineID)
	if machineID != "" {
		return machineID
	}
	if machineID = strings.TrimSpace(workflow.Definition.EntityType); machineID != "" {
		return machineID
	}
	return strings.TrimSpace(workflow.ID)
}

func CanonicalMachineVersionForWorkflow(workflow PersistedWorkflow) string {
	machineVersion := strings.TrimSpace(workflow.MachineVersion)
	if machineVersion != "" {
		return machineVersion
	}
	if machineVersion = strings.TrimSpace(workflow.Definition.MachineVersion); machineVersion != "" {
		return machineVersion
	}
	if workflow.Version > 0 {
		return strconv.Itoa(workflow.Version)
	}
	return "1"
}

func NormalizeBindingTraits(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}
	out := make([]string, 0, len(raw))
	seen := map[string]struct{}{}
	for _, trait := range raw {
		normalized := strings.ToLower(strings.TrimSpace(trait))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
