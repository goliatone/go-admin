package admin

// ActionState is the canonical server-authored availability payload for an
// action in a specific record or list context.
type ActionState struct {
	Enabled              bool               `json:"enabled"`
	ReasonCode           string             `json:"reason_code,omitempty"`
	Reason               string             `json:"reason,omitempty"`
	Severity             string             `json:"severity,omitempty"`
	Kind                 string             `json:"kind,omitempty"`
	Permission           string             `json:"permission,omitempty"`
	Metadata             map[string]any     `json:"metadata,omitempty"`
	Remediation          *ActionRemediation `json:"remediation,omitempty"`
	AvailableTransitions []string           `json:"available_transitions,omitempty"`
}

// ActionRemediation describes an optional next step for a blocked action.
type ActionRemediation struct {
	Label string `json:"label,omitempty"`
	Href  string `json:"href,omitempty"`
	Kind  string `json:"kind,omitempty"`
}

// BulkActionStateConfig advertises bulk action availability capabilities to
// shared clients.
type BulkActionStateConfig struct {
	SelectionSensitive     bool   `json:"selection_sensitive,omitempty"`
	SelectionStateEndpoint string `json:"selection_state_endpoint,omitempty"`
	DebounceMS             int    `json:"debounce_ms,omitempty"`
}

// ActionGuardContext contains the inputs used to evaluate action availability
// for a single action against a single record.
type ActionGuardContext struct {
	AdminContext AdminContext
	Panel        *Panel
	Action       Action
	Record       map[string]any
	Scope        ActionScope
}

// ActionGuard evaluates action availability for a single record context.
type ActionGuard func(ActionGuardContext) ActionState

// BatchActionStateResolver evaluates action availability for a record batch.
// The first key in the result map is the canonical record ID, the second key
// is the action name.
type BatchActionStateResolver func(
	ctx AdminContext,
	records []map[string]any,
	actions []Action,
	scope ActionScope,
) (map[string]map[string]ActionState, error)

// BulkActionStateResolver evaluates availability for list-level bulk actions.
type BulkActionStateResolver func(
	ctx AdminContext,
	actions []Action,
	listOpts ListOptions,
) (map[string]ActionState, error)
