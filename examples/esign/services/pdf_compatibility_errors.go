package services

import (
	"net/http"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

func pdfUnsupportedError(operation, tier, reason string, metadata map[string]any) error {
	details := map[string]any{
		"operation": strings.TrimSpace(operation),
		"tier":      strings.TrimSpace(tier),
		"reason":    strings.TrimSpace(reason),
	}
	for key, value := range metadata {
		details[strings.TrimSpace(key)] = value
	}
	return goerrors.New("pdf compatibility unsupported", goerrors.CategoryValidation).
		WithCode(http.StatusUnprocessableEntity).
		WithTextCode(string(ErrorCodePDFUnsupported)).
		WithMetadata(details)
}
