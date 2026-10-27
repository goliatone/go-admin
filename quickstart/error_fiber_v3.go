package quickstart

import (
	"context"
	"errors"

	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// NewFiberV3ErrorHandler renders the same API envelopes and HTML templates as
// NewFiberErrorHandler through a native v3 context. Options and error causes are
// shared; hosts opt in by supplying this handler in fiber3.Config.
func NewFiberV3ErrorHandler(adm *admin.Admin, cfg admin.Config, isDev bool, opts ...FiberErrorHandlerOption) fiber3.ErrorHandler {
	runtime := newFiberErrorHandlerRuntime(adm, cfg, isDev, opts...)
	return func(c fiber3.Ctx, err error) error {
		var native *fiber3.Error
		var resolvedNative *fiberHTTPError
		if errors.As(err, &native) && native != nil {
			resolvedNative = &fiberHTTPError{Code: native.Code, Message: native.Message}
		}
		return runtime.handle(fiberV3ErrorContext{c}, err, resolveFiberHTTPError(err, resolvedNative))
	}
}

type fiberV3ErrorContext struct{ fiber3.Ctx }

func (c fiberV3ErrorContext) requestContext() context.Context { return c.Context() }
func (c fiberV3ErrorContext) renderStatus(code int, name string, data router.ViewContext) error {
	return c.Status(code).Render(name, fiber3.Map(data))
}
func (c fiberV3ErrorContext) jsonStatus(code int, data any) error { return c.Status(code).JSON(data) }
func (c fiberV3ErrorContext) textStatus(code int, body string) error {
	return c.Status(code).SendString(body)
}
