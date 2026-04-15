package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type lineageRoutePaths struct {
	document                      string
	agreement                     string
	documentCandidates            string
	review                        string
	sources                       string
	source                        string
	sourceWorkspace               string
	sourceRevisions               string
	sourceRelationships           string
	sourceAgreements              string
	sourceHandles                 string
	sourceComments                string
	sourceRevision                string
	sourceRevisionArtifacts       string
	sourceRevisionComments        string
	sourceSearch                  string
	reconciliationQueue           string
	reconciliationCandidate       string
	reconciliationCandidateReview string
}

type lineageLookupFunc func(router.Context, context.Context, stores.Scope, string) (any, error)
type lineageAuthorizeFunc func(router.Context, registerConfig, any) any

type sourceReadModelRouteConfig struct {
	path               string
	paramName          string
	requiredMessage    string
	notFoundCode       string
	unavailableCode    string
	notFoundMessage    string
	unavailableMessage string
	lookup             lineageLookupFunc
	authorize          lineageAuthorizeFunc
}

func registerLineageRoutes(adminRoutes routeRegistrar, cfg registerConfig) {
	paths := lineageRoutePaths{
		document:            services.DefaultLineageDiagnosticsBasePath + "/" + documentsSegment + "/:document_id",
		agreement:           services.DefaultLineageDiagnosticsBasePath + "/" + agreementsSegment + "/:agreement_id",
		review:              services.DefaultLineageDiagnosticsBasePath + "/relationships/:relationship_id/review",
		sources:             services.DefaultSourceManagementBasePath + "/sources",
		sourceRevision:      services.DefaultSourceManagementBasePath + "/source-revisions/:source_revision_id",
		sourceSearch:        services.DefaultSourceManagementBasePath + "/source-search",
		reconciliationQueue: services.DefaultSourceManagementBasePath + "/reconciliation-queue",
	}
	paths.documentCandidates = paths.document + "/candidates"
	paths.source = paths.sources + "/:source_document_id"
	paths.sourceWorkspace = paths.source + "/workspace"
	paths.sourceRevisions = paths.source + "/revisions"
	paths.sourceRelationships = paths.source + "/relationships"
	paths.sourceAgreements = paths.source + "/agreements"
	paths.sourceHandles = paths.source + "/handles"
	paths.sourceComments = paths.source + "/comments"
	paths.sourceRevisionArtifacts = paths.sourceRevision + "/artifacts"
	paths.sourceRevisionComments = paths.sourceRevision + "/comments"
	paths.reconciliationCandidate = paths.reconciliationQueue + "/:relationship_id"
	paths.reconciliationCandidateReview = paths.reconciliationCandidate + "/review"

	registerLineageDiagnosticRoutes(adminRoutes, cfg, paths)
	registerSourceManagementRoutes(adminRoutes, cfg, paths)
	registerLineageReconciliationRoutes(adminRoutes, cfg, paths)
}

func lineageDiagnosticsHandler(
	cfg registerConfig,
	paramName, requiredMessage, unavailableMessage string,
	lookup lineageLookupFunc,
) func(router.Context) error {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.lineageDiagnostics == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", "lineage diagnostics are not configured", nil)
		}
		id := strings.TrimSpace(c.Param(paramName))
		if id == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), requiredMessage, nil)
		}
		diagnostics, err := lookup(c, c.Context(), cfg.resolveScope(c), id)
		if err != nil {
			return writeAPIError(c, err, http.StatusUnprocessableEntity, "LINEAGE_DIAGNOSTICS_UNAVAILABLE", unavailableMessage, map[string]any{
				paramName: id,
			})
		}
		return c.JSON(http.StatusOK, diagnostics)
	}
}

func sourceReadModelLookupHandler(
	cfg registerConfig,
	paramName, requiredMessage, notFoundCode, unavailableCode, notFoundMessage, unavailableMessage string,
	lookup lineageLookupFunc,
	authorize lineageAuthorizeFunc,
) func(router.Context) error {
	return func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		if cfg.sourceReadModels == nil {
			return writeAPIError(c, nil, http.StatusNotImplemented, "LINEAGE_READ_MODELS_UNAVAILABLE", "source read models are not configured", nil)
		}
		id := strings.TrimSpace(c.Param(paramName))
		if id == "" {
			return writeAPIError(c, nil, http.StatusBadRequest, string(services.ErrorCodeMissingRequiredFields), requiredMessage, nil)
		}
		record, err := lookup(c, c.Context(), cfg.resolveScope(c), id)
		if err != nil {
			return writeSourceManagementReadModelError(c, err, notFoundCode, unavailableCode, notFoundMessage, unavailableMessage, map[string]any{
				paramName: id,
			})
		}
		if authorize != nil {
			record = authorize(c, cfg, record)
		}
		return c.JSON(http.StatusOK, record)
	}
}

func registerSourceReadModelRoute(adminRoutes routeRegistrar, cfg registerConfig, routeCfg sourceReadModelRouteConfig) {
	adminRoutes.Get(routeCfg.path, sourceReadModelLookupHandler(
		cfg,
		routeCfg.paramName,
		routeCfg.requiredMessage,
		routeCfg.notFoundCode,
		routeCfg.unavailableCode,
		routeCfg.notFoundMessage,
		routeCfg.unavailableMessage,
		routeCfg.lookup,
		routeCfg.authorize,
	), requireAdminPermission(cfg, cfg.permissions.AdminView))
}

func registerSourceDocumentReadModelRoute(
	adminRoutes routeRegistrar,
	cfg registerConfig,
	path, notFoundCode, unavailableCode, notFoundMessage, unavailableMessage string,
	lookup lineageLookupFunc,
	authorize lineageAuthorizeFunc,
) {
	registerSourceReadModelRoute(adminRoutes, cfg, sourceReadModelRouteConfig{
		path:               path,
		paramName:          "source_document_id",
		requiredMessage:    "source_document_id is required",
		notFoundCode:       notFoundCode,
		unavailableCode:    unavailableCode,
		notFoundMessage:    notFoundMessage,
		unavailableMessage: unavailableMessage,
		lookup:             lookup,
		authorize:          authorize,
	})
}

func registerSourceRevisionReadModelRoute(
	adminRoutes routeRegistrar,
	cfg registerConfig,
	path, notFoundCode, unavailableCode, notFoundMessage, unavailableMessage string,
	lookup lineageLookupFunc,
	authorize lineageAuthorizeFunc,
) {
	registerSourceReadModelRoute(adminRoutes, cfg, sourceReadModelRouteConfig{
		path:               path,
		paramName:          "source_revision_id",
		requiredMessage:    "source_revision_id is required",
		notFoundCode:       notFoundCode,
		unavailableCode:    unavailableCode,
		notFoundMessage:    notFoundMessage,
		unavailableMessage: unavailableMessage,
		lookup:             lookup,
		authorize:          authorize,
	})
}

func sourceRelationshipPageLookup(cfg registerConfig) lineageLookupFunc {
	return func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
		return cfg.sourceReadModels.ListSourceRelationships(ctx, scope, id, services.SourceRelationshipListQuery{
			Status:           strings.TrimSpace(c.Query("status")),
			RelationshipType: strings.TrimSpace(c.Query("relationship_type")),
			Sort:             strings.TrimSpace(c.Query("sort")),
			Page:             parsePageSize(c.Query("page")),
			PageSize:         parsePageSize(c.Query("page_size")),
		})
	}
}

func sourceAgreementPageLookup(cfg registerConfig) lineageLookupFunc {
	return func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
		return cfg.sourceReadModels.ListSourceAgreements(ctx, scope, id, services.SourceAgreementListQuery{
			Status:           strings.TrimSpace(c.Query("status")),
			SourceRevisionID: strings.TrimSpace(c.Query("source_revision_id")),
			Sort:             strings.TrimSpace(c.Query("sort")),
			Page:             parsePageSize(c.Query("page")),
			PageSize:         parsePageSize(c.Query("page_size")),
		})
	}
}

func sourceCommentPageLookup(cfg registerConfig) lineageLookupFunc {
	return func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
		return cfg.sourceReadModels.ListSourceComments(ctx, scope, id, services.SourceCommentListQuery{
			Status:     strings.TrimSpace(c.Query("status")),
			SyncStatus: strings.TrimSpace(c.Query("sync_status")),
			Page:       parsePageSize(c.Query("page")),
			PageSize:   parsePageSize(c.Query("page_size")),
		})
	}
}

func sourceRevisionCommentPageLookup(cfg registerConfig) lineageLookupFunc {
	return func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
		return cfg.sourceReadModels.ListSourceRevisionComments(ctx, scope, id, services.SourceCommentListQuery{
			Status:     strings.TrimSpace(c.Query("status")),
			SyncStatus: strings.TrimSpace(c.Query("sync_status")),
			Page:       parsePageSize(c.Query("page")),
			PageSize:   parsePageSize(c.Query("page_size")),
		})
	}
}

func authorizeSourceRelationshipPageValue(c router.Context, cfg registerConfig, value any) any {
	return authorizeSourceRelationshipPage(c, cfg, value.(services.SourceRelationshipPage))
}

func authorizeSourceAgreementPageValue(c router.Context, cfg registerConfig, value any) any {
	return authorizeSourceAgreementPage(c, cfg, value.(services.SourceAgreementPage))
}

func authorizeSourceCommentPageValue(c router.Context, cfg registerConfig, value any) any {
	return authorizeSourceCommentPage(c, cfg, value.(services.SourceCommentPage))
}

func registerLineageDiagnosticRoutes(adminRoutes routeRegistrar, cfg registerConfig, paths lineageRoutePaths) {
	adminRoutes.Get(paths.document, lineageDiagnosticsHandler(
		cfg,
		"document_id",
		"document_id is required",
		"unable to resolve document lineage diagnostics",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.lineageDiagnostics.GetDocumentLineageDiagnostics(ctx, scope, id)
		},
	), requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(paths.agreement, lineageDiagnosticsHandler(
		cfg,
		"agreement_id",
		"agreement_id is required",
		"unable to resolve agreement lineage diagnostics",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.lineageDiagnostics.GetAgreementLineageDiagnostics(ctx, scope, id)
		},
	), requireAdminPermission(cfg, cfg.permissions.AdminView))

	adminRoutes.Get(paths.documentCandidates, func(c router.Context) error {
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

	adminRoutes.Post(paths.review, func(c router.Context) error {
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
		var payload services.ReconciliationReviewRequest
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
}

func registerSourceManagementRoutes(adminRoutes routeRegistrar, cfg registerConfig, paths lineageRoutePaths) {
	adminRoutes.Get(paths.sources, func(c router.Context) error {
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

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.source,
		"LINEAGE_SOURCE_NOT_FOUND",
		"LINEAGE_SOURCE_UNAVAILABLE",
		"source detail not found",
		"unable to load source detail",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.GetSourceDetail(ctx, scope, id)
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceDetail(c, cfg, value.(services.SourceDetail))
		},
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceWorkspace,
		"LINEAGE_SOURCE_NOT_FOUND",
		"LINEAGE_SOURCE_UNAVAILABLE",
		"source workspace not found",
		"unable to load source workspace",
		func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.GetSourceWorkspace(ctx, scope, id, services.SourceWorkspaceQuery{
				Panel:  strings.TrimSpace(c.Query("panel")),
				Anchor: strings.TrimSpace(c.Query("anchor")),
			})
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceWorkspace(c, cfg, value.(services.SourceWorkspace))
		},
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceRevisions,
		"LINEAGE_SOURCE_REVISIONS_NOT_FOUND",
		"LINEAGE_SOURCE_REVISIONS_UNAVAILABLE",
		"source revisions not found",
		"unable to list source revisions",
		func(c router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.ListSourceRevisions(ctx, scope, id, services.SourceRevisionListQuery{
				Sort:     strings.TrimSpace(c.Query("sort")),
				Page:     parsePageSize(c.Query("page")),
				PageSize: parsePageSize(c.Query("page_size")),
			})
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceRevisionPage(c, cfg, value.(services.SourceRevisionPage))
		},
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceRelationships,
		"LINEAGE_SOURCE_RELATIONSHIPS_NOT_FOUND",
		"LINEAGE_SOURCE_RELATIONSHIPS_UNAVAILABLE",
		"source relationships not found",
		"unable to list source relationships",
		sourceRelationshipPageLookup(cfg),
		authorizeSourceRelationshipPageValue,
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceAgreements,
		"LINEAGE_SOURCE_AGREEMENTS_NOT_FOUND",
		"LINEAGE_SOURCE_AGREEMENTS_UNAVAILABLE",
		"source agreements not found",
		"unable to list source agreements",
		sourceAgreementPageLookup(cfg),
		authorizeSourceAgreementPageValue,
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceHandles,
		"LINEAGE_SOURCE_HANDLES_NOT_FOUND",
		"LINEAGE_SOURCE_HANDLES_UNAVAILABLE",
		"source handles not found",
		"unable to list source handles",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.ListSourceHandles(ctx, scope, id)
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceHandlePage(c, cfg, value.(services.SourceHandlePage))
		},
	)

	registerSourceDocumentReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceComments,
		"LINEAGE_SOURCE_COMMENTS_NOT_FOUND",
		"LINEAGE_SOURCE_COMMENTS_UNAVAILABLE",
		"source comments not found",
		"unable to list source comments",
		sourceCommentPageLookup(cfg),
		authorizeSourceCommentPageValue,
	)

	registerSourceRevisionReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceRevision,
		"LINEAGE_SOURCE_REVISION_NOT_FOUND",
		"LINEAGE_SOURCE_REVISION_UNAVAILABLE",
		"source revision detail not found",
		"unable to load source revision detail",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.GetSourceRevisionDetail(ctx, scope, id)
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceRevisionDetail(c, cfg, value.(services.SourceRevisionDetail))
		},
	)

	registerSourceRevisionReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceRevisionArtifacts,
		"LINEAGE_SOURCE_ARTIFACTS_NOT_FOUND",
		"LINEAGE_SOURCE_ARTIFACTS_UNAVAILABLE",
		"source revision artifacts not found",
		"unable to list source revision artifacts",
		func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.ListSourceRevisionArtifacts(ctx, scope, id)
		},
		func(c router.Context, cfg registerConfig, value any) any {
			return authorizeSourceArtifactPage(c, cfg, value.(services.SourceArtifactPage))
		},
	)

	registerSourceRevisionReadModelRoute(
		adminRoutes,
		cfg,
		paths.sourceRevisionComments,
		"LINEAGE_SOURCE_COMMENTS_NOT_FOUND",
		"LINEAGE_SOURCE_COMMENTS_UNAVAILABLE",
		"source revision comments not found",
		"unable to list source revision comments",
		sourceRevisionCommentPageLookup(cfg),
		authorizeSourceCommentPageValue,
	)

	adminRoutes.Get(paths.sourceSearch, func(c router.Context) error {
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
}

func registerLineageReconciliationRoutes(adminRoutes routeRegistrar, cfg registerConfig, paths lineageRoutePaths) {
	adminRoutes.Get(paths.reconciliationQueue, func(c router.Context) error {
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

	registerSourceReadModelRoute(adminRoutes, cfg, sourceReadModelRouteConfig{
		path:               paths.reconciliationCandidate,
		paramName:          "relationship_id",
		requiredMessage:    "relationship_id is required",
		notFoundCode:       "LINEAGE_RECONCILIATION_CANDIDATE_NOT_FOUND",
		unavailableCode:    "LINEAGE_RECONCILIATION_CANDIDATE_UNAVAILABLE",
		notFoundMessage:    "reconciliation candidate not found",
		unavailableMessage: "unable to load reconciliation candidate",
		lookup: func(_ router.Context, ctx context.Context, scope stores.Scope, id string) (any, error) {
			return cfg.sourceReadModels.GetReconciliationCandidate(ctx, scope, id)
		},
		authorize: func(c router.Context, cfg registerConfig, value any) any {
			return authorizeReconciliationCandidateDetail(c, cfg, value.(services.ReconciliationCandidateDetail))
		},
	})

	adminRoutes.Post(paths.reconciliationCandidateReview, func(c router.Context) error {
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
		var payload services.ReconciliationReviewRequest
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
		return c.JSON(http.StatusOK, services.ReconciliationReviewResponse{
			Status:    "ok",
			Candidate: detail,
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
