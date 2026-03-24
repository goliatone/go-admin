package commands

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-command/registry"
	goerrors "github.com/goliatone/go-errors"
)

type stubAgreementLifecycleService struct {
	sentCalls         int
	voidCalls         int
	resendCalls       int
	revisionCalls     int
	reviewCalls       int
	commentCalls      int
	lastScope         stores.Scope
	lastID            string
	lastSend          services.SendInput
	lastVoid          services.VoidInput
	lastResend        services.ResendInput
	lastRevision      services.CreateRevisionInput
	lastReviewNotify  services.ReviewNotifyInput
	lastReviewControl services.ReviewReminderControlInput
	sendErr           error
	revisionErr       error
}

func (s *stubAgreementLifecycleService) Send(_ context.Context, scope stores.Scope, agreementID string, input services.SendInput) (stores.AgreementRecord, error) {
	s.sentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastSend = input
	if s.sendErr != nil {
		return stores.AgreementRecord{}, s.sendErr
	}
	return stores.AgreementRecord{ID: agreementID, Status: stores.AgreementStatusSent}, nil
}

func (s *stubAgreementLifecycleService) Void(_ context.Context, scope stores.Scope, agreementID string, input services.VoidInput) (stores.AgreementRecord, error) {
	s.voidCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastVoid = input
	return stores.AgreementRecord{ID: agreementID, Status: stores.AgreementStatusVoided}, nil
}

func (s *stubAgreementLifecycleService) Resend(_ context.Context, scope stores.Scope, agreementID string, input services.ResendInput) (services.ResendResult, error) {
	s.resendCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastResend = input
	return services.ResendResult{Agreement: stores.AgreementRecord{ID: agreementID, Status: stores.AgreementStatusSent}}, nil
}

func (s *stubAgreementLifecycleService) CreateRevision(_ context.Context, scope stores.Scope, input services.CreateRevisionInput) (stores.AgreementRecord, error) {
	s.revisionCalls++
	s.lastScope = scope
	s.lastID = input.SourceAgreementID
	s.lastRevision = input
	if s.revisionErr != nil {
		return stores.AgreementRecord{}, s.revisionErr
	}
	workflowKind := stores.AgreementWorkflowKindCorrection
	if input.Kind == services.AgreementRevisionKindAmendment {
		workflowKind = stores.AgreementWorkflowKindAmendment
	}
	return stores.AgreementRecord{
		ID:                "revision-" + input.SourceAgreementID,
		Status:            stores.AgreementStatusDraft,
		WorkflowKind:      workflowKind,
		ParentAgreementID: input.SourceAgreementID,
		RootAgreementID:   input.SourceAgreementID,
	}, nil
}

func (s *stubAgreementLifecycleService) OpenReview(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewOpenInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusInReview}, nil
}

func (s *stubAgreementLifecycleService) ReopenReview(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewOpenInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusInReview}, nil
}

func (s *stubAgreementLifecycleService) NotifyReviewers(_ context.Context, scope stores.Scope, agreementID string, input services.ReviewNotifyInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastReviewNotify = input
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusInReview}, nil
}

func (s *stubAgreementLifecycleService) CloseReview(_ context.Context, scope stores.Scope, agreementID, _, _, _ string) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusClosed}, nil
}

func (s *stubAgreementLifecycleService) ForceApproveReview(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewOverrideInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusApproved, OverrideActive: true}, nil
}

func (s *stubAgreementLifecycleService) ApproveReviewParticipantOnBehalf(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewApproveOnBehalfInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusInReview}, nil
}

func (s *stubAgreementLifecycleService) ApproveReview(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewDecisionInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusApproved}, nil
}

func (s *stubAgreementLifecycleService) RequestReviewChanges(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewDecisionInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusChangesRequested}, nil
}

func (s *stubAgreementLifecycleService) CreateCommentThread(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewCommentThreadInput) (services.ReviewThread, error) {
	s.commentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewThread{}, nil
}

func (s *stubAgreementLifecycleService) ReplyCommentThread(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewCommentReplyInput) (services.ReviewThread, error) {
	s.commentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewThread{}, nil
}

func (s *stubAgreementLifecycleService) ResolveCommentThread(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewCommentStateInput) (services.ReviewThread, error) {
	s.commentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewThread{}, nil
}

func (s *stubAgreementLifecycleService) ReopenCommentThread(_ context.Context, scope stores.Scope, agreementID string, _ services.ReviewCommentStateInput) (services.ReviewThread, error) {
	s.commentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return services.ReviewThread{}, nil
}

type stubTokenRotator struct {
	calls         int
	lastScope     stores.Scope
	lastAgreement string
	lastRecipient string
}

func (s *stubTokenRotator) Rotate(_ context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error) {
	s.calls++
	s.lastScope = scope
	s.lastAgreement = agreementID
	s.lastRecipient = recipientID
	return stores.IssuedSigningToken{}, nil
}

type stubProjector struct{ calls int }

func (s *stubProjector) ProjectAgreement(_ context.Context, _ stores.Scope, _ string) error {
	s.calls++
	return nil
}

type stubPDFRemediationCommandService struct {
	calls     int
	lastScope stores.Scope
	lastInput services.PDFRemediationRequest
	result    services.PDFRemediationResult
	err       error
}

func (s *stubPDFRemediationCommandService) Remediate(_ context.Context, scope stores.Scope, input services.PDFRemediationRequest) (services.PDFRemediationResult, error) {
	s.calls++
	s.lastScope = scope
	s.lastInput = input
	if s.err != nil {
		return services.PDFRemediationResult{}, s.err
	}
	if s.result.Document.ID == "" {
		s.result.Document.ID = input.DocumentID
	}
	if s.result.Document.RemediationStatus == "" {
		s.result.Document.RemediationStatus = services.PDFRemediationStatusSucceeded
	}
	if s.result.OutputObjectKey == "" {
		s.result.OutputObjectKey = "tenant/default/remediated.pdf"
	}
	return s.result, nil
}

type stubDraftCleanupService struct {
	calls      int
	lastBefore time.Time
}

func (s *stubDraftCleanupService) CleanupExpiredDrafts(_ context.Context, before time.Time) (int, error) {
	s.calls++
	s.lastBefore = before
	return 2, nil
}

type stubAgreementReminderService struct {
	sweepCalls    int
	cleanupCalls  int
	pauseCalls    int
	resumeCalls   int
	sendNowCalls  int
	lastScope     stores.Scope
	lastID        string
	lastRecipient string
	lastCleanupAt time.Time
	lastLimit     int
	sweepResult   services.AgreementReminderSweepResult
	sendNowResult services.ResendResult
}

func (s *stubAgreementReminderService) Sweep(_ context.Context, scope stores.Scope) (services.AgreementReminderSweepResult, error) {
	s.sweepCalls++
	s.lastScope = scope
	return s.sweepResult, nil
}

func (s *stubAgreementReminderService) CleanupInternalErrors(_ context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	s.cleanupCalls++
	s.lastScope = scope
	s.lastCleanupAt = now
	s.lastLimit = limit
	return 1, nil
}

func (s *stubAgreementReminderService) Pause(_ context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	s.pauseCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastRecipient = recipientID
	return stores.AgreementReminderStateRecord{
		AgreementID: agreementID,
		RecipientID: recipientID,
		Status:      stores.AgreementReminderStatusPaused,
	}, nil
}

func (s *stubAgreementReminderService) Resume(_ context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	s.resumeCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastRecipient = recipientID
	return stores.AgreementReminderStateRecord{
		AgreementID: agreementID,
		RecipientID: recipientID,
		Status:      stores.AgreementReminderStatusActive,
	}, nil
}

func (s *stubAgreementReminderService) SendNow(_ context.Context, scope stores.Scope, agreementID, recipientID string) (services.ResendResult, error) {
	s.sendNowCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastRecipient = recipientID
	if s.sendNowResult.Agreement.ID == "" {
		s.sendNowResult.Agreement.ID = agreementID
	}
	return s.sendNowResult, nil
}

func (s *stubAgreementLifecycleService) PauseReviewReminder(_ context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewReminderState, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastReviewControl = input
	return services.ReviewReminderState{
		AgreementID:   agreementID,
		ParticipantID: input.ParticipantID,
		RecipientID:   input.RecipientID,
		Status:        stores.AgreementReminderStatusPaused,
		Paused:        true,
	}, nil
}

func (s *stubAgreementLifecycleService) ResumeReviewReminder(_ context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewReminderState, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastReviewControl = input
	return services.ReviewReminderState{
		AgreementID:   agreementID,
		ParticipantID: input.ParticipantID,
		RecipientID:   input.RecipientID,
		Status:        stores.AgreementReminderStatusActive,
	}, nil
}

func (s *stubAgreementLifecycleService) SendReviewReminderNow(_ context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewSummary, error) {
	s.reviewCalls++
	s.lastScope = scope
	s.lastID = agreementID
	s.lastReviewControl = input
	return services.ReviewSummary{AgreementID: agreementID, Status: stores.AgreementReviewStatusInReview}, nil
}

func TestBuildAgreementSendInputUsesIDsFallback(t *testing.T) {
	msg, err := buildAgreementSendInput(map[string]any{"idempotency_key": "k1"}, []string{"agreement-1"})
	if err != nil {
		t.Fatalf("buildAgreementSendInput: %v", err)
	}
	if msg.AgreementID != "agreement-1" {
		t.Fatalf("agreement id mismatch: %q", msg.AgreementID)
	}
	if msg.IdempotencyKey != "k1" {
		t.Fatalf("idempotency key mismatch: %q", msg.IdempotencyKey)
	}
}

func TestStoreAgreementQueuedResponseOmitsSingularFieldsForMultiEffectDispatch(t *testing.T) {
	collector := &coreadmin.ActionResponseCollector{}
	ctx := coreadmin.ContextWithActionResponseCollector(context.Background(), collector)

	storeAgreementQueuedResponse(ctx, stores.AgreementRecord{
		ID:               "agreement-1",
		DeliveryStatus:   "prepared",
		DeliveryEffectID: "compat-only-effect",
	}, "corr-multi", []services.AgreementNotificationEffectDetail{
		{EffectID: "effect-a"},
		{EffectID: "effect-b"},
	})

	response, ok := collector.Load()
	if !ok {
		t.Fatal("expected action response stored")
	}
	if _, exists := response.Data["effect_id"]; exists {
		t.Fatalf("expected singular effect_id omitted for multi-effect response, got %+v", response.Data)
	}
	if _, exists := response.Data["status_url"]; exists {
		t.Fatalf("expected singular status_url omitted for multi-effect response, got %+v", response.Data)
	}
	effectIDs, ok := response.Data["effect_ids"].([]string)
	if !ok || len(effectIDs) != 2 {
		t.Fatalf("expected effect_ids slice for multi-effect response, got %+v", response.Data["effect_ids"])
	}
}

func TestStoreAgreementQueuedResponsePreservesSingularFieldsForSingleEffectDispatch(t *testing.T) {
	collector := &coreadmin.ActionResponseCollector{}
	ctx := coreadmin.ContextWithActionResponseCollector(context.Background(), collector)

	storeAgreementQueuedResponse(ctx, stores.AgreementRecord{
		ID:             "agreement-1",
		DeliveryStatus: "prepared",
	}, "corr-single", []services.AgreementNotificationEffectDetail{
		{EffectID: "effect-single"},
	})

	response, ok := collector.Load()
	if !ok {
		t.Fatal("expected action response stored")
	}
	if got := strings.TrimSpace(fmt.Sprint(response.Data["effect_id"])); got != "effect-single" {
		t.Fatalf("expected singular effect_id for single-effect response, got %+v", response.Data)
	}
	if got := strings.TrimSpace(fmt.Sprint(response.Data["status_url"])); got != "/admin/api/v1/esign/effects/effect-single" {
		t.Fatalf("expected singular status_url for single-effect response, got %+v", response.Data)
	}
}

func TestRegisterDispatchesTypedAgreementAndTokenCommands(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	draftSvc := &stubDraftCleanupService{}
	projector := &stubProjector{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, draftSvc, nil, "", defaultScope, projector); err != nil {
		t.Fatalf("Register: %v", err)
	}

	if err := bus.DispatchByName(context.Background(), CommandAgreementSend, map[string]any{"agreement_id": "agreement-1", "idempotency_key": "k-send"}, nil); err != nil {
		t.Fatalf("DispatchByName send: %v", err)
	}
	if agreementSvc.sentCalls != 1 {
		t.Fatalf("expected send call count 1, got %d", agreementSvc.sentCalls)
	}
	if agreementSvc.lastScope != defaultScope {
		t.Fatalf("expected send scope %+v, got %+v", defaultScope, agreementSvc.lastScope)
	}

	if err := bus.DispatchByName(context.Background(), CommandTokenRotate, map[string]any{"agreement_id": "agreement-1", "recipient_id": "recipient-1"}, nil); err != nil {
		t.Fatalf("DispatchByName rotate: %v", err)
	}
	if tokenSvc.calls != 1 {
		t.Fatalf("expected rotate call count 1, got %d", tokenSvc.calls)
	}
	if tokenSvc.lastScope != defaultScope {
		t.Fatalf("expected rotate scope %+v, got %+v", defaultScope, tokenSvc.lastScope)
	}

	if err := bus.DispatchByName(context.Background(), CommandDraftCleanup, map[string]any{}, nil); err != nil {
		t.Fatalf("DispatchByName draft cleanup: %v", err)
	}
	if draftSvc.calls != 1 {
		t.Fatalf("expected draft cleanup call count 1, got %d", draftSvc.calls)
	}
	if draftSvc.lastBefore.IsZero() {
		t.Fatalf("expected draft cleanup before timestamp to be set")
	}

	if projector.calls < 2 {
		t.Fatalf("expected projector to be called for command transitions, got %d", projector.calls)
	}
	snapshot := observability.Snapshot()
	if snapshot.SendSuccessTotal != 1 {
		t.Fatalf("expected send success metric increment, got %+v", snapshot)
	}
}

func TestAgreementRevisionCommandsStoreRedirectActionResponse(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	agreementSvc := &stubAgreementLifecycleService{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, nil, nil, nil, "", defaultScope, nil); err != nil {
		t.Fatalf("Register: %v", err)
	}

	for _, tc := range []struct {
		name    string
		command string
		kind    services.AgreementRevisionKind
	}{
		{name: "correction", command: CommandAgreementRequestCorrection, kind: services.AgreementRevisionKindCorrection},
		{name: "amendment", command: CommandAgreementRequestAmendment, kind: services.AgreementRevisionKindAmendment},
	} {
		t.Run(tc.name, func(t *testing.T) {
			collector := &coreadmin.ActionResponseCollector{}
			ctx := coreadmin.ContextWithActionResponseCollector(context.Background(), collector)
			if err := bus.DispatchByName(ctx, tc.command, map[string]any{
				"agreement_id":    "agreement-1",
				"idempotency_key": "revision-key-1",
			}, nil); err != nil {
				t.Fatalf("DispatchByName %s: %v", tc.command, err)
			}
			if agreementSvc.revisionCalls == 0 {
				t.Fatal("expected revision command to invoke lifecycle service")
			}
			if agreementSvc.lastRevision.Kind != tc.kind {
				t.Fatalf("expected revision kind %q, got %+v", tc.kind, agreementSvc.lastRevision)
			}
			if got := strings.TrimSpace(agreementSvc.lastRevision.IdempotencyKey); got != "revision-key-1" {
				t.Fatalf("expected idempotency key forwarded, got %+v", agreementSvc.lastRevision)
			}
			response, ok := collector.Load()
			if !ok {
				t.Fatal("expected action response stored")
			}
			if got := strings.TrimSpace(fmt.Sprint(response.Data["redirect_record_id"])); got != "revision-agreement-1" {
				t.Fatalf("expected redirect record id stored, got %+v", response.Data)
			}
			if got := strings.TrimSpace(fmt.Sprint(response.Data["workflow_kind"])); got == "" {
				t.Fatalf("expected workflow kind stored, got %+v", response.Data)
			}
			if redirect, ok := response.Data["redirect_to_edit"].(bool); !ok || !redirect {
				t.Fatalf("expected redirect_to_edit=true, got %+v", response.Data)
			}
		})
	}
}

func TestAgreementSendCommandReturnsValidationErrorWhenAlreadySent(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	agreementSvc := &stubAgreementLifecycleService{
		sendErr: goerrors.New("invalid input", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(services.ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{
				"entity": "agreements",
				"field":  "status",
				"reason": "send requires draft status",
			}),
	}
	tokenSvc := &stubTokenRotator{}
	projector := &stubProjector{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, nil, nil, "", defaultScope, projector); err != nil {
		t.Fatalf("Register: %v", err)
	}

	err := bus.DispatchByName(context.Background(), CommandAgreementSend, map[string]any{
		"agreement_id":    "agreement-1",
		"idempotency_key": "k-send-fallback",
	}, nil)
	if err == nil {
		t.Fatal("expected send to fail for non-draft agreement")
	}
	if agreementSvc.sentCalls != 1 {
		t.Fatalf("expected send call count 1, got %d", agreementSvc.sentCalls)
	}
	if agreementSvc.resendCalls != 0 {
		t.Fatalf("expected resend call count 0, got %d", agreementSvc.resendCalls)
	}
	if !strings.Contains(err.Error(), "esign.agreements.send") {
		t.Fatalf("expected send command validation wrapper, got %v", err)
	}
}

func TestCommandsPropagateRequestIPFromContext(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, nil, nil, "", defaultScope, nil); err != nil {
		t.Fatalf("Register: %v", err)
	}

	ctx := coreadmin.WithRequestIP(context.Background(), "198.51.100.25")
	if err := bus.DispatchByName(ctx, CommandAgreementSend, map[string]any{"agreement_id": "agreement-1", "idempotency_key": "k-send"}, nil); err != nil {
		t.Fatalf("DispatchByName send: %v", err)
	}
	if got := agreementSvc.lastSend.IPAddress; got != "198.51.100.25" {
		t.Fatalf("expected send ip propagation, got %q", got)
	}
	if err := bus.DispatchByName(ctx, CommandAgreementVoid, map[string]any{"agreement_id": "agreement-1"}, nil); err != nil {
		t.Fatalf("DispatchByName void: %v", err)
	}
	if got := agreementSvc.lastVoid.IPAddress; got != "198.51.100.25" {
		t.Fatalf("expected void ip propagation, got %q", got)
	}
	if err := bus.DispatchByName(ctx, CommandAgreementResend, map[string]any{"agreement_id": "agreement-1"}, nil); err != nil {
		t.Fatalf("DispatchByName resend: %v", err)
	}
	if got := agreementSvc.lastResend.IPAddress; got != "198.51.100.25" {
		t.Fatalf("expected resend ip propagation, got %q", got)
	}
	if err := bus.DispatchByName(ctx, CommandAgreementNotifyReviewers, map[string]any{"agreement_id": "agreement-1", "recipient_id": "recipient-1"}, nil); err != nil {
		t.Fatalf("DispatchByName notify_reviewers: %v", err)
	}
	if got := agreementSvc.lastReviewNotify.IPAddress; got != "198.51.100.25" {
		t.Fatalf("expected notify_reviewers ip propagation, got %q", got)
	}
	if got := agreementSvc.lastReviewNotify.RecipientID; got != "recipient-1" {
		t.Fatalf("expected notify_reviewers recipient propagation, got %q", got)
	}
	reviewReminderPayload := map[string]any{"agreement_id": "agreement-1", "participant_id": "participant-1", "recipient_id": "recipient-1"}
	if err := bus.DispatchByName(ctx, CommandAgreementReviewReminderPause, reviewReminderPayload, nil); err != nil {
		t.Fatalf("DispatchByName review reminder pause: %v", err)
	}
	if err := bus.DispatchByName(ctx, CommandAgreementReviewReminderResume, reviewReminderPayload, nil); err != nil {
		t.Fatalf("DispatchByName review reminder resume: %v", err)
	}
	if err := bus.DispatchByName(ctx, CommandAgreementReviewReminderSendNow, reviewReminderPayload, nil); err != nil {
		t.Fatalf("DispatchByName review reminder send_now: %v", err)
	}
	if got := agreementSvc.lastReviewControl.IPAddress; got != "198.51.100.25" {
		t.Fatalf("expected review reminder ip propagation, got %q", got)
	}
	if got := agreementSvc.lastReviewControl.ParticipantID; got != "participant-1" {
		t.Fatalf("expected review reminder participant propagation, got %q", got)
	}
}

func TestRegisterDispatchesReminderCommands(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	reminders := &stubAgreementReminderService{
		sweepResult: services.AgreementReminderSweepResult{
			Claimed:     2,
			Sent:        1,
			Skipped:     1,
			SkipReasons: map[string]int{"manual_resend_cooldown": 1},
		},
		sendNowResult: services.ResendResult{
			Agreement: stores.AgreementRecord{ID: "agreement-1", Status: stores.AgreementStatusSent},
		},
	}
	projector := &stubProjector{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, nil, reminders, "*/5 * * * *", defaultScope, projector); err != nil {
		t.Fatalf("Register: %v", err)
	}

	if err := bus.DispatchByName(context.Background(), CommandAgreementReminderSweep, map[string]any{}, nil); err != nil {
		t.Fatalf("DispatchByName reminder sweep: %v", err)
	}
	if reminders.sweepCalls != 1 {
		t.Fatalf("expected sweep call count 1, got %d", reminders.sweepCalls)
	}
	if reminders.lastScope != defaultScope {
		t.Fatalf("expected reminder sweep scope %+v, got %+v", defaultScope, reminders.lastScope)
	}
	if err := bus.DispatchByName(context.Background(), CommandAgreementReminderCleanup, map[string]any{"limit": 500}, nil); err != nil {
		t.Fatalf("DispatchByName reminder cleanup: %v", err)
	}
	if reminders.cleanupCalls != 1 {
		t.Fatalf("expected cleanup call count 1, got %d", reminders.cleanupCalls)
	}
	if reminders.lastLimit != 500 {
		t.Fatalf("expected cleanup limit 500, got %d", reminders.lastLimit)
	}
	if reminders.lastCleanupAt.IsZero() {
		t.Fatalf("expected cleanup before timestamp to be set")
	}

	payload := map[string]any{"agreement_id": "agreement-1", "recipient_id": "recipient-1"}
	if err := bus.DispatchByName(context.Background(), CommandAgreementReminderPause, payload, nil); err != nil {
		t.Fatalf("DispatchByName reminder pause: %v", err)
	}
	if err := bus.DispatchByName(context.Background(), CommandAgreementReminderResume, payload, nil); err != nil {
		t.Fatalf("DispatchByName reminder resume: %v", err)
	}
	if err := bus.DispatchByName(context.Background(), CommandAgreementReminderSendNow, payload, nil); err != nil {
		t.Fatalf("DispatchByName reminder send_now: %v", err)
	}
	if reminders.pauseCalls != 1 || reminders.resumeCalls != 1 || reminders.sendNowCalls != 1 {
		t.Fatalf("expected pause/resume/send_now calls 1/1/1 got %d/%d/%d", reminders.pauseCalls, reminders.resumeCalls, reminders.sendNowCalls)
	}
	if reminders.lastID != "agreement-1" || reminders.lastRecipient != "recipient-1" {
		t.Fatalf("expected reminder target agreement-1/recipient-1 got %q/%q", reminders.lastID, reminders.lastRecipient)
	}
	if projector.calls != 1 {
		t.Fatalf("expected projector called once for send_now, got %d", projector.calls)
	}
}

func TestAgreementReminderSweepCommandCronOptionsFromConfig(t *testing.T) {
	cmd := &AgreementReminderSweepCommand{cronExpression: "0 */2 * * *"}
	if got := cmd.CronOptions().Expression; got != "0 */2 * * *" {
		t.Fatalf("expected explicit cron expression, got %q", got)
	}

	cfg := appcfg.Defaults()
	cfg.Reminders.SweepCron = "0 */1 * * *"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	cmd = &AgreementReminderSweepCommand{}
	if got := cmd.CronOptions().Expression; got != "0 */1 * * *" {
		t.Fatalf("expected config sweep cron, got %q", got)
	}

	cfg.Reminders.SweepCron = ""
	appcfg.SetActive(cfg)
	if got := cmd.CronOptions().Expression; got != "*/15 * * * *" {
		t.Fatalf("expected fallback sweep cron, got %q", got)
	}
}

func TestRegisterDispatchesPDFRemediationCommandWhenServiceConfigured(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	remediationSvc := &stubPDFRemediationCommandService{
		result: services.PDFRemediationResult{
			Document: stores.DocumentRecord{
				ID:                   "doc-1",
				RemediationStatus:    services.PDFRemediationStatusSucceeded,
				PDFCompatibilityTier: string(services.PDFCompatibilityTierFull),
			},
			OutputObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/remediated.pdf",
		},
	}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(
		bus,
		agreementSvc,
		tokenSvc,
		nil,
		nil,
		"",
		defaultScope,
		nil,
		WithPDFRemediationService(remediationSvc),
	); err != nil {
		t.Fatalf("Register: %v", err)
	}

	payload := map[string]any{
		"document_id":  "doc-1",
		"agreement_id": "agreement-1",
		"actor_id":     "admin-user-1",
		"force":        true,
		"_dispatch_metadata": map[string]any{
			"command_id":     CommandPDFRemediate,
			"dispatch_id":    "dispatch-1",
			"correlation_id": "corr-1",
			"execution_mode": "queued",
		},
	}
	if err := bus.DispatchByName(context.Background(), CommandPDFRemediate, payload, nil); err != nil {
		t.Fatalf("DispatchByName pdf remediation: %v", err)
	}
	if remediationSvc.calls != 1 {
		t.Fatalf("expected remediation call count 1, got %d", remediationSvc.calls)
	}
	if remediationSvc.lastScope != defaultScope {
		t.Fatalf("expected remediation scope %+v, got %+v", defaultScope, remediationSvc.lastScope)
	}
	if remediationSvc.lastInput.DocumentID != "doc-1" {
		t.Fatalf("expected document id doc-1, got %q", remediationSvc.lastInput.DocumentID)
	}
	if remediationSvc.lastInput.AgreementID != "agreement-1" {
		t.Fatalf("expected agreement id agreement-1, got %q", remediationSvc.lastInput.AgreementID)
	}
	if remediationSvc.lastInput.ActorID != "admin-user-1" {
		t.Fatalf("expected actor id admin-user-1, got %q", remediationSvc.lastInput.ActorID)
	}
	if remediationSvc.lastInput.DispatchID != "dispatch-1" {
		t.Fatalf("expected dispatch id dispatch-1, got %q", remediationSvc.lastInput.DispatchID)
	}
	if remediationSvc.lastInput.CorrelationID != "corr-1" {
		t.Fatalf("expected correlation id corr-1, got %q", remediationSvc.lastInput.CorrelationID)
	}
	if remediationSvc.lastInput.ExecutionMode != "queued" {
		t.Fatalf("expected execution mode queued, got %q", remediationSvc.lastInput.ExecutionMode)
	}
	if remediationSvc.lastInput.CommandID != CommandPDFRemediate {
		t.Fatalf("expected command id %q, got %q", CommandPDFRemediate, remediationSvc.lastInput.CommandID)
	}
	if !remediationSvc.lastInput.Force {
		t.Fatalf("expected force=true")
	}
}

func TestRegisterDoesNotExposePDFRemediationCommandWithoutService(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, nil, nil, "", defaultScope, nil); err != nil {
		t.Fatalf("Register: %v", err)
	}

	err := bus.DispatchByName(context.Background(), CommandPDFRemediate, map[string]any{
		"document_id": "doc-1",
	}, nil)
	if err == nil {
		t.Fatal("expected dispatch error when remediation service is not registered")
	}
}

func TestReviewOverrideCommandInputsRequireActorID(t *testing.T) {
	if err := (AgreementForceApproveReviewInput{
		AgreementID: "agreement-1",
		Reason:      "override",
	}).Validate(); err == nil {
		t.Fatal("expected force-approve input to require actor_id")
	}

	if err := (AgreementApproveReviewOnBehalfInput{
		AgreementID:   "agreement-1",
		ParticipantID: "participant-1",
		Reason:        "offline approval",
	}).Validate(); err == nil {
		t.Fatal("expected approve-on-behalf input to require actor_id")
	}
}
