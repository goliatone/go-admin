// Package console contains instance-owned operator console contracts. It has no
// dependency on Debug, admin routing, or application services.
package console

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
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
	value, _ := json.Marshal(i) //nolint:errcheck,errchkjson // Identity contains only strings, which JSON marshaling cannot reject.
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
// Options and Requests are additive; older clients ignore them.
type Routes struct {
	Page        string `json:"page"`
	Panels      string `json:"panels"`
	Snapshot    string `json:"snapshot"`
	Action      string `json:"actions"`
	Preferences string `json:"preferences"`
	Live        string `json:"live"`
	Lookup      string `json:"lookup"`
	// Options serves paginated field options:
	// GET …/api/panels/:panel/actions/:action/options/:field?cursor=&q=&limit=&value=
	Options string `json:"options,omitempty"`
	// Requests answers pending-request lookups:
	// GET …/api/panels/:panel/requests/:request?action=&scope=&submitted_at=
	Requests string `json:"requests,omitempty"`
}

// Client capabilities (ADR-0004). A client advertises the workflow behavior it
// implements; declarations needing more stay non-executable for that client.
// The handshake is compatibility metadata, never actor authorization.
const (
	// ClientCapabilityActionAvailability renders unavailable declarations
	// disabled with their reason and never dispatches them.
	ClientCapabilityActionAvailability = "action_availability.v1"
	// ClientCapabilityActionDrawer opens forms from header/section/row/card slots.
	ClientCapabilityActionDrawer = "action_drawer.v1"
	// ClientCapabilityRequestID generates request IDs per action draft and
	// keeps submitted requests, their payloads and pending state (ADR-0003).
	ClientCapabilityRequestID = "request_id.v1"
	// ClientCapabilitySecondarySubmit honors the actual submitter, sets the
	// declared field and treats each submitter as a distinct request.
	ClientCapabilitySecondarySubmit = "secondary_submit.v1"
	// ClientCapabilityRichViews renders tones, steps, cards, lists and refs.
	ClientCapabilityRichViews = "rich_views.v1"

	// ClientCapabilitiesHeader carries the advertised set on HTTP requests;
	// ClientCapabilitiesQuery carries it on the live socket URL.
	ClientCapabilitiesHeader = "X-Console-Capabilities"
	ClientCapabilitiesQuery  = "capabilities"

	clientCapabilitiesMax = 16
)

// ClientCapabilityIDs lists the workflow capabilities this release defines,
// sorted. A client advertises the subset it implements.
func ClientCapabilityIDs() []string {
	return []string{
		ClientCapabilityActionAvailability,
		ClientCapabilityActionDrawer,
		ClientCapabilityRequestID,
		ClientCapabilityRichViews,
		ClientCapabilitySecondarySubmit,
	}
}

// ClientCapabilityMode states how a request described its client.
type ClientCapabilityMode string

const (
	// ClientCapabilitiesLegacy: no handshake. Capability-dependent and
	// unavailable declarations are withheld; dispatch of them is refused.
	ClientCapabilitiesLegacy ClientCapabilityMode = "legacy"
	// ClientCapabilitiesAdvertised: the request listed its capabilities.
	ClientCapabilitiesAdvertised ClientCapabilityMode = "advertised"
	// ClientCapabilitiesPage: a server-rendered page bootstrap. Declarations are
	// included and the client gates them itself; dispatch still requires an
	// advertised handshake, so stale cached assets cannot execute them.
	ClientCapabilitiesPage ClientCapabilityMode = "page"
)

// ClientCapabilities is the parsed client handshake for one request.
type ClientCapabilities struct {
	Mode ClientCapabilityMode
	set  map[string]bool
}

// ParseClientCapabilities reads a comma-separated advertised list. An empty or
// absent value is a legacy client. Unknown entries are kept (bounded) so newer
// requirements are compared exactly.
func ParseClientCapabilities(value string) ClientCapabilities {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 1024 {
		return ClientCapabilities{Mode: ClientCapabilitiesLegacy}
	}
	caps := ClientCapabilities{Mode: ClientCapabilitiesAdvertised, set: map[string]bool{}}
	for item := range strings.SplitSeq(value, ",") {
		item = strings.ToLower(strings.TrimSpace(item))
		if item == "" || len(caps.set) >= clientCapabilitiesMax || !capabilityIdentifier(item) {
			continue
		}
		caps.set[item] = true
	}
	return caps
}

// PageClientCapabilities marks a server-rendered page bootstrap.
func PageClientCapabilities() ClientCapabilities {
	return ClientCapabilities{Mode: ClientCapabilitiesPage}
}

// Has reports whether an advertised client implements one capability.
func (c ClientCapabilities) Has(capability string) bool {
	return c.Mode == ClientCapabilitiesAdvertised && c.set[strings.ToLower(strings.TrimSpace(capability))]
}

// Covers reports whether an advertised client implements every requirement.
// Declarations without requirements are covered for every client.
func (c ClientCapabilities) Covers(required []string) bool {
	for _, capability := range required {
		if !c.Has(capability) {
			return false
		}
	}
	return true
}

// List returns the advertised capabilities in sorted order.
func (c ClientCapabilities) List() []string {
	out := make([]string, 0, len(c.set))
	for capability := range c.set {
		out = append(out, capability)
	}
	sort.Strings(out)
	return out
}

func capabilityIdentifier(value string) bool {
	if len(value) > 64 {
		return false
	}
	for _, ch := range value {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '-' && ch != '_' && ch != '.' {
			return false
		}
	}
	return true
}

type clientCapabilitiesKey struct{}

// WithClientCapabilities attaches the request's handshake to its context.
func WithClientCapabilities(ctx context.Context, caps ClientCapabilities) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, clientCapabilitiesKey{}, caps)
}

// ClientCapabilitiesFromContext returns the request's handshake, or a legacy
// client when none was attached.
func ClientCapabilitiesFromContext(ctx context.Context) ClientCapabilities {
	if ctx != nil {
		if caps, ok := ctx.Value(clientCapabilitiesKey{}).(ClientCapabilities); ok {
			return caps
		}
	}
	return ClientCapabilities{Mode: ClientCapabilitiesLegacy}
}

type Bootstrap struct {
	Identity
	Title                string   `json:"title"`
	URLs                 Routes   `json:"urls"`
	PreferencesNamespace string   `json:"preferences_namespace"`
	Snapshot             Snapshot `json:"snapshot"`
}
