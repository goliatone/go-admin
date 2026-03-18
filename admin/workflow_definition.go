package admin

// WorkflowDefinition describes a state machine for a specific entity type.
type WorkflowDefinition struct {
	EntityType     string               `json:"entity_type"`
	MachineVersion string               `json:"machine_version"`
	InitialState   string               `json:"initial_state"`
	Transitions    []WorkflowTransition `json:"transitions"`
}
