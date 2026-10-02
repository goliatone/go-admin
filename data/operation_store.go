package data

import (
	"context"
	"time"
)

type Operation struct {
	Result            Result     `json:"result"`
	Target            TargetKey  `json:"target"`
	Principal         Principal  `json:"principal"`
	Input             Input      `json:"input"`
	Fingerprint       string     `json:"fingerprint"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	RecoveryPrincipal *Principal `json:"recovery_principal,omitempty"`
	StageID           string     `json:"stage_id,omitempty"`
	CancelRequested   bool       `json:"cancel_requested"`
}
type Claim struct {
	Operation Operation
	Replay    bool
}

// RequestKey identifies the durable request claim without disclosing another
// actor's work. Lookup is read-only; Claim still decides replay atomically.
type RequestKey struct {
	ActorID        string
	Target         TargetKey
	Kind           Kind
	IdempotencyKey string
}

// ReceiptQuery pages authoritative receipts independently of operation history.
// Cursor is store-owned and opaque to callers; a page contains at most 100 rows.
type ReceiptQuery struct {
	Limit  int
	Cursor string
}
type ReceiptPage struct {
	Receipts   []PreparationReceipt `json:"receipts"`
	NextCursor string               `json:"next_cursor,omitempty"`
}
type Lease struct {
	OperationID string
	Target      TargetKey
	Fence       uint64
	ExpiresAt   time.Time
}
type TargetState struct {
	Activation       Activation
	Pending          *Intent
	RecoveryRequired bool
}
type StoreCapabilities struct {
	Durable              bool
	AtomicClaims         bool
	Fencing              bool
	AtomicIntentFinalize bool
	ProtectedRetention   bool
}

func (c StoreCapabilities) WriteReady() bool {
	return c.Durable && c.AtomicClaims && c.Fencing && c.AtomicIntentFinalize && c.ProtectedRetention
}

// OperationStore owns durable atomicity. Every mutator must reject expired or
// stale leases, and stale operation revisions. Claims have a unique compound key
// (actor, scope, target, command version, caller key) and immutable fingerprint.
// Target keys include scope. No callback may perform physical effects in a DB tx.
// Lease time uses authoritative store time. Tokens monotonically increase and
// never reset when a claim expires/releases. Acquire rejects pending intents and
// recovery_required; AcquireRecovery fences all prior workers and binds the operation and any pending intent; it requires the previous lease to expire.
// Save increments Revision atomically; progress/cancel also participate in CAS.
// Persist receipt/verification before events, never overwrite receipt content.
// BeginIntent atomically checks lease, generation, receipt/content and operation
// revision. ResolveIntent atomically finalizes activation, intent and operation;
// routing-next increments generation exactly once; routing-prior retains it.
// Both known routes require Observation.Ready (physical safety/health); an
// unready route follows AuthoritativeRouting's unknown/recovery rule and cannot
// finalize a terminal outcome or clear pending evidence.
// Unknown preserves intent, blocks writes and persists recovering, not failed.
// Retention preserves idempotency tombstones for its advertised retry window,
// active/pending/rollback receipts, artifacts and all recovery evidence. Hosts must
// configure bounded lease, retry, retention and artifact durations before writes.
type OperationStore interface {
	Capabilities() StoreCapabilities
	Claim(context.Context, Operation) (Claim, error)
	// LookupRequest returns found=true for a live claim, including a tombstone
	// whose operation was pruned (CodeGone). An expired/absent claim is not found.
	LookupRequest(context.Context, RequestKey) (Operation, bool, error)
	GetOperation(context.Context, string) (Operation, error)
	ListOperations(context.Context, TargetKey, int) ([]Operation, error)
	Acquire(context.Context, string, TargetKey, time.Duration) (Lease, error)
	AcquireRecovery(context.Context, string, TargetKey, time.Duration) (Lease, error)
	Renew(context.Context, Lease, time.Duration) (Lease, error)
	CheckLease(context.Context, Lease) error
	// CheckCleanup rejects active, pending or retained receipts under the lease.
	CheckCleanup(context.Context, Lease, string) error
	Release(context.Context, Lease) error
	Save(context.Context, Operation, uint64, *Lease) (Operation, error)
	RequestCancel(context.Context, string, uint64) (Operation, error)
	PutReceipt(context.Context, Lease, PreparationReceipt) error
	GetReceipt(context.Context, string) (PreparationReceipt, error)
	ListReceipts(context.Context, TargetKey, ReceiptQuery) (ReceiptPage, error)
	// GetArtifact loads original metadata by provider and opaque ID; caller
	// claims about requester, scope, expiry or generation are never authoritative.
	GetArtifact(context.Context, string, string) (ArtifactRef, error)
	PutVerification(context.Context, Lease, string, uint64, VerificationResult) (PreparationReceipt, error)
	Target(context.Context, TargetKey) (TargetState, error)
	BeginIntent(context.Context, Lease, Intent, uint64) error
	ResolveIntent(context.Context, Lease, Intent, Observation, Operation, uint64) (Operation, error)
}
