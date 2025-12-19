package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/pkg/formgencomponents/timezones"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

func ListTimezones(c router.Context) error {
	if err := guardTimezones(c); err != nil {
		return err
	}

	query := strings.TrimSpace(c.Query("q", ""))
	limit := parseOptionalInt(strings.TrimSpace(c.Query("limit", "")))

	zones, err := timezones.DefaultZones()
	if err != nil {
		return err
	}

	opts := timezones.NewOptions()
	results := timezones.SearchOptions(zones, query, limit, opts)
	if results == nil {
		results = []timezones.Option{}
	}

	return c.JSON(http.StatusOK, map[string]any{"data": results})
}

func guardTimezones(c router.Context) error {
	if c == nil {
		return goerrors.New("missing context", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	claims, ok := authlib.GetClaims(c.Context())
	if !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	if authlib.Can(c.Context(), "admin.users", "read") {
		return nil
	}

	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func parseOptionalInt(raw string) int {
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return value
}
