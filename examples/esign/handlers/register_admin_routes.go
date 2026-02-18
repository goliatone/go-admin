package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
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
}
