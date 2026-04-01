package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"
	"github.com/goliatone/go-command/flow"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

const (
	RPCMethodWorkflowBindingsList    = "fsm.bindings.list"
	RPCMethodWorkflowBindingsUpsert  = "fsm.bindings.upsert"
	RPCMethodWorkflowBindingsDelete  = "fsm.bindings.delete"
	RPCMethodWorkflowBindingsResolve = "fsm.bindings.resolve"
)

type rpcWorkflowBindingsListRequest struct {
	ScopeType   string `json:"scopeType,omitempty"`
	ScopeRef    string `json:"scopeRef,omitempty"`
	Environment string `json:"environment,omitempty"`
	Status      string `json:"status,omitempty"`
}

type rpcWorkflowBindingsListResponse struct {
	Items []WorkflowBinding `json:"items"`
	Total int               `json:"total"`
}

type rpcWorkflowBindingsUpsertRequest struct {
	Binding         WorkflowBinding `json:"binding"`
	ExpectedVersion int             `json:"expectedVersion,omitempty"`
}

type rpcWorkflowBindingsUpsertResponse struct {
	Binding WorkflowBinding `json:"binding"`
}

type rpcWorkflowBindingsDeleteRequest struct {
	ID string `json:"id"`
}

type rpcWorkflowBindingsDeleteResponse struct {
	ID      string `json:"id"`
	Deleted bool   `json:"deleted"`
}

type rpcWorkflowBindingsResolveRequest struct {
	ContentType string   `json:"contentType,omitempty"`
	Traits      []string `json:"traits,omitempty"`
	Environment string   `json:"environment,omitempty"`
}

type rpcWorkflowBindingsResolveResponse struct {
	Resolution WorkflowBindingResolution `json:"resolution"`
}

func registerWorkflowRPCEndpoints(server *cmdrpc.Server, adm *Admin) error {
	if server == nil || adm == nil {
		return nil
	}

	authoring := resolveFSMAuthoringService(adm)
	endpoints := []cmdrpc.EndpointDefinition{
		workflowAuthoringListMachinesEndpoint(adm, authoring),
		workflowAuthoringGetMachineEndpoint(adm, authoring),
		workflowAuthoringSaveDraftEndpoint(adm, authoring),
		workflowAuthoringValidateEndpoint(adm, authoring),
		workflowAuthoringPublishEndpoint(adm, authoring),
		workflowAuthoringDeleteEndpoint(adm, authoring),
		workflowAuthoringExportUnavailableEndpoint(adm),
		workflowAuthoringListVersionsEndpoint(adm),
		workflowAuthoringGetVersionEndpoint(adm),
		workflowAuthoringDiffVersionsEndpoint(adm),
		workflowBindingsListEndpoint(adm),
		workflowBindingsUpsertEndpoint(adm),
		workflowBindingsDeleteEndpoint(adm),
		workflowBindingsResolveEndpoint(adm),
	}
	for _, endpoint := range endpoints {
		if endpoint == nil {
			continue
		}
		method := strings.TrimSpace(endpoint.Spec().Method)
		if method == "" || hasRPCEndpoint(server, method) {
			continue
		}
		if err := server.RegisterEndpoint(endpoint); err != nil {
			return err
		}
	}
	return nil
}

func workflowAuthoringListMachinesEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringListMachinesRequest, flow.FSMAuthoringListMachinesResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringListMachines,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringListMachinesRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringListMachinesResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListMachinesResponse]{}, err
			}
			out, err := service.ListMachines(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListMachinesResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListMachinesResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringGetMachineEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringGetMachineRequest, flow.FSMAuthoringGetMachineResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringGetMachine,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringGetMachineRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetMachineResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetMachineResponse]{}, err
			}
			out, err := service.GetMachine(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetMachineResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetMachineResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringSaveDraftEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringSaveDraftRequest, flow.FSMAuthoringSaveDraftResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringSaveDraft,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.workflows.write"},
			Tags:        []string{"fsm", "authoring"},
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringSaveDraftRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringSaveDraftResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.write", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringSaveDraftResponse]{}, err
			}
			out, err := service.SaveDraft(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringSaveDraftResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringSaveDraftResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringValidateEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringValidateRequest, flow.FSMAuthoringValidateResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringValidate,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringValidateRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringValidateResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringValidateResponse]{}, err
			}
			out, err := service.Validate(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringValidateResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringValidateResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringPublishEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringPublishRequest, flow.FSMAuthoringPublishResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringPublish,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.workflows.write"},
			Tags:        []string{"fsm", "authoring"},
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringPublishRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringPublishResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.write", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringPublishResponse]{}, err
			}
			out, err := service.Publish(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringPublishResponse]{}, err
			}
			if syncErr := syncPublishedMachineToRuntime(ctx, adm, out.MachineID); syncErr != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringPublishResponse]{}, syncErr
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringPublishResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringDeleteEndpoint(adm *Admin, service *flow.AuthoringService) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringDeleteMachineRequest, flow.FSMAuthoringDeleteMachineResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringDeleteMachine,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.workflows.write"},
			Tags:        []string{"fsm", "authoring"},
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringDeleteMachineRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringDeleteMachineResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.write", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDeleteMachineResponse]{}, err
			}
			out, err := service.DeleteMachine(ctx, req.Data)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDeleteMachineResponse]{}, err
			}
			if syncErr := syncDeletedMachineToRuntime(ctx, adm, out.MachineID); syncErr != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDeleteMachineResponse]{}, syncErr
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDeleteMachineResponse]{Data: out}, nil
		},
	)
}

func workflowAuthoringExportUnavailableEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringExportRequest, flow.FSMAuthoringExportResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringExport,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringExportRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringExportResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringExportResponse]{}, err
			}
			metadata := map[string]any{
				"method": flow.FSMRPCMethodAuthoringExport,
			}
			if machineID := strings.TrimSpace(req.Data.MachineID); machineID != "" {
				metadata["machineId"] = machineID
			}
			if format := strings.TrimSpace(req.Data.Format); format != "" {
				metadata["format"] = format
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringExportResponse]{}, workflowRuntimeError(
				flow.ErrPreconditionFailed,
				"authoring export capability unavailable",
				nil,
				metadata,
			)
		},
	)
}

func workflowAuthoringListVersionsEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringListVersionsRequest, flow.FSMAuthoringListVersionsResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringListVersions,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringListVersionsRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse]{}, err
			}
			store := workflowAuthoringVersionStore(adm)
			if store == nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse]{}, serviceNotConfiguredDomainError("workflow authoring version store", nil)
			}

			machineID := strings.TrimSpace(req.Data.MachineID)
			if machineID == "" {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse]{}, requiredFieldDomainError("machineId", nil)
			}
			limit := 20
			if req.Data.Limit != nil && *req.Data.Limit > 0 {
				limit = *req.Data.Limit
			}
			offset := parseCursorOffset(req.Data.Cursor)
			records, hasMore, err := store.ListVersions(ctx, machineID, limit, offset)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse]{}, err
			}
			items := make([]flow.FSMAuthoringVersionSummary, 0, len(records))
			for _, record := range records {
				publishedAt := ""
				if record.PublishedAt != nil {
					publishedAt = record.PublishedAt.UTC().Format(time.RFC3339)
				}
				items = append(items, flow.FSMAuthoringVersionSummary{
					Version:     strings.TrimSpace(record.Version),
					ETag:        strings.TrimSpace(record.ETag),
					UpdatedAt:   record.UpdatedAt.UTC().Format(time.RFC3339),
					PublishedAt: publishedAt,
					IsDraft:     record.PublishedDefinition == nil || record.DeletedAt != nil,
				})
			}
			nextCursor := ""
			if hasMore {
				nextCursor = strconv.Itoa(offset + len(items))
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringListVersionsResponse]{
				Data: flow.FSMAuthoringListVersionsResponse{
					MachineID:  machineID,
					Items:      items,
					NextCursor: nextCursor,
				},
			}, nil
		},
	)
}

func workflowAuthoringGetVersionEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringGetVersionRequest, flow.FSMAuthoringGetVersionResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringGetVersion,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringGetVersionRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, err
			}
			store := workflowAuthoringVersionStore(adm)
			if store == nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, serviceNotConfiguredDomainError("workflow authoring version store", nil)
			}

			machineID := strings.TrimSpace(req.Data.MachineID)
			version := strings.TrimSpace(req.Data.Version)
			if machineID == "" {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, requiredFieldDomainError("machineId", nil)
			}
			if version == "" {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, requiredFieldDomainError("version", nil)
			}
			record, err := store.LoadVersion(ctx, machineID, version)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, err
			}
			if record == nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{}, flow.ErrAuthoringNotFound
			}
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringGetVersionResponse]{
				Data: flow.FSMAuthoringGetVersionResponse{
					MachineID:   machineID,
					Version:     strings.TrimSpace(record.Version),
					Draft:       record.Draft,
					Diagnostics: append([]flow.ValidationDiagnostic(nil), record.Diagnostics...),
					ETag:        strings.TrimSpace(record.ETag),
				},
			}, nil
		},
	)
}

func workflowAuthoringDiffVersionsEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[flow.FSMAuthoringDiffVersionsRequest, flow.FSMAuthoringDiffVersionsResponse](
		cmdrpc.EndpointSpec{
			Method:      flow.FSMRPCMethodAuthoringDiffVersions,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.read"},
			Tags:        []string{"fsm", "authoring"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[flow.FSMAuthoringDiffVersionsRequest]) (cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, err
			}
			store := workflowAuthoringVersionStore(adm)
			if store == nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, serviceNotConfiguredDomainError("workflow authoring version store", nil)
			}

			machineID := strings.TrimSpace(req.Data.MachineID)
			baseVersion := strings.TrimSpace(req.Data.BaseVersion)
			targetVersion := strings.TrimSpace(req.Data.TargetVersion)
			if machineID == "" {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, requiredFieldDomainError("machineId", nil)
			}
			if baseVersion == "" || targetVersion == "" {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, validationDomainError("baseVersion and targetVersion are required", nil)
			}

			baseWorkflow, err := store.LoadVersion(ctx, machineID, baseVersion)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, err
			}
			targetWorkflow, err := store.LoadVersion(ctx, machineID, targetVersion)
			if err != nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, err
			}
			if baseWorkflow == nil || targetWorkflow == nil {
				return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{}, flow.ErrAuthoringNotFound
			}

			changes := diffMachineDefinitions(
				baseWorkflow.Draft.Definition,
				targetWorkflow.Draft.Definition,
			)
			return cmdrpc.ResponseEnvelope[flow.FSMAuthoringDiffVersionsResponse]{
				Data: flow.FSMAuthoringDiffVersionsResponse{
					MachineID:     machineID,
					BaseVersion:   baseVersion,
					TargetVersion: targetVersion,
					HasConflicts:  false,
					Changes:       changes,
					ConflictPaths: []string{},
				},
			}, nil
		},
	)
}

func workflowBindingsListEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[rpcWorkflowBindingsListRequest, rpcWorkflowBindingsListResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodWorkflowBindingsList,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.bindings.read"},
			Tags:        []string{"fsm", "bindings"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[rpcWorkflowBindingsListRequest]) (cmdrpc.ResponseEnvelope[rpcWorkflowBindingsListResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.bindings.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsListResponse]{}, err
			}
			runtime := adm.workflowRuntime
			if runtime == nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsListResponse]{}, serviceNotConfiguredDomainError("workflow runtime", nil)
			}
			items, total, err := runtime.ListBindings(ctx, WorkflowBindingListOptions{
				ScopeType:   WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(req.Data.ScopeType))),
				ScopeRef:    strings.TrimSpace(req.Data.ScopeRef),
				Environment: strings.TrimSpace(req.Data.Environment),
				Status:      WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(req.Data.Status))),
			})
			if err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsListResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsListResponse]{
				Data: rpcWorkflowBindingsListResponse{
					Items: items,
					Total: total,
				},
			}, nil
		},
	)
}

func workflowBindingsUpsertEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[rpcWorkflowBindingsUpsertRequest, rpcWorkflowBindingsUpsertResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodWorkflowBindingsUpsert,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.workflows.bindings.write"},
			Tags:        []string{"fsm", "bindings"},
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[rpcWorkflowBindingsUpsertRequest]) (cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.bindings.write", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{}, err
			}
			runtime := adm.workflowRuntime
			if runtime == nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{}, serviceNotConfiguredDomainError("workflow runtime", nil)
			}
			binding := req.Data.Binding
			if strings.TrimSpace(binding.ID) == "" {
				created, err := runtime.CreateBinding(ctx, binding)
				if err != nil {
					return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{}, err
				}
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{
					Data: rpcWorkflowBindingsUpsertResponse{Binding: created},
				}, nil
			}
			expected := req.Data.ExpectedVersion
			if expected <= 0 {
				expected = binding.Version
			}
			updated, err := runtime.UpdateBinding(ctx, binding, expected)
			if err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsUpsertResponse]{
				Data: rpcWorkflowBindingsUpsertResponse{Binding: updated},
			}, nil
		},
	)
}

func workflowBindingsDeleteEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[rpcWorkflowBindingsDeleteRequest, rpcWorkflowBindingsDeleteResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodWorkflowBindingsDelete,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.workflows.bindings.write"},
			Tags:        []string{"fsm", "bindings"},
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[rpcWorkflowBindingsDeleteRequest]) (cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.bindings.write", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse]{}, err
			}
			runtime := adm.workflowRuntime
			if runtime == nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse]{}, serviceNotConfiguredDomainError("workflow runtime", nil)
			}
			id := strings.TrimSpace(req.Data.ID)
			if id == "" {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse]{}, requiredFieldDomainError("id", nil)
			}
			if err := runtime.DeleteBinding(ctx, id); err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsDeleteResponse]{
				Data: rpcWorkflowBindingsDeleteResponse{
					ID:      id,
					Deleted: true,
				},
			}, nil
		},
	)
}

func workflowBindingsResolveEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[rpcWorkflowBindingsResolveRequest, rpcWorkflowBindingsResolveResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodWorkflowBindingsResolve,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.workflows.bindings.read"},
			Tags:        []string{"fsm", "bindings"},
			Idempotent:  true,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[rpcWorkflowBindingsResolveRequest]) (cmdrpc.ResponseEnvelope[rpcWorkflowBindingsResolveResponse], error) {
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.workflows.bindings.read", "workflows"); err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsResolveResponse]{}, err
			}
			runtime := adm.workflowRuntime
			if runtime == nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsResolveResponse]{}, serviceNotConfiguredDomainError("workflow runtime", nil)
			}
			resolution, err := runtime.ResolveBinding(ctx, WorkflowBindingResolveInput{
				ContentType: strings.TrimSpace(req.Data.ContentType),
				Traits:      append([]string(nil), req.Data.Traits...),
				Environment: strings.TrimSpace(req.Data.Environment),
			})
			if err != nil {
				return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsResolveResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[rpcWorkflowBindingsResolveResponse]{
				Data: rpcWorkflowBindingsResolveResponse{
					Resolution: resolution,
				},
			}, nil
		},
	)
}

func resolveFSMAuthoringService(adm *Admin) *flow.AuthoringService {
	store := workflowAuthoringStore(adm)
	if store == nil {
		store = unavailableAuthoringStore{}
	}
	return flow.NewAuthoringService(store, nil)
}

func workflowAuthoringStore(adm *Admin) flow.AuthoringStore {
	if adm == nil || adm.workflowRuntime == nil {
		return nil
	}
	if runtime, ok := adm.workflowRuntime.(*WorkflowRuntimeService); ok && runtime != nil {
		if store := runtime.AuthoringStore(); store != nil {
			return store
		}
		if bunRepo, ok := runtime.workflows.(*BunWorkflowDefinitionRepository); ok && bunRepo != nil && bunRepo.db != nil {
			store := NewBunWorkflowAuthoringStore(bunRepo.db)
			runtime.SetAuthoringStore(store)
			return store
		}
	}
	return nil
}

func workflowAuthoringVersionStore(adm *Admin) WorkflowAuthoringVersionStore {
	store := workflowAuthoringStore(adm)
	if store == nil {
		return nil
	}
	if typed, ok := store.(WorkflowAuthoringVersionStore); ok {
		return typed
	}
	return nil
}

type unavailableAuthoringStore struct{}

func (unavailableAuthoringStore) List(context.Context, flow.AuthoringListOptions) (*flow.AuthoringListResult, error) {
	return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
}

func (unavailableAuthoringStore) Load(context.Context, string) (*flow.AuthoringMachineRecord, error) {
	return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
}

func (unavailableAuthoringStore) Save(context.Context, *flow.AuthoringMachineRecord, string) (*flow.AuthoringMachineRecord, error) {
	return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
}

func (unavailableAuthoringStore) Delete(context.Context, string, string, bool) (bool, error) {
	return false, serviceNotConfiguredDomainError("workflow authoring store", nil)
}

func syncPublishedMachineToRuntime(ctx context.Context, adm *Admin, machineID string) error {
	if adm == nil {
		return nil
	}
	runtime, ok := adm.workflowRuntime.(*WorkflowRuntimeService)
	if !ok || runtime == nil || runtime.workflows == nil {
		return nil
	}
	store := workflowAuthoringStore(adm)
	if store == nil {
		return nil
	}
	rec, err := store.Load(ctx, machineID)
	if err != nil {
		return err
	}
	if rec == nil || rec.PublishedDefinition == nil || rec.DeletedAt != nil {
		return nil
	}
	projected, err := authoringRecordToPersistedWorkflow(rec)
	if err != nil {
		return err
	}
	projected.Status = WorkflowStatusActive
	projected.Definition.EntityType = workflowcore.CanonicalMachineIDForWorkflow(projected)
	projected.MachineID = workflowcore.CanonicalMachineIDForWorkflow(projected)
	projected.MachineVersion = workflowcore.CanonicalMachineVersionForWorkflow(projected)

	current, getErr := runtime.workflows.Get(ctx, projected.ID)
	if getErr == nil {
		projected.ID = current.ID
		projected.CreatedAt = current.CreatedAt
		updated, updateErr := runtime.workflows.Update(ctx, projected, current.Version)
		if updateErr != nil {
			return updateErr
		}
		runtime.registerActiveWorkflow(updated)
		return nil
	}
	if getErr != ErrNotFound {
		return getErr
	}
	created, createErr := runtime.workflows.Create(ctx, projected)
	if createErr != nil {
		return createErr
	}
	runtime.registerActiveWorkflow(created)
	return nil
}

func syncDeletedMachineToRuntime(ctx context.Context, adm *Admin, machineID string) error {
	if adm == nil {
		return nil
	}
	runtime, ok := adm.workflowRuntime.(*WorkflowRuntimeService)
	if !ok || runtime == nil || runtime.workflows == nil {
		return nil
	}
	current, err := runtime.workflows.Get(ctx, strings.TrimSpace(machineID))
	if err != nil {
		if err == ErrNotFound {
			return nil
		}
		return err
	}
	current.Status = WorkflowStatusDeprecated
	if _, err := runtime.workflows.Update(ctx, current, current.Version); err != nil {
		return err
	}
	if unreg, ok := resolveCMSWorkflowEngine(adm).(interface {
		UnregisterWorkflow(entityType string) error
	}); ok {
		_ = unreg.UnregisterWorkflow(strings.TrimSpace(machineID))
	}
	return nil
}

func authoringRecordToPersistedWorkflow(rec *flow.AuthoringMachineRecord) (PersistedWorkflow, error) {
	draft := rec.Draft
	definition := draft.Definition
	if definition == nil && rec.PublishedDefinition != nil {
		definition = rec.PublishedDefinition
	}
	if definition == nil {
		return PersistedWorkflow{}, validationDomainError("machine definition is required", nil)
	}
	converted, err := machineDefinitionToWorkflowDefinition(definition)
	if err != nil {
		return PersistedWorkflow{}, err
	}
	version := parseAuthoringVersion(rec.Version)
	if version <= 0 {
		version = 1
	}
	status := WorkflowStatusDraft
	if rec.DeletedAt != nil {
		status = WorkflowStatusDeprecated
	} else if rec.PublishedDefinition != nil || !rec.Draft.DraftState.IsDraft {
		status = WorkflowStatusActive
	}
	updatedAt := rec.UpdatedAt.UTC()
	if updatedAt.IsZero() {
		updatedAt = time.Now().UTC()
	}
	return PersistedWorkflow{
		ID:             strings.TrimSpace(rec.MachineID),
		MachineID:      strings.TrimSpace(rec.MachineID),
		MachineVersion: strings.TrimSpace(definition.Version),
		Name:           strings.TrimSpace(firstNonEmpty(rec.Name, rec.MachineID)),
		Definition:     converted,
		Status:         status,
		Version:        version,
		UpdatedAt:      updatedAt,
		CreatedAt:      updatedAt,
	}, nil
}

func persistedWorkflowToAuthoringRecord(workflow PersistedWorkflow) (*flow.AuthoringMachineRecord, error) {
	draft := persistedWorkflowToDraft(workflow)
	version := strconv.Itoa(workflow.Version)
	updatedAt := workflow.UpdatedAt.UTC()
	if updatedAt.IsZero() {
		updatedAt = time.Now().UTC()
	}
	record := &flow.AuthoringMachineRecord{
		MachineID: strings.TrimSpace(workflow.ID),
		Name:      strings.TrimSpace(firstNonEmpty(workflow.Name, workflow.ID)),
		Version:   version,
		ETag:      authoringRecordETag(workflow.ID, version),
		Draft:     draft,
		UpdatedAt: updatedAt,
	}
	if workflow.Status == WorkflowStatusActive {
		def := draft.Definition
		record.PublishedAt = pointerToTime(publishedAtForPersistedWorkflow(workflow))
		record.PublishedDefinition = def
	}
	if workflow.Status == WorkflowStatusDeprecated {
		deleted := workflow.UpdatedAt.UTC()
		if deleted.IsZero() {
			deleted = time.Now().UTC()
		}
		record.DeletedAt = &deleted
	}
	return record, nil
}

func persistedWorkflowToDraft(workflow PersistedWorkflow) flow.DraftMachineDocument {
	definition, err := persistedWorkflowToMachineDefinition(workflow)
	if err != nil {
		definition = &flow.MachineDefinition{
			ID:      strings.TrimSpace(workflow.ID),
			Name:    strings.TrimSpace(firstNonEmpty(workflow.Name, workflow.ID)),
			Version: strings.TrimSpace(firstNonEmpty(workflow.MachineVersion, strconv.Itoa(maxInt(1, workflow.Version)))),
		}
	}
	return flow.DraftMachineDocument{
		Definition: definition,
		DraftState: flow.DraftState{
			IsDraft:     workflow.Status != WorkflowStatusActive,
			LastSavedAt: workflow.UpdatedAt.UTC(),
		},
	}
}

func persistedWorkflowToMachineDefinition(workflow PersistedWorkflow) (*flow.MachineDefinition, error) {
	definition := workflowcore.CloneWorkflowDefinition(workflow.Definition)
	if strings.TrimSpace(definition.EntityType) == "" {
		definition.EntityType = strings.TrimSpace(firstNonEmpty(workflow.MachineID, workflow.ID))
	}
	if strings.TrimSpace(definition.MachineVersion) == "" {
		definition.MachineVersion = strings.TrimSpace(firstNonEmpty(workflow.MachineVersion, strconv.Itoa(maxInt(1, workflow.Version))))
	}
	return compileWorkflowMachineDefinition(definition)
}

func machineDefinitionToWorkflowDefinition(def *flow.MachineDefinition) (WorkflowDefinition, error) {
	if def == nil {
		return WorkflowDefinition{}, validationDomainError("machine definition is required", nil)
	}
	out := WorkflowDefinition{
		EntityType:     strings.TrimSpace(def.ID),
		MachineVersion: strings.TrimSpace(def.Version),
		InitialState:   "",
		Transitions:    make([]WorkflowTransition, 0, len(def.Transitions)),
	}
	for _, state := range def.States {
		if state.Initial {
			out.InitialState = strings.TrimSpace(state.Name)
			break
		}
	}
	if out.InitialState == "" && len(def.States) > 0 {
		out.InitialState = strings.TrimSpace(def.States[0].Name)
	}
	for _, transition := range def.Transitions {
		name := strings.TrimSpace(firstNonEmpty(transition.Event, transition.ID))
		if name == "" {
			continue
		}
		metadata := copyRPCMap(transition.Metadata)
		description := strings.TrimSpace(metadataString(metadata, "description"))
		item := WorkflowTransition{
			Name:        name,
			Description: description,
			From:        strings.TrimSpace(transition.From),
			To:          strings.TrimSpace(transition.To),
			Metadata:    metadata,
		}
		if item.Metadata != nil {
			delete(item.Metadata, "description")
			if len(item.Metadata) == 0 {
				item.Metadata = nil
			}
		}
		for _, guard := range transition.Guards {
			if ref := strings.TrimSpace(guard.Ref); ref != "" {
				item.Guard = ref
				break
			}
		}
		if transition.DynamicTo != nil {
			item.DynamicTo = strings.TrimSpace(transition.DynamicTo.Resolver)
		}
		out.Transitions = append(out.Transitions, item)
	}
	return out, nil
}

func parseAuthoringVersion(value string) int {
	parsed, _ := strconv.Atoi(strings.TrimSpace(value))
	return parsed
}

func parseCursorOffset(cursor string) int {
	offset, err := strconv.Atoi(strings.TrimSpace(cursor))
	if err != nil || offset < 0 {
		return 0
	}
	return offset
}

func publishedAtForPersistedWorkflow(workflow PersistedWorkflow) time.Time {
	value := workflow.UpdatedAt.UTC()
	if value.IsZero() {
		value = time.Now().UTC()
	}
	return value
}

func pointerToTime(value time.Time) *time.Time {
	normalized := value.UTC()
	return &normalized
}

func authoringRecordETag(machineID, version string) string {
	return fmt.Sprintf("%s:%s", strings.TrimSpace(machineID), strings.TrimSpace(version))
}

func diffMachineDefinitions(base, target *flow.MachineDefinition) []flow.FSMAuthoringDiffChange {
	baseRaw, _ := json.Marshal(base)
	targetRaw, _ := json.Marshal(target)
	baseMap := map[string]any{}
	targetMap := map[string]any{}
	_ = json.Unmarshal(baseRaw, &baseMap)
	_ = json.Unmarshal(targetRaw, &targetMap)
	changes := []flow.FSMAuthoringDiffChange{}
	collectDiffChanges("$", baseMap, targetMap, &changes)
	sort.SliceStable(changes, func(i, j int) bool {
		return changes[i].Path < changes[j].Path
	})
	return changes
}

func collectDiffChanges(path string, base, target any, changes *[]flow.FSMAuthoringDiffChange) {
	switch b := base.(type) {
	case map[string]any:
		t, ok := target.(map[string]any)
		if !ok {
			*changes = append(*changes, flow.FSMAuthoringDiffChange{Path: path, ChangeType: "modified"})
			return
		}
		keys := map[string]struct{}{}
		for key := range b {
			keys[key] = struct{}{}
		}
		for key := range t {
			keys[key] = struct{}{}
		}
		names := make([]string, 0, len(keys))
		for key := range keys {
			names = append(names, key)
		}
		sort.Strings(names)
		for _, key := range names {
			collectDiffChanges(path+"."+key, b[key], t[key], changes)
		}
	case []any:
		t, ok := target.([]any)
		if !ok {
			*changes = append(*changes, flow.FSMAuthoringDiffChange{Path: path, ChangeType: "modified"})
			return
		}
		maxLen := max(len(t), len(b))
		for index := range maxLen {
			var left any
			if index < len(b) {
				left = b[index]
			}
			var right any
			if index < len(t) {
				right = t[index]
			}
			collectDiffChanges(fmt.Sprintf("%s[%d]", path, index), left, right, changes)
		}
	default:
		if fmt.Sprint(base) == fmt.Sprint(target) {
			return
		}
		changeType := "modified"
		if base == nil {
			changeType = "added"
		} else if target == nil {
			changeType = "removed"
		}
		*changes = append(*changes, flow.FSMAuthoringDiffChange{
			Path:       path,
			ChangeType: changeType,
		})
	}
}
