package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/goliatone/go-admin/console"
	router "github.com/goliatone/go-router"
)

// request resolves the trusted identity and attaches the client handshake from
// the X-Console-Capabilities header (absent means a legacy client).
func (h *ConsoleHost) request(c router.Context) (context.Context, console.Identity, error) {
	if c == nil {
		return context.Background(), console.Identity{}, ErrForbidden
	}
	identity, err := h.config.RequestIdentity(c)
	if err != nil {
		if c.Context().Err() != nil {
			return c.Context(), identity, c.Context().Err()
		}
		return c.Context(), identity, err
	}
	ctx := console.WithClientCapabilities(c.Context(), console.ParseClientCapabilities(c.Header(console.ClientCapabilitiesHeader)))
	return h.current(ctx, identity)
}

func (h *ConsoleHost) handlePage(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	// The page bootstrap carries declarations for the shipped client, which
	// gates them itself; dispatch still requires its advertised handshake.
	ctx = console.WithClientCapabilities(ctx, console.PageClientCapabilities())
	snapshot, err := h.Snapshot(ctx, identity)
	if err != nil {
		return writeConsoleError(c, err)
	}
	return h.config.RenderPage(c, console.Bootstrap{Identity: identity, Title: h.config.Title, URLs: h.routes, PreferencesNamespace: h.preferenceKey(identity), Snapshot: snapshot})
}

func (h *ConsoleHost) handlePanels(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	definitions := []console.PanelDefinition{}
	for _, def := range h.config.Registry.DefinitionsWithContext(ctx) {
		if projected, ok := h.panel(ctx, identity, def.ID); ok {
			definitions = append(definitions, projected)
		}
	}
	return writeJSON(c, struct {
		Panels  []console.PanelDefinition `json:"panels"`
		Version string                    `json:"version,omitempty"`
	}{definitions, h.config.Registry.Version()})
}

func (h *ConsoleHost) handleSnapshot(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	snapshot, err := h.Snapshot(ctx, identity)
	if err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, snapshot)
}

func (h *ConsoleHost) handleLookup(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	record, err := h.Lookup(ctx, identity, c.Param("panel", ""), c.Param("record", ""))
	if err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, record)
}

func (h *ConsoleHost) handleAction(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	if len(c.Body()) > 1<<20 {
		return writeError(c, validationDomainError("console action payload exceeds limit", nil))
	}
	payload := map[string]any{}
	if len(c.Body()) > 0 {
		if decodeErr := json.Unmarshal(c.Body(), &payload); decodeErr != nil {
			return writeError(c, validationDomainError("invalid console action JSON", nil))
		}
	}
	result, err := h.RunAction(ctx, identity, console.PanelActionRequest{PanelID: c.Param("panel", ""), ActionID: c.Param("action", ""), Payload: payload})
	if err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, result)
}

func (h *ConsoleHost) handleOptions(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	page, err := h.Options(ctx, identity, console.PanelOptionQuery{
		PanelID: c.Param("panel", ""), ActionID: c.Param("action", ""), Field: c.Param("field", ""),
		Cursor: c.Query("cursor"), Search: c.Query("q"), Limit: c.QueryInt("limit", 0), Values: c.QueryValues("value"),
	})
	if err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, page)
}

func (h *ConsoleHost) handleRequestStatus(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	query := console.PanelRequestQuery{PanelID: c.Param("panel", ""), RequestID: c.Param("request", ""), ActionID: c.Query("action"), Scope: c.Query("scope")}
	if submitted, parseErr := time.Parse(time.RFC3339, c.Query("submitted_at")); parseErr == nil && !submitted.After(time.Now().Add(5*time.Minute)) {
		query.SubmittedAt = submitted.UTC()
	}
	status, err := h.RequestStatus(ctx, identity, query)
	if err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, status)
}

func (h *ConsoleHost) preferenceKey(identity console.Identity) string {
	return h.config.PreferencesNamespace + ":" + identity.Namespace()
}

func (h *ConsoleHost) normalizeOrder(ctx context.Context, identity console.Identity, order []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, panel := range order {
		def, ok := h.panel(ctx, identity, panel)
		if ok && !seen[def.ID] {
			result = append(result, def.ID)
			seen[def.ID] = true
		}
	}
	return result
}

func (h *ConsoleHost) handlePreferences(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	order := []string{}
	if h.config.LoadPreferences != nil {
		order, err = h.config.LoadPreferences(ctx, h.preferenceKey(identity))
		if err != nil {
			return writeConsoleError(c, err)
		}
	}
	return writeJSON(c, map[string]any{"available": h.config.LoadPreferences != nil, "panel_order": h.normalizeOrder(ctx, identity, order)})
}

func (h *ConsoleHost) handlePreferencesSave(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	if h.config.SavePreferences == nil {
		return writeError(c, ErrNotFound)
	}
	if len(c.Body()) > 64<<10 {
		return writeError(c, validationDomainError("console preferences exceed limit", nil))
	}
	var input struct {
		PanelOrder []string `json:"panel_order"`
	}
	if err := json.Unmarshal(c.Body(), &input); err != nil {
		return writeError(c, validationDomainError("invalid console preferences", nil))
	}
	order := h.normalizeOrder(ctx, identity, input.PanelOrder)
	if err := h.config.SavePreferences(ctx, h.preferenceKey(identity), order); err != nil {
		return writeConsoleError(c, err)
	}
	return writeJSON(c, map[string]any{"available": true, "panel_order": order})
}

const consoleUpgradeIdentity = "console_identity"
const consoleUpgradeContext = "console_context"

func (h *ConsoleHost) registerLive(rt AdminRouter, auth router.MiddlewareFunc) {
	ws, ok := rt.(debugWebSocketRouter)
	if !ok {
		return
	}
	config := router.DefaultWebSocketConfig()
	config.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		if auth == nil {
			return nil, ErrForbidden
		}
		authorized := false
		if err := auth(func(router.Context) error { authorized = true; return nil })(c); err != nil {
			return nil, err
		}
		if !authorized {
			return nil, ErrForbidden
		}
		ctx, identity, err := h.request(c)
		if err != nil {
			return nil, err
		}
		// Browsers cannot set socket headers; the handshake rides the URL.
		ctx = console.WithClientCapabilities(ctx, console.ParseClientCapabilities(c.Query(console.ClientCapabilitiesQuery)))
		return router.UpgradeData{consoleUpgradeIdentity: identity, consoleUpgradeContext: ctx}, nil
	}
	ws.WebSocket(h.routes.Live, config, func(c router.WebSocketContext) error {
		defer closeDebugWebSocket(c)
		stopClose := context.AfterFunc(h.ctx, func() { closeDebugWebSocket(c) })
		defer stopClose()
		identityValue, _ := c.UpgradeData(consoleUpgradeIdentity)
		identity, ok := identityValue.(console.Identity)
		if !ok {
			return ErrForbidden
		}
		contextValue, _ := c.UpgradeData(consoleUpgradeContext)
		ctx, ok := contextValue.(context.Context)
		if !ok {
			return ErrForbidden
		}
		// No panel subscriptions by default. Query values select registered panel
		// IDs only; authorization still runs for each delivered record.
		panels := strings.Split(c.Query("panels"), ",")
		ctx, cancel := context.WithCancel(context.WithoutCancel(ctx))
		defer cancel()
		stop := context.AfterFunc(c.Context(), cancel)
		defer stop()
		err := h.Watch(ctx, identity, panels, func(value any) error {
			if err := c.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
				return err
			}
			return c.WriteJSON(value)
		})
		if errors.Is(err, ErrForbidden) {
			err = preserveDebugWebSocketPrimaryError(err, c.CloseWithStatus(1008, "console access changed"))
		}
		return err
	})
}

// Watch is the shared page/dashboard delivery adapter. Subscription precedes
// loading the snapshot; newer events are buffered. Every reconnect loads a fresh
// authorized snapshot, so no client cursor can replay retained foreign records.
func (h *ConsoleHost) Watch(ctx context.Context, identity console.Identity, panels []string, send func(any) error) error {
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return err
	}
	if send == nil {
		return ErrForbidden
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	stop := context.AfterFunc(h.ctx, cancel)
	defer stop()
	events, unsubscribe, err := h.config.Events.Subscribe(identity, 64)
	if err != nil {
		return err
	}
	defer unsubscribe()
	delivery := consoleWatchDelivery{host: h, ctx: ctx, identity: identity, requested: map[string]bool{}, send: send}
	for _, panel := range panels {
		if reg, ok := h.config.Registry.Registration(panel); ok {
			delivery.requested[reg.Definition.ID] = true
		}
	}
	if err := delivery.recoverSnapshot(false); err != nil {
		return err
	}
	return delivery.run(events)
}

type consoleWatchDelivery struct {
	host      *ConsoleHost
	ctx       context.Context
	identity  console.Identity
	requested map[string]bool
	selected  map[string]bool
	watermark uint64
	send      func(any) error
}

func (d *consoleWatchDelivery) recoverSnapshot(invalidate bool) error {
	snapshot, err := d.host.Snapshot(d.ctx, d.identity)
	if err != nil {
		return err
	}
	// Requested intent survives temporary denial. Effective selection is always
	// rebuilt from the same authorized snapshot that refreshes the client.
	d.selected = map[string]bool{}
	for _, panel := range snapshot.Panels {
		if d.requested[panel.ID] {
			d.selected[panel.ID] = true
		}
	}
	if invalidate {
		if err := d.send(console.Event{Identity: d.identity, Kind: console.EventInvalidate, Sequence: snapshot.Watermark}); err != nil {
			return err
		}
	}
	if err := d.send(snapshot); err != nil {
		return err
	}
	d.watermark = snapshot.Watermark
	return nil
}

func (d *consoleWatchDelivery) run(events <-chan console.Event) error {
	ticker := time.NewTicker(d.host.config.RevalidateInterval)
	defer ticker.Stop()
	for {
		select {
		case <-d.ctx.Done():
			return nil
		case <-d.host.config.Invalidated:
			// A closed signal is terminal: never spin on a closed channel.
			return ErrForbidden
		case <-ticker.C:
			// Refresh authorization for cached records as well as future events.
			// This bounds record-level idle revocation even without an invalidation hook.
			if err := d.recoverSnapshot(true); err != nil {
				return err
			}
		case event, ok := <-events:
			if !ok {
				return console.ErrClosed
			}
			if err := d.deliverEvent(event); err != nil {
				return err
			}
		}
	}
}

func (d *consoleWatchDelivery) deliverEvent(event console.Event) error {
	if event.Sequence <= d.watermark {
		return nil
	}
	if event.Kind == console.EventInvalidate || event.Sequence != d.watermark+1 {
		return d.recoverSnapshot(true)
	}
	d.watermark = event.Sequence
	currentCtx, _, err := d.host.current(d.ctx, d.identity)
	if err != nil {
		return err
	}
	if !d.selected[event.PanelID] || event.Identity != d.identity {
		return nil
	}
	if _, ok := d.host.panel(currentCtx, d.identity, event.PanelID); !ok {
		delete(d.selected, event.PanelID)
		return d.recoverSnapshot(true)
	}
	record, allowed, err := d.host.projectRecord(currentCtx, d.identity, event.PanelID, event.Record)
	if err != nil {
		return err
	}
	if !allowed {
		return d.recoverSnapshot(true)
	}
	event.Record = record
	return d.send(event)
}
