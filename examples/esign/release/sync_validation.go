package release

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	esignsync "github.com/goliatone/go-admin/examples/esign/sync"
	gosynccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
	syncstore "github.com/goliatone/go-admin/pkg/go-sync/store"
)

type SyncValidationResult struct {
	DraftID      string                            `json:"draft_id"`
	AgreementID  string                            `json:"agreement_id"`
	Replay       gosynccore.MutationResult         `json:"replay"`
	Snapshot     observability.SyncMetricsSnapshot `json:"snapshot"`
	CurrentRev   int64                             `json:"current_revision"`
	RetryMessage string                            `json:"retry_message"`
}

// RunSyncValidationProfile exercises the example sync flow through autosave, stale conflict, pending retry, and send replay.
func RunSyncValidationProfile(ctx context.Context) (SyncValidationResult, error) {
	observability.ResetSyncMetrics()
	defer observability.ResetSyncMetrics()

	storeDSN, cleanup := resolveValidationSQLiteDSN("sync-validation-profile")
	if cleanup != nil {
		defer cleanup()
	}
	store, storeCleanup, err := newValidationRuntimeStore(ctx, storeDSN)
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("initialize sync validation runtime store: %w", err)
	}
	defer func() {
		if storeCleanup != nil {
			_ = storeCleanup()
		}
	}()

	scope := stores.Scope{TenantID: "tenant-sync-validation", OrgID: "org-sync-validation"}
	actorID := "release-sync-validation"

	documentSvc := services.NewDocumentService(store)
	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(store),
	)

	document, err := documentSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Sync Validation Source",
		SourceOriginalName: "sync-validation.pdf",
		ObjectKey:          fmt.Sprintf("tenant/%s/org/%s/docs/sync-validation/source.pdf", scope.TenantID, scope.OrgID),
		PDF:                services.GenerateDeterministicPDF(1),
		CreatedBy:          actorID,
	})
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("upload sync validation document: %w", err)
	}

	draft, _, err := draftSvc.Create(ctx, scope, services.DraftCreateInput{
		WizardID:        "wizard-sync-validation",
		CreatedByUserID: actorID,
		Title:           "Sync Validation Draft",
		CurrentStep:     2,
		DocumentID:      document.ID,
		WizardState:     syncValidationWizardState(document.ID, "Sync Validation Draft", "First pass"),
	})
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("create sync validation draft: %w", err)
	}

	observer := observability.NewSyncKernelObserver()
	idempotencyStore := esignsync.NewAgreementDraftIdempotencyStore(store)
	resourceStore := esignsync.NewAgreementDraftResourceStore(draftSvc)
	svc, err := syncservice.NewSyncService(
		resourceStore,
		idempotencyStore,
		syncservice.WithMetrics(observer),
		syncservice.WithLogger(observer),
	)
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("build sync validation service: %w", err)
	}

	ref := gosynccore.ResourceRef{
		Kind:  esignsync.ResourceKindAgreementDraft,
		ID:    draft.ID,
		Scope: esignsync.BuildIdentityScope(scope, actorID),
	}

	autosavePayload, err := jsonPayload(syncValidationAutosavePayload(document.ID, "Sync Validation Draft", "Second pass", 3))
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("marshal sync validation autosave payload: %w", err)
	}
	successResult, err := svc.Mutate(ctx, gosynccore.MutationInput{
		ResourceRef:      ref,
		Operation:        esignsync.OperationAutosave,
		ExpectedRevision: draft.Revision,
		ActorID:          actorID,
		Payload:          autosavePayload,
	})
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("autosave sync validation draft: %w", err)
	}

	conflictErr := runSyncValidationConflict(ctx, svc, ref, actorID, draft.Revision, document.ID)
	currentRevision, _, ok := gosynccore.StaleRevisionDetails(conflictErr)
	if !ok {
		return SyncValidationResult{}, fmt.Errorf("expected stale revision details from sync validation conflict, got %v", conflictErr)
	}

	blockingStore := newBlockingMutationResourceStore(resourceStore, esignsync.OperationSend)
	blockingSvc, err := syncservice.NewSyncService(
		blockingStore,
		idempotencyStore,
		syncservice.WithMetrics(observer),
		syncservice.WithLogger(observer),
	)
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("build blocking sync validation service: %w", err)
	}

	sendPayload, err := jsonPayload(map[string]any{})
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("marshal sync validation send payload: %w", err)
	}
	sendInput := gosynccore.MutationInput{
		ResourceRef:      ref,
		Operation:        esignsync.OperationSend,
		ExpectedRevision: successResult.Snapshot.Revision,
		ActorID:          actorID,
		IdempotencyKey:   "sync-validation-send-once",
		Payload:          sendPayload,
	}

	type sendOutcome struct {
		result gosynccore.MutationResult
		err    error
	}
	firstSendCh := make(chan sendOutcome, 1)
	go func() {
		result, mutateErr := blockingSvc.Mutate(ctx, sendInput)
		firstSendCh <- sendOutcome{result: result, err: mutateErr}
	}()

	blockingStore.waitUntilBlocked()

	_, retryErr := blockingSvc.Mutate(ctx, sendInput)
	if retryErr == nil || !gosynccore.HasCode(retryErr, gosynccore.CodeTemporaryFailure) {
		return SyncValidationResult{}, fmt.Errorf("expected retry-safe temporary failure while first send was in flight, got %v", retryErr)
	}

	blockingStore.release()
	firstSend := <-firstSendCh
	if firstSend.err != nil {
		return SyncValidationResult{}, fmt.Errorf("complete first sync validation send: %w", firstSend.err)
	}
	if firstSend.result.Replay {
		return SyncValidationResult{}, fmt.Errorf("expected first send not to be a replay")
	}

	replayResult, err := blockingSvc.Mutate(ctx, sendInput)
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("replay sync validation send: %w", err)
	}
	if !replayResult.Replay {
		return SyncValidationResult{}, fmt.Errorf("expected sync validation replay result")
	}

	agreementID := strings.TrimSpace(syncValidationAgreementID(replayResult.Snapshot))
	if agreementID == "" {
		return SyncValidationResult{}, fmt.Errorf("expected agreement_id in replay snapshot")
	}

	snapshot := observability.SyncSnapshot()
	if snapshot.ConflictTotal < 1 {
		return SyncValidationResult{}, fmt.Errorf("expected at least one sync conflict metric, got %+v", snapshot)
	}
	if snapshot.RetryTotal < 1 {
		return SyncValidationResult{}, fmt.Errorf("expected at least one sync retry metric, got %+v", snapshot)
	}
	if snapshot.ReplayTotal < 1 || snapshot.ReplayByOperation["send"] < 1 {
		return SyncValidationResult{}, fmt.Errorf("expected send replay metrics, got %+v", snapshot)
	}

	return SyncValidationResult{
		DraftID:      draft.ID,
		AgreementID:  agreementID,
		Replay:       replayResult,
		Snapshot:     snapshot,
		CurrentRev:   currentRevision,
		RetryMessage: strings.TrimSpace(retryErr.Error()),
	}, nil
}

func runSyncValidationConflict(
	ctx context.Context,
	svc gosynccore.SyncService,
	ref gosynccore.ResourceRef,
	actorID string,
	staleRevision int64,
	documentID string,
) error {
	payload, err := jsonPayload(syncValidationAutosavePayload(documentID, "Sync Validation Draft", "Stale branch", 4))
	if err != nil {
		return fmt.Errorf("marshal sync validation conflict payload: %w", err)
	}
	_, err = svc.Mutate(ctx, gosynccore.MutationInput{
		ResourceRef:      ref,
		Operation:        esignsync.OperationAutosave,
		ExpectedRevision: staleRevision,
		ActorID:          actorID,
		Payload:          payload,
	})
	if err == nil {
		return fmt.Errorf("expected stale revision conflict")
	}
	return err
}

func syncValidationAgreementID(snapshot gosynccore.Snapshot) string {
	if len(snapshot.Data) == 0 {
		return ""
	}
	payload := map[string]any{}
	if err := json.Unmarshal(snapshot.Data, &payload); err != nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(payload["agreement_id"]))
}

func syncValidationAutosavePayload(documentID, title, message string, step int) map[string]any {
	return map[string]any{
		"wizard_state": syncValidationWizardState(documentID, title, message),
		"title":        title,
		"current_step": step,
		"document_id":  documentID,
	}
}

func syncValidationWizardState(documentID, title, message string) map[string]any {
	return map[string]any{
		"document": map[string]any{"id": documentID},
		"details": map[string]any{
			"title":   title,
			"message": message,
		},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "Sync Validation Signer",
				"email":  "sync.validation.signer@example.test",
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
	}
}

func jsonPayload(value any) ([]byte, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

type blockingMutationResourceStore struct {
	delegate       syncstore.ResourceStore
	blockOperation string
	entered        chan struct{}
	releaseCh      chan struct{}

	mu      sync.Mutex
	blocked bool
}

func newBlockingMutationResourceStore(delegate syncstore.ResourceStore, blockOperation string) *blockingMutationResourceStore {
	return &blockingMutationResourceStore{
		delegate:       delegate,
		blockOperation: strings.ToLower(strings.TrimSpace(blockOperation)),
		entered:        make(chan struct{}),
		releaseCh:      make(chan struct{}),
	}
}

func (s *blockingMutationResourceStore) Get(ctx context.Context, ref gosynccore.ResourceRef) (gosynccore.Snapshot, error) {
	return s.delegate.Get(ctx, ref)
}

func (s *blockingMutationResourceStore) Mutate(ctx context.Context, input gosynccore.MutationInput) (gosynccore.Snapshot, error) {
	if strings.ToLower(strings.TrimSpace(input.Operation)) == s.blockOperation && s.blockOnce() {
		close(s.entered)
		select {
		case <-s.releaseCh:
		case <-ctx.Done():
			return gosynccore.Snapshot{}, ctx.Err()
		}
	}
	return s.delegate.Mutate(ctx, input)
}

func (s *blockingMutationResourceStore) blockOnce() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.blocked {
		return false
	}
	s.blocked = true
	return true
}

func (s *blockingMutationResourceStore) waitUntilBlocked() {
	<-s.entered
}

func (s *blockingMutationResourceStore) release() {
	close(s.releaseCh)
}
