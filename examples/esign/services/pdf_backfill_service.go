package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

const (
	pdfBackfillReasonSourceUnavailable = "source.unavailable"
)

// PDFBackfillInput controls a single backfill run.
type PDFBackfillInput struct {
	DryRun bool
	Limit  int
	Offset int
}

// PDFBackfillFailure captures non-fatal per-document errors.
type PDFBackfillFailure struct {
	DocumentID string
	Reason     string
}

// PDFBackfillResult summarizes a backfill run.
type PDFBackfillResult struct {
	Scanned  int
	Updated  int
	Skipped  int
	Failed   int
	Failures []PDFBackfillFailure
}

// PDFBackfillService migrates legacy documents into the hardened PDF metadata model.
type PDFBackfillService struct {
	documents stores.DocumentStore
	objects   documentObjectStore
	pdfs      PDFService
	now       func() time.Time
}

// PDFBackfillOption customizes PDF backfill behavior.
type PDFBackfillOption func(*PDFBackfillService)

// WithPDFBackfillPDFService configures the PDF analyzer/normalizer used by backfill.
func WithPDFBackfillPDFService(service PDFService) PDFBackfillOption {
	return func(s *PDFBackfillService) {
		if s == nil {
			return
		}
		s.pdfs = service
	}
}

// WithPDFBackfillClock configures the clock used for analyzed timestamps.
func WithPDFBackfillClock(now func() time.Time) PDFBackfillOption {
	return func(s *PDFBackfillService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// NewPDFBackfillService builds a document backfill service.
func NewPDFBackfillService(documents stores.DocumentStore, objects documentObjectStore, opts ...PDFBackfillOption) PDFBackfillService {
	svc := PDFBackfillService{
		documents: documents,
		objects:   objects,
		pdfs:      NewPDFService(),
		now:       func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

// Run executes an idempotent metadata backfill over the selected document window.
func (s PDFBackfillService) Run(ctx context.Context, scope stores.Scope, input PDFBackfillInput) (PDFBackfillResult, error) {
	if s.documents == nil {
		return PDFBackfillResult{}, domainValidationError("documents", "store", "not configured")
	}
	if s.objects == nil {
		return PDFBackfillResult{}, domainValidationError("documents", "object_store", "not configured")
	}
	policy := s.pdfs.Policy(ctx, scope)
	docs, err := s.documents.List(ctx, scope, stores.DocumentQuery{
		SortBy: "created_at",
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return PDFBackfillResult{}, err
	}
	result := PDFBackfillResult{Failures: make([]PDFBackfillFailure, 0)}
	for _, document := range docs {
		result.Scanned++
		patch, reason := s.backfillDocumentPatch(ctx, scope, document, policy)
		if strings.TrimSpace(reason) != "" {
			result.Failed++
			result.Failures = append(result.Failures, PDFBackfillFailure{DocumentID: strings.TrimSpace(document.ID), Reason: strings.TrimSpace(reason)})
			continue
		}
		if documentBackfillPatchUnchanged(document, patch) {
			result.Skipped++
			continue
		}
		if input.DryRun {
			result.Updated++
			continue
		}
		if _, err := s.documents.SaveMetadata(ctx, scope, document.ID, patch); err != nil {
			result.Failed++
			result.Failures = append(result.Failures, PDFBackfillFailure{DocumentID: strings.TrimSpace(document.ID), Reason: strings.TrimSpace(err.Error())})
			continue
		}
		result.Updated++
	}
	return result, nil
}

func (s PDFBackfillService) backfillDocumentPatch(ctx context.Context, scope stores.Scope, document stores.DocumentRecord, policy PDFPolicy) (stores.DocumentMetadataPatch, string) {
	patch := stores.DocumentMetadataPatch{
		NormalizedObjectKey:    strings.TrimSpace(document.NormalizedObjectKey),
		PDFCompatibilityTier:   strings.TrimSpace(document.PDFCompatibilityTier),
		PDFCompatibilityReason: strings.TrimSpace(document.PDFCompatibilityReason),
		PDFNormalizationStatus: strings.TrimSpace(document.PDFNormalizationStatus),
		PDFAnalyzedAt:          cloneTimePtr(document.PDFAnalyzedAt),
		PDFPolicyVersion:       strings.TrimSpace(document.PDFPolicyVersion),
		SizeBytes:              document.SizeBytes,
		PageCount:              document.PageCount,
	}

	sourceKey := strings.TrimSpace(document.SourceObjectKey)
	if sourceKey == "" {
		patch.PDFCompatibilityTier = string(PDFCompatibilityTierUnsupported)
		patch.PDFCompatibilityReason = pdfBackfillReasonSourceUnavailable
		patch.PDFNormalizationStatus = string(PDFNormalizationStatusFailed)
		patch.PDFPolicyVersion = PDFPolicyVersion
		patch.PDFAnalyzedAt = resolvedBackfillAnalyzedAt(patch.PDFAnalyzedAt, s.now())
		return patch, ""
	}

	sourcePDF, err := s.objects.GetFile(ctx, sourceKey)
	if err != nil || len(sourcePDF) == 0 {
		patch.PDFCompatibilityTier = string(PDFCompatibilityTierUnsupported)
		patch.PDFCompatibilityReason = pdfBackfillReasonSourceUnavailable
		patch.PDFNormalizationStatus = string(PDFNormalizationStatusFailed)
		patch.PDFPolicyVersion = PDFPolicyVersion
		patch.PDFAnalyzedAt = resolvedBackfillAnalyzedAt(patch.PDFAnalyzedAt, s.now())
		return patch, ""
	}

	analysis, analyzeErr := s.pdfs.Analyze(ctx, scope, sourcePDF)
	if analyzeErr != nil {
		reason := strings.TrimSpace(string(pdfErrorReasonCode(analyzeErr)))
		if reason == "" {
			reason = string(PDFReasonParseFailed)
		}
		patch.PDFCompatibilityTier = string(PDFCompatibilityTierUnsupported)
		patch.PDFCompatibilityReason = reason
		patch.PDFNormalizationStatus = string(PDFNormalizationStatusFailed)
		patch.SizeBytes = int64(len(sourcePDF))
		if patch.PDFPolicyVersion == "" {
			patch.PDFPolicyVersion = PDFPolicyVersion
		}
		patch.PDFAnalyzedAt = resolvedBackfillAnalyzedAt(patch.PDFAnalyzedAt, s.now())
		return patch, ""
	}

	patch.SizeBytes = analysis.SizeBytes
	patch.PageCount = analysis.PageCount
	patch.PDFPolicyVersion = PDFPolicyVersion
	patch.PDFAnalyzedAt = resolvedBackfillAnalyzedAt(patch.PDFAnalyzedAt, s.now())

	normalizationStatus := normalizePDFNormalizationStatus(patch.PDFNormalizationStatus)
	normalizedKey := strings.TrimSpace(patch.NormalizedObjectKey)
	if normalizationStatus != PDFNormalizationStatusCompleted || normalizedKey == "" {
		normalized, normalizeErr := s.pdfs.Normalize(ctx, scope, sourcePDF)
		if normalizeErr == nil && len(normalized.Payload) > 0 {
			candidateKey := normalizedObjectKeyForSource(sourceKey)
			if _, err := s.objects.UploadFile(ctx, candidateKey, normalized.Payload,
				uploader.WithContentType("application/pdf"),
				uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
			); err == nil {
				stored, err := s.objects.GetFile(ctx, candidateKey)
				if err == nil && len(stored) > 0 {
					sum := sha256.Sum256(stored)
					if hex.EncodeToString(sum[:]) == normalized.SHA256 {
						normalizedKey = candidateKey
						normalizationStatus = PDFNormalizationStatusCompleted
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

	baseCompatibilityTier := string(analysis.CompatibilityTier)
	baseCompatibilityReason := string(analysis.ReasonCode)
	if normalizationStatus == PDFNormalizationStatusFailed {
		baseCompatibilityTier = ""
		baseCompatibilityReason = coalesceCompatibilityReason(baseCompatibilityReason, PDFCompatibilityReasonNormalizationFailed)
	}
	compatibility := resolveDocumentCompatibility(policy, stores.DocumentRecord{
		PDFCompatibilityTier:   strings.TrimSpace(baseCompatibilityTier),
		PDFCompatibilityReason: strings.TrimSpace(baseCompatibilityReason),
		PDFNormalizationStatus: strings.TrimSpace(string(normalizationStatus)),
	})

	patch.NormalizedObjectKey = normalizedKey
	patch.PDFNormalizationStatus = string(normalizationStatus)
	patch.PDFCompatibilityTier = string(compatibility.Tier)
	patch.PDFCompatibilityReason = compatibility.Reason
	return patch, ""
}

func documentBackfillPatchUnchanged(document stores.DocumentRecord, patch stores.DocumentMetadataPatch) bool {
	return strings.TrimSpace(document.NormalizedObjectKey) == strings.TrimSpace(patch.NormalizedObjectKey) &&
		strings.TrimSpace(document.PDFCompatibilityTier) == strings.TrimSpace(patch.PDFCompatibilityTier) &&
		strings.TrimSpace(document.PDFCompatibilityReason) == strings.TrimSpace(patch.PDFCompatibilityReason) &&
		strings.TrimSpace(document.PDFNormalizationStatus) == strings.TrimSpace(patch.PDFNormalizationStatus) &&
		backfillTimePtrEqual(document.PDFAnalyzedAt, patch.PDFAnalyzedAt) &&
		strings.TrimSpace(document.PDFPolicyVersion) == strings.TrimSpace(patch.PDFPolicyVersion) &&
		document.SizeBytes == patch.SizeBytes &&
		document.PageCount == patch.PageCount
}

func backfillTimePtrEqual(a, b *time.Time) bool {
	switch {
	case a == nil && b == nil:
		return true
	case a == nil || b == nil:
		return false
	default:
		return a.UTC().Equal(b.UTC())
	}
}

func resolvedBackfillAnalyzedAt(current *time.Time, now time.Time) *time.Time {
	if current != nil && !current.IsZero() {
		return cloneTimePtr(current)
	}
	cloned := now.UTC()
	return &cloned
}

func (s PDFBackfillService) String() string {
	return fmt.Sprintf("pdf_backfill_service{has_documents:%t, has_objects:%t}", s.documents != nil, s.objects != nil)
}
