package services

import (
	"context"
	"sort"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestDraftServiceSendRollbackKeepsDraftWhenValidationFails(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Rollback Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-rollback/source.pdf",
		PDF:       GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	draftSvc := NewDraftService(store, WithDraftAgreementService(agreementSvc))
	state := map[string]any{
		"document": map[string]any{"id": doc.ID},
		"details":  map[string]any{"title": "Rollback Draft"},
		// No participants/fields: send must fail validation.
	}

	draft, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-rollback-1",
		WizardState:     state,
		Title:           "Rollback Draft",
		CurrentStep:     6,
		DocumentID:      doc.ID,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if replay {
		t.Fatalf("expected first create replay=false")
	}

	if _, err := draftSvc.Send(ctx, scope, draft.ID, DraftSendInput{
		ExpectedRevision: draft.Revision,
		CreatedByUserID:  "author-1",
	}); err == nil {
		t.Fatalf("expected send to fail validation")
	}

	if _, err := draftSvc.Get(ctx, scope, draft.ID, "author-1"); err != nil {
		t.Fatalf("expected draft to remain after failed send, got %v", err)
	}

	agreements, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("ListAgreements: %v", err)
	}
	if len(agreements) != 0 {
		t.Fatalf("expected no agreements persisted on failed send, got %d", len(agreements))
	}
}

func TestDraftServiceCreateReplayRefreshesExpiryAndCleanup(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	ttl := 2 * time.Hour
	now := time.Date(2026, 2, 16, 10, 0, 0, 0, time.UTC)
	clock := now
	draftSvc := NewDraftService(store,
		WithDraftClock(func() time.Time { return clock }),
		WithDraftTTL(ttl),
		WithDraftAgreementService(NewAgreementService(store)),
	)

	baseState := map[string]any{
		"details": map[string]any{"title": "Expiry Draft"},
	}

	created, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-expiry-1",
		WizardState:     baseState,
		Title:           "Expiry Draft",
		CurrentStep:     2,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if replay {
		t.Fatalf("expected initial create replay=false")
	}
	expectedCreateExpiry := now.Add(ttl).UTC()
	if !created.ExpiresAt.Equal(expectedCreateExpiry) {
		t.Fatalf("expected create expires_at=%s, got %s", expectedCreateExpiry.Format(time.RFC3339Nano), created.ExpiresAt.Format(time.RFC3339Nano))
	}

	clock = now.Add(45 * time.Minute).UTC()
	replayed, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-expiry-1",
		WizardState:     baseState,
		Title:           "Expiry Draft",
		CurrentStep:     2,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create replay: %v", err)
	}
	if !replay {
		t.Fatalf("expected replay create replay=true")
	}
	expectedReplayExpiry := clock.Add(ttl).UTC()
	if !replayed.ExpiresAt.Equal(expectedReplayExpiry) {
		t.Fatalf("expected replay expires_at=%s, got %s", expectedReplayExpiry.Format(time.RFC3339Nano), replayed.ExpiresAt.Format(time.RFC3339Nano))
	}

	clock = expectedReplayExpiry.Add(time.Minute)
	deleted, err := draftSvc.CleanupExpiredDrafts(ctx, clock)
	if err != nil {
		t.Fatalf("CleanupExpiredDrafts: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("expected one expired draft deleted, got %d", deleted)
	}
	if _, err := draftSvc.Get(ctx, scope, created.ID, "author-1"); err == nil {
		t.Fatalf("expected cleaned-up draft to be unavailable")
	}
}

func TestDraftServiceSendExpandsFieldRules(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Rules Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-rules/source.pdf",
		PDF:       GenerateDeterministicPDF(3),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	draftSvc := NewDraftService(store, WithDraftAgreementService(agreementSvc))
	state := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 3,
		},
		"details": map[string]any{"title": "Rules Draft"},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "John Doe",
				"email":  "john@example.com",
				"role":   "signer",
				"order":  1,
			},
		},
		"fieldRules": []map[string]any{
			{
				"type":              "initials_each_page",
				"participantTempId": "participant-1",
				"excludeLastPage":   true,
			},
			{
				"type":              "signature_once",
				"participantTempId": "participant-1",
			},
		},
	}

	draft, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-rules-1",
		WizardState:     state,
		Title:           "Rules Draft",
		CurrentStep:     6,
		DocumentID:      doc.ID,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if replay {
		t.Fatalf("expected initial create replay=false")
	}

	sendResult, err := draftSvc.Send(ctx, scope, draft.ID, DraftSendInput{
		ExpectedRevision: draft.Revision,
		CreatedByUserID:  "author-1",
	})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	if sendResult.AgreementID == "" {
		t.Fatalf("expected agreement id")
	}

	definitions, err := store.ListFieldDefinitions(ctx, scope, sendResult.AgreementID)
	if err != nil {
		t.Fatalf("ListFieldDefinitions: %v", err)
	}
	definitionTypeByID := map[string]string{}
	for _, definition := range definitions {
		definitionTypeByID[definition.ID] = definition.Type
	}

	instances, err := store.ListFieldInstances(ctx, scope, sendResult.AgreementID)
	if err != nil {
		t.Fatalf("ListFieldInstances: %v", err)
	}
	if len(instances) != 3 {
		t.Fatalf("expected 3 generated instances, got %d", len(instances))
	}
	sort.Slice(instances, func(i, j int) bool {
		return instances[i].TabIndex < instances[j].TabIndex
	})
	if definitionTypeByID[instances[0].FieldDefinitionID] != stores.FieldTypeInitials || instances[0].PageNumber != 1 {
		t.Fatalf("expected first instance initials on page 1, got type=%s page=%d", definitionTypeByID[instances[0].FieldDefinitionID], instances[0].PageNumber)
	}
	if definitionTypeByID[instances[1].FieldDefinitionID] != stores.FieldTypeInitials || instances[1].PageNumber != 2 {
		t.Fatalf("expected second instance initials on page 2, got type=%s page=%d", definitionTypeByID[instances[1].FieldDefinitionID], instances[1].PageNumber)
	}
	if definitionTypeByID[instances[2].FieldDefinitionID] != stores.FieldTypeSignature || instances[2].PageNumber != 3 {
		t.Fatalf("expected third instance signature on page 3, got type=%s page=%d", definitionTypeByID[instances[2].FieldDefinitionID], instances[2].PageNumber)
	}
	if instances[0].TabIndex != 1 || instances[1].TabIndex != 2 || instances[2].TabIndex != 3 {
		t.Fatalf("expected deterministic tab indexes 1..3, got [%d,%d,%d]", instances[0].TabIndex, instances[1].TabIndex, instances[2].TabIndex)
	}
}
