package data

import (
	"context"
	"errors"
	"slices"
	"time"
)

// Read seams for ADR-0003 request reconciliation and Try again. Neither
// claims work: new work still goes through the ordinary typed commands.

// RequestState is what the durable store knows about one of the current actor's
// own requests (ADR-0003 reconciliation).
type RequestState string

const (
	// RequestClaimed: the request was received; Operation describes it.
	RequestClaimed RequestState = "claimed"
	// RequestUnclaimed: no claim exists although the request's retry window is
	// still open, so resubmitting the unchanged request cannot duplicate work.
	RequestUnclaimed RequestState = "unclaimed"
	// RequestExpired: the claim is no longer retained, or the window cannot be
	// established; only explicit new work may follow.
	RequestExpired RequestState = "expired"
)

// RequestStatus never carries the stored key, fingerprint or principal to the
// caller's presentation; Operation is for server-side projection only.
type RequestStatus struct {
	State      RequestState
	Operation  *Operation
	RetryUntil time.Time
}

// RequestStatus looks up the current actor's own request for kind, target and
// request key without claiming anything. The actor and scope come from trusted
// context; submittedAt is the client's own record of its first submission and
// only bounds when a missing claim may be reported unclaimed.
func (s *Service) RequestStatus(ctx context.Context, kind Kind, targetID, key string, submittedAt time.Time) (RequestStatus, error) {
	if !kind.Valid() || kind == Recover || !identifier(targetID) || !identifier(key) {
		return RequestStatus{}, Error(CodeInvalid)
	}
	p, err := s.principal(ctx)
	if err != nil {
		return RequestStatus{}, err
	}
	target := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: target}); err != nil {
		return RequestStatus{}, err
	}
	status, err := s.lookupRequestStatus(ctx, p, target, kind, key, submittedAt)
	if err != nil {
		return RequestStatus{}, err
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: target}); err != nil {
		return RequestStatus{}, err
	}
	// Target access cannot substitute for permission to receive the exact
	// operation. The final target check may itself reload or revoke record grants.
	if status.Operation != nil {
		if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: target, Operation: status.Operation}); err != nil {
			return RequestStatus{}, err
		}
	}
	return status, nil
}

// claimedRequest reports a found claim only when it is exactly the actor's own
// request for this target and kind and the operation is still readable.
func (s *Service) claimedRequest(ctx context.Context, p Principal, target TargetKey, kind Kind, op Operation) (RequestStatus, error) {
	if op.Target != target || op.Principal.ActorID != p.ActorID || op.Result.Kind != kind {
		return RequestStatus{}, Error(CodeDenied)
	}
	if err := s.authorize(ctx, p, AccessRequest{Action: "view", Target: target, Operation: &op}); err != nil {
		return RequestStatus{}, err
	}
	status := RequestStatus{State: RequestClaimed, Operation: &op}
	if s.config.RetryWindow > 0 && !op.CreatedAt.IsZero() {
		status.RetryUntil = op.CreatedAt.Add(s.config.RetryWindow)
	}
	return status, nil
}

// missingRequest is unclaimed only inside a declared retry window measured
// from the client's first submission; otherwise authority has expired.
func (s *Service) missingRequest(submittedAt time.Time) RequestStatus {
	now := time.Now()
	if s.config.RetryWindow > 0 && !submittedAt.IsZero() && !submittedAt.After(now) && now.Before(submittedAt.Add(s.config.RetryWindow)) {
		return RequestStatus{State: RequestUnclaimed, RetryUntil: submittedAt.Add(s.config.RetryWindow)}
	}
	return RequestStatus{State: RequestExpired}
}

// RetryDescriptor is the safe retained input for explicitly starting new work
// after a terminal failed or canceled operation (Try again). It omits the
// original request key, fingerprint, principal, stage and credentials; the
// expected generation of activate/reset is cleared so it is re-observed before
// confirmation, while ObservedGeneration reports the original one.
type RetryDescriptor struct {
	OperationID        string
	Kind               Kind
	State              State
	Input              Input
	ObservedGeneration *uint64
	FailureCode        string
}

// RetryDescriptor loads the exact retained input of the current actor's own
// terminal failed/canceled operation under current scope, target, read and
// execute policy. It never substitutes a newer catalog entry or receipt:
// missing or changed inputs, receipts and capabilities report unavailable.
// Starting the new work still goes through the ordinary typed commands.
func (s *Service) RetryDescriptor(ctx context.Context, operationID string) (RetryDescriptor, error) {
	if !identifier(operationID) {
		return RetryDescriptor{}, Error(CodeInvalid)
	}
	p, err := s.principal(ctx)
	if err != nil {
		return RetryDescriptor{}, err
	}
	op, err := s.retryOperation(ctx, p, operationID)
	if err != nil {
		return RetryDescriptor{}, err
	}
	out, check, err := retryDescriptorOf(op)
	if err != nil {
		return RetryDescriptor{}, err
	}
	if err = s.retryInputAvailable(ctx, p, out.Kind, check); err != nil {
		return RetryDescriptor{}, err
	}
	if err = s.AuthorizeInput(ctx, out.Kind, check); err != nil {
		return RetryDescriptor{}, retryInputFailure(err)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: op.Target, Operation: &op}); err != nil {
		return RetryDescriptor{}, hiddenReadFailure(err)
	}
	return out, nil
}

// retryOperation loads a terminal operation the actor may read and retry.
// Unreadable or foreign-scope operations are gone; viewing never grants retry.
func (s *Service) retryOperation(ctx context.Context, p Principal, operationID string) (Operation, error) {
	op, err := s.config.Store.GetOperation(ctx, operationID)
	if err != nil {
		return Operation{}, readFailure(ctx, err)
	}
	if op.Target.ScopeKey != p.ScopeKey {
		return Operation{}, Error(CodeGone)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: op.Target, Operation: &op}); err != nil {
		return Operation{}, hiddenReadFailure(err)
	}
	if op.Principal.ActorID != p.ActorID {
		return Operation{}, Error(CodeDenied)
	}
	kind := op.Result.Kind
	if op.Result.State != Failed && op.Result.State != Canceled || !kind.Valid() || kind == Recover || kind == Cancel {
		return Operation{}, Error(CodeInvalid)
	}
	return op, nil
}

// retryDescriptorOf strips the request key and, for activate/reset, the
// expected generation; check is the exact original input to revalidate.
func retryDescriptorOf(op Operation) (RetryDescriptor, Input, error) {
	kind := op.Result.Kind
	out := RetryDescriptor{OperationID: op.Result.OperationID, Kind: kind, State: op.Result.State, Input: op.Input}
	if op.Result.Failure != nil {
		out.FailureCode = op.Result.Failure.Code
	}
	out.Input.IdempotencyKey = ""
	if out.Input.ExpectedGeneration != nil {
		observed := *out.Input.ExpectedGeneration
		out.ObservedGeneration = &observed
	}
	if kind == Activate || kind == Reset {
		out.Input.ExpectedGeneration = nil
	}
	// The retained input must still describe exactly the same work.
	check := out.Input
	check.IdempotencyKey = "retry-descriptor"
	check.ExpectedGeneration = out.ObservedGeneration
	if check.Validate(kind) != nil || op.Input.TargetID != op.Target.TargetID {
		return RetryDescriptor{}, Input{}, Error(CodeUnavailable)
	}
	return out, check, nil
}

// retryInputAvailable checks that the exact dataset version is still
// described, the kind is still supported and permitted, and a referenced
// receipt is still retained (and verified for activation).
func (s *Service) retryInputAvailable(ctx context.Context, p Principal, kind Kind, input Input) error {
	descriptor, err := s.Describe(ctx, input.Dataset, input.TargetID)
	if err != nil {
		return retryInputFailure(err)
	}
	if !slices.Contains(descriptor.Scenarios, input.Scenario) {
		return Error(CodeUnavailable)
	}
	if capability := descriptor.Capabilities[kind]; !capability.Supported {
		return Error(CodeUnavailable)
	} else if !capability.Permitted {
		return Error(CodeDenied)
	}
	if input.ReceiptID != "" {
		if err = s.retryReceiptAvailable(ctx, kind, input); err != nil {
			return err
		}
	}
	current, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if current != p {
		return Error(CodeDenied)
	}
	return nil
}

// retryReceiptAvailable requires the exact retained receipt, verified for activation.
func (s *Service) retryReceiptAvailable(ctx context.Context, kind Kind, input Input) error {
	receipt, err := s.LookupReceipt(ctx, input.TargetID, input.ReceiptID)
	if err != nil {
		return retryInputFailure(err)
	}
	if receipt.Scenario != input.Scenario || receipt.Dataset != input.Dataset {
		return Error(CodeUnavailable)
	}
	if kind == Activate && (receipt.Verification == nil || !receipt.Verification.Passed() || receipt.Verification.ContentRevision != receipt.ContentRevision) {
		return Error(CodeUnavailable)
	}
	return nil
}

// Missing or changed retained input makes Try again unavailable. Cancellation,
// policy denial and backend failures keep their classification and causes.
func retryInputFailure(err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	if code, known := SafeErrorCode(err); known && (code == CodeGone || code == CodeConflict || code == CodeInvalid) {
		return Error(CodeUnavailable)
	}
	return err
}

// lookupRequestStatus resolves retained and missing claims without changing
// delivery authority; RequestStatus rechecks target and exact operation grants.
func (s *Service) lookupRequestStatus(ctx context.Context, p Principal, target TargetKey, kind Kind, key string, submittedAt time.Time) (RequestStatus, error) {
	op, found, err := s.config.Store.LookupRequest(ctx, RequestKey{ActorID: p.ActorID, Target: target, Kind: kind, IdempotencyKey: key})
	if err != nil {
		err = readFailure(ctx, err)
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return RequestStatus{}, err
		}
	}
	var status RequestStatus
	switch {
	case err != nil && ErrorCode(err) == CodeGone:
		// A live tombstone whose operation was pruned: received, no longer retained.
		status.State = RequestExpired
	case err != nil:
		return RequestStatus{}, err
	case found:
		if status, err = s.claimedRequest(ctx, p, target, kind, op); err != nil {
			return RequestStatus{}, err
		}
	default:
		status = s.missingRequest(submittedAt)
	}
	return status, nil
}
