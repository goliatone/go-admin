package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-command/flow"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

func TestAdminWorkflowAuthoringRPCRequiresPermission(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm := mustNewAdmin(t, Config{}, Dependencies{
		WorkflowRuntime: runtime,
		Authorizer:      rpcTestAuthorizer{allow: map[string]bool{}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), flow.FSMRPCMethodAuthoringListMachines, &cmdrpc.RequestEnvelope[flow.FSMAuthoringListMachinesRequest]{
		Data: flow.FSMAuthoringListMachinesRequest{},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminWorkflowAuthoringRPCListMachinesAuthorized(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm := mustNewAdmin(t, Config{}, Dependencies{
		WorkflowRuntime: runtime,
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.workflows.read|workflows": true,
		}},
	})
	result, err := adm.RPCServer().Invoke(context.Background(), flow.FSMRPCMethodAuthoringListMachines, &cmdrpc.RequestEnvelope[flow.FSMAuthoringListMachinesRequest]{
		Data: flow.FSMAuthoringListMachinesRequest{},
	})
	if err != nil {
		t.Fatalf("invoke list_machines: %v", err)
	}
	response, ok := result.(cmdrpc.ResponseEnvelope[flow.FSMAuthoringListMachinesResponse])
	if !ok {
		t.Fatalf("unexpected response type %T", result)
	}
	if len(response.Data.Items) != 0 {
		t.Fatalf("expected empty machines list, got %+v", response.Data.Items)
	}
}

func TestAdminWorkflowBindingRPCRequiresPermission(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm := mustNewAdmin(t, Config{}, Dependencies{
		WorkflowRuntime: runtime,
		Authorizer:      rpcTestAuthorizer{allow: map[string]bool{}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodWorkflowBindingsList, &cmdrpc.RequestEnvelope[rpcWorkflowBindingsListRequest]{
		Data: rpcWorkflowBindingsListRequest{},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}
