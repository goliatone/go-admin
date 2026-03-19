package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

func registerLineageRoutes(adminRoutes routeRegistrar, cfg registerConfig) {
	documentRoute := services.DefaultLineageDiagnosticsBasePath + "/" + documentsSegment + "/:document_id"
	agreementRoute := services.DefaultLineageDiagnosticsBasePath + "/" + agreementsSegment + "/:agreement_id"
	documentCandidatesRoute := documentRoute + "/candidates"
	reviewRoute := services.DefaultLineageDiagnosticsBasePath + "/relationships/:relationship_id/review"

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

	adminRoutes.Get(documentCandidatesRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil || cfg.sourceReconciliation == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_RECONCILIATION_UNAVAILABLE", "lineage reconciliation is not configured", nil)
		}
		documentID := strings.TrimSpace(c.Param("document_id"))
		if documentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "document_id is required", nil)
		}
		detail, err := cfg.sourceReadModels.GetDocumentLineageDetail(c.Context(), cfg.resolveScope(c), documentID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_CANDIDATES_UNAVAILABLE", "unable to resolve document lineage detail", map[string]any{
				"document_id": documentID,
			})
		}
		if detail.SourceDocument == nil || strings.TrimSpace(detail.SourceDocument.ID) == "" {
			return writeAPIError(c, nil, http.StatusNotFound, "LINEAGE_SOURCE_NOT_FOUND", "document has no canonical source lineage", map[string]any{
				"document_id": documentID,
			})
		}
		relationships, err := cfg.sourceReconciliation.ListCandidateRelationships(c.Context(), cfg.resolveScope(c), detail.SourceDocument.ID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_CANDIDATES_UNAVAILABLE", "unable to list lineage candidates", map[string]any{
				"document_id":       documentID,
				"source_document_id": detail.SourceDocument.ID,
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":             "ok",
			"document_id":        documentID,
			"source_document_id": detail.SourceDocument.ID,
			"relationships":      relationships,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Post(reviewRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReconciliation == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_RECONCILIATION_UNAVAILABLE", "lineage reconciliation is not configured", nil)
		}
		relationshipID := strings.TrimSpace(c.Param("relationship_id"))
		if relationshipID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "relationship_id is required", nil)
		}
		var payload struct {
			Action string `json:"action"`
			Reason string `json:"reason"`
		}
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid lineage review payload"); err != nil {
			return err
		}
		summary, err := cfg.sourceReconciliation.ApplyReviewAction(c.Context(), cfg.resolveScope(c), services.SourceRelationshipReviewInput{
			RelationshipID: relationshipID,
			Action:         strings.TrimSpace(payload.Action),
			ActorID:        resolveLineageReviewActorID(c),
			Reason:         strings.TrimSpace(payload.Reason),
		})
		if err != nil {
			status := http.StatusConflict
			if isNotFound(err) {
				status = http.StatusNotFound
			}
			return writeAPIError(c, err, status, "LINEAGE_REVIEW_FAILED", "unable to apply lineage review action", map[string]any{
				"relationship_id": relationshipID,
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":   "ok",
			"candidate": summary,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))
}

func resolveLineageReviewActorID(c router.Context) string {
	return strings.TrimSpace(firstNonEmpty(
		resolveAuthenticatedAdminUserID(c),
		stableString(c.Query("user_id")),
	))
}

func lineageSourceDocumentID(detail services.DocumentLineageDetail) string {
	if detail.SourceDocument == nil {
		return ""
	}
	return strings.TrimSpace(detail.SourceDocument.ID)
}

func relationshipStatusCounts(relationships []stores.SourceRelationshipRecord) map[string]int {
	counts := map[string]int{}
	for _, relationship := range relationships {
		status := strings.TrimSpace(relationship.Status)
		if status == "" {
			continue
		}
		counts[status]++
	}
	return counts
}
