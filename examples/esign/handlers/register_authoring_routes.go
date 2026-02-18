package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

func registerAgreementAuthoringRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.agreementAuthoring != nil {
		adminRoutes.Get(routes.AdminAgreementParticipants, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if _, err := requireNonEmptyOrError(c, agreementID, "agreement_id is required"); err != nil {
				return err
			}
			participants, err := cfg.agreementAuthoring.ListParticipants(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list participants", nil)
			}
			rows := make([]map[string]any, 0, len(participants))
			for _, participant := range participants {
				rows = append(rows, participantRecordToMap(participant))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":       "ok",
				"participants": rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminAgreementParticipants, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			var payload struct {
				ID              string `json:"id"`
				Email           string `json:"email"`
				Name            string `json:"name"`
				Role            string `json:"role"`
				SigningStage    *int   `json:"signing_stage"`
				SigningOrder    *int   `json:"signing_order"`
				ExpectedVersion int64  `json:"expected_version"`
			}
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid participant payload"); err != nil {
				return err
			}

			patch := stores.ParticipantDraftPatch{
				ID: strings.TrimSpace(payload.ID),
			}
			if email := strings.TrimSpace(payload.Email); email != "" {
				patch.Email = &email
			}
			if name := strings.TrimSpace(payload.Name); name != "" {
				patch.Name = &name
			}
			if role := strings.ToLower(strings.TrimSpace(payload.Role)); role != "" {
				patch.Role = &role
			}
			if stage := firstIntPointer(payload.SigningStage, payload.SigningOrder); stage != nil {
				patch.SigningStage = stage
			}

			participant, err := cfg.agreementAuthoring.UpsertParticipantDraft(c.Context(), cfg.resolveScope(c), agreementID, patch, payload.ExpectedVersion)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to upsert participant", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"participant": participantRecordToMap(participant),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Put(routes.AdminAgreementParticipant, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			participantID := strings.TrimSpace(c.Param("participant_id"))
			if agreementID == "" || participantID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and participant_id are required", nil)
			}
			var payload struct {
				Email           string `json:"email"`
				Name            string `json:"name"`
				Role            string `json:"role"`
				SigningStage    *int   `json:"signing_stage"`
				SigningOrder    *int   `json:"signing_order"`
				ExpectedVersion int64  `json:"expected_version"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid participant payload", nil)
			}
			patch := stores.ParticipantDraftPatch{ID: participantID}
			if email := strings.TrimSpace(payload.Email); email != "" {
				patch.Email = &email
			}
			if name := strings.TrimSpace(payload.Name); name != "" {
				patch.Name = &name
			}
			if role := strings.ToLower(strings.TrimSpace(payload.Role)); role != "" {
				patch.Role = &role
			}
			if stage := firstIntPointer(payload.SigningStage, payload.SigningOrder); stage != nil {
				patch.SigningStage = stage
			}
			participant, err := cfg.agreementAuthoring.UpsertParticipantDraft(c.Context(), cfg.resolveScope(c), agreementID, patch, payload.ExpectedVersion)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to update participant", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"participant": participantRecordToMap(participant),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Delete(routes.AdminAgreementParticipant, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			participantID := strings.TrimSpace(c.Param("participant_id"))
			if agreementID == "" || participantID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and participant_id are required", nil)
			}
			if err := cfg.agreementAuthoring.DeleteParticipantDraft(c.Context(), cfg.resolveScope(c), agreementID, participantID); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to delete participant", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":         "deleted",
				"agreement_id":   agreementID,
				"participant_id": participantID,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Get(routes.AdminAgreementFieldDefinitions, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			definitions, err := cfg.agreementAuthoring.ListFieldDefinitions(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list field definitions", nil)
			}
			rows := make([]map[string]any, 0, len(definitions))
			for _, definition := range definitions {
				rows = append(rows, fieldDefinitionRecordToMap(definition))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":            "ok",
				"field_definitions": rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminAgreementFieldDefinitions, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			var payload struct {
				ID             string  `json:"id"`
				ParticipantID  string  `json:"participant_id"`
				Type           string  `json:"type"`
				FieldType      string  `json:"field_type"`
				Required       *bool   `json:"required"`
				ValidationJSON *string `json:"validation_json"`
			}
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field definition payload"); err != nil {
				return err
			}
			fieldType := strings.TrimSpace(payload.FieldType)
			if fieldType == "" {
				fieldType = strings.TrimSpace(payload.Type)
			}
			patch := stores.FieldDefinitionDraftPatch{
				ID: strings.TrimSpace(payload.ID),
			}
			if participantID := strings.TrimSpace(payload.ParticipantID); participantID != "" {
				patch.ParticipantID = &participantID
			}
			if fieldType != "" {
				patch.Type = &fieldType
			}
			if payload.Required != nil {
				patch.Required = payload.Required
			}
			if payload.ValidationJSON != nil {
				validationJSON := strings.TrimSpace(*payload.ValidationJSON)
				patch.ValidationJSON = &validationJSON
			}
			definition, err := cfg.agreementAuthoring.UpsertFieldDefinitionDraft(c.Context(), cfg.resolveScope(c), agreementID, patch)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to upsert field definition", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":           "ok",
				"field_definition": fieldDefinitionRecordToMap(definition),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Put(routes.AdminAgreementFieldDefinition, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			fieldDefinitionID := strings.TrimSpace(c.Param("field_definition_id"))
			if agreementID == "" || fieldDefinitionID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and field_definition_id are required", nil)
			}
			var payload struct {
				ParticipantID  string  `json:"participant_id"`
				Type           string  `json:"type"`
				FieldType      string  `json:"field_type"`
				Required       *bool   `json:"required"`
				ValidationJSON *string `json:"validation_json"`
			}
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field definition payload"); err != nil {
				return err
			}
			fieldType := strings.TrimSpace(payload.FieldType)
			if fieldType == "" {
				fieldType = strings.TrimSpace(payload.Type)
			}
			patch := stores.FieldDefinitionDraftPatch{ID: fieldDefinitionID}
			if participantID := strings.TrimSpace(payload.ParticipantID); participantID != "" {
				patch.ParticipantID = &participantID
			}
			if fieldType != "" {
				patch.Type = &fieldType
			}
			if payload.Required != nil {
				patch.Required = payload.Required
			}
			if payload.ValidationJSON != nil {
				validationJSON := strings.TrimSpace(*payload.ValidationJSON)
				patch.ValidationJSON = &validationJSON
			}
			definition, err := cfg.agreementAuthoring.UpsertFieldDefinitionDraft(c.Context(), cfg.resolveScope(c), agreementID, patch)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to update field definition", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":           "ok",
				"field_definition": fieldDefinitionRecordToMap(definition),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Delete(routes.AdminAgreementFieldDefinition, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			fieldDefinitionID := strings.TrimSpace(c.Param("field_definition_id"))
			if agreementID == "" || fieldDefinitionID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and field_definition_id are required", nil)
			}
			if err := cfg.agreementAuthoring.DeleteFieldDefinitionDraft(c.Context(), cfg.resolveScope(c), agreementID, fieldDefinitionID); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to delete field definition", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":              "deleted",
				"agreement_id":        agreementID,
				"field_definition_id": fieldDefinitionID,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Get(routes.AdminAgreementFieldInstances, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			instances, err := cfg.agreementAuthoring.ListFieldInstances(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list field instances", nil)
			}
			rows := make([]map[string]any, 0, len(instances))
			for _, instance := range instances {
				rows = append(rows, fieldInstanceRecordToMap(instance))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":          "ok",
				"field_instances": rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminAgreementFieldInstances, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			var payload struct {
				ID                string   `json:"id"`
				FieldDefinitionID string   `json:"field_definition_id"`
				PageNumber        *int     `json:"page_number"`
				Page              *int     `json:"page"`
				X                 *float64 `json:"x"`
				Y                 *float64 `json:"y"`
				PosX              *float64 `json:"pos_x"`
				PosY              *float64 `json:"pos_y"`
				Width             *float64 `json:"width"`
				Height            *float64 `json:"height"`
				TabIndex          *int     `json:"tab_index"`
				Label             *string  `json:"label"`
				AppearanceJSON    *string  `json:"appearance_json"`
				PlacementSource   *string  `json:"placement_source"`
				ResolverID        *string  `json:"resolver_id"`
				Confidence        *float64 `json:"confidence"`
				PlacementRunID    *string  `json:"placement_run_id"`
				ManualOverride    *bool    `json:"manual_override"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field instance payload", nil)
			}
			patch := stores.FieldInstanceDraftPatch{
				ID: strings.TrimSpace(payload.ID),
			}
			if definitionID := strings.TrimSpace(payload.FieldDefinitionID); definitionID != "" {
				patch.FieldDefinitionID = &definitionID
			}
			patch.PageNumber = firstIntPointer(payload.PageNumber, payload.Page)
			patch.X = firstFloatPointer(payload.X, payload.PosX)
			patch.Y = firstFloatPointer(payload.Y, payload.PosY)
			patch.Width = payload.Width
			patch.Height = payload.Height
			patch.TabIndex = payload.TabIndex
			if payload.Label != nil {
				label := strings.TrimSpace(*payload.Label)
				patch.Label = &label
			}
			if payload.AppearanceJSON != nil {
				appearanceJSON := strings.TrimSpace(*payload.AppearanceJSON)
				patch.AppearanceJSON = &appearanceJSON
			}
			if payload.PlacementSource != nil {
				placementSource := strings.ToLower(strings.TrimSpace(*payload.PlacementSource))
				patch.PlacementSource = &placementSource
			}
			if payload.ResolverID != nil {
				resolverID := strings.ToLower(strings.TrimSpace(*payload.ResolverID))
				patch.ResolverID = &resolverID
			}
			if payload.Confidence != nil {
				patch.Confidence = payload.Confidence
			}
			if payload.PlacementRunID != nil {
				placementRunID := strings.TrimSpace(*payload.PlacementRunID)
				patch.PlacementRunID = &placementRunID
			}
			if payload.ManualOverride != nil {
				patch.ManualOverride = payload.ManualOverride
			}
			instance, err := cfg.agreementAuthoring.UpsertFieldInstanceDraft(c.Context(), cfg.resolveScope(c), agreementID, patch)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to upsert field instance", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":         "ok",
				"field_instance": fieldInstanceRecordToMap(instance),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Put(routes.AdminAgreementFieldInstance, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			fieldInstanceID := strings.TrimSpace(c.Param("field_instance_id"))
			if agreementID == "" || fieldInstanceID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and field_instance_id are required", nil)
			}
			var payload struct {
				FieldDefinitionID string   `json:"field_definition_id"`
				PageNumber        *int     `json:"page_number"`
				Page              *int     `json:"page"`
				X                 *float64 `json:"x"`
				Y                 *float64 `json:"y"`
				PosX              *float64 `json:"pos_x"`
				PosY              *float64 `json:"pos_y"`
				Width             *float64 `json:"width"`
				Height            *float64 `json:"height"`
				TabIndex          *int     `json:"tab_index"`
				Label             *string  `json:"label"`
				AppearanceJSON    *string  `json:"appearance_json"`
				PlacementSource   *string  `json:"placement_source"`
				ResolverID        *string  `json:"resolver_id"`
				Confidence        *float64 `json:"confidence"`
				PlacementRunID    *string  `json:"placement_run_id"`
				ManualOverride    *bool    `json:"manual_override"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field instance payload", nil)
			}
			patch := stores.FieldInstanceDraftPatch{ID: fieldInstanceID}
			if definitionID := strings.TrimSpace(payload.FieldDefinitionID); definitionID != "" {
				patch.FieldDefinitionID = &definitionID
			}
			patch.PageNumber = firstIntPointer(payload.PageNumber, payload.Page)
			patch.X = firstFloatPointer(payload.X, payload.PosX)
			patch.Y = firstFloatPointer(payload.Y, payload.PosY)
			patch.Width = payload.Width
			patch.Height = payload.Height
			patch.TabIndex = payload.TabIndex
			if payload.Label != nil {
				label := strings.TrimSpace(*payload.Label)
				patch.Label = &label
			}
			if payload.AppearanceJSON != nil {
				appearanceJSON := strings.TrimSpace(*payload.AppearanceJSON)
				patch.AppearanceJSON = &appearanceJSON
			}
			if payload.PlacementSource != nil {
				placementSource := strings.ToLower(strings.TrimSpace(*payload.PlacementSource))
				patch.PlacementSource = &placementSource
			}
			if payload.ResolverID != nil {
				resolverID := strings.ToLower(strings.TrimSpace(*payload.ResolverID))
				patch.ResolverID = &resolverID
			}
			if payload.Confidence != nil {
				patch.Confidence = payload.Confidence
			}
			if payload.PlacementRunID != nil {
				placementRunID := strings.TrimSpace(*payload.PlacementRunID)
				patch.PlacementRunID = &placementRunID
			}
			if payload.ManualOverride != nil {
				patch.ManualOverride = payload.ManualOverride
			}
			instance, err := cfg.agreementAuthoring.UpsertFieldInstanceDraft(c.Context(), cfg.resolveScope(c), agreementID, patch)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to update field instance", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":         "ok",
				"field_instance": fieldInstanceRecordToMap(instance),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Delete(routes.AdminAgreementFieldInstance, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			fieldInstanceID := strings.TrimSpace(c.Param("field_instance_id"))
			if agreementID == "" || fieldInstanceID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and field_instance_id are required", nil)
			}
			if err := cfg.agreementAuthoring.DeleteFieldInstanceDraft(c.Context(), cfg.resolveScope(c), agreementID, fieldInstanceID); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to delete field instance", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":            "deleted",
				"agreement_id":      agreementID,
				"field_instance_id": fieldInstanceID,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Post(routes.AdminAgreementAutoPlace, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			var payload struct {
				UserID         string                            `json:"user_id"`
				PolicyOverride *services.PlacementPolicyOverride `json:"policy_override"`
				NativeFields   []services.NativePlacementField   `json:"native_form_fields"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid auto-place payload", nil)
			}
			result, err := cfg.agreementAuthoring.RunAutoPlacement(c.Context(), cfg.resolveScope(c), agreementID, services.AutoPlacementRunInput{
				UserID:         strings.TrimSpace(payload.UserID),
				PolicyOverride: payload.PolicyOverride,
				NativeFields:   payload.NativeFields,
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to run auto-placement", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"run":    placementRunRecordToMap(result.Run),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Get(routes.AdminAgreementPlacementRuns, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			runs, err := cfg.agreementAuthoring.ListPlacementRuns(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list placement runs", nil)
			}
			rows := make([]map[string]any, 0, len(runs))
			for _, run := range runs {
				rows = append(rows, placementRunRecordToMap(run))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"runs":   rows,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Get(routes.AdminAgreementPlacementRun, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			placementRunID := strings.TrimSpace(c.Param("placement_run_id"))
			if agreementID == "" || placementRunID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and placement_run_id are required", nil)
			}
			run, err := cfg.agreementAuthoring.GetPlacementRun(c.Context(), cfg.resolveScope(c), agreementID, placementRunID)
			if err != nil {
				return writeAPIError(c, err, http.StatusNotFound, string(services.ErrorCodeMissingRequiredFields), "placement run not found", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"run":    placementRunRecordToMap(run),
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Post(routes.AdminAgreementPlacementApply, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			placementRunID := strings.TrimSpace(c.Param("placement_run_id"))
			if agreementID == "" || placementRunID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and placement_run_id are required", nil)
			}
			var payload struct {
				UserID          string                         `json:"user_id"`
				SuggestionIDs   []string                       `json:"suggestion_ids"`
				ManualOverrides []services.ManuallyPlacedField `json:"manual_overrides"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid placement apply payload", nil)
			}
			applied, err := cfg.agreementAuthoring.ApplyPlacementRun(c.Context(), cfg.resolveScope(c), agreementID, placementRunID, services.ApplyPlacementRunInput{
				UserID:          strings.TrimSpace(payload.UserID),
				SuggestionIDs:   append([]string{}, payload.SuggestionIDs...),
				ManualOverrides: append([]services.ManuallyPlacedField{}, payload.ManualOverrides...),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to apply placement run", nil)
			}
			instances := make([]map[string]any, 0, len(applied.AppliedInstances))
			for _, record := range applied.AppliedInstances {
				instances = append(instances, fieldInstanceRecordToMap(record))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":  "ok",
				"run":     placementRunRecordToMap(applied.Run),
				"applied": instances,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Get(routes.AdminAgreementSendReadiness, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
			}
			validation, err := cfg.agreementAuthoring.ValidateBeforeSend(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to validate send readiness", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status": "ok",
				"ready":  validation.Valid,
				"validation": map[string]any{
					"valid":           validation.Valid,
					"recipient_count": validation.RecipientCount,
					"field_count":     validation.FieldCount,
					"issues":          validation.Issues,
				},
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSend))
	}
}
