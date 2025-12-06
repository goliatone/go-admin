package quickstart

import (
	"context"
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// NewFiberErrorHandler returns a default error handler that renders JSON for API paths
// and an HTML error page (with nav + theme) for non-API paths.
func NewFiberErrorHandler(adm *admin.Admin, cfg admin.Config, isDev bool) fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		message := "internal server error"

		if fe, ok := err.(*fiber.Error); ok && fe.Code != 0 {
			code = fe.Code
			message = fe.Message
		}
		if ge := (&goerrors.Error{}); goerrors.As(err, &ge) {
			if ge.Code != 0 {
				code = ge.Code
			}
			if ge.Message != "" {
				message = ge.Message
			}
		}

		apiPrefix := path.Join(cfg.BasePath, "api")
		crudPrefix := path.Join(cfg.BasePath, "crud")
		isAPI := strings.HasPrefix(c.Path(), apiPrefix) || strings.HasPrefix(c.Path(), crudPrefix)

		if isAPI {
			payload := fiber.Map{"status": code}
			if isDev {
				payload["error"] = err.Error()
			} else {
				payload["error"] = message
			}
			return c.Status(code).JSON(payload)
		}

		headline, userMessage := errorContext(code)
		viewCtx := router.ViewContext{
			"status":       code,
			"headline":     headline,
			"message":      userMessage,
			"request_path": c.Path(),
			"base_path":    cfg.BasePath,
			"title":        cfg.Title,
		}
		if isDev {
			viewCtx["error_detail"] = err.Error()
		}
		reqCtx := c.UserContext()
		if reqCtx == nil {
			reqCtx = context.Background()
		}
		viewCtx = WithNav(viewCtx, adm, cfg, "", reqCtx)

		if renderErr := c.Status(code).Render("error", viewCtx); renderErr != nil {
			return c.SendString(fmt.Sprintf("%d - %s", code, headline))
		}
		return nil
	}
}

func errorContext(code int) (string, string) {
	switch code {
	case fiber.StatusNotFound:
		return "Page not found", "The page you are looking for does not exist."
	case fiber.StatusForbidden:
		return "Access denied", "You do not have permission to view this page."
	case fiber.StatusUnauthorized:
		return "Authentication required", "Please sign in to continue."
	default:
		return "Something went wrong", "An unexpected error occurred."
	}
}
