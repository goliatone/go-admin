package services

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

func TestSignerAssetContractResolveIncludesSourceObjectWhenBlobExists(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	doc, err := store.Get(ctx, scope, agreement.DocumentID)
	if err != nil {
		t.Fatalf("Get document: %v", err)
	}
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	if _, uploadErr := objectStore.UploadFile(ctx, doc.SourceObjectKey, GenerateDeterministicPDF(1), uploader.WithContentType("application/pdf")); uploadErr != nil {
		t.Fatalf("UploadFile source object: %v", uploadErr)
	}

	service := NewSignerAssetContractService(store, WithSignerAssetObjectStore(objectStore))
	contract, err := service.Resolve(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if !contract.SourceDocumentAvailable {
		t.Fatal("expected source document to be available when source blob exists")
	}
	if contract.SourceObjectKey != doc.SourceObjectKey {
		t.Fatalf("expected source object key %q, got %q", doc.SourceObjectKey, contract.SourceObjectKey)
	}
}

func TestSignerAssetContractResolveMarksSourceUnavailableWhenBlobMissing(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	service := NewSignerAssetContractService(store, WithSignerAssetObjectStore(objectStore))
	contract, err := service.Resolve(context.Background(), scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if contract.SourceDocumentAvailable {
		t.Fatal("expected source document to be unavailable when source blob is missing")
	}
	if contract.SourceObjectKey != "" {
		t.Fatalf("expected source object key to be hidden when blob is missing, got %q", contract.SourceObjectKey)
	}
}
