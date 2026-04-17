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

type syncValidationRuntime struct {
	scope       stores.Scope
	actorID     string
	documentSvc services.DocumentService
	draftSvc    services.DraftService
}

type syncValidationDraftContext struct {
	document stores.DocumentRecord
	draft    stores.DraftRecord
}

type syncValidationSendOutcome struct {
	result gosynccore.MutationResult
	err    error
}

type syncValidationReplayOutcome struct {
	replayResult gosynccore.MutationResult
	currentRev   int64
	retryErr     error
}

// RunSyncValidationProfile exercises the example sync flow through autosave, stale conflict, pending retry, and send replay.
func RunSyncValidationProfile(ctx context.Context) (SyncValidationResult, error) {
	observability.ResetSyncMetrics()
	defer observability.ResetSyncMetrics()

	storeDSN, cleanup := resolveValidationSQLiteDSN("sync-validation-profile")
	defer runSyncValidationCallback(cleanup)
	store, storeCleanup, err := newValidationRuntimeStore(ctx, storeDSN)
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("initialize sync validation runtime store: %w", err)
	}
	defer runSyncValidationCleanup(storeCleanup)

	runtime := newSyncValidationRuntime(store)
	draftCtx, err := createSyncValidationDraft(ctx, runtime)
	if err != nil {
		return SyncValidationResult{}, err
	}

	observer := observability.NewSyncKernelObserver()
	idempotencyStore := esignsync.NewAgreementDraftIdempotencyStore(store)
	resourceStore := esignsync.NewAgreementDraftResourceStore(runtime.draftSvc)
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
		ID:    draftCtx.draft.ID,
		Scope: esignsync.BuildIdentityScope(runtime.scope, runtime.actorID),
	}

	autosavePayload, err := jsonPayload(syncValidationAutosavePayload(draftCtx.document.ID, "Sync Validation Draft", "Second pass", 3))
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("marshal sync validation autosave payload: %w", err)
	}
	successResult, err := svc.Mutate(ctx, gosynccore.MutationInput{
		ResourceRef:      ref,
		Operation:        esignsync.OperationAutosave,
		ExpectedRevision: draftCtx.draft.Revision,
		ActorID:          runtime.actorID,
		Payload:          autosavePayload,
	})
	if err != nil {
		return SyncValidationResult{}, fmt.Errorf("autosave sync validation draft: %w", err)
	}

	conflictErr := runSyncValidationConflict(ctx, svc, ref, runtime.actorID, draftCtx.draft.Revision, draftCtx.document.ID)
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

	replayOutcome, err := executeSyncValidationReplay(ctx, blockingSvc, blockingStore, ref, runtime.actorID, successResult.Snapshot.Revision)
	if err != nil {
		return SyncValidationResult{}, err
	}

	agreementID, err := requireSyncValidationAgreementID(replayOutcome.replayResult.Snapshot)
	if err != nil {
		return SyncValidationResult{}, err
	}
	snapshot, err := validatedSyncValidationSnapshot()
	if err != nil {
		return SyncValidationResult{}, err
	}

	return SyncValidationResult{
		DraftID:      draftCtx.draft.ID,
		AgreementID:  agreementID,
		Replay:       replayOutcome.replayResult,
		Snapshot:     snapshot,
		CurrentRev:   currentRevision,
		RetryMessage: strings.TrimSpace(replayOutcome.retryErr.Error()),
	}, nil
}

func runSyncValidationCleanup(cleanup func() error) {
	if cleanup != nil {
		_ = cleanup()
	}
}

func runSyncValidationCallback(cleanup func()) {
	if cleanup != nil {
		cleanup()
	}
}

func requireSyncValidationAgreementID(snapshot gosynccore.Snapshot) (string, error) {
	agreementID := strings.TrimSpace(syncValidationAgreementID(snapshot))
	if agreementID == "" {
		return "", fmt.Errorf("expected agreement_id in replay snapshot")
	}
	return agreementID, nil
}

func validatedSyncValidationSnapshot() (observability.SyncMetricsSnapshot, error) {
	snapshot := observability.SyncSnapshot()
	if snapshot.ConflictTotal < 1 {
		return observability.SyncMetricsSnapshot{}, fmt.Errorf("expected at least one sync conflict metric, got %+v", snapshot)
	}
	if snapshot.RetryTotal < 1 {
		return observability.SyncMetricsSnapshot{}, fmt.Errorf("expected at least one sync retry metric, got %+v", snapshot)
	}
	if snapshot.ReplayTotal < 1 || snapshot.ReplayByOperation["send"] < 1 {
		return observability.SyncMetricsSnapshot{}, fmt.Errorf("expected send replay metrics, got %+v", snapshot)
	}
	return snapshot, nil
}

func newSyncValidationRuntime(store stores.Store) syncValidationRuntime {
	scope := stores.Scope{TenantID: "tenant-sync-validation", OrgID: "org-sync-validation"}
	actorID := "release-sync-validation"
	documentSvc := services.NewDocumentService(store)
	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(store),
	)
	return syncValidationRuntime{
		scope:       scope,
		actorID:     actorID,
		documentSvc: documentSvc,
		draftSvc:    draftSvc,
	}
}

func createSyncValidationDraft(ctx context.Context, runtime syncValidationRuntime) (syncValidationDraftContext, error) {
	document, err := runtime.documentSvc.Upload(ctx, runtime.scope, services.DocumentUploadInput{
		Title:              "Sync Validation Source",
		SourceOriginalName: "sync-validation.pdf",
		ObjectKey:          fmt.Sprintf("tenant/%s/org/%s/docs/sync-validation/source.pdf", runtime.scope.TenantID, runtime.scope.OrgID),
		PDF:                services.GenerateDeterministicPDF(1),
		CreatedBy:          runtime.actorID,
	})
	if err != nil {
		return syncValidationDraftContext{}, fmt.Errorf("upload sync validation document: %w", err)
	}
	draft, _, err := runtime.draftSvc.Create(ctx, runtime.scope, services.DraftCreateInput{
		WizardID:        "wizard-sync-validation",
		CreatedByUserID: runtime.actorID,
		Title:           "Sync Validation Draft",
		CurrentStep:     2,
		DocumentID:      document.ID,
		WizardState:     syncValidationWizardState(document.ID, "Sync Validation Draft", "First pass"),
	})
	if err != nil {
		return syncValidationDraftContext{}, fmt.Errorf("create sync validation draft: %w", err)
	}
	return syncValidationDraftContext{document: document, draft: draft}, nil
}

func newSyncValidationSendInput(
	ref gosynccore.ResourceRef,
	actorID string,
	expectedRevision int64,
) (gosynccore.MutationInput, error) {
	sendPayload, err := jsonPayload(map[string]any{})
	if err != nil {
		return gosynccore.MutationInput{}, fmt.Errorf("marshal sync validation send payload: %w", err)
	}
	return gosynccore.MutationInput{
		ResourceRef:      ref,
		Operation:        esignsync.OperationSend,
		ExpectedRevision: expectedRevision,
		ActorID:          actorID,
		IdempotencyKey:   "sync-validation-send-once",
		Payload:          sendPayload,
	}, nil
}

func executeSyncValidationReplay(
	ctx context.Context,
	blockingSvc gosynccore.SyncService,
	blockingStore *blockingMutationResourceStore,
	ref gosynccore.ResourceRef,
	actorID string,
	expectedRevision int64,
) (syncValidationReplayOutcome, error) {
	sendInput, err := newSyncValidationSendInput(ref, actorID, expectedRevision)
	if err != nil {
		return syncValidationReplayOutcome{}, err
	}
	firstSend, retryErr, err := runSyncValidationFirstSend(ctx, blockingSvc, blockingStore, sendInput)
	if err != nil {
		return syncValidationReplayOutcome{}, err
	}
	replayResult, err := blockingSvc.Mutate(ctx, sendInput)
	if err != nil {
		return syncValidationReplayOutcome{}, fmt.Errorf("replay sync validation send: %w", err)
	}
	if !replayResult.Replay {
		return syncValidationReplayOutcome{}, fmt.Errorf("expected sync validation replay result")
	}
	return syncValidationReplayOutcome{replayResult: replayResult, currentRev: firstSend.result.Snapshot.Revision, retryErr: retryErr}, nil
}

func runSyncValidationFirstSend(
	ctx context.Context,
	blockingSvc gosynccore.SyncService,
	blockingStore *blockingMutationResourceStore,
	sendInput gosynccore.MutationInput,
) (syncValidationSendOutcome, error, error) {
	firstSendCh := make(chan syncValidationSendOutcome, 1)
	go func() {
		result, mutateErr := blockingSvc.Mutate(ctx, sendInput)
		firstSendCh <- syncValidationSendOutcome{result: result, err: mutateErr}
	}()
	blockingStore.waitUntilBlocked()
	_, retryErr := blockingSvc.Mutate(ctx, sendInput)
	if retryErr == nil || !gosynccore.HasCode(retryErr, gosynccore.CodeTemporaryFailure) {
		return syncValidationSendOutcome{}, nil, fmt.Errorf("expected retry-safe temporary failure while first send was in flight, got %v", retryErr)
	}
	blockingStore.release()
	firstSend := <-firstSendCh
	if firstSend.err != nil {
		return syncValidationSendOutcome{}, nil, fmt.Errorf("complete first sync validation send: %w", firstSend.err)
	}
	if firstSend.result.Replay {
		return syncValidationSendOutcome{}, nil, fmt.Errorf("expected first send not to be a replay")
	}
	return firstSend, retryErr, nil
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
