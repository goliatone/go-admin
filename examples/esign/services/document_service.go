package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-uploader"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

// DocumentUploadInput contains the minimum source data required to persist a document.
type DocumentUploadInput struct {
	ID                     string     `json:"id"`
	Title                  string     `json:"title"`
	SourceOriginalName     string     `json:"source_original_name"`
	ObjectKey              string     `json:"object_key"`
	PDF                    []byte     `json:"pdf"`
	CreatedBy              string     `json:"created_by"`
	UploadedAt             time.Time  `json:"uploaded_at"`
	SourceType             string     `json:"source_type"`
	SourceGoogleFileID     string     `json:"source_google_file_id"`
	SourceGoogleDocURL     string     `json:"source_google_doc_url"`
	SourceModifiedTime     *time.Time `json:"source_modified_time"`
	SourceExportedAt       *time.Time `json:"source_exported_at"`
	SourceExportedByUserID string     `json:"source_exported_by_user_id"`
	SourceMimeType         string     `json:"source_mime_type"`
	SourceIngestionMode    string     `json:"source_ingestion_mode"`
	SourceDocumentID       string     `json:"source_document_id"`
	SourceRevisionID       string     `json:"source_revision_id"`
}

// DocumentMetadata captures extracted immutable source PDF metadata.
type DocumentMetadata struct {
	SHA256    string `json:"sha256"`
	SizeBytes int64  `json:"size_bytes"`
	PageCount int    `json:"page_count"`
}

// DocumentService validates uploaded PDFs, extracts metadata, and persists document records.
type DocumentService struct {
	store       stores.DocumentStore
	objectStore documentObjectStore
	pdfs        PDFService
	now         func() time.Time
	txActive    bool
}

// DocumentServiceOption customizes document service behavior.
type DocumentServiceOption func(*DocumentService)

type documentObjectStore interface {
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// WithDocumentClock sets the service clock.
func WithDocumentClock(now func() time.Time) DocumentServiceOption {
	return func(s *DocumentService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithDocumentObjectStore configures immutable PDF blob persistence for document uploads/imports.
func WithDocumentObjectStore(store documentObjectStore) DocumentServiceOption {
	return func(s *DocumentService) {
		if s == nil {
			return
		}
		s.objectStore = store
	}
}

// WithDocumentPDFService sets the shared PDF service used for analysis and policy checks.
func WithDocumentPDFService(service PDFService) DocumentServiceOption {
	return func(s *DocumentService) {
		if s == nil {
			return
		}
		s.pdfs = service
	}
}

func NewDocumentService(store stores.Store, opts ...DocumentServiceOption) DocumentService {
	svc := DocumentService{
		store: store,
		pdfs:  NewPDFService(),
		now:   func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s DocumentService) forTx(tx stores.TxStore) DocumentService {
	txSvc := s
	if tx != nil {
		txSvc.store = tx
		txSvc.txActive = true
	}
	return txSvc
}

// Upload validates source PDF bytes and persists immutable metadata.
func (s DocumentService) Upload(ctx context.Context, scope stores.Scope, input DocumentUploadInput) (stores.DocumentRecord, error) {
	if s.store == nil {
		return stores.DocumentRecord{}, domainValidationError("documents", "store", "not configured")
	}
	objectKey := strings.TrimSpace(input.ObjectKey)
	if objectKey == "" {
		return stores.DocumentRecord{}, domainValidationError("documents", "source_object_key", "required")
	}
	sourceOriginalName := strings.TrimSpace(input.SourceOriginalName)
	if sourceOriginalName == "" {
		return stores.DocumentRecord{}, domainValidationError("documents", "source_original_name", "required")
	}

	payload := append([]byte{}, input.PDF...)
	policy := s.pdfs.Policy(ctx, scope)
	analysis, err := s.pdfs.Analyze(ctx, scope, payload)
	policyRejectReason := PDFReasonCode("")
	if err != nil {
		reason := pdfErrorReasonCode(err)
		observability.ObservePDFIngestAnalyzeFailure(ctx, string(reason), string(PDFCompatibilityTierUnsupported))
		if isPDFPolicyReason(reason) {
			observability.ObservePDFIngestPolicyReject(ctx, string(reason), string(PDFCompatibilityTierUnsupported))
		}
		if policyAllowsAnalyzeOnlyUpload(policy) && isPDFCompatibilityBypassReason(reason) {
			policyRejectReason = reason
			analysis, err = s.analyzeWithoutCompatibilityBlocking(ctx, scope, payload, policy)
		}
		if err != nil {
			return stores.DocumentRecord{}, mapPDFAnalysisError(err)
		}
	}
	if policyRejectReason != "" {
		analysis.CompatibilityTier = PDFCompatibilityTierUnsupported
		analysis.ReasonCode = policyRejectReason
	}
	metadata := DocumentMetadata{
		SHA256:    analysis.SHA256,
		SizeBytes: analysis.SizeBytes,
		PageCount: analysis.PageCount,
	}
	normalizationStatus := analysis.NormalizationStatus
	normalizedObjectKey := ""
	if s.objectStore != nil {
		if _, err := s.objectStore.UploadFile(ctx, objectKey, payload,
			uploader.WithContentType("application/pdf"),
			uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
		); err != nil {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persist source pdf failed")
		}
		stored, err := s.objectStore.GetFile(ctx, objectKey)
		if err != nil || len(stored) == 0 {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persisted source pdf is unavailable")
		}
		sum := sha256.Sum256(stored)
		if hex.EncodeToString(sum[:]) != metadata.SHA256 {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persisted source pdf digest mismatch")
		}

		if policyPrefersNormalizedSource(policy) {
			candidateNormalizedObjectKey := normalizedObjectKeyForSource(objectKey)
			normalized, normalizeErr := s.pdfs.Normalize(ctx, scope, payload)
			if normalizeErr == nil && len(normalized.Payload) > 0 {
				if _, err := s.objectStore.UploadFile(ctx, candidateNormalizedObjectKey, normalized.Payload,
					uploader.WithContentType("application/pdf"),
					uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
				); err == nil {
					storedNormalized, err := s.objectStore.GetFile(ctx, candidateNormalizedObjectKey)
					if err == nil && len(storedNormalized) > 0 {
						sum := sha256.Sum256(storedNormalized)
						if hex.EncodeToString(sum[:]) == normalized.SHA256 {
							normalizationStatus = PDFNormalizationStatusCompleted
							normalizedObjectKey = candidateNormalizedObjectKey
						} else {
							normalizationStatus = PDFNormalizationStatusFailed
						}
					} else {
						normalizationStatus = PDFNormalizationStatusFailed
					}
				} else {
					normalizationStatus = PDFNormalizationStatusFailed
				}
			} else {
				normalizationStatus = PDFNormalizationStatusFailed
			}
		}
	}
	baseCompatibilityTier := strings.TrimSpace(string(analysis.CompatibilityTier))
	baseCompatibilityReason := strings.TrimSpace(string(analysis.ReasonCode))
	if normalizationStatus == PDFNormalizationStatusFailed {
		baseCompatibilityTier = ""
		baseCompatibilityReason = coalesceCompatibilityReason(baseCompatibilityReason, PDFCompatibilityReasonNormalizationFailed)
	}
	compatibility := resolveDocumentCompatibility(policy, stores.DocumentRecord{
		PDFCompatibilityTier:   baseCompatibilityTier,
		PDFCompatibilityReason: baseCompatibilityReason,
		PDFNormalizationStatus: strings.TrimSpace(string(normalizationStatus)),
	})

	now := s.now()
	if !input.UploadedAt.IsZero() {
		now = input.UploadedAt.UTC()
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Untitled Document"
	}

	record := stores.DocumentRecord{
		ID:                     strings.TrimSpace(input.ID),
		CreatedByUserID:        strings.TrimSpace(input.CreatedBy),
		Title:                  title,
		SourceOriginalName:     sourceOriginalName,
		SourceObjectKey:        objectKey,
		NormalizedObjectKey:    normalizedObjectKey,
		SourceSHA256:           metadata.SHA256,
		SourceType:             strings.TrimSpace(input.SourceType),
		SourceGoogleFileID:     strings.TrimSpace(input.SourceGoogleFileID),
		SourceGoogleDocURL:     strings.TrimSpace(input.SourceGoogleDocURL),
		SourceModifiedTime:     input.SourceModifiedTime,
		SourceExportedAt:       input.SourceExportedAt,
		SourceExportedByUserID: strings.TrimSpace(input.SourceExportedByUserID),
		SourceMimeType:         strings.TrimSpace(input.SourceMimeType),
		SourceIngestionMode:    strings.TrimSpace(input.SourceIngestionMode),
		SourceDocumentID:       strings.TrimSpace(input.SourceDocumentID),
		SourceRevisionID:       strings.TrimSpace(input.SourceRevisionID),
		PDFCompatibilityTier:   strings.TrimSpace(string(compatibility.Tier)),
		PDFCompatibilityReason: strings.TrimSpace(compatibility.Reason),
		PDFNormalizationStatus: strings.TrimSpace(string(normalizationStatus)),
		PDFAnalyzedAt:          cloneDocumentTimePtr(now),
		PDFPolicyVersion:       PDFPolicyVersion,
		SizeBytes:              metadata.SizeBytes,
		PageCount:              metadata.PageCount,
		CreatedAt:              now,
		UpdatedAt:              now,
	}
	if strings.TrimSpace(record.SourceRevisionID) == "" {
		return s.store.Create(ctx, scope, record)
	}
	return s.createLineageBackedDocument(ctx, scope, record)
}

func (s DocumentService) createLineageBackedDocument(ctx context.Context, scope stores.Scope, record stores.DocumentRecord) (stores.DocumentRecord, error) {
	if s.txActive {
		documentStore, ok := s.store.(stores.DocumentStore)
		if !ok {
			return stores.DocumentRecord{}, domainValidationError("documents", "store", "transaction document store not configured")
		}
		lineage, ok := s.store.(stores.LineageStore)
		if !ok {
			return documentStore.Create(ctx, scope, record)
		}
		artifact, err := ensureSourceArtifactRecord(ctx, scope, lineage, record)
		if err != nil {
			return stores.DocumentRecord{}, err
		}
		record.SourceArtifactID = strings.TrimSpace(artifact.ID)
		return documentStore.Create(ctx, scope, record)
	}

	txManager, ok := s.store.(stores.TransactionManager)
	if !ok {
		return s.store.Create(ctx, scope, record)
	}

	created := stores.DocumentRecord{}
	if err := txManager.WithTx(ctx, func(tx stores.TxStore) error {
		documentStore, ok := tx.(stores.DocumentStore)
		if !ok {
			return domainValidationError("documents", "store", "transaction document store not configured")
		}
		lineage, ok := tx.(stores.LineageStore)
		if !ok {
			createdRecord, err := documentStore.Create(ctx, scope, record)
			if err != nil {
				return err
			}
			created = createdRecord
			return nil
		}

		artifact, err := ensureSourceArtifactRecord(ctx, scope, lineage, record)
		if err != nil {
			return err
		}
		record.SourceArtifactID = strings.TrimSpace(artifact.ID)
		createdRecord, err := documentStore.Create(ctx, scope, record)
		if err != nil {
			return err
		}
		created = createdRecord
		return nil
	}); err != nil {
		return stores.DocumentRecord{}, err
	}
	return created, nil
}

func ensureSourceArtifactRecord(ctx context.Context, scope stores.Scope, lineage stores.LineageStore, document stores.DocumentRecord) (stores.SourceArtifactRecord, error) {
	if lineage == nil {
		return stores.SourceArtifactRecord{}, domainValidationError("documents", "lineage_store", "not configured")
	}
	sourceRevisionID := strings.TrimSpace(document.SourceRevisionID)
	if sourceRevisionID == "" {
		return stores.SourceArtifactRecord{}, domainValidationError("documents", "source_revision_id", "required")
	}
	existing, err := lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: sourceRevisionID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
		SHA256:           strings.TrimSpace(document.SourceSHA256),
	})
	if err != nil {
		return stores.SourceArtifactRecord{}, err
	}
	if len(existing) > 0 {
		observability.LogOperation(ctx, slog.LevelInfo, "lineage", "source_artifact_reused", "success", "", 0, nil, map[string]any{
			"source_revision_id": sourceRevisionID,
			"artifact_id":        strings.TrimSpace(existing[0].ID),
			"sha256":             strings.TrimSpace(document.SourceSHA256),
		})
		return existing[0], nil
	}

	createdAt := document.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	record := stores.SourceArtifactRecord{
		SourceRevisionID:    sourceRevisionID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           strings.TrimSpace(document.SourceObjectKey),
		SHA256:              strings.TrimSpace(document.SourceSHA256),
		PageCount:           document.PageCount,
		SizeBytes:           document.SizeBytes,
		CompatibilityTier:   strings.TrimSpace(document.PDFCompatibilityTier),
		CompatibilityReason: strings.TrimSpace(document.PDFCompatibilityReason),
		NormalizationStatus: strings.TrimSpace(document.PDFNormalizationStatus),
		CreatedAt:           createdAt,
		UpdatedAt:           createdAt,
	}
	artifact, err := lineage.CreateSourceArtifact(ctx, scope, record)
	if err == nil {
		observability.LogOperation(ctx, slog.LevelInfo, "lineage", "source_artifact_created", "success", "", 0, nil, map[string]any{
			"source_revision_id": sourceRevisionID,
			"artifact_id":        strings.TrimSpace(artifact.ID),
			"sha256":             strings.TrimSpace(document.SourceSHA256),
		})
		return artifact, nil
	}
	existing, listErr := lineage.ListSourceArtifacts(ctx, scope, stores.SourceArtifactQuery{
		SourceRevisionID: sourceRevisionID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
		SHA256:           strings.TrimSpace(document.SourceSHA256),
	})
	if listErr == nil && len(existing) > 0 {
		return existing[0], nil
	}
	return stores.SourceArtifactRecord{}, err
}

func normalizedObjectKeyForSource(sourceObjectKey string) string {
	sourceObjectKey = strings.TrimSpace(sourceObjectKey)
	if sourceObjectKey == "" {
		return ""
	}
	ext := strings.ToLower(strings.TrimSpace(path.Ext(sourceObjectKey)))
	if ext == ".pdf" {
		return strings.TrimSuffix(sourceObjectKey, path.Ext(sourceObjectKey)) + ".normalized.pdf"
	}
	return sourceObjectKey + ".normalized.pdf"
}

func cloneDocumentTimePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

// ExtractPDFMetadata validates bytes as PDF and extracts deterministic metadata.
func ExtractPDFMetadata(raw []byte) (DocumentMetadata, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return DocumentMetadata{}, domainValidationError("documents", "pdf", "required")
	}
	analysis, err := NewPDFService().Analyze(context.Background(), stores.Scope{}, raw)
	if err != nil {
		return DocumentMetadata{}, mapPDFAnalysisError(err)
	}
	return DocumentMetadata{
		SHA256:    analysis.SHA256,
		SizeBytes: analysis.SizeBytes,
		PageCount: analysis.PageCount,
	}, nil
}

func mapPDFAnalysisError(err error) error {
	if err == nil {
		return invalidPDFError("parse failed")
	}
	reason := strings.TrimSpace(string(pdfErrorReasonCode(err)))
	if reason == "" {
		reason = "parse.failed"
	}
	if isPDFInvalidInputReason(PDFReasonCode(reason)) {
		return invalidPDFError(reason)
	}
	return pdfUnsupportedError("document.upload", string(PDFCompatibilityTierUnsupported), reason, map[string]any{
		"entity":         "documents",
		"field":          "pdf",
		"policy_version": PDFPolicyVersion,
	})
}

func pdfErrorReasonCode(err error) PDFReasonCode {
	if err == nil {
		return PDFReasonParseFailed
	}
	var pdfErr *PDFError
	if errors.As(err, &pdfErr) && pdfErr != nil && strings.TrimSpace(string(pdfErr.Reason)) != "" {
		return pdfErr.Reason
	}
	return PDFReasonParseFailed
}

func isPDFPolicyReason(reason PDFReasonCode) bool {
	return strings.HasPrefix(strings.TrimSpace(string(reason)), "policy.")
}

func isPDFInvalidInputReason(reason PDFReasonCode) bool {
	return strings.HasPrefix(strings.TrimSpace(string(reason)), "invalid_input.")
}

func isPDFCompatibilityBypassReason(reason PDFReasonCode) bool {
	switch reason {
	case PDFReasonPolicyMaxPages:
		return true
	default:
		return false
	}
}

func (s DocumentService) analyzeWithoutCompatibilityBlocking(ctx context.Context, scope stores.Scope, payload []byte, policy PDFPolicy) (PDFAnalysis, error) {
	relaxed := normalizePDFPolicy(policy)
	if relaxed.MaxPages < 10000 {
		relaxed.MaxPages = 10000
	}
	relaxed.PipelineMode = policy.PipelineMode

	relaxedPDFs := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(relaxed)))
	return relaxedPDFs.Analyze(ctx, scope, payload)
}

func invalidPDFError(reason string) error {
	return goerrors.New("invalid pdf payload", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode(string(ErrorCodeMissingRequiredFields)).
		WithMetadata(map[string]any{"entity": "documents", "field": "pdf", "reason": strings.TrimSpace(reason)})
}

func domainValidationError(entity, field, reason string) error {
	meta := map[string]any{"entity": strings.TrimSpace(entity), "field": strings.TrimSpace(field)}
	if strings.TrimSpace(reason) != "" {
		meta["reason"] = strings.TrimSpace(reason)
	}
	return goerrors.New("invalid input", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode(string(ErrorCodeMissingRequiredFields)).
		WithMetadata(meta)
}
