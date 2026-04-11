package quickstart

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
)

func newFiberOwned404Middleware(routeDomains hostRouteDomainResolver, errorHandler fiber.ErrorHandler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()
		if err != nil || errorHandler == nil {
			return err
		}
		if !shouldRewriteOwnedFiberMiss(c, routeDomains) {
			return nil
		}

		c.Response().Reset()
		c.Status(fiber.StatusOK)
		return errorHandler(c, fiber.ErrNotFound)
	}
}

func shouldRewriteOwnedFiberMiss(c *fiber.Ctx, routeDomains hostRouteDomainResolver) bool {
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
