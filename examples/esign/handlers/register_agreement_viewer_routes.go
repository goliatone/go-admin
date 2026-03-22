package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

func registerAgreementViewerRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.agreementViewer == nil {
		return
	}

	adminRoutes.Get(routes.AdminAgreementViewerSession, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		if missing := senderAgreementViewerFirstMissingPagePermission(c, cfg); missing != "" {
			return writePermissionDenied(c, missing)
		}
		session, err := cfg.agreementViewer.GetSenderSession(c.Context(), cfg.resolveScope(c), agreementID, resolveAgreementViewActor(c, cfg))
		if err != nil {
			return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to resolve agreement viewer session", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":  "ok",
			"session": session,
		})
	}, requireAuthenticatedAgreementRequest(cfg))

	adminRoutes.Get(routes.AdminAgreementViewerAssets, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		if missing := senderAgreementViewerFirstMissingPagePermission(c, cfg); missing != "" {
			return writePermissionDenied(c, missing)
		}
		contract, err := cfg.agreementViewer.ResolveSenderAssets(c.Context(), cfg.resolveScope(c), agreementID)
		if err != nil {
			return writeAPIError(c, err, http.StatusConflict, string(services.ErrorCodeInvalidSignerState), "unable to resolve agreement viewer assets", nil)
		}
		filteredContract := filterSenderAgreementViewerAssetContract(c, cfg, contract)

		escapedAgreementID := url.PathEscape(agreementID)
		sessionURL := strings.Replace(routes.AdminAgreementViewerSession, ":agreement_id", escapedAgreementID, 1)
		contractURL := strings.Replace(routes.AdminAgreementViewerAssets, ":agreement_id", escapedAgreementID, 1)
		assets := buildSignerAssetLinks(filteredContract, contractURL, sessionURL)

		rawAssetType := strings.TrimSpace(c.Query("asset"))
		assetType := normalizeSignerAssetType(rawAssetType)
		if rawAssetType != "" && assetType == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "asset must be one of preview|source|executed|certificate", map[string]any{
				"asset": rawAssetType,
			})
		}
		if assetType != "" {
			if missing := senderAgreementViewerFirstMissingAssetPermission(c, cfg, assetType); missing != "" {
				return writePermissionDenied(c, missing)
			}
			if !signerAssetAvailable(filteredContract, assetType) {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			if cfg.objectStore == nil {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			objectKey := signerAssetObjectKey(filteredContract, assetType)
			if objectKey == "" {
				return writeAPIError(c, nil, http.StatusNotFound, string(services.ErrorCodeAssetUnavailable), "requested asset is unavailable", map[string]any{
					"asset": assetType,
				})
			}
			if cfg.auditEvents != nil {
				metadataJSON := "{}"
				if encoded, merr := json.Marshal(map[string]any{
					"asset":       assetType,
					"disposition": resolveSignerAssetDisposition(c.Query("disposition")),
				}); merr == nil {
					metadataJSON = string(encoded)
				}
				_, _ = cfg.auditEvents.Append(c.Context(), cfg.resolveScope(c), stores.AuditEventRecord{
					AgreementID:  strings.TrimSpace(filteredContract.AgreementID),
					EventType:    "agreement.viewer.asset_opened",
					ActorType:    "user",
					ActorID:      resolveAuthenticatedAdminUserID(c),
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
				Filename:    signerAssetFilename(filteredContract, assetType),
				Disposition: resolveSignerAssetDisposition(c.Query("disposition")),
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
			if encoded, merr := json.Marshal(map[string]any{"assets": assets}); merr == nil {
				metadataJSON = string(encoded)
			}
			_, _ = cfg.auditEvents.Append(c.Context(), cfg.resolveScope(c), stores.AuditEventRecord{
				AgreementID:  strings.TrimSpace(filteredContract.AgreementID),
				EventType:    "agreement.viewer.contract_viewed",
				ActorType:    "user",
				ActorID:      resolveAuthenticatedAdminUserID(c),
				IPAddress:    resolveAuditRequestIP(c, cfg),
				UserAgent:    strings.TrimSpace(c.Header("User-Agent")),
				MetadataJSON: metadataJSON,
				CreatedAt:    time.Now().UTC(),
			})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"status":   "ok",
			"contract": filteredContract,
			"assets":   assets,
		})
	}, requireAuthenticatedAgreementRequest(cfg))

	adminRoutes.Post(routes.AdminAgreementViewerThreads, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		if missing := senderAgreementViewerFirstMissingCommentPermission(c, cfg); missing != "" {
			return writePermissionDenied(c, missing)
		}
		var payload struct {
			Thread services.ReviewCommentThreadInput `json:"thread"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid review thread payload", nil)
		}
		thread, err := cfg.agreementViewer.CreateSenderReviewThread(c.Context(), cfg.resolveScope(c), agreementID, resolveAgreementViewActor(c, cfg), payload.Thread)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to create review thread", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"thread": thread,
		})
	}, requireAuthenticatedAgreementRequest(cfg))

	adminRoutes.Post(routes.AdminAgreementViewerThreadReplies, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		threadID := strings.TrimSpace(c.Param("thread_id"))
		if agreementID == "" || threadID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and thread_id are required", nil)
		}
		if missing := senderAgreementViewerFirstMissingCommentPermission(c, cfg); missing != "" {
			return writePermissionDenied(c, missing)
		}
		var payload struct {
			Reply services.ReviewCommentReplyInput `json:"reply"`
		}
		if err := c.Bind(&payload); err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid review reply payload", nil)
		}
		payload.Reply.ThreadID = threadID
		thread, err := cfg.agreementViewer.ReplySenderReviewThread(c.Context(), cfg.resolveScope(c), agreementID, resolveAgreementViewActor(c, cfg), payload.Reply)
		if err != nil {
			return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to reply to review thread", nil)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"thread": thread,
		})
	}, requireAuthenticatedAgreementRequest(cfg))

	adminRoutes.Post(routes.AdminAgreementViewerThreadResolve, func(c router.Context) error {
		return senderAgreementViewerThreadStateHandler(c, cfg, true)
	}, requireAuthenticatedAgreementRequest(cfg))

	adminRoutes.Post(routes.AdminAgreementViewerThreadReopen, func(c router.Context) error {
		return senderAgreementViewerThreadStateHandler(c, cfg, false)
	}, requireAuthenticatedAgreementRequest(cfg))
}

func resolveAgreementViewActor(c router.Context, cfg registerConfig) services.AgreementViewActor {
	return services.AgreementViewActor{
		ActorID:    resolveAuthenticatedAdminUserID(c),
		CanComment: senderAgreementViewerCanComment(c, cfg),
	}
}

func senderAgreementViewerCanComment(c router.Context, cfg registerConfig) bool {
	return services.ResolveSenderViewerPolicy().CanWriteSenderComments(cfg.authorizer, c.Context())
}

func senderAgreementViewerThreadStateHandler(c router.Context, cfg registerConfig, resolve bool) error {
	if err := enforceTransportSecurity(c, cfg); err != nil {
		return asHandlerError(err)
	}
	agreementID := strings.TrimSpace(c.Param("agreement_id"))
	threadID := strings.TrimSpace(c.Param("thread_id"))
	if agreementID == "" || threadID == "" {
		return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id and thread_id are required", nil)
	}
	if missing := senderAgreementViewerFirstMissingCommentPermission(c, cfg); missing != "" {
		return writePermissionDenied(c, missing)
	}
	payload := services.ReviewCommentStateInput{ThreadID: threadID}
	actor := resolveAgreementViewActor(c, cfg)
	var (
		thread services.ReviewThread
		err    error
	)
	if resolve {
		thread, err = cfg.agreementViewer.ResolveSenderReviewThread(c.Context(), cfg.resolveScope(c), agreementID, actor, payload)
	} else {
		thread, err = cfg.agreementViewer.ReopenSenderReviewThread(c.Context(), cfg.resolveScope(c), agreementID, actor, payload)
	}
	if err != nil {
		action := "reopen"
		if resolve {
			action = "resolve"
		}
		return writeAPIError(c, err, http.StatusForbidden, string(services.ErrorCodeInvalidSignerState), "unable to "+action+" review thread", nil)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"status": "ok",
		"thread": thread,
	})
}

func senderAgreementViewerFirstMissingPagePermission(c router.Context, cfg registerConfig) string {
	return firstMissingPermission(services.ResolveSenderViewerPolicy().MissingPagePermissions(cfg.authorizer, c.Context()))
}

func senderAgreementViewerFirstMissingCommentPermission(c router.Context, cfg registerConfig) string {
	return firstMissingPermission(services.ResolveSenderViewerPolicy().MissingCommentPermissions(cfg.authorizer, c.Context()))
}

func senderAgreementViewerFirstMissingAssetPermission(c router.Context, cfg registerConfig, assetType string) string {
	return firstMissingPermission(services.ResolveSenderViewerPolicy().MissingAssetPermissions(cfg.authorizer, c.Context(), assetType))
}

func filterSenderAgreementViewerAssetContract(c router.Context, cfg registerConfig, contract services.SignerAssetContract) services.SignerAssetContract {
	filtered := contract
	policy := services.ResolveSenderViewerPolicy()
	if !policy.CanAccessSenderAsset(cfg.authorizer, c.Context(), "preview") {
		filtered.PreviewDocumentAvailable = false
		filtered.PreviewObjectKey = ""
	}
	if !policy.CanAccessSenderAsset(cfg.authorizer, c.Context(), "source") {
		filtered.SourceDocumentAvailable = false
		filtered.SourceObjectKey = ""
	}
	if !policy.CanAccessSenderAsset(cfg.authorizer, c.Context(), "executed") {
		filtered.ExecutedArtifactAvailable = false
		filtered.ExecutedObjectKey = ""
	}
	if !policy.CanAccessSenderAsset(cfg.authorizer, c.Context(), "certificate") {
		filtered.CertificateAvailable = false
		filtered.CertificateObjectKey = ""
	}
	return filtered
}

func firstMissingPermission(permissions []string) string {
	for _, permission := range permissions {
		permission = strings.TrimSpace(permission)
		if permission != "" {
			return permission
		}
	}
	return ""
}
