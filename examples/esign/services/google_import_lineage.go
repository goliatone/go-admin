package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type googleImportExecutionDeps struct {
	documents  GoogleDocumentUploader
	agreements GoogleAgreementCreator
	identity   SourceIdentityService
	now        func() time.Time
}

func executeGoogleImportWithLineage(
	ctx context.Context,
	scope stores.Scope,
	input GoogleImportInput,
	snapshot GoogleExportSnapshot,
	sourceMimeType string,
	ingestionMode string,
	resolvedUserID string,
	deps googleImportExecutionDeps,
) (GoogleImportResult, error) {
	modifiedTime := snapshot.File.ModifiedTime
	if modifiedTime.IsZero() {
		modifiedTime = deps.now().UTC()
	}
	exportedAt := deps.now().UTC()
	contentSHA256 := sha256.Sum256(snapshot.PDF)
	contentHash := hex.EncodeToString(contentSHA256[:])
	documentTitle := strings.TrimSpace(input.DocumentTitle)
	if documentTitle == "" {
		documentTitle = strings.TrimSpace(snapshot.File.Name)
	}
	if documentTitle == "" {
		documentTitle = "Imported Google Document"
	}
	agreementTitle := strings.TrimSpace(input.AgreementTitle)
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		createdByUserID = strings.TrimSpace(resolvedUserID)
	}

	resolution := SourceIdentityResolution{}
	if deps.identity != nil {
		resolved, err := deps.identity.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
			ProviderKind:          stores.SourceProviderKindGoogleDrive,
			ActorID:               createdByUserID,
			CorrelationID:         strings.TrimSpace(input.CorrelationID),
			IdempotencyKey:        strings.TrimSpace(input.IdempotencyKey),
			RevisionContentSHA256: contentHash,
			Metadata: SourceMetadataBaseline{
				AccountID:           strings.TrimSpace(input.AccountID),
				ExternalFileID:      strings.TrimSpace(input.GoogleFileID),
				WebURL:              strings.TrimSpace(snapshot.File.WebViewURL),
				ModifiedTime:        &modifiedTime,
				SourceVersionHint:   strings.TrimSpace(input.SourceVersionHint),
				SourceMimeType:      strings.TrimSpace(sourceMimeType),
				SourceIngestionMode: strings.TrimSpace(ingestionMode),
				TitleHint:           documentTitle,
				PageCountHint:       0,
				OwnerEmail:          strings.TrimSpace(snapshot.File.OwnerEmail),
				ParentID:            strings.TrimSpace(snapshot.File.ParentID),
			},
		})
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "lineage", "google_import_resolution", "error", strings.TrimSpace(input.CorrelationID), 0, err, map[string]any{
				"google_file_id":  strings.TrimSpace(input.GoogleFileID),
				"account_id":      strings.TrimSpace(input.AccountID),
				"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
			})
			return GoogleImportResult{}, err
		}
		resolution = resolved
		observability.LogOperation(ctx, slog.LevelInfo, "lineage", "google_import_resolution", "success", strings.TrimSpace(input.CorrelationID), 0, nil, map[string]any{
			"google_file_id":  strings.TrimSpace(input.GoogleFileID),
			"resolution_kind": strings.TrimSpace(resolution.ResolutionKind),
			"confidence_band": strings.TrimSpace(resolution.ConfidenceBand),
			"source_document": strings.TrimSpace(resolution.SourceDocument.ID),
			"source_revision": strings.TrimSpace(resolution.SourceRevision.ID),
			"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
			"content_sha256":  contentHash,
		})
	}

	document, err := deps.documents.Upload(ctx, scope, DocumentUploadInput{
		Title:                  documentTitle,
		SourceOriginalName:     strings.TrimSpace(snapshot.File.Name),
		ObjectKey:              googleImportObjectKey(scope, input.GoogleFileID, exportedAt),
		PDF:                    append([]byte{}, snapshot.PDF...),
		CreatedBy:              createdByUserID,
		UploadedAt:             exportedAt,
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     strings.TrimSpace(input.GoogleFileID),
		SourceGoogleDocURL:     strings.TrimSpace(snapshot.File.WebViewURL),
		SourceModifiedTime:     &modifiedTime,
		SourceExportedAt:       &exportedAt,
		SourceExportedByUserID: strings.TrimSpace(resolvedUserID),
		SourceMimeType:         sourceMimeType,
		SourceIngestionMode:    ingestionMode,
		SourceDocumentID:       strings.TrimSpace(resolution.SourceDocument.ID),
		SourceRevisionID:       strings.TrimSpace(resolution.SourceRevision.ID),
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "lineage", "google_import_document_persist", "error", strings.TrimSpace(input.CorrelationID), 0, err, map[string]any{
			"google_file_id":  strings.TrimSpace(input.GoogleFileID),
			"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
		})
		return GoogleImportResult{}, err
	}

	var agreement stores.AgreementRecord
	if agreementTitle != "" {
		agreement, err = deps.agreements.CreateDraft(ctx, scope, CreateDraftInput{
			DocumentID:             document.ID,
			Title:                  agreementTitle,
			CreatedByUserID:        createdByUserID,
			SourceType:             stores.SourceTypeGoogleDrive,
			SourceGoogleFileID:     strings.TrimSpace(input.GoogleFileID),
			SourceGoogleDocURL:     strings.TrimSpace(snapshot.File.WebViewURL),
			SourceModifiedTime:     &modifiedTime,
			SourceExportedAt:       &exportedAt,
			SourceExportedByUserID: strings.TrimSpace(resolvedUserID),
			SourceMimeType:         sourceMimeType,
			SourceIngestionMode:    ingestionMode,
			SourceRevisionID:       strings.TrimSpace(resolution.SourceRevision.ID),
		})
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "lineage", "google_import_agreement_persist", "error", strings.TrimSpace(input.CorrelationID), 0, err, map[string]any{
				"google_file_id":  strings.TrimSpace(input.GoogleFileID),
				"document_id":     strings.TrimSpace(document.ID),
				"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
			})
			return GoogleImportResult{}, err
		}
	}

	candidates := candidateWarningsFromRelationship(resolution.CandidateRelationship)
	lineageStatus := LineageImportStatusLinked
	if len(candidates) > 0 {
		lineageStatus = LineageImportStatusNeedsReview
	}

	result := GoogleImportResult{
		Document:           document,
		Agreement:          agreement,
		SourceDocumentID:   firstNonEmpty(strings.TrimSpace(document.SourceDocumentID), strings.TrimSpace(resolution.SourceDocument.ID)),
		SourceRevisionID:   firstNonEmpty(strings.TrimSpace(document.SourceRevisionID), strings.TrimSpace(resolution.SourceRevision.ID)),
		SourceArtifactID:   strings.TrimSpace(document.SourceArtifactID),
		LineageStatus:      lineageStatus,
		FingerprintStatus:  FingerprintStatusSummary{Status: LineageFingerprintStatusPending, EvidenceAvailable: false},
		CandidateStatus:    candidates,
		DocumentDetailURL:  detailURL("esign_documents", document.ID),
		AgreementDetailURL: detailURL("esign_agreements", agreement.ID),
		SourceMimeType:     sourceMimeType,
		IngestionMode:      ingestionMode,
	}
	observability.LogOperation(ctx, slog.LevelInfo, "lineage", "google_import_complete", "success", strings.TrimSpace(input.CorrelationID), 0, nil, map[string]any{
		"google_file_id":     strings.TrimSpace(input.GoogleFileID),
		"document_id":        strings.TrimSpace(result.Document.ID),
		"agreement_id":       strings.TrimSpace(result.Agreement.ID),
		"source_document_id": strings.TrimSpace(result.SourceDocumentID),
		"source_revision_id": strings.TrimSpace(result.SourceRevisionID),
		"source_artifact_id": strings.TrimSpace(result.SourceArtifactID),
		"lineage_status":     strings.TrimSpace(result.LineageStatus),
		"idempotency_key":    strings.TrimSpace(input.IdempotencyKey),
		"content_sha256":     contentHash,
	})
	return result, nil
}

func candidateWarningsFromRelationship(relationship *stores.SourceRelationshipRecord) []CandidateWarningSummary {
	if relationship == nil || strings.TrimSpace(relationship.ID) == "" {
		return nil
	}
	summary := CandidateWarningSummary{
		ID:                  strings.TrimSpace(relationship.ID),
		RelationshipType:    strings.TrimSpace(relationship.RelationshipType),
		Status:              strings.TrimSpace(relationship.Status),
		ConfidenceBand:      strings.TrimSpace(relationship.ConfidenceBand),
		ConfidenceScore:     relationship.ConfidenceScore,
		Summary:             "Potential continuity candidate requires operator review",
		ReviewActionVisible: LineageReviewVisibilityAdminOnly,
	}
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(relationship.EvidenceJSON)), &decoded); err == nil {
		if reason, ok := decoded["candidate_reason"].(string); ok && strings.TrimSpace(reason) != "" {
			summary.Evidence = append(summary.Evidence, CandidateEvidenceSummary{
				Code:  strings.TrimSpace(reason),
				Label: "Candidate match evidence",
			})
		}
	}
	return []CandidateWarningSummary{summary}
}

func candidateWarningsJSON(warnings []CandidateWarningSummary) string {
	if len(warnings) == 0 {
		return "[]"
	}
	encoded, err := json.Marshal(warnings)
	if err != nil {
		return "[]"
	}
	return string(encoded)
}

func detailURL(resource, id string) string {
	resource = strings.TrimSpace(resource)
	id = strings.TrimSpace(id)
	if resource == "" || id == "" {
		return ""
	}
	return "/admin/content/" + resource + "/" + id
}
