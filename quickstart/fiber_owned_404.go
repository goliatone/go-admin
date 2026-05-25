package quickstart

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	goerrors "github.com/goliatone/go-errors"
)

type fiberOwnedRouteMissError struct {
	method      string
	path        string
	routeDomain string
}

func newFiberOwnedRouteMissError(method, path string, routeDomain string) *fiberOwnedRouteMissError {
	return &fiberOwnedRouteMissError{
		method:      strings.TrimSpace(method),
		path:        strings.TrimSpace(path),
		routeDomain: strings.TrimSpace(routeDomain),
	}
}

func (e *fiberOwnedRouteMissError) Error() string {
	return fiber.ErrNotFound.Message
}

func (e *fiberOwnedRouteMissError) StatusCode() int {
	return fiber.StatusNotFound
}

func (e *fiberOwnedRouteMissError) metadata() map[string]any {
	return map[string]any{
		"classification": "route_miss",
		"synthetic":      true,
		"method":         e.method,
		"path":           e.path,
		"route_domain":   e.routeDomain,
	}
}

func mapFiberOwnedRouteMissError(err error) *goerrors.Error {
	var routeMiss *fiberOwnedRouteMissError
	if !errors.As(err, &routeMiss) || routeMiss == nil {
		return nil
	}
	return goerrors.New(fiber.ErrNotFound.Message, goerrors.CategoryNotFound).
		WithCode(fiber.StatusNotFound).
		WithTextCode(goerrors.HTTPStatusToTextCode(fiber.StatusNotFound)).
		WithMetadata(routeMiss.metadata())
}

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
		routeDomain := routeDomains.classify(c.Path(), hostRouteStandard)
		return errorHandler(c, newFiberOwnedRouteMissError(c.Method(), c.Path(), routeDomain))
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
