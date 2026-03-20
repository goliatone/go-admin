package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	lineageFingerprintErrorUnreadablePDF        = "unreadable_pdf"
	lineageFingerprintErrorIncompleteExtraction = "incomplete_extraction_signal"
	defaultFingerprintChunkTokenTarget          = 96
	defaultFingerprintChunkTokenMinimum         = 24
	defaultFingerprintMinHashCount              = 24
)

var whitespaceCollapsePattern = regexp.MustCompile(`\s+`)

type sourceFingerprintObjectStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
}

type DefaultSourceFingerprintService struct {
	lineage     stores.LineageStore
	objectStore sourceFingerprintObjectStore
	now         func() time.Time
}

type SourceFingerprintServiceOption func(*DefaultSourceFingerprintService)

func WithSourceFingerprintClock(now func() time.Time) SourceFingerprintServiceOption {
	return func(s *DefaultSourceFingerprintService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func NewDefaultSourceFingerprintService(
	lineage stores.LineageStore,
	objectStore sourceFingerprintObjectStore,
	opts ...SourceFingerprintServiceOption,
) DefaultSourceFingerprintService {
	svc := DefaultSourceFingerprintService{
		lineage:     lineage,
		objectStore: objectStore,
		now:         func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

func (s DefaultSourceFingerprintService) BuildFingerprint(ctx context.Context, scope stores.Scope, input SourceFingerprintBuildInput) (SourceFingerprintBuildResult, error) {
	if s.lineage == nil {
		return SourceFingerprintBuildResult{}, domainValidationError("lineage_fingerprints", "lineage", "not configured")
	}
	if s.objectStore == nil {
		return SourceFingerprintBuildResult{}, domainValidationError("lineage_fingerprints", "object_store", "not configured")
	}
	sourceRevisionID := strings.TrimSpace(input.SourceRevisionID)
	artifactID := strings.TrimSpace(input.ArtifactID)
	if sourceRevisionID == "" || artifactID == "" {
		return SourceFingerprintBuildResult{}, domainValidationError("lineage_fingerprints", "source_revision_id|artifact_id", "required")
	}

	sourceRevision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	artifact, err := s.lineage.GetSourceArtifact(ctx, scope, artifactID)
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	if err := validateSourceArtifactRevisionLink(sourceRevision, artifact); err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	if strings.TrimSpace(artifact.ObjectKey) == "" {
		return SourceFingerprintBuildResult{}, domainValidationError("lineage_fingerprints", "object_key", "required")
	}

	pdfBytes, err := s.objectStore.GetFile(ctx, artifact.ObjectKey)
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	if len(pdfBytes) == 0 {
		return SourceFingerprintBuildResult{}, fmt.Errorf("lineage fingerprints: artifact %s has no object bytes", artifact.ID)
	}

	fingerprint := stores.SourceFingerprintRecord{
		ID:               sourceFingerprintRecordID(sourceRevisionID, artifactID, stores.SourceExtractVersionPDFTextV1),
		SourceRevisionID: sourceRevisionID,
		ArtifactID:       artifactID,
		ExtractVersion:   stores.SourceExtractVersionPDFTextV1,
		CreatedAt:        s.now().UTC(),
	}

	extracted, extractionErr := extractFingerprintText(ctx, pdfBytes)
	if extractionErr != nil {
		record, persistErr := s.persistFingerprintFailure(ctx, scope, fingerprint, input.Metadata, sourceRevision, artifact, extractionErr)
		if persistErr != nil {
			return SourceFingerprintBuildResult{}, persistErr
		}
		return SourceFingerprintBuildResult{
			Fingerprint: record,
			Status:      fingerprintStatusSummaryFromRecord(record),
		}, nil
	}

	normalizedParagraphs := normalizeFingerprintParagraphs(extracted.Text)
	normalizedText := strings.Join(normalizedParagraphs, "\n\n")
	tokens := fingerprintTokens(normalizedText)
	if len(tokens) == 0 {
		record, persistErr := s.persistFingerprintFailure(ctx, scope, fingerprint, input.Metadata, sourceRevision, artifact, newLineageExtractionError(lineageFingerprintErrorIncompleteExtraction, "no normalized text tokens extracted"))
		if persistErr != nil {
			return SourceFingerprintBuildResult{}, persistErr
		}
		return SourceFingerprintBuildResult{
			Fingerprint: record,
			Status:      fingerprintStatusSummaryFromRecord(record),
		}, nil
	}

	chunks := buildFingerprintChunks(normalizedParagraphs)
	chunkHashes := make([]string, 0, len(chunks))
	for _, chunk := range chunks {
		chunkHashes = append(chunkHashes, hashFingerprintValue(chunk))
	}

	metadataJSON, err := json.Marshal(buildFingerprintExtractionMetadata(input.Metadata, sourceRevision, artifact, extracted, normalizedParagraphs, chunks, len(tokens), len(pdfBytes)))
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	chunkHashesJSON, err := json.Marshal(chunkHashes)
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}
	minHashesJSON, err := json.Marshal(computeFingerprintMinHashes(tokens))
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}

	fingerprint.Status = stores.SourceFingerprintStatusReady
	fingerprint.RawSHA256 = hashFingerprintBytes(pdfBytes)
	fingerprint.NormalizedTextSHA256 = hashFingerprintValue(normalizedText)
	fingerprint.SimHash64 = computeFingerprintSimHash(tokens)
	fingerprint.MinHashJSON = string(minHashesJSON)
	fingerprint.ChunkHashesJSON = string(chunkHashesJSON)
	fingerprint.ExtractionMetadataJSON = string(metadataJSON)
	fingerprint.TokenCount = len(tokens)

	record, err := s.saveFingerprintRecord(ctx, scope, fingerprint)
	if err != nil {
		return SourceFingerprintBuildResult{}, err
	}

	return SourceFingerprintBuildResult{
		Fingerprint: record,
		Status:      fingerprintStatusSummaryFromRecord(record),
	}, nil
}

type extractedFingerprintText struct {
	Text      string
	PageCount int
}

type lineageExtractionError struct {
	Code    string
	Message string
}

func (e *lineageExtractionError) Error() string {
	if e == nil {
		return "lineage extraction error"
	}
	return strings.TrimSpace(e.Message)
}

func newLineageExtractionError(code, message string) error {
	return &lineageExtractionError{
		Code:    strings.TrimSpace(code),
		Message: strings.TrimSpace(message),
	}
}

func extractFingerprintText(ctx context.Context, pdfBytes []byte) (extractedFingerprintText, error) {
	if err := ctx.Err(); err != nil {
		return extractedFingerprintText{}, err
	}
	reader, err := currentPDFReaderFactory()(bytes.NewReader(pdfBytes), int64(len(pdfBytes)))
	if err != nil {
		return extractedFingerprintText{}, newLineageExtractionError(lineageFingerprintErrorUnreadablePDF, fmt.Sprintf("unable to parse PDF text: %v", err))
	}
	plainText, err := reader.GetPlainText()
	if err != nil {
		return extractedFingerprintText{}, newLineageExtractionError(lineageFingerprintErrorUnreadablePDF, fmt.Sprintf("unable to read PDF text: %v", err))
	}
	payload, err := io.ReadAll(plainText)
	if err != nil {
		return extractedFingerprintText{}, newLineageExtractionError(lineageFingerprintErrorUnreadablePDF, fmt.Sprintf("unable to read extracted text payload: %v", err))
	}
	if err := ctx.Err(); err != nil {
		return extractedFingerprintText{}, err
	}
	text := strings.TrimSpace(string(payload))
	if text == "" {
		return extractedFingerprintText{}, newLineageExtractionError(lineageFingerprintErrorIncompleteExtraction, "pdf text extraction returned an empty payload")
	}
	return extractedFingerprintText{
		Text:      text,
		PageCount: reader.NumPage(),
	}, nil
}

func normalizeFingerprintParagraphs(raw string) []string {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	raw = strings.ReplaceAll(raw, "\r", "\n")
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	paragraphs := strings.Split(raw, "\n\n")
	out := make([]string, 0, len(paragraphs))
	for _, paragraph := range paragraphs {
		normalized := normalizeFingerprintParagraph(paragraph)
		if normalized == "" {
			continue
		}
		out = append(out, normalized)
	}
	if len(out) > 0 {
		return out
	}
	normalized := normalizeFingerprintParagraph(raw)
	if normalized == "" {
		return nil
	}
	return []string{normalized}
}

func normalizeFingerprintParagraph(raw string) string {
	var b strings.Builder
	b.Grow(len(raw))
	for _, r := range raw {
		if r == '\n' || r == '\t' {
			b.WriteRune(' ')
			continue
		}
		if unicode.IsControl(r) {
			continue
		}
		switch r {
		case '\u2018', '\u2019', '\u2032':
			r = '\''
		case '\u201c', '\u201d', '\u2033':
			r = '"'
		case '\u2013', '\u2014', '\u2212':
			r = '-'
		case '\u00a0':
			r = ' '
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return strings.TrimSpace(whitespaceCollapsePattern.ReplaceAllString(b.String(), " "))
}

func fingerprintTokens(normalizedText string) []string {
	if strings.TrimSpace(normalizedText) == "" {
		return nil
	}
	fields := strings.FieldsFunc(normalizedText, func(r rune) bool {
		return !(unicode.IsLetter(r) || unicode.IsNumber(r))
	})
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		field = strings.TrimSpace(field)
		if field != "" {
			out = append(out, field)
		}
	}
	return out
}

func buildFingerprintChunks(paragraphs []string) []string {
	if len(paragraphs) == 0 {
		return nil
	}
	out := make([]string, 0, len(paragraphs))
	current := make([]string, 0, 4)
	currentTokens := 0
	for _, paragraph := range paragraphs {
		paragraphTokens := len(fingerprintTokens(paragraph))
		if paragraphTokens == 0 {
			continue
		}
		if currentTokens >= defaultFingerprintChunkTokenMinimum && currentTokens+paragraphTokens > defaultFingerprintChunkTokenTarget {
			out = append(out, strings.Join(current, "\n\n"))
			current = current[:0]
			currentTokens = 0
		}
		current = append(current, paragraph)
		currentTokens += paragraphTokens
	}
	if len(current) > 0 {
		out = append(out, strings.Join(current, "\n\n"))
	}
	return out
}

func computeFingerprintSimHash(tokens []string) string {
	if len(tokens) == 0 {
		return ""
	}
	var bits [64]int
	for _, token := range tokens {
		hash := hashFingerprintUint64(token)
		weight := 1
		for idx := range 64 {
			if hash&(1<<idx) != 0 {
				bits[idx] += weight
				continue
			}
			bits[idx] -= weight
		}
	}
	var value uint64
	for idx, score := range bits {
		if score > 0 {
			value |= 1 << idx
		}
	}
	return fmt.Sprintf("%016x", value)
}

func computeFingerprintMinHashes(tokens []string) []string {
	if len(tokens) == 0 {
		return []string{}
	}
	unique := make(map[string]struct{}, len(tokens))
	for _, token := range tokens {
		unique[token] = struct{}{}
	}
	out := make([]string, 0, defaultFingerprintMinHashCount)
	for seed := range defaultFingerprintMinHashCount {
		var best uint64
		bestSet := false
		for token := range unique {
			value := hashFingerprintUint64(fmt.Sprintf("%d|%s", seed, token))
			if !bestSet || value < best {
				best = value
				bestSet = true
			}
		}
		out = append(out, fmt.Sprintf("%016x", best))
	}
	return out
}

func buildFingerprintExtractionMetadata(
	metadata SourceMetadataBaseline,
	sourceRevision stores.SourceRevisionRecord,
	artifact stores.SourceArtifactRecord,
	extracted extractedFingerprintText,
	paragraphs []string,
	chunks []string,
	tokenCount int,
	pdfBytes int,
) map[string]any {
	out := map[string]any{
		"extractor":              "ledongthuc/pdf",
		"extract_version":        stores.SourceExtractVersionPDFTextV1,
		"artifact_kind":          strings.TrimSpace(artifact.ArtifactKind),
		"artifact_page_count":    artifact.PageCount,
		"artifact_size_bytes":    artifact.SizeBytes,
		"pdf_bytes":              pdfBytes,
		"page_count_extracted":   extracted.PageCount,
		"paragraph_count":        len(paragraphs),
		"chunk_count":            len(chunks),
		"token_count":            tokenCount,
		"normalized_char_count":  len(strings.Join(paragraphs, "\n\n")),
		"source_mime_type":       firstNonEmpty(strings.TrimSpace(metadata.SourceMimeType), strings.TrimSpace(sourceRevision.SourceMimeType)),
		"source_ingestion_mode":  strings.TrimSpace(metadata.SourceIngestionMode),
		"title_hint":             strings.TrimSpace(metadata.TitleHint),
		"external_file_id":       strings.TrimSpace(metadata.ExternalFileID),
		"account_id":             strings.TrimSpace(metadata.AccountID),
		"drive_id":               strings.TrimSpace(metadata.DriveID),
		"owner_email":            strings.TrimSpace(strings.ToLower(metadata.OwnerEmail)),
		"parent_id":              strings.TrimSpace(metadata.ParentID),
		"provider_revision_hint": firstNonEmpty(strings.TrimSpace(metadata.SourceVersionHint), strings.TrimSpace(sourceRevision.ProviderRevisionHint)),
	}
	if metadata.ModifiedTime != nil && !metadata.ModifiedTime.IsZero() {
		out["modified_time"] = metadata.ModifiedTime.UTC().Format(time.RFC3339Nano)
	}
	if sourceRevision.ExportedAt != nil && !sourceRevision.ExportedAt.IsZero() {
		out["exported_at"] = sourceRevision.ExportedAt.UTC().Format(time.RFC3339Nano)
	}
	return out
}

func fingerprintStatusSummaryFromRecord(record stores.SourceFingerprintRecord) FingerprintStatusSummary {
	status := strings.TrimSpace(record.Status)
	if status == "" {
		status = LineageFingerprintStatusUnknown
	}
	summary := FingerprintStatusSummary{
		Status:         status,
		ExtractVersion: strings.TrimSpace(record.ExtractVersion),
		ErrorCode:      strings.TrimSpace(record.ErrorCode),
		ErrorMessage:   strings.TrimSpace(record.ErrorMessage),
	}
	if status == stores.SourceFingerprintStatusReady {
		summary.EvidenceAvailable = strings.TrimSpace(record.NormalizedTextSHA256) != "" || strings.TrimSpace(record.RawSHA256) != ""
	}
	return summary
}

func (s DefaultSourceFingerprintService) persistFingerprintFailure(
	ctx context.Context,
	scope stores.Scope,
	record stores.SourceFingerprintRecord,
	metadata SourceMetadataBaseline,
	sourceRevision stores.SourceRevisionRecord,
	artifact stores.SourceArtifactRecord,
	cause error,
) (stores.SourceFingerprintRecord, error) {
	record.Status = stores.SourceFingerprintStatusFailed
	record.TokenCount = 0
	record.MinHashJSON = "[]"
	record.ChunkHashesJSON = "[]"
	record.ExtractionMetadataJSON = "{}"

	var extractionErr *lineageExtractionError
	if errors.As(cause, &extractionErr) && extractionErr != nil {
		record.ErrorCode = strings.TrimSpace(extractionErr.Code)
		record.ErrorMessage = strings.TrimSpace(extractionErr.Message)
	}
	if record.ErrorCode == "" {
		record.ErrorCode = lineageFingerprintErrorUnreadablePDF
	}
	if record.ErrorMessage == "" && cause != nil {
		record.ErrorMessage = strings.TrimSpace(cause.Error())
	}

	metadataJSON, err := json.Marshal(map[string]any{
		"extractor":             "ledongthuc/pdf",
		"extract_version":       stores.SourceExtractVersionPDFTextV1,
		"artifact_kind":         strings.TrimSpace(artifact.ArtifactKind),
		"artifact_page_count":   artifact.PageCount,
		"artifact_size_bytes":   artifact.SizeBytes,
		"source_mime_type":      firstNonEmpty(strings.TrimSpace(metadata.SourceMimeType), strings.TrimSpace(sourceRevision.SourceMimeType)),
		"source_ingestion_mode": strings.TrimSpace(metadata.SourceIngestionMode),
		"title_hint":            strings.TrimSpace(metadata.TitleHint),
		"external_file_id":      strings.TrimSpace(metadata.ExternalFileID),
	})
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	record.ExtractionMetadataJSON = string(metadataJSON)
	return s.saveFingerprintRecord(ctx, scope, record)
}

func (s DefaultSourceFingerprintService) saveFingerprintRecord(ctx context.Context, scope stores.Scope, record stores.SourceFingerprintRecord) (stores.SourceFingerprintRecord, error) {
	existing, err := s.lineage.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: record.SourceRevisionID,
		ArtifactID:       record.ArtifactID,
		ExtractVersion:   record.ExtractVersion,
	})
	if err != nil {
		return stores.SourceFingerprintRecord{}, err
	}
	if len(existing) == 0 {
		return s.lineage.CreateSourceFingerprint(ctx, scope, record)
	}
	sort.SliceStable(existing, func(i, j int) bool {
		if existing[i].CreatedAt.Equal(existing[j].CreatedAt) {
			return existing[i].ID < existing[j].ID
		}
		return existing[i].CreatedAt.After(existing[j].CreatedAt)
	})
	record.ID = existing[0].ID
	record.CreatedAt = existing[0].CreatedAt
	return s.lineage.SaveSourceFingerprint(ctx, scope, record)
}

func validateSourceArtifactRevisionLink(sourceRevision stores.SourceRevisionRecord, artifact stores.SourceArtifactRecord) error {
	if strings.TrimSpace(sourceRevision.ID) == "" || strings.TrimSpace(artifact.ID) == "" {
		return domainValidationError("lineage_fingerprints", "source_revision_id|artifact_id", "required")
	}
	if strings.TrimSpace(artifact.SourceRevisionID) != strings.TrimSpace(sourceRevision.ID) {
		return domainValidationError("lineage_fingerprints", "artifact_id", "artifact does not belong to source revision")
	}
	return nil
}

func sourceFingerprintRecordID(sourceRevisionID, artifactID, extractVersion string) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{
		strings.TrimSpace(sourceRevisionID),
		strings.TrimSpace(artifactID),
		strings.TrimSpace(extractVersion),
	}, "|")))
	return "sfp_" + hex.EncodeToString(sum[:8])
}

func hashFingerprintBytes(value []byte) string {
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:])
}

func hashFingerprintValue(value string) string {
	return hashFingerprintBytes([]byte(value))
}

func hashFingerprintUint64(value string) uint64 {
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(value))
	return hasher.Sum64()
}

func decodeFingerprintHashes(raw string) []string {
	out := make([]string, 0)
	_ = json.Unmarshal([]byte(strings.TrimSpace(raw)), &out)
	return out
}

func decodeFingerprintMetadata(raw string) map[string]any {
	decoded := map[string]any{}
	_ = json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded)
	return decoded
}

func parseSimHash64(raw string) uint64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	parsed, err := hex.DecodeString(raw)
	if err != nil || len(parsed) != 8 {
		return 0
	}
	return binary.BigEndian.Uint64(parsed)
}
