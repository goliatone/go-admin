package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

func registerAdminCoreRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
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
		response := map[string]any{
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
				"admin_document_remediate":          routes.AdminDocumentRemediate,
				"admin_remediation_dispatch_status": routes.AdminRemediationDispatchStatus,
				"admin_guarded_effect_status":       routes.AdminGuardedEffectStatus,
				"admin_guarded_effect_resume":       routes.AdminGuardedEffectResume,
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
				"signer_profile":                    routes.SignerProfile,
				"signer_saved_signatures":           routes.SignerSavedSignatures,
				"signer_saved_signature":            routes.SignerSavedSignature,
				"google_oauth_connect":              routes.AdminGoogleOAuthConnect,
				"google_oauth_disconnect":           routes.AdminGoogleOAuthDisconnect,
				"google_oauth_rotate":               routes.AdminGoogleOAuthRotate,
				"google_oauth_status":               routes.AdminGoogleOAuthStatus,
				"google_oauth_accounts":             routes.AdminGoogleOAuthAccounts,
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
		}
		if cfg.pdfPolicy != nil {
			scope := cfg.resolveScope(c)
			response["pdf_policy"] = services.PDFPolicyDiagnostics(cfg.pdfPolicy.Policy(c.Context(), scope))
		}
		err := c.JSON(http.StatusOK, response)
		logAPIOperation(c.Context(), "admin_api_status", correlationID, startedAt, err, nil)
		return err
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(routes.AdminAgreementsStats, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
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
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

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
				"review_url":      link.ReviewURL,
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

	adminRoutes.Post(routes.AdminDocumentRemediate, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		documentID := strings.TrimSpace(c.Param("document_id"))
		if documentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "document_id is required", nil)
		}
		modeOverride, err := parseRemediationExecutionMode(c.Query("mode"))
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, "INVALID_EXECUTION_MODE", "invalid remediation mode override", map[string]any{
				"mode": strings.TrimSpace(c.Query("mode")),
			})
		}
		if modeOverride != "" && cfg.authorizer != nil && !authorizerAllows(c, cfg.authorizer, cfg.permissions.AdminSettings) {
			return writePermissionDenied(c, cfg.permissions.AdminSettings)
		}
		if cfg.remediationTrigger == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "NOT_IMPLEMENTED", "pdf remediation trigger not implemented", map[string]any{
				"document_id": documentID,
				"mode":        modeOverride,
			})
		}
		scope := cfg.resolveScope(c)
		idempotencyKey := strings.TrimSpace(c.Header("Idempotency-Key"))
		receipt, err := cfg.remediationTrigger.TriggerRemediation(c.Context(), RemediationTriggerInput{
			Scope:          scope,
			DocumentID:     documentID,
			ActorID:        resolveAdminUserID(c),
			CorrelationID:  apiCorrelationID(c, idempotencyKey, documentID, "admin_document_remediate"),
			ModeOverride:   modeOverride,
			IdempotencyKey: idempotencyKey,
		})
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "REMEDIATION_TRIGGER_FAILED", "unable to trigger remediation", map[string]any{
				"document_id": documentID,
				"mode":        modeOverride,
				"tenant_id":   scope.TenantID,
				"org_id":      scope.OrgID,
			})
		}
		resolvedMode := normalizeRemediationExecutionMode(receipt.Mode)
		dispatchID := strings.TrimSpace(receipt.DispatchID)
		statusURL := remediationDispatchStatusURL(routes.AdminRemediationDispatchStatus, dispatchID)
		statusCode := http.StatusOK
		if strings.EqualFold(resolvedMode, string(gocommand.ExecutionModeQueued)) {
			statusCode = http.StatusAccepted
		}
		response := map[string]any{
			"status": "ok",
			"receipt": map[string]any{
				"command_id":     firstNonEmpty(strings.TrimSpace(receipt.CommandID), "esign.pdf.remediate"),
				"mode":           resolvedMode,
				"accepted":       receipt.Accepted,
				"dispatch_id":    dispatchID,
				"correlation_id": stableString(receipt.CorrelationID),
				"enqueued_at":    formatTime(receipt.EnqueuedAt),
			},
			"mode":        resolvedMode,
			"accepted":    receipt.Accepted,
			"dispatch_id": dispatchID,
		}
		if statusURL != "" {
			response["dispatch_status_url"] = statusURL
		}
		return c.JSON(statusCode, response)
	}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

	adminRoutes.Get(routes.AdminRemediationDispatchStatus, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		dispatchID := strings.TrimSpace(c.Param("dispatch_id"))
		if dispatchID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "dispatch_id is required", nil)
		}
		if cfg.remediationStatus == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "NOT_IMPLEMENTED", "remediation dispatch status is not configured", map[string]any{
				"dispatch_id": dispatchID,
			})
		}
		dispatch, err := cfg.remediationStatus.LookupRemediationDispatchStatus(c.Context(), dispatchID)
		if err != nil {
			return writeAPIError(c, err, http.StatusNotFound, "DISPATCH_NOT_FOUND", "remediation dispatch status not found", map[string]any{
				"dispatch_id": dispatchID,
			})
		}
		requestScope := cfg.resolveScope(c)
		dispatchScope := stores.Scope{
			TenantID: strings.TrimSpace(dispatch.TenantID),
			OrgID:    strings.TrimSpace(dispatch.OrgID),
		}
		if scopeConflict(dispatchScope, requestScope) {
			return writeAPIError(c,
				nil,
				http.StatusForbidden,
				string(services.ErrorCodeScopeDenied),
				"scope denied",
				map[string]any{
					"dispatch_id":        dispatchID,
					"dispatch_tenant_id": dispatchScope.TenantID,
					"dispatch_org_id":    dispatchScope.OrgID,
					"request_tenant_id":  requestScope.TenantID,
					"request_org_id":     requestScope.OrgID,
				},
			)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"dispatch": map[string]any{
				"dispatch_id":     strings.TrimSpace(dispatch.DispatchID),
				"status":          normalizeRemediationDispatchState(dispatch.Status),
				"attempt":         dispatch.Attempt,
				"max_attempts":    dispatch.MaxAttempts,
				"enqueued_at":     formatTime(dispatch.EnqueuedAt),
				"next_run_at":     formatTime(dispatch.NextRunAt),
				"started_at":      formatTime(dispatch.StartedAt),
				"completed_at":    formatTime(dispatch.CompletedAt),
				"canceled_at":     formatTime(dispatch.CanceledAt),
				"terminal_reason": stableString(dispatch.TerminalReason),
				"updated_at":      formatTime(dispatch.UpdatedAt),
			},
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(routes.AdminGuardedEffectStatus, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		effectID := strings.TrimSpace(c.Param("effect_id"))
		if effectID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "effect_id is required", nil)
		}
		if cfg.guardedEffects == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "NOT_IMPLEMENTED", "guarded effect status is not configured", map[string]any{
				"effect_id": effectID,
			})
		}
		record, err := cfg.guardedEffects.GetGuardedEffect(c.Context(), effectID)
		if err != nil {
			return writeAPIError(c, err, http.StatusNotFound, "EFFECT_NOT_FOUND", "guarded effect not found", map[string]any{
				"effect_id": effectID,
			})
		}
		requestScope := cfg.resolveScope(c)
		effectScope := stores.Scope{
			TenantID: strings.TrimSpace(record.TenantID),
			OrgID:    strings.TrimSpace(record.OrgID),
		}
		if scopeConflict(effectScope, requestScope) {
			return writeAPIError(c, nil, http.StatusForbidden, string(services.ErrorCodeScopeDenied), "scope denied", map[string]any{
				"effect_id": effectID,
			})
		}
		detail := services.AgreementNotificationEffectDetailFromRecord(record)
		return c.JSON(http.StatusOK, map[string]any{
			"status": "ok",
			"effect": map[string]any{
				"effect_id":        strings.TrimSpace(record.EffectID),
				"group_type":       strings.TrimSpace(record.GroupType),
				"group_id":         strings.TrimSpace(record.GroupID),
				"kind":             strings.TrimSpace(record.Kind),
				"subject_type":     strings.TrimSpace(record.SubjectType),
				"subject_id":       strings.TrimSpace(record.SubjectID),
				"recipient_id":     strings.TrimSpace(detail.RecipientID),
				"notification":     strings.TrimSpace(detail.Notification),
				"status":           strings.TrimSpace(record.Status),
				"guard_policy":     strings.TrimSpace(record.GuardPolicy),
				"attempt_count":    record.AttemptCount,
				"max_attempts":     record.MaxAttempts,
				"dispatch_id":      stableString(record.DispatchID),
				"correlation_id":   stableString(record.CorrelationID),
				"created_at":       formatTime(&record.CreatedAt),
				"updated_at":       formatTime(&record.UpdatedAt),
				"dispatched_at":    formatTime(record.DispatchedAt),
				"finalized_at":     formatTime(record.FinalizedAt),
				"aborted_at":       formatTime(record.AbortedAt),
				"retry_at":         formatTime(record.RetryAt),
				"resumable":        detail.Resumable,
				"result_payload":   stableString(record.ResultPayloadJSON),
				"error_payload":    stableString(record.ErrorJSON),
				"prepare_payload":  stableString(sanitizeGuardedEffectPayload(record.PreparePayloadJSON)),
				"dispatch_payload": stableString(sanitizeGuardedEffectPayload(record.DispatchPayloadJSON)),
			},
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Post(routes.AdminGuardedEffectResume, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		effectID := strings.TrimSpace(c.Param("effect_id"))
		if effectID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "effect_id is required", nil)
		}
		if cfg.guardedEffectRecovery == nil || cfg.guardedEffects == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "NOT_IMPLEMENTED", "guarded effect recovery is not configured", map[string]any{
				"effect_id": effectID,
			})
		}
		record, err := cfg.guardedEffects.GetGuardedEffect(c.Context(), effectID)
		if err != nil {
			return writeAPIError(c, err, http.StatusNotFound, "EFFECT_NOT_FOUND", "guarded effect not found", map[string]any{
				"effect_id": effectID,
			})
		}
		requestScope := cfg.resolveScope(c)
		effectScope := stores.Scope{
			TenantID: strings.TrimSpace(record.TenantID),
			OrgID:    strings.TrimSpace(record.OrgID),
		}
		if scopeConflict(effectScope, requestScope) {
			return writeAPIError(c, nil, http.StatusForbidden, string(services.ErrorCodeScopeDenied), "scope denied", map[string]any{
				"effect_id": effectID,
			})
		}
		correlationID := apiCorrelationID(c, c.Header("Idempotency-Key"), effectID, "guarded_effect_resume")
		result, err := cfg.guardedEffectRecovery.ResumeEffect(c.Context(), effectScope, effectID, services.GuardedEffectResumeInput{
			ActorID:       resolveAdminUserID(c),
			CorrelationID: correlationID,
		})
		if err != nil {
			return writeAPIError(c, err, http.StatusBadRequest, "EFFECT_RESUME_FAILED", "unable to resume guarded effect", map[string]any{
				"effect_id": effectID,
			})
		}
		return c.JSON(http.StatusAccepted, map[string]any{
			"status": "accepted",
			"effect": map[string]any{
				"effect_id":    strings.TrimSpace(result.Effect.EffectID),
				"agreement_id": strings.TrimSpace(result.AgreementID),
				"status":       strings.TrimSpace(result.Effect.Status),
				"resumable":    result.Effect.Resumable,
				"status_url":   strings.Replace(routes.AdminGuardedEffectStatus, ":effect_id", strings.TrimSpace(result.Effect.EffectID), 1),
			},
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminSend))
}

func parseRemediationExecutionMode(raw string) (string, error) {
	mode, err := gocommand.ParseExecutionMode(strings.TrimSpace(raw))
	if err != nil {
		return "", err
	}
	normalized := strings.TrimSpace(string(mode))
	switch normalized {
	case "", string(gocommand.ExecutionModeInline), string(gocommand.ExecutionModeQueued):
		return normalized, nil
	default:
		return "", fmt.Errorf("invalid remediation execution mode %q", raw)
	}
}

func sanitizeGuardedEffectPayload(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var payload any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return "[redacted]"
	}
	payload = sanitizeGuardedEffectPayloadValue(payload)
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "[redacted]"
	}
	return string(encoded)
}

func sanitizeGuardedEffectPayloadValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, nested := range typed {
			if isSensitiveGuardedEffectPayloadKey(key) {
				out[key] = "[redacted]"
				continue
			}
			out[key] = sanitizeGuardedEffectPayloadValue(nested)
		}
		return out
	case []any:
		out := make([]any, 0, len(typed))
		for _, nested := range typed {
			out = append(out, sanitizeGuardedEffectPayloadValue(nested))
		}
		return out
	default:
		return value
	}
}

func isSensitiveGuardedEffectPayloadKey(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "token", "signer_token", "review_token", "pending_token_id", "sign_url", "review_url", "completion_url":
		return true
	default:
		return false
	}
}

func normalizeRemediationExecutionMode(raw string) string {
	mode, err := parseRemediationExecutionMode(raw)
	if err != nil || strings.TrimSpace(mode) == "" {
		return string(gocommand.ExecutionModeInline)
	}
	return mode
}

func normalizeRemediationDispatchState(raw string) string {
	status := strings.ToLower(strings.TrimSpace(raw))
	switch status {
	case "accepted", "requested":
		return "accepted"
	case "running", "started", "processing":
		return "running"
	case "retrying":
		return "retrying"
	case "succeeded", "success", "completed":
		return "succeeded"
	case "failed", "error":
		return "failed"
	case "canceled", "cancelled":
		return "canceled"
	case "dead_letter", "deadletter":
		return "dead_letter"
	default:
		return "accepted"
	}
}

func remediationDispatchStatusURL(routeTemplate, dispatchID string) string {
	dispatchID = strings.TrimSpace(dispatchID)
	if dispatchID == "" {
		return ""
	}
	template := strings.TrimSpace(routeTemplate)
	if template == "" {
		return ""
	}
	return strings.Replace(template, ":dispatch_id", url.PathEscape(dispatchID), 1)
}
