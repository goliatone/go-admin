package graphql

// Content represents a generic CMS delivery object.
type Content struct {
	ID     string         `json:"id"`
	Type   string         `json:"type"`
	Slug   string         `json:"slug"`
	Locale string         `json:"locale"`
	Status string         `json:"status"`
	Data   map[string]any `json:"data"`
}

// Page represents a localized CMS page delivery object.
type Page struct {
	ID     string         `json:"id"`
	Title  string         `json:"title"`
	Slug   string         `json:"slug"`
	Locale string         `json:"locale"`
	Status string         `json:"status"`
	Data   map[string]any `json:"data"`
}

// MenuItem represents a navigation node in delivery responses.
type MenuItem struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Label    string         `json:"label"`
	URL      string         `json:"url"`
	Target   map[string]any `json:"target"`
	Children []MenuItem     `json:"children,omitempty"`
}

// Menu represents a navigation tree for delivery APIs.
type Menu struct {
	ID       string     `json:"id"`
	Code     string     `json:"code"`
	Location string     `json:"location"`
	Items    []MenuItem `json:"items"`
}

// ContentType represents a CMS content type definition.
type ContentType struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Slug         string         `json:"slug"`
	Description  string         `json:"description"`
	Schema       map[string]any `json:"schema"`
	Capabilities map[string]any `json:"capabilities"`
	Icon         string         `json:"icon"`
	CreatedAt    string         `json:"created_at"`
	UpdatedAt    string         `json:"updated_at"`
}
