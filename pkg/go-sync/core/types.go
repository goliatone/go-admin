package core

import "time"

// ResourceRef identifies a single mutable resource within a logical scope.
type ResourceRef struct {
	Kind  string            `json:"kind"`
	ID    string            `json:"id"`
	Scope map[string]string `json:"scope,omitempty"`
}

// Snapshot is the latest known server-authored view of a resource.
type Snapshot struct {
	ResourceRef ResourceRef    `json:"resource_ref"`
	Data        []byte         `json:"data"`
	Revision    int64          `json:"revision"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// MutationInput is a single revision-aware write intent.
type MutationInput struct {
	ResourceRef      ResourceRef `json:"resource_ref"`
	Operation        string      `json:"operation"`
	Payload          []byte      `json:"payload"`
	ExpectedRevision int64       `json:"expected_revision"`
	IdempotencyKey   string      `json:"idempotency_key,omitempty"`
	// ActorID is required when IdempotencyKey is set so replay scope remains actor-isolated.
	ActorID       string         `json:"actor_id,omitempty"`
	ClientID      string         `json:"client_id,omitempty"`
	CorrelationID string         `json:"correlation_id,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

// MutationResult captures the authoritative outcome of a mutation attempt.
type MutationResult struct {
	Snapshot Snapshot `json:"snapshot"`
	Applied  bool     `json:"applied"`
	Replay   bool     `json:"replay"`
}
