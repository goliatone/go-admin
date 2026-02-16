package services

import (
	"errors"
	"net/http"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type serviceAPIError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Details   map[string]any `json:"details,omitempty"`
	RequestID string         `json:"request_id,omitempty"`
	Retryable bool           `json:"retryable"`
}

func writeServiceError(c router.Context, err error) error {
	status, payload := mapServiceErrorPayload(err)
	if requestID := strings.TrimSpace(c.Header("X-Request-ID")); requestID != "" {
		if envelope, ok := payload["error"].(serviceAPIError); ok {
			envelope.RequestID = requestID
			payload["error"] = envelope
		}
	}
	return c.JSON(status, payload)
}

func mapServiceErrorPayload(err error) (int, map[string]any) {
	status, code, message, details, retryable := classifyServiceError(err)
	return status, map[string]any{
		"error": serviceAPIError{
			Code:      code,
			Message:   message,
			Details:   details,
			Retryable: retryable,
		},
	}
}

func classifyServiceError(err error) (int, string, string, map[string]any, bool) {
	if err == nil {
		return http.StatusInternalServerError, "internal_error", "An unexpected error occurred", nil, false
	}
	mapped := goerrors.MapToError(err, goerrors.DefaultErrorMappers())
	if mapped == nil {
		return http.StatusInternalServerError, "internal_error", strings.TrimSpace(err.Error()), nil, true
	}
	message := strings.TrimSpace(mapped.Message)
	if message == "" {
		message = "An unexpected error occurred"
	}
	details := copyAnyMap(mapped.Metadata)
	textCode := strings.ToLower(strings.TrimSpace(mapped.TextCode))

	switch mapped.Category {
	case goerrors.CategoryBadInput, goerrors.CategoryValidation:
		return http.StatusBadRequest, "validation_error", message, details, false
	case goerrors.CategoryAuth:
		return http.StatusUnauthorized, "unauthorized", message, details, false
	case goerrors.CategoryAuthz:
		if _, ok := details["missing_grants"]; ok {
			return http.StatusForbidden, "missing_permissions", message, details, false
		}
		if strings.Contains(textCode, "permission") {
			return http.StatusForbidden, "missing_permissions", message, details, false
		}
		return http.StatusForbidden, "forbidden", message, details, false
	case goerrors.CategoryNotFound:
		return http.StatusNotFound, "not_found", message, details, false
	case goerrors.CategoryConflict:
		return http.StatusConflict, "conflict", message, details, false
	case goerrors.CategoryRateLimit:
		return http.StatusTooManyRequests, "rate_limited", message, details, true
	case goerrors.CategoryOperation:
		if mapped.Code == http.StatusServiceUnavailable || strings.Contains(textCode, "provider") {
			return http.StatusServiceUnavailable, "provider_unavailable", message, details, true
		}
		return http.StatusConflict, "conflict", message, details, false
	default:
		if mapped.Code == http.StatusServiceUnavailable || strings.Contains(textCode, "provider_unavailable") {
			return http.StatusServiceUnavailable, "provider_unavailable", message, details, true
		}
		status := mapped.Code
		if status < 400 {
			status = http.StatusInternalServerError
		}
		code := "internal_error"
		retryable := status >= 500
		return status, code, message, details, retryable
	}
}

func validationError(message string, details map[string]any) error {
	err := goerrors.New(strings.TrimSpace(message), goerrors.CategoryValidation).WithCode(http.StatusBadRequest)
	if len(details) > 0 {
		err = err.WithMetadata(copyAnyMap(details))
	}
	return err
}

func conflictError(message string, details map[string]any) error {
	err := goerrors.New(strings.TrimSpace(message), goerrors.CategoryConflict).WithCode(http.StatusConflict)
	if len(details) > 0 {
		err = err.WithMetadata(copyAnyMap(details))
	}
	return err
}

func forbiddenError(permission string) error {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		permission = "admin.services.view"
	}
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithMetadata(map[string]any{"permission": permission})
}

func missingPermissionsError(message string, details map[string]any) error {
	err := goerrors.New(strings.TrimSpace(message), goerrors.CategoryAuthz).WithCode(http.StatusForbidden)
	if len(details) > 0 {
		err = err.WithMetadata(copyAnyMap(details))
	}
	return err
}

func missingResourceError(name string, details map[string]any) error {
	err := goerrors.New(strings.TrimSpace(name)+" not found", goerrors.CategoryNotFound).WithCode(http.StatusNotFound)
	if len(details) > 0 {
		err = err.WithMetadata(copyAnyMap(details))
	}
	return err
}

func providerUnavailableError(message string, details map[string]any) error {
	err := goerrors.New(strings.TrimSpace(message), goerrors.CategoryOperation).WithCode(http.StatusServiceUnavailable)
	if len(details) > 0 {
		err = err.WithMetadata(copyAnyMap(details))
	}
	return err
}

func goerrorsUnauthorized(cause error) error {
	err := goerrors.New("unauthorized", goerrors.CategoryAuth).WithCode(http.StatusUnauthorized)
	if cause != nil {
		err = err.WithMetadata(map[string]any{"cause": strings.TrimSpace(cause.Error())})
	}
	return err
}

func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	var rich *goerrors.Error
	if !errors.As(err, &rich) {
		return false
	}
	return rich.Category == goerrors.CategoryNotFound || rich.Code == http.StatusNotFound
}
