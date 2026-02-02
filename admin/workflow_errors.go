package admin

import "errors"

var (
	ErrWorkflowNotFound          = errors.New("workflow not found for entity type")
	ErrWorkflowInvalidTransition = errors.New("invalid transition")
)
