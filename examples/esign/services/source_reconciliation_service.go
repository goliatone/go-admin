package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type SourceReconciliationPolicy struct {
	AutoConfirmExactArtifactMatches bool `json:"auto_confirm_exact_artifact_matches"`
	AttachHandlesOnConfirm          bool `json:"attach_handles_on_confirm"`
	AttachHandlesOnAutoConfirm      bool `json:"attach_handles_on_auto_confirm"`
}

func DefaultSourceReconciliationPolicy() SourceReconciliationPolicy {
	return SourceReconciliationPolicy{
		AutoConfirmExactArtifactMatches: true,
		AttachHandlesOnConfirm:          true,
		AttachHandlesOnAutoConfirm:      true,
	}
}

type DefaultSourceReconciliationService struct {
	lineage stores.LineageStore
	now     func() time.Time
	policy  SourceReconciliationPolicy
}

type SourceReconciliationServiceOption func(*DefaultSourceReconciliationService)

func WithSourceReconciliationClock(now func() time.Time) SourceReconciliationServiceOption {
	return func(s *DefaultSourceReconciliationService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func WithSourceReconciliationPolicy(policy SourceReconciliationPolicy) SourceReconciliationServiceOption {
	return func(s *DefaultSourceReconciliationService) {
		if s == nil {
			return
		}
		s.policy = policy
	}
}

func NewDefaultSourceReconciliationService(lineage stores.LineageStore, opts ...SourceReconciliationServiceOption) DefaultSourceReconciliationService {
	svc := DefaultSourceReconciliationService{
		lineage: lineage,
		now:     func() time.Time { return time.Now().UTC() },
		policy:  DefaultSourceReconciliationPolicy(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s DefaultSourceReconciliationService) forTx(tx stores.TxStore) DefaultSourceReconciliationService {
	txSvc := s
	if lineage, ok := tx.(stores.LineageStore); ok {
		txSvc.lineage = lineage
	}
	return txSvc
}

func (s DefaultSourceReconciliationService) EvaluateCandidates(ctx context.Context, scope stores.Scope, input SourceReconciliationInput) (SourceReconciliationResult, error) {
	if s.lineage == nil {
		return SourceReconciliationResult{}, domainValidationError("lineage_reconciliation", "lineage", "not configured")
	}
	if txManager, ok := any(s.lineage).(stores.TransactionManager); ok {
		result := SourceReconciliationResult{}
		err := txManager.WithTx(ctx, func(tx stores.TxStore) error {
			evaluated, err := s.forTx(tx).evaluateCandidates(ctx, scope, input)
			if err != nil {
				return err
			}
			result = evaluated
			return nil
		})
		return result, err
	}
	return s.evaluateCandidates(ctx, scope, input)
}

func (s DefaultSourceReconciliationService) evaluateCandidates(ctx context.Context, scope stores.Scope, input SourceReconciliationInput) (SourceReconciliationResult, error) {
	sourceDocumentID := strings.TrimSpace(input.SourceDocumentID)
	sourceRevisionID := strings.TrimSpace(input.SourceRevisionID)
	artifactID := strings.TrimSpace(input.ArtifactID)
	if sourceDocumentID == "" || sourceRevisionID == "" || artifactID == "" {
		return SourceReconciliationResult{}, domainValidationError("lineage_reconciliation", "source_document_id|source_revision_id|artifact_id", "required")
	}

	targetDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceReconciliationResult{}, err
	}
	targetRevision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceReconciliationResult{}, err
	}
	targetArtifact, err := s.lineage.GetSourceArtifact(ctx, scope, artifactID)
	if err != nil {
		return SourceReconciliationResult{}, err
	}
	targetFingerprint := s.latestReadyFingerprint(ctx, scope, targetRevision.ID, targetArtifact.ID)
	documents, err := s.lineage.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{
		ProviderKind: targetDocument.ProviderKind,
		Status:       stores.SourceDocumentStatusActive,
	})
	if err != nil {
		return SourceReconciliationResult{}, err
	}

	candidates := make([]CandidateWarningSummary, 0)
	for _, candidateDocument := range documents {
		if strings.TrimSpace(candidateDocument.ID) == sourceDocumentID {
			continue
		}
		leftID, rightID := orderedRelationshipIDs(sourceDocumentID, strings.TrimSpace(candidateDocument.ID))
		existing, err := s.findRelationshipPair(ctx, scope, leftID, rightID)
		if err != nil {
			return SourceReconciliationResult{}, err
		}
		evaluation, err := s.scoreCandidate(ctx, scope, targetDocument, targetRevision, targetArtifact, targetFingerprint, input.Metadata, candidateDocument)
		if err != nil {
			return SourceReconciliationResult{}, err
		}
		if evaluation.band == stores.LineageConfidenceBandNone {
			if strings.TrimSpace(existing.Status) == stores.SourceRelationshipStatusPendingReview {
				if err := s.supersedeRelationshipPair(ctx, scope, sourceDocumentID, candidateDocument.ID, "reevaluated_below_threshold", strings.TrimSpace(input.ActorID)); err != nil {
					return SourceReconciliationResult{}, err
				}
			}
			continue
		}
		relationship, err := s.upsertEvaluatedRelationship(ctx, scope, input, evaluation, existing)
		if err != nil {
			return SourceReconciliationResult{}, err
		}
		if relationship.Status == stores.SourceRelationshipStatusConfirmed && evaluation.exactArtifactMatch && s.policy.AttachHandlesOnAutoConfirm {
			if _, _, err := s.attachHandlesForRelationship(ctx, scope, relationship); err != nil {
				return SourceReconciliationResult{}, err
			}
		}
		if strings.TrimSpace(relationship.Status) == stores.SourceRelationshipStatusPendingReview {
			candidates = append(candidates, candidateWarningSummaryFromRelationship(relationship))
		}
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].ConfidenceScore == candidates[j].ConfidenceScore {
			return candidates[i].ID < candidates[j].ID
		}
		return candidates[i].ConfidenceScore > candidates[j].ConfidenceScore
	})
	result := SourceReconciliationResult{Candidates: candidates}
	if len(candidates) > 0 {
		result.PrimaryCandidate = &candidates[0]
	}
	return result, nil
}

func (s DefaultSourceReconciliationService) ApplyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, error) {
	if s.lineage == nil {
		return CandidateWarningSummary{}, domainValidationError("lineage_reconciliation", "lineage", "not configured")
	}
	if txManager, ok := any(s.lineage).(stores.TransactionManager); ok {
		summary := CandidateWarningSummary{}
		err := txManager.WithTx(ctx, func(tx stores.TxStore) error {
			updated, err := s.forTx(tx).applyReviewAction(ctx, scope, input)
			if err != nil {
				return err
			}
			summary = updated
			return nil
		})
		return summary, err
	}
	return s.applyReviewAction(ctx, scope, input)
}

func (s DefaultSourceReconciliationService) applyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, error) {
	relationshipID := strings.TrimSpace(input.RelationshipID)
	action := strings.TrimSpace(strings.ToLower(input.Action))
	if relationshipID == "" || action == "" {
		return CandidateWarningSummary{}, domainValidationError("lineage_reconciliation", "relationship_id|action", "required")
	}
	relationship, err := s.lineage.GetSourceRelationship(ctx, scope, relationshipID)
	if err != nil {
		return CandidateWarningSummary{}, err
	}
	if strings.TrimSpace(relationship.Status) == stores.SourceRelationshipStatusSuperseded && action != SourceRelationshipActionSupersede {
		return CandidateWarningSummary{}, domainValidationError("lineage_reconciliation", "relationship", "superseded candidates are immutable")
	}

	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	evidence["review_action"] = action
	evidence["reviewed_by_user_id"] = strings.TrimSpace(input.ActorID)
	evidence["review_reason"] = strings.TrimSpace(input.Reason)
	evidence["reviewed_at"] = s.now().UTC().Format(time.RFC3339Nano)

	switch action {
	case SourceRelationshipActionConfirm:
		relationship.Status = stores.SourceRelationshipStatusConfirmed
		if s.policy.AttachHandlesOnConfirm {
			canonicalID, attachedHandles, err := s.attachHandlesForRelationship(ctx, scope, relationship)
			if err != nil {
				return CandidateWarningSummary{}, err
			}
			if canonicalID != "" {
				evidence["canonical_source_document_id"] = canonicalID
			}
			evidence["attached_handle_count"] = attachedHandles
		}
	case SourceRelationshipActionReject:
		relationship.Status = stores.SourceRelationshipStatusRejected
	case SourceRelationshipActionSupersede:
		relationship.Status = stores.SourceRelationshipStatusSuperseded
	default:
		return CandidateWarningSummary{}, domainValidationError("lineage_reconciliation", "action", "unsupported")
	}

	encoded, err := json.Marshal(evidence)
	if err != nil {
		return CandidateWarningSummary{}, err
	}
	relationship.EvidenceJSON = string(encoded)
	relationship.UpdatedAt = s.now().UTC()
	relationship, err = s.lineage.SaveSourceRelationship(ctx, scope, relationship)
	if err != nil {
		return CandidateWarningSummary{}, err
	}
	return candidateWarningSummaryFromRelationship(relationship), nil
}

func (s DefaultSourceReconciliationService) ListCandidateRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]stores.SourceRelationshipRecord, error) {
	if s.lineage == nil {
		return nil, domainValidationError("lineage_reconciliation", "lineage", "not configured")
	}
	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: strings.TrimSpace(sourceDocumentID),
	})
	if err != nil {
		return nil, err
	}
	sort.SliceStable(relationships, func(i, j int) bool {
		if relationships[i].UpdatedAt.Equal(relationships[j].UpdatedAt) {
			return relationships[i].ID < relationships[j].ID
		}
		return relationships[i].UpdatedAt.After(relationships[j].UpdatedAt)
	})
	return relationships, nil
}

type reconciliationTargetContext struct {
	document    stores.SourceDocumentRecord
	handle      stores.SourceHandleRecord
	revision    stores.SourceRevisionRecord
	artifact    stores.SourceArtifactRecord
	fingerprint stores.SourceFingerprintRecord
}

type candidateScoreEvaluation struct {
	candidateDocument  stores.SourceDocumentRecord
	score              float64
	band               string
	relationshipType   string
	status             string
	evidence           map[string]any
	exactArtifactMatch bool
}

func (s DefaultSourceReconciliationService) scoreCandidate(
	ctx context.Context,
	scope stores.Scope,
	targetDocument stores.SourceDocumentRecord,
	targetRevision stores.SourceRevisionRecord,
	targetArtifact stores.SourceArtifactRecord,
	targetFingerprint stores.SourceFingerprintRecord,
	metadata SourceMetadataBaseline,
	candidateDocument stores.SourceDocumentRecord,
) (candidateScoreEvaluation, error) {
	candidate, err := s.resolveCandidateContext(ctx, scope, candidateDocument.ID)
	if err != nil {
		if isNotFound(err) {
			return candidateScoreEvaluation{band: stores.LineageConfidenceBandNone}, nil
		}
		return candidateScoreEvaluation{}, err
	}

	titleSimilarity := reconciliationTitleSimilarity(targetDocument.CanonicalTitle, candidate.document.CanonicalTitle, metadata.TitleHint)
	chunkOverlap := reconciliationChunkOverlap(targetFingerprint, candidate.fingerprint)
	normalizedSimilarity := reconciliationNormalizedTextSimilarity(targetFingerprint, candidate.fingerprint)
	exactArtifactMatch := strings.TrimSpace(targetArtifact.SHA256) != "" && strings.TrimSpace(targetArtifact.SHA256) == strings.TrimSpace(candidate.artifact.SHA256)
	accountMatch := strings.TrimSpace(metadata.AccountID) != "" && strings.EqualFold(strings.TrimSpace(metadata.AccountID), strings.TrimSpace(candidate.handle.AccountID))
	webURLMatch := strings.TrimSpace(metadata.WebURL) != "" && strings.EqualFold(strings.TrimSpace(metadata.WebURL), strings.TrimSpace(candidate.handle.WebURL))
	ownerMatch := strings.TrimSpace(metadata.OwnerEmail) != "" && strings.EqualFold(strings.TrimSpace(metadata.OwnerEmail), strings.TrimSpace(reconciliationMetadataString(candidate.revision.MetadataJSON, "owner_email")))
	folderMatch := strings.TrimSpace(metadata.ParentID) != "" && strings.EqualFold(strings.TrimSpace(metadata.ParentID), strings.TrimSpace(reconciliationMetadataString(candidate.revision.MetadataJSON, "parent_id")))
	temporal := reconciliationTemporalProximity(targetRevision, candidate.revision, metadata.ModifiedTime)

	score := 0.0
	if exactArtifactMatch {
		score = 1
	} else {
		score += normalizedSimilarity * 0.42
		score += chunkOverlap * 0.2
		score += titleSimilarity * 0.14
		score += temporal * 0.08
		if accountMatch {
			score += 0.08
		}
		if webURLMatch {
			score += 0.1
		}
		if ownerMatch {
			score += 0.04
		}
		if folderMatch {
			score += 0.04
		}
	}

	band := stores.LineageConfidenceBandNone
	status := stores.SourceRelationshipStatusPendingReview
	switch {
	case exactArtifactMatch:
		band = stores.LineageConfidenceBandExact
		if s.policy.AutoConfirmExactArtifactMatches {
			status = stores.SourceRelationshipStatusConfirmed
		}
	case score >= 0.85:
		band = stores.LineageConfidenceBandHigh
	case score >= 0.62:
		band = stores.LineageConfidenceBandMedium
	default:
		return candidateScoreEvaluation{band: stores.LineageConfidenceBandNone}, nil
	}

	relationshipType := stores.SourceRelationshipTypeSameLogicalDoc
	switch {
	case exactArtifactMatch && !accountMatch:
		relationshipType = stores.SourceRelationshipTypeCopiedFrom
	case !accountMatch && normalizedSimilarity >= 0.7:
		relationshipType = stores.SourceRelationshipTypeTransferredFrom
	case chunkOverlap >= 0.45 && normalizedSimilarity < 0.65:
		relationshipType = stores.SourceRelationshipTypePartialOverlap
	}

	evidence := map[string]any{
		"candidate_reason":             reconciliationCandidateReason(exactArtifactMatch, normalizedSimilarity, chunkOverlap, accountMatch, webURLMatch),
		"exact_artifact_match":         exactArtifactMatch,
		"normalized_text_similarity":   fmt.Sprintf("%.3f", normalizedSimilarity),
		"chunk_overlap":                fmt.Sprintf("%.3f", chunkOverlap),
		"title_similarity":             fmt.Sprintf("%.3f", titleSimilarity),
		"temporal_proximity":           fmt.Sprintf("%.3f", temporal),
		"account_match":                fmt.Sprintf("%t", accountMatch),
		"web_url":                      fmt.Sprintf("%t", webURLMatch),
		"owner_match":                  fmt.Sprintf("%t", ownerMatch),
		"folder_match":                 fmt.Sprintf("%t", folderMatch),
		"candidate_source_document_id": strings.TrimSpace(candidate.document.ID),
		"candidate_source_revision_id": strings.TrimSpace(candidate.revision.ID),
		"candidate_source_artifact_id": strings.TrimSpace(candidate.artifact.ID),
		"evaluated_at":                 s.now().UTC().Format(time.RFC3339Nano),
		"evaluation_actor_id":          strings.TrimSpace(firstNonEmpty(input.ActorID, "system")),
	}

	return candidateScoreEvaluation{
		candidateDocument:  candidate.document,
		score:              math.Min(score, 1),
		band:               band,
		relationshipType:   relationshipType,
		status:             status,
		evidence:           evidence,
		exactArtifactMatch: exactArtifactMatch,
	}, nil
}

func (s DefaultSourceReconciliationService) resolveCandidateContext(ctx context.Context, scope stores.Scope, sourceDocumentID string) (reconciliationTargetContext, error) {
	document, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
		SourceDocumentID: sourceDocumentID,
		ActiveOnly:       true,
	})
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	if len(handles) == 0 {
		return reconciliationTargetContext{}, debugLineageNotFound("source_handles", sourceDocumentID)
	}
	sort.SliceStable(handles, func(i, j int) bool {
		if handles[i].CreatedAt.Equal(handles[j].CreatedAt) {
			return handles[i].ID < handles[j].ID
		}
		return handles[i].CreatedAt.After(handles[j].CreatedAt)
	})
	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{
		SourceDocumentID: sourceDocumentID,
	})
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	if len(revisions) == 0 {
		return reconciliationTargetContext{}, debugLineageNotFound("source_revisions", sourceDocumentID)
	}
	sort.SliceStable(revisions, func(i, j int) bool {
		return sourceRevisionRank(revisions[i]).After(sourceRevisionRank(revisions[j]))
	})
	artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: revisions[0].ID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
	})
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	if len(artifacts) == 0 {
		return reconciliationTargetContext{}, debugLineageNotFound("source_artifacts", revisions[0].ID)
	}
	sort.SliceStable(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ID < artifacts[j].ID
		}
		return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
	})

	return reconciliationTargetContext{
		document:    document,
		handle:      handles[0],
		revision:    revisions[0],
		artifact:    artifacts[0],
		fingerprint: s.latestReadyFingerprint(ctx, scope, revisions[0].ID, artifacts[0].ID),
	}, nil
}

func (s DefaultSourceReconciliationService) latestReadyFingerprint(ctx context.Context, scope stores.Scope, sourceRevisionID, artifactID string) stores.SourceFingerprintRecord {
	fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: strings.TrimSpace(sourceRevisionID),
		ArtifactID:       strings.TrimSpace(artifactID),
	})
	if err != nil || len(fingerprints) == 0 {
		return stores.SourceFingerprintRecord{}
	}
	sort.SliceStable(fingerprints, func(i, j int) bool {
		if fingerprints[i].CreatedAt.Equal(fingerprints[j].CreatedAt) {
			return fingerprints[i].ID < fingerprints[j].ID
		}
		return fingerprints[i].CreatedAt.After(fingerprints[j].CreatedAt)
	})
	for _, fingerprint := range fingerprints {
		if strings.TrimSpace(fingerprint.Status) == stores.SourceFingerprintStatusReady {
			return fingerprint
		}
	}
	return fingerprints[0]
}

func (s DefaultSourceReconciliationService) upsertEvaluatedRelationship(ctx context.Context, scope stores.Scope, input SourceReconciliationInput, evaluation candidateScoreEvaluation, existing stores.SourceRelationshipRecord) (stores.SourceRelationshipRecord, error) {
	leftID, rightID := orderedRelationshipIDs(strings.TrimSpace(input.SourceDocumentID), strings.TrimSpace(evaluation.candidateDocument.ID))
	now := s.now().UTC()
	record := existing
	if strings.TrimSpace(record.ID) == "" {
		record.ID = "srel_" + hashFingerprintValue(strings.Join([]string{leftID, rightID, strings.TrimSpace(evaluation.relationshipType)}, "|"))[:16]
		record.LeftSourceDocumentID = leftID
		record.RightSourceDocumentID = rightID
		record.CreatedByUserID = strings.TrimSpace(firstNonEmpty(input.ActorID, "system"))
		record.CreatedAt = now
	}
	record.RelationshipType = strings.TrimSpace(evaluation.relationshipType)
	record.ConfidenceBand = strings.TrimSpace(evaluation.band)
	record.ConfidenceScore = evaluation.score
	record.Status = preservedRelationshipStatus(existing, evaluation)
	record.UpdatedAt = now
	encoded, err := json.Marshal(evaluation.evidence)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	record.EvidenceJSON = string(encoded)

	if strings.TrimSpace(existing.ID) == "" {
		return s.lineage.CreateSourceRelationship(ctx, scope, record)
	}
	return s.lineage.SaveSourceRelationship(ctx, scope, record)
}

func preservedRelationshipStatus(existing stores.SourceRelationshipRecord, evaluation candidateScoreEvaluation) string {
	switch strings.TrimSpace(existing.Status) {
	case stores.SourceRelationshipStatusConfirmed:
		return stores.SourceRelationshipStatusConfirmed
	case stores.SourceRelationshipStatusRejected:
		return stores.SourceRelationshipStatusRejected
	case stores.SourceRelationshipStatusSuperseded:
		return stores.SourceRelationshipStatusSuperseded
	default:
		return strings.TrimSpace(evaluation.status)
	}
}

func (s DefaultSourceReconciliationService) findRelationshipPair(ctx context.Context, scope stores.Scope, leftID, rightID string) (stores.SourceRelationshipRecord, error) {
	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: strings.TrimSpace(leftID),
	})
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	candidates := make([]stores.SourceRelationshipRecord, 0)
	for _, relationship := range relationships {
		if orderedLeft, orderedRight := orderedRelationshipIDs(relationship.LeftSourceDocumentID, relationship.RightSourceDocumentID); orderedLeft == leftID && orderedRight == rightID {
			candidates = append(candidates, relationship)
		}
	}
	if len(candidates) == 0 {
		return stores.SourceRelationshipRecord{}, nil
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].UpdatedAt.Equal(candidates[j].UpdatedAt) {
			return candidates[i].ID < candidates[j].ID
		}
		return candidates[i].UpdatedAt.After(candidates[j].UpdatedAt)
	})
	return candidates[0], nil
}

func (s DefaultSourceReconciliationService) supersedeRelationshipPair(ctx context.Context, scope stores.Scope, leftSourceDocumentID, rightSourceDocumentID, reason, actorID string) error {
	leftID, rightID := orderedRelationshipIDs(leftSourceDocumentID, rightSourceDocumentID)
	relationship, err := s.findRelationshipPair(ctx, scope, leftID, rightID)
	if err != nil || strings.TrimSpace(relationship.ID) == "" || strings.TrimSpace(relationship.Status) == stores.SourceRelationshipStatusSuperseded {
		return err
	}
	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	evidence["superseded_reason"] = strings.TrimSpace(reason)
	if actorID != "" {
		evidence["superseded_by_user_id"] = strings.TrimSpace(actorID)
	}
	evidence["superseded_at"] = s.now().UTC().Format(time.RFC3339Nano)
	encoded, err := json.Marshal(evidence)
	if err != nil {
		return err
	}
	relationship.Status = stores.SourceRelationshipStatusSuperseded
	relationship.EvidenceJSON = string(encoded)
	relationship.UpdatedAt = s.now().UTC()
	_, err = s.lineage.SaveSourceRelationship(ctx, scope, relationship)
	return err
}

func (s DefaultSourceReconciliationService) attachHandlesForRelationship(ctx context.Context, scope stores.Scope, relationship stores.SourceRelationshipRecord) (string, int, error) {
	left, err := s.lineage.GetSourceDocument(ctx, scope, relationship.LeftSourceDocumentID)
	if err != nil {
		return "", 0, err
	}
	right, err := s.lineage.GetSourceDocument(ctx, scope, relationship.RightSourceDocumentID)
	if err != nil {
		return "", 0, err
	}
	canonical, duplicate := preferredCanonicalSourceDocument(left, right)
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
		SourceDocumentID: duplicate.ID,
		ActiveOnly:       true,
	})
	if err != nil {
		return "", 0, err
	}
	attached := 0
	now := s.now().UTC()
	for _, handle := range handles {
		if existing, err := s.lineage.GetActiveSourceHandle(ctx, scope, handle.ProviderKind, handle.ExternalFileID, handle.AccountID); err == nil {
			if strings.TrimSpace(existing.SourceDocumentID) == canonical.ID {
				handle.HandleStatus = stores.SourceHandleStatusSuperseded
				handle.ValidTo = &now
				handle.UpdatedAt = now
				if _, err := s.lineage.SaveSourceHandle(ctx, scope, handle); err != nil {
					return "", attached, err
				}
				continue
			}
		} else if !isNotFound(err) {
			return "", attached, err
		}
		handle.HandleStatus = stores.SourceHandleStatusSuperseded
		handle.ValidTo = &now
		handle.UpdatedAt = now
		if _, err := s.lineage.SaveSourceHandle(ctx, scope, handle); err != nil {
			return "", attached, err
		}
		if _, err := s.lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
			SourceDocumentID: canonical.ID,
			ProviderKind:     handle.ProviderKind,
			ExternalFileID:   handle.ExternalFileID,
			AccountID:        handle.AccountID,
			DriveID:          handle.DriveID,
			WebURL:           handle.WebURL,
			HandleStatus:     stores.SourceHandleStatusActive,
			ValidFrom:        &now,
			CreatedAt:        now,
			UpdatedAt:        now,
		}); err != nil {
			return "", attached, err
		}
		attached++
	}
	return canonical.ID, attached, nil
}

func preferredCanonicalSourceDocument(left, right stores.SourceDocumentRecord) (stores.SourceDocumentRecord, stores.SourceDocumentRecord) {
	leftConfidence := reconciliationConfidenceRank(left.LineageConfidence)
	rightConfidence := reconciliationConfidenceRank(right.LineageConfidence)
	switch {
	case leftConfidence > rightConfidence:
		return left, right
	case rightConfidence > leftConfidence:
		return right, left
	case left.CreatedAt.Before(right.CreatedAt):
		return left, right
	case right.CreatedAt.Before(left.CreatedAt):
		return right, left
	case strings.Compare(left.ID, right.ID) <= 0:
		return left, right
	default:
		return right, left
	}
}

func reconciliationConfidenceRank(confidence string) int {
	switch strings.TrimSpace(confidence) {
	case stores.LineageConfidenceBandExact:
		return 5
	case stores.LineageConfidenceBandHigh:
		return 4
	case stores.LineageConfidenceBandMedium:
		return 3
	case stores.LineageConfidenceBandLow:
		return 2
	case stores.LineageConfidenceBandNone:
		return 1
	default:
		return 0
	}
}

func reconciliationTitleSimilarity(values ...string) float64 {
	cleaned := make([][]string, 0, len(values))
	for _, value := range values {
		tokens := fingerprintTokens(normalizeFingerprintParagraph(value))
		if len(tokens) > 0 {
			cleaned = append(cleaned, tokens)
		}
	}
	if len(cleaned) < 2 {
		return 0
	}
	return tokenJaccard(cleaned[0], cleaned[1])
}

func reconciliationChunkOverlap(left, right stores.SourceFingerprintRecord) float64 {
	return stringSetJaccard(decodeFingerprintHashes(left.ChunkHashesJSON), decodeFingerprintHashes(right.ChunkHashesJSON))
}

func reconciliationNormalizedTextSimilarity(left, right stores.SourceFingerprintRecord) float64 {
	if strings.TrimSpace(left.NormalizedTextSHA256) == "" || strings.TrimSpace(right.NormalizedTextSHA256) == "" {
		return 0
	}
	if strings.TrimSpace(left.NormalizedTextSHA256) == strings.TrimSpace(right.NormalizedTextSHA256) {
		return 1
	}
	minHashSimilarity := stringSetJaccard(decodeFingerprintHashes(left.MinHashJSON), decodeFingerprintHashes(right.MinHashJSON))
	simHashSimilarity := 1 - float64(hammingDistance64(parseSimHash64(left.SimHash64), parseSimHash64(right.SimHash64)))/64
	if simHashSimilarity < 0 {
		simHashSimilarity = 0
	}
	return (minHashSimilarity * 0.65) + (simHashSimilarity * 0.35)
}

func reconciliationTemporalProximity(left, right stores.SourceRevisionRecord, metadataModified *time.Time) float64 {
	leftTime := firstSourceTimePtr(metadataModified, left.ModifiedTime, left.ExportedAt)
	rightTime := firstSourceTimePtr(right.ModifiedTime, right.ExportedAt)
	if leftTime == nil || rightTime == nil {
		return 0
	}
	diff := leftTime.Sub(*rightTime)
	if diff < 0 {
		diff = -diff
	}
	switch {
	case diff <= 24*time.Hour:
		return 1
	case diff <= 7*24*time.Hour:
		return 0.7
	case diff <= 30*24*time.Hour:
		return 0.35
	default:
		return 0
	}
}

func reconciliationCandidateReason(exactArtifact bool, normalizedSimilarity, chunkOverlap float64, accountMatch, webURLMatch bool) string {
	switch {
	case exactArtifact:
		return "exact_artifact_match"
	case normalizedSimilarity >= 0.85 && webURLMatch:
		return "normalized_text_with_source_url_history"
	case normalizedSimilarity >= 0.8 && accountMatch:
		return "normalized_text_with_account_corroboration"
	case chunkOverlap >= 0.5:
		return "partial_chunk_overlap"
	default:
		return "multi_signal_candidate_match"
	}
}

func reconciliationMetadataString(rawJSON, key string) string {
	return lineageMetadataString(decodeLineageMetadataJSON(rawJSON), key)
}

func tokenJaccard(left, right []string) float64 {
	return stringSetJaccard(left, right)
}

func stringSetJaccard(left, right []string) float64 {
	if len(left) == 0 || len(right) == 0 {
		return 0
	}
	leftSet := make(map[string]struct{}, len(left))
	for _, item := range left {
		leftSet[strings.TrimSpace(item)] = struct{}{}
	}
	rightSet := make(map[string]struct{}, len(right))
	for _, item := range right {
		rightSet[strings.TrimSpace(item)] = struct{}{}
	}
	intersection := 0
	unionSet := make(map[string]struct{}, len(leftSet)+len(rightSet))
	for item := range leftSet {
		unionSet[item] = struct{}{}
		if _, ok := rightSet[item]; ok {
			intersection++
		}
	}
	for item := range rightSet {
		unionSet[item] = struct{}{}
	}
	if len(unionSet) == 0 {
		return 0
	}
	return float64(intersection) / float64(len(unionSet))
}

func hammingDistance64(left, right uint64) int {
	return bitsSet(left ^ right)
}

func bitsSet(value uint64) int {
	count := 0
	for value > 0 {
		value &= value - 1
		count++
	}
	return count
}
