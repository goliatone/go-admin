package esignsync

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	gosynccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
)

type failingReplayAuditStore struct {
	base stores.DraftAuditEventStore
}

func (s failingReplayAuditStore) AppendDraftEvent(ctx context.Context, scope stores.Scope, event stores.DraftAuditEventRecord) (stores.DraftAuditEventRecord, error) {
	if event.EventType == replayStoredEventType {
		return stores.DraftAuditEventRecord{}, errors.New("replay audit append failed")
	}
	return s.base.AppendDraftEvent(ctx, scope, event)
}

func (s failingReplayAuditStore) ListDraftEvents(ctx context.Context, scope stores.Scope, draftID string, query stores.DraftAuditEventQuery) ([]stores.DraftAuditEventRecord, error) {
	return s.base.ListDraftEvents(ctx, scope, draftID, query)
}

func TestAgreementDraftIdempotencyStoreReplaysSendAfterRestartWithoutReplayAuditSnapshot(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	baseStore := stores.NewInMemoryStore()
	auditStore := failingReplayAuditStore{base: baseStore}

	docSvc := services.NewDocumentService(baseStore)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Replay Fallback Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/replay-fallback/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(baseStore)
	draftSvc := services.NewDraftService(baseStore,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(auditStore),
	)

	draft, _, err := draftSvc.Create(ctx, scope, services.DraftCreateInput{
		WizardID:        "wizard-replay-fallback",
		CreatedByUserID: "user-1",
		Title:           "Replay Fallback Draft",
		CurrentStep:     6,
		DocumentID:      doc.ID,
		WizardState: map[string]any{
			"document": map[string]any{"id": doc.ID},
			"details": map[string]any{
				"title":   "Replay Fallback Draft",
				"message": "Ready to send",
			},
			"participants": []map[string]any{
				{
					"tempId": "participant-1",
					"name":   "Signer One",
					"email":  "signer@example.com",
					"role":   "signer",
					"order":  1,
				},
			},
			"fieldDefinitions": []map[string]any{
				{
					"tempId":            "field-1",
					"type":              "signature",
					"participantTempId": "participant-1",
					"label":             "Signature",
					"required":          true,
				},
			},
			"fieldPlacements": []map[string]any{
				{
					"fieldTempId": "field-1",
					"page":        1,
					"x":           96,
					"y":           128,
					"width":       180,
					"height":      32,
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	syncSvc, err := syncservice.NewSyncService(
		NewAgreementDraftResourceStore(draftSvc),
		NewAgreementDraftIdempotencyStore(auditStore),
	)
	if err != nil {
		t.Fatalf("NewSyncService: %v", err)
	}

	input := gosynccore.MutationInput{
		ResourceRef: gosynccore.ResourceRef{
			Kind:  ResourceKindAgreementDraft,
			ID:    draft.ID,
			Scope: BuildIdentityScope(scope, "user-1"),
		},
		Operation:        OperationSend,
		ExpectedRevision: draft.Revision,
		IdempotencyKey:   "send-once",
		ActorID:          "user-1",
	}

	first, err := syncSvc.Mutate(ctx, input)
	if err != nil {
		t.Fatalf("expected first mutate to succeed when replay audit append fails, got %v", err)
	}
	if first.Replay {
		t.Fatalf("expected first send not to be a replay, got %+v", first)
	}

	restarted, err := syncservice.NewSyncService(
		NewAgreementDraftResourceStore(draftSvc),
		NewAgreementDraftIdempotencyStore(auditStore),
	)
	if err != nil {
		t.Fatalf("NewSyncService restart: %v", err)
	}

	result, err := restarted.Mutate(ctx, input)
	if err != nil {
		t.Fatalf("expected replay from draft.sent fallback, got error: %v", err)
	}
	if !result.Replay {
		t.Fatalf("expected replay=true on recovered send, got %+v", result)
	}
}
