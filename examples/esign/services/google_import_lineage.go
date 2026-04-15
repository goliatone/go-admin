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
	goerrors "github.com/goliatone/go-errors"
)

const googleImportRunFailureCode = "GOOGLE_IMPORT_FAILED"

type GoogleImportInProgressError struct {
	RunID  string
	Status string
}

func (e *GoogleImportInProgressError) Error() string {
	if e == nil {
		return "google import already in progress"
	}
	status := strings.TrimSpace(e.Status)
	if status == "" {
		return "google import already in progress"
	}
	return "google import already in progress: " + status
}

type googleImportExecutionDeps struct {
	documents  GoogleDocumentUploader
	agreements GoogleAgreementCreator
	identity   SourceIdentityService
	now        func() time.Time
}

type googleImportPersistenceDeps struct {
	tx             stores.TransactionManager
	importRuns     stores.GoogleImportRunStore
	documentStore  stores.DocumentStore
	agreementStore stores.AgreementStore
}

func (d googleImportExecutionDeps) forTx(tx stores.TxStore) googleImportExecutionDeps {
	txDeps := d
	txDeps.documents = bindGoogleDocumentUploaderForTx(d.documents, tx)
	txDeps.agreements = bindGoogleAgreementCreatorForTx(d.agreements, tx)
	txDeps.identity = bindSourceIdentityServiceForTx(d.identity, tx)
	return txDeps
}

func (d googleImportPersistenceDeps) forTx(tx stores.TxStore) googleImportPersistenceDeps {
	txDeps := d
	if tx == nil {
		return txDeps
	}
	txDeps.tx = nil
	txDeps.importRuns = tx
	txDeps.documentStore = tx
	txDeps.agreementStore = tx
	return txDeps
}

func executeGoogleImportWithPersistence(
	ctx context.Context,
	scope stores.Scope,
	input GoogleImportInput,
	snapshot GoogleExportSnapshot,
	sourceMimeType string,
	ingestionMode string,
	resolvedUserID string,
	execution googleImportExecutionDeps,
	persistence googleImportPersistenceDeps,
) (GoogleImportResult, error) {
	var run stores.GoogleImportRunRecord
	var err error
	if persistence.importRuns != nil && strings.TrimSpace(input.IdempotencyKey) != "" {
		var created bool
		run, created, err = persistence.importRuns.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
			UserID:            strings.TrimSpace(input.UserID),
			GoogleFileID:      strings.TrimSpace(input.GoogleFileID),
			SourceVersionHint: strings.TrimSpace(input.SourceVersionHint),
			DedupeKey:         strings.TrimSpace(input.IdempotencyKey),
			DocumentTitle:     strings.TrimSpace(input.DocumentTitle),
			AgreementTitle:    strings.TrimSpace(input.AgreementTitle),
			CreatedByUserID:   strings.TrimSpace(input.CreatedByUserID),
			CorrelationID:     strings.TrimSpace(input.CorrelationID),
			RequestedAt:       execution.now().UTC(),
		})
		if err != nil {
			return GoogleImportResult{}, err
		}
		if replay, replayed, replayErr := loadCompletedGoogleImportResult(ctx, scope, run, persistence.documentStore, persistence.agreementStore); replayErr != nil {
			return GoogleImportResult{}, replayErr
		} else if replayed {
			return replay, nil
		}
		if !created {
			status := strings.TrimSpace(run.Status)
			if (status == stores.GoogleImportRunStatusQueued || status == stores.GoogleImportRunStatusRunning) &&
				strings.TrimSpace(input.ImportRunID) != strings.TrimSpace(run.ID) {
				return GoogleImportResult{}, &GoogleImportInProgressError{
					RunID:  strings.TrimSpace(run.ID),
					Status: status,
				}
			}
		}
	}

	if execution.identity != nil && persistence.tx == nil {
		if persistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
			_, _ = persistence.importRuns.MarkGoogleImportRunFailed(ctx, scope, run.ID, googleImportRunFailureInput(
				domainValidationError("google", "transaction_manager", "required for lineage imports"),
				execution.now().UTC(),
			))
		}
		return GoogleImportResult{}, domainValidationError("google", "transaction_manager", "required for lineage imports")
	}

	if persistence.tx == nil {
		result, importErr := executeGoogleImportWithLineage(ctx, scope, input, snapshot, sourceMimeType, ingestionMode, resolvedUserID, execution)
		if importErr != nil {
			if persistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
				_, _ = persistence.importRuns.MarkGoogleImportRunFailed(ctx, scope, run.ID, googleImportRunFailureInput(importErr, execution.now().UTC()))
			}
			return GoogleImportResult{}, importErr
		}
		if persistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
			if markErr := markGoogleImportRunSucceeded(ctx, scope, persistence.importRuns, run.ID, result, execution.now().UTC()); markErr != nil {
				return GoogleImportResult{}, markErr
			}
		}
		return result, nil
	}

	result := GoogleImportResult{}
	err = persistence.tx.WithTx(ctx, func(tx stores.TxStore) error {
		txExecution := execution.forTx(tx)
		txPersistence := persistence.forTx(tx)
		if txPersistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
			_, markRunningErr := txPersistence.importRuns.MarkGoogleImportRunRunning(ctx, scope, run.ID, txExecution.now().UTC())
			if markRunningErr != nil {
				return markRunningErr
			}
		}
		imported, importErr := executeGoogleImportWithLineage(ctx, scope, input, snapshot, sourceMimeType, ingestionMode, resolvedUserID, txExecution)
		if importErr != nil {
			return importErr
		}
		if txPersistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
			markSucceededErr := markGoogleImportRunSucceeded(ctx, scope, txPersistence.importRuns, run.ID, imported, txExecution.now().UTC())
			if markSucceededErr != nil {
				return markSucceededErr
			}
		}
		result = imported
		return nil
	})
	if err != nil {
		if persistence.importRuns != nil && strings.TrimSpace(run.ID) != "" {
			_, _ = persistence.importRuns.MarkGoogleImportRunFailed(ctx, scope, run.ID, googleImportRunFailureInput(err, execution.now().UTC()))
		}
		return GoogleImportResult{}, err
	}
	return result, nil
}

func googleImportRunFailureInput(err error, completedAt time.Time) stores.GoogleImportRunFailureInput {
	failure := stores.GoogleImportRunFailureInput{
		ErrorCode:    googleImportRunFailureCode,
		ErrorMessage: strings.TrimSpace(err.Error()),
		CompletedAt:  completedAt.UTC(),
	}

	mapped := MapGoogleProviderError(err)
	var coded *goerrors.Error
	if goerrors.As(mapped, &coded) && coded != nil {
		if textCode := strings.TrimSpace(coded.TextCode); textCode != "" {
			failure.ErrorCode = textCode
		}
		if message := strings.TrimSpace(coded.Message); message != "" {
			failure.ErrorMessage = message
		}
		details := map[string]any{}
		if category := strings.TrimSpace(string(coded.Category)); category != "" {
			details["category"] = category
		}
		if coded.Code != 0 {
			details["http_status"] = coded.Code
		}
		if textCode := strings.TrimSpace(coded.TextCode); textCode != "" {
			details["text_code"] = textCode
		}
		if len(coded.Metadata) > 0 {
			details["metadata"] = coded.Metadata
		}
		if len(details) > 0 {
			if encoded, marshalErr := json.Marshal(details); marshalErr == nil {
				failure.ErrorDetailsJSON = string(encoded)
			}
		}
	}

	return failure
}

func markGoogleImportRunSucceeded(ctx context.Context, scope stores.Scope, store stores.GoogleImportRunStore, runID string, result GoogleImportResult, completedAt time.Time) error {
	if store == nil || strings.TrimSpace(runID) == "" {
		return nil
	}
	candidateStatusJSON := "[]"
	if encoded, err := json.Marshal(result.CandidateStatus); err == nil {
		candidateStatusJSON = string(encoded)
	}
	_, err := store.MarkGoogleImportRunSucceeded(ctx, scope, runID, stores.GoogleImportRunSuccessInput{
		DocumentID:          strings.TrimSpace(result.Document.ID),
		AgreementID:         strings.TrimSpace(result.Agreement.ID),
		SourceDocumentID:    strings.TrimSpace(result.SourceDocumentID),
		SourceRevisionID:    strings.TrimSpace(result.SourceRevisionID),
		SourceArtifactID:    strings.TrimSpace(result.SourceArtifactID),
		LineageStatus:       strings.TrimSpace(result.LineageStatus),
		FingerprintStatus:   strings.TrimSpace(result.FingerprintStatus.Status),
		CandidateStatusJSON: candidateStatusJSON,
		DocumentDetailURL:   strings.TrimSpace(result.DocumentDetailURL),
		AgreementDetailURL:  strings.TrimSpace(result.AgreementDetailURL),
		SourceMimeType:      strings.TrimSpace(result.SourceMimeType),
		IngestionMode:       strings.TrimSpace(result.IngestionMode),
		CompletedAt:         completedAt.UTC(),
	})
	return err
}

func loadCompletedGoogleImportResult(ctx context.Context, scope stores.Scope, run stores.GoogleImportRunRecord, documents stores.DocumentStore, agreements stores.AgreementStore) (GoogleImportResult, bool, error) {
	if strings.TrimSpace(run.ID) == "" || strings.TrimSpace(run.Status) != stores.GoogleImportRunStatusSucceeded {
		return GoogleImportResult{}, false, nil
	}

	result := GoogleImportResult{
		SourceDocumentID:   strings.TrimSpace(run.SourceDocumentID),
		SourceRevisionID:   strings.TrimSpace(run.SourceRevisionID),
		SourceArtifactID:   strings.TrimSpace(run.SourceArtifactID),
		LineageStatus:      strings.TrimSpace(run.LineageStatus),
		FingerprintStatus:  FingerprintStatusSummary{Status: firstNonEmpty(strings.TrimSpace(run.FingerprintStatus), LineageFingerprintStatusUnknown), EvidenceAvailable: false},
		DocumentDetailURL:  strings.TrimSpace(run.DocumentDetailURL),
		AgreementDetailURL: strings.TrimSpace(run.AgreementDetailURL),
		SourceMimeType:     strings.TrimSpace(run.SourceMimeType),
		IngestionMode:      strings.TrimSpace(run.IngestionMode),
	}
	if strings.TrimSpace(run.CandidateStatusJSON) != "" {
		_ = json.Unmarshal([]byte(run.CandidateStatusJSON), &result.CandidateStatus)
	}
	if documents != nil && strings.TrimSpace(run.DocumentID) != "" {
		document, err := documents.Get(ctx, scope, run.DocumentID)
		if err != nil {
			return GoogleImportResult{}, false, err
		}
		result.Document = document
		if result.SourceDocumentID == "" {
			result.SourceDocumentID = strings.TrimSpace(document.SourceDocumentID)
		}
		if result.SourceRevisionID == "" {
			result.SourceRevisionID = strings.TrimSpace(document.SourceRevisionID)
		}
		if result.SourceArtifactID == "" {
			result.SourceArtifactID = strings.TrimSpace(document.SourceArtifactID)
		}
	}
	if agreements != nil && strings.TrimSpace(run.AgreementID) != "" {
		agreement, err := agreements.GetAgreement(ctx, scope, run.AgreementID)
		if err != nil {
			return GoogleImportResult{}, false, err
		}
		result.Agreement = agreement
		if result.SourceRevisionID == "" {
			result.SourceRevisionID = strings.TrimSpace(agreement.SourceRevisionID)
		}
	}
	return result, true, nil
}

func bindGoogleDocumentUploaderForTx(uploader GoogleDocumentUploader, tx stores.TxStore) GoogleDocumentUploader {
	switch typed := uploader.(type) {
	case DocumentService:
		return typed.forTx(tx)
	default:
		return uploader
	}
}

func bindGoogleAgreementCreatorForTx(creator GoogleAgreementCreator, tx stores.TxStore) GoogleAgreementCreator {
	switch typed := creator.(type) {
	case AgreementService:
		return typed.forTx(tx)
	default:
		return creator
	}
}

func bindSourceIdentityServiceForTx(identity SourceIdentityService, tx stores.TxStore) SourceIdentityService {
	switch typed := identity.(type) {
	case DefaultSourceIdentityService:
		return typed.forTx(tx)
	default:
		return identity
	}
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
				DriveID:             strings.TrimSpace(snapshot.File.DriveID),
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

func detailURL(resource, id string) string {
	resource = strings.TrimSpace(resource)
	id = strings.TrimSpace(id)
	if resource == "" || id == "" {
		return ""
	}
	return "/admin/content/" + resource + "/" + id
}
