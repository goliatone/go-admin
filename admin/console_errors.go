package admin

import (
	"context"
	"errors"
	"net/http"

	gerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// Preserve causes for in-process callers and expose safe distinctions over HTTP.
func writeConsoleError(c router.Context, err error) error {
	return writeError(c, consoleHTTPError(err))
}

// consoleHTTPError gives timeouts and cancellations their console HTTP codes.
func consoleHTTPError(err error) error {
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		err = gerrors.Wrap(err, gerrors.CategoryExternal, "Console loading timed out. Retry the request.").WithCode(http.StatusGatewayTimeout).WithTextCode("CONSOLE_TIMEOUT")
	case errors.Is(err, context.Canceled):
		err = gerrors.Wrap(err, gerrors.CategoryOperation, "Console request was canceled.").WithCode(http.StatusRequestTimeout).WithTextCode("CONSOLE_CANCELED")
	}
	return err
}
