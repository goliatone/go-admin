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
	diagnosticsSegment      = "diagnostics"
	inboundSegment          = "inbound"
	outboundSegment         = "outbound"
	sessionSegment          = "session"
	consentSegment          = "consent"
	fieldValuesSegment      = "field-values"
	signatureSegment        = "signature"
	signatureUploadSegment  = "signature-upload"
	telemetrySegment        = "telemetry"
	objectSegment           = "object"
	submitSegment           = "submit"
	declineSegment          = "decline"
	assetsSegment           = "assets"
	defaultAdminBasePath    = "/admin"
)

// RouteSet captures resolver-derived route paths used by the e-sign app.
type RouteSet struct {
	AdminBasePath string
	AdminAPIBase  string
	PublicAPIBase string

	AdminHome                      string
	AdminStatus                    string
	AdminAPIStatus                 string
	AdminDrafts                    string
	AdminDraft                     string
	AdminDraftSend                 string
	AdminAgreementsStats           string
	AdminAgreementParticipants     string
	AdminAgreementParticipant      string
	AdminAgreementFieldDefinitions string
	AdminAgreementFieldDefinition  string
	AdminAgreementFieldInstances   string
	AdminAgreementFieldInstance    string
	AdminAgreementSendReadiness    string
	AdminAgreementAutoPlace        string
	AdminAgreementPlacementRuns    string
	AdminAgreementPlacementRun     string
	AdminAgreementPlacementApply   string
	AdminSmokeRecipientLinks       string
	AdminDocumentsUpload           string
	SignerSession                  string
	SignerConsent                  string
	SignerFieldValues              string
	SignerSignature                string
	SignerSignatureUpload          string
	SignerSignatureObject          string
	SignerTelemetry                string
	SignerSubmit                   string
	SignerDecline                  string
	SignerAssets                   string

	AdminGoogleOAuthConnect      string
	AdminGoogleOAuthDisconnect   string
	AdminGoogleOAuthRotate       string
	AdminGoogleOAuthStatus       string
	AdminGoogleOAuthAccounts     string
	AdminGoogleDriveSearch       string
	AdminGoogleDriveBrowse       string
	AdminGoogleDriveImport       string
	AdminGoogleDriveImports      string
	AdminGoogleDriveImportRun    string
	AdminIntegrationMappings     string
	AdminIntegrationMapping      string
	AdminIntegrationMapPublish   string
	AdminIntegrationSyncRuns     string
	AdminIntegrationSyncRun      string
	AdminIntegrationCheckpoints  string
	AdminIntegrationSyncResume   string
	AdminIntegrationSyncComplete string
	AdminIntegrationSyncFail     string
	AdminIntegrationConflicts    string
	AdminIntegrationConflict     string
	AdminIntegrationResolve      string
	AdminIntegrationDiagnostics  string
	AdminIntegrationInbound      string
	AdminIntegrationOutbound     string
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
		AdminBasePath:                  adminBase,
		AdminAPIBase:                   adminAPIBase,
		PublicAPIBase:                  publicAPIBase,
		AdminHome:                      joinPath(adminBase, esignSegment),
		AdminStatus:                    joinPath(adminBase, esignSegment, adminStatusSegment),
		AdminAPIStatus:                 joinPath(adminAPIBase, esignSegment, adminStatusSegment),
		AdminDrafts:                    joinPath(adminAPIBase, esignSegment, draftsSegment),
		AdminDraft:                     joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id"),
		AdminDraftSend:                 joinPath(adminAPIBase, esignSegment, draftsSegment, ":draft_id", sendSegment),
		AdminAgreementsStats:           joinPath(adminAPIBase, esignSegment, agreementsSegment, statsSegment),
		AdminAgreementParticipants:     joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment),
		AdminAgreementParticipant:      joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", participantsSegment, ":participant_id"),
		AdminAgreementFieldDefinitions: joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment),
		AdminAgreementFieldDefinition:  joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldDefinitionsSegment, ":field_definition_id"),
		AdminAgreementFieldInstances:   joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment),
		AdminAgreementFieldInstance:    joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", fieldInstancesSegment, ":field_instance_id"),
		AdminAgreementSendReadiness:    joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", sendReadinessSegment),
		AdminAgreementAutoPlace:        joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", autoPlaceSegment),
		AdminAgreementPlacementRuns:    joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment),
		AdminAgreementPlacementRun:     joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id"),
		AdminAgreementPlacementApply:   joinPath(adminAPIBase, esignSegment, agreementsSegment, ":agreement_id", placementRunsSegment, ":placement_run_id", applySegment),
		AdminSmokeRecipientLinks:       joinPath(adminAPIBase, esignSegment, smokeSegment, recipientLinksSegment),
		AdminDocumentsUpload:           joinPath(adminAPIBase, esignSegment, documentsSegment, uploadSegment),
		SignerSession:                  joinPath(signingBase, sessionSegment, ":token"),
		SignerConsent:                  joinPath(signingBase, consentSegment, ":token"),
		SignerFieldValues:              joinPath(signingBase, fieldValuesSegment, ":token"),
		SignerSignature:                joinPath(signingBase, fieldValuesSegment, signatureSegment, ":token"),
		SignerSignatureUpload:          joinPath(signingBase, signatureUploadSegment, ":token"),
		SignerSignatureObject:          joinPath(signingBase, signatureUploadSegment, objectSegment),
		SignerTelemetry:                joinPath(signingBase, telemetrySegment, ":token"),
		SignerSubmit:                   joinPath(signingBase, submitSegment, ":token"),
		SignerDecline:                  joinPath(signingBase, declineSegment, ":token"),
		SignerAssets:                   joinPath(signingBase, assetsSegment, ":token"),

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
		if strings.HasSuffix(path, "/errors") {
			return strings.TrimSuffix(path, "/errors")
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
		if strings.HasSuffix(previewPath, suffix) {
			return strings.TrimSuffix(previewPath, suffix)
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
