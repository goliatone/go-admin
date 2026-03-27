package main

import (
	"errors"
	"testing"

	"github.com/gofiber/fiber/v2"
	goerrors "github.com/goliatone/go-errors"
)

func TestTriggerTestErrorPanicReturnsInternalError(t *testing.T) {
	err := triggerTestError("panic")
	if err == nil {
		t.Fatal("expected panic test route to return an error")
	}

	var appErr *goerrors.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("expected go-errors.Error, got %T", err)
	}
	if appErr.Code != fiber.StatusInternalServerError {
		t.Fatalf("expected internal server error code, got %d", appErr.Code)
	}
	if appErr.TextCode != "INTENTIONAL_PANIC_TEST_ERROR" {
		t.Fatalf("expected panic-equivalent text code, got %q", appErr.TextCode)
	}
	if got := appErr.Metadata["test_type"]; got != "panic" {
		t.Fatalf("expected panic test metadata, got %#v", got)
	}
}
