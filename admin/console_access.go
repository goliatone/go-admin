package admin

import (
	"context"
	"encoding/json"

	"github.com/goliatone/go-admin/console"
)

// ConsoleAccess resolves current identity/grants on every operation and idle
// delivery tick. Resolve must consult current trusted session/account state;
// returning the original request's claims without revalidation is insufficient.
// Resolve must derive its returned context from the supplied context to retain
// request cancellation, snapshot deadlines and host shutdown.
type ConsoleAccess struct {
	Resolve func(context.Context, console.Identity) (context.Context, console.Identity, error)
	Read    func(context.Context, console.Identity) error
	Panel   func(context.Context, console.Identity, console.PanelDefinition) bool
	Action  func(context.Context, console.Identity, string, string) bool
	Record  func(context.Context, console.Identity, string, console.Record) bool
	// DeliverRecord optionally replaces Record at the final delivery boundary.
	// It checks current policy and may redact Data, without loading source data
	// or running the potentially slow Project callback again. A false result
	// hides the record; an error fails delivery instead of masquerading as denial.
	DeliverRecord func(context.Context, console.Identity, string, console.Record) (console.Record, bool, error)
	// Project prepares detached presentation data before final authorization.
	Project func(context.Context, console.Identity, string, console.Record) console.Record
}

func (h *ConsoleHost) current(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
	if !h.acceptsIdentity(identity) {
		return ctx, identity, ErrForbidden
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if ctx.Err() != nil {
		return ctx, identity, ctx.Err()
	}
	resolvedCtx, resolved, err := h.config.Access.Resolve(ctx, identity)
	if ctx.Err() != nil {
		return ctx, identity, ctx.Err()
	}
	if err != nil {
		return ctx, identity, err
	}
	if resolvedCtx != nil && resolvedCtx.Err() != nil {
		return ctx, identity, resolvedCtx.Err()
	}
	if !consoleResolvedIdentityValid(ctx, resolvedCtx, identity, resolved) {
		return ctx, identity, ErrForbidden
	}
	if err := h.config.Access.Read(resolvedCtx, resolved); err != nil {
		if resolvedCtx.Err() != nil {
			return ctx, identity, resolvedCtx.Err()
		}
		return ctx, identity, err
	}
	if ctx.Err() != nil {
		return ctx, identity, ctx.Err()
	}
	if resolvedCtx.Err() != nil {
		return ctx, identity, resolvedCtx.Err()
	}
	if h.closed() {
		return ctx, identity, ErrForbidden
	}
	return resolvedCtx, resolved, nil
}

func (h *ConsoleHost) acceptsIdentity(identity console.Identity) bool {
	return h != nil && !h.closed() && identity.Valid() && identity.ConsoleID == h.config.ID && h.config.Enabled != nil && h.config.Enabled()
}

func consoleResolvedIdentityValid(ctx, resolvedCtx context.Context, identity, resolved console.Identity) bool {
	return resolvedCtx != nil && ctx.Err() == nil && resolvedCtx.Err() == nil && resolved == identity && resolved.Valid()
}

func (h *ConsoleHost) panel(ctx context.Context, identity console.Identity, panelID string) (console.PanelDefinition, bool) {
	def, ok := h.config.Registry.DefinitionForContext(ctx, panelID)
	if !ok || !h.config.Access.Panel(ctx, identity, def) {
		return console.PanelDefinition{}, false
	}
	if def.UI != nil {
		caps := console.ClientCapabilitiesFromContext(ctx)
		ui := *def.UI
		ui.Actions = nil
		for _, action := range def.UI.Actions {
			if projected, keep := h.projectAction(ctx, identity, def.ID, action, caps); keep {
				ui.Actions = append(ui.Actions, projected)
			}
		}
		def.UI = &ui
	}
	return def, true
}

// consoleClientOutdatedMessage is shown wherever a declaration needs client
// behavior the current page assets do not implement.
const consoleClientOutdatedMessage = "This console was updated. Reload the page to use this action."

// projectAction applies current execute policy and the client handshake to
// one declaration. Executable declarations need the actor's execute grant.
// Unavailable declarations are display metadata: panel read access suffices,
// but only clients that render them disabled receive them. Legacy clients
// never receive capability-dependent work; advertised clients missing a
// capability receive a disabled declaration with reload guidance.
func (h *ConsoleHost) projectAction(ctx context.Context, identity console.Identity, panelID string, action console.PanelUIAction, caps console.ClientCapabilities) (console.PanelUIAction, bool) {
	if action.Hidden {
		return action, false
	}
	rendersUnavailable := caps.Mode == console.ClientCapabilitiesPage || caps.Has(console.ClientCapabilityActionAvailability)
	if !action.Executable() {
		return action, rendersUnavailable
	}
	if h.config.Access.Action == nil || !h.config.Access.Action(ctx, identity, panelID, action.ID) {
		return action, false
	}
	if len(action.Requires) == 0 || caps.Mode == console.ClientCapabilitiesPage || caps.Covers(action.Requires) {
		return action, true
	}
	if !rendersUnavailable {
		return action, false
	}
	return console.PanelUIAction{
		ID: action.ID, Label: action.Label, Kind: action.Kind,
		Availability: console.PanelActionUnavailable, Reason: consoleClientOutdatedMessage,
		Requires: []string{console.ClientCapabilityActionAvailability},
	}, true
}

// requiresNewerClient reports whether a refused action is executable for the
// actor but needs client capabilities this request did not advertise.
func (h *ConsoleHost) requiresNewerClient(ctx context.Context, identity console.Identity, panelID, actionID string) bool {
	def, ok := h.config.Registry.DefinitionForContext(ctx, panelID)
	if !ok {
		return false
	}
	action, declared := console.PanelDefinitionAction(def, actionID)
	if !declared || action.Hidden || !action.Executable() || len(action.Requires) == 0 {
		return false
	}
	if h.config.Access.Action == nil || !h.config.Access.Action(ctx, identity, def.ID, action.ID) {
		return false
	}
	return !console.ClientCapabilitiesFromContext(ctx).Covers(action.Requires)
}

func consoleRecordValid(record console.Record) bool {
	return record.Key != "" && record.Revision != 0 && record.Revision <= console.MaxWireCounter && record.Generation <= console.MaxWireCounter
}

func (h *ConsoleHost) prepareRecord(ctx context.Context, identity console.Identity, panelID string, record console.Record) (console.Record, bool) {
	if !consoleRecordValid(record) || h.config.Access.DeliverRecord == nil && !h.config.Access.Record(ctx, identity, panelID, record) {
		return console.Record{}, false
	}
	// Detach provider payloads before a masking callback or consumer receives them.
	encoded, err := json.Marshal(record.Data)
	if err != nil {
		return console.Record{}, false
	}
	if err := json.Unmarshal(encoded, &record.Data); err != nil {
		return console.Record{}, false
	}
	if h.config.Access.Project != nil {
		projected := h.config.Access.Project(ctx, identity, panelID, record)
		// A masking projector may change only Data, never ordering/record identity.
		record.Data = projected.Data
	}
	return record, true
}

func (h *ConsoleHost) deliverRecord(ctx context.Context, identity console.Identity, panelID string, record console.Record) (console.Record, bool, error) {
	if ctx.Err() != nil {
		return console.Record{}, false, ctx.Err()
	}
	if !consoleRecordValid(record) {
		return console.Record{}, false, nil
	}
	if deliver := h.config.Access.DeliverRecord; deliver != nil {
		projected, allowed, err := deliver(ctx, identity, panelID, record)
		// Delivery redaction cannot replace ordering/record identity either.
		record.Data = projected.Data
		return record, allowed, err
	}
	return record, h.config.Access.Record(ctx, identity, panelID, record), nil
}

// Single-record delivery uses the same preparation/final authorization phases
// as snapshots. No slow masking callback runs after the final record check.
func (h *ConsoleHost) projectRecord(ctx context.Context, identity console.Identity, panelID string, record console.Record) (console.Record, bool, error) {
	record, valid := h.prepareRecord(ctx, identity, panelID, record)
	if !valid {
		return console.Record{}, false, nil
	}
	ctx, _, err := h.current(ctx, identity)
	if err != nil {
		return console.Record{}, false, err
	}
	if _, allowed := h.panel(ctx, identity, panelID); !allowed {
		return console.Record{}, false, nil
	}
	record, allowed, err := h.deliverRecord(ctx, identity, panelID, record)
	if err != nil {
		return console.Record{}, false, err
	}
	if _, _, err = h.current(ctx, identity); err != nil {
		return console.Record{}, false, err
	}
	return record, allowed, nil
}
