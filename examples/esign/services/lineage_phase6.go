package services

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type LineageDiagnostics struct {
	ResourceKind           string                            `json:"resource_kind"`
	ResourceID             string                            `json:"resource_id"`
	SourceDocument         *stores.SourceDocumentRecord      `json:"source_document,omitempty"`
	SourceRevision         *stores.SourceRevisionRecord      `json:"source_revision,omitempty"`
	LatestSourceRevision   *stores.SourceRevisionRecord      `json:"latest_source_revision,omitempty"`
	SourceArtifact         *stores.SourceArtifactRecord      `json:"source_artifact,omitempty"`
	ActiveHandle           *stores.SourceHandleRecord        `json:"active_handle,omitempty"`
	FingerprintStatus      FingerprintStatusSummary          `json:"fingerprint_status"`
	FingerprintProcessing  FingerprintProcessingSummary      `json:"fingerprint_processing"`
	Fingerprints           []stores.SourceFingerprintRecord  `json:"fingerprints,omitempty"`
	JobRuns                []stores.JobRunRecord             `json:"job_runs,omitempty"`
	CandidateWarnings      []CandidateWarningSummary         `json:"candidate_warnings,omitempty"`
	CandidateRelationships []stores.SourceRelationshipRecord `json:"candidate_relationships,omitempty"`
	EmptyState             LineageEmptyState                 `json:"empty_state"`
}

type LineageDiagnosticsService interface {
	GetDocumentLineageDiagnostics(ctx context.Context, scope stores.Scope, documentID string) (LineageDiagnostics, error)
	GetAgreementLineageDiagnostics(ctx context.Context, scope stores.Scope, agreementID string) (LineageDiagnostics, error)
}

type DefaultLineageDiagnosticsService struct {
	readModels DefaultSourceReadModelService
}

func NewDefaultLineageDiagnosticsService(
	documents stores.DocumentStore,
	agreements stores.AgreementStore,
	lineage stores.LineageStore,
	opts ...SourceReadModelServiceOption,
) DefaultLineageDiagnosticsService {
	return DefaultLineageDiagnosticsService{
		readModels: NewDefaultSourceReadModelService(documents, agreements, lineage, opts...),
	}
}

func (s DefaultLineageDiagnosticsService) GetDocumentLineageDiagnostics(ctx context.Context, scope stores.Scope, documentID string) (LineageDiagnostics, error) {
	document, err := s.readModels.documents.Get(ctx, scope, strings.TrimSpace(documentID))
	if err != nil {
		return LineageDiagnostics{}, err
	}
	detail, err := s.readModels.buildDocumentLineageDetail(ctx, scope, document)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics := LineageDiagnostics{
		ResourceKind:          "document",
		ResourceID:            strings.TrimSpace(document.ID),
		FingerprintStatus:     detail.FingerprintStatus,
		FingerprintProcessing: detail.FingerprintProcessing,
		EmptyState:            detail.EmptyState,
	}
	if s.readModels.lineage == nil || strings.TrimSpace(document.SourceDocumentID) == "" || strings.TrimSpace(document.SourceRevisionID) == "" {
		return diagnostics, nil
	}
	resolved, err := s.readModels.resolveDocumentLineage(ctx, scope, document)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics.SourceDocument = cloneSourceDocumentRecord(resolved.sourceDocument)
	diagnostics.SourceRevision = cloneSourceRevisionRecord(resolved.sourceRevision)
	diagnostics.LatestSourceRevision = cloneSourceRevisionRecord(resolved.latestRevision)
	diagnostics.SourceArtifact = cloneSourceArtifactRecord(resolved.sourceArtifact)
	diagnostics.ActiveHandle = cloneSourceHandleRecord(resolved.activeHandle)
	diagnostics.Fingerprints = append([]stores.SourceFingerprintRecord{}, resolved.fingerprints...)
	diagnostics.JobRuns = append([]stores.JobRunRecord{}, resolved.lineageJobs...)
	diagnostics.CandidateWarnings = append([]CandidateWarningSummary{}, resolved.candidateWarnings...)
	relationships, err := s.readModels.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: resolved.sourceDocument.ID,
	})
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics.CandidateRelationships = append([]stores.SourceRelationshipRecord{}, relationships...)
	return diagnostics, nil
}

func (s DefaultLineageDiagnosticsService) GetAgreementLineageDiagnostics(ctx context.Context, scope stores.Scope, agreementID string) (LineageDiagnostics, error) {
	agreement, err := s.readModels.agreements.GetAgreement(ctx, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return LineageDiagnostics{}, err
	}
	detail, err := s.readModels.buildAgreementLineageDetail(ctx, scope, agreement)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics := LineageDiagnostics{
		ResourceKind:          "agreement",
		ResourceID:            strings.TrimSpace(agreement.ID),
		FingerprintProcessing: detail.FingerprintProcessing,
		EmptyState:            detail.EmptyState,
	}
	pinnedRevisionID := strings.TrimSpace(agreement.SourceRevisionID)
	if s.readModels.lineage == nil || pinnedRevisionID == "" {
		return diagnostics, nil
	}
	document := stores.DocumentRecord{}
	if s.readModels.documents != nil && strings.TrimSpace(agreement.DocumentID) != "" {
		loaded, docErr := s.readModels.documents.Get(ctx, scope, agreement.DocumentID)
		if docErr == nil {
			document = loaded
		} else if !isNotFound(docErr) {
			return LineageDiagnostics{}, docErr
		}
	}
	resolved, err := s.readModels.resolveAgreementLineage(ctx, scope, agreement, document, pinnedRevisionID)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics.SourceDocument = cloneSourceDocumentRecord(resolved.sourceDocument)
	diagnostics.SourceRevision = cloneSourceRevisionRecord(resolved.sourceRevision)
	diagnostics.LatestSourceRevision = cloneSourceRevisionRecord(resolved.latestRevision)
	diagnostics.SourceArtifact = cloneSourceArtifactRecord(resolved.sourceArtifact)
	diagnostics.ActiveHandle = cloneSourceHandleRecord(resolved.activeHandle)
	diagnostics.FingerprintStatus = resolved.fingerprintStatus()
	diagnostics.FingerprintProcessing = resolved.fingerprintProcessing()
	diagnostics.Fingerprints = append([]stores.SourceFingerprintRecord{}, resolved.fingerprints...)
	diagnostics.JobRuns = append([]stores.JobRunRecord{}, resolved.lineageJobs...)
	diagnostics.CandidateWarnings = append([]CandidateWarningSummary{}, resolved.candidateWarnings...)
	relationships, err := s.readModels.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: resolved.sourceDocument.ID,
	})
	if err != nil {
		return LineageDiagnostics{}, err
	}
	diagnostics.CandidateRelationships = append([]stores.SourceRelationshipRecord{}, relationships...)
	return diagnostics, nil
}

type LineageExamplePayloadBuildInput struct {
	DocumentID  string `json:"document_id"`
	AgreementID string `json:"agreement_id"`
	ImportRunID string `json:"import_run_id"`
}

type LineageExamplePayloads struct {
	SchemaVersion        int                       `json:"schema_version"`
	DocumentDetail       DocumentLineageDetail     `json:"document_detail"`
	AgreementDetail      AgreementLineageDetail    `json:"agreement_detail"`
	ImportStatus         GoogleImportLineageStatus `json:"import_status"`
	DocumentDiagnostics  LineageDiagnostics        `json:"document_diagnostics"`
	AgreementDiagnostics LineageDiagnostics        `json:"agreement_diagnostics"`
}

func BuildLineageExamplePayloads(
	ctx context.Context,
	scope stores.Scope,
	readModels SourceReadModelService,
	diagnostics LineageDiagnosticsService,
	input LineageExamplePayloadBuildInput,
) (LineageExamplePayloads, error) {
	if readModels == nil {
		return LineageExamplePayloads{}, domainValidationError("lineage_examples", "read_models", "not configured")
	}
	if diagnostics == nil {
		return LineageExamplePayloads{}, domainValidationError("lineage_examples", "diagnostics", "not configured")
	}
	documentDetail, err := readModels.GetDocumentLineageDetail(ctx, scope, input.DocumentID)
	if err != nil {
		return LineageExamplePayloads{}, err
	}
	agreementDetail, err := readModels.GetAgreementLineageDetail(ctx, scope, input.AgreementID)
	if err != nil {
		return LineageExamplePayloads{}, err
	}
	importStatus, err := readModels.GetGoogleImportLineageStatus(ctx, scope, input.ImportRunID)
	if err != nil {
		return LineageExamplePayloads{}, err
	}
	documentDiagnostics, err := diagnostics.GetDocumentLineageDiagnostics(ctx, scope, input.DocumentID)
	if err != nil {
		return LineageExamplePayloads{}, err
	}
	agreementDiagnostics, err := diagnostics.GetAgreementLineageDiagnostics(ctx, scope, input.AgreementID)
	if err != nil {
		return LineageExamplePayloads{}, err
	}
	return LineageExamplePayloads{
		SchemaVersion:        1,
		DocumentDetail:       documentDetail,
		AgreementDetail:      agreementDetail,
		ImportStatus:         importStatus,
		DocumentDiagnostics:  documentDiagnostics,
		AgreementDiagnostics: agreementDiagnostics,
	}, nil
}

type LineageRepairResult struct {
	TargetKind        string                    `json:"target_kind"`
	TargetID          string                    `json:"target_id"`
	SourceDocumentID  string                    `json:"source_document_id,omitempty"`
	SourceRevisionID  string                    `json:"source_revision_id,omitempty"`
	SourceArtifactID  string                    `json:"source_artifact_id,omitempty"`
	FingerprintStatus FingerprintStatusSummary  `json:"fingerprint_status"`
	CandidateWarnings []CandidateWarningSummary `json:"candidate_warnings,omitempty"`
	Diagnostics       LineageDiagnostics        `json:"diagnostics"`
}

type DefaultLineageRepairService struct {
	readModels     DefaultSourceReadModelService
	diagnostics    DefaultLineageDiagnosticsService
	fingerprints   SourceFingerprintService
	reconciliation SourceReconciliationService
	processing     SourceLineageProcessingTrigger
}

type LineageRepairServiceOption func(*DefaultLineageRepairService)

func WithLineageRepairFingerprintService(service SourceFingerprintService) LineageRepairServiceOption {
	return func(s *DefaultLineageRepairService) {
		if s == nil {
			return
		}
		s.fingerprints = service
	}
}

func WithLineageRepairReconciliationService(service SourceReconciliationService) LineageRepairServiceOption {
	return func(s *DefaultLineageRepairService) {
		if s == nil {
			return
		}
		s.reconciliation = service
	}
}

func WithLineageRepairProcessingTrigger(trigger SourceLineageProcessingTrigger) LineageRepairServiceOption {
	return func(s *DefaultLineageRepairService) {
		if s == nil {
			return
		}
		s.processing = trigger
	}
}

func NewDefaultLineageRepairService(
	documents stores.DocumentStore,
	agreements stores.AgreementStore,
	lineage stores.LineageStore,
	opts ...LineageRepairServiceOption,
) DefaultLineageRepairService {
	readModels := NewDefaultSourceReadModelService(documents, agreements, lineage)
	svc := DefaultLineageRepairService{
		readModels:  readModels,
		diagnostics: DefaultLineageDiagnosticsService{readModels: readModels},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s DefaultLineageRepairService) RepairSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (LineageRepairResult, error) {
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return LineageRepairResult{}, domainValidationError("lineage_repairs", "source_document_id", "required")
	}
	if s.readModels.lineage == nil {
		return LineageRepairResult{}, domainValidationError("lineage_repairs", "lineage", "not configured")
	}
	sourceDocument, err := s.readModels.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	latestRevision, err := s.readModels.latestRevisionForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return LineageRepairResult{}, err
	}
	artifact, err := s.readModels.documentArtifact(ctx, scope, stores.DocumentRecord{}, latestRevision.ID)
	if err != nil && !isNotFound(err) {
		return LineageRepairResult{}, err
	}
	if err := s.runRepairOperations(ctx, scope, sourceDocument, latestRevision, artifact); err != nil {
		return LineageRepairResult{}, err
	}
	diagnostics, err := s.sourceDocumentDiagnostics(ctx, scope, sourceDocument.ID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	return LineageRepairResult{
		TargetKind:        "source_document",
		TargetID:          sourceDocument.ID,
		SourceDocumentID:  sourceDocument.ID,
		SourceRevisionID:  latestRevision.ID,
		SourceArtifactID:  artifact.ID,
		FingerprintStatus: diagnostics.FingerprintStatus,
		CandidateWarnings: append([]CandidateWarningSummary{}, diagnostics.CandidateWarnings...),
		Diagnostics:       diagnostics,
	}, nil
}

func (s DefaultLineageRepairService) RepairDocument(ctx context.Context, scope stores.Scope, documentID string) (LineageRepairResult, error) {
	document, err := s.readModels.documents.Get(ctx, scope, strings.TrimSpace(documentID))
	if err != nil {
		return LineageRepairResult{}, err
	}
	if strings.TrimSpace(document.SourceDocumentID) != "" && strings.TrimSpace(document.SourceRevisionID) != "" && s.readModels.lineage != nil {
		sourceDocument, err := s.readModels.lineage.GetSourceDocument(ctx, scope, document.SourceDocumentID)
		if err != nil {
			return LineageRepairResult{}, err
		}
		sourceRevision, err := s.readModels.lineage.GetSourceRevision(ctx, scope, document.SourceRevisionID)
		if err != nil {
			return LineageRepairResult{}, err
		}
		sourceArtifact, err := s.readModels.documentArtifact(ctx, scope, document, sourceRevision.ID)
		if err != nil && !isNotFound(err) {
			return LineageRepairResult{}, err
		}
		if err := s.runRepairOperations(ctx, scope, sourceDocument, sourceRevision, sourceArtifact); err != nil {
			return LineageRepairResult{}, err
		}
	}
	detail, err := s.readModels.GetDocumentLineageDetail(ctx, scope, document.ID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	diagnostics, err := s.diagnostics.GetDocumentLineageDiagnostics(ctx, scope, document.ID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	return LineageRepairResult{
		TargetKind:        "document",
		TargetID:          document.ID,
		SourceDocumentID:  strings.TrimSpace(document.SourceDocumentID),
		SourceRevisionID:  strings.TrimSpace(document.SourceRevisionID),
		SourceArtifactID:  strings.TrimSpace(document.SourceArtifactID),
		FingerprintStatus: detail.FingerprintStatus,
		CandidateWarnings: append([]CandidateWarningSummary{}, detail.CandidateWarningSummary...),
		Diagnostics:       diagnostics,
	}, nil
}

func (s DefaultLineageRepairService) RepairAgreement(ctx context.Context, scope stores.Scope, agreementID string) (LineageRepairResult, error) {
	agreement, err := s.readModels.agreements.GetAgreement(ctx, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return LineageRepairResult{}, err
	}
	sourceRevisionID := strings.TrimSpace(agreement.SourceRevisionID)
	document := stores.DocumentRecord{}
	if strings.TrimSpace(agreement.DocumentID) != "" && s.readModels.documents != nil {
		loaded, docErr := s.readModels.documents.Get(ctx, scope, agreement.DocumentID)
		if docErr == nil {
			document = loaded
		} else if !isNotFound(docErr) {
			return LineageRepairResult{}, docErr
		}
	}
	if sourceRevisionID != "" && s.readModels.lineage != nil {
		sourceRevision, err := s.readModels.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
		if err != nil {
			return LineageRepairResult{}, err
		}
		sourceDocument, err := s.readModels.lineage.GetSourceDocument(ctx, scope, sourceRevision.SourceDocumentID)
		if err != nil {
			return LineageRepairResult{}, err
		}
		sourceArtifact, err := s.readModels.documentArtifact(ctx, scope, document, sourceRevision.ID)
		if err != nil && !isNotFound(err) {
			return LineageRepairResult{}, err
		}
		if err := s.runRepairOperations(ctx, scope, sourceDocument, sourceRevision, sourceArtifact); err != nil {
			return LineageRepairResult{}, err
		}
	}
	detail, err := s.readModels.GetAgreementLineageDetail(ctx, scope, agreement.ID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	diagnostics, err := s.diagnostics.GetAgreementLineageDiagnostics(ctx, scope, agreement.ID)
	if err != nil {
		return LineageRepairResult{}, err
	}
	return LineageRepairResult{
		TargetKind:        "agreement",
		TargetID:          agreement.ID,
		SourceRevisionID:  sourceRevisionID,
		SourceDocumentID:  strings.TrimSpace(document.SourceDocumentID),
		SourceArtifactID:  strings.TrimSpace(document.SourceArtifactID),
		FingerprintStatus: diagnostics.FingerprintStatus,
		CandidateWarnings: append([]CandidateWarningSummary{}, detail.CandidateWarningSummary...),
		Diagnostics:       diagnostics,
	}, nil
}

func (s DefaultLineageRepairService) runRepairOperations(
	ctx context.Context,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	sourceRevision stores.SourceRevisionRecord,
	sourceArtifact stores.SourceArtifactRecord,
) error {
	metadata := resolvedLineageContext{
		sourceDocument: sourceDocument,
		sourceRevision: sourceRevision,
		sourceArtifact: sourceArtifact,
	}.metadataBaseline(stores.DocumentRecord{})
	if s.processing != nil && strings.TrimSpace(sourceRevision.ID) != "" && strings.TrimSpace(sourceArtifact.ID) != "" {
		processingInput := SourceLineageProcessingInput{
			SourceDocumentID: strings.TrimSpace(sourceDocument.ID),
			SourceRevisionID: strings.TrimSpace(sourceRevision.ID),
			ArtifactID:       strings.TrimSpace(sourceArtifact.ID),
			DedupeKey:        strings.Join([]string{"lineage-repair", strings.TrimSpace(sourceDocument.ID), strings.TrimSpace(sourceRevision.ID), strings.TrimSpace(sourceArtifact.ID)}, "|"),
		}
		if metadata != nil {
			processingInput.Metadata = *metadata
		}
		return s.processing.EnqueueLineageProcessing(ctx, scope, processingInput)
	}
	if s.fingerprints != nil && strings.TrimSpace(sourceRevision.ID) != "" && strings.TrimSpace(sourceArtifact.ID) != "" {
		buildInput := SourceFingerprintBuildInput{
			SourceRevisionID: sourceRevision.ID,
			ArtifactID:       sourceArtifact.ID,
		}
		if metadata != nil {
			buildInput.Metadata = *metadata
		}
		_, err := s.fingerprints.BuildFingerprint(ctx, scope, SourceFingerprintBuildInput{
			SourceRevisionID: buildInput.SourceRevisionID,
			ArtifactID:       buildInput.ArtifactID,
			Metadata:         buildInput.Metadata,
		})
		if err != nil {
			return err
		}
	}
	if s.reconciliation != nil && strings.TrimSpace(sourceDocument.ID) != "" && strings.TrimSpace(sourceRevision.ID) != "" && strings.TrimSpace(sourceArtifact.ID) != "" {
		reconcileInput := SourceReconciliationInput{
			SourceDocumentID: sourceDocument.ID,
			SourceRevisionID: sourceRevision.ID,
			ArtifactID:       sourceArtifact.ID,
		}
		if metadata != nil {
			reconcileInput.Metadata = *metadata
		}
		_, err := s.reconciliation.EvaluateCandidates(ctx, scope, SourceReconciliationInput{
			SourceDocumentID: reconcileInput.SourceDocumentID,
			SourceRevisionID: reconcileInput.SourceRevisionID,
			ArtifactID:       reconcileInput.ArtifactID,
			ActorID:          reconcileInput.ActorID,
			Metadata:         reconcileInput.Metadata,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s DefaultLineageRepairService) sourceDocumentDiagnostics(ctx context.Context, scope stores.Scope, sourceDocumentID string) (LineageDiagnostics, error) {
	if s.readModels.lineage == nil {
		return LineageDiagnostics{}, domainValidationError("lineage_repairs", "lineage", "not configured")
	}
	sourceDocument, err := s.readModels.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	latestRevision, err := s.readModels.latestRevisionForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return LineageDiagnostics{}, err
	}
	activeHandle, err := s.readModels.activeHandleForSourceDocument(ctx, scope, sourceDocument.ID)
	if err != nil && !isNotFound(err) {
		return LineageDiagnostics{}, err
	}
	sourceArtifact, err := s.readModels.documentArtifact(ctx, scope, stores.DocumentRecord{}, latestRevision.ID)
	if err != nil && !isNotFound(err) {
		return LineageDiagnostics{}, err
	}
	fingerprints, err := s.readModels.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: latestRevision.ID,
	})
	if err != nil {
		return LineageDiagnostics{}, err
	}
	relationships, err := s.readModels.lineage.ListSourceRelationships(ctx, scope, stores.SourceRelationshipQuery{
		SourceDocumentID: sourceDocument.ID,
	})
	if err != nil {
		return LineageDiagnostics{}, err
	}
	warnings, err := s.readModels.ListCandidateWarnings(ctx, scope, sourceDocument.ID)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	fingerprintStatus, fingerprintProcessing := s.readModels.fingerprintStateForRevision(ctx, scope, latestRevision)
	jobRuns, err := s.readModels.listLineageJobRuns(ctx, scope, latestRevision.ID)
	if err != nil {
		return LineageDiagnostics{}, err
	}
	return LineageDiagnostics{
		ResourceKind:           "source_document",
		ResourceID:             strings.TrimSpace(sourceDocument.ID),
		SourceDocument:         cloneSourceDocumentRecord(sourceDocument),
		SourceRevision:         cloneSourceRevisionRecord(latestRevision),
		LatestSourceRevision:   cloneSourceRevisionRecord(latestRevision),
		SourceArtifact:         cloneSourceArtifactRecord(sourceArtifact),
		ActiveHandle:           cloneSourceHandleRecord(activeHandle),
		FingerprintStatus:      fingerprintStatus,
		FingerprintProcessing:  fingerprintProcessing,
		Fingerprints:           append([]stores.SourceFingerprintRecord{}, fingerprints...),
		JobRuns:                append([]stores.JobRunRecord{}, jobRuns...),
		CandidateWarnings:      append([]CandidateWarningSummary{}, warnings...),
		CandidateRelationships: append([]stores.SourceRelationshipRecord{}, relationships...),
		EmptyState:             LineageEmptyState{Kind: LineageEmptyStateNone},
	}, nil
}

func cloneSourceDocumentRecord(record stores.SourceDocumentRecord) *stores.SourceDocumentRecord {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	copy := record
	return &copy
}

func cloneSourceHandleRecord(record stores.SourceHandleRecord) *stores.SourceHandleRecord {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	copy := record
	return &copy
}

func cloneSourceRevisionRecord(record stores.SourceRevisionRecord) *stores.SourceRevisionRecord {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	copy := record
	copy.ModifiedTime = cloneSourceTimePtr(record.ModifiedTime)
	copy.ExportedAt = cloneSourceTimePtr(record.ExportedAt)
	return &copy
}

func cloneSourceArtifactRecord(record stores.SourceArtifactRecord) *stores.SourceArtifactRecord {
	if strings.TrimSpace(record.ID) == "" {
		return nil
	}
	copy := record
	return &copy
}
