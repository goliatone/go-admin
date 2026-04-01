package dashboard

import (
	"context"
	"errors"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	godash "github.com/goliatone/go-dashboard/components/dashboard"
)

// StoredLayoutSlot captures a persisted widget slot.
type StoredLayoutSlot struct {
	ID    string `json:"id"`
	Width int    `json:"width"`
}

// StoredLayoutRow captures a persisted row of widget slots.
type StoredLayoutRow struct {
	Widgets []StoredLayoutSlot `json:"widgets,omitempty"`
}

// StoredLayoutOverrides is the dashboard-local persisted override contract.
type StoredLayoutOverrides struct {
	Locale        string                       `json:"locale,omitempty"`
	AreaOrder     map[string][]string          `json:"area_order,omitempty"`
	AreaRows      map[string][]StoredLayoutRow `json:"area_rows,omitempty"`
	HiddenWidgets map[string]bool              `json:"hidden_widgets,omitempty"`
}

// LayoutPreferenceBackend exposes the persistence hooks needed by the go-dashboard preference bridge.
type LayoutPreferenceBackend interface {
	LoadDashboardLayoutOverrides(ctx context.Context, userID string) StoredLayoutOverrides
	SaveDashboardLayoutOverrides(ctx context.Context, userID string, overrides StoredLayoutOverrides) error
	SaveDashboardLayout(ctx context.Context, userID string, layout []DashboardWidgetInstance) error
}

// GoDashPreferenceStore adapts persisted dashboard overrides to the go-dashboard preference store contract.
type GoDashPreferenceStore struct {
	backend                LayoutPreferenceBackend
	store                  godash.WidgetStore
	missingViewerUserIDErr func() error
}

// GoDashPreferenceStoreOption configures the dashboard-local go-dashboard preference bridge.
type GoDashPreferenceStoreOption func(*GoDashPreferenceStore)

// WithMissingViewerUserIDError preserves caller-specific missing-viewer error contracts.
func WithMissingViewerUserIDError(fn func() error) GoDashPreferenceStoreOption {
	return func(store *GoDashPreferenceStore) {
		if store == nil {
			return
		}
		store.missingViewerUserIDErr = fn
	}
}

// NewGoDashPreferenceStore builds the dashboard-local go-dashboard preference bridge.
func NewGoDashPreferenceStore(backend LayoutPreferenceBackend, store godash.WidgetStore, opts ...GoDashPreferenceStoreOption) *GoDashPreferenceStore {
	out := &GoDashPreferenceStore{backend: backend, store: store}
	for _, opt := range opts {
		if opt != nil {
			opt(out)
		}
	}
	return out
}

// LayoutOverrides returns persisted overrides for a viewer in go-dashboard format.
func (s *GoDashPreferenceStore) LayoutOverrides(ctx context.Context, viewer godash.ViewerContext) (godash.LayoutOverrides, error) {
	overrides := godash.LayoutOverrides{
		Locale:        viewer.Locale,
		AreaOrder:     map[string][]string{},
		AreaRows:      map[string][]godash.LayoutRow{},
		HiddenWidgets: map[string]bool{},
	}
	if s == nil || s.backend == nil || viewer.UserID == "" {
		return overrides, nil
	}
	stored := normalizeStoredLayoutOverrides(s.backend.LoadDashboardLayoutOverrides(ctx, viewer.UserID))
	if stored.Locale != "" {
		overrides.Locale = stored.Locale
	}
	overrides.AreaOrder = cloneStringSliceMap(stored.AreaOrder)
	overrides.AreaRows = convertStoredRowsToGoDash(stored.AreaRows)
	overrides.HiddenWidgets = cloneHiddenWidgetMap(stored.HiddenWidgets)
	return overrides, nil
}

// SaveLayoutOverrides persists go-dashboard overrides and the derived dashboard layout.
func (s *GoDashPreferenceStore) SaveLayoutOverrides(ctx context.Context, viewer godash.ViewerContext, overrides godash.LayoutOverrides) error {
	if s == nil || s.backend == nil {
		return nil
	}
	if viewer.UserID == "" {
		if s.missingViewerUserIDErr != nil {
			return s.missingViewerUserIDErr()
		}
		return errors.New("dashboard: viewer context missing user id")
	}
	if overrides.Locale == "" {
		overrides.Locale = viewer.Locale
	}
	stored := normalizeStoredLayoutOverrides(StoredLayoutOverrides{
		Locale:        overrides.Locale,
		AreaOrder:     cloneStringSliceMap(overrides.AreaOrder),
		AreaRows:      convertGoDashRowsToStored(overrides.AreaRows),
		HiddenWidgets: cloneHiddenWidgetMap(overrides.HiddenWidgets),
	})
	if err := s.backend.SaveDashboardLayoutOverrides(ctx, viewer.UserID, stored); err != nil {
		return err
	}
	layout := s.buildLayoutFromOverrides(ctx, overrides, stored)
	if len(layout) > 0 {
		if err := s.backend.SaveDashboardLayout(ctx, viewer.UserID, layout); err != nil {
			return err
		}
	}
	return nil
}

func (s *GoDashPreferenceStore) buildLayoutFromOverrides(ctx context.Context, overrides godash.LayoutOverrides, stored StoredLayoutOverrides) []DashboardWidgetInstance {
	if s == nil || s.store == nil {
		return nil
	}
	type slot struct {
		area     string
		id       string
		width    int
		position int
	}
	slots := []slot{}
	for area, rows := range overrides.AreaRows {
		for rowIdx, row := range rows {
			for colIdx, widget := range row.Widgets {
				id := strings.TrimSpace(widget.ID)
				if id == "" {
					continue
				}
				width := widget.Width
				if width <= 0 {
					width = 12
				}
				slots = append(slots, slot{
					area:     area,
					id:       id,
					width:    width,
					position: rowIdx*100 + colIdx,
				})
			}
		}
	}
	if len(slots) == 0 {
		for area, order := range overrides.AreaOrder {
			for idx, id := range order {
				id = strings.TrimSpace(id)
				if id == "" {
					continue
				}
				slots = append(slots, slot{
					area:     area,
					id:       id,
					position: idx,
				})
			}
		}
	}
	layout := []DashboardWidgetInstance{}
	for _, sl := range slots {
		inst, err := s.store.GetInstance(ctx, sl.id)
		if err != nil || inst.ID == "" {
			continue
		}
		layout = append(layout, DashboardWidgetInstance{
			ID:             inst.ID,
			DefinitionCode: inst.DefinitionID,
			AreaCode:       sl.area,
			Config:         cloneAnyMap(inst.Configuration),
			Position:       sl.position,
			Span:           sl.width,
			Hidden:         stored.HiddenWidgets[inst.ID],
			Locale:         stored.Locale,
		})
	}
	return layout
}

func normalizeStoredLayoutOverrides(overrides StoredLayoutOverrides) StoredLayoutOverrides {
	if overrides.AreaOrder == nil {
		overrides.AreaOrder = map[string][]string{}
	}
	if overrides.AreaRows == nil {
		overrides.AreaRows = map[string][]StoredLayoutRow{}
	}
	if overrides.HiddenWidgets == nil {
		overrides.HiddenWidgets = map[string]bool{}
	}
	return overrides
}

func cloneAnyMap(m map[string]any) map[string]any {
	return primitives.CloneAnyMap(m)
}

func cloneStringSliceMap(in map[string][]string) map[string][]string {
	if in == nil {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(in))
	for key, vals := range in {
		copied := make([]string, len(vals))
		copy(copied, vals)
		out[key] = copied
	}
	return out
}

func cloneHiddenWidgetMap(in map[string]bool) map[string]bool {
	if in == nil {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	for key, val := range in {
		if val {
			out[key] = true
		}
	}
	return out
}

func convertStoredRowsToGoDash(rows map[string][]StoredLayoutRow) map[string][]godash.LayoutRow {
	out := map[string][]godash.LayoutRow{}
	for area, areaRows := range rows {
		converted := []godash.LayoutRow{}
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := []godash.WidgetSlot{}
			for _, widget := range row.Widgets {
				if widget.ID == "" {
					continue
				}
				slots = append(slots, godash.WidgetSlot{
					ID:    widget.ID,
					Width: widget.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, godash.LayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			out[area] = converted
		}
	}
	return out
}

func convertGoDashRowsToStored(rows map[string][]godash.LayoutRow) map[string][]StoredLayoutRow {
	out := map[string][]StoredLayoutRow{}
	for area, areaRows := range rows {
		converted := []StoredLayoutRow{}
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := []StoredLayoutSlot{}
			for _, widget := range row.Widgets {
				if widget.ID == "" {
					continue
				}
				slots = append(slots, StoredLayoutSlot{
					ID:    widget.ID,
					Width: widget.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, StoredLayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			out[area] = converted
		}
	}
	return out
}
