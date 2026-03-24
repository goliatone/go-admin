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
	Surface          string                                  `json:"surface"`
	Title            string                                  `json:"title"`
	Summary          string                                  `json:"summary,omitempty"`
	ResourceID       string                                  `json:"resource_id,omitempty"`
	Scope            stores.Scope                            `json:"scope"`
	Highlights       []eSignSourceManagementRuntimeHighlight `json:"highlights,omitempty"`
	NavLinks         []eSignSourceManagementRuntimeLink      `json:"nav_links,omitempty"`
	QuickActionLinks []eSignSourceManagementRuntimeLink      `json:"quick_action_links,omitempty"`
	ResultLinks      []eSignSourceManagementRuntimeLink      `json:"result_links,omitempty"`
	Contract         any                                     `json:"contract,omitempty"`
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
					RootLabel:    "Home",
					RootHref:     normalizeESignBasePath(basePath),
					CurrentLabel: "Sources",
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
				workspace, err := sourceReadModels.GetSourceWorkspace(c.Context(), scope, sourceDocumentID, services.SourceWorkspaceQuery{
					Panel:  strings.TrimSpace(c.Query("panel")),
					Anchor: strings.TrimSpace(c.Query("anchor")),
				})
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				latestRevisionID := ""
				if workspace.LatestRevision != nil {
					latestRevisionID = strings.TrimSpace(workspace.LatestRevision.ID)
				}
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, latestRevisionID)
				model := buildSourceDetailAliasRuntimePageModel(scope, routes, workspace)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, quickstart.BreadcrumbSpec{
					RootLabel: "Home",
					RootHref:  normalizeESignBasePath(basePath),
					Trail: []quickstart.BreadcrumbItem{
						quickstart.Breadcrumb("Source Browser", routes["source_browser"]),
					},
					CurrentLabel: firstNonEmptyValue(sourceReferenceLabel(workspace.Source), strings.TrimSpace(sourceDocumentID)),
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
			Path:       eSignSourceWorkspacePath(basePath, ":source_document_id"),
			Template:   sourceManagementRuntimeTemplate,
			Title:      "Source Workspace",
			Active:     "esign_sources",
			Permission: permissions.AdminESignView,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				scope := resolveESignUploadScope(c, esignModule.DefaultScope())
				sourceDocumentID := strings.TrimSpace(c.Param("source_document_id"))
				if sourceDocumentID == "" {
					return nil, coreadmin.ErrNotFound
				}
				workspace, err := sourceReadModels.GetSourceWorkspace(c.Context(), scope, sourceDocumentID, services.SourceWorkspaceQuery{
					Panel:  strings.TrimSpace(c.Query("panel")),
					Anchor: strings.TrimSpace(c.Query("anchor")),
				})
				if err != nil {
					if isESignNotFound(err) {
						return nil, coreadmin.ErrNotFound
					}
					return nil, err
				}
				latestRevisionID := ""
				if workspace.LatestRevision != nil {
					latestRevisionID = strings.TrimSpace(workspace.LatestRevision.ID)
				}
				routes := buildESignSourceManagementRuntimeRoutes(c, basePath, apiBasePath, sourceDocumentID, latestRevisionID)
				model := buildSourceWorkspaceRuntimePageModel(scope, routes, workspace)
				viewCtx := router.ViewContext{
					"routes": routes,
				}
				viewCtx = quickstart.WithBreadcrumbSpec(viewCtx, buildSourceManagementBreadcrumbSpec(
					basePath,
					routes,
					sourceReferenceLabel(workspace.Source),
					sourceDocumentID,
					"Workspace",
				))
				viewCtx = withESignSourceManagementPageModel(viewCtx, model)
				viewCtx = withESignPageConfig(viewCtx, buildESignSourceManagementPageConfig(
					eSignPageSourceWorkspace,
					basePath,
					apiESignBasePath,
					routes,
					map[string]any{
						"surface":            "source_workspace",
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
					RootLabel:    "Home",
					RootHref:     normalizeESignBasePath(basePath),
					CurrentLabel: "Search",
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
	primaryNavLinks, overflowNavLinks := partitionRuntimeHeaderLinks(model.NavLinks, 2)
	ctx["source_management_primary_nav_links"] = primaryNavLinks
	ctx["source_management_overflow_nav_links"] = overflowNavLinks
	ctx["source_management_quick_action_links"] = model.QuickActionLinks
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
		sourceManagementRuntimeLink("Search", routes["source_search"], "secondary"),
	}
	return eSignSourceManagementPageModel{
		Surface: "source_browser",
		Title:   "Source Browser",
		Summary: "",
		Scope:   scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Total", strconvString(page.PageInfo.TotalCount)),
			runtimeHighlight("Pending Review", strconvString(pendingCandidates)),
		),
		NavLinks:         compactRuntimeLinks(navLinks...),
		QuickActionLinks: nonExternalRuntimeLinks(navLinks...),
		Contract:         page,
	}
}

func buildSourceDetailAliasRuntimePageModel(scope stores.Scope, routes map[string]string, workspace services.SourceWorkspace) eSignSourceManagementPageModel {
	sourceID := sourceReferenceID(workspace.Source)
	sourceLabel := firstNonEmptyValue(sourceReferenceLabel(workspace.Source), sourceID, "Source")
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("All Sources", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Search", routes["source_search"], "secondary"),
	}
	if workspace.LatestRevision != nil {
		revisionID := strings.TrimSpace(workspace.LatestRevision.ID)
		navLinks = append(navLinks,
			sourceManagementRuntimeLink("Latest Revision", replaceRuntimeRouteID(routes["source_revision"], revisionID), "primary"),
			sourceManagementRuntimeLink("Comments", replaceRuntimeRouteID(routes["source_comment_inspector"], revisionID), "secondary"),
			sourceManagementRuntimeLink("Artifacts", replaceRuntimeRouteID(routes["source_artifact_inspector"], revisionID), "secondary"),
		)
	}
	if workspace.Permissions.CanOpenProviderLinks {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Open in Provider", workspace.Links.Provider, "external"))
	}
	if workspace.Permissions.CanViewDiagnostics {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Diagnostics", workspace.Links.Diagnostics, "external"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_detail",
		Title:      sourceLabel,
		Summary:    "",
		ResourceID: sourceID,
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Status", firstNonEmptyValue(workspace.Status, "-")),
			runtimeHighlight("Confidence", firstNonEmptyValue(workspace.LineageConfidence, "-")),
			runtimeHighlight("Revisions", strconvString(workspace.RevisionCount)),
			runtimeHighlight("Pending Candidates", strconvString(workspace.PendingCandidateCount)),
		),
		NavLinks:         compactRuntimeLinks(navLinks...),
		QuickActionLinks: nonExternalRuntimeLinks(navLinks...),
		Contract:         workspace,
	}
}

func buildSourceWorkspaceRuntimePageModel(scope stores.Scope, routes map[string]string, workspace services.SourceWorkspace) eSignSourceManagementPageModel {
	sourceID := sourceReferenceID(workspace.Source)
	sourceLabel := firstNonEmptyValue(sourceReferenceLabel(workspace.Source), sourceID, "Source Workspace")
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("All Sources", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Search", routes["source_search"], "secondary"),
	}
	if workspace.LatestRevision != nil {
		revisionID := strings.TrimSpace(workspace.LatestRevision.ID)
		navLinks = append(navLinks,
			sourceManagementRuntimeLink("Latest Revision", replaceRuntimeRouteID(routes["source_revision"], revisionID), "secondary"),
			sourceManagementRuntimeLink("Comment Inspector", replaceRuntimeRouteID(routes["source_comment_inspector"], revisionID), "secondary"),
			sourceManagementRuntimeLink("Artifact Inspector", replaceRuntimeRouteID(routes["source_artifact_inspector"], revisionID), "secondary"),
		)
	}
	if workspace.Permissions.CanOpenProviderLinks {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Open in Provider", workspace.Links.Provider, "external"))
	}
	if workspace.Permissions.CanViewDiagnostics {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Diagnostics", workspace.Links.Diagnostics, "external"))
	}

	activePanel := firstNonEmptyValue(strings.TrimSpace(workspace.ActivePanel), services.SourceWorkspacePanelOverview)
	activeAnchor := firstNonEmptyValue(strings.TrimSpace(workspace.ActiveAnchor), "-")

	return eSignSourceManagementPageModel{
		Surface:    "source_workspace",
		Title:      sourceLabel,
		Summary:    "Canonical Workspace",
		ResourceID: sourceID,
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Status", firstNonEmptyValue(workspace.Status, "-")),
			runtimeHighlight("Confidence", firstNonEmptyValue(workspace.LineageConfidence, "-")),
			runtimeHighlight("Panel", activePanel),
			runtimeHighlight("Anchor", activeAnchor),
		),
		NavLinks: compactRuntimeLinks(navLinks...),
		Contract: workspace,
	}
}

func buildSourceRevisionRuntimePageModel(scope stores.Scope, routes map[string]string, detail services.SourceRevisionDetail) eSignSourceManagementPageModel {
	revisionID := ""
	if detail.Revision != nil {
		revisionID = strings.TrimSpace(detail.Revision.ID)
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("All Sources", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Comment Inspector", routes["source_comment_inspector"], "primary"),
		sourceManagementRuntimeLink("Artifact Inspector", routes["source_artifact_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source", routes["source_detail"], "secondary"))
	}
	if detail.Permissions.CanOpenProviderLinks {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Open in Provider", detail.Links.Provider, "external"))
	}
	if detail.Permissions.CanViewDiagnostics {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Diagnostics", detail.Links.Diagnostics, "external"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_revision",
		Title:      "Revision Inspector",
		Summary:    "",
		ResourceID: revisionID,
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Fingerprint", firstNonEmptyValue(detail.FingerprintStatus.Status, "-")),
			runtimeHighlight("Processing", firstNonEmptyValue(detail.FingerprintProcessing.State, "-")),
			runtimeHighlight("Provider", providerExternalFileID(detail.Provider)),
		),
		NavLinks:         compactRuntimeLinks(navLinks...),
		QuickActionLinks: nonExternalRuntimeLinks(navLinks...),
		Contract:         detail,
	}
}

func buildSourceCommentInspectorRuntimePageModel(scope stores.Scope, routes map[string]string, page services.SourceCommentPage) eSignSourceManagementPageModel {
	totalMessages := 0
	for _, item := range page.Items {
		totalMessages += len(item.Messages)
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("All Sources", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Revision Inspector", routes["source_revision"], "secondary"),
		sourceManagementRuntimeLink("Artifact Inspector", routes["source_artifact_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source", routes["source_detail"], "primary"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_comments",
		Title:      "Comment Inspector",
		Summary:    "",
		ResourceID: revisionSummaryID(page.Revision),
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Threads", strconvString(len(page.Items))),
			runtimeHighlight("Messages", strconvString(totalMessages)),
			runtimeHighlight("Sync Status", firstNonEmptyValue(page.SyncStatus, "-")),
		),
		NavLinks:         compactRuntimeLinks(navLinks...),
		QuickActionLinks: nonExternalRuntimeLinks(navLinks...),
		Contract:         page,
	}
}

func buildSourceArtifactInspectorRuntimePageModel(scope stores.Scope, routes map[string]string, page services.SourceArtifactPage) eSignSourceManagementPageModel {
	totalPages := 0
	for _, item := range page.Items {
		totalPages += item.PageCount
	}
	navLinks := []eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("All Sources", routes["source_browser"], "secondary"),
		sourceManagementRuntimeLink("Revision Inspector", routes["source_revision"], "primary"),
		sourceManagementRuntimeLink("Comment Inspector", routes["source_comment_inspector"], "secondary"),
	}
	if routes["source_detail"] != "" {
		navLinks = append(navLinks, sourceManagementRuntimeLink("Source", routes["source_detail"], "secondary"))
	}
	return eSignSourceManagementPageModel{
		Surface:    "source_artifacts",
		Title:      "Artifact Inspector",
		Summary:    "Artifacts",
		ResourceID: revisionSummaryID(page.Revision),
		Scope:      scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Files", strconvString(len(page.Items))),
			runtimeHighlight("Total Pages", strconvString(totalPages)),
		),
		NavLinks:         compactRuntimeLinks(navLinks...),
		QuickActionLinks: nonExternalRuntimeLinks(navLinks...),
		Contract:         page,
	}
}

func buildSourceSearchRuntimePageModel(basePath, queryString string, scope stores.Scope, routes map[string]string, results services.SourceSearchResults) eSignSourceManagementPageModel {
	resultLinks := make([]eSignSourceManagementRuntimeLink, 0, len(results.Items))
	for _, item := range results.Items {
		link := sourceSearchResultRuntimeLink(routes, queryString, item)
		if link.Href == "" {
			continue
		}
		resultLinks = append(resultLinks, link)
	}
	return eSignSourceManagementPageModel{
		Surface: "source_search",
		Title:   "Source Search",
		Summary: "Search Drill-Ins",
		Scope:   scope,
		Highlights: compactRuntimeHighlights(
			runtimeHighlight("Results", strconvString(len(results.Items))),
			runtimeHighlight("Total", strconvString(results.PageInfo.TotalCount)),
		),
		NavLinks: compactRuntimeLinks(
			sourceManagementRuntimeLink("Browse Sources", routes["source_browser"], "primary"),
		),
		QuickActionLinks: nonExternalRuntimeLinks(
			sourceManagementRuntimeLink("Browse Sources", routes["source_browser"], "primary"),
		),
		ResultLinks: resultLinks,
		Contract:    results,
	}
}

func buildSourceManagementBreadcrumbSpec(basePath string, routes map[string]string, sourceLabel, sourceDocumentID, currentLabel string) quickstart.BreadcrumbSpec {
	spec := quickstart.BreadcrumbSpec{
		RootLabel: "Home",
		RootHref:  normalizeESignBasePath(basePath),
		Trail: []quickstart.BreadcrumbItem{
			quickstart.Breadcrumb("Sources", routes["source_browser"]),
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
		"source_workspace":          appendQueryString(eSignSourceWorkspacePath(uiBase, sourceDocumentRouteID), queryString),
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

func eSignSourceWorkspacePath(basePath, sourceDocumentID string) string {
	sourcePath := eSignSourceDetailPath(basePath, sourceDocumentID)
	if sourcePath == "" {
		return ""
	}
	return path.Join(sourcePath, "workspace")
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

func sourceSearchResultRuntimeLink(routes map[string]string, queryString string, result services.SourceSearchResultSummary) eSignSourceManagementRuntimeLink {
	target := sourceManagementRuntimePathFromLinks(routes, queryString, result.DrillIn, result.Links)
	if target == "" {
		switch {
		case result.Revision != nil && strings.TrimSpace(result.Revision.ID) != "":
			target = mergeQueryString(routeWithRuntimeID(routes["source_revision"], result.Revision.ID), queryString)
		case result.Source != nil && strings.TrimSpace(result.Source.ID) != "":
			target = mergeQueryString(routeWithRuntimeID(routes["source_detail"], result.Source.ID), queryString)
		}
	}
	return sourceManagementRuntimeLink(firstNonEmptyValue(result.Summary, sourceSearchResultLabel(result)), target, "secondary")
}

func sourceManagementRuntimePathFromLinks(
	routes map[string]string,
	queryString string,
	drillIn *services.SourceWorkspaceDrillIn,
	links services.SourceManagementLinks,
) string {
	for _, candidate := range []string{
		sourceWorkspaceDrillInHref(drillIn),
		links.Anchor,
		links.Workspace,
		links.Comments,
		links.Artifacts,
		links.Source,
		links.Self,
	} {
		target := translateSourceManagementAPIPathToRuntimePath(strings.TrimSpace(candidate), routes)
		if target != "" {
			return mergeQueryString(target, queryString)
		}
	}
	return ""
}

func sourceWorkspaceDrillInHref(drillIn *services.SourceWorkspaceDrillIn) string {
	if drillIn == nil {
		return ""
	}
	return strings.TrimSpace(drillIn.Href)
}

func translateSourceManagementAPIPathToRuntimePath(target string, routes map[string]string) string {
	target = strings.TrimSpace(target)
	if target == "" {
		return ""
	}
	if !strings.HasPrefix(target, services.DefaultSourceManagementBasePath) {
		if runtimeHrefReachable(target, routes) {
			return target
		}
		return ""
	}

	parsed, err := neturl.Parse(target)
	if err != nil {
		return ""
	}
	pathname := strings.TrimSpace(parsed.Path)
	search := parsed.Query()
	trimmed := strings.TrimPrefix(pathname, services.DefaultSourceManagementBasePath)

	switch {
	case trimmed == "/sources":
		return routeWithQuery(routes["source_browser"], search)
	case trimmed == "/source-search":
		return routeWithQuery(routes["source_search"], search)
	case sourceWorkspaceTarget(trimmed):
		sourceDocumentID := sourceWorkspaceID(trimmed)
		if sourceDocumentID == "" {
			return ""
		}
		targetRoute := routes["source_workspace"]
		if strings.TrimSpace(targetRoute) == "" {
			targetRoute = routes["source_detail"]
		}
		return routeWithQuery(routeWithRuntimeID(targetRoute, sourceDocumentID), search)
	case sourceDetailTarget(trimmed):
		sourceDocumentID := sourceDetailID(trimmed)
		if sourceDocumentID == "" {
			return ""
		}
		return routeWithQuery(routeWithRuntimeID(routes["source_detail"], sourceDocumentID), search)
	case sourceRevisionCommentsTarget(trimmed):
		sourceRevisionID := sourceRevisionCommentsID(trimmed)
		if sourceRevisionID == "" {
			return ""
		}
		return routeWithQuery(routeWithRuntimeID(routes["source_comment_inspector"], sourceRevisionID), search)
	case sourceRevisionArtifactsTarget(trimmed):
		sourceRevisionID := sourceRevisionArtifactsID(trimmed)
		if sourceRevisionID == "" {
			return ""
		}
		return routeWithQuery(routeWithRuntimeID(routes["source_artifact_inspector"], sourceRevisionID), search)
	case sourceRevisionTarget(trimmed):
		sourceRevisionID := sourceRevisionIDFromPath(trimmed)
		if sourceRevisionID == "" {
			return ""
		}
		return routeWithQuery(routeWithRuntimeID(routes["source_revision"], sourceRevisionID), search)
	default:
		return ""
	}
}

func mergeQueryString(target, queryString string) string {
	target = strings.TrimSpace(target)
	queryString = strings.TrimSpace(queryString)
	if target == "" || queryString == "" {
		return target
	}
	parsed, err := neturl.Parse(target)
	if err != nil {
		return appendQueryString(target, queryString)
	}
	targetQuery := parsed.Query()
	extraQuery, err := neturl.ParseQuery(queryString)
	if err != nil {
		return appendQueryString(target, queryString)
	}
	for key, values := range extraQuery {
		if _, exists := targetQuery[key]; exists {
			continue
		}
		for _, value := range values {
			targetQuery.Add(key, value)
		}
	}
	parsed.RawQuery = targetQuery.Encode()
	return parsed.String()
}

func routeWithQuery(route string, query neturl.Values) string {
	route = strings.TrimSpace(route)
	if route == "" {
		return ""
	}
	if len(query) == 0 {
		return route
	}
	parsed, err := neturl.Parse(route)
	if err != nil {
		return route
	}
	routeQuery := parsed.Query()
	for key, values := range query {
		if _, exists := routeQuery[key]; exists {
			continue
		}
		for _, value := range values {
			routeQuery.Add(key, value)
		}
	}
	parsed.RawQuery = routeQuery.Encode()
	return parsed.String()
}

func routeWithRuntimeID(route, id string) string {
	return replaceRuntimeRouteID(route, id)
}

func runtimeHrefReachable(target string, routes map[string]string) bool {
	pathname := runtimePathname(target)
	if pathname == "" {
		return false
	}
	for _, key := range []string{
		"source_browser",
		"source_search",
		"source_detail",
		"source_workspace",
		"source_revision",
		"source_comment_inspector",
		"source_artifact_inspector",
	} {
		if runtimePathMatchesRoute(pathname, routes[key]) {
			return true
		}
	}
	return false
}

func runtimePathMatchesRoute(target, route string) bool {
	target = runtimePathname(target)
	route = runtimePathname(route)
	if target == "" || route == "" {
		return false
	}
	targetSegments := runtimeSegments(target)
	routeSegments := runtimeSegments(route)
	if len(targetSegments) != len(routeSegments) {
		return false
	}
	for i := range routeSegments {
		if strings.HasPrefix(routeSegments[i], ":") {
			if targetSegments[i] == "" {
				return false
			}
			continue
		}
		if targetSegments[i] != routeSegments[i] {
			return false
		}
	}
	return true
}

func runtimePathname(target string) string {
	target = strings.TrimSpace(target)
	if target == "" {
		return ""
	}
	parsed, err := neturl.Parse(target)
	if err == nil && strings.TrimSpace(parsed.Path) != "" {
		return strings.TrimSpace(parsed.Path)
	}
	if before, _, ok := strings.Cut(target, "?"); ok {
		return strings.TrimSpace(before)
	}
	return target
}

func runtimeSegments(target string) []string {
	target = strings.Trim(strings.TrimSpace(target), "/")
	if target == "" {
		return nil
	}
	return strings.Split(target, "/")
}

func sourceDetailTarget(pathname string) bool {
	segments := apiSegments(pathname)
	return len(segments) == 2 && segments[0] == "sources"
}

func sourceDetailID(pathname string) string {
	segments := apiSegments(pathname)
	if len(segments) == 2 && segments[0] == "sources" {
		return segments[1]
	}
	return ""
}

func sourceWorkspaceTarget(pathname string) bool {
	segments := apiSegments(pathname)
	return len(segments) == 3 && segments[0] == "sources" && segments[2] == "workspace"
}

func sourceWorkspaceID(pathname string) string {
	segments := apiSegments(pathname)
	if len(segments) == 3 && segments[0] == "sources" && segments[2] == "workspace" {
		return segments[1]
	}
	return ""
}

func sourceRevisionTarget(pathname string) bool {
	segments := apiSegments(pathname)
	return len(segments) == 2 && segments[0] == "source-revisions"
}

func sourceRevisionIDFromPath(pathname string) string {
	segments := apiSegments(pathname)
	if len(segments) == 2 && segments[0] == "source-revisions" {
		return segments[1]
	}
	return ""
}

func sourceRevisionCommentsTarget(pathname string) bool {
	segments := apiSegments(pathname)
	return len(segments) == 3 && segments[0] == "source-revisions" && segments[2] == "comments"
}

func sourceRevisionCommentsID(pathname string) string {
	segments := apiSegments(pathname)
	if len(segments) == 3 && segments[0] == "source-revisions" && segments[2] == "comments" {
		return segments[1]
	}
	return ""
}

func sourceRevisionArtifactsTarget(pathname string) bool {
	segments := apiSegments(pathname)
	return len(segments) == 3 && segments[0] == "source-revisions" && segments[2] == "artifacts"
}

func sourceRevisionArtifactsID(pathname string) string {
	segments := apiSegments(pathname)
	if len(segments) == 3 && segments[0] == "source-revisions" && segments[2] == "artifacts" {
		return segments[1]
	}
	return ""
}

func apiSegments(pathname string) []string {
	trimmed := strings.TrimPrefix(strings.TrimSpace(pathname), services.DefaultSourceManagementBasePath)
	return runtimeSegments(trimmed)
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

func nonExternalRuntimeLinks(items ...eSignSourceManagementRuntimeLink) []eSignSourceManagementRuntimeLink {
	out := make([]eSignSourceManagementRuntimeLink, 0, len(items))
	for _, item := range compactRuntimeLinks(items...) {
		if strings.EqualFold(strings.TrimSpace(item.Kind), "external") {
			continue
		}
		out = append(out, item)
	}
	return out
}

func partitionRuntimeHeaderLinks(items []eSignSourceManagementRuntimeLink, maxVisible int) ([]eSignSourceManagementRuntimeLink, []eSignSourceManagementRuntimeLink) {
	links := compactRuntimeLinks(items...)
	if len(links) == 0 {
		return nil, nil
	}
	if maxVisible <= 0 {
		return nil, links
	}

	visible := make([]eSignSourceManagementRuntimeLink, 0, minInt(maxVisible, len(links)))
	used := make([]bool, len(links))

	appendPass := func(match func(eSignSourceManagementRuntimeLink) bool) {
		if len(visible) >= maxVisible {
			return
		}
		for idx, link := range links {
			if used[idx] || !match(link) {
				continue
			}
			visible = append(visible, link)
			used[idx] = true
			if len(visible) >= maxVisible {
				return
			}
		}
	}

	appendPass(func(link eSignSourceManagementRuntimeLink) bool {
		return strings.EqualFold(strings.TrimSpace(link.Kind), "primary")
	})
	appendPass(func(link eSignSourceManagementRuntimeLink) bool {
		return !strings.EqualFold(strings.TrimSpace(link.Kind), "external")
	})
	appendPass(func(link eSignSourceManagementRuntimeLink) bool {
		return true
	})

	overflow := make([]eSignSourceManagementRuntimeLink, 0, len(links)-len(visible))
	for idx, link := range links {
		if used[idx] {
			continue
		}
		overflow = append(overflow, link)
	}
	if len(visible) == 1 && len(overflow) == 0 && !strings.EqualFold(strings.TrimSpace(visible[0].Kind), "external") {
		visible[0].Kind = "primary"
	}
	return visible, overflow
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
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
