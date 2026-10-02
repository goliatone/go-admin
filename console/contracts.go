// Package console contains instance-owned operator console contracts. It has no
// dependency on Debug, admin routing, or application services.
package console

import (
	"context"
	"encoding/json"
)

// Identity is resolved from trusted host state, never from a request payload.
// Every field participates in cache, preference and delivery isolation.
type Identity struct {
	ConsoleID     string `json:"console_id"`
	ApplicationID string `json:"application_id"`
	EnvironmentID string `json:"environment_id"`
	ActorID       string `json:"actor_id"`
	ScopeKey      string `json:"scope_key"`
}

func (i Identity) Valid() bool {
	return i.ConsoleID != "" && i.ApplicationID != "" && i.EnvironmentID != "" && i.ActorID != "" && i.ScopeKey != ""
}

// Namespace is an unambiguous storage key, including when IDs contain separators.
func (i Identity) Namespace() string {
	value, _ := json.Marshal(i) //nolint:errcheck // Identity contains only strings, which JSON marshaling cannot reject.
	return string(value)
}

type Record struct {
	Key        string `json:"record_key"`
	TargetID   string `json:"target_id,omitempty"`
	Generation uint64 `json:"generation,omitempty"`
	Revision   uint64 `json:"revision"`
	Data       any    `json:"data,omitempty"`
}

type PanelSnapshot struct {
	PanelDefinition
	Records []Record `json:"records"`
}

type Snapshot struct {
	Identity
	Watermark uint64          `json:"watermark"`
	Panels    []PanelSnapshot `json:"panels"`
}

const (
	EventUpsert     = "upsert"
	EventDelete     = "delete"
	EventInvalidate = "invalidate"
)

// Event revisions and sequences are issued by an instance EventStream. Invalidate
// signals authoritative snapshot recovery, including buffer/retention loss.
type Event struct {
	Identity
	PanelID string `json:"panel_id"`
	Record
	Sequence uint64 `json:"sequence"`
	Kind     string `json:"kind"`
}

// SnapshotSource supplies canonical records. The host filters every record before
// returning it; opaque panel payloads must be represented as a single Record.
type SnapshotSource func(context.Context, Identity, string) ([]Record, error)

type LookupSource func(context.Context, Identity, string, string) (Record, bool, error)

// Routes are resolved by the host's URL manager and passed verbatim to clients.
type Routes struct {
	Page        string `json:"page"`
	Panels      string `json:"panels"`
	Snapshot    string `json:"snapshot"`
	Action      string `json:"actions"`
	Preferences string `json:"preferences"`
	Live        string `json:"live"`
	Lookup      string `json:"lookup"`
}

type Bootstrap struct {
	Identity
	Title                string   `json:"title"`
	URLs                 Routes   `json:"urls"`
	PreferencesNamespace string   `json:"preferences_namespace"`
	Snapshot             Snapshot `json:"snapshot"`
}
