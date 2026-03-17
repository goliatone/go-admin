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
	"sort"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
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
	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), manager, defaultModuleScope, RuntimeSettings{})

	created, err := repo.Create(context.Background(), map[string]any{
		"title":                "Master Service Agreement",
		"source_object_key":    objectKey,
		"source_original_name": "msa.pdf",
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

func TestDocumentPanelRepositoryListAppliesSearchCreatedByAndScopeFilters(t *testing.T) {
	store := stores.NewInMemoryStore()
	now := time.Now().UTC()
	primaryScope := stores.Scope{TenantID: "tenant-primary", OrgID: "org-primary"}
	otherScope := stores.Scope{TenantID: "tenant-other", OrgID: "org-other"}

	seedDocs := []struct {
		scope   stores.Scope
		id      string
		title   string
		creator string
	}{
		{scope: primaryScope, id: "doc-primary-a", title: "Alpha Master Service Agreement", creator: "user-a"},
		{scope: primaryScope, id: "doc-primary-b", title: "Alpha Employment Agreement", creator: "user-b"},
		{scope: primaryScope, id: "doc-primary-c", title: "Beta NDA", creator: "user-a"},
		{scope: otherScope, id: "doc-other-a", title: "Alpha Cross Scope", creator: "user-a"},
	}
	for _, doc := range seedDocs {
		if _, err := store.Create(context.Background(), doc.scope, stores.DocumentRecord{
			ID:                 doc.id,
			Title:              doc.title,
			CreatedByUserID:    doc.creator,
			SourceObjectKey:    "tenant/" + doc.scope.TenantID + "/org/" + doc.scope.OrgID + "/docs/" + doc.id + ".pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("b", 64),
			SizeBytes:          4096,
			PageCount:          2,
			CreatedAt:          now,
			UpdatedAt:          now,
		}); err != nil {
			t.Fatalf("seed document %s: %v", doc.id, err)
		}
	}

	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, primaryScope, RuntimeSettings{})
	records, total, err := repo.List(context.Background(), coreadmin.ListOptions{
		Search: "alpha",
		Filters: map[string]any{
			"created_by_user_id": "user-a",
		},
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected filtered total 1, got %d", total)
	}
	if len(records) != 1 {
		t.Fatalf("expected exactly one record, got %d", len(records))
	}
	if got := strings.TrimSpace(toString(records[0]["id"])); got != "doc-primary-a" {
		t.Fatalf("expected doc-primary-a, got %q", got)
	}
	if got := strings.TrimSpace(toString(records[0]["created_by_user_id"])); got != "user-a" {
		t.Fatalf("expected created_by_user_id user-a, got %q", got)
	}
}

func TestDocumentPanelRepositoryListSupportsLegacySearchFilters(t *testing.T) {
	store := stores.NewInMemoryStore()
	now := time.Now().UTC()
	scope := defaultModuleScope

	for _, doc := range []stores.DocumentRecord{
		{
			ID:                 "doc-legacy-search-a",
			Title:              "Umbrella Agreement",
			CreatedByUserID:    "user-a",
			SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-legacy-search-a.pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("c", 64),
			SizeBytes:          1024,
			PageCount:          1,
			CreatedAt:          now,
			UpdatedAt:          now,
		},
		{
			ID:                 "doc-legacy-search-b",
			Title:              "Mutual NDA",
			CreatedByUserID:    "user-a",
			SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-legacy-search-b.pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("d", 64),
			SizeBytes:          1024,
			PageCount:          1,
			CreatedAt:          now,
			UpdatedAt:          now,
		},
	} {
		if _, err := store.Create(context.Background(), scope, doc); err != nil {
			t.Fatalf("seed document %s: %v", doc.ID, err)
		}
	}

	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, scope, RuntimeSettings{})
	records, total, err := repo.List(context.Background(), coreadmin.ListOptions{
		Filters: map[string]any{
			"_search": "nda",
		},
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one NDA record, got total=%d len=%d", total, len(records))
	}
	if got := strings.TrimSpace(toString(records[0]["id"])); got != "doc-legacy-search-b" {
		t.Fatalf("expected doc-legacy-search-b, got %q", got)
	}
}

func TestDocumentPanelRepositoryDeleteRemovesUnreferencedDocument(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	documentID := "doc-delete-1"
	seedESignDocument(t, store, scope, documentID)

	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, scope, RuntimeSettings{})
	if err := repo.Delete(context.Background(), documentID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := store.Get(context.Background(), scope, documentID); err == nil {
		t.Fatalf("expected deleted document to be missing")
	}
}

func TestDocumentPanelRepositoryDeleteRejectsReferencedDocument(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	documentID := "doc-delete-2"
	seedESignDocument(t, store, scope, documentID)
	now := time.Now().UTC()
	if _, err := store.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:         "agreement-delete-1",
		DocumentID: documentID,
		Title:      "Agreement referencing document",
		Status:     stores.AgreementStatusDraft,
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed agreement: %v", err)
	}

	repo := newDocumentPanelRepository(store, store, services.NewDocumentService(store), nil, scope, RuntimeSettings{})
	err := repo.Delete(context.Background(), documentID)
	if err == nil {
		t.Fatalf("expected delete to fail when document is in use")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr == nil {
		t.Fatalf("expected typed validation error, got %T", err)
	}
	if got := strings.TrimSpace(typedErr.TextCode); got != coreadmin.TextCodeResourceInUse {
		t.Fatalf("expected text_code %q, got %q (%v)", coreadmin.TextCodeResourceInUse, got, err)
	}
	if got := strings.TrimSpace(typedErr.Message); got != "This document cannot be deleted because it is attached to 1 agreement." {
		t.Fatalf("expected canonical message, got %q (%v)", got, err)
	}
	if got := toInt64(typedErr.Metadata["agreement_count"]); got != 1 {
		t.Fatalf("expected agreement_count=1, got %v (%v)", typedErr.Metadata["agreement_count"], err)
	}
}

func TestDocumentPanelRepositoryDeleteMapsTypedResourceInUseWithoutReasonStringMatching(t *testing.T) {
	scope := defaultModuleScope
	documentID := "doc-delete-typed"
	agreements := stores.NewInMemoryStore()
	now := time.Now().UTC()
	if _, err := agreements.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:         "agreement-delete-typed-1",
		DocumentID: documentID,
		Title:      "Agreement referencing typed document",
		Status:     stores.AgreementStatusDraft,
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed agreement: %v", err)
	}
	store := typedDeleteConflictDocumentStore{
		deleteErr: goerrors.New("document linked elsewhere", goerrors.CategoryConflict).
			WithCode(http.StatusConflict).
			WithTextCode(coreadmin.TextCodeResourceInUse).
			WithMetadata(map[string]any{
				"entity":          "documents",
				"field":           "id",
				"id":              documentID,
				"document_id":     documentID,
				"resource_state":  "linked_to_agreements",
				"agreement_count": 1,
			}),
	}

	repo := newDocumentPanelRepository(store, agreements, services.NewDocumentService(agreements), nil, scope, RuntimeSettings{})
	err := repo.Delete(context.Background(), documentID)
	if err == nil {
		t.Fatal("expected delete to fail when typed resource-in-use error is returned")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr == nil {
		t.Fatalf("expected typed validation error, got %T", err)
	}
	if got := strings.TrimSpace(typedErr.TextCode); got != coreadmin.TextCodeResourceInUse {
		t.Fatalf("expected text_code %q, got %q (%v)", coreadmin.TextCodeResourceInUse, got, err)
	}
	if got := strings.TrimSpace(typedErr.Message); got != "This document cannot be deleted because it is attached to 1 agreement." {
		t.Fatalf("expected canonical message, got %q (%v)", got, err)
	}
	if got := toInt64(typedErr.Metadata["agreement_count"]); got != 1 {
		t.Fatalf("expected agreement_count=1, got %v (%v)", typedErr.Metadata["agreement_count"], err)
	}
}

func TestAgreementPanelRepositoryCreatePersistsFormRecipientsAndFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-1")

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
		store,
		services.NewAgreementService(store),
		services.NewArtifactPipelineService(store, nil),
		nil,
		nil,
		scope,
		RuntimeSettings{},
	)

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id":        "doc-create-send-1",
		"title":              "MSA Send",
		"message":            "Please sign",
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

func TestAgreementPanelRepositoryCreatePropagatesRequestIPToLifecycleEvents(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-send-ip-1")

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

	ctx := coreadmin.WithRequestIP(context.Background(), "198.51.100.44")
	created, err := repo.Create(ctx, map[string]any{
		"document_id":        "doc-create-send-ip-1",
		"title":              "MSA Send IP",
		"message":            "Please sign",
		"send_for_signature": "1",
		"recipients[0]": map[string]any{
			"id":    "participant-create-send-ip-1",
			"name":  "Alice",
			"email": "alice.send.ip@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-send-ip-1",
			"type":           "signature",
			"participant_id": "participant-create-send-ip-1",
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
	events, err := store.ListForAgreement(context.Background(), scope, agreementID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	seen := map[string]string{}
	for _, event := range events {
		eventType := strings.TrimSpace(event.EventType)
		if eventType != "agreement.created" && eventType != "agreement.sent" {
			continue
		}
		seen[eventType] = strings.TrimSpace(event.IPAddress)
	}
	if seen["agreement.created"] != "198.51.100.44" {
		t.Fatalf("expected agreement.created ip 198.51.100.44, got %q", seen["agreement.created"])
	}
	if seen["agreement.sent"] != "198.51.100.44" {
		t.Fatalf("expected agreement.sent ip 198.51.100.44, got %q", seen["agreement.sent"])
	}
}

func TestAgreementPanelRepositoryCreateCollapsesDuplicateParticipantValues(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-dup-1")

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

func TestAgreementPanelRepositoryCreateMergesFieldPlacementsFromJSONPayload(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-placement-json-1")

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

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-placement-json-1",
		"title":       "MSA with placement json merge",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-create-placement-json-1",
			"name":  "Alice",
			"email": "alice@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-create-placement-json-1",
			"type":           "signature",
			"participant_id": "participant-create-placement-json-1",
			"page":           "1",
			"required":       "on",
		},
		"field_placements_json": `[{"definition_id":"field-create-placement-json-1","page":3,"x":44,"y":96,"width":208,"height":40}]`,
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
	if got := fields[0].PageNumber; got != 3 {
		t.Fatalf("expected merged page number 3, got %d", got)
	}
	if got := int(fields[0].PosX); got != 44 {
		t.Fatalf("expected merged x=44, got %v", fields[0].PosX)
	}
	if got := int(fields[0].PosY); got != 96 {
		t.Fatalf("expected merged y=96, got %v", fields[0].PosY)
	}
	if got := int(fields[0].Width); got != 208 {
		t.Fatalf("expected merged width=208, got %v", fields[0].Width)
	}
	if got := int(fields[0].Height); got != 40 {
		t.Fatalf("expected merged height=40, got %v", fields[0].Height)
	}
}

func TestAgreementPanelRepositoryCreatePersistsLinkedPlacementMetadata(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-linked-placement-1")

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

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id": "doc-create-linked-placement-1",
		"title":       "Linked Placement Agreement",
		"message":     "Please review",
		"recipients[0]": map[string]any{
			"id":    "participant-linked-placement-1",
			"name":  "Alice",
			"email": "alice.linked@example.com",
			"role":  "signer",
		},
		"fields[0]": map[string]any{
			"id":             "field-linked-placement-1",
			"type":           "signature",
			"participant_id": "participant-linked-placement-1",
			"page":           "1",
			"required":       "on",
		},
		"field_placements_json": `[{
			"definition_id":"field-linked-placement-1",
			"page":2,
			"x":88,
			"y":144,
			"width":210,
			"height":42,
			"placement_source":"auto_linked",
			"link_group_id":"rule_group_1",
			"linked_from_field_id":"source-field-1",
			"is_unlinked":true
		}]`,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	agreementID := strings.TrimSpace(toString(created["id"]))
	if agreementID == "" {
		t.Fatal("expected created agreement id")
	}

	instances, err := store.ListFieldInstances(context.Background(), scope, agreementID)
	if err != nil {
		t.Fatalf("ListFieldInstances: %v", err)
	}
	if len(instances) != 1 {
		t.Fatalf("expected 1 field instance, got %d", len(instances))
	}
	instance := instances[0]
	if got := strings.TrimSpace(instance.PlacementSource); got != stores.PlacementSourceAutoLinked {
		t.Fatalf("expected placement_source auto_linked, got %q", got)
	}
	if got := strings.TrimSpace(instance.LinkGroupID); got != "rule_group_1" {
		t.Fatalf("expected link_group_id rule_group_1, got %q", got)
	}
	if got := strings.TrimSpace(instance.LinkedFromFieldID); got != "source-field-1" {
		t.Fatalf("expected linked_from_field_id source-field-1, got %q", got)
	}
	if !instance.IsUnlinked {
		t.Fatal("expected is_unlinked=true on field instance")
	}

	payload, err := repo.Get(context.Background(), agreementID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	fields, ok := payload["fields"].([]map[string]any)
	if !ok || len(fields) != 1 {
		t.Fatalf("expected one field payload, got %#v", payload["fields"])
	}
	if got := strings.TrimSpace(toString(fields[0]["placement_source"])); got != stores.PlacementSourceAutoLinked {
		t.Fatalf("expected payload placement_source auto_linked, got %q", got)
	}
	if got := strings.TrimSpace(toString(fields[0]["link_group_id"])); got != "rule_group_1" {
		t.Fatalf("expected payload link_group_id rule_group_1, got %q", got)
	}
	if got := strings.TrimSpace(toString(fields[0]["linked_from_field_id"])); got != "source-field-1" {
		t.Fatalf("expected payload linked_from_field_id source-field-1, got %q", got)
	}
	if !toBool(fields[0]["is_unlinked"]) {
		t.Fatalf("expected payload is_unlinked=true, got %#v", fields[0]["is_unlinked"])
	}
}

func TestAgreementPanelRepositoryCreateExpandsFieldRules(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	now := time.Now().UTC()
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 "doc-create-rules-1",
		Title:              "Rules Document",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-create-rules-1.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          2048,
		PageCount:          4,
		CreatedAt:          now,
		UpdatedAt:          now,
	}); err != nil {
		t.Fatalf("seed document: %v", err)
	}

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

	rulesJSON := `[{"id":"rule-1","type":"initials_each_page","participant_id":"participant-rules-1","from_page":1,"to_page":4,"exclude_last_page":true},{"id":"rule-2","type":"signature_once","participant_id":"participant-rules-1","page":4}]`
	created, err := repo.Create(context.Background(), map[string]any{
		"document_id":         "doc-create-rules-1",
		"title":               "Rules Agreement",
		"message":             "Rule-driven fields",
		"document_page_count": "4",
		"field_rules_json":    rulesJSON,
		"recipients[0]": map[string]any{
			"id":    "participant-rules-1",
			"name":  "Rule Signer",
			"email": "rules@example.com",
			"role":  "signer",
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
	if len(fields) != 4 {
		t.Fatalf("expected 4 expanded fields, got %d", len(fields))
	}

	initialsPages := []int{}
	signaturePages := []int{}
	for _, field := range fields {
		switch strings.TrimSpace(field.Type) {
		case stores.FieldTypeInitials:
			initialsPages = append(initialsPages, field.PageNumber)
		case stores.FieldTypeSignature:
			signaturePages = append(signaturePages, field.PageNumber)
		}
	}
	if len(initialsPages) != 3 {
		t.Fatalf("expected 3 initials fields, got %d (%v)", len(initialsPages), initialsPages)
	}
	sort.Ints(initialsPages)
	if initialsPages[0] != 1 || initialsPages[1] != 2 || initialsPages[2] != 3 {
		t.Fatalf("expected initials pages [1 2 3], got %v", initialsPages)
	}
	if len(signaturePages) != 1 || signaturePages[0] != 4 {
		t.Fatalf("expected signature page [4], got %v", signaturePages)
	}

	ids := make([]string, 0, len(fields))
	for _, field := range fields {
		ids = append(ids, strings.TrimSpace(field.ID))
	}
	sort.Strings(ids)
	expectedIDs := []string{
		"rule-1-initials-1",
		"rule-1-initials-2",
		"rule-1-initials-3",
		"rule-2-signature-4",
	}
	if strings.Join(ids, ",") != strings.Join(expectedIDs, ",") {
		t.Fatalf("expected deterministic expanded rule ids %v, got %v", expectedIDs, ids)
	}
}

func TestAgreementPanelRepositoryCreateMergesFieldPlacementsForExpandedRuleFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	now := time.Now().UTC()
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 "doc-create-rules-placement-1",
		Title:              "Rules Placement Document",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-create-rules-placement-1.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          2048,
		PageCount:          4,
		CreatedAt:          now,
		UpdatedAt:          now,
	}); err != nil {
		t.Fatalf("seed document: %v", err)
	}

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

	rulesJSON := `[{"id":"custom-initials","type":"initials_each_page","participant_id":"participant-rules-placement-1","from_page":1,"to_page":3},{"id":"custom-signature","type":"signature_once","participant_id":"participant-rules-placement-1","page":4}]`
	created, err := repo.Create(context.Background(), map[string]any{
		"document_id":         "doc-create-rules-placement-1",
		"title":               "Rules Placement Agreement",
		"message":             "Placement merge for generated rules",
		"document_page_count": "4",
		"field_rules_json":    rulesJSON,
		"recipients[0]": map[string]any{
			"id":    "participant-rules-placement-1",
			"name":  "Rule Placement Signer",
			"email": "rules.placement@example.com",
			"role":  "signer",
		},
		"field_placements[0]": map[string]any{
			"definition_id": "custom-initials-initials-2",
			"page":          "2",
			"x":             "88",
			"y":             "130",
			"width":         "92",
			"height":        "44",
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
	if len(fields) != 4 {
		t.Fatalf("expected 4 expanded fields, got %d", len(fields))
	}

	var merged stores.FieldRecord
	found := false
	for _, field := range fields {
		if strings.TrimSpace(field.ID) == "custom-initials-initials-2" {
			merged = field
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected expanded rule field custom-initials-initials-2, got %+v", fields)
	}
	if merged.PageNumber != 2 {
		t.Fatalf("expected merged generated field page 2, got %d", merged.PageNumber)
	}
	if int(merged.PosX) != 88 {
		t.Fatalf("expected merged generated field x=88, got %v", merged.PosX)
	}
	if int(merged.PosY) != 130 {
		t.Fatalf("expected merged generated field y=130, got %v", merged.PosY)
	}
	if int(merged.Width) != 92 {
		t.Fatalf("expected merged generated field width=92, got %v", merged.Width)
	}
	if int(merged.Height) != 44 {
		t.Fatalf("expected merged generated field height=44, got %v", merged.Height)
	}
}

func TestAgreementPanelRepositoryCreateExpandsFieldRulesFromDecodedJSONPayload(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	now := time.Now().UTC()
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 "doc-create-rules-decoded-1",
		Title:              "Rules Decoded Document",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-create-rules-decoded-1.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          2048,
		PageCount:          4,
		CreatedAt:          now,
		UpdatedAt:          now,
	}); err != nil {
		t.Fatalf("seed document: %v", err)
	}

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

	decodedRules := []any{
		map[string]any{
			"id":                "rule-1",
			"type":              "initials_each_page",
			"participant_id":    "participant-rules-decoded-1",
			"from_page":         float64(1),
			"to_page":           float64(4),
			"exclude_last_page": true,
		},
		map[string]any{
			"id":             "rule-2",
			"type":           "signature_once",
			"participant_id": "participant-rules-decoded-1",
			"page":           float64(4),
		},
	}

	created, err := repo.Create(context.Background(), map[string]any{
		"document_id":         "doc-create-rules-decoded-1",
		"title":               "Rules Agreement Decoded",
		"message":             "Rule-driven fields from decoded payload",
		"document_page_count": "4",
		"field_rules_json":    decodedRules,
		"recipients[0]": map[string]any{
			"id":    "participant-rules-decoded-1",
			"name":  "Rule Signer",
			"email": "rules.decoded@example.com",
			"role":  "signer",
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
	if len(fields) != 4 {
		t.Fatalf("expected 4 expanded fields, got %d", len(fields))
	}
}

func TestAgreementPanelRepositoryCreateExpandsFieldRulesFromStringSliceJSONPayload(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-rules-string-slice-1")

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

	rulesJSON := `[{"id":"rule-1","type":"initials_each_page","participant_id":"participant-rules-slice-1","from_page":1,"to_page":3,"exclude_last_page":false}]`
	created, err := repo.Create(context.Background(), map[string]any{
		"document_id":         "doc-create-rules-string-slice-1",
		"title":               "Rules Agreement String Slice",
		"document_page_count": "3",
		"field_rules_json":    []string{rulesJSON},
		"recipients[0]": map[string]any{
			"id":    "participant-rules-slice-1",
			"name":  "Rule Signer",
			"email": "rules.slice@example.com",
			"role":  "signer",
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
	if len(fields) != 3 {
		t.Fatalf("expected 3 expanded fields from string slice payload, got %d", len(fields))
	}
}

func TestAgreementPanelRepositoryCreateRejectsInvalidDecodedFieldRulesJSONPayload(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-rule-invalid-decoded-1")

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

	_, err := repo.Create(context.Background(), map[string]any{
		"document_id":      "doc-create-rule-invalid-decoded-1",
		"title":            "Invalid decoded rule agreement",
		"field_rules_json": []any{"not-an-object"},
		"recipients[0]": map[string]any{
			"id":    "participant-rule-invalid-decoded-1",
			"name":  "Rule Signer",
			"email": "rules.invalid.decoded@example.com",
			"role":  "signer",
		},
	})
	if err == nil {
		t.Fatal("expected invalid decoded field_rules_json error")
	}
	if !strings.Contains(err.Error(), "field_rules_json has invalid json payload") {
		t.Fatalf("expected field_rules_json payload validation error, got %v", err)
	}
}

func TestAgreementPanelRepositoryCreateRejectsInvalidDecodedFieldPlacementsJSONPayload(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-placement-invalid-decoded-1")

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

	_, err := repo.Create(context.Background(), map[string]any{
		"document_id":           "doc-create-placement-invalid-decoded-1",
		"title":                 "Invalid decoded placement agreement",
		"field_placements_json": []any{"not-an-object"},
		"recipients[0]": map[string]any{
			"id":    "participant-placement-invalid-decoded-1",
			"name":  "Placement Signer",
			"email": "placement.invalid.decoded@example.com",
			"role":  "signer",
		},
	})
	if err == nil {
		t.Fatal("expected invalid decoded field_placements_json error")
	}
	if !strings.Contains(err.Error(), "field_placements_json has invalid json payload") {
		t.Fatalf("expected field_placements_json payload validation error, got %v", err)
	}
}

func TestAgreementPanelRepositoryCreateRejectsUnsupportedFieldRule(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-create-rule-invalid-1")

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

	_, err := repo.Create(context.Background(), map[string]any{
		"document_id":      "doc-create-rule-invalid-1",
		"title":            "Invalid rule agreement",
		"field_rules_json": `[{"id":"rule-1","type":"stamp_every_page","participant_id":"participant-rule-invalid-1"}]`,
		"recipients[0]": map[string]any{
			"id":    "participant-rule-invalid-1",
			"name":  "Rule Signer",
			"email": "rules.invalid@example.com",
			"role":  "signer",
		},
	})
	if err == nil {
		t.Fatal("expected unsupported field rule error")
	}
	if !strings.Contains(err.Error(), "field rule type") {
		t.Fatalf("expected field rule type validation error, got %v", err)
	}
}

func TestAgreementPanelRepositoryUpdateSynchronizesFormRecipientsAndFields(t *testing.T) {
	store := stores.NewInMemoryStore()
	scope := defaultModuleScope
	seedESignDocument(t, store, scope, "doc-update-1")

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

	payload := agreementRecordToMap(agreement, recipients, nil, nil, nil, services.AgreementDeliveryDetail{})
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

	payload := agreementRecordToMap(agreement, recipients, nil, nil, nil, services.AgreementDeliveryDetail{})
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

func TestAgreementRecordToMapLeavesFutureSignerStagesPendingUntilActive(t *testing.T) {
	sentAt := time.Date(2026, 2, 12, 20, 48, 26, 0, time.UTC)
	agreement := stores.AgreementRecord{
		ID:        "agreement-stage-pending-1",
		TenantID:  defaultModuleScope.TenantID,
		OrgID:     defaultModuleScope.OrgID,
		Status:    stores.AgreementStatusSent,
		SentAt:    &sentAt,
		CreatedAt: sentAt,
		UpdatedAt: sentAt,
	}
	recipients := []stores.RecipientRecord{
		{
			ID:           "recipient-stage-1",
			AgreementID:  agreement.ID,
			Email:        "stage1@example.com",
			Role:         stores.RecipientRoleSigner,
			SigningOrder: 1,
		},
		{
			ID:           "recipient-stage-2",
			AgreementID:  agreement.ID,
			Email:        "stage2@example.com",
			Role:         stores.RecipientRoleSigner,
			SigningOrder: 2,
		},
	}

	payload := agreementRecordToMap(agreement, recipients, nil, nil, nil, services.AgreementDeliveryDetail{})
	items, ok := payload["recipients"].([]map[string]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected two recipients in payload, got %#v", payload["recipients"])
	}
	if got := strings.TrimSpace(toString(items[0]["status"])); got != "sent" {
		t.Fatalf("expected stage-one signer status sent, got %q", got)
	}
	if got := strings.TrimSpace(toString(items[1]["status"])); got != "pending" {
		t.Fatalf("expected stage-two signer status pending, got %q", got)
	}
	if got := strings.TrimSpace(toString(items[1]["sent_at"])); got != "" {
		t.Fatalf("expected stage-two signer sent_at to be empty, got %q", got)
	}
}

func TestBuildAgreementLineageIndexDerivesSupersededAndRelatedAgreements(t *testing.T) {
	root := stores.AgreementRecord{
		ID:           "agreement-root",
		Title:        "Root Agreement",
		Status:       stores.AgreementStatusVoided,
		WorkflowKind: stores.AgreementWorkflowKindStandard,
		UpdatedAt:    time.Date(2026, 2, 12, 20, 48, 26, 0, time.UTC),
	}
	correction := stores.AgreementRecord{
		ID:                "agreement-correction",
		Title:             "Correction Agreement",
		Status:            stores.AgreementStatusSent,
		WorkflowKind:      stores.AgreementWorkflowKindCorrection,
		ParentAgreementID: root.ID,
		RootAgreementID:   root.ID,
		UpdatedAt:         root.UpdatedAt.Add(1 * time.Minute),
	}
	amendment := stores.AgreementRecord{
		ID:                   "agreement-amendment",
		Title:                "Amendment Agreement",
		Status:               stores.AgreementStatusCompleted,
		WorkflowKind:         stores.AgreementWorkflowKindAmendment,
		ParentAgreementID:    correction.ID,
		RootAgreementID:      root.ID,
		ParentExecutedSHA256: strings.Repeat("f", 64),
		UpdatedAt:            root.UpdatedAt.Add(2 * time.Minute),
	}

	index := buildAgreementLineageIndex([]stores.AgreementRecord{root, correction, amendment})
	rootLineage := index[root.ID]
	if rootLineage.SupersededByAgreementID != correction.ID {
		t.Fatalf("expected root superseded by correction, got %+v", rootLineage)
	}
	if rootLineage.ActiveAgreementID != amendment.ID {
		t.Fatalf("expected amendment to be the active lineage agreement, got %+v", rootLineage)
	}
	if len(rootLineage.RelatedAgreements) != 2 {
		t.Fatalf("expected root related agreements summary, got %+v", rootLineage.RelatedAgreements)
	}
	correctionLineage := index[correction.ID]
	if correctionLineage.ActiveAgreementID != amendment.ID {
		t.Fatalf("expected correction lineage active agreement %q, got %+v", amendment.ID, correctionLineage)
	}
	if correctionLineage.IsActiveVersion {
		t.Fatalf("expected correction not to be marked active once amended, got %+v", correctionLineage)
	}
	if len(correctionLineage.RelatedAgreements) != 2 {
		t.Fatalf("expected correction related agreements summary, got %+v", correctionLineage.RelatedAgreements)
	}
	if got := strings.TrimSpace(toString(correctionLineage.RelatedAgreements[0]["id"])); got != amendment.ID {
		t.Fatalf("expected most recent related agreement first, got %+v", correctionLineage.RelatedAgreements)
	}
	amendmentLineage := index[amendment.ID]
	if !amendmentLineage.IsActiveVersion {
		t.Fatalf("expected amendment to be marked active, got %+v", amendmentLineage)
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

func TestExpandAgreementFieldRulesClampsPagesToBounds(t *testing.T) {
	// Test that rule page values exceeding documentPageCount are clamped
	recipients := []stores.RecipientRecord{
		{ID: "signer-1", Email: "signer@example.com", Role: stores.RecipientRoleSigner},
	}

	// Rule with page values exceeding document bounds (doc has 3 pages, rule specifies pages 1-10)
	rules := []agreementFieldRuleFormInput{
		{
			ID:            "rule-clamp-1",
			Type:          "initials_each_page",
			ParticipantID: "signer-1",
			FromPage:      1,
			ToPage:        10, // Exceeds document page count of 3
		},
		{
			ID:            "rule-clamp-2",
			Type:          "signature_once",
			ParticipantID: "signer-1",
			Page:          5, // Exceeds document page count of 3
		},
	}

	documentPageCount := 3
	expanded, err := expandAgreementFieldRules(rules, recipients, nil, documentPageCount)
	if err != nil {
		t.Fatalf("expandAgreementFieldRules: %v", err)
	}

	// Verify initials are only generated for pages 1-3 (clamped from 1-10)
	initialsPages := []int{}
	signaturePages := []int{}
	for _, field := range expanded {
		switch field.Type {
		case stores.FieldTypeInitials:
			initialsPages = append(initialsPages, field.PageNumber)
		case stores.FieldTypeSignature:
			signaturePages = append(signaturePages, field.PageNumber)
		}
	}

	sort.Ints(initialsPages)
	if len(initialsPages) != 3 {
		t.Fatalf("expected 3 initials fields (clamped to doc bounds), got %d: %v", len(initialsPages), initialsPages)
	}
	if initialsPages[0] != 1 || initialsPages[1] != 2 || initialsPages[2] != 3 {
		t.Fatalf("expected initials pages [1 2 3], got %v", initialsPages)
	}

	// Verify signature page is clamped to 3 (from 5)
	if len(signaturePages) != 1 {
		t.Fatalf("expected 1 signature field, got %d", len(signaturePages))
	}
	if signaturePages[0] != 3 {
		t.Fatalf("expected signature page clamped to 3, got %d", signaturePages[0])
	}
}

func TestExpandAgreementFieldRulesClampsFromPageToBounds(t *testing.T) {
	// Test that from_page exceeding documentPageCount is also clamped
	recipients := []stores.RecipientRecord{
		{ID: "signer-1", Email: "signer@example.com", Role: stores.RecipientRoleSigner},
	}

	rules := []agreementFieldRuleFormInput{
		{
			ID:            "rule-from-clamp",
			Type:          "initials_each_page",
			ParticipantID: "signer-1",
			FromPage:      10, // Exceeds document page count
			ToPage:        15, // Exceeds document page count
		},
	}

	documentPageCount := 5
	expanded, err := expandAgreementFieldRules(rules, recipients, nil, documentPageCount)
	if err != nil {
		t.Fatalf("expandAgreementFieldRules: %v", err)
	}

	// Both from_page and to_page should be clamped to 5, resulting in 1 field on page 5
	if len(expanded) != 1 {
		t.Fatalf("expected 1 field (both pages clamped to 5), got %d", len(expanded))
	}
	if expanded[0].PageNumber != 5 {
		t.Fatalf("expected page 5, got %d", expanded[0].PageNumber)
	}
}

func TestExpandAgreementFieldRulesClampsNegativePagesToLowerBound(t *testing.T) {
	recipients := []stores.RecipientRecord{
		{ID: "signer-1", Email: "signer@example.com", Role: stores.RecipientRoleSigner},
	}

	rules := []agreementFieldRuleFormInput{
		{
			ID:            "rule-negative-range",
			Type:          "initials_each_page",
			ParticipantID: "signer-1",
			FromPage:      -4,
			ToPage:        2,
		},
		{
			ID:            "rule-negative-signature",
			Type:          "signature_once",
			ParticipantID: "signer-1",
			Page:          -7,
		},
	}

	documentPageCount := 5
	expanded, err := expandAgreementFieldRules(rules, recipients, nil, documentPageCount)
	if err != nil {
		t.Fatalf("expandAgreementFieldRules: %v", err)
	}

	initialsPages := []int{}
	signaturePages := []int{}
	for _, field := range expanded {
		switch field.Type {
		case stores.FieldTypeInitials:
			initialsPages = append(initialsPages, field.PageNumber)
		case stores.FieldTypeSignature:
			signaturePages = append(signaturePages, field.PageNumber)
		}
	}
	sort.Ints(initialsPages)

	if len(initialsPages) != 2 || initialsPages[0] != 1 || initialsPages[1] != 2 {
		t.Fatalf("expected initials pages [1 2], got %v", initialsPages)
	}
	if len(signaturePages) != 1 || signaturePages[0] != 1 {
		t.Fatalf("expected signature page clamped to 1, got %v", signaturePages)
	}
}

type typedDeleteConflictDocumentStore struct {
	deleteErr error
}

func (s typedDeleteConflictDocumentStore) Create(context.Context, stores.Scope, stores.DocumentRecord) (stores.DocumentRecord, error) {
	return stores.DocumentRecord{}, nil
}

func (s typedDeleteConflictDocumentStore) Get(context.Context, stores.Scope, string) (stores.DocumentRecord, error) {
	return stores.DocumentRecord{}, nil
}

func (s typedDeleteConflictDocumentStore) List(context.Context, stores.Scope, stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	return nil, nil
}

func (s typedDeleteConflictDocumentStore) SaveMetadata(context.Context, stores.Scope, string, stores.DocumentMetadataPatch) (stores.DocumentRecord, error) {
	return stores.DocumentRecord{}, nil
}

func (s typedDeleteConflictDocumentStore) Delete(context.Context, stores.Scope, string) error {
	return s.deleteErr
}

func seedESignDocument(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, id string) {
	t.Helper()
	now := time.Now().UTC()
	_, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 id,
		Title:              "Seed Document",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/" + id + ".pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          2048,
		PageCount:          1,
		CreatedAt:          now,
		UpdatedAt:          now,
	})
	if err != nil {
		t.Fatalf("seed document: %v", err)
	}
}
