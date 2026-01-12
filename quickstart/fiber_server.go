package quickstart

import (
	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// FiberServerOption customizes the Fiber server defaults.
type FiberServerOption func(*fiberServerOptions)

type fiberServerOptions struct {
	config       fiber.Config
	errorHandler fiber.ErrorHandler
	middleware   []fiber.Handler
	enableLogger bool
}

// WithFiberConfig overrides the default Fiber config.
func WithFiberConfig(mutator func(*fiber.Config)) FiberServerOption {
	return func(opts *fiberServerOptions) {
		if opts == nil || mutator == nil {
			return
		}
		mutator(&opts.config)
	}
}

// WithFiberErrorHandler overrides the default error handler.
func WithFiberErrorHandler(handler fiber.ErrorHandler) FiberServerOption {
	return func(opts *fiberServerOptions) {
		if opts == nil {
			return
		}
		opts.errorHandler = handler
	}
}

// WithFiberMiddleware appends middleware to the default stack.
func WithFiberMiddleware(handlers ...fiber.Handler) FiberServerOption {
	return func(opts *fiberServerOptions) {
		if opts == nil || len(handlers) == 0 {
			return
		}
		opts.middleware = append(opts.middleware, handlers...)
	}
}

// WithFiberLogger toggles the default logger middleware.
func WithFiberLogger(enabled bool) FiberServerOption {
	return func(opts *fiberServerOptions) {
		if opts == nil {
			return
		}
		opts.enableLogger = enabled
	}
}

// NewFiberServer constructs a Fiber-backed router adapter with quickstart defaults.
func NewFiberServer(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberServerOption) (router.Server[*fiber.App], router.Router[*fiber.App]) {
	options := fiberServerOptions{
		config: fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
			Views:             viewEngine,
		},
		enableLogger: true,
	}

	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.errorHandler == nil {
		options.errorHandler = NewFiberErrorHandler(adm, cfg, isDev)
	}
	options.config.ErrorHandler = options.errorHandler

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(options.config)
		if options.enableLogger {
			app.Use(fiberlogger.New())
		}
		for _, handler := range options.middleware {
			if handler != nil {
				app.Use(handler)
			}
		}
		return app
	})

	return adapter, adapter.Router()
}
