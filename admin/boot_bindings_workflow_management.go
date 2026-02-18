package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
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
	status := PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(c.Query("status"))))
	environment := strings.TrimSpace(c.Query("environment"))
	workflows, total, err := w.admin.workflowRuntime.ListWorkflows(adminCtx.Context, PersistedWorkflowListOptions{
		Status:      status,
		Environment: environment,
	})
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
	workflow := workflowFromPayload("", body)
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
	rollbackVersion := atoiDefault(toString(body["rollback_to_version"]), 0)
	expectedVersion := atoiDefault(primitives.FirstNonEmptyRaw(toString(body["expected_version"]), toString(body["expectedVersion"]), toString(body["version"])), 0)
	if rollbackVersion > 0 {
		restored, err := w.admin.workflowRuntime.RollbackWorkflow(adminCtx.Context, id, rollbackVersion, expectedVersion)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"workflow": restored,
		}, nil
	}
	updated, err := w.admin.workflowRuntime.UpdateWorkflow(adminCtx.Context, workflowFromPayload(id, body), expectedVersion)
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
	scopeType := WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(c.Query("scope_type"))))
	scopeRef := strings.TrimSpace(c.Query("scope_ref"))
	environment := strings.TrimSpace(c.Query("environment"))
	status := WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(c.Query("status"))))
	bindings, total, err := w.admin.workflowRuntime.ListBindings(adminCtx.Context, WorkflowBindingListOptions{
		ScopeType:   scopeType,
		ScopeRef:    scopeRef,
		Environment: environment,
		Status:      status,
	})
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
	created, err := w.admin.workflowRuntime.CreateBinding(adminCtx.Context, workflowBindingFromPayload("", body))
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
	expectedVersion := atoiDefault(primitives.FirstNonEmptyRaw(toString(body["expected_version"]), toString(body["expectedVersion"]), toString(body["version"])), 0)
	updated, err := w.admin.workflowRuntime.UpdateBinding(adminCtx.Context, workflowBindingFromPayload(id, body), expectedVersion)
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

func workflowFromPayload(id string, body map[string]any) PersistedWorkflow {
	workflow := PersistedWorkflow{
		ID:          strings.TrimSpace(primitives.FirstNonEmptyRaw(id, toString(body["id"]))),
		Name:        strings.TrimSpace(toString(body["name"])),
		Status:      PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["environment"]), toString(body["env"]))),
		Version:     atoiDefault(toString(body["version"]), 0),
	}
	workflow.Definition = workflowDefinitionFromPayload(body)
	return workflow
}

func workflowDefinitionFromPayload(body map[string]any) WorkflowDefinition {
	rawDef, ok := body["definition"].(map[string]any)
	if !ok || rawDef == nil {
		return WorkflowDefinition{}
	}
	def := WorkflowDefinition{
		InitialState: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(rawDef["initial_state"]), toString(rawDef["initialState"]))),
	}
	if rawTransitions, ok := rawDef["transitions"].([]any); ok {
		for _, raw := range rawTransitions {
			item, ok := raw.(map[string]any)
			if !ok || item == nil {
				continue
			}
			def.Transitions = append(def.Transitions, WorkflowTransition{
				Name:        strings.TrimSpace(toString(item["name"])),
				Description: strings.TrimSpace(toString(item["description"])),
				From:        strings.TrimSpace(toString(item["from"])),
				To:          strings.TrimSpace(toString(item["to"])),
			})
		}
	}
	return def
}

func workflowBindingFromPayload(id string, body map[string]any) WorkflowBinding {
	return WorkflowBinding{
		ID:          strings.TrimSpace(primitives.FirstNonEmptyRaw(id, toString(body["id"]))),
		ScopeType:   WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["scope_type"]), toString(body["scopeType"]))))),
		ScopeRef:    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["scope_ref"]), toString(body["scopeRef"]))),
		WorkflowID:  strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["workflow_id"]), toString(body["workflowId"]))),
		Priority:    atoiDefault(toString(body["priority"]), 0),
		Status:      WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment: strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["environment"]), toString(body["env"]))),
		Version:     atoiDefault(toString(body["version"]), 0),
	}
}
