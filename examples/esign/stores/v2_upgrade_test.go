package stores

import (
	"context"
	"testing"
	"time"
)

func TestUpgradeDraftAgreementToV2NormalizesSignerStagesAndRequiredPlacements(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()

	doc, err := store.Create(ctx, scope, DocumentRecord{
		ID:              "doc-v2-upgrade",
		Title:           "Upgrade",
		SourceObjectKey: "tenant/tenant-1/org/org-1/docs/source.pdf",
		SourceSHA256:    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		SizeBytes:       1024,
		PageCount:       1,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		ID:         "agreement-v2-upgrade",
		DocumentID: doc.ID,
		Status:     AgreementStatusDraft,
		Title:      "Upgrade",
		Version:    1,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	signerOne, err := store.UpsertParticipantDraft(ctx, scope, agreement.ID, ParticipantDraftPatch{
		ID:           "participant-1",
		Email:        v2StringPtr("signer1@example.com"),
		Role:         v2StringPtr(RecipientRoleSigner),
		SigningStage: v2IntPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertParticipantDraft signerOne: %v", err)
	}
	if _, err := store.UpsertParticipantDraft(ctx, scope, agreement.ID, ParticipantDraftPatch{
		ID:           "participant-2",
		Email:        v2StringPtr("signer2@example.com"),
		Role:         v2StringPtr(RecipientRoleSigner),
		SigningStage: v2IntPtr(3),
	}, 0); err != nil {
		t.Fatalf("UpsertParticipantDraft signerTwo: %v", err)
	}
	if _, err := store.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, FieldDefinitionDraftPatch{
		ID:            "field-def-upgrade",
		ParticipantID: &signerOne.ID,
		Type:          v2StringPtr(FieldTypeSignature),
		Required:      v2BoolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft: %v", err)
	}

	report, err := UpgradeDraftAgreementToV2(ctx, store, scope, agreement.ID)
	if err != nil {
		t.Fatalf("UpgradeDraftAgreementToV2: %v", err)
	}
	if !report.Upgraded {
		t.Fatalf("expected upgrade actions, got report %+v", report)
	}

	participants, err := store.ListParticipants(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListParticipants: %v", err)
	}
	if len(participants) != 2 {
		t.Fatalf("expected 2 participants, got %d", len(participants))
	}
	if participants[0].SigningStage != 1 || participants[1].SigningStage != 2 {
		t.Fatalf("expected contiguous signing stages [1,2], got [%d,%d]", participants[0].SigningStage, participants[1].SigningStage)
	}

	instances, err := store.ListFieldInstances(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFieldInstances: %v", err)
	}
	if len(instances) != 1 {
		t.Fatalf("expected upgrade to create one field instance, got %d", len(instances))
	}
	if instances[0].FieldDefinitionID != "field-def-upgrade" {
		t.Fatalf("expected instance bound to field-def-upgrade, got %q", instances[0].FieldDefinitionID)
	}
}

func TestUpgradeDraftAgreementToV2RejectsNonDraftAgreement(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()

	doc, err := store.Create(ctx, scope, DocumentRecord{
		ID:              "doc-v2-upgrade-2",
		Title:           "Upgrade",
		SourceObjectKey: "tenant/tenant-1/org/org-1/docs/source.pdf",
		SourceSHA256:    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		SizeBytes:       1024,
		PageCount:       1,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		ID:         "agreement-v2-upgrade-2",
		DocumentID: doc.ID,
		Status:     AgreementStatusDraft,
		Version:    1,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	if _, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{ToStatus: AgreementStatusSent, ExpectedVersion: agreement.Version}); err != nil {
		t.Fatalf("Transition: %v", err)
	}

	report, err := UpgradeDraftAgreementToV2(ctx, store, scope, agreement.ID)
	if err != nil {
		t.Fatalf("UpgradeDraftAgreementToV2: %v", err)
	}
	if report.Upgraded {
		t.Fatalf("expected non-draft agreement not to be upgraded, got %+v", report)
	}
	if len(report.Issues) == 0 {
		t.Fatalf("expected non-draft issue in report")
	}
}

func v2StringPtr(v string) *string { return &v }
func v2IntPtr(v int) *int          { return &v }
func v2BoolPtr(v bool) *bool       { return &v }
