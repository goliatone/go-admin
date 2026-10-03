package data

import (
	"context"
	"time"
)

const (
	PreviewReady           = "ready"
	PreviewUnavailable     = "unavailable"
	PreviewExpired         = "expired"
	PreviewClosed          = "closed"
	PreviewMaxSurfaces     = 16
	PreviewMaxSessions     = 4
	PreviewMaxPrune        = 100
	PreviewDefaultLifetime = 15 * time.Minute
	PreviewMaxLifetime     = 30 * time.Minute
)

type PreviewSurface struct {
	// Required domain/field grants stay server-side; these are not wire input.
	EntityID string   `json:"-"`
	Fields   []string `json:"-"`
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Kind     string   `json:"kind"`
}

// Every guarantee must be proven by the host before Enabled is set. Durable
// includes atomic request fingerprints, quotas, retention and restart recovery.
type PreviewGuarantees struct {
	Durable   bool `json:"durable"`
	Isolation bool `json:"isolation"`
	ReadOnly  bool `json:"read_only"`
	Retention bool `json:"retention"`
	Cleanup   bool `json:"cleanup"`
}

func (g PreviewGuarantees) Safe() bool {
	return g.Durable && g.Isolation && g.ReadOnly && g.Retention && g.Cleanup
}

type PreviewCapability struct {
	authorization *previewAuthorization
	Supported     bool              `json:"supported"`
	Reason        string            `json:"reason,omitempty"`
	Surfaces      []PreviewSurface  `json:"surfaces"`
	Guarantees    PreviewGuarantees `json:"guarantees"`
}

type OpenApplicationPreviewInput struct {
	Selection ExploreSelection `json:"selection"`
	SurfaceID string           `json:"surface_id"`
	RequestID string           `json:"request_id"`
}
type OpenApplicationPreviewCommand = OpenApplicationPreviewInput

func (OpenApplicationPreviewInput) Type() string { return "data.preview.open" }
func (q OpenApplicationPreviewInput) Validate() error {
	if err := q.Selection.Validate(); err != nil {
		return err
	}
	if q.Selection.Context != ExplorePrepared || !exploreID(q.SurfaceID) || !exploreID(q.RequestID) {
		return Error(CodeInvalid)
	}
	return nil
}

type PreviewCapabilitiesQuery struct {
	Selection ExploreSelection `json:"selection"`
}

func (PreviewCapabilitiesQuery) Type() string { return "data.preview.capabilities" }
func (q PreviewCapabilitiesQuery) Validate() error {
	if err := q.Selection.Validate(); err != nil {
		return err
	}
	if q.Selection.Context != ExplorePrepared {
		return Error(CodeInvalid)
	}
	return nil
}

type ApplicationPreviewSessionQuery struct {
	SessionID string `json:"session_id"`
}

func (ApplicationPreviewSessionQuery) Type() string { return "data.preview.session" }
func (q ApplicationPreviewSessionQuery) Validate() error {
	if !exploreID(q.SessionID) {
		return Error(CodeInvalid)
	}
	return nil
}

type CloseApplicationPreviewCommand struct {
	SessionID string `json:"session_id"`
}

func (CloseApplicationPreviewCommand) Type() string { return "data.preview.close" }
func (q CloseApplicationPreviewCommand) Validate() error {
	return ApplicationPreviewSessionQuery(q).Validate()
}

type ApplicationPreviewSession struct {
	authorization *previewAuthorization
	SessionID     string           `json:"session_id"`
	Selection     ExploreSelection `json:"selection"`
	SurfaceID     string           `json:"surface_id"`
	State         string           `json:"state"`
	ExpiresAt     time.Time        `json:"expires_at"`
	LaunchURL     string           `json:"launch_url,omitempty"`
	ReturnURL     string           `json:"return_url,omitempty"`
	ReadOnly      bool             `json:"read_only"`
}

// PreviewRecord is server-only authority. Never serialize it to a browser.
type PreviewRecord struct {
	Session                      ApplicationPreviewSession
	Principal                    Principal
	ApplicationID, EnvironmentID string
	RequestID, Fingerprint       string
	Receipt                      PreparationReceipt
	// Original monotonic domain/host policy observations survive restart and
	// revoke/restore. They are authority metadata, never browser credentials.
	AuthorizationRevisions []string
}

// Execution and correlation IDs describe a request, not a session owner.
func (r PreviewRecord) Authorizes(p Principal) bool {
	a, b := r.Principal, p
	a.ExecutionID = ""
	a.CorrelationID = ""
	b.ExecutionID = ""
	b.CorrelationID = ""
	return a == b
}

// The adapter must allocate session AND receipt retention atomically. Open uses
// actor/scope/application/environment/target/request as its durable unique key;
// changed fingerprints conflict, even after expiry/close. Replay never extends
// expiry. Inspect is observation-only and checks durable state and isolation.
// New allocations use the requested session UUID; replays return the original
// UUID, allowing the service to roll back only resources owned by that launch.
// End releases only preview authority/resources, never a receipt or active stage.
// Methods are bounded, cancellable, detached and safe across processes.
// The authorization revision covers all mutable application/domain/field/row
// decisions used by this adapter; the same observation-only/nonreuse contract
// as InsightAuthorizationRevision applies. Enabled previews require the host
// Policy to implement that interface as well, covering identity/scope and host
// grants with durable, non-reused epochs. Hashes of current grants are insufficient
// for sessions spanning revoke/restore. A truly immutable policy may use a constant.
type ApplicationPreviewAdapter interface {
	PreviewGuarantees() PreviewGuarantees
	PreviewReadiness(context.Context, Principal, ExploreRead) error
	OpenPreview(context.Context, PreviewRecord, int) (PreviewRecord, error)
	LookupPreview(context.Context, string) (PreviewRecord, error)
	InspectPreview(context.Context, PreviewRecord) error
	EndPreview(context.Context, string, string) error
	PrunePreviews(context.Context, int) error
	InsightAuthorizationRevision
}

type ApplicationPreviewConfig struct {
	Adapter                      ApplicationPreviewAdapter
	Enabled                      bool
	ApplicationID, EnvironmentID string
	Lifetime                     time.Duration
	Surfaces                     []PreviewSurface
	// Now is a host clock, shared with its durable adapter.
	Now func() time.Time
}

// PreviewReadContext is obtained only through the service, after full current
// authorization. Application queries must require it and never select a default
// production route. Pass the original session to ValidatePreviewDelivery after
// query/render work. Each navigation/API read reauthorizes independently.
type PreviewReadContext struct {
	Session   ApplicationPreviewSession
	Principal Principal
	Read      ExploreRead
}
