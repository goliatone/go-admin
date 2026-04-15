package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

type participantDraftPayload struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Name            string `json:"name"`
	Role            string `json:"role"`
	Notify          *bool  `json:"notify"`
	SigningStage    *int   `json:"signing_stage"`
	SigningOrder    *int   `json:"signing_order"`
	ExpectedVersion int64  `json:"expected_version"`
}

type fieldDefinitionDraftPayload struct {
	ID             string  `json:"id"`
	ParticipantID  string  `json:"participant_id"`
	Type           string  `json:"type"`
	FieldType      string  `json:"field_type"`
	Required       *bool   `json:"required"`
	ValidationJSON *string `json:"validation_json"`
}

type fieldInstanceDraftPayload struct {
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
	LinkGroupID       *string  `json:"link_group_id"`
	LinkedFromFieldID *string  `json:"linked_from_field_id"`
	IsUnlinked        *bool    `json:"is_unlinked"`
}

type authoringAgreementRowsLoader func(router.Context, string) ([]map[string]any, error)
type authoringAgreementDeleteAction func(router.Context, string, string) error
type authoringAgreementUpsertAction func(router.Context, string) (map[string]any, bool, error)

func registerAgreementAuthoringRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.agreementAuthoring == nil {
		return
	}

	securedRoutes := wrapRouteRegistrar(adminRoutes.router, composeMiddleware(adminRoutes.middleware, requireAuthenticatedAgreementRequest(cfg)))
	registerAgreementParticipantRoutes(securedRoutes, routes, cfg)
	registerAgreementFieldDefinitionRoutes(securedRoutes, routes, cfg)
	registerAgreementFieldInstanceRoutes(securedRoutes, routes, cfg)
	registerAgreementPlacementRoutes(securedRoutes, routes, cfg)
	registerAgreementReadinessRoutes(securedRoutes, routes, cfg)
}

func registerAgreementParticipantRoutes(securedRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	registerAgreementDraftResourceRoutes(
		securedRoutes,
		cfg,
		routes.AdminAgreementParticipants,
		routes.AdminAgreementParticipants,
		routes.AdminAgreementParticipant,
		routes.AdminAgreementParticipant,
		"participants",
		"unable to list participants",
		func(c router.Context, agreementID string) ([]map[string]any, error) {
			participants, err := cfg.agreementAuthoring.ListParticipants(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return nil, err
			}
			rows := make([]map[string]any, 0, len(participants))
			for _, participant := range participants {
				rows = append(rows, participantRecordToMap(participant))
			}
			return rows, nil
		},
		participantDraftUpsertHandler(
			cfg,
			"",
			"agreement_id is required",
			"invalid participant payload",
			"unable to upsert participant",
		),
		participantDraftUpsertHandler(
			cfg,
			"participant_id",
			"agreement_id and participant_id are required",
			"invalid participant payload",
			"unable to update participant",
		),
		"participant_id",
		"agreement_id and participant_id are required",
		"unable to delete participant",
		"participant_id",
		func(c router.Context, agreementID, participantID string) error {
			return cfg.agreementAuthoring.DeleteParticipantDraft(c.Context(), cfg.resolveScope(c), agreementID, participantID)
		},
	)
}

func registerAgreementFieldDefinitionRoutes(securedRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	registerAgreementDraftResourceRoutes(
		securedRoutes,
		cfg,
		routes.AdminAgreementFieldDefinitions,
		routes.AdminAgreementFieldDefinitions,
		routes.AdminAgreementFieldDefinition,
		routes.AdminAgreementFieldDefinition,
		"field_definitions",
		"unable to list field definitions",
		func(c router.Context, agreementID string) ([]map[string]any, error) {
			definitions, err := cfg.agreementAuthoring.ListFieldDefinitions(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return nil, err
			}
			rows := make([]map[string]any, 0, len(definitions))
			for _, definition := range definitions {
				rows = append(rows, fieldDefinitionRecordToMap(definition))
			}
			return rows, nil
		},
		fieldDefinitionDraftUpsertHandler(
			cfg,
			"",
			"agreement_id is required",
			"invalid field definition payload",
			"unable to upsert field definition",
		),
		fieldDefinitionDraftUpsertHandler(
			cfg,
			"field_definition_id",
			"agreement_id and field_definition_id are required",
			"invalid field definition payload",
			"unable to update field definition",
		),
		"field_definition_id",
		"agreement_id and field_definition_id are required",
		"unable to delete field definition",
		"field_definition_id",
		func(c router.Context, agreementID, fieldDefinitionID string) error {
			return cfg.agreementAuthoring.DeleteFieldDefinitionDraft(c.Context(), cfg.resolveScope(c), agreementID, fieldDefinitionID)
		},
	)
}

func registerAgreementFieldInstanceRoutes(securedRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	registerAgreementDraftResourceRoutes(
		securedRoutes,
		cfg,
		routes.AdminAgreementFieldInstances,
		routes.AdminAgreementFieldInstances,
		routes.AdminAgreementFieldInstance,
		routes.AdminAgreementFieldInstance,
		"field_instances",
		"unable to list field instances",
		func(c router.Context, agreementID string) ([]map[string]any, error) {
			instances, err := cfg.agreementAuthoring.ListFieldInstances(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return nil, err
			}
			rows := make([]map[string]any, 0, len(instances))
			for _, instance := range instances {
				rows = append(rows, fieldInstanceRecordToMap(instance))
			}
			return rows, nil
		},
		fieldInstanceDraftUpsertHandler(
			cfg,
			"",
			"agreement_id is required",
			"invalid field instance payload",
			"unable to upsert field instance",
		),
		fieldInstanceDraftUpsertHandler(
			cfg,
			"field_instance_id",
			"agreement_id and field_instance_id are required",
			"invalid field instance payload",
			"unable to update field instance",
		),
		"field_instance_id",
		"agreement_id and field_instance_id are required",
		"unable to delete field instance",
		"field_instance_id",
		func(c router.Context, agreementID, fieldInstanceID string) error {
			return cfg.agreementAuthoring.DeleteFieldInstanceDraft(c.Context(), cfg.resolveScope(c), agreementID, fieldInstanceID)
		},
	)
}

func registerAgreementPlacementRoutes(securedRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	securedRoutes.Post(routes.AdminAgreementAutoPlace, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		var payload struct {
			PolicyOverride *services.PlacementPolicyOverride `json:"policy_override"`
			NativeFields   []services.NativePlacementField   `json:"native_form_fields"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid auto-place payload", nil)
		}
		actorID := resolveAuthenticatedAdminUserID(c)
		result, err := cfg.agreementAuthoring.RunAutoPlacement(c.Context(), cfg.resolveScope(c), agreementID, services.AutoPlacementRunInput{
			UserID:         actorID,
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

	securedRoutes.Get(routes.AdminAgreementPlacementRuns, authoringAgreementRowsHandler(
		cfg,
		"runs",
		"unable to list placement runs",
		func(c router.Context, agreementID string) ([]map[string]any, error) {
			runs, err := cfg.agreementAuthoring.ListPlacementRuns(c.Context(), cfg.resolveScope(c), agreementID)
			if err != nil {
				return nil, err
			}
			rows := make([]map[string]any, 0, len(runs))
			for _, run := range runs {
				rows = append(rows, placementRunRecordToMap(run))
			}
			return rows, nil
		},
	), requireAdminPermission(cfg, cfg.permissions.AdminView))

	securedRoutes.Get(routes.AdminAgreementPlacementRun, func(c router.Context) error {
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

	securedRoutes.Post(routes.AdminAgreementPlacementApply, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		placementRunID := strings.TrimSpace(c.Param("placement_run_id"))
		if agreementID == "" || placementRunID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and placement_run_id are required", nil)
		}
		var payload struct {
			SuggestionIDs   []string                       `json:"suggestion_ids"`
			ManualOverrides []services.ManuallyPlacedField `json:"manual_overrides"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid placement apply payload", nil)
		}
		actorID := resolveAuthenticatedAdminUserID(c)
		applied, err := cfg.agreementAuthoring.ApplyPlacementRun(c.Context(), cfg.resolveScope(c), agreementID, placementRunID, services.ApplyPlacementRunInput{
			UserID:          actorID,
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
}

func registerAgreementReadinessRoutes(securedRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	securedRoutes.Get(routes.AdminAgreementSendReadiness, func(c router.Context) error {
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

func authoringAgreementRowsHandler(
	cfg registerConfig,
	responseKey, errorMessage string,
	load authoringAgreementRowsLoader,
) router.HandlerFunc {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if _, err := requireNonEmptyOrError(c, agreementID, "agreement_id is required"); err != nil {
			return err
		}
		rows, err := load(c, agreementID)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), errorMessage, nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			responseKey: rows,
		})
	}
}

func authoringAgreementResourceDeleteHandler(
	cfg registerConfig,
	itemParam, requiredMessage, errorMessage, responseKey string,
	action authoringAgreementDeleteAction,
) router.HandlerFunc {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		itemID := strings.TrimSpace(c.Param(itemParam))
		if agreementID == "" || itemID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), requiredMessage, nil)
		}
		if err := action(c, agreementID, itemID); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), errorMessage, nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":       "deleted",
			"agreement_id": agreementID,
			responseKey:    itemID,
		})
	}
}

func registerAgreementDraftResourceRoutes(
	securedRoutes routeRegistrar,
	cfg registerConfig,
	listPath, createPath, updatePath, deletePath, listResponseKey, listErrorMessage string,
	listLoader authoringAgreementRowsLoader,
	createHandler, updateHandler router.HandlerFunc,
	deleteItemParam, deleteRequired, deleteErrorMessage, deleteResponseKey string,
	deleteAction authoringAgreementDeleteAction,
) {
	securedRoutes.Get(listPath, authoringAgreementRowsHandler(
		cfg,
		listResponseKey,
		listErrorMessage,
		listLoader,
	), requireAdminPermission(cfg, cfg.permissions.AdminView))

	securedRoutes.Post(createPath, createHandler, requireAdminPermission(cfg, cfg.permissions.AdminEdit))
	securedRoutes.Put(updatePath, updateHandler, requireAdminPermission(cfg, cfg.permissions.AdminEdit))
	securedRoutes.Delete(deletePath, authoringAgreementResourceDeleteHandler(
		cfg,
		deleteItemParam,
		deleteRequired,
		deleteErrorMessage,
		deleteResponseKey,
		deleteAction,
	), requireAdminPermission(cfg, cfg.permissions.AdminEdit))
}

func authoringAgreementUpsertHandler(
	cfg registerConfig,
	itemParam, requiredMessage string,
	action authoringAgreementUpsertAction,
) router.HandlerFunc {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		itemID := strings.TrimSpace(c.Param(itemParam))
		if agreementID == "" || (itemParam != "" && itemID == "") {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), requiredMessage, nil)
		}
		payload, handled, err := action(c, agreementID)
		if err != nil {
			return err
		}
		if handled {
			return nil
		}
		return c.JSON(http.StatusOK, payload)
	}
}

func participantDraftUpsertHandler(
	cfg registerConfig,
	participantParam, requiredMessage, invalidPayloadMessage, failureMessage string,
) router.HandlerFunc {
	return authoringAgreementUpsertHandler(cfg, participantParam, requiredMessage, func(c router.Context, agreementID string) (map[string]any, bool, error) {
		participantID := strings.TrimSpace(c.Param(participantParam))
		var payload participantDraftPayload
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), invalidPayloadMessage); err != nil {
			return nil, true, err
		}
		participant, err := cfg.agreementAuthoring.UpsertParticipantDraft(c.Context(), cfg.resolveScope(c), agreementID, buildParticipantDraftPatch(payload, participantID), payload.ExpectedVersion)
		if err != nil {
			return nil, true, writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), failureMessage, nil)
		}
		return map[string]any{
			"status":      "ok",
			"participant": participantRecordToMap(participant),
		}, false, nil
	})
}

func fieldDefinitionDraftUpsertHandler(
	cfg registerConfig,
	fieldDefinitionParam, requiredMessage, invalidPayloadMessage, failureMessage string,
) router.HandlerFunc {
	return authoringAgreementUpsertHandler(cfg, fieldDefinitionParam, requiredMessage, func(c router.Context, agreementID string) (map[string]any, bool, error) {
		fieldDefinitionID := strings.TrimSpace(c.Param(fieldDefinitionParam))
		var payload fieldDefinitionDraftPayload
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), invalidPayloadMessage); err != nil {
			return nil, true, err
		}
		definition, err := cfg.agreementAuthoring.UpsertFieldDefinitionDraft(c.Context(), cfg.resolveScope(c), agreementID, buildFieldDefinitionDraftPatch(payload, fieldDefinitionID))
		if err != nil {
			return nil, true, writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), failureMessage, nil)
		}
		return map[string]any{
			"status":           "ok",
			"field_definition": fieldDefinitionRecordToMap(definition),
		}, false, nil
	})
}

func fieldInstanceDraftUpsertHandler(
	cfg registerConfig,
	fieldInstanceParam, requiredMessage, invalidPayloadMessage, failureMessage string,
) router.HandlerFunc {
	return authoringAgreementUpsertHandler(cfg, fieldInstanceParam, requiredMessage, func(c router.Context, agreementID string) (map[string]any, bool, error) {
		fieldInstanceID := strings.TrimSpace(c.Param(fieldInstanceParam))
		var payload fieldInstanceDraftPayload
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), invalidPayloadMessage); err != nil {
			return nil, true, err
		}
		instance, err := cfg.agreementAuthoring.UpsertFieldInstanceDraft(c.Context(), cfg.resolveScope(c), agreementID, buildFieldInstanceDraftPatch(payload, fieldInstanceID))
		if err != nil {
			return nil, true, writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), failureMessage, nil)
		}
		return map[string]any{
			"status":         "ok",
			"field_instance": fieldInstanceRecordToMap(instance),
		}, false, nil
	})
}

func buildParticipantDraftPatch(payload participantDraftPayload, participantID string) stores.ParticipantDraftPatch {
	patch := stores.ParticipantDraftPatch{
		ID: strings.TrimSpace(participantID),
	}
	if patch.ID == "" {
		patch.ID = strings.TrimSpace(payload.ID)
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
	if payload.Notify != nil {
		patch.Notify = payload.Notify
	}
	if stage := firstIntPointer(payload.SigningStage, payload.SigningOrder); stage != nil {
		patch.SigningStage = stage
	}
	return patch
}

func buildFieldDefinitionDraftPatch(payload fieldDefinitionDraftPayload, fieldDefinitionID string) stores.FieldDefinitionDraftPatch {
	fieldType := strings.TrimSpace(payload.FieldType)
	if fieldType == "" {
		fieldType = strings.TrimSpace(payload.Type)
	}

	patch := stores.FieldDefinitionDraftPatch{
		ID: strings.TrimSpace(fieldDefinitionID),
	}
	if patch.ID == "" {
		patch.ID = strings.TrimSpace(payload.ID)
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
	return patch
}

func buildFieldInstanceDraftPatch(payload fieldInstanceDraftPayload, fieldInstanceID string) stores.FieldInstanceDraftPatch {
	patch := stores.FieldInstanceDraftPatch{
		ID: strings.TrimSpace(fieldInstanceID),
	}
	if patch.ID == "" {
		patch.ID = strings.TrimSpace(payload.ID)
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
	if payload.LinkGroupID != nil {
		linkGroupID := strings.TrimSpace(*payload.LinkGroupID)
		patch.LinkGroupID = &linkGroupID
	}
	if payload.LinkedFromFieldID != nil {
		linkedFromFieldID := strings.TrimSpace(*payload.LinkedFromFieldID)
		patch.LinkedFromFieldID = &linkedFromFieldID
	}
	if payload.IsUnlinked != nil {
		patch.IsUnlinked = payload.IsUnlinked
	}
	return patch
}
