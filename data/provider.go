package data

import "context"

// Work is created by the lifecycle service. BeforeEffects must be called between
// bounded batches and immediately before each effect; targets/domain services must
// reject stale Fence values. Request cancellation alone is not a fencing protocol.
type Work struct {
	OperationID   string
	Principal     Principal
	Input         Input
	Lease         Lease
	StageID       string
	BeforeEffects func(context.Context) error
	Progress      func(context.Context, Progress) error
}

// Provider uses application commands/services for domain work. Validate and Plan
// are read-only, including artifact effects. Plan checks say planned/unavailable.
// Prepare and Refresh only write the supplied owned stage. A receipt is immutable;
// changing its content requires a new receipt and fresh verification.
type Provider interface {
	Describe(context.Context, Principal, DatasetRef) (Descriptor, error)
	Validate(context.Context, Principal, Input) ([]Check, error)
	Plan(context.Context, Principal, Kind, Input) ([]Check, error)
	Prepare(context.Context, Work) (PreparationReceipt, error)
	Refresh(context.Context, Work) (PreparationReceipt, error)
	Verify(context.Context, Work, PreparationReceipt) (VerificationResult, error)
}
type Generator interface {
	Generate(context.Context, Work) (DatasetRef, error)
}

// ArtifactProvider resolves opaque references after current service and domain
// policy checks. Never return a public URL or an implicit PII/export grant.
type ArtifactProvider interface {
	LookupArtifact(context.Context, Principal, ArtifactRef) (any, error)
}
type AccessRequest struct {
	Action    string
	Target    TargetKey
	Operation *Operation
	Receipt   *PreparationReceipt
	Artifact  *ArtifactRef
}
type Policy interface {
	Authorize(context.Context, Principal, AccessRequest) error
}
