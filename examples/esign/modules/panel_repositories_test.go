package modules

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
)

func TestDecodePDFPayloadRequiresPayload(t *testing.T) {
	_, err := decodePDFPayload(map[string]any{"title": "Missing payload"})
	if err == nil {
		t.Fatal("expected missing payload error")
	}
	if !strings.Contains(err.Error(), "pdf payload is required") {
		t.Fatalf("expected required-payload error, got %v", err)
	}
}

func TestDecodePDFPayloadRejectsInvalidBase64(t *testing.T) {
	_, err := decodePDFPayload(map[string]any{"pdf_base64": "not-base64"})
	if err == nil {
		t.Fatal("expected invalid base64 error")
	}
	if !strings.Contains(err.Error(), "invalid base64 pdf payload") {
		t.Fatalf("expected invalid-base64 error, got %v", err)
	}
}

func TestDecodePDFPayloadAcceptsValidBase64(t *testing.T) {
	raw := services.GenerateDeterministicPDF(1)
	encoded := base64.StdEncoding.EncodeToString(raw)
	decoded, err := decodePDFPayload(map[string]any{"pdf_base64": encoded})
	if err != nil {
		t.Fatalf("decodePDFPayload: %v", err)
	}
	if string(decoded) != string(raw) {
		t.Fatalf("expected decoded payload to match input")
	}
}

func TestDocumentPanelRepositoryCreateLoadsPDFBytesFromSourceObjectKey(t *testing.T) {
	assetsDir := t.TempDir()
	objectKey := "tenant/tenant-bootstrap/org/org-bootstrap/docs/msa.pdf"
	raw := services.GenerateDeterministicPDF(1)
	fullPath := filepath.Join(assetsDir, filepath.FromSlash(objectKey))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("mkdir assets path: %v", err)
	}
	if err := os.WriteFile(fullPath, raw, 0o644); err != nil {
		t.Fatalf("write source object: %v", err)
	}

	store := stores.NewInMemoryStore()
	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(assetsDir)))
	repo := newDocumentPanelRepository(store, services.NewDocumentService(store), manager, defaultModuleScope, RuntimeSettings{})

	created, err := repo.Create(context.Background(), map[string]any{
		"title":             "Master Service Agreement",
		"source_object_key": objectKey,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if strings.TrimSpace(toString(created["source_object_key"])) != objectKey {
		t.Fatalf("expected source_object_key %q, got %+v", objectKey, created["source_object_key"])
	}
	if size := toInt64(created["size_bytes"]); size <= 0 {
		t.Fatalf("expected positive size_bytes, got %v", created["size_bytes"])
	}
	if pages := toInt64(created["page_count"]); pages <= 0 {
		t.Fatalf("expected positive page_count, got %v", created["page_count"])
	}
}

func TestAgreementPanelRepositoryCreatePersistsFormRecipientsAndFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-1",
		"title":       "MSA",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-create-1",
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-1",
			"type":           "signature",
			"participant_id": "participant-create-1",
			"page":           "1",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	recipients, err := store.ListRecipients(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListRecipients: %v", err)
	}
	if len(recipients) != 1 {
		t.Fatalf("expected 1 recipient, got %d", len(recipients))
	}
	if recipients[0].Email != "alice@example.com" {
		t.Fatalf("expected recipient email alice@example.com, got %q", recipients[0].Email)
	}
	fields, err := store.ListFields(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("expected 1 field, got %d", len(fields))
	}
	if fields[0].Type != stores.FieldTypeSignature {
		t.Fatalf("expected signature field type, got %q", fields[0].Type)
	}
	if fields[0].RecipientID != recipients[0].ID {
		t.Fatalf("expected field recipient_id %q, got %q", recipients[0].ID, fields[0].RecipientID)
	}
}

func TestAgreementPanelRepositoryCreateSendsAgreementWhenRequested(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-send-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-send-1",
		"title":       "MSA Send",
		"message":     "Please sign",
		"send_for_signature": "1",
		"recipients[0]": map[string]any{
			"id":    "participant-create-send-1",
			"name":  "Alice",
			"email": "alice.send@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-send-1",
			"type":           "signature",
			"participant_id": "participant-create-send-1",
			"page":           "1",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}
	if got := strings.TrimSpace(toString(created["status"])); got != stores.AgreementStatusSent {
		t.Fatalf("expected sent status in response, got %q", got)
	}

	agreement, err := store.GetAgreement(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	if agreement.Status != stores.AgreementStatusSent {
		t.Fatalf("expected stored agreement status sent, got %q", agreement.Status)
	}
}

func TestAgreementPanelRepositoryCreateCollapsesDuplicateParticipantValues(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-dup-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-dup-1",
		"title":       "MSA duplicate participant ids",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-create-dup-1",
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-dup-1",
			"type":           "signature",
			"participant_id": []string{"participant-create-dup-1", "participant-create-dup-1"},
			"page":           "1",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatal("expected created agreement id")
	}

	fields, err := store.ListFields(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("expected 1 field, got %d", len(fields))
	}
	if got := strings.TrimSpace(fields[0].RecipientID); got != "participant-create-dup-1" {
		t.Fatalf("expected participant id participant-create-dup-1, got %q", got)
	}
}

func TestAgreementPanelRepositoryCreateRejectsConflictingParticipantValues(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-dup-2")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	_, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-dup-2",
		"title":       "MSA conflicting participant ids",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-create-dup-2",
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-dup-2",
			"type":           "signature",
			"participant_id": []string{"participant-create-dup-2", "participant-create-dup-other"},
			"page":           "1",
			"required":       "on",
		},
	})
	if err == nil {
		t.Fatal("expected conflicting participant_id values error")
	}
	if !strings.Contains(err.Error(), "participant_id") || !strings.Contains(err.Error(), "conflicting values") {
		t.Fatalf("expected conflicting participant_id error, got %v", err)
	}
}

func TestAgreementPanelRepositoryCreateMergesFieldPlacements(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-placement-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-placement-1",
		"title":       "MSA with placement merge",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-create-placement-1",
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-placement-1",
			"type":           "signature",
			"participant_id": "participant-create-placement-1",
			"page":           "1",
			"required":       "on",
		},
		"field_placements[0]": map[string]any{
			"definition_id": "field-create-placement-1",
			"page":          "2",
			"x":             "72",
			"y":             "120",
			"width":         "220",
			"height":        "42",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatal("expected created agreement id")
	}

	fields, err := store.ListFields(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("expected 1 field, got %d", len(fields))
	}
	if got := fields[0].PageNumber; got != 2 {
		t.Fatalf("expected merged page number 2, got %d", got)
	}
	if got := int(fields[0].PosX); got != 72 {
		t.Fatalf("expected merged x=72, got %v", fields[0].PosX)
	}
	if got := int(fields[0].PosY); got != 120 {
		t.Fatalf("expected merged y=120, got %v", fields[0].PosY)
	}
	if got := int(fields[0].Width); got != 220 {
		t.Fatalf("expected merged width=220, got %v", fields[0].Width)
	}
	if got := int(fields[0].Height); got != 42 {
		t.Fatalf("expected merged height=42, got %v", fields[0].Height)
	}
}

func TestAgreementPanelRepositoryUpdateSynchronizesFormRecipientsAndFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-update-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-update-1",
		"title":       "Initial",
		"message":     "Initial message",
		"recipients[0]": map[string]any{
			"id":    "participant-update-signer",
			"name":  "Signer",
			"email": "signer@example.com",
			"role":  "signer",
		},
		"recipients[1]": map[string]any{
			"id":    "participant-update-cc",
			"name":  "CC User",
			"email": "cc@example.com",
			"role":  "cc",
		},
		"fields[0]": map[string]any{
			"id":             "field-update-signature",
			"type":           "signature",
			"participant_id": "participant-update-signer",
			"page":           "1",
			"required":       "on",
		},
		"fields[1]": map[string]any{
			"id":             "field-update-text",
			"type":           "text",
			"participant_id": "participant-update-signer",
			"page":           "1",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	updated, err := repo.Update(context.Background(), agreementID, map[string]any{
		"title":   "Updated",
		"message": "Updated message",
		"recipients[0]": map[string]any{
			"id":    "participant-update-signer",
			"name":  "Signer Updated",
			"email": "updated@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-update-signature",
			"type":           "initials",
			"participant_id": "participant-update-signer",
			"page":           "2",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got := strings.TrimSpace(toString(updated["title"])); got != "Updated" {
		t.Fatalf("expected updated title, got %q", got)
	}

	recipients, err := store.ListRecipients(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListRecipients: %v", err)
	}
	if len(recipients) != 1 {
		t.Fatalf("expected recipient list to be synchronized to 1, got %d", len(recipients))
	}
	if recipients[0].Email != "updated@example.com" {
		t.Fatalf("expected recipient email updated@example.com, got %q", recipients[0].Email)
	}

	fields, err := store.ListFields(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("expected field list to be synchronized to 1, got %d", len(fields))
	}
	if fields[0].Type != stores.FieldTypeInitials {
		t.Fatalf("expected initials field type, got %q", fields[0].Type)
	}
	if fields[0].PageNumber != 2 {
		t.Fatalf("expected page number 2, got %d", fields[0].PageNumber)
	}
}

func TestAgreementPanelRepositoryUpdateSendsAgreementWhenRequested(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-update-send-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-update-send-1",
		"title":       "Initial Send Candidate",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-update-send-1",
			"name":  "Signer",
			"email": "update.send@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-update-send-1",
			"type":           "signature",
			"participant_id": "participant-update-send-1",
			"page":           "1",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	updated, err := repo.Update(context.Background(), agreementID, map[string]any{
		"title":              "Ready To Send",
		"send_for_signature": true,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got := strings.TrimSpace(toString(updated["status"])); got != stores.AgreementStatusSent {
		t.Fatalf("expected sent status in response, got %q", got)
	}

	agreement, err := store.GetAgreement(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	if agreement.Status != stores.AgreementStatusSent {
		t.Fatalf("expected stored agreement status sent, got %q", agreement.Status)
	}
}

func TestAgreementPanelRepositoryGetIncludesFieldFormAliases(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-get-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-get-1",
		"title":       "Alias Check",
		"recipients[0]": map[string]any{
			"id":    "participant-get-1",
			"name":  "Signer",
			"email": "signer@get.example",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-get-1",
			"type":           "signature",
			"participant_id": "participant-get-1",
			"page":           "3",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	record, err := repo.Get(context.Background(), agreementID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	rawFields, ok := record["fields"].([]map[string]any)
	if !ok || len(rawFields) != 1 {
		t.Fatalf("expected one field in payload, got %#v", record["fields"])
	}
	field := rawFields[0]
	if got := strings.TrimSpace(toString(field["participant_id"])); got != "participant-get-1" {
		t.Fatalf("expected participant_id participant-get-1, got %v", field["participant_id"])
	}
	if got := toInt64(field["page"]); got != 3 {
		t.Fatalf("expected page alias 3, got %v", field["page"])
	}
	if got := toInt64(field["page_number"]); got != 3 {
		t.Fatalf("expected page_number 3, got %v", field["page_number"])
	}
}

func TestAgreementPanelRepositoryUpdateAllowsClearingMessage(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-clear-message-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-clear-message-1",
		"title":       "Needs message",
		"message":     "to be cleared",
		"recipients[0]": map[string]any{
			"name":  "Signer",
			"email": "clear@example.com",
			"role":  "signer",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	updated, err := repo.Update(context.Background(), agreementID, map[string]any{
		"title":   "Needs message",
		"message": "",
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got := strings.TrimSpace(toString(updated["message"])); got != "" {
		t.Fatalf("expected empty message after update, got %q", got)
	}
}

func TestAgreementPanelRepositoryUpdateRemovesAllFieldsWhenFieldsPresentFlagSet(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-clear-fields-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-clear-fields-1",
		"title":       "Field cleanup",
		"recipients[0]": map[string]any{
			"id":    "participant-clear-fields-1",
			"name":  "Signer",
			"email": "fields@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-clear-fields-1",
			"type":           "signature",
			"participant_id": "participant-clear-fields-1",
			"page":           "1",
			"required":       "on",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatalf("expected created agreement id")
	}

	if _, err := repo.Update(context.Background(), agreementID, map[string]any{
		"title":          "Field cleanup",
		"fields_present": "1",
	}); err != nil {
		t.Fatalf("Update: %v", err)
	}

	fields, err := store.ListFields(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 0 {
		t.Fatalf("expected fields to be removed, got %d", len(fields))
	}
}

func TestAgreementRecordToMapDerivesRecipientStatusForCompletedAgreement(t *testing.T) {
	sentAt := time.Date(2026, 2, 12, 20, 48, 26, 0, time.UTC)
	signerViewedAt := sentAt.Add(30 * time.Second)
	signerSignedAt := sentAt.Add(2 * time.Minute)
	completedAt := sentAt.Add(3 * time.Minute)
	agreement := stores.AgreementRecord{
		ID:          "agreement-complete-1",
		TenantID:    defaultModuleScope.TenantID,
		OrgID:       defaultModuleScope.OrgID,
		Status:      stores.AgreementStatusCompleted,
		SentAt:      &sentAt,
		CompletedAt: &completedAt,
		CreatedAt:   sentAt,
		UpdatedAt:   completedAt,
	}
	recipients := []stores.RecipientRecord{
		{
			ID:          "recipient-signer-1",
			AgreementID: agreement.ID,
			Email:       "signer@example.com",
			Role:        stores.RecipientRoleSigner,
			FirstViewAt: &signerViewedAt,
			CompletedAt: &signerSignedAt,
		},
		{
			ID:          "recipient-cc-1",
			AgreementID: agreement.ID,
			Email:       "cc@example.com",
			Role:        stores.RecipientRoleCC,
		},
	}

	payload := agreementRecordToMap(agreement, recipients, nil, nil, services.AgreementDeliveryDetail{})
	items, ok := payload["recipients"].([]map[string]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected two recipients in payload, got %#v", payload["recipients"])
	}

	signer := items[0]
	if got := strings.TrimSpace(toString(signer["status"])); got != "signed" {
		t.Fatalf("expected signer status signed, got %q", got)
	}
	if got := strings.TrimSpace(toString(signer["signed_at"])); got != signerSignedAt.UTC().Format(time.RFC3339Nano) {
		t.Fatalf("expected signer signed_at %q, got %q", signerSignedAt.UTC().Format(time.RFC3339Nano), got)
	}

	cc := items[1]
	if got := strings.TrimSpace(toString(cc["status"])); got != "delivered" {
		t.Fatalf("expected cc status delivered, got %q", got)
	}
	if got := strings.TrimSpace(toString(cc["delivered_at"])); got != completedAt.UTC().Format(time.RFC3339Nano) {
		t.Fatalf("expected cc delivered_at %q, got %q", completedAt.UTC().Format(time.RFC3339Nano), got)
	}
}

func TestAgreementRecordToMapDerivesRecipientStatusForInFlightAgreement(t *testing.T) {
	sentAt := time.Date(2026, 2, 12, 20, 48, 26, 0, time.UTC)
	viewedAt := sentAt.Add(10 * time.Second)
	agreement := stores.AgreementRecord{
		ID:        "agreement-sent-1",
		TenantID:  defaultModuleScope.TenantID,
		OrgID:     defaultModuleScope.OrgID,
		Status:    stores.AgreementStatusSent,
		SentAt:    &sentAt,
		CreatedAt: sentAt,
		UpdatedAt: sentAt,
	}
	recipients := []stores.RecipientRecord{
		{
			ID:          "recipient-signer-1",
			AgreementID: agreement.ID,
			Email:       "signer@example.com",
			Role:        stores.RecipientRoleSigner,
			FirstViewAt: &viewedAt,
		},
		{
			ID:          "recipient-cc-1",
			AgreementID: agreement.ID,
			Email:       "cc@example.com",
			Role:        stores.RecipientRoleCC,
		},
	}

	payload := agreementRecordToMap(agreement, recipients, nil, nil, services.AgreementDeliveryDetail{})
	items, ok := payload["recipients"].([]map[string]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected two recipients in payload, got %#v", payload["recipients"])
	}
	if got := strings.TrimSpace(toString(items[0]["status"])); got != "viewed" {
		t.Fatalf("expected signer status viewed, got %q", got)
	}
	if got := strings.TrimSpace(toString(items[1]["status"])); got != "sent" {
		t.Fatalf("expected cc status sent, got %q", got)
	}
}

type testBinaryObjectStore struct {
	objects map[string][]byte
}

func (s *testBinaryObjectStore) GetFile(_ context.Context, path string) ([]byte, error) {
	if s == nil {
		return nil, io.EOF
	}
	raw, ok := s.objects[strings.TrimSpace(path)]
	if !ok {
		return nil, io.EOF
	}
	return append([]byte{}, raw...), nil
}

func TestAgreementPanelRepositoryServePanelSubresourceReturnsPDFAndAppendsAuditEvent(t *testing.T) {
	scope := defaultModuleScope
	store := stores.NewInMemoryStore()
	seedESignDocument(t, store, scope, "doc-artifact-1")

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(context.Background(), scope, services.CreateDraftInput{
		DocumentID:      "doc-artifact-1",
		Title:           "Artifact Access",
		CreatedByUserID: "admin-user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	objectKey := "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/agreements/" + agreement.ID + "/executed.pdf"
	if _, err := store.SaveAgreementArtifacts(context.Background(), scope, stores.AgreementArtifactRecord{
		AgreementID:       agreement.ID,
		ExecutedObjectKey: objectKey,
		ExecutedSHA256:    strings.Repeat("a", 64),
		CorrelationID:     "corr-artifact-1",
	}); err != nil {
		t.Fatalf("SaveAgreementArtifacts: %v", err)
	}

	repo := newAgreementPanelRepository(
		store,
		agreementSvc,
		services.NewArtifactPipelineService(store, nil),
		nil,
		&testBinaryObjectStore{
			objects: map[string][]byte{
				objectKey: services.GenerateDeterministicPDF(1),
			},
		},
		scope,
		RuntimeSettings{},
	)

	adapter := router.NewFiberAdapter()
	r := adapter.Router()
	r.Get("/artifact", func(c router.Context) error {
		adminCtx := coreadmin.AdminContext{
			Context:  c.Context(),
			UserID:   "admin-user-1",
			TenantID: scope.TenantID,
			OrgID:    scope.OrgID,
		}
		return repo.ServePanelSubresource(adminCtx, c, agreement.ID, "artifact", "executed")
	})

	resp, err := adapter.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, "/artifact?disposition=attachment", nil), -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	if contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type"))); !strings.Contains(contentType, "application/pdf") {
		t.Fatalf("expected application/pdf content type, got %q", resp.Header.Get("Content-Type"))
	}
	if disposition := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Disposition"))); !strings.HasPrefix(disposition, "attachment;") {
		t.Fatalf("expected attachment disposition, got %q", resp.Header.Get("Content-Disposition"))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.HasPrefix(string(body), "%PDF-") {
		t.Fatalf("expected pdf payload prefix, got %q", string(body))
	}

	events, err := store.ListForAgreement(context.Background(), scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "admin.agreement.artifact_downloaded" {
			continue
		}
		found = true
		if got := strings.TrimSpace(event.ActorID); got != "admin-user-1" {
			t.Fatalf("expected actor id admin-user-1, got %q", got)
		}
		meta := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &meta); err != nil {
			t.Fatalf("unmarshal metadata: %v", err)
		}
		if got := strings.TrimSpace(toString(meta["asset"])); got != "executed" {
			t.Fatalf("expected metadata asset executed, got %q", got)
		}
		if got := strings.TrimSpace(toString(meta["disposition"])); got != "attachment" {
			t.Fatalf("expected metadata disposition attachment, got %q", got)
		}
		if got := strings.TrimSpace(toString(meta["user_id"])); got != "admin-user-1" {
			t.Fatalf("expected metadata user_id admin-user-1, got %q", got)
		}
	}
	if !found {
		t.Fatalf("expected admin.agreement.artifact_downloaded event, got %+v", events)
	}
}

func seedESignDocument(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, id string) {
	t.Helper()
	now := time.Now().UTC()
	_, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:              id,
		Title:           "Seed Document",
		SourceObjectKey: "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/" + id + ".pdf",
		SourceSHA256:    strings.Repeat("a", 64),
		SizeBytes:       2048,
		PageCount:       1,
		CreatedAt:       now,
		UpdatedAt:       now,
	})
	if err != nil {
		t.Fatalf("seed document: %v", err)
	}
}
