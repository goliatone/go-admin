package services

import (
	"context"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultSourceManagementPageSize  = 25
	maxSourceManagementPageSize      = 100
	sourceListSortUpdatedDesc        = "updated_desc"
	sourceListSortTitleAsc           = "title_asc"
	sourceListSortTitleDesc          = "title_desc"
	sourceListSortPendingDesc        = "pending_candidates_desc"
	sourceRevisionSortLatestDesc     = "latest_desc"
	sourceRevisionSortOldestAsc      = "oldest_asc"
	sourceRelationshipSortConfidence = "confidence_desc"
	sourceRelationshipSortCreated    = "created_desc"
	sourceAgreementSortUpdatedDesc   = "updated_desc"
	sourceAgreementSortTitleAsc      = "title_asc"
	sourceSearchSortRelevance        = "relevance"
	sourceSearchSortTitleAsc         = "title_asc"
)

type sourceManagementContext struct {
	sourceDocument stores.SourceDocumentRecord
	activeHandle   stores.SourceHandleRecord
	handles        []stores.SourceHandleRecord
	revisions      []stores.SourceRevisionRecord
	latestRevision stores.SourceRevisionRecord
	relationships  []stores.SourceRelationshipRecord
	revisionUsage  map[string]sourceRevisionUsageSummary
}

type sourceRevisionUsageSummary struct {
	PinnedDocumentCount  int
	PinnedAgreementCount int
}

type sourceAgreementContext struct {
	agreement stores.AgreementRecord
	document  stores.DocumentRecord
	revision  stores.SourceRevisionRecord
}

func (s DefaultSourceReadModelService) ListSources(ctx context.Context, scope stores.Scope, query SourceListQuery) (SourceListPage, error) {
	normalized := normalizeSourceListQuery(query)
	page := emptySourceListPage(normalized)
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	records, err := s.lineage.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{
		ProviderKind: normalized.ProviderKind,
		Status:       normalized.Status,
	})
	if err != nil {
		return page, err
	}
	resolvedByID, err := s.resolveSourceManagementContexts(ctx, scope, records)
	if err != nil {
		return page, err
	}
	contexts := make([]sourceManagementContext, 0, len(records))
	for _, record := range records {
		resolved, ok := resolvedByID[strings.TrimSpace(record.ID)]
		if !ok {
			continue
		}
		if !matchesSourceListQuery(normalized, resolved) {
			continue
		}
		contexts = append(contexts, resolved)
	}
	sortSourceManagementContexts(contexts, normalized.Sort)
	paged, pageInfo := paginateSourceManagement(contexts, normalized.Page, normalized.PageSize, normalized.Sort)
	items := make([]SourceListItem, 0, len(paged))
	for _, resolved := range paged {
		items = append(items, s.buildSourceListItem(resolved))
	}
	page.Items = items
	page.PageInfo = pageInfo
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No sources", "No canonical source documents match the current filters.")
	return page, nil
}

func (s DefaultSourceReadModelService) GetSourceDetail(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceDetail, error) {
	if s.lineage == nil {
		return SourceDetail{}, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return SourceDetail{}, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return SourceDetail{}, err
	}
	return s.buildSourceDetail(resolved), nil
}

func (s DefaultSourceReadModelService) GetSourceWorkspace(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceWorkspaceQuery) (SourceWorkspace, error) {
	normalized := normalizeSourceWorkspaceQuery(query)
	if s.lineage == nil {
		return SourceWorkspace{}, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return SourceWorkspace{}, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return SourceWorkspace{}, err
	}
	agreements, err := s.ListSourceAgreements(ctx, scope, sourceDocumentID, SourceAgreementListQuery{
		Sort:     sourceAgreementSortUpdatedDesc,
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		return SourceWorkspace{}, err
	}
	artifacts, err := s.listSourceWorkspaceArtifacts(ctx, scope, resolved)
	if err != nil {
		return SourceWorkspace{}, err
	}
	comments, err := s.ListSourceComments(ctx, scope, sourceDocumentID, SourceCommentListQuery{Page: 1, PageSize: 10})
	if err != nil {
		return SourceWorkspace{}, err
	}
	handles, err := s.ListSourceHandles(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceWorkspace{}, err
	}
	timeline, err := s.buildSourceRevisionTimeline(ctx, scope, resolved)
	if err != nil {
		return SourceWorkspace{}, err
	}
	continuity, err := s.buildSourceContinuitySummary(ctx, scope, resolved)
	if err != nil {
		return SourceWorkspace{}, err
	}
	workspace := SourceWorkspace{
		Source:                sourceLineageReference(resolved.sourceDocument),
		Status:                strings.TrimSpace(resolved.sourceDocument.Status),
		LineageConfidence:     strings.TrimSpace(resolved.sourceDocument.LineageConfidence),
		Provider:              providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, resolved.activeHandle, resolved.latestRevision, stores.SourceArtifactRecord{}),
		ActiveHandle:          optionalSourceHandleSummary(resolved.activeHandle),
		LatestRevision:        sourceManagementRevisionSummary(resolved.latestRevision, resolved),
		RevisionCount:         len(resolved.revisions),
		HandleCount:           len(resolved.handles),
		RelationshipCount:     len(resolved.relationships),
		PendingCandidateCount: pendingRelationshipCount(resolved.relationships),
		ActivePanel:           normalized.Panel,
		ActiveAnchor:          normalized.Anchor,
		Continuity:            continuity,
		Timeline:              timeline,
		Agreements:            agreements,
		Artifacts:             artifacts,
		Comments:              comments,
		Handles:               handles,
		Permissions:           defaultSourceManagementPermissions(),
		Links:                 sourceWorkspaceLinksForDocument(resolved.sourceDocument.ID, normalized.Panel, normalized.Anchor),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	workspace.Panels = buildSourceWorkspacePanels(workspace)
	return workspace, nil
}

func (s DefaultSourceReadModelService) ListSourceRevisions(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceRevisionListQuery) (SourceRevisionPage, error) {
	normalized := normalizeSourceRevisionListQuery(query)
	page := emptySourceRevisionPage(normalized)
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return page, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return page, err
	}
	items := make([]SourceRevisionListItem, 0, len(resolved.revisions))
	for _, revision := range resolved.revisions {
		items = append(items, s.buildSourceRevisionListItem(ctx, scope, resolved, revision))
	}
	sortSourceRevisionItems(items, normalized.Sort)
	paged, pageInfo := paginateSourceManagement(items, normalized.Page, normalized.PageSize, normalized.Sort)
	page.Source = sourceLineageReference(resolved.sourceDocument)
	page.Items = paged
	page.PageInfo = pageInfo
	page.Links = sourceLinksForDocument(resolved.sourceDocument.ID)
	page.EmptyState = sourceCollectionEmptyState(len(page.Items) == 0, "No revisions", "This source does not yet have any tracked revisions.")
	return page, nil
}

func (s DefaultSourceReadModelService) ListSourceRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceRelationshipListQuery) (SourceRelationshipPage, error) {
	normalized := normalizeSourceRelationshipListQuery(query)
	page := emptySourceRelationshipPage(normalized)
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return page, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return page, err
	}
	relationships := filterSourceRelationships(resolved.relationships, normalized)
	sortSourceRelationshipRecords(relationships, normalized.Sort)
	paged, pageInfo := paginateSourceManagement(relationships, normalized.Page, normalized.PageSize, normalized.Sort)
	contextRecords, err := s.loadRelationshipContextRecords(ctx, scope, resolved.sourceDocument, paged)
	if err != nil {
		return page, err
	}
	resolvedByID, err := s.resolveSourceManagementContexts(ctx, scope, contextRecords)
	if err != nil {
		return page, err
	}
	items := make([]SourceRelationshipSummary, 0, len(paged))
	for _, relationship := range paged {
		summary, err := s.buildSourceRelationshipSummary(ctx, scope, resolved.sourceDocument, relationship, resolvedByID)
		if err != nil {
			return page, err
		}
		items = append(items, summary)
	}
	page.Source = sourceLineageReference(resolved.sourceDocument)
	page.Items = items
	page.PageInfo = pageInfo
	page.Links = sourceLinksForDocument(resolved.sourceDocument.ID)
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No relationships", "This source has no relationship records for the current filters.")
	return page, nil
}

func filterSourceRelationships(records []stores.SourceRelationshipRecord, query SourceRelationshipListQuery) []stores.SourceRelationshipRecord {
	relationships := make([]stores.SourceRelationshipRecord, 0, len(records))
	for _, relationship := range records {
		if query.Status != "" && !strings.EqualFold(strings.TrimSpace(relationship.Status), query.Status) {
			continue
		}
		if query.RelationshipType != "" && !strings.EqualFold(strings.TrimSpace(relationship.RelationshipType), query.RelationshipType) {
			continue
		}
		relationships = append(relationships, relationship)
	}
	return relationships
}

func (s DefaultSourceReadModelService) loadRelationshipContextRecords(
	ctx context.Context,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	relationships []stores.SourceRelationshipRecord,
) ([]stores.SourceDocumentRecord, error) {
	contextRecords := []stores.SourceDocumentRecord{sourceDocument}
	seenContextIDs := map[string]struct{}{strings.TrimSpace(sourceDocument.ID): {}}
	for _, relationship := range relationships {
		for _, candidateID := range []string{relationship.LeftSourceDocumentID, relationship.RightSourceDocumentID} {
			candidateID = strings.TrimSpace(candidateID)
			if candidateID == "" {
				continue
			}
			if _, ok := seenContextIDs[candidateID]; ok {
				continue
			}
			candidate, err := s.lineage.GetSourceDocument(ctx, scope, candidateID)
			if err != nil {
				return nil, err
			}
			contextRecords = append(contextRecords, candidate)
			seenContextIDs[candidateID] = struct{}{}
		}
	}
	return contextRecords, nil
}

func (s DefaultSourceReadModelService) ListSourceAgreements(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceAgreementListQuery) (SourceAgreementPage, error) {
	normalized := normalizeSourceAgreementListQuery(query)
	page := emptySourceAgreementPage(normalized)
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	if s.agreements == nil {
		return page, domainValidationError("lineage_read_models", "agreements", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return page, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return page, err
	}
	contexts, err := s.listSourceAgreementContexts(ctx, scope, resolved)
	if err != nil {
		return page, err
	}
	items := make([]SourceAgreementSummary, 0, len(contexts))
	for _, item := range contexts {
		if normalized.SourceRevisionID != "" && strings.TrimSpace(item.revision.ID) != normalized.SourceRevisionID {
			continue
		}
		if normalized.Status != "" && !strings.EqualFold(strings.TrimSpace(item.agreement.Status), normalized.Status) {
			continue
		}
		items = append(items, s.buildSourceAgreementSummary(resolved, item))
	}
	sortSourceAgreementSummaries(items, normalized.Sort)
	paged, pageInfo := paginateSourceManagement(items, normalized.Page, normalized.PageSize, normalized.Sort)
	page.Source = sourceLineageReference(resolved.sourceDocument)
	page.Items = paged
	page.PageInfo = pageInfo
	page.Links = sourceLinksForDocument(resolved.sourceDocument.ID)
	page.EmptyState = sourceCollectionEmptyState(len(page.Items) == 0, "No agreements", "No agreements are pinned to this source for the current filters.")
	return page, nil
}

func (s DefaultSourceReadModelService) ListSourceHandles(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceHandlePage, error) {
	page := emptySourceHandlePage()
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	record, err := s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
	if err != nil {
		return page, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, record)
	if err != nil {
		return page, err
	}
	items := make([]SourceHandleSummary, 0, len(resolved.handles))
	for _, handle := range resolved.handles {
		items = append(items, sourceHandleSummaryFromRecord(handle))
	}
	page.Source = sourceLineageReference(resolved.sourceDocument)
	page.Items = items
	page.PageInfo = fixedSourceManagementPageInfo(len(items), len(items), sourceListSortUpdatedDesc)
	page.Links = sourceLinksForDocument(resolved.sourceDocument.ID)
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No handles", "This source has no observed provider handles.")
	return page, nil
}

func (s DefaultSourceReadModelService) GetSourceRevisionDetail(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceRevisionDetail, error) {
	if s.lineage == nil {
		return SourceRevisionDetail{}, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	revision, err := s.lineage.GetSourceRevision(ctx, scope, strings.TrimSpace(sourceRevisionID))
	if err != nil {
		return SourceRevisionDetail{}, err
	}
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, revision.SourceDocumentID)
	if err != nil {
		return SourceRevisionDetail{}, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, sourceDocument)
	if err != nil {
		return SourceRevisionDetail{}, err
	}
	handle, err := s.handleForSourceRevision(ctx, scope, revision, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return SourceRevisionDetail{}, err
	}
	status, processing := s.fingerprintStateForRevision(ctx, scope, revision)
	return SourceRevisionDetail{
		Source:                sourceLineageReference(sourceDocument),
		Revision:              sourceManagementRevisionSummary(revision, resolved),
		Provider:              providerSummaryFromRevision(sourceDocument.ProviderKind, handle, revision, stores.SourceArtifactRecord{}),
		FingerprintStatus:     status,
		FingerprintProcessing: processing,
		Permissions:           defaultSourceManagementPermissions(),
		Links:                 sourceRevisionLinks(revision.ID, sourceDocument.ID),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}, nil
}

func (s DefaultSourceReadModelService) ListSourceRevisionArtifacts(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceArtifactPage, error) {
	page := emptySourceArtifactPage()
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	revision, err := s.lineage.GetSourceRevision(ctx, scope, strings.TrimSpace(sourceRevisionID))
	if err != nil {
		return page, err
	}
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, revision.SourceDocumentID)
	if err != nil {
		return page, err
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, sourceDocument)
	if err != nil {
		return page, err
	}
	artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: revision.ID,
	})
	if err != nil {
		return page, err
	}
	sort.SliceStable(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ID < artifacts[j].ID
		}
		return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
	})
	items := make([]SourceArtifactSummary, 0, len(artifacts))
	for _, artifact := range artifacts {
		if summary := sourceArtifactSummaryFromRecord(artifact); summary != nil {
			items = append(items, *summary)
		}
	}
	page.Revision = sourceManagementRevisionSummary(revision, resolved)
	page.Items = items
	page.PageInfo = fixedSourceManagementPageInfo(len(items), len(items), sourceRevisionSortLatestDesc)
	page.Links = sourceRevisionLinks(revision.ID, revision.SourceDocumentID)
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No artifacts", "This source revision has no derived artifacts.")
	return page, nil
}

func (s DefaultSourceReadModelService) ListSourceComments(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceCommentListQuery) (SourceCommentPage, error) {
	return s.buildSourceCommentPage(ctx, scope, sourceDocumentID, "", normalizeSourceCommentListQuery(query))
}

func (s DefaultSourceReadModelService) ListSourceRevisionComments(ctx context.Context, scope stores.Scope, sourceRevisionID string, query SourceCommentListQuery) (SourceCommentPage, error) {
	return s.buildSourceCommentPage(ctx, scope, "", sourceRevisionID, normalizeSourceCommentListQuery(query))
}

func (s DefaultSourceReadModelService) SearchSources(ctx context.Context, scope stores.Scope, query SourceSearchQuery) (SourceSearchResults, error) {
	normalized := normalizeSourceSearchQuery(query)
	if s.sourceSearch != nil {
		return s.sourceSearch.Search(ctx, scope, normalized)
	}
	results := emptySourceSearchResults(normalized)
	return results, domainValidationError("lineage_read_models", "source_search", "not configured")
}

type scoredSourceSearchResult struct {
	result SourceSearchResultSummary
	score  int
}

func (s DefaultSourceReadModelService) resolveSourceManagementContext(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord) (sourceManagementContext, error) {
	resolvedByID, err := s.resolveSourceManagementContexts(ctx, scope, []stores.SourceDocumentRecord{record})
	if err != nil {
		return sourceManagementContext{}, err
	}
	resolved, ok := resolvedByID[strings.TrimSpace(record.ID)]
	if !ok {
		return sourceManagementContext{}, debugLineageNotFound("source_documents", record.ID)
	}
	return resolved, nil
}

func (s DefaultSourceReadModelService) resolveSourceManagementContexts(ctx context.Context, scope stores.Scope, records []stores.SourceDocumentRecord) (map[string]sourceManagementContext, error) {
	resolvedByID := make(map[string]sourceManagementContext, len(records))
	sourceIDs := make([]string, 0, len(records))
	for _, record := range records {
		recordID := strings.TrimSpace(record.ID)
		if recordID == "" {
			continue
		}
		if _, ok := resolvedByID[recordID]; ok {
			continue
		}
		resolvedByID[recordID] = sourceManagementContext{sourceDocument: record}
		sourceIDs = append(sourceIDs, recordID)
	}
	if len(sourceIDs) == 0 {
		return resolvedByID, nil
	}

	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{SourceDocumentIDs: sourceIDs})
	if err != nil {
		return nil, err
	}
	for _, handle := range handles {
		recordID := strings.TrimSpace(handle.SourceDocumentID)
		resolved, ok := resolvedByID[recordID]
		if !ok {
			continue
		}
		resolved.handles = append(resolved.handles, handle)
		resolvedByID[recordID] = resolved
	}
	for recordID, resolved := range resolvedByID {
		sort.SliceStable(resolved.handles, func(i, j int) bool {
			if resolved.handles[i].CreatedAt.Equal(resolved.handles[j].CreatedAt) {
				return resolved.handles[i].ID < resolved.handles[j].ID
			}
			return resolved.handles[i].CreatedAt.After(resolved.handles[j].CreatedAt)
		})
		resolved.activeHandle = latestActiveSourceHandle(resolved.handles)
		resolvedByID[recordID] = resolved
	}

	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{SourceDocumentIDs: sourceIDs})
	if err != nil {
		return nil, err
	}
	allRevisions := make([]stores.SourceRevisionRecord, 0, len(revisions))
	for _, revision := range revisions {
		recordID := strings.TrimSpace(revision.SourceDocumentID)
		resolved, ok := resolvedByID[recordID]
		if !ok {
			continue
		}
		resolved.revisions = append(resolved.revisions, revision)
		resolvedByID[recordID] = resolved
		allRevisions = append(allRevisions, revision)
	}
	for recordID, resolved := range resolvedByID {
		sort.SliceStable(resolved.revisions, func(i, j int) bool {
			return sourceRevisionRank(resolved.revisions[i]).After(sourceRevisionRank(resolved.revisions[j]))
		})
		if len(resolved.revisions) > 0 {
			resolved.latestRevision = resolved.revisions[0]
		}
		resolvedByID[recordID] = resolved
	}

	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{SourceDocumentIDs: sourceIDs})
	if err != nil {
		return nil, err
	}
	for _, relationship := range relationships {
		leftID := strings.TrimSpace(relationship.LeftSourceDocumentID)
		rightID := strings.TrimSpace(relationship.RightSourceDocumentID)
		if resolved, ok := resolvedByID[leftID]; ok {
			resolved.relationships = append(resolved.relationships, relationship)
			resolvedByID[leftID] = resolved
		}
		if rightID != leftID {
			if resolved, ok := resolvedByID[rightID]; ok {
				resolved.relationships = append(resolved.relationships, relationship)
				resolvedByID[rightID] = resolved
			}
		}
	}

	revisionUsage, err := s.sourceRevisionUsageByRevision(ctx, scope, sourceIDs, allRevisions)
	if err != nil {
		return nil, err
	}
	for recordID, resolved := range resolvedByID {
		resolved.revisionUsage = make(map[string]sourceRevisionUsageSummary, len(resolved.revisions))
		for _, revision := range resolved.revisions {
			revisionID := strings.TrimSpace(revision.ID)
			if revisionID == "" {
				continue
			}
			resolved.revisionUsage[revisionID] = revisionUsage[revisionID]
		}
		resolvedByID[recordID] = resolved
	}
	return resolvedByID, nil
}

func (s DefaultSourceReadModelService) buildSourceListItem(resolved sourceManagementContext) SourceListItem {
	return SourceListItem{
		Source:                sourceLineageReference(resolved.sourceDocument),
		Status:                strings.TrimSpace(resolved.sourceDocument.Status),
		LineageConfidence:     strings.TrimSpace(resolved.sourceDocument.LineageConfidence),
		Provider:              providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, resolved.activeHandle, resolved.latestRevision, stores.SourceArtifactRecord{}),
		LatestRevision:        sourceManagementRevisionSummary(resolved.latestRevision, resolved),
		ActiveHandle:          optionalSourceHandleSummary(resolved.activeHandle),
		RevisionCount:         len(resolved.revisions),
		HandleCount:           len(resolved.handles),
		RelationshipCount:     len(resolved.relationships),
		PendingCandidateCount: pendingRelationshipCount(resolved.relationships),
		Permissions:           defaultSourceManagementPermissions(),
		Links:                 sourceLinksForDocument(resolved.sourceDocument.ID),
	}
}

func (s DefaultSourceReadModelService) buildSourceDetail(resolved sourceManagementContext) SourceDetail {
	return SourceDetail{
		Source:                sourceLineageReference(resolved.sourceDocument),
		Status:                strings.TrimSpace(resolved.sourceDocument.Status),
		LineageConfidence:     strings.TrimSpace(resolved.sourceDocument.LineageConfidence),
		Provider:              providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, resolved.activeHandle, resolved.latestRevision, stores.SourceArtifactRecord{}),
		ActiveHandle:          optionalSourceHandleSummary(resolved.activeHandle),
		LatestRevision:        sourceManagementRevisionSummary(resolved.latestRevision, resolved),
		RevisionCount:         len(resolved.revisions),
		HandleCount:           len(resolved.handles),
		RelationshipCount:     len(resolved.relationships),
		PendingCandidateCount: pendingRelationshipCount(resolved.relationships),
		Permissions:           defaultSourceManagementPermissions(),
		Links:                 sourceLinksForDocument(resolved.sourceDocument.ID),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
}

func (s DefaultSourceReadModelService) buildSourceAgreementSummary(resolved sourceManagementContext, item sourceAgreementContext) SourceAgreementSummary {
	agreementLabel := firstNonEmpty(strings.TrimSpace(item.agreement.Title), strings.TrimSpace(item.agreement.ID))
	summary := SourceAgreementSummary{
		Agreement: &LineageReference{
			ID:    strings.TrimSpace(item.agreement.ID),
			Label: agreementLabel,
			URL:   sourceManagementAgreementDetailPath(item.agreement.ID),
		},
		PinnedSourceRevision: sourceManagementRevisionSummary(item.revision, resolved),
		Status:               strings.TrimSpace(item.agreement.Status),
		WorkflowKind:         strings.TrimSpace(item.agreement.WorkflowKind),
		IsPinnedLatest:       strings.TrimSpace(item.revision.ID) == strings.TrimSpace(resolved.latestRevision.ID),
		Links: SourceManagementLinks{
			Self:       sourceManagementAgreementDetailPath(item.agreement.ID),
			Agreement:  sourceManagementAgreementDetailPath(item.agreement.ID),
			Workspace:  sourceManagementSourceWorkspacePath(resolved.sourceDocument.ID),
			Agreements: sourceManagementSourceAgreementsPath(resolved.sourceDocument.ID),
			Anchor:     sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelAgreements, "agreement:"+strings.TrimSpace(item.agreement.ID)),
		},
	}
	if strings.TrimSpace(item.document.ID) != "" {
		summary.Document = &LineageReference{
			ID:    strings.TrimSpace(item.document.ID),
			Label: firstNonEmpty(strings.TrimSpace(item.document.Title), strings.TrimSpace(item.document.ID)),
			URL:   sourceManagementDocumentDetailPath(item.document.ID),
		}
	}
	return summary
}

func (s DefaultSourceReadModelService) listSourceAgreementContexts(ctx context.Context, scope stores.Scope, resolved sourceManagementContext) ([]sourceAgreementContext, error) {
	agreements, err := s.agreements.ListAgreements(ctx, scope, stores.AgreementQuery{SortDesc: true})
	if err != nil {
		return nil, err
	}
	revisionByID := make(map[string]stores.SourceRevisionRecord, len(resolved.revisions))
	for _, revision := range resolved.revisions {
		revisionByID[strings.TrimSpace(revision.ID)] = revision
	}
	documentCache := map[string]stores.DocumentRecord{}
	out := make([]sourceAgreementContext, 0, len(agreements))
	for _, agreement := range agreements {
		revisionID := strings.TrimSpace(agreement.SourceRevisionID)
		if revisionID == "" {
			continue
		}
		revision, ok := revisionByID[revisionID]
		if !ok {
			continue
		}
		item := sourceAgreementContext{
			agreement: agreement,
			revision:  revision,
		}
		documentID := strings.TrimSpace(agreement.DocumentID)
		if documentID != "" && s.documents != nil {
			if cached, ok := documentCache[documentID]; ok {
				item.document = cached
			} else if record, err := s.documents.Get(ctx, scope, documentID); err == nil {
				documentCache[documentID] = record
				item.document = record
			} else if !isNotFound(err) {
				return nil, err
			}
		}
		out = append(out, item)
	}
	return out, nil
}

func (s DefaultSourceReadModelService) listSourceWorkspaceArtifacts(ctx context.Context, scope stores.Scope, resolved sourceManagementContext) (SourceWorkspaceArtifactPage, error) {
	page := SourceWorkspaceArtifactPage{
		Source:      sourceLineageReference(resolved.sourceDocument),
		Permissions: defaultSourceManagementPermissions(),
		Links:       sourceLinksForDocument(resolved.sourceDocument.ID),
	}
	items := make([]SourceWorkspaceArtifactSummary, 0)
	for _, revision := range resolved.revisions {
		artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{SourceRevisionID: revision.ID})
		if err != nil {
			return page, err
		}
		sort.SliceStable(artifacts, func(i, j int) bool {
			if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
				return artifacts[i].ID < artifacts[j].ID
			}
			return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
		})
		handle := sourceHandleForRevision(resolved.handles, revision)
		for _, artifact := range artifacts {
			summary := sourceArtifactSummaryFromRecord(artifact)
			if summary == nil {
				continue
			}
			items = append(items, SourceWorkspaceArtifactSummary{
				Artifact: summary,
				Revision: sourceManagementRevisionSummary(revision, resolved),
				Provider: providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, handle, revision, artifact),
				DrillIn: &SourceWorkspaceDrillIn{
					Panel:  SourceWorkspacePanelArtifacts,
					Anchor: "artifact:" + strings.TrimSpace(artifact.ID),
					Href:   sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelArtifacts, "artifact:"+strings.TrimSpace(artifact.ID)),
				},
				Links: SourceManagementLinks{
					Self:      sourceManagementRevisionArtifactsPath(revision.ID),
					Source:    sourceManagementSourcePath(resolved.sourceDocument.ID),
					Workspace: sourceManagementSourceWorkspacePath(resolved.sourceDocument.ID),
					Artifacts: sourceManagementRevisionArtifactsPath(revision.ID),
					Anchor:    sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelArtifacts, "artifact:"+strings.TrimSpace(artifact.ID)),
				},
			})
		}
	}
	sort.SliceStable(items, func(i, j int) bool {
		left := sourceRevisionSummarySortTime(items[i].Revision)
		right := sourceRevisionSummarySortTime(items[j].Revision)
		if left.Equal(right) {
			return firstNonEmpty(artifactSummaryID(items[i].Artifact), "") < firstNonEmpty(artifactSummaryID(items[j].Artifact), "")
		}
		return left.After(right)
	})
	page.Items = items
	page.PageInfo = fixedSourceManagementPageInfo(len(items), len(items), sourceRevisionSortLatestDesc)
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No artifacts", "This source has no derived artifacts across tracked revisions.")
	return page, nil
}

func (s DefaultSourceReadModelService) buildSourceRevisionTimeline(ctx context.Context, scope stores.Scope, resolved sourceManagementContext) (SourceRevisionTimeline, error) {
	timeline := SourceRevisionTimeline{
		Entries:     []SourceRevisionTimelineEntry{},
		Permissions: defaultSourceManagementPermissions(),
		Links:       sourceLinksForDocument(resolved.sourceDocument.ID),
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	commentThreads, err := s.lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{
		SourceDocumentID: resolved.sourceDocument.ID,
		IncludeDeleted:   true,
	})
	if err != nil {
		return timeline, err
	}
	commentCounts := map[string]int{}
	for _, thread := range commentThreads {
		commentCounts[strings.TrimSpace(thread.SourceRevisionID)]++
	}
	agreementContexts, err := s.listSourceAgreementContexts(ctx, scope, resolved)
	if err != nil {
		return timeline, err
	}
	agreementCounts := map[string]int{}
	for _, item := range agreementContexts {
		agreementCounts[strings.TrimSpace(item.revision.ID)]++
	}
	seenHandleIDs := map[string]int{}
	for idx, revision := range resolved.revisions {
		artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{SourceRevisionID: revision.ID})
		if err != nil {
			return timeline, err
		}
		sort.SliceStable(artifacts, func(i, j int) bool {
			if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
				return artifacts[i].ID < artifacts[j].ID
			}
			return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
		})
		handle := sourceHandleForRevision(resolved.handles, revision)
		handleID := strings.TrimSpace(handle.ID)
		repeatedHandle := false
		if handleID != "" {
			seenHandleIDs[handleID]++
			repeatedHandle = seenHandleIDs[handleID] > 1
		}
		continuity := sourceRevisionContinuitySummary(idx, resolved.revisions, handle, repeatedHandle)
		if idx > 0 && strings.TrimSpace(handle.ID) != strings.TrimSpace(sourceHandleForRevision(resolved.handles, resolved.revisions[idx-1]).ID) {
			timeline.HandleTransitionCount++
		}
		if repeatedHandle {
			timeline.RepeatedHandleCount++
		}
		entry := SourceRevisionTimelineEntry{
			Revision:          sourceManagementRevisionSummary(revision, resolved),
			Handle:            optionalSourceHandleSummary(handle),
			CommentCount:      commentCounts[strings.TrimSpace(revision.ID)],
			AgreementCount:    agreementCounts[strings.TrimSpace(revision.ID)],
			ArtifactCount:     len(artifacts),
			IsLatest:          idx == 0,
			IsRepeatedHandle:  repeatedHandle,
			ContinuitySummary: continuity,
			DrillIn: &SourceWorkspaceDrillIn{
				Panel:  SourceWorkspacePanelTimeline,
				Anchor: "revision:" + strings.TrimSpace(revision.ID),
				Href:   sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelTimeline, "revision:"+strings.TrimSpace(revision.ID)),
			},
			Links: SourceManagementLinks{
				Self:      sourceManagementRevisionPath(revision.ID),
				Source:    sourceManagementSourcePath(resolved.sourceDocument.ID),
				Workspace: sourceManagementSourceWorkspacePath(resolved.sourceDocument.ID),
				Timeline:  sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelTimeline, "revision:"+strings.TrimSpace(revision.ID)),
				Artifacts: sourceManagementRevisionArtifactsPath(revision.ID),
				Comments:  sourceManagementRevisionCommentsPath(revision.ID),
				Anchor:    sourceManagementWorkspaceAnchorPath(resolved.sourceDocument.ID, SourceWorkspacePanelTimeline, "revision:"+strings.TrimSpace(revision.ID)),
			},
		}
		if len(artifacts) > 0 {
			entry.PrimaryArtifact = sourceArtifactSummaryFromRecord(artifacts[0])
		}
		timeline.Entries = append(timeline.Entries, entry)
	}
	timeline.EmptyState = sourceCollectionEmptyState(len(timeline.Entries) == 0, "No revision history", "This source has no tracked revision continuity yet.")
	return timeline, nil
}

func (s DefaultSourceReadModelService) buildSourceContinuitySummary(ctx context.Context, scope stores.Scope, resolved sourceManagementContext) (SourceContinuitySummary, error) {
	summary := SourceContinuitySummary{
		Status: strings.TrimSpace(resolved.sourceDocument.Status),
		Links:  sourceLinksForDocument(resolved.sourceDocument.ID),
	}
	if len(resolved.relationships) == 0 {
		summary.Summary = sourceContinuityStatusSummary(resolved.sourceDocument.Status, nil)
		return summary, nil
	}
	predecessors := make([]LineageReference, 0, len(resolved.relationships))
	successors := make([]LineageReference, 0, len(resolved.relationships))
	for _, relationship := range resolved.relationships {
		if !strings.EqualFold(strings.TrimSpace(relationship.Status), stores.SourceRelationshipStatusConfirmed) {
			continue
		}
		predecessorID, successorID := sourceRelationshipDirectionalSummaryEndpoints(relationship)
		switch strings.TrimSpace(resolved.sourceDocument.ID) {
		case predecessorID:
			if successorID == "" {
				continue
			}
			record, err := s.lineage.GetSourceDocument(ctx, scope, successorID)
			if err != nil {
				return summary, err
			}
			ref := sourceLineageReference(record)
			if ref == nil {
				continue
			}
			successors = append(successors, *ref)
		case successorID:
			if predecessorID == "" {
				continue
			}
			record, err := s.lineage.GetSourceDocument(ctx, scope, predecessorID)
			if err != nil {
				return summary, err
			}
			ref := sourceLineageReference(record)
			if ref == nil {
				continue
			}
			predecessors = append(predecessors, *ref)
		}
	}
	summary.Predecessors = predecessors
	summary.Successors = successors
	if strings.EqualFold(strings.TrimSpace(resolved.sourceDocument.Status), stores.SourceDocumentStatusMerged) && len(successors) > 0 {
		continuation := successors[0]
		summary.Continuation = &continuation
	}
	summary.Summary = sourceContinuityStatusSummary(resolved.sourceDocument.Status, summary.Continuation)
	return summary, nil
}

func buildSourceWorkspacePanels(workspace SourceWorkspace) []SourceWorkspacePanelSummary {
	sourceID := sourceReferenceID(workspace.Source)
	return []SourceWorkspacePanelSummary{
		{ID: SourceWorkspacePanelOverview, Label: "Overview", Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelOverview, "")},
		{ID: SourceWorkspacePanelTimeline, Label: "Revision Timeline", ItemCount: len(workspace.Timeline.Entries), Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelTimeline, "")},
		{ID: SourceWorkspacePanelAgreements, Label: "Related Agreements", ItemCount: len(workspace.Agreements.Items), Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelAgreements, "")},
		{ID: SourceWorkspacePanelArtifacts, Label: "Related Artifacts", ItemCount: len(workspace.Artifacts.Items), Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelArtifacts, "")},
		{ID: SourceWorkspacePanelComments, Label: "Related Comments", ItemCount: len(workspace.Comments.Items), Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelComments, "")},
		{ID: SourceWorkspacePanelHandles, Label: "Active Handles", ItemCount: len(workspace.Handles.Items), Links: sourceWorkspaceLinksForDocument(sourceID, SourceWorkspacePanelHandles, "")},
	}
}

func (s DefaultSourceReadModelService) buildSourceRevisionListItem(ctx context.Context, scope stores.Scope, resolved sourceManagementContext, revision stores.SourceRevisionRecord) SourceRevisionListItem {
	handle, err := s.handleForSourceRevision(ctx, scope, revision, resolved.sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		handle = stores.SourceHandleRecord{}
	}
	artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: revision.ID,
	})
	if err != nil {
		artifacts = nil
	}
	sort.SliceStable(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ID < artifacts[j].ID
		}
		return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
	})
	primary := stores.SourceArtifactRecord{}
	if len(artifacts) > 0 {
		primary = artifacts[0]
	}
	status, processing := s.fingerprintStateForRevision(ctx, scope, revision)
	return SourceRevisionListItem{
		Revision:              sourceManagementRevisionSummary(revision, resolved),
		Provider:              providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, handle, revision, primary),
		PrimaryArtifact:       sourceArtifactSummaryFromRecord(primary),
		FingerprintStatus:     status,
		FingerprintProcessing: processing,
		IsLatest:              containsString(sourceRevisionHistoryLabels(revision, resolved), SourceRevisionHistoryLabelLatest),
		Links:                 sourceRevisionLinks(revision.ID, resolved.sourceDocument.ID),
	}
}

func (s DefaultSourceReadModelService) buildSourceRelationshipSummary(ctx context.Context, scope stores.Scope, sourceDocument stores.SourceDocumentRecord, relationship stores.SourceRelationshipRecord, resolvedByID map[string]sourceManagementContext) (SourceRelationshipSummary, error) {
	left, err := s.sourceDocumentForRelationship(ctx, scope, relationship.LeftSourceDocumentID, resolvedByID)
	if err != nil {
		return SourceRelationshipSummary{}, err
	}
	right, err := s.sourceDocumentForRelationship(ctx, scope, relationship.RightSourceDocumentID, resolvedByID)
	if err != nil {
		return SourceRelationshipSummary{}, err
	}
	currentResolved, err := s.sourceManagementContextForRecord(ctx, scope, sourceDocument, resolvedByID)
	if err != nil {
		return SourceRelationshipSummary{}, err
	}
	summary := candidateWarningSummaryFromRelationship(relationship)
	counterpart := right
	if strings.TrimSpace(sourceDocument.ID) == strings.TrimSpace(right.ID) {
		counterpart = left
	}
	relationshipKind := sourceRelationshipKind(relationship.RelationshipType)
	counterpartRole := sourceRelationshipCounterpartRole(currentResolved.sourceDocument.ID, counterpart.ID, relationship)
	return SourceRelationshipSummary{
		ID:                  summary.ID,
		RelationshipType:    summary.RelationshipType,
		RelationshipKind:    relationshipKind,
		Status:              summary.Status,
		CounterpartRole:     counterpartRole,
		ConfidenceBand:      summary.ConfidenceBand,
		ConfidenceScore:     summary.ConfidenceScore,
		Summary:             sourceRelationshipSummaryText(relationshipKind, counterpartRole, summary.Status),
		LeftSource:          sourceLineageReference(left),
		RightSource:         sourceLineageReference(right),
		CounterpartSource:   sourceLineageReference(counterpart),
		ReviewActionVisible: summary.ReviewActionVisible,
		Evidence:            append([]CandidateEvidenceSummary{}, summary.Evidence...),
		Links: SourceManagementLinks{
			Source: sourceManagementSourcePath(counterpart.ID),
			Self:   sourceManagementSourceRelationshipsPath(sourceDocument.ID),
		},
	}, nil
}

func (s DefaultSourceReadModelService) sourceDocumentForRelationship(ctx context.Context, scope stores.Scope, sourceDocumentID string, resolvedByID map[string]sourceManagementContext) (stores.SourceDocumentRecord, error) {
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return stores.SourceDocumentRecord{}, domainValidationError("lineage_read_models", "source_document_id", "required")
	}
	if resolved, ok := resolvedByID[sourceDocumentID]; ok {
		return resolved.sourceDocument, nil
	}
	return s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
}

func (s DefaultSourceReadModelService) sourceManagementContextForRecord(ctx context.Context, scope stores.Scope, record stores.SourceDocumentRecord, resolvedByID map[string]sourceManagementContext) (sourceManagementContext, error) {
	recordID := strings.TrimSpace(record.ID)
	if recordID != "" {
		if resolved, ok := resolvedByID[recordID]; ok {
			return resolved, nil
		}
	}
	return s.resolveSourceManagementContext(ctx, scope, record)
}

func normalizeSourceListQuery(query SourceListQuery) SourceListQuery {
	query.Query = strings.TrimSpace(query.Query)
	query.ProviderKind = strings.TrimSpace(query.ProviderKind)
	query.Status = strings.TrimSpace(query.Status)
	query.Sort = normalizeSourceSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeSourceRevisionListQuery(query SourceRevisionListQuery) SourceRevisionListQuery {
	query.Sort = normalizeSourceRevisionSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeSourceRelationshipListQuery(query SourceRelationshipListQuery) SourceRelationshipListQuery {
	query.Status = strings.TrimSpace(query.Status)
	query.RelationshipType = strings.TrimSpace(query.RelationshipType)
	query.Sort = normalizeSourceRelationshipSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeSourceAgreementListQuery(query SourceAgreementListQuery) SourceAgreementListQuery {
	query.Status = strings.TrimSpace(query.Status)
	query.SourceRevisionID = strings.TrimSpace(query.SourceRevisionID)
	query.Sort = normalizeSourceAgreementSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeSourceWorkspaceQuery(query SourceWorkspaceQuery) SourceWorkspaceQuery {
	query.Panel = normalizeSourceWorkspacePanel(query.Panel)
	query.Anchor = strings.TrimSpace(query.Anchor)
	return query
}

func normalizeSourceSearchQuery(query SourceSearchQuery) SourceSearchQuery {
	query.Query = strings.TrimSpace(query.Query)
	query.ProviderKind = strings.TrimSpace(query.ProviderKind)
	query.Status = strings.TrimSpace(query.Status)
	query.ResultKind = strings.TrimSpace(query.ResultKind)
	query.RelationshipState = strings.TrimSpace(query.RelationshipState)
	query.CommentSyncStatus = strings.TrimSpace(query.CommentSyncStatus)
	query.RevisionHint = strings.TrimSpace(query.RevisionHint)
	query.Sort = normalizeSourceSearchSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeSourceManagementPage(page, pageSize int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = defaultSourceManagementPageSize
	}
	if pageSize > maxSourceManagementPageSize {
		pageSize = maxSourceManagementPageSize
	}
	return page, pageSize
}

func normalizeSourceSort(value string) string {
	switch strings.TrimSpace(value) {
	case sourceListSortTitleAsc, sourceListSortTitleDesc, sourceListSortPendingDesc:
		return strings.TrimSpace(value)
	default:
		return sourceListSortUpdatedDesc
	}
}

func normalizeSourceRevisionSort(value string) string {
	switch strings.TrimSpace(value) {
	case sourceRevisionSortOldestAsc:
		return sourceRevisionSortOldestAsc
	default:
		return sourceRevisionSortLatestDesc
	}
}

func normalizeSourceRelationshipSort(value string) string {
	switch strings.TrimSpace(value) {
	case sourceRelationshipSortCreated:
		return sourceRelationshipSortCreated
	default:
		return sourceRelationshipSortConfidence
	}
}

func normalizeSourceAgreementSort(value string) string {
	switch strings.TrimSpace(value) {
	case sourceAgreementSortTitleAsc:
		return sourceAgreementSortTitleAsc
	default:
		return sourceAgreementSortUpdatedDesc
	}
}

func normalizeSourceWorkspacePanel(value string) string {
	switch strings.TrimSpace(value) {
	case SourceWorkspacePanelTimeline:
		return SourceWorkspacePanelTimeline
	case SourceWorkspacePanelAgreements:
		return SourceWorkspacePanelAgreements
	case SourceWorkspacePanelArtifacts:
		return SourceWorkspacePanelArtifacts
	case SourceWorkspacePanelComments:
		return SourceWorkspacePanelComments
	case SourceWorkspacePanelHandles:
		return SourceWorkspacePanelHandles
	default:
		return SourceWorkspacePanelOverview
	}
}

func normalizeSourceSearchSort(value string) string {
	switch strings.TrimSpace(value) {
	case sourceSearchSortTitleAsc:
		return sourceSearchSortTitleAsc
	default:
		return sourceSearchSortRelevance
	}
}

func matchesSourceListQuery(query SourceListQuery, resolved sourceManagementContext) bool {
	if query.HasPendingCandidates != nil {
		hasPending := pendingRelationshipCount(resolved.relationships) > 0
		if hasPending != *query.HasPendingCandidates {
			return false
		}
	}
	search := strings.ToLower(strings.TrimSpace(query.Query))
	if search == "" {
		return true
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(resolved.sourceDocument.CanonicalTitle)), search) {
		return true
	}
	for _, handle := range resolved.handles {
		if strings.Contains(strings.ToLower(strings.TrimSpace(handle.ExternalFileID)), search) ||
			strings.Contains(strings.ToLower(strings.TrimSpace(handle.AccountID)), search) {
			return true
		}
	}
	for _, revision := range resolved.revisions {
		if strings.Contains(strings.ToLower(strings.TrimSpace(revision.ProviderRevisionHint)), search) {
			return true
		}
	}
	return false
}

func sortSourceManagementContexts(items []sourceManagementContext, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		switch sortKey {
		case sourceListSortTitleAsc:
			return strings.ToLower(items[i].sourceDocument.CanonicalTitle) < strings.ToLower(items[j].sourceDocument.CanonicalTitle)
		case sourceListSortTitleDesc:
			return strings.ToLower(items[i].sourceDocument.CanonicalTitle) > strings.ToLower(items[j].sourceDocument.CanonicalTitle)
		case sourceListSortPendingDesc:
			leftPending := pendingRelationshipCount(items[i].relationships)
			rightPending := pendingRelationshipCount(items[j].relationships)
			if leftPending == rightPending {
				return strings.ToLower(items[i].sourceDocument.CanonicalTitle) < strings.ToLower(items[j].sourceDocument.CanonicalTitle)
			}
			return leftPending > rightPending
		default:
			leftTime := sourceManagementContextSortTime(items[i])
			rightTime := sourceManagementContextSortTime(items[j])
			if leftTime.Equal(rightTime) {
				return strings.ToLower(items[i].sourceDocument.CanonicalTitle) < strings.ToLower(items[j].sourceDocument.CanonicalTitle)
			}
			return leftTime.After(rightTime)
		}
	})
}

func sortSourceRevisionItems(items []SourceRevisionListItem, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		left := sourceRevisionSortTime(items[i].Revision)
		right := sourceRevisionSortTime(items[j].Revision)
		if sortKey == sourceRevisionSortOldestAsc {
			if left.Equal(right) {
				return sourceRevisionID(items[i].Revision) < sourceRevisionID(items[j].Revision)
			}
			return left.Before(right)
		}
		if left.Equal(right) {
			return sourceRevisionID(items[i].Revision) < sourceRevisionID(items[j].Revision)
		}
		return left.After(right)
	})
}

func sortSourceRelationshipRecords(items []stores.SourceRelationshipRecord, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		if sortKey == sourceRelationshipSortCreated {
			if items[i].CreatedAt.Equal(items[j].CreatedAt) {
				return items[i].ID < items[j].ID
			}
			return items[i].CreatedAt.After(items[j].CreatedAt)
		}
		if items[i].ConfidenceScore == items[j].ConfidenceScore {
			return items[i].ID < items[j].ID
		}
		return items[i].ConfidenceScore > items[j].ConfidenceScore
	})
}

func sortSourceAgreementSummaries(items []SourceAgreementSummary, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		if sortKey == sourceAgreementSortTitleAsc {
			return strings.ToLower(sourceAgreementLabel(items[i])) < strings.ToLower(sourceAgreementLabel(items[j]))
		}
		left := sourceRevisionSummarySortTime(items[i].PinnedSourceRevision)
		right := sourceRevisionSummarySortTime(items[j].PinnedSourceRevision)
		if left.Equal(right) {
			return strings.ToLower(sourceAgreementLabel(items[i])) < strings.ToLower(sourceAgreementLabel(items[j]))
		}
		return left.After(right)
	})
}

func preferSourceSearchResult(left, right SourceSearchResultSummary) bool {
	leftTitle := searchResultTitle(left)
	rightTitle := searchResultTitle(right)
	if leftTitle != rightTitle {
		return leftTitle < rightTitle
	}
	leftRank := sourceSearchSpecificityRank(left.ResultKind)
	rightRank := sourceSearchSpecificityRank(right.ResultKind)
	if leftRank != rightRank {
		return leftRank < rightRank
	}
	leftRevisionID := ""
	if left.Revision != nil {
		leftRevisionID = strings.TrimSpace(left.Revision.ID)
	}
	rightRevisionID := ""
	if right.Revision != nil {
		rightRevisionID = strings.TrimSpace(right.Revision.ID)
	}
	if leftRevisionID != rightRevisionID {
		return leftRevisionID < rightRevisionID
	}
	leftSourceID := ""
	if left.Source != nil {
		leftSourceID = strings.TrimSpace(left.Source.ID)
	}
	rightSourceID := ""
	if right.Source != nil {
		rightSourceID = strings.TrimSpace(right.Source.ID)
	}
	return leftSourceID < rightSourceID
}

func sourceSearchSpecificityRank(resultKind string) int {
	switch strings.TrimSpace(resultKind) {
	case SourceManagementSearchResultSourceRevision:
		return 0
	case SourceManagementSearchResultSourceDocument:
		return 1
	default:
		return 2
	}
}

func paginateSourceManagement[T any](items []T, page, pageSize int, sort string) ([]T, SourceManagementPageInfo) {
	total := len(items)
	start := min((page-1)*pageSize, total)
	end := min(start+pageSize, total)
	out := make([]T, 0, end-start)
	out = append(out, items[start:end]...)
	return out, SourceManagementPageInfo{
		Mode:       SourceManagementPaginationModePage,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: total,
		HasMore:    end < total,
		Sort:       strings.TrimSpace(sort),
	}
}

func fixedSourceManagementPageInfo(pageSize, total int, sort string) SourceManagementPageInfo {
	return SourceManagementPageInfo{
		Mode:       SourceManagementPaginationModePage,
		Page:       1,
		PageSize:   pageSize,
		TotalCount: total,
		HasMore:    false,
		Sort:       strings.TrimSpace(sort),
	}
}

func emptySourceListPage(query SourceListQuery) SourceListPage {
	return SourceListPage{
		Items:        []SourceListItem{},
		PageInfo:     fixedSourceManagementPageInfo(0, 0, normalizeSourceSort(query.Sort)),
		AppliedQuery: query,
		Permissions:  defaultSourceManagementPermissions(),
		EmptyState:   sourceCollectionEmptyState(true, "No sources", "No canonical source documents are available."),
		Links:        SourceManagementLinks{Self: sourceManagementSourcesPath()},
	}
}

func emptySourceRevisionPage(query SourceRevisionListQuery) SourceRevisionPage {
	return SourceRevisionPage{
		Items:        []SourceRevisionListItem{},
		PageInfo:     fixedSourceManagementPageInfo(0, 0, normalizeSourceRevisionSort(query.Sort)),
		AppliedQuery: query,
		Permissions:  defaultSourceManagementPermissions(),
		EmptyState:   sourceCollectionEmptyState(true, "No revisions", "This source has no revisions."),
	}
}

func emptySourceRelationshipPage(query SourceRelationshipListQuery) SourceRelationshipPage {
	return SourceRelationshipPage{
		Items:        []SourceRelationshipSummary{},
		PageInfo:     fixedSourceManagementPageInfo(0, 0, normalizeSourceRelationshipSort(query.Sort)),
		AppliedQuery: query,
		Permissions:  defaultSourceManagementPermissions(),
		EmptyState:   sourceCollectionEmptyState(true, "No relationships", "This source has no relationships."),
	}
}

func emptySourceAgreementPage(query SourceAgreementListQuery) SourceAgreementPage {
	return SourceAgreementPage{
		Items:        []SourceAgreementSummary{},
		PageInfo:     fixedSourceManagementPageInfo(0, 0, normalizeSourceAgreementSort(query.Sort)),
		AppliedQuery: query,
		Permissions:  defaultSourceManagementPermissions(),
		EmptyState:   sourceCollectionEmptyState(true, "No agreements", "This source has no related agreements."),
	}
}

func emptySourceHandlePage() SourceHandlePage {
	return SourceHandlePage{
		Items:       []SourceHandleSummary{},
		PageInfo:    fixedSourceManagementPageInfo(0, 0, sourceListSortUpdatedDesc),
		Permissions: defaultSourceManagementPermissions(),
		EmptyState:  sourceCollectionEmptyState(true, "No handles", "This source has no provider handles."),
	}
}

func emptySourceArtifactPage() SourceArtifactPage {
	return SourceArtifactPage{
		Items:       []SourceArtifactSummary{},
		PageInfo:    fixedSourceManagementPageInfo(0, 0, sourceRevisionSortLatestDesc),
		Permissions: defaultSourceManagementPermissions(),
		EmptyState:  sourceCollectionEmptyState(true, "No artifacts", "This revision has no artifacts."),
	}
}

func emptySourceCommentPage() SourceCommentPage {
	return SourceCommentPage{
		Items:       []SourceCommentThreadSummary{},
		PageInfo:    fixedSourceManagementPageInfo(0, 0, sourceRevisionSortLatestDesc),
		Permissions: defaultSourceManagementPermissions(),
		EmptyState: LineageEmptyState{
			Kind:        LineageEmptyStateNoComments,
			Title:       "No comments",
			Description: "Source-level comments are not available.",
		},
		SyncStatus: SourceManagementCommentSyncNotConfigured,
	}
}

func emptySourceSearchResults(query SourceSearchQuery) SourceSearchResults {
	return SourceSearchResults{
		Items:        []SourceSearchResultSummary{},
		PageInfo:     fixedSourceManagementPageInfo(0, 0, normalizeSourceSearchSort(query.Sort)),
		AppliedQuery: query,
		Permissions:  defaultSourceManagementPermissions(),
		EmptyState:   sourceCollectionEmptyState(true, "No search results", "No sources matched the current query."),
		Links:        SourceManagementLinks{Self: sourceManagementSearchPath()},
	}
}

func sourceCollectionEmptyState(empty bool, title, description string) LineageEmptyState {
	if !empty {
		return LineageEmptyState{Kind: LineageEmptyStateNone}
	}
	return LineageEmptyState{
		Kind:        LineageEmptyStateNoResults,
		Title:       strings.TrimSpace(title),
		Description: strings.TrimSpace(description),
	}
}

func defaultSourceManagementPermissions() SourceManagementPermissions {
	return SourceManagementPermissions{}
}

func (s DefaultSourceReadModelService) sourceRevisionUsageByRevision(ctx context.Context, scope stores.Scope, sourceDocumentIDs []string, revisions []stores.SourceRevisionRecord) (map[string]sourceRevisionUsageSummary, error) {
	usage := make(map[string]sourceRevisionUsageSummary, len(revisions))
	if len(sourceDocumentIDs) == 0 || len(revisions) == 0 {
		return usage, nil
	}
	revisionIDs := make([]string, 0, len(revisions))
	for _, revision := range revisions {
		revisionID := strings.TrimSpace(revision.ID)
		if revisionID == "" {
			continue
		}
		usage[revisionID] = sourceRevisionUsageSummary{}
		revisionIDs = append(revisionIDs, revisionID)
	}

	var aggregateStore stores.SourceRevisionUsageStore
	if store, ok := any(s.lineage).(stores.SourceRevisionUsageStore); ok {
		aggregateStore = store
	} else if store, ok := any(s.documents).(stores.SourceRevisionUsageStore); ok {
		aggregateStore = store
	} else if store, ok := any(s.agreements).(stores.SourceRevisionUsageStore); ok {
		aggregateStore = store
	}
	if aggregateStore == nil {
		return usage, nil
	}
	records, err := aggregateStore.ListSourceRevisionUsage(ctx, scope, stores.SourceRevisionUsageQuery{
		SourceDocumentIDs: append([]string{}, sourceDocumentIDs...),
		SourceRevisionIDs: revisionIDs,
	})
	if err != nil {
		return nil, err
	}
	for _, record := range records {
		revisionID := strings.TrimSpace(record.SourceRevisionID)
		current, ok := usage[revisionID]
		if !ok {
			continue
		}
		current.PinnedDocumentCount = record.PinnedDocumentCount
		current.PinnedAgreementCount = record.PinnedAgreementCount
		usage[revisionID] = current
	}
	return usage, nil
}

func sourceLineageReference(record stores.SourceDocumentRecord) *LineageReference {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	return &LineageReference{
		ID:    strings.TrimSpace(record.ID),
		Label: strings.TrimSpace(record.CanonicalTitle),
		URL:   sourceManagementSourcePath(record.ID),
	}
}

func sourceHandleSummaryFromRecord(record stores.SourceHandleRecord) SourceHandleSummary {
	return SourceHandleSummary{
		ID:             strings.TrimSpace(record.ID),
		ProviderKind:   strings.TrimSpace(record.ProviderKind),
		ExternalFileID: strings.TrimSpace(record.ExternalFileID),
		AccountID:      strings.TrimSpace(record.AccountID),
		DriveID:        strings.TrimSpace(record.DriveID),
		WebURL:         strings.TrimSpace(record.WebURL),
		HandleStatus:   strings.TrimSpace(record.HandleStatus),
		ValidFrom:      cloneSourceTimePtr(record.ValidFrom),
		ValidTo:        cloneSourceTimePtr(record.ValidTo),
		Links: SourceManagementLinks{
			Provider: strings.TrimSpace(record.WebURL),
		},
	}
}

func optionalSourceHandleSummary(record stores.SourceHandleRecord) *SourceHandleSummary {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	summary := sourceHandleSummaryFromRecord(record)
	return &summary
}

func sourceManagementRevisionSummary(record stores.SourceRevisionRecord, resolved sourceManagementContext) *SourceRevisionSummary {
	summary := sourceRevisionSummaryFromRecord(record)
	if summary == nil {
		return nil
	}
	usage := resolved.revisionUsage[strings.TrimSpace(record.ID)]
	summary.HistoryLabels = sourceRevisionHistoryLabels(record, resolved)
	summary.PinnedDocumentCount = usage.PinnedDocumentCount
	summary.PinnedAgreementCount = usage.PinnedAgreementCount
	return summary
}

func providerSummaryFromRevision(providerKind string, handle stores.SourceHandleRecord, revision stores.SourceRevisionRecord, artifact stores.SourceArtifactRecord) *SourceProviderSummary {
	providerKind = strings.TrimSpace(providerKind)
	if providerKind == "" && strings.TrimSpace(handle.ProviderKind) != "" {
		providerKind = strings.TrimSpace(handle.ProviderKind)
	}
	if providerKind == "" {
		return nil
	}
	metadata := decodeLineageMetadataJSON(revision.MetadataJSON)
	values := map[string]any{}
	appendLineageProviderMetadata(values, "owner_email", firstNonEmpty(
		lineageMetadataString(metadata, "owner_email"),
		lineageNestedMetadataString(metadata, "owner", "email"),
	))
	appendLineageProviderMetadata(values, "parent_id", firstNonEmpty(
		lineageMetadataString(metadata, "parent_id"),
		lineageMetadataString(metadata, "folder_id"),
	))
	appendLineageProviderMetadata(values, "source_version_hint", firstNonEmpty(
		strings.TrimSpace(revision.ProviderRevisionHint),
		lineageMetadataString(metadata, "source_version_hint"),
	))
	appendLineageProviderMetadata(values, "source_mime_type", firstNonEmpty(
		strings.TrimSpace(revision.SourceMimeType),
		lineageMetadataString(metadata, "source_mime_type"),
	))
	appendLineageProviderMetadata(values, "source_ingestion_mode", lineageMetadataString(metadata, "source_ingestion_mode"))
	appendLineageProviderMetadata(values, "title_hint", lineageMetadataString(metadata, "title_hint"))
	if artifact.PageCount > 0 {
		values["page_count_hint"] = artifact.PageCount
	}
	provider := &SourceProviderSummary{
		Kind:           providerKind,
		Label:          sourceProviderLabel(providerKind),
		ExternalFileID: firstNonEmpty(strings.TrimSpace(handle.ExternalFileID), lineageMetadataString(metadata, "external_file_id")),
		AccountID:      firstNonEmpty(strings.TrimSpace(handle.AccountID), lineageMetadataString(metadata, "account_id")),
		DriveID:        firstNonEmpty(strings.TrimSpace(handle.DriveID), lineageMetadataString(metadata, "drive_id")),
		WebURL:         firstNonEmpty(strings.TrimSpace(handle.WebURL), lineageMetadataString(metadata, "web_url")),
	}
	if len(values) > 0 {
		provider.Extension = &SourceProviderExtensionEnvelope{
			Schema: providerKind + ".v1",
			Values: values,
		}
	}
	return provider
}

func appendLineageProviderMetadata(target map[string]any, key, value string) {
	if target == nil {
		return
	}
	if strings.TrimSpace(value) == "" {
		return
	}
	target[key] = strings.TrimSpace(value)
}

func sourceProviderLabel(kind string) string {
	switch strings.TrimSpace(kind) {
	case stores.SourceProviderKindGoogleDrive:
		return "Google Drive"
	case stores.SourceProviderKindOneDrive:
		return "OneDrive"
	case stores.SourceProviderKindDropbox:
		return "Dropbox"
	case stores.SourceProviderKindBox:
		return "Box"
	case stores.SourceProviderKindLocal:
		return "Local Upload"
	default:
		return strings.TrimSpace(kind)
	}
}

func latestActiveSourceHandle(handles []stores.SourceHandleRecord) stores.SourceHandleRecord {
	for _, handle := range handles {
		if strings.EqualFold(strings.TrimSpace(handle.HandleStatus), stores.SourceHandleStatusActive) && handle.ValidTo == nil {
			return handle
		}
	}
	if len(handles) == 0 {
		return stores.SourceHandleRecord{}
	}
	return handles[0]
}

func pendingRelationshipCount(relationships []stores.SourceRelationshipRecord) int {
	count := 0
	for _, relationship := range relationships {
		if strings.EqualFold(strings.TrimSpace(relationship.Status), stores.SourceRelationshipStatusPendingReview) {
			count++
		}
	}
	return count
}

func sourceRevisionHistoryLabels(revision stores.SourceRevisionRecord, resolved sourceManagementContext) []string {
	revisionID := strings.TrimSpace(revision.ID)
	if revisionID == "" {
		return nil
	}
	labels := make([]string, 0, 4)
	if revisionID == strings.TrimSpace(resolved.latestRevision.ID) {
		labels = append(labels, SourceRevisionHistoryLabelLatest)
	}
	usage := resolved.revisionUsage[revisionID]
	if usage.PinnedDocumentCount > 0 || usage.PinnedAgreementCount > 0 {
		labels = append(labels, SourceRevisionHistoryLabelPinned)
	}
	if strings.TrimSpace(resolved.latestRevision.ID) != "" && revisionID != strings.TrimSpace(resolved.latestRevision.ID) {
		labels = append(labels, SourceRevisionHistoryLabelSuperseded)
	}
	if !containsString(labels, SourceRevisionHistoryLabelLatest) && !containsString(labels, SourceRevisionHistoryLabelPinned) {
		labels = append(labels, SourceRevisionHistoryLabelHistorical)
	}
	return labels
}

func sourceManagementContextSortTime(resolved sourceManagementContext) time.Time {
	if resolved.latestRevision.ModifiedTime != nil {
		return resolved.latestRevision.ModifiedTime.UTC()
	}
	if resolved.latestRevision.ExportedAt != nil {
		return resolved.latestRevision.ExportedAt.UTC()
	}
	return resolved.sourceDocument.UpdatedAt.UTC()
}

func sourceRevisionSortTime(summary *SourceRevisionSummary) time.Time {
	if summary == nil {
		return time.Time{}
	}
	if summary.ModifiedTime != nil {
		return summary.ModifiedTime.UTC()
	}
	if summary.ExportedAt != nil {
		return summary.ExportedAt.UTC()
	}
	return time.Time{}
}

func sourceRevisionID(summary *SourceRevisionSummary) string {
	if summary == nil {
		return ""
	}
	return strings.TrimSpace(summary.ID)
}

func sourceRevisionSummarySortTime(summary *SourceRevisionSummary) time.Time {
	return sourceRevisionSortTime(summary)
}

func sourceAgreementLabel(summary SourceAgreementSummary) string {
	if summary.Agreement == nil {
		return ""
	}
	return strings.TrimSpace(summary.Agreement.Label)
}

func artifactSummaryID(summary *SourceArtifactSummary) string {
	if summary == nil {
		return ""
	}
	return strings.TrimSpace(summary.ID)
}

func sourceReferenceID(ref *LineageReference) string {
	if ref == nil {
		return ""
	}
	return strings.TrimSpace(ref.ID)
}

func sourceContinuityStatusSummary(status string, continuation *LineageReference) string {
	switch strings.TrimSpace(status) {
	case stores.SourceDocumentStatusMerged:
		if continuation != nil && strings.TrimSpace(continuation.Label) != "" {
			return "Merged continuity now resolves through " + strings.TrimSpace(continuation.Label) + "."
		}
		return "Merged continuity remains visible from the canonical source workspace."
	case stores.SourceDocumentStatusArchived:
		return "Archived source history remains available without changing pinned agreement provenance."
	default:
		return "Canonical source continuity is tracked from the active handle through revision history."
	}
}

func sourceRevisionContinuitySummary(index int, revisions []stores.SourceRevisionRecord, handle stores.SourceHandleRecord, repeatedHandle bool) string {
	if repeatedHandle {
		return "Repeated revision captured under the same active provider handle."
	}
	if index == 0 {
		return "Latest observed revision for this canonical source."
	}
	currentHandleID := strings.TrimSpace(handle.ID)
	previousHandleID := currentHandleID
	if index > 0 {
		previousHandleID = strings.TrimSpace(revisions[index-1].SourceHandleID)
	}
	if currentHandleID != "" && previousHandleID != "" && currentHandleID != previousHandleID {
		return "Provider handle continuity changed at this revision boundary."
	}
	return "Historical revision remains pinned for downstream document and agreement lineage."
}

func sourceRelationshipKind(relationshipType string) string {
	switch strings.TrimSpace(relationshipType) {
	case stores.SourceRelationshipTypeCopiedFrom:
		return SourceRelationshipKindCopy
	case stores.SourceRelationshipTypeTransferredFrom:
		return SourceRelationshipKindTransfer
	case stores.SourceRelationshipTypeForkedFrom:
		return SourceRelationshipKindFork
	case stores.SourceRelationshipTypePartialOverlap:
		return SourceRelationshipKindPartialOverlap
	case stores.SourceRelationshipTypeSameLogicalDoc:
		return SourceRelationshipKindContinuity
	default:
		return strings.TrimSpace(relationshipType)
	}
}

func sourceRelationshipCounterpartRole(currentSourceDocumentID, counterpartSourceDocumentID string, relationship stores.SourceRelationshipRecord) string {
	currentSourceDocumentID = strings.TrimSpace(currentSourceDocumentID)
	counterpartSourceDocumentID = strings.TrimSpace(counterpartSourceDocumentID)
	predecessorID, successorID := sourceRelationshipDirectionalSummaryEndpoints(relationship)
	switch {
	case predecessorID == "" || successorID == "":
		return SourceRelationshipRoleRelated
	case currentSourceDocumentID == successorID && counterpartSourceDocumentID == predecessorID:
		return SourceRelationshipRolePredecessor
	case currentSourceDocumentID == predecessorID && counterpartSourceDocumentID == successorID:
		return SourceRelationshipRoleSuccessor
	default:
		return SourceRelationshipRoleRelated
	}
}

func sourceRelationshipDirectionalSummaryEndpoints(relationship stores.SourceRelationshipRecord) (string, string) {
	predecessorID := strings.TrimSpace(relationship.PredecessorSourceDocumentID)
	successorID := strings.TrimSpace(relationship.SuccessorSourceDocumentID)
	if predecessorID != "" && successorID != "" {
		return predecessorID, successorID
	}
	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	candidateID := strings.TrimSpace(lineageMetadataString(evidence, "candidate_source_document_id"))
	switch {
	case candidateID != "" && candidateID == strings.TrimSpace(relationship.LeftSourceDocumentID):
		return candidateID, strings.TrimSpace(relationship.RightSourceDocumentID)
	case candidateID != "" && candidateID == strings.TrimSpace(relationship.RightSourceDocumentID):
		return candidateID, strings.TrimSpace(relationship.LeftSourceDocumentID)
	default:
		return strings.TrimSpace(relationship.LeftSourceDocumentID), strings.TrimSpace(relationship.RightSourceDocumentID)
	}
}

func sourceRelationshipSummaryText(kind, counterpartRole, status string) string {
	state := strings.TrimSpace(status)
	if state == "" {
		state = stores.SourceRelationshipStatusPendingReview
	}
	prefix := map[string]string{
		stores.SourceRelationshipStatusPendingReview: "Pending review",
		stores.SourceRelationshipStatusConfirmed:     "Confirmed",
		stores.SourceRelationshipStatusRejected:      "Rejected",
		stores.SourceRelationshipStatusSuperseded:    "Superseded",
	}[state]
	if prefix == "" {
		prefix = "Relationship"
	}
	description := "related source continuity"
	switch strings.TrimSpace(kind) {
	case SourceRelationshipKindCopy:
		description = "copy lineage"
	case SourceRelationshipKindTransfer:
		description = "transfer lineage"
	case SourceRelationshipKindFork:
		description = "fork lineage"
	case SourceRelationshipKindPartialOverlap:
		description = "partial-overlap lineage"
	}
	switch strings.TrimSpace(counterpartRole) {
	case SourceRelationshipRolePredecessor:
		description = "predecessor " + description
	case SourceRelationshipRoleSuccessor:
		description = "successor " + description
	}
	return strings.TrimSpace(prefix + " " + description)
}

func searchResultTitle(result SourceSearchResultSummary) string {
	if result.Source == nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(result.Source.Label))
}

func containsString(values []string, candidate string) bool {
	return slices.Contains(values, candidate)
}

func appendUniqueString(values []string, candidate string) []string {
	if containsString(values, candidate) {
		return values
	}
	return append(values, candidate)
}

func sourceHandleForRevision(handles []stores.SourceHandleRecord, revision stores.SourceRevisionRecord) stores.SourceHandleRecord {
	revisionHandleID := strings.TrimSpace(revision.SourceHandleID)
	if revisionHandleID == "" {
		return stores.SourceHandleRecord{}
	}
	for _, handle := range handles {
		if strings.TrimSpace(handle.ID) == revisionHandleID {
			return handle
		}
	}
	return stores.SourceHandleRecord{}
}

func sourceManagementSourcesPath() string {
	return DefaultSourceManagementBasePath + "/sources"
}

func sourceManagementSourcePath(sourceDocumentID string) string {
	return sourceManagementSourcesPath() + "/" + strings.TrimSpace(sourceDocumentID)
}

func sourceManagementSourceWorkspacePath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/workspace"
}

func sourceManagementSourceRevisionsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/revisions"
}

func sourceManagementSourceRelationshipsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/relationships"
}

func sourceManagementSourceAgreementsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/agreements"
}

func sourceManagementSourceHandlesPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/handles"
}

func sourceManagementRevisionPath(sourceRevisionID string) string {
	return DefaultSourceManagementBasePath + "/source-revisions/" + strings.TrimSpace(sourceRevisionID)
}

func sourceManagementRevisionArtifactsPath(sourceRevisionID string) string {
	return sourceManagementRevisionPath(sourceRevisionID) + "/artifacts"
}

func sourceManagementSourceCommentsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/comments"
}

func sourceManagementRevisionCommentsPath(sourceRevisionID string) string {
	return sourceManagementRevisionPath(sourceRevisionID) + "/comments"
}

func sourceManagementSearchPath() string {
	return DefaultSourceManagementBasePath + "/source-search"
}

func sourceManagementDocumentDetailPath(documentID string) string {
	return "/admin/content/documents/" + strings.TrimSpace(documentID)
}

func sourceManagementAgreementDetailPath(agreementID string) string {
	return "/admin/content/agreements/" + strings.TrimSpace(agreementID)
}

func sourceManagementWorkspaceAnchorPath(sourceDocumentID, panel, anchor string) string {
	workspace := sourceManagementSourceWorkspacePath(sourceDocumentID)
	panel = normalizeSourceWorkspacePanel(panel)
	anchor = strings.TrimSpace(anchor)
	if panel == SourceWorkspacePanelOverview && anchor == "" {
		return workspace
	}
	parts := make([]string, 0, 2)
	if panel != "" {
		parts = append(parts, "panel="+panel)
	}
	if anchor != "" {
		parts = append(parts, "anchor="+anchor)
	}
	if len(parts) == 0 {
		return workspace
	}
	return workspace + "?" + strings.Join(parts, "&")
}

func sourceLinksForDocument(sourceDocumentID string) SourceManagementLinks {
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	return SourceManagementLinks{
		Self:          sourceManagementSourcePath(sourceDocumentID),
		Source:        sourceManagementSourcePath(sourceDocumentID),
		Workspace:     sourceManagementSourceWorkspacePath(sourceDocumentID),
		Revisions:     sourceManagementSourceRevisionsPath(sourceDocumentID),
		Timeline:      sourceManagementWorkspaceAnchorPath(sourceDocumentID, SourceWorkspacePanelTimeline, ""),
		Relationships: sourceManagementSourceRelationshipsPath(sourceDocumentID),
		Agreements:    sourceManagementSourceAgreementsPath(sourceDocumentID),
		Handles:       sourceManagementSourceHandlesPath(sourceDocumentID),
		Comments:      sourceManagementSourceCommentsPath(sourceDocumentID),
	}
}

func sourceRevisionLinks(sourceRevisionID, sourceDocumentID string) SourceManagementLinks {
	links := sourceLinksForDocument(sourceDocumentID)
	links.Self = sourceManagementRevisionPath(sourceRevisionID)
	links.Anchor = sourceManagementWorkspaceAnchorPath(sourceDocumentID, SourceWorkspacePanelTimeline, "revision:"+strings.TrimSpace(sourceRevisionID))
	links.Artifacts = sourceManagementRevisionArtifactsPath(sourceRevisionID)
	links.Comments = sourceManagementRevisionCommentsPath(sourceRevisionID)
	return links
}

func sourceWorkspaceLinksForDocument(sourceDocumentID, panel, anchor string) SourceManagementLinks {
	links := sourceLinksForDocument(sourceDocumentID)
	links.Self = sourceManagementWorkspaceAnchorPath(sourceDocumentID, panel, anchor)
	links.Anchor = links.Self
	return links
}
