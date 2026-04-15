package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

func registerGoogleRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if !cfg.googleEnabled || cfg.google == nil {
		return
	}
	registerGoogleOAuthRoutes(adminRoutes, routes, cfg)
	registerGoogleDriveRoutes(adminRoutes, routes, cfg)
	registerGoogleImportRoutes(adminRoutes, routes, cfg)
}

func registerGoogleOAuthRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	adminRoutes.Post(routes.AdminGoogleOAuthConnect, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		var payload struct {
			AuthCode    string `json:"auth_code"`
			AccountID   string `json:"account_id"`
			RedirectURI string `json:"redirect_uri"`
		}
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid oauth connect payload"); err != nil {
			return err
		}
		accountID := stableString(firstNonEmpty(payload.AccountID, c.Query("account_id")))
		status, err := cfg.google.Connect(c.Context(), cfg.resolveScope(c), services.GoogleConnectInput{
			UserID:      userID,
			AccountID:   accountID,
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
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		accountID := stableString(c.Query("account_id"))
		scopedUserID := services.ComposeGoogleScopedUserID(userID, accountID)
		if err := cfg.google.Disconnect(c.Context(), cfg.resolveScope(c), scopedUserID); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGoogleAccessRevoked), "google oauth disconnect failed", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":     "disconnected",
			"provider":   services.GoogleProviderName,
			"user_id":    userID,
			"account_id": accountID,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

	adminRoutes.Post(routes.AdminGoogleOAuthRotate, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		accountID := stableString(c.Query("account_id"))
		scopedUserID := services.ComposeGoogleScopedUserID(userID, accountID)
		status, err := cfg.google.RotateCredentialEncryption(c.Context(), cfg.resolveScope(c), scopedUserID)
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
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		accountID := stableString(c.Query("account_id"))
		scopedUserID := services.ComposeGoogleScopedUserID(userID, accountID)
		status, err := cfg.google.Status(c.Context(), cfg.resolveScope(c), scopedUserID)
		if err != nil {
			return writeAPIError(c, err, http.StatusInternalServerError, "GOOGLE_STATUS_UNAVAILABLE", "google oauth status failed", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":      "ok",
			"integration": status,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

	adminRoutes.Get(routes.AdminGoogleOAuthAccounts, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		baseUserID, _ := services.ParseGoogleScopedUserID(userID)
		if baseUserID == "" {
			baseUserID = userID
		}
		accounts, err := cfg.google.ListAccounts(c.Context(), cfg.resolveScope(c), baseUserID)
		if err != nil {
			return writeAPIError(c, err, http.StatusInternalServerError, "GOOGLE_ACCOUNTS_UNAVAILABLE", "failed to list google accounts", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":   "ok",
			"accounts": accounts,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))
}

type googleDriveListFunc func(context.Context, stores.Scope, services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
type googleDriveQueryBuilder func(router.Context, string, string, int) services.GoogleDriveQueryInput

func registerGoogleDriveRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	adminRoutes.Get(
		routes.AdminGoogleDriveSearch,
		googleDriveListHandler(cfg, "google drive search failed", cfg.google.SearchFiles, func(c router.Context, userID, accountID string, pageSize int) services.GoogleDriveQueryInput {
			return services.GoogleDriveQueryInput{
				UserID:    userID,
				AccountID: accountID,
				Query:     strings.TrimSpace(c.Query("q")),
				PageToken: strings.TrimSpace(c.Query("page_token")),
				PageSize:  pageSize,
			}
		}),
		requireAdminPermission(cfg, cfg.permissions.AdminCreate),
	)

	adminRoutes.Get(
		routes.AdminGoogleDriveBrowse,
		googleDriveListHandler(cfg, "google drive browse failed", cfg.google.BrowseFiles, func(c router.Context, userID, accountID string, pageSize int) services.GoogleDriveQueryInput {
			return services.GoogleDriveQueryInput{
				UserID:    userID,
				AccountID: accountID,
				FolderID:  strings.TrimSpace(c.Query("folder_id")),
				PageToken: strings.TrimSpace(c.Query("page_token")),
				PageSize:  pageSize,
			}
		}),
		requireAdminPermission(cfg, cfg.permissions.AdminCreate),
	)
}

func googleDriveListHandler(cfg registerConfig, failureMessage string, listFiles googleDriveListFunc, buildInput googleDriveQueryBuilder) func(router.Context) error {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
		}
		accountID := stableString(c.Query("account_id"))
		pageSize := parsePageSize(c.Query("page_size"))
		result, err := listFiles(c.Context(), cfg.resolveScope(c), buildInput(c, userID, accountID, pageSize))
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), failureMessage, nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":          "ok",
			"files":           result.Files,
			"next_page_token": result.NextPageToken,
		})
	}
}

func registerGoogleImportRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	adminRoutes.Post(routes.AdminGoogleDriveImports, func(c router.Context) error {
		startedAt := time.Now()
		correlationID := apiCorrelationID(c, c.Header("Idempotency-Key"), c.Query("user_id"), "google_drive_imports_create")
		if err := enforceTransportSecurity(c, cfg); err != nil {
			logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		if cfg.googleImportRuns == nil || cfg.googleImportJobs == nil || cfg.googleImportEnqueue == nil {
			err := writeAPIError(c, nil, http.StatusServiceUnavailable, string(services.ErrorCodeGoogleProviderDegraded), "google import async runtime unavailable", nil)
			logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, nil, map[string]any{"outcome": "runtime_unavailable"})
			return err
		}
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
			return err
		}
		var payload struct {
			GoogleFileID      string `json:"google_file_id"`
			AccountID         string `json:"account_id"`
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
		accountID := stableString(firstNonEmpty(payload.AccountID, c.Query("account_id")))
		scope := cfg.resolveScope(c)
		dedupeKey := googleImportRunDedupeKey(userID, accountID, payload.GoogleFileID, payload.SourceVersionHint)
		runInput := stores.GoogleImportRunInput{
			UserID:            userID,
			GoogleFileID:      strings.TrimSpace(payload.GoogleFileID),
			SourceVersionHint: strings.TrimSpace(payload.SourceVersionHint),
			DedupeKey:         dedupeKey,
			DocumentTitle:     strings.TrimSpace(payload.DocumentTitle),
			AgreementTitle:    strings.TrimSpace(payload.AgreementTitle),
			CreatedByUserID:   strings.TrimSpace(payload.CreatedByUserID),
			CorrelationID:     correlationID,
			RequestedAt:       time.Now().UTC(),
		}
		jobMsg := jobs.GoogleDriveImportMsg{
			Scope:             scope,
			UserID:            userID,
			GoogleAccountID:   accountID,
			GoogleFileID:      strings.TrimSpace(payload.GoogleFileID),
			SourceVersionHint: strings.TrimSpace(payload.SourceVersionHint),
			DocumentTitle:     strings.TrimSpace(payload.DocumentTitle),
			AgreementTitle:    strings.TrimSpace(payload.AgreementTitle),
			CreatedByUserID:   strings.TrimSpace(payload.CreatedByUserID),
			CorrelationID:     correlationID,
			DedupeKey:         dedupeKey,
		}
		run, created, err := beginGoogleImportSubmission(c.Context(), cfg, scope, runInput, jobMsg)
		if err != nil {
			statusCode := http.StatusBadRequest
			errorCode := string(services.ErrorCodeMissingRequiredFields)
			message := "unable to queue google import"
			var enqueueErr *googleImportEnqueueError
			if errors.As(err, &enqueueErr) {
				statusCode = http.StatusServiceUnavailable
				errorCode = string(services.ErrorCodeGoogleProviderDegraded)
				message = "unable to enqueue google import"
			}
			werr := writeAPIError(c, err, statusCode, errorCode, message, nil)
			logAPIOperation(c.Context(), "google_drive_imports_create", correlationID, startedAt, err, nil)
			return werr
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
		userID := resolveGoogleAdminUserID(c)
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
		payload := googleImportRunRecordToMap(run)
		if cfg.sourceReadModels != nil {
			status, statusErr := cfg.sourceReadModels.GetGoogleImportLineageStatus(c.Context(), scope, run.ID)
			if statusErr != nil {
				werr := writeAPIError(c, statusErr, http.StatusInternalServerError, string(services.ErrorCodeGoogleProviderDegraded), "google import lineage status unavailable", nil)
				logAPIOperation(c.Context(), "google_drive_imports_get", correlationID, startedAt, statusErr, nil)
				return werr
			}
			payload = applyGoogleImportLineageStatus(payload, status)
		}
		respErr := c.JSON(http.StatusOK, payload)
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
		userID := resolveGoogleAdminUserID(c)
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
			payload := googleImportRunRecordToMap(run)
			if cfg.sourceReadModels != nil {
				status, statusErr := cfg.sourceReadModels.GetGoogleImportLineageStatus(c.Context(), scope, run.ID)
				if statusErr != nil {
					werr := writeAPIError(c, statusErr, http.StatusInternalServerError, string(services.ErrorCodeGoogleProviderDegraded), "google import lineage status unavailable", nil)
					logAPIOperation(c.Context(), "google_drive_imports_list", correlationID, startedAt, statusErr, nil)
					return werr
				}
				payload = applyGoogleImportLineageStatus(payload, status)
			}
			rows = append(rows, payload)
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
		userID := resolveGoogleAdminUserID(c)
		if userID == "" {
			err := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
			return err
		}
		var payload struct {
			GoogleFileID      string `json:"google_file_id"`
			AccountID         string `json:"account_id"`
			DocumentTitle     string `json:"document_title"`
			AgreementTitle    string `json:"agreement_title"`
			CreatedByUserID   string `json:"created_by_user_id"`
			SourceVersionHint string `json:"source_version_hint"`
		}
		if err := c.Bind(&payload); err != nil {
			werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid google import payload", nil)
			logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, nil)
			return werr
		}
		c.Set("Deprecation", "true")
		c.Set("Link", fmt.Sprintf("<%s>; rel=\"successor-version\"", routes.AdminGoogleDriveImports))
		accountID := stableString(firstNonEmpty(payload.AccountID, c.Query("account_id")))
		idempotencyKey := googleImportRunDedupeKey(userID, accountID, payload.GoogleFileID, payload.SourceVersionHint)
		imported, err := cfg.google.ImportDocument(c.Context(), cfg.resolveScope(c), services.GoogleImportInput{
			UserID:            userID,
			AccountID:         accountID,
			GoogleFileID:      strings.TrimSpace(payload.GoogleFileID),
			SourceVersionHint: strings.TrimSpace(payload.SourceVersionHint),
			DocumentTitle:     strings.TrimSpace(payload.DocumentTitle),
			AgreementTitle:    strings.TrimSpace(payload.AgreementTitle),
			CreatedByUserID:   strings.TrimSpace(payload.CreatedByUserID),
			CorrelationID:     correlationID,
			IdempotencyKey:    idempotencyKey,
		})
		if err != nil {
			var inProgress *services.GoogleImportInProgressError
			if errors.As(err, &inProgress) && inProgress != nil {
				statusURL := ""
				if strings.TrimSpace(inProgress.RunID) != "" {
					statusURL = strings.Replace(routes.AdminGoogleDriveImportRun, ":import_run_id", strings.TrimSpace(inProgress.RunID), 1)
				}
				werr := writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeIntegrationConflict), "google import already in progress", map[string]any{
					"import_run_id": strings.TrimSpace(inProgress.RunID),
					"status":        strings.TrimSpace(inProgress.Status),
					"status_url":    statusURL,
				})
				logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, map[string]any{
					"import_run_id": strings.TrimSpace(inProgress.RunID),
					"status":        strings.TrimSpace(inProgress.Status),
				})
				return werr
			}
			werr := writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGooglePermissionDenied), "google import failed", nil)
			logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, err, nil)
			return werr
		}
		respErr := c.JSON(http.StatusOK, map[string]any{
			"status": "imported",
			"document": map[string]any{
				"id":                         imported.Document.ID,
				"title":                      imported.Document.Title,
				"source_original_name":       imported.Document.SourceOriginalName,
				"source_type":                imported.Document.SourceType,
				"source_google_file_id":      imported.Document.SourceGoogleFileID,
				"source_google_doc_url":      imported.Document.SourceGoogleDocURL,
				"source_modified_time":       formatTime(imported.Document.SourceModifiedTime),
				"source_exported_at":         formatTime(imported.Document.SourceExportedAt),
				"source_exported_by_user_id": imported.Document.SourceExportedByUserID,
				"source_mime_type":           imported.Document.SourceMimeType,
				"source_ingestion_mode":      imported.Document.SourceIngestionMode,
				"source_document_id":         imported.Document.SourceDocumentID,
				"source_revision_id":         imported.Document.SourceRevisionID,
				"source_artifact_id":         imported.Document.SourceArtifactID,
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
				"source_revision_id":         imported.Agreement.SourceRevisionID,
			},
			"source_document_id":   imported.SourceDocumentID,
			"source_revision_id":   imported.SourceRevisionID,
			"source_artifact_id":   imported.SourceArtifactID,
			"lineage_status":       imported.LineageStatus,
			"fingerprint_status":   imported.FingerprintStatus,
			"candidate_status":     imported.CandidateStatus,
			"document_detail_url":  imported.DocumentDetailURL,
			"agreement_detail_url": imported.AgreementDetailURL,
			"source_mime_type":     imported.SourceMimeType,
			"ingestion_mode":       imported.IngestionMode,
		})
		logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, respErr, map[string]any{
			"agreement_id": strings.TrimSpace(imported.Agreement.ID),
			"document_id":  strings.TrimSpace(imported.Document.ID),
		})
		return respErr
	}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
}

type googleImportEnqueueError struct {
	err error
}

func (e *googleImportEnqueueError) Error() string {
	if e == nil || e.err == nil {
		return "google import enqueue failed"
	}
	return e.err.Error()
}

func (e *googleImportEnqueueError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.err
}

func beginGoogleImportSubmission(
	ctx context.Context,
	cfg registerConfig,
	scope stores.Scope,
	runInput stores.GoogleImportRunInput,
	jobMsg jobs.GoogleDriveImportMsg,
) (stores.GoogleImportRunRecord, bool, error) {
	if cfg.googleImportRuns == nil {
		return stores.GoogleImportRunRecord{}, false, fmt.Errorf("google import run store is not configured")
	}
	if cfg.googleImportJobs == nil {
		return stores.GoogleImportRunRecord{}, false, fmt.Errorf("google import job store is not configured")
	}
	if cfg.googleImportEnqueue == nil {
		return stores.GoogleImportRunRecord{}, false, fmt.Errorf("google import enqueue is not configured")
	}
	txManager, ok := any(cfg.googleImportJobs).(stores.TransactionManager)
	if !ok {
		return stores.GoogleImportRunRecord{}, false, fmt.Errorf("google import job store must support transactions")
	}
	var run stores.GoogleImportRunRecord
	var created bool
	err := txManager.WithTx(ctx, func(tx stores.TxStore) error {
		txImportRuns, ok := any(tx).(stores.GoogleImportRunStore)
		if !ok {
			return fmt.Errorf("google import tx store does not implement import run store")
		}
		txJobRuns, ok := any(tx).(stores.JobRunStore)
		if !ok {
			return fmt.Errorf("google import tx store does not implement job run store")
		}
		var err error
		run, created, err = txImportRuns.BeginGoogleImportRun(ctx, scope, runInput)
		if err != nil {
			return err
		}
		if !created {
			return nil
		}
		jobMsg.ImportRunID = strings.TrimSpace(run.ID)
		jobMsg.DedupeKey = strings.TrimSpace(run.DedupeKey)
		if err := enqueueGoogleImportJobRecord(ctx, txJobRuns, scope, jobMsg); err != nil {
			return &googleImportEnqueueError{err: err}
		}
		return nil
	})
	if err != nil {
		return run, created, err
	}
	if !created {
		return run, created, nil
	}
	jobMsg.ImportRunID = strings.TrimSpace(run.ID)
	jobMsg.DedupeKey = strings.TrimSpace(run.DedupeKey)
	if err := cfg.googleImportEnqueue(ctx, jobMsg); err != nil {
		return run, created, &googleImportEnqueueError{err: err}
	}
	return run, created, nil
}

func enqueueGoogleImportJobRecord(ctx context.Context, store stores.JobRunStore, scope stores.Scope, msg jobs.GoogleDriveImportMsg) error {
	if store == nil {
		return fmt.Errorf("google import job store is not configured")
	}
	payloadJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal google import job payload: %w", err)
	}
	enqueuedAt := time.Now().UTC()
	resourceID := strings.TrimSpace(msg.ImportRunID)
	if resourceID == "" {
		resourceID = strings.TrimSpace(msg.GoogleFileID)
	}
	_, _, err = store.EnqueueJob(ctx, scope, stores.JobRunEnqueueInput{
		JobName:         jobs.JobGoogleDriveImport,
		DedupeKey:       strings.TrimSpace(msg.DedupeKey),
		CorrelationID:   strings.TrimSpace(msg.CorrelationID),
		PayloadJSON:     string(payloadJSON),
		AvailableAt:     &enqueuedAt,
		ResourceKind:    jobs.JobResourceKindGoogleImportRun,
		ResourceID:      resourceID,
		ReplaceTerminal: true,
		RequestedAt:     enqueuedAt,
	})
	return err
}

func resolveGoogleAdminUserID(c router.Context) string {
	return stableString(firstNonEmpty(resolveAdminUserID(c), c.Query("user_id")))
}
