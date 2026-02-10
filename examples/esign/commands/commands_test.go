package commands

import (
	"context"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-command/registry"
)

type stubAgreementLifecycleService struct {
	sentCalls   int
	voidCalls   int
	resendCalls int
	lastScope   stores.Scope
	lastID      string
}

func (s *stubAgreementLifecycleService) Send(_ context.Context, scope stores.Scope, agreementID string, _ services.SendInput) (stores.AgreementRecord, error) {
	s.sentCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return stores.AgreementRecord{ID: agreementID, Status: stores.AgreementStatusSent}, nil
}

func (s *stubAgreementLifecycleService) Void(_ context.Context, scope stores.Scope, agreementID string, _ services.VoidInput) (stores.AgreementRecord, error) {
	s.voidCalls++
	s.lastScope = scope
	s.lastID = agreementID
	return stores.AgreementRecord{ID: agreementID, Status: stores.AgreementStatusVoided}, nil
}

func (s *stubAgreementLifecycleService) Resend(_ context.Context, scope stores.Scope, agreementID string, _ services.ResendInput) (services.ResendResult, error) {
	s.resendCalls++
	s.lastScope = scope
	s.lastID = agreementID
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
	projector := &stubProjector{}
	bus := coreadmin.NewCommandBus(true)
	t.Cleanup(bus.Reset)

	defaultScope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	if err := Register(bus, agreementSvc, tokenSvc, defaultScope, projector); err != nil {
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
	if projector.calls < 2 {
		t.Fatalf("expected projector to be called for command transitions, got %d", projector.calls)
	}
	snapshot := observability.Snapshot()
	if snapshot.SendSuccessTotal != 1 {
		t.Fatalf("expected send success metric increment, got %+v", snapshot)
	}
}
