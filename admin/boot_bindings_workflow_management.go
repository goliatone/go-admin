package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
	workflowmgmt "github.com/goliatone/go-admin/admin/internal/workflowmgmt"
	router "github.com/goliatone/go-router"
)

type workflowManagementBinding struct {
	admin *Admin
}

func newWorkflowManagementBinding(a *Admin) boot.WorkflowManagementBinding {
	if a == nil || a.workflowRuntime == nil {
		return nil
	}
	return &workflowManagementBinding{admin: a}
}

func (w *workflowManagementBinding) ListWorkflows(c router.Context) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsPermission, "workflows"); err != nil {
		return nil, err
	}
	workflows, total, err := w.admin.workflowRuntime.ListWorkflows(adminCtx.Context, workflowmgmt.WorkflowListOptionsFromContext(c))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflows": workflows,
		"total":     total,
	}, nil
}

func (w *workflowManagementBinding) CreateWorkflow(c router.Context, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	workflow := workflowmgmt.PersistedWorkflowFromPayload("", body, atoiDefault, toString)
	created, err := w.admin.workflowRuntime.CreateWorkflow(adminCtx.Context, workflow)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflow": created,
	}, nil
}

func (w *workflowManagementBinding) UpdateWorkflow(c router.Context, id string, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, requiredFieldDomainError("id", nil)
	}
	rollbackVersion := workflowmgmt.RollbackVersionFromPayload(body, atoiDefault, toString)
	expectedVersion := workflowmgmt.ExpectedVersionFromPayload(body, atoiDefault, toString)
	if rollbackVersion > 0 {
		restored, err := w.admin.workflowRuntime.RollbackWorkflow(adminCtx.Context, id, rollbackVersion, expectedVersion)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"workflow": restored,
		}, nil
	}
	updated, err := w.admin.workflowRuntime.UpdateWorkflow(adminCtx.Context, workflowmgmt.PersistedWorkflowFromPayload(id, body, atoiDefault, toString), expectedVersion)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflow": updated,
	}, nil
}

func (w *workflowManagementBinding) ListBindings(c router.Context) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsPermission, "workflows"); err != nil {
		return nil, err
	}
	bindings, total, err := w.admin.workflowRuntime.ListBindings(adminCtx.Context, workflowmgmt.WorkflowBindingListOptionsFromContext(c))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"bindings": bindings,
		"total":    total,
	}, nil
}

func (w *workflowManagementBinding) CreateBinding(c router.Context, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	created, err := w.admin.workflowRuntime.CreateBinding(adminCtx.Context, workflowmgmt.WorkflowBindingFromPayload("", body, atoiDefault, toString))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"binding": created,
	}, nil
}

func (w *workflowManagementBinding) UpdateBinding(c router.Context, id string, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, requiredFieldDomainError("id", nil)
	}
	expectedVersion := workflowmgmt.ExpectedVersionFromPayload(body, atoiDefault, toString)
	updated, err := w.admin.workflowRuntime.UpdateBinding(adminCtx.Context, workflowmgmt.WorkflowBindingFromPayload(id, body, atoiDefault, toString), expectedVersion)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"binding": updated,
	}, nil
}

func (w *workflowManagementBinding) DeleteBinding(c router.Context, id string) error {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return err
	}
	return w.admin.workflowRuntime.DeleteBinding(adminCtx.Context, id)
}
