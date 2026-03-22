package stores

import (
	"reflect"
	"testing"
)

func TestLineageVocabularyConstantsRemainCanonical(t *testing.T) {
	if SourceProviderKindGoogleDrive != "google_drive" {
		t.Fatalf("unexpected provider kind: %q", SourceProviderKindGoogleDrive)
	}
	if SourceProviderKindOneDrive != "onedrive" || SourceProviderKindDropbox != "dropbox" || SourceProviderKindBox != "box" || SourceProviderKindLocal != "local" {
		t.Fatalf("unexpected secondary provider kinds")
	}
	if SourceHandleStatusActive != "active" || SourceHandleStatusSuperseded != "superseded" || SourceHandleStatusSuspectedDuplicate != "suspected_duplicate" {
		t.Fatalf("unexpected handle statuses")
	}
	if SourceArtifactKindSignablePDF != "signable_pdf" || SourceArtifactKindPreviewPDF != "preview_pdf" || SourceArtifactKindHTMLSnapshot != "html_snapshot" || SourceArtifactKindTextExtract != "text_extract" {
		t.Fatalf("unexpected artifact kinds")
	}
	if SourceRelationshipStatusPendingReview != "pending_review" || SourceRelationshipStatusConfirmed != "confirmed" || SourceRelationshipStatusRejected != "rejected" || SourceRelationshipStatusSuperseded != "superseded" {
		t.Fatalf("unexpected relationship statuses")
	}
	if SourceCommentThreadStatusOpen != "open" || SourceCommentThreadStatusResolved != "resolved" || SourceCommentThreadStatusDeleted != "deleted" {
		t.Fatalf("unexpected source comment thread statuses")
	}
	if SourceCommentMessageKindComment != "comment" || SourceCommentMessageKindReply != "reply" || SourceCommentMessageKindSystem != "system" {
		t.Fatalf("unexpected source comment message kinds")
	}
	if SourceCommentAnchorKindDocument != "document" || SourceCommentAnchorKindPage != "page" || SourceCommentAnchorKindTextRange != "text_range" {
		t.Fatalf("unexpected source comment anchor kinds")
	}
	if SourceCommentAuthorTypeUser != "user" || SourceCommentAuthorTypeSystem != "system" || SourceCommentAuthorTypeUnknown != "unknown" {
		t.Fatalf("unexpected source comment author types")
	}
	if SourceCommentSyncStatusNotConfigured != "not_configured" || SourceCommentSyncStatusPending != "pending_sync" || SourceCommentSyncStatusSynced != "synced" || SourceCommentSyncStatusFailed != "failed" || SourceCommentSyncStatusStale != "stale" {
		t.Fatalf("unexpected source comment sync statuses")
	}
	if SourceSearchResultKindSourceDocument != "source_document" || SourceSearchResultKindSourceRevision != "source_revision" {
		t.Fatalf("unexpected source search result kinds")
	}
	if LineageConfidenceBandExact != "exact" || LineageConfidenceBandHigh != "high" || LineageConfidenceBandMedium != "medium" || LineageConfidenceBandLow != "low" || LineageConfidenceBandNone != "none" {
		t.Fatalf("unexpected confidence bands")
	}
	if SourceExtractVersionPDFTextV1 != "v1_pdf_text" {
		t.Fatalf("unexpected extract version: %q", SourceExtractVersionPDFTextV1)
	}
}

func TestLineageLinkageFieldsExistOnDocumentAndAgreementRecords(t *testing.T) {
	documentType := reflect.TypeFor[DocumentRecord]()
	for _, field := range []string{"SourceDocumentID", "SourceRevisionID", "SourceArtifactID"} {
		if _, ok := documentType.FieldByName(field); !ok {
			t.Fatalf("document record missing linkage field %s", field)
		}
	}

	agreementType := reflect.TypeFor[AgreementRecord]()
	if _, ok := agreementType.FieldByName("SourceRevisionID"); !ok {
		t.Fatalf("agreement record missing SourceRevisionID linkage field")
	}
}
