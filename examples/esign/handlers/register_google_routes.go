package handlers

import (
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
			userID := resolveAdminUserID(c)
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
			userID := resolveAdminUserID(c)
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
			userID := resolveAdminUserID(c)
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
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			// Get base user ID (strip any account suffix)
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

		adminRoutes.Get(routes.AdminGoogleDriveSearch, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			accountID := stableString(c.Query("account_id"))
			pageSize := parsePageSize(c.Query("page_size"))
			result, err := cfg.google.SearchFiles(c.Context(), cfg.resolveScope(c), services.GoogleDriveQueryInput{
				UserID:    userID,
				AccountID: accountID,
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
			accountID := stableString(c.Query("account_id"))
			pageSize := parsePageSize(c.Query("page_size"))
			result, err := cfg.google.BrowseFiles(c.Context(), cfg.resolveScope(c), services.GoogleDriveQueryInput{
				UserID:    userID,
				AccountID: accountID,
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
					GoogleAccountID:   accountID,
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
				AccountID       string `json:"account_id"`
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
			accountID := stableString(firstNonEmpty(payload.AccountID, c.Query("account_id")))
			imported, err := cfg.google.ImportDocument(c.Context(), cfg.resolveScope(c), services.GoogleImportInput{
				UserID:          userID,
				AccountID:       accountID,
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
}
