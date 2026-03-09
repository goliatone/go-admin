package commands

import (
	"context"
	"net/http"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-command/registry"
	goerrors "github.com/goliatone/go-errors"
)

type stubAgreementLifecycleService struct {
	sentCalls   int
	voidCalls   int
	resendCalls int
	lastScope   stores.Scope
	lastID      string
	lastSend    services.SendInput
	lastVoid    services.VoidInput
	lastResend  services.ResendInput
	sendErr     error
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

type stubDraftCleanupService struct {
	calls      int
	lastBefore time.Time
}

func (s *stubDraftCleanupService) CleanupExpiredDrafts(_ context.Context, before time.Time) (int, error) {
	s.calls++
	s.lastBefore = before
	return 2, nil
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
	if err := Register(bus, agreementSvc, tokenSvc, draftSvc, defaultScope, projector); err != nil {
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

func TestAgreementSendCommandFallsBackToResendWhenAlreadySent(t *testing.T) {
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
	if err := Register(bus, agreementSvc, tokenSvc, nil, defaultScope, projector); err != nil {
		t.Fatalf("Register: %v", err)
	}

	if err := bus.DispatchByName(context.Background(), CommandAgreementSend, map[string]any{
		"agreement_id":    "agreement-1",
		"idempotency_key": "k-send-fallback",
	}, nil); err != nil {
		t.Fatalf("DispatchByName send fallback: %v", err)
	}
	if agreementSvc.sentCalls != 1 {
		t.Fatalf("expected send call count 1, got %d", agreementSvc.sentCalls)
	}
	if agreementSvc.resendCalls != 1 {
		t.Fatalf("expected resend call count 1, got %d", agreementSvc.resendCalls)
	}
}

func TestCommandsPropagateRequestIPFromContext(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	agreementSvc := &stubAgreementLifecycleService{}
	tokenSvc := &stubTokenRotator{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, nil, defaultScope, nil); err != nil {
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
}
