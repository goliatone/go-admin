package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	neturl "net/url"
	"path"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const sourceManagementRuntimeTemplate = "resources/esign-source-management/runtime"

type eSignSourceManagementRuntimeLink struct {
	Label string `json:"label"`
	Href  string `json:"href"`
	Kind  string `json:"kind,omitempty"`
}

type eSignSourceManagementRuntimeHighlight struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type eSignSourceManagementPageModel struct {
	Surface     string                                  `json:"surface"`
	Title       string                                  `json:"title"`
	Summary     string                                  `json:"summary,omitempty"`
	ResourceID  string                                  `json:"resource_id,omitempty"`
	Scope       stores.Scope                            `json:"scope"`
	Highlights  []eSignSourceManagementRuntimeHighlight `json:"highlights,omitempty"`
	NavLinks    []eSignSourceManagementRuntimeLink      `json:"nav_links,omitempty"`
	ResultLinks []eSignSourceManagementRuntimeLink      `json:"result_links,omitempty"`
	Contract    any                                     `json:"contract,omitempty"`
}

func registerESignSourceManagementUIRoutes(
	r router.Router[*fiber.App],
	cfg coreadmin.Config,
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	esignModule *modules.ESignModule,
) error {
	if r == nil || adm == nil || esignModule == nil {
		return nil
	}
	sourceReadModels := esignModule.SourceReadModelService()
	if sourceReadModels == nil {
		return nil
	}

	basePath := strings.TrimSpace(adm.BasePath())
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.BasePath)
	}
	if basePath == "" {
		basePath = "/admin"
	}
	apiBasePath := strings.TrimSpace(adm.AdminAPIBasePath())
	apiESignBasePath := path.Join(apiBasePath, "esign")

	return quickstart.RegisterAdminPageRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.AdminPageSpec{
			Path:       eSignSourceBrowserPath(basePath),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Source Browser",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				page, err := sourceReadModels.ListSources(c.Context(), scope, sourceListQueryFromRequest(c))
				if err != nil {
					return nil, err
				}
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, "", "")
				model := buildSourceBrowserRuntimePageModel(scope, routes, page)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, quickstart.BreadcrumbSpec{
					RootLabel:    "Dashboard",
					RootHref:     normalizeESignBasePath(basePath),
					CurrentLabel: "Source Browser",
				})
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceBrowser,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface": "source_browser",
					},
				))
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       eSignSourceDetailPath(basePath, ":source_document_id"),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Source Detail",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
				if sourceDocumentID == "" {
					return nil, coreadmin.ErrNotFound
				}
				detail, err := sourceReadModels.GetSourceDetail(c.Context(), scope, sourceDocumentID)
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				latestRevisionID := ""
				if detail.LatestRevision != nil {
					latestRevisionID = strings.TrimSpace(detail.LatestRevision.ID)
				}
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, latestRevisionID)
				model := buildSourceDetailRuntimePageModel(scope, routes, detail)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, quickstart.BreadcrumbSpec{
					RootLabel: "Dashboard",
					RootHref:  normalizeESignBasePath(basePath),
					Trail: []quickstart.BreadcrumbItem{
						quickstart.Breadcrumb("Source Browser", routes["source_browser"]),
					},
					CurrentLabel: firstNonEmptyValue(sourceReferenceLabel(detail.Source), strings.TrimSpace(sourceDocumentID)),
				})
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceDetail,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface":            "source_detail",
						"source_document_id": sourceDocumentID,
						"source_revision_id": latestRevisionID,
					},
				))
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       eSignSourceRevisionPath(basePath, ":source_revision_id"),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Revision Inspector",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
				if sourceRevisionID == "" {
					return nil, coreadmin.ErrNotFound
				}
				detail, err := sourceReadModels.GetSourceRevisionDetail(c.Context(), scope, sourceRevisionID)
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				sourceDocumentID := sourceReferenceID(detail.Source)
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, sourceRevisionID)
				model := buildSourceRevisionRuntimePageModel(scope, routes, detail)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, buildSourceManagementBreadcrumbSpec(
					basePath,
					routes,
					sourceReferenceLabel(detail.Source),
					sourceDocumentID,
					revisionInspectorLabel(detail.Revision),
				))
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceRevision,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface":            "source_revision",
						"source_document_id": sourceDocumentID,
						"source_revision_id": sourceRevisionID,
					},
				))
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       eSignSourceCommentsPath(basePath, ":source_revision_id"),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Comment Inspector",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
				if sourceRevisionID == "" {
					return nil, coreadmin.ErrNotFound
				}
				page, err := sourceReadModels.ListSourceRevisionComments(c.Context(), scope, sourceRevisionID, sourceCommentListQueryFromRequest(c))
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				sourceDocumentID := sourceReferenceID(page.Source)
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, sourceRevisionID)
				model := buildSourceCommentInspectorRuntimePageModel(scope, routes, page)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, buildSourceManagementBreadcrumbSpec(
					basePath,
					routes,
					sourceReferenceLabel(page.Source),
					sourceDocumentID,
					"Comment Inspector",
				))
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceComments,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface":            "source_comments",
						"source_document_id": sourceDocumentID,
						"source_revision_id": sourceRevisionID,
					},
				))
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       eSignSourceArtifactsPath(basePath, ":source_revision_id"),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Artifact Inspector",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				sourceRevisionID := strings.TrimSpace(c.Param("source_revision_id"))
				if sourceRevisionID == "" {
					return nil, coreadmin.ErrNotFound
				}
				page, err := sourceReadModels.ListSourceRevisionArtifacts(c.Context(), scope, sourceRevisionID)
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				revisionDetail, err := sourceReadModels.GetSourceRevisionDetail(c.Context(), scope, sourceRevisionID)
				if err != nil && !isESignNotFound(err) {
					return nil, err
				}
				sourceDocumentID := sourceReferenceID(revisionDetail.Source)
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, sourceRevisionID)
				model := buildSourceArtifactInspectorRuntimePageModel(scope, routes, page)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, buildSourceManagementBreadcrumbSpec(
					basePath,
					routes,
					sourceReferenceLabel(revisionDetail.Source),
					sourceDocumentID,
					"Artifact Inspector",
				))
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceArtifacts,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface":            "source_artifacts",
						"source_document_id": sourceDocumentID,
						"source_revision_id": sourceRevisionID,
					},
				))
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       eSignSourceSearchPath(basePath),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Source Search",
			Active:     "esign_source_search",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				results, err := sourceReadModels.SearchSources(c.Context(), scope, sourceSearchQueryFromRequest(c))
				if err != nil {
					return nil, err
				}
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, "", "")
				model := buildSourceSearchRuntimePageModel(basePath, currentSourceManagementRuntimeQuery(c), scope, routes, results)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, quickstart.BreadcrumbSpec{
					RootLabel:    "Dashboard",
					RootHref:     normalizeESignBasePath(basePath),
					CurrentLabel: "Source Search",
				})
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceSearch,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface": "source_search",
						"query":   strings.TrimSpace(results.AppliedQuery.Query),
					},
				))
				return viewCtx, nil
			},
		},
	)
}

func withESignSourceManagementPageModel(ctx router.ViewContext, model eSignSourceManagementPageModel) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	encoded, err := json.Marshal(model)
	if err != nil {
		encoded = []byte("{}")
	}
	ctx["source_management_page_model"] = model
	ctx["source_management_page_model_json"] = string(encoded)
	ctx["source_management_surface"] = model.Surface
	ctx["source_management_page_title"] = model.Title
	ctx["source_management_page_summary"] = model.Summary
	ctx["source_management_highlights"] = model.Highlights
	ctx["source_management_nav_links"] = model.NavLinks
	ctx["source_management_result_links"] = model.ResultLinks
	ctx["source_management_resource_id"] = model.ResourceID
	return ctx
}

func buildSourceBrowserRuntimePageModel(scope stores.Scope, routes map[string]string, page services.SourceListPage) eSignSourceManagementPageModel {
	pendingCandidates := 0
	for _, item := range page.Items {
		pendingCandidates += item.PendingCandidateCount
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Source Search", routes["source_search"], "secondary"),
	}
	return eSignSourceManagementPageModel{
		Surface: "source_browser",
		Title:   "Source Browser",
		Summary: "Live canonical source browsing powered by the frozen source-management list contract.",
		Scope:   scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Visible Sources", strconvString(len(page.Items))),
			runtimeHighlight("Page", strconvString(page.PageInfo.Page)),
			runtimeHighlight("Sort", firstNonEmptyValue(page.PageInfo.Sort, "updated_desc")),
			runtimeHighlight("Pending Candidates", strconvString(pendingCandidates)),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: page,
	}
}

func buildSourceDetailRuntimePageModel(scope stores.Scope, routes map[string]string, detail services.SourceDetail) eSignSourceManagementPageModel {
	sourceID := sourceReferenceID(detail.Source)
	sourceLabel := firstNonEmptyValue(sourceReferenceLabel(detail.Source), sourceID, "Source Detail")
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Source Browser", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Source Search", routes["source_search"], "secondary"),
	}
	if detail.LatestRevision != nil {
		revisionID := strings.TrimSpace(detail.LatestRevision.ID)
		navLinks = append(navLinks,
			sourceManagementRuntimeLink("Latest Revision", replaceRuntimeRouteID(routes["source_revision"], revisionID), "primary"),
			sourceManagementRuntimeLink("Comment Inspector", replaceRuntimeRouteID(routes["source_comment_inspector"], revisionID), "secondary"),
			sourceManagementRuntimeLink("Artifact Inspector", replaceRuntimeRouteID(routes["source_artifact_inspector"], revisionID), "secondary"),
		)
	}
	if detail.Permissions.CanOpenProviderLinks {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Open Provider File", detail.Links.Provider, "external"))
	}
	if detail.Permissions.CanViewDiagnostics {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Diagnostics", detail.Links.Diagnostics, "external"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_detail",
		Title:      sourceLabel,
		Summary:    "Runtime source workspace shell bridged directly from the frozen source-detail contract.",
		ResourceID: sourceID,
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Status", firstNonEmptyValue(detail.Status, "-")),
			runtimeHighlight("Confidence", firstNonEmptyValue(detail.LineageConfidence, "-")),
			runtimeHighlight("Revisions", strconvString(detail.RevisionCount)),
			runtimeHighlight("Handles", strconvString(detail.HandleCount)),
			runtimeHighlight("Pending Candidates", strconvString(detail.PendingCandidateCount)),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: detail,
	}
}

func buildSourceRevisionRuntimePageModel(scope stores.Scope, routes map[string]string, detail services.SourceRevisionDetail) eSignSourceManagementPageModel {
	revisionID := ""
	if detail.Revision != nil {
		revisionID = strings.TrimSpace(detail.Revision.ID)
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Source Browser", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Source Search", routes["source_search"], "secondary"),
		sourceManagementRuntimeLink("Comment Inspector", routes["source_comment_inspector"], "primary"),
		sourceManagementRuntimeLink("Artifact Inspector", routes["source_artifact_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source Detail", routes["source_detail"], "secondary"))
	}
	if detail.Permissions.CanOpenProviderLinks {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Open Provider File", detail.Links.Provider, "external"))
	}
	if detail.Permissions.CanViewDiagnostics {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Diagnostics", detail.Links.Diagnostics, "external"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_revision",
		Title:      revisionInspectorLabel(detail.Revision),
		Summary:    "Runtime revision inspector shell bridged directly from the frozen source-revision contract.",
		ResourceID: revisionID,
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Revision ID", firstNonEmptyValue(revisionID, "-")),
			runtimeHighlight("Fingerprint Status", firstNonEmptyValue(detail.FingerprintStatus.Status, "-")),
			runtimeHighlight("Processing State", firstNonEmptyValue(detail.FingerprintProcessing.State, "-")),
			runtimeHighlight("Provider File", providerExternalFileID(detail.Provider)),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: detail,
	}
}

func buildSourceCommentInspectorRuntimePageModel(scope stores.Scope, routes map[string]string, page services.SourceCommentPage) eSignSourceManagementPageModel {
	totalMessages := 0
	for _, item := range page.Items {
		totalMessages += len(item.Messages)
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Source Browser", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Source Search", routes["source_search"], "secondary"),
		sourceManagementRuntimeLink("Revision Inspector", routes["source_revision"], "secondary"),
		sourceManagementRuntimeLink("Artifact Inspector", routes["source_artifact_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source Detail", routes["source_detail"], "primary"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_comments",
		Title:      "Comment Inspector",
		Summary:    "Revision-scoped comment visibility bridged directly from the frozen source-comment contract.",
		ResourceID: revisionSummaryID(page.Revision),
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Threads", strconvString(len(page.Items))),
			runtimeHighlight("Messages", strconvString(totalMessages)),
			runtimeHighlight("Sync Status", firstNonEmptyValue(page.SyncStatus, "-")),
			runtimeHighlight("Revision ID", firstNonEmptyValue(revisionSummaryID(page.Revision), "-")),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: page,
	}
}

func buildSourceArtifactInspectorRuntimePageModel(scope stores.Scope, routes map[string]string, page services.SourceArtifactPage) eSignSourceManagementPageModel {
	totalPages := 0
	for _, item := range page.Items {
		totalPages += item.PageCount
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Source Browser", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Source Search", routes["source_search"], "secondary"),
		sourceManagementRuntimeLink("Revision Inspector", routes["source_revision"], "primary"),
		sourceManagementRuntimeLink("Comment Inspector", routes["source_comment_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source Detail", routes["source_detail"], "secondary"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_artifacts",
		Title:      "Artifact Inspector",
		Summary:    "Revision-scoped artifact visibility bridged directly from the frozen source-artifact contract.",
		ResourceID: revisionSummaryID(page.Revision),
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Artifacts", strconvString(len(page.Items))),
			runtimeHighlight("Revision ID", firstNonEmptyValue(revisionSummaryID(page.Revision), "-")),
			runtimeHighlight("Page Total", strconvString(totalPages)),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: page,
	}
}

func buildSourceSearchRuntimePageModel(basePath, queryString string, scope stores.Scope, routes map[string]string, results services.SourceSearchResults) eSignSourceManagementPageModel {
	resultLinks := make([]eSignSourceManagementRuntimeLink, 0, len(results.Items))
	for _, item := range results.Items {
		link := sourceSearchResultRuntimeLink(basePath, queryString, item)
		if link.Href == "" {
			continue
		}
		resultLinks = append(resultLinks, link)
	}
	return eSignSourceManagementPageModel{
		Surface: "source_search",
		Title:   "Source Search",
		Summary: "Live source search shell powered by the frozen source-search contract.",
		Scope:   scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Query", firstNonEmptyValue(results.AppliedQuery.Query, "(empty)")),
			runtimeHighlight("Results", strconvString(len(results.Items))),
			runtimeHighlight("Result Kind", firstNonEmptyValue(results.AppliedQuery.ResultKind, "all")),
			runtimeHighlight("Page", strconvString(results.PageInfo.Page)),
		),
		NavLinks: compactRuntimeLinks(
			sourceManagementRuntimeLink("Source Browser", routes["source_browser"], "primary"),
			sourceManagementRuntimeLink("Refresh Search", routes["source_search"], "secondary"),
		),
		ResultLinks: resultLinks,
		Contract:    results,
	}
}

func buildSourceManagementBreadcrumbSpec(basePath string, routes map[string]string, sourceLabel, sourceDocumentID, currentLabel string) quickstart.BreadcrumbSpec {
	spec := quickstart.BreadcrumbSpec{
		RootLabel: "Dashboard",
		RootHref:  normalizeESignBasePath(basePath),
		Trail: []quickstart.BreadcrumbItem{
			quickstart.Breadcrumb("Source Browser", routes["source_browser"]),
		},
		CurrentLabel: currentLabel,
	}
	if strings.TrimSpace(sourceDocumentID) != "" && routes["source_detail"] != "" {
		spec.Trail = append(spec.Trail, quickstart.Breadcrumb(firstNonEmptyValue(strings.TrimSpace(sourceLabel), strings.TrimSpace(sourceDocumentID)), routes["source_detail"]))
	}
	return spec
}

func buildESignSourceManagementRuntimeRoutes(c router.Context, basePath, apiBasePath, sourceDocumentID, sourceRevisionID string) map[string]string {
	queryString := currentSourceManagementRuntimeQuery(c)
	uiBase := normalizeESignBasePath(basePath)
	apiESignBase := path.Join(normalizeAPIBasePath(apiBasePath), "esign")
	sourceDocumentRouteID := strings.TrimSpace(sourceDocumentID)
	if sourceDocumentRouteID == "" {
		sourceDocumentRouteID = ":source_document_id"
	}
	sourceRevisionRouteID := strings.TrimSpace(sourceRevisionID)
	if sourceRevisionRouteID == "" {
		sourceRevisionRouteID = ":source_revision_id"
	}
	routes := map[string]string{
		"source_browser":            appendQueryString(eSignSourceBrowserPath(uiBase), queryString),
		"source_search":             appendQueryString(eSignSourceSearchPath(uiBase), queryString),
		"source_detail":             appendQueryString(eSignSourceDetailPath(uiBase, sourceDocumentRouteID), queryString),
		"source_revision":           appendQueryString(eSignSourceRevisionPath(uiBase, sourceRevisionRouteID), queryString),
		"source_comment_inspector":  appendQueryString(eSignSourceCommentsPath(uiBase, sourceRevisionRouteID), queryString),
		"source_artifact_inspector": appendQueryString(eSignSourceArtifactsPath(uiBase, sourceRevisionRouteID), queryString),
		"api_base":                  apiESignBase,
		"api_sources":               path.Join(apiESignBase, "sources"),
		"api_source_search":         path.Join(apiESignBase, "source-search"),
	}
	if strings.TrimSpace(sourceDocumentID) != "" {
		routes["api_source_detail"] = path.Join(apiESignBase, "sources", strings.TrimSpace(sourceDocumentID))
	}
	if strings.TrimSpace(sourceRevisionID) != "" {
		routes["api_source_revision"] = path.Join(apiESignBase, "source-revisions", strings.TrimSpace(sourceRevisionID))
	}
	return routes
}

func eSignSourceBrowserPath(basePath string) string {
	return path.Join(normalizeESignBasePath(basePath), "esign", "sources")
}

func eSignSourceDetailPath(basePath, sourceDocumentID string) string {
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return ""
	}
	if strings.HasPrefix(sourceDocumentID, ":") {
		return path.Join(normalizeESignBasePath(basePath), "esign", "sources", sourceDocumentID)
	}
	return path.Join(normalizeESignBasePath(basePath), "esign", "sources", neturl.PathEscape(sourceDocumentID))
}

func eSignSourceRevisionPath(basePath, sourceRevisionID string) string {
	sourceRevisionID = strings.TrimSpace(sourceRevisionID)
	if sourceRevisionID == "" {
		return ""
	}
	if strings.HasPrefix(sourceRevisionID, ":") {
		return path.Join(normalizeESignBasePath(basePath), "esign", "source-revisions", sourceRevisionID)
	}
	return path.Join(normalizeESignBasePath(basePath), "esign", "source-revisions", neturl.PathEscape(sourceRevisionID))
}

func eSignSourceCommentsPath(basePath, sourceRevisionID string) string {
	revisionPath := eSignSourceRevisionPath(basePath, sourceRevisionID)
	if revisionPath == "" {
		return ""
	}
	return path.Join(revisionPath, "comments")
}

func eSignSourceArtifactsPath(basePath, sourceRevisionID string) string {
	revisionPath := eSignSourceRevisionPath(basePath, sourceRevisionID)
	if revisionPath == "" {
		return ""
	}
	return path.Join(revisionPath, "artifacts")
}

func eSignSourceSearchPath(basePath string) string {
	return path.Join(normalizeESignBasePath(basePath), "esign", "source-search")
}

func currentSourceManagementRuntimeQuery(c router.Context) string {
	if c == nil {
		return ""
	}
	values := neturl.Values{}
	for _, key := range []string{
		"tenant_id",
		"org_id",
		"user_id",
		"account_id",
		"q",
		"provider_kind",
		"status",
		"has_pending_candidates",
		"result_kind",
		"relationship_state",
		"comment_sync_status",
		"revision_hint",
		"sort",
		"page",
		"page_size",
		"has_comments",
		"sync_status",
	} {
		value := strings.TrimSpace(c.Query(key))
		if value != "" {
			values.Set(key, value)
		}
	}
	return values.Encode()
}

func appendQueryString(target, queryString string) string {
	target = strings.TrimSpace(target)
	queryString = strings.TrimSpace(queryString)
	if target == "" || queryString == "" {
		return target
	}
	if strings.Contains(target, "?") {
		return target + "&" + queryString
	}
	return target + "?" + queryString
}

func replaceRuntimeRouteID(target, id string) string {
	target = strings.TrimSpace(target)
	id = neturl.PathEscape(strings.TrimSpace(id))
	if target == "" || id == "" {
		return target
	}
	target = strings.ReplaceAll(target, neturl.PathEscape(":source_document_id"), id)
	target = strings.ReplaceAll(target, neturl.PathEscape(":source_revision_id"), id)
	target = strings.ReplaceAll(target, ":source_document_id", id)
	target = strings.ReplaceAll(target, ":source_revision_id", id)
	return target
}

func sourceListQueryFromRequest(c router.Context) services.SourceListQuery {
	return services.SourceListQuery{
		Query:                strings.TrimSpace(c.Query("q")),
		ProviderKind:         strings.TrimSpace(c.Query("provider_kind")),
		Status:               strings.TrimSpace(c.Query("status")),
		Sort:                 strings.TrimSpace(c.Query("sort")),
		Page:                 parsePositiveInt(c.Query("page")),
		PageSize:             parsePositiveInt(c.Query("page_size")),
		HasPendingCandidates: parseOptionalBoolQueryParam(c.Query("has_pending_candidates")),
	}
}

func sourceCommentListQueryFromRequest(c router.Context) services.SourceCommentListQuery {
	return services.SourceCommentListQuery{
		Status:     strings.TrimSpace(c.Query("status")),
		SyncStatus: strings.TrimSpace(c.Query("sync_status")),
		Page:       parsePositiveInt(c.Query("page")),
		PageSize:   parsePositiveInt(c.Query("page_size")),
	}
}

func sourceSearchQueryFromRequest(c router.Context) services.SourceSearchQuery {
	return services.SourceSearchQuery{
		Query:             strings.TrimSpace(c.Query("q")),
		ProviderKind:      strings.TrimSpace(c.Query("provider_kind")),
		Status:            strings.TrimSpace(c.Query("status")),
		ResultKind:        strings.TrimSpace(c.Query("result_kind")),
		RelationshipState: strings.TrimSpace(c.Query("relationship_state")),
		CommentSyncStatus: strings.TrimSpace(c.Query("comment_sync_status")),
		RevisionHint:      strings.TrimSpace(c.Query("revision_hint")),
		Sort:              strings.TrimSpace(c.Query("sort")),
		Page:              parsePositiveInt(c.Query("page")),
		PageSize:          parsePositiveInt(c.Query("page_size")),
		HasComments:       parseOptionalBoolQueryParam(c.Query("has_comments")),
	}
}

func sourceSearchResultRuntimeLink(basePath, queryString string, result services.SourceSearchResultSummary) eSignSourceManagementRuntimeLink {
	target := ""
	switch {
	case matchedFieldIncludes(result.MatchedFields, "comment"), result.HasComments:
		if result.Revision != nil && strings.TrimSpace(result.Revision.ID) != "" {
			target = eSignSourceCommentsPath(basePath, result.Revision.ID)
		}
	case matchedFieldIncludes(result.MatchedFields, "artifact"):
		if result.Revision != nil && strings.TrimSpace(result.Revision.ID) != "" {
			target = eSignSourceArtifactsPath(basePath, result.Revision.ID)
		}
	case result.Revision != nil && strings.TrimSpace(result.Revision.ID) != "":
		target = eSignSourceRevisionPath(basePath, result.Revision.ID)
	case result.Source != nil && strings.TrimSpace(result.Source.ID) != "":
		target = eSignSourceDetailPath(basePath, result.Source.ID)
	}
	return sourceManagementRuntimeLink(firstNonEmptyValue(result.Summary, sourceSearchResultLabel(result)), appendQueryString(target, queryString), "secondary")
}

func sourceSearchResultLabel(result services.SourceSearchResultSummary) string {
	if result.Source != nil && strings.TrimSpace(result.Source.Label) != "" {
		return strings.TrimSpace(result.Source.Label)
	}
	if result.Revision != nil && strings.TrimSpace(result.Revision.ID) != "" {
		return revisionInspectorLabel(result.Revision)
	}
	return "Open result"
}

func sourceManagementRuntimeLink(label, href, kind string) eSignSourceManagementRuntimeLink {
	return eSignSourceManagementRuntimeLink{
		Label: strings.TrimSpace(label),
		Href:  strings.TrimSpace(href),
		Kind:  strings.TrimSpace(kind),
	}
}

func compactRuntimeLinks(items ...eSignSourceManagementRuntimeLink) []eSignSourceManagementRuntimeLink {
	out := make([]eSignSourceManagementRuntimeLink, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.Label) == "" || strings.TrimSpace(item.Href) == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func runtimeHighlight(label, value string) eSignSourceManagementRuntimeHighlight {
	return eSignSourceManagementRuntimeHighlight{
		Label: strings.TrimSpace(label),
		Value: strings.TrimSpace(value),
	}
}

func compactRuntimeHighlights(items ...eSignSourceManagementRuntimeHighlight) []eSignSourceManagementRuntimeHighlight {
	out := make([]eSignSourceManagementRuntimeHighlight, 0, len(items))
	for _, item := range items {
		if item.Label == "" {
			continue
		}
		if item.Value == "" {
			item.Value = "-"
		}
		out = append(out, item)
	}
	return out
}

func sourceReferenceID(ref *services.LineageReference) string {
	if ref == nil {
		return ""
	}
	return strings.TrimSpace(ref.ID)
}

func sourceReferenceLabel(ref *services.LineageReference) string {
	if ref == nil {
		return ""
	}
	return firstNonEmptyValue(strings.TrimSpace(ref.Label), strings.TrimSpace(ref.ID))
}

func revisionSummaryID(summary *services.SourceRevisionSummary) string {
	if summary == nil {
		return ""
	}
	return strings.TrimSpace(summary.ID)
}

func revisionInspectorLabel(summary *services.SourceRevisionSummary) string {
	if summary == nil {
		return "Revision Inspector"
	}
	revisionHint := strings.TrimSpace(summary.ProviderRevisionHint)
	revisionID := strings.TrimSpace(summary.ID)
	if revisionHint != "" {
		return "Revision " + revisionHint
	}
	if revisionID != "" {
		return "Revision " + revisionID
	}
	return "Revision Inspector"
}

func providerExternalFileID(provider *services.SourceProviderSummary) string {
	if provider == nil {
		return "-"
	}
	return firstNonEmptyValue(strings.TrimSpace(provider.ExternalFileID), strings.TrimSpace(provider.Label), "-")
}

func matchedFieldIncludes(fields []string, needle string) bool {
	needle = strings.TrimSpace(strings.ToLower(needle))
	for _, field := range fields {
		if strings.Contains(strings.ToLower(strings.TrimSpace(field)), needle) {
			return true
		}
	}
	return false
}

func parsePositiveInt(raw string) int {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}

func parseOptionalBoolQueryParam(raw string) *bool {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case "true", "1", "yes":
		parsed := true
		return &parsed
	case "false", "0", "no":
		parsed := false
		return &parsed
	default:
		return nil
	}
}

func strconvString(value int) string {
	return fmt.Sprintf("%d", value)
}

func isESignNotFound(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, coreadmin.ErrNotFound) {
		return true
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") || coded.Code == http.StatusNotFound
	}
	return false
}
