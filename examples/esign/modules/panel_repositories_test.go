package modules

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
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
		services.NewAgreementService(store, store),
		services.NewArtifactPipelineService(store, store, store, store, store, store, nil),
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-1",
		"title":       "MSA",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"type":            "signature",
			"recipient_index": "0",
			"page":            "1",
			"required":        "on",
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

func TestAgreementPanelRepositoryUpdateSynchronizesFormRecipientsAndFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-update-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store, store),
		services.NewArtifactPipelineService(store, store, store, store, store, store, nil),
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-update-1",
		"title":       "Initial",
		"message":     "Initial message",
		"recipients[0]": map[string]any{
			"name":  "Signer",
			"email": "signer@example.com",
			"role":  "signer",
		},
		"recipients[1]": map[string]any{
			"name":  "CC User",
			"email": "cc@example.com",
			"role":  "cc",
		},
		"fields[0]": map[string]any{
			"type":            "signature",
			"recipient_index": "0",
			"page":            "1",
			"required":        "on",
		},
		"fields[1]": map[string]any{
			"type":            "text",
			"recipient_index": "0",
			"page":            "1",
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
			"name":  "Signer Updated",
			"email": "updated@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"type":            "initials",
			"recipient_index": "0",
			"page":            "2",
			"required":        "on",
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

func TestAgreementPanelRepositoryGetIncludesFieldFormAliases(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-get-1")

	repo := newAgreementPanelRepository(
		store,
		services.NewAgreementService(store, store),
		services.NewArtifactPipelineService(store, store, store, store, store, store, nil),
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-get-1",
		"title":       "Alias Check",
		"recipients[0]": map[string]any{
			"name":  "Signer",
			"email": "signer@get.example",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"type":            "signature",
			"recipient_index": "0",
			"page":            "3",
			"required":        "on",
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
	if got := toInt64(field["recipient_index"]); got != 0 {
		t.Fatalf("expected recipient_index 0, got %v", field["recipient_index"])
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
		services.NewAgreementService(store, store),
		services.NewArtifactPipelineService(store, store, store, store, store, store, nil),
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
		services.NewAgreementService(store, store),
		services.NewArtifactPipelineService(store, store, store, store, store, store, nil),
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-clear-fields-1",
		"title":       "Field cleanup",
		"recipients[0]": map[string]any{
			"name":  "Signer",
			"email": "fields@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"type":            "signature",
			"recipient_index": "0",
			"page":            "1",
			"required":        "on",
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
