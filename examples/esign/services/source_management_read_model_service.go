package services

import (
	"context"
	"fmt"
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
	relationships := make([]stores.SourceRelationshipRecord, 0, len(resolved.relationships))
	for _, relationship := range resolved.relationships {
		if normalized.Status != "" && !strings.EqualFold(strings.TrimSpace(relationship.Status), normalized.Status) {
			continue
		}
		if normalized.RelationshipType != "" && !strings.EqualFold(strings.TrimSpace(relationship.RelationshipType), normalized.RelationshipType) {
			continue
		}
		relationships = append(relationships, relationship)
	}
	sortSourceRelationshipRecords(relationships, normalized.Sort)
	paged, pageInfo := paginateSourceManagement(relationships, normalized.Page, normalized.PageSize, normalized.Sort)
	contextRecords := []stores.SourceDocumentRecord{resolved.sourceDocument}
	seenContextIDs := map[string]struct{}{strings.TrimSpace(resolved.sourceDocument.ID): {}}
	for _, relationship := range paged {
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
				return page, err
			}
			contextRecords = append(contextRecords, candidate)
			seenContextIDs[candidateID] = struct{}{}
		}
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

func (s DefaultSourceReadModelService) buildSourceSearchResult(resolved sourceManagementContext, query string) (SourceSearchResultSummary, int, bool) {
	query = strings.TrimSpace(strings.ToLower(query))
	if query == "" {
		return SourceSearchResultSummary{}, 0, false
	}
	score := 0
	matchedFields := make([]string, 0, 4)
	matchedRevision := stores.SourceRevisionRecord{}
	title := strings.ToLower(strings.TrimSpace(resolved.sourceDocument.CanonicalTitle))
	if strings.Contains(title, query) {
		score += 10
		matchedFields = append(matchedFields, "canonical_title")
	}
	for _, handle := range resolved.handles {
		if strings.Contains(strings.ToLower(strings.TrimSpace(handle.ExternalFileID)), query) {
			score += 8
			matchedFields = appendUniqueString(matchedFields, "external_file_id")
		}
		if strings.Contains(strings.ToLower(strings.TrimSpace(handle.AccountID)), query) {
			score += 6
			matchedFields = appendUniqueString(matchedFields, "account_id")
		}
	}
	for _, revision := range resolved.revisions {
		if strings.Contains(strings.ToLower(strings.TrimSpace(revision.ProviderRevisionHint)), query) {
			score += 7
			matchedFields = appendUniqueString(matchedFields, "provider_revision_hint")
			if strings.TrimSpace(matchedRevision.ID) == "" {
				matchedRevision = revision
			}
		}
	}
	if score == 0 {
		return SourceSearchResultSummary{}, 0, false
	}
	summary := fmt.Sprintf("Matched %s across canonical source metadata.", strings.Join(matchedFields, ", "))
	resultKind := SourceManagementSearchResultSourceDocument
	var revision *SourceRevisionSummary
	links := sourceLinksForDocument(resolved.sourceDocument.ID)
	providerRevision := resolved.latestRevision
	providerHandle := resolved.activeHandle
	if containsString(matchedFields, "provider_revision_hint") {
		resultKind = SourceManagementSearchResultSourceRevision
		if strings.TrimSpace(matchedRevision.ID) == "" {
			matchedRevision = resolved.latestRevision
		}
		revision = sourceManagementRevisionSummary(matchedRevision, resolved)
		links = sourceRevisionLinks(matchedRevision.ID, resolved.sourceDocument.ID)
		providerRevision = matchedRevision
		providerHandle = sourceHandleForRevision(resolved.handles, matchedRevision)
	}
	return SourceSearchResultSummary{
		ResultKind:    resultKind,
		Source:        sourceLineageReference(resolved.sourceDocument),
		Revision:      revision,
		Provider:      providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, providerHandle, providerRevision, stores.SourceArtifactRecord{}),
		MatchedFields: matchedFields,
		Summary:       summary,
		Links:         links,
	}, score, true
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

func sortSourceSearchResults(items []scoredSourceSearchResult, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		if sortKey == sourceSearchSortTitleAsc {
			return searchResultTitle(items[i].result) < searchResultTitle(items[j].result)
		}
		if items[i].score == items[j].score {
			return searchResultTitle(items[i].result) < searchResultTitle(items[j].result)
		}
		return items[i].score > items[j].score
	})
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

func sourceManagementSourceRevisionsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/revisions"
}

func sourceManagementSourceRelationshipsPath(sourceDocumentID string) string {
	return sourceManagementSourcePath(sourceDocumentID) + "/relationships"
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

func sourceLinksForDocument(sourceDocumentID string) SourceManagementLinks {
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	return SourceManagementLinks{
		Self:          sourceManagementSourcePath(sourceDocumentID),
		Source:        sourceManagementSourcePath(sourceDocumentID),
		Revisions:     sourceManagementSourceRevisionsPath(sourceDocumentID),
		Relationships: sourceManagementSourceRelationshipsPath(sourceDocumentID),
		Handles:       sourceManagementSourceHandlesPath(sourceDocumentID),
		Comments:      sourceManagementSourceCommentsPath(sourceDocumentID),
	}
}

func sourceRevisionLinks(sourceRevisionID, sourceDocumentID string) SourceManagementLinks {
	links := sourceLinksForDocument(sourceDocumentID)
	links.Self = sourceManagementRevisionPath(sourceRevisionID)
	links.Artifacts = sourceManagementRevisionArtifactsPath(sourceRevisionID)
	links.Comments = sourceManagementRevisionCommentsPath(sourceRevisionID)
	return links
}
