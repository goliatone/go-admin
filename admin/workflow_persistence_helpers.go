package admin

import workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"

func normalizePersistedWorkflow(in PersistedWorkflow) PersistedWorkflow {
	return workflowcore.NormalizePersistedWorkflow(in)
}

func clonePersistedWorkflow(in PersistedWorkflow) PersistedWorkflow {
	return workflowcore.ClonePersistedWorkflow(in)
}

func cloneWorkflowDefinition(in WorkflowDefinition) WorkflowDefinition {
	return workflowcore.CloneWorkflowDefinition(in)
}

func normalizeWorkflowBinding(in WorkflowBinding) WorkflowBinding {
	return workflowcore.NormalizeWorkflowBinding(in)
}

func cloneWorkflowBinding(in WorkflowBinding) WorkflowBinding {
	return workflowcore.CloneWorkflowBinding(in)
}

func canonicalMachineIDForWorkflow(workflow PersistedWorkflow) string {
	return workflowcore.CanonicalMachineIDForWorkflow(workflow)
}

func canonicalMachineVersionForWorkflow(workflow PersistedWorkflow) string {
	return workflowcore.CanonicalMachineVersionForWorkflow(workflow)
}
