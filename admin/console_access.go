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
		return ctx, identity, ErrForbidden
	}
	resolvedCtx, resolved, err := h.config.Access.Resolve(ctx, identity)
	if err != nil || !consoleResolvedIdentityValid(ctx, resolvedCtx, identity, resolved) {
		return ctx, identity, ErrForbidden
	}
	if err := h.config.Access.Read(resolvedCtx, resolved); err != nil {
		return ctx, identity, ErrForbidden
	}
	if h.closed() || ctx.Err() != nil || resolvedCtx.Err() != nil {
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
		ui := *def.UI
		ui.Actions = nil
		for _, action := range def.UI.Actions {
			if !action.Hidden && h.config.Access.Action != nil && h.config.Access.Action(ctx, identity, def.ID, action.ID) {
				ui.Actions = append(ui.Actions, action)
			}
		}
		def.UI = &ui
	}
	return def, true
}

func (h *ConsoleHost) projectRecord(ctx context.Context, identity console.Identity, panelID string, record console.Record) (console.Record, bool) {
	if record.Key == "" || record.Revision == 0 || record.Revision > console.MaxWireCounter || record.Generation > console.MaxWireCounter || !h.config.Access.Record(ctx, identity, panelID, record) {
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
