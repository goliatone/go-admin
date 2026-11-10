package admin

import (
	"context"
	"errors"
	"net/http"

	cmdrpc "github.com/goliatone/go-command/rpc"
	gerrors "github.com/goliatone/go-errors"
)

// DefaultRPCErrorMapper projects admin domain errors into the public RPC contract.
// Configure it explicitly on the transport; it does not change error presenters
// or direct command results. Messages, validation values, metadata and retry hints
// are diagnostic-only and are omitted. Hosts may supply a custom mapper for
// explicitly allowlisted public details. Retryability never authorizes replay.
func DefaultRPCErrorMapper(ctx context.Context, err error) (public *cmdrpc.Error) {
	if err == nil {
		return nil
	}
	// Domain inspection may call application Error/Is/As/Unwrap methods. Keep
	// failures private, including when this mapper is used outside rpcfiber.
	defer func() {
		if recover() != nil {
			public = cmdrpc.DefaultErrorMapper(ctx, errors.New("rpc error classification failed"))
		}
	}()
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return cmdrpc.DefaultErrorMapper(ctx, err)
	}
	cause := rpcDomainCause(err)
	var rich *gerrors.Error
	if errors.As(cause, &rich) && rich != nil {
		canonical := cmdrpc.DefaultErrorMapper(ctx, cause)
		// A matching text code is an explicit upstream classification, including
		// INTERNAL. Preserve it before the admin presenter searches deeper causes.
		// Comparing with the upstream projection keeps its canonical code set
		// authoritative without mistaking category/default fallbacks for intent.
		if rich.TextCode == canonical.Code {
			return canonical
		}
	}
	mapped, status := mapToGoError(cause, nil)
	// Admin uses a domain-specific precondition code; preserve its meaning
	// rather than reducing it to the domain's broader conflict category.
	if mapped.TextCode == TextCodePreconditionFailed {
		return cmdrpc.DefaultErrorMapper(ctx, gerrors.New("", gerrors.CategoryOperation).
			WithTextCode(cmdrpc.CodeFailedPrecondition))
	}
	public = cmdrpc.DefaultErrorMapper(ctx, mapped)
	if public.Code != cmdrpc.CodeInternal {
		return public
	}
	// Some admin classifications (including service unavailability and Fiber
	// routing errors) carry their meaning in the existing presenter status.
	// This selects an RPC code only; rpcfiber still owns the HTTP status.
	var code string
	switch status {
	case http.StatusBadRequest, http.StatusUnprocessableEntity:
		code = cmdrpc.CodeInvalidArgument
	case http.StatusUnauthorized:
		code = cmdrpc.CodeUnauthenticated
	case http.StatusForbidden:
		code = cmdrpc.CodeForbidden
	case http.StatusNotFound:
		code = cmdrpc.CodeNotFound
	case http.StatusConflict:
		code = cmdrpc.CodeConflict
	case http.StatusPreconditionFailed:
		code = cmdrpc.CodeFailedPrecondition
	case http.StatusTooManyRequests:
		code = cmdrpc.CodeRateLimited
	case http.StatusBadGateway, http.StatusServiceUnavailable:
		code = cmdrpc.CodeUnavailable
	case http.StatusGatewayTimeout:
		code = cmdrpc.CodeDeadlineExceeded
	default:
		return public
	}
	return cmdrpc.DefaultErrorMapper(ctx, gerrors.New("", gerrors.CategoryInternal).WithTextCode(code))
}

// Match the upstream mapper's transparent runner wrappers without changing the
// admin HTTP presenter's classification or discarding the caller's error chain.
func rpcDomainCause(err error) error {
	for {
		var rich *gerrors.Error
		if !errors.As(err, &rich) || rich == nil || rich.Unwrap() == nil {
			return err
		}
		switch rich.TextCode {
		case "HANDLER_EXECUTION_FAILED", "HANDLER_MAX_RETRIES_EXCEEDED", "HANDLER_RETRY_ATTEMPT",
			"HANDLER_EXECUTION_CONTROLLED", "HANDLER_CONTEXT_CANCELLED", "HANDLER_DEADLINE_EXCEEDED":
			err = rich.Unwrap()
		default:
			return err
		}
	}
}
