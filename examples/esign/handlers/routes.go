package handlers

import (
	"path"
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

const (
	adminGroupName       = "admin"
	adminDashboardRoute  = "dashboard"
	adminAPIGroupPrefix  = "admin.api"
	adminAPIErrorsRoute  = "errors"
	publicPreviewRoute   = "preview"
	publicPreviewToken   = "codex-preview-token"
	publicPreviewParam   = "token"
	esignSegment         = "esign"
	signingSegment       = "signing"
	integrationsSegment  = "integrations"
	googleSegment        = "google"
	googleDriveSegment   = "google-drive"
	adminStatusSegment   = "status"
	connectSegment       = "connect"
	disconnectSegment    = "disconnect"
	rotateSegment        = "rotate-credentials"
	searchSegment        = "search"
	browseSegment        = "browse"
	importSegment        = "import"
	sessionSegment       = "session"
	consentSegment       = "consent"
	fieldValuesSegment   = "field-values"
	signatureSegment     = "signature"
	submitSegment        = "submit"
	declineSegment       = "decline"
	defaultAdminBasePath = "/admin"
)

// RouteSet captures resolver-derived route paths used by the e-sign app.
type RouteSet struct {
	AdminBasePath string
	AdminAPIBase  string
	PublicAPIBase string

	AdminStatus       string
	AdminAPIStatus    string
	SignerSession     string
	SignerConsent     string
	SignerFieldValues string
	SignerSignature   string
	SignerSubmit      string
	SignerDecline     string

	AdminGoogleOAuthConnect    string
	AdminGoogleOAuthDisconnect string
	AdminGoogleOAuthRotate     string
	AdminGoogleOAuthStatus     string
	AdminGoogleDriveSearch     string
	AdminGoogleDriveBrowse     string
	AdminGoogleDriveImport     string
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
		AdminBasePath:     adminBase,
		AdminAPIBase:      adminAPIBase,
		PublicAPIBase:     publicAPIBase,
		AdminStatus:       joinPath(adminBase, esignSegment),
		AdminAPIStatus:    joinPath(adminAPIBase, esignSegment, adminStatusSegment),
		SignerSession:     joinPath(signingBase, sessionSegment, ":token"),
		SignerConsent:     joinPath(signingBase, consentSegment, ":token"),
		SignerFieldValues: joinPath(signingBase, fieldValuesSegment, ":token"),
		SignerSignature:   joinPath(signingBase, fieldValuesSegment, signatureSegment, ":token"),
		SignerSubmit:      joinPath(signingBase, submitSegment, ":token"),
		SignerDecline:     joinPath(signingBase, declineSegment, ":token"),

		AdminGoogleOAuthConnect:    joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, connectSegment),
		AdminGoogleOAuthDisconnect: joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, disconnectSegment),
		AdminGoogleOAuthRotate:     joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, rotateSegment),
		AdminGoogleOAuthStatus:     joinPath(adminAPIBase, esignSegment, integrationsSegment, googleSegment, adminStatusSegment),
		AdminGoogleDriveSearch:     joinPath(adminAPIBase, esignSegment, googleDriveSegment, searchSegment),
		AdminGoogleDriveBrowse:     joinPath(adminAPIBase, esignSegment, googleDriveSegment, browseSegment),
		AdminGoogleDriveImport:     joinPath(adminAPIBase, esignSegment, googleDriveSegment, importSegment),
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
