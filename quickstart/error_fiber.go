package quickstart

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// FiberErrorHandlerOption customizes the quickstart Fiber error handler.
type FiberErrorHandlerOption func(*fiberErrorHandlerOptions)

type fiberErrorHandlerOptions struct {
	errorMappers []goerrors.ErrorMapper
}

// WithFiberErrorMappers appends custom error mappers to the defaults.
func WithFiberErrorMappers(mappers ...goerrors.ErrorMapper) FiberErrorHandlerOption {
	return func(opts *fiberErrorHandlerOptions) {
		if opts == nil || len(mappers) == 0 {
			return
		}
		opts.errorMappers = append(opts.errorMappers, mappers...)
	}
}

// NewFiberErrorHandler returns a default error handler that renders JSON for API paths
// and an HTML error page (with nav + theme) for non-API paths.
func NewFiberErrorHandler(adm *admin.Admin, cfg admin.Config, isDev bool, opts ...FiberErrorHandlerOption) fiber.ErrorHandler {
	options := fiberErrorHandlerOptions{
		errorMappers: goerrors.DefaultErrorMappers(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	errorCfg := cfg.Errors
	if isDev {
		errorCfg.DevMode = true
		if !errorCfg.ExposeInternalMessages {
			errorCfg.ExposeInternalMessages = true
		}
	}
	if errorCfg.InternalMessage == "" {
		errorCfg.InternalMessage = "An unexpected error occurred"
	}
	presenter := admin.NewErrorPresenter(errorCfg, options.errorMappers...)

	return func(c *fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		message := "internal server error"

		// Check for fiber.Error first
		var fe *fiber.Error
		if errors.As(err, &fe) {
			code = fe.Code
			message = fe.Message
		}

		// Then check for go-errors.Error
		if ge := (&goerrors.Error{}); goerrors.As(err, &ge) {
			if ge.Code != 0 {
				code = ge.Code
			}
			if ge.Message != "" {
				message = ge.Message
			}
		}

		// Map core admin errors to HTTP status codes.
		if errors.Is(err, admin.ErrNotFound) {
			code = fiber.StatusNotFound
			message = "not found"
		} else if errors.Is(err, admin.ErrForbidden) {
			code = fiber.StatusForbidden
			message = "forbidden"
		}

		apiPrefix := path.Join(cfg.BasePath, "api")
		crudPrefix := path.Join(cfg.BasePath, "crud")
		isAPI := strings.HasPrefix(c.Path(), apiPrefix) || strings.HasPrefix(c.Path(), crudPrefix)

		if isAPI {
			mapped, status := presenter.Present(err)
			if mapped == nil {
				mapped = goerrors.New(message, goerrors.CategoryInternal).
					WithCode(code).
					WithTextCode(goerrors.HTTPStatusToTextCode(code))
				status = code
			}
			if mapped.Metadata == nil {
				mapped.Metadata = map[string]any{}
			}
			mapped.Metadata["path"] = c.Path()
			mapped.Metadata["method"] = c.Method()
			if mapped.Code != 0 {
				code = mapped.Code
			} else {
				code = status
				mapped.Code = code
			}
			includeStack := presenter.IncludeStackTrace()
			return c.Status(code).JSON(mapped.ToErrorResponse(includeStack, mapped.StackTrace))
		}

		headline, userMessage := errorContext(code)

		reqCtx := c.UserContext()
		if reqCtx == nil {
			reqCtx = context.Background()
		}

		// Start with nav context
		viewCtx := WithNav(router.ViewContext{}, adm, cfg, "", reqCtx)

		// Then add error-specific fields (these should override any nav values)
		viewCtx["status"] = code
		viewCtx["headline"] = headline
		viewCtx["message"] = userMessage
		viewCtx["request_path"] = c.Path()
		viewCtx["base_path"] = cfg.BasePath
		viewCtx["title"] = cfg.Title

		if isDev {
			viewCtx["error_detail"] = err.Error()
		}

		// Set all viewCtx values via Locals to ensure Fiber's PassLocalsToViews works
		for key, value := range viewCtx {
			c.Locals(key, value)
		}

		// Pass nil to force Fiber to use only c.Locals() with PassLocalsToViews
		if renderErr := c.Status(code).Render("error", nil); renderErr != nil {
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
