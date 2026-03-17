package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"sort"
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
		publicToken, err := resolvePublicReviewTokenWithRedirect(c, cfg, token, routes.SignerSession)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession != nil {
			session, err := cfg.publicReviewSession.GetReviewSession(c.Context(), cfg.resolveScope(c), publicToken)
			if err != nil {
				return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to resolve signer session", nil)
			}
			if cfg.auditEvents != nil && publicToken.SigningToken != nil {
				metadataJSON := "{}"
				if encoded, merr := json.Marshal(map[string]any{
					"recipient_id":     strings.TrimSpace(publicToken.SigningToken.RecipientID),
					"agreement_id":     strings.TrimSpace(publicToken.SigningToken.AgreementID),
					"session_state":    strings.TrimSpace(session.State),
					"agreement_status": strings.TrimSpace(session.AgreementStatus),
				}); merr == nil {
					metadataJSON = string(encoded)
				}
				_, _ = cfg.auditEvents.Append(c.Context(), cfg.resolveScope(c), stores.AuditEventRecord{
					AgreementID:  strings.TrimSpace(publicToken.SigningToken.AgreementID),
					EventType:    "signer.viewed",
					ActorType:    "signer_token",
					ActorID:      strings.TrimSpace(publicToken.SigningToken.RecipientID),
					IPAddress:    resolveAuditRequestIP(c, cfg),
					UserAgent:    strings.TrimSpace(c.Header("User-Agent")),
					MetadataJSON: metadataJSON,
					CreatedAt:    time.Now().UTC(),
				})
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

	r.Get(routes.SignerReviewThreads, func(c router.Context) error {
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
		publicToken, err := resolvePublicReviewToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
		}
		threads, err := cfg.publicReviewSession.ListPublicReviewThreads(c.Context(), cfg.resolveScope(c), publicToken)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to load review threads", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "ok",
			"threads": threads,
		})
	})

	r.Post(routes.SignerReviewThreads, func(c router.Context) error {
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
		publicToken, err := resolvePublicReviewToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
		}
		var payload struct {
			Thread services.ReviewCommentThreadInput `json:"thread"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid review thread payload", nil)
		}
		thread, err := cfg.publicReviewSession.CreatePublicReviewThread(c.Context(), cfg.resolveScope(c), publicToken, payload.Thread)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to create review thread", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"thread": thread,
		})
	})

	r.Post(routes.SignerReviewThreadReplies, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		threadID := strings.TrimSpace(c.Param("thread_id"))
		if token == "" || threadID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token and thread_id are required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		publicToken, err := resolvePublicReviewToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
		}
		var payload struct {
			Reply services.ReviewCommentReplyInput `json:"reply"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid review reply payload", nil)
		}
		payload.Reply.ThreadID = threadID
		thread, err := cfg.publicReviewSession.ReplyPublicReviewThread(c.Context(), cfg.resolveScope(c), publicToken, payload.Reply)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to reply to review thread", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"thread": thread,
		})
	})

	r.Post(routes.SignerReviewThreadResolve, func(c router.Context) error {
		return signerReviewThreadStateHandler(c, cfg, true)
	})

	r.Post(routes.SignerReviewThreadReopen, func(c router.Context) error {
		return signerReviewThreadStateHandler(c, cfg, false)
	})

	r.Post(routes.SignerReviewApprove, func(c router.Context) error {
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
		publicToken, err := resolvePublicReviewToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
		}
		summary, err := cfg.publicReviewSession.ApprovePublicReview(c.Context(), cfg.resolveScope(c), publicToken)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to approve review", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"review": summary,
		})
	})

	r.Post(routes.SignerReviewRequestChanges, func(c router.Context) error {
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
		publicToken, err := resolvePublicReviewToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.publicReviewSession == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
		}
		var payload struct {
			Comment string `json:"comment"`
		}
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid review decision payload"); err != nil {
			return err
		}
		summary, err := cfg.publicReviewSession.RequestPublicReviewChanges(c.Context(), cfg.resolveScope(c), publicToken, services.ReviewDecisionInput{
			Comment:   strings.TrimSpace(payload.Comment),
			IPAddress: resolveAuditRequestIP(c, cfg),
		})
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to request review changes", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"review": summary,
		})
	})

	r.Get(routes.SignerProfile, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		key := strings.TrimSpace(c.Query("key"))
		if key == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "key is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerProfile == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer profile service not configured", nil)
		}
		profile, err := cfg.signerProfile.Get(c.Context(), cfg.resolveScope(c), resolveSignerProfileSubject(c, cfg, tokenRecord), key)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to load signer profile", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "ok",
			"profile": profile,
		})
	})

	registerSignerPatchRoute(r, routes.SignerProfile, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		key := strings.TrimSpace(c.Query("key"))
		if key == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "key is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerProfile == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer profile service not configured", nil)
		}
		var payload struct {
			Patch services.SignerProfilePatch `json:"patch"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid signer profile payload", nil)
		}
		profile, err := cfg.signerProfile.Save(c.Context(), cfg.resolveScope(c), resolveSignerProfileSubject(c, cfg, tokenRecord), key, payload.Patch)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to save signer profile", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "ok",
			"profile": profile,
		})
	})

	r.Delete(routes.SignerProfile, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		key := strings.TrimSpace(c.Query("key"))
		if key == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "key is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerProfile == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer profile service not configured", nil)
		}
		if err := cfg.signerProfile.Clear(c.Context(), cfg.resolveScope(c), resolveSignerProfileSubject(c, cfg, tokenRecord), key); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to clear signer profile", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
		})
	})

	r.Get(routes.SignerSavedSignatures, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		signatureType := strings.TrimSpace(c.Query("type"))
		if signatureType == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "type is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSavedSignatures == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "saved signature service not configured", nil)
		}
		signatures, err := cfg.signerSavedSignatures.ListSavedSignatures(
			c.Context(),
			cfg.resolveScope(c),
			resolveSignerProfileSubject(c, cfg, tokenRecord),
			signatureType,
		)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to load saved signatures", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":     "ok",
			"signatures": signatures,
		})
	})

	r.Post(routes.SignerSavedSignatures, func(c router.Context) error {
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
		if cfg.signerSavedSignatures == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "saved signature service not configured", nil)
		}
		var payload services.SaveSignerSignatureInput
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid saved signature payload", nil)
		}
		signature, err := cfg.signerSavedSignatures.SaveSignature(
			c.Context(),
			cfg.resolveScope(c),
			resolveSignerProfileSubject(c, cfg, tokenRecord),
			payload,
		)
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to save signature", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			"signature": signature,
		})
	})

	r.Delete(routes.SignerSavedSignature, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		token := strings.TrimSpace(c.Param("token"))
		signatureID := strings.TrimSpace(c.Param("id"))
		if token == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token is required", nil)
		}
		if signatureID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "id is required", nil)
		}
		if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
			return asHandlerError(err)
		}
		tokenRecord, err := resolveSignerToken(c, cfg, token)
		if err != nil {
			return asHandlerError(err)
		}
		if cfg.signerSavedSignatures == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "saved signature service not configured", nil)
		}
		if err := cfg.signerSavedSignatures.DeleteSavedSignature(
			c.Context(),
			cfg.resolveScope(c),
			resolveSignerProfileSubject(c, cfg, tokenRecord),
			signatureID,
		); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "unable to delete signature", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
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
		tokenRecord, err := resolveSignerTokenWithRedirect(c, cfg, token, routes.SignerAssets)
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
					IPAddress:    resolveAuditRequestIP(c, cfg),
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
				IPAddress:    resolveAuditRequestIP(c, cfg),
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
		payload.IPAddress = resolveAuditRequestIP(c, cfg)
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
		if err := enforceRateLimit(c, cfg, OperationSignerWrite); err != nil {
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
			IPAddress:         resolveAuditRequestIP(c, cfg),
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
		if err := enforceRateLimit(c, cfg, OperationSignerWrite); err != nil {
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
			IPAddress:         resolveAuditRequestIP(c, cfg),
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
		if err := enforceRateLimit(c, cfg, OperationSignerWrite); err != nil {
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
			IPAddress:         resolveAuditRequestIP(c, cfg),
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
		if err := enforceRateLimit(c, cfg, OperationSignerWrite); err != nil {
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
			IPAddress:   resolveAuditRequestIP(c, cfg),
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
		correlationID := apiCorrelationID(c, idempotencyKey, "signer_submit")
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
			IPAddress:      resolveAuditRequestIP(c, cfg),
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
		payload.IPAddress = resolveAuditRequestIP(c, cfg)
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

func redirectSupersededSignerLink(c router.Context, cfg registerConfig, routePattern, rawToken string) (bool, error) {
	redirector, ok := cfg.tokenValidator.(supersededSignerLinkTokenService)
	if !ok {
		return false, nil
	}
	agreementStore, ok := cfg.agreements.(stores.AgreementStore)
	if !ok {
		return false, nil
	}
	scope := cfg.resolveScope(c)
	legacyToken, err := redirector.ResolveRawToken(c.Context(), scope, rawToken)
	if err != nil {
		return false, nil
	}
	if !isSupersededLegacyToken(legacyToken) {
		return false, nil
	}

	sourceAgreement, err := agreementStore.GetAgreement(c.Context(), scope, legacyToken.AgreementID)
	if err != nil {
		return false, err
	}
	targetAgreement, ok := resolveLatestCorrectionAgreement(c.Context(), cfg, scope, sourceAgreement)
	if !ok {
		return false, nil
	}

	sourceRecipients, err := agreementStore.ListRecipients(c.Context(), scope, sourceAgreement.ID)
	if err != nil {
		return false, err
	}
	sourceRecipient, ok := findAgreementRecipient(sourceRecipients, legacyToken.RecipientID)
	if !ok {
		return false, nil
	}

	targetRecipients, err := agreementStore.ListRecipients(c.Context(), scope, targetAgreement.ID)
	if err != nil {
		return false, err
	}
	targetRecipient, ok := matchRedirectRecipient(sourceRecipient, targetRecipients)
	if !ok {
		return false, nil
	}

	issued, err := redirector.Issue(c.Context(), scope, targetAgreement.ID, targetRecipient.ID)
	if err != nil {
		return false, err
	}
	target := strings.Replace(routePattern, ":token", url.PathEscape(strings.TrimSpace(issued.Token)), 1)
	if rawQuery := rawQueryFromURL(c.OriginalURL()); rawQuery != "" {
		target += "?" + rawQuery
	}
	return true, c.Redirect(target, http.StatusFound)
}

func isSupersededLegacyToken(token stores.SigningTokenRecord) bool {
	if strings.TrimSpace(token.AgreementID) == "" || strings.TrimSpace(token.RecipientID) == "" {
		return false
	}
	if token.RevokedAt == nil {
		return false
	}
	switch strings.TrimSpace(token.Status) {
	case stores.SigningTokenStatusRevoked, stores.SigningTokenStatusSuperseded, stores.SigningTokenStatusAborted:
		return true
	default:
		return false
	}
}

func resolveLatestCorrectionAgreement(ctx context.Context, cfg registerConfig, scope stores.Scope, source stores.AgreementRecord) (stores.AgreementRecord, bool) {
	if strings.TrimSpace(source.ID) == "" || cfg.agreements == nil {
		return stores.AgreementRecord{}, false
	}
	if strings.TrimSpace(source.Status) != stores.AgreementStatusVoided {
		return stores.AgreementRecord{}, false
	}
	records, err := cfg.agreements.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return stores.AgreementRecord{}, false
	}
	childrenByParent := map[string][]stores.AgreementRecord{}
	for _, record := range records {
		if strings.TrimSpace(record.WorkflowKind) != stores.AgreementWorkflowKindCorrection {
			continue
		}
		parentID := strings.TrimSpace(record.ParentAgreementID)
		if parentID == "" {
			continue
		}
		childrenByParent[parentID] = append(childrenByParent[parentID], record)
	}
	current := source
	found := false
	for {
		children := eligibleCorrectionChildren(childrenByParent[strings.TrimSpace(current.ID)])
		if len(children) == 0 {
			break
		}
		sort.SliceStable(children, func(i, j int) bool {
			if children[i].UpdatedAt.Equal(children[j].UpdatedAt) {
				return strings.TrimSpace(children[i].ID) > strings.TrimSpace(children[j].ID)
			}
			return children[i].UpdatedAt.After(children[j].UpdatedAt)
		})
		current = children[0]
		found = true
	}
	if !found {
		return stores.AgreementRecord{}, false
	}
	return current, true
}

func eligibleCorrectionChildren(records []stores.AgreementRecord) []stores.AgreementRecord {
	if len(records) == 0 {
		return nil
	}
	out := make([]stores.AgreementRecord, 0, len(records))
	for _, record := range records {
		switch strings.TrimSpace(record.Status) {
		case stores.AgreementStatusSent, stores.AgreementStatusInProgress, stores.AgreementStatusCompleted:
			out = append(out, record)
		}
	}
	return out
}

func findAgreementRecipient(recipients []stores.RecipientRecord, recipientID string) (stores.RecipientRecord, bool) {
	recipientID = strings.TrimSpace(recipientID)
	if recipientID == "" {
		return stores.RecipientRecord{}, false
	}
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.ID) == recipientID {
			return recipient, true
		}
	}
	return stores.RecipientRecord{}, false
}

func matchRedirectRecipient(source stores.RecipientRecord, targets []stores.RecipientRecord) (stores.RecipientRecord, bool) {
	sourceEmail := strings.ToLower(strings.TrimSpace(source.Email))
	sourceName := strings.ToLower(strings.TrimSpace(source.Name))
	sourceRole := strings.TrimSpace(source.Role)
	sourceOrder := source.SigningOrder

	for _, target := range targets {
		if sourceEmail == "" {
			break
		}
		if strings.ToLower(strings.TrimSpace(target.Email)) == sourceEmail &&
			strings.TrimSpace(target.Role) == sourceRole &&
			target.SigningOrder == sourceOrder {
			return target, true
		}
	}
	for _, target := range targets {
		if strings.ToLower(strings.TrimSpace(target.Name)) == sourceName &&
			strings.TrimSpace(target.Role) == sourceRole &&
			target.SigningOrder == sourceOrder {
			return target, true
		}
	}
	for _, target := range targets {
		if strings.TrimSpace(target.Role) == sourceRole && target.SigningOrder == sourceOrder {
			return target, true
		}
	}
	return stores.RecipientRecord{}, false
}

func rawQueryFromURL(raw string) string {
	if idx := strings.Index(strings.TrimSpace(raw), "?"); idx >= 0 && idx+1 < len(raw) {
		return raw[idx+1:]
	}
	return ""
}

func signerReviewThreadStateHandler(c router.Context, cfg registerConfig, resolve bool) error {
	if err := enforceTransportSecurity(c, cfg); err != nil {
		return asHandlerError(err)
	}
	if cfg.signerSession == nil {
		return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "signer session service not configured", nil)
	}
	token := strings.TrimSpace(c.Param("token"))
	threadID := strings.TrimSpace(c.Param("thread_id"))
	if token == "" || threadID == "" {
		return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "token and thread_id are required", nil)
	}
	if err := enforceRateLimit(c, cfg, OperationSignerSession); err != nil {
		return asHandlerError(err)
	}
	publicToken, err := resolvePublicReviewToken(c, cfg, token)
	if err != nil {
		return asHandlerError(err)
	}
	if cfg.publicReviewSession == nil {
		return writeAPIError(c, nil, http.StatusNotImplemented, string(services.ErrorCodeInvalidSignerState), "public review session service not configured", nil)
	}
	input := services.ReviewCommentStateInput{ThreadID: threadID}
	var thread services.ReviewThread
	if resolve {
		thread, err = cfg.publicReviewSession.ResolvePublicReviewThread(c.Context(), cfg.resolveScope(c), publicToken, input)
	} else {
		thread, err = cfg.publicReviewSession.ReopenPublicReviewThread(c.Context(), cfg.resolveScope(c), publicToken, input)
	}
	if err != nil {
		message := "unable to update review thread"
		if resolve {
			message = "unable to resolve review thread"
		}
		return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), message, nil)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"status": "ok",
		"thread": thread,
	})
}

func resolveSignerProfileSubject(c router.Context, cfg registerConfig, token stores.SigningTokenRecord) string {
	subject := strings.ToLower(strings.TrimSpace(token.RecipientID))
	if cfg.signerSession == nil {
		return subject
	}
	session, err := cfg.signerSession.GetSession(c.Context(), cfg.resolveScope(c), token)
	if err != nil {
		return subject
	}
	email := strings.ToLower(strings.TrimSpace(session.RecipientEmail))
	if email != "" {
		return email
	}
	if id := strings.ToLower(strings.TrimSpace(session.RecipientID)); id != "" {
		return id
	}
	return subject
}

func registerSignerPatchRoute(r coreadmin.AdminRouter, path string, handler router.HandlerFunc) {
	type patchCapableRouter interface {
		Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	}
	if patchRouter, ok := any(r).(patchCapableRouter); ok {
		patchRouter.Patch(path, handler)
		return
	}
	r.Put(path, handler)
}
