package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
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
				"admin":                   routes.AdminStatus,
				"admin_api":               routes.AdminAPIStatus,
				"signer_session":          routes.SignerSession,
				"signer_consent":          routes.SignerConsent,
				"signer_field_values":     routes.SignerFieldValues,
				"signer_signature":        routes.SignerSignature,
				"signer_submit":           routes.SignerSubmit,
				"signer_decline":          routes.SignerDecline,
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
		var payload services.SignerFieldValueInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid field value payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		value, err := cfg.signerSession.UpsertFieldValue(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to upsert field value", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":      "ok",
			"field_value": value,
		})
	})

	r.Post(routes.SignerSignature, func(c router.Context) error {
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
		var payload services.SignerSignatureInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signature payload", nil)
		}
		payload.IPAddress = strings.TrimSpace(c.IP())
		payload.UserAgent = strings.TrimSpace(c.Header("User-Agent"))
		result, err := cfg.signerSession.AttachSignatureArtifact(c.Context(), cfg.resolveScope(c), tokenRecord, payload)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to attach signature", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			"signature": result,
		})
	})

	r.Post(routes.SignerSubmit, func(c router.Context) error {
		startedAt := time.Now()
		idempotencyKey := strings.TrimSpace(c.Header("Idempotency-Key"))
		correlationID := apiCorrelationID(c, idempotencyKey, c.Param("token"), "signer_submit")
		if err := enforceTransportSecurity(c, cfg); err != nil {
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			werr := writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
			observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), false)
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, nil, map[string]any{"outcome": "error"})
			return werr
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSubmit); err != nil {
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return asHandlerError(err)
		}
		if cfg.signerSession == nil {
			werr := writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer service not configured", nil)
			observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), false)
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
			logAPIOperation(c.Context(), "signer_submit", correlationID, startedAt, err, nil)
			return werr
		}
		respErr := c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"submit": result,
		})
		observability.ObserveSignerSubmit(c.Context(), time.Since(startedAt), respErr == nil)
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
