package quickstart

import (
	"github.com/gofiber/fiber/v3"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	"strings"
)

func newFiberV3Owned404Middleware(routeDomains hostRouteDomainResolver, errorHandler fiber.ErrorHandler) fiber.Handler {
	return func(c fiber.Ctx) error {
		err := c.Next()
		// Returned errors retain their provenance. Only the terminal fallback
		// creates synthetic misses; middleware may return the same native sentinel.
		if err != nil || errorHandler == nil {
			return err
		}
		if !shouldRewriteOwnedFiberV3Miss(c, routeDomains) {
			return nil
		}

		resetFiberOwnedMissRepresentation(c.Response())
		c.Status(fiber.StatusOK)
		routeDomain := routeDomains.classify(c.Path(), hostRouteStandard)
		return errorHandler(c, newFiberOwnedRouteMissError(c.Method(), c.Path(), routeDomain))
	}
}

func shouldRewriteOwnedFiberV3Miss(c fiber.Ctx, routeDomains hostRouteDomainResolver) bool {
	if c == nil || c.Response().StatusCode() != fiber.StatusNotFound {
		return false
	}

	switch routeDomains.classify(c.Path(), hostRouteStandard) {
	case adminrouting.RouteDomainAdminUI, adminrouting.RouteDomainAdminAPI:
	default:
		return false
	}

	contentType := strings.ToLower(strings.TrimSpace(c.GetRespHeader(fiber.HeaderContentType)))
	if contentType != "" && !strings.HasPrefix(contentType, fiber.MIMETextPlain) {
		return false
	}

	body := strings.TrimSpace(string(c.Response().Body()))
	switch body {
	case "", fiber.ErrNotFound.Message, "Not Found":
		return true
	default:
		return false
	}
}
