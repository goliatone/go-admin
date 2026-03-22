package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	sourceResolutionExactActiveHandle = "exact_active_handle"
	sourceResolutionHighConfidence    = "high_confidence_attach"
	sourceResolutionCandidateCreated  = "candidate_created"
	sourceResolutionNewSource         = "new_source"
)

type DefaultSourceIdentityService struct {
	store stores.LineageStore
	now   func() time.Time
}

type SourceIdentityServiceOption func(*DefaultSourceIdentityService)

type sourceHandleBinding struct {
	Document       stores.SourceDocumentRecord
	Handle         stores.SourceHandleRecord
	ReusedExisting bool
}

type sourceCandidateContext struct {
	Document         stores.SourceDocumentRecord
	Handle           stores.SourceHandleRecord
	DriveID          string
	OwnerEmail       string
	ParentID         string
	WebURL           string
	RevisionHint     string
	SourceHandleSeen bool
}

func WithSourceIdentityClock(now func() time.Time) SourceIdentityServiceOption {
	return func(s *DefaultSourceIdentityService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func NewDefaultSourceIdentityService(store stores.LineageStore, opts ...SourceIdentityServiceOption) DefaultSourceIdentityService {
	svc := DefaultSourceIdentityService{
		store: store,
		now:   func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s DefaultSourceIdentityService) forTx(tx stores.TxStore) DefaultSourceIdentityService {
	txSvc := s
	if lineage, ok := tx.(stores.LineageStore); ok {
		txSvc.store = lineage
	}
	return txSvc
}

func (s DefaultSourceIdentityService) ResolveSourceIdentity(ctx context.Context, scope stores.Scope, input SourceIdentityResolutionInput) (SourceIdentityResolution, error) {
	if s.store == nil {
		return SourceIdentityResolution{}, domainValidationError("lineage", "store", "not configured")
	}

	metadata := normalizeSourceMetadataBaseline(input.Metadata)
	providerKind := strings.TrimSpace(input.ProviderKind)
	if providerKind == "" {
		providerKind = stores.SourceProviderKindGoogleDrive
	}
	if metadata.ExternalFileID == "" {
		return SourceIdentityResolution{}, domainValidationError("lineage", "external_file_id", "required")
	}

	if active, err := s.store.GetActiveSourceHandle(ctx, scope, providerKind, metadata.ExternalFileID, metadata.AccountID); err == nil {
		document, err := s.store.GetSourceDocument(ctx, scope, active.SourceDocumentID)
		if err != nil {
			return SourceIdentityResolution{}, err
		}
		revision, err := s.resolveRevision(ctx, scope, document, active, metadata, input)
		if err != nil {
			return SourceIdentityResolution{}, err
		}
		return SourceIdentityResolution{
			SourceDocument: document,
			SourceHandle:   active,
			SourceRevision: revision,
			ResolutionKind: sourceResolutionExactActiveHandle,
			ConfidenceBand: stores.LineageConfidenceBandExact,
		}, nil
	} else if !isNotFound(err) {
		return SourceIdentityResolution{}, err
	}

	if document, handle, ok, err := s.findHighConfidenceAttach(ctx, scope, providerKind, metadata); err != nil {
		return SourceIdentityResolution{}, err
	} else if ok {
		revision, err := s.resolveRevision(ctx, scope, document, handle, metadata, input)
		if err != nil {
			return SourceIdentityResolution{}, err
		}
		return SourceIdentityResolution{
			SourceDocument: document,
			SourceHandle:   handle,
			SourceRevision: revision,
			ResolutionKind: sourceResolutionHighConfidence,
			ConfidenceBand: stores.LineageConfidenceBandHigh,
		}, nil
	}

	candidateTarget, candidateBand, candidateScore, err := s.findCandidateTarget(ctx, scope, providerKind, metadata)
	if err != nil {
		return SourceIdentityResolution{}, err
	}

	document, err := s.createSourceDocument(ctx, scope, providerKind, metadata.TitleHint, stores.LineageConfidenceBandMedium)
	if err != nil {
		return SourceIdentityResolution{}, err
	}
	binding, err := s.resolveOrCreateSourceHandle(ctx, scope, document, providerKind, metadata, stores.SourceHandleStatusActive)
	if err != nil {
		return SourceIdentityResolution{}, err
	}
	if binding.ReusedExisting && binding.Document.ID != document.ID {
		if mergeErr := s.markSourceDocumentMerged(ctx, scope, document, binding.Document.ID); mergeErr != nil {
			return SourceIdentityResolution{}, mergeErr
		}
	}
	document = binding.Document
	handle := binding.Handle
	revision, err := s.resolveRevision(ctx, scope, document, handle, metadata, input)
	if err != nil {
		return SourceIdentityResolution{}, err
	}

	result := SourceIdentityResolution{
		SourceDocument: document,
		SourceHandle:   handle,
		SourceRevision: revision,
		ResolutionKind: sourceResolutionNewSource,
		ConfidenceBand: stores.LineageConfidenceBandMedium,
	}
	if binding.ReusedExisting {
		result.ResolutionKind = sourceResolutionExactActiveHandle
		result.ConfidenceBand = stores.LineageConfidenceBandExact
		return result, nil
	}
	if candidateTarget.ID == "" {
		return result, nil
	}

	relationship, err := s.createCandidateRelationship(ctx, scope, document.ID, candidateTarget.ID, candidateBand, candidateScore, input.ActorID, metadata)
	if err != nil {
		return SourceIdentityResolution{}, err
	}
	result.ResolutionKind = sourceResolutionCandidateCreated
	result.CandidateRelationship = &relationship
	return result, nil
}

func (s DefaultSourceIdentityService) findHighConfidenceAttach(ctx context.Context, scope stores.Scope, providerKind string, metadata SourceMetadataBaseline) (stores.SourceDocumentRecord, stores.SourceHandleRecord, bool, error) {
	if metadata.WebURL == "" && metadata.TitleHint == "" {
		return stores.SourceDocumentRecord{}, stores.SourceHandleRecord{}, false, nil
	}
	documents, err := s.store.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{
		ProviderKind:   providerKind,
		CanonicalTitle: metadata.TitleHint,
		Status:         stores.SourceDocumentStatusActive,
	})
	if err != nil {
		return stores.SourceDocumentRecord{}, stores.SourceHandleRecord{}, false, err
	}
	for _, document := range documents {
		handles, err := s.store.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
			SourceDocumentID: document.ID,
			ProviderKind:     providerKind,
			ActiveOnly:       true,
		})
		if err != nil {
			return stores.SourceDocumentRecord{}, stores.SourceHandleRecord{}, false, err
		}
		for _, handle := range handles {
			if metadata.WebURL != "" && strings.EqualFold(strings.TrimSpace(handle.WebURL), metadata.WebURL) {
				return s.attachHandleIfNeeded(ctx, scope, document, handle, providerKind, metadata)
			}
		}
	}
	return stores.SourceDocumentRecord{}, stores.SourceHandleRecord{}, false, nil
}

func (s DefaultSourceIdentityService) attachHandleIfNeeded(ctx context.Context, scope stores.Scope, document stores.SourceDocumentRecord, handle stores.SourceHandleRecord, providerKind string, metadata SourceMetadataBaseline) (stores.SourceDocumentRecord, stores.SourceHandleRecord, bool, error) {
	if strings.EqualFold(strings.TrimSpace(handle.ExternalFileID), metadata.ExternalFileID) &&
		strings.EqualFold(strings.TrimSpace(handle.AccountID), metadata.AccountID) {
		return document, handle, true, nil
	}
	binding, err := s.resolveOrCreateSourceHandle(ctx, scope, document, providerKind, metadata, stores.SourceHandleStatusActive)
	if err != nil {
		return stores.SourceDocumentRecord{}, stores.SourceHandleRecord{}, false, err
	}
	return binding.Document, binding.Handle, true, nil
}

func (s DefaultSourceIdentityService) findCandidateTarget(ctx context.Context, scope stores.Scope, providerKind string, metadata SourceMetadataBaseline) (stores.SourceDocumentRecord, string, float64, error) {
	if metadata.TitleHint == "" {
		return stores.SourceDocumentRecord{}, "", 0, nil
	}
	documents, err := s.store.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{
		ProviderKind:   providerKind,
		CanonicalTitle: metadata.TitleHint,
		Status:         stores.SourceDocumentStatusActive,
	})
	if err != nil {
		return stores.SourceDocumentRecord{}, "", 0, err
	}
	bestDocument := stores.SourceDocumentRecord{}
	bestScore := 0.0
	for _, document := range documents {
		score, err := s.scoreCandidateTarget(ctx, scope, document, providerKind, metadata)
		if err != nil {
			return stores.SourceDocumentRecord{}, "", 0, err
		}
		if score >= 0.5 && score > bestScore {
			bestDocument = document
			bestScore = score
		}
	}
	if strings.TrimSpace(bestDocument.ID) != "" {
		return bestDocument, stores.LineageConfidenceBandMedium, bestScore, nil
	}
	return stores.SourceDocumentRecord{}, "", 0, nil
}

func (s DefaultSourceIdentityService) scoreCandidateTarget(ctx context.Context, scope stores.Scope, document stores.SourceDocumentRecord, providerKind string, metadata SourceMetadataBaseline) (float64, error) {
	contexts, err := s.loadCandidateContexts(ctx, scope, document, providerKind)
	if err != nil {
		return 0, err
	}
	bestScore := 0.0
	for _, candidate := range contexts {
		score := 0.0
		corroborationCount := 0
		if metadata.DriveID != "" && strings.EqualFold(strings.TrimSpace(metadata.DriveID), strings.TrimSpace(firstNonEmpty(candidate.DriveID, candidate.Handle.DriveID))) {
			score += 0.35
			corroborationCount++
		}
		if metadata.ParentID != "" && strings.EqualFold(strings.TrimSpace(metadata.ParentID), strings.TrimSpace(candidate.ParentID)) {
			score += 0.2
			corroborationCount++
		}
		if metadata.OwnerEmail != "" && strings.EqualFold(strings.TrimSpace(metadata.OwnerEmail), strings.TrimSpace(candidate.OwnerEmail)) {
			score += 0.35
			corroborationCount++
		}
		if metadata.WebURL != "" && strings.EqualFold(strings.TrimSpace(metadata.WebURL), strings.TrimSpace(firstNonEmpty(candidate.WebURL, candidate.Handle.WebURL))) {
			score += 0.15
			corroborationCount++
		}
		if metadata.SourceVersionHint != "" && strings.EqualFold(strings.TrimSpace(metadata.SourceVersionHint), strings.TrimSpace(candidate.RevisionHint)) {
			score += 0.15
			corroborationCount++
		}
		if corroborationCount == 0 {
			continue
		}
		if score > bestScore {
			bestScore = score
		}
	}
	return bestScore, nil
}

func (s DefaultSourceIdentityService) loadCandidateContexts(ctx context.Context, scope stores.Scope, document stores.SourceDocumentRecord, providerKind string) ([]sourceCandidateContext, error) {
	handles, err := s.store.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
		SourceDocumentID: document.ID,
		ProviderKind:     providerKind,
		ActiveOnly:       true,
	})
	if err != nil {
		return nil, err
	}
	if len(handles) == 0 {
		return nil, nil
	}

	contexts := make([]sourceCandidateContext, 0, len(handles))
	for _, handle := range handles {
		candidate := sourceCandidateContext{
			Document:         document,
			Handle:           handle,
			DriveID:          strings.TrimSpace(handle.DriveID),
			WebURL:           strings.TrimSpace(handle.WebURL),
			SourceHandleSeen: true,
		}
		revisions, err := s.store.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{
			SourceDocumentID: document.ID,
			SourceHandleID:   handle.ID,
		})
		if err != nil {
			return nil, err
		}
		for _, revision := range revisions {
			ownerEmail, driveID, parentID, webURL := revisionMetadataCandidateContext(revision.MetadataJSON)
			if candidate.OwnerEmail == "" {
				candidate.OwnerEmail = ownerEmail
			}
			if candidate.DriveID == "" {
				candidate.DriveID = driveID
			}
			if candidate.ParentID == "" {
				candidate.ParentID = parentID
			}
			if candidate.WebURL == "" {
				candidate.WebURL = webURL
			}
			if candidate.RevisionHint == "" {
				candidate.RevisionHint = strings.TrimSpace(revision.ProviderRevisionHint)
			}
		}
		contexts = append(contexts, candidate)
	}
	return contexts, nil
}

func (s DefaultSourceIdentityService) resolveRevision(ctx context.Context, scope stores.Scope, document stores.SourceDocumentRecord, handle stores.SourceHandleRecord, metadata SourceMetadataBaseline, input SourceIdentityResolutionInput) (stores.SourceRevisionRecord, error) {
	if strings.TrimSpace(handle.SourceDocumentID) != strings.TrimSpace(document.ID) {
		return stores.SourceRevisionRecord{}, fmt.Errorf("source handle %s belongs to source document %s, not %s", strings.TrimSpace(handle.ID), strings.TrimSpace(handle.SourceDocumentID), strings.TrimSpace(document.ID))
	}
	revisions, err := s.store.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{
		SourceDocumentID: document.ID,
	})
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}

	signature := buildCanonicalRevisionSignature(metadata, input.RevisionContentSHA256)
	for _, revision := range revisions {
		if metadata.SourceVersionHint != "" && strings.EqualFold(strings.TrimSpace(revision.ProviderRevisionHint), metadata.SourceVersionHint) {
			return revision, nil
		}
		if input.RevisionContentSHA256 != "" && strings.EqualFold(revisionContentSHA256FromMetadata(revision.MetadataJSON), input.RevisionContentSHA256) {
			return revision, nil
		}
		if signature != "" && revisionSignatureFromMetadata(revision.MetadataJSON) == signature {
			return revision, nil
		}
	}

	metadataJSON, err := buildRevisionMetadataJSON(metadata, input, signature)
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	createdAt := s.now().UTC()
	return s.store.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		SourceDocumentID:     document.ID,
		SourceHandleID:       handle.ID,
		ProviderRevisionHint: metadata.SourceVersionHint,
		ModifiedTime:         cloneSourceTimePtr(metadata.ModifiedTime),
		ExportedAt:           &createdAt,
		ExportedByUserID:     strings.TrimSpace(input.ActorID),
		SourceMimeType:       strings.TrimSpace(metadata.SourceMimeType),
		MetadataJSON:         metadataJSON,
		CreatedAt:            createdAt,
		UpdatedAt:            createdAt,
	})
}

func (s DefaultSourceIdentityService) createSourceDocument(ctx context.Context, scope stores.Scope, providerKind, title, confidence string) (stores.SourceDocumentRecord, error) {
	now := s.now().UTC()
	return s.store.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      strings.TrimSpace(providerKind),
		CanonicalTitle:    canonicalLineageTitle(title),
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: strings.TrimSpace(confidence),
		CreatedAt:         now,
		UpdatedAt:         now,
	})
}

func (s DefaultSourceIdentityService) resolveOrCreateSourceHandle(ctx context.Context, scope stores.Scope, document stores.SourceDocumentRecord, providerKind string, metadata SourceMetadataBaseline, status string) (sourceHandleBinding, error) {
	now := s.now().UTC()
	record := stores.SourceHandleRecord{
		SourceDocumentID: strings.TrimSpace(document.ID),
		ProviderKind:     strings.TrimSpace(providerKind),
		ExternalFileID:   strings.TrimSpace(metadata.ExternalFileID),
		AccountID:        strings.TrimSpace(metadata.AccountID),
		DriveID:          strings.TrimSpace(metadata.DriveID),
		WebURL:           strings.TrimSpace(metadata.WebURL),
		HandleStatus:     strings.TrimSpace(status),
		ValidFrom:        &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	handle, err := s.store.CreateSourceHandle(ctx, scope, record)
	if err == nil {
		return sourceHandleBinding{Document: document, Handle: handle}, nil
	}
	if active, activeErr := s.store.GetActiveSourceHandle(ctx, scope, providerKind, metadata.ExternalFileID, metadata.AccountID); activeErr == nil {
		owner, ownerErr := s.store.GetSourceDocument(ctx, scope, active.SourceDocumentID)
		if ownerErr != nil {
			return sourceHandleBinding{}, ownerErr
		}
		return sourceHandleBinding{Document: owner, Handle: active, ReusedExisting: true}, nil
	}
	return sourceHandleBinding{}, err
}

func (s DefaultSourceIdentityService) markSourceDocumentMerged(ctx context.Context, scope stores.Scope, duplicate stores.SourceDocumentRecord, canonicalID string) error {
	if strings.TrimSpace(duplicate.ID) == "" || strings.TrimSpace(duplicate.ID) == strings.TrimSpace(canonicalID) {
		return nil
	}
	duplicate.Status = stores.SourceDocumentStatusMerged
	duplicate.UpdatedAt = s.now().UTC()
	_, err := s.store.SaveSourceDocument(ctx, scope, duplicate)
	return err
}

func (s DefaultSourceIdentityService) createCandidateRelationship(ctx context.Context, scope stores.Scope, leftID, rightID, band string, score float64, actorID string, metadata SourceMetadataBaseline) (stores.SourceRelationshipRecord, error) {
	if strings.TrimSpace(leftID) == "" || strings.TrimSpace(rightID) == "" {
		return stores.SourceRelationshipRecord{}, fmt.Errorf("candidate relationship source ids are required")
	}
	orderedLeft, orderedRight := orderedRelationshipIDs(leftID, rightID)
	evidenceJSON, err := json.Marshal(map[string]any{
		"candidate_reason": "matching_title_with_partial_google_context",
		"title_hint":       metadata.TitleHint,
		"owner_email":      metadata.OwnerEmail,
		"parent_id":        metadata.ParentID,
		"web_url":          metadata.WebURL,
	})
	if err != nil {
		return stores.SourceRelationshipRecord{}, err
	}
	now := s.now().UTC()
	return s.store.CreateSourceRelationship(ctx, scope, stores.SourceRelationshipRecord{
		LeftSourceDocumentID:        orderedLeft,
		RightSourceDocumentID:       orderedRight,
		PredecessorSourceDocumentID: strings.TrimSpace(rightID),
		SuccessorSourceDocumentID:   strings.TrimSpace(leftID),
		RelationshipType:            stores.SourceRelationshipTypeSameLogicalDoc,
		ConfidenceBand:              strings.TrimSpace(band),
		ConfidenceScore:             score,
		Status:                      stores.SourceRelationshipStatusPendingReview,
		EvidenceJSON:                string(evidenceJSON),
		CreatedByUserID:             strings.TrimSpace(actorID),
		CreatedAt:                   now,
		UpdatedAt:                   now,
	})
}

func normalizeSourceMetadataBaseline(metadata SourceMetadataBaseline) SourceMetadataBaseline {
	normalized := metadata
	normalized.AccountID = strings.TrimSpace(metadata.AccountID)
	normalized.ExternalFileID = strings.TrimSpace(metadata.ExternalFileID)
	normalized.DriveID = strings.TrimSpace(metadata.DriveID)
	normalized.WebURL = strings.TrimSpace(metadata.WebURL)
	normalized.SourceVersionHint = strings.TrimSpace(metadata.SourceVersionHint)
	normalized.SourceMimeType = strings.TrimSpace(metadata.SourceMimeType)
	normalized.SourceIngestionMode = strings.TrimSpace(metadata.SourceIngestionMode)
	normalized.TitleHint = canonicalLineageTitle(metadata.TitleHint)
	normalized.OwnerEmail = strings.TrimSpace(strings.ToLower(metadata.OwnerEmail))
	normalized.ParentID = strings.TrimSpace(metadata.ParentID)
	normalized.ModifiedTime = cloneSourceTimePtr(metadata.ModifiedTime)
	return normalized
}

func canonicalLineageTitle(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Untitled Source"
	}
	return value
}

func cloneSourceTimePtr(value *time.Time) *time.Time {
	if value == nil || value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func buildRevisionMetadataJSON(metadata SourceMetadataBaseline, input SourceIdentityResolutionInput, signature string) (string, error) {
	payload := map[string]any{
		"origin":                  "native_google_import",
		"external_file_id":        metadata.ExternalFileID,
		"account_id":              metadata.AccountID,
		"drive_id":                metadata.DriveID,
		"web_url":                 metadata.WebURL,
		"title_hint":              metadata.TitleHint,
		"owner_email":             metadata.OwnerEmail,
		"parent_id":               metadata.ParentID,
		"source_version_hint":     metadata.SourceVersionHint,
		"revision_signature":      signature,
		"revision_content_sha256": strings.TrimSpace(input.RevisionContentSHA256),
		"actor_id":                strings.TrimSpace(input.ActorID),
		"correlation_id":          strings.TrimSpace(input.CorrelationID),
		"idempotency_key":         strings.TrimSpace(input.IdempotencyKey),
	}
	if metadata.ModifiedTime != nil {
		payload["modified_time"] = metadata.ModifiedTime.UTC().Format(time.RFC3339Nano)
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func revisionSignatureFromMetadata(raw string) string {
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded); err != nil {
		return ""
	}
	if value, ok := decoded["revision_signature"].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func revisionContentSHA256FromMetadata(raw string) string {
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded); err != nil {
		return ""
	}
	if value, ok := decoded["revision_content_sha256"].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func revisionMetadataCandidateContext(raw string) (ownerEmail string, driveID string, parentID string, webURL string) {
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded); err != nil {
		return "", "", "", ""
	}
	if value, ok := decoded["owner_email"].(string); ok {
		ownerEmail = strings.TrimSpace(strings.ToLower(value))
	}
	if value, ok := decoded["drive_id"].(string); ok {
		driveID = strings.TrimSpace(value)
	}
	if value, ok := decoded["parent_id"].(string); ok {
		parentID = strings.TrimSpace(value)
	}
	if value, ok := decoded["web_url"].(string); ok {
		webURL = strings.TrimSpace(value)
	}
	return ownerEmail, driveID, parentID, webURL
}

func buildCanonicalRevisionSignature(metadata SourceMetadataBaseline, contentSHA256 string) string {
	contentSHA256 = strings.TrimSpace(strings.ToLower(contentSHA256))
	if contentSHA256 == "" {
		return ""
	}
	return strings.Join([]string{
		"source_mime_type=" + strings.TrimSpace(strings.ToLower(metadata.SourceMimeType)),
		"content_sha256=" + contentSHA256,
	}, "|")
}

func orderedRelationshipIDs(leftID, rightID string) (string, string) {
	if strings.Compare(strings.TrimSpace(leftID), strings.TrimSpace(rightID)) <= 0 {
		return strings.TrimSpace(leftID), strings.TrimSpace(rightID)
	}
	return strings.TrimSpace(rightID), strings.TrimSpace(leftID)
}
