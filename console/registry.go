package console

import (
	"context"
	"errors"
	"maps"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

// PanelSnapshotFunc returns snapshot payloads for a panel.
type PanelSnapshotFunc func(ctx context.Context) any

// PanelClearFunc clears panel state when requested by the client.
type PanelClearFunc func(ctx context.Context) error

// PanelClearCheckFunc performs an authorization-only clear preflight.
type PanelClearCheckFunc func(ctx context.Context) error

// PanelActionHandler executes a console panel action. Dispatch still requires the
// action to be present in the request-scoped panel definition.
type PanelActionHandler func(ctx context.Context, req PanelActionRequest) (PanelActionResult, error)

// PanelActionHandlerResolver resolves handlers whose action set is backed by
// request-scoped or mutable provider state. The collector still requires the
// action to be present in the current request-scoped panel definition before
// invoking a resolved handler.
type PanelActionHandlerResolver func(ctx context.Context, actionID string) PanelActionHandler

// PanelDefinitionFilter adapts panel discovery metadata for a request context.
type PanelDefinitionFilter func(ctx context.Context, definition PanelDefinition) PanelDefinition

const (
	// PanelUISchemaVersion is the current declarative panel UI schema version.
	PanelUISchemaVersion = "1"

	PanelRendererMetrics    = "metrics"
	PanelRendererKeyValue   = "key_value"
	PanelRendererIdentity   = "identity"
	PanelRendererTable      = "table"
	PanelRendererStatusList = "status_list"
	PanelRendererTimeline   = "timeline"
	PanelRendererJSON       = "json"
	PanelRendererStack      = "stack"
	// PanelRendererCards renders one record card per row (title, status,
	// metadata fields and an action slot). Options: title_bind, subtitle_bind,
	// status_bind, tone_bind, fields, actions_bind, max_cards and columns (the
	// compact table used once rows exceed max_cards).
	PanelRendererCards = "cards"
	// PanelRendererList renders compact record rows (title, subtitle, status,
	// progress, time and an action slot). Options: title_bind, subtitle_bind,
	// status_bind, tone_bind, progress_bind, time_bind, actions_bind and limit.
	PanelRendererList = "list"

	// PanelStackLayoutGrid flows a stack view's sections into responsive
	// columns instead of stacking each section at full width.
	PanelStackLayoutGrid = "grid"

	PanelCountArrayLength = "array_length"
	PanelCountObjectKeys  = "object_keys"
	PanelCountTruthy      = "truthy"
	PanelCountNumber      = "number"
	// PanelCountMatchingRows counts list rows whose bound field is truthy (an
	// attention badge); ToneBind names a row tone, the most severe one wins.
	PanelCountMatchingRows = "matching_rows"
	// PanelCountNone shows no tab count.
	PanelCountNone = "none"

	PanelFilterSearch   = "search"
	PanelFilterSelect   = "select"
	PanelFilterCheckbox = "checkbox"

	PanelEventReplace = "replace"
	PanelEventAppend  = "append"
	PanelEventMerge   = "merge"
	PanelEventUpsert  = "upsert"

	PanelActionLayoutList   = "list"
	PanelActionLayoutSelect = "select"
	// PanelActionLayoutDrawer opens action forms from header, section, row and
	// card action slots instead of rendering them inline.
	PanelActionLayoutDrawer = "drawer"
)

// Action availability. An empty value is available, which keeps existing
// schema-v1 definitions executable. Any other value is display metadata only:
// it never grants dispatch, and the console refuses to run it.
const (
	PanelActionAvailable    = "available"
	PanelActionUnsupported  = "unsupported"
	PanelActionNotPermitted = "not_permitted"
	PanelActionUnavailable  = "unavailable"
)

// Value formats shared by table columns, key/value fields, cards and lists.
// Unknown formats render as escaped text.
const (
	PanelFormatText      = "text"
	PanelFormatBadge     = "badge"
	PanelFormatMono      = "mono"
	PanelFormatCopy      = "copy"
	PanelFormatColor     = "color"
	PanelFormatNumber    = "number"
	PanelFormatBoolean   = "boolean"
	PanelFormatTimestamp = "timestamp"
	PanelFormatDateTime  = "datetime"
	PanelFormatRelative  = "relative"
	// PanelFormatSteps renders a value that is an ordered []PanelUIStep.
	PanelFormatSteps = "steps"
	// PanelFormatProgress renders a value that is a PanelUIProgress.
	PanelFormatProgress = "progress"
)

// Server-computed tones. Records carry a tone next to the label they color
// (columns name it with tone_bind); unknown tones render neutral.
const (
	PanelToneSuccess = "success"
	PanelToneInfo    = "info"
	PanelToneWarning = "warning"
	PanelToneError   = "error"
	PanelToneNeutral = "neutral"
	// PanelTonePlanned marks planned or dry-run work so it never reads as executed.
	PanelTonePlanned = "planned"
)

// Generic step states. Domain code projects labels and states; the console
// never infers lifecycle meaning from them.
const (
	PanelStepDone    = "done"
	PanelStepCurrent = "current"
	PanelStepPending = "pending"
	PanelStepWarning = "warning"
	PanelStepFailed  = "failed"
)

// Action reference emphasis inside an action slot.
const (
	PanelActionEmphasisPrimary = "primary"
	PanelActionEmphasisDefault = "default"
	PanelActionEmphasisMenu    = "menu"
)

const (
	// PanelFieldGenerateRequestID asks the client to generate a request ID
	// for the action draft (ADR-0003). Definitions never carry its value.
	PanelFieldGenerateRequestID = "request_id"
	// PanelFieldKindHidden is a declared field the client never renders; a
	// submitter sets it (see PanelUIActionSubmit) or its default is sent.
	PanelFieldKindHidden = "hidden"
)

// PanelUI is a JSON-safe declarative UI schema for Go-registered panels.
type PanelUI struct {
	SchemaVersion string               `json:"schema_version"`
	Views         PanelUIViews         `json:"views"`
	Count         *PanelUICount        `json:"count,omitempty"`
	Filters       []PanelUIFilter      `json:"filters,omitempty"`
	Events        *PanelUIEventPolicy  `json:"events,omitempty"`
	ActionLayout  *PanelUIActionLayout `json:"action_layout,omitempty"`
	Actions       []PanelUIAction      `json:"actions,omitempty"`
	Metadata      map[string]any       `json:"metadata,omitempty"`
}

// PanelUIViews declares console and toolbar renderers.
type PanelUIViews struct {
	Console *PanelUIView `json:"console,omitempty"`
	Toolbar *PanelUIView `json:"toolbar,omitempty"`
}

// PanelUIView declares one renderer instance. Stack views may use Sections.
// Description, Empty, Link and Actions are additive section metadata that older
// clients ignore.
type PanelUIView struct {
	Renderer string         `json:"renderer"`
	Title    string         `json:"title,omitempty"`
	Bind     string         `json:"bind,omitempty"`
	Options  map[string]any `json:"options,omitempty"`
	Sections []PanelUIView  `json:"sections,omitempty"`
	// Description is a one-line section caption.
	Description string `json:"description,omitempty"`
	// Empty is the view's own empty-state guidance.
	Empty string `json:"empty,omitempty"`
	// Link navigates to another panel of the same console (for example "View all").
	Link *PanelUILink `json:"link,omitempty"`
	// Actions is the section header action slot.
	Actions []PanelUIActionRef `json:"actions,omitempty"`
}

// PanelUILink navigates to another panel of the same console.
type PanelUILink struct {
	Label   string `json:"label"`
	PanelID string `json:"panel_id"`
}

// PanelUIActionRef names one declared action of the panel that renders it.
// Records carry references in the field a view names with actions_bind; the
// client resolves each one against the request-scoped definition, so it can
// neither invent availability nor execute an undeclared, withdrawn or
// foreign-panel reference. The action ID binds server-selected work.
type PanelUIActionRef struct {
	PanelID  string `json:"panel_id"`
	ActionID string `json:"action_id"`
	Emphasis string `json:"emphasis,omitempty"`
}

// PanelUIStep is one generic ordered step (format "steps").
type PanelUIStep struct {
	Label string `json:"label"`
	State string `json:"state,omitempty"`
	Tone  string `json:"tone,omitempty"`
}

// PanelUIProgress is bounded progress (format "progress").
type PanelUIProgress struct {
	Completed uint64 `json:"completed"`
	Total     uint64 `json:"total,omitempty"`
	Label     string `json:"label,omitempty"`
}

// PanelUIRecordRef identifies one record of a panel, for example the row an
// action outcome affected.
type PanelUIRecordRef struct {
	PanelID   string `json:"panel_id"`
	RecordKey string `json:"record_key"`
}

// PanelUIDetail is a safe label/value pair shown by a drawer.
type PanelUIDetail struct {
	Label  string `json:"label"`
	Value  string `json:"value,omitempty"`
	Format string `json:"format,omitempty"`
}

// PanelUIChange is a before/after pair shown before an action is confirmed.
type PanelUIChange struct {
	Label  string `json:"label"`
	Before string `json:"before,omitempty"`
	After  string `json:"after,omitempty"`
	Format string `json:"format,omitempty"`
}

// PanelUIActionDrawer states what an action will do before it runs.
type PanelUIActionDrawer struct {
	Eyebrow    string          `json:"eyebrow,omitempty"`
	Title      string          `json:"title,omitempty"`
	Effect     string          `json:"effect,omitempty"`
	EffectTone string          `json:"effect_tone,omitempty"`
	Steps      []PanelUIStep   `json:"steps,omitempty"`
	Details    []PanelUIDetail `json:"details,omitempty"`
	Note       string          `json:"note,omitempty"`
}

// PanelUIActionSubmit is an explicit secondary submitter, such as Preview plan.
// It sets one declared hidden or boolean field to Value; the primary submitter
// sends that field's default. Each submitter is its own request, so plan and
// execution never share a request ID.
type PanelUIActionSubmit struct {
	Label string `json:"label"`
	Field string `json:"field"`
	Value any    `json:"value"`
}

// PanelUIActionConfirmation is a structured confirmation for the admin modal.
// ConfirmText remains the plain-text fallback for older clients.
type PanelUIActionConfirmation struct {
	Title        string          `json:"title,omitempty"`
	Message      string          `json:"message,omitempty"`
	Changes      []PanelUIChange `json:"changes,omitempty"`
	Note         string          `json:"note,omitempty"`
	ConfirmLabel string          `json:"confirm_label,omitempty"`
	Tone         string          `json:"tone,omitempty"`
}

// PanelUICount declares badge/count behavior. Tone and ToneBind are additive
// badge colors; clients without them show a neutral count.
type PanelUICount struct {
	Bind     string `json:"bind,omitempty"`
	Mode     string `json:"mode,omitempty"`
	Label    string `json:"label,omitempty"`
	Tone     string `json:"tone,omitempty"`
	ToneBind string `json:"tone_bind,omitempty"`
}

// PanelUIFilter declares a client-side console filter.
type PanelUIFilter struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Bind    string   `json:"bind,omitempty"`
	Options []string `json:"options,omitempty"`
}

// PanelUIEventPolicy declares how live events update panel data.
type PanelUIEventPolicy struct {
	Mode       string `json:"mode"`
	Bind       string `json:"bind,omitempty"`
	Key        string `json:"key,omitempty"`
	MaxEntries int    `json:"max_entries,omitempty"`
}

// PanelUIActionLayout declares how panel actions are presented.
type PanelUIActionLayout struct {
	Mode        string `json:"mode,omitempty"`
	PickerLabel string `json:"picker_label,omitempty"`
	EmptyText   string `json:"empty_text,omitempty"`
}

// PanelUIAction declares a UI action backed by a Go handler.
type PanelUIAction struct {
	ID              string               `json:"id"`
	Label           string               `json:"label"`
	SubmitLabel     string               `json:"submit_label,omitempty"`
	Kind            string               `json:"kind,omitempty"`
	ConfirmText     string               `json:"confirm_text,omitempty"`
	RequiresConfirm bool                 `json:"requires_confirm,omitempty"`
	Hidden          bool                 `json:"hidden,omitempty"`
	Refresh         bool                 `json:"refresh,omitempty"`
	UpdatePolicy    string               `json:"update_policy,omitempty"`
	Payload         map[string]any       `json:"payload,omitempty"`
	Fields          []PanelUIActionField `json:"fields,omitempty"`
	Form            *PanelUIActionForm   `json:"form,omitempty"`
	// Availability is empty (available) or one of the PanelAction*
	// availability values. Unavailable declarations are display metadata.
	Availability string `json:"availability,omitempty"`
	// Reason is the safe, human-readable explanation for an unavailable action.
	Reason string `json:"reason,omitempty"`
	// Requires lists client capabilities this action needs. Normalization adds
	// the capabilities implied by generated fields, hidden fields, secondary
	// submits and unavailable availability.
	Requires     []string                   `json:"requires,omitempty"`
	Drawer       *PanelUIActionDrawer       `json:"drawer,omitempty"`
	Secondary    *PanelUIActionSubmit       `json:"secondary_submit,omitempty"`
	Confirmation *PanelUIActionConfirmation `json:"confirmation,omitempty"`
	// RequestScope is an opaque, non-secret, server-issued selector that a
	// client stores with a submitted request ID so the owner can find the
	// claim again (see PanelRequestQuery). It carries no authority.
	RequestScope string `json:"request_scope,omitempty"`
}

// Executable reports whether the declaration may be dispatched. It does not
// authorize the actor; hosts and handlers still check current policy.
func (a PanelUIAction) Executable() bool {
	return normalizeAvailability(a.Availability) == PanelActionAvailable
}

// PanelUIActionForm carries trusted server-generated form markup. HTML must be
// produced by the named renderer; callers must never place operator-authored or
// command-authored raw markup in this contract.
type PanelUIActionForm struct {
	Renderer     string `json:"renderer"`
	OperationID  string `json:"operation_id"`
	HTML         string `json:"html"`
	ModelVersion string `json:"model_version,omitempty"`
	Sensitive    bool   `json:"sensitive,omitempty"`
}

// PanelUIActionField declares a typed input that is merged into an action payload.
type PanelUIActionField struct {
	Name         string                     `json:"name"`
	Label        string                     `json:"label,omitempty"`
	Kind         string                     `json:"kind,omitempty"`
	PayloadPath  string                     `json:"payload_path,omitempty"`
	Placeholder  string                     `json:"placeholder,omitempty"`
	Description  string                     `json:"description,omitempty"`
	Help         string                     `json:"help,omitempty"`
	Required     bool                       `json:"required,omitempty"`
	Sensitive    bool                       `json:"sensitive,omitempty"`
	Options      []string                   `json:"options,omitempty"`
	OptionItems  []PanelUIActionOption      `json:"option_items,omitempty"`
	OptionSource *PanelUIActionOptionSource `json:"option_source,omitempty"`
	Default      any                        `json:"default,omitempty"`
	DisplayHints map[string]any             `json:"display_hints,omitempty"`
	// Advanced fields render inside the form's Advanced disclosure.
	Advanced bool `json:"advanced,omitempty"`
	// Generate names a client-side generator (PanelFieldGenerateRequestID).
	// Generated fields are read-only, required and never carry a default.
	Generate string `json:"generate,omitempty"`
	// Min and Max bound numeric fields for in-place validation. The handler
	// still validates every submitted value.
	Min *float64 `json:"min,omitempty"`
	Max *float64 `json:"max,omitempty"`
}

// PanelUIActionOption preserves a stable submitted value separately from its
// operator-facing label and guidance. Options remains available on the field as
// a legacy value-only projection for older debug clients.
type PanelUIActionOption struct {
	Value       string         `json:"value"`
	Label       string         `json:"label,omitempty"`
	Description string         `json:"description,omitempty"`
	Disabled    bool           `json:"disabled,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// PanelUIActionOptionSource describes a request-scoped option source that the
// client may refresh. Params is declarative and JSON-safe; source execution is
// still authorized and matched to the registered command descriptor server-side.
type PanelUIActionOptionSource struct {
	ID         string         `json:"id"`
	Label      string         `json:"label,omitempty"`
	Dynamic    bool           `json:"dynamic,omitempty"`
	CacheScope string         `json:"cache_scope,omitempty"`
	Params     map[string]any `json:"params,omitempty"`
	// Paginated options are loaded page by page from the console's options
	// route (PanelOptionResolver) instead of being embedded in the definition.
	Paginated bool `json:"paginated,omitempty"`
	// Searchable paginated sources accept a bounded search term.
	Searchable bool `json:"searchable,omitempty"`
}

// PanelUIColumn declares a table column option.
type PanelUIColumn struct {
	Label    string `json:"label"`
	Bind     string `json:"bind"`
	Format   string `json:"format,omitempty"`
	Width    string `json:"width,omitempty"`
	Severity string `json:"severity,omitempty"`
}

// PanelUIField declares a key/value field option.
type PanelUIField struct {
	Label  string `json:"label"`
	Bind   string `json:"bind"`
	Format string `json:"format,omitempty"`
	Empty  string `json:"empty,omitempty"`
}

// PanelUIMetric declares a metric tile option.
type PanelUIMetric struct {
	Label    string `json:"label"`
	Bind     string `json:"bind"`
	Format   string `json:"format,omitempty"`
	Severity string `json:"severity,omitempty"`
}

// NewPanelUI creates a panel UI schema with optional console and toolbar views.
func NewPanelUI(console, toolbar *PanelUIView) *PanelUI {
	return &PanelUI{
		SchemaVersion: PanelUISchemaVersion,
		Views: PanelUIViews{
			Console: console,
			Toolbar: toolbar,
		},
	}
}

// PanelView creates a renderer view bound to a payload path.
func PanelView(renderer, bind string) *PanelUIView {
	return &PanelUIView{Renderer: renderer, Bind: bind}
}

// MetricsView creates a metrics renderer view.
func MetricsView(bind string) *PanelUIView {
	return PanelView(PanelRendererMetrics, bind)
}

// KeyValueView creates a key/value renderer view.
func KeyValueView(bind string) *PanelUIView {
	return PanelView(PanelRendererKeyValue, bind)
}

// IdentityView creates a summary identity renderer view. It presents one
// primary title with an optional accent color, eyebrow, subtitle, and
// supporting chips so a panel can lead with the value operators scan first.
func IdentityView(bind string) *PanelUIView {
	return PanelView(PanelRendererIdentity, bind)
}

// GridStackView creates a stack view whose sections flow into responsive
// columns instead of stacking at full width.
func GridStackView(sections ...PanelUIView) *PanelUIView {
	view := StackView(sections...)
	view.Options = map[string]any{"layout": PanelStackLayoutGrid}
	return view
}

// TableView creates a table renderer view.
func TableView(bind string) *PanelUIView {
	return PanelView(PanelRendererTable, bind)
}

// StatusListView creates a status list renderer view.
func StatusListView(bind string) *PanelUIView {
	return PanelView(PanelRendererStatusList, bind)
}

// TimelineView creates a timeline renderer view.
func TimelineView(bind string) *PanelUIView {
	return PanelView(PanelRendererTimeline, bind)
}

// JSONView creates a JSON fallback renderer view.
func JSONView(bind string) *PanelUIView {
	return PanelView(PanelRendererJSON, bind)
}

// StackView creates a stack renderer view with child sections.
func StackView(sections ...PanelUIView) *PanelUIView {
	return &PanelUIView{Renderer: PanelRendererStack, Sections: append([]PanelUIView{}, sections...)}
}

// PanelActionRequest is sent to a registered action handler.
type PanelActionRequest struct {
	PanelID  string         `json:"panel_id"`
	ActionID string         `json:"action_id"`
	Payload  map[string]any `json:"payload,omitempty"`
}

// PanelActionResult is returned by panel action handlers. Tone, Code, Planned,
// Record and FollowUp are additive outcome metadata for result banners.
type PanelActionResult struct {
	OK      bool              `json:"ok"`
	Message string            `json:"message,omitempty"`
	Data    any               `json:"data,omitempty"`
	Refresh bool              `json:"refresh,omitempty"`
	Event   *PanelActionEvent `json:"event,omitempty"`
	Errors  map[string]any    `json:"errors,omitempty"`
	// Tone colors the result banner (allowlisted PanelTone* values).
	Tone string `json:"tone,omitempty"`
	// Code is a safe machine code for a typed failure, never provider text.
	Code string `json:"code,omitempty"`
	// Planned marks dry-run/planned outcomes so they never read as executed.
	Planned bool `json:"planned,omitempty"`
	// Record is the row the outcome concerns (link and highlight).
	Record *PanelUIRecordRef `json:"record,omitempty"`
	// FollowUp lists declared actions the actor may take next.
	FollowUp []PanelUIActionRef `json:"follow_up,omitempty"`
}

// Bounds for the options and request-status routes.
const (
	PanelOptionPageDefault = 25
	PanelOptionPageMax     = 100
	PanelOptionSearchMax   = 120
	PanelOptionCursorMax   = 512
	PanelOptionValuesMax   = 10
	PanelRequestIDMax      = 128
	PanelRequestScopeMax   = 200
)

// PanelOptionQuery asks for one bounded page of a declared field's options.
// Cursor is opaque and resolver-issued; Values asks the resolver to resolve
// already-selected values (for example an older retained receipt) without
// scanning every page. Identity comes from trusted context, never the query.
type PanelOptionQuery struct {
	PanelID  string
	ActionID string
	Field    string
	Cursor   string
	Search   string
	Limit    int
	Values   []string
}

// PanelOptionPage is one page of options. Selected resolves requested Values
// that the actor may still use; unknown or unauthorized values are omitted.
type PanelOptionPage struct {
	Items      []PanelUIActionOption `json:"items"`
	NextCursor string                `json:"next_cursor,omitempty"`
	Selected   []PanelUIActionOption `json:"selected,omitempty"`
}

// PanelOptionResolver loads paginated options for executable actions only. It
// must apply current policy itself and stay bounded.
type PanelOptionResolver func(ctx context.Context, query PanelOptionQuery) (PanelOptionPage, error)

// Pending request states (ADR-0003 reconciliation).
const (
	// PanelRequestClaimed: the request was received; Result describes it.
	PanelRequestClaimed = "claimed"
	// PanelRequestUnclaimed: no claim exists for this request ID within the
	// retry window, so resubmitting the unchanged request cannot duplicate work.
	PanelRequestUnclaimed = "unclaimed"
	// PanelRequestExpired: the retry window or claim authority is gone; only
	// explicit new work may follow.
	PanelRequestExpired = "expired"
	// PanelRequestUnknown: the claim could not be determined now; keep the
	// request pending and never restart it automatically.
	PanelRequestUnknown = "unknown"
)

// PanelRequestQuery looks up the current actor's own submitted request. The
// action may since have been withdrawn; Scope is the declaration's opaque
// RequestScope and selects nothing beyond the trusted actor/scope namespace.
// SubmittedAt is the client's own record of its first submission (zero when
// unknown). It is guidance for the retry window, never authority: a resolver
// reports unclaimed only while that window is still open, otherwise expired.
type PanelRequestQuery struct {
	PanelID     string
	ActionID    string
	RequestID   string
	Scope       string
	SubmittedAt time.Time
}

// PanelRequestStatus reports a pending request without exposing stored keys,
// fingerprints or principals. RetryUntil is RFC 3339 UTC guidance.
type PanelRequestStatus struct {
	Status     string             `json:"status"`
	Message    string             `json:"message,omitempty"`
	Result     *PanelActionResult `json:"result,omitempty"`
	RetryUntil string             `json:"retry_until,omitempty"`
}

// PanelRequestResolver answers pending-request lookups under current policy.
type PanelRequestResolver func(ctx context.Context, query PanelRequestQuery) (PanelRequestStatus, error)

// NormalizePanelActionResult sanitizes outcome metadata before delivery.
func NormalizePanelActionResult(result PanelActionResult) PanelActionResult {
	result.Tone = NormalizePanelTone(result.Tone)
	result.Code = normalizeResultCode(result.Code)
	if result.Record != nil {
		ref := PanelUIRecordRef{PanelID: normalizeID(result.Record.PanelID), RecordKey: strings.TrimSpace(result.Record.RecordKey)}
		if safeIdentifier(ref.PanelID) && printableBounded(ref.RecordKey, 256) {
			result.Record = &ref
		} else {
			result.Record = nil
		}
	}
	result.FollowUp = NormalizePanelActionRefs(result.FollowUp)
	return result
}

// NormalizePanelOptionQuery bounds an options request.
func NormalizePanelOptionQuery(query PanelOptionQuery) PanelOptionQuery {
	query.PanelID, query.ActionID, query.Field = normalizeID(query.PanelID), normalizeID(query.ActionID), normalizeID(query.Field)
	if query.Limit <= 0 {
		query.Limit = PanelOptionPageDefault
	}
	if query.Limit > PanelOptionPageMax {
		query.Limit = PanelOptionPageMax
	}
	query.Search = strings.TrimSpace(query.Search)
	if len(query.Search) > PanelOptionSearchMax || !printableBounded(query.Search, PanelOptionSearchMax) {
		query.Search = ""
	}
	if !printableBounded(query.Cursor, PanelOptionCursorMax) {
		query.Cursor = ""
	}
	values := make([]string, 0, len(query.Values))
	for _, value := range query.Values {
		value = strings.TrimSpace(value)
		if value != "" && printableBounded(value, 256) && len(values) < PanelOptionValuesMax {
			values = append(values, value)
		}
	}
	query.Values = values
	return query
}

// NormalizePanelOptionPage bounds a resolver page to limit items and safe text.
func NormalizePanelOptionPage(page PanelOptionPage, limit int) PanelOptionPage {
	if limit <= 0 || limit > PanelOptionPageMax {
		limit = PanelOptionPageMax
	}
	out := PanelOptionPage{Items: normalizePanelUIActionOptions(page.Items), Selected: normalizePanelUIActionOptions(page.Selected)}
	if out.Items == nil {
		out.Items = []PanelUIActionOption{}
	}
	if len(out.Items) > limit {
		out.Items = out.Items[:limit]
	}
	if len(out.Selected) > PanelOptionValuesMax {
		out.Selected = out.Selected[:PanelOptionValuesMax]
	}
	if cursor := strings.TrimSpace(page.NextCursor); printableBounded(cursor, PanelOptionCursorMax) {
		out.NextCursor = cursor
	}
	return out
}

// NormalizePanelRequestStatus allowlists the status and sanitizes its result.
// Only a claimed request carries a result.
func NormalizePanelRequestStatus(status PanelRequestStatus) PanelRequestStatus {
	out := PanelRequestStatus{Status: normalizeID(status.Status), Message: strings.TrimSpace(status.Message)}
	switch out.Status {
	case PanelRequestClaimed, PanelRequestUnclaimed, PanelRequestExpired:
	default:
		out.Status = PanelRequestUnknown
	}
	if out.Status == PanelRequestClaimed && status.Result != nil {
		result := NormalizePanelActionResult(*status.Result)
		out.Result = &result
	}
	if until := strings.TrimSpace(status.RetryUntil); until != "" {
		if parsed, err := time.Parse(time.RFC3339, until); err == nil {
			out.RetryUntil = parsed.UTC().Format(time.RFC3339)
		}
	}
	return out
}

// ValidRequestID reports whether a generated request ID is a canonical UUID.
// Request IDs are idempotency keys, never credentials or correlation IDs.
func ValidRequestID(value string) bool {
	if len(value) != 36 {
		return false
	}
	for index, ch := range value {
		switch index {
		case 8, 13, 18, 23:
			if ch != '-' {
				return false
			}
		default:
			if (ch < '0' || ch > '9') && (ch < 'a' || ch > 'f') && (ch < 'A' || ch > 'F') {
				return false
			}
		}
	}
	return true
}

func normalizeResultCode(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 64 {
		return ""
	}
	for _, ch := range value {
		if (ch < 'a' || ch > 'z') && (ch < 'A' || ch > 'Z') && (ch < '0' || ch > '9') && ch != '_' && ch != '-' && ch != '.' {
			return ""
		}
	}
	return value
}

// printableBounded accepts empty values and printable text without markup.
func printableBounded(value string, limit int) bool {
	if len(value) > limit {
		return false
	}
	for _, ch := range value {
		if ch < 0x20 || ch == 0x7f || ch == '<' || ch == '>' {
			return false
		}
	}
	return true
}

// PanelActionEvent allows action results to be applied like a live event.
type PanelActionEvent struct {
	Type    string `json:"type"`
	Payload any    `json:"payload,omitempty"`
}

// PanelConfig configures a server-side console panel registration.
type PanelConfig struct {
	Label           string                        `json:"label"`
	Icon            string                        `json:"icon"`
	Span            int                           `json:"span"`
	SnapshotKey     string                        `json:"snapshot_key"`
	EventType       string                        `json:"event_type"`
	EventTypes      []string                      `json:"event_types"`
	Snapshot        PanelSnapshotFunc             `json:"snapshot"`
	ClearCheck      PanelClearCheckFunc           `json:"-"`
	Clear           PanelClearFunc                `json:"clear"`
	SupportsToolbar *bool                         `json:"supports_toolbar"`
	Category        string                        `json:"category"`
	Order           int                           `json:"order"`
	Version         string                        `json:"version"`
	Metadata        map[string]any                `json:"metadata"`
	UI              *PanelUI                      `json:"ui,omitempty"`
	Definition      PanelDefinitionFilter         `json:"-"`
	Actions         map[string]PanelActionHandler `json:"-"`
	ActionResolver  PanelActionHandlerResolver    `json:"-"`
	// Options serves paginated option sources of this panel's action fields.
	Options PanelOptionResolver `json:"-"`
	// Requests answers pending-request lookups for this panel's actions.
	Requests PanelRequestResolver `json:"-"`
}

// PanelDefinition describes a registered panel for client discovery.
type PanelDefinition struct {
	ID              string         `json:"id"`
	Label           string         `json:"label"`
	Icon            string         `json:"icon,omitempty"`
	Span            int            `json:"span,omitempty"`
	SnapshotKey     string         `json:"snapshot_key"`
	EventTypes      []string       `json:"event_types,omitempty"`
	SupportsToolbar bool           `json:"supports_toolbar"`
	Category        string         `json:"category,omitempty"`
	Order           int            `json:"order,omitempty"`
	Version         string         `json:"version,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	UI              *PanelUI       `json:"ui,omitempty"`
}

// PanelRegistration stores definition metadata and server hooks.
type PanelRegistration struct {
	Definition     PanelDefinition               `json:"definition"`
	Filter         PanelDefinitionFilter         `json:"-"`
	Snapshot       PanelSnapshotFunc             `json:"snapshot"`
	ClearCheck     PanelClearCheckFunc           `json:"-"`
	Clear          PanelClearFunc                `json:"clear"`
	Actions        map[string]PanelActionHandler `json:"-"`
	ActionResolver PanelActionHandlerResolver    `json:"-"`
	Options        PanelOptionResolver           `json:"-"`
	Requests       PanelRequestResolver          `json:"-"`
}

// PanelRegistry stores registered panels and metadata.
type PanelRegistry struct {
	mu         sync.RWMutex
	panels     map[string]PanelRegistration
	eventIndex map[string]map[string]bool
	version    string
}

// NewPanelRegistry creates an empty panel registry.
func NewPanelRegistry() *PanelRegistry {
	return &PanelRegistry{
		panels:     map[string]PanelRegistration{},
		eventIndex: map[string]map[string]bool{},
	}
}

// Register registers a panel in the registry.
func (r *PanelRegistry) Register(id string, config PanelConfig) error {
	if r == nil {
		return errors.New("panel registry is nil")
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return errors.New("panel id cannot be empty")
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.panels[normalized]; exists {
		return errors.New("panel already registered")
	}

	reg := buildRegistration(normalized, config)
	r.panels[normalized] = reg
	for _, eventType := range reg.Definition.EventTypes {
		set := r.eventIndex[eventType]
		if set == nil {
			set = map[string]bool{}
			r.eventIndex[eventType] = set
		}
		set[normalized] = true
	}
	return nil
}

// Unregister removes a panel from the registry.
func (r *PanelRegistry) Unregister(id string) {
	if r == nil {
		return
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return
	}
	r.mu.Lock()
	reg, ok := r.panels[normalized]
	if ok {
		delete(r.panels, normalized)
	}
	for _, eventType := range reg.Definition.EventTypes {
		set := r.eventIndex[eventType]
		if set == nil {
			continue
		}
		delete(set, normalized)
		if len(set) == 0 {
			delete(r.eventIndex, eventType)
		}
	}
	r.mu.Unlock()
}

// Registration returns a panel registration by ID.
func (r *PanelRegistry) Registration(id string) (PanelRegistration, bool) {
	if r == nil {
		return PanelRegistration{}, false
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return PanelRegistration{}, false
	}
	r.mu.RLock()
	reg, ok := r.panels[normalized]
	r.mu.RUnlock()
	return cloneRegistration(reg), ok
}

// DefinitionForContext returns a panel definition adapted for a request context.
func (r *PanelRegistry) DefinitionForContext(ctx context.Context, id string) (PanelDefinition, bool) {
	reg, ok := r.Registration(id)
	if !ok {
		return PanelDefinition{}, false
	}
	return reg.definitionForContext(ctx), true
}

// Definitions returns a sorted list of registered panel definitions.
func (r *PanelRegistry) Definitions() []PanelDefinition {
	return r.DefinitionsWithContext(context.Background())
}

// DefinitionsWithContext returns a sorted list of context-adapted panel definitions.
func (r *PanelRegistry) DefinitionsWithContext(ctx context.Context) []PanelDefinition {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	registrations := make([]PanelRegistration, 0, len(r.panels))
	for _, reg := range r.panels {
		registrations = append(registrations, cloneRegistration(reg))
	}
	r.mu.RUnlock()
	defs := make([]PanelDefinition, 0, len(registrations))
	for _, reg := range registrations {
		defs = append(defs, reg.definitionForContext(ctx))
	}
	sort.Slice(defs, func(i, j int) bool {
		return defs[i].ID < defs[j].ID
	})
	return defs
}

// Registrations returns a sorted list of panel registrations.
func (r *PanelRegistry) Registrations() []PanelRegistration {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	out := make([]PanelRegistration, 0, len(r.panels))
	for _, reg := range r.panels {
		out = append(out, cloneRegistration(reg))
	}
	r.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool {
		return out[i].Definition.ID < out[j].Definition.ID
	})
	return out
}

// PanelsForEventType returns panel IDs that subscribe to an event type.
func (r *PanelRegistry) PanelsForEventType(eventType string) []string {
	if r == nil {
		return nil
	}
	eventType = normalizeID(eventType)
	if eventType == "" {
		return nil
	}
	r.mu.RLock()
	set := r.eventIndex[eventType]
	ids := make([]string, 0, len(set))
	for id := range set {
		ids = append(ids, id)
	}
	r.mu.RUnlock()
	sort.Strings(ids)
	return ids
}

// SetVersion updates the registry version identifier.
func (r *PanelRegistry) SetVersion(version string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.version = strings.TrimSpace(version)
	r.mu.Unlock()
}

// Version returns the registry version identifier.
func (r *PanelRegistry) Version() string {
	if r == nil {
		return ""
	}
	r.mu.RLock()
	version := r.version
	r.mu.RUnlock()
	return version
}

func buildRegistration(id string, config PanelConfig) PanelRegistration {
	def := PanelDefinition{
		ID:          id,
		Label:       strings.TrimSpace(config.Label),
		Icon:        strings.TrimSpace(config.Icon),
		Span:        config.Span,
		SnapshotKey: normalizeID(config.SnapshotKey),
		Category:    strings.TrimSpace(config.Category),
		Order:       config.Order,
		Version:     strings.TrimSpace(config.Version),
	}
	if def.SnapshotKey == "" {
		def.SnapshotKey = id
	}
	def.EventTypes = normalizeEventTypes(config, def.SnapshotKey)
	def.SupportsToolbar = supportsToolbar(config.SupportsToolbar)
	if def.Label == "" {
		def.Label = formatPanelLabel(id)
	}
	if len(config.Metadata) > 0 {
		def.Metadata = cloneMetadata(config.Metadata)
	}
	if config.UI != nil {
		def.UI = normalizePanelUI(config.UI, config.Actions, config.ActionResolver != nil)
	}
	return PanelRegistration{
		Definition:     def,
		Filter:         config.Definition,
		Snapshot:       config.Snapshot,
		ClearCheck:     config.ClearCheck,
		Clear:          config.Clear,
		Actions:        normalizeActionHandlers(config.Actions),
		ActionResolver: config.ActionResolver,
		Options:        config.Options,
		Requests:       config.Requests,
	}
}

// DefinitionForContext returns this registration's definition adapted for a request context.
func (r PanelRegistration) DefinitionForContext(ctx context.Context) PanelDefinition {
	return r.definitionForContext(ctx)
}

func (r PanelRegistration) definitionForContext(ctx context.Context) PanelDefinition {
	def := cloneRegistration(r).Definition
	if r.Filter != nil {
		filtered := r.Filter(ctx, def)
		if filtered.ID != "" {
			// Request-scoped declarations get the same fail-closed workflow
			// normalization as registered ones.
			filtered.UI = normalizeWorkflowUI(filtered.UI)
			return filtered
		}
	}
	return def
}

// Clone schema/hook maps before handing them to a consumer or request filter.
// Filters cannot mutate another actor's discovery or redirect stored callbacks.
func cloneRegistration(r PanelRegistration) PanelRegistration {
	r.Actions = maps.Clone(r.Actions)
	r.Definition.EventTypes = append([]string(nil), r.Definition.EventTypes...)
	r.Definition.Metadata = cloneMetadata(r.Definition.Metadata)
	r.Definition.UI = normalizePanelUI(r.Definition.UI, r.Actions, r.ActionResolver != nil)
	return r
}

// ActionHandlerForContext returns a handler only when the action is exposed by
// the current request-scoped definition. Fixed handlers are preferred; the
// resolver is consulted only when no fixed handler matches.
func (r PanelRegistration) ActionHandlerForContext(ctx context.Context, actionID string) PanelActionHandler {
	actionID = normalizeID(actionID)
	if actionID == "" || (len(r.Actions) == 0 && r.ActionResolver == nil) {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if !PanelDefinitionHasAction(r.definitionForContext(ctx), actionID) {
		return nil
	}
	if handler := panelActionHandlerFor(r.Actions, actionID); handler != nil {
		return handler
	}
	if r.ActionResolver == nil {
		return nil
	}
	return r.ActionResolver(ctx, actionID)
}

func supportsToolbar(value *bool) bool {
	if value == nil {
		return true
	}
	return *value
}

func normalizeEventTypes(config PanelConfig, snapshotKey string) []string {
	types := make([]string, 0, 1+len(config.EventTypes))
	if strings.TrimSpace(config.EventType) != "" {
		types = append(types, config.EventType)
	}
	if len(config.EventTypes) > 0 {
		types = append(types, config.EventTypes...)
	}
	if len(types) == 0 && snapshotKey != "" {
		types = append(types, snapshotKey)
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(types))
	for _, eventType := range types {
		normalized := normalizeID(eventType)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, normalized)
	}
	return out
}

func normalizeID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func formatPanelLabel(id string) string {
	trimmed := strings.TrimSpace(id)
	if trimmed == "" {
		return ""
	}
	replacer := strings.NewReplacer("-", " ", "_", " ", ".", " ", "/", " ")
	parts := strings.Fields(replacer.Replace(trimmed))
	for i, part := range parts {
		lower := strings.ToLower(part)
		switch lower {
		case "sql":
			parts[i] = "SQL"
		case "id":
			parts[i] = "ID"
		default:
			parts[i] = titleCase(lower)
		}
	}
	if len(parts) == 0 {
		return titleCase(trimmed)
	}
	return strings.Join(parts, " ")
}

func titleCase(val string) string {
	if val == "" {
		return ""
	}
	return strings.ToUpper(val[:1]) + strings.ToLower(val[1:])
}

func cloneMetadata(input map[string]any) map[string]any {
	return primitives.CloneAnyMapDeep(input)
}

//nolint:gocyclo // panel UI normalization handles a fixed legacy schema matrix in one place.
func normalizePanelUI(input *PanelUI, handlers map[string]PanelActionHandler, hasResolver bool) *PanelUI {
	if input == nil {
		return nil
	}
	ui := &PanelUI{
		SchemaVersion: strings.TrimSpace(input.SchemaVersion),
		Views: PanelUIViews{
			Console: normalizePanelUIView(input.Views.Console),
			Toolbar: normalizePanelUIView(input.Views.Toolbar),
		},
	}
	if ui.SchemaVersion == "" {
		ui.SchemaVersion = PanelUISchemaVersion
	}
	if ui.SchemaVersion != PanelUISchemaVersion {
		marker := &PanelUI{SchemaVersion: ui.SchemaVersion}
		if len(input.Metadata) > 0 {
			marker.Metadata = cloneJSONSafeMap(input.Metadata)
		}
		return marker
	}
	if input.Count != nil {
		if count := normalizePanelUICount(input.Count); count != nil {
			ui.Count = count
		}
	}
	for _, filter := range input.Filters {
		if normalized, ok := normalizePanelUIFilter(filter); ok {
			ui.Filters = append(ui.Filters, normalized)
		}
	}
	if input.Events != nil {
		if events := normalizePanelUIEventPolicy(input.Events); events != nil {
			ui.Events = events
		}
	}
	if input.ActionLayout != nil {
		if layout := normalizePanelUIActionLayout(input.ActionLayout); layout != nil {
			ui.ActionLayout = layout
		}
	}
	ui.Actions = normalizePanelUIActions(input.Actions, handlers, hasResolver)
	if len(input.Metadata) > 0 {
		ui.Metadata = cloneJSONSafeMap(input.Metadata)
	}
	if ui.Views.Console == nil && ui.Views.Toolbar == nil && ui.Count == nil && len(ui.Filters) == 0 && ui.Events == nil && len(ui.Actions) == 0 {
		return nil
	}
	return ui
}

func normalizePanelUIView(input *PanelUIView) *PanelUIView {
	if input == nil {
		return nil
	}
	renderer := normalizeRenderer(input.Renderer)
	if renderer == "" {
		return nil
	}
	view := &PanelUIView{
		Renderer:    renderer,
		Title:       trimSafeText(input.Title),
		Bind:        normalizeBind(input.Bind),
		Description: trimSafeText(input.Description),
		Empty:       trimSafeText(input.Empty),
		Link:        normalizePanelUILink(input.Link),
		Actions:     NormalizePanelActionRefs(input.Actions),
	}
	if len(input.Options) > 0 {
		view.Options = cloneJSONSafeMap(input.Options)
	}
	for _, section := range input.Sections {
		if normalized := normalizePanelUIView(&section); normalized != nil {
			view.Sections = append(view.Sections, *normalized)
		}
	}
	return view
}

func normalizePanelUILink(input *PanelUILink) *PanelUILink {
	if input == nil {
		return nil
	}
	label, panelID := trimSafeText(input.Label), normalizeID(input.PanelID)
	if label == "" || !safeIdentifier(panelID) {
		return nil
	}
	return &PanelUILink{Label: label, PanelID: panelID}
}

// NormalizePanelActionRefs keeps well-formed, distinct action references.
// Projections use it before placing references in record data.
func NormalizePanelActionRefs(refs []PanelUIActionRef) []PanelUIActionRef {
	if len(refs) == 0 {
		return nil
	}
	out := make([]PanelUIActionRef, 0, len(refs))
	seen := map[string]bool{}
	for _, ref := range refs {
		panelID, actionID := normalizeID(ref.PanelID), normalizeID(ref.ActionID)
		key := panelID + "\x00" + actionID
		if !safeIdentifier(panelID) || !safeIdentifier(actionID) || seen[key] {
			continue
		}
		seen[key] = true
		emphasis := normalizeID(ref.Emphasis)
		switch emphasis {
		case PanelActionEmphasisPrimary, PanelActionEmphasisMenu:
		default:
			emphasis = ""
		}
		out = append(out, PanelUIActionRef{PanelID: panelID, ActionID: actionID, Emphasis: emphasis})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// NormalizePanelTone returns an allowlisted tone, or "" when unknown.
func NormalizePanelTone(value string) string {
	switch tone := normalizeID(value); tone {
	case PanelToneSuccess, PanelToneInfo, PanelToneWarning, PanelToneError, PanelToneNeutral, PanelTonePlanned:
		return tone
	default:
		return ""
	}
}

// NormalizePanelSteps keeps labelled steps with allowlisted states and tones.
func NormalizePanelSteps(steps []PanelUIStep) []PanelUIStep {
	if len(steps) == 0 {
		return nil
	}
	out := make([]PanelUIStep, 0, len(steps))
	for _, step := range steps {
		label := trimSafeText(step.Label)
		if label == "" {
			continue
		}
		state := normalizeID(step.State)
		switch state {
		case PanelStepDone, PanelStepCurrent, PanelStepWarning, PanelStepFailed:
		default:
			state = PanelStepPending
		}
		out = append(out, PanelUIStep{Label: label, State: state, Tone: NormalizePanelTone(step.Tone)})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeAvailability(value string) string {
	switch availability := normalizeID(value); availability {
	case "", PanelActionAvailable:
		return PanelActionAvailable
	case PanelActionUnsupported, PanelActionNotPermitted:
		return availability
	default:
		return PanelActionUnavailable
	}
}

func defaultAvailabilityReason(availability string) string {
	switch availability {
	case PanelActionUnsupported:
		return "Not supported here."
	case PanelActionNotPermitted:
		return "You do not have permission to run this action."
	default:
		return "Not available right now."
	}
}

// safeIdentifier accepts the bounded identifier alphabet used for panel,
// action, field and capability IDs on the wire.
func safeIdentifier(value string) bool {
	if value == "" || len(value) > 160 {
		return false
	}
	for _, ch := range value {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '-' && ch != '_' && ch != '.' && ch != ':' {
			return false
		}
	}
	return true
}

// normalizeCapabilities lowercases, validates, deduplicates and sorts
// capability IDs. At most eight are kept.
func normalizeCapabilities(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = normalizeID(value)
		if !safeIdentifier(value) || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	sort.Strings(out)
	if len(out) > 8 {
		out = out[:8]
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizePanelUIActionDrawer(input *PanelUIActionDrawer) *PanelUIActionDrawer {
	if input == nil {
		return nil
	}
	drawer := &PanelUIActionDrawer{
		Eyebrow:    trimSafeText(input.Eyebrow),
		Title:      trimSafeText(input.Title),
		Effect:     trimSafeText(input.Effect),
		EffectTone: NormalizePanelTone(input.EffectTone),
		Steps:      NormalizePanelSteps(input.Steps),
		Note:       trimSafeText(input.Note),
	}
	for _, detail := range input.Details {
		label := trimSafeText(detail.Label)
		if label == "" {
			continue
		}
		drawer.Details = append(drawer.Details, PanelUIDetail{Label: label, Value: trimSafeText(detail.Value), Format: normalizeFormat(detail.Format)})
	}
	if drawer.Eyebrow == "" && drawer.Title == "" && drawer.Effect == "" && drawer.Note == "" && len(drawer.Steps) == 0 && len(drawer.Details) == 0 {
		return nil
	}
	return drawer
}

func normalizePanelUIActionConfirmation(input *PanelUIActionConfirmation) *PanelUIActionConfirmation {
	if input == nil {
		return nil
	}
	confirmation := &PanelUIActionConfirmation{
		Title:        trimSafeText(input.Title),
		Message:      trimSafeText(input.Message),
		Note:         trimSafeText(input.Note),
		ConfirmLabel: trimSafeText(input.ConfirmLabel),
		Tone:         NormalizePanelTone(input.Tone),
	}
	for _, change := range input.Changes {
		label := trimSafeText(change.Label)
		if label == "" {
			continue
		}
		confirmation.Changes = append(confirmation.Changes, PanelUIChange{
			Label: label, Before: trimSafeText(change.Before), After: trimSafeText(change.After), Format: normalizeFormat(change.Format),
		})
	}
	if confirmation.Title == "" && confirmation.Message == "" && len(confirmation.Changes) == 0 {
		return nil
	}
	return confirmation
}

// normalizePanelUIActionSubmit keeps a secondary submitter only when it sets a
// declared hidden or boolean field to a JSON scalar.
func normalizePanelUIActionSubmit(input *PanelUIActionSubmit, fields []PanelUIActionField) *PanelUIActionSubmit {
	if input == nil {
		return nil
	}
	label, field := trimSafeText(input.Label), normalizeID(input.Field)
	if label == "" || field == "" {
		return nil
	}
	value, ok := cloneJSONSafeValue(input.Value)
	if !ok || value == nil {
		return nil
	}
	switch value.(type) {
	case bool, string, float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
	default:
		return nil
	}
	for _, declared := range fields {
		if declared.Name == field && (declared.Kind == PanelFieldKindHidden || declared.Kind == "boolean" || declared.Kind == "checkbox") {
			return &PanelUIActionSubmit{Label: label, Field: field, Value: value}
		}
	}
	return nil
}

func normalizeFormat(value string) string {
	switch format := normalizeID(value); format {
	case PanelFormatText, PanelFormatBadge, PanelFormatMono, PanelFormatCopy, PanelFormatColor, PanelFormatNumber,
		PanelFormatBoolean, PanelFormatTimestamp, PanelFormatDateTime, PanelFormatRelative, PanelFormatSteps, PanelFormatProgress:
		return format
	default:
		return ""
	}
}

// implicitActionRequirements are the client capabilities a declaration needs
// for its new behavior to execute safely (ADR-0004 compatibility).
func implicitActionRequirements(action PanelUIAction) []string {
	required := []string{}
	if !action.Executable() {
		required = append(required, ClientCapabilityActionAvailability)
	}
	if action.Secondary != nil {
		required = append(required, ClientCapabilitySecondarySubmit)
	}
	for _, field := range action.Fields {
		if field.Generate == PanelFieldGenerateRequestID {
			required = append(required, ClientCapabilityRequestID)
		}
		if field.Kind == PanelFieldKindHidden {
			required = append(required, ClientCapabilitySecondarySubmit)
		}
	}
	return required
}

func normalizeRequestScope(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > PanelRequestScopeMax {
		return ""
	}
	for _, ch := range value {
		if ch < 0x21 || ch > 0x7e || ch == '<' || ch == '>' || ch == '"' || ch == '\'' || ch == '&' {
			return ""
		}
	}
	return value
}

func normalizePanelUICount(input *PanelUICount) *PanelUICount {
	mode := normalizeCountMode(input.Mode)
	if mode == "" {
		mode = PanelCountArrayLength
	}
	return &PanelUICount{
		Bind:     normalizeBind(input.Bind),
		Mode:     mode,
		Label:    trimSafeText(input.Label),
		Tone:     NormalizePanelTone(input.Tone),
		ToneBind: normalizeBind(input.ToneBind),
	}
}

func normalizePanelUIFilter(input PanelUIFilter) (PanelUIFilter, bool) {
	id := normalizeID(input.ID)
	kind := normalizeFilterKind(input.Kind)
	if id == "" || kind == "" {
		return PanelUIFilter{}, false
	}
	label := trimSafeText(input.Label)
	if label == "" {
		label = formatPanelLabel(id)
	}
	out := PanelUIFilter{
		ID:    id,
		Label: label,
		Kind:  kind,
		Bind:  normalizeBind(input.Bind),
	}
	for _, option := range input.Options {
		option = trimSafeText(option)
		if option != "" {
			out.Options = append(out.Options, option)
		}
	}
	if out.Kind == PanelFilterSelect && len(out.Options) == 0 {
		return PanelUIFilter{}, false
	}
	return out, true
}

func normalizePanelUIEventPolicy(input *PanelUIEventPolicy) *PanelUIEventPolicy {
	mode := normalizeEventPolicyMode(input.Mode)
	if mode == "" {
		mode = PanelEventReplace
	}
	out := &PanelUIEventPolicy{
		Mode:       mode,
		Bind:       normalizeBind(input.Bind),
		Key:        normalizeBind(input.Key),
		MaxEntries: input.MaxEntries,
	}
	if out.MaxEntries < 0 {
		out.MaxEntries = 0
	}
	if out.Mode == PanelEventUpsert && out.Key == "" {
		return nil
	}
	return out
}

func normalizePanelUIActionLayout(input *PanelUIActionLayout) *PanelUIActionLayout {
	mode := normalizeID(input.Mode)
	switch mode {
	case "", PanelActionLayoutList:
		mode = PanelActionLayoutList
	case PanelActionLayoutSelect, PanelActionLayoutDrawer:
	default:
		return nil
	}
	return &PanelUIActionLayout{
		Mode:        mode,
		PickerLabel: trimSafeText(input.PickerLabel),
		EmptyText:   trimSafeText(input.EmptyText),
	}
}

// normalizePanelUIActions keeps executable declarations that have a handler
// (or a resolver) and display-only unavailable declarations, which need none.
// Unavailable declarations lose every executable part.
func normalizePanelUIActions(actions []PanelUIAction, handlers map[string]PanelActionHandler, hasResolver bool) []PanelUIAction {
	if len(actions) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]PanelUIAction, 0, len(actions))
	for _, action := range actions {
		id := normalizeID(action.ID)
		if id == "" || seen[id] {
			continue
		}
		availability := normalizeAvailability(action.Availability)
		executable := availability == PanelActionAvailable
		if executable && panelActionHandlerFor(handlers, id) == nil && !hasResolver {
			continue
		}
		label := trimSafeText(action.Label)
		if label == "" {
			label = formatPanelLabel(id)
		}
		seen[id] = true
		out = append(out, normalizeWorkflowAction(PanelUIAction{
			ID:              id,
			Label:           label,
			SubmitLabel:     trimSafeText(action.SubmitLabel),
			Kind:            normalizeID(action.Kind),
			ConfirmText:     trimSafeText(action.ConfirmText),
			RequiresConfirm: action.RequiresConfirm,
			Hidden:          action.Hidden,
			Refresh:         action.Refresh,
			UpdatePolicy:    normalizeEventPolicyMode(action.UpdatePolicy),
			Payload:         cloneJSONSafeMap(action.Payload),
			Fields:          normalizePanelUIActionFields(action.Fields),
			Form:            normalizePanelUIActionForm(action.Form),
			Availability:    availability,
			Reason:          action.Reason,
			Requires:        action.Requires,
			Drawer:          action.Drawer,
			Secondary:       action.Secondary,
			Confirmation:    action.Confirmation,
			RequestScope:    action.RequestScope,
		}))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// normalizeWorkflowAction normalizes the additive workflow metadata of one
// declaration and fails closed: an unavailable declaration keeps only its
// identity, label, drawer and reason, and requirements include every client
// capability its behavior implies. Legacy fields are left as they are, so it
// is safe to apply to request-scoped filter output.
func normalizeWorkflowAction(action PanelUIAction) PanelUIAction {
	action.Drawer = normalizePanelUIActionDrawer(action.Drawer)
	if availability := normalizeAvailability(action.Availability); availability != PanelActionAvailable {
		out := PanelUIAction{
			ID: action.ID, Label: action.Label, SubmitLabel: action.SubmitLabel, Kind: action.Kind, Hidden: action.Hidden,
			Drawer: action.Drawer, Availability: availability, Reason: trimSafeText(action.Reason),
		}
		if out.Reason == "" {
			out.Reason = defaultAvailabilityReason(availability)
		}
		out.Requires = normalizeCapabilities(append(append([]string{}, action.Requires...), implicitActionRequirements(out)...))
		return out
	}
	action.Availability, action.Reason = "", ""
	action.Fields = normalizeWorkflowFields(action.Fields)
	action.Secondary = normalizePanelUIActionSubmit(action.Secondary, action.Fields)
	action.Confirmation = normalizePanelUIActionConfirmation(action.Confirmation)
	action.RequestScope = normalizeRequestScope(action.RequestScope)
	action.Requires = normalizeCapabilities(append(append([]string{}, action.Requires...), implicitActionRequirements(action)...))
	return action
}

// normalizeWorkflowFields normalizes generated, bounded and paginated field
// metadata on a copy of the fields.
func normalizeWorkflowFields(fields []PanelUIActionField) []PanelUIActionField {
	if len(fields) == 0 {
		return fields
	}
	out := make([]PanelUIActionField, len(fields))
	for index, field := range fields {
		field.Kind = normalizeID(field.Kind)
		field.Min, field.Max = normalizeFieldBounds(field.Min, field.Max)
		if field.OptionSource != nil {
			source := *field.OptionSource
			source.Searchable = source.Paginated && source.Searchable
			field.OptionSource = &source
		}
		if normalizeID(field.Generate) == PanelFieldGenerateRequestID {
			// The client owns generated values per request draft; a definition
			// can never supply, share or replay one.
			field.Generate, field.Default, field.Required, field.Sensitive = PanelFieldGenerateRequestID, nil, true, false
		} else {
			field.Generate = ""
		}
		out[index] = field
	}
	return out
}

// normalizeWorkflowUI applies workflow normalization to request-scoped filter
// output, whose legacy fields are trusted server code.
func normalizeWorkflowUI(ui *PanelUI) *PanelUI {
	if ui == nil || ui.SchemaVersion != PanelUISchemaVersion && ui.SchemaVersion != "" {
		return ui
	}
	out := *ui
	out.Views.Console = normalizeWorkflowView(ui.Views.Console)
	out.Views.Toolbar = normalizeWorkflowView(ui.Views.Toolbar)
	if len(ui.Actions) > 0 {
		out.Actions = make([]PanelUIAction, 0, len(ui.Actions))
		for _, action := range ui.Actions {
			out.Actions = append(out.Actions, normalizeWorkflowAction(action))
		}
	}
	return &out
}

func normalizeWorkflowView(view *PanelUIView) *PanelUIView {
	if view == nil {
		return nil
	}
	out := *view
	out.Description, out.Empty = trimSafeText(view.Description), trimSafeText(view.Empty)
	out.Link = normalizePanelUILink(view.Link)
	out.Actions = NormalizePanelActionRefs(view.Actions)
	if len(view.Sections) > 0 {
		out.Sections = make([]PanelUIView, 0, len(view.Sections))
		for index := range view.Sections {
			out.Sections = append(out.Sections, *normalizeWorkflowView(&view.Sections[index]))
		}
	}
	return &out
}

func normalizePanelUIActionForm(input *PanelUIActionForm) *PanelUIActionForm {
	if input == nil {
		return nil
	}
	renderer := normalizeID(input.Renderer)
	operationID := strings.TrimSpace(input.OperationID)
	if renderer == "" || operationID == "" {
		return nil
	}
	return &PanelUIActionForm{
		Renderer:     renderer,
		OperationID:  operationID,
		HTML:         input.HTML,
		ModelVersion: trimSafeText(input.ModelVersion),
		Sensitive:    input.Sensitive,
	}
}

func normalizePanelUIActionFields(fields []PanelUIActionField) []PanelUIActionField {
	if len(fields) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]PanelUIActionField, 0, len(fields))
	for _, field := range fields {
		name := normalizeID(field.Name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		label := trimSafeText(field.Label)
		if label == "" {
			label = formatPanelLabel(name)
		}
		options := make([]string, 0, len(field.Options))
		for _, option := range field.Options {
			option = trimSafeText(option)
			if option != "" {
				options = append(options, option)
			}
		}
		normalized := PanelUIActionField{
			Name:         name,
			Label:        label,
			Kind:         normalizeID(field.Kind),
			PayloadPath:  trimSafeText(field.PayloadPath),
			Placeholder:  trimSafeText(field.Placeholder),
			Description:  trimSafeText(field.Description),
			Help:         trimSafeText(field.Help),
			Required:     field.Required,
			Sensitive:    field.Sensitive,
			Options:      options,
			OptionItems:  normalizePanelUIActionOptions(field.OptionItems),
			OptionSource: normalizePanelUIActionOptionSource(field.OptionSource),
			DisplayHints: cloneJSONSafeMap(field.DisplayHints),
			Advanced:     field.Advanced,
		}
		normalized.Min, normalized.Max = field.Min, field.Max
		normalized.Generate = field.Generate
		if defaultValue, ok := cloneJSONSafeValue(field.Default); ok && !field.Sensitive {
			if text, isText := defaultValue.(string); isText && text == "" {
				out = append(out, normalized)
				continue
			}
			normalized.Default = defaultValue
		}
		out = append(out, normalized)
	}
	return out
}

func normalizeFieldBounds(minimum, maximum *float64) (*float64, *float64) {
	finite := func(value *float64) *float64 {
		if value == nil || math.IsNaN(*value) || math.IsInf(*value, 0) {
			return nil
		}
		copied := *value
		return &copied
	}
	minimum, maximum = finite(minimum), finite(maximum)
	if minimum != nil && maximum != nil && *minimum > *maximum {
		return nil, nil
	}
	return minimum, maximum
}

func normalizePanelUIActionOptions(options []PanelUIActionOption) []PanelUIActionOption {
	if len(options) == 0 {
		return nil
	}
	out := make([]PanelUIActionOption, 0, len(options))
	seen := map[string]bool{}
	for _, option := range options {
		value := trimSafeText(option.Value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		label := trimSafeText(option.Label)
		if label == "" {
			label = value
		}
		out = append(out, PanelUIActionOption{
			Value:       value,
			Label:       label,
			Description: trimSafeText(option.Description),
			Disabled:    option.Disabled,
			Metadata:    cloneJSONSafeMap(option.Metadata),
		})
	}
	return out
}

func normalizePanelUIActionOptionSource(source *PanelUIActionOptionSource) *PanelUIActionOptionSource {
	if source == nil {
		return nil
	}
	id := normalizeID(source.ID)
	if id == "" {
		return nil
	}
	return &PanelUIActionOptionSource{
		ID:         id,
		Label:      trimSafeText(source.Label),
		Dynamic:    source.Dynamic,
		CacheScope: normalizeID(source.CacheScope),
		Params:     cloneJSONSafeMap(source.Params),
		Paginated:  source.Paginated,
		Searchable: source.Paginated && source.Searchable,
	}
}

// PanelDefinitionHasAction reports whether a request-scoped panel definition
// exposes an executable action. Unavailable declarations are display metadata
// and never count as exposed.
func PanelDefinitionHasAction(def PanelDefinition, actionID string) bool {
	action, ok := PanelDefinitionAction(def, actionID)
	return ok && action.Executable()
}

// PanelDefinitionAction returns the declaration for an action ID, whether or
// not it is executable.
func PanelDefinitionAction(def PanelDefinition, actionID string) (PanelUIAction, bool) {
	actionID = normalizeID(actionID)
	if actionID == "" || def.UI == nil || len(def.UI.Actions) == 0 {
		return PanelUIAction{}, false
	}
	for _, action := range def.UI.Actions {
		if normalizeID(action.ID) == actionID {
			return action, true
		}
	}
	return PanelUIAction{}, false
}

func normalizeActionHandlers(handlers map[string]PanelActionHandler) map[string]PanelActionHandler {
	if len(handlers) == 0 {
		return nil
	}
	out := map[string]PanelActionHandler{}
	for id, handler := range handlers {
		id = normalizeID(id)
		if id == "" || handler == nil {
			continue
		}
		out[id] = handler
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func panelActionHandlerFor(handlers map[string]PanelActionHandler, actionID string) PanelActionHandler {
	if len(handlers) == 0 {
		return nil
	}
	actionID = normalizeID(actionID)
	if actionID == "" {
		return nil
	}
	if handler := handlers[actionID]; handler != nil {
		return handler
	}
	for id, handler := range handlers {
		if normalizeID(id) == actionID {
			return handler
		}
	}
	return nil
}

func normalizeRenderer(value string) string {
	switch normalizeID(value) {
	case PanelRendererMetrics:
		return PanelRendererMetrics
	case PanelRendererKeyValue:
		return PanelRendererKeyValue
	case PanelRendererIdentity:
		return PanelRendererIdentity
	case PanelRendererTable:
		return PanelRendererTable
	case PanelRendererStatusList:
		return PanelRendererStatusList
	case PanelRendererTimeline:
		return PanelRendererTimeline
	case PanelRendererJSON:
		return PanelRendererJSON
	case PanelRendererStack:
		return PanelRendererStack
	case PanelRendererCards:
		return PanelRendererCards
	case PanelRendererList:
		return PanelRendererList
	default:
		return ""
	}
}

func normalizeCountMode(value string) string {
	switch normalizeID(value) {
	case PanelCountArrayLength:
		return PanelCountArrayLength
	case PanelCountObjectKeys:
		return PanelCountObjectKeys
	case PanelCountTruthy:
		return PanelCountTruthy
	case PanelCountNumber:
		return PanelCountNumber
	case PanelCountMatchingRows:
		return PanelCountMatchingRows
	case PanelCountNone:
		return PanelCountNone
	default:
		return ""
	}
}

func normalizeFilterKind(value string) string {
	switch normalizeID(value) {
	case PanelFilterSearch:
		return PanelFilterSearch
	case PanelFilterSelect:
		return PanelFilterSelect
	case PanelFilterCheckbox:
		return PanelFilterCheckbox
	default:
		return ""
	}
}

func normalizeEventPolicyMode(value string) string {
	switch normalizeID(value) {
	case PanelEventReplace:
		return PanelEventReplace
	case PanelEventAppend:
		return PanelEventAppend
	case PanelEventMerge:
		return PanelEventMerge
	case PanelEventUpsert:
		return PanelEventUpsert
	default:
		return ""
	}
}

func normalizeBind(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.ContainsAny(value, "<>") {
		return ""
	}
	return strings.TrimPrefix(value, "$.")
}

func trimSafeText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, "<>") {
		return ""
	}
	return value
}

func cloneJSONSafeMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range input {
		key = trimSafeText(key)
		if key == "" {
			continue
		}
		if cloned, ok := cloneJSONSafeValue(value); ok {
			out[key] = cloned
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneJSONSafeValue(value any) (any, bool) {
	switch typed := value.(type) {
	case nil, bool, float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, string:
		if text, ok := typed.(string); ok {
			return trimSafeText(text), true
		}
		return typed, true
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			if cloned, ok := cloneJSONSafeValue(item); ok {
				out = append(out, cloned)
			}
		}
		return out, true
	case []string:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			if cloned, ok := cloneJSONSafeValue(item); ok {
				out = append(out, cloned)
			}
		}
		return out, true
	case []map[string]any:
		// Declarative option lists (table columns, key/value fields, metric
		// tiles, identity chips) are naturally written as []map[string]any in
		// Go. Without this case they fall through to the default and the whole
		// option is dropped, silently degrading a panel to derived labels.
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			cloned := cloneJSONSafeMap(item)
			if cloned != nil {
				out = append(out, cloned)
			}
		}
		return out, true
	case map[string]any:
		return cloneJSONSafeMap(typed), true
	default:
		return nil, false
	}
}
