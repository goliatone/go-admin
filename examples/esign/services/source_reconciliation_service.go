package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
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
	search  SourceSearchService
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

func WithSourceReconciliationSearchService(service SourceSearchService) SourceReconciliationServiceOption {
	return func(s *DefaultSourceReconciliationService) {
		if s == nil || service == nil {
			return
		}
		s.search = service
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
	target, err := s.resolveReconciliationTargetState(ctx, scope, sourceDocumentID, sourceRevisionID, artifactID)
	if err != nil {
		return SourceReconciliationResult{}, err
	}
	documents, err := s.lineage.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{
		ProviderKind: target.document.ProviderKind,
		Status:       stores.SourceDocumentStatusActive,
	})
	if err != nil {
		return SourceReconciliationResult{}, err
	}
	candidates, err := s.evaluateCandidateDocuments(ctx, scope, input, target, documents)
	if err != nil {
		return SourceReconciliationResult{}, err
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

func (s DefaultSourceReconciliationService) resolveReconciliationTargetState(
	ctx context.Context,
	scope stores.Scope,
	sourceDocumentID, sourceRevisionID, artifactID string,
) (reconciliationTargetState, error) {
	targetDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return reconciliationTargetState{}, err
	}
	targetRevision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return reconciliationTargetState{}, err
	}
	targetArtifact, err := s.lineage.GetSourceArtifact(ctx, scope, artifactID)
	if err != nil {
		return reconciliationTargetState{}, err
	}
	return reconciliationTargetState{
		document:    targetDocument,
		revision:    targetRevision,
		artifact:    targetArtifact,
		fingerprint: s.latestReadyFingerprint(ctx, scope, targetRevision.ID, targetArtifact.ID),
	}, nil
}

func (s DefaultSourceReconciliationService) evaluateCandidateDocuments(
	ctx context.Context,
	scope stores.Scope,
	input SourceReconciliationInput,
	target reconciliationTargetState,
	documents []stores.SourceDocumentRecord,
) ([]CandidateWarningSummary, error) {
	candidates := make([]CandidateWarningSummary, 0)
	for _, candidateDocument := range documents {
		if strings.TrimSpace(candidateDocument.ID) == strings.TrimSpace(target.document.ID) {
			continue
		}
		candidate, ok, err := s.evaluateCandidateDocument(ctx, scope, input, target, candidateDocument)
		if err != nil {
			return nil, err
		}
		if ok {
			candidates = append(candidates, candidate)
		}
	}
	return candidates, nil
}

func (s DefaultSourceReconciliationService) evaluateCandidateDocument(
	ctx context.Context,
	scope stores.Scope,
	input SourceReconciliationInput,
	target reconciliationTargetState,
	candidateDocument stores.SourceDocumentRecord,
) (CandidateWarningSummary, bool, error) {
	leftID, rightID := orderedRelationshipIDs(strings.TrimSpace(target.document.ID), strings.TrimSpace(candidateDocument.ID))
	existing, err := s.findRelationshipPair(ctx, scope, leftID, rightID)
	if err != nil {
		return CandidateWarningSummary{}, false, err
	}
	evaluation, err := s.scoreCandidate(
		ctx,
		scope,
		target.document,
		target.revision,
		target.artifact,
		target.fingerprint,
		input.Metadata,
		candidateDocument,
	)
	if err != nil {
		return CandidateWarningSummary{}, false, err
	}
	if evaluation.band == stores.LineageConfidenceBandNone {
		if err := s.supersedePendingReviewCandidate(ctx, scope, target.document.ID, candidateDocument.ID, existing, input.ActorID); err != nil {
			return CandidateWarningSummary{}, false, err
		}
		return CandidateWarningSummary{}, false, nil
	}
	relationship, err := s.upsertEvaluatedRelationship(ctx, scope, input, evaluation, existing)
	if err != nil {
		return CandidateWarningSummary{}, false, err
	}
	if err := s.attachAutoConfirmedCandidateHandles(ctx, scope, relationship, evaluation); err != nil {
		return CandidateWarningSummary{}, false, err
	}
	if strings.TrimSpace(relationship.Status) != stores.SourceRelationshipStatusPendingReview {
		return CandidateWarningSummary{}, false, nil
	}
	return candidateWarningSummaryFromRelationship(relationship), true, nil
}

func (s DefaultSourceReconciliationService) supersedePendingReviewCandidate(
	ctx context.Context,
	scope stores.Scope,
	sourceDocumentID, candidateDocumentID string,
	existing stores.SourceRelationshipRecord,
	actorID string,
) error {
	if strings.TrimSpace(existing.Status) != stores.SourceRelationshipStatusPendingReview {
		return nil
	}
	return s.supersedeRelationshipPair(ctx, scope, sourceDocumentID, candidateDocumentID, "reevaluated_below_threshold", strings.TrimSpace(actorID))
}

func (s DefaultSourceReconciliationService) attachAutoConfirmedCandidateHandles(
	ctx context.Context,
	scope stores.Scope,
	relationship stores.SourceRelationshipRecord,
	evaluation candidateScoreEvaluation,
) error {
	if relationship.Status != stores.SourceRelationshipStatusConfirmed || !evaluation.exactArtifactMatch || !s.policy.AttachHandlesOnAutoConfirm {
		return nil
	}
	_, _, err := s.attachHandlesForRelationship(ctx, scope, relationship)
	return err
}

func (s DefaultSourceReconciliationService) ApplyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, error) {
	normalizedAction, _ := normalizeSourceRelationshipReviewAction(strings.TrimSpace(input.Action), strings.TrimSpace(input.ConfirmBehavior))
	if s.lineage == nil {
		observability.ObserveSourceReviewAction(ctx, normalizedAction, false)
		return CandidateWarningSummary{}, domainValidationError("lineage_reconciliation", "lineage", "not configured")
	}
	if txManager, ok := any(s.lineage).(stores.TransactionManager); ok {
		summary := CandidateWarningSummary{}
		err := stores.WithTxHooksContext(ctx, txManager, func(txCtx context.Context, tx stores.TxStore, hooks *stores.TxHooks) error {
			var updated CandidateWarningSummary
			var impactedSourceIDs []string
			var txErr error
			updated, impactedSourceIDs, txErr = s.forTx(tx).applyReviewAction(txCtx, scope, input)
			if txErr != nil {
				return txErr
			}
			summary = updated
			impacted := append([]string(nil), impactedSourceIDs...)
			if hooks != nil {
				hooks.AfterCommit(func() error {
					return s.refreshSearchAfterReview(ctx, scope, impacted...)
				})
			} else if txErr = s.refreshSearchAfterReview(ctx, scope, impacted...); txErr != nil {
				return txErr
			}
			return nil
		})
		observability.ObserveSourceReviewAction(ctx, normalizedAction, err == nil)
		return summary, err
	}
	summary, impactedSourceIDs, err := s.applyReviewAction(ctx, scope, input)
	if err == nil {
		err = s.refreshSearchAfterReview(ctx, scope, impactedSourceIDs...)
	}
	observability.ObserveSourceReviewAction(ctx, normalizedAction, err == nil)
	return summary, err
}

func (s DefaultSourceReconciliationService) applyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, []string, error) {
	relationshipID := strings.TrimSpace(input.RelationshipID)
	action := strings.TrimSpace(strings.ToLower(input.Action))
	actorID := strings.TrimSpace(input.ActorID)
	if relationshipID == "" || action == "" || actorID == "" {
		return CandidateWarningSummary{}, nil, domainValidationError("lineage_reconciliation", "relationship_id|action|actor_id", "required")
	}
	effectiveAction, err := normalizeSourceRelationshipReviewAction(action, input.ConfirmBehavior)
	if err != nil {
		return CandidateWarningSummary{}, nil, err
	}
	relationship, err := s.lineage.GetSourceRelationship(ctx, scope, relationshipID)
	if err != nil {
		return CandidateWarningSummary{}, nil, err
	}
	currentStatus := strings.TrimSpace(relationship.Status)
	if currentStatus == stores.SourceRelationshipStatusSuperseded && effectiveAction != SourceRelationshipActionSupersede {
		return CandidateWarningSummary{}, nil, lineageReviewConflictError("relationship", "superseded candidates are immutable")
	}
	if currentStatus != stores.SourceRelationshipStatusPendingReview && effectiveAction != SourceRelationshipActionSupersede {
		return CandidateWarningSummary{}, nil, lineageReviewConflictError("relationship", "candidate is no longer pending review")
	}

	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	evidence["review_action"] = effectiveAction
	evidence["reviewed_by_user_id"] = actorID
	evidence["review_reason"] = strings.TrimSpace(input.Reason)
	evidence["reviewed_at"] = s.now().UTC().Format(time.RFC3339Nano)
	evidence["last_review_action"] = effectiveAction
	beforeStatus := currentStatus

	impactedSourceIDs := []string{relationship.LeftSourceDocumentID, relationship.RightSourceDocumentID}
	switch effectiveAction {
	case SourceRelationshipActionAttach:
		relationship.Status = stores.SourceRelationshipStatusConfirmed
		if s.policy.AttachHandlesOnConfirm {
			var canonicalID string
			var attachedHandles int
			canonicalID, attachedHandles, err = s.attachHandlesForRelationship(ctx, scope, relationship)
			if err != nil {
				return CandidateWarningSummary{}, nil, err
			}
			if canonicalID != "" {
				evidence["canonical_source_document_id"] = canonicalID
			}
			evidence["attached_handle_count"] = attachedHandles
		}
	case SourceRelationshipActionMerge:
		relationship.Status = stores.SourceRelationshipStatusConfirmed
		var canonicalID, mergedID string
		var attachedHandles int
		canonicalID, mergedID, attachedHandles, err = s.mergeSourceDocumentsForRelationship(ctx, scope, relationship)
		if err != nil {
			return CandidateWarningSummary{}, nil, err
		}
		if canonicalID != "" {
			evidence["canonical_source_document_id"] = canonicalID
			impactedSourceIDs = append(impactedSourceIDs, canonicalID)
		}
		if mergedID != "" {
			evidence["merged_source_document_id"] = mergedID
			impactedSourceIDs = append(impactedSourceIDs, mergedID)
		}
		evidence["attached_handle_count"] = attachedHandles
		relationship.PredecessorSourceDocumentID = strings.TrimSpace(mergedID)
		relationship.SuccessorSourceDocumentID = strings.TrimSpace(canonicalID)
	case SourceRelationshipActionRelated:
		relationship.Status = stores.SourceRelationshipStatusConfirmed
		relationship.RelationshipType = confirmedRelatedRelationshipType(relationship.RelationshipType)
		relationship.PredecessorSourceDocumentID = ""
		relationship.SuccessorSourceDocumentID = ""
	case SourceRelationshipActionReject:
		relationship.Status = stores.SourceRelationshipStatusRejected
		evidence["suppression_evidence_signature"] = firstNonEmpty(lineageMetadataString(evidence, "evidence_signature"), lineageMetadataString(evidence, "suppression_evidence_signature"))
	case SourceRelationshipActionSupersede:
		relationship.Status = stores.SourceRelationshipStatusSuperseded
	default:
		return CandidateWarningSummary{}, nil, domainValidationError("lineage_reconciliation", "action", "unsupported")
	}
	evidence = appendReconciliationAuditEntry(evidence, reconciliationAuditEntryInput{
		ID:         "audit_" + hashFingerprintValue(strings.Join([]string{relationship.ID, effectiveAction, actorID, s.now().UTC().Format(time.RFC3339Nano)}, "|"))[:16],
		Action:     effectiveAction,
		ActorID:    actorID,
		Reason:     strings.TrimSpace(input.Reason),
		FromStatus: beforeStatus,
		ToStatus:   strings.TrimSpace(relationship.Status),
		Summary:    reconciliationReviewActionSummary(effectiveAction, relationship),
		CreatedAt:  s.now().UTC(),
	})

	encoded, err := json.Marshal(evidence)
	if err != nil {
		return CandidateWarningSummary{}, nil, err
	}
	relationship.EvidenceJSON = string(encoded)
	relationship.UpdatedAt = s.now().UTC()
	relationship, err = s.lineage.SaveSourceRelationship(ctx, scope, relationship)
	if err != nil {
		return CandidateWarningSummary{}, nil, err
	}
	return candidateWarningSummaryFromRelationship(relationship), impactedSourceIDs, nil
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

type reconciliationAuditEntryInput struct {
	ID         string
	Action     string
	ActorID    string
	Reason     string
	FromStatus string
	ToStatus   string
	Summary    string
	CreatedAt  time.Time
}

func normalizeSourceRelationshipReviewAction(action, confirmBehavior string) (string, error) {
	action = strings.TrimSpace(strings.ToLower(action))
	confirmBehavior = strings.TrimSpace(strings.ToLower(confirmBehavior))
	switch action {
	case SourceRelationshipActionConfirm:
		if confirmBehavior == "" {
			return SourceRelationshipActionAttach, nil
		}
		return normalizeSourceRelationshipReviewAction(confirmBehavior, "")
	case SourceRelationshipActionAttach, SourceRelationshipActionMerge, SourceRelationshipActionRelated, SourceRelationshipActionReject, SourceRelationshipActionSupersede:
		return action, nil
	default:
		return "", domainValidationError("lineage_reconciliation", "action", "unsupported")
	}
}

func confirmedRelatedRelationshipType(relationshipType string) string {
	switch strings.TrimSpace(relationshipType) {
	case stores.SourceRelationshipTypeForkedFrom, stores.SourceRelationshipTypePartialOverlap:
		return strings.TrimSpace(relationshipType)
	default:
		return stores.SourceRelationshipTypePartialOverlap
	}
}

func reconciliationReviewActionSummary(action string, relationship stores.SourceRelationshipRecord) string {
	switch strings.TrimSpace(action) {
	case SourceRelationshipActionAttach:
		return "Operator confirmed the candidate by attaching active handles to the existing canonical source."
	case SourceRelationshipActionMerge:
		return "Operator confirmed the candidate by merging the duplicate source into the canonical source."
	case SourceRelationshipActionRelated:
		return "Operator confirmed the candidate as related but distinct without merging canonical identities."
	case SourceRelationshipActionReject:
		return "Operator rejected the candidate and suppression remains active until evidence changes."
	case SourceRelationshipActionSupersede:
		return "Operator superseded the candidate in favor of newer or more reliable evidence."
	default:
		return relationshipSummary(relationship)
	}
}

func appendReconciliationAuditEntry(evidence map[string]any, entry reconciliationAuditEntryInput) map[string]any {
	if len(evidence) == 0 {
		evidence = map[string]any{}
	}
	raw, _ := evidence["review_audit"].([]any)
	auditEntry := map[string]any{
		"id":          strings.TrimSpace(entry.ID),
		"action":      strings.TrimSpace(entry.Action),
		"actor_id":    strings.TrimSpace(entry.ActorID),
		"reason":      strings.TrimSpace(entry.Reason),
		"from_status": strings.TrimSpace(entry.FromStatus),
		"to_status":   strings.TrimSpace(entry.ToStatus),
		"summary":     strings.TrimSpace(entry.Summary),
		"created_at":  entry.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	raw = append(raw, auditEntry)
	evidence["review_audit"] = raw
	return evidence
}

type reconciliationTargetContext struct {
	document     stores.SourceDocumentRecord
	activeHandle stores.SourceHandleRecord
	revisions    []reconciliationRevisionContext
}

type reconciliationRevisionContext struct {
	handle    stores.SourceHandleRecord
	revision  stores.SourceRevisionRecord
	artifacts []reconciliationArtifactContext
}

type reconciliationArtifactContext struct {
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

type reconciliationTargetState struct {
	document    stores.SourceDocumentRecord
	revision    stores.SourceRevisionRecord
	artifact    stores.SourceArtifactRecord
	fingerprint stores.SourceFingerprintRecord
}

type candidateArtifactMetrics struct {
	titleSimilarity      float64
	chunkOverlap         float64
	normalizedSimilarity float64
	exactArtifactMatch   bool
	accountMatch         bool
	driveMatch           bool
	webURLMatch          bool
	ownerMatch           bool
	folderMatch          bool
	temporalProximity    float64
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

	best := candidateScoreEvaluation{band: stores.LineageConfidenceBandNone}
	for _, revisionContext := range candidate.revisions {
		handle := revisionContext.handle
		if strings.TrimSpace(handle.ID) == "" {
			handle = candidate.activeHandle
		}
		for _, artifactContext := range revisionContext.artifacts {
			evaluation := s.evaluateCandidateArtifact(targetDocument, targetRevision, targetArtifact, targetFingerprint, metadata, candidate.document, handle, revisionContext.revision, artifactContext)
			if preferredCandidateEvaluation(best, evaluation) {
				best = evaluation
			}
		}
	}
	if strings.TrimSpace(best.band) == "" || best.band == stores.LineageConfidenceBandNone {
		return candidateScoreEvaluation{band: stores.LineageConfidenceBandNone}, nil
	}
	return best, nil
}

func (s DefaultSourceReconciliationService) resolveCandidateContext(ctx context.Context, scope stores.Scope, sourceDocumentID string) (reconciliationTargetContext, error) {
	document, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	handles, activeHandles, handleByID, err := s.resolveCandidateHandles(ctx, scope, sourceDocumentID)
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	revisionContexts, err := s.resolveCandidateRevisionContexts(ctx, scope, sourceDocumentID, handleByID)
	if err != nil {
		return reconciliationTargetContext{}, err
	}
	if len(revisionContexts) == 0 {
		return reconciliationTargetContext{}, debugLineageNotFound("source_artifacts", sourceDocumentID)
	}

	return reconciliationTargetContext{
		document:     document,
		activeHandle: firstReconciliationHandle(activeHandles, handles),
		revisions:    revisionContexts,
	}, nil
}

func (s DefaultSourceReconciliationService) resolveCandidateHandles(
	ctx context.Context,
	scope stores.Scope,
	sourceDocumentID string,
) ([]stores.SourceHandleRecord, []stores.SourceHandleRecord, map[string]stores.SourceHandleRecord, error) {
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
		SourceDocumentID: sourceDocumentID,
	})
	if err != nil {
		return nil, nil, nil, err
	}
	if len(handles) == 0 {
		return nil, nil, nil, debugLineageNotFound("source_handles", sourceDocumentID)
	}
	handleByID := make(map[string]stores.SourceHandleRecord, len(handles))
	activeHandles := make([]stores.SourceHandleRecord, 0, len(handles))
	for _, handle := range handles {
		handleByID[strings.TrimSpace(handle.ID)] = handle
		if strings.TrimSpace(handle.HandleStatus) == stores.SourceHandleStatusActive {
			activeHandles = append(activeHandles, handle)
		}
	}
	sortSourceHandlesByCreatedAt(activeHandles)
	sortSourceHandlesByCreatedAt(handles)
	return handles, activeHandles, handleByID, nil
}

func (s DefaultSourceReconciliationService) resolveCandidateRevisionContexts(
	ctx context.Context,
	scope stores.Scope,
	sourceDocumentID string,
	handleByID map[string]stores.SourceHandleRecord,
) ([]reconciliationRevisionContext, error) {
	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{
		SourceDocumentID: sourceDocumentID,
	})
	if err != nil {
		return nil, err
	}
	if len(revisions) == 0 {
		return nil, debugLineageNotFound("source_revisions", sourceDocumentID)
	}
	sort.SliceStable(revisions, func(i, j int) bool {
		return sourceRevisionRank(revisions[i]).After(sourceRevisionRank(revisions[j]))
	})
	revisionContexts := make([]reconciliationRevisionContext, 0, len(revisions))
	for _, revision := range revisions {
		artifactContexts, err := s.resolveCandidateArtifactContexts(ctx, scope, revision)
		if err != nil {
			return nil, err
		}
		if len(artifactContexts) == 0 {
			continue
		}
		revisionContexts = append(revisionContexts, reconciliationRevisionContext{
			handle:    handleByID[strings.TrimSpace(revision.SourceHandleID)],
			revision:  revision,
			artifacts: artifactContexts,
		})
	}
	return revisionContexts, nil
}

func (s DefaultSourceReconciliationService) resolveCandidateArtifactContexts(
	ctx context.Context,
	scope stores.Scope,
	revision stores.SourceRevisionRecord,
) ([]reconciliationArtifactContext, error) {
	artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: revision.ID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
	})
	if err != nil {
		return nil, err
	}
	if len(artifacts) == 0 {
		return nil, nil
	}
	sort.SliceStable(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ID < artifacts[j].ID
		}
		return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
	})
	artifactContexts := make([]reconciliationArtifactContext, 0, len(artifacts))
	for _, artifact := range artifacts {
		artifactContexts = append(artifactContexts, reconciliationArtifactContext{
			artifact:    artifact,
			fingerprint: s.latestReadyFingerprint(ctx, scope, revision.ID, artifact.ID),
		})
	}
	return artifactContexts, nil
}

func sortSourceHandlesByCreatedAt(handles []stores.SourceHandleRecord) {
	sort.SliceStable(handles, func(i, j int) bool {
		if handles[i].CreatedAt.Equal(handles[j].CreatedAt) {
			return handles[i].ID < handles[j].ID
		}
		return handles[i].CreatedAt.After(handles[j].CreatedAt)
	})
}

func (s DefaultSourceReconciliationService) evaluateCandidateArtifact(
	targetDocument stores.SourceDocumentRecord,
	targetRevision stores.SourceRevisionRecord,
	targetArtifact stores.SourceArtifactRecord,
	targetFingerprint stores.SourceFingerprintRecord,
	metadata SourceMetadataBaseline,
	candidateDocument stores.SourceDocumentRecord,
	candidateHandle stores.SourceHandleRecord,
	candidateRevision stores.SourceRevisionRecord,
	artifactContext reconciliationArtifactContext,
) candidateScoreEvaluation {
	titleSimilarity := reconciliationTitleSimilarity(targetDocument.CanonicalTitle, candidateDocument.CanonicalTitle, metadata.TitleHint)
	chunkOverlap := reconciliationChunkOverlap(targetFingerprint, artifactContext.fingerprint)
	normalizedSimilarity := reconciliationNormalizedTextSimilarity(targetFingerprint, artifactContext.fingerprint)
	exactArtifactMatch := strings.TrimSpace(targetArtifact.SHA256) != "" && strings.TrimSpace(targetArtifact.SHA256) == strings.TrimSpace(artifactContext.artifact.SHA256)
	accountMatch := strings.TrimSpace(metadata.AccountID) != "" && strings.EqualFold(strings.TrimSpace(metadata.AccountID), strings.TrimSpace(candidateHandle.AccountID))
	driveMatch := strings.TrimSpace(metadata.DriveID) != "" && strings.EqualFold(strings.TrimSpace(metadata.DriveID), strings.TrimSpace(firstNonEmpty(candidateHandle.DriveID, reconciliationMetadataString(candidateRevision.MetadataJSON, "drive_id"))))
	webURLMatch := strings.TrimSpace(metadata.WebURL) != "" && strings.EqualFold(strings.TrimSpace(metadata.WebURL), strings.TrimSpace(firstNonEmpty(candidateHandle.WebURL, reconciliationMetadataString(candidateRevision.MetadataJSON, "web_url"))))
	ownerMatch := strings.TrimSpace(metadata.OwnerEmail) != "" && strings.EqualFold(strings.TrimSpace(metadata.OwnerEmail), strings.TrimSpace(reconciliationMetadataString(candidateRevision.MetadataJSON, "owner_email")))
	folderMatch := strings.TrimSpace(metadata.ParentID) != "" && strings.EqualFold(strings.TrimSpace(metadata.ParentID), strings.TrimSpace(reconciliationMetadataString(candidateRevision.MetadataJSON, "parent_id")))
	temporal := reconciliationTemporalProximity(targetRevision, candidateRevision, metadata.ModifiedTime)

	score := 0.0
	if exactArtifactMatch {
		score = 1
	} else {
		score += normalizedSimilarity * 0.42
		score += chunkOverlap * 0.2
		score += titleSimilarity * 0.14
		score += temporal * 0.08
		if accountMatch {
			score += 0.06
		}
		if driveMatch {
			score += 0.05
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
		return candidateScoreEvaluation{band: stores.LineageConfidenceBandNone}
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
		"drive_match":                  fmt.Sprintf("%t", driveMatch),
		"web_url_match":                fmt.Sprintf("%t", webURLMatch),
		"owner_match":                  fmt.Sprintf("%t", ownerMatch),
		"folder_match":                 fmt.Sprintf("%t", folderMatch),
		"target_source_document_id":    strings.TrimSpace(targetDocument.ID),
		"target_source_revision_id":    strings.TrimSpace(targetRevision.ID),
		"target_source_artifact_id":    strings.TrimSpace(targetArtifact.ID),
		"target_extract_version":       strings.TrimSpace(targetFingerprint.ExtractVersion),
		"candidate_source_document_id": strings.TrimSpace(candidateDocument.ID),
		"candidate_source_revision_id": strings.TrimSpace(candidateRevision.ID),
		"candidate_source_artifact_id": strings.TrimSpace(artifactContext.artifact.ID),
		"candidate_extract_version":    strings.TrimSpace(artifactContext.fingerprint.ExtractVersion),
		"evaluated_at":                 s.now().UTC().Format(time.RFC3339Nano),
	}
	evidence["evidence_signature"] = reconciliationEvidenceSignature(evidence)

	return candidateScoreEvaluation{
		candidateDocument:  candidateDocument,
		score:              math.Min(score, 1),
		band:               band,
		relationshipType:   relationshipType,
		status:             status,
		evidence:           evidence,
		exactArtifactMatch: exactArtifactMatch,
	}
}

func preferredCandidateEvaluation(current, next candidateScoreEvaluation) bool {
	currentRank := reconciliationConfidenceRank(current.band)
	nextRank := reconciliationConfidenceRank(next.band)
	switch {
	case nextRank > currentRank:
		return true
	case nextRank < currentRank:
		return false
	case next.exactArtifactMatch && !current.exactArtifactMatch:
		return true
	case current.exactArtifactMatch && !next.exactArtifactMatch:
		return false
	case next.score > current.score:
		return true
	default:
		return false
	}
}

func firstReconciliationHandle(primary []stores.SourceHandleRecord, fallback []stores.SourceHandleRecord) stores.SourceHandleRecord {
	if len(primary) > 0 {
		return primary[0]
	}
	if len(fallback) > 0 {
		return fallback[0]
	}
	return stores.SourceHandleRecord{}
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
	currentSourceDocumentID := strings.TrimSpace(input.SourceDocumentID)
	candidateSourceDocumentID := strings.TrimSpace(evaluation.candidateDocument.ID)
	leftID, rightID := orderedRelationshipIDs(currentSourceDocumentID, candidateSourceDocumentID)
	predecessorID, successorID := sourceRelationshipDirectionalEndpoints(strings.TrimSpace(evaluation.relationshipType), currentSourceDocumentID, candidateSourceDocumentID)
	now := s.now().UTC()
	record := existing
	if strings.TrimSpace(record.ID) == "" {
		record.ID = "srel_" + hashFingerprintValue(strings.Join([]string{leftID, rightID, strings.TrimSpace(evaluation.relationshipType)}, "|"))[:16]
		record.LeftSourceDocumentID = leftID
		record.RightSourceDocumentID = rightID
		record.CreatedByUserID = strings.TrimSpace(firstNonEmpty(input.ActorID, "system"))
		record.CreatedAt = now
	}
	record.PredecessorSourceDocumentID = predecessorID
	record.SuccessorSourceDocumentID = successorID
	record.RelationshipType = strings.TrimSpace(evaluation.relationshipType)
	record.ConfidenceBand = strings.TrimSpace(evaluation.band)
	record.ConfidenceScore = evaluation.score
	record.Status = preservedRelationshipStatus(existing, evaluation)
	record.UpdatedAt = now
	evaluation.evidence["evaluation_actor_id"] = strings.TrimSpace(firstNonEmpty(input.ActorID, "system"))
	mergedEvidence := mergeRelationshipEvidence(decodeLineageMetadataJSON(existing.EvidenceJSON), evaluation.evidence)
	if strings.TrimSpace(existing.Status) == stores.SourceRelationshipStatusRejected && record.Status != stores.SourceRelationshipStatusRejected {
		mergedEvidence = appendReconciliationAuditEntry(mergedEvidence, reconciliationAuditEntryInput{
			ID:         "audit_" + hashFingerprintValue(strings.Join([]string{record.ID, "reopened", now.Format(time.RFC3339Nano)}, "|"))[:16],
			Action:     "candidate_reopened",
			ActorID:    strings.TrimSpace(firstNonEmpty(input.ActorID, "system")),
			Reason:     "new evidence or extractor version reopened a previously rejected candidate",
			FromStatus: stores.SourceRelationshipStatusRejected,
			ToStatus:   record.Status,
			Summary:    "Candidate reopened after the evaluation evidence changed.",
			CreatedAt:  now,
		})
	}
	encoded, err := json.Marshal(mergedEvidence)
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	record.EvidenceJSON = string(encoded)

	if strings.TrimSpace(existing.ID) == "" {
		return s.lineage.CreateSourceRelationship(ctx, scope, record)
	}
	return s.lineage.SaveSourceRelationship(ctx, scope, record)
}

func sourceRelationshipDirectionalEndpoints(relationshipType, currentSourceDocumentID, counterpartSourceDocumentID string) (string, string) {
	currentSourceDocumentID = strings.TrimSpace(currentSourceDocumentID)
	counterpartSourceDocumentID = strings.TrimSpace(counterpartSourceDocumentID)
	switch strings.TrimSpace(relationshipType) {
	case stores.SourceRelationshipTypeCopiedFrom,
		stores.SourceRelationshipTypeTransferredFrom,
		stores.SourceRelationshipTypeForkedFrom,
		stores.SourceRelationshipTypeSameLogicalDoc:
		return counterpartSourceDocumentID, currentSourceDocumentID
	default:
		return "", ""
	}
}

func preservedRelationshipStatus(existing stores.SourceRelationshipRecord, evaluation candidateScoreEvaluation) string {
	switch strings.TrimSpace(existing.Status) {
	case stores.SourceRelationshipStatusConfirmed:
		return stores.SourceRelationshipStatusConfirmed
	case stores.SourceRelationshipStatusRejected:
		if shouldPreserveRejectedRelationship(existing, evaluation) {
			return stores.SourceRelationshipStatusRejected
		}
		return strings.TrimSpace(evaluation.status)
	case stores.SourceRelationshipStatusSuperseded:
		return stores.SourceRelationshipStatusSuperseded
	default:
		return strings.TrimSpace(evaluation.status)
	}
}

func shouldPreserveRejectedRelationship(existing stores.SourceRelationshipRecord, evaluation candidateScoreEvaluation) bool {
	evidence := decodeLineageMetadataJSON(existing.EvidenceJSON)
	if lineageMetadataString(evidence, "target_extract_version") != lineageMetadataString(evaluation.evidence, "target_extract_version") {
		return false
	}
	if lineageMetadataString(evidence, "candidate_extract_version") != lineageMetadataString(evaluation.evidence, "candidate_extract_version") {
		return false
	}
	suppressedSignature := firstNonEmpty(
		lineageMetadataString(evidence, "suppression_evidence_signature"),
		lineageMetadataString(evidence, "evidence_signature"),
	)
	nextSignature := lineageMetadataString(evaluation.evidence, "evidence_signature")
	return suppressedSignature != "" && suppressedSignature == nextSignature
}

func lineageReviewConflictError(field, reason string) error {
	meta := map[string]any{
		"entity": "lineage_reconciliation",
		"field":  strings.TrimSpace(field),
	}
	if strings.TrimSpace(reason) != "" {
		meta["reason"] = strings.TrimSpace(reason)
	}
	return goerrors.New("review conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithMetadata(meta)
}

func mergeRelationshipEvidence(existing, next map[string]any) map[string]any {
	merged := map[string]any{}
	for key, value := range existing {
		merged[strings.TrimSpace(key)] = value
	}
	for key, value := range next {
		merged[strings.TrimSpace(key)] = value
	}
	return merged
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
		existing, getErr := s.lineage.GetActiveSourceHandle(ctx, scope, handle.ProviderKind, handle.ExternalFileID, handle.AccountID)
		if getErr == nil {
			if strings.TrimSpace(existing.SourceDocumentID) == canonical.ID {
				handle.HandleStatus = stores.SourceHandleStatusSuperseded
				handle.ValidTo = &now
				handle.UpdatedAt = now
				_, err = s.lineage.SaveSourceHandle(ctx, scope, handle)
				if err != nil {
					return "", attached, err
				}
				continue
			}
		} else if !isNotFound(getErr) {
			return "", attached, getErr
		}
		handle.HandleStatus = stores.SourceHandleStatusSuperseded
		handle.ValidTo = &now
		handle.UpdatedAt = now
		_, err = s.lineage.SaveSourceHandle(ctx, scope, handle)
		if err != nil {
			return "", attached, err
		}
		_, err = s.lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
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
		})
		if err != nil {
			return "", attached, err
		}
		attached++
	}
	return canonical.ID, attached, nil
}

func (s DefaultSourceReconciliationService) mergeSourceDocumentsForRelationship(ctx context.Context, scope stores.Scope, relationship stores.SourceRelationshipRecord) (string, string, int, error) {
	left, err := s.lineage.GetSourceDocument(ctx, scope, relationship.LeftSourceDocumentID)
	if err != nil {
		return "", "", 0, err
	}
	right, err := s.lineage.GetSourceDocument(ctx, scope, relationship.RightSourceDocumentID)
	if err != nil {
		return "", "", 0, err
	}
	canonical, duplicate := preferredCanonicalSourceDocument(left, right)
	canonicalID, attachedHandles, err := s.attachHandlesForRelationship(ctx, scope, relationship)
	if err != nil {
		return "", "", attachedHandles, err
	}
	now := s.now().UTC()
	duplicate.Status = stores.SourceDocumentStatusMerged
	duplicate.UpdatedAt = now
	if _, err := s.lineage.SaveSourceDocument(ctx, scope, duplicate); err != nil {
		return "", "", attachedHandles, err
	}
	return firstNonEmpty(canonicalID, canonical.ID), duplicate.ID, attachedHandles, nil
}

func (s DefaultSourceReconciliationService) refreshSearchAfterReview(ctx context.Context, scope stores.Scope, sourceDocumentIDs ...string) error {
	if s.search == nil {
		return nil
	}
	success := true
	var firstErr error
	seen := map[string]struct{}{}
	for _, sourceDocumentID := range sourceDocumentIDs {
		sourceDocumentID = strings.TrimSpace(sourceDocumentID)
		if sourceDocumentID == "" {
			continue
		}
		if _, ok := seen[sourceDocumentID]; ok {
			continue
		}
		seen[sourceDocumentID] = struct{}{}
		if _, err := s.search.ReindexSourceDocument(ctx, scope, sourceDocumentID); err != nil {
			success = false
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	observability.ObserveSourceSearchFreshness(ctx, "reconciliation_review", success)
	return firstErr
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

func reconciliationEvidenceSignature(evidence map[string]any) string {
	keys := []string{
		"candidate_reason",
		"exact_artifact_match",
		"normalized_text_similarity",
		"chunk_overlap",
		"title_similarity",
		"temporal_proximity",
		"account_match",
		"drive_match",
		"web_url_match",
		"owner_match",
		"folder_match",
		"target_source_document_id",
		"target_source_revision_id",
		"target_source_artifact_id",
		"target_extract_version",
		"candidate_source_document_id",
		"candidate_source_revision_id",
		"candidate_source_artifact_id",
		"candidate_extract_version",
	}
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+reconciliationEvidenceValue(evidence[key]))
	}
	return hashFingerprintValue(strings.Join(parts, "|"))
}

func reconciliationEvidenceValue(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	case float64:
		return fmt.Sprintf("%.6f", typed)
	case float32:
		return fmt.Sprintf("%.6f", typed)
	case int:
		return fmt.Sprintf("%d", typed)
	case int64:
		return fmt.Sprintf("%d", typed)
	case nil:
		return ""
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
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
