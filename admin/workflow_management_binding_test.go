package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestWorkflowManagementBindingWorkflowCRUDAndRollback(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		Workflow:        NewSimpleWorkflowEngine(),
		WorkflowRuntime: runtime,
	})
	binding := newWorkflowManagementBinding(adm)
	require.NotNil(t, binding)

	createCtx := router.NewMockContext()
	createCtx.On("Context").Return(context.Background())
	createdPayload, err := binding.CreateWorkflow(createCtx, map[string]any{
		"id":     "editorial.default",
		"name":   "Editorial Default",
		"status": "active",
		"definition": map[string]any{
			"initial_state": "draft",
			"transitions": []any{
				map[string]any{
					"name": "publish",
					"from": "draft",
					"to":   "published",
				},
			},
		},
	})
	require.NoError(t, err)
	created := createdPayload["workflow"].(PersistedWorkflow)
	require.Equal(t, "editorial.default", created.ID)
	require.Equal(t, 1, created.Version)

	listCtx := router.NewMockContext()
	listCtx.On("Context").Return(context.Background())
	listCtx.On("Query", "status").Return("")
	listCtx.On("Query", "environment").Return("")
	listPayload, err := binding.ListWorkflows(listCtx)
	require.NoError(t, err)
	require.Equal(t, 1, listPayload["total"])

	updateCtx := router.NewMockContext()
	updateCtx.On("Context").Return(context.Background())
	updatedPayload, err := binding.UpdateWorkflow(updateCtx, created.ID, map[string]any{
		"name":             "Editorial Default v2",
		"expected_version": created.Version,
	})
	require.NoError(t, err)
	updated := updatedPayload["workflow"].(PersistedWorkflow)
	require.Equal(t, "Editorial Default v2", updated.Name)
	require.Equal(t, 2, updated.Version)

	rollbackCtx := router.NewMockContext()
	rollbackCtx.On("Context").Return(context.Background())
	rolledBackPayload, err := binding.UpdateWorkflow(rollbackCtx, created.ID, map[string]any{
		"rollback_to_version": 1,
		"expected_version":    updated.Version,
	})
	require.NoError(t, err)
	rolledBack := rolledBackPayload["workflow"].(PersistedWorkflow)
	require.Equal(t, "Editorial Default", rolledBack.Name)
	require.Equal(t, 3, rolledBack.Version)
}

func TestWorkflowManagementBindingBindingCRUDAndValidation(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		Workflow:        NewSimpleWorkflowEngine(),
		WorkflowRuntime: runtime,
	})
	binding := newWorkflowManagementBinding(adm)
	require.NotNil(t, binding)

	createWorkflowCtx := router.NewMockContext()
	createWorkflowCtx.On("Context").Return(context.Background())
	_, err := binding.CreateWorkflow(createWorkflowCtx, map[string]any{
		"id":     "editorial.default",
		"name":   "Editorial Default",
		"status": "active",
		"definition": map[string]any{
			"initial_state": "draft",
			"transitions": []any{
				map[string]any{
					"name": "publish",
					"from": "draft",
					"to":   "published",
				},
			},
		},
	})
	require.NoError(t, err)

	createBindingCtx := router.NewMockContext()
	createBindingCtx.On("Context").Return(context.Background())
	createdPayload, err := binding.CreateBinding(createBindingCtx, map[string]any{
		"scope_type":  "trait",
		"scope_ref":   "editorial",
		"workflow_id": "editorial.default",
		"priority":    10,
		"status":      "active",
	})
	require.NoError(t, err)
	created := createdPayload["binding"].(WorkflowBinding)
	require.Equal(t, "editorial.default", created.WorkflowID)
	require.Equal(t, 1, created.Version)

	updateBindingCtx := router.NewMockContext()
	updateBindingCtx.On("Context").Return(context.Background())
	updatedPayload, err := binding.UpdateBinding(updateBindingCtx, created.ID, map[string]any{
		"priority":         5,
		"expected_version": created.Version,
	})
	require.NoError(t, err)
	updated := updatedPayload["binding"].(WorkflowBinding)
	require.Equal(t, 5, updated.Priority)
	require.Equal(t, 2, updated.Version)

	listBindingsCtx := router.NewMockContext()
	listBindingsCtx.On("Context").Return(context.Background())
	listBindingsCtx.On("Query", "scope_type").Return("")
	listBindingsCtx.On("Query", "scope_ref").Return("")
	listBindingsCtx.On("Query", "environment").Return("")
	listBindingsCtx.On("Query", "status").Return("")
	listPayload, err := binding.ListBindings(listBindingsCtx)
	require.NoError(t, err)
	require.Equal(t, 1, listPayload["total"])

	deleteBindingCtx := router.NewMockContext()
	deleteBindingCtx.On("Context").Return(context.Background())
	require.NoError(t, binding.DeleteBinding(deleteBindingCtx, created.ID))

	invalidCtx := router.NewMockContext()
	invalidCtx.On("Context").Return(context.Background())
	_, err = binding.CreateBinding(invalidCtx, map[string]any{
		"scope_type":  "trait",
		"scope_ref":   "editorial",
		"workflow_id": "missing.workflow",
		"priority":    10,
		"status":      "active",
	})
	require.Error(t, err)
	validationErr, ok := err.(WorkflowValidationErrors)
	require.True(t, ok)
	require.NotEmpty(t, validationErr.Fields["workflow_id"])
}
