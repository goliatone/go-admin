package data_test

import (
	"context"
	"errors"
	"fmt"
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
	for name, at := range map[string]time.Time{"outside the window": time.Now().Add(-25 * time.Hour), "without a submission time": {}, "future submission time": time.Now().Add(time.Hour)} {
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

// Each seam preserves cancellation and backend classification instead of
// presenting a failed read as hidden, missing or denied work.
type requestReadStore struct {
	data.OperationStore
	lookupError, operationError, receiptError error
	afterLookup                               func()
}

func (s requestReadStore) LookupRequest(ctx context.Context, key data.RequestKey) (data.Operation, bool, error) {
	if s.lookupError != nil {
		return data.Operation{}, false, s.lookupError
	}
	op, found, err := s.OperationStore.LookupRequest(ctx, key)
	if s.afterLookup != nil {
		s.afterLookup()
	}
	return op, found, err
}
func (s requestReadStore) GetOperation(ctx context.Context, id string) (data.Operation, error) {
	if s.operationError != nil {
		return data.Operation{}, s.operationError
	}
	return s.OperationStore.GetOperation(ctx, id)
}
func (s requestReadStore) GetReceipt(ctx context.Context, id string) (data.PreparationReceipt, error) {
	if s.receiptError != nil {
		return data.PreparationReceipt{}, s.receiptError
	}
	return s.OperationStore.GetReceipt(ctx, id)
}

type requestDescribeProvider struct {
	data.Provider
	failure error
}

func (p requestDescribeProvider) Describe(context.Context, data.Principal, data.DatasetRef) (data.Descriptor, error) {
	return data.Descriptor{}, p.failure
}

func requestReadFailures() map[string]error {
	return map[string]error{
		"canceled":      fmt.Errorf("repository canceled: %w", context.Canceled),
		"canceled_gone": errors.Join(data.Error(data.CodeGone), context.Canceled),
		"deadline_gone": errors.Join(data.Error(data.CodeGone), context.DeadlineExceeded),
		"deadline":      fmt.Errorf("repository deadline: %w", context.DeadlineExceeded),
		"unavailable":   data.Error(data.CodeUnavailable),
		"provider":      data.Error(data.CodeProvider),
	}
}
func assertRequestFailure(t *testing.T, cause, err error) {
	t.Helper()
	if errors.Is(cause, context.Canceled) || errors.Is(cause, context.DeadlineExceeded) {
		sentinel := context.Canceled
		if errors.Is(cause, context.DeadlineExceeded) {
			sentinel = context.DeadlineExceeded
		}
		if !errors.Is(err, sentinel) {
			t.Fatalf("lost cancellation cause: %v -> %v", cause, err)
		}
	} else if err == nil || data.ErrorCode(err) != data.ErrorCode(cause) {
		t.Fatalf("failure classification: %v -> %v", cause, err)
	}
}
func TestRequestStatusPreservesReadFailures(t *testing.T) {
	for name, cause := range requestReadFailures() {
		t.Run(name, func(t *testing.T) {
			f := newFixture(t)
			cfg := f.serviceConfig(requestReadStore{OperationStore: f.store, lookupError: cause})
			service, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			status, err := service.RequestStatus(t.Context(), data.Prepare, "preview", "key", time.Now())
			assertRequestFailure(t, cause, err)
			if status.Operation != nil || status.State != "" {
				t.Fatal("failed lookup delivered a status", status)
			}
		})
	}
}
func failedRequestForRetry(t *testing.T, f *fixture) data.Result {
	t.Helper()
	receipt := verified(t, f, prepared(t, f, "prepare-retry"), "verify-retry")
	generation := uint64(7)
	result := run(t, f, data.Activate, activationInput(f, receipt, generation, "failed-activation"))
	if result.State != data.Failed {
		t.Fatal("expected terminal failure", result)
	}
	return result
}
func TestRetryDescriptorPreservesReadFailures(t *testing.T) {
	for boundary := range 3 {
		for name, cause := range requestReadFailures() {
			t.Run(fmt.Sprintf("%d/%s", boundary, name), func(t *testing.T) {
				f := newFixture(t)
				failed := failedRequestForRetry(t, f)
				store := requestReadStore{OperationStore: f.store}
				cfg := f.serviceConfig(f.store)
				switch boundary {
				case 0:
					store.operationError = cause
				case 1:
					store.receiptError = cause
				case 2:
					cfg.Providers = map[string]data.Provider{"sample": requestDescribeProvider{Provider: f.provider, failure: cause}}
				}
				cfg.Store = store
				service, err := data.NewService(cfg)
				if err != nil {
					t.Fatal(err)
				}
				descriptor, err := service.RetryDescriptor(t.Context(), failed.OperationID)
				assertRequestFailure(t, cause, err)
				if descriptor.OperationID != "" || descriptor.Input.Dataset.Valid() {
					t.Fatal("failed read delivered retained input")
				}
			})
		}
	}
}
func TestRequestQueriesPreservePolicyFailures(t *testing.T) {
	for name, cause := range requestReadFailures() {
		for _, action := range []string{"view", string(data.Activate)} {
			t.Run(name+"/"+action, func(t *testing.T) {
				f := newFixture(t)
				failed := failedRequestForRetry(t, f)
				cfg := f.serviceConfig(f.store)
				cfg.Policy = policyFunc(func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
					if a.Action == action {
						return cause
					}
					return nil
				})
				service, err := data.NewService(cfg)
				if err != nil {
					t.Fatal(err)
				}
				_, err = service.RetryDescriptor(t.Context(), failed.OperationID)
				assertRequestFailure(t, cause, err)
				if action == "view" {
					_, err = service.RequestStatus(t.Context(), data.Activate, "preview", "failed-activation", time.Now())
					assertRequestFailure(t, cause, err)
				}
			})
		}
	}
}
func TestRequestStatusRechecksExactRecordAtDelivery(t *testing.T) {
	f := newFixture(t)
	successful(t, run(t, f, data.Prepare, f.input))
	recordChecked, revoked := false, false
	cfg := f.serviceConfig(f.store)
	cfg.Policy = policyFunc(func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
		if a.Operation != nil {
			if revoked {
				return data.Error(data.CodeDenied)
			}
			recordChecked = true
		} else if recordChecked {
			revoked = true
		}
		return nil
	})
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	status, err := service.RequestStatus(t.Context(), data.Prepare, "preview", f.input.IdempotencyKey, time.Now())
	if !revoked || data.ErrorCode(err) != data.CodeDenied || status.Operation != nil {
		t.Fatal("revoked operation delivered", status, err)
	}
}
func TestRequestStatusPreservesPostLookupCancellation(t *testing.T) {
	f := newFixture(t)
	successful(t, run(t, f, data.Prepare, f.input))
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	cfg := f.serviceConfig(requestReadStore{OperationStore: f.store, afterLookup: cancel})
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	status, err := service.RequestStatus(ctx, data.Prepare, "preview", f.input.IdempotencyKey, time.Now())
	if !errors.Is(err, context.Canceled) || status.Operation != nil {
		t.Fatal("post-lookup cancellation became success", status, err)
	}
}

func TestRetryDescriptorPreservesFinalRecordPolicyFailure(t *testing.T) {
	for name, cause := range requestReadFailures() {
		t.Run(name, func(t *testing.T) {
			f := newFixture(t)
			failed := failedRequestForRetry(t, f)
			checks := 0
			cfg := f.serviceConfig(f.store)
			cfg.Policy = policyFunc(func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
				if a.Operation != nil {
					checks++
					if checks > 1 {
						return cause
					}
				}
				return nil
			})
			service, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			descriptor, err := service.RetryDescriptor(t.Context(), failed.OperationID)
			assertRequestFailure(t, cause, err)
			if descriptor.OperationID != "" {
				t.Fatal("final policy failure delivered retained input")
			}
		})
	}
}

func TestRequestStatusCancellationTakesPrecedenceOverGone(t *testing.T) {
	f := newFixture(t)
	cause := errors.Join(data.Error(data.CodeGone), context.Canceled)
	cfg := f.serviceConfig(requestReadStore{OperationStore: f.store, lookupError: cause})
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	status, err := service.RequestStatus(t.Context(), data.Prepare, "preview", "key", time.Now())
	assertRequestFailure(t, cause, err)
	if status.State != "" {
		t.Fatal("cancellation was reported as expired", status)
	}
}
