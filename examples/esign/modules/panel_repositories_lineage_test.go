package modules

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestDocumentPanelRepositoryGetIncludesCanonicalLineageDetail(t *testing.T) {
	store, scope, fixtures := seedPanelLineageFixtures(t)
	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, scope, RuntimeSettings{})
	readModels := services.NewDefaultSourceReadModelService(store, store, store)

	record, err := repo.Get(context.Background(), fixtures.documentID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got := toString(record["source_document_id"]); got != fixtures.sourceDocumentID {
		t.Fatalf("expected source_document_id %q, got %q", fixtures.sourceDocumentID, got)
	}
	lineage, ok := record["lineage"].(services.DocumentLineageDetail)
	if !ok {
		t.Fatalf("expected document lineage detail payload, got %T", record["lineage"])
	}
	expected, err := readModels.GetDocumentLineageDetail(context.Background(), scope, fixtures.documentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail: %v", err)
	}
	if lineage.SourceRevision == nil || expected.SourceRevision == nil || lineage.SourceRevision.ID != expected.SourceRevision.ID {
		t.Fatalf("expected lineage payload to pass through canonical detail, got %+v want %+v", lineage, expected)
	}
	if len(lineage.CandidateWarningSummary) != len(expected.CandidateWarningSummary) {
		t.Fatalf("expected candidate warning summary to pass through, got %+v want %+v", lineage.CandidateWarningSummary, expected.CandidateWarningSummary)
	}
	presentation, ok := record["lineage_presentation"].(map[string]any)
	if !ok {
		t.Fatalf("expected document lineage presentation payload, got %T", record["lineage_presentation"])
	}
	if got := toString(presentation["status"]); got != "native" {
		t.Fatalf("expected document lineage presentation status native, got %+v", presentation)
	}
	if got := toString(presentation["diagnostics_url"]); got != expected.DiagnosticsURL {
		t.Fatalf("expected document diagnostics_url %q, got %+v", expected.DiagnosticsURL, presentation)
	}
	warnings, ok := presentation["warnings"].([]map[string]any)
	if !ok || len(warnings) == 0 {
		t.Fatalf("expected document presentation warnings, got %+v", presentation["warnings"])
	}
	if got := toString(warnings[0]["action_url"]); got != expected.DiagnosticsURL {
		t.Fatalf("expected document warning action_url %q, got %+v", expected.DiagnosticsURL, warnings[0])
	}
}

func TestAgreementPanelRepositoryGetIncludesCanonicalLineageDetail(t *testing.T) {
	store, scope, fixtures := seedPanelLineageFixtures(t)
	repo := newAgreementPanelRepository(
		store,
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)
	readModels := services.NewDefaultSourceReadModelService(store, store, store)

	record, err := repo.Get(context.Background(), fixtures.agreementID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got := toString(record["source_revision_id"]); got != fixtures.sourceRevisionID {
		t.Fatalf("expected source_revision_id %q, got %q", fixtures.sourceRevisionID, got)
	}
	lineage, ok := record["lineage"].(services.AgreementLineageDetail)
	if !ok {
		t.Fatalf("expected agreement lineage detail payload, got %T", record["lineage"])
	}
	expected, err := readModels.GetAgreementLineageDetail(context.Background(), scope, fixtures.agreementID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail: %v", err)
	}
	if lineage.SourceRevision == nil || expected.SourceRevision == nil || lineage.SourceRevision.ID != expected.SourceRevision.ID {
		t.Fatalf("expected agreement lineage payload to pass through canonical detail, got %+v want %+v", lineage, expected)
	}
	if lineage.PinnedSourceRevisionID != expected.PinnedSourceRevisionID {
		t.Fatalf("expected pinned_source_revision_id %q, got %+v", expected.PinnedSourceRevisionID, lineage)
	}
	if lineage.SourceDocument == nil || expected.SourceDocument == nil || lineage.SourceDocument.ID != expected.SourceDocument.ID {
		t.Fatalf("expected agreement source_document to pass through, got %+v want %+v", lineage.SourceDocument, expected.SourceDocument)
	}
	if lineage.NewerSourceExists != expected.NewerSourceExists {
		t.Fatalf("expected newer_source_exists=%v, got %+v want %+v", expected.NewerSourceExists, lineage, expected)
	}
	if lineage.NewerSourceSummary == nil || expected.NewerSourceSummary == nil || lineage.NewerSourceSummary.LatestSourceRevisionID != expected.NewerSourceSummary.LatestSourceRevisionID {
		t.Fatalf("expected newer_source_summary to pass through, got %+v want %+v", lineage.NewerSourceSummary, expected.NewerSourceSummary)
	}
	presentation, ok := record["lineage_presentation"].(map[string]any)
	if !ok {
		t.Fatalf("expected agreement lineage presentation payload, got %T", record["lineage_presentation"])
	}
	if got := toString(presentation["status"]); got != "native" {
		t.Fatalf("expected agreement lineage presentation status native, got %+v", presentation)
	}
	if got := toString(presentation["diagnostics_url"]); got != expected.DiagnosticsURL {
		t.Fatalf("expected agreement diagnostics_url %q, got %+v", expected.DiagnosticsURL, presentation)
	}
	source, ok := presentation["source"].(map[string]any)
	if !ok || toString(source["url"]) != expected.SourceDocument.URL {
		t.Fatalf("expected agreement presentation source link %q, got %+v", expected.SourceDocument.URL, presentation["source"])
	}
	warnings, ok := presentation["warnings"].([]map[string]any)
	if !ok || len(warnings) == 0 {
		t.Fatalf("expected agreement presentation warnings, got %+v", presentation["warnings"])
	}
	if got := toString(warnings[0]["action_url"]); got != expected.DiagnosticsURL {
		t.Fatalf("expected agreement warning action_url %q, got %+v", expected.DiagnosticsURL, warnings[0])
	}
}

func TestPanelRepositoriesStripLineageLinkoutsWhenAuthorizerDeniesView(t *testing.T) {
	store, scope, fixtures := seedPanelLineageFixtures(t)
	denyView := panelLineageAuthorizer{allowed: map[string]bool{}}

	docRepo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, scope, RuntimeSettings{})
	docRepo.authorizer = denyView
	documentRecord, err := docRepo.Get(context.Background(), fixtures.documentID)
	if err != nil {
		t.Fatalf("document Get: %v", err)
	}
	documentLineage, ok := documentRecord["lineage"].(services.DocumentLineageDetail)
	if !ok {
		t.Fatalf("expected document lineage detail payload, got %T", documentRecord["lineage"])
	}
	if documentLineage.SourceDocument == nil || documentLineage.SourceDocument.URL != "" {
		t.Fatalf("expected document source link stripped, got %+v", documentLineage.SourceDocument)
	}
	if documentLineage.GoogleSource == nil || documentLineage.GoogleSource.WebURL != "" {
		t.Fatalf("expected document google link stripped, got %+v", documentLineage.GoogleSource)
	}
	if documentLineage.DiagnosticsURL != "" {
		t.Fatalf("expected document diagnostics url stripped, got %+v", documentLineage)
	}

	agreementRepo := newAgreementPanelRepository(
		store,
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)
	agreementRepo.authorizer = denyView
	agreementRecord, err := agreementRepo.Get(context.Background(), fixtures.agreementID)
	if err != nil {
		t.Fatalf("agreement Get: %v", err)
	}
	agreementLineage, ok := agreementRecord["lineage"].(services.AgreementLineageDetail)
	if !ok {
		t.Fatalf("expected agreement lineage detail payload, got %T", agreementRecord["lineage"])
	}
	if agreementLineage.SourceDocument == nil || agreementLineage.SourceDocument.URL != "" {
		t.Fatalf("expected agreement source link stripped, got %+v", agreementLineage.SourceDocument)
	}
	if agreementLineage.GoogleSource == nil || agreementLineage.GoogleSource.WebURL != "" {
		t.Fatalf("expected agreement google link stripped, got %+v", agreementLineage.GoogleSource)
	}
	if agreementLineage.DiagnosticsURL != "" {
		t.Fatalf("expected agreement diagnostics url stripped, got %+v", agreementLineage)
	}
	for _, warning := range agreementLineage.PresentationWarnings {
		if warning.ActionURL != "" || warning.ActionLabel != "" {
			t.Fatalf("expected agreement warning action stripped, got %+v", warning)
		}
	}
}

func seedPanelLineageFixtures(t *testing.T) (*stores.InMemoryStore, stores.Scope, panelLineageFixtures) {
	t.Helper()

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-panel-lineage", OrgID: "org-panel-lineage"}
	now := time.Date(2026, time.March, 18, 18, 0, 0, 0, time.UTC)
	second := now.Add(2 * time.Hour)
	fixtures := panelLineageFixtures{
		documentID:        "doc-panel-lineage",
		agreementID:       "agr-panel-lineage",
		sourceDocumentID:  "src-doc-panel-lineage",
		sourceHandleID:    "src-handle-panel-lineage",
		sourceRevisionID:  "src-rev-panel-lineage-1",
		secondRevisionID:  "src-rev-panel-lineage-2",
		sourceArtifactID:  "src-art-panel-lineage-1",
		candidateSourceID: "src-doc-panel-candidate",
	}

	if _, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
		ID:                fixtures.sourceDocumentID,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Panel Fixture Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	}); err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	if _, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
		ID:                fixtures.candidateSourceID,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Panel Fixture Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandMedium,
		CreatedAt:         second,
		UpdatedAt:         second,
	}); err != nil {
		t.Fatalf("CreateSourceDocument candidate: %v", err)
	}
	validFrom := now
	if _, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
		ID:               fixtures.sourceHandleID,
		SourceDocumentID: fixtures.sourceDocumentID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "fixture-panel-google-file",
		AccountID:        "fixture-account-1",
		DriveID:          "fixture-drive",
		WebURL:           "https://docs.google.com/document/d/fixture-panel-google-file/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &validFrom,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   fixtures.sourceRevisionID,
		SourceDocumentID:     fixtures.sourceDocumentID,
		SourceHandleID:       fixtures.sourceHandleID,
		ProviderRevisionHint: "v1",
		ModifiedTime:         &now,
		ExportedAt:           &now,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"external_file_id":"fixture-panel-google-file","account_id":"fixture-account-1","web_url":"https://docs.google.com/document/d/fixture-panel-google-file/edit","title_hint":"Panel Fixture Source","source_version_hint":"v1"}`,
		CreatedAt:            now,
		UpdatedAt:            now,
	}); err != nil {
		t.Fatalf("CreateSourceRevision first: %v", err)
	}
	if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   fixtures.secondRevisionID,
		SourceDocumentID:     fixtures.sourceDocumentID,
		SourceHandleID:       fixtures.sourceHandleID,
		ProviderRevisionHint: "v2",
		ModifiedTime:         &second,
		ExportedAt:           &second,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"external_file_id":"fixture-panel-google-file","account_id":"fixture-account-1","web_url":"https://docs.google.com/document/d/fixture-panel-google-file/edit","title_hint":"Panel Fixture Source","source_version_hint":"v2"}`,
		CreatedAt:            second,
		UpdatedAt:            second,
	}); err != nil {
		t.Fatalf("CreateSourceRevision second: %v", err)
	}
	if _, err := store.CreateSourceArtifact(context.Background(), scope, stores.SourceArtifactRecord{
		ID:                  fixtures.sourceArtifactID,
		SourceRevisionID:    fixtures.sourceRevisionID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           "tenant/panel-fixture.pdf",
		SHA256:              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		PageCount:           2,
		SizeBytes:           2048,
		CompatibilityTier:   "supported",
		NormalizationStatus: "completed",
		CreatedAt:           now,
		UpdatedAt:           now,
	}); err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                     fixtures.documentID,
		Title:                  "Panel Fixture Document",
		SourceOriginalName:     "panel-fixture.pdf",
		SourceObjectKey:        "tenant/panel-fixture.pdf",
		SourceSHA256:           "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     "fixture-panel-google-file",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/fixture-panel-google-file/edit",
		SourceModifiedTime:     &now,
		SourceExportedAt:       &now,
		SourceExportedByUserID: "fixture-user",
		SourceMimeType:         "application/vnd.google-apps.document",
		SourceIngestionMode:    services.GoogleIngestionModeExportPDF,
		SourceDocumentID:       fixtures.sourceDocumentID,
		SourceRevisionID:       fixtures.sourceRevisionID,
		SourceArtifactID:       fixtures.sourceArtifactID,
		SizeBytes:              2048,
		PageCount:              2,
		CreatedByUserID:        "fixture-user",
		CreatedAt:              now,
		UpdatedAt:              now,
	}); err != nil {
		t.Fatalf("Create document: %v", err)
	}
	if _, err := store.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:                     fixtures.agreementID,
		DocumentID:             fixtures.documentID,
		Status:                 stores.AgreementStatusDraft,
		Title:                  "Panel Fixture Agreement",
		Version:                1,
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     "fixture-panel-google-file",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/fixture-panel-google-file/edit",
		SourceModifiedTime:     &now,
		SourceExportedAt:       &now,
		SourceExportedByUserID: "fixture-user",
		SourceMimeType:         "application/vnd.google-apps.document",
		SourceIngestionMode:    services.GoogleIngestionModeExportPDF,
		SourceRevisionID:       fixtures.sourceRevisionID,
		CreatedByUserID:        "fixture-user",
		UpdatedByUserID:        "fixture-user",
		CreatedAt:              now,
		UpdatedAt:              now,
	}); err != nil {
		t.Fatalf("Create agreement: %v", err)
	}
	if _, err := store.CreateSourceRelationship(context.Background(), scope, stores.SourceRelationshipRecord{
		ID:                    "src-rel-panel-lineage",
		LeftSourceDocumentID:  fixtures.candidateSourceID,
		RightSourceDocumentID: fixtures.sourceDocumentID,
		RelationshipType:      stores.SourceRelationshipTypeSameLogicalDoc,
		ConfidenceBand:        stores.LineageConfidenceBandMedium,
		ConfidenceScore:       0.73,
		Status:                stores.SourceRelationshipStatusPendingReview,
		EvidenceJSON:          `{"candidate_reason":"matching_title_with_partial_google_context"}`,
		CreatedByUserID:       "fixture-user",
		CreatedAt:             second,
		UpdatedAt:             second,
	}); err != nil {
		t.Fatalf("CreateSourceRelationship: %v", err)
	}

	return store, scope, fixtures
}

type panelLineageFixtures struct {
	documentID        string
	agreementID       string
	sourceDocumentID  string
	sourceHandleID    string
	sourceRevisionID  string
	secondRevisionID  string
	sourceArtifactID  string
	candidateSourceID string
}

type panelLineageAuthorizer struct {
	allowed map[string]bool
}

func (a panelLineageAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[action]
}
