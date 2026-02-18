package services

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

type placementObjectStoreStub struct {
	files map[string][]byte
}

func (s *placementObjectStoreStub) GetFile(_ context.Context, path string) ([]byte, error) {
	if s == nil || s.files == nil {
		return nil, context.Canceled
	}
	raw, ok := s.files[strings.TrimSpace(path)]
	if !ok {
		return nil, context.Canceled
	}
	return append([]byte{}, raw...), nil
}

func (s *placementObjectStoreStub) UploadFile(_ context.Context, path string, content []byte, _ ...uploader.UploadOption) (string, error) {
	if s.files == nil {
		s.files = map[string][]byte{}
	}
	key := strings.TrimSpace(path)
	s.files[key] = append([]byte{}, content...)
	return key, nil
}

func TestAgreementServiceRunAutoPlacementPersistsRunAndAudit(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &placementObjectStoreStub{files: map[string][]byte{}}

	docSvc := NewDocumentService(store,
		WithDocumentClock(func() time.Time { return time.Date(2026, 2, 16, 9, 0, 0, 0, time.UTC) }),
		WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Placement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/placement/source.pdf",
		PDF:       GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	svc := NewAgreementService(store, WithAgreementPlacementObjectStore(objectStore))
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Placement Draft",
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	participant, err := svc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningStage: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertParticipantDraft: %v", err)
	}
	fieldType := stores.FieldTypeSignature
	required := true
	_, err = svc.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
		ParticipantID: &participant.ID,
		Type:          &fieldType,
		Required:      &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft: %v", err)
	}

	runResult, err := svc.RunAutoPlacement(ctx, scope, agreement.ID, AutoPlacementRunInput{UserID: "author-1"})
	if err != nil {
		t.Fatalf("RunAutoPlacement: %v", err)
	}
	if runResult.Run.ID == "" {
		t.Fatal("expected persisted placement run id")
	}
	if len(runResult.Run.Suggestions) == 0 {
		t.Fatal("expected placement suggestions in persisted run")
	}
	if runResult.Run.Status == "" {
		t.Fatal("expected placement run status")
	}

	fetched, err := svc.GetPlacementRun(ctx, scope, agreement.ID, runResult.Run.ID)
	if err != nil {
		t.Fatalf("GetPlacementRun: %v", err)
	}
	if fetched.ID != runResult.Run.ID {
		t.Fatalf("expected placement run id %q, got %q", runResult.Run.ID, fetched.ID)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if event.EventType == "agreement.placement_run_created" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected agreement.placement_run_created audit event, got %+v", events)
	}
}

func TestAgreementServiceApplyPlacementRunCreatesInstancesAndManualOverrides(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &placementObjectStoreStub{files: map[string][]byte{}}

	docSvc := NewDocumentService(store,
		WithDocumentClock(func() time.Time { return time.Date(2026, 2, 16, 9, 0, 0, 0, time.UTC) }),
		WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Placement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/placement/source.pdf",
		PDF:       GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	svc := NewAgreementService(store, WithAgreementPlacementObjectStore(objectStore))
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Placement Draft",
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	participant, err := svc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningStage: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertParticipantDraft: %v", err)
	}
	signatureType := stores.FieldTypeSignature
	required := true
	signatureDef, err := svc.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
		ParticipantID: &participant.ID,
		Type:          &signatureType,
		Required:      &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft signature: %v", err)
	}
	nameType := stores.FieldTypeName
	nameDef, err := svc.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
		ParticipantID: &participant.ID,
		Type:          &nameType,
		Required:      &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft name: %v", err)
	}

	runResult, err := svc.RunAutoPlacement(ctx, scope, agreement.ID, AutoPlacementRunInput{UserID: "author-1"})
	if err != nil {
		t.Fatalf("RunAutoPlacement: %v", err)
	}
	if len(runResult.Run.Suggestions) == 0 {
		t.Fatal("expected placement suggestions")
	}

	selectedSuggestionID := runResult.Run.Suggestions[0].ID
	for _, suggestion := range runResult.Run.Suggestions {
		if suggestion.FieldDefinitionID == signatureDef.ID {
			selectedSuggestionID = suggestion.ID
			break
		}
	}
	applyResult, err := svc.ApplyPlacementRun(ctx, scope, agreement.ID, runResult.Run.ID, ApplyPlacementRunInput{
		UserID:        "author-1",
		SuggestionIDs: []string{selectedSuggestionID},
		ManualOverrides: []ManuallyPlacedField{
			{
				FieldDefinitionID: nameDef.ID,
				PageNumber:        1,
				X:                 40,
				Y:                 180,
				Width:             200,
				Height:            30,
				Label:             "Signer Name",
			},
		},
	})
	if err != nil {
		t.Fatalf("ApplyPlacementRun: %v", err)
	}
	if applyResult.Run.ID != runResult.Run.ID {
		t.Fatalf("expected run id %q, got %q", runResult.Run.ID, applyResult.Run.ID)
	}
	if applyResult.Run.ManualOverrideCount != 1 {
		t.Fatalf("expected manual_override_count=1, got %d", applyResult.Run.ManualOverrideCount)
	}
	if len(applyResult.AppliedInstances) < 2 {
		t.Fatalf("expected at least two applied instances, got %d", len(applyResult.AppliedInstances))
	}

	instances, err := svc.ListFieldInstances(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFieldInstances: %v", err)
	}
	if len(instances) != 2 {
		t.Fatalf("expected 2 field instances after apply, got %d", len(instances))
	}
	instanceByDefinition := map[string]stores.FieldInstanceRecord{}
	for _, instance := range instances {
		instanceByDefinition[instance.FieldDefinitionID] = instance
	}
	if instanceByDefinition[signatureDef.ID].PlacementSource != stores.PlacementSourceAuto {
		t.Fatalf("expected signature field placement source auto, got %+v", instanceByDefinition[signatureDef.ID])
	}
	if instanceByDefinition[nameDef.ID].PlacementSource != stores.PlacementSourceManual {
		t.Fatalf("expected name field placement source manual, got %+v", instanceByDefinition[nameDef.ID])
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if event.EventType == "agreement.placement_run_applied" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected agreement.placement_run_applied audit event, got %+v", events)
	}
}
