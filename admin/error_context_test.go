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
	if !errors.Is(wrapped, second) {
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
	if !errors.Is(got, wrapped) {
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
		wantMsg    string
	}{
		{name: "not found", err: ErrNotFound, wantStatus: http.StatusNotFound, wantMsg: ErrNotFound.Error()},
		{name: "forbidden", err: ErrForbidden, wantStatus: http.StatusForbidden, wantMsg: ErrForbidden.Error()},
		{name: "fiber", err: fiber.NewError(http.StatusBadRequest, "bad request"), wantStatus: http.StatusBadRequest, wantMsg: "bad request"},
	}

	presenter := NewErrorPresenter(ErrorConfig{DevMode: true})
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			wrapped := WithStack(&testRouteBoundaryError{context: "route boundary", err: tc.err})
			mapped, status := presenter.Present(wrapped)
			if status != tc.wantStatus {
				t.Fatalf("status = %d, want %d", status, tc.wantStatus)
			}
			if mapped == nil || mapped.Code != tc.wantStatus {
				t.Fatalf("mapped code = %#v, want %d", mapped, tc.wantStatus)
			}
			if mapped.Message != tc.wantMsg {
				t.Fatalf("mapped message = %q, want %q", mapped.Message, tc.wantMsg)
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

func TestWrappedControlFlowErrorsKeepCustomMessagesOutsideRouteBoundaries(t *testing.T) {
	err := WithStack(fmt.Errorf("custom user lookup failed: %w", ErrNotFound))

	mapped, status := NewErrorPresenter(ErrorConfig{DevMode: true}).Present(err)
	if status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
	want := "custom user lookup failed: not found"
	if mapped.Message != want {
		t.Fatalf("mapped message = %q, want %q", mapped.Message, want)
	}
}

type testRouteBoundaryError struct {
	context string
	err     error
}

func (e *testRouteBoundaryError) Error() string {
	return e.context + ": " + e.err.Error()
}

func (e *testRouteBoundaryError) Unwrap() error {
	return e.err
}

func (e *testRouteBoundaryError) RouteBoundaryContext() string {
	return e.context
}
