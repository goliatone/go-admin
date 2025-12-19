package helpers

// DataGridColumn describes allowlisted column metadata for resource lists.
// It is used by templates and API endpoints to keep column schemas consistent.
type DataGridColumn struct {
	Field      string `json:"field"`
	Label      string `json:"label"`
	Sortable   bool   `json:"sortable,omitempty"`
	Filterable bool   `json:"filterable,omitempty"`
	Default    bool   `json:"default"`
}
