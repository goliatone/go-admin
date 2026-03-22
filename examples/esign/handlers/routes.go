package handlers

import (
	"path"
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

const (
	adminGroupName          = "admin"
	adminDashboardRoute     = "dashboard"
	adminAPIGroupPrefix     = "admin.api"
	adminAPIErrorsRoute     = "errors"
	publicPreviewRoute      = "preview"
	publicPreviewToken      = "codex-preview-token"
	publicPreviewParam      = "token"
	esignSegment            = "esign"
	signingSegment          = "signing"
	integrationsSegment     = "integrations"
	googleSegment           = "google"
	googleDriveSegment      = "google-drive"
	agreementsSegment       = "agreements"
	documentsSegment        = "documents"
	dispatchesSegment       = "dispatches"
	effectsSegment          = "effects"
	remediateSegment        = "remediate"
	draftsSegment           = "drafts"
	adminStatusSegment      = "status"
	statsSegment            = "stats"
	participantsSegment     = "participants"
	fieldDefinitionsSegment = "field-definitions"
	fieldInstancesSegment   = "field-instances"
	sendReadinessSegment    = "send-readiness"
	autoPlaceSegment        = "auto-place"
	placementRunsSegment    = "placement-runs"
	applySegment            = "apply"
	smokeSegment            = "smoke"
	recipientLinksSegment   = "recipient-links"
	uploadSegment           = "upload"
	connectSegment          = "connect"
	disconnectSegment       = "disconnect"
	rotateSegment           = "rotate-credentials"
	accountsSegment         = "accounts"
	searchSegment           = "search"
	browseSegment           = "browse"
	importSegment           = "import"
	importsSegment          = "imports"
	mappingsSegment         = "mappings"
	syncRunsSegment         = "sync-runs"
	checkpointsSegment      = "checkpoints"
	conflictsSegment        = "conflicts"
	resolveSegment          = "resolve"
	publishSegment          = "publish"
	sendSegment             = "send"
	syncSegment             = "sync"
	resourcesSegment        = "resources"
	actionsSegment          = "actions"
	bootstrapSegment        = "bootstrap"
	agreementDraftSegment   = "agreement-draft"
	diagnosticsSegment      = "diagnostics"
	inboundSegment          = "inbound"
	outboundSegment         = "outbound"
	viewSegment             = "view"
	viewerSegment           = "viewer"
	sessionSegment          = "session"
	reviewSegment           = "review"
	threadsSegment          = "threads"
	repliesSegment          = "replies"
	requestChangesSegment   = "request-changes"
	consentSegment          = "consent"
	fieldValuesSegment      = "field-values"
	signatureSegment        = "signature"
	signatureUploadSegment  = "signature-upload"
	telemetrySegment        = "telemetry"
	objectSegment           = "object"
	submitSegment           = "submit"
	declineSegment          = "decline"
	assetsSegment           = "assets"
	profileSegment          = "profile"
	signaturesSegment       = "signatures"
	defaultAdminBasePath    = "/admin"
)

// RouteSet captures resolver-derived route paths used by the e-sign app.
type RouteSet struct {
	AdminBasePath string `json:"admin_base_path"`
	AdminAPIBase  string `json:"admin_api_base"`
	PublicAPIBase string `json:"public_api_base"`

	AdminHome                         string `json:"admin_home"`
	AdminLegacyHome                   string `json:"admin_legacy_home"`
	AdminStatus                       string `json:"admin_status"`
	AdminAPIStatus                    string `json:"admin_api_status"`
	AdminAgreementView                string `json:"admin_agreement_view"`
	AdminDrafts                       string `json:"admin_drafts"`
	AdminDraft                        string `json:"admin_draft"`
	AdminDraftSend                    string `json:"admin_draft_send"`
	AdminSyncResource                 string `json:"admin_sync_resource"`
	AdminSyncResourceAction           string `json:"admin_sync_resource_action"`
	AdminSyncBootstrapAgreementDraft  string `json:"admin_sync_bootstrap_agreement_draft"`
	AdminAgreementsStats              string `json:"admin_agreements_stats"`
	AdminAgreementParticipants        string `json:"admin_agreement_participants"`
	AdminAgreementParticipant         string `json:"admin_agreement_participant"`
	AdminAgreementFieldDefinitions    string `json:"admin_agreement_field_definitions"`
	AdminAgreementFieldDefinition     string `json:"admin_agreement_field_definition"`
	AdminAgreementFieldInstances      string `json:"admin_agreement_field_instances"`
	AdminAgreementFieldInstance       string `json:"admin_agreement_field_instance"`
	AdminAgreementSendReadiness       string `json:"admin_agreement_send_readiness"`
	AdminAgreementAutoPlace           string `json:"admin_agreement_auto_place"`
	AdminAgreementPlacementRuns       string `json:"admin_agreement_placement_runs"`
	AdminAgreementPlacementRun        string `json:"admin_agreement_placement_run"`
	AdminAgreementPlacementApply      string `json:"admin_agreement_placement_apply"`
	AdminSmokeRecipientLinks          string `json:"admin_smoke_recipient_links"`
	AdminDocumentsUpload              string `json:"admin_documents_upload"`
	AdminDocumentRemediate            string `json:"admin_document_remediate"`
	AdminRemediationDispatchStatus    string `json:"admin_remediation_dispatch_status"`
	AdminGuardedEffectStatus          string `json:"admin_guarded_effect_status"`
	AdminGuardedEffectResume          string `json:"admin_guarded_effect_resume"`
	AdminAgreementViewerSession       string `json:"admin_agreement_viewer_session"`
	AdminAgreementViewerAssets        string `json:"admin_agreement_viewer_assets"`
	AdminAgreementViewerThreads       string `json:"admin_agreement_viewer_threads"`
	AdminAgreementViewerThreadReplies string `json:"admin_agreement_viewer_thread_replies"`
	AdminAgreementViewerThreadResolve string `json:"admin_agreement_viewer_thread_resolve"`
	AdminAgreementViewerThreadReopen  string `json:"admin_agreement_viewer_thread_reopen"`
	SignerSession                     string `json:"signer_session"`
	SignerReviewThreads               string `json:"signer_review_threads"`
	SignerReviewThreadReplies         string `json:"signer_review_thread_replies"`
	SignerReviewThreadResolve         string `json:"signer_review_thread_resolve"`
	SignerReviewThreadReopen          string `json:"signer_review_thread_reopen"`
	SignerReviewApprove               string `json:"signer_review_approve"`
	SignerReviewRequestChanges        string `json:"signer_review_request_changes"`
	SignerConsent                     string `json:"signer_consent"`
	SignerFieldValues                 string `json:"signer_field_values"`
	SignerSignature                   string `json:"signer_signature"`
	SignerSignatureUpload             string `json:"signer_signature_upload"`
	SignerSignatureObject             string `json:"signer_signature_object"`
	SignerTelemetry                   string `json:"signer_telemetry"`
	SignerSubmit                      string `json:"signer_submit"`
	SignerDecline                     string `json:"signer_decline"`
	SignerAssets                      string `json:"signer_assets"`
	SignerProfile                     string `json:"signer_profile"`
	SignerSavedSignatures             string `json:"signer_saved_signatures"`
	SignerSavedSignature              string `json:"signer_saved_signature"`

	AdminGoogleOAuthConnect      string `json:"admin_google_o_auth_connect"`
	AdminGoogleOAuthDisconnect   string `json:"admin_google_o_auth_disconnect"`
	AdminGoogleOAuthRotate       string `json:"admin_google_o_auth_rotate"`
	AdminGoogleOAuthStatus       string `json:"admin_google_o_auth_status"`
	AdminGoogleOAuthAccounts     string `json:"admin_google_o_auth_accounts"`
	AdminGoogleDriveSearch       string `json:"admin_google_drive_search"`
	AdminGoogleDriveBrowse       string `json:"admin_google_drive_browse"`
	AdminGoogleDriveImport       string `json:"admin_google_drive_import"`
	AdminGoogleDriveImports      string `json:"admin_google_drive_imports"`
	AdminGoogleDriveImportRun    string `json:"admin_google_drive_import_run"`
	AdminIntegrationMappings     string `json:"admin_integration_mappings"`
	AdminIntegrationMapping      string `json:"admin_integration_mapping"`
	AdminIntegrationMapPublish   string `json:"admin_integration_map_publish"`
	AdminIntegrationSyncRuns     string `json:"admin_integration_sync_runs"`
	AdminIntegrationSyncRun      string `json:"admin_integration_sync_run"`
	AdminIntegrationCheckpoints  string `json:"admin_integration_checkpoints"`
	AdminIntegrationSyncResume   string `json:"admin_integration_sync_resume"`
	AdminIntegrationSyncComplete string `json:"admin_integration_sync_complete"`
	AdminIntegrationSyncFail     string `json:"admin_integration_sync_fail"`
	AdminIntegrationConflicts    string `json:"admin_integration_conflicts"`
	AdminIntegrationConflict     string `json:"admin_integration_conflict"`
	AdminIntegrationResolve      string `json:"admin_integration_resolve"`
	AdminIntegrationDiagnostics  string `json:"admin_integration_diagnostics"`
	AdminIntegrationInbound      string `json:"admin_integration_inbound"`
	AdminIntegrationOutbound     string `json:"admin_integration_outbound"`
}

// BuildRouteSet resolves admin/public namespace roots and builds e-sign routes from them.
func BuildRouteSet(urls urlkit.Resolver, adminBasePath, adminAPIGroup string) RouteSet {
	adminBase := resolvePath(urls, adminGroupName, adminDashboardRoute, nil)
	if adminBase == "" {
		adminBase = normalizeBasePath(adminBasePath)
	}
	if adminBase == "" {
		adminBase = defaultAdminBasePath
	}

	adminAPIBase := deriveAdminAPIBase(urls, adminAPIGroup, adminBase)
	publicAPIBase := derivePublicAPIBase(urls)
	signingBase := joinPath(publicAPIBase, esignSegment, signingSegment)

	return RouteSet{
		AdminBasePath:                     adminBase,
		AdminAPIBase:                      adminAPIBase,
		PublicAPIBase:                     publicAPIBase,
		AdminHome:                         adminBase,
		AdminLegacyHome:                   joinPath(adminBase, esignSegment),
		AdminStatus:                       joinPath(adminBase, esignSegment, adminStatusSegment),
		AdminAPIStatus:                    joinPath(adminAPIBase, esignSegment, adminStatusSegment),
		AdminAgreementView:                joinPath(adminBase, esignSegment, agreementsSegment, ":agreement_id", viewSegment),
		AdminDrafts:                       joinPath(adminAPIBase, esignSegment, draftsSegment),
		AdminDraft:                        joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id"),
		AdminDraftSend:                    joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id", sendSegment),
		AdminSyncResource:                 joinPath(adminAPIBase, esignSegment, syncSegment, resourcesSegment, ":kind", ":id"),
		AdminSyncResourceAction:           joinPath(adminAPIBase, esignSegment, syncSegment, resourcesSegment, ":kind", ":id", actionsSegment, ":operation"),
		AdminSyncBootstrapAgreementDraft:  joinPath(adminAPIBase, esignSegment, syncSegment, bootstrapSegment, agreementDraftSegment),
		AdminAgreementsStats:              joinPath(adminAPIBase, esignSegment, agreementsSegment, statsSegment),
		AdminAgreementParticipants:        joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment),
		AdminAgreementParticipant:         joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment, ":participant_id"),
		AdminAgreementFieldDefinitions:    joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment),
		AdminAgreementFieldDefinition:     joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment, ":field_definition_id"),
		AdminAgreementFieldInstances:      joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment),
		AdminAgreementFieldInstance:       joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment, ":field_instance_id"),
		AdminAgreementSendReadiness:       joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", sendReadinessSegment),
		AdminAgreementAutoPlace:           joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", autoPlaceSegment),
		AdminAgreementPlacementRuns:       joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment),
		AdminAgreementPlacementRun:        joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id"),
		AdminAgreementPlacementApply:      joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id", applySegment),
		AdminSmokeRecipientLinks:          joinPath(adminAPIBase, esignSegment, smokeSegment, recipientLinksSegment),
		AdminDocumentsUpload:              joinPath(adminAPIBase, esignSegment, documentsSegment, uploadSegment),
		AdminDocumentRemediate:            joinPath(adminAPIBase, esignSegment, documentsSegment, ":document_id", remediateSegment),
		AdminRemediationDispatchStatus:    joinPath(adminAPIBase, esignSegment, dispatchesSegment, ":dispatch_id"),
		AdminGuardedEffectStatus:          joinPath(adminAPIBase, esignSegment, effectsSegment, ":effect_id"),
		AdminGuardedEffectResume:          joinPath(adminAPIBase, esignSegment, effectsSegment, ":effect_id", "resume"),
		AdminAgreementViewerSession:       joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment),
		AdminAgreementViewerAssets:        joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, assetsSegment),
		AdminAgreementViewerThreads:       joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment),
		AdminAgreementViewerThreadReplies: joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", repliesSegment),
		AdminAgreementViewerThreadResolve: joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", "resolve"),
		AdminAgreementViewerThreadReopen:  joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", "reopen"),
		SignerSession:                     joinPath(signingBase, sessionSegment, ":token"),
		SignerReviewThreads:               joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment),
		SignerReviewThreadReplies:         joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", repliesSegment),
		SignerReviewThreadResolve:         joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", "resolve"),
		SignerReviewThreadReopen:          joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", "reopen"),
		SignerReviewApprove:               joinPath(signingBase, sessionSegment, ":token", reviewSegment, "approve"),
		SignerReviewRequestChanges:        joinPath(signingBase, sessionSegment, ":token", reviewSegment, requestChangesSegment),
		SignerConsent:                     joinPath(signingBase, consentSegment, ":token"),
		SignerFieldValues:                 joinPath(signingBase, fieldValuesSegment, ":token"),
		SignerSignature:                   joinPath(signingBase, fieldValuesSegment, signatureSegment, ":token"),
		SignerSignatureUpload:             joinPath(signingBase, signatureUploadSegment, ":token"),
		SignerSignatureObject:             joinPath(signingBase, signatureUploadSegment, objectSegment),
		SignerTelemetry:                   joinPath(signingBase, telemetrySegment, ":token"),
		SignerSubmit:                      joinPath(signingBase, submitSegment, ":token"),
		SignerDecline:                     joinPath(signingBase, declineSegment, ":token"),
		SignerAssets:                      joinPath(signingBase, assetsSegment, ":token"),
		SignerProfile:                     joinPath(signingBase, profileSegment, ":token"),
		SignerSavedSignatures:             joinPath(signingBase, signaturesSegment, ":token"),
		SignerSavedSignature:              joinPath(signingBase, signaturesSegment, ":token", ":id"),

		AdminGoogleOAuthConnect:      joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, connectSegment),
		AdminGoogleOAuthDisconnect:   joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, disconnectSegment),
		AdminGoogleOAuthRotate:       joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, rotateSegment),
		AdminGoogleOAuthStatus:       joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, adminStatusSegment),
		AdminGoogleOAuthAccounts:     joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, accountsSegment),
		AdminGoogleDriveSearch:       joinPath(adminAPIBase, esignSegment, googleDriveSegment, searchSegment),
		AdminGoogleDriveBrowse:       joinPath(adminAPIBase, esignSegment, googleDriveSegment, browseSegment),
		AdminGoogleDriveImport:       joinPath(adminAPIBase, esignSegment, googleDriveSegment, importSegment),
		AdminGoogleDriveImports:      joinPath(adminAPIBase, esignSegment, googleDriveSegment, importsSegment),
		AdminGoogleDriveImportRun:    joinPath(adminAPIBase, esignSegment, googleDriveSegment, importsSegment, ":import_run_id"),
		AdminIntegrationMappings:     joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment),
		AdminIntegrationMapping:      joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment, ":mapping_id"),
		AdminIntegrationMapPublish:   joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment, ":mapping_id", publishSegment),
		AdminIntegrationSyncRuns:     joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment),
		AdminIntegrationSyncRun:      joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id"),
		AdminIntegrationCheckpoints:  joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", checkpointsSegment),
		AdminIntegrationSyncResume:   joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "resume"),
		AdminIntegrationSyncComplete: joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "complete"),
		AdminIntegrationSyncFail:     joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "fail"),
		AdminIntegrationConflicts:    joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment),
		AdminIntegrationConflict:     joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment, ":conflict_id"),
		AdminIntegrationResolve:      joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment, ":conflict_id", resolveSegment),
		AdminIntegrationDiagnostics:  joinPath(adminAPIBase, esignSegment, integrationsSegment, diagnosticsSegment),
		AdminIntegrationInbound:      joinPath(adminAPIBase, esignSegment, integrationsSegment, inboundSegment),
		AdminIntegrationOutbound:     joinPath(adminAPIBase, esignSegment, integrationsSegment, outboundSegment),
	}
}

func deriveAdminAPIBase(urls urlkit.Resolver, adminAPIGroup, adminBase string) string {
	if path := resolvePath(urls, strings.TrimSpace(adminAPIGroup), adminAPIErrorsRoute, nil); path != "" {
		if before, ok := strings.CutSuffix(path, "/errors"); ok {
			return before
		}
		return strings.TrimSuffix(path, "/")
	}

	base := joinPath(adminBase, "api")
	version := adminVersionFromGroup(adminAPIGroup)
	if version != "" {
		base = joinPath(base, version)
	}
	return base
}

func derivePublicAPIBase(urls urlkit.Resolver) string {
	groups := []string{"public.api.v1", "public.api"}
	for _, group := range groups {
		previewPath := resolvePath(urls, group, publicPreviewRoute, urlkit.Params{publicPreviewParam: publicPreviewToken})
		suffix := "/preview/" + publicPreviewToken
		if before, ok := strings.CutSuffix(previewPath, suffix); ok {
			return before
		}
	}
	return "/api/v1"
}

func adminVersionFromGroup(group string) string {
	group = strings.TrimSpace(group)
	prefix := adminAPIGroupPrefix + "."
	if !strings.HasPrefix(group, prefix) {
		return ""
	}
	version := strings.TrimPrefix(group, prefix)
	return strings.Trim(version, " /")
}

func resolvePath(urls urlkit.Resolver, group, route string, params urlkit.Params) string {
	group = strings.TrimSpace(group)
	route = strings.TrimSpace(route)
	if urls == nil || group == "" || route == "" {
		return ""
	}
	path, err := urls.Resolve(group, route, params, nil)
	if err != nil {
		return ""
	}
	return normalizeBasePath(path)
}

func joinPath(base string, parts ...string) string {
	segments := make([]string, 0, len(parts)+1)
	segments = append(segments, normalizeBasePath(base))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		segments = append(segments, trimmed)
	}
	joined := path.Join(segments...)
	if !strings.HasPrefix(joined, "/") {
		joined = "/" + joined
	}
	return joined
}

func normalizeBasePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if value == "/" {
		return value
	}
	return "/" + strings.Trim(value, "/")
}
