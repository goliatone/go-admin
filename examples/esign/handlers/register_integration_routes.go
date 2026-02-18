package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

func registerIntegrationRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.integration != nil {
		adminRoutes.Get(routes.AdminIntegrationMappings, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			records, err := cfg.integration.ListMappingSpecs(c.Context(), cfg.resolveScope(c), strings.TrimSpace(c.Query("provider")))
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "unable to list integration mappings", nil)
			}
			rows := make([]map[string]any, 0, len(records))
			for _, record := range records {
				rows = append(rows, mappingSpecRecordToMap(record))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":   "ok",
				"mappings": rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminIntegrationMappings, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Header("Idempotency-Key"), "integration_mapping_compile")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "integration_mapping_compile", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			var payload struct {
				ID              string                `json:"id"`
				Provider        string                `json:"provider"`
				Name            string                `json:"name"`
				Version         int64                 `json:"version"`
				Status          string                `json:"status"`
				ExternalSchema  stores.ExternalSchema `json:"external_schema"`
				Rules           []stores.MappingRule  `json:"rules"`
				CreatedByUserID string                `json:"created_by_user_id"`
				UpdatedByUserID string                `json:"updated_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				logAPIOperation(c.Context(), "integration_mapping_compile", correlationID, startedAt, err, nil)
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "invalid integration mapping payload", nil)
			}
			compiled, err := cfg.integration.ValidateAndCompileMapping(c.Context(), cfg.resolveScope(c), services.MappingCompileInput{
				ID:              strings.TrimSpace(payload.ID),
				Provider:        strings.TrimSpace(payload.Provider),
				Name:            strings.TrimSpace(payload.Name),
				Version:         payload.Version,
				Status:          strings.TrimSpace(payload.Status),
				ExternalSchema:  payload.ExternalSchema,
				Rules:           payload.Rules,
				CreatedByUserID: strings.TrimSpace(payload.CreatedByUserID),
				UpdatedByUserID: strings.TrimSpace(payload.UpdatedByUserID),
			})
			if err != nil {
				logAPIOperation(c.Context(), "integration_mapping_compile", correlationID, startedAt, err, nil)
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "unable to compile integration mapping", nil)
			}
			respErr := c.JSON(http.StatusOK, map[string]any{
				"status":         "ok",
				"mapping":        mappingSpecRecordToMap(compiled.Spec),
				"canonical_json": compiled.CanonicalJSON,
				"compiled_hash":  compiled.Hash,
				"warnings":       compiled.Warnings,
			})
			logAPIOperation(c.Context(), "integration_mapping_compile", correlationID, startedAt, respErr, map[string]any{
				"mapping_id": compiled.Spec.ID,
				"provider":   compiled.Spec.Provider,
				"name":       compiled.Spec.Name,
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminIntegrationMapping, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			id := strings.TrimSpace(c.Param("mapping_id"))
			if id == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "mapping_id is required", nil)
			}
			record, err := cfg.integration.GetMappingSpec(c.Context(), cfg.resolveScope(c), id)
			if err != nil {
				return writeAPIError(c, err, http.StatusNotFound, string(services.ErrorCodeIntegrationMapping), "integration mapping not found", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":  "ok",
				"mapping": mappingSpecRecordToMap(record),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Put(routes.AdminIntegrationMapping, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			id := strings.TrimSpace(c.Param("mapping_id"))
			if id == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "mapping_id is required", nil)
			}
			var payload struct {
				Provider        string                `json:"provider"`
				Name            string                `json:"name"`
				Version         int64                 `json:"version"`
				Status          string                `json:"status"`
				ExternalSchema  stores.ExternalSchema `json:"external_schema"`
				Rules           []stores.MappingRule  `json:"rules"`
				UpdatedByUserID string                `json:"updated_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "invalid integration mapping payload", nil)
			}
			compiled, err := cfg.integration.ValidateAndCompileMapping(c.Context(), cfg.resolveScope(c), services.MappingCompileInput{
				ID:              id,
				Provider:        strings.TrimSpace(payload.Provider),
				Name:            strings.TrimSpace(payload.Name),
				Version:         payload.Version,
				Status:          strings.TrimSpace(payload.Status),
				ExternalSchema:  payload.ExternalSchema,
				Rules:           payload.Rules,
				UpdatedByUserID: strings.TrimSpace(payload.UpdatedByUserID),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "unable to compile integration mapping", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":        "ok",
				"mapping":       mappingSpecRecordToMap(compiled.Spec),
				"compiled_hash": compiled.Hash,
				"warnings":      compiled.Warnings,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminIntegrationMapPublish, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			id := strings.TrimSpace(c.Param("mapping_id"))
			if id == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "mapping_id is required", nil)
			}
			var payload struct {
				ExpectedVersion int64 `json:"expected_version"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationMapping), "invalid publish payload", nil)
			}
			record, err := cfg.integration.PublishMappingSpec(c.Context(), cfg.resolveScope(c), id, payload.ExpectedVersion)
			if err != nil {
				return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeIntegrationMapping), "unable to publish mapping spec", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":  "ok",
				"mapping": mappingSpecRecordToMap(record),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminIntegrationSyncRuns, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runs, err := cfg.integration.ListSyncRuns(c.Context(), cfg.resolveScope(c), strings.TrimSpace(c.Query("provider")))
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to list sync runs", nil)
			}
			rows := make([]map[string]any, 0, len(runs))
			for _, run := range runs {
				rows = append(rows, integrationSyncRunRecordToMap(run))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"runs":   rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminIntegrationSyncRuns, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			var payload struct {
				Provider        string `json:"provider"`
				Direction       string `json:"direction"`
				MappingSpecID   string `json:"mapping_spec_id"`
				Cursor          string `json:"cursor"`
				CreatedByUserID string `json:"created_by_user_id"`
				IdempotencyKey  string `json:"idempotency_key"`
			}
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid sync run payload"); err != nil {
				return err
			}
			run, replay, err := cfg.integration.StartSyncRun(c.Context(), cfg.resolveScope(c), services.StartSyncRunInput{
				Provider:        strings.TrimSpace(payload.Provider),
				Direction:       strings.TrimSpace(payload.Direction),
				MappingSpecID:   strings.TrimSpace(payload.MappingSpecID),
				Cursor:          strings.TrimSpace(payload.Cursor),
				CreatedByUserID: strings.TrimSpace(payload.CreatedByUserID),
				IdempotencyKey:  firstNonEmpty(strings.TrimSpace(payload.IdempotencyKey), strings.TrimSpace(c.Header("Idempotency-Key"))),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to start sync run", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"replay": replay,
				"run":    integrationSyncRunRecordToMap(run),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminIntegrationSyncRun, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Param("run_id"))
			if runID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "run_id is required", nil)
			}
			run, err := cfg.integration.GetSyncRun(c.Context(), cfg.resolveScope(c), runID)
			if err != nil {
				return writeAPIError(c, err, http.StatusNotFound, string(services.ErrorCodeInvalidSignerState), "sync run not found", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"run":    integrationSyncRunRecordToMap(run),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminIntegrationCheckpoints, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Param("run_id"))
			if runID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "run_id is required", nil)
			}
			var payload struct {
				CheckpointKey string         `json:"checkpoint_key"`
				Cursor        string         `json:"cursor"`
				Payload       map[string]any `json:"payload"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid checkpoint payload", nil)
			}
			checkpoint, err := cfg.integration.SaveCheckpoint(c.Context(), cfg.resolveScope(c), services.SaveCheckpointInput{
				RunID:         runID,
				CheckpointKey: strings.TrimSpace(payload.CheckpointKey),
				Cursor:        strings.TrimSpace(payload.Cursor),
				Payload:       services.RedactIntegrationPayload(payload.Payload),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to save checkpoint", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":     "ok",
				"checkpoint": integrationCheckpointRecordToMap(checkpoint),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminIntegrationSyncResume, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Param("run_id"))
			run, replay, err := cfg.integration.ResumeSyncRun(c.Context(), cfg.resolveScope(c), runID, strings.TrimSpace(c.Header("Idempotency-Key")))
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to resume sync run", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{"status": "ok", "replay": replay, "run": integrationSyncRunRecordToMap(run)})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminIntegrationSyncComplete, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Param("run_id"))
			run, replay, err := cfg.integration.CompleteSyncRun(c.Context(), cfg.resolveScope(c), runID, strings.TrimSpace(c.Header("Idempotency-Key")))
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to complete sync run", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{"status": "ok", "replay": replay, "run": integrationSyncRunRecordToMap(run)})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminIntegrationSyncFail, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Param("run_id"))
			var payload struct {
				LastError string `json:"last_error"`
			}
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid sync-fail payload"); err != nil {
				return err
			}
			run, replay, err := cfg.integration.FailSyncRun(c.Context(), cfg.resolveScope(c), runID, strings.TrimSpace(payload.LastError), strings.TrimSpace(c.Header("Idempotency-Key")))
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to fail sync run", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{"status": "ok", "replay": replay, "run": integrationSyncRunRecordToMap(run)})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminIntegrationConflicts, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			conflicts, err := cfg.integration.ListConflicts(
				c.Context(),
				cfg.resolveScope(c),
				strings.TrimSpace(c.Query("run_id")),
				strings.TrimSpace(c.Query("status")),
			)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationConflict), "unable to list conflicts", nil)
			}
			rows := make([]map[string]any, 0, len(conflicts))
			for _, conflict := range conflicts {
				rows = append(rows, integrationConflictRecordToMap(conflict))
			}
			return c.JSON(http.StatusOK, map[string]any{"status": "ok", "conflicts": rows})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Get(routes.AdminIntegrationConflict, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			conflictID := strings.TrimSpace(c.Param("conflict_id"))
			if conflictID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "conflict_id is required", nil)
			}
			conflict, err := cfg.integration.GetConflict(c.Context(), cfg.resolveScope(c), conflictID)
			if err != nil {
				return writeAPIError(c, err, http.StatusNotFound, string(services.ErrorCodeIntegrationConflict), "conflict not found", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{"status": "ok", "conflict": integrationConflictRecordToMap(conflict)})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminIntegrationResolve, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			conflictID := strings.TrimSpace(c.Param("conflict_id"))
			if conflictID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "conflict_id is required", nil)
			}
			var payload struct {
				Status           string         `json:"status"`
				Resolution       map[string]any `json:"resolution"`
				ResolvedByUserID string         `json:"resolved_by_user_id"`
				IdempotencyKey   string         `json:"idempotency_key"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeIntegrationConflict), "invalid conflict resolution payload", nil)
			}
			resolved, replay, err := cfg.integration.ResolveConflict(c.Context(), cfg.resolveScope(c), services.ResolveConflictInput{
				ConflictID:       conflictID,
				Status:           strings.TrimSpace(payload.Status),
				Resolution:       services.RedactIntegrationPayload(payload.Resolution),
				ResolvedByUserID: firstNonEmpty(strings.TrimSpace(payload.ResolvedByUserID), resolveAdminUserID(c)),
				IdempotencyKey:   firstNonEmpty(strings.TrimSpace(payload.IdempotencyKey), strings.TrimSpace(c.Header("Idempotency-Key"))),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeIntegrationConflict), "unable to resolve conflict", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":   "ok",
				"replay":   replay,
				"conflict": integrationConflictRecordToMap(resolved),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminIntegrationDiagnostics, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			runID := strings.TrimSpace(c.Query("run_id"))
			if runID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "run_id is required", nil)
			}
			diag, err := cfg.integration.SyncRunDiagnostics(c.Context(), cfg.resolveScope(c), runID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to resolve sync diagnostics", nil)
			}
			checkpoints := make([]map[string]any, 0, len(diag.Checkpoints))
			for _, checkpoint := range diag.Checkpoints {
				checkpoints = append(checkpoints, integrationCheckpointRecordToMap(checkpoint))
			}
			conflicts := make([]map[string]any, 0, len(diag.Conflicts))
			for _, conflict := range diag.Conflicts {
				conflicts = append(conflicts, integrationConflictRecordToMap(conflict))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"run":         integrationSyncRunRecordToMap(diag.Run),
				"checkpoints": checkpoints,
				"conflicts":   conflicts,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminIntegrationInbound, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Header("Idempotency-Key"), "integration_inbound_apply")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "integration_inbound_apply", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			var payload struct {
				Provider         string                                 `json:"provider"`
				EntityKind       string                                 `json:"entity_kind"`
				ExternalID       string                                 `json:"external_id"`
				AgreementID      string                                 `json:"agreement_id"`
				MetadataTitle    string                                 `json:"metadata_title"`
				MetadataMessage  string                                 `json:"metadata_message"`
				Participants     []services.InboundParticipantInput     `json:"participants"`
				FieldDefinitions []services.InboundFieldDefinitionInput `json:"field_definitions"`
				IdempotencyKey   string                                 `json:"idempotency_key"`
			}
			if err := c.Bind(&payload); err != nil {
				logAPIOperation(c.Context(), "integration_inbound_apply", correlationID, startedAt, err, nil)
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid inbound integration payload", nil)
			}
			result, err := cfg.integration.ApplyInbound(c.Context(), cfg.resolveScope(c), services.InboundApplyInput{
				Provider:         strings.TrimSpace(payload.Provider),
				EntityKind:       strings.TrimSpace(payload.EntityKind),
				ExternalID:       strings.TrimSpace(payload.ExternalID),
				AgreementID:      strings.TrimSpace(payload.AgreementID),
				MetadataTitle:    strings.TrimSpace(payload.MetadataTitle),
				MetadataMessage:  strings.TrimSpace(payload.MetadataMessage),
				Participants:     payload.Participants,
				FieldDefinitions: payload.FieldDefinitions,
				IdempotencyKey:   firstNonEmpty(strings.TrimSpace(payload.IdempotencyKey), strings.TrimSpace(c.Header("Idempotency-Key"))),
			})
			if err != nil {
				logAPIOperation(c.Context(), "integration_inbound_apply", correlationID, startedAt, err, nil)
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to apply inbound integration payload", nil)
			}
			respErr := c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"result": map[string]any{
					"agreement_id":           result.AgreementID,
					"participant_count":      result.ParticipantCount,
					"field_definition_count": result.FieldDefinitionCount,
					"replay":                 result.Replay,
				},
			})
			logAPIOperation(c.Context(), "integration_inbound_apply", correlationID, startedAt, respErr, map[string]any{
				"agreement_id": strings.TrimSpace(result.AgreementID),
				"replay":       result.Replay,
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminIntegrationOutbound, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			var payload struct {
				Provider       string         `json:"provider"`
				AgreementID    string         `json:"agreement_id"`
				EventType      string         `json:"event_type"`
				SourceEventID  string         `json:"source_event_id"`
				Payload        map[string]any `json:"payload"`
				IdempotencyKey string         `json:"idempotency_key"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid outbound integration payload", nil)
			}
			event, replay, err := cfg.integration.EmitOutboundChange(c.Context(), cfg.resolveScope(c), services.OutboundChangeInput{
				Provider:       strings.TrimSpace(payload.Provider),
				AgreementID:    strings.TrimSpace(payload.AgreementID),
				EventType:      strings.TrimSpace(payload.EventType),
				SourceEventID:  strings.TrimSpace(payload.SourceEventID),
				Payload:        services.RedactIntegrationPayload(payload.Payload),
				IdempotencyKey: firstNonEmpty(strings.TrimSpace(payload.IdempotencyKey), strings.TrimSpace(c.Header("Idempotency-Key"))),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeInvalidSignerState), "unable to emit outbound integration event", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"replay": replay,
				"event":  integrationChangeEventRecordToMap(event),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))
	}
}
