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
	SignerBootstrap                   string `json:"signer_bootstrap"`
	SignerSessionAuth                 string `json:"signer_session_auth"`
	SignerReviewThreads               string `json:"signer_review_threads"`
	SignerReviewThreadsAuth           string `json:"signer_review_threads_auth"`
	SignerReviewThreadReplies         string `json:"signer_review_thread_replies"`
	SignerReviewThreadRepliesAuth     string `json:"signer_review_thread_replies_auth"`
	SignerReviewThreadResolve         string `json:"signer_review_thread_resolve"`
	SignerReviewThreadResolveAuth     string `json:"signer_review_thread_resolve_auth"`
	SignerReviewThreadReopen          string `json:"signer_review_thread_reopen"`
	SignerReviewThreadReopenAuth      string `json:"signer_review_thread_reopen_auth"`
	SignerReviewApprove               string `json:"signer_review_approve"`
	SignerReviewApproveAuth           string `json:"signer_review_approve_auth"`
	SignerReviewRequestChanges        string `json:"signer_review_request_changes"`
	SignerReviewRequestChangesAuth    string `json:"signer_review_request_changes_auth"`
	SignerConsent                     string `json:"signer_consent"`
	SignerConsentAuth                 string `json:"signer_consent_auth"`
	SignerFieldValues                 string `json:"signer_field_values"`
	SignerFieldValuesAuth             string `json:"signer_field_values_auth"`
	SignerSignature                   string `json:"signer_signature"`
	SignerSignatureAuth               string `json:"signer_signature_auth"`
	SignerSignatureUpload             string `json:"signer_signature_upload"`
	SignerSignatureUploadAuth         string `json:"signer_signature_upload_auth"`
	SignerSignatureObject             string `json:"signer_signature_object"`
	SignerTelemetry                   string `json:"signer_telemetry"`
	SignerTelemetryAuth               string `json:"signer_telemetry_auth"`
	SignerSubmit                      string `json:"signer_submit"`
	SignerSubmitAuth                  string `json:"signer_submit_auth"`
	SignerDecline                     string `json:"signer_decline"`
	SignerDeclineAuth                 string `json:"signer_decline_auth"`
	SignerAssets                      string `json:"signer_assets"`
	SignerAssetsAuth                  string `json:"signer_assets_auth"`
	SignerProfile                     string `json:"signer_profile"`
	SignerProfileAuth                 string `json:"signer_profile_auth"`
	SignerSavedSignatures             string `json:"signer_saved_signatures"`
	SignerSavedSignaturesAuth         string `json:"signer_saved_signatures_auth"`
	SignerSavedSignature              string `json:"signer_saved_signature"`
	SignerSavedSignatureAuth          string `json:"signer_saved_signature_auth"`

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

func populateAdminRoutes(set *RouteSet, adminBase string, adminAPIBase string) {
	set.AdminHome = adminBase
	set.AdminLegacyHome = joinPath(adminBase, esignSegment)
	set.AdminStatus = joinPath(adminBase, esignSegment, adminStatusSegment)
	set.AdminAPIStatus = joinPath(adminAPIBase, esignSegment, adminStatusSegment)
	set.AdminAgreementView = joinPath(adminBase, esignSegment, agreementsSegment, ":agreement_id", viewSegment)
	set.AdminDrafts = joinPath(adminAPIBase, esignSegment, draftsSegment)
	set.AdminDraft = joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id")
	set.AdminDraftSend = joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id", sendSegment)
	set.AdminSyncResource = joinPath(adminAPIBase, esignSegment, syncSegment, resourcesSegment, ":kind", ":id")
	set.AdminSyncResourceAction = joinPath(adminAPIBase, esignSegment, syncSegment, resourcesSegment, ":kind", ":id", actionsSegment, ":operation")
	set.AdminSyncBootstrapAgreementDraft = joinPath(adminAPIBase, esignSegment, syncSegment, bootstrapSegment, agreementDraftSegment)
	set.AdminAgreementsStats = joinPath(adminAPIBase, esignSegment, agreementsSegment, statsSegment)
	set.AdminAgreementParticipants = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment)
	set.AdminAgreementParticipant = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment, ":participant_id")
	set.AdminAgreementFieldDefinitions = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment)
	set.AdminAgreementFieldDefinition = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment, ":field_definition_id")
	set.AdminAgreementFieldInstances = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment)
	set.AdminAgreementFieldInstance = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment, ":field_instance_id")
	set.AdminAgreementSendReadiness = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", sendReadinessSegment)
	set.AdminAgreementAutoPlace = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", autoPlaceSegment)
	set.AdminAgreementPlacementRuns = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment)
	set.AdminAgreementPlacementRun = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id")
	set.AdminAgreementPlacementApply = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id", applySegment)
	set.AdminSmokeRecipientLinks = joinPath(adminAPIBase, esignSegment, smokeSegment, recipientLinksSegment)
	set.AdminDocumentsUpload = joinPath(adminAPIBase, esignSegment, documentsSegment, uploadSegment)
	set.AdminDocumentRemediate = joinPath(adminAPIBase, esignSegment, documentsSegment, ":document_id", remediateSegment)
	set.AdminRemediationDispatchStatus = joinPath(adminAPIBase, esignSegment, dispatchesSegment, ":dispatch_id")
	set.AdminGuardedEffectStatus = joinPath(adminAPIBase, esignSegment, effectsSegment, ":effect_id")
	set.AdminGuardedEffectResume = joinPath(adminAPIBase, esignSegment, effectsSegment, ":effect_id", "resume")
	set.AdminAgreementViewerSession = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment)
	set.AdminAgreementViewerAssets = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, assetsSegment)
	set.AdminAgreementViewerThreads = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment)
	set.AdminAgreementViewerThreadReplies = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", repliesSegment)
	set.AdminAgreementViewerThreadResolve = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", "resolve")
	set.AdminAgreementViewerThreadReopen = joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", viewerSegment, reviewSegment, threadsSegment, ":thread_id", "reopen")
}

func populateSignerRoutes(set *RouteSet, signingBase string, signingReviewBase string) {
	set.SignerSession = joinPath(signingBase, sessionSegment, ":token")
	set.SignerBootstrap = joinPath(signingBase, bootstrapSegment, ":token")
	set.SignerSessionAuth = joinPath(signingBase, sessionSegment)
	set.SignerReviewThreads = joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment)
	set.SignerReviewThreadsAuth = joinPath(signingReviewBase, threadsSegment)
	set.SignerReviewThreadReplies = joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", repliesSegment)
	set.SignerReviewThreadRepliesAuth = joinPath(signingReviewBase, threadsSegment, ":thread_id", repliesSegment)
	set.SignerReviewThreadResolve = joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", "resolve")
	set.SignerReviewThreadResolveAuth = joinPath(signingReviewBase, threadsSegment, ":thread_id", "resolve")
	set.SignerReviewThreadReopen = joinPath(signingBase, sessionSegment, ":token", reviewSegment, threadsSegment, ":thread_id", "reopen")
	set.SignerReviewThreadReopenAuth = joinPath(signingReviewBase, threadsSegment, ":thread_id", "reopen")
	set.SignerReviewApprove = joinPath(signingBase, sessionSegment, ":token", reviewSegment, "approve")
	set.SignerReviewApproveAuth = joinPath(signingReviewBase, "approve")
	set.SignerReviewRequestChanges = joinPath(signingBase, sessionSegment, ":token", reviewSegment, requestChangesSegment)
	set.SignerReviewRequestChangesAuth = joinPath(signingReviewBase, requestChangesSegment)
	set.SignerConsent = joinPath(signingBase, consentSegment, ":token")
	set.SignerConsentAuth = joinPath(signingBase, consentSegment)
	set.SignerFieldValues = joinPath(signingBase, fieldValuesSegment, ":token")
	set.SignerFieldValuesAuth = joinPath(signingBase, fieldValuesSegment)
	set.SignerSignature = joinPath(signingBase, fieldValuesSegment, signatureSegment, ":token")
	set.SignerSignatureAuth = joinPath(signingBase, fieldValuesSegment, signatureSegment)
	set.SignerSignatureUpload = joinPath(signingBase, signatureUploadSegment, ":token")
	set.SignerSignatureUploadAuth = joinPath(signingBase, signatureUploadSegment)
	set.SignerSignatureObject = joinPath(signingBase, signatureUploadSegment, objectSegment)
	set.SignerTelemetry = joinPath(signingBase, telemetrySegment, ":token")
	set.SignerTelemetryAuth = joinPath(signingBase, telemetrySegment)
	set.SignerSubmit = joinPath(signingBase, submitSegment, ":token")
	set.SignerSubmitAuth = joinPath(signingBase, submitSegment)
	set.SignerDecline = joinPath(signingBase, declineSegment, ":token")
	set.SignerDeclineAuth = joinPath(signingBase, declineSegment)
	set.SignerAssets = joinPath(signingBase, assetsSegment, ":token")
	set.SignerAssetsAuth = joinPath(signingBase, assetsSegment)
	set.SignerProfile = joinPath(signingBase, profileSegment, ":token")
	set.SignerProfileAuth = joinPath(signingBase, profileSegment)
	set.SignerSavedSignatures = joinPath(signingBase, signaturesSegment, ":token")
	set.SignerSavedSignaturesAuth = joinPath(signingBase, signaturesSegment)
	set.SignerSavedSignature = joinPath(signingBase, signaturesSegment, ":token", ":id")
	set.SignerSavedSignatureAuth = joinPath(signingBase, signaturesSegment, ":id")
}

func populateIntegrationRoutes(set *RouteSet, adminAPIBase string) {
	set.AdminGoogleOAuthConnect = joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, connectSegment)
	set.AdminGoogleOAuthDisconnect = joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, disconnectSegment)
	set.AdminGoogleOAuthRotate = joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, rotateSegment)
	set.AdminGoogleOAuthStatus = joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, adminStatusSegment)
	set.AdminGoogleOAuthAccounts = joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, accountsSegment)
	set.AdminGoogleDriveSearch = joinPath(adminAPIBase, esignSegment, googleDriveSegment, searchSegment)
	set.AdminGoogleDriveBrowse = joinPath(adminAPIBase, esignSegment, googleDriveSegment, browseSegment)
	set.AdminGoogleDriveImport = joinPath(adminAPIBase, esignSegment, googleDriveSegment, importSegment)
	set.AdminGoogleDriveImports = joinPath(adminAPIBase, esignSegment, googleDriveSegment, importsSegment)
	set.AdminGoogleDriveImportRun = joinPath(adminAPIBase, esignSegment, googleDriveSegment, importsSegment, ":import_run_id")
	set.AdminIntegrationMappings = joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment)
	set.AdminIntegrationMapping = joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment, ":mapping_id")
	set.AdminIntegrationMapPublish = joinPath(adminAPIBase, esignSegment, integrationsSegment, mappingsSegment, ":mapping_id", publishSegment)
	set.AdminIntegrationSyncRuns = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment)
	set.AdminIntegrationSyncRun = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id")
	set.AdminIntegrationCheckpoints = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", checkpointsSegment)
	set.AdminIntegrationSyncResume = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "resume")
	set.AdminIntegrationSyncComplete = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "complete")
	set.AdminIntegrationSyncFail = joinPath(adminAPIBase, esignSegment, integrationsSegment, syncRunsSegment, ":run_id", "fail")
	set.AdminIntegrationConflicts = joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment)
	set.AdminIntegrationConflict = joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment, ":conflict_id")
	set.AdminIntegrationResolve = joinPath(adminAPIBase, esignSegment, integrationsSegment, conflictsSegment, ":conflict_id", resolveSegment)
	set.AdminIntegrationDiagnostics = joinPath(adminAPIBase, esignSegment, integrationsSegment, diagnosticsSegment)
	set.AdminIntegrationInbound = joinPath(adminAPIBase, esignSegment, integrationsSegment, inboundSegment)
	set.AdminIntegrationOutbound = joinPath(adminAPIBase, esignSegment, integrationsSegment, outboundSegment)
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
	signingReviewBase := joinPath(signingBase, reviewSegment)

	set := RouteSet{
		AdminBasePath: adminBase,
		AdminAPIBase:  adminAPIBase,
		PublicAPIBase: publicAPIBase,
	}
	populateAdminRoutes(&set, adminBase, adminAPIBase)
	populateSignerRoutes(&set, signingBase, signingReviewBase)
	populateIntegrationRoutes(&set, adminAPIBase)
	return set
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
