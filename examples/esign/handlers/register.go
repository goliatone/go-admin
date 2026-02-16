package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type routeRegistrar struct {
	router     coreadmin.AdminRouter
	middleware router.MiddlewareFunc
}

func wrapRouteRegistrar(r coreadmin.AdminRouter, mw router.MiddlewareFunc) routeRegistrar {
	return routeRegistrar{router: r, middleware: mw}
}

func (r routeRegistrar) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Get(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Post(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Put(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Delete(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) withMiddleware(mw []router.MiddlewareFunc) []router.MiddlewareFunc {
	if r.middleware == nil {
		return mw
	}
	out := make([]router.MiddlewareFunc, 0, len(mw)+1)
	out = append(out, r.middleware)
	out = append(out, mw...)
	return out
}

// Register attaches baseline phase-0 routes for admin and signer entry points.
func Register(r coreadmin.AdminRouter, routes RouteSet, options ...RegisterOption) {
	if r == nil {
		return
	}
	cfg := buildRegisterConfig(options)
	adminRoutes := wrapRouteRegistrar(r, cfg.adminRouteAuth)

	adminRoutes.Get(routes.AdminStatus, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"module": "esign",
			"status": "ok",
			"phase":  "baseline",
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(routes.AdminAPIStatus, func(c router.Context) error {
		startedAt := time.Now()
		correlationID := apiCorrelationID(c, "admin_api_status")
		if err := enforceTransportSecurity(c, cfg); err != nil {
			logAPIOperation(c.Context(), "admin_api_status", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		err := c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"codes": []string{
				string(services.ErrorCodeTokenExpired),
				string(services.ErrorCodeAgreementImmutable),
				string(services.ErrorCodeMissingRequiredFields),
			},
			"routes": map[string]string{
				"admin":                             routes.AdminHome,
				"admin_status":                      routes.AdminStatus,
				"admin_api":                         routes.AdminAPIStatus,
				"admin_drafts":                      routes.AdminDrafts,
				"admin_draft":                       routes.AdminDraft,
				"admin_draft_send":                  routes.AdminDraftSend,
				"admin_agreements_stats":            routes.AdminAgreementsStats,
				"admin_agreement_participants":      routes.AdminAgreementParticipants,
				"admin_agreement_participant":       routes.AdminAgreementParticipant,
				"admin_agreement_field_definitions": routes.AdminAgreementFieldDefinitions,
				"admin_agreement_field_definition":  routes.AdminAgreementFieldDefinition,
				"admin_agreement_field_instances":   routes.AdminAgreementFieldInstances,
				"admin_agreement_field_instance":    routes.AdminAgreementFieldInstance,
				"admin_agreement_send_readiness":    routes.AdminAgreementSendReadiness,
				"admin_agreement_auto_place":        routes.AdminAgreementAutoPlace,
				"admin_agreement_placement_runs":    routes.AdminAgreementPlacementRuns,
				"admin_agreement_placement_run":     routes.AdminAgreementPlacementRun,
				"admin_agreement_placement_apply":   routes.AdminAgreementPlacementApply,
				"admin_smoke_recipient_links":       routes.AdminSmokeRecipientLinks,
				"admin_documents_upload":            routes.AdminDocumentsUpload,
				"signer_session":                    routes.SignerSession,
				"signer_consent":                    routes.SignerConsent,
				"signer_field_values":               routes.SignerFieldValues,
				"signer_signature":                  routes.SignerSignature,
				"signer_signature_upload":           routes.SignerSignatureUpload,
				"signer_signature_object":           routes.SignerSignatureObject,
				"signer_telemetry":                  routes.SignerTelemetry,
				"signer_submit":                     routes.SignerSubmit,
				"signer_decline":                    routes.SignerDecline,
				"signer_assets":                     routes.SignerAssets,
				"google_oauth_connect":              routes.AdminGoogleOAuthConnect,
				"google_oauth_disconnect":           routes.AdminGoogleOAuthDisconnect,
				"google_oauth_rotate":               routes.AdminGoogleOAuthRotate,
				"google_oauth_status":               routes.AdminGoogleOAuthStatus,
				"google_drive_search":               routes.AdminGoogleDriveSearch,
				"google_drive_browse":               routes.AdminGoogleDriveBrowse,
				"google_drive_import":               routes.AdminGoogleDriveImport,
				"google_drive_imports":              routes.AdminGoogleDriveImports,
				"google_drive_import_run":           routes.AdminGoogleDriveImportRun,
				"integration_mappings":              routes.AdminIntegrationMappings,
				"integration_mapping":               routes.AdminIntegrationMapping,
				"integration_mapping_publish":       routes.AdminIntegrationMapPublish,
				"integration_sync_runs":             routes.AdminIntegrationSyncRuns,
				"integration_sync_run":              routes.AdminIntegrationSyncRun,
				"integration_checkpoints":           routes.AdminIntegrationCheckpoints,
				"integration_sync_resume":           routes.AdminIntegrationSyncResume,
				"integration_sync_complete":         routes.AdminIntegrationSyncComplete,
				"integration_sync_fail":             routes.AdminIntegrationSyncFail,
				"integration_conflicts":             routes.AdminIntegrationConflicts,
				"integration_conflict":              routes.AdminIntegrationConflict,
				"integration_conflict_resolve":      routes.AdminIntegrationResolve,
				"integration_diagnostics":           routes.AdminIntegrationDiagnostics,
				"integration_inbound":               routes.AdminIntegrationInbound,
				"integration_outbound":              routes.AdminIntegrationOutbound,
			},
		})
		logAPIOperation(c.Context(), "admin_api_status", correlationID, startedAt, err, nil)
		return err
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(routes.AdminAgreementsStats, func(c router.Context) error {
		stats := map[string]int{
			"draft":           0,
			"pending":         0,
			"completed":       0,
			"action_required": 0,
			"total":           0,
		}
		byStatus := map[string]int{}
		if cfg.agreements != nil {
			records, err := cfg.agreements.ListAgreements(c.Context(), cfg.resolveScope(c), stores.AgreementQuery{})
			if err != nil {
				return writeAPIError(c, err, http.StatusInternalServerError, "AGREEMENT_STATS_UNAVAILABLE", "unable to load agreement stats", nil)
			}
			for _, record := range records {
				status := strings.ToLower(strings.TrimSpace(record.Status))
				if status == "" {
					continue
				}
				byStatus[status] = byStatus[status] + 1
			}
			stats["draft"] = byStatus[stores.AgreementStatusDraft]
			stats["pending"] = byStatus[stores.AgreementStatusSent] + byStatus[stores.AgreementStatusInProgress]
			stats["completed"] = byStatus[stores.AgreementStatusCompleted]
			stats["action_required"] = stats["pending"] + byStatus[stores.AgreementStatusDeclined]
			stats["total"] = len(records)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			"stats":     stats,
			"by_status": byStatus,
		})
	})

	if cfg.drafts != nil {
		adminRoutes.Post(routes.AdminDrafts, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			var payload struct {
				WizardID        string         `json:"wizard_id"`
				WizardState     map[string]any `json:"wizard_state"`
				Title           string         `json:"title"`
				CurrentStep     int            `json:"current_step"`
				DocumentID      *string        `json:"document_id"`
				CreatedByUserID string         `json:"created_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft payload", nil)
			}
			createdByUserID := firstNonEmpty(strings.TrimSpace(payload.CreatedByUserID), resolveAdminUserID(c))
			if createdByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "created_by_user_id is required", nil)
			}
			documentID := ""
			if payload.DocumentID != nil {
				documentID = strings.TrimSpace(*payload.DocumentID)
			}
			record, replay, err := cfg.drafts.Create(c.Context(), cfg.resolveScope(c), services.DraftCreateInput{
				WizardID:        strings.TrimSpace(payload.WizardID),
				WizardState:     payload.WizardState,
				Title:           strings.TrimSpace(payload.Title),
				CurrentStep:     payload.CurrentStep,
				DocumentID:      documentID,
				CreatedByUserID: createdByUserID,
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to create draft", nil)
			}
			statusCode := http.StatusCreated
			if replay {
				statusCode = http.StatusOK
			}
			return c.JSON(statusCode, draftRecordToDetailMap(record))
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Get(routes.AdminDrafts, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			createdByUserID := resolveAdminUserID(c)
			if createdByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "created_by_user_id is required", nil)
			}
			limit := parsePageSize(c.Query("limit"))
			rows, nextCursor, total, err := cfg.drafts.List(c.Context(), cfg.resolveScope(c), services.DraftListInput{
				CreatedByUserID: createdByUserID,
				Limit:           limit,
				Cursor:          strings.TrimSpace(c.Query("cursor")),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list drafts", nil)
			}
			drafts := make([]map[string]any, 0, len(rows))
			for _, row := range rows {
				drafts = append(drafts, draftRecordToSummaryMap(row))
			}
			return c.JSON(http.StatusOK, map[string]any{
				"drafts":      drafts,
				"next_cursor": nullableString(nextCursor),
				"total":       total,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Get(routes.AdminDraft, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			draftID := strings.TrimSpace(c.Param("draft_id"))
			if draftID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "draft_id is required", nil)
			}
			createdByUserID := resolveAdminUserID(c)
			if createdByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "created_by_user_id is required", nil)
			}
			record, err := cfg.drafts.Get(c.Context(), cfg.resolveScope(c), draftID, createdByUserID)
			if err != nil {
				return writeAPIError(c, err, http.StatusNotFound, "NOT_FOUND", "draft not found", nil)
			}
			return c.JSON(http.StatusOK, draftRecordToDetailMap(record))
		}, requireAdminPermission(cfg, cfg.permissions.AdminView))

		adminRoutes.Put(routes.AdminDraft, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			draftID := strings.TrimSpace(c.Param("draft_id"))
			if draftID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "draft_id is required", nil)
			}
			var payload struct {
				ExpectedRevision int64          `json:"expected_revision"`
				WizardState      map[string]any `json:"wizard_state"`
				Title            string         `json:"title"`
				CurrentStep      int            `json:"current_step"`
				DocumentID       *string        `json:"document_id"`
				UpdatedByUserID  string         `json:"updated_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft payload", nil)
			}
			updatedByUserID := firstNonEmpty(strings.TrimSpace(payload.UpdatedByUserID), resolveAdminUserID(c))
			if updatedByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "updated_by_user_id is required", nil)
			}
			record, err := cfg.drafts.Update(c.Context(), cfg.resolveScope(c), draftID, services.DraftUpdateInput{
				ExpectedRevision: payload.ExpectedRevision,
				WizardState:      payload.WizardState,
				Title:            strings.TrimSpace(payload.Title),
				CurrentStep:      payload.CurrentStep,
				DocumentID:       payload.DocumentID,
				UpdatedByUserID:  updatedByUserID,
			})
			if err != nil {
				return writeAPIError(c, normalizeDraftMutationError(err), http.StatusUnprocessableEntity, "validation_failed", "unable to update draft", nil)
			}
			return c.JSON(http.StatusOK, draftRecordToDetailMap(record))
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Delete(routes.AdminDraft, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			draftID := strings.TrimSpace(c.Param("draft_id"))
			if draftID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "draft_id is required", nil)
			}
			createdByUserID := resolveAdminUserID(c)
			if createdByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "created_by_user_id is required", nil)
			}
			if err := cfg.drafts.Delete(c.Context(), cfg.resolveScope(c), draftID, createdByUserID); err != nil {
				return writeAPIError(c, err, http.StatusNotFound, "NOT_FOUND", "draft not found", nil)
			}
			return c.SendStatus(http.StatusNoContent)
		}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

		adminRoutes.Post(routes.AdminDraftSend, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			draftID := strings.TrimSpace(c.Param("draft_id"))
			if draftID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "draft_id is required", nil)
			}
			var payload struct {
				ExpectedRevision int64  `json:"expected_revision"`
				CreatedByUserID  string `json:"created_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft send payload", nil)
			}
			createdByUserID := firstNonEmpty(strings.TrimSpace(payload.CreatedByUserID), resolveAdminUserID(c))
			if createdByUserID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "created_by_user_id is required", nil)
			}
			result, err := cfg.drafts.Send(c.Context(), cfg.resolveScope(c), draftID, services.DraftSendInput{
				ExpectedRevision: payload.ExpectedRevision,
				CreatedByUserID:  createdByUserID,
			})
			if err != nil {
				return writeAPIError(c, normalizeDraftMutationError(err), http.StatusUnprocessableEntity, "validation_failed", "unable to send draft", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"agreement_id":  strings.TrimSpace(result.AgreementID),
				"status":        strings.TrimSpace(result.Status),
				"draft_id":      strings.TrimSpace(result.DraftID),
				"draft_deleted": result.DraftDeleted,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSend))
	}

	if cfg.agreementAuthoring != nil {
		adminRoutes.Get(routes.AdminAgreementParticipants, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			agreementID := strings.TrimSpace(c.Param("agreement_id"))
			if agreementID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
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
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid participant payload", nil)
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
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field definition payload", nil)
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
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field definition payload", nil)
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

	adminRoutes.Get(routes.AdminSmokeRecipientLinks, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		scope := cfg.resolveScope(c)
		agreementID := strings.TrimSpace(c.Query("agreement_id"))
		recipientID := strings.TrimSpace(c.Query("recipient_id"))
		notification := strings.TrimSpace(c.Query("notification"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		if recipientID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "recipient_id is required", nil)
		}
		link, ok := jobs.LookupCapturedRecipientLink(scope, agreementID, recipientID, notification)
		if !ok {
			return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeInvalidSignerState), "recipient link is unavailable", map[string]any{
				"agreement_id": agreementID,
				"recipient_id": recipientID,
				"notification": notification,
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"source": "in_process_email_capture",
			"link": map[string]any{
				"agreement_id":    link.AgreementID,
				"recipient_id":    link.RecipientID,
				"recipient_email": link.RecipientEmail,
				"template_code":   link.TemplateCode,
				"notification":    link.Notification,
				"sign_url":        link.SignURL,
				"completion_url":  link.CompletionURL,
				"correlation_id":  link.CorrelationID,
				"captured_at":     link.CapturedAt.UTC().Format(time.RFC3339Nano),
			},
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	if cfg.documentUpload != nil {
		adminRoutes.Post(routes.AdminDocumentsUpload, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			return cfg.documentUpload(c)
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
	}

	if cfg.googleEnabled && cfg.google != nil {
		adminRoutes.Post(routes.AdminGoogleOAuthConnect, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			var payload struct {
				AuthCode    string `json:"auth_code"`
				RedirectURI string `json:"redirect_uri"`
			}
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid oauth connect payload", nil)
			}
			status, err := cfg.google.Connect(c.Context(), cfg.resolveScope(c), services.GoogleConnectInput{
				UserID:      userID,
				AuthCode:    strings.TrimSpace(payload.AuthCode),
				RedirectURI: strings.TrimSpace(payload.RedirectURI),
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), "google oauth connect failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "connected",
				"integration": status,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminGoogleOAuthDisconnect, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			if err := cfg.google.Disconnect(c.Context(), cfg.resolveScope(c), userID); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGoogleAccessRevoked), "google oauth disconnect failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":   "disconnected",
				"provider": services.GoogleProviderName,
				"user_id":  userID,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Post(routes.AdminGoogleOAuthRotate, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			status, err := cfg.google.RotateCredentialEncryption(c.Context(), cfg.resolveScope(c), userID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGoogleAccessRevoked), "google oauth rotate failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "rotated",
				"integration": status,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminGoogleOAuthStatus, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			status, err := cfg.google.Status(c.Context(), cfg.resolveScope(c), userID)
			if err != nil {
				return writeAPIError(c, err, http.StatusInternalServerError, "GOOGLE_STATUS_UNAVAILABLE", "google oauth status failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"integration": status,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		adminRoutes.Get(routes.AdminGoogleDriveSearch, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			pageSize := parsePageSize(c.Query("page_size"))
			result, err := cfg.google.SearchFiles(c.Context(), cfg.resolveScope(c), services.GoogleDriveQueryInput{
				UserID:    userID,
				Query:     strings.TrimSpace(c.Query("q")),
				PageToken: strings.TrimSpace(c.Query("page_token")),
				PageSize:  pageSize,
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), "google drive search failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":          "ok",
				"files":           result.Files,
				"next_page_token": result.NextPageToken,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Get(routes.AdminGoogleDriveBrowse, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			pageSize := parsePageSize(c.Query("page_size"))
			result, err := cfg.google.BrowseFiles(c.Context(), cfg.resolveScope(c), services.GoogleDriveQueryInput{
				UserID:    userID,
				FolderID:  strings.TrimSpace(c.Query("folder_id")),
				PageToken: strings.TrimSpace(c.Query("page_token")),
				PageSize:  pageSize,
			})
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), "google drive browse failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":          "ok",
				"files":           result.Files,
				"next_page_token": result.NextPageToken,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Post(routes.AdminGoogleDriveImports, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Header("Idempotency-Key"), c.Query("user_id"), "google_drive_imports_create")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			if cfg.googleImportRuns == nil || cfg.googleImportEnqueue == nil {
				err := writeAPIError(c, nil, http.StatusServiceUnavailable, string(services.ErrorCodeGoogleProviderDegraded), "google import async runtime unavailable", nil)
				logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, nil, map[string]any{"outcome": "runtime_unavailable"})
				return err
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
				logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
				return err
			}
			var payload struct {
				GoogleFileID      string `json:"google_file_id"`
				DocumentTitle     string `json:"document_title"`
				AgreementTitle    string `json:"agreement_title"`
				CreatedByUserID   string `json:"created_by_user_id"`
				SourceVersionHint string `json:"source_version_hint"`
			}
			if err := c.Bind(&payload); err != nil {
				werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid google import payload", nil)
				logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, err, nil)
				return werr
			}
			scope := cfg.resolveScope(c)
			dedupeKey := googleImportRunDedupeKey(userID, payload.GoogleFileID, payload.SourceVersionHint)
			run, created, err := cfg.googleImportRuns.BeginGoogleImportRun(c.Context(), scope, stores.GoogleImportRunInput{
				UserID:            userID,
				GoogleFileID:      strings.TrimSpace(payload.GoogleFileID),
				SourceVersionHint: strings.TrimSpace(payload.SourceVersionHint),
				DedupeKey:         dedupeKey,
				DocumentTitle:     strings.TrimSpace(payload.DocumentTitle),
				AgreementTitle:    strings.TrimSpace(payload.AgreementTitle),
				CreatedByUserID:   strings.TrimSpace(payload.CreatedByUserID),
				CorrelationID:     correlationID,
				RequestedAt:       time.Now().UTC(),
			})
			if err != nil {
				werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to queue google import", nil)
				logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, err, nil)
				return werr
			}
			if created {
				enqueueErr := cfg.googleImportEnqueue(c.Context(), jobs.GoogleDriveImportMsg{
					Scope:             scope,
					ImportRunID:       strings.TrimSpace(run.ID),
					UserID:            userID,
					GoogleFileID:      strings.TrimSpace(payload.GoogleFileID),
					SourceVersionHint: strings.TrimSpace(payload.SourceVersionHint),
					DocumentTitle:     strings.TrimSpace(payload.DocumentTitle),
					AgreementTitle:    strings.TrimSpace(payload.AgreementTitle),
					CreatedByUserID:   strings.TrimSpace(payload.CreatedByUserID),
					CorrelationID:     correlationID,
					DedupeKey:         strings.TrimSpace(run.DedupeKey),
				})
				if enqueueErr != nil {
					_, _ = cfg.googleImportRuns.MarkGoogleImportRunFailed(c.Context(), scope, run.ID, stores.GoogleImportRunFailureInput{
						ErrorCode:    string(services.ErrorCodeGoogleProviderDegraded),
						ErrorMessage: strings.TrimSpace(enqueueErr.Error()),
						CompletedAt:  time.Now().UTC(),
					})
					werr := writeAPIError(c, enqueueErr, http.StatusServiceUnavailable, string(services.ErrorCodeGoogleProviderDegraded), "unable to enqueue google import", nil)
					logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, enqueueErr, nil)
					return werr
				}
			}
			statusURL := strings.Replace(routes.AdminGoogleDriveImportRun, ":import_run_id", strings.TrimSpace(run.ID), 1)
			respErr := c.JSON(http.StatusAccepted, map[string]any{
				"import_run_id": strings.TrimSpace(run.ID),
				"status":        strings.TrimSpace(run.Status),
				"status_url":    statusURL,
			})
			logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, respErr, map[string]any{
				"import_run_id":  strings.TrimSpace(run.ID),
				"google_file_id": strings.TrimSpace(payload.GoogleFileID),
				"status":         strings.TrimSpace(run.Status),
				"replay":         !created,
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Get(routes.AdminGoogleDriveImportRun, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Param("import_run_id"), "google_drive_imports_get")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			if cfg.googleImportRuns == nil {
				err := writeAPIError(c, nil, http.StatusServiceUnavailable, string(services.ErrorCodeGoogleProviderDegraded), "google import async runtime unavailable", nil)
				logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, nil, map[string]any{"outcome": "runtime_unavailable"})
				return err
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
				logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
				return err
			}
			scope := cfg.resolveScope(c)
			runID := strings.TrimSpace(c.Param("import_run_id"))
			run, err := cfg.googleImportRuns.GetGoogleImportRun(c.Context(), scope, runID)
			if err != nil || !strings.EqualFold(strings.TrimSpace(run.UserID), strings.TrimSpace(userID)) {
				werr := writeAPIError(c, err, http.StatusNotFound, string(services.ErrorCodeGooglePermissionDenied), "google import run not found", nil)
				logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, err, nil)
				return werr
			}
			respErr := c.JSON(http.StatusOK, googleImportRunRecordToMap(run))
			logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, respErr, map[string]any{
				"import_run_id": strings.TrimSpace(run.ID),
				"status":        strings.TrimSpace(run.Status),
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Get(routes.AdminGoogleDriveImports, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Query("cursor"), "google_drive_imports_list")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			if cfg.googleImportRuns == nil {
				err := writeAPIError(c, nil, http.StatusServiceUnavailable, string(services.ErrorCodeGoogleProviderDegraded), "google import async runtime unavailable", nil)
				logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, nil, map[string]any{"outcome": "runtime_unavailable"})
				return err
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
				logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
				return err
			}
			scope := cfg.resolveScope(c)
			runs, nextCursor, err := cfg.googleImportRuns.ListGoogleImportRuns(c.Context(), scope, stores.GoogleImportRunQuery{
				UserID:   userID,
				Limit:    parsePageSize(c.Query("limit")),
				Cursor:   strings.TrimSpace(c.Query("cursor")),
				SortDesc: true,
			})
			if err != nil {
				werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to list google import runs", nil)
				logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, err, nil)
				return werr
			}
			rows := make([]map[string]any, 0, len(runs))
			for _, run := range runs {
				rows = append(rows, googleImportRunRecordToMap(run))
			}
			respErr := c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"import_runs": rows,
				"next_cursor": strings.TrimSpace(nextCursor),
			})
			logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, respErr, map[string]any{
				"count": len(rows),
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))

		adminRoutes.Post(routes.AdminGoogleDriveImport, func(c router.Context) error {
			startedAt := time.Now()
			correlationID := apiCorrelationID(c, c.Query("user_id"), "google_drive_import")
			if err := enforceTransportSecurity(c, cfg); err != nil {
				logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, nil)
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
				logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
				return err
			}
			var payload struct {
				GoogleFileID    string `json:"google_file_id"`
				DocumentTitle   string `json:"document_title"`
				AgreementTitle  string `json:"agreement_title"`
				CreatedByUserID string `json:"created_by_user_id"`
			}
			if err := c.Bind(&payload); err != nil {
				werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid google import payload", nil)
				logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, nil)
				return werr
			}
			c.Set("Deprecation", "true")
			c.Set("Link", fmt.Sprintf("<%s>; rel=\"successor-version\"", routes.AdminGoogleDriveImports))
			imported, err := cfg.google.ImportDocument(c.Context(), cfg.resolveScope(c), services.GoogleImportInput{
				UserID:          userID,
				GoogleFileID:    strings.TrimSpace(payload.GoogleFileID),
				DocumentTitle:   strings.TrimSpace(payload.DocumentTitle),
				AgreementTitle:  strings.TrimSpace(payload.AgreementTitle),
				CreatedByUserID: strings.TrimSpace(payload.CreatedByUserID),
			})
			if err != nil {
				werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), "google import failed", nil)
				logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, nil)
				return werr
			}
			respErr := c.JSON(http.StatusOK, map[string]any{
				"status": "imported",
				"document": map[string]any{
					"id":                         imported.Document.ID,
					"title":                      imported.Document.Title,
					"source_type":                imported.Document.SourceType,
					"source_google_file_id":      imported.Document.SourceGoogleFileID,
					"source_google_doc_url":      imported.Document.SourceGoogleDocURL,
					"source_modified_time":       formatTime(imported.Document.SourceModifiedTime),
					"source_exported_at":         formatTime(imported.Document.SourceExportedAt),
					"source_exported_by_user_id": imported.Document.SourceExportedByUserID,
					"source_mime_type":           imported.Document.SourceMimeType,
					"source_ingestion_mode":      imported.Document.SourceIngestionMode,
				},
				"agreement": map[string]any{
					"id":                         imported.Agreement.ID,
					"title":                      imported.Agreement.Title,
					"document_id":                imported.Agreement.DocumentID,
					"source_type":                imported.Agreement.SourceType,
					"source_google_file_id":      imported.Agreement.SourceGoogleFileID,
					"source_google_doc_url":      imported.Agreement.SourceGoogleDocURL,
					"source_modified_time":       formatTime(imported.Agreement.SourceModifiedTime),
					"source_exported_at":         formatTime(imported.Agreement.SourceExportedAt),
					"source_exported_by_user_id": imported.Agreement.SourceExportedByUserID,
					"source_mime_type":           imported.Agreement.SourceMimeType,
					"source_ingestion_mode":      imported.Agreement.SourceIngestionMode,
				},
				"source_mime_type": imported.SourceMimeType,
				"ingestion_mode":   imported.IngestionMode,
			})
			logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, respErr, map[string]any{
				"agreement_id": strings.TrimSpace(imported.Agreement.ID),
				"document_id":  strings.TrimSpace(imported.Document.ID),
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
	}

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
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid sync run payload", nil)
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
			if err := c.Bind(&payload); err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid sync-fail payload", nil)
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

	r.Get(routes.SignerSession, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSession != nil {
			session, err := cfg.signerSession.GetSession(c.Context(), cfg.resolveScope(c), tokenRecord)
			if err != nil {
				return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to resolve signer session", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":  "ok",
				"session": session,
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"token":  token,
		})
	})

	r.Get(routes.SignerAssets, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		contract := services.SignerAssetContract{
			AgreementID: strings.TrimSpace(tokenRecord.AgreementID),
			RecipientID: strings.TrimSpace(tokenRecord.RecipientID),
		}
		if cfg.signerAssets != nil {
			contract, err = cfg.signerAssets.Resolve(c.Context(), cfg.resolveScope(c), tokenRecord)
			if err != nil {
				return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to resolve signer asset contract", nil)
			}
		}

		escapedToken := url.PathEscape(token)
		sessionURL := strings.Replace(routes.SignerSession, ":token", escapedToken, 1)
		contractURL := strings.Replace(routes.SignerAssets, ":token", escapedToken, 1)
		assets := buildSignerAssetLinks(contract, contractURL, sessionURL)

		rawAssetType := strings.TrimSpace(c.Query("asset"))
		assetType := normalizeSignerAssetType(rawAssetType)
		if rawAssetType != "" && assetType == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "asset must be one of source|executed|certificate", map[string]any{
				"asset": rawAssetType,
			})
		}
		if assetType != "" {
			if !signerRoleCanAccessAsset(contract.RecipientRole, assetType) || !signerAssetAvailable(contract, assetType) {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			if cfg.objectStore == nil {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			objectKey := signerAssetObjectKey(contract, assetType)
			if objectKey == "" {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			disposition := resolveSignerAssetDisposition(c.Query("disposition"))
			filename := signerAssetFilename(contract, assetType)

			if cfg.auditEvents != nil {
				metadataJSON := "{}"
				if encoded, merr := json.Marshal(map[string]any{
					"recipient_id": strings.TrimSpace(contract.RecipientID),
					"asset":        assetType,
					"disposition":  disposition,
				}); merr == nil {
					metadataJSON = string(encoded)
				}
				_, _ = cfg.auditEvents.Append(c.Context(), cfg.resolveScope(c), stores.AuditEventRecord{
					AgreementID:  strings.TrimSpace(contract.AgreementID),
					EventType:    "signer.assets.asset_opened",
					ActorType:    "signer_token",
					ActorID:      strings.TrimSpace(contract.RecipientID),
					IPAddress:    strings.TrimSpace(c.IP()),
					UserAgent:    strings.TrimSpace(c.Header("User-Agent")),
					MetadataJSON: metadataJSON,
					CreatedAt:    time.Now().UTC(),
				})
			}
			if err := quickstart.ServeBinaryObject(c, quickstart.BinaryObjectResponseConfig{
				Store:       cfg.objectStore,
				ObjectKey:   objectKey,
				ContentType: "application/pdf",
				Filename:    filename,
				Disposition: disposition,
			}); err != nil {
				if !errors.Is(err, quickstart.ErrBinaryObjectUnavailable) {
					return err
				}
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			return nil
		}

		if cfg.auditEvents != nil {
			metadataJSON := "{}"
			if encoded, merr := json.Marshal(map[string]any{
				"recipient_id": strings.TrimSpace(contract.RecipientID),
				"assets":       assets,
			}); merr == nil {
				metadataJSON = string(encoded)
			}
			_, _ = cfg.auditEvents.Append(c.Context(), cfg.resolveScope(c), stores.AuditEventRecord{
				AgreementID:  strings.TrimSpace(contract.AgreementID),
				EventType:    "signer.assets.contract_viewed",
				ActorType:    "signer_token",
				ActorID:      strings.TrimSpace(contract.RecipientID),
				IPAddress:    strings.TrimSpace(c.IP()),
				UserAgent:    strings.TrimSpace(c.Header("User-Agent")),
				MetadataJSON: metadataJSON,
				CreatedAt:    time.Now().UTC(),
			})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"status":   "ok",
			"contract": contract,
			"assets":   assets,
		})
	})

	r.Post(routes.SignerTelemetry, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		if _, err := resolveSignerToken(c, cfg, token); err != nil {
			return asHandlerError(err)
		}

		acceptedEvents := 0
		if payload := c.Body(); len(payload) > 0 {
			var envelope struct {
				Events  []map[string]any `json:"events"`
				Summary map[string]any   `json:"summary"`
			}
			if err := json.Unmarshal(payload, &envelope); err == nil {
				acceptedEvents = len(envelope.Events)
			}
		}

		return c.JSON(http.StatusAccepted, map[string]any{
			"status":          "accepted",
			"accepted_events": acceptedEvents,
		})
	})

	r.Post(routes.SignerConsent, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerConsent); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		var payload services.SignerConsentInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid consent payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		result, err := cfg.signerSession.CaptureConsent(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
		if err != nil {
			return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to capture consent", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "accepted",
			"consent": result,
		})
	})

	r.Post(routes.SignerFieldValues, func(c router.Context) error {
		startedAt := time.Now()
		unifiedFlow := isUnifiedFlowRequest(c)
		if err := enforceTransportSecurity(c, cfg); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		var payload struct {
			FieldInstanceID   string `json:"field_instance_id"`
			FieldDefinitionID string `json:"field_definition_id"`
			ValueText         string `json:"value_text,omitempty"`
			ValueBool         *bool  `json:"value_bool,omitempty"`
			ExpectedVersion   int64  `json:"expected_version,omitempty"`
		}
		if err := c.Bind(&payload); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field value payload", nil)
		}
		if strings.TrimSpace(payload.FieldInstanceID) == "" {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "field_instance_id is required", nil)
		}
		value, err := cfg.signerSession.UpsertFieldValue(c.Context(), cfg.resolveScope(c), tokenRecord, services.SignerFieldValueInput{
			FieldInstanceID:   strings.TrimSpace(payload.FieldInstanceID),
			FieldDefinitionID: strings.TrimSpace(payload.FieldDefinitionID),
			ValueText:         payload.ValueText,
			ValueBool:         payload.ValueBool,
			ExpectedVersion:   payload.ExpectedVersion,
			IPAddress:         strings.TrimSpace(c.IP()),
			UserAgent:         strings.TrimSpace(c.Header("User-Agent")),
		})
		if err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to upsert field value", nil)
		}
		if unifiedFlow {
			observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), true)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":      "ok",
			"field_value": value,
		})
	})

	r.Post(routes.SignerSignature, func(c router.Context) error {
		startedAt := time.Now()
		unifiedFlow := isUnifiedFlowRequest(c)
		if err := enforceTransportSecurity(c, cfg); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		var payload struct {
			FieldInstanceID   string `json:"field_instance_id"`
			FieldDefinitionID string `json:"field_definition_id"`
			Type              string `json:"type"`
			ObjectKey         string `json:"object_key"`
			SHA256            string `json:"sha256"`
			UploadToken       string `json:"upload_token,omitempty"`
			ValueText         string `json:"value_text,omitempty"`
			ExpectedVersion   int64  `json:"expected_version,omitempty"`
		}
		if err := c.Bind(&payload); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signature payload", nil)
		}
		if strings.TrimSpace(payload.FieldInstanceID) == "" {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "field_instance_id is required", nil)
		}
		result, err := cfg.signerSession.AttachSignatureArtifact(c.Context(), cfg.resolveScope(c), tokenRecord, services.SignerSignatureInput{
			FieldInstanceID:   strings.TrimSpace(payload.FieldInstanceID),
			FieldDefinitionID: strings.TrimSpace(payload.FieldDefinitionID),
			Type:              strings.TrimSpace(payload.Type),
			ObjectKey:         strings.TrimSpace(payload.ObjectKey),
			SHA256:            strings.TrimSpace(payload.SHA256),
			UploadToken:       strings.TrimSpace(payload.UploadToken),
			ValueText:         payload.ValueText,
			ExpectedVersion:   payload.ExpectedVersion,
			IPAddress:         strings.TrimSpace(c.IP()),
			UserAgent:         strings.TrimSpace(c.Header("User-Agent")),
		})
		if err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to attach signature", nil)
		}
		if unifiedFlow {
			observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), true)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			"signature": result,
		})
	})

	r.Post(routes.SignerSignatureUpload, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		var payload struct {
			FieldInstanceID   string `json:"field_instance_id"`
			FieldDefinitionID string `json:"field_definition_id"`
			SHA256            string `json:"sha256"`
			ContentType       string `json:"content_type,omitempty"`
			SizeBytes         int64  `json:"size_bytes,omitempty"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signature upload payload", nil)
		}
		if strings.TrimSpace(payload.FieldInstanceID) == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "field_instance_id is required", nil)
		}
		contract, err := cfg.signerSession.IssueSignatureUpload(c.Context(), cfg.resolveScope(c), tokenRecord, services.SignerSignatureUploadInput{
			FieldInstanceID:   strings.TrimSpace(payload.FieldInstanceID),
			FieldDefinitionID: strings.TrimSpace(payload.FieldDefinitionID),
			SHA256:            strings.TrimSpace(payload.SHA256),
			ContentType:       strings.TrimSpace(payload.ContentType),
			SizeBytes:         payload.SizeBytes,
			IPAddress:         strings.TrimSpace(c.IP()),
			UserAgent:         strings.TrimSpace(c.Header("User-Agent")),
		})
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to issue signature upload contract", nil)
		}
		contract.UploadURL = strings.TrimSpace(routes.SignerSignatureObject)
		c.SetHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, private")
		c.SetHeader("Pragma", "no-cache")
		return c.JSON(http.StatusOK, map[string]any{
			"status":   "ok",
			"contract": contract,
		})
	})

	r.Put(routes.SignerSignatureObject, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		uploadToken := strings.TrimSpace(c.Header("X-ESign-Upload-Token"))
		if uploadToken == "" {
			uploadToken = strings.TrimSpace(c.Query("upload_token"))
		}
		objectKey := strings.TrimSpace(c.Header("X-ESign-Upload-Key"))
		if objectKey == "" {
			objectKey = strings.TrimSpace(c.Query("object_key"))
		}
		body := c.Body()
		if len(body) == 0 {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "signature upload body is required", nil)
		}
		digest := sha256.Sum256(body)
		receipt, err := cfg.signerSession.ConfirmSignatureUpload(c.Context(), cfg.resolveScope(c), services.SignerSignatureUploadCommitInput{
			UploadToken: uploadToken,
			ObjectKey:   objectKey,
			SHA256:      hex.EncodeToString(digest[:]),
			ContentType: strings.TrimSpace(c.Header("Content-Type")),
			SizeBytes:   int64(len(body)),
			Payload:     append([]byte{}, body...),
			IPAddress:   strings.TrimSpace(c.IP()),
			UserAgent:   strings.TrimSpace(c.Header("User-Agent")),
		})
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to confirm signature upload", nil)
		}
		c.SetHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, private")
		c.SetHeader("Pragma", "no-cache")
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"upload": receipt,
		})
	})

	r.Post(routes.SignerSubmit, func(c router.Context) error {
		startedAt := time.Now()
		unifiedFlow := isUnifiedFlowRequest(c)
		idempotencyKey := strings.TrimSpace(c.Header("Idempotency-Key"))
		correlationID := apiCorrelationID(c, idempotencyKey, c.Param("token"), "signer_submit")
		if err := enforceTransportSecurity(c, cfg); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			werr := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
			observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), false)
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
			return werr
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			werr := writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
			observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), false)
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
			return werr
		}
		result, err := cfg.signerSession.Submit(c.Context(), cfg.resolveScope(c), tokenRecord, services.SignerSubmitInput{
			IdempotencyKey: idempotencyKey,
			IPAddress:      strings.TrimSpace(c.IP()),
			UserAgent:      strings.TrimSpace(c.Header("User-Agent")),
		})
		if err != nil {
			werr := writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to submit signer completion", nil)
			observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), false)
			if unifiedFlow {
				observability.ObserveUnifiedSubmitConversion(c.Context(), false)
			}
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return werr
		}
		respErr := c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"submit": result,
		})
		observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), respErr == nil)
		if unifiedFlow {
			if respErr == nil && !result.Replay {
				observability.ObserveUnifiedSubmitConversion(c.Context(), true)
			}
		}
		logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, respErr, map[string]any{
			"agreement_id": strings.TrimSpace(result.Agreement.ID),
			"completed":    result.Completed,
		})
		return respErr
	})

	r.Post(routes.SignerDecline, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
		}
		var payload services.SignerDeclineInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid decline payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		result, err := cfg.signerSession.Decline(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
		if err != nil {
			return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to process decline", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "ok",
			"decline": result,
		})
	})
}

func resolveAdminUserID(c router.Context) string {
	if c == nil {
		return ""
	}
	userID := strings.TrimSpace(c.Query("user_id"))
	if userID == "" {
		userID = strings.TrimSpace(c.Header("X-User-ID"))
	}
	return userID
}

func parsePageSize(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	var parsed int
	if _, err := fmt.Sscan(raw, &parsed); err != nil {
		return 0
	}
	return parsed
}

func firstIntPointer(values ...*int) *int {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstFloatPointer(values ...*float64) *float64 {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func formatTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func draftRecordToSummaryMap(record stores.DraftRecord) map[string]any {
	return map[string]any{
		"id":           strings.TrimSpace(record.ID),
		"wizard_id":    strings.TrimSpace(record.WizardID),
		"title":        strings.TrimSpace(record.Title),
		"current_step": record.CurrentStep,
		"document_id":  nullableString(record.DocumentID),
		"created_at":   record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":   record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"expires_at":   record.ExpiresAt.UTC().Format(time.RFC3339Nano),
		"revision":     record.Revision,
	}
}

func draftRecordToDetailMap(record stores.DraftRecord) map[string]any {
	out := draftRecordToSummaryMap(record)
	out["wizard_state"] = decodeDraftWizardState(record.WizardStateJSON)
	return out
}

func decodeDraftWizardState(raw string) map[string]any {
	decoded := map[string]any{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return decoded
	}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil || decoded == nil {
		return map[string]any{}
	}
	return decoded
}

func normalizeDraftMutationError(err error) error {
	if err == nil {
		return nil
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return err
	}

	text := strings.TrimSpace(strings.ToLower(coded.TextCode))
	switch text {
	case "version_conflict":
		currentRevision := extractCurrentRevision(coded.Metadata)
		return goerrors.New("stale revision", goerrors.CategoryConflict).
			WithCode(http.StatusConflict).
			WithTextCode("stale_revision").
			WithMetadata(map[string]any{"current_revision": currentRevision})
	case "missing_required_fields":
		return goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusUnprocessableEntity).
			WithTextCode("validation_failed").
			WithMetadata(copyAnyMap(coded.Metadata))
	}
	return err
}

func extractCurrentRevision(metadata map[string]any) int64 {
	if len(metadata) == 0 {
		return 0
	}
	if raw, ok := metadata["current_revision"]; ok {
		if parsed, ok := coerceInt64(raw); ok {
			return parsed
		}
	}
	if raw, ok := metadata["actual"]; ok {
		if parsed, ok := coerceInt64(raw); ok {
			return parsed
		}
	}
	return 0
}

func coerceInt64(value any) (int64, bool) {
	switch typed := value.(type) {
	case int:
		return int64(typed), true
	case int8:
		return int64(typed), true
	case int16:
		return int64(typed), true
	case int32:
		return int64(typed), true
	case int64:
		return typed, true
	case uint:
		return int64(typed), true
	case uint8:
		return int64(typed), true
	case uint16:
		return int64(typed), true
	case uint32:
		return int64(typed), true
	case uint64:
		return int64(typed), true
	case float32:
		return int64(typed), true
	case float64:
		return int64(typed), true
	case string:
		var parsed int64
		if _, err := fmt.Sscan(strings.TrimSpace(typed), &parsed); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func copyAnyMap(source map[string]any) map[string]any {
	if len(source) == 0 {
		return nil
	}
	out := make(map[string]any, len(source))
	for key, value := range source {
		out[key] = value
	}
	return out
}

func participantRecordToMap(record stores.ParticipantRecord) map[string]any {
	return map[string]any{
		"id":             strings.TrimSpace(record.ID),
		"agreement_id":   strings.TrimSpace(record.AgreementID),
		"email":          strings.TrimSpace(record.Email),
		"name":           strings.TrimSpace(record.Name),
		"role":           strings.TrimSpace(record.Role),
		"signing_stage":  record.SigningStage,
		"first_view_at":  formatTime(record.FirstViewAt),
		"last_view_at":   formatTime(record.LastViewAt),
		"declined_at":    formatTime(record.DeclinedAt),
		"decline_reason": strings.TrimSpace(record.DeclineReason),
		"completed_at":   formatTime(record.CompletedAt),
		"version":        record.Version,
		"created_at":     record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":     record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func fieldDefinitionRecordToMap(record stores.FieldDefinitionRecord) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(record.ID),
		"agreement_id":    strings.TrimSpace(record.AgreementID),
		"participant_id":  strings.TrimSpace(record.ParticipantID),
		"field_type":      strings.TrimSpace(record.Type),
		"type":            strings.TrimSpace(record.Type),
		"required":        record.Required,
		"validation_json": strings.TrimSpace(record.ValidationJSON),
		"created_at":      record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":      record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func fieldInstanceRecordToMap(record stores.FieldInstanceRecord) map[string]any {
	return map[string]any{
		"id":                  strings.TrimSpace(record.ID),
		"agreement_id":        strings.TrimSpace(record.AgreementID),
		"field_definition_id": strings.TrimSpace(record.FieldDefinitionID),
		"page_number":         record.PageNumber,
		"page":                record.PageNumber,
		"x":                   record.X,
		"y":                   record.Y,
		"width":               record.Width,
		"height":              record.Height,
		"tab_index":           record.TabIndex,
		"label":               strings.TrimSpace(record.Label),
		"appearance_json":     strings.TrimSpace(record.AppearanceJSON),
		"placement_source":    strings.TrimSpace(record.PlacementSource),
		"resolver_id":         strings.TrimSpace(record.ResolverID),
		"confidence":          record.Confidence,
		"placement_run_id":    strings.TrimSpace(record.PlacementRunID),
		"manual_override":     record.ManualOverride,
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func placementRunRecordToMap(record stores.PlacementRunRecord) map[string]any {
	return map[string]any{
		"id":                        strings.TrimSpace(record.ID),
		"agreement_id":              strings.TrimSpace(record.AgreementID),
		"status":                    strings.TrimSpace(record.Status),
		"reason_code":               strings.TrimSpace(record.ReasonCode),
		"resolver_order":            append([]string{}, record.ResolverOrder...),
		"executed_resolvers":        append([]string{}, record.ExecutedResolvers...),
		"resolver_scores":           record.ResolverScores,
		"suggestions":               record.Suggestions,
		"selected_suggestion_ids":   append([]string{}, record.SelectedSuggestionIDs...),
		"unresolved_definition_ids": append([]string{}, record.UnresolvedDefinitionIDs...),
		"selected_source":           strings.TrimSpace(record.SelectedSource),
		"policy_json":               strings.TrimSpace(record.PolicyJSON),
		"max_budget":                record.MaxBudget,
		"budget_used":               record.BudgetUsed,
		"max_time_ms":               record.MaxTimeMS,
		"elapsed_ms":                record.ElapsedMS,
		"manual_override_count":     record.ManualOverrideCount,
		"created_by_user_id":        strings.TrimSpace(record.CreatedByUserID),
		"version":                   record.Version,
		"created_at":                record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":                record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"completed_at":              formatTime(record.CompletedAt),
	}
}

func mappingSpecRecordToMap(record stores.MappingSpecRecord) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(record.ID),
		"provider":           strings.TrimSpace(record.Provider),
		"name":               strings.TrimSpace(record.Name),
		"version":            record.Version,
		"status":             strings.TrimSpace(record.Status),
		"external_schema":    record.ExternalSchema,
		"rules":              record.Rules,
		"compiled_json":      strings.TrimSpace(record.CompiledJSON),
		"compiled_hash":      strings.TrimSpace(record.CompiledHash),
		"published_at":       formatTime(record.PublishedAt),
		"created_by_user_id": strings.TrimSpace(record.CreatedByUserID),
		"updated_by_user_id": strings.TrimSpace(record.UpdatedByUserID),
		"created_at":         record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":         record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationSyncRunRecordToMap(record stores.IntegrationSyncRunRecord) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(record.ID),
		"provider":           strings.TrimSpace(record.Provider),
		"direction":          strings.TrimSpace(record.Direction),
		"mapping_spec_id":    strings.TrimSpace(record.MappingSpecID),
		"status":             strings.TrimSpace(record.Status),
		"cursor":             strings.TrimSpace(record.Cursor),
		"last_error":         strings.TrimSpace(record.LastError),
		"attempt_count":      record.AttemptCount,
		"version":            record.Version,
		"started_at":         record.StartedAt.UTC().Format(time.RFC3339Nano),
		"completed_at":       formatTime(record.CompletedAt),
		"created_by_user_id": strings.TrimSpace(record.CreatedByUserID),
		"created_at":         record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":         record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationCheckpointRecordToMap(record stores.IntegrationCheckpointRecord) map[string]any {
	return map[string]any{
		"id":             strings.TrimSpace(record.ID),
		"run_id":         strings.TrimSpace(record.RunID),
		"checkpoint_key": strings.TrimSpace(record.CheckpointKey),
		"cursor":         strings.TrimSpace(record.Cursor),
		"payload_json":   strings.TrimSpace(record.PayloadJSON),
		"version":        record.Version,
		"created_at":     record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":     record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationConflictRecordToMap(record stores.IntegrationConflictRecord) map[string]any {
	return map[string]any{
		"id":                  strings.TrimSpace(record.ID),
		"run_id":              strings.TrimSpace(record.RunID),
		"binding_id":          strings.TrimSpace(record.BindingID),
		"provider":            strings.TrimSpace(record.Provider),
		"entity_kind":         strings.TrimSpace(record.EntityKind),
		"external_id":         strings.TrimSpace(record.ExternalID),
		"internal_id":         strings.TrimSpace(record.InternalID),
		"status":              strings.TrimSpace(record.Status),
		"reason":              strings.TrimSpace(record.Reason),
		"payload_json":        strings.TrimSpace(record.PayloadJSON),
		"resolution_json":     strings.TrimSpace(record.ResolutionJSON),
		"resolved_by_user_id": strings.TrimSpace(record.ResolvedByUserID),
		"resolved_at":         formatTime(record.ResolvedAt),
		"version":             record.Version,
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationChangeEventRecordToMap(record stores.IntegrationChangeEventRecord) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(record.ID),
		"agreement_id":    strings.TrimSpace(record.AgreementID),
		"provider":        strings.TrimSpace(record.Provider),
		"event_type":      strings.TrimSpace(record.EventType),
		"source_event_id": strings.TrimSpace(record.SourceEventID),
		"idempotency_key": strings.TrimSpace(record.IdempotencyKey),
		"payload_json":    strings.TrimSpace(record.PayloadJSON),
		"emitted_at":      record.EmittedAt.UTC().Format(time.RFC3339Nano),
		"created_at":      record.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func googleImportRunDedupeKey(userID, googleFileID, sourceVersionHint string) string {
	parts := strings.Join([]string{
		strings.TrimSpace(strings.ToLower(userID)),
		strings.TrimSpace(strings.ToLower(googleFileID)),
		strings.TrimSpace(strings.ToLower(sourceVersionHint)),
	}, "|")
	sum := sha256.Sum256([]byte(parts))
	return hex.EncodeToString(sum[:])
}

func googleImportRunRecordToMap(record stores.GoogleImportRunRecord) map[string]any {
	out := map[string]any{
		"import_run_id":       strings.TrimSpace(record.ID),
		"id":                  strings.TrimSpace(record.ID),
		"status":              strings.TrimSpace(record.Status),
		"user_id":             strings.TrimSpace(record.UserID),
		"google_file_id":      strings.TrimSpace(record.GoogleFileID),
		"source_version_hint": strings.TrimSpace(record.SourceVersionHint),
		"dedupe_key":          strings.TrimSpace(record.DedupeKey),
		"document_title":      strings.TrimSpace(record.DocumentTitle),
		"agreement_title":     strings.TrimSpace(record.AgreementTitle),
		"created_by_user_id":  strings.TrimSpace(record.CreatedByUserID),
		"correlation_id":      strings.TrimSpace(record.CorrelationID),
		"source_mime_type":    strings.TrimSpace(record.SourceMimeType),
		"ingestion_mode":      strings.TrimSpace(record.IngestionMode),
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"started_at":          formatTime(record.StartedAt),
		"completed_at":        formatTime(record.CompletedAt),
	}
	if strings.TrimSpace(record.DocumentID) != "" {
		out["document"] = map[string]any{"id": strings.TrimSpace(record.DocumentID)}
	}
	if strings.TrimSpace(record.AgreementID) != "" {
		out["agreement"] = map[string]any{"id": strings.TrimSpace(record.AgreementID), "document_id": strings.TrimSpace(record.DocumentID)}
	}
	if strings.TrimSpace(record.ErrorCode) != "" || strings.TrimSpace(record.ErrorMessage) != "" {
		errPayload := map[string]any{
			"code":    strings.TrimSpace(record.ErrorCode),
			"message": strings.TrimSpace(record.ErrorMessage),
		}
		if details := decodeJSONMap(record.ErrorDetailsJSON); len(details) > 0 {
			errPayload["details"] = details
		}
		out["error"] = errPayload
	}
	return out
}

func decodeJSONMap(raw string) map[string]any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	out := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func apiCorrelationID(c router.Context, candidates ...string) string {
	if c == nil {
		return observability.ResolveCorrelationID(candidates...)
	}
	values := []string{
		c.Header("X-Correlation-ID"),
		c.Header("Idempotency-Key"),
	}
	values = append(values, candidates...)
	return observability.ResolveCorrelationID(values...)
}

func isUnifiedFlowRequest(c router.Context) bool {
	return c != nil
}

func buildSignerAssetLinks(contract services.SignerAssetContract, contractURL, sessionURL string) map[string]any {
	assets := map[string]any{
		"contract_url": strings.TrimSpace(contractURL),
		"session_url":  strings.TrimSpace(sessionURL),
	}
	if contract.SourceDocumentAvailable {
		assets["source_url"] = strings.TrimSpace(contractURL) + "?asset=source"
	}
	if contract.ExecutedArtifactAvailable {
		assets["executed_url"] = strings.TrimSpace(contractURL) + "?asset=executed"
	}
	if contract.CertificateAvailable {
		assets["certificate_url"] = strings.TrimSpace(contractURL) + "?asset=certificate"
	}
	return assets
}

func normalizeSignerAssetType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "source":
		return "source"
	case "executed":
		return "executed"
	case "certificate":
		return "certificate"
	default:
		return ""
	}
}

func signerAssetAvailable(contract services.SignerAssetContract, assetType string) bool {
	switch normalizeSignerAssetType(assetType) {
	case "source":
		return contract.SourceDocumentAvailable
	case "executed":
		return contract.ExecutedArtifactAvailable
	case "certificate":
		return contract.CertificateAvailable
	default:
		return false
	}
}

func signerRoleCanAccessAsset(role, assetType string) bool {
	role = strings.ToLower(strings.TrimSpace(role))
	assetType = normalizeSignerAssetType(assetType)
	if assetType == "" {
		return false
	}
	switch role {
	case stores.RecipientRoleSigner, stores.RecipientRoleCC:
		return true
	default:
		return false
	}
}

func resolveSignerAssetDisposition(raw string) string {
	if strings.EqualFold(strings.TrimSpace(raw), "attachment") {
		return "attachment"
	}
	return "inline"
}

func signerAssetFilename(contract services.SignerAssetContract, assetType string) string {
	baseID := strings.TrimSpace(contract.AgreementID)
	if baseID == "" {
		baseID = "agreement"
	}
	assetType = normalizeSignerAssetType(assetType)
	if assetType == "" {
		assetType = "asset"
	}
	return fmt.Sprintf("%s-%s.pdf", baseID, assetType)
}

func signerAssetObjectKey(contract services.SignerAssetContract, assetType string) string {
	switch normalizeSignerAssetType(assetType) {
	case "source":
		return strings.TrimSpace(contract.SourceObjectKey)
	case "executed":
		return strings.TrimSpace(contract.ExecutedObjectKey)
	case "certificate":
		return strings.TrimSpace(contract.CertificateObjectKey)
	default:
		return ""
	}
}

func logAPIOperation(ctx context.Context, operation, correlationID string, startedAt time.Time, err error, fields map[string]any) {
	outcome := "success"
	level := slog.LevelInfo
	if err != nil {
		outcome = "error"
		level = slog.LevelWarn
	}
	duration := time.Since(startedAt)
	if fields == nil {
		fields = map[string]any{}
	}
	if raw, ok := fields["outcome"].(string); ok {
		trimmed := strings.TrimSpace(raw)
		if trimmed != "" {
			outcome = trimmed
			if trimmed == "error" && err == nil {
				level = slog.LevelWarn
			}
		}
	}
	observability.LogOperation(ctx, level, "api", strings.TrimSpace(operation), outcome, strings.TrimSpace(correlationID), duration, err, fields)
}
