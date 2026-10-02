package data

import "context"

type TargetCapabilities struct {
	Recovery     bool
	Fencing      bool
	SafeReset    bool
	Cancellation bool
}
type Intent struct {
	ID          string              `json:"id"`
	OperationID string              `json:"operation_id"`
	Target      TargetKey           `json:"target"`
	Kind        Kind                `json:"kind"`
	Prior       Activation          `json:"prior"`
	Next        Activation          `json:"next"`
	Receipt     *PreparationReceipt `json:"receipt,omitempty"`
	Fence       uint64              `json:"fence"`
}
type IntentObservation string

const (
	RoutingPrior   IntentObservation = "prior"
	RoutingNext    IntentObservation = "next"
	RoutingUnknown IntentObservation = "unknown"
)

type Observation struct {
	Routing IntentObservation
	Ready   bool
}

// ManagedTarget implements physical effects, not operation/generation authority.
// Commit is idempotent by intent.ID and fenced: durable routing identifies the
// intent even across restart. An ambiguous error must be inspected, never undone
// blindly. InspectReceipt is read-only and checks stage/content/checkpoint identity.
// DrainCleanup fences and drains all stage writers before deletion; it is forbidden
// for active, retained rollback or pending-intent receipts.
type ManagedTarget interface {
	Capabilities() TargetCapabilities
	Allocate(context.Context, Work) (string, error)
	InspectReceipt(context.Context, PreparationReceipt) error
	Commit(context.Context, Work, Intent) error
	InspectIntent(context.Context, Intent) (Observation, error)
	DrainCleanup(context.Context, Work, string) error
}
