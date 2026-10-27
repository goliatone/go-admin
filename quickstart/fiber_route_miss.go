package quickstart

import (
	"sync"

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

// Install the fallback after the adapter finalizes deferred routes, static
// assets and caller-supplied miss handlers, on every supported startup path.
// Embedding preserves the remaining server behavior, including listen options.
type fiberRouteMissServer[T any] struct {
	router.Server[T]
	once    sync.Once
	install func(T)
}

func (s *fiberRouteMissServer[T]) Init() {
	s.once.Do(func() {
		s.Server.Init()
		s.install(s.Server.WrappedRouter())
	})
}

func (s *fiberRouteMissServer[T]) WrappedRouter() T {
	s.Init()
	return s.Server.WrappedRouter()
}

func (s *fiberRouteMissServer[T]) Serve(address string) error {
	s.Init()
	return s.Server.Serve(address)
}
