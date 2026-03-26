package admin

import (
	"io"
	"log/slog"

	glog "github.com/goliatone/go-logger/glog"
)

func testLoggerWithHandler(handler slog.Handler) Logger {
	if handler == nil {
		handler = slog.NewTextHandler(io.Discard, nil)
	}
	return glog.NewLogger(
		glog.WithWriter(io.Discard),
		glog.WithHandlerWrapper(func(slog.Handler) slog.Handler {
			return handler
		}),
		glog.WithFatalBehavior(glog.FatalBehaviorLogOnly),
	)
}
