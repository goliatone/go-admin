package services

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	reconciliationQueueSortUpdatedDesc    = "updated_desc"
	reconciliationQueueSortConfidenceDesc = "confidence_desc"
)

func (s DefaultSourceReadModelService) ListReconciliationQueue(ctx context.Context, scope stores.Scope, query ReconciliationQueueQuery) (ReconciliationQueuePage, error) {
	normalized := normalizeReconciliationQueueQuery(query)
	page := ReconciliationQueuePage{
		Items:        []ReconciliationQueueItem{},
		AppliedQuery: normalized,
		Permissions:  defaultSourceManagementPermissions(),
		Links:        SourceManagementLinks{Self: sourceManagementReconciliationQueuePath(), Queue: sourceManagementReconciliationQueuePath()},
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}

	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		Status: stores.SourceRelationshipStatusPendingReview,
	})
	if err != nil {
		return page, err
	}
	if len(relationships) == 0 {
		page.PageInfo = fixedSourceManagementPageInfo(0, 0, normalized.Sort)
		page.EmptyState = sourceCollectionEmptyState(true, "No queue candidates", "There are no pending reconciliation candidates for the current filters.")
		return page, nil
	}

	recordsByID, resolvedByID, err := s.reconciliationQueueContexts(ctx, scope, relationships)
	if err != nil {
		return page, err
	}

	filtered := make([]stores.SourceRelationshipRecord, 0, len(relationships))
	for _, relationship := range relationships {
		left := recordsByID[strings.TrimSpace(relationship.LeftSourceDocumentID)]
		right := recordsByID[strings.TrimSpace(relationship.RightSourceDocumentID)]
		if !matchesReconciliationQueueQuery(normalized, relationship, left, right, s.now()) {
			continue
		}
		filtered = append(filtered, relationship)
	}
	sortReconciliationQueueRelationships(filtered, normalized.Sort)

	paged, pageInfo := paginateSourceManagement(filtered, normalized.Page, normalized.PageSize, normalized.Sort)
	items := make([]ReconciliationQueueItem, 0, len(paged))
	for _, relationship := range paged {
		item, err := s.buildReconciliationQueueItem(ctx, scope, relationship, recordsByID, resolvedByID)
		if err != nil {
			return page, err
		}
		items = append(items, item)
	}
	page.Items = items
	page.PageInfo = pageInfo
	page.EmptyState = sourceCollectionEmptyState(len(items) == 0, "No queue candidates", "There are no pending reconciliation candidates for the current filters.")
	return page, nil
}

func (s DefaultSourceReadModelService) GetReconciliationCandidate(ctx context.Context, scope stores.Scope, relationshipID string) (ReconciliationCandidateDetail, error) {
	detail := ReconciliationCandidateDetail{
		Permissions: defaultSourceManagementPermissions(),
		Links:       SourceManagementLinks{Queue: sourceManagementReconciliationQueuePath()},
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	if s.lineage == nil {
		return detail, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	relationship, err := s.lineage.GetSourceRelationship(ctx, scope, strings.TrimSpace(relationshipID))
	if err != nil {
		return detail, err
	}
	recordsByID, resolvedByID, err := s.reconciliationQueueContexts(ctx, scope, []stores.SourceRelationshipRecord{relationship})
	if err != nil {
		return detail, err
	}
	left := recordsByID[strings.TrimSpace(relationship.LeftSourceDocumentID)]
	right := recordsByID[strings.TrimSpace(relationship.RightSourceDocumentID)]
	candidate := buildReconciliationQueueRelationshipSummary(relationship, left, right)
	detail.Candidate = &candidate
	leftResolved := resolvedByID[strings.TrimSpace(left.ID)]
	rightResolved := resolvedByID[strings.TrimSpace(right.ID)]
	leftSummary := buildReconciliationQueueSourceSummary(leftResolved)
	rightSummary := buildReconciliationQueueSourceSummary(rightResolved)
	detail.LeftSource = &leftSummary
	detail.RightSource = &rightSummary
	detail.Evidence = append([]CandidateEvidenceSummary{}, candidate.Evidence...)
	detail.AuditTrail = reconciliationAuditTrail(relationship)
	detail.Actions = availableReconciliationReviewActions(relationship, left, right)
	detail.Links = SourceManagementLinks{
		Self:   sourceManagementReconciliationCandidatePath(relationship.ID),
		Queue:  sourceManagementReconciliationQueuePath(),
		Review: sourceManagementReconciliationCandidateReviewPath(relationship.ID),
	}
	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	if revisionID := lineageMetadataString(evidence, "candidate_source_revision_id"); revisionID != "" {
		if revision, err := s.lineage.GetSourceRevision(ctx, scope, revisionID); err == nil {
			if resolved, ok := resolvedByID[strings.TrimSpace(revision.SourceDocumentID)]; ok {
				detail.MatchedSourceRevision = sourceManagementRevisionSummary(revision, resolved)
			}
		}
	}
	if artifactID := lineageMetadataString(evidence, "candidate_source_artifact_id"); artifactID != "" {
		if artifact, err := s.lineage.GetSourceArtifact(ctx, scope, artifactID); err == nil {
			detail.MatchedSourceArtifact = sourceArtifactSummaryFromRecord(artifact)
		}
	}
	return detail, nil
}

func (s DefaultSourceReadModelService) reconciliationQueueContexts(ctx context.Context, scope stores.Scope, relationships []stores.SourceRelationshipRecord) (map[string]stores.SourceDocumentRecord, map[string]sourceManagementContext, error) {
	sourceIDs := make([]string, 0, len(relationships)*2)
	recordsByID := map[string]stores.SourceDocumentRecord{}
	for _, relationship := range relationships {
		for _, sourceID := range []string{relationship.LeftSourceDocumentID, relationship.RightSourceDocumentID} {
			sourceID = strings.TrimSpace(sourceID)
			if sourceID == "" {
				continue
			}
			if _, ok := recordsByID[sourceID]; ok {
				continue
			}
			record, err := s.lineage.GetSourceDocument(ctx, scope, sourceID)
			if err != nil {
				return nil, nil, err
			}
			recordsByID[sourceID] = record
			sourceIDs = append(sourceIDs, sourceID)
		}
	}
	records := make([]stores.SourceDocumentRecord, 0, len(sourceIDs))
	for _, sourceID := range sourceIDs {
		records = append(records, recordsByID[sourceID])
	}
	resolvedByID, err := s.resolveSourceManagementContexts(ctx, scope, records)
	if err != nil {
		return nil, nil, err
	}
	return recordsByID, resolvedByID, nil
}

func (s DefaultSourceReadModelService) buildReconciliationQueueItem(
	ctx context.Context,
	scope stores.Scope,
	relationship stores.SourceRelationshipRecord,
	recordsByID map[string]stores.SourceDocumentRecord,
	resolvedByID map[string]sourceManagementContext,
) (ReconciliationQueueItem, error) {
	left := recordsByID[strings.TrimSpace(relationship.LeftSourceDocumentID)]
	right := recordsByID[strings.TrimSpace(relationship.RightSourceDocumentID)]
	summary := buildReconciliationQueueRelationshipSummary(relationship, left, right)
	leftResolved := resolvedByID[strings.TrimSpace(left.ID)]
	rightResolved := resolvedByID[strings.TrimSpace(right.ID)]
	leftSummary := buildReconciliationQueueSourceSummary(leftResolved)
	rightSummary := buildReconciliationQueueSourceSummary(rightResolved)
	ageDays, ageBand := reconciliationQueueAge(relationship, s.now())
	item := ReconciliationQueueItem{
		Candidate:    &summary,
		LeftSource:   &leftSummary,
		RightSource:  &rightSummary,
		QueueAgeBand: ageBand,
		QueueAgeDays: ageDays,
		UpdatedAt:    sourceRelationshipUpdatedAt(relationship),
		Actions:      availableReconciliationReviewActions(relationship, left, right),
		Links: SourceManagementLinks{
			Self:   sourceManagementReconciliationCandidatePath(relationship.ID),
			Queue:  sourceManagementReconciliationQueuePath(),
			Review: sourceManagementReconciliationCandidateReviewPath(relationship.ID),
		},
	}
	return item, nil
}

func buildReconciliationQueueRelationshipSummary(
	relationship stores.SourceRelationshipRecord,
	left stores.SourceDocumentRecord,
	right stores.SourceDocumentRecord,
) SourceRelationshipSummary {
	summary := candidateWarningSummaryFromRelationship(relationship)
	return SourceRelationshipSummary{
		ID:                  summary.ID,
		RelationshipType:    summary.RelationshipType,
		RelationshipKind:    sourceRelationshipKind(relationship.RelationshipType),
		Status:              summary.Status,
		CounterpartRole:     SourceRelationshipRoleRelated,
		ConfidenceBand:      summary.ConfidenceBand,
		ConfidenceScore:     summary.ConfidenceScore,
		Summary:             sourceRelationshipSummaryText(sourceRelationshipKind(relationship.RelationshipType), SourceRelationshipRoleRelated, summary.Status),
		LeftSource:          sourceLineageReference(left),
		RightSource:         sourceLineageReference(right),
		ReviewActionVisible: summary.ReviewActionVisible,
		Evidence:            append([]CandidateEvidenceSummary{}, summary.Evidence...),
		Links: SourceManagementLinks{
			Queue:  sourceManagementReconciliationQueuePath(),
			Review: sourceManagementReconciliationCandidateReviewPath(relationship.ID),
			Self:   sourceManagementReconciliationCandidatePath(relationship.ID),
		},
	}
}

func buildReconciliationQueueSourceSummary(resolved sourceManagementContext) ReconciliationQueueSourceSummary {
	return ReconciliationQueueSourceSummary{
		Source:                sourceLineageReference(resolved.sourceDocument),
		Status:                strings.TrimSpace(resolved.sourceDocument.Status),
		LineageConfidence:     strings.TrimSpace(resolved.sourceDocument.LineageConfidence),
		Provider:              providerSummaryFromRevision(resolved.sourceDocument.ProviderKind, resolved.activeHandle, resolved.latestRevision, stores.SourceArtifactRecord{}),
		ActiveHandle:          optionalSourceHandleSummary(resolved.activeHandle),
		LatestRevision:        sourceManagementRevisionSummary(resolved.latestRevision, resolved),
		PendingCandidateCount: pendingRelationshipCount(resolved.relationships),
		Permissions:           defaultSourceManagementPermissions(),
		Links: SourceManagementLinks{
			Self:          sourceManagementSourcePath(resolved.sourceDocument.ID),
			Source:        sourceManagementSourcePath(resolved.sourceDocument.ID),
			Workspace:     sourceManagementSourceWorkspacePath(resolved.sourceDocument.ID),
			Relationships: sourceManagementSourceRelationshipsPath(resolved.sourceDocument.ID),
			Queue:         sourceManagementReconciliationQueuePath(),
		},
	}
}

func normalizeReconciliationQueueQuery(query ReconciliationQueueQuery) ReconciliationQueueQuery {
	query.ConfidenceBand = strings.TrimSpace(query.ConfidenceBand)
	query.RelationshipType = strings.TrimSpace(query.RelationshipType)
	query.ProviderKind = strings.TrimSpace(query.ProviderKind)
	query.SourceStatus = strings.TrimSpace(query.SourceStatus)
	query.AgeBand = normalizeReconciliationQueueAgeBand(query.AgeBand)
	query.Sort = normalizeReconciliationQueueSort(query.Sort)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func normalizeReconciliationQueueAgeBand(value string) string {
	switch strings.TrimSpace(value) {
	case ReconciliationQueueAgeBandLT7D:
		return ReconciliationQueueAgeBandLT7D
	case ReconciliationQueueAgeBand7To30D:
		return ReconciliationQueueAgeBand7To30D
	case ReconciliationQueueAgeBandGT30D:
		return ReconciliationQueueAgeBandGT30D
	default:
		return ""
	}
}

func normalizeReconciliationQueueSort(value string) string {
	switch strings.TrimSpace(value) {
	case reconciliationQueueSortUpdatedDesc:
		return reconciliationQueueSortUpdatedDesc
	default:
		return reconciliationQueueSortConfidenceDesc
	}
}

func matchesReconciliationQueueQuery(query ReconciliationQueueQuery, relationship stores.SourceRelationshipRecord, left, right stores.SourceDocumentRecord, now time.Time) bool {
	if query.ConfidenceBand != "" && !strings.EqualFold(strings.TrimSpace(relationship.ConfidenceBand), query.ConfidenceBand) {
		return false
	}
	if query.RelationshipType != "" && !strings.EqualFold(strings.TrimSpace(relationship.RelationshipType), query.RelationshipType) {
		return false
	}
	if query.ProviderKind != "" &&
		!strings.EqualFold(strings.TrimSpace(left.ProviderKind), query.ProviderKind) &&
		!strings.EqualFold(strings.TrimSpace(right.ProviderKind), query.ProviderKind) {
		return false
	}
	if query.SourceStatus != "" &&
		!strings.EqualFold(strings.TrimSpace(left.Status), query.SourceStatus) &&
		!strings.EqualFold(strings.TrimSpace(right.Status), query.SourceStatus) {
		return false
	}
	if query.AgeBand != "" {
		_, ageBand := reconciliationQueueAge(relationship, now)
		if ageBand != query.AgeBand {
			return false
		}
	}
	return true
}

func sortReconciliationQueueRelationships(items []stores.SourceRelationshipRecord, sortKey string) {
	sort.SliceStable(items, func(i, j int) bool {
		if sortKey == reconciliationQueueSortUpdatedDesc {
			left := sourceRelationshipSortTime(items[i])
			right := sourceRelationshipSortTime(items[j])
			if left.Equal(right) {
				return items[i].ID < items[j].ID
			}
			return left.After(right)
		}
		if items[i].ConfidenceScore == items[j].ConfidenceScore {
			left := sourceRelationshipSortTime(items[i])
			right := sourceRelationshipSortTime(items[j])
			if left.Equal(right) {
				return items[i].ID < items[j].ID
			}
			return left.After(right)
		}
		return items[i].ConfidenceScore > items[j].ConfidenceScore
	})
}

func reconciliationQueueAge(relationship stores.SourceRelationshipRecord, now time.Time) (int, string) {
	updatedAt := sourceRelationshipSortTime(relationship)
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if updatedAt.After(now) {
		return 0, ReconciliationQueueAgeBandLT7D
	}
	ageDays := int(now.Sub(updatedAt).Hours() / 24)
	switch {
	case ageDays < 7:
		return ageDays, ReconciliationQueueAgeBandLT7D
	case ageDays <= 30:
		return ageDays, ReconciliationQueueAgeBand7To30D
	default:
		return ageDays, ReconciliationQueueAgeBandGT30D
	}
}

func availableReconciliationReviewActions(relationship stores.SourceRelationshipRecord, left, right stores.SourceDocumentRecord) []ReconciliationReviewAction {
	pending := strings.EqualFold(strings.TrimSpace(relationship.Status), stores.SourceRelationshipStatusPendingReview)
	superseded := strings.EqualFold(strings.TrimSpace(relationship.Status), stores.SourceRelationshipStatusSuperseded)
	mergeAvailable := pending &&
		!strings.EqualFold(strings.TrimSpace(left.Status), stores.SourceDocumentStatusMerged) &&
		!strings.EqualFold(strings.TrimSpace(right.Status), stores.SourceDocumentStatusMerged)
	attachAvailable := pending
	relatedAvailable := pending
	rejectAvailable := pending
	supersedeAvailable := !superseded
	return []ReconciliationReviewAction{
		{ID: SourceRelationshipActionAttach, Label: "Attach Handle", RequiresReason: true, Available: attachAvailable, DisabledReason: disabledReasonForAction(attachAvailable, "candidate is no longer pending review"), Tone: "confirm"},
		{ID: SourceRelationshipActionMerge, Label: "Merge Sources", RequiresReason: true, Available: mergeAvailable, DisabledReason: disabledReasonForAction(mergeAvailable, "merged sources cannot be merged again"), Tone: "warn"},
		{ID: SourceRelationshipActionRelated, Label: "Confirm Related", RequiresReason: true, Available: relatedAvailable, DisabledReason: disabledReasonForAction(relatedAvailable, "candidate is no longer pending review"), Tone: "confirm"},
		{ID: SourceRelationshipActionReject, Label: "Reject", RequiresReason: true, Available: rejectAvailable, DisabledReason: disabledReasonForAction(rejectAvailable, "candidate is no longer pending review"), Tone: "danger"},
		{ID: SourceRelationshipActionSupersede, Label: "Supersede", RequiresReason: true, Available: supersedeAvailable, DisabledReason: disabledReasonForAction(supersedeAvailable, "candidate is already superseded"), Tone: "secondary"},
	}
}

func disabledReasonForAction(available bool, reason string) string {
	if available {
		return ""
	}
	return strings.TrimSpace(reason)
}

func reconciliationAuditTrail(relationship stores.SourceRelationshipRecord) []ReconciliationAuditEntry {
	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	raw, ok := evidence["review_audit"].([]any)
	if !ok || len(raw) == 0 {
		return nil
	}
	out := make([]ReconciliationAuditEntry, 0, len(raw))
	for _, entry := range raw {
		decoded, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		createdAt, _ := time.Parse(time.RFC3339Nano, lineageMetadataString(decoded, "created_at"))
		audit := ReconciliationAuditEntry{
			ID:         lineageMetadataString(decoded, "id"),
			Action:     lineageMetadataString(decoded, "action"),
			ActorID:    lineageMetadataString(decoded, "actor_id"),
			Reason:     lineageMetadataString(decoded, "reason"),
			FromStatus: lineageMetadataString(decoded, "from_status"),
			ToStatus:   lineageMetadataString(decoded, "to_status"),
			Summary:    lineageMetadataString(decoded, "summary"),
		}
		if !createdAt.IsZero() {
			audit.CreatedAt = &createdAt
		}
		out = append(out, audit)
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := time.Time{}
		right := time.Time{}
		if out[i].CreatedAt != nil {
			left = out[i].CreatedAt.UTC()
		}
		if out[j].CreatedAt != nil {
			right = out[j].CreatedAt.UTC()
		}
		if left.Equal(right) {
			return out[i].ID < out[j].ID
		}
		return left.After(right)
	})
	return out
}

func sourceRelationshipUpdatedAt(relationship stores.SourceRelationshipRecord) *time.Time {
	value := sourceRelationshipSortTime(relationship)
	if value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func sourceRelationshipSortTime(relationship stores.SourceRelationshipRecord) time.Time {
	if !relationship.UpdatedAt.IsZero() {
		return relationship.UpdatedAt.UTC()
	}
	return relationship.CreatedAt.UTC()
}

func sourceManagementReconciliationQueuePath() string {
	return DefaultSourceManagementBasePath + "/reconciliation-queue"
}

func sourceManagementReconciliationCandidatePath(relationshipID string) string {
	relationshipID = strings.TrimSpace(relationshipID)
	if relationshipID == "" {
		return sourceManagementReconciliationQueuePath()
	}
	return sourceManagementReconciliationQueuePath() + "/" + relationshipID
}

func sourceManagementReconciliationCandidateReviewPath(relationshipID string) string {
	relationshipID = strings.TrimSpace(relationshipID)
	if relationshipID == "" {
		return sourceManagementReconciliationQueuePath()
	}
	return sourceManagementReconciliationCandidatePath(relationshipID) + "/review"
}
