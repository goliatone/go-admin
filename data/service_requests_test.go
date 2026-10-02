package data_test

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
)

// ADR-0003 read seams: pending-request reconciliation and Try again
// descriptors never claim work, never cross actors or scopes and never return
// the stored request key.

func (f *fixture) serviceWithRetryWindow(t *testing.T, window time.Duration) *data.Service {
	t.Helper()
	config := f.serviceConfig(f.store)
	config.RetryWindow = window
	service, err := data.NewService(config)
	if err != nil {
		t.Fatal(err)
	}
	return service
}

func requireCode(t *testing.T, err error, code string) {
	t.Helper()
	if data.ErrorCode(err) != code {
		t.Fatalf("error = %v (%q), want %q", err, data.ErrorCode(err), code)
	}
}

func TestServiceRetryWindowIsBounded(t *testing.T) {
	f := newFixture(t)
	for _, window := range []time.Duration{time.Minute, 91 * 24 * time.Hour, -time.Hour} {
		config := f.serviceConfig(f.store)
		config.RetryWindow = window
		if _, err := data.NewService(config); err == nil {
			t.Fatalf("retry window %s accepted", window)
		}
	}
}

func TestRequestStatusReconcilesOnlyTheActorsOwnRequests(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	service := f.serviceWithRetryWindow(t, 24*time.Hour)
	in := f.input
	in.IdempotencyKey = "submitted"
	result, err := service.Run(ctx, data.Prepare, in)
	if err != nil {
		t.Fatal(err)
	}
	successful(t, result)

	claimed, err := service.RequestStatus(ctx, data.Prepare, "preview", "submitted", time.Now().Add(-time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if claimed.State != data.RequestClaimed || claimed.Operation == nil || claimed.Operation.Result.OperationID != result.OperationID {
		t.Fatalf("claimed = %+v", claimed)
	}
	if want := claimed.Operation.CreatedAt.Add(24 * time.Hour); !claimed.RetryUntil.Equal(want) {
		t.Fatalf("retry until = %s, want %s", claimed.RetryUntil, want)
	}

	// The same key under another kind is a different request.
	other, err := service.RequestStatus(ctx, data.Refresh, "preview", "submitted", time.Now().Add(-time.Minute))
	if err != nil || other.State != data.RequestUnclaimed || other.Operation != nil {
		t.Fatalf("another kind = %+v, %v", other, err)
	}

	submittedAt := time.Now().Add(-time.Minute)
	unclaimed, err := service.RequestStatus(ctx, data.Prepare, "preview", "never-arrived", submittedAt)
	if err != nil || unclaimed.State != data.RequestUnclaimed || !unclaimed.RetryUntil.Equal(submittedAt.Add(24*time.Hour)) {
		t.Fatalf("unclaimed = %+v, %v", unclaimed, err)
	}
	for name, at := range map[string]time.Time{"outside the window": time.Now().Add(-25 * time.Hour), "without a submission time": {}} {
		expired, statusErr := service.RequestStatus(ctx, data.Prepare, "preview", "never-arrived", at)
		if statusErr != nil || expired.State != data.RequestExpired || expired.Operation != nil {
			t.Fatalf("%s: %+v, %v", name, expired, statusErr)
		}
	}

	// Without a declared window the claim is still found, but a missing claim
	// can never be reported safe to resubmit.
	unbounded, err := f.service.RequestStatus(ctx, data.Prepare, "preview", "submitted", time.Now())
	if err != nil || unbounded.State != data.RequestClaimed || !unbounded.RetryUntil.IsZero() {
		t.Fatalf("claimed without window = %+v, %v", unbounded, err)
	}
	if missing, statusErr := f.service.RequestStatus(ctx, data.Prepare, "preview", "never-arrived", time.Now()); statusErr != nil || missing.State != data.RequestExpired {
		t.Fatalf("missing without window = %+v, %v", missing, statusErr)
	}

	// Another actor in the same scope never sees alice's claim.
	alice := f.principal
	f.principal.ActorID = "bob"
	foreign, err := service.RequestStatus(ctx, data.Prepare, "preview", "submitted", time.Now().Add(-time.Minute))
	if err != nil || foreign.State == data.RequestClaimed || foreign.Operation != nil {
		t.Fatalf("foreign actor = %+v, %v", foreign, err)
	}
	f.principal = alice

	for name, call := range map[string]func() error{
		"recover": func() error {
			_, e := service.RequestStatus(ctx, data.Recover, "preview", "submitted", time.Now())
			return e
		},
		"invalid kind": func() error {
			_, e := service.RequestStatus(ctx, data.Kind("nope"), "preview", "submitted", time.Now())
			return e
		},
		"empty target":  func() error { _, e := service.RequestStatus(ctx, data.Prepare, "", "submitted", time.Now()); return e },
		"empty request": func() error { _, e := service.RequestStatus(ctx, data.Prepare, "preview", "", time.Now()); return e },
	} {
		if callErr := call(); data.ErrorCode(callErr) != data.CodeInvalid {
			t.Fatalf("%s: %v", name, callErr)
		}
	}

	f.revoked.Store(true)
	if _, err = service.RequestStatus(ctx, data.Prepare, "preview", "submitted", time.Now()); err == nil {
		t.Fatal("a revoked actor reconciled a request")
	}
	f.revoked.Store(false)

	denied := f.serviceConfig(f.store)
	denied.RetryWindow = 24 * time.Hour
	denied.Policy = &testPolicy{denied: "view"}
	blind, err := data.NewService(denied)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = blind.RequestStatus(ctx, data.Prepare, "preview", "submitted", time.Now()); data.ErrorCode(err) != data.CodeDenied {
		t.Fatalf("read-denied lookup = %v", err)
	}
}

func TestRetryDescriptorReturnsAuthorizedRetainedInputOfOwnTerminalFailures(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	receipt := verified(t, f, prepared(t, f, "prepare"), "verify")
	successful(t, run(t, f, data.Activate, activationInput(f, receipt, 0, "activate")))

	f.provider.fail.Store(true)
	in := f.input
	in.IdempotencyKey = "failed-refresh"
	in.BatchLimit = 25
	failed := run(t, f, data.Refresh, in)
	f.provider.fail.Store(false)
	if failed.State != data.Failed {
		t.Fatalf("refresh did not fail: %+v", failed)
	}

	descriptor, err := f.service.RetryDescriptor(ctx, failed.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	want := in
	want.IdempotencyKey = ""
	if descriptor.OperationID != failed.OperationID || descriptor.Kind != data.Refresh || descriptor.State != data.Failed || descriptor.FailureCode != data.CodeProvider {
		t.Fatalf("descriptor = %+v", descriptor)
	}
	if descriptor.Input.IdempotencyKey != "" || descriptor.Input.Dataset != want.Dataset || descriptor.Input.Scenario != want.Scenario || descriptor.Input.TargetID != want.TargetID || descriptor.Input.BatchLimit != 25 || descriptor.Input.DryRun {
		t.Fatalf("retained input = %+v, want %+v", descriptor.Input, want)
	}

	// Starting it is ordinary new work under a new key.
	retry := descriptor.Input
	retry.IdempotencyKey = "try-again"
	successful(t, run(t, f, data.Refresh, retry))

	again := f.input
	again.IdempotencyKey = "succeeded-prepare"
	succeeded := run(t, f, data.Prepare, again)
	successful(t, succeeded)
	_, err = f.service.RetryDescriptor(ctx, succeeded.OperationID)
	requireCode(t, err, data.CodeInvalid)

	requireCode(t, func() error { _, e := f.service.RetryDescriptor(ctx, "missing-operation"); return e }(), data.CodeGone)
	requireCode(t, func() error { _, e := f.service.RetryDescriptor(ctx, ""); return e }(), data.CodeInvalid)

	// Viewing an operation never grants retrying it.
	alice := f.principal
	f.principal.ActorID = "bob"
	_, err = f.service.RetryDescriptor(ctx, failed.OperationID)
	requireCode(t, err, data.CodeDenied)
	f.principal.ScopeKey = "other-org"
	_, err = f.service.RetryDescriptor(ctx, failed.OperationID)
	requireCode(t, err, data.CodeGone)
	f.principal = alice

	// A revoked execute grant reports denied; a revoked read grant hides the operation.
	executeDenied := f.serviceConfig(f.store)
	executeDenied.Policy = &testPolicy{denied: string(data.Refresh)}
	service, err := data.NewService(executeDenied)
	if err != nil {
		t.Fatal(err)
	}
	_, err = service.RetryDescriptor(ctx, failed.OperationID)
	requireCode(t, err, data.CodeDenied)
	readDenied := f.serviceConfig(f.store)
	readDenied.Policy = &testPolicy{denied: "view"}
	if service, err = data.NewService(readDenied); err != nil {
		t.Fatal(err)
	}
	_, err = service.RetryDescriptor(ctx, failed.OperationID)
	requireCode(t, err, data.CodeGone)
}

func TestRetryDescriptorRefusesChangedInputsInsteadOfSubstituting(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	receipt := verified(t, f, prepared(t, f, "prepare"), "verify")
	generation := uint64(7)
	stale := activationInput(f, receipt, generation, "stale-activate")
	result := run(t, f, data.Activate, stale)
	if result.State != data.Failed || result.Failure == nil || result.Failure.Code != data.CodeStale {
		t.Fatalf("stale generation must fail as stale: %+v", result)
	}
	descriptor, err := f.service.RetryDescriptor(ctx, result.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	if descriptor.Input.ExpectedGeneration != nil || descriptor.ObservedGeneration == nil || *descriptor.ObservedGeneration != generation {
		t.Fatalf("activation generation must be re-observed: %+v", descriptor)
	}
	if descriptor.Input.ReceiptID != receipt.ID {
		t.Fatalf("the exact receipt is retained: %+v", descriptor.Input)
	}

	// The scenario disappears from the catalog: Try again is unavailable, never retargeted.
	f.provider.input.Scenario.Version = "2"
	_, err = f.service.RetryDescriptor(ctx, result.OperationID)
	requireCode(t, err, data.CodeUnavailable)
}
