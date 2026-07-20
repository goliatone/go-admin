package admin

import (
	"maps"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

// ErrorResponse is the go-admin API error envelope. ErrorPresenter mappers own
// the client-safe message and metadata contract exposed by this response.
type ErrorResponse struct {
	Error *PresentedError `json:"error"`
}

// PresentedError contains the fields go-admin deliberately exposes to API
// clients. Causes and validation values are never included.
type PresentedError struct {
	Category         goerrors.Category                `json:"category,omitempty"`
	Code             int                              `json:"code,omitempty"`
	TextCode         string                           `json:"text_code,omitempty"`
	Message          string                           `json:"message,omitempty"`
	ValidationErrors []goerrors.PublicValidationError `json:"validation_errors,omitempty"`
	Metadata         map[string]any                   `json:"metadata,omitempty"`
	RequestID        string                           `json:"request_id,omitempty"`
	Timestamp        time.Time                        `json:"timestamp"`
	Severity         goerrors.Severity                `json:"severity,omitempty"`
	Location         *goerrors.ErrorLocation          `json:"location,omitempty"`
	StackTrace       goerrors.StackTrace              `json:"stack_trace,omitempty"`
}

// ErrorResponse converts a presenter-normalized error into go-admin's API
// contract. Diagnostic source locations and stacks remain opt-in.
func (p ErrorPresenter) ErrorResponse(mapped *goerrors.Error) ErrorResponse {
	if mapped == nil {
		return ErrorResponse{}
	}

	presented := &PresentedError{
		Category:  mapped.Category,
		Code:      mapped.Code,
		TextCode:  mapped.TextCode,
		Message:   mapped.Message,
		Metadata:  maps.Clone(mapped.Metadata),
		RequestID: mapped.RequestID,
		Timestamp: mapped.Timestamp,
		Severity:  mapped.Severity,
	}
	if len(mapped.ValidationErrors) > 0 {
		presented.ValidationErrors = make([]goerrors.PublicValidationError, 0, len(mapped.ValidationErrors))
		for _, validation := range mapped.ValidationErrors {
			presented.ValidationErrors = append(presented.ValidationErrors, goerrors.PublicValidationError{
				Field:   validation.Field,
				Message: validation.Message,
			})
		}
	}
	if p.IncludeStackTrace() {
		if mapped.Location != nil {
			location := *mapped.Location
			presented.Location = &location
		}
		presented.StackTrace = append(goerrors.StackTrace(nil), mapped.StackTrace...)
	}

	return ErrorResponse{Error: presented}
}
