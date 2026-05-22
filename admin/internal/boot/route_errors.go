package boot

import (
	stderrors "errors"
	"fmt"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

type routeStackCarrier interface {
	StackTrace() goerrors.StackTrace
}

type routeStackError struct {
	err   error
	stack goerrors.StackTrace
}

func (e *routeStackError) Error() string {
	return e.err.Error()
}

func (e *routeStackError) Unwrap() error {
	return e.err
}

func (e *routeStackError) StackTrace() goerrors.StackTrace {
	return e.stack
}

func panelRouteError(panelName, operation string, attrs map[string]string, err error) error {
	if err == nil {
		return nil
	}
	message := "panel route"
	if panelName = strings.TrimSpace(panelName); panelName != "" {
		message += " panel " + panelName
	}
	if operation = strings.TrimSpace(operation); operation != "" {
		message += " " + operation
	}
	for _, key := range []string{"id", "action", "bulk_action", "subresource", "value"} {
		value := strings.TrimSpace(attrs[key])
		if value != "" {
			message += " " + key + " " + value
		}
	}
	return withRouteStack(fmt.Errorf("%s: %w", message, err))
}

func withRouteStack(err error) error {
	if err == nil {
		return nil
	}
	var carrier routeStackCarrier
	if stderrors.As(err, &carrier) && len(carrier.StackTrace()) > 0 {
		return err
	}
	var ge *goerrors.Error
	if stderrors.As(err, &ge) && ge != nil && len(ge.StackTrace) > 0 {
		return err
	}
	return &routeStackError{
		err:   err,
		stack: goerrors.CaptureStackTrace(1),
	}
}
