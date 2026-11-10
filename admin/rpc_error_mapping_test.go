package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"

	"github.com/gofiber/fiber/v2"
	cmdrpc "github.com/goliatone/go-command/rpc"
	gerrors "github.com/goliatone/go-errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultRPCErrorMapper(t *testing.T) {
	private := map[string]any{"token": "private-sentinel", "field": "private-sentinel", "retryable": true}
	cases := []struct {
		name string
		err  error
		code string
	}{
		{"permission", PermissionDeniedError{Permission: "private-sentinel", Resource: "private-sentinel"}, cmdrpc.CodeForbidden},
		{"forbidden", ErrForbidden, cmdrpc.CodeForbidden},
		{"not-found", ErrNotFound, cmdrpc.CodeNotFound},
		{"validation", NewDomainError(TextCodeValidationError, "private-sentinel", private), cmdrpc.CodeInvalidArgument},
		{"settings", SettingsValidationErrors{Fields: map[string]string{"email": "private-sentinel"}}, cmdrpc.CodeInvalidArgument},
		{"conflict", NewDomainError(TextCodePathConflict, "private-sentinel", private), cmdrpc.CodeConflict},
		{"precondition", NewDomainError(TextCodePreconditionFailed, "private-sentinel", private), cmdrpc.CodeFailedPrecondition},
		{"unavailable", serviceUnavailableDomainError("private-sentinel", private), cmdrpc.CodeUnavailable},
		{"temporary", NewDomainError(TextCodeTemporarilyUnavailable, "private-sentinel", private), cmdrpc.CodeUnavailable},
		{"rate-limit", ErrREPLSessionLimit, cmdrpc.CodeRateLimited},
		{"routing-auth", fiber.NewError(401, "private-sentinel"), cmdrpc.CodeUnauthenticated},
		{"cancel", context.Canceled, cmdrpc.CodeCanceled},
		{"deadline", context.DeadlineExceeded, cmdrpc.CodeDeadlineExceeded},
		{"unknown-outcome", gerrors.New("private-sentinel", gerrors.CategoryExternal).WithTextCode(cmdrpc.CodeOutcomeUnknown), cmdrpc.CodeOutcomeUnknown},
		{"unexpected", errors.New("private-sentinel"), cmdrpc.CodeInternal},
	}
	wrappers := []string{"", "HANDLER_EXECUTION_FAILED", "HANDLER_MAX_RETRIES_EXCEEDED", "HANDLER_RETRY_ATTEMPT",
		"HANDLER_EXECUTION_CONTROLLED", "HANDLER_CONTEXT_CANCELLED", "HANDLER_DEADLINE_EXCEEDED"}
	for _, tc := range cases {
		for _, wrapper := range wrappers {
			t.Run(tc.name+"/"+wrapper, func(t *testing.T) {
				err := tc.err
				if wrapper != "" {
					err = gerrors.Wrap(err, gerrors.CategoryInternal, "private-sentinel").WithTextCode(wrapper).WithMetadata(private)
				}
				err = fmt.Errorf("private-sentinel: %w", err)
				out := DefaultRPCErrorMapper(context.Background(), err)
				require.NotNil(t, out)
				assert.Equal(t, tc.code, out.Code)
				assert.Empty(t, out.Details)
				assert.False(t, out.Retryable)
				encoded, marshalErr := json.Marshal(out)
				require.NoError(t, marshalErr)
				assert.NotContains(t, string(encoded), "private-sentinel")
				if tc.name == "settings" {
					var settings SettingsValidationErrors
					require.ErrorAs(t, err, &settings)
					assert.Equal(t, tc.err, settings)
				} else {
					assert.ErrorIs(t, err, tc.err)
				}
				assert.Equal(t, "private-sentinel", private["token"])
			})
		}
	}
}

type rpcInspectionPanic struct{}

func (rpcInspectionPanic) Error() string { panic("private-sentinel") }

func TestDefaultRPCErrorMapperBoundary(t *testing.T) {
	assert.Nil(t, DefaultRPCErrorMapper(nil, nil))
	var typedNil *gerrors.Error
	for _, err := range []error{typedNil, fmt.Errorf("private-sentinel: %w", typedNil), rpcInspectionPanic{}} {
		out := DefaultRPCErrorMapper(nil, err)
		require.NotNil(t, out)
		assert.Equal(t, cmdrpc.CodeInternal, out.Code)
		assert.NotContains(t, out.Message, "private-sentinel")
	}
	err := errors.Join(NewDomainError(TextCodeConflict, "private-sentinel", nil), context.Canceled)
	assert.Equal(t, cmdrpc.CodeCanceled, DefaultRPCErrorMapper(nil, err).Code)
	// The request context alone cannot turn a definite rejection into an unknown outcome.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	assert.Equal(t, cmdrpc.CodeForbidden, DefaultRPCErrorMapper(ctx, ErrForbidden).Code)
}

// Canonical RPC classifications are intentional, even when their diagnostic cause
// is an admin error with a different classification or HTTP presenter status.
func TestDefaultRPCErrorMapperCanonicalPrecedence(t *testing.T) {
	codes := []string{cmdrpc.CodeInvalidArgument, cmdrpc.CodeUnauthenticated,
		cmdrpc.CodeForbidden, cmdrpc.CodeNotFound, cmdrpc.CodeConflict,
		cmdrpc.CodeFailedPrecondition, cmdrpc.CodeRateLimited, cmdrpc.CodeUnavailable,
		cmdrpc.CodeDeadlineExceeded, cmdrpc.CodeCanceled, cmdrpc.CodeInternal, cmdrpc.CodeOutcomeUnknown}
	wrappers := []string{"", "HANDLER_EXECUTION_FAILED", "HANDLER_MAX_RETRIES_EXCEEDED", "HANDLER_RETRY_ATTEMPT",
		"HANDLER_EXECUTION_CONTROLLED", "HANDLER_CONTEXT_CANCELLED", "HANDLER_DEADLINE_EXCEEDED"}
	for _, code := range codes {
		for _, wrapper := range wrappers {
			t.Run(code+"/"+wrapper, func(t *testing.T) {
				for _, cause := range []error{ErrNotFound, PermissionDeniedError{Permission: "private-sentinel"}, SettingsValidationErrors{Fields: map[string]string{"email": "private-sentinel"}}} {
					original := gerrors.Wrap(cause, gerrors.CategoryValidation, "private-sentinel").WithTextCode(code).WithCode(400).WithMetadata(map[string]any{"secret": "private-sentinel"})
					var err error = original
					if wrapper != "" {
						err = gerrors.Wrap(err, gerrors.CategoryInternal, "private-sentinel").WithTextCode(wrapper)
					}
					err = fmt.Errorf("private-sentinel: %w", err)
					want := cmdrpc.DefaultErrorMapper(context.Background(), err)
					got := DefaultRPCErrorMapper(context.Background(), err)
					assert.Equal(t, code, got.Code)
					assert.Equal(t, want, got)
					var retained *gerrors.Error
					require.ErrorAs(t, original, &retained)
					assert.Same(t, original, retained)
					assert.Equal(t, code, original.TextCode)
					assert.Equal(t, "private-sentinel", original.Metadata["secret"])
					assert.Equal(t, cause, original.Unwrap())
				}
			})
		}
	}
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded} {
		err := gerrors.Wrap(cause, gerrors.CategoryExternal, "private-sentinel").WithTextCode(cmdrpc.CodeOutcomeUnknown)
		assert.Equal(t, cmdrpc.DefaultErrorMapper(nil, err), DefaultRPCErrorMapper(nil, err))
	}
}
