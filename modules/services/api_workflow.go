package services

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
	gocore "github.com/goliatone/go-services/core"
)

type servicesAPIRouter interface {
	Get(path string, handler router.HandlerFunc, middleware ...router.MiddlewareFunc) router.RouteInfo
	Post(path string, handler router.HandlerFunc, middleware ...router.MiddlewareFunc) router.RouteInfo
}

func (m *Module) registerWorkflowAPIRoutes(basePath string, r servicesAPIRouter) error {
	if m == nil || r == nil {
		return nil
	}
	r.Get(basePath+"/mappings", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowListMappings))
	r.Post(basePath+"/mappings/validate", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowValidateMapping))
	r.Post(basePath+"/mappings/preview", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowPreviewMapping))
	r.Get(basePath+"/mappings/spec/:spec_id", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowGetMapping))
	r.Get(basePath+"/mappings/spec/:spec_id/versions/:version", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowGetMappingVersion))
	r.Post(basePath+"/mappings", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowCreateMappingDraft))
	r.Post(basePath+"/mappings/spec/:spec_id/update", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowUpdateMappingDraft))
	r.Post(basePath+"/mappings/spec/:spec_id/validate", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowMarkMappingValidated))
	r.Post(basePath+"/mappings/spec/:spec_id/publish", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowPublishMapping))
	r.Post(basePath+"/mappings/spec/:spec_id/unpublish", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowUnpublishMapping))

	r.Post(basePath+"/sync/plan", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowPlanSyncRun))
	r.Post(basePath+"/sync/run", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowRunSync))
	r.Get(basePath+"/sync/runs", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowListSyncRuns))
	r.Get(basePath+"/sync/runs/:run_id", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowGetSyncRun))
	r.Post(basePath+"/sync/runs/:run_id/resume", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowResumeSyncRun))
	r.Get(basePath+"/sync/checkpoints/:checkpoint_id", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowGetSyncCheckpoint))
	r.Get(basePath+"/sync/conflicts", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowListConflicts))
	r.Get(basePath+"/sync/conflicts/:conflict_id", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowGetConflict))
	r.Post(basePath+"/sync/conflicts/:conflict_id/resolve", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowResolveConflict))
	r.Get(basePath+"/sync/schema-drift", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowListSchemaDrift))
	r.Post(basePath+"/sync/schema-drift/baseline", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowSetSchemaDriftBaseline))

	r.Get(basePath+"/connection-candidates", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowListConnectionCandidates))
	r.Post(basePath+"/capabilities/:provider/:capability/invoke", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleWorkflowInvokeCapability))

	r.Get(basePath+"/callbacks/diagnostics/status", m.wrapServiceRoute(permissionServicesView, false, false, m.handleWorkflowCallbackDiagnosticsStatus))
	r.Post(basePath+"/callbacks/diagnostics/preview", m.wrapServiceRoute(permissionServicesView, true, false, m.handleWorkflowCallbackDiagnosticsPreview))
	return nil
}

func (m *Module) handleWorkflowListMappings(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}

	rows, err := runtime.mappingLifecycle.ListByScope(c.Context(), providerID, scope)
	if err != nil {
		return 0, nil, err
	}
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, workflowMappingSpecToMap(row))
	}
	limit := len(items)
	if limit == 0 {
		limit = 25
	}
	response := newListResponse(items, len(items), limit, 0, map[string]any{
		"provider_id": providerID,
		"scope_type":  scope.Type,
		"scope_id":    scope.ID,
	})
	response["mappings"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleWorkflowGetMapping(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}

	if version := toInt(c.Query("version"), 0); version > 0 {
		row, found, getErr := runtime.mappingLifecycle.GetVersion(c.Context(), providerID, scope, specID, version)
		if getErr != nil {
			return 0, nil, getErr
		}
		if !found {
			return 0, nil, missingResourceError("mapping_spec", map[string]any{"spec_id": specID, "version": version})
		}
		return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(row)}, nil
	}

	row, found, getErr := runtime.mappingLifecycle.GetLatest(c.Context(), providerID, scope, specID)
	if getErr != nil {
		return 0, nil, getErr
	}
	if !found {
		return 0, nil, missingResourceError("mapping_spec", map[string]any{"spec_id": specID})
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(row)}, nil
}

func (m *Module) handleWorkflowGetMappingVersion(c router.Context, _ map[string]any) (int, any, error) {
	version := toInt(routeParam(c, "version"), 0)
	if version <= 0 {
		return 0, nil, validationError("version must be > 0", map[string]any{"field": "version"})
	}
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	row, found, err := runtime.mappingLifecycle.GetVersion(c.Context(), providerID, scope, specID, version)
	if err != nil {
		return 0, nil, err
	}
	if !found {
		return 0, nil, missingResourceError("mapping_spec", map[string]any{"spec_id": specID, "version": version})
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(row)}, nil
}

func (m *Module) handleWorkflowCreateMappingDraft(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	spec, providerID, scope, err := m.workflowMappingSpecFromBody(c, body, "")
	if err != nil {
		return 0, nil, err
	}
	spec.ProviderID = providerID
	spec.Scope = scope
	created, err := runtime.mappingLifecycle.CreateDraft(c.Context(), spec)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(created)}, nil
}

func (m *Module) handleWorkflowUpdateMappingDraft(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	spec, providerID, scope, err := m.workflowMappingSpecFromBody(c, body, specID)
	if err != nil {
		return 0, nil, err
	}
	if spec.Version <= 0 {
		return 0, nil, validationError("version is required for mapping draft update", map[string]any{"field": "version"})
	}
	spec.ProviderID = providerID
	spec.Scope = scope
	updated, err := runtime.mappingLifecycle.UpdateDraft(c.Context(), spec)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(updated)}, nil
}

func (m *Module) handleWorkflowMarkMappingValidated(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	version := toInt(body["version"], 0)
	if version <= 0 {
		return 0, nil, validationError("version must be > 0", map[string]any{"field": "version"})
	}
	validated, err := runtime.mappingLifecycle.MarkValidated(c.Context(), providerID, scope, specID, version)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(validated)}, nil
}

func (m *Module) handleWorkflowPublishMapping(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	version := toInt(body["version"], 0)
	if version <= 0 {
		return 0, nil, validationError("version must be > 0", map[string]any{"field": "version"})
	}
	published, err := runtime.mappingLifecycle.Publish(c.Context(), providerID, scope, specID, version)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(published)}, nil
}

func (m *Module) handleWorkflowUnpublishMapping(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	specID := routeParam(c, "spec_id", "id", "ref")
	if specID == "" {
		return 0, nil, validationError("mapping spec id is required", map[string]any{"field": "spec_id"})
	}
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	version := toInt(body["version"], 0)
	if version <= 0 {
		return 0, nil, validationError("version must be > 0", map[string]any{"field": "version"})
	}
	unpublished, err := runtime.mappingStore.UnpublishVersion(providerID, scope, specID, version, time.Now().UTC())
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"mapping": workflowMappingSpecToMap(unpublished)}, nil
}

func (m *Module) handleWorkflowValidateMapping(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	request := gocore.ValidateMappingSpecRequest{}
	if err := decodeBodyMap(body, &request); err != nil {
		return 0, nil, validationError("invalid validate mapping payload", map[string]any{"field": "body"})
	}
	request = workflowNormalizeValidateMappingRequest(body, request)
	if request.Spec.Scope.Type == "" || request.Spec.Scope.ID == "" {
		scope, scopeErr := resolveScope(c.Context(), c, body)
		if scopeErr != nil {
			return 0, nil, scopeErr
		}
		request.Spec.Scope = scope
	}
	if strings.TrimSpace(request.Spec.ProviderID) == "" {
		request.Spec.ProviderID = strings.TrimSpace(toString(body["provider_id"]))
	}
	result, err := runtime.compiler.ValidateMappingSpec(c.Context(), request)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"validation": workflowValidationToMap(result)}, nil
}

func (m *Module) handleWorkflowPreviewMapping(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	request := gocore.PreviewMappingSpecRequest{}
	if err := decodeBodyMap(body, &request); err != nil {
		return 0, nil, validationError("invalid preview mapping payload", map[string]any{"field": "body"})
	}
	request = workflowNormalizePreviewMappingRequest(body, request)
	if request.Spec.Scope.Type == "" || request.Spec.Scope.ID == "" {
		scope, scopeErr := resolveScope(c.Context(), c, body)
		if scopeErr != nil {
			return 0, nil, scopeErr
		}
		request.Spec.Scope = scope
	}
	if strings.TrimSpace(request.Spec.ProviderID) == "" {
		request.Spec.ProviderID = strings.TrimSpace(toString(body["provider_id"]))
	}
	result, err := runtime.previewer.PreviewMappingSpec(c.Context(), request)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"preview": workflowPreviewToMap(result)}, nil
}

func (m *Module) handleWorkflowPlanSyncRun(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	payload := struct {
		Binding          gocore.SyncBinding `json:"binding"`
		Mode             string             `json:"mode"`
		FromCheckpointID string             `json:"from_checkpoint_id"`
		Limit            int                `json:"limit"`
		Metadata         map[string]any     `json:"metadata"`
	}{}
	if err := decodeBodyMap(body, &payload); err != nil {
		return 0, nil, validationError("invalid sync plan payload", map[string]any{"field": "body"})
	}
	if rawBinding, ok := body["binding"].(map[string]any); ok {
		payload.Binding = workflowSyncBindingFromMap(rawBinding, payload.Binding)
	}
	if mode := firstNonEmptyString(body["mode"], payload.Mode); mode != "" {
		payload.Mode = mode
	}
	if fromCheckpoint := firstNonEmptyString(body["from_checkpoint_id"], body["fromCheckpointID"], payload.FromCheckpointID); fromCheckpoint != "" {
		payload.FromCheckpointID = fromCheckpoint
	}
	if limit := toInt(body["limit"], payload.Limit); limit > 0 {
		payload.Limit = limit
	}
	if metadata := extractMap(body["metadata"]); len(metadata) > 0 {
		payload.Metadata = metadata
	}
	if payload.Binding.Scope.Type == "" || payload.Binding.Scope.ID == "" {
		scope, scopeErr := resolveScope(c.Context(), c, body)
		if scopeErr != nil {
			return 0, nil, scopeErr
		}
		payload.Binding.Scope = scope
	}
	payload.Binding.ProviderID = strings.TrimSpace(payload.Binding.ProviderID)
	if payload.Binding.ProviderID == "" {
		payload.Binding.ProviderID = strings.TrimSpace(toString(body["provider_id"]))
	}
	if payload.Binding.ProviderID == "" {
		return 0, nil, validationError("binding.provider_id is required", map[string]any{"field": "binding.provider_id"})
	}
	if payload.Binding.Status == "" {
		payload.Binding.Status = gocore.SyncBindingStatusActive
	}
	if payload.Binding.Direction == "" {
		payload.Binding.Direction = gocore.SyncDirectionImport
	}
	binding, err := runtime.syncBindingStore.Upsert(c.Context(), payload.Binding)
	if err != nil {
		return 0, nil, err
	}
	mode := workflowNormalizeSyncRunMode(payload.Mode, gocore.SyncRunModeDryRun)
	if mode == "" {
		mode = gocore.SyncRunModeDryRun
	}
	plan, err := runtime.planner.PlanSyncRun(c.Context(), gocore.PlanSyncRunRequest{
		Binding:          binding,
		Mode:             mode,
		FromCheckpointID: strings.TrimSpace(payload.FromCheckpointID),
		Limit:            payload.Limit,
		Metadata:         copyAnyMap(payload.Metadata),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{
		"binding": workflowSyncBindingToMap(binding),
		"plan":    workflowSyncRunPlanToMap(plan),
	}, nil
}

func (m *Module) handleWorkflowRunSync(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	payload := struct {
		Plan      gocore.SyncRunPlan    `json:"plan"`
		Binding   gocore.SyncBinding    `json:"binding"`
		Mode      string                `json:"mode"`
		Direction string                `json:"direction"`
		Changes   []gocore.SyncChange   `json:"changes"`
		Metadata  map[string]any        `json:"metadata"`
		Conflicts []gocore.SyncConflict `json:"conflicts"`
	}{}
	if err := decodeBodyMap(body, &payload); err != nil {
		return 0, nil, validationError("invalid sync run payload", map[string]any{"field": "body"})
	}
	if rawPlan, ok := body["plan"].(map[string]any); ok {
		payload.Plan = workflowSyncRunPlanFromMap(rawPlan, payload.Plan)
	}
	if rawBinding, ok := body["binding"].(map[string]any); ok {
		payload.Binding = workflowSyncBindingFromMap(rawBinding, payload.Binding)
	}
	if mode := firstNonEmptyString(body["mode"], payload.Mode); mode != "" {
		payload.Mode = mode
	}
	if direction := firstNonEmptyString(body["direction"], payload.Direction); direction != "" {
		payload.Direction = direction
	}
	if metadata := extractMap(body["metadata"]); len(metadata) > 0 {
		payload.Metadata = metadata
	}
	if rawChanges, ok := body["changes"].([]any); ok {
		payload.Changes = workflowSyncChangesFromAny(rawChanges)
	} else if rawChanges, ok := body["changes"].([]map[string]any); ok {
		rows := make([]any, 0, len(rawChanges))
		for _, row := range rawChanges {
			rows = append(rows, row)
		}
		payload.Changes = workflowSyncChangesFromAny(rows)
	}
	if rawConflicts, ok := body["conflicts"].([]any); ok {
		payload.Conflicts = workflowSyncConflictsFromAny(rawConflicts)
	} else if rawConflicts, ok := body["conflicts"].([]map[string]any); ok {
		rows := make([]any, 0, len(rawConflicts))
		for _, row := range rawConflicts {
			rows = append(rows, row)
		}
		payload.Conflicts = workflowSyncConflictsFromAny(rows)
	}

	binding := payload.Binding
	if strings.TrimSpace(payload.Plan.BindingID) == "" {
		if binding.Scope.Type == "" || binding.Scope.ID == "" {
			scope, scopeErr := resolveScope(c.Context(), c, body)
			if scopeErr != nil {
				return 0, nil, scopeErr
			}
			binding.Scope = scope
		}
		if strings.TrimSpace(binding.ProviderID) == "" {
			binding.ProviderID = strings.TrimSpace(toString(body["provider_id"]))
		}
		if binding.Status == "" {
			binding.Status = gocore.SyncBindingStatusActive
		}
		if binding.Direction == "" {
			binding.Direction = gocore.SyncDirectionImport
		}
		upserted, upsertErr := runtime.syncBindingStore.Upsert(c.Context(), binding)
		if upsertErr != nil {
			return 0, nil, upsertErr
		}
		mode := workflowNormalizeSyncRunMode(payload.Mode, gocore.SyncRunModeApply)
		if mode == "" {
			mode = gocore.SyncRunModeApply
		}
		plan, planErr := runtime.planner.PlanSyncRun(c.Context(), gocore.PlanSyncRunRequest{
			Binding:  upserted,
			Mode:     mode,
			Metadata: copyAnyMap(payload.Metadata),
		})
		if planErr != nil {
			return 0, nil, planErr
		}
		payload.Plan = plan
	}

	direction := gocore.SyncDirection(strings.TrimSpace(strings.ToLower(payload.Direction)))
	if direction == "" {
		direction = payload.Plan.Checkpoint.Direction
	}
	if direction == "" {
		direction = gocore.SyncDirectionImport
	}

	var result gocore.SyncRunResult
	if direction == gocore.SyncDirectionExport {
		result, err = runtime.runner.RunSyncExport(c.Context(), gocore.RunSyncExportRequest{
			Plan:     payload.Plan,
			Changes:  payload.Changes,
			Metadata: copyAnyMap(payload.Metadata),
		})
	} else {
		result, err = runtime.runner.RunSyncImport(c.Context(), gocore.RunSyncImportRequest{
			Plan:     payload.Plan,
			Changes:  payload.Changes,
			Metadata: copyAnyMap(payload.Metadata),
		})
	}
	if err != nil {
		return 0, nil, err
	}

	recordedConflicts := make([]map[string]any, 0)
	for _, conflict := range payload.Conflicts {
		if conflict.Scope.Type == "" || conflict.Scope.ID == "" {
			conflict.Scope = payload.Plan.Checkpoint.Scope
		}
		if conflict.ProviderID == "" {
			conflict.ProviderID = payload.Plan.Checkpoint.ProviderID
		}
		if conflict.ConnectionID == "" {
			conflict.ConnectionID = payload.Plan.Checkpoint.ConnectionID
		}
		if conflict.SyncBindingID == "" {
			conflict.SyncBindingID = payload.Plan.BindingID
		}
		if conflict.Status == "" {
			conflict.Status = gocore.SyncConflictStatusPending
		}
		recorded, recordErr := runtime.conflicts.RecordSyncConflict(c.Context(), gocore.RecordSyncConflictRequest{
			Conflict: conflict,
			Metadata: copyAnyMap(payload.Metadata),
		})
		if recordErr != nil {
			return 0, nil, recordErr
		}
		recordedConflicts = append(recordedConflicts, workflowSyncConflictToMap(recorded.Conflict))
	}
	runRecord := runtime.rememberSyncRun(payload.Plan, result, recordedConflicts)

	return http.StatusOK, map[string]any{
		"plan":               workflowSyncRunPlanToMap(payload.Plan),
		"result":             workflowSyncRunResultToMap(result),
		"recorded_conflicts": recordedConflicts,
		"run":                workflowSyncRunRecordToMap(runRecord),
	}, nil
}

func (m *Module) handleWorkflowListSyncRuns(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	syncBindingID := strings.TrimSpace(c.Query("sync_binding_id"))
	status := gocore.SyncRunStatus(strings.TrimSpace(strings.ToLower(c.Query("status"))))
	if status != "" && !status.IsValid() {
		return 0, nil, validationError("status must be planned|running|succeeded|failed", map[string]any{"field": "status"})
	}
	modeRaw := strings.TrimSpace(strings.ToLower(c.Query("mode")))
	mode := workflowNormalizeSyncRunMode(modeRaw, "")
	if modeRaw != "" && !mode.IsValid() {
		return 0, nil, validationError("mode must be dry_run|apply", map[string]any{"field": "mode"})
	}

	limit := toInt(c.Query("limit"), 25)
	offset := toInt(c.Query("offset"), 0)
	page := toInt(c.Query("page"), 0)
	perPage := toInt(c.Query("per_page"), 0)
	if page > 0 {
		if perPage <= 0 {
			perPage = 25
		}
		limit = perPage
		offset = (page - 1) * perPage
	}
	rows, total := runtime.listSyncRuns(providerID, scope, syncBindingID, status, mode, limit, offset)
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, workflowSyncRunRecordToMap(row))
	}
	response := newListResponse(items, total, limit, offset, map[string]any{
		"provider_id":     providerID,
		"scope_type":      scope.Type,
		"scope_id":        scope.ID,
		"sync_binding_id": syncBindingID,
		"status":          strings.TrimSpace(string(status)),
		"mode":            strings.TrimSpace(string(mode)),
	})
	response["runs"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleWorkflowGetSyncRun(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	runID := routeParam(c, "run_id", "id", "ref")
	if runID == "" {
		return 0, nil, validationError("run_id is required", map[string]any{"field": "run_id"})
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	record, ok := runtime.getSyncRun(providerID, scope, runID)
	if !ok {
		return 0, nil, missingResourceError("sync_run", map[string]any{"run_id": strings.TrimSpace(runID)})
	}
	return http.StatusOK, map[string]any{"run": workflowSyncRunRecordToMap(record)}, nil
}

func (m *Module) handleWorkflowResumeSyncRun(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	runID := routeParam(c, "run_id", "id", "ref")
	if runID == "" {
		return 0, nil, validationError("run_id is required", map[string]any{"field": "run_id"})
	}
	providerID := strings.TrimSpace(firstNonEmptyString(body["provider_id"], c.Query("provider_id")))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	previous, ok := runtime.getSyncRun(providerID, scope, runID)
	if !ok {
		return 0, nil, missingResourceError("sync_run", map[string]any{"run_id": strings.TrimSpace(runID)})
	}
	binding, err := runtime.syncBindingStore.Get(c.Context(), previous.SyncBindingID)
	if err != nil {
		return 0, nil, missingResourceError("sync_binding", map[string]any{"sync_binding_id": previous.SyncBindingID})
	}
	resumeCheckpointID := strings.TrimSpace(previous.Plan.Checkpoint.ID)
	if previous.Result.NextCheckpoint != nil && strings.TrimSpace(previous.Result.NextCheckpoint.ID) != "" {
		resumeCheckpointID = strings.TrimSpace(previous.Result.NextCheckpoint.ID)
	}
	if resumeCheckpointID == "" {
		return 0, nil, validationError("resume checkpoint is required", map[string]any{"field": "checkpoint_id"})
	}
	mode := workflowNormalizeSyncRunMode(firstNonEmptyString(body["mode"], previous.Mode), previous.Mode)
	if mode == "" {
		mode = gocore.SyncRunModeApply
	}
	if !mode.IsValid() {
		return 0, nil, validationError("mode must be dry_run|apply", map[string]any{"field": "mode"})
	}
	limit := toInt(body["limit"], previous.Plan.EstimatedChanges)
	metadata := copyAnyMap(previous.Plan.Metadata)
	for key, value := range extractMap(body["metadata"]) {
		metadata[key] = value
	}
	plan, err := runtime.planner.PlanSyncRun(c.Context(), gocore.PlanSyncRunRequest{
		Binding:          binding,
		Mode:             mode,
		FromCheckpointID: resumeCheckpointID,
		Limit:            limit,
		Metadata:         metadata,
	})
	if err != nil {
		return 0, nil, err
	}

	direction := gocore.SyncDirection(strings.TrimSpace(strings.ToLower(firstNonEmptyString(body["direction"], previous.Direction, binding.Direction))))
	if direction == "" {
		direction = gocore.SyncDirectionImport
	}
	if !direction.IsValid() {
		return 0, nil, validationError("direction must be import|export", map[string]any{"field": "direction"})
	}
	changes := []gocore.SyncChange{}
	if rawChanges, ok := body["changes"].([]any); ok {
		changes = workflowSyncChangesFromAny(rawChanges)
	}
	conflictsInput := []gocore.SyncConflict{}
	if rawConflicts, ok := body["conflicts"].([]any); ok {
		conflictsInput = workflowSyncConflictsFromAny(rawConflicts)
	}

	var result gocore.SyncRunResult
	if direction == gocore.SyncDirectionExport {
		result, err = runtime.runner.RunSyncExport(c.Context(), gocore.RunSyncExportRequest{
			Plan:     plan,
			Changes:  changes,
			Metadata: metadata,
		})
	} else {
		result, err = runtime.runner.RunSyncImport(c.Context(), gocore.RunSyncImportRequest{
			Plan:     plan,
			Changes:  changes,
			Metadata: metadata,
		})
	}
	if err != nil {
		return 0, nil, err
	}

	recordedConflicts := make([]map[string]any, 0, len(conflictsInput))
	for _, conflict := range conflictsInput {
		if conflict.Scope.Type == "" || conflict.Scope.ID == "" {
			conflict.Scope = plan.Checkpoint.Scope
		}
		if conflict.ProviderID == "" {
			conflict.ProviderID = plan.Checkpoint.ProviderID
		}
		if conflict.ConnectionID == "" {
			conflict.ConnectionID = plan.Checkpoint.ConnectionID
		}
		if conflict.SyncBindingID == "" {
			conflict.SyncBindingID = plan.BindingID
		}
		if conflict.Status == "" {
			conflict.Status = gocore.SyncConflictStatusPending
		}
		recorded, recordErr := runtime.conflicts.RecordSyncConflict(c.Context(), gocore.RecordSyncConflictRequest{
			Conflict: conflict,
			Metadata: metadata,
		})
		if recordErr != nil {
			return 0, nil, recordErr
		}
		recordedConflicts = append(recordedConflicts, workflowSyncConflictToMap(recorded.Conflict))
	}
	runRecord := runtime.rememberSyncRun(plan, result, recordedConflicts)

	return http.StatusOK, map[string]any{
		"resumed_from_run_id":        strings.TrimSpace(previous.RunID),
		"resumed_from_checkpoint_id": resumeCheckpointID,
		"plan":                       workflowSyncRunPlanToMap(plan),
		"result":                     workflowSyncRunResultToMap(result),
		"recorded_conflicts":         recordedConflicts,
		"run":                        workflowSyncRunRecordToMap(runRecord),
	}, nil
}

func (m *Module) handleWorkflowGetSyncCheckpoint(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	checkpointID := routeParam(c, "checkpoint_id", "id", "ref")
	if checkpointID == "" {
		return 0, nil, validationError("checkpoint_id is required", map[string]any{"field": "checkpoint_id"})
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	checkpoint, found, err := runtime.checkpointStore.GetByID(c.Context(), providerID, scope, checkpointID)
	if err != nil {
		return 0, nil, err
	}
	if !found {
		return 0, nil, missingResourceError("sync_checkpoint", map[string]any{"checkpoint_id": strings.TrimSpace(checkpointID)})
	}
	return http.StatusOK, map[string]any{"checkpoint": workflowSyncCheckpointToMap(checkpoint)}, nil
}

func (m *Module) handleWorkflowListSchemaDrift(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	specFilter := strings.TrimSpace(c.Query("spec_id"))
	mappings, err := runtime.mappingLifecycle.ListByScope(c.Context(), providerID, scope)
	if err != nil {
		return 0, nil, err
	}
	latestBySpec := map[string]gocore.MappingSpec{}
	for _, row := range mappings {
		specID := strings.TrimSpace(row.SpecID)
		if specID == "" {
			continue
		}
		current, ok := latestBySpec[specID]
		if !ok || row.Version > current.Version {
			latestBySpec[specID] = row
		}
	}
	items := make([]map[string]any, 0, len(latestBySpec))
	for specID, spec := range latestBySpec {
		if specFilter != "" && !strings.EqualFold(specFilter, specID) {
			continue
		}
		baseline, found := runtime.getSchemaBaseline(providerID, scope, specID)
		items = append(items, workflowSchemaDriftItem(spec, baseline, found))
	}
	sort.SliceStable(items, func(i, j int) bool {
		return strings.TrimSpace(toString(items[i]["spec_id"])) < strings.TrimSpace(toString(items[j]["spec_id"]))
	})
	limit := len(items)
	if limit == 0 {
		limit = 25
	}
	response := newListResponse(items, len(items), limit, 0, map[string]any{
		"provider_id": providerID,
		"scope_type":  scope.Type,
		"scope_id":    scope.ID,
		"spec_id":     specFilter,
	})
	response["drift_items"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleWorkflowSetSchemaDriftBaseline(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	providerID := strings.TrimSpace(firstNonEmptyString(body["provider_id"], c.Query("provider_id")))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	specID := strings.TrimSpace(firstNonEmptyString(body["spec_id"], body["mapping_spec_id"]))
	if specID == "" {
		return 0, nil, validationError("spec_id is required", map[string]any{"field": "spec_id"})
	}
	version := toInt(body["version"], 0)
	var spec gocore.MappingSpec
	if version > 0 {
		row, found, getErr := runtime.mappingLifecycle.GetVersion(c.Context(), providerID, scope, specID, version)
		if getErr != nil {
			return 0, nil, getErr
		}
		if !found {
			return 0, nil, missingResourceError("mapping_spec", map[string]any{"spec_id": specID, "version": version})
		}
		spec = row
	} else {
		row, found, getErr := runtime.mappingLifecycle.GetLatest(c.Context(), providerID, scope, specID)
		if getErr != nil {
			return 0, nil, getErr
		}
		if !found {
			return 0, nil, missingResourceError("mapping_spec", map[string]any{"spec_id": specID})
		}
		spec = row
	}
	schemaRef := strings.TrimSpace(firstNonEmptyString(body["schema_ref"], spec.SchemaRef))
	if schemaRef == "" {
		return 0, nil, validationError("schema_ref is required", map[string]any{"field": "schema_ref"})
	}
	capturedBy := strings.TrimSpace(firstNonEmptyString(body["captured_by"], actorIDFromContext(c.Context())))
	baseline := runtime.upsertSchemaBaseline(workflowSchemaBaseline{
		ProviderID: providerID,
		Scope:      scope,
		SpecID:     specID,
		Version:    spec.Version,
		SchemaRef:  schemaRef,
		CapturedBy: capturedBy,
		Metadata:   extractMetadata(body),
	})
	return http.StatusOK, map[string]any{
		"baseline": workflowSchemaBaselineToMap(baseline),
		"drift":    workflowSchemaDriftItem(spec, baseline, true),
	}, nil
}

func (m *Module) handleWorkflowListConflicts(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	bindingID := strings.TrimSpace(c.Query("sync_binding_id"))
	status := gocore.SyncConflictStatus(strings.TrimSpace(strings.ToLower(c.Query("status"))))
	rows := runtime.listConflicts(providerID, scope, bindingID, status)
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, workflowSyncConflictToMap(row))
	}
	response := newListResponse(items, len(items), len(items), 0, map[string]any{
		"provider_id":     providerID,
		"scope_type":      scope.Type,
		"scope_id":        scope.ID,
		"sync_binding_id": bindingID,
		"status":          string(status),
	})
	response["conflicts"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleWorkflowGetConflict(c router.Context, _ map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	conflictID := routeParam(c, "conflict_id", "id", "ref")
	if conflictID == "" {
		return 0, nil, validationError("conflict_id is required", map[string]any{"field": "conflict_id"})
	}
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	conflict, err := runtime.conflictStore.Get(c.Context(), providerID, scope, conflictID)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"conflict": workflowSyncConflictToMap(conflict)}, nil
}

func (m *Module) handleWorkflowResolveConflict(c router.Context, body map[string]any) (int, any, error) {
	runtime, err := m.requireWorkflowRuntime()
	if err != nil {
		return 0, nil, err
	}
	conflictID := routeParam(c, "conflict_id", "id", "ref")
	if conflictID == "" {
		return 0, nil, validationError("conflict_id is required", map[string]any{"field": "conflict_id"})
	}
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return 0, nil, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	action := gocore.SyncConflictResolutionAction(strings.TrimSpace(strings.ToLower(toString(body["action"]))))
	if !action.IsValid() {
		return 0, nil, validationError("action must be resolve|ignore|retry", map[string]any{"field": "action"})
	}
	resolvedBy := strings.TrimSpace(toString(body["resolved_by"]))
	if resolvedBy == "" {
		resolvedBy = actorIDFromContext(c.Context())
	}
	result, err := runtime.conflicts.ResolveSyncConflict(c.Context(), gocore.ResolveSyncConflictRequest{
		ProviderID: providerID,
		Scope:      scope,
		ConflictID: conflictID,
		Resolution: gocore.SyncConflictResolution{
			Action:     action,
			Patch:      extractMap(body["patch"]),
			Reason:     strings.TrimSpace(toString(body["reason"])),
			ResolvedBy: resolvedBy,
		},
		Metadata: extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"conflict": workflowSyncConflictToMap(result.Conflict)}, nil
}

func (m *Module) handleWorkflowListConnectionCandidates(c router.Context, _ map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Query("provider_id"))
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	scope, err := resolveScope(c.Context(), c, map[string]any{})
	if err != nil {
		return 0, nil, err
	}
	candidates, err := m.workflowConnectionCandidates(c.Context(), providerID, scope)
	if err != nil {
		return 0, nil, err
	}
	items := make([]map[string]any, 0, len(candidates))
	for _, candidate := range candidates {
		items = append(items, candidate)
	}
	response := newListResponse(items, len(items), len(items), 0, map[string]any{
		"provider_id": providerID,
		"scope_type":  scope.Type,
		"scope_id":    scope.ID,
	})
	response["candidates"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleWorkflowInvokeCapability(c router.Context, body map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Param("provider", ""))
	capability := strings.TrimSpace(c.Param("capability", ""))
	if providerID == "" || capability == "" {
		return 0, nil, validationError("provider and capability are required", map[string]any{"field": "provider/capability"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	connectionID := strings.TrimSpace(toString(body["connection_id"]))
	candidates, err := m.workflowConnectionCandidates(c.Context(), providerID, scope)
	if err != nil {
		return 0, nil, err
	}
	if connectionID == "" {
		if len(candidates) > 1 {
			return 0, nil, conflictError("ambiguous connection selection requires explicit connection_id", map[string]any{
				"provider_id":           providerID,
				"scope_type":            scope.Type,
				"scope_id":              scope.ID,
				"candidate_count":       len(candidates),
				"candidate_connections": candidates,
				"remediation":           "set connection_id from candidates",
			})
		}
		if len(candidates) == 1 {
			connectionID = strings.TrimSpace(toString(candidates[0]["connection_id"]))
		}
	}

	result, err := m.service.InvokeCapability(c.Context(), gocore.InvokeCapabilityRequest{
		ProviderID:   providerID,
		Capability:   capability,
		Scope:        scope,
		ConnectionID: connectionID,
		Payload:      extractMap(body["payload"]),
	})
	if err != nil {
		return 0, nil, err
	}
	if !result.Allowed && result.Mode == gocore.CapabilityDeniedBehaviorBlock {
		return 0, nil, goerrorsMissingPermissions(result)
	}
	return http.StatusOK, map[string]any{
		"result":              result,
		"candidate_count":     len(candidates),
		"selected_connection": connectionID,
	}, nil
}

func (m *Module) handleWorkflowCallbackDiagnosticsStatus(c router.Context, _ map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Query("provider_id"))
	flows := []string{"connect", "reconsent"}
	providerChecks := []map[string]any{}
	errorsOut := []map[string]any{}

	providers := []string{}
	if providerID != "" {
		providers = append(providers, providerID)
	} else if m != nil && m.service != nil && m.service.Dependencies().Registry != nil {
		for _, provider := range m.service.Dependencies().Registry.List() {
			if provider == nil {
				continue
			}
			if id := strings.TrimSpace(provider.ID()); id != "" {
				providers = append(providers, id)
			}
		}
	}
	sort.Strings(providers)
	for _, pid := range providers {
		for _, flow := range flows {
			preview := m.workflowPreviewCallbackResolution(c, pid, flow)
			providerChecks = append(providerChecks, preview)
			if ok, _ := preview["ok"].(bool); !ok {
				errorsOut = append(errorsOut, map[string]any{
					"provider_id": pid,
					"flow":        flow,
					"error":       preview["error"],
				})
			}
		}
	}

	status := "ok"
	if len(errorsOut) > 0 {
		status = "degraded"
	}
	resolver := map[string]any{
		"status":                      status,
		"strict":                      m.config.Callbacks.Strict,
		"urlkit_group":                strings.TrimSpace(m.callbackURLRouteGroup()),
		"default_route":               strings.TrimSpace(m.config.Callbacks.DefaultRoute),
		"public_base_url":             strings.TrimSpace(m.config.Callbacks.PublicBaseURL),
		"public_base_url_configured":  strings.TrimSpace(m.config.Callbacks.PublicBaseURL) != "",
		"provider_route_count":        len(m.config.Callbacks.ProviderRoutes),
		"provider_url_override_count": len(m.config.Callbacks.ProviderURLOverrides),
		"checks":                      providerChecks,
		"errors":                      errorsOut,
	}
	return http.StatusOK, map[string]any{"resolver": resolver}, nil
}

func (m *Module) handleWorkflowCallbackDiagnosticsPreview(c router.Context, body map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return 0, nil, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	flow := strings.TrimSpace(strings.ToLower(toString(body["flow"])))
	if flow == "" {
		flow = "connect"
	}
	preview := m.workflowPreviewCallbackResolution(c, providerID, flow)
	return http.StatusOK, map[string]any{"preview": preview}, nil
}

func (m *Module) workflowPreviewCallbackResolution(c router.Context, providerID string, flow string) map[string]any {
	out := map[string]any{
		"provider_id": providerID,
		"flow":        strings.TrimSpace(strings.ToLower(flow)),
	}
	resolved, err := m.resolveCallbackRedirectURI(c, providerID)
	if err != nil {
		out["ok"] = false
		out["error"] = strings.TrimSpace(err.Error())
		out["route"] = m.callbackURLRoute(providerID)
		out["override"] = m.callbackURLOverride(providerID)
		return out
	}
	out["ok"] = true
	out["resolved_url"] = resolved
	out["route"] = m.callbackURLRoute(providerID)
	out["override"] = m.callbackURLOverride(providerID)
	return out
}

func (m *Module) workflowConnectionCandidates(ctx context.Context, providerID string, scope gocore.ScopeRef) ([]map[string]any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return []map[string]any{}, providerUnavailableError("persistence client is not configured", nil)
	}
	rows := []connectionRecord{}
	query := db.NewSelect().Model(&rows).
		Where("provider_id = ?", strings.TrimSpace(providerID)).
		Where("scope_type = ?", strings.TrimSpace(scope.Type)).
		Where("scope_id = ?", strings.TrimSpace(scope.ID)).
		Where("status = ?", string(gocore.ConnectionStatusActive)).
		Order("updated_at DESC")
	if err := query.Scan(ctx); err != nil && !errorsIsNoRows(err) {
		return nil, err
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, map[string]any{
			"connection_id":       strings.TrimSpace(row.ID),
			"provider_id":         strings.TrimSpace(row.ProviderID),
			"scope_type":          strings.TrimSpace(row.ScopeType),
			"scope_id":            strings.TrimSpace(row.ScopeID),
			"external_account_id": strings.TrimSpace(row.ExternalAccountID),
			"status":              strings.TrimSpace(row.Status),
			"updated_at":          row.UpdatedAt,
		})
	}
	return out, nil
}

func (m *Module) requireWorkflowRuntime() (*workflowRuntime, error) {
	if m == nil || m.workflowRuntime == nil {
		return nil, providerUnavailableError("workflow runtime is not configured", nil)
	}
	return m.workflowRuntime, nil
}

func (m *Module) workflowMappingSpecFromBody(c router.Context, body map[string]any, forcedSpecID string) (gocore.MappingSpec, string, gocore.ScopeRef, error) {
	payload := struct {
		SpecID       string               `json:"spec_id"`
		ProviderID   string               `json:"provider_id"`
		Name         string               `json:"name"`
		Description  string               `json:"description"`
		SourceObject string               `json:"source_object"`
		TargetModel  string               `json:"target_model"`
		SchemaRef    string               `json:"schema_ref"`
		Version      int                  `json:"version"`
		Rules        []gocore.MappingRule `json:"rules"`
		Metadata     map[string]any       `json:"metadata"`
	}{}
	if err := decodeBodyMap(body, &payload); err != nil {
		return gocore.MappingSpec{}, "", gocore.ScopeRef{}, validationError("invalid mapping payload", map[string]any{"field": "body"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return gocore.MappingSpec{}, "", gocore.ScopeRef{}, err
	}
	providerID := strings.TrimSpace(payload.ProviderID)
	if providerID == "" {
		providerID = strings.TrimSpace(c.Query("provider_id"))
	}
	if providerID == "" {
		return gocore.MappingSpec{}, "", gocore.ScopeRef{}, validationError("provider_id is required", map[string]any{"field": "provider_id"})
	}
	providerID, scope, err = workflowProviderScope(providerID, scope)
	if err != nil {
		return gocore.MappingSpec{}, "", gocore.ScopeRef{}, validationError(err.Error(), map[string]any{"field": "provider_id/scope"})
	}
	specID := strings.TrimSpace(payload.SpecID)
	if specID == "" {
		specID = strings.TrimSpace(forcedSpecID)
	}
	if specID == "" {
		return gocore.MappingSpec{}, "", gocore.ScopeRef{}, validationError("spec_id is required", map[string]any{"field": "spec_id"})
	}
	spec := gocore.MappingSpec{
		SpecID:       specID,
		ProviderID:   providerID,
		Scope:        scope,
		Name:         strings.TrimSpace(payload.Name),
		Description:  strings.TrimSpace(payload.Description),
		SourceObject: strings.TrimSpace(payload.SourceObject),
		TargetModel:  strings.TrimSpace(payload.TargetModel),
		SchemaRef:    strings.TrimSpace(payload.SchemaRef),
		Version:      payload.Version,
		Status:       gocore.MappingSpecStatusDraft,
		Rules:        workflowMappingRulesFromAny(body["rules"]),
		Metadata:     copyAnyMap(payload.Metadata),
	}
	return spec, providerID, scope, nil
}

func decodeBodyMap(body map[string]any, out any) error {
	raw := toBytesJSON(body)
	if len(raw) == 0 {
		raw = []byte("{}")
	}
	return json.Unmarshal(raw, out)
}

func workflowMappingSpecToMap(spec gocore.MappingSpec) map[string]any {
	return map[string]any{
		"id":            strings.TrimSpace(spec.ID),
		"spec_id":       strings.TrimSpace(spec.SpecID),
		"provider_id":   strings.TrimSpace(spec.ProviderID),
		"scope_type":    strings.TrimSpace(spec.Scope.Type),
		"scope_id":      strings.TrimSpace(spec.Scope.ID),
		"name":          strings.TrimSpace(spec.Name),
		"description":   strings.TrimSpace(spec.Description),
		"source_object": strings.TrimSpace(spec.SourceObject),
		"target_model":  strings.TrimSpace(spec.TargetModel),
		"schema_ref":    strings.TrimSpace(spec.SchemaRef),
		"version":       spec.Version,
		"status":        strings.TrimSpace(string(spec.Status)),
		"rules":         spec.Rules,
		"metadata":      copyAnyMap(spec.Metadata),
		"created_at":    spec.CreatedAt,
		"updated_at":    spec.UpdatedAt,
		"published_at":  spec.PublishedAt,
	}
}

func workflowValidationToMap(result gocore.ValidateMappingSpecResult) map[string]any {
	return map[string]any{
		"valid":           result.Valid,
		"issues":          result.Issues,
		"normalized_spec": workflowMappingSpecToMap(result.NormalizedSpec),
		"compiled": map[string]any{
			"spec_id":            strings.TrimSpace(result.Compiled.SpecID),
			"version":            result.Compiled.Version,
			"source_object":      strings.TrimSpace(result.Compiled.SourceObject),
			"deterministic_hash": strings.TrimSpace(result.Compiled.DeterministicHash),
			"rules":              result.Compiled.Rules,
		},
	}
}

func workflowPreviewToMap(result gocore.PreviewMappingSpecResult) map[string]any {
	return map[string]any{
		"issues":             result.Issues,
		"records":            result.Records,
		"report":             result.Report,
		"deterministic_hash": strings.TrimSpace(result.DeterministicHash),
		"generated_at":       result.GeneratedAt,
	}
}

func workflowSyncBindingToMap(binding gocore.SyncBinding) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(binding.ID),
		"provider_id":     strings.TrimSpace(binding.ProviderID),
		"scope_type":      strings.TrimSpace(binding.Scope.Type),
		"scope_id":        strings.TrimSpace(binding.Scope.ID),
		"connection_id":   strings.TrimSpace(binding.ConnectionID),
		"mapping_spec_id": strings.TrimSpace(binding.MappingSpecID),
		"source_object":   strings.TrimSpace(binding.SourceObject),
		"target_model":    strings.TrimSpace(binding.TargetModel),
		"direction":       strings.TrimSpace(string(binding.Direction)),
		"status":          strings.TrimSpace(string(binding.Status)),
		"metadata":        copyAnyMap(binding.Metadata),
		"created_at":      binding.CreatedAt,
		"updated_at":      binding.UpdatedAt,
	}
}

func workflowSyncCheckpointToMap(checkpoint gocore.SyncCheckpoint) map[string]any {
	return map[string]any{
		"id":               strings.TrimSpace(checkpoint.ID),
		"provider_id":      strings.TrimSpace(checkpoint.ProviderID),
		"scope_type":       strings.TrimSpace(checkpoint.Scope.Type),
		"scope_id":         strings.TrimSpace(checkpoint.Scope.ID),
		"connection_id":    strings.TrimSpace(checkpoint.ConnectionID),
		"sync_binding_id":  strings.TrimSpace(checkpoint.SyncBindingID),
		"direction":        strings.TrimSpace(string(checkpoint.Direction)),
		"cursor":           strings.TrimSpace(checkpoint.Cursor),
		"sequence":         checkpoint.Sequence,
		"source_version":   strings.TrimSpace(checkpoint.SourceVersion),
		"idempotency_seed": strings.TrimSpace(checkpoint.IdempotencySeed),
		"metadata":         copyAnyMap(checkpoint.Metadata),
		"last_event_at":    checkpoint.LastEventAt,
		"created_at":       checkpoint.CreatedAt,
		"updated_at":       checkpoint.UpdatedAt,
	}
}

func workflowSyncRunRecordToMap(record workflowSyncRunRecord) map[string]any {
	return map[string]any{
		"run_id":             strings.TrimSpace(record.RunID),
		"provider_id":        strings.TrimSpace(record.ProviderID),
		"scope_type":         strings.TrimSpace(record.Scope.Type),
		"scope_id":           strings.TrimSpace(record.Scope.ID),
		"sync_binding_id":    strings.TrimSpace(record.SyncBindingID),
		"mode":               strings.TrimSpace(string(record.Mode)),
		"direction":          strings.TrimSpace(string(record.Direction)),
		"status":             strings.TrimSpace(string(record.Result.Status)),
		"plan":               workflowSyncRunPlanToMap(record.Plan),
		"result":             workflowSyncRunResultToMap(record.Result),
		"recorded_conflicts": copyMapSlice(record.RecordedConflicts),
		"created_at":         record.CreatedAt,
		"updated_at":         record.UpdatedAt,
	}
}

func workflowSchemaBaselineToMap(baseline workflowSchemaBaseline) map[string]any {
	return map[string]any{
		"id":          strings.TrimSpace(baseline.ID),
		"provider_id": strings.TrimSpace(baseline.ProviderID),
		"scope_type":  strings.TrimSpace(baseline.Scope.Type),
		"scope_id":    strings.TrimSpace(baseline.Scope.ID),
		"spec_id":     strings.TrimSpace(baseline.SpecID),
		"version":     baseline.Version,
		"schema_ref":  strings.TrimSpace(baseline.SchemaRef),
		"captured_by": strings.TrimSpace(baseline.CapturedBy),
		"metadata":    copyAnyMap(baseline.Metadata),
		"captured_at": baseline.CapturedAt,
		"updated_at":  baseline.UpdatedAt,
	}
}

func workflowSchemaDriftItem(spec gocore.MappingSpec, baseline workflowSchemaBaseline, baselineFound bool) map[string]any {
	mappingSchemaRef := strings.TrimSpace(spec.SchemaRef)
	baselineSchemaRef := strings.TrimSpace(baseline.SchemaRef)
	driftDetected := false
	status := "baseline_missing"
	if baselineFound {
		status = "in_sync"
		if mappingSchemaRef != "" && baselineSchemaRef != "" && !strings.EqualFold(mappingSchemaRef, baselineSchemaRef) {
			status = "drift_detected"
			driftDetected = true
		}
	}
	return map[string]any{
		"spec_id":             strings.TrimSpace(spec.SpecID),
		"provider_id":         strings.TrimSpace(spec.ProviderID),
		"scope_type":          strings.TrimSpace(spec.Scope.Type),
		"scope_id":            strings.TrimSpace(spec.Scope.ID),
		"mapping_version":     spec.Version,
		"mapping_schema_ref":  mappingSchemaRef,
		"baseline_found":      baselineFound,
		"baseline_version":    baseline.Version,
		"baseline_schema_ref": baselineSchemaRef,
		"baseline_captured_at": func() any {
			if baselineFound {
				return baseline.CapturedAt
			}
			return nil
		}(),
		"status":         status,
		"drift_detected": driftDetected,
	}
}

func workflowSyncRunPlanToMap(plan gocore.SyncRunPlan) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(plan.ID),
		"binding_id":         strings.TrimSpace(plan.BindingID),
		"mode":               strings.TrimSpace(string(plan.Mode)),
		"estimated_changes":  plan.EstimatedChanges,
		"idempotency_seed":   strings.TrimSpace(plan.IdempotencySeed),
		"deterministic_hash": strings.TrimSpace(plan.DeterministicHash),
		"metadata":           copyAnyMap(plan.Metadata),
		"generated_at":       plan.GeneratedAt,
		"checkpoint":         workflowSyncCheckpointToMap(plan.Checkpoint),
	}
}

func workflowSyncRunResultToMap(result gocore.SyncRunResult) map[string]any {
	payload := map[string]any{
		"run_id":          strings.TrimSpace(result.RunID),
		"status":          strings.TrimSpace(string(result.Status)),
		"processed_count": result.ProcessedCount,
		"skipped_count":   result.SkippedCount,
		"conflict_count":  result.ConflictCount,
		"failed_count":    result.FailedCount,
		"metadata":        copyAnyMap(result.Metadata),
		"next_checkpoint": nil,
	}
	if result.NextCheckpoint != nil {
		payload["next_checkpoint"] = workflowSyncCheckpointToMap(*result.NextCheckpoint)
	}
	return payload
}

func workflowSyncConflictToMap(conflict gocore.SyncConflict) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(conflict.ID),
		"provider_id":     strings.TrimSpace(conflict.ProviderID),
		"scope_type":      strings.TrimSpace(conflict.Scope.Type),
		"scope_id":        strings.TrimSpace(conflict.Scope.ID),
		"connection_id":   strings.TrimSpace(conflict.ConnectionID),
		"sync_binding_id": strings.TrimSpace(conflict.SyncBindingID),
		"checkpoint_id":   strings.TrimSpace(conflict.CheckpointID),
		"source_object":   strings.TrimSpace(conflict.SourceObject),
		"external_id":     strings.TrimSpace(conflict.ExternalID),
		"source_version":  strings.TrimSpace(conflict.SourceVersion),
		"idempotency_key": strings.TrimSpace(conflict.IdempotencyKey),
		"policy":          strings.TrimSpace(conflict.Policy),
		"reason":          strings.TrimSpace(conflict.Reason),
		"status":          strings.TrimSpace(string(conflict.Status)),
		"source_payload":  copyAnyMap(conflict.SourcePayload),
		"target_payload":  copyAnyMap(conflict.TargetPayload),
		"resolution":      copyAnyMap(conflict.Resolution),
		"resolved_by":     strings.TrimSpace(conflict.ResolvedBy),
		"resolved_at":     conflict.ResolvedAt,
		"metadata":        copyAnyMap(conflict.Metadata),
		"created_at":      conflict.CreatedAt,
		"updated_at":      conflict.UpdatedAt,
	}
}

func workflowSyncBindingFromMap(raw map[string]any, fallback gocore.SyncBinding) gocore.SyncBinding {
	binding := fallback
	if raw == nil {
		return binding
	}
	binding.ID = strings.TrimSpace(firstNonEmptyString(raw["id"], raw["binding_id"], raw["bindingID"], binding.ID))
	binding.ProviderID = strings.TrimSpace(firstNonEmptyString(raw["provider_id"], raw["providerID"], binding.ProviderID))
	binding.Scope = workflowScopeFromMap(raw, binding.Scope)
	if scopeRaw, ok := raw["scope"].(map[string]any); ok {
		binding.Scope = workflowScopeFromMap(scopeRaw, binding.Scope)
	}
	binding.ConnectionID = strings.TrimSpace(firstNonEmptyString(raw["connection_id"], raw["connectionID"], binding.ConnectionID))
	binding.MappingSpecID = strings.TrimSpace(firstNonEmptyString(raw["mapping_spec_id"], raw["mappingSpecID"], binding.MappingSpecID))
	binding.SourceObject = strings.TrimSpace(firstNonEmptyString(raw["source_object"], raw["sourceObject"], binding.SourceObject))
	binding.TargetModel = strings.TrimSpace(firstNonEmptyString(raw["target_model"], raw["targetModel"], binding.TargetModel))
	if direction := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["direction"], binding.Direction))); direction != "" {
		binding.Direction = gocore.SyncDirection(direction)
	}
	if status := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["status"], binding.Status))); status != "" {
		binding.Status = gocore.SyncBindingStatus(status)
	}
	if metadata := extractMap(raw["metadata"]); len(metadata) > 0 {
		binding.Metadata = metadata
	}
	return binding
}

func workflowSyncRunPlanFromMap(raw map[string]any, fallback gocore.SyncRunPlan) gocore.SyncRunPlan {
	plan := fallback
	if raw == nil {
		return plan
	}
	plan.ID = strings.TrimSpace(firstNonEmptyString(raw["id"], plan.ID))
	plan.BindingID = strings.TrimSpace(firstNonEmptyString(raw["binding_id"], raw["bindingID"], plan.BindingID))
	plan.Mode = workflowNormalizeSyncRunMode(firstNonEmptyString(raw["mode"], plan.Mode), plan.Mode)
	if checkpointRaw, ok := raw["checkpoint"].(map[string]any); ok {
		plan.Checkpoint = workflowSyncCheckpointFromMap(checkpointRaw, plan.Checkpoint)
	}
	if estimated := toInt(raw["estimated_changes"], plan.EstimatedChanges); estimated > 0 {
		plan.EstimatedChanges = estimated
	}
	plan.IdempotencySeed = strings.TrimSpace(firstNonEmptyString(raw["idempotency_seed"], raw["idempotencySeed"], plan.IdempotencySeed))
	plan.DeterministicHash = strings.TrimSpace(firstNonEmptyString(raw["deterministic_hash"], raw["deterministicHash"], plan.DeterministicHash))
	if metadata := extractMap(raw["metadata"]); len(metadata) > 0 {
		plan.Metadata = metadata
	}
	return plan
}

func workflowSyncCheckpointFromMap(raw map[string]any, fallback gocore.SyncCheckpoint) gocore.SyncCheckpoint {
	checkpoint := fallback
	if raw == nil {
		return checkpoint
	}
	checkpoint.ID = strings.TrimSpace(firstNonEmptyString(raw["id"], checkpoint.ID))
	checkpoint.ProviderID = strings.TrimSpace(firstNonEmptyString(raw["provider_id"], raw["providerID"], checkpoint.ProviderID))
	checkpoint.Scope = workflowScopeFromMap(raw, checkpoint.Scope)
	if scopeRaw, ok := raw["scope"].(map[string]any); ok {
		checkpoint.Scope = workflowScopeFromMap(scopeRaw, checkpoint.Scope)
	}
	checkpoint.ConnectionID = strings.TrimSpace(firstNonEmptyString(raw["connection_id"], raw["connectionID"], checkpoint.ConnectionID))
	checkpoint.SyncBindingID = strings.TrimSpace(firstNonEmptyString(raw["sync_binding_id"], raw["syncBindingID"], checkpoint.SyncBindingID))
	if direction := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["direction"], checkpoint.Direction))); direction != "" {
		checkpoint.Direction = gocore.SyncDirection(direction)
	}
	checkpoint.Cursor = strings.TrimSpace(firstNonEmptyString(raw["cursor"], checkpoint.Cursor))
	if sequence := toInt(raw["sequence"], int(checkpoint.Sequence)); sequence >= 0 {
		checkpoint.Sequence = int64(sequence)
	}
	checkpoint.SourceVersion = strings.TrimSpace(firstNonEmptyString(raw["source_version"], raw["sourceVersion"], checkpoint.SourceVersion))
	checkpoint.IdempotencySeed = strings.TrimSpace(firstNonEmptyString(raw["idempotency_seed"], raw["idempotencySeed"], checkpoint.IdempotencySeed))
	if metadata := extractMap(raw["metadata"]); len(metadata) > 0 {
		checkpoint.Metadata = metadata
	}
	return checkpoint
}

func workflowSyncChangesFromAny(values []any) []gocore.SyncChange {
	changes := make([]gocore.SyncChange, 0, len(values))
	for _, value := range values {
		row, ok := value.(map[string]any)
		if !ok {
			continue
		}
		changes = append(changes, gocore.SyncChange{
			SourceObject:  strings.TrimSpace(firstNonEmptyString(row["source_object"], row["sourceObject"])),
			ExternalID:    strings.TrimSpace(firstNonEmptyString(row["external_id"], row["externalID"])),
			SourceVersion: strings.TrimSpace(firstNonEmptyString(row["source_version"], row["sourceVersion"])),
			Payload:       extractMap(row["payload"]),
			Metadata:      extractMap(row["metadata"]),
		})
	}
	return changes
}

func workflowSyncConflictsFromAny(values []any) []gocore.SyncConflict {
	conflicts := make([]gocore.SyncConflict, 0, len(values))
	for _, value := range values {
		row, ok := value.(map[string]any)
		if !ok {
			continue
		}
		conflict := gocore.SyncConflict{
			ID:             strings.TrimSpace(firstNonEmptyString(row["id"])),
			ProviderID:     strings.TrimSpace(firstNonEmptyString(row["provider_id"], row["providerID"])),
			Scope:          workflowScopeFromMap(row, gocore.ScopeRef{}),
			ConnectionID:   strings.TrimSpace(firstNonEmptyString(row["connection_id"], row["connectionID"])),
			SyncBindingID:  strings.TrimSpace(firstNonEmptyString(row["sync_binding_id"], row["syncBindingID"])),
			CheckpointID:   strings.TrimSpace(firstNonEmptyString(row["checkpoint_id"], row["checkpointID"])),
			SourceObject:   strings.TrimSpace(firstNonEmptyString(row["source_object"], row["sourceObject"])),
			ExternalID:     strings.TrimSpace(firstNonEmptyString(row["external_id"], row["externalID"])),
			SourceVersion:  strings.TrimSpace(firstNonEmptyString(row["source_version"], row["sourceVersion"])),
			IdempotencyKey: strings.TrimSpace(firstNonEmptyString(row["idempotency_key"], row["idempotencyKey"])),
			Policy:         strings.TrimSpace(firstNonEmptyString(row["policy"])),
			Reason:         strings.TrimSpace(firstNonEmptyString(row["reason"])),
			SourcePayload:  extractMap(row["source_payload"]),
			TargetPayload:  extractMap(row["target_payload"]),
			Resolution:     extractMap(row["resolution"]),
			ResolvedBy:     strings.TrimSpace(firstNonEmptyString(row["resolved_by"], row["resolvedBy"])),
			Metadata:       extractMap(row["metadata"]),
		}
		if scopeRaw, ok := row["scope"].(map[string]any); ok {
			conflict.Scope = workflowScopeFromMap(scopeRaw, conflict.Scope)
		}
		if status := strings.TrimSpace(strings.ToLower(firstNonEmptyString(row["status"]))); status != "" {
			conflict.Status = gocore.SyncConflictStatus(status)
		}
		conflicts = append(conflicts, conflict)
	}
	return conflicts
}

func workflowScopeFromMap(raw map[string]any, fallback gocore.ScopeRef) gocore.ScopeRef {
	scope := fallback
	if raw == nil {
		return scope
	}
	if scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["scope_type"], raw["scopeType"]))); scopeType != "" {
		scope.Type = scopeType
	}
	if scopeID := strings.TrimSpace(firstNonEmptyString(raw["scope_id"], raw["scopeID"])); scopeID != "" {
		scope.ID = scopeID
	}
	if scopeRaw, ok := raw["scope"].(map[string]any); ok {
		if scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(scopeRaw["type"], scopeRaw["scope_type"], scope.Type))); scopeType != "" {
			scope.Type = scopeType
		}
		if scopeID := strings.TrimSpace(firstNonEmptyString(scopeRaw["id"], scopeRaw["scope_id"], scope.ID)); scopeID != "" {
			scope.ID = scopeID
		}
	}
	return scope
}

func workflowNormalizeSyncRunMode(raw string, fallback gocore.SyncRunMode) gocore.SyncRunMode {
	mode := strings.TrimSpace(strings.ToLower(raw))
	switch mode {
	case "":
		return fallback
	case "plan":
		return gocore.SyncRunModeDryRun
	default:
		return gocore.SyncRunMode(mode)
	}
}

func workflowNormalizeValidateMappingRequest(body map[string]any, request gocore.ValidateMappingSpecRequest) gocore.ValidateMappingSpecRequest {
	if rawSpec, ok := body["spec"].(map[string]any); ok {
		request.Spec = workflowMappingSpecFromMap(rawSpec, request.Spec)
	}
	if rawSchema, ok := body["schema"].(map[string]any); ok {
		request.Schema = workflowExternalSchemaFromMap(rawSchema, request.Schema)
	}
	return request
}

func workflowNormalizePreviewMappingRequest(body map[string]any, request gocore.PreviewMappingSpecRequest) gocore.PreviewMappingSpecRequest {
	if rawSpec, ok := body["spec"].(map[string]any); ok {
		request.Spec = workflowMappingSpecFromMap(rawSpec, request.Spec)
	}
	if rawSchema, ok := body["schema"].(map[string]any); ok {
		request.Schema = workflowExternalSchemaFromMap(rawSchema, request.Schema)
	}
	if samples, ok := body["samples"].([]any); ok {
		rows := make([]map[string]any, 0, len(samples))
		for _, row := range samples {
			if typed, ok := row.(map[string]any); ok {
				rows = append(rows, copyAnyMap(typed))
			}
		}
		request.Samples = rows
	}
	return request
}

func workflowMappingSpecFromMap(raw map[string]any, fallback gocore.MappingSpec) gocore.MappingSpec {
	spec := fallback
	if raw == nil {
		return spec
	}
	spec.SpecID = strings.TrimSpace(firstNonEmptyString(raw["spec_id"], raw["specID"], raw["id"], spec.SpecID))
	spec.ProviderID = strings.TrimSpace(firstNonEmptyString(raw["provider_id"], raw["providerID"], spec.ProviderID))
	spec.Name = strings.TrimSpace(firstNonEmptyString(raw["name"], spec.Name))
	spec.Description = strings.TrimSpace(firstNonEmptyString(raw["description"], spec.Description))
	spec.SourceObject = strings.TrimSpace(firstNonEmptyString(raw["source_object"], raw["sourceObject"], spec.SourceObject))
	spec.TargetModel = strings.TrimSpace(firstNonEmptyString(raw["target_model"], raw["targetModel"], spec.TargetModel))
	spec.SchemaRef = strings.TrimSpace(firstNonEmptyString(raw["schema_ref"], raw["schemaRef"], spec.SchemaRef))
	if version := toInt(raw["version"], 0); version > 0 {
		spec.Version = version
	}
	if status := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["status"]))); status != "" {
		spec.Status = gocore.MappingSpecStatus(status)
	}
	if scopeRaw, ok := raw["scope"].(map[string]any); ok {
		scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(scopeRaw["type"], scopeRaw["scope_type"], spec.Scope.Type)))
		scopeID := strings.TrimSpace(firstNonEmptyString(scopeRaw["id"], scopeRaw["scope_id"], spec.Scope.ID))
		if scopeType != "" || scopeID != "" {
			spec.Scope = gocore.ScopeRef{Type: scopeType, ID: scopeID}
		}
	}
	if scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["scope_type"], raw["scopeType"]))); scopeType != "" {
		spec.Scope.Type = scopeType
	}
	if scopeID := strings.TrimSpace(firstNonEmptyString(raw["scope_id"], raw["scopeID"])); scopeID != "" {
		spec.Scope.ID = scopeID
	}
	spec.Rules = workflowMappingRulesFromAny(raw["rules"])
	spec.Metadata = copyAnyMap(extractMap(raw["metadata"]))
	return spec
}

func workflowExternalSchemaFromMap(raw map[string]any, fallback gocore.ExternalSchema) gocore.ExternalSchema {
	schema := fallback
	if raw == nil {
		return schema
	}
	schema.ProviderID = strings.TrimSpace(firstNonEmptyString(raw["provider_id"], raw["providerID"], schema.ProviderID))
	schema.Name = strings.TrimSpace(firstNonEmptyString(raw["name"], schema.Name))
	schema.ID = strings.TrimSpace(firstNonEmptyString(raw["id"], schema.ID))
	schema.Version = strings.TrimSpace(firstNonEmptyString(raw["version"], schema.Version))
	if scopeRaw, ok := raw["scope"].(map[string]any); ok {
		scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(scopeRaw["type"], scopeRaw["scope_type"], schema.Scope.Type)))
		scopeID := strings.TrimSpace(firstNonEmptyString(scopeRaw["id"], scopeRaw["scope_id"], schema.Scope.ID))
		if scopeType != "" || scopeID != "" {
			schema.Scope = gocore.ScopeRef{Type: scopeType, ID: scopeID}
		}
	}
	if scopeType := strings.TrimSpace(strings.ToLower(firstNonEmptyString(raw["scope_type"], raw["scopeType"]))); scopeType != "" {
		schema.Scope.Type = scopeType
	}
	if scopeID := strings.TrimSpace(firstNonEmptyString(raw["scope_id"], raw["scopeID"])); scopeID != "" {
		schema.Scope.ID = scopeID
	}
	objects := []gocore.ExternalObjectSchema{}
	if rawObjects, ok := raw["objects"].([]any); ok {
		for _, objectRaw := range rawObjects {
			objectMap, ok := objectRaw.(map[string]any)
			if !ok {
				continue
			}
			object := gocore.ExternalObjectSchema{
				Name: strings.TrimSpace(firstNonEmptyString(objectMap["name"])),
			}
			object.PrimaryKey = toStringSlice(objectMap["primary_key"])
			fields := []gocore.ExternalField{}
			if rawFields, ok := objectMap["fields"].([]any); ok {
				for _, fieldRaw := range rawFields {
					fieldMap, ok := fieldRaw.(map[string]any)
					if !ok {
						continue
					}
					field := gocore.ExternalField{
						Path:       strings.TrimSpace(firstNonEmptyString(fieldMap["path"])),
						Type:       strings.TrimSpace(firstNonEmptyString(fieldMap["type"])),
						Required:   toBool(fieldMap["required"], false),
						Repeatable: toBool(fieldMap["repeatable"], false),
						Format:     strings.TrimSpace(firstNonEmptyString(fieldMap["format"])),
					}
					field.Constraints = extractMap(fieldMap["constraints"])
					field.Metadata = extractMap(fieldMap["metadata"])
					fields = append(fields, field)
				}
			}
			object.Fields = fields
			object.Metadata = extractMap(objectMap["metadata"])
			objects = append(objects, object)
		}
	}
	schema.Objects = objects
	schema.Metadata = extractMap(raw["metadata"])
	return schema
}

func workflowMappingRulesFromAny(value any) []gocore.MappingRule {
	rules := []gocore.MappingRule{}
	rows, ok := value.([]any)
	if !ok {
		if typed, ok := value.([]map[string]any); ok {
			rows = make([]any, 0, len(typed))
			for _, row := range typed {
				rows = append(rows, row)
			}
		}
	}
	for _, row := range rows {
		ruleMap, ok := row.(map[string]any)
		if !ok {
			continue
		}
		rule := gocore.MappingRule{
			ID:          strings.TrimSpace(firstNonEmptyString(ruleMap["id"])),
			SourcePath:  strings.TrimSpace(firstNonEmptyString(ruleMap["source_path"], ruleMap["sourcePath"])),
			TargetPath:  strings.TrimSpace(firstNonEmptyString(ruleMap["target_path"], ruleMap["targetPath"])),
			Transform:   workflowNormalizeTransformAlias(firstNonEmptyString(ruleMap["transform"])),
			Required:    toBool(ruleMap["required"], false),
			Default:     ruleMap["default"],
			Constraints: extractMap(ruleMap["constraints"]),
			Metadata:    extractMap(ruleMap["metadata"]),
		}
		rules = append(rules, rule)
	}
	return rules
}

func workflowNormalizeTransformAlias(value string) string {
	transform := strings.TrimSpace(strings.ToLower(value))
	switch transform {
	case "string", "text", "to_text", "cast_string":
		return "to_string"
	case "int", "integer", "to_integer", "cast_int":
		return "to_int"
	case "float", "double", "decimal", "number", "to_number", "cast_float":
		return "to_float"
	case "bool", "boolean", "to_boolean", "cast_bool":
		return "to_bool"
	default:
		return transform
	}
}

func firstNonEmptyString(values ...any) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(toString(value)); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
