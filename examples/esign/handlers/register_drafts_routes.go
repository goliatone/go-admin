package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	router "github.com/goliatone/go-router"
)

func registerDraftRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
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
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft payload"); err != nil {
				return err
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
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft payload"); err != nil {
				return err
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
			if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid draft send payload"); err != nil {
				return err
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
}
