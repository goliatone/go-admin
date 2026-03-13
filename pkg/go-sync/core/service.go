package core

import "context"

// SyncService is the backend orchestration contract for revisioned resources.
type SyncService interface {
	Get(ctx context.Context, ref ResourceRef) (Snapshot, error)
	Mutate(ctx context.Context, input MutationInput) (MutationResult, error)
}
