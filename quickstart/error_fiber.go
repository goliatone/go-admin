package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"
	"runtime"
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
	if shouldEnableDevMode(isDev, errorCfg) {
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
		viewCtx["dev_mode"] = errorCfg.DevMode

		if errorCfg.DevMode {
			viewCtx["error_detail"] = err.Error()

			// Build request info for dev context
			reqInfo := buildRequestInfo(c, errorCfg)

			// Build enriched dev error context
			devCtx := presenter.BuildDevErrorContext(err, reqInfo)
			if devCtx != nil {
				viewCtx["dev_context"] = serializeTemplateValue(devCtx)
				viewCtx["error_type"] = devCtx.ErrorType
				viewCtx["error_text_code"] = devCtx.TextCode
				viewCtx["error_category"] = devCtx.Category

				// Primary source context for the error tab
				if devCtx.PrimarySource != nil {
					viewCtx["primary_source"] = serializeTemplateValue(devCtx.PrimarySource)
				}

				// Stack frames for the stack tab
				if len(devCtx.StackFrames) > 0 {
					viewCtx["stack_frames"] = serializeTemplateValue(devCtx.StackFrames)
					// Also provide legacy stack string for backwards compatibility
					if stack := formatStackTrace(devCtx.StackFrames); stack != "" {
						viewCtx["error_stack"] = stack
					}
				}

				// Request info for the request tab
				if devCtx.RequestInfo != nil {
					viewCtx["request_info"] = serializeTemplateValue(devCtx.RequestInfo)
				}

				// Environment info for the app tab
				if devCtx.EnvironmentInfo != nil {
					viewCtx["env_info"] = serializeTemplateValue(devCtx.EnvironmentInfo)
				}

				// Metadata
				if len(devCtx.Metadata) > 0 {
					viewCtx["error_metadata"] = devCtx.Metadata
					if metaJSON, metaErr := json.MarshalIndent(devCtx.Metadata, "", "  "); metaErr == nil {
						viewCtx["error_metadata_json"] = string(metaJSON)
					}
				}
			} else {
				// Fallback to legacy behavior
				if mapped, _ := presenter.Present(err); mapped != nil {
					viewCtx["error_text_code"] = mapped.TextCode
					viewCtx["error_category"] = mapped.Category
					if len(mapped.Metadata) > 0 {
						viewCtx["error_metadata"] = mapped.Metadata
						if metaJSON, metaErr := json.MarshalIndent(mapped.Metadata, "", "  "); metaErr == nil {
							viewCtx["error_metadata_json"] = string(metaJSON)
						}
					}
					if presenter.IncludeStackTrace() {
						if stack := formatStackTrace(mapped.StackTrace); stack != "" {
							viewCtx["error_stack"] = stack
						}
					}
				}
			}

			var disabled admin.FeatureDisabledError
			if errors.As(err, &disabled) {
				viewCtx["error_feature"] = disabled.Feature
				viewCtx["error_reason"] = disabled.Reason
			}
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

func shouldEnableDevMode(isDev bool, cfg admin.ErrorConfig) bool {
	if isDev || cfg.DevMode {
		return true
	}
	env := resolveRuntimeEnv()
	if env == "" {
		return false
	}
	if isProdEnv(env) {
		return false
	}
	if value, ok := envBool("ADMIN_ERROR_NONPROD"); ok {
		return value
	}
	return true
}

func serializeTemplateValue(value any) any {
	if value == nil {
		return nil
	}
	serialized, err := router.SerializeAsContext(map[string]any{
		"value": value,
	})
	if err != nil {
		return value
	}
	if converted, ok := serialized["value"]; ok {
		return converted
	}
	return value
}

func resolveRuntimeEnv() string {
	env := strings.TrimSpace(os.Getenv("GO_ENV"))
	if env == "" {
		env = strings.TrimSpace(os.Getenv("ENV"))
	}
	return strings.ToLower(env)
}

func isProdEnv(env string) bool {
	switch strings.TrimSpace(strings.ToLower(env)) {
	case "prod", "production":
		return true
	default:
		return false
	}
}

func formatStackTrace(trace any) string {
	switch v := trace.(type) {
	case nil:
		return ""
	case string:
		return v
	case []string:
		return strings.Join(v, "\n")
	case []admin.StackFrameInfo:
		parts := make([]string, 0, len(v))
		for _, frame := range v {
			parts = append(parts, fmt.Sprintf("%s\n\t%s:%d", frame.Function, frame.File, frame.Line))
		}
		return strings.Join(parts, "\n")
	case []any:
		parts := make([]string, 0, len(v))
		for _, entry := range v {
			parts = append(parts, fmt.Sprint(entry))
		}
		return strings.Join(parts, "\n")
	default:
		return fmt.Sprint(v)
	}
}

// buildRequestInfo extracts request information from Fiber context.
func buildRequestInfo(c *fiber.Ctx, cfg admin.ErrorConfig) *admin.RequestInfo {
	info := &admin.RequestInfo{
		Method:      c.Method(),
		Path:        c.Path(),
		FullURL:     c.OriginalURL(),
		ContentType: string(c.Request().Header.ContentType()),
		RemoteIP:    c.IP(),
		UserAgent:   c.Get("User-Agent"),
	}

	// Extract headers if enabled
	if cfg.ShowRequestHeaders {
		info.Headers = make(map[string]string)
		c.Request().Header.VisitAll(func(key, value []byte) {
			headerKey := string(key)
			// Skip sensitive headers
			if !isSensitiveHeader(headerKey) {
				info.Headers[headerKey] = string(value)
			}
		})
	}

	// Extract query params
	info.QueryParams = make(map[string]string)
	c.Request().URI().QueryArgs().VisitAll(func(key, value []byte) {
		info.QueryParams[string(key)] = string(value)
	})

	// Extract form data for POST requests
	if c.Method() == "POST" || c.Method() == "PUT" || c.Method() == "PATCH" {
		contentType := info.ContentType
		if strings.Contains(contentType, "application/x-www-form-urlencoded") ||
			strings.Contains(contentType, "multipart/form-data") {
			info.FormData = make(map[string]string)
			c.Request().PostArgs().VisitAll(func(key, value []byte) {
				formKey := string(key)
				// Skip sensitive form fields
				if !isSensitiveFormField(formKey) {
					info.FormData[formKey] = string(value)
				}
			})
		} else if cfg.ShowRequestBody && strings.Contains(contentType, "application/json") {
			// Include JSON body (truncated)
			body := c.Body()
			if len(body) > 0 {
				if len(body) > 2000 {
					info.Body = string(body[:2000]) + "... (truncated)"
				} else {
					info.Body = string(body)
				}
			}
		}
	}

	return info
}

// isSensitiveHeader checks if a header should be hidden.
func isSensitiveHeader(key string) bool {
	lower := strings.ToLower(key)
	sensitive := []string{
		"authorization",
		"cookie",
		"set-cookie",
		"x-api-key",
		"x-auth-token",
		"x-csrf-token",
	}
	for _, s := range sensitive {
		if lower == s {
			return true
		}
	}
	return false
}

// isSensitiveFormField checks if a form field should be hidden.
func isSensitiveFormField(key string) bool {
	lower := strings.ToLower(key)
	sensitive := []string{
		"password",
		"passwd",
		"secret",
		"token",
		"api_key",
		"apikey",
		"credit_card",
		"creditcard",
		"cvv",
		"ssn",
	}
	for _, s := range sensitive {
		if strings.Contains(lower, s) {
			return true
		}
	}
	return false
}

// buildEnvironmentInfo creates environment information.
func buildEnvironmentInfo(cfg admin.ErrorConfig) *admin.EnvironmentInfo {
	if !cfg.ShowEnvironment {
		return nil
	}

	return &admin.EnvironmentInfo{
		GoVersion:   runtime.Version(),
		AppVersion:  cfg.AppVersion,
		Environment: resolveRuntimeEnv(),
		Debug:       cfg.DevMode,
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
