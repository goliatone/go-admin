package admin

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	goerrors "github.com/goliatone/go-errors"
)

func TestWithStackPreservesExistingStackCarriers(t *testing.T) {
	base := errors.New("database failed")
	first := WithStack(base)
	wrapped := fmt.Errorf("route boundary: %w", first)
	second := WithStack(wrapped)

	if second == nil {
		t.Fatal("expected wrapped error")
	}
	if wrapped != second {
		t.Fatalf("expected wrapper with existing stack carrier to be returned unchanged")
	}
	if !errors.Is(second, base) {
		t.Fatalf("expected errors.Is to reach base error")
	}
}

func TestWithStackPreservesGoErrorsStackTrace(t *testing.T) {
	ge := goerrors.New("missing", goerrors.CategoryNotFound).WithCode(http.StatusNotFound).WithStackTrace()
	wrapped := fmt.Errorf("route boundary: %w", ge)

	got := WithStack(wrapped)
	if got != wrapped {
		t.Fatalf("expected wrapped go-errors stack to be preserved")
	}
	if stack := stackFromError(got); len(stack) != len(ge.StackTrace) {
		t.Fatalf("expected original go-errors stack, got %d frames want %d", len(stack), len(ge.StackTrace))
	}
}

func TestWrappedControlFlowErrorsKeepStatusMapping(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{name: "not found", err: ErrNotFound, wantStatus: http.StatusNotFound},
		{name: "forbidden", err: ErrForbidden, wantStatus: http.StatusForbidden},
		{name: "fiber", err: fiber.NewError(http.StatusBadRequest, "bad request"), wantStatus: http.StatusBadRequest},
	}

	presenter := NewErrorPresenter(ErrorConfig{DevMode: true})
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			wrapped := WithStack(fmt.Errorf("route boundary: %w", tc.err))
			mapped, status := presenter.Present(wrapped)
			if status != tc.wantStatus {
				t.Fatalf("status = %d, want %d", status, tc.wantStatus)
			}
			if mapped == nil || mapped.Code != tc.wantStatus {
				t.Fatalf("mapped code = %#v, want %d", mapped, tc.wantStatus)
			}
			if !errors.Is(wrapped, tc.err) && tc.name != "fiber" {
				t.Fatalf("expected errors.Is to reach %v", tc.err)
			}
			var fiberErr *fiber.Error
			if tc.name == "fiber" && !errors.As(wrapped, &fiberErr) {
				t.Fatalf("expected errors.As to reach fiber error")
			}
		})
	}
}
