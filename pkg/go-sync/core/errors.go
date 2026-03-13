package core

import (
	"errors"
	"fmt"
)

// ErrorCode is the stable text code exposed across transports.
type ErrorCode string

const (
	CodeNotFound             ErrorCode = "NOT_FOUND"
	CodeStaleRevision        ErrorCode = "STALE_REVISION"
	CodeIdempotencyReplay    ErrorCode = "IDEMPOTENCY_REPLAY"
	CodeInvalidMutation      ErrorCode = "INVALID_MUTATION"
	CodeTransportUnavailable ErrorCode = "TRANSPORT_UNAVAILABLE"
	CodeRateLimited          ErrorCode = "RATE_LIMITED"
	CodeTemporaryFailure     ErrorCode = "TEMPORARY_FAILURE"
)

const (
	DetailCurrentRevision = "current_revision"
	DetailLatestSnapshot  = "latest_snapshot"
	DetailIdempotencyKey  = "idempotency_key"
)

// SyncError is the canonical domain error shape used before transport mapping.
type SyncError struct {
	Code    ErrorCode      `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
	Err     error          `json:"-"`
}

func (e *SyncError) Error() string {
	if e == nil {
		return ""
	}
	if e.Message != "" {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}
	return string(e.Code)
}

// Unwrap returns the wrapped lower-level error when present.
func (e *SyncError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

// NewError builds a canonical sync error with stable code + message.
func NewError(code ErrorCode, message string, details map[string]any) *SyncError {
	return &SyncError{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// NewWrappedError builds a canonical sync error that retains the original cause.
func NewWrappedError(code ErrorCode, message string, details map[string]any, err error) *SyncError {
	return &SyncError{
		Code:    code,
		Message: message,
		Details: details,
		Err:     err,
	}
}

// ErrorCodeOf extracts the canonical sync error code when available.
func ErrorCodeOf(err error) (ErrorCode, bool) {
	if err == nil {
		return "", false
	}
	var syncErr *SyncError
	if !errors.As(err, &syncErr) || syncErr == nil {
		return "", false
	}
	return syncErr.Code, syncErr.Code != ""
}

// HasCode reports whether err is a canonical sync error with the provided code.
func HasCode(err error, code ErrorCode) bool {
	current, ok := ErrorCodeOf(err)
	return ok && current == code
}

// NewStaleRevisionError builds the canonical stale-revision error shape.
func NewStaleRevisionError(currentRevision int64, latest *Snapshot) *SyncError {
	details := map[string]any{
		DetailCurrentRevision: currentRevision,
	}
	if latest != nil {
		details[DetailLatestSnapshot] = *latest
	}
	return NewError(CodeStaleRevision, "resource has a newer revision", details)
}

// StaleRevisionDetails extracts stale-revision details from canonical sync errors.
func StaleRevisionDetails(err error) (int64, *Snapshot, bool) {
	var syncErr *SyncError
	if !errors.As(err, &syncErr) || syncErr == nil || syncErr.Code != CodeStaleRevision {
		return 0, nil, false
	}

	var latest *Snapshot
	if syncErr.Details != nil {
		switch value := syncErr.Details[DetailLatestSnapshot].(type) {
		case Snapshot:
			copied := value
			latest = &copied
		case *Snapshot:
			if value != nil {
				copied := *value
				latest = &copied
			}
		}
	}

	currentRevision, ok := int64Detail(syncErr.Details, DetailCurrentRevision)
	if !ok && latest != nil {
		currentRevision = latest.Revision
		ok = true
	}
	return currentRevision, latest, ok
}

func int64Detail(details map[string]any, key string) (int64, bool) {
	if details == nil {
		return 0, false
	}
	switch value := details[key].(type) {
	case int:
		return int64(value), true
	case int32:
		return int64(value), true
	case int64:
		return value, true
	case float64:
		return int64(value), true
	default:
		return 0, false
	}
}
