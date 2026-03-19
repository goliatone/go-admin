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

func RunLineageValidationProfile(ctx context.Context, _ LineageValidationConfig) (LineageValidationResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	storeDSN, cleanup := resolveValidationSQLiteDSN("lineage-validation")
	if cleanup != nil {
		defer cleanup()
	}

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = strings.TrimSpace(storeDSN)
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := esignpersistence.Bootstrap(ctx, cfg)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("bootstrap lineage validation store: %w", err)
	}
	defer func() {
		_ = bootstrap.Close()
	}()

	store, storeCleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("create lineage validation store adapter: %w", err)
	}
	if storeCleanup != nil {
		defer func() {
			_ = storeCleanup()
		}()
	}

	uploadDir, err := os.MkdirTemp("", "go-admin-lineage-validation-upload-*")
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("create lineage validation upload dir: %w", err)
	}
	defer func() {
		_ = os.RemoveAll(uploadDir)
	}()
	uploads := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(uploadDir)))

	scope := stores.Scope{TenantID: "tenant-lineage-validation", OrgID: "org-lineage-validation"}
	documents := services.NewDocumentService(store,
		services.WithDocumentObjectStore(uploads),
		services.WithDocumentPDFService(services.NewPDFService()),
	)
	agreements := services.NewAgreementService(store)
	readModels := services.NewDefaultSourceReadModelService(store, store, store)
	fingerprints := services.NewDefaultSourceFingerprintService(store, uploads)
	reconciliation := services.NewDefaultSourceReconciliationService(store)
	provider := newLineageValidationGoogleProvider()
	google := services.NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		services.WithGoogleLineageStore(store),
	)

	if _, err := google.Connect(ctx, scope, services.GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "lineage-validation-auth",
	}); err != nil {
		return LineageValidationResult{}, fmt.Errorf("connect google validation account: %w", err)
	}

	first, err := google.ImportDocument(ctx, scope, services.GoogleImportInput{
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
		return LineageValidationResult{}, fmt.Errorf("import initial google document: %w", err)
	}

	reimported, err := google.ImportDocument(ctx, scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-2",
		IdempotencyKey:    "lineage-validation-import-2",
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("re-import unchanged google document: %w", err)
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
			pdf: makeReadableValidationPDF(
				"Master Services Agreement",
				"Commercial terms were updated for the March revision.",
			),
		},
	)

	changed, err := google.ImportDocument(ctx, scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v2",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-3",
		IdempotencyKey:    "lineage-validation-import-3",
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("import changed google document: %w", err)
	}

	laterAgreement, err := agreements.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      changed.Document.ID,
		Title:           "Master Services Agreement Follow-on Draft",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("create later agreement from changed import: %w", err)
	}

	fingerprint, err := fingerprints.BuildFingerprint(ctx, scope, services.SourceFingerprintBuildInput{
		SourceRevisionID: changed.SourceRevisionID,
		ArtifactID:       changed.SourceArtifactID,
		Metadata:         lineageValidationMetadata(changed, "google-file-1"),
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("build fingerprint for changed revision: %w", err)
	}

	candidate, err := google.ImportDocument(ctx, scope, services.GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-candidate",
		SourceVersionHint: "candidate-v1",
		DocumentTitle:     "Master Services Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "lineage-validation-import-4",
		IdempotencyKey:    "lineage-validation-import-4",
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("import candidate google document: %w", err)
	}
	if len(candidate.CandidateStatus) == 0 {
		return LineageValidationResult{}, fmt.Errorf("candidate import did not create a pending candidate relationship")
	}

	candidateDetailBefore, err := readModels.GetDocumentLineageDetail(ctx, scope, candidate.Document.ID)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("load candidate detail before review: %w", err)
	}

	reviewed, err := reconciliation.ApplyReviewAction(ctx, scope, services.SourceRelationshipReviewInput{
		RelationshipID: candidate.CandidateStatus[0].ID,
		Action:         services.SourceRelationshipActionReject,
		ActorID:        "lineage-reviewer",
		Reason:         "release validation rejection flow",
	})
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("apply candidate review action: %w", err)
	}

	candidateDetailAfter, err := readModels.GetDocumentLineageDetail(ctx, scope, candidate.Document.ID)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("load candidate detail after review: %w", err)
	}

	importedAgreementDetail, err := readModels.GetAgreementLineageDetail(ctx, scope, first.Agreement.ID)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("load imported agreement lineage detail: %w", err)
	}
	laterAgreementDetail, err := readModels.GetAgreementLineageDetail(ctx, scope, laterAgreement.ID)
	if err != nil {
		return LineageValidationResult{}, fmt.Errorf("load later agreement lineage detail: %w", err)
	}

	result := LineageValidationResult{
		BootstrapValidated:               true,
		ImportLineageLinked:              first.LineageStatus == services.LineageImportStatusLinked && strings.TrimSpace(first.SourceDocumentID) != "" && strings.TrimSpace(first.SourceRevisionID) != "",
		ReimportReusedRevision:           first.SourceDocumentID == reimported.SourceDocumentID && first.SourceRevisionID == reimported.SourceRevisionID && first.SourceArtifactID == reimported.SourceArtifactID,
		ChangedSourceCreatedNewRevision:  first.SourceDocumentID == changed.SourceDocumentID && first.SourceRevisionID != changed.SourceRevisionID && strings.TrimSpace(changed.SourceRevisionID) != "",
		LaterAgreementPinnedLatest:       strings.TrimSpace(laterAgreement.SourceRevisionID) == strings.TrimSpace(changed.SourceRevisionID) && laterAgreementDetail.PinnedSourceRevisionID == changed.SourceRevisionID && !laterAgreementDetail.NewerSourceExists,
		FingerprintStatus:                strings.TrimSpace(fingerprint.Status.Status),
		CandidateCreated:                 candidate.LineageStatus == services.LineageImportStatusNeedsReview && len(candidate.CandidateStatus) > 0,
		CandidateReviewActionApplied:     strings.TrimSpace(reviewed.Status) == stores.SourceRelationshipStatusRejected,
		CandidateWarningsVisibleBefore:   len(candidateDetailBefore.CandidateWarningSummary) > 0,
		CandidateWarningsSuppressedAfter: len(candidateDetailAfter.CandidateWarningSummary) == 0,
		DocumentDetailContractStable:     validateLineageDocumentContract(candidateDetailBefore),
		AgreementDetailContractStable:    validateLineageAgreementContract(importedAgreementDetail),
		SourceDocumentID:                 strings.TrimSpace(first.SourceDocumentID),
		PinnedAgreementSourceRevisionID:  strings.TrimSpace(importedAgreementDetail.PinnedSourceRevisionID),
		LatestSourceRevisionID:           strings.TrimSpace(changed.SourceRevisionID),
		CandidateRelationshipID:          strings.TrimSpace(candidate.CandidateStatus[0].ID),
		CandidateRelationshipFinalStatus: strings.TrimSpace(reviewed.Status),
		CandidateDocumentID:              strings.TrimSpace(candidate.Document.ID),
		ChangedImportDocumentID:          strings.TrimSpace(changed.Document.ID),
		ImportedAgreementID:              strings.TrimSpace(first.Agreement.ID),
	}

	if !result.ImportLineageLinked {
		return result, fmt.Errorf("initial google import did not persist linked lineage")
	}
	if !result.ReimportReusedRevision {
		return result, fmt.Errorf("unchanged re-import did not reuse the existing revision")
	}
	if !result.ChangedSourceCreatedNewRevision {
		return result, fmt.Errorf("changed re-import did not create a new revision")
	}
	if !result.LaterAgreementPinnedLatest {
		return result, fmt.Errorf("later agreement did not pin the latest source revision")
	}
	if result.FingerprintStatus != services.LineageFingerprintStatusReady {
		return result, fmt.Errorf("fingerprint build did not complete with ready status: %s", result.FingerprintStatus)
	}
	if !result.CandidateCreated {
		return result, fmt.Errorf("candidate creation flow was not exercised")
	}
	if !result.CandidateReviewActionApplied {
		return result, fmt.Errorf("candidate review action was not applied")
	}
	if !result.CandidateWarningsVisibleBefore || !result.CandidateWarningsSuppressedAfter {
		return result, fmt.Errorf("candidate warning visibility did not transition across review")
	}
	if !result.DocumentDetailContractStable {
		return result, fmt.Errorf("document lineage detail contract is missing required fields")
	}
	if !result.AgreementDetailContractStable {
		return result, fmt.Errorf("agreement lineage detail contract is missing required fields")
	}

	return result, nil
}

type lineageValidationGoogleFile struct {
	file services.GoogleDriveFile
	pdf  []byte
}

type lineageValidationGoogleProvider struct {
	files map[string]lineageValidationGoogleFile
}

func newLineageValidationGoogleProvider() *lineageValidationGoogleProvider {
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
				pdf: makeReadableValidationPDF(
					"Master Services Agreement",
					"Commercial terms remain unchanged in the initial revision.",
				),
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
				pdf: makeReadableValidationPDF(
					"Master Services Agreement",
					"This sibling draft keeps the same title but changes appendix language for review.",
				),
			},
		},
	}
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

func makeReadableValidationPDF(paragraphs ...string) []byte {
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
		panic(fmt.Sprintf("makeReadableValidationPDF: %v", err))
	}
	return out.Bytes()
}
