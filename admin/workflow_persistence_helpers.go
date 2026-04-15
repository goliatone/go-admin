package admin

import workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"

func normalizeWorkflowBinding(in WorkflowBinding) WorkflowBinding {
	return workflowcore.NormalizeWorkflowBinding(in)
}
