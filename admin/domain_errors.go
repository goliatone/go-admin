package admin

import (
	"net/http"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

func validationDomainError(message string, meta map[string]any) error {
	return NewDomainError(TextCodeValidationError, message, meta)
}

func notFoundDomainError(message string, meta map[string]any) error {
	return NewDomainError(TextCodeNotFound, message, meta)
}

func serviceUnavailableDomainError(message string, meta map[string]any) error {
	return NewDomainError(TextCodeServiceUnavailable, message, meta)
}

func pathConflictDomainError(meta map[string]any) error {
	err := goerrors.Wrap(ErrPathConflict, goerrors.CategoryConflict, ErrPathConflict.Error()).
		WithCode(http.StatusConflict).
		WithTextCode(TextCodePathConflict)
	if len(meta) > 0 {
		err.WithMetadata(meta)
	}
	return err
}

func conflictDomainError(message string, meta map[string]any) error {
	return NewDomainError(TextCodeConflict, message, withDomainErrorMeta(meta, nil))
}

func serviceNotConfiguredDomainError(dependency string, meta map[string]any) error {
	dependency = strings.TrimSpace(dependency)
	if dependency == "" {
		dependency = "service"
	}
	return serviceUnavailableDomainError(
		dependency+" not configured",
		withDomainErrorMeta(meta, map[string]any{"dependency": dependency}),
	)
}

func requiredFieldDomainError(field string, meta map[string]any) error {
	field = strings.TrimSpace(field)
	if field == "" {
		field = "field"
	}
	return validationDomainError(
		field+" required",
		withDomainErrorMeta(meta, map[string]any{"field": field}),
	)
}

func unsupportedScopeDomainError(scope string, meta map[string]any) error {
	scope = strings.TrimSpace(scope)
	if scope == "" {
		scope = "unknown"
	}
	return validationDomainError(
		"unsupported scope: "+scope,
		withDomainErrorMeta(meta, map[string]any{"scope": scope}),
	)
}

func expectedTypeDomainError(expected string, meta map[string]any) error {
	expected = strings.TrimSpace(expected)
	if expected == "" {
		expected = "value"
	}
	return validationDomainError(
		"expected "+expected,
		withDomainErrorMeta(meta, map[string]any{"expected": expected}),
	)
}

func withDomainErrorMeta(base map[string]any, extra map[string]any) map[string]any {
	if len(base) == 0 && len(extra) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range base {
		out[key] = value
	}
	for key, value := range extra {
		out[key] = value
	}
	return out
}
