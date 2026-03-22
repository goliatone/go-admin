package services

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	lineageEvidenceKeyNormalizedTextSimilarity = "normalized_text_similarity"
	lineageEvidenceKeyTitleSimilarity          = "title_similarity"
	lineageEvidenceKeyAccountMatch             = "account_match"
	lineageEvidenceKeyDriveMatch               = "drive_match"
	lineageEvidenceKeyWebURLMatch              = "web_url_match"
	lineageEvidenceKeyLegacyWebURL             = "web_url"
	lineageJobResourceKindSourceRevision       = "source_revision"
	lineageJobNameSourceLineageProcessing      = "jobs.esign.source_lineage_processing"
)

type DefaultSourceReadModelService struct {
	documents           stores.DocumentStore
	agreements          stores.AgreementStore
	lineage             stores.LineageStore
	importRuns          stores.GoogleImportRunStore
	jobRuns             stores.JobRunStore
	sourceSearch        SourceSearchService
	diagnosticsBasePath string
}

type SourceReadModelServiceOption func(*DefaultSourceReadModelService)

func WithSourceReadModelImportRuns(store stores.GoogleImportRunStore) SourceReadModelServiceOption {
	return func(s *DefaultSourceReadModelService) {
		if s == nil || store == nil {
			return
		}
		s.importRuns = store
	}
}

func WithSourceReadModelJobRuns(store stores.JobRunStore) SourceReadModelServiceOption {
	return func(s *DefaultSourceReadModelService) {
		if s == nil || store == nil {
			return
		}
		s.jobRuns = store
	}
}

func WithSourceReadModelDiagnosticsBasePath(basePath string) SourceReadModelServiceOption {
	return func(s *DefaultSourceReadModelService) {
		if s == nil {
			return
		}
		basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
		if basePath == "/" {
			basePath = ""
		}
		s.diagnosticsBasePath = basePath
	}
}

func NewDefaultSourceReadModelService(
	documents stores.DocumentStore,
	agreements stores.AgreementStore,
	lineage stores.LineageStore,
	opts ...SourceReadModelServiceOption,
) DefaultSourceReadModelService {
	svc := DefaultSourceReadModelService{
		documents:           documents,
		agreements:          agreements,
		lineage:             lineage,
		diagnosticsBasePath: DefaultLineageDiagnosticsBasePath,
	}
	if lineage != nil {
		search := NewDefaultSourceSearchService(lineage)
		svc.sourceSearch = search
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s DefaultSourceReadModelService) GetDocumentLineageDetail(ctx context.Context, scope stores.Scope, documentID string) (DocumentLineageDetail, error) {
	if s.documents == nil {
		return DocumentLineageDetail{}, domainValidationError("lineage_read_models", "documents", "not configured")
	}
	document, err := s.documents.Get(ctx, scope, strings.TrimSpace(documentID))
	if err != nil {
		return DocumentLineageDetail{}, err
	}
	return s.buildDocumentLineageDetail(ctx, scope, document)
}

func (s DefaultSourceReadModelService) GetAgreementLineageDetail(ctx context.Context, scope stores.Scope, agreementID string) (AgreementLineageDetail, error) {
	if s.agreements == nil {
		return AgreementLineageDetail{}, domainValidationError("lineage_read_models", "agreements", "not configured")
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return AgreementLineageDetail{}, err
	}
	return s.buildAgreementLineageDetail(ctx, scope, agreement)
}

func (s DefaultSourceReadModelService) GetGoogleImportLineageStatus(ctx context.Context, scope stores.Scope, importRunID string) (GoogleImportLineageStatus, error) {
	if s.importRuns == nil {
		return GoogleImportLineageStatus{}, domainValidationError("lineage_read_models", "google_import_runs", "not configured")
	}
	run, err := s.importRuns.GetGoogleImportRun(ctx, scope, strings.TrimSpace(importRunID))
	if err != nil {
		return GoogleImportLineageStatus{}, err
	}
	return s.buildGoogleImportLineageStatus(ctx, scope, run)
}

func (s DefaultSourceReadModelService) ListCandidateWarnings(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]CandidateWarningSummary, error) {
	if s.lineage == nil {
		return nil, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return nil, nil
	}
	relationships, err := s.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: sourceDocumentID,
	})
	if err != nil {
		return nil, err
	}
	out := make([]CandidateWarningSummary, 0, len(relationships))
	for _, relationship := range relationships {
		if strings.TrimSpace(relationship.Status) != stores.SourceRelationshipStatusPendingReview {
			continue
		}
		out = append(out, candidateWarningSummaryFromRelationship(relationship))
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].ConfidenceScore == out[j].ConfidenceScore {
			return out[i].ID < out[j].ID
		}
		return out[i].ConfidenceScore > out[j].ConfidenceScore
	})
	return out, nil
}

func (s DefaultSourceReadModelService) buildDocumentLineageDetail(ctx context.Context, scope stores.Scope, document stores.DocumentRecord) (DocumentLineageDetail, error) {
	detail := DocumentLineageDetail{
		DocumentID: strings.TrimSpace(document.ID),
		FingerprintStatus: FingerprintStatusSummary{
			Status:            LineageFingerprintStatusNotApplicable,
			EvidenceAvailable: false,
		},
		FingerprintProcessing: FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingNotApplicable,
			StatusLabel: "Not applicable",
		},
		DiagnosticsURL: s.diagnosticsURL("documents", document.ID),
		EmptyState:     noSourceDocumentEmptyState(),
	}

	hasLineageRefs := strings.TrimSpace(document.SourceDocumentID) != "" && strings.TrimSpace(document.SourceRevisionID) != ""
	if !hasLineageRefs {
		detail.PresentationWarnings = BuildDocumentPresentationWarnings(detail)
		return detail, nil
	}
	if s.lineage == nil {
		detail.FingerprintStatus = FingerprintStatusSummary{
			Status:            LineageFingerprintStatusUnknown,
			EvidenceAvailable: false,
		}
		detail.FingerprintProcessing = FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingUnknown,
			StatusLabel: "Unknown",
		}
		detail.EmptyState = LineageEmptyState{Kind: LineageEmptyStateNone}
		detail.PresentationWarnings = BuildDocumentPresentationWarnings(detail)
		return detail, nil
	}

	resolved, err := s.resolveDocumentLineage(ctx, scope, document)
	if err != nil {
		return DocumentLineageDetail{}, err
	}

	detail.SourceDocument = resolved.sourceDocumentReference()
	detail.SourceRevision = resolved.sourceRevisionSummary()
	detail.SourceArtifact = resolved.documentArtifactSummary()
	detail.GoogleSource = resolved.metadataBaseline(document)
	detail.FingerprintStatus = resolved.fingerprintStatus()
	detail.FingerprintProcessing = resolved.fingerprintProcessing()
	detail.CandidateWarningSummary = resolved.candidateWarnings
	detail.EmptyState = LineageEmptyState{Kind: LineageEmptyStateNone}
	detail.PresentationWarnings = BuildDocumentPresentationWarnings(detail)
	return detail, nil
}

func (s DefaultSourceReadModelService) buildAgreementLineageDetail(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord) (AgreementLineageDetail, error) {
	detail := AgreementLineageDetail{
		AgreementID:            strings.TrimSpace(agreement.ID),
		PinnedSourceRevisionID: strings.TrimSpace(agreement.SourceRevisionID),
		DiagnosticsURL:         s.diagnosticsURL("agreements", agreement.ID),
		FingerprintProcessing: FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingNotApplicable,
			StatusLabel: "Not applicable",
		},
		EmptyState: LineageEmptyState{
			Kind:        LineageEmptyStateNoSource,
			Title:       "No source lineage",
			Description: "This agreement is linked to a document without source provenance.",
		},
	}

	if s.lineage == nil {
		detail.PresentationWarnings = BuildAgreementPresentationWarnings(detail)
		return detail, nil
	}

	document := stores.DocumentRecord{}
	if s.documents != nil && strings.TrimSpace(agreement.DocumentID) != "" {
		loaded, err := s.documents.Get(ctx, scope, agreement.DocumentID)
		if err != nil && !isNotFound(err) {
			return AgreementLineageDetail{}, err
		}
		document = loaded
	}

	pinnedRevisionID := strings.TrimSpace(agreement.SourceRevisionID)
	if pinnedRevisionID == "" {
		detail.PresentationWarnings = BuildAgreementPresentationWarnings(detail)
		return detail, nil
	}

	resolved, err := s.resolveAgreementLineage(ctx, scope, agreement, document, pinnedRevisionID)
	if err != nil {
		return AgreementLineageDetail{}, err
	}

	detail.PinnedSourceRevisionID = pinnedRevisionID
	detail.SourceDocument = resolved.sourceDocumentReference()
	detail.SourceRevision = resolved.sourceRevisionSummary()
	detail.LinkedDocumentArtifact = resolved.agreementArtifactSummary(document)
	detail.GoogleSource = resolved.metadataBaseline(document)
	detail.FingerprintProcessing = resolved.fingerprintProcessing()
	detail.NewerSourceExists = resolved.newerSourceExists()
	detail.NewerSourceSummary = resolved.newerSourceSummary()
	detail.CandidateWarningSummary = resolved.candidateWarnings
	detail.EmptyState = LineageEmptyState{Kind: LineageEmptyStateNone}
	detail.PresentationWarnings = BuildAgreementPresentationWarnings(detail)
	return detail, nil
}

func (s DefaultSourceReadModelService) buildGoogleImportLineageStatus(ctx context.Context, scope stores.Scope, run stores.GoogleImportRunRecord) (GoogleImportLineageStatus, error) {
	status := GoogleImportLineageStatus{
		ImportRunID:           strings.TrimSpace(run.ID),
		LineageStatus:         normalizeImportLineageStatus(run),
		FingerprintStatus:     FingerprintStatusSummary{Status: firstNonEmpty(strings.TrimSpace(run.FingerprintStatus), LineageFingerprintStatusUnknown), EvidenceAvailable: false},
		FingerprintProcessing: fingerprintProcessingFromImportRun(run),
		DocumentDetailURL:     strings.TrimSpace(run.DocumentDetailURL),
		AgreementDetailURL:    strings.TrimSpace(run.AgreementDetailURL),
	}
	if strings.TrimSpace(run.CandidateStatusJSON) != "" {
		_ = json.Unmarshal([]byte(strings.TrimSpace(run.CandidateStatusJSON)), &status.CandidateStatus)
	}
	if s.lineage == nil {
		return status, nil
	}

	sourceDocumentID := strings.TrimSpace(run.SourceDocumentID)
	sourceRevisionID := strings.TrimSpace(run.SourceRevisionID)
	sourceArtifactID := strings.TrimSpace(run.SourceArtifactID)

	if sourceDocumentID == "" && s.documents != nil && strings.TrimSpace(run.DocumentID) != "" {
		document, err := s.documents.Get(ctx, scope, run.DocumentID)
		if err == nil {
			sourceDocumentID = strings.TrimSpace(document.SourceDocumentID)
			if sourceRevisionID == "" {
				sourceRevisionID = strings.TrimSpace(document.SourceRevisionID)
			}
			if sourceArtifactID == "" {
				sourceArtifactID = strings.TrimSpace(document.SourceArtifactID)
			}
		} else if !isNotFound(err) {
			return GoogleImportLineageStatus{}, err
		}
	}
	if sourceRevisionID == "" && s.agreements != nil && strings.TrimSpace(run.AgreementID) != "" {
		agreement, err := s.agreements.GetAgreement(ctx, scope, run.AgreementID)
		if err == nil {
			sourceRevisionID = strings.TrimSpace(agreement.SourceRevisionID)
		} else if !isNotFound(err) {
			return GoogleImportLineageStatus{}, err
		}
	}
	if sourceDocumentID != "" {
		sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
		if err != nil {
			return GoogleImportLineageStatus{}, err
		}
		status.SourceDocument = &LineageReference{
			ID:    strings.TrimSpace(sourceDocument.ID),
			Label: strings.TrimSpace(sourceDocument.CanonicalTitle),
		}
	}
	if sourceRevisionID != "" {
		sourceRevision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
		if err != nil {
			return GoogleImportLineageStatus{}, err
		}
		status.SourceRevision = sourceRevisionSummaryFromRecord(sourceRevision)
		status.FingerprintStatus, status.FingerprintProcessing = s.fingerprintStateForRevision(ctx, scope, sourceRevision)
	}
	if sourceArtifactID != "" {
		sourceArtifact, err := s.lineage.GetSourceArtifact(ctx, scope, sourceArtifactID)
		if err != nil {
			return GoogleImportLineageStatus{}, err
		}
		status.SourceArtifact = sourceArtifactSummaryFromRecord(sourceArtifact)
	}
	if sourceDocumentID != "" {
		warnings, err := s.ListCandidateWarnings(ctx, scope, sourceDocumentID)
		if err != nil {
			return GoogleImportLineageStatus{}, err
		}
		status.CandidateStatus = warnings
	}
	return status, nil
}

func (s DefaultSourceReadModelService) resolveDocumentLineage(ctx context.Context, scope stores.Scope, document stores.DocumentRecord) (resolvedLineageContext, error) {
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, document.SourceDocumentID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	sourceRevision, err := s.lineage.GetSourceRevision(ctx, scope, document.SourceRevisionID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	revisionHandle, err := s.handleForSourceRevision(ctx, scope, sourceRevision, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	activeHandle, err := s.activeHandleForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	latestRevision, err := s.latestRevisionForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	artifact, err := s.documentArtifact(ctx, scope, document, sourceRevision.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	warnings, err := s.ListCandidateWarnings(ctx, scope, sourceDocument.ID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: sourceRevision.ID,
	})
	if err != nil {
		return resolvedLineageContext{}, err
	}
	jobRuns, err := s.listLineageJobRuns(ctx, scope, sourceRevision.ID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	return resolvedLineageContext{
		sourceDocument:    sourceDocument,
		sourceRevision:    sourceRevision,
		latestRevision:    latestRevision,
		sourceArtifact:    artifact,
		revisionHandle:    revisionHandle,
		activeHandle:      activeHandle,
		fingerprints:      fingerprints,
		lineageJobs:       jobRuns,
		candidateWarnings: warnings,
	}, nil
}

func (s DefaultSourceReadModelService) resolveAgreementLineage(
	ctx context.Context,
	scope stores.Scope,
	agreement stores.AgreementRecord,
	document stores.DocumentRecord,
	pinnedRevisionID string,
) (resolvedLineageContext, error) {
	sourceRevision, err := s.lineage.GetSourceRevision(ctx, scope, pinnedRevisionID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	sourceDocumentID := firstNonEmpty(strings.TrimSpace(document.SourceDocumentID), strings.TrimSpace(sourceRevision.SourceDocumentID))
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	revisionHandle, err := s.handleForSourceRevision(ctx, scope, sourceRevision, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	activeHandle, err := s.activeHandleForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	latestRevision, err := s.latestRevisionForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	artifact, err := s.documentArtifact(ctx, scope, document, sourceRevision.ID)
	if err != nil && !isNotFound(err) {
		return resolvedLineageContext{}, err
	}
	warnings, err := s.ListCandidateWarnings(ctx, scope, sourceDocument.ID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: sourceRevision.ID,
	})
	if err != nil {
		return resolvedLineageContext{}, err
	}
	jobRuns, err := s.listLineageJobRuns(ctx, scope, sourceRevision.ID)
	if err != nil {
		return resolvedLineageContext{}, err
	}
	return resolvedLineageContext{
		sourceDocument:    sourceDocument,
		sourceRevision:    sourceRevision,
		latestRevision:    latestRevision,
		sourceArtifact:    artifact,
		revisionHandle:    revisionHandle,
		activeHandle:      activeHandle,
		fingerprints:      fingerprints,
		lineageJobs:       jobRuns,
		candidateWarnings: warnings,
		agreement:         agreement,
	}, nil
}

func (s DefaultSourceReadModelService) handleForSourceRevision(ctx context.Context, scope stores.Scope, sourceRevision stores.SourceRevisionRecord, sourceDocumentID string) (stores.SourceHandleRecord, error) {
	handleID := strings.TrimSpace(sourceRevision.SourceHandleID)
	if handleID != "" {
		handle, err := s.lineage.GetSourceHandle(ctx, scope, handleID)
		if err == nil {
			return handle, nil
		}
		if !isNotFound(err) {
			return stores.SourceHandleRecord{}, err
		}
	}
	if strings.TrimSpace(sourceDocumentID) == "" {
		return stores.SourceHandleRecord{}, debugLineageNotFound("source_handles", handleID)
	}
	return s.activeHandleForSourceDocument(ctx, scope, sourceDocumentID)
}

func (s DefaultSourceReadModelService) activeHandleForSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (stores.SourceHandleRecord, error) {
	handles, err := s.lineage.ListSourceHandles(ctx, scope, stores.SourceHandleQuery{
		SourceDocumentID: sourceDocumentID,
		ActiveOnly:       true,
	})
	if err != nil {
		return stores.SourceHandleRecord{}, err
	}
	if len(handles) == 0 {
		return stores.SourceHandleRecord{}, debugLineageNotFound("source_handles", sourceDocumentID)
	}
	sort.SliceStable(handles, func(i, j int) bool {
		if handles[i].CreatedAt.Equal(handles[j].CreatedAt) {
			return handles[i].ID < handles[j].ID
		}
		return handles[i].CreatedAt.After(handles[j].CreatedAt)
	})
	return handles[0], nil
}

func (s DefaultSourceReadModelService) latestRevisionForSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (stores.SourceRevisionRecord, error) {
	revisions, err := s.lineage.ListSourceRevisions(ctx, scope, stores.SourceRevisionQuery{
		SourceDocumentID: sourceDocumentID,
	})
	if err != nil {
		return stores.SourceRevisionRecord{}, err
	}
	if len(revisions) == 0 {
		return stores.SourceRevisionRecord{}, debugLineageNotFound("source_revisions", sourceDocumentID)
	}
	sort.SliceStable(revisions, func(i, j int) bool {
		return sourceRevisionRank(revisions[i]).After(sourceRevisionRank(revisions[j]))
	})
	return revisions[0], nil
}

func (s DefaultSourceReadModelService) documentArtifact(ctx context.Context, scope stores.Scope, document stores.DocumentRecord, sourceRevisionID string) (stores.SourceArtifactRecord, error) {
	if strings.TrimSpace(document.SourceArtifactID) != "" {
		return s.lineage.GetSourceArtifact(ctx, scope, document.SourceArtifactID)
	}
	artifacts, err := s.lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: sourceRevisionID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
	})
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	if len(artifacts) == 0 {
		return stores.SourceArtifactRecord{}, debugLineageNotFound("source_artifacts", sourceRevisionID)
	}
	sort.SliceStable(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ID < artifacts[j].ID
		}
		return artifacts[i].CreatedAt.After(artifacts[j].CreatedAt)
	})
	return artifacts[0], nil
}

func (s DefaultSourceReadModelService) listLineageJobRuns(ctx context.Context, scope stores.Scope, sourceRevisionID string) ([]stores.JobRunRecord, error) {
	if s.jobRuns == nil || strings.TrimSpace(sourceRevisionID) == "" {
		return nil, nil
	}
	runs, err := s.jobRuns.ListJobRunsByResource(ctx, scope, lineageJobResourceKindSourceRevision, strings.TrimSpace(sourceRevisionID))
	if err != nil {
		return nil, err
	}
	out := make([]stores.JobRunRecord, 0, len(runs))
	for _, run := range runs {
		if strings.TrimSpace(run.JobName) != lineageJobNameSourceLineageProcessing {
			continue
		}
		out = append(out, run)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return jobRunSortTime(out[i]).After(jobRunSortTime(out[j]))
	})
	return out, nil
}

func (s DefaultSourceReadModelService) fingerprintStateForRevision(ctx context.Context, scope stores.Scope, sourceRevision stores.SourceRevisionRecord) (FingerprintStatusSummary, FingerprintProcessingSummary) {
	if s.lineage == nil || strings.TrimSpace(sourceRevision.ID) == "" {
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}, FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingUnknown,
			StatusLabel: "Unknown",
		}
	}
	fingerprints, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: sourceRevision.ID,
	})
	if err != nil {
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}, FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingUnknown,
			StatusLabel: "Unknown",
		}
	}
	jobRuns, err := s.listLineageJobRuns(ctx, scope, sourceRevision.ID)
	if err != nil {
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}, FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingUnknown,
			StatusLabel: "Unknown",
		}
	}
	if s.jobRuns == nil && len(fingerprints) == 0 {
		processing := FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingRunning,
			StatusLabel: fingerprintProcessingLabel(LineageFingerprintProcessingRunning),
		}
		return fingerprintStatusFromProcessing(processing), processing
	}
	return fingerprintStateFromRecords(sourceRevision, fingerprints, jobRuns)
}

func (s DefaultSourceReadModelService) fingerprintStatusForRevision(ctx context.Context, scope stores.Scope, sourceRevision stores.SourceRevisionRecord) FingerprintStatusSummary {
	status, _ := s.fingerprintStateForRevision(ctx, scope, sourceRevision)
	return status
}

func (s DefaultSourceReadModelService) diagnosticsURL(resource, id string) string {
	resource = strings.TrimSpace(resource)
	id = strings.TrimSpace(id)
	if s.diagnosticsBasePath == "" || resource == "" || id == "" {
		return ""
	}
	return s.diagnosticsBasePath + "/" + resource + "/" + id
}

type resolvedLineageContext struct {
	sourceDocument    stores.SourceDocumentRecord
	sourceRevision    stores.SourceRevisionRecord
	latestRevision    stores.SourceRevisionRecord
	sourceArtifact    stores.SourceArtifactRecord
	revisionHandle    stores.SourceHandleRecord
	activeHandle      stores.SourceHandleRecord
	fingerprints      []stores.SourceFingerprintRecord
	lineageJobs       []stores.JobRunRecord
	candidateWarnings []CandidateWarningSummary
	agreement         stores.AgreementRecord
}

func (r resolvedLineageContext) sourceDocumentReference() *LineageReference {
	if strings.TrimSpace(r.sourceDocument.ID) == "" {
		return nil
	}
	handle := r.displayHandle()
	return &LineageReference{
		ID:    strings.TrimSpace(r.sourceDocument.ID),
		Label: strings.TrimSpace(r.sourceDocument.CanonicalTitle),
		URL:   strings.TrimSpace(handle.WebURL),
	}
}

func (r resolvedLineageContext) sourceRevisionSummary() *SourceRevisionSummary {
	return sourceRevisionSummaryFromRecord(r.sourceRevision)
}

func (r resolvedLineageContext) documentArtifactSummary() *SourceArtifactSummary {
	return sourceArtifactSummaryFromRecord(r.sourceArtifact)
}

func (r resolvedLineageContext) agreementArtifactSummary(document stores.DocumentRecord) *SourceArtifactSummary {
	if strings.TrimSpace(r.sourceArtifact.ID) == "" {
		return nil
	}
	summary := sourceArtifactSummaryFromRecord(r.sourceArtifact)
	if summary == nil {
		return nil
	}
	if strings.TrimSpace(summary.ObjectKey) == "" {
		summary.ObjectKey = strings.TrimSpace(document.SourceObjectKey)
	}
	return summary
}

func (r resolvedLineageContext) metadataBaseline(document stores.DocumentRecord) *SourceMetadataBaseline {
	sourceDocumentTitle := strings.TrimSpace(r.sourceDocument.CanonicalTitle)
	if sourceDocumentTitle == "" {
		sourceDocumentTitle = strings.TrimSpace(document.Title)
	}
	handle := r.displayHandle()
	metadataHints := decodeLineageMetadataJSON(r.sourceRevision.MetadataJSON)
	pageCountHint := r.sourceArtifact.PageCount
	if pageCountHint == 0 {
		pageCountHint = document.PageCount
	}
	parentID := firstNonEmpty(
		lineageMetadataString(metadataHints, "parent_id"),
		lineageMetadataString(metadataHints, "folder_id"),
	)
	ownerEmail := firstNonEmpty(
		lineageMetadataString(metadataHints, "owner_email"),
		lineageNestedMetadataString(metadataHints, "owner", "email"),
	)
	return &SourceMetadataBaseline{
		AccountID:           firstNonEmpty(strings.TrimSpace(handle.AccountID), lineageMetadataString(metadataHints, "account_id")),
		ExternalFileID:      firstNonEmpty(strings.TrimSpace(handle.ExternalFileID), lineageMetadataString(metadataHints, "external_file_id"), strings.TrimSpace(document.SourceGoogleFileID)),
		DriveID:             firstNonEmpty(strings.TrimSpace(handle.DriveID), lineageMetadataString(metadataHints, "drive_id")),
		WebURL:              firstNonEmpty(strings.TrimSpace(handle.WebURL), lineageMetadataString(metadataHints, "web_url"), strings.TrimSpace(document.SourceGoogleDocURL)),
		ModifiedTime:        cloneSourceTimePtr(firstSourceTimePtr(r.sourceRevision.ModifiedTime, document.SourceModifiedTime)),
		SourceVersionHint:   firstNonEmpty(strings.TrimSpace(r.sourceRevision.ProviderRevisionHint), lineageMetadataString(metadataHints, "source_version_hint")),
		SourceMimeType:      firstNonEmpty(strings.TrimSpace(r.sourceRevision.SourceMimeType), strings.TrimSpace(document.SourceMimeType)),
		SourceIngestionMode: firstNonEmpty(strings.TrimSpace(document.SourceIngestionMode), lineageMetadataString(metadataHints, "source_ingestion_mode")),
		TitleHint:           canonicalLineageTitle(sourceDocumentTitle),
		PageCountHint:       pageCountHint,
		OwnerEmail:          strings.TrimSpace(ownerEmail),
		ParentID:            strings.TrimSpace(parentID),
	}
}

func (r resolvedLineageContext) displayHandle() stores.SourceHandleRecord {
	if strings.TrimSpace(r.revisionHandle.ID) != "" {
		return r.revisionHandle
	}
	return r.activeHandle
}

func (r resolvedLineageContext) fingerprintStatus() FingerprintStatusSummary {
	status, _ := fingerprintStateFromRecords(r.sourceRevision, r.fingerprints, r.lineageJobs)
	return status
}

func (r resolvedLineageContext) fingerprintProcessing() FingerprintProcessingSummary {
	_, processing := fingerprintStateFromRecords(r.sourceRevision, r.fingerprints, r.lineageJobs)
	return processing
}

func (r resolvedLineageContext) newerSourceExists() bool {
	if strings.TrimSpace(r.sourceRevision.ID) == "" || strings.TrimSpace(r.latestRevision.ID) == "" {
		return false
	}
	return strings.TrimSpace(r.sourceRevision.ID) != strings.TrimSpace(r.latestRevision.ID) &&
		sourceRevisionRank(r.latestRevision).After(sourceRevisionRank(r.sourceRevision))
}

func (r resolvedLineageContext) newerSourceSummary() *NewerSourceSummary {
	if strings.TrimSpace(r.sourceRevision.ID) == "" {
		return nil
	}
	summary := &NewerSourceSummary{
		Exists:                 r.newerSourceExists(),
		PinnedSourceRevisionID: strings.TrimSpace(r.sourceRevision.ID),
		LatestSourceRevisionID: strings.TrimSpace(r.latestRevision.ID),
	}
	if summary.LatestSourceRevisionID == "" {
		summary.LatestSourceRevisionID = summary.PinnedSourceRevisionID
	}
	if summary.Exists {
		summary.Summary = "A newer source revision exists while this agreement remains pinned to the revision used at creation time."
	} else {
		summary.Summary = "This agreement remains pinned to the latest known source revision."
	}
	return summary
}

func fingerprintStateFromRecords(
	sourceRevision stores.SourceRevisionRecord,
	fingerprints []stores.SourceFingerprintRecord,
	jobRuns []stores.JobRunRecord,
) (FingerprintStatusSummary, FingerprintProcessingSummary) {
	if len(fingerprints) > 0 {
		sort.SliceStable(fingerprints, func(i, j int) bool {
			if fingerprints[i].CreatedAt.Equal(fingerprints[j].CreatedAt) {
				return fingerprints[i].ID < fingerprints[j].ID
			}
			return fingerprints[i].CreatedAt.After(fingerprints[j].CreatedAt)
		})
		latest := fingerprints[0]
		status := fingerprintStatusSummaryFromRecord(latest)
		state := LineageFingerprintProcessingReady
		statusLabel := "Ready"
		if strings.TrimSpace(status.Status) == LineageFingerprintStatusFailed {
			state = LineageFingerprintProcessingFailed
			statusLabel = "Failed"
		}
		return status, FingerprintProcessingSummary{
			State:            state,
			StatusLabel:      statusLabel,
			StartedAt:        cloneSourceTimePtr(&latest.CreatedAt),
			CompletedAt:      cloneSourceTimePtr(&latest.CreatedAt),
			LastAttemptAt:    cloneSourceTimePtr(&latest.CreatedAt),
			AttemptCount:     1,
			LastErrorCode:    strings.TrimSpace(status.ErrorCode),
			LastErrorMessage: strings.TrimSpace(status.ErrorMessage),
			Retryable:        state == LineageFingerprintProcessingFailed,
			Stale:            false,
		}
	}
	if len(jobRuns) > 0 {
		run := latestLineageJobRun(jobRuns)
		processing := fingerprintProcessingFromJobRun(run)
		return fingerprintStatusFromProcessing(processing), processing
	}
	if jobRuns == nil && strings.TrimSpace(sourceRevision.ID) != "" {
		processing := FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingRunning,
			StatusLabel: fingerprintProcessingLabel(LineageFingerprintProcessingRunning),
		}
		return fingerprintStatusFromProcessing(processing), processing
	}
	if strings.TrimSpace(sourceRevision.ID) == "" {
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}, FingerprintProcessingSummary{
			State:       LineageFingerprintProcessingUnknown,
			StatusLabel: "Unknown",
		}
	}
	processing := FingerprintProcessingSummary{
		State:       LineageFingerprintProcessingStale,
		StatusLabel: "Stale",
		Stale:       true,
	}
	return fingerprintStatusFromProcessing(processing), processing
}

func latestLineageJobRun(jobRuns []stores.JobRunRecord) stores.JobRunRecord {
	if len(jobRuns) == 0 {
		return stores.JobRunRecord{}
	}
	sort.SliceStable(jobRuns, func(i, j int) bool {
		return jobRunSortTime(jobRuns[i]).After(jobRunSortTime(jobRuns[j]))
	})
	return jobRuns[0]
}

func fingerprintProcessingFromImportRun(run stores.GoogleImportRunRecord) FingerprintProcessingSummary {
	state := LineageFingerprintProcessingUnknown
	switch strings.TrimSpace(run.Status) {
	case stores.GoogleImportRunStatusQueued:
		state = LineageFingerprintProcessingQueued
	case stores.GoogleImportRunStatusRunning:
		state = LineageFingerprintProcessingRunning
	case stores.GoogleImportRunStatusFailed:
		state = LineageFingerprintProcessingFailed
	case stores.GoogleImportRunStatusSucceeded:
		switch strings.TrimSpace(run.FingerprintStatus) {
		case LineageFingerprintStatusReady:
			state = LineageFingerprintProcessingReady
		case LineageFingerprintStatusFailed:
			state = LineageFingerprintProcessingFailed
		case LineageFingerprintStatusPending:
			state = LineageFingerprintProcessingStale
		default:
			state = LineageFingerprintProcessingUnknown
		}
	}
	return FingerprintProcessingSummary{
		State:            state,
		StatusLabel:      fingerprintProcessingLabel(state),
		StartedAt:        cloneSourceTimePtr(run.StartedAt),
		CompletedAt:      cloneSourceTimePtr(run.CompletedAt),
		LastAttemptAt:    cloneSourceTimePtr(firstSourceTimePtr(run.CompletedAt, run.StartedAt)),
		AttemptCount:     1,
		LastErrorCode:    strings.TrimSpace(run.ErrorCode),
		LastErrorMessage: strings.TrimSpace(run.ErrorMessage),
		Retryable:        state == LineageFingerprintProcessingFailed,
		Stale:            state == LineageFingerprintProcessingStale,
	}
}

func fingerprintProcessingFromJobRun(run stores.JobRunRecord) FingerprintProcessingSummary {
	state := LineageFingerprintProcessingUnknown
	switch strings.TrimSpace(run.Status) {
	case stores.JobRunStatusQueued:
		state = LineageFingerprintProcessingQueued
	case stores.JobRunStatusRunning:
		if run.LeaseExpiresAt != nil && run.LeaseExpiresAt.Before(time.Now().UTC()) {
			state = LineageFingerprintProcessingStale
		} else {
			state = LineageFingerprintProcessingRunning
		}
	case stores.JobRunStatusRetrying:
		state = LineageFingerprintProcessingRetrying
	case stores.JobRunStatusFailed:
		state = LineageFingerprintProcessingFailed
	case stores.JobRunStatusStale, stores.JobRunStatusSucceeded:
		state = LineageFingerprintProcessingStale
	}
	return FingerprintProcessingSummary{
		State:            state,
		StatusLabel:      fingerprintProcessingLabel(state),
		StartedAt:        cloneSourceTimePtr(firstSourceTimePtr(run.StartedAt, run.ClaimedAt)),
		CompletedAt:      cloneSourceTimePtr(run.CompletedAt),
		LastAttemptAt:    cloneSourceTimePtr(firstSourceTimePtr(run.CompletedAt, run.StartedAt, run.ClaimedAt, &run.UpdatedAt)),
		AttemptCount:     run.AttemptCount,
		LastErrorCode:    strings.TrimSpace(run.LastErrorCode),
		LastErrorMessage: strings.TrimSpace(run.LastError),
		Retryable:        run.MaxAttempts <= 0 || run.AttemptCount < run.MaxAttempts,
		Stale:            state == LineageFingerprintProcessingStale,
	}
}

func fingerprintStatusFromProcessing(processing FingerprintProcessingSummary) FingerprintStatusSummary {
	switch strings.TrimSpace(processing.State) {
	case LineageFingerprintProcessingNotApplicable:
		return FingerprintStatusSummary{Status: LineageFingerprintStatusNotApplicable, EvidenceAvailable: false}
	case LineageFingerprintProcessingReady:
		return FingerprintStatusSummary{Status: LineageFingerprintStatusReady, EvidenceAvailable: true}
	case LineageFingerprintProcessingFailed:
		return FingerprintStatusSummary{
			Status:            LineageFingerprintStatusFailed,
			EvidenceAvailable: false,
			ErrorCode:         strings.TrimSpace(processing.LastErrorCode),
			ErrorMessage:      strings.TrimSpace(processing.LastErrorMessage),
		}
	case LineageFingerprintProcessingQueued, LineageFingerprintProcessingRunning, LineageFingerprintProcessingRetrying:
		return FingerprintStatusSummary{Status: LineageFingerprintStatusPending, EvidenceAvailable: false}
	case LineageFingerprintProcessingStale, LineageFingerprintProcessingUnknown:
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}
	default:
		return FingerprintStatusSummary{Status: LineageFingerprintStatusUnknown, EvidenceAvailable: false}
	}
}

func fingerprintProcessingLabel(state string) string {
	switch strings.TrimSpace(state) {
	case LineageFingerprintProcessingNotApplicable:
		return "Not applicable"
	case LineageFingerprintProcessingQueued:
		return "Queued"
	case LineageFingerprintProcessingRunning:
		return "Running"
	case LineageFingerprintProcessingRetrying:
		return "Retrying"
	case LineageFingerprintProcessingReady:
		return "Ready"
	case LineageFingerprintProcessingFailed:
		return "Failed"
	case LineageFingerprintProcessingStale:
		return "Stale"
	default:
		return "Unknown"
	}
}

func jobRunSortTime(run stores.JobRunRecord) time.Time {
	if run.CompletedAt != nil {
		return run.CompletedAt.UTC()
	}
	if run.StartedAt != nil {
		return run.StartedAt.UTC()
	}
	if run.ClaimedAt != nil {
		return run.ClaimedAt.UTC()
	}
	if run.AvailableAt != nil {
		return run.AvailableAt.UTC()
	}
	return run.UpdatedAt.UTC()
}

func sourceRevisionSummaryFromRecord(record stores.SourceRevisionRecord) *SourceRevisionSummary {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	return &SourceRevisionSummary{
		ID:                   strings.TrimSpace(record.ID),
		ProviderRevisionHint: strings.TrimSpace(record.ProviderRevisionHint),
		ModifiedTime:         cloneSourceTimePtr(record.ModifiedTime),
		ExportedAt:           cloneSourceTimePtr(record.ExportedAt),
		ExportedByUserID:     strings.TrimSpace(record.ExportedByUserID),
		SourceMimeType:       strings.TrimSpace(record.SourceMimeType),
	}
}

func sourceArtifactSummaryFromRecord(record stores.SourceArtifactRecord) *SourceArtifactSummary {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	return &SourceArtifactSummary{
		ID:                  strings.TrimSpace(record.ID),
		ArtifactKind:        strings.TrimSpace(record.ArtifactKind),
		ObjectKey:           strings.TrimSpace(record.ObjectKey),
		SHA256:              strings.TrimSpace(record.SHA256),
		PageCount:           record.PageCount,
		SizeBytes:           record.SizeBytes,
		CompatibilityTier:   strings.TrimSpace(record.CompatibilityTier),
		CompatibilityReason: strings.TrimSpace(record.CompatibilityReason),
		NormalizationStatus: strings.TrimSpace(record.NormalizationStatus),
	}
}

func noSourceDocumentEmptyState() LineageEmptyState {
	return LineageEmptyState{
		Kind:        LineageEmptyStateNoSource,
		Title:       "No source lineage",
		Description: "This document was uploaded directly and has no linked source document.",
	}
}

func normalizeImportLineageStatus(run stores.GoogleImportRunRecord) string {
	if trimmed := strings.TrimSpace(run.LineageStatus); trimmed != "" {
		return trimmed
	}
	switch strings.TrimSpace(run.Status) {
	case stores.GoogleImportRunStatusQueued:
		return LineageImportStatusQueued
	case stores.GoogleImportRunStatusRunning:
		return LineageImportStatusRunning
	case stores.GoogleImportRunStatusSucceeded:
		return LineageImportStatusLinked
	default:
		return ""
	}
}

func candidateWarningSummaryFromRelationship(relationship stores.SourceRelationshipRecord) CandidateWarningSummary {
	summary := CandidateWarningSummary{
		ID:                  strings.TrimSpace(relationship.ID),
		RelationshipType:    strings.TrimSpace(relationship.RelationshipType),
		Status:              strings.TrimSpace(relationship.Status),
		ConfidenceBand:      strings.TrimSpace(relationship.ConfidenceBand),
		ConfidenceScore:     relationship.ConfidenceScore,
		Summary:             relationshipSummary(relationship),
		ReviewActionVisible: LineageReviewVisibilityAdminOnly,
	}
	evidence := decodeLineageMetadataJSON(relationship.EvidenceJSON)
	if candidateReason := lineageMetadataString(evidence, "candidate_reason"); candidateReason != "" {
		summary.Evidence = append(summary.Evidence, CandidateEvidenceSummary{
			Code:  candidateReason,
			Label: "Candidate match evidence",
		})
	}
	for _, descriptor := range candidateEvidenceDescriptors() {
		value := candidateEvidenceValue(evidence, descriptor.key, descriptor.aliases...)
		if value == "" {
			continue
		}
		summary.Evidence = append(summary.Evidence, CandidateEvidenceSummary{
			Code:    descriptor.key,
			Label:   humanizeLineageEvidenceKey(descriptor.key),
			Details: value,
		})
	}
	return summary
}

type candidateEvidenceDescriptor struct {
	key     string
	aliases []string
}

func candidateEvidenceDescriptors() []candidateEvidenceDescriptor {
	return []candidateEvidenceDescriptor{
		{key: lineageEvidenceKeyNormalizedTextSimilarity},
		{key: lineageEvidenceKeyTitleSimilarity},
		{key: lineageEvidenceKeyAccountMatch},
		{key: lineageEvidenceKeyDriveMatch},
		{key: lineageEvidenceKeyWebURLMatch, aliases: []string{lineageEvidenceKeyLegacyWebURL}},
	}
}

func candidateEvidenceValue(decoded map[string]any, key string, aliases ...string) string {
	keys := append([]string{key}, aliases...)
	for _, candidateKey := range keys {
		if value := lineageMetadataString(decoded, candidateKey); value != "" {
			return value
		}
	}
	return ""
}

func relationshipSummary(relationship stores.SourceRelationshipRecord) string {
	switch strings.TrimSpace(relationship.Status) {
	case stores.SourceRelationshipStatusPendingReview:
		return "Potential continuity candidate requires operator review"
	case stores.SourceRelationshipStatusConfirmed:
		return "Confirmed source continuity relationship"
	case stores.SourceRelationshipStatusSuperseded:
		return "Superseded source continuity candidate"
	case stores.SourceRelationshipStatusRejected:
		return "Rejected source continuity candidate"
	default:
		return "Source continuity candidate"
	}
}

func humanizeLineageEvidenceKey(key string) string {
	switch strings.TrimSpace(key) {
	case lineageEvidenceKeyNormalizedTextSimilarity:
		return "Normalized text similarity"
	case lineageEvidenceKeyTitleSimilarity:
		return "Title similarity"
	case lineageEvidenceKeyAccountMatch:
		return "Account corroboration"
	case lineageEvidenceKeyDriveMatch:
		return "Drive corroboration"
	case lineageEvidenceKeyWebURLMatch, lineageEvidenceKeyLegacyWebURL:
		return "Source URL history"
	default:
		return strings.TrimSpace(key)
	}
}

func decodeLineageMetadataJSON(raw string) map[string]any {
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded); err != nil {
		return map[string]any{}
	}
	return decoded
}

func lineageMetadataString(decoded map[string]any, key string) string {
	if len(decoded) == 0 {
		return ""
	}
	if value, ok := decoded[strings.TrimSpace(key)].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func lineageNestedMetadataString(decoded map[string]any, parentKey, childKey string) string {
	parent, ok := decoded[strings.TrimSpace(parentKey)].(map[string]any)
	if !ok {
		return ""
	}
	return lineageMetadataString(parent, childKey)
}

func firstSourceTimePtr(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil && !value.IsZero() {
			return value
		}
	}
	return nil
}

func sourceRevisionRank(record stores.SourceRevisionRecord) time.Time {
	for _, value := range []time.Time{
		timeValue(record.ModifiedTime),
		timeValue(record.ExportedAt),
		record.CreatedAt.UTC(),
	} {
		if !value.IsZero() {
			return value
		}
	}
	return time.Time{}
}

func timeValue(value *time.Time) time.Time {
	if value == nil || value.IsZero() {
		return time.Time{}
	}
	return value.UTC()
}

func debugLineageNotFound(entity, id string) error {
	return goerrors.New(strings.TrimSpace(entity)+" not found", goerrors.CategoryNotFound).
		WithCode(http.StatusNotFound).
		WithTextCode("NOT_FOUND").
		WithMetadata(map[string]any{"entity": strings.TrimSpace(entity), "id": strings.TrimSpace(id)})
}
