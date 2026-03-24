package modules

import (
	"path"
	"strings"
)

func canonicalESignPanelRouteSlug(panelID string) string {
	switch strings.TrimSpace(panelID) {
	case esignDocumentsPanelID:
		return "documents"
	case esignAgreementsPanelID:
		return "agreements"
	default:
		return strings.TrimSpace(panelID)
	}
}

func canonicalESignPanelListPath(basePath, panelID string) string {
	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}
	return path.Join(basePath, "content", canonicalESignPanelRouteSlug(panelID))
}
