package quickstart

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

// NewFiberRouteMissHandler marks owned terminal routing misses for presentation.
// Register it with app.Use last, after all application routes and middleware. Returned
// middleware/handler errors remain untouched. Standalone apps without this
// fallback still present native errors, without synthetic-miss diagnostics.
func NewFiberRouteMissHandler(cfg admin.Config) fiber.Handler {
	domains := newHostRouteDomainResolver(cfg)
	return func(c *fiber.Ctx) error {
		route := c.Route()
		err := c.Next()
		// A later handler ran: its errors have application provenance, even if they
		// have the same status/message as a native terminal miss.
		if c.Route() != route {
			return err
		}
		if native, ok := err.(*fiber.Error); ok && native.Code == fiber.StatusNotFound { //nolint:errorlint // Only the direct native terminal error has routing provenance; wrapped errors must remain untouched.
			return ownedFiberRouteMiss(c.Method(), c.Path(), domains, err)
		}
		return err
	}
}

func ownedFiberRouteMiss(method, path string, domains hostRouteDomainResolver, fallback error) error {
	domain := domains.classify(path, hostRouteStandard)
	if domain == adminrouting.RouteDomainAdminUI || domain == adminrouting.RouteDomainAdminAPI {
		return newFiberOwnedRouteMissError(method, path, domain)
	}
	return fallback
}

// Native setup is registered during construction. The adapter owns finalization,
// startup errors and hosting mode; the wrapper never uses a raw getter to initialize.
type fiberServerCapabilities interface {
	router.StartupInitializer
	router.ManagedServer
	router.BoundedIngressServer
	router.BoundedIngressValidator
}

type fiberRouteMissServer[T any] struct {
	router.Server[T]
	capabilities fiberServerCapabilities
	setupErr     error
}

func newFiberRouteMissServer[T any](server router.Server[T], setup func() error) *fiberRouteMissServer[T] {
	s := &fiberRouteMissServer[T]{Server: server}
	var ok bool
	s.capabilities, ok = server.(fiberServerCapabilities)
	if !ok {
		s.setupErr = fmt.Errorf("quickstart server requires native hosting capabilities: %w", router.ErrManagedUnsupported)
	} else {
		s.setupErr = setup()
	}
	if s.setupErr != nil {
		s.setupErr = &router.StartupValidationError{Err: s.setupErr}
	}
	return s
}

func (s *fiberRouteMissServer[T]) Init() {
	if err := s.Initialize(); err != nil {
		panic(err)
	}
}

func (s *fiberRouteMissServer[T]) Initialize() error {
	if s.setupErr != nil {
		return s.setupErr
	}
	return s.capabilities.Initialize()
}

func (s *fiberRouteMissServer[T]) WrappedRouter() T {
	if s.setupErr != nil {
		panic(s.setupErr)
	}
	return s.Server.WrappedRouter()
}

func (s *fiberRouteMissServer[T]) Serve(address string) error {
	if s.setupErr != nil {
		return s.setupErr
	}
	return s.Server.Serve(address)
}

func (s *fiberRouteMissServer[T]) StartManaged(ctx context.Context, options router.ManagedOptions) (router.ManagedRun, error) {
	// Preserve provider validation/cancellation precedence without initializing
	// a pre-canceled run, including when construction recorded a setup failure.
	if s.capabilities != nil && (ctx == nil || ctx.Err() != nil) {
		return s.capabilities.StartManaged(ctx, options)
	}
	if s.setupErr != nil {
		return nil, s.setupErr
	}
	return s.capabilities.StartManaged(ctx, options)
}

func (s *fiberRouteMissServer[T]) ConfigureBoundedIngress(options router.BoundedIngressOptions) error {
	if s.setupErr != nil {
		return s.setupErr
	}
	return s.capabilities.ConfigureBoundedIngress(options)
}

func (s *fiberRouteMissServer[T]) ValidateBoundedIngress(options router.BoundedIngressOptions) error {
	if s.setupErr != nil {
		return s.setupErr
	}
	return s.capabilities.ValidateBoundedIngress(options)
}
