package release

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRunLineageValidationProfileCoversSlice4Contracts(t *testing.T) {
	result, err := RunLineageValidationProfile(context.Background(), LineageValidationConfig{})
	if err != nil {
		t.Fatalf("RunLineageValidationProfile: %v", err)
	}
	if !result.BootstrapValidated {
		t.Fatalf("expected bootstrap validation, got %+v", result)
	}
	if !result.ImportLineageLinked {
		t.Fatalf("expected google import lineage linkage, got %+v", result)
	}
	if !result.ReimportReusedRevision {
		t.Fatalf("expected unchanged re-import revision reuse, got %+v", result)
	}
	if !result.ChangedSourceCreatedNewRevision {
		t.Fatalf("expected changed-source revision creation, got %+v", result)
	}
	if !result.LaterAgreementPinnedLatest {
		t.Fatalf("expected later agreement provenance propagation, got %+v", result)
	}
	if result.FingerprintStatus != services.LineageFingerprintStatusReady {
		t.Fatalf("expected ready fingerprint generation, got %+v", result)
	}
	if !result.CandidateCreated {
		t.Fatalf("expected candidate creation coverage, got %+v", result)
	}
	if result.CandidateRelationshipID == "" {
		t.Fatalf("expected candidate relationship id, got %+v", result)
	}
	if !result.CandidateReviewActionApplied {
		t.Fatalf("expected candidate review action coverage, got %+v", result)
	}
	if result.CandidateRelationshipFinalStatus != stores.SourceRelationshipStatusRejected {
		t.Fatalf("expected rejected candidate review outcome, got %+v", result)
	}
	if !result.CandidateWarningsVisibleBefore || !result.CandidateWarningsSuppressedAfter {
		t.Fatalf("expected candidate warning transition coverage, got %+v", result)
	}
	if !result.DocumentDetailContractStable {
		t.Fatalf("expected stable document detail contract, got %+v", result)
	}
	if !result.AgreementDetailContractStable {
		t.Fatalf("expected stable agreement detail contract, got %+v", result)
	}
	if result.SourceDocumentID == "" || result.PinnedAgreementSourceRevisionID == "" || result.LatestSourceRevisionID == "" {
		t.Fatalf("expected lineage identifiers in validation result, got %+v", result)
	}
	if result.PinnedAgreementSourceRevisionID == result.LatestSourceRevisionID {
		t.Fatalf("expected imported agreement to stay pinned to older revision, got %+v", result)
	}
}
