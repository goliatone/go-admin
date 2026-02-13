package quickstart

import (
	"context"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// FiberServerOption customizes the Fiber server defaults.
type FiberServerOption func(*fiberServerOptions)

type fiberServerOptions struct {
	config       fiber.Config
	routerConfig router.FiberAdapterConfig
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

// WithFiberAdapterConfig overrides the go-router adapter configuration.
func WithFiberAdapterConfig(mutator func(*router.FiberAdapterConfig)) FiberServerOption {
	return func(opts *fiberServerOptions) {
		if opts == nil || mutator == nil {
			return
		}
		mutator(&opts.routerConfig)
	}
}

// NewFiberServer constructs a Fiber-backed router adapter with quickstart defaults.
func NewFiberServer(viewEngine fiber.Views, cfg admin.Config, adm *admin.Admin, isDev bool, opts ...FiberServerOption) (router.Server[*fiber.App], router.Router[*fiber.App]) {
	if adm != nil {
		setQuickstartDefaultLoggerDependencies(adm.LoggerProvider(), adm.Logger())
	}

	options := fiberServerOptions{
		config: fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
			Views:             viewEngine,
		},
		routerConfig: defaultFiberAdapterConfig(cfg, isDev),
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

	adapter := router.NewFiberAdapterWithConfig(options.routerConfig, func(_ *fiber.App) *fiber.App {
		app := fiber.New(options.config)
		if options.enableLogger {
			app.Use(fiberlogger.New())
		}
		if debugLogger := debugFiberSlogMiddleware(cfg); debugLogger != nil {
			app.Use(debugLogger)
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

func defaultFiberAdapterConfig(cfg admin.Config, isDev bool) router.FiberAdapterConfig {
	conflictPolicy := resolveFiberRouteConflictPolicy(cfg, isDev)
	return router.FiberAdapterConfig{
		OrderRoutesBySpecificity: true,
		ConflictPolicy:           &conflictPolicy,
		PathConflictMode:         resolveFiberPathConflictMode(),
		StrictRoutes:             resolveFiberStrictRoutes(cfg, isDev),
	}
}

func resolveFiberRouteConflictPolicy(cfg admin.Config, isDev bool) router.HTTPRouterConflictPolicy {
	if policy, ok := fiberRouteConflictPolicyFromEnv(); ok {
		return policy
	}
	if resolveFiberStrictRoutes(cfg, isDev) {
		return router.HTTPRouterConflictPanic
	}
	return router.HTTPRouterConflictLogAndContinue
}

func resolveFiberPathConflictMode() router.PathConflictMode {
	if mode, ok := fiberPathConflictModeFromEnv(); ok {
		return mode
	}
	return router.PathConflictModePreferStatic
}

func resolveFiberStrictRoutes(cfg admin.Config, isDev bool) bool {
	if strict, ok := boolEnv("ADMIN_STRICT_ROUTES"); ok {
		return strict
	}
	if cfg.Debug.Enabled || isDev {
		return true
	}
	environment := strings.ToLower(strings.TrimSpace(firstNonEmptyString(
		os.Getenv("GO_ENV"),
		os.Getenv("ENV"),
	)))
	return environment == "test" || environment == "testing"
}

func fiberRouteConflictPolicyFromEnv() (router.HTTPRouterConflictPolicy, bool) {
	raw, ok := os.LookupEnv("ADMIN_ROUTE_CONFLICT_POLICY")
	if !ok {
		return 0, false
	}
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "panic":
		return router.HTTPRouterConflictPanic, true
	case "log_and_skip", "log-skip", "skip":
		return router.HTTPRouterConflictLogAndSkip, true
	case "log_and_continue", "log-continue", "continue":
		return router.HTTPRouterConflictLogAndContinue, true
	default:
		return 0, false
	}
}

func fiberPathConflictModeFromEnv() (router.PathConflictMode, bool) {
	raw, ok := os.LookupEnv("ADMIN_ROUTE_PATH_CONFLICT_MODE")
	if !ok {
		return "", false
	}
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "strict":
		return router.PathConflictModeStrict, true
	case "prefer_static", "prefer-static", "preferstatic", "static":
		return router.PathConflictModePreferStatic, true
	default:
		return "", false
	}
}

func boolEnv(key string) (bool, bool) {
	raw, ok := os.LookupEnv(strings.TrimSpace(key))
	if !ok {
		return false, false
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(raw))
	if err != nil {
		return false, false
	}
	return parsed, true
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func debugFiberSlogMiddleware(cfg admin.Config) fiber.Handler {
	if !cfg.Debug.Enabled || !cfg.Debug.CaptureLogs {
		return nil
	}
	return func(c *fiber.Ctx) error {
		started := time.Now()
		err := c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			if ferr, ok := err.(*fiber.Error); ok && ferr.Code > 0 {
				status = ferr.Code
			} else if status < fiber.StatusBadRequest {
				status = fiber.StatusInternalServerError
			}
		}
		level := slog.LevelInfo
		if err != nil || status >= fiber.StatusInternalServerError {
			level = slog.LevelError
		} else if status >= fiber.StatusBadRequest {
			level = slog.LevelWarn
		}

		requestCtx := c.UserContext()
		if requestCtx == nil {
			requestCtx = context.Background()
		}

		attrs := []any{
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"duration_ms", time.Since(started).Milliseconds(),
			"remote_ip", c.IP(),
		}
		if userAgent := strings.TrimSpace(c.Get("User-Agent")); userAgent != "" {
			attrs = append(attrs, "user_agent", userAgent)
		}
		if err != nil {
			attrs = append(attrs, "error", err.Error())
		}

		slog.Log(requestCtx, level, "fiber request", attrs...)
		return err
	}
}
