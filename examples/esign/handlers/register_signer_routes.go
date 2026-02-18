package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
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

func registerSignerRoutes(r coreadmin.AdminRouter, routes RouteSet, cfg registerConfig) {
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
