package admin

import (
	stderrors "errors"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

type stackCarrier interface {
	StackTrace() goerrors.StackTrace
}

type stackError struct {
	err   error
	stack goerrors.StackTrace
}

func (e *stackError) Error() string {
	return e.err.Error()
}

func (e *stackError) Unwrap() error {
	return e.err
}

func (e *stackError) StackTrace() goerrors.StackTrace {
	return e.stack
}

// WithStack wraps an error with a captured stack trace for later mapping.
func WithStack(err error) error {
	if err == nil {
		return nil
	}
	var carrier stackCarrier
	if stderrors.As(err, &carrier) && len(carrier.StackTrace()) > 0 {
		return err
	}
	return &stackError{
		err:   err,
		stack: goerrors.CaptureStackTrace(1),
	}
}

// AttachErrorContext ensures stack trace + location are present for API responses.
func AttachErrorContext(err error, mapped *goerrors.Error) *goerrors.Error {
	if mapped == nil {
		return nil
	}

	trace := mapped.StackTrace
	if len(trace) == 0 {
		trace = stackFromError(err)
	}
	if len(trace) == 0 {
		trace = goerrors.CaptureStackTrace(1)
	}
	if len(trace) > 0 {
		mapped.StackTrace = trace
	}

	if shouldOverrideLocation(mapped.Location) {
		if loc := locationFromStack(trace); loc != nil {
			mapped.Location = loc
		}
	}

	return mapped
}

func stackFromError(err error) goerrors.StackTrace {
	if err == nil {
		return nil
	}
	var carrier stackCarrier
	if stderrors.As(err, &carrier) {
		return carrier.StackTrace()
	}
	if ge, ok := err.(*goerrors.Error); ok && len(ge.StackTrace) > 0 {
		return ge.StackTrace
	}
	return nil
}

func shouldOverrideLocation(loc *goerrors.ErrorLocation) bool {
	if loc == nil {
		return true
	}
	return isInternalLocation(loc.File, loc.Function)
}

func locationFromStack(trace goerrors.StackTrace) *goerrors.ErrorLocation {
	for _, frame := range trace {
		if isInternalLocation(frame.File, frame.Function) {
			continue
		}
		return &goerrors.ErrorLocation{
			File:     frame.File,
			Line:     frame.Line,
			Function: frame.Function,
		}
	}
	if len(trace) == 0 {
		return nil
	}
	frame := trace[0]
	return &goerrors.ErrorLocation{
		File:     frame.File,
		Line:     frame.Line,
		Function: frame.Function,
	}
}

func isInternalLocation(file, fn string) bool {
	if strings.HasPrefix(fn, "runtime.") {
		return true
	}
	if strings.Contains(fn, "github.com/goliatone/go-errors.") || strings.Contains(file, "/go-errors@") {
		return true
	}
	if hasSuffixAny(file,
		"/admin/error_context.go",
		"/admin/error_presenter.go",
		"/admin/error_mapping.go",
		"/admin/http_helpers.go",
		"/admin/placeholders.go",
		"/quickstart/error_fiber.go",
		"/examples/web/setup/auth.go",
	) {
		return true
	}
	return false
}

func hasSuffixAny(value string, suffixes ...string) bool {
	for _, suffix := range suffixes {
		if strings.HasSuffix(value, suffix) {
			return true
		}
	}
	return false
}
