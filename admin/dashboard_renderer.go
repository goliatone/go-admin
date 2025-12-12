package admin

import "io"

// DashboardRenderer defines the interface for rendering dashboards as HTML.
// Implementations can use any template engine or rendering approach.
type DashboardRenderer interface {
	// Render matches the go-dashboard Renderer contract and returns the rendered HTML.
	Render(name string, data any, out ...io.Writer) (string, error)
}

// DashboardLayout represents the complete dashboard state ready for rendering.
// It contains all areas, widgets, theme configuration, and metadata needed
// to produce a complete HTML page or fragment.
type DashboardLayout struct {
	// Areas contains all widget areas (main, sidebar, footer, etc.)
	Areas []*WidgetArea `json:"areas"`

	// Theme contains resolved theme configuration with tokens and assets
	Theme *ThemeSelection `json:"theme,omitempty"`

	// Metadata contains additional context for rendering
	Metadata map[string]any `json:"metadata,omitempty"`

	// BasePath is the admin base path for constructing URLs
	BasePath string `json:"base_path"`
}

// WidgetArea represents a named area containing widgets (e.g., "admin.dashboard.main")
type WidgetArea struct {
	// Code is the unique identifier for this area (e.g., "admin.dashboard.main")
	Code string `json:"code"`

	// Title is the display name for this area
	Title string `json:"title"`

	// Widgets contains all resolved widgets in this area
	Widgets []*ResolvedWidget `json:"widgets"`
}

// ResolvedWidget represents a widget instance with rendered content.
// This is the fully-prepared widget ready for HTML output.
type ResolvedWidget struct {
	// ID is the unique identifier for this widget instance
	ID string `json:"id"`

	// Definition is the widget type (e.g., "admin.widget.user_stats")
	Definition string `json:"definition"`

	// Area is the area code this widget belongs to
	Area string `json:"area"`

	// Data contains the widget's rendered data
	Data map[string]any `json:"data"`

	// Config contains widget configuration
	Config map[string]any `json:"config,omitempty"`

	// Metadata contains layout and state information
	Metadata *WidgetMetadata `json:"metadata,omitempty"`

	// Hidden indicates if the widget is hidden by user preference
	Hidden bool `json:"hidden,omitempty"`

	// Span defines the column span (1-12) for grid layout
	Span int `json:"span,omitempty"`
}

// WidgetMetadata contains layout and state information for a widget
type WidgetMetadata struct {
	// Layout contains positioning information
	Layout *WidgetLayout `json:"layout,omitempty"`

	// Order is the display order within the area
	Order int `json:"order,omitempty"`
}

// WidgetLayout contains grid positioning information
type WidgetLayout struct {
	// Width is the column span (1-12)
	Width int `json:"width,omitempty"`

	// Height is reserved for future row spanning
	Height int `json:"height,omitempty"`
}
