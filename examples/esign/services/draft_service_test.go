package services

import (
	"context"
	"encoding/json"
	"errors"
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

func TestDraftServiceSendDefersEmailHooksUntilOutermostCommit(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := newTxCommitErrorStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Deferred Hooks Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-deferred-hooks/source.pdf",
		PDF:       GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	workflow := &stubAgreementEmailWorkflow{}
	agreementSvc := NewAgreementService(store, WithAgreementEmailWorkflow(workflow))
	draftSvc := NewDraftService(store, WithDraftAgreementService(agreementSvc))
	state := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 1,
		},
		"details": map[string]any{
			"title": "Deferred Hooks Draft",
		},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "Alice Doe",
				"email":  "alice@example.com",
				"role":   "signer",
				"order":  1,
			},
		},
		"fieldDefinitions": []map[string]any{
			{
				"tempId":            "field-1",
				"type":              "signature",
				"participantTempId": "participant-1",
				"required":          true,
				"page":              1,
				"label":             "Signer Signature",
			},
		},
		"fieldPlacements": []map[string]any{
			{
				"fieldTempId": "field-1",
				"page":        1,
				"x":           72,
				"y":           128,
				"width":       180,
				"height":      32,
			},
		},
	}

	draft, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-deferred-hooks-1",
		WizardState:     state,
		Title:           "Deferred Hooks Draft",
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

	sentinel := errors.New("commit flush sentinel")
	store.err = sentinel
	if _, err := draftSvc.Send(ctx, scope, draft.ID, DraftSendInput{
		ExpectedRevision: draft.Revision,
		CreatedByUserID:  "author-1",
	}); !errors.Is(err, sentinel) {
		t.Fatalf("expected commit sentinel error, got %v", err)
	}
	if workflow.sentCalls != 0 {
		t.Fatalf("expected email hooks to be deferred/skipped on commit failure, got %d calls", workflow.sentCalls)
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

func TestDraftServiceSendPropagatesIPAddressToAgreementAudit(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "IP Propagation Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-ip/source.pdf",
		PDF:       GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	draftSvc := NewDraftService(store, WithDraftAgreementService(agreementSvc))
	state := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 1,
		},
		"details": map[string]any{"title": "IP Propagation Draft"},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "Jane Doe",
				"email":  "jane@example.com",
				"role":   "signer",
				"order":  1,
			},
		},
		"fieldRules": []map[string]any{
			{
				"type":              "signature_once",
				"participantTempId": "participant-1",
			},
		},
	}

	draft, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-ip-propagation-1",
		WizardState:     state,
		Title:           "IP Propagation Draft",
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
		IPAddress:        "198.51.100.77:8443",
	})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}

	events, err := store.ListForAgreement(ctx, scope, sendResult.AgreementID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected agreement audit events")
	}

	seen := map[string]string{}
	for _, event := range events {
		if event.EventType == "agreement.created" || event.EventType == "agreement.sent" {
			seen[event.EventType] = event.IPAddress
		}
	}
	if seen["agreement.created"] != "198.51.100.77" {
		t.Fatalf("expected agreement.created ip to be propagated, got %q", seen["agreement.created"])
	}
	if seen["agreement.sent"] != "198.51.100.77" {
		t.Fatalf("expected agreement.sent ip to be propagated, got %q", seen["agreement.sent"])
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

func TestDraftServiceSendUsesRuleIDAndDefinitionIDPlacements(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Rules Placement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-rules-placement/source.pdf",
		PDF:       GenerateDeterministicPDF(4),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	draftSvc := NewDraftService(store, WithDraftAgreementService(agreementSvc))
	state := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 4,
		},
		"details": map[string]any{"title": "Rules Placement Draft"},
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
				"id":                "custom-initials",
				"type":              "initials_each_page",
				"participantTempId": "participant-1",
				"fromPage":          1,
				"toPage":            4,
				"excludeLastPage":   true,
			},
			{
				"id":                "custom-signature",
				"type":              "signature_once",
				"participantTempId": "participant-1",
				"page":              4,
			},
		},
		"fieldPlacements": []map[string]any{
			{"definitionId": "custom-initials-initials-1", "page": 1, "x": 101, "y": 111, "width": 80, "height": 40},
			{"definitionId": "custom-initials-initials-2", "page": 2, "x": 202, "y": 222, "width": 80, "height": 40},
			{"definitionId": "custom-initials-initials-3", "page": 3, "x": 303, "y": 333, "width": 80, "height": 40},
			{"definitionId": "custom-signature-signature-4", "page": 4, "x": 404, "y": 444, "width": 200, "height": 50},
		},
	}

	draft, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-rules-placement-1",
		WizardState:     state,
		Title:           "Rules Placement Draft",
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
	if len(instances) != 4 {
		t.Fatalf("expected 4 generated instances, got %d", len(instances))
	}

	type expectedPlacement struct {
		fieldType string
		x         float64
		y         float64
	}
	expectedByPage := map[int]expectedPlacement{
		1: {fieldType: stores.FieldTypeInitials, x: 101, y: 111},
		2: {fieldType: stores.FieldTypeInitials, x: 202, y: 222},
		3: {fieldType: stores.FieldTypeInitials, x: 303, y: 333},
		4: {fieldType: stores.FieldTypeSignature, x: 404, y: 444},
	}

	for _, instance := range instances {
		expected, ok := expectedByPage[instance.PageNumber]
		if !ok {
			t.Fatalf("unexpected field instance page %d", instance.PageNumber)
		}
		if got := definitionTypeByID[instance.FieldDefinitionID]; got != expected.fieldType {
			t.Fatalf("expected page %d field type %q, got %q", instance.PageNumber, expected.fieldType, got)
		}
		if instance.X != expected.x || instance.Y != expected.y {
			t.Fatalf("expected page %d placement x/y=(%.0f,%.0f), got (%.0f,%.0f)", instance.PageNumber, expected.x, expected.y, instance.X, instance.Y)
		}
	}
}

func TestDraftServiceCreateNormalizesWizardPagesToDocumentBounds(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Normalization Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-normalization/source.pdf",
		PDF:       GenerateDeterministicPDF(3),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	draftSvc := NewDraftService(store, WithDraftAgreementService(NewAgreementService(store)))
	state := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 999,
		},
		"details": map[string]any{"title": "Normalization Draft"},
		"fieldDefinitions": []map[string]any{
			{"page": 99},
			{"page": -2},
		},
		"fieldPlacements": []map[string]any{
			{"field_definition_id": "f1", "page": 0},
			{"field_definition_id": "f2", "page": -4},
			{"field_definition_id": "f3", "page": 12},
		},
		"fieldRules": []map[string]any{
			{
				"type":         "signature_once",
				"page":         -7,
				"toPage":       12,
				"excludePages": []any{-1, 2, 90},
			},
			{
				"type":         "initials_each_page",
				"fromPage":     -9,
				"toPage":       42,
				"excludePages": "0,2,100",
			},
		},
	}

	record, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-normalization-create-1",
		WizardState:     state,
		Title:           "Normalization Draft",
		CurrentStep:     4,
		DocumentID:      doc.ID,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if replay {
		t.Fatalf("expected replay=false on first create")
	}

	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(record.WizardStateJSON), &decoded); err != nil {
		t.Fatalf("unmarshal wizard_state: %v", err)
	}
	document, ok := decoded["document"].(map[string]any)
	if !ok {
		t.Fatalf("expected document object, got %#v", decoded["document"])
	}
	if got := int(document["pageCount"].(float64)); got != 3 {
		t.Fatalf("expected normalized document.pageCount=3, got %d", got)
	}

	fieldDefinitions := decoded["fieldDefinitions"].([]any)
	if got := int(fieldDefinitions[0].(map[string]any)["page"].(float64)); got != 3 {
		t.Fatalf("expected fieldDefinitions[0].page clamped to 3, got %d", got)
	}
	if got := int(fieldDefinitions[1].(map[string]any)["page"].(float64)); got != 1 {
		t.Fatalf("expected fieldDefinitions[1].page clamped to 1, got %d", got)
	}

	fieldPlacements := decoded["fieldPlacements"].([]any)
	if got := int(fieldPlacements[0].(map[string]any)["page"].(float64)); got != 1 {
		t.Fatalf("expected fieldPlacements[0].page clamped to 1, got %d", got)
	}
	if got := int(fieldPlacements[1].(map[string]any)["page"].(float64)); got != 1 {
		t.Fatalf("expected fieldPlacements[1].page clamped to 1, got %d", got)
	}
	if got := int(fieldPlacements[2].(map[string]any)["page"].(float64)); got != 3 {
		t.Fatalf("expected fieldPlacements[2].page clamped to 3, got %d", got)
	}

	fieldRules := decoded["fieldRules"].([]any)
	firstRule := fieldRules[0].(map[string]any)
	if got := int(firstRule["page"].(float64)); got != 1 {
		t.Fatalf("expected fieldRules[0].page clamped to 1, got %d", got)
	}
	if got := int(firstRule["toPage"].(float64)); got != 3 {
		t.Fatalf("expected fieldRules[0].toPage clamped to 3, got %d", got)
	}
	excludePages := firstRule["excludePages"].([]any)
	if len(excludePages) != 2 || int(excludePages[0].(float64)) != 2 || int(excludePages[1].(float64)) != 3 {
		t.Fatalf("expected fieldRules[0].excludePages normalized to [2,3], got %#v", excludePages)
	}
}

func TestDraftServiceUpdateNormalizesWizardPagesToDocumentBounds(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Normalization Update Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-normalization-update/source.pdf",
		PDF:       GenerateDeterministicPDF(2),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	draftSvc := NewDraftService(store, WithDraftAgreementService(NewAgreementService(store)))
	initialState := map[string]any{
		"document": map[string]any{
			"id": doc.ID,
		},
		"details": map[string]any{"title": "Normalization Update"},
	}
	record, replay, err := draftSvc.Create(ctx, scope, DraftCreateInput{
		WizardID:        "wiz-normalization-update-1",
		WizardState:     initialState,
		Title:           "Normalization Update",
		CurrentStep:     2,
		DocumentID:      doc.ID,
		CreatedByUserID: "author-1",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if replay {
		t.Fatalf("expected replay=false on first create")
	}

	updateState := map[string]any{
		"document": map[string]any{
			"id":        doc.ID,
			"pageCount": 99,
		},
		"details": map[string]any{"title": "Normalization Update"},
		"fieldRules": []map[string]any{
			{
				"type":         "initials_each_page",
				"fromPage":     -5,
				"toPage":       9,
				"excludePages": []any{-1, 2, 99},
			},
		},
	}

	updated, err := draftSvc.Update(ctx, scope, record.ID, DraftUpdateInput{
		ExpectedRevision: record.Revision,
		WizardState:      updateState,
		Title:            "Normalization Update",
		CurrentStep:      4,
		DocumentID:       &doc.ID,
		UpdatedByUserID:  "author-1",
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(updated.WizardStateJSON), &decoded); err != nil {
		t.Fatalf("unmarshal wizard_state: %v", err)
	}
	document := decoded["document"].(map[string]any)
	if got := int(document["pageCount"].(float64)); got != 2 {
		t.Fatalf("expected normalized document.pageCount=2, got %d", got)
	}
	rules := decoded["fieldRules"].([]any)
	rule := rules[0].(map[string]any)
	if got := int(rule["fromPage"].(float64)); got != 1 {
		t.Fatalf("expected fromPage clamped to 1, got %d", got)
	}
	if got := int(rule["toPage"].(float64)); got != 2 {
		t.Fatalf("expected toPage clamped to 2, got %d", got)
	}
	excludePages := rule["excludePages"].([]any)
	if len(excludePages) != 1 || int(excludePages[0].(float64)) != 2 {
		t.Fatalf("expected excludePages normalized to [2], got %#v", excludePages)
	}
}
