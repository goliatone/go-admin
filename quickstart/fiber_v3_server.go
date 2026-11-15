package quickstart

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	fiberlogger "github.com/gofiber/fiber/v3/middleware/logger"
	fiberrecover "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// NewFiberV3Server constructs an explicit Fiber v3 host with quickstart HTML/API
// error presentation. Supplied views and native error-handler options remain
// authoritative, matching the existing v2 composition contract.
// Serve forwards AdapterConfig.ListenConfig. Callers starting WrappedRouter
// themselves must initialize the adapter and pass native listen settings.
// The returned server exposes router.StartupInitializer, router.ManagedServer,
// router.BoundedIngressServer and router.BoundedIngressValidator. Configure and
// register routes before initialization; WrappedRouter selects native raw hosting.
func NewFiberV3Server(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberV3ServerOption) (router.Server[*fiber.App], router.Router[*fiber.App]) {
	if adm != nil {
		setQuickstartDefaultLoggerDependencies(adm.LoggerProvider(), adm.Logger())
	}
	options := FiberV3ServerConfig{
		Config:        fiber.Config{UnescapePath: true, StrictRouting: false, PassLocalsToViews: true, Views: viewEngine, ReadBufferSize: resolveFiberReadBufferSize()},
		AdapterConfig: router.FiberV3AdapterConfig{FiberAdapterConfig: defaultFiberAdapterConfig(cfg, isDev)},
		EnableLogger:  true,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.Config.ErrorHandler == nil {
		options.Config.ErrorHandler = NewFiberV3ErrorHandler(adm, cfg, isDev)
	}
	routeDomains := newHostRouteDomainResolver(cfg)
	adapter := router.NewFiberV3AdapterWithConfig(options.AdapterConfig, func(_ *fiber.App) *fiber.App {
		return fiber.New(options.Config)
	})
	middleware := []fiber.Handler{fiberrecover.New()}
	if options.EnableLogger {
		middleware = append(middleware, fiberlogger.New())
	}
	if debugLogger := debugFiberV3SlogMiddleware(cfg); debugLogger != nil {
		middleware = append(middleware, debugLogger)
	}
	for _, handler := range options.Middleware {
		if handler != nil {
			middleware = append(middleware, handler)
		}
	}
	middleware = append(middleware, newFiberV3Owned404Middleware(routeDomains, options.Config.ErrorHandler))
	server := newFiberRouteMissServer(adapter, func() error {
		registrar, ok := adapter.(router.FiberV3NativeMiddlewareRegistrar)
		if !ok {
			return fmt.Errorf("quickstart requires owned native middleware registration: %w", router.ErrManagedUnsupported)
		}
		if err := registrar.UseNative(middleware...); err != nil {
			return err
		}
		return registrar.UseNativeTerminal(NewFiberV3RouteMissHandler(cfg))
	})
	return server, adapter.Router()
}

func debugFiberV3SlogMiddleware(cfg admin.Config) fiber.Handler {
	if !cfg.Debug.Enabled || !cfg.Debug.CaptureLogs {
		return nil
	}
	return func(c fiber.Ctx) error {
		started := time.Now()
		err := c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			var ferr *fiber.Error
			if errors.As(err, &ferr) && ferr.Code > 0 {
				status = ferr.Code
			} else if status < fiber.StatusBadRequest {
				status = fiber.StatusInternalServerError
			}
		}
		logFiberRequest(c.Context(), started, status, err, c.Method(), c.Path(), c.IP(), c.Get("User-Agent"))
		return err
	}
}
