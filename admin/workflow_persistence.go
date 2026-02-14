package admin

import (
	"errors"
	"strconv"
	"strings"
	"time"
)

// PersistedWorkflowStatus controls rollout state for stored workflow definitions.
type PersistedWorkflowStatus string

const (
	WorkflowStatusDraft      PersistedWorkflowStatus = "draft"
	WorkflowStatusActive     PersistedWorkflowStatus = "active"
	WorkflowStatusDeprecated PersistedWorkflowStatus = "deprecated"
)

// WorkflowBindingScopeType identifies where a binding applies.
type WorkflowBindingScopeType string

const (
	WorkflowBindingScopeTrait       WorkflowBindingScopeType = "trait"
	WorkflowBindingScopeContentType WorkflowBindingScopeType = "content_type"
	WorkflowBindingScopeGlobal      WorkflowBindingScopeType = "global"
)

// WorkflowBindingStatus controls whether a binding participates in resolution.
type WorkflowBindingStatus string

const (
	WorkflowBindingStatusActive   WorkflowBindingStatus = "active"
	WorkflowBindingStatusInactive WorkflowBindingStatus = "inactive"
)

const (
	workflowResolutionSourceBindingContentType = "binding_content_type"
	workflowResolutionSourceBindingTrait       = "binding_trait"
	workflowResolutionSourceBindingGlobal      = "binding_global"
)

var (
	ErrWorkflowVersionConflict         = errors.New("workflow version conflict")
	ErrWorkflowBindingConflict         = errors.New("workflow binding conflict")
	ErrWorkflowBindingVersionConflict  = errors.New("workflow binding version conflict")
	ErrWorkflowRollbackVersionNotFound = errors.New("workflow rollback version not found")
)

// PersistedWorkflow stores a workflow definition with lifecycle metadata.
type PersistedWorkflow struct {
	ID          string                  `json:"id"`
	Name        string                  `json:"name"`
	Definition  WorkflowDefinition      `json:"definition"`
	Status      PersistedWorkflowStatus `json:"status"`
	Version     int                     `json:"version"`
	Environment string                  `json:"environment,omitempty"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// PersistedWorkflowListOptions filters workflow list queries.
type PersistedWorkflowListOptions struct {
	Status      PersistedWorkflowStatus
	Environment string
}

// WorkflowBinding stores a scoped workflow assignment.
type WorkflowBinding struct {
	ID          string                   `json:"id"`
	ScopeType   WorkflowBindingScopeType `json:"scope_type"`
	ScopeRef    string                   `json:"scope_ref"`
	WorkflowID  string                   `json:"workflow_id"`
	Priority    int                      `json:"priority"`
	Status      WorkflowBindingStatus    `json:"status"`
	Environment string                   `json:"environment,omitempty"`
	Version     int                      `json:"version"`
	CreatedAt   time.Time                `json:"created_at"`
	UpdatedAt   time.Time                `json:"updated_at"`
}

// WorkflowBindingListOptions filters binding list queries.
type WorkflowBindingListOptions struct {
	ScopeType   WorkflowBindingScopeType
	ScopeRef    string
	Environment string
	Status      WorkflowBindingStatus
}

// WorkflowBindingResolveInput captures scope details used for runtime resolution.
type WorkflowBindingResolveInput struct {
	ContentType string
	Traits      []string
	Environment string
}

// WorkflowBindingResolution describes the resolved binding winner.
type WorkflowBindingResolution struct {
	WorkflowID  string                   `json:"workflow_id"`
	Source      string                   `json:"source"`
	BindingID   string                   `json:"binding_id,omitempty"`
	ScopeType   WorkflowBindingScopeType `json:"scope_type,omitempty"`
	ScopeRef    string                   `json:"scope_ref,omitempty"`
	Priority    int                      `json:"priority,omitempty"`
	Environment string                   `json:"environment,omitempty"`
}

// WorkflowVersionConflictError indicates optimistic-lock mismatch for workflows.
type WorkflowVersionConflictError struct {
	WorkflowID      string
	ExpectedVersion int
	ActualVersion   int
}

func (e WorkflowVersionConflictError) Error() string {
	return "workflow version conflict for id=" + strings.TrimSpace(e.WorkflowID) +
		" expected=" + strconv.Itoa(e.ExpectedVersion) +
		" actual=" + strconv.Itoa(e.ActualVersion)
}

func (e WorkflowVersionConflictError) Unwrap() error {
	return ErrWorkflowVersionConflict
}

// WorkflowBindingConflictError indicates duplicate active binding scope+priority+environment.
type WorkflowBindingConflictError struct {
	BindingID         string
	ExistingBindingID string
	ScopeType         WorkflowBindingScopeType
	ScopeRef          string
	Environment       string
	Priority          int
}

func (e WorkflowBindingConflictError) Error() string {
	return "workflow binding conflict for scope=" + string(e.ScopeType) +
		" ref=" + strings.TrimSpace(e.ScopeRef) +
		" env=" + strings.TrimSpace(e.Environment) +
		" priority=" + strconv.Itoa(e.Priority)
}

func (e WorkflowBindingConflictError) Unwrap() error {
	return ErrWorkflowBindingConflict
}

// WorkflowBindingVersionConflictError indicates optimistic-lock mismatch for bindings.
type WorkflowBindingVersionConflictError struct {
	BindingID       string
	ExpectedVersion int
	ActualVersion   int
}

func (e WorkflowBindingVersionConflictError) Error() string {
	return "workflow binding version conflict for id=" + strings.TrimSpace(e.BindingID) +
		" expected=" + strconv.Itoa(e.ExpectedVersion) +
		" actual=" + strconv.Itoa(e.ActualVersion)
}

func (e WorkflowBindingVersionConflictError) Unwrap() error {
	return ErrWorkflowBindingVersionConflict
}

// WorkflowValidationErrors aggregates field-level workflow API validation issues.
type WorkflowValidationErrors struct {
	Fields map[string]string `json:"fields"`
}

func (e WorkflowValidationErrors) Error() string {
	return "workflow validation failed"
}

func (e WorkflowValidationErrors) hasErrors() bool {
	return len(e.Fields) > 0
}

func (s PersistedWorkflowStatus) IsValid() bool {
	switch s {
	case WorkflowStatusDraft, WorkflowStatusActive, WorkflowStatusDeprecated:
		return true
	default:
		return false
	}
}

func (s WorkflowBindingScopeType) IsValid() bool {
	switch s {
	case WorkflowBindingScopeTrait, WorkflowBindingScopeContentType, WorkflowBindingScopeGlobal:
		return true
	default:
		return false
	}
}

func (s WorkflowBindingStatus) IsValid() bool {
	switch s {
	case WorkflowBindingStatusActive, WorkflowBindingStatusInactive:
		return true
	default:
		return false
	}
}
