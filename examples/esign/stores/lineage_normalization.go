package stores

import (
	"strings"
	"time"
)

var validSourceProviderKinds = map[string]struct{}{
	SourceProviderKindGoogleDrive: {},
	SourceProviderKindOneDrive:    {},
	SourceProviderKindDropbox:     {},
	SourceProviderKindBox:         {},
	SourceProviderKindLocal:       {},
}

var validSourceDocumentStatuses = map[string]struct{}{
	SourceDocumentStatusActive:   {},
	SourceDocumentStatusArchived: {},
	SourceDocumentStatusMerged:   {},
}

var validSourceHandleStatuses = map[string]struct{}{
	SourceHandleStatusActive:             {},
	SourceHandleStatusSuperseded:         {},
	SourceHandleStatusSuspectedDuplicate: {},
}

var validSourceArtifactKinds = map[string]struct{}{
	SourceArtifactKindSignablePDF:  {},
	SourceArtifactKindPreviewPDF:   {},
	SourceArtifactKindHTMLSnapshot: {},
	SourceArtifactKindTextExtract:  {},
}

var validSourceRelationshipTypes = map[string]struct{}{
	SourceRelationshipTypeSameLogicalDoc:  {},
	SourceRelationshipTypeCopiedFrom:      {},
	SourceRelationshipTypeTransferredFrom: {},
	SourceRelationshipTypeForkedFrom:      {},
	SourceRelationshipTypePartialOverlap:  {},
}

var validSourceRelationshipStatuses = map[string]struct{}{
	SourceRelationshipStatusPendingReview: {},
	SourceRelationshipStatusConfirmed:     {},
	SourceRelationshipStatusRejected:      {},
	SourceRelationshipStatusSuperseded:    {},
}

var validLineageConfidenceBands = map[string]struct{}{
	LineageConfidenceBandExact:  {},
	LineageConfidenceBandHigh:   {},
	LineageConfidenceBandMedium: {},
	LineageConfidenceBandLow:    {},
	LineageConfidenceBandNone:   {},
}

var validSourceExtractVersions = map[string]struct{}{
	SourceExtractVersionPDFTextV1: {},
}

var validSourceFingerprintStatuses = map[string]struct{}{
	SourceFingerprintStatusReady:  {},
	SourceFingerprintStatusFailed: {},
}

func normalizeLineageTime(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func cloneLineageRecordTime(value *time.Time) *time.Time {
	if value == nil || value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func normalizeLineageEnum(value string, allowed map[string]struct{}) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if _, ok := allowed[value]; !ok {
		return ""
	}
	return value
}

func PrepareSourceDocumentRecord(record SourceDocumentRecord, current *SourceDocumentRecord) (SourceDocumentRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.ProviderKind = normalizeLineageEnum(coalesceLineageString(record.ProviderKind, currentString(current, func(v SourceDocumentRecord) string { return v.ProviderKind })), validSourceProviderKinds)
	if record.ProviderKind == "" {
		return SourceDocumentRecord{}, invalidRecordError("source_documents", "provider_kind", "unsupported provider kind")
	}
	record.CanonicalTitle = strings.TrimSpace(record.CanonicalTitle)
	record.Status = normalizeLineageEnum(coalesceLineageString(record.Status, currentString(current, func(v SourceDocumentRecord) string { return v.Status })), validSourceDocumentStatuses)
	if record.Status == "" {
		record.Status = SourceDocumentStatusActive
	}
	record.LineageConfidence = normalizeLineageEnum(coalesceLineageString(record.LineageConfidence, currentString(current, func(v SourceDocumentRecord) string { return v.LineageConfidence })), validLineageConfidenceBands)
	if record.LineageConfidence == "" {
		record.LineageConfidence = LineageConfidenceBandExact
	}
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceDocumentRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceHandleRecord(record SourceHandleRecord, current *SourceHandleRecord) (SourceHandleRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceDocumentID = strings.TrimSpace(coalesceLineageString(record.SourceDocumentID, currentString(current, func(v SourceHandleRecord) string { return v.SourceDocumentID })))
	if record.SourceDocumentID == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "source_document_id", "required")
	}
	record.ProviderKind = normalizeLineageEnum(coalesceLineageString(record.ProviderKind, currentString(current, func(v SourceHandleRecord) string { return v.ProviderKind })), validSourceProviderKinds)
	if record.ProviderKind == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "provider_kind", "unsupported provider kind")
	}
	record.ExternalFileID = strings.TrimSpace(coalesceLineageString(record.ExternalFileID, currentString(current, func(v SourceHandleRecord) string { return v.ExternalFileID })))
	if record.ExternalFileID == "" {
		return SourceHandleRecord{}, invalidRecordError("source_handles", "external_file_id", "required")
	}
	record.AccountID = strings.TrimSpace(coalesceLineageString(record.AccountID, currentString(current, func(v SourceHandleRecord) string { return v.AccountID })))
	record.DriveID = strings.TrimSpace(record.DriveID)
	record.WebURL = strings.TrimSpace(record.WebURL)
	record.HandleStatus = normalizeLineageEnum(coalesceLineageString(record.HandleStatus, currentString(current, func(v SourceHandleRecord) string { return v.HandleStatus })), validSourceHandleStatuses)
	if record.HandleStatus == "" {
		record.HandleStatus = SourceHandleStatusActive
	}
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceHandleRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	record.ValidFrom = cloneLineageRecordTime(record.ValidFrom)
	if record.ValidFrom == nil {
		if current != nil && current.ValidFrom != nil && !current.ValidFrom.IsZero() {
			record.ValidFrom = cloneLineageRecordTime(current.ValidFrom)
		} else {
			validFrom := record.CreatedAt
			record.ValidFrom = &validFrom
		}
	}
	record.ValidTo = cloneLineageRecordTime(record.ValidTo)
	return record, nil
}

func PrepareSourceRevisionRecord(record SourceRevisionRecord, current *SourceRevisionRecord) (SourceRevisionRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceDocumentID = strings.TrimSpace(coalesceLineageString(record.SourceDocumentID, currentString(current, func(v SourceRevisionRecord) string { return v.SourceDocumentID })))
	record.SourceHandleID = strings.TrimSpace(coalesceLineageString(record.SourceHandleID, currentString(current, func(v SourceRevisionRecord) string { return v.SourceHandleID })))
	if record.SourceDocumentID == "" || record.SourceHandleID == "" {
		return SourceRevisionRecord{}, invalidRecordError("source_revisions", "source_document_id|source_handle_id", "required")
	}
	record.ProviderRevisionHint = strings.TrimSpace(record.ProviderRevisionHint)
	record.ExportedByUserID = strings.TrimSpace(record.ExportedByUserID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.MetadataJSON = strings.TrimSpace(coalesceLineageString(record.MetadataJSON, currentString(current, func(v SourceRevisionRecord) string { return v.MetadataJSON })))
	if record.MetadataJSON == "" {
		record.MetadataJSON = "{}"
	}
	record.ModifiedTime = cloneLineageRecordTime(record.ModifiedTime)
	record.ExportedAt = cloneLineageRecordTime(record.ExportedAt)
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceRevisionRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceArtifactRecord(record SourceArtifactRecord, current *SourceArtifactRecord) (SourceArtifactRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceArtifactRecord) string { return v.SourceRevisionID })))
	if record.SourceRevisionID == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "source_revision_id", "required")
	}
	record.ArtifactKind = normalizeLineageEnum(coalesceLineageString(record.ArtifactKind, currentString(current, func(v SourceArtifactRecord) string { return v.ArtifactKind })), validSourceArtifactKinds)
	if record.ArtifactKind == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "artifact_kind", "unsupported artifact kind")
	}
	record.ObjectKey = strings.TrimSpace(coalesceLineageString(record.ObjectKey, currentString(current, func(v SourceArtifactRecord) string { return v.ObjectKey })))
	if record.ObjectKey == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "object_key", "required")
	}
	record.SHA256 = strings.TrimSpace(coalesceLineageString(record.SHA256, currentString(current, func(v SourceArtifactRecord) string { return v.SHA256 })))
	if record.SHA256 == "" {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "sha256", "required")
	}
	if record.PageCount < 0 {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "page_count", "must be non-negative")
	}
	if record.SizeBytes < 0 {
		return SourceArtifactRecord{}, invalidRecordError("source_artifacts", "size_bytes", "must be non-negative")
	}
	record.CompatibilityTier = strings.TrimSpace(record.CompatibilityTier)
	record.CompatibilityReason = strings.TrimSpace(record.CompatibilityReason)
	record.NormalizationStatus = strings.TrimSpace(record.NormalizationStatus)
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceArtifactRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceFingerprintRecord(record SourceFingerprintRecord, current *SourceFingerprintRecord) (SourceFingerprintRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceFingerprintRecord) string { return v.SourceRevisionID })))
	record.ArtifactID = strings.TrimSpace(coalesceLineageString(record.ArtifactID, currentString(current, func(v SourceFingerprintRecord) string { return v.ArtifactID })))
	record.ExtractVersion = normalizeLineageEnum(coalesceLineageString(record.ExtractVersion, currentString(current, func(v SourceFingerprintRecord) string { return v.ExtractVersion })), validSourceExtractVersions)
	if record.SourceRevisionID == "" || record.ArtifactID == "" || record.ExtractVersion == "" {
		return SourceFingerprintRecord{}, invalidRecordError("source_fingerprints", "source_revision_id|artifact_id|extract_version", "required")
	}
	record.Status = normalizeLineageEnum(coalesceLineageString(record.Status, currentString(current, func(v SourceFingerprintRecord) string { return v.Status })), validSourceFingerprintStatuses)
	if record.Status == "" {
		record.Status = SourceFingerprintStatusReady
	}
	record.RawSHA256 = strings.TrimSpace(record.RawSHA256)
	record.NormalizedTextSHA256 = strings.TrimSpace(record.NormalizedTextSHA256)
	record.SimHash64 = strings.TrimSpace(record.SimHash64)
	record.MinHashJSON = strings.TrimSpace(record.MinHashJSON)
	record.ChunkHashesJSON = strings.TrimSpace(record.ChunkHashesJSON)
	record.ExtractionMetadataJSON = strings.TrimSpace(coalesceLineageString(record.ExtractionMetadataJSON, currentString(current, func(v SourceFingerprintRecord) string { return v.ExtractionMetadataJSON })))
	if record.ExtractionMetadataJSON == "" {
		record.ExtractionMetadataJSON = "{}"
	}
	record.ErrorCode = strings.TrimSpace(record.ErrorCode)
	record.ErrorMessage = strings.TrimSpace(record.ErrorMessage)
	if record.TokenCount < 0 {
		return SourceFingerprintRecord{}, invalidRecordError("source_fingerprints", "token_count", "must be non-negative")
	}
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceFingerprintRecord) time.Time { return v.CreatedAt }))
	return record, nil
}

func PrepareSourceRelationshipRecord(record SourceRelationshipRecord, current *SourceRelationshipRecord) (SourceRelationshipRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.LeftSourceDocumentID = strings.TrimSpace(coalesceLineageString(record.LeftSourceDocumentID, currentString(current, func(v SourceRelationshipRecord) string { return v.LeftSourceDocumentID })))
	record.RightSourceDocumentID = strings.TrimSpace(coalesceLineageString(record.RightSourceDocumentID, currentString(current, func(v SourceRelationshipRecord) string { return v.RightSourceDocumentID })))
	if record.LeftSourceDocumentID == "" || record.RightSourceDocumentID == "" {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "left_source_document_id|right_source_document_id", "required")
	}
	record.RelationshipType = normalizeLineageEnum(coalesceLineageString(record.RelationshipType, currentString(current, func(v SourceRelationshipRecord) string { return v.RelationshipType })), validSourceRelationshipTypes)
	if record.RelationshipType == "" {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "relationship_type", "unsupported relationship type")
	}
	record.ConfidenceBand = normalizeLineageEnum(coalesceLineageString(record.ConfidenceBand, currentString(current, func(v SourceRelationshipRecord) string { return v.ConfidenceBand })), validLineageConfidenceBands)
	if record.ConfidenceBand == "" {
		record.ConfidenceBand = LineageConfidenceBandMedium
	}
	if record.ConfidenceScore < 0 || record.ConfidenceScore > 1 {
		return SourceRelationshipRecord{}, invalidRecordError("source_relationships", "confidence_score", "must be between 0 and 1")
	}
	record.Status = normalizeLineageEnum(coalesceLineageString(record.Status, currentString(current, func(v SourceRelationshipRecord) string { return v.Status })), validSourceRelationshipStatuses)
	if record.Status == "" {
		record.Status = SourceRelationshipStatusPendingReview
	}
	record.EvidenceJSON = strings.TrimSpace(coalesceLineageString(record.EvidenceJSON, currentString(current, func(v SourceRelationshipRecord) string { return v.EvidenceJSON })))
	if record.EvidenceJSON == "" {
		record.EvidenceJSON = "{}"
	}
	record.CreatedByUserID = strings.TrimSpace(record.CreatedByUserID)
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceRelationshipRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func normalizeLineageRecordCreatedAt(createdAt, existing time.Time) time.Time {
	if !existing.IsZero() && createdAt.IsZero() {
		return existing.UTC()
	}
	return normalizeLineageTime(createdAt)
}

func normalizeLineageRecordUpdatedAt(updatedAt, createdAt time.Time) time.Time {
	updatedAt = normalizeLineageTime(updatedAt)
	if updatedAt.Before(createdAt) {
		return createdAt
	}
	return updatedAt
}

func currentString[T any](current *T, pick func(T) string) string {
	if current == nil {
		return ""
	}
	return pick(*current)
}

func currentTime[T any](current *T, pick func(T) time.Time) time.Time {
	if current == nil {
		return time.Time{}
	}
	return pick(*current)
}

func coalesceLineageString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value != "" {
		return value
	}
	return strings.TrimSpace(fallback)
}
