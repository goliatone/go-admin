package admin

// WorkflowDefinition describes a state machine for a specific entity type.
type WorkflowDefinition struct {
	EntityType     string
	MachineVersion string
	InitialState   string
	Transitions    []WorkflowTransition
}
