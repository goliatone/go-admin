package admin

import workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"

// WorkflowDefinition describes a state machine for a specific entity type.
type WorkflowDefinition = workflowcore.WorkflowDefinition

// PersistedWorkflowStatus controls rollout state for stored workflow definitions.
type PersistedWorkflowStatus = workflowcore.PersistedWorkflowStatus

const (
	WorkflowStatusDraft      = workflowcore.WorkflowStatusDraft
	WorkflowStatusActive     = workflowcore.WorkflowStatusActive
	WorkflowStatusDeprecated = workflowcore.WorkflowStatusDeprecated
)

// WorkflowBindingScopeType identifies where a binding applies.
type WorkflowBindingScopeType = workflowcore.WorkflowBindingScopeType

const (
	WorkflowBindingScopeTrait       = workflowcore.WorkflowBindingScopeTrait
	WorkflowBindingScopeContentType = workflowcore.WorkflowBindingScopeContentType
	WorkflowBindingScopeGlobal      = workflowcore.WorkflowBindingScopeGlobal
)

// WorkflowBindingStatus controls whether a binding participates in resolution.
type WorkflowBindingStatus = workflowcore.WorkflowBindingStatus

const (
	WorkflowBindingStatusActive   = workflowcore.WorkflowBindingStatusActive
	WorkflowBindingStatusInactive = workflowcore.WorkflowBindingStatusInactive
)

type PersistedWorkflow = workflowcore.PersistedWorkflow
type PersistedWorkflowListOptions = workflowcore.PersistedWorkflowListOptions
type WorkflowBinding = workflowcore.WorkflowBinding
type WorkflowBindingListOptions = workflowcore.WorkflowBindingListOptions
type WorkflowBindingResolveInput = workflowcore.WorkflowBindingResolveInput
type WorkflowBindingResolution = workflowcore.WorkflowBindingResolution
type WorkflowVersionConflictError = workflowcore.WorkflowVersionConflictError
type WorkflowBindingConflictError = workflowcore.WorkflowBindingConflictError
type WorkflowBindingVersionConflictError = workflowcore.WorkflowBindingVersionConflictError
type WorkflowValidationErrors = workflowcore.WorkflowValidationErrors

var (
	ErrWorkflowVersionConflict         = workflowcore.ErrWorkflowVersionConflict
	ErrWorkflowBindingConflict         = workflowcore.ErrWorkflowBindingConflict
	ErrWorkflowBindingVersionConflict  = workflowcore.ErrWorkflowBindingVersionConflict
	ErrWorkflowRollbackVersionNotFound = workflowcore.ErrWorkflowRollbackVersionNotFound
)
