package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func registerLineageRoutes(adminRoutes routeRegistrar, cfg registerConfig) {
	documentRoute := services.DefaultLineageDiagnosticsBasePath + "/" + documentsSegment + "/:document_id"
	agreementRoute := services.DefaultLineageDiagnosticsBasePath + "/" + agreementsSegment + "/:agreement_id"
	documentCandidatesRoute := documentRoute + "/candidates"
	reviewRoute := services.DefaultLineageDiagnosticsBasePath + "/relationships/:relationship_id/review"
	sourcesRoute := services.DefaultSourceManagementBasePath + "/sources"
	sourceRoute := sourcesRoute + "/:source_document_id"
	sourceWorkspaceRoute := sourceRoute + "/workspace"
	sourceRevisionsRoute := sourceRoute + "/revisions"
	sourceRelationshipsRoute := sourceRoute + "/relationships"
	sourceAgreementsRoute := sourceRoute + "/agreements"
	sourceHandlesRoute := sourceRoute + "/handles"
	sourceCommentsRoute := sourceRoute + "/comments"
	sourceRevisionRoute := services.DefaultSourceManagementBasePath + "/source-revisions/:source_revision_id"
	sourceRevisionArtifactsRoute := sourceRevisionRoute + "/artifacts"
	sourceRevisionCommentsRoute := sourceRevisionRoute + "/comments"
	sourceSearchRoute := services.DefaultSourceManagementBasePath + "/source-search"
	reconciliationQueueRoute := services.DefaultSourceManagementBasePath + "/reconciliation-queue"
	reconciliationCandidateRoute := reconciliationQueueRoute + "/:relationship_id"
	reconciliationCandidateReviewRoute := reconciliationCandidateRoute + "/review"

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
		sourceDocumentID := lineageSourceDocumentID(detail)
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusNotFound, "LINEAGE_SOURCE_NOT_FOUND", "document has no canonical source lineage", map[string]any{
				"document_id": documentID,
			})
		}
		relationships, err := cfg.sourceReconciliation.ListCandidateRelationships(c.Context(), cfg.resolveScope(c), sourceDocumentID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_CANDIDATES_UNAVAILABLE", "unable to list lineage candidates", map[string]any{
				"document_id":        documentID,
				"source_document_id": sourceDocumentID,
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"status":             "ok",
			"document_id":        documentID,
			"source_document_id": sourceDocumentID,
			"relationships":      relationships,
			"status_counts":      relationshipStatusCounts(relationships),
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
			Action          string `json:"action"`
			ConfirmBehavior string `json:"confirm_behavior"`
			Reason          string `json:"reason"`
		}
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid lineage review payload"); err != nil {
			return err
		}
		actorID := resolveAuthenticatedAdminUserID(c)
		if actorID == "" {
			return writeAPIError(c, nil, http.StatusForbidden, string(services.ErrorCodeScopeDenied), "authenticated admin actor is required for lineage review actions", nil)
		}
		summary, err := cfg.sourceReconciliation.ApplyReviewAction(c.Context(), cfg.resolveScope(c), services.SourceRelationshipReviewInput{
			RelationshipID:  relationshipID,
			Action:          strings.TrimSpace(payload.Action),
			ConfirmBehavior: strings.TrimSpace(payload.ConfirmBehavior),
			ActorID:         actorID,
			Reason:          strings.TrimSpace(payload.Reason),
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
			"status":    "ok",
			"candidate": summary,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

	adminRoutes.Get(sourcesRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		query := services.SourceListQuery{
			Query:        strings.TrimSpace(c.Query("q")),
			ProviderKind: strings.TrimSpace(c.Query("provider_kind")),
			Status:       strings.TrimSpace(c.Query("status")),
			Sort:         strings.TrimSpace(c.Query("sort")),
			Page:         parsePageSize(c.Query("page")),
			PageSize:     parsePageSize(c.Query("page_size")),
		}
		query.HasPendingCandidates = parseOptionalBoolQuery(c.Query("has_pending_candidates"))
		page, err := cfg.sourceReadModels.ListSources(c.Context(), cfg.resolveScope(c), query)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCES_NOT_FOUND", "LINEAGE_SOURCES_UNAVAILABLE", "source documents not found", "unable to list source documents", nil)
		}
		page = authorizeSourceListPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		detail, err := cfg.sourceReadModels.GetSourceDetail(c.Context(), cfg.resolveScope(c), sourceDocumentID)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_NOT_FOUND", "LINEAGE_SOURCE_UNAVAILABLE", "source detail not found", "unable to load source detail", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		detail = authorizeSourceDetail(c, cfg, detail)
		return c.JSON(http.StatusOK, detail)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceWorkspaceRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		workspace, err := cfg.sourceReadModels.GetSourceWorkspace(c.Context(), cfg.resolveScope(c), sourceDocumentID, services.SourceWorkspaceQuery{
			Panel:  strings.TrimSpace(c.Query("panel")),
			Anchor: strings.TrimSpace(c.Query("anchor")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_NOT_FOUND", "LINEAGE_SOURCE_UNAVAILABLE", "source workspace not found", "unable to load source workspace", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		workspace = authorizeSourceWorkspace(c, cfg, workspace)
		return c.JSON(http.StatusOK, workspace)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRevisionsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceRevisions(c.Context(), cfg.resolveScope(c), sourceDocumentID, services.SourceRevisionListQuery{
			Sort:     strings.TrimSpace(c.Query("sort")),
			Page:     parsePageSize(c.Query("page")),
			PageSize: parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_REVISIONS_NOT_FOUND", "LINEAGE_SOURCE_REVISIONS_UNAVAILABLE", "source revisions not found", "unable to list source revisions", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		page = authorizeSourceRevisionPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRelationshipsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceRelationships(c.Context(), cfg.resolveScope(c), sourceDocumentID, services.SourceRelationshipListQuery{
			Status:           strings.TrimSpace(c.Query("status")),
			RelationshipType: strings.TrimSpace(c.Query("relationship_type")),
			Sort:             strings.TrimSpace(c.Query("sort")),
			Page:             parsePageSize(c.Query("page")),
			PageSize:         parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_RELATIONSHIPS_NOT_FOUND", "LINEAGE_SOURCE_RELATIONSHIPS_UNAVAILABLE", "source relationships not found", "unable to list source relationships", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		page = authorizeSourceRelationshipPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceAgreementsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceAgreements(c.Context(), cfg.resolveScope(c), sourceDocumentID, services.SourceAgreementListQuery{
			Status:           strings.TrimSpace(c.Query("status")),
			SourceRevisionID: strings.TrimSpace(c.Query("source_revision_id")),
			Sort:             strings.TrimSpace(c.Query("sort")),
			Page:             parsePageSize(c.Query("page")),
			PageSize:         parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_AGREEMENTS_NOT_FOUND", "LINEAGE_SOURCE_AGREEMENTS_UNAVAILABLE", "source agreements not found", "unable to list source agreements", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		page = authorizeSourceAgreementPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceHandlesRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceHandles(c.Context(), cfg.resolveScope(c), sourceDocumentID)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_HANDLES_NOT_FOUND", "LINEAGE_SOURCE_HANDLES_UNAVAILABLE", "source handles not found", "unable to list source handles", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		page = authorizeSourceHandlePage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceCommentsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
		if sourceDocumentID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_document_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceComments(c.Context(), cfg.resolveScope(c), sourceDocumentID, services.SourceCommentListQuery{
			Status:     strings.TrimSpace(c.Query("status")),
			SyncStatus: strings.TrimSpace(c.Query("sync_status")),
			Page:       parsePageSize(c.Query("page")),
			PageSize:   parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_COMMENTS_NOT_FOUND", "LINEAGE_SOURCE_COMMENTS_UNAVAILABLE", "source comments not found", "unable to list source comments", map[string]any{
				"source_document_id": sourceDocumentID,
			})
		}
		page = authorizeSourceCommentPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRevisionRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
		if sourceRevisionID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_revision_id is required", nil)
		}
		detail, err := cfg.sourceReadModels.GetSourceRevisionDetail(c.Context(), cfg.resolveScope(c), sourceRevisionID)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_REVISION_NOT_FOUND", "LINEAGE_SOURCE_REVISION_UNAVAILABLE", "source revision detail not found", "unable to load source revision detail", map[string]any{
				"source_revision_id": sourceRevisionID,
			})
		}
		detail = authorizeSourceRevisionDetail(c, cfg, detail)
		return c.JSON(http.StatusOK, detail)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRevisionArtifactsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
		if sourceRevisionID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_revision_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceRevisionArtifacts(c.Context(), cfg.resolveScope(c), sourceRevisionID)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_ARTIFACTS_NOT_FOUND", "LINEAGE_SOURCE_ARTIFACTS_UNAVAILABLE", "source revision artifacts not found", "unable to list source revision artifacts", map[string]any{
				"source_revision_id": sourceRevisionID,
			})
		}
		page = authorizeSourceArtifactPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceRevisionCommentsRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
		if sourceRevisionID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "source_revision_id is required", nil)
		}
		page, err := cfg.sourceReadModels.ListSourceRevisionComments(c.Context(), cfg.resolveScope(c), sourceRevisionID, services.SourceCommentListQuery{
			Status:     strings.TrimSpace(c.Query("status")),
			SyncStatus: strings.TrimSpace(c.Query("sync_status")),
			Page:       parsePageSize(c.Query("page")),
			PageSize:   parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_COMMENTS_NOT_FOUND", "LINEAGE_SOURCE_COMMENTS_UNAVAILABLE", "source revision comments not found", "unable to list source revision comments", map[string]any{
				"source_revision_id": sourceRevisionID,
			})
		}
		page = authorizeSourceCommentPage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(sourceSearchRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		query := services.SourceSearchQuery{
			Query:             strings.TrimSpace(c.Query("q")),
			ProviderKind:      strings.TrimSpace(c.Query("provider_kind")),
			Status:            strings.TrimSpace(c.Query("status")),
			ResultKind:        strings.TrimSpace(c.Query("result_kind")),
			RelationshipState: strings.TrimSpace(c.Query("relationship_state")),
			CommentSyncStatus: strings.TrimSpace(c.Query("comment_sync_status")),
			RevisionHint:      strings.TrimSpace(c.Query("revision_hint")),
			Sort:              strings.TrimSpace(c.Query("sort")),
			Page:              parsePageSize(c.Query("page")),
			PageSize:          parsePageSize(c.Query("page_size")),
			HasComments:       parseOptionalBoolQuery(c.Query("has_comments")),
		}
		results, err := cfg.sourceReadModels.SearchSources(c.Context(), cfg.resolveScope(c), query)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_SOURCE_SEARCH_NOT_FOUND", "LINEAGE_SOURCE_SEARCH_UNAVAILABLE", "source search target not found", "unable to search sources", nil)
		}
		results = authorizeSourceSearchResults(c, cfg, results)
		return c.JSON(http.StatusOK, results)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(reconciliationQueueRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		page, err := cfg.sourceReadModels.ListReconciliationQueue(c.Context(), cfg.resolveScope(c), services.ReconciliationQueueQuery{
			ConfidenceBand:   strings.TrimSpace(c.Query("confidence_band")),
			RelationshipType: strings.TrimSpace(c.Query("relationship_type")),
			ProviderKind:     strings.TrimSpace(c.Query("provider_kind")),
			SourceStatus:     strings.TrimSpace(c.Query("source_status")),
			AgeBand:          strings.TrimSpace(c.Query("age_band")),
			Sort:             strings.TrimSpace(c.Query("sort")),
			Page:             parsePageSize(c.Query("page")),
			PageSize:         parsePageSize(c.Query("page_size")),
		})
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_RECONCILIATION_QUEUE_NOT_FOUND", "LINEAGE_RECONCILIATION_QUEUE_UNAVAILABLE", "reconciliation queue not found", "unable to list reconciliation queue", nil)
		}
		page = authorizeReconciliationQueuePage(c, cfg, page)
		return c.JSON(http.StatusOK, page)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(reconciliationCandidateRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		relationshipID := strings.TrimSpace(c.Param("relationship_id"))
		if relationshipID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "relationship_id is required", nil)
		}
		detail, err := cfg.sourceReadModels.GetReconciliationCandidate(c.Context(), cfg.resolveScope(c), relationshipID)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, "LINEAGE_RECONCILIATION_CANDIDATE_NOT_FOUND", "LINEAGE_RECONCILIATION_CANDIDATE_UNAVAILABLE", "reconciliation candidate not found", "unable to load reconciliation candidate", map[string]any{
				"relationship_id": relationshipID,
			})
		}
		detail = authorizeReconciliationCandidateDetail(c, cfg, detail)
		return c.JSON(http.StatusOK, detail)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Post(reconciliationCandidateReviewRoute, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReconciliation == nil || cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_RECONCILIATION_UNAVAILABLE", "lineage reconciliation is not configured", nil)
		}
		relationshipID := strings.TrimSpace(c.Param("relationship_id"))
		if relationshipID == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "relationship_id is required", nil)
		}
		var payload struct {
			Action          string `json:"action"`
			ConfirmBehavior string `json:"confirm_behavior"`
			Reason          string `json:"reason"`
		}
		if err := bindPayloadOrError(c, &payload, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), "invalid reconciliation review payload"); err != nil {
			return err
		}
		actorID := resolveAuthenticatedAdminUserID(c)
		if actorID == "" {
			return writeAPIError(c, nil, http.StatusForbidden, string(services.ErrorCodeScopeDenied), "authenticated admin actor is required for lineage review actions", nil)
		}
		if _, err := cfg.sourceReconciliation.ApplyReviewAction(c.Context(), cfg.resolveScope(c), services.SourceRelationshipReviewInput{
			RelationshipID:  relationshipID,
			Action:          strings.TrimSpace(payload.Action),
			ConfirmBehavior: strings.TrimSpace(payload.ConfirmBehavior),
			ActorID:         actorID,
			Reason:          strings.TrimSpace(payload.Reason),
		}); err != nil {
			status := http.StatusConflict
			if isNotFound(err) {
				status = http.StatusNotFound
			}
			return writeAPIError(c, err, status, "LINEAGE_RECONCILIATION_REVIEW_FAILED", "unable to apply reconciliation review action", map[string]any{
				"relationship_id": relationshipID,
			})
		}
		detail, err := cfg.sourceReadModels.GetReconciliationCandidate(c.Context(), cfg.resolveScope(c), relationshipID)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_RECONCILIATION_CANDIDATE_UNAVAILABLE", "unable to refresh reconciliation candidate detail", map[string]any{
				"relationship_id": relationshipID,
			})
		}
		detail = authorizeReconciliationCandidateDetail(c, cfg, detail)
		return c.JSON(http.StatusOK, map[string]any{
			"status":    "ok",
			"candidate": detail,
		})
	}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))
}

func writeSourceManagementReadModelError(c router.Context, err error, notFoundCode, unavailableCode, notFoundMessage, unavailableMessage string, metadata map[string]any) error {
	status := http.StatusUnprocessableEntity
	code := strings.TrimSpace(unavailableCode)
	message := strings.TrimSpace(unavailableMessage)
	if isNotFound(err) {
		status = http.StatusNotFound
		code = strings.TrimSpace(notFoundCode)
		message = strings.TrimSpace(notFoundMessage)
	}
	return writeAPIError(c, err, status, code, message, metadata)
}

func sourceManagementPermissionsForRequest(c router.Context, cfg registerConfig) services.SourceManagementPermissions {
	canView := adminPermissionGranted(c, cfg, cfg.permissions.AdminView)
	return services.SourceManagementPermissions{
		CanViewDiagnostics:   canView,
		CanOpenProviderLinks: canView,
		CanReviewCandidates:  adminPermissionGranted(c, cfg, cfg.permissions.AdminEdit),
		CanViewComments:      canView,
	}
}

func adminPermissionGranted(c router.Context, cfg registerConfig, permission string) bool {
	required := strings.TrimSpace(permission)
	return required == "" || cfg.authorizer == nil || authorizerAllows(c, cfg.authorizer, required)
}

func authorizeSourceListPage(c router.Context, cfg registerConfig, page services.SourceListPage) services.SourceListPage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i] = authorizeSourceListItem(page.Items[i], permissions)
	}
	return page
}

func authorizeSourceDetail(c router.Context, cfg registerConfig, detail services.SourceDetail) services.SourceDetail {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	detail.Permissions = permissions
	detail.Links = redactSourceManagementLinks(detail.Links, permissions)
	if detail.Provider != nil {
		detail.Provider = authorizeSourceProviderSummary(detail.Provider, permissions)
	}
	if detail.ActiveHandle != nil {
		handle := authorizeSourceHandleSummary(*detail.ActiveHandle, permissions)
		detail.ActiveHandle = &handle
	}
	return detail
}

func authorizeSourceWorkspace(c router.Context, cfg registerConfig, workspace services.SourceWorkspace) services.SourceWorkspace {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	workspace.Permissions = permissions
	workspace.Links = redactSourceManagementLinks(workspace.Links, permissions)
	if workspace.Provider != nil {
		workspace.Provider = authorizeSourceProviderSummary(workspace.Provider, permissions)
	}
	if workspace.ActiveHandle != nil {
		handle := authorizeSourceHandleSummary(*workspace.ActiveHandle, permissions)
		workspace.ActiveHandle = &handle
	}
	workspace.Agreements = authorizeSourceAgreementPage(c, cfg, workspace.Agreements)
	workspace.Artifacts = authorizeSourceWorkspaceArtifactPage(c, cfg, workspace.Artifacts)
	workspace.Comments = authorizeSourceCommentPage(c, cfg, workspace.Comments)
	workspace.Handles = authorizeSourceHandlePage(c, cfg, workspace.Handles)
	workspace.Timeline = authorizeSourceRevisionTimeline(c, cfg, workspace.Timeline)
	for i := range workspace.Panels {
		workspace.Panels[i].Links = redactSourceManagementLinks(workspace.Panels[i].Links, permissions)
	}
	workspace.Continuity.Links = redactSourceManagementLinks(workspace.Continuity.Links, permissions)
	return workspace
}

func authorizeSourceRevisionPage(c router.Context, cfg registerConfig, page services.SourceRevisionPage) services.SourceRevisionPage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i] = authorizeSourceRevisionListItem(page.Items[i], permissions)
	}
	return page
}

func authorizeSourceRelationshipPage(c router.Context, cfg registerConfig, page services.SourceRelationshipPage) services.SourceRelationshipPage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i] = authorizeSourceRelationshipSummary(page.Items[i], permissions)
	}
	return page
}

func authorizeSourceAgreementPage(c router.Context, cfg registerConfig, page services.SourceAgreementPage) services.SourceAgreementPage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i].Links = redactSourceManagementLinks(page.Items[i].Links, permissions)
	}
	return page
}

func authorizeSourceHandlePage(c router.Context, cfg registerConfig, page services.SourceHandlePage) services.SourceHandlePage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i] = authorizeSourceHandleSummary(page.Items[i], permissions)
	}
	return page
}

func authorizeSourceRevisionDetail(c router.Context, cfg registerConfig, detail services.SourceRevisionDetail) services.SourceRevisionDetail {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	detail.Permissions = permissions
	detail.Links = redactSourceManagementLinks(detail.Links, permissions)
	if detail.Provider != nil {
		detail.Provider = authorizeSourceProviderSummary(detail.Provider, permissions)
	}
	return detail
}

func authorizeSourceArtifactPage(c router.Context, cfg registerConfig, page services.SourceArtifactPage) services.SourceArtifactPage {
	page.Permissions = sourceManagementPermissionsForRequest(c, cfg)
	page.Links = redactSourceManagementLinks(page.Links, page.Permissions)
	return page
}

func authorizeSourceWorkspaceArtifactPage(c router.Context, cfg registerConfig, page services.SourceWorkspaceArtifactPage) services.SourceWorkspaceArtifactPage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i].Links = redactSourceManagementLinks(page.Items[i].Links, permissions)
		if page.Items[i].Provider != nil {
			page.Items[i].Provider = authorizeSourceProviderSummary(page.Items[i].Provider, permissions)
		}
	}
	return page
}

func authorizeSourceCommentPage(c router.Context, cfg registerConfig, page services.SourceCommentPage) services.SourceCommentPage {
	page.Permissions = sourceManagementPermissionsForRequest(c, cfg)
	page.Links = redactSourceManagementLinks(page.Links, page.Permissions)
	for i := range page.Items {
		page.Items[i].Links = redactSourceManagementLinks(page.Items[i].Links, page.Permissions)
	}
	return page
}

func authorizeSourceRevisionTimeline(c router.Context, cfg registerConfig, timeline services.SourceRevisionTimeline) services.SourceRevisionTimeline {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	timeline.Permissions = permissions
	timeline.Links = redactSourceManagementLinks(timeline.Links, permissions)
	for i := range timeline.Entries {
		timeline.Entries[i].Links = redactSourceManagementLinks(timeline.Entries[i].Links, permissions)
		if timeline.Entries[i].Handle != nil {
			handle := authorizeSourceHandleSummary(*timeline.Entries[i].Handle, permissions)
			timeline.Entries[i].Handle = &handle
		}
	}
	return timeline
}

func authorizeSourceSearchResults(c router.Context, cfg registerConfig, results services.SourceSearchResults) services.SourceSearchResults {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	results.Permissions = permissions
	results.Links = redactSourceManagementLinks(results.Links, permissions)
	for i := range results.Items {
		results.Items[i] = authorizeSourceSearchResultSummary(results.Items[i], permissions)
	}
	return results
}

func authorizeReconciliationQueuePage(c router.Context, cfg registerConfig, page services.ReconciliationQueuePage) services.ReconciliationQueuePage {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	page.Permissions = permissions
	page.Links = redactSourceManagementLinks(page.Links, permissions)
	for i := range page.Items {
		page.Items[i].Links = redactSourceManagementLinks(page.Items[i].Links, permissions)
		if page.Items[i].Candidate != nil {
			candidate := authorizeSourceRelationshipSummary(*page.Items[i].Candidate, permissions)
			page.Items[i].Candidate = &candidate
		}
		if page.Items[i].LeftSource != nil {
			left := authorizeReconciliationQueueSourceSummary(*page.Items[i].LeftSource, permissions)
			page.Items[i].LeftSource = &left
		}
		if page.Items[i].RightSource != nil {
			right := authorizeReconciliationQueueSourceSummary(*page.Items[i].RightSource, permissions)
			page.Items[i].RightSource = &right
		}
		if !permissions.CanReviewCandidates {
			page.Items[i].Actions = nil
		}
	}
	return page
}

func authorizeReconciliationCandidateDetail(c router.Context, cfg registerConfig, detail services.ReconciliationCandidateDetail) services.ReconciliationCandidateDetail {
	permissions := sourceManagementPermissionsForRequest(c, cfg)
	detail.Permissions = permissions
	detail.Links = redactSourceManagementLinks(detail.Links, permissions)
	if detail.Candidate != nil {
		candidate := authorizeSourceRelationshipSummary(*detail.Candidate, permissions)
		detail.Candidate = &candidate
	}
	if detail.LeftSource != nil {
		left := authorizeReconciliationQueueSourceSummary(*detail.LeftSource, permissions)
		detail.LeftSource = &left
	}
	if detail.RightSource != nil {
		right := authorizeReconciliationQueueSourceSummary(*detail.RightSource, permissions)
		detail.RightSource = &right
	}
	if !permissions.CanReviewCandidates {
		detail.Actions = nil
	}
	return detail
}

func authorizeReconciliationQueueSourceSummary(summary services.ReconciliationQueueSourceSummary, permissions services.SourceManagementPermissions) services.ReconciliationQueueSourceSummary {
	summary.Permissions = permissions
	summary.Links = redactSourceManagementLinks(summary.Links, permissions)
	if summary.Provider != nil {
		summary.Provider = authorizeSourceProviderSummary(summary.Provider, permissions)
	}
	if summary.ActiveHandle != nil {
		handle := authorizeSourceHandleSummary(*summary.ActiveHandle, permissions)
		summary.ActiveHandle = &handle
	}
	return summary
}

func authorizeSourceListItem(item services.SourceListItem, permissions services.SourceManagementPermissions) services.SourceListItem {
	item.Permissions = permissions
	item.Links = redactSourceManagementLinks(item.Links, permissions)
	if item.Provider != nil {
		item.Provider = authorizeSourceProviderSummary(item.Provider, permissions)
	}
	if item.ActiveHandle != nil {
		handle := authorizeSourceHandleSummary(*item.ActiveHandle, permissions)
		item.ActiveHandle = &handle
	}
	return item
}

func authorizeSourceRevisionListItem(item services.SourceRevisionListItem, permissions services.SourceManagementPermissions) services.SourceRevisionListItem {
	if item.Provider != nil {
		item.Provider = authorizeSourceProviderSummary(item.Provider, permissions)
	}
	item.Links = redactSourceManagementLinks(item.Links, permissions)
	return item
}

func authorizeSourceRelationshipSummary(item services.SourceRelationshipSummary, permissions services.SourceManagementPermissions) services.SourceRelationshipSummary {
	item.Links = redactSourceManagementLinks(item.Links, permissions)
	if !permissions.CanReviewCandidates {
		item.ReviewActionVisible = ""
	}
	return item
}

func authorizeSourceHandleSummary(item services.SourceHandleSummary, permissions services.SourceManagementPermissions) services.SourceHandleSummary {
	item.Links = redactSourceManagementLinks(item.Links, permissions)
	if !permissions.CanOpenProviderLinks {
		item.WebURL = ""
	}
	return item
}

func authorizeSourceSearchResultSummary(item services.SourceSearchResultSummary, permissions services.SourceManagementPermissions) services.SourceSearchResultSummary {
	item.Links = redactSourceManagementLinks(item.Links, permissions)
	if item.Provider != nil {
		item.Provider = authorizeSourceProviderSummary(item.Provider, permissions)
	}
	return item
}

func authorizeSourceProviderSummary(provider *services.SourceProviderSummary, permissions services.SourceManagementPermissions) *services.SourceProviderSummary {
	if provider == nil {
		return nil
	}
	copy := *provider
	if !permissions.CanOpenProviderLinks {
		copy.WebURL = ""
	}
	return &copy
}

func redactSourceManagementLinks(links services.SourceManagementLinks, permissions services.SourceManagementPermissions) services.SourceManagementLinks {
	if !permissions.CanOpenProviderLinks {
		links.Provider = ""
	}
	if !permissions.CanViewDiagnostics {
		links.Diagnostics = ""
	}
	if !permissions.CanViewComments {
		links.Comments = ""
	}
	return links
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

func parseOptionalBoolQuery(raw string) *bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return nil
	}
	return &parsed
}

func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") || coded.Code == http.StatusNotFound
	}
	return false
}
