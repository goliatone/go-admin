package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type contentEntryBoundaryError struct {
	context string
	err     error
}

func (e *contentEntryBoundaryError) Error() string {
	return e.context + ": " + e.err.Error()
}

func (e *contentEntryBoundaryError) Unwrap() error {
	return e.err
}

func (e *contentEntryBoundaryError) RouteBoundaryContext() string {
	return e.context
}

func contentEntryRouteError(panelName, operation, id string, err error) error {
	if err == nil {
		return nil
	}
	message := "content route"
	if panelName = strings.TrimSpace(panelName); panelName != "" {
		message += " panel " + panelName
	}
	if operation = strings.TrimSpace(operation); operation != "" {
		message += " " + operation
	}
	if id = strings.TrimSpace(id); id != "" {
		message += " id " + id
	}
	return admin.WithStack(&contentEntryBoundaryError{context: message, err: err})
}
