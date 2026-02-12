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
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

// Register attaches baseline phase-0 routes for admin and signer entry points.
func Register(r coreadmin.AdminRouter, routes RouteSet, options ...RegisterOption) {
	if r == nil {
		return
	}
	cfg := buildRegisterConfig(options)

	r.Get(routes.AdminStatus, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"module": "esign",
			"status": "ok",
			"phase":  "baseline",
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	r.Get(routes.AdminAPIStatus, func(c router.Context) error {
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
				"admin":                   routes.AdminHome,
				"admin_status":            routes.AdminStatus,
				"admin_api":               routes.AdminAPIStatus,
				"admin_agreements_stats":  routes.AdminAgreementsStats,
				"admin_documents_upload":  routes.AdminDocumentsUpload,
				"signer_session":          routes.SignerSession,
				"signer_consent":          routes.SignerConsent,
				"signer_field_values":     routes.SignerFieldValues,
				"signer_signature":        routes.SignerSignature,
				"signer_signature_upload": routes.SignerSignatureUpload,
				"signer_signature_object": routes.SignerSignatureObject,
				"signer_telemetry":        routes.SignerTelemetry,
				"signer_submit":           routes.SignerSubmit,
				"signer_decline":          routes.SignerDecline,
				"signer_assets":           routes.SignerAssets,
				"google_oauth_connect":    routes.AdminGoogleOAuthConnect,
				"google_oauth_disconnect": routes.AdminGoogleOAuthDisconnect,
				"google_oauth_rotate":     routes.AdminGoogleOAuthRotate,
				"google_oauth_status":     routes.AdminGoogleOAuthStatus,
				"google_drive_search":     routes.AdminGoogleDriveSearch,
				"google_drive_browse":     routes.AdminGoogleDriveBrowse,
				"google_drive_import":     routes.AdminGoogleDriveImport,
			},
		})
		logAPIOperation(c.Context(), "admin_api_status", correlationID, startedAt, err, nil)
		return err
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	r.Get(routes.AdminAgreementsStats, func(c router.Context) error {
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

	if cfg.documentUpload != nil {
		r.Post(routes.AdminDocumentsUpload, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			return cfg.documentUpload(c)
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
	}

	if cfg.googleEnabled && cfg.google != nil {
		r.Post(routes.AdminGoogleOAuthConnect, func(c router.Context) error {
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

		r.Post(routes.AdminGoogleOAuthDisconnect, func(c router.Context) error {
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

		r.Post(routes.AdminGoogleOAuthRotate, func(c router.Context) error {
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

		r.Get(routes.AdminGoogleOAuthStatus, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			userID := resolveAdminUserID(c)
			if userID == "" {
				return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "user_id is required", nil)
			}
			status, err := cfg.google.Status(c.Context(), cfg.resolveScope(c), userID)
			if err != nil {
				return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeGoogleAccessRevoked), "google oauth status failed", nil)
			}
			return c.JSON(http.StatusOK, map[string]any{
				"status":      "ok",
				"integration": status,
			})
		}, requireAdminPermission(cfg, cfg.permissions.AdminSettings))

		r.Get(routes.AdminGoogleDriveSearch, func(c router.Context) error {
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

		r.Get(routes.AdminGoogleDriveBrowse, func(c router.Context) error {
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

		r.Post(routes.AdminGoogleDriveImport, func(c router.Context) error {
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
				},
			})
			logAPIOperation(c.Context(), "google_drive_import", correlationID, startedAt, respErr, map[string]any{
				"agreement_id": strings.TrimSpace(imported.Agreement.ID),
				"document_id":  strings.TrimSpace(imported.Document.ID),
			})
			return respErr
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
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
		var payload services.SignerFieldValueInput
		if err := c.Bind(&payload); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedFieldSave(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field value payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		value, err := cfg.signerSession.UpsertFieldValue(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
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
		var payload services.SignerSignatureInput
		if err := c.Bind(&payload); err != nil {
			if unifiedFlow {
				observability.ObserveUnifiedSignatureAttach(c.Context(), time.Since(startedAt), false)
			}
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signature payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		result, err := cfg.signerSession.AttachSignatureArtifact(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
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
		var payload services.SignerSignatureUploadInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signature upload payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		contract, err := cfg.signerSession.IssueSignatureUpload(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
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

func formatTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
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
	if c == nil {
		return false
	}
	flow := strings.ToLower(strings.TrimSpace(c.Header("X-ESign-Flow-Mode")))
	if flow == "" {
		flow = strings.ToLower(strings.TrimSpace(c.Query("flow")))
	}
	if flow == "unified" {
		return true
	}
	referer := strings.ToLower(strings.TrimSpace(c.Header("Referer")))
	return strings.Contains(referer, "/sign/") && strings.Contains(referer, "/review")
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
