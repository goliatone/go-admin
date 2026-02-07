package admin

import (
	"net/http"

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
