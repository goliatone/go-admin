package quickstart

import (
	fiber "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
)

// NewFiberV3RouteMissHandler is the native v3 terminal fallback. Register it
// with app.Use last, after all application routes and middleware, or use NewFiberV3Server
// which installs it during finalization. It preserves explicit middleware errors
// and native non-404 outcomes, including method-not-allowed responses.
func NewFiberV3RouteMissHandler(cfg admin.Config) fiber.Handler {
	domains := newHostRouteDomainResolver(cfg)
	return func(c fiber.Ctx) error {
		route := c.Route()
		err := c.Next()
		if c.Route() != route {
			return err
		}
		if err == fiber.ErrNotFound {
			return ownedFiberRouteMiss(c.Method(), c.Path(), domains, err)
		}
		return err
	}
}
