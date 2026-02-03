package admin

import (
	"context"
	"sync"
	"time"
)

// SimpleWorkflowEngine provides a basic implementation of WorkflowEngine.
type SimpleWorkflowEngine struct {
	definitions map[string]WorkflowDefinition
	mu          sync.RWMutex
}

// NewSimpleWorkflowEngine creates a new simple workflow engine.
func NewSimpleWorkflowEngine() *SimpleWorkflowEngine {
	return &SimpleWorkflowEngine{
		definitions: make(map[string]WorkflowDefinition),
	}
}

// RegisterWorkflow installs or replaces a workflow definition for an entity type.
func (e *SimpleWorkflowEngine) RegisterWorkflow(entityType string, definition WorkflowDefinition) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.definitions[entityType] = definition
}

// HasWorkflow reports whether a workflow definition exists for an entity type.
func (e *SimpleWorkflowEngine) HasWorkflow(entityType string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	_, ok := e.definitions[entityType]
	return ok
}

// Transition applies a transition to an entity.
func (e *SimpleWorkflowEngine) Transition(ctx context.Context, input TransitionInput) (*TransitionResult, error) {
	e.mu.RLock()
	def, ok := e.definitions[input.EntityType]
	e.mu.RUnlock()

	if !ok {
		return nil, WithStack(ErrWorkflowNotFound)
	}

	for _, t := range def.Transitions {
		if t.From == input.CurrentState && t.Name == input.Transition {
			return &TransitionResult{
				EntityID:    input.EntityID,
				EntityType:  input.EntityType,
				Transition:  input.Transition,
				FromState:   input.CurrentState,
				ToState:     t.To,
				CompletedAt: time.Now(),
				ActorID:     input.ActorID,
				Metadata:    input.Metadata,
			}, nil
		}
	}

	return nil, WithStack(ErrWorkflowInvalidTransition)
}

// AvailableTransitions lists the possible transitions from a given state.
func (e *SimpleWorkflowEngine) AvailableTransitions(ctx context.Context, entityType, state string) ([]WorkflowTransition, error) {
	e.mu.RLock()
	def, ok := e.definitions[entityType]
	e.mu.RUnlock()

	if !ok {
		return nil, nil
	}

	out := []WorkflowTransition{}
	for _, t := range def.Transitions {
		if t.From == state {
			out = append(out, t)
		}
	}
	return out, nil
}

// WorkflowDefinition describes a state machine for a specific entity type.
type WorkflowDefinition struct {
	EntityType   string
	InitialState string
	Transitions  []WorkflowTransition
}
