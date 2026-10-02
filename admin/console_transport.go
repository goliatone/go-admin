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

func (h *ConsoleHost) request(c router.Context) (context.Context, console.Identity, error) {
	if c == nil {
		return context.Background(), console.Identity{}, ErrForbidden
	}
	identity, err := h.config.RequestIdentity(c)
	if err != nil {
		return c.Context(), identity, ErrForbidden
	}
	return h.current(c.Context(), identity)
}

func (h *ConsoleHost) handlePage(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeError(c, err)
	}
	snapshot, err := h.Snapshot(ctx, identity)
	if err != nil {
		return writeError(c, err)
	}
	return h.config.RenderPage(c, console.Bootstrap{Identity: identity, Title: h.config.Title, URLs: h.routes, PreferencesNamespace: h.preferenceKey(identity), Snapshot: snapshot})
}

func (h *ConsoleHost) handlePanels(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeError(c, err)
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
		return writeError(c, err)
	}
	snapshot, err := h.Snapshot(ctx, identity)
	if err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, snapshot)
}

func (h *ConsoleHost) handleLookup(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeError(c, err)
	}
	record, err := h.Lookup(ctx, identity, c.Param("panel", ""), c.Param("record", ""))
	if err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, record)
}

func (h *ConsoleHost) handleAction(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeError(c, err)
	}
	if len(c.Body()) > 1<<20 {
		return writeError(c, validationDomainError("console action payload exceeds limit", nil))
	}
	payload := map[string]any{}
	if len(c.Body()) > 0 {
		if err := json.Unmarshal(c.Body(), &payload); err != nil {
			return writeError(c, validationDomainError("invalid console action JSON", nil))
		}
	}
	result, err := h.RunAction(ctx, identity, console.PanelActionRequest{PanelID: c.Param("panel", ""), ActionID: c.Param("action", ""), Payload: payload})
	if err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, result)
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
		return writeError(c, err)
	}
	order := []string{}
	if h.config.LoadPreferences != nil {
		order, err = h.config.LoadPreferences(ctx, h.preferenceKey(identity))
		if err != nil {
			return writeError(c, err)
		}
	}
	return writeJSON(c, map[string]any{"available": h.config.LoadPreferences != nil, "panel_order": h.normalizeOrder(ctx, identity, order)})
}

func (h *ConsoleHost) handlePreferencesSave(c router.Context) error {
	ctx, identity, err := h.request(c)
	if err != nil {
		return writeError(c, err)
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
		return writeError(c, err)
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
			_ = c.CloseWithStatus(1008, "console access changed")
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
	selected := map[string]bool{}
	for _, panel := range panels {
		if def, ok := h.panel(ctx, identity, panel); ok {
			selected[def.ID] = true
		}
	}
	var watermark uint64
	recoverSnapshot := func(invalidate bool) error {
		snapshot, err := h.Snapshot(ctx, identity)
		if err != nil {
			return err
		}
		if invalidate {
			if err := send(console.Event{Identity: identity, Kind: console.EventInvalidate, Sequence: snapshot.Watermark}); err != nil {
				return err
			}
		}
		if err := send(snapshot); err != nil {
			return err
		}
		watermark = snapshot.Watermark
		return nil
	}
	if err := recoverSnapshot(false); err != nil {
		return err
	}
	ticker := time.NewTicker(h.config.RevalidateInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-h.config.Invalidated:
			// A closed signal is terminal: never spin on a closed channel.
			return ErrForbidden
		case <-ticker.C:
			// Refresh authorization for cached records as well as future events.
			// This bounds record-level idle revocation even without an invalidation hook.
			if err := recoverSnapshot(true); err != nil {
				return err
			}
		case event, ok := <-events:
			if !ok {
				return console.ErrClosed
			}
			if event.Sequence <= watermark {
				continue
			}
			if event.Kind == console.EventInvalidate || event.Sequence != watermark+1 {
				if err := recoverSnapshot(true); err != nil {
					return err
				}
				continue
			}
			watermark = event.Sequence
			currentCtx, _, err := h.current(ctx, identity)
			if err != nil {
				return err
			}
			if !selected[event.PanelID] || event.Identity != identity {
				continue
			}
			if _, ok := h.panel(currentCtx, identity, event.PanelID); !ok {
				delete(selected, event.PanelID)
				if err := recoverSnapshot(true); err != nil {
					return err
				}
				continue
			}
			record, allowed := h.projectRecord(currentCtx, identity, event.PanelID, event.Record)
			if !allowed {
				if err := recoverSnapshot(true); err != nil {
					return err
				}
				continue
			}
			event.Record = record
			if err := send(event); err != nil {
				return err
			}
		}
	}
}
