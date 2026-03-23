package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

var sourceSearchNamespace = uuid.MustParse("a44d9760-80ef-4225-8c65-f1bc9fdf6f68")

type DefaultSourceSearchService struct {
	lineage stores.LineageStore
}

func NewDefaultSourceSearchService(lineage stores.LineageStore) DefaultSourceSearchService {
	return DefaultSourceSearchService{lineage: lineage}
}

func (s DefaultSourceSearchService) Search(ctx context.Context, scope stores.Scope, query SourceSearchQuery) (SourceSearchResults, error) {
	normalizedQuery := normalizeSourceSearchQuery(query)
	results := emptySourceSearchResults(normalizedQuery)
	if s.lineage == nil {
		return results, domainValidationError("source_search", "lineage", "not configured")
	}
	if err := s.ensureIndexed(ctx, scope); err != nil {
		return results, err
	}
	documents, err := s.lineage.ListSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{
		ResultKind:        strings.TrimSpace(normalizedQuery.ResultKind),
		ProviderKind:      strings.TrimSpace(normalizedQuery.ProviderKind),
		RelationshipState: strings.TrimSpace(normalizedQuery.RelationshipState),
		CommentSyncStatus: strings.TrimSpace(normalizedQuery.CommentSyncStatus),
		HasComments:       normalizedQuery.HasComments,
	})
	if err != nil {
		return results, err
	}
	scored := make([]scoredSourceSearchResult, 0, len(documents))
	for _, indexed := range documents {
		if !s.matchesSearchFilters(ctx, scope, indexed, normalizedQuery) {
			continue
		}
		item, score, ok := s.matchIndexedDocument(ctx, scope, indexed, normalizedQuery)
		if !ok {
			continue
		}
		scored = append(scored, scoredSourceSearchResult{result: item, score: score})
	}
	sortIndexedSourceSearchResults(scored, normalizedQuery.Sort)
	paged, pageInfo := paginateSourceManagement(scored, normalizedQuery.Page, normalizedQuery.PageSize, normalizedQuery.Sort)
	results.Items = make([]SourceSearchResultSummary, 0, len(paged))
	for _, item := range paged {
		results.Items = append(results.Items, item.result)
	}
	results.PageInfo = pageInfo
	results.AppliedQuery = normalizedQuery
	results.EmptyState = sourceCollectionEmptyState(len(results.Items) == 0, "No search results", "No sources matched the current search query.")
	return results, nil
}

func (s DefaultSourceSearchService) ReindexSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceSearchIndexResult, error) {
	if s.lineage == nil {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "lineage", "not configured")
	}
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "source_document_id", "required")
	}
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	_ = s.lineage.DeleteSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{SourceDocumentID: sourceDocumentID})
	indexedCount := 0
	now := time.Now().UTC()
	docs, commentStatus, err := s.buildIndexDocuments(ctx, scope, sourceDocument)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	for _, record := range docs {
		if _, err := s.saveIndexDocument(ctx, scope, record); err != nil {
			return SourceSearchIndexResult{}, err
		}
		indexedCount++
	}
	return SourceSearchIndexResult{
		TargetKind:        SourceManagementSearchResultSourceDocument,
		TargetID:          sourceDocumentID,
		IndexedCount:      indexedCount,
		DeletedCount:      0,
		IndexedAt:         &now,
		CommentSyncStatus: commentStatus,
	}, nil
}

func (s DefaultSourceSearchService) ReindexSourceRevision(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error) {
	if s.lineage == nil {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "lineage", "not configured")
	}
	sourceRevisionID = strings.TrimSpace(sourceRevisionID)
	if sourceRevisionID == "" {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "source_revision_id", "required")
	}
	revision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, revision.SourceDocumentID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	result, err := s.ReindexSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	result.TargetKind = SourceManagementSearchResultSourceRevision
	result.TargetID = sourceRevisionID
	return result, nil
}

func (s DefaultSourceSearchService) ensureIndexed(ctx context.Context, scope stores.Scope) error {
	sources, err := s.lineage.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{})
	if err != nil {
		return err
	}
	for _, source := range sources {
		needsRefresh, err := s.sourceSearchIndexNeedsRefresh(ctx, scope, source)
		if err != nil {
			return err
		}
		if !needsRefresh {
			continue
		}
		if _, err := s.ReindexSourceDocument(ctx, scope, source.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s DefaultSourceSearchService) buildIndexDocuments(ctx context.Context, scope stores.Scope, sourceDocument stores.SourceDocumentRecord) ([]stores.SourceSearchDocumentRecord, string, error) {
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return nil, "", err
	}
	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return nil, "", err
	}
	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return nil, "", err
	}
	commentThreads, err := s.lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return nil, "", err
	}
	commentStates, err := s.lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return nil, "", err
	}
	relationshipState := sourceSearchRelationshipState(relationships)
	commentStatus := aggregateSourceCommentSyncStatus(commentStates)
	totalCommentCount := len(commentThreads)
	now := time.Now().UTC()
	documents := make([]stores.SourceSearchDocumentRecord, 0, len(revisions)+1)
	documentRecord, err := s.buildSourceDocumentIndexRecord(ctx, scope, sourceDocument, handles, revisions, relationships, commentThreads, commentStatus, relationshipState, totalCommentCount, now)
	if err != nil {
		return nil, "", err
	}
	documents = append(documents, documentRecord)
	for _, revision := range revisions {
		record, err := s.buildSourceRevisionIndexRecord(ctx, scope, sourceDocument, revision, handles, relationships, commentThreads, commentStates, relationshipState, now)
		if err != nil {
			return nil, "", err
		}
		documents = append(documents, record)
	}
	return documents, commentStatus, nil
}

func (s DefaultSourceSearchService) buildSourceDocumentIndexRecord(
	ctx context.Context,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	handles []stores.SourceHandleRecord,
	revisions []stores.SourceRevisionRecord,
	relationships []stores.SourceRelationshipRecord,
	commentThreads []stores.SourceCommentThreadRecord,
	commentStatus string,
	relationshipState string,
	totalCommentCount int,
	now time.Time,
) (stores.SourceSearchDocumentRecord, error) {
	metadata := map[string]any{
		"status":             strings.TrimSpace(sourceDocument.Status),
		"external_file_ids":  uniqueHandleValues(handles, func(v stores.SourceHandleRecord) string { return v.ExternalFileID }),
		"account_ids":        uniqueHandleValues(handles, func(v stores.SourceHandleRecord) string { return v.AccountID }),
		"web_urls":           uniqueHandleValues(handles, func(v stores.SourceHandleRecord) string { return v.WebURL }),
		"revision_hints":     uniqueRevisionValues(revisions, func(v stores.SourceRevisionRecord) string { return v.ProviderRevisionHint }),
		"artifact_hashes":    s.collectArtifactHashes(ctx, scope, revisions),
		"fingerprint_hashes": s.collectFingerprintHashes(ctx, scope, revisions),
		"comment_bodies":     sourceCommentBodies(commentThreads),
	}
	searchText := strings.Join([]string{
		strings.TrimSpace(sourceDocument.CanonicalTitle),
		strings.Join(anyStrings(metadata["external_file_ids"]), " "),
		strings.Join(anyStrings(metadata["account_ids"]), " "),
		strings.Join(anyStrings(metadata["web_urls"]), " "),
		strings.Join(anyStrings(metadata["revision_hints"]), " "),
		strings.Join(anyStrings(metadata["artifact_hashes"]), " "),
		strings.Join(anyStrings(metadata["fingerprint_hashes"]), " "),
		strings.Join(anyStrings(metadata["comment_bodies"]), " "),
		relationshipState,
	}, " ")
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	return stores.SourceSearchDocumentRecord{
		ID:                deterministicSourceSearchDocumentID(SourceManagementSearchResultSourceDocument, sourceDocument.ID, ""),
		SourceDocumentID:  sourceDocument.ID,
		ResultKind:        SourceManagementSearchResultSourceDocument,
		ProviderKind:      sourceDocument.ProviderKind,
		CanonicalTitle:    sourceDocument.CanonicalTitle,
		RelationshipState: relationshipState,
		CommentSyncStatus: commentStatus,
		CommentCount:      totalCommentCount,
		HasComments:       totalCommentCount > 0,
		SearchText:        strings.TrimSpace(searchText),
		MetadataJSON:      string(metadataJSON),
		IndexedAt:         now,
		UpdatedAt:         now,
	}, nil
}

func (s DefaultSourceSearchService) buildSourceRevisionIndexRecord(
	ctx context.Context,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	revision stores.SourceRevisionRecord,
	handles []stores.SourceHandleRecord,
	relationships []stores.SourceRelationshipRecord,
	commentThreads []stores.SourceCommentThreadRecord,
	commentStates []stores.SourceCommentSyncStateRecord,
	relationshipState string,
	now time.Time,
) (stores.SourceSearchDocumentRecord, error) {
	revisionThreads := filterSourceCommentThreadsByRevision(commentThreads, revision.ID)
	revisionState := latestSourceCommentSyncState(commentStates, revision.ID)
	handleIDs := make([]stores.SourceHandleRecord, 0, 1)
	if handle := sourceHandleForRevision(handles, revision); strings.TrimSpace(handle.ID) != "" {
		handleIDs = append(handleIDs, handle)
	}
	metadata := map[string]any{
		"status":             strings.TrimSpace(sourceDocument.Status),
		"external_file_ids":  uniqueHandleValues(handleIDs, func(v stores.SourceHandleRecord) string { return v.ExternalFileID }),
		"account_ids":        uniqueHandleValues(handleIDs, func(v stores.SourceHandleRecord) string { return v.AccountID }),
		"web_urls":           uniqueHandleValues(handleIDs, func(v stores.SourceHandleRecord) string { return v.WebURL }),
		"revision_hints":     []string{strings.TrimSpace(revision.ProviderRevisionHint)},
		"artifact_hashes":    s.collectArtifactHashes(ctx, scope, []stores.SourceRevisionRecord{revision}),
		"fingerprint_hashes": s.collectFingerprintHashes(ctx, scope, []stores.SourceRevisionRecord{revision}),
		"comment_bodies":     sourceCommentBodies(revisionThreads),
	}
	searchText := strings.Join([]string{
		strings.TrimSpace(sourceDocument.CanonicalTitle),
		strings.TrimSpace(revision.ProviderRevisionHint),
		strings.Join(anyStrings(metadata["external_file_ids"]), " "),
		strings.Join(anyStrings(metadata["artifact_hashes"]), " "),
		strings.Join(anyStrings(metadata["fingerprint_hashes"]), " "),
		strings.Join(anyStrings(metadata["comment_bodies"]), " "),
		relationshipState,
	}, " ")
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return stores.SourceSearchDocumentRecord{}, err
	}
	commentStatus := SourceManagementCommentSyncNotConfigured
	if revisionState != nil {
		commentStatus = strings.TrimSpace(revisionState.SyncStatus)
	}
	return stores.SourceSearchDocumentRecord{
		ID:                deterministicSourceSearchDocumentID(SourceManagementSearchResultSourceRevision, sourceDocument.ID, revision.ID),
		SourceDocumentID:  sourceDocument.ID,
		SourceRevisionID:  revision.ID,
		ResultKind:        SourceManagementSearchResultSourceRevision,
		ProviderKind:      sourceDocument.ProviderKind,
		CanonicalTitle:    sourceDocument.CanonicalTitle,
		RelationshipState: relationshipState,
		CommentSyncStatus: commentStatus,
		CommentCount:      len(revisionThreads),
		HasComments:       len(revisionThreads) > 0,
		SearchText:        strings.TrimSpace(searchText),
		MetadataJSON:      string(metadataJSON),
		IndexedAt:         now,
		UpdatedAt:         now,
	}, nil
}

func (s DefaultSourceSearchService) saveIndexDocument(ctx context.Context, scope stores.Scope, record stores.SourceSearchDocumentRecord) (stores.SourceSearchDocumentRecord, error) {
	if existing, err := s.lineage.GetSourceSearchDocument(ctx, scope, record.ID); err == nil {
		record.IndexedAt = existing.IndexedAt
		return s.lineage.SaveSourceSearchDocument(ctx, scope, record)
	} else if !isNotFound(err) {
		return stores.SourceSearchDocumentRecord{}, err
	}
	return s.lineage.CreateSourceSearchDocument(ctx, scope, record)
}

func (s DefaultSourceSearchService) matchesSearchFilters(ctx context.Context, scope stores.Scope, indexed stores.SourceSearchDocumentRecord, query SourceSearchQuery) bool {
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, indexed.SourceDocumentID)
	if err != nil {
		return false
	}
	if query.Status != "" && !strings.EqualFold(strings.TrimSpace(sourceDocument.Status), strings.TrimSpace(query.Status)) {
		return false
	}
	if query.RevisionHint != "" {
		metadata := decodeLineageMetadataJSON(indexed.MetadataJSON)
		if !containsFold(anyStrings(metadata["revision_hints"]), query.RevisionHint) {
			return false
		}
	}
	return true
}

func (s DefaultSourceSearchService) matchIndexedDocument(ctx context.Context, scope stores.Scope, indexed stores.SourceSearchDocumentRecord, query SourceSearchQuery) (SourceSearchResultSummary, int, bool) {
	normalizedQuery := strings.ToLower(strings.TrimSpace(query.Query))
	result, metadata, ok := s.buildSourceSearchResultSummary(ctx, scope, indexed)
	if !ok {
		return SourceSearchResultSummary{}, 0, false
	}
	if normalizedQuery == "" {
		return result, 0, true
	}
	score := 0
	matched := make([]string, 0, 6)
	canonicalTitle := strings.ToLower(strings.TrimSpace(indexed.CanonicalTitle))
	if strings.Contains(canonicalTitle, normalizedQuery) {
		score += 60
		matched = appendUniqueString(matched, "canonical_title")
	}
	if strings.HasPrefix(canonicalTitle, normalizedQuery) {
		score += 20
	}
	for _, field := range []struct {
		name   string
		values []string
		score  int
	}{
		{name: "provider_handle", values: anyStrings(metadata["external_file_ids"]), score: 35},
		{name: "revision_hint", values: anyStrings(metadata["revision_hints"]), score: 25},
		{name: "artifact_hash", values: anyStrings(metadata["artifact_hashes"]), score: 40},
		{name: "fingerprint_hash", values: anyStrings(metadata["fingerprint_hashes"]), score: 40},
		{name: "comment_text", values: anyStrings(metadata["comment_bodies"]), score: 15},
		{name: "provider_url", values: anyStrings(metadata["web_urls"]), score: 15},
	} {
		for _, value := range field.values {
			if strings.Contains(strings.ToLower(strings.TrimSpace(value)), normalizedQuery) {
				score += field.score
				matched = appendUniqueString(matched, field.name)
				break
			}
		}
	}
	if score == 0 && strings.Contains(strings.ToLower(strings.TrimSpace(indexed.SearchText)), normalizedQuery) {
		score = 10
		matched = appendUniqueString(matched, "search_text")
	}
	if score == 0 {
		return SourceSearchResultSummary{}, 0, false
	}
	result.MatchedFields = matched
	return result, score, true
}

func (s DefaultSourceSearchService) buildSourceSearchResultSummary(ctx context.Context, scope stores.Scope, indexed stores.SourceSearchDocumentRecord) (SourceSearchResultSummary, map[string]any, bool) {
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, indexed.SourceDocumentID)
	if err != nil {
		return SourceSearchResultSummary{}, nil, false
	}
	revision := stores.SourceRevisionRecord{}
	if strings.TrimSpace(indexed.SourceRevisionID) != "" {
		revision, _ = s.lineage.GetSourceRevision(ctx, scope, indexed.SourceRevisionID)
	}
	metadata := decodeLineageMetadataJSON(indexed.MetadataJSON)
	handle := stores.SourceHandleRecord{}
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{SourceDocumentID: sourceDocument.ID})
	if err == nil {
		if strings.TrimSpace(indexed.ResultKind) == SourceManagementSearchResultSourceRevision && strings.TrimSpace(revision.ID) != "" {
			handle = sourceHandleForRevision(handles, revision)
		}
		if strings.TrimSpace(handle.ID) == "" {
			for _, candidate := range handles {
				if strings.EqualFold(strings.TrimSpace(candidate.HandleStatus), stores.SourceHandleStatusActive) {
					handle = candidate
				}
			}
		}
	}
	artifactHash := ""
	if hashes := anyStrings(metadata["artifact_hashes"]); len(hashes) > 0 {
		artifactHash = hashes[0]
	}
	resultKind := strings.TrimSpace(indexed.ResultKind)
	links := SourceManagementLinks{Self: sourceManagementSourcePath(sourceDocument.ID), Source: sourceManagementSourcePath(sourceDocument.ID)}
	if resultKind == SourceManagementSearchResultSourceRevision {
		links.Self = sourceManagementRevisionPath(indexed.SourceRevisionID)
	}
	return SourceSearchResultSummary{
		ResultKind:        resultKind,
		Source:            sourceLineageReference(sourceDocument),
		Revision:          sourceRevisionSummaryFromRecord(revision),
		Provider:          providerSummaryFromRevision(sourceDocument.ProviderKind, handle, revision, stores.SourceArtifactRecord{}),
		RelationshipState: strings.TrimSpace(indexed.RelationshipState),
		CommentSyncStatus: strings.TrimSpace(indexed.CommentSyncStatus),
		CommentCount:      indexed.CommentCount,
		HasComments:       indexed.HasComments,
		ArtifactHash:      artifactHash,
		Summary:           sourceSearchSummaryText(resultKind, indexed.CommentCount, indexed.RelationshipState),
		Links:             links,
	}, metadata, true
}

func sourceSearchSummaryText(resultKind string, commentCount int, relationshipState string) string {
	parts := make([]string, 0, 3)
	if strings.TrimSpace(resultKind) == SourceManagementSearchResultSourceRevision {
		parts = append(parts, "Revision match")
	} else {
		parts = append(parts, "Source match")
	}
	if strings.TrimSpace(relationshipState) != "" {
		parts = append(parts, "relationship "+strings.TrimSpace(relationshipState))
	}
	if commentCount > 0 {
		parts = append(parts, "comments available")
	}
	return strings.Join(parts, ", ")
}

func deterministicSourceSearchDocumentID(resultKind, sourceDocumentID, sourceRevisionID string) string {
	return uuid.NewSHA1(sourceSearchNamespace, []byte(strings.Join([]string{strings.TrimSpace(resultKind), strings.TrimSpace(sourceDocumentID), strings.TrimSpace(sourceRevisionID)}, "|"))).String()
}

func (s DefaultSourceSearchService) collectArtifactHashes(ctx context.Context, scope stores.Scope, revisions []stores.SourceRevisionRecord) []string {
	out := make([]string, 0)
	for _, revision := range revisions {
		artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{SourceRevisionID: revision.ID})
		if err != nil {
			continue
		}
		for _, artifact := range artifacts {
			out = appendUniqueString(out, strings.TrimSpace(artifact.SHA256))
		}
	}
	return out
}

func (s DefaultSourceSearchService) collectFingerprintHashes(ctx context.Context, scope stores.Scope, revisions []stores.SourceRevisionRecord) []string {
	out := make([]string, 0)
	for _, revision := range revisions {
		fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{SourceRevisionID: revision.ID})
		if err != nil {
			continue
		}
		for _, fingerprint := range fingerprints {
			out = appendUniqueString(out, strings.TrimSpace(fingerprint.NormalizedTextSHA256))
		}
	}
	return out
}

func sourceSearchRelationshipState(relationships []stores.SourceRelationshipRecord) string {
	hasConfirmed := false
	hasRejected := false
	hasSuperseded := false
	for _, relationship := range relationships {
		switch strings.TrimSpace(relationship.Status) {
		case stores.SourceRelationshipStatusPendingReview:
			return stores.SourceRelationshipStatusPendingReview
		case stores.SourceRelationshipStatusConfirmed:
			hasConfirmed = true
		case stores.SourceRelationshipStatusRejected:
			hasRejected = true
		case stores.SourceRelationshipStatusSuperseded:
			hasSuperseded = true
		}
	}
	switch {
	case hasConfirmed:
		return stores.SourceRelationshipStatusConfirmed
	case hasRejected:
		return stores.SourceRelationshipStatusRejected
	case hasSuperseded:
		return stores.SourceRelationshipStatusSuperseded
	default:
		return ""
	}
}

func aggregateSourceCommentSyncStatus(states []stores.SourceCommentSyncStateRecord) string {
	if len(states) == 0 {
		return SourceManagementCommentSyncNotConfigured
	}
	statuses := map[string]bool{}
	for _, state := range states {
		statuses[strings.TrimSpace(state.SyncStatus)] = true
	}
	switch {
	case statuses[SourceManagementCommentSyncFailed]:
		return SourceManagementCommentSyncFailed
	case statuses[SourceManagementCommentSyncPending]:
		return SourceManagementCommentSyncPending
	case statuses[SourceManagementCommentSyncStale]:
		return SourceManagementCommentSyncStale
	case statuses[SourceManagementCommentSyncSynced]:
		return SourceManagementCommentSyncSynced
	default:
		return SourceManagementCommentSyncNotConfigured
	}
}

func latestSourceCommentSyncState(states []stores.SourceCommentSyncStateRecord, sourceRevisionID string) *stores.SourceCommentSyncStateRecord {
	var latest *stores.SourceCommentSyncStateRecord
	for _, state := range states {
		if strings.TrimSpace(state.SourceRevisionID) != strings.TrimSpace(sourceRevisionID) {
			continue
		}
		state := state
		if latest == nil || state.UpdatedAt.After(latest.UpdatedAt) {
			latest = &state
		}
	}
	return latest
}

func filterSourceCommentThreadsByRevision(threads []stores.SourceCommentThreadRecord, sourceRevisionID string) []stores.SourceCommentThreadRecord {
	out := make([]stores.SourceCommentThreadRecord, 0)
	for _, thread := range threads {
		if strings.TrimSpace(thread.SourceRevisionID) == strings.TrimSpace(sourceRevisionID) {
			out = append(out, thread)
		}
	}
	return out
}

func sourceCommentBodies(threads []stores.SourceCommentThreadRecord) []string {
	out := make([]string, 0, len(threads))
	for _, thread := range threads {
		if body := strings.TrimSpace(thread.BodyPreview); body != "" {
			out = append(out, body)
		}
	}
	return out
}

func uniqueHandleValues(records []stores.SourceHandleRecord, field func(stores.SourceHandleRecord) string) []string {
	out := make([]string, 0)
	for _, record := range records {
		out = appendUniqueString(out, strings.TrimSpace(field(record)))
	}
	return out
}

func uniqueRevisionValues(records []stores.SourceRevisionRecord, field func(stores.SourceRevisionRecord) string) []string {
	out := make([]string, 0)
	for _, record := range records {
		out = appendUniqueString(out, strings.TrimSpace(field(record)))
	}
	return out
}

func anyStrings(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			value := strings.TrimSpace(fmt.Sprint(item))
			if value != "" {
				out = append(out, value)
			}
		}
		return out
	default:
		return nil
	}
}

func containsFold(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), target) {
			return true
		}
	}
	return false
}

func (s DefaultSourceSearchService) sourceSearchIndexNeedsRefresh(ctx context.Context, scope stores.Scope, sourceDocument stores.SourceDocumentRecord) (bool, error) {
	indexed, err := s.lineage.ListSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{
		SourceDocumentID: sourceDocument.ID,
	})
	if err != nil {
		return false, err
	}
	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return false, err
	}
	if len(indexed) == 0 {
		return true, nil
	}
	hasDocumentResult := false
	revisionResultIDs := make(map[string]struct{}, len(revisions))
	latestIndexedAt := time.Time{}
	for _, record := range indexed {
		if record.IndexedAt.After(latestIndexedAt) {
			latestIndexedAt = record.IndexedAt
		}
		if record.UpdatedAt.After(latestIndexedAt) {
			latestIndexedAt = record.UpdatedAt
		}
		switch strings.TrimSpace(record.ResultKind) {
		case SourceManagementSearchResultSourceDocument:
			hasDocumentResult = true
		case SourceManagementSearchResultSourceRevision:
			revisionResultIDs[strings.TrimSpace(record.SourceRevisionID)] = struct{}{}
		}
	}
	if !hasDocumentResult {
		return true, nil
	}
	for _, revision := range revisions {
		if _, ok := revisionResultIDs[strings.TrimSpace(revision.ID)]; !ok {
			return true, nil
		}
	}
	if len(revisionResultIDs) != len(revisions) {
		return true, nil
	}
	latestActivityAt, err := s.sourceSearchLastChangedAt(ctx, scope, sourceDocument, revisions)
	if err != nil {
		return false, err
	}
	return latestIndexedAt.Before(latestActivityAt), nil
}

func (s DefaultSourceSearchService) sourceSearchLastChangedAt(ctx context.Context, scope stores.Scope, sourceDocument stores.SourceDocumentRecord, revisions []stores.SourceRevisionRecord) (time.Time, error) {
	latest := sourceDocument.UpdatedAt.UTC()
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return time.Time{}, err
	}
	for _, handle := range handles {
		latest = maxSourceSearchTime(latest, handle.UpdatedAt, handle.CreatedAt)
	}
	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return time.Time{}, err
	}
	for _, relationship := range relationships {
		latest = maxSourceSearchTime(latest, relationship.UpdatedAt, relationship.CreatedAt)
	}
	threads, err := s.lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{
		SourceDocumentID: sourceDocument.ID,
		IncludeDeleted:   true,
	})
	if err != nil {
		return time.Time{}, err
	}
	for _, thread := range threads {
		latest = maxSourceSearchTime(latest, thread.UpdatedAt, thread.CreatedAt)
		if thread.LastActivityAt != nil {
			latest = maxSourceSearchTime(latest, thread.LastActivityAt.UTC())
		}
		if thread.LastSyncedAt != nil {
			latest = maxSourceSearchTime(latest, thread.LastSyncedAt.UTC())
		}
	}
	states, err := s.lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{SourceDocumentID: sourceDocument.ID})
	if err != nil {
		return time.Time{}, err
	}
	for _, state := range states {
		latest = maxSourceSearchTime(latest, state.UpdatedAt, state.CreatedAt)
		if state.LastAttemptAt != nil {
			latest = maxSourceSearchTime(latest, state.LastAttemptAt.UTC())
		}
		if state.LastSyncedAt != nil {
			latest = maxSourceSearchTime(latest, state.LastSyncedAt.UTC())
		}
	}
	for _, revision := range revisions {
		latest = maxSourceSearchTime(latest, revision.UpdatedAt, revision.CreatedAt)
		artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{SourceRevisionID: revision.ID})
		if err != nil {
			return time.Time{}, err
		}
		for _, artifact := range artifacts {
			latest = maxSourceSearchTime(latest, artifact.UpdatedAt, artifact.CreatedAt)
		}
		fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{SourceRevisionID: revision.ID})
		if err != nil {
			return time.Time{}, err
		}
		for _, fingerprint := range fingerprints {
			latest = maxSourceSearchTime(latest, fingerprint.CreatedAt)
		}
	}
	return latest, nil
}

func maxSourceSearchTime(current time.Time, candidates ...time.Time) time.Time {
	latest := current.UTC()
	for _, candidate := range candidates {
		if candidate.IsZero() {
			continue
		}
		candidate = candidate.UTC()
		if candidate.After(latest) {
			latest = candidate
		}
	}
	return latest
}

func sortIndexedSourceSearchResults(items []scoredSourceSearchResult, sortKey string) {
	switch normalizeSourceSearchSort(sortKey) {
	case sourceSearchSortTitleAsc:
		sort.SliceStable(items, func(i, j int) bool {
			left := searchResultTitle(items[i].result)
			right := searchResultTitle(items[j].result)
			if left == right {
				return items[i].result.ResultKind < items[j].result.ResultKind
			}
			return left < right
		})
	default:
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].score == items[j].score {
				return searchResultTitle(items[i].result) < searchResultTitle(items[j].result)
			}
			return items[i].score > items[j].score
		})
	}
}
