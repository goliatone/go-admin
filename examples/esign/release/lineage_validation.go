package release

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/phpdave11/gofpdf"
)

type LineageValidationConfig struct{}

type LineageValidationResult struct {
	BootstrapValidated               bool   `json:"bootstrap_validated"`
	ImportLineageLinked              bool   `json:"import_lineage_linked"`
	ReimportReusedRevision           bool   `json:"reimport_reused_revision"`
	ChangedSourceCreatedNewRevision  bool   `json:"changed_source_created_new_revision"`
	LaterAgreementPinnedLatest       bool   `json:"later_agreement_pinned_latest"`
	FingerprintStatus                string `json:"fingerprint_status"`
	CandidateCreated                 bool   `json:"candidate_created"`
	CandidateReviewActionApplied     bool   `json:"candidate_review_action_applied"`
	CandidateWarningsVisibleBefore   bool   `json:"candidate_warnings_visible_before"`
	CandidateWarningsSuppressedAfter bool   `json:"candidate_warnings_suppressed_after"`
	DocumentDetailContractStable     bool   `json:"document_detail_contract_stable"`
	AgreementDetailContractStable    bool   `json:"agreement_detail_contract_stable"`
	SourceDocumentID                 string `json:"source_document_id"`
	PinnedAgreementSourceRevisionID  string `json:"pinned_agreement_source_revision_id"`
	LatestSourceRevisionID           string `json:"latest_source_revision_id"`
	CandidateRelationshipID          string `json:"candidate_relationship_id"`
	CandidateRelationshipFinalStatus string `json:"candidate_relationship_final_status"`
	CandidateDocumentID              string `json:"candidate_document_id"`
	ChangedImportDocumentID          string `json:"changed_import_document_id"`
	ImportedAgreementID              string `json:"imported_agreement_id"`
}

type lineageValidationRuntime struct {
	scope          stores.Scope
	agreements     services.AgreementService
	readModels     services.DefaultSourceReadModelService
	fingerprints   services.DefaultSourceFingerprintService
	reconciliation services.DefaultSourceReconciliationService
	google         services.GoogleIntegrationService
	provider       *lineageValidationGoogleProvider
}

type lineageValidationExecution struct {
	first                 services.GoogleImportResult
	reimported            services.GoogleImportResult
	changed               services.GoogleImportResult
	laterAgreement        stores.AgreementRecord
	fingerprint           services.SourceFingerprintBuildResult
	candidate             services.GoogleImportResult
	candidateDetailBefore services.DocumentLineageDetail
	reviewed              services.CandidateWarningSummary
	candidateDetailAfter  services.DocumentLineageDetail
	importedAgreement     services.AgreementLineageDetail
	laterAgreementDetail  services.AgreementLineageDetail
}

func RunLineageValidationProfile(ctx context.Context, _ LineageValidationConfig) (LineageValidationResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	runtime, cleanup, err := newLineageValidationRuntime(ctx)
	if err != nil {
		return LineageValidationResult{}, err
	}
	defer cleanup()

	execution, err := runLineageValidationExecution(ctx, runtime)
	if err != nil {
		return LineageValidationResult{}, err
	}
	result := buildLineageValidationResult(execution)
	if err := validateLineageValidationResult(result); err != nil {
		return result, err
	}
	return result, nil
}

func newLineageValidationRuntime(ctx context.Context) (lineageValidationRuntime, func(), error) {
	storeDSN, dsnCleanup := resolveValidationSQLiteDSN("lineage-validation")
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = strings.TrimSpace(storeDSN)
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := esignpersistence.Bootstrap(ctx, cfg)
	if err != nil {
		runLineageValidationCleanup(dsnCleanup)
		return lineageValidationRuntime{}, func() {}, fmt.Errorf("bootstrap lineage validation store: %w", err)
	}
	store, storeCleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		_ = bootstrap.Close()
		runLineageValidationCleanup(dsnCleanup)
		return lineageValidationRuntime{}, func() {}, fmt.Errorf("create lineage validation store adapter: %w", err)
	}
	uploadDir, err := os.MkdirTemp("", "go-admin-lineage-validation-upload-*")
	if err != nil {
		runLineageValidationStoreCleanup(bootstrap, storeCleanup, dsnCleanup)
		return lineageValidationRuntime{}, func() {}, fmt.Errorf("create lineage validation upload dir: %w", err)
	}
	uploads := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(uploadDir)))
	provider, err := newLineageValidationGoogleProvider()
	if err != nil {
		_ = os.RemoveAll(uploadDir)
		runLineageValidationStoreCleanup(bootstrap, storeCleanup, dsnCleanup)
		return lineageValidationRuntime{}, func() {}, fmt.Errorf("build lineage validation google provider: %w", err)
	}

	scope := stores.Scope{TenantID: "tenant-lineage-validation", OrgID: "org-lineage-validation"}
	documents := services.NewDocumentService(store,
		services.WithDocumentObjectStore(uploads),
		services.WithDocumentPDFService(services.NewPDFService()),
	)
	agreements := services.NewAgreementService(store)
	runtime := lineageValidationRuntime{
		scope:          scope,
		agreements:     agreements,
		readModels:     services.NewDefaultSourceReadModelService(store, store, store),
		fingerprints:   services.NewDefaultSourceFingerprintService(store, uploads),
		reconciliation: services.NewDefaultSourceReconciliationService(store),
		google: services.NewGoogleIntegrationService(
			store,
			provider,
			documents,
			agreements,
			services.WithGoogleLineageStore(store),
		),
		provider: provider,
	}
	cleanup := func() {
		_ = os.RemoveAll(uploadDir)
		runLineageValidationStoreCleanup(bootstrap, storeCleanup, dsnCleanup)
	}
	return runtime, cleanup, nil
}

func runLineageValidationCleanup(cleanup func()) {
	if cleanup != nil {
		cleanup()
	}
}

func runLineageValidationStoreCleanup(bootstrap ioCloser, storeCleanup func() error, dsnCleanup func()) {
	if bootstrap != nil {
		_ = bootstrap.Close()
	}
	if storeCleanup != nil {
		_ = storeCleanup()
	}
	runLineageValidationCleanup(dsnCleanup)
}

type ioCloser interface {
	Close() error
}

func runLineageValidationExecution(ctx context.Context, runtime lineageValidationRuntime) (lineageValidationExecution, error) {
	if _, err := runtime.google.Connect(ctx, runtime.scope, services.GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "lineage-validation-auth",
	}); err != nil {
		return lineageValidationExecution{}, fmt.Errorf("connect google validation account: %w", err)
	}
	first, reimported, changed, err := runLineageValidationImports(ctx, runtime)
	if err != nil {
		return lineageValidationExecution{}, err
	}
	laterAgreement, fingerprint, err := runLineageValidationAgreementFlow(ctx, runtime, changed)
	if err != nil {
		return lineageValidationExecution{}, err
	}
	candidate, candidateDetailBefore, reviewed, candidateDetailAfter, err := runLineageValidationCandidateFlow(ctx, runtime)
	if err != nil {
		return lineageValidationExecution{}, err
	}
	importedAgreement, laterAgreementDetail, err := runLineageValidationAgreementDetails(ctx, runtime, first.Agreement.ID, laterAgreement.ID)
	if err != nil {
		return lineageValidationExecution{}, err
	}
	return lineageValidationExecution{
		first:                 first,
		reimported:            reimported,
		changed:               changed,
		laterAgreement:        laterAgreement,
		fingerprint:           fingerprint,
		candidate:             candidate,
		candidateDetailBefore: candidateDetailBefore,
		reviewed:              reviewed,
		candidateDetailAfter:  candidateDetailAfter,
		importedAgreement:     importedAgreement,
		laterAgreementDetail:  laterAgreementDetail,
	}, nil
}

func runLineageValidationImports(
	ctx context.Context,
	runtime lineageValidationRuntime,
) (services.GoogleImportResult, services.GoogleImportResult, services.GoogleImportResult, error) {
	first, err := runtime.google.ImportDocument(ctx, runtime.scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Master Services Agreement",
		AgreementTitle:    "Master Services Agreement v1",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-1",
		IdempotencyKey:    "lineage-validation-import-1",
	})
	if err != nil {
		return services.GoogleImportResult{}, services.GoogleImportResult{}, services.GoogleImportResult{}, fmt.Errorf("import initial google document: %w", err)
	}
	reimported, err := runtime.google.ImportDocument(ctx, runtime.scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-2",
		IdempotencyKey:    "lineage-validation-import-2",
	})
	if err != nil {
		return services.GoogleImportResult{}, services.GoogleImportResult{}, services.GoogleImportResult{}, fmt.Errorf("re-import unchanged google document: %w", err)
	}
	if updateErr := updateLineageValidationChangedImport(runtime.provider); updateErr != nil {
		return services.GoogleImportResult{}, services.GoogleImportResult{}, services.GoogleImportResult{}, updateErr
	}
	changed, err := runtime.google.ImportDocument(ctx, runtime.scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v2",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-3",
		IdempotencyKey:    "lineage-validation-import-3",
	})
	if err != nil {
		return services.GoogleImportResult{}, services.GoogleImportResult{}, services.GoogleImportResult{}, fmt.Errorf("import changed google document: %w", err)
	}
	return first, reimported, changed, nil
}

func updateLineageValidationChangedImport(provider *lineageValidationGoogleProvider) error {
	changedPDF, err := makeReadableValidationPDF(
		"Master Services Agreement",
		"Commercial terms were updated for the March revision.",
	)
	if err != nil {
		return fmt.Errorf("build changed lineage validation PDF: %w", err)
	}
	provider.setFile(
		"google-file-1",
		lineageValidationGoogleFile{
			file: services.GoogleDriveFile{
				ID:           "google-file-1",
				Name:         "Master Services Agreement",
				MimeType:     services.GoogleDriveMimeTypeDoc,
				WebViewURL:   "https://docs.google.com/document/d/google-file-1/edit",
				OwnerEmail:   "owner@example.com",
				ParentID:     "contracts",
				ModifiedTime: time.Date(2026, 3, 19, 15, 0, 0, 0, time.UTC),
			},
			pdf: changedPDF,
		},
	)
	return nil
}

func runLineageValidationAgreementFlow(
	ctx context.Context,
	runtime lineageValidationRuntime,
	changed services.GoogleImportResult,
) (stores.AgreementRecord, services.SourceFingerprintBuildResult, error) {
	laterAgreement, err := runtime.agreements.CreateDraft(ctx, runtime.scope, services.CreateDraftInput{
		DocumentID:      changed.Document.ID,
		Title:           "Master Services Agreement Follow-on Draft",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		return stores.AgreementRecord{}, services.SourceFingerprintBuildResult{}, fmt.Errorf("create later agreement from changed import: %w", err)
	}
	fingerprint, err := runtime.fingerprints.BuildFingerprint(ctx, runtime.scope, services.SourceFingerprintBuildInput{
		SourceRevisionID: changed.SourceRevisionID,
		ArtifactID:       changed.SourceArtifactID,
		Metadata:         lineageValidationMetadata(changed, "google-file-1"),
	})
	if err != nil {
		return stores.AgreementRecord{}, services.SourceFingerprintBuildResult{}, fmt.Errorf("build fingerprint for changed revision: %w", err)
	}
	return laterAgreement, fingerprint, nil
}

func runLineageValidationCandidateFlow(
	ctx context.Context,
	runtime lineageValidationRuntime,
) (services.GoogleImportResult, services.DocumentLineageDetail, services.CandidateWarningSummary, services.DocumentLineageDetail, error) {
	candidate, err := runtime.google.ImportDocument(ctx, runtime.scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-candidate",
		SourceVersionHint: "candidate-v1",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-4",
		IdempotencyKey:    "lineage-validation-import-4",
	})
	if err != nil {
		return services.GoogleImportResult{}, services.DocumentLineageDetail{}, services.CandidateWarningSummary{}, services.DocumentLineageDetail{}, fmt.Errorf("import candidate google document: %w", err)
	}
	if len(candidate.CandidateStatus) == 0 {
		return services.GoogleImportResult{}, services.DocumentLineageDetail{}, services.CandidateWarningSummary{}, services.DocumentLineageDetail{}, fmt.Errorf("candidate import did not create a pending candidate relationship")
	}
	candidateDetailBefore, err := runtime.readModels.GetDocumentLineageDetail(ctx, runtime.scope, candidate.Document.ID)
	if err != nil {
		return services.GoogleImportResult{}, services.DocumentLineageDetail{}, services.CandidateWarningSummary{}, services.DocumentLineageDetail{}, fmt.Errorf("load candidate detail before review: %w", err)
	}
	reviewed, err := runtime.reconciliation.ApplyReviewAction(ctx, runtime.scope, services.SourceRelationshipReviewInput{
		RelationshipID: candidate.CandidateStatus[0].ID,
		Action:         services.SourceRelationshipActionReject,
		ActorID:        "lineage-reviewer",
		Reason:         "release validation rejection flow",
	})
	if err != nil {
		return services.GoogleImportResult{}, services.DocumentLineageDetail{}, services.CandidateWarningSummary{}, services.DocumentLineageDetail{}, fmt.Errorf("apply candidate review action: %w", err)
	}
	candidateDetailAfter, err := runtime.readModels.GetDocumentLineageDetail(ctx, runtime.scope, candidate.Document.ID)
	if err != nil {
		return services.GoogleImportResult{}, services.DocumentLineageDetail{}, services.CandidateWarningSummary{}, services.DocumentLineageDetail{}, fmt.Errorf("load candidate detail after review: %w", err)
	}
	return candidate, candidateDetailBefore, reviewed, candidateDetailAfter, nil
}

func runLineageValidationAgreementDetails(
	ctx context.Context,
	runtime lineageValidationRuntime,
	importedAgreementID, laterAgreementID string,
) (services.AgreementLineageDetail, services.AgreementLineageDetail, error) {
	importedAgreementDetail, err := runtime.readModels.GetAgreementLineageDetail(ctx, runtime.scope, importedAgreementID)
	if err != nil {
		return services.AgreementLineageDetail{}, services.AgreementLineageDetail{}, fmt.Errorf("load imported agreement lineage detail: %w", err)
	}
	laterAgreementDetail, err := runtime.readModels.GetAgreementLineageDetail(ctx, runtime.scope, laterAgreementID)
	if err != nil {
		return services.AgreementLineageDetail{}, services.AgreementLineageDetail{}, fmt.Errorf("load later agreement lineage detail: %w", err)
	}
	return importedAgreementDetail, laterAgreementDetail, nil
}

func buildLineageValidationResult(execution lineageValidationExecution) LineageValidationResult {
	return LineageValidationResult{
		BootstrapValidated:               true,
		ImportLineageLinked:              execution.first.LineageStatus == services.LineageImportStatusLinked && strings.TrimSpace(execution.first.SourceDocumentID) != "" && strings.TrimSpace(execution.first.SourceRevisionID) != "",
		ReimportReusedRevision:           execution.first.SourceDocumentID == execution.reimported.SourceDocumentID && execution.first.SourceRevisionID == execution.reimported.SourceRevisionID && execution.first.SourceArtifactID == execution.reimported.SourceArtifactID,
		ChangedSourceCreatedNewRevision:  execution.first.SourceDocumentID == execution.changed.SourceDocumentID && execution.first.SourceRevisionID != execution.changed.SourceRevisionID && strings.TrimSpace(execution.changed.SourceRevisionID) != "",
		LaterAgreementPinnedLatest:       strings.TrimSpace(execution.laterAgreement.SourceRevisionID) == strings.TrimSpace(execution.changed.SourceRevisionID) && execution.laterAgreementDetail.PinnedSourceRevisionID == execution.changed.SourceRevisionID && !execution.laterAgreementDetail.NewerSourceExists,
		FingerprintStatus:                strings.TrimSpace(execution.fingerprint.Status.Status),
		CandidateCreated:                 execution.candidate.LineageStatus == services.LineageImportStatusNeedsReview && len(execution.candidate.CandidateStatus) > 0,
		CandidateReviewActionApplied:     strings.TrimSpace(execution.reviewed.Status) == stores.SourceRelationshipStatusRejected,
		CandidateWarningsVisibleBefore:   len(execution.candidateDetailBefore.CandidateWarningSummary) > 0,
		CandidateWarningsSuppressedAfter: len(execution.candidateDetailAfter.CandidateWarningSummary) == 0,
		DocumentDetailContractStable:     validateLineageDocumentContract(execution.candidateDetailBefore),
		AgreementDetailContractStable:    validateLineageAgreementContract(execution.importedAgreement),
		SourceDocumentID:                 strings.TrimSpace(execution.first.SourceDocumentID),
		PinnedAgreementSourceRevisionID:  strings.TrimSpace(execution.importedAgreement.PinnedSourceRevisionID),
		LatestSourceRevisionID:           strings.TrimSpace(execution.changed.SourceRevisionID),
		CandidateRelationshipID:          strings.TrimSpace(execution.candidate.CandidateStatus[0].ID),
		CandidateRelationshipFinalStatus: strings.TrimSpace(execution.reviewed.Status),
		CandidateDocumentID:              strings.TrimSpace(execution.candidate.Document.ID),
		ChangedImportDocumentID:          strings.TrimSpace(execution.changed.Document.ID),
		ImportedAgreementID:              strings.TrimSpace(execution.first.Agreement.ID),
	}
}

func validateLineageValidationResult(result LineageValidationResult) error {
	if !result.ImportLineageLinked {
		return fmt.Errorf("initial google import did not persist linked lineage")
	}
	if !result.ReimportReusedRevision {
		return fmt.Errorf("unchanged re-import did not reuse the existing revision")
	}
	if !result.ChangedSourceCreatedNewRevision {
		return fmt.Errorf("changed re-import did not create a new revision")
	}
	if !result.LaterAgreementPinnedLatest {
		return fmt.Errorf("later agreement did not pin the latest source revision")
	}
	if result.FingerprintStatus != services.LineageFingerprintStatusReady {
		return fmt.Errorf("fingerprint build did not complete with ready status: %s", result.FingerprintStatus)
	}
	if !result.CandidateCreated {
		return fmt.Errorf("candidate creation flow was not exercised")
	}
	if !result.CandidateReviewActionApplied {
		return fmt.Errorf("candidate review action was not applied")
	}
	if !result.CandidateWarningsVisibleBefore || !result.CandidateWarningsSuppressedAfter {
		return fmt.Errorf("candidate warning visibility did not transition across review")
	}
	if !result.DocumentDetailContractStable {
		return fmt.Errorf("document lineage detail contract is missing required fields")
	}
	if !result.AgreementDetailContractStable {
		return fmt.Errorf("agreement lineage detail contract is missing required fields")
	}
	return nil
}

type lineageValidationGoogleFile struct {
	file services.GoogleDriveFile
	pdf  []byte
}

type lineageValidationGoogleProvider struct {
	files map[string]lineageValidationGoogleFile
}

func newLineageValidationGoogleProvider() (*lineageValidationGoogleProvider, error) {
	primaryPDF, err := makeReadableValidationPDF(
		"Master Services Agreement",
		"Commercial terms remain unchanged in the initial revision.",
	)
	if err != nil {
		return nil, fmt.Errorf("build primary lineage validation PDF: %w", err)
	}
	candidatePDF, err := makeReadableValidationPDF(
		"Master Services Agreement",
		"This sibling draft keeps the same title but changes appendix language for review.",
	)
	if err != nil {
		return nil, fmt.Errorf("build candidate lineage validation PDF: %w", err)
	}
	return &lineageValidationGoogleProvider{
		files: map[string]lineageValidationGoogleFile{
			"google-file-1": {
				file: services.GoogleDriveFile{
					ID:           "google-file-1",
					Name:         "Master Services Agreement",
					MimeType:     services.GoogleDriveMimeTypeDoc,
					WebViewURL:   "https://docs.google.com/document/d/google-file-1/edit",
					OwnerEmail:   "owner@example.com",
					ParentID:     "contracts",
					ModifiedTime: time.Date(2026, 3, 19, 12, 0, 0, 0, time.UTC),
				},
				pdf: primaryPDF,
			},
			"google-file-candidate": {
				file: services.GoogleDriveFile{
					ID:           "google-file-candidate",
					Name:         "Master Services Agreement",
					MimeType:     services.GoogleDriveMimeTypeDoc,
					WebViewURL:   "https://docs.google.com/document/d/google-file-candidate/edit",
					OwnerEmail:   "owner@example.com",
					ParentID:     "contracts",
					ModifiedTime: time.Date(2026, 3, 19, 16, 0, 0, 0, time.UTC),
				},
				pdf: candidatePDF,
			},
		},
	}, nil
}

func (p *lineageValidationGoogleProvider) setFile(id string, file lineageValidationGoogleFile) {
	if p == nil {
		return
	}
	if p.files == nil {
		p.files = map[string]lineageValidationGoogleFile{}
	}
	p.files[strings.TrimSpace(id)] = file
}

func (p *lineageValidationGoogleProvider) ExchangeCode(_ context.Context, authCode, _ string, requestedScopes []string) (services.GoogleOAuthToken, error) {
	if strings.TrimSpace(authCode) == "" {
		return services.GoogleOAuthToken{}, errors.New("missing authorization code")
	}
	return services.GoogleOAuthToken{
		AccessToken:  "access-" + strings.TrimSpace(authCode),
		RefreshToken: "refresh-" + strings.TrimSpace(authCode),
		Scopes:       append([]string{}, requestedScopes...),
		ExpiresAt:    time.Date(2026, 3, 20, 12, 0, 0, 0, time.UTC),
		AccountEmail: "operator@example.com",
	}, nil
}

func (p *lineageValidationGoogleProvider) RevokeToken(context.Context, string) error {
	return nil
}

func (p *lineageValidationGoogleProvider) SearchFiles(_ context.Context, _ string, query, _ string, pageSize int) (services.GoogleDriveListResult, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	files := make([]services.GoogleDriveFile, 0, len(p.files))
	for _, entry := range p.files {
		if query == "" || strings.Contains(strings.ToLower(strings.TrimSpace(entry.file.Name)), query) {
			files = append(files, entry.file)
		}
	}
	if pageSize > 0 && len(files) > pageSize {
		files = files[:pageSize]
	}
	return services.GoogleDriveListResult{Files: files}, nil
}

func (p *lineageValidationGoogleProvider) BrowseFiles(_ context.Context, _ string, folderID, _ string, pageSize int) (services.GoogleDriveListResult, error) {
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		folderID = "contracts"
	}
	files := make([]services.GoogleDriveFile, 0, len(p.files))
	for _, entry := range p.files {
		if strings.TrimSpace(entry.file.ParentID) == folderID {
			files = append(files, entry.file)
		}
	}
	if pageSize > 0 && len(files) > pageSize {
		files = files[:pageSize]
	}
	return services.GoogleDriveListResult{Files: files}, nil
}

func (p *lineageValidationGoogleProvider) GetFile(_ context.Context, _ string, fileID string) (services.GoogleDriveFile, error) {
	if p == nil {
		return services.GoogleDriveFile{}, errors.New("google provider not configured")
	}
	entry, ok := p.files[strings.TrimSpace(fileID)]
	if !ok {
		return services.GoogleDriveFile{}, errors.New("google file not found")
	}
	return entry.file, nil
}

func (p *lineageValidationGoogleProvider) ListComments(_ context.Context, _ string, fileID string) ([]services.GoogleDriveComment, error) {
	if p == nil {
		return nil, errors.New("google provider not configured")
	}
	if _, ok := p.files[strings.TrimSpace(fileID)]; !ok {
		return nil, errors.New("google file not found")
	}
	return []services.GoogleDriveComment{}, nil
}

func (p *lineageValidationGoogleProvider) ExportFilePDF(_ context.Context, _ string, fileID string) (services.GoogleExportSnapshot, error) {
	entry, err := p.resolveFile(fileID)
	if err != nil {
		return services.GoogleExportSnapshot{}, err
	}
	return services.GoogleExportSnapshot{
		File: entry.file,
		PDF:  append([]byte{}, entry.pdf...),
	}, nil
}

func (p *lineageValidationGoogleProvider) DownloadFilePDF(_ context.Context, _ string, fileID string) (services.GoogleExportSnapshot, error) {
	return p.ExportFilePDF(context.Background(), "", fileID)
}

func (p *lineageValidationGoogleProvider) resolveFile(fileID string) (lineageValidationGoogleFile, error) {
	if p == nil {
		return lineageValidationGoogleFile{}, errors.New("google provider not configured")
	}
	entry, ok := p.files[strings.TrimSpace(fileID)]
	if !ok {
		return lineageValidationGoogleFile{}, errors.New("google file not found")
	}
	return entry, nil
}

func lineageValidationMetadata(imported services.GoogleImportResult, fileID string) services.SourceMetadataBaseline {
	modified := imported.Document.SourceModifiedTime
	sourceVersionHint := strings.TrimSpace(imported.Document.SourceRevisionID)
	if sourceVersionHint == "" {
		sourceVersionHint = strings.TrimSpace(imported.SourceRevisionID)
	}
	return services.SourceMetadataBaseline{
		AccountID:           "",
		ExternalFileID:      strings.TrimSpace(fileID),
		WebURL:              strings.TrimSpace(imported.Document.SourceGoogleDocURL),
		ModifiedTime:        modified,
		SourceVersionHint:   sourceVersionHint,
		SourceMimeType:      strings.TrimSpace(imported.SourceMimeType),
		SourceIngestionMode: strings.TrimSpace(imported.IngestionMode),
		TitleHint:           strings.TrimSpace(imported.Document.Title),
		PageCountHint:       imported.Document.PageCount,
		OwnerEmail:          "owner@example.com",
		ParentID:            "contracts",
	}
}

func validateLineageDocumentContract(detail services.DocumentLineageDetail) bool {
	return strings.TrimSpace(detail.DocumentID) != "" &&
		detail.SourceDocument != nil &&
		strings.TrimSpace(detail.SourceDocument.ID) != "" &&
		detail.SourceRevision != nil &&
		strings.TrimSpace(detail.SourceRevision.ID) != "" &&
		detail.SourceArtifact != nil &&
		strings.TrimSpace(detail.SourceArtifact.ID) != "" &&
		detail.GoogleSource != nil &&
		strings.TrimSpace(detail.GoogleSource.ExternalFileID) != "" &&
		len(detail.CandidateWarningSummary) > 0
}

func validateLineageAgreementContract(detail services.AgreementLineageDetail) bool {
	return strings.TrimSpace(detail.AgreementID) != "" &&
		strings.TrimSpace(detail.PinnedSourceRevisionID) != "" &&
		detail.SourceDocument != nil &&
		strings.TrimSpace(detail.SourceDocument.ID) != "" &&
		detail.SourceRevision != nil &&
		strings.TrimSpace(detail.SourceRevision.ID) != "" &&
		detail.LinkedDocumentArtifact != nil &&
		strings.TrimSpace(detail.LinkedDocumentArtifact.ID) != "" &&
		detail.GoogleSource != nil &&
		detail.NewerSourceSummary != nil &&
		detail.NewerSourceSummary.Exists
}

func makeReadableValidationPDF(paragraphs ...string) ([]byte, error) {
	doc := gofpdf.New("P", "pt", "Letter", "")
	doc.SetMargins(48, 48, 48)
	doc.SetFont("Helvetica", "", 12)
	doc.AddPage()
	for _, paragraph := range paragraphs {
		value := strings.TrimSpace(paragraph)
		if value == "" {
			continue
		}
		doc.MultiCell(0, 16, value, "", "L", false)
		doc.Ln(8)
	}
	var out bytes.Buffer
	if err := doc.Output(&out); err != nil {
		return nil, fmt.Errorf("render readable validation PDF: %w", err)
	}
	return out.Bytes(), nil
}
