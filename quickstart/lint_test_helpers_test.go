package quickstart

import (
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

// errorDetail returns internal diagnostics for assertions without weakening the
// public Error() contract, which intentionally exposes only safe messages.
func errorDetail(err error) string {
	if err == nil {
		return ""
	}

	var details []string
	pending := []error{err}
	for len(pending) > 0 && len(details) < 100 {
		current := pending[0]
		pending = pending[1:]
		if current == nil {
			continue
		}
		//nolint:errorlint // Test diagnostics inspect each exact node before unwrapping it.
		if structured, ok := current.(*goerrors.Error); ok {
			details = append(details, structured.Message)
			for _, validation := range structured.ValidationErrors {
				details = append(details, validation.Message)
			}
		} else {
			details = append(details, current.Error())
		}
		//nolint:errorlint // Exact unwrap shape is required to traverse joined error trees.
		switch wrapped := current.(type) {
		case interface{ Unwrap() []error }:
			pending = append(pending, wrapped.Unwrap()...)
		case interface{ Unwrap() error }:
			pending = append(pending, wrapped.Unwrap())
		}
	}
	return strings.Join(details, ": ")
}
