package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	router "github.com/goliatone/go-router"
)

func registerLineageRoutes(adminRoutes routeRegistrar, cfg registerConfig) {
	documentRoute := services.DefaultLineageDiagnosticsBasePath + "/" + documentsSegment + "/:document_id"
	agreementRoute := services.DefaultLineageDiagnosticsBasePath + "/" + agreementsSegment + "/:agreement_id"

	adminRoutes.Get(documentRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.lineageDiagnostics == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", "lineage diagnostics are not configured", nil)
		}
		documentID := strings.TrimSpace(c.Param("document_id"))
		if documentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "document_id is required", nil)
		}
		diagnostics, err := cfg.lineageDiagnostics.GetDocumentLineageDiagnostics(c.Context(), cfg.resolveScope(c), documentID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", "unable to resolve document lineage diagnostics", map[string]any{
				"document_id": documentID,
			})
		}
		return c.JSON(http.StatusOK, diagnostics)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(agreementRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.lineageDiagnostics == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", "lineage diagnostics are not configured", nil)
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "agreement_id is required", nil)
		}
		diagnostics, err := cfg.lineageDiagnostics.GetAgreementLineageDiagnostics(c.Context(), cfg.resolveScope(c), agreementID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", "unable to resolve agreement lineage diagnostics", map[string]any{
				"agreement_id": agreementID,
			})
		}
		return c.JSON(http.StatusOK, diagnostics)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))
}
