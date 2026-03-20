package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type reconciliationSeedConfig struct {
	suffix            string
	title             string
	accountID         string
	externalFileID    string
	webURL            string
	ownerEmail        string
	parentID          string
	providerRevision  string
	lineageConfidence string
	documentID        string
	documentTitle     string
	documentSHA256    string
	createDocument    bool
	createAgreement   bool
	agreementID       string
	agreementTitle    string
	pdf               []byte
}

type reconciliationSourceSeed struct {
	sourceDocumentID string
	handleID         string
	revisionID       string
	artifactID       string
	documentID       string
	agreementID      string
	accountID        string
	externalFileID   string
	webURL           string
	ownerEmail       string
	parentID         string
	title            string
	modifiedAt       time.Time
}

type reconciliationFixture struct {
	scope   stores.Scope
	store   *stores.InMemoryStore
	objects *fingerprintObjectStoreStub
	now     time.Time
}

func TestDefaultSourceReconciliationServiceAutoConfirmsExactArtifactMatches(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()
	pdf := makeTextPDF(t,
		"Master Services Agreement\n\nCommercial terms remain unchanged.",
		"Appendix A\n\nSupport obligations and pricing remain unchanged.",
	)

	canonical := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "canonical",
		title:             "Master Services Agreement",
		accountID:         "acct-primary",
		externalFileID:    "google-file-primary",
		webURL:            "https://docs.google.com/document/d/google-file-primary/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf:               pdf,
	})
	duplicate := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "duplicate",
		title:             "Master Services Agreement",
		accountID:         "acct-secondary",
		externalFileID:    "google-file-secondary",
		webURL:            "https://docs.google.com/document/d/google-file-secondary/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v1-copy",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		pdf:               pdf,
	})

	fixture.buildFingerprint(t, canonical)
	fixture.buildFingerprint(t, duplicate)

	service := NewDefaultSourceReconciliationService(fixture.store, WithSourceReconciliationClock(func() time.Time {
		return fixture.now.Add(2 * time.Hour)
	}))

	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: duplicate.sourceDocumentID,
		SourceRevisionID: duplicate.revisionID,
		ArtifactID:       duplicate.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(duplicate),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates exact artifact: %v", err)
	}
	if len(result.Candidates) != 0 || result.PrimaryCandidate != nil {
		t.Fatalf("expected auto-confirmed exact artifact candidate to stay out of pending warnings, got %+v", result)
	}

	relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, duplicate.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListCandidateRelationships: %v", err)
	}
	if len(relationships) != 1 {
		t.Fatalf("expected one persisted relationship, got %+v", relationships)
	}
	relationship := relationships[0]
	if relationship.Status != stores.SourceRelationshipStatusConfirmed {
		t.Fatalf("expected confirmed relationship, got %+v", relationship)
	}
	if relationship.ConfidenceBand != stores.LineageConfidenceBandExact {
		t.Fatalf("expected exact confidence, got %+v", relationship)
	}
	if relationship.RelationshipType != stores.SourceRelationshipTypeCopiedFrom {
		t.Fatalf("expected copied_from relationship type, got %+v", relationship)
	}
	if relationship.CreatedByUserID != "ops-user" {
		t.Fatalf("expected created_by_user_id to use actor id, got %+v", relationship)
	}

	activeDuplicateHandles, err := fixture.store.ListSourceHandles(ctx, fixture.scope, stores.SourceHandleQuery{
		SourceDocumentID: duplicate.sourceDocumentID,
		ActiveOnly:       true,
	})
	if err != nil {
		t.Fatalf("ListSourceHandles duplicate: %v", err)
	}
	if len(activeDuplicateHandles) != 0 {
		t.Fatalf("expected duplicate handles to be attached away from duplicate source, got %+v", activeDuplicateHandles)
	}

	reattached, err := fixture.store.GetActiveSourceHandle(ctx, fixture.scope, stores.SourceProviderKindGoogleDrive, duplicate.externalFileID, duplicate.accountID)
	if err != nil {
		t.Fatalf("GetActiveSourceHandle reattached: %v", err)
	}
	if reattached.SourceDocumentID != canonical.sourceDocumentID {
		t.Fatalf("expected duplicate handle to be reattached to canonical source %q, got %+v", canonical.sourceDocumentID, reattached)
	}
}

func TestDefaultSourceReconciliationServiceCreatesPendingCrossAccountCandidate(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()

	canonical := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "cross-account-primary",
		title:             "Customer NDA",
		accountID:         "acct-primary",
		externalFileID:    "google-file-primary",
		webURL:            "https://docs.google.com/document/d/google-file-primary/edit",
		ownerEmail:        "legal@example.com",
		parentID:          "folder-shared",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf: makeTextPDF(t,
			"Customer NDA\n\nConfidential information shall remain protected.",
			"Term\n\nThe agreement continues until terminated in writing.",
		),
	})
	candidate := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "cross-account-copy",
		title:             "Customer NDA",
		accountID:         "acct-migrated",
		externalFileID:    "google-file-migrated",
		webURL:            "https://docs.google.com/document/d/google-file-migrated/edit",
		ownerEmail:        "legal@example.com",
		parentID:          "folder-shared",
		providerRevision:  "v2",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		pdf: makeTextPDF(t,
			"Customer NDA\n\nConfidential information shall remain protected.",
			"Term\n\nThe agreement continues until terminated in writing with notice.",
		),
	})

	fixture.buildFingerprint(t, canonical)
	fixture.buildFingerprint(t, candidate)

	service := NewDefaultSourceReconciliationService(fixture.store, WithSourceReconciliationClock(func() time.Time {
		return fixture.now.Add(90 * time.Minute)
	}))

	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: candidate.sourceDocumentID,
		SourceRevisionID: candidate.revisionID,
		ArtifactID:       candidate.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(candidate),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates pending candidate: %v", err)
	}
	if len(result.Candidates) != 1 || result.PrimaryCandidate == nil {
		t.Fatalf("expected one pending candidate, got %+v", result)
	}
	if result.PrimaryCandidate.Status != stores.SourceRelationshipStatusPendingReview {
		t.Fatalf("expected pending_review status, got %+v", result.PrimaryCandidate)
	}
	if result.PrimaryCandidate.RelationshipType != stores.SourceRelationshipTypeTransferredFrom {
		t.Fatalf("expected transferred_from relationship type, got %+v", result.PrimaryCandidate)
	}

	activeHandle, err := fixture.store.GetActiveSourceHandle(ctx, fixture.scope, stores.SourceProviderKindGoogleDrive, candidate.externalFileID, candidate.accountID)
	if err != nil {
		t.Fatalf("GetActiveSourceHandle candidate: %v", err)
	}
	if activeHandle.SourceDocumentID != candidate.sourceDocumentID {
		t.Fatalf("expected pending candidate to keep its active handle, got %+v", activeHandle)
	}
}

func TestDefaultSourceReconciliationServiceScoresHistoricalRevisions(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()
	originalPDF := makeTextPDF(t,
		"Master Services Agreement\n\nCommercial terms remain unchanged.",
		"Appendix A\n\nSupport obligations and pricing remain unchanged.",
	)
	updatedPDF := makeTextPDF(t,
		"Master Services Agreement\n\nCommercial terms now include regional pricing.",
		"Appendix A\n\nSupport obligations changed for premium tiers.",
	)

	canonical := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "historical-canonical",
		title:             "Master Services Agreement",
		accountID:         "acct-primary",
		externalFileID:    "google-file-primary",
		webURL:            "https://docs.google.com/document/d/google-file-primary/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf:               originalPDF,
	})
	target := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "historical-target",
		title:             "Master Services Agreement",
		accountID:         "acct-secondary",
		externalFileID:    "google-file-secondary",
		webURL:            "https://docs.google.com/document/d/google-file-secondary/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v1-copy",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		pdf:               originalPDF,
	})

	secondRevisionAt := fixture.now.Add(3 * time.Hour)
	secondRevision, err := fixture.store.CreateSourceRevision(ctx, fixture.scope, stores.SourceRevisionRecord{
		ID:                   canonical.revisionID + "-v2",
		SourceDocumentID:     canonical.sourceDocumentID,
		SourceHandleID:       canonical.handleID,
		ProviderRevisionHint: "v2",
		ModifiedTime:         &secondRevisionAt,
		ExportedAt:           &secondRevisionAt,
		ExportedByUserID:     "ops-user",
		SourceMimeType:       GoogleDriveMimeTypeDoc,
		MetadataJSON:         `{"owner_email":"owner@example.com","parent_id":"folder-legal","web_url":"https://docs.google.com/document/d/google-file-primary/edit"}`,
		CreatedAt:            secondRevisionAt,
		UpdatedAt:            secondRevisionAt,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision v2: %v", err)
	}
	secondArtifactObjectKey := "tenant/" + fixture.scope.TenantID + "/historical-canonical-v2.pdf"
	secondArtifact, err := fixture.store.CreateSourceArtifact(ctx, fixture.scope, stores.SourceArtifactRecord{
		ID:                  canonical.artifactID + "-v2",
		SourceRevisionID:    secondRevision.ID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           secondArtifactObjectKey,
		SHA256:              hashFingerprintBytes(updatedPDF),
		PageCount:           2,
		SizeBytes:           int64(len(updatedPDF)),
		CompatibilityTier:   string(PDFCompatibilityTierFull),
		NormalizationStatus: string(PDFNormalizationStatusCompleted),
		CreatedAt:           secondRevisionAt,
		UpdatedAt:           secondRevisionAt,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact v2: %v", err)
	}
	fixture.objects.files[secondArtifactObjectKey] = append([]byte{}, updatedPDF...)

	fixture.buildFingerprint(t, canonical)
	fixture.buildFingerprint(t, target)
	if _, err := NewDefaultSourceFingerprintService(fixture.store, fixture.objects).BuildFingerprint(ctx, fixture.scope, SourceFingerprintBuildInput{
		SourceRevisionID: secondRevision.ID,
		ArtifactID:       secondArtifact.ID,
		Metadata:         fixture.metadataBaseline(canonical),
	}); err != nil {
		t.Fatalf("BuildFingerprint canonical v2: %v", err)
	}

	service := NewDefaultSourceReconciliationService(fixture.store, WithSourceReconciliationClock(func() time.Time {
		return fixture.now.Add(4 * time.Hour)
	}))
	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: target.sourceDocumentID,
		SourceRevisionID: target.revisionID,
		ArtifactID:       target.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(target),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates historical revisions: %v", err)
	}
	if len(result.Candidates) != 0 || result.PrimaryCandidate != nil {
		t.Fatalf("expected exact historical artifact match to auto-confirm, got %+v", result)
	}

	relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, target.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListCandidateRelationships historical: %v", err)
	}
	if len(relationships) != 1 {
		t.Fatalf("expected one persisted relationship, got %+v", relationships)
	}
	if relationships[0].Status != stores.SourceRelationshipStatusConfirmed || relationships[0].ConfidenceBand != stores.LineageConfidenceBandExact {
		t.Fatalf("expected confirmed exact relationship from historical revision, got %+v", relationships[0])
	}
	if !strings.Contains(relationships[0].EvidenceJSON, canonical.revisionID) || !strings.Contains(relationships[0].EvidenceJSON, canonical.artifactID) {
		t.Fatalf("expected evidence to reference historical matching revision/artifact, got %s", relationships[0].EvidenceJSON)
	}
}

func TestDefaultSourceReconciliationServiceSkipsLowConfidenceMatches(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()

	left := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "low-confidence-left",
		title:             "Pricing Schedule",
		accountID:         "acct-a",
		externalFileID:    "google-file-a",
		webURL:            "https://docs.google.com/document/d/google-file-a/edit",
		ownerEmail:        "ops@example.com",
		parentID:          "folder-a",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf:               makeTextPDF(t, "Pricing Schedule\n\nSeat pricing starts at 99 USD per month."),
	})
	right := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "low-confidence-right",
		title:             "Security Addendum",
		accountID:         "acct-b",
		externalFileID:    "google-file-b",
		webURL:            "https://docs.google.com/document/d/google-file-b/edit",
		ownerEmail:        "security@example.com",
		parentID:          "folder-b",
		providerRevision:  "v9",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		pdf:               makeTextPDF(t, "Security Addendum\n\nEncryption requirements differ materially from the pricing terms."),
	})

	fixture.buildFingerprint(t, left)
	fixture.buildFingerprint(t, right)

	service := NewDefaultSourceReconciliationService(fixture.store)
	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: right.sourceDocumentID,
		SourceRevisionID: right.revisionID,
		ArtifactID:       right.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(right),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates low confidence: %v", err)
	}
	if len(result.Candidates) != 0 || result.PrimaryCandidate != nil {
		t.Fatalf("expected no candidate warnings for low confidence match, got %+v", result)
	}

	relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, right.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListCandidateRelationships low confidence: %v", err)
	}
	if len(relationships) != 0 {
		t.Fatalf("expected no persisted relationships for low confidence match, got %+v", relationships)
	}
}

func TestDefaultSourceReconciliationServiceDegradesGracefullyWithoutOptionalMetadata(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()

	reference := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "degrade-reference",
		title:             "Order Form",
		accountID:         "acct-reference",
		externalFileID:    "google-file-reference",
		webURL:            "https://docs.google.com/document/d/google-file-reference/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-ops",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf:               makeTextPDF(t, "Order Form\n\nThis order form covers onboarding and renewal terms."),
	})
	target := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "degrade-target",
		title:             "Order Form",
		accountID:         "acct-target",
		externalFileID:    "google-file-target",
		webURL:            "",
		ownerEmail:        "",
		parentID:          "",
		providerRevision:  "v2",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		pdf:               makeTextPDF(t, "ORDER FORM\n\nTHIS ORDER FORM COVERS ONBOARDING AND RENEWAL TERMS."),
	})

	fixture.buildFingerprint(t, reference)
	fixture.buildFingerprint(t, target)

	service := NewDefaultSourceReconciliationService(fixture.store)
	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: target.sourceDocumentID,
		SourceRevisionID: target.revisionID,
		ArtifactID:       target.artifactID,
		ActorID:          "ops-user",
		Metadata: SourceMetadataBaseline{
			TitleHint:         target.title,
			ModifiedTime:      &target.modifiedAt,
			SourceVersionHint: "v2",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
		},
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates degraded metadata: %v", err)
	}
	if len(result.Candidates) != 1 || result.PrimaryCandidate == nil {
		t.Fatalf("expected degraded metadata path to keep candidate creation, got %+v", result)
	}
	if result.PrimaryCandidate.ConfidenceBand != stores.LineageConfidenceBandMedium {
		t.Fatalf("expected degraded optional metadata to remain medium confidence, got %+v", result.PrimaryCandidate)
	}
}

func TestDefaultSourceReconciliationServiceConfirmKeepsAgreementHistoryAndSuppressesWarnings(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()

	canonical := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "confirm-canonical",
		title:             "Vendor MSA",
		accountID:         "acct-a",
		externalFileID:    "google-file-a",
		webURL:            "https://docs.google.com/document/d/google-file-a/edit",
		ownerEmail:        "legal@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		createDocument:    true,
		documentID:        "doc-confirm-canonical",
		documentTitle:     "Vendor MSA",
		pdf: makeTextPDF(t,
			"Vendor MSA\n\nCore terms and conditions.",
			"Appendix\n\nSupport and pricing.",
		),
	})
	duplicate := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "confirm-duplicate",
		title:             "Vendor MSA",
		accountID:         "acct-b",
		externalFileID:    "google-file-b",
		webURL:            "https://docs.google.com/document/d/google-file-b/edit",
		ownerEmail:        "legal@example.com",
		parentID:          "folder-legal",
		providerRevision:  "v2",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		createDocument:    true,
		documentID:        "doc-confirm-duplicate",
		documentTitle:     "Vendor MSA Copy",
		createAgreement:   true,
		agreementID:       "agr-confirm-duplicate",
		agreementTitle:    "Agreement From Duplicate",
		pdf: makeTextPDF(t,
			"VENDOR MSA\n\nCORE TERMS AND CONDITIONS.",
			"APPENDIX\n\nSUPPORT AND PRICING.",
		),
	})

	fixture.buildFingerprint(t, canonical)
	fixture.buildFingerprint(t, duplicate)

	service := NewDefaultSourceReconciliationService(fixture.store)
	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: duplicate.sourceDocumentID,
		SourceRevisionID: duplicate.revisionID,
		ArtifactID:       duplicate.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(duplicate),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates confirm seed: %v", err)
	}
	if len(result.Candidates) != 1 {
		t.Fatalf("expected pending candidate before confirm, got %+v", result)
	}

	relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, duplicate.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListCandidateRelationships confirm: %v", err)
	}
	if len(relationships) != 1 {
		t.Fatalf("expected one candidate relationship, got %+v", relationships)
	}

	summary, err := service.ApplyReviewAction(ctx, fixture.scope, SourceRelationshipReviewInput{
		RelationshipID: relationships[0].ID,
		Action:         SourceRelationshipActionConfirm,
		ActorID:        "ops-approver",
		Reason:         "validated copied-file migration",
	})
	if err != nil {
		t.Fatalf("ApplyReviewAction confirm: %v", err)
	}
	if summary.Status != stores.SourceRelationshipStatusConfirmed {
		t.Fatalf("expected confirmed summary, got %+v", summary)
	}

	reattached, err := fixture.store.GetActiveSourceHandle(ctx, fixture.scope, stores.SourceProviderKindGoogleDrive, duplicate.externalFileID, duplicate.accountID)
	if err != nil {
		t.Fatalf("GetActiveSourceHandle after confirm: %v", err)
	}
	if reattached.SourceDocumentID != canonical.sourceDocumentID {
		t.Fatalf("expected confirmed review to attach duplicate handle to canonical source, got %+v", reattached)
	}

	readModels := NewDefaultSourceReadModelService(fixture.store, fixture.store, fixture.store)
	documentDetail, err := readModels.GetDocumentLineageDetail(ctx, fixture.scope, duplicate.documentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail duplicate after confirm: %v", err)
	}
	if len(documentDetail.CandidateWarningSummary) != 0 {
		t.Fatalf("expected confirmed relationship to suppress document warnings, got %+v", documentDetail.CandidateWarningSummary)
	}

	agreementDetail, err := readModels.GetAgreementLineageDetail(ctx, fixture.scope, duplicate.agreementID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail after confirm: %v", err)
	}
	if agreementDetail.SourceRevision == nil || agreementDetail.SourceRevision.ID != duplicate.revisionID {
		t.Fatalf("expected agreement provenance to remain pinned to historical duplicate revision %q, got %+v", duplicate.revisionID, agreementDetail.SourceRevision)
	}
}

func TestDefaultSourceReconciliationServiceReviewActionsSuppressFutureCandidates(t *testing.T) {
	for _, tc := range []struct {
		name   string
		action string
		status string
	}{
		{name: "reject", action: SourceRelationshipActionReject, status: stores.SourceRelationshipStatusRejected},
		{name: "supersede", action: SourceRelationshipActionSupersede, status: stores.SourceRelationshipStatusSuperseded},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			fixture := newReconciliationFixture()

			reference := fixture.seedSource(t, reconciliationSeedConfig{
				suffix:            tc.name + "-reference",
				title:             "SOW",
				accountID:         "acct-a",
				externalFileID:    "google-file-a-" + tc.name,
				webURL:            "https://docs.google.com/document/d/google-file-a-" + tc.name + "/edit",
				ownerEmail:        "owner@example.com",
				parentID:          "folder-sow",
				providerRevision:  "v1",
				lineageConfidence: stores.LineageConfidenceBandExact,
				pdf:               makeTextPDF(t, "Statement of Work\n\nMilestones and services remain aligned."),
			})
			target := fixture.seedSource(t, reconciliationSeedConfig{
				suffix:            tc.name + "-target",
				title:             "SOW",
				accountID:         "acct-b",
				externalFileID:    "google-file-b-" + tc.name,
				webURL:            "https://docs.google.com/document/d/google-file-b-" + tc.name + "/edit",
				ownerEmail:        "owner@example.com",
				parentID:          "folder-sow",
				providerRevision:  "v2",
				lineageConfidence: stores.LineageConfidenceBandMedium,
				createDocument:    true,
				documentID:        "doc-" + tc.name + "-target",
				documentTitle:     "SOW Copy",
				pdf: makeTextPDF(t,
					"STATEMENT OF WORK\n\nMILESTONES AND SERVICES REMAIN ALIGNED.",
				),
			})

			fixture.buildFingerprint(t, reference)
			fixture.buildFingerprint(t, target)

			service := NewDefaultSourceReconciliationService(fixture.store)
			result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
				SourceDocumentID: target.sourceDocumentID,
				SourceRevisionID: target.revisionID,
				ArtifactID:       target.artifactID,
				ActorID:          "ops-user",
				Metadata:         fixture.metadataBaseline(target),
			})
			if err != nil {
				t.Fatalf("EvaluateCandidates seed: %v", err)
			}
			if len(result.Candidates) != 1 {
				t.Fatalf("expected pending candidate before %s, got %+v", tc.action, result)
			}

			relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, target.sourceDocumentID)
			if err != nil {
				t.Fatalf("ListCandidateRelationships before %s: %v", tc.action, err)
			}
			if len(relationships) != 1 {
				t.Fatalf("expected one candidate relationship, got %+v", relationships)
			}

			if _, err := service.ApplyReviewAction(ctx, fixture.scope, SourceRelationshipReviewInput{
				RelationshipID: relationships[0].ID,
				Action:         tc.action,
				ActorID:        "ops-reviewer",
				Reason:         "operator-reviewed",
			}); err != nil {
				t.Fatalf("ApplyReviewAction %s: %v", tc.action, err)
			}

			replayed, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
				SourceDocumentID: target.sourceDocumentID,
				SourceRevisionID: target.revisionID,
				ArtifactID:       target.artifactID,
				ActorID:          "ops-user",
				Metadata:         fixture.metadataBaseline(target),
			})
			if err != nil {
				t.Fatalf("EvaluateCandidates replay %s: %v", tc.action, err)
			}
			if len(replayed.Candidates) != 0 || replayed.PrimaryCandidate != nil {
				t.Fatalf("expected %s to suppress future pending candidates, got %+v", tc.action, replayed)
			}

			updated, err := service.ListCandidateRelationships(ctx, fixture.scope, target.sourceDocumentID)
			if err != nil {
				t.Fatalf("ListCandidateRelationships replay %s: %v", tc.action, err)
			}
			if len(updated) != 1 || updated[0].Status != tc.status {
				t.Fatalf("expected relationship to remain %q after replay, got %+v", tc.status, updated)
			}

			handle, err := fixture.store.GetActiveSourceHandle(ctx, fixture.scope, stores.SourceProviderKindGoogleDrive, target.externalFileID, target.accountID)
			if err != nil {
				t.Fatalf("GetActiveSourceHandle replay %s: %v", tc.action, err)
			}
			if handle.SourceDocumentID != target.sourceDocumentID {
				t.Fatalf("expected %s to avoid future handle attachment, got %+v", tc.action, handle)
			}

			readModels := NewDefaultSourceReadModelService(fixture.store, fixture.store, fixture.store)
			detail, err := readModels.GetDocumentLineageDetail(ctx, fixture.scope, target.documentID)
			if err != nil {
				t.Fatalf("GetDocumentLineageDetail replay %s: %v", tc.action, err)
			}
			if len(detail.CandidateWarningSummary) != 0 {
				t.Fatalf("expected %s to suppress provenance warnings, got %+v", tc.action, detail.CandidateWarningSummary)
			}
		})
	}
}

func TestDefaultSourceReconciliationServiceReviewActionsRequireTrustedActorID(t *testing.T) {
	ctx := context.Background()
	fixture := newReconciliationFixture()

	reference := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "actor-required-reference",
		title:             "NDA",
		accountID:         "acct-a",
		externalFileID:    "google-file-a-actor-required",
		webURL:            "https://docs.google.com/document/d/google-file-a-actor-required/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-nda",
		providerRevision:  "v1",
		lineageConfidence: stores.LineageConfidenceBandExact,
		pdf:               makeTextPDF(t, "Customer NDA\n\nConfidential obligations remain in force."),
	})
	target := fixture.seedSource(t, reconciliationSeedConfig{
		suffix:            "actor-required-target",
		title:             "NDA",
		accountID:         "acct-b",
		externalFileID:    "google-file-b-actor-required",
		webURL:            "https://docs.google.com/document/d/google-file-b-actor-required/edit",
		ownerEmail:        "owner@example.com",
		parentID:          "folder-nda",
		providerRevision:  "v2",
		lineageConfidence: stores.LineageConfidenceBandMedium,
		createDocument:    true,
		documentID:        "doc-actor-required-target",
		pdf:               makeTextPDF(t, "CUSTOMER NDA\n\nCONFIDENTIAL OBLIGATIONS REMAIN IN FORCE."),
	})

	fixture.buildFingerprint(t, reference)
	fixture.buildFingerprint(t, target)

	service := NewDefaultSourceReconciliationService(fixture.store)
	result, err := service.EvaluateCandidates(ctx, fixture.scope, SourceReconciliationInput{
		SourceDocumentID: target.sourceDocumentID,
		SourceRevisionID: target.revisionID,
		ArtifactID:       target.artifactID,
		ActorID:          "ops-user",
		Metadata:         fixture.metadataBaseline(target),
	})
	if err != nil {
		t.Fatalf("EvaluateCandidates seed: %v", err)
	}
	if len(result.Candidates) != 1 {
		t.Fatalf("expected pending candidate before review, got %+v", result)
	}

	relationships, err := service.ListCandidateRelationships(ctx, fixture.scope, target.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListCandidateRelationships: %v", err)
	}
	if len(relationships) != 1 {
		t.Fatalf("expected one candidate relationship, got %+v", relationships)
	}

	if _, err := service.ApplyReviewAction(ctx, fixture.scope, SourceRelationshipReviewInput{
		RelationshipID: relationships[0].ID,
		Action:         SourceRelationshipActionReject,
		Reason:         "actor missing",
	}); err == nil {
		t.Fatal("expected review action without actor id to fail")
	}
}

func newReconciliationFixture() reconciliationFixture {
	return reconciliationFixture{
		scope: stores.Scope{TenantID: "tenant-reconciliation", OrgID: "org-reconciliation"},
		store: stores.NewInMemoryStore(),
		objects: &fingerprintObjectStoreStub{
			files: map[string][]byte{},
		},
		now: time.Date(2026, time.March, 18, 12, 0, 0, 0, time.UTC),
	}
}

func (f reconciliationFixture) seedSource(t *testing.T, cfg reconciliationSeedConfig) reconciliationSourceSeed {
	t.Helper()
	now := f.now.Add(time.Duration(len(f.objects.files)) * time.Minute)
	document, err := f.store.CreateSourceDocument(context.Background(), f.scope, stores.SourceDocumentRecord{
		ID:                "src-doc-" + cfg.suffix,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    strings.TrimSpace(cfg.title),
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: strings.TrimSpace(cfg.lineageConfidence),
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument %s: %v", cfg.suffix, err)
	}
	validFrom := now
	handle, err := f.store.CreateSourceHandle(context.Background(), f.scope, stores.SourceHandleRecord{
		ID:               "src-handle-" + cfg.suffix,
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   strings.TrimSpace(cfg.externalFileID),
		AccountID:        strings.TrimSpace(cfg.accountID),
		WebURL:           strings.TrimSpace(cfg.webURL),
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &validFrom,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle %s: %v", cfg.suffix, err)
	}
	revision, err := f.store.CreateSourceRevision(context.Background(), f.scope, stores.SourceRevisionRecord{
		ID:                   "src-rev-" + cfg.suffix,
		SourceDocumentID:     document.ID,
		SourceHandleID:       handle.ID,
		ProviderRevisionHint: strings.TrimSpace(cfg.providerRevision),
		ModifiedTime:         &now,
		ExportedAt:           &now,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       GoogleDriveMimeTypeDoc,
		MetadataJSON:         `{"title_hint":"` + strings.TrimSpace(cfg.title) + `","owner_email":"` + strings.TrimSpace(cfg.ownerEmail) + `","parent_id":"` + strings.TrimSpace(cfg.parentID) + `"}`,
		CreatedAt:            now,
		UpdatedAt:            now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision %s: %v", cfg.suffix, err)
	}
	objectKey := "tenant/" + f.scope.TenantID + "/lineage/" + cfg.suffix + ".pdf"
	f.objects.files[objectKey] = append([]byte{}, cfg.pdf...)
	artifact, err := f.store.CreateSourceArtifact(context.Background(), f.scope, stores.SourceArtifactRecord{
		ID:                  "src-art-" + cfg.suffix,
		SourceRevisionID:    revision.ID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           objectKey,
		SHA256:              hashFingerprintBytes(cfg.pdf),
		PageCount:           2,
		SizeBytes:           int64(len(cfg.pdf)),
		CompatibilityTier:   string(PDFCompatibilityTierFull),
		NormalizationStatus: string(PDFNormalizationStatusCompleted),
		CreatedAt:           now,
		UpdatedAt:           now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact %s: %v", cfg.suffix, err)
	}

	seed := reconciliationSourceSeed{
		sourceDocumentID: document.ID,
		handleID:         handle.ID,
		revisionID:       revision.ID,
		artifactID:       artifact.ID,
		accountID:        cfg.accountID,
		externalFileID:   cfg.externalFileID,
		webURL:           cfg.webURL,
		ownerEmail:       cfg.ownerEmail,
		parentID:         cfg.parentID,
		title:            cfg.title,
		modifiedAt:       now,
	}
	if cfg.createDocument {
		documentID := strings.TrimSpace(cfg.documentID)
		if documentID == "" {
			documentID = "doc-" + cfg.suffix
		}
		docSHA := strings.TrimSpace(cfg.documentSHA256)
		if docSHA == "" {
			docSHA = artifact.SHA256
		}
		if _, err := f.store.Create(context.Background(), f.scope, stores.DocumentRecord{
			ID:                     documentID,
			Title:                  firstNonEmpty(strings.TrimSpace(cfg.documentTitle), strings.TrimSpace(cfg.title)),
			SourceOriginalName:     cfg.suffix + ".pdf",
			SourceObjectKey:        objectKey,
			SourceSHA256:           docSHA,
			SourceType:             stores.SourceTypeGoogleDrive,
			SourceGoogleFileID:     cfg.externalFileID,
			SourceGoogleDocURL:     cfg.webURL,
			SourceModifiedTime:     &now,
			SourceExportedAt:       &now,
			SourceExportedByUserID: "fixture-user",
			SourceMimeType:         GoogleDriveMimeTypeDoc,
			SourceIngestionMode:    GoogleIngestionModeExportPDF,
			SourceDocumentID:       document.ID,
			SourceRevisionID:       revision.ID,
			SourceArtifactID:       artifact.ID,
			SizeBytes:              int64(len(cfg.pdf)),
			PageCount:              2,
			CreatedByUserID:        "fixture-user",
			CreatedAt:              now,
			UpdatedAt:              now,
		}); err != nil {
			t.Fatalf("Create document %s: %v", cfg.suffix, err)
		}
		seed.documentID = documentID
	}
	if cfg.createAgreement {
		agreementID := strings.TrimSpace(cfg.agreementID)
		if agreementID == "" {
			agreementID = "agr-" + cfg.suffix
		}
		if _, err := f.store.CreateDraft(context.Background(), f.scope, stores.AgreementRecord{
			ID:                     agreementID,
			DocumentID:             seed.documentID,
			Status:                 stores.AgreementStatusDraft,
			Title:                  firstNonEmpty(strings.TrimSpace(cfg.agreementTitle), "Agreement "+strings.TrimSpace(cfg.title)),
			Version:                1,
			SourceType:             stores.SourceTypeGoogleDrive,
			SourceGoogleFileID:     cfg.externalFileID,
			SourceGoogleDocURL:     cfg.webURL,
			SourceModifiedTime:     &now,
			SourceExportedAt:       &now,
			SourceExportedByUserID: "fixture-user",
			SourceMimeType:         GoogleDriveMimeTypeDoc,
			SourceIngestionMode:    GoogleIngestionModeExportPDF,
			SourceRevisionID:       revision.ID,
			CreatedByUserID:        "fixture-user",
			UpdatedByUserID:        "fixture-user",
			CreatedAt:              now,
			UpdatedAt:              now,
		}); err != nil {
			t.Fatalf("Create agreement %s: %v", cfg.suffix, err)
		}
		seed.agreementID = agreementID
	}
	return seed
}

func (f reconciliationFixture) buildFingerprint(t *testing.T, seed reconciliationSourceSeed) {
	t.Helper()
	service := NewDefaultSourceFingerprintService(f.store, f.objects)
	result, err := service.BuildFingerprint(context.Background(), f.scope, SourceFingerprintBuildInput{
		SourceRevisionID: seed.revisionID,
		ArtifactID:       seed.artifactID,
		Metadata:         f.metadataBaseline(seed),
	})
	if err != nil {
		t.Fatalf("BuildFingerprint %s: %v", seed.sourceDocumentID, err)
	}
	if result.Status.Status != LineageFingerprintStatusReady {
		t.Fatalf("expected ready fingerprint for %s, got %+v", seed.sourceDocumentID, result.Status)
	}
}

func (f reconciliationFixture) metadataBaseline(seed reconciliationSourceSeed) SourceMetadataBaseline {
	return SourceMetadataBaseline{
		AccountID:           strings.TrimSpace(seed.accountID),
		ExternalFileID:      strings.TrimSpace(seed.externalFileID),
		WebURL:              strings.TrimSpace(seed.webURL),
		ModifiedTime:        &seed.modifiedAt,
		SourceVersionHint:   "baseline-" + strings.TrimSpace(seed.revisionID),
		SourceMimeType:      GoogleDriveMimeTypeDoc,
		SourceIngestionMode: GoogleIngestionModeExportPDF,
		TitleHint:           strings.TrimSpace(seed.title),
		PageCountHint:       2,
		OwnerEmail:          strings.TrimSpace(seed.ownerEmail),
		ParentID:            strings.TrimSpace(seed.parentID),
	}
}
