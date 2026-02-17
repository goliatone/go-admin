package jobs

import (
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestNewGoogleDriveImportQueueFailsWhenImporterMissing(t *testing.T) {
	_, err := NewGoogleDriveImportQueue(NewHandlers(HandlerDependencies{}))
	if err == nil {
		t.Fatal("expected error when google importer dependency is missing")
	}
}

func TestNewGoogleDriveImportQueueAcceptsConfiguredImporter(t *testing.T) {
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	queue, err := NewGoogleDriveImportQueue(NewHandlers(HandlerDependencies{
		GoogleImporter: google,
	}))
	if err != nil {
		t.Fatalf("NewGoogleDriveImportQueue: %v", err)
	}
	queue.Close()
}
