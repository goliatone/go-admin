package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
	router "github.com/goliatone/go-router"
)

func bindPayloadOrError(c router.Context, payload any, status int, code string, message string) error {
	if err := c.Bind(payload); err != nil {
		return writeAPIError(c, err, status, code, message, nil)
	}
	return nil
}

func requireNonEmptyOrError(c router.Context, value string, message string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed != "" {
		return trimmed, nil
	}
	return "", writeAPIError(
		c,
		nil,
		http.StatusBadRequest,
		string(services.ErrorCodeMissingRequiredFields),
		message,
		nil,
	)
}
