package modules

import "strings"

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
	return joinBasePath(basePath, "content/"+canonicalESignPanelRouteSlug(panelID))
}
