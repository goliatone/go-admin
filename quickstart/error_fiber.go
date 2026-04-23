package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
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
	runtime := fiberErrorHandlerRuntime{
		adm:          adm,
		cfg:          cfg,
		errorCfg:     errorCfg,
		presenter:    admin.NewErrorPresenter(errorCfg, options.errorMappers...),
		routeDomains: newHostRouteDomainResolver(cfg),
	}

	return func(c *fiber.Ctx, err error) error {
		return runtime.handle(c, err)
	}
}

type fiberErrorHandlerRuntime struct {
	adm          *admin.Admin
	cfg          admin.Config
	errorCfg     admin.ErrorConfig
	presenter    admin.ErrorPresenter
	routeDomains hostRouteDomainResolver
}

type resolvedFiberError struct {
	code    int
	message string
	fiber   *fiber.Error
}

func (r fiberErrorHandlerRuntime) handle(c *fiber.Ctx, err error) error {
	resolved := resolveFiberError(err)
	if r.routeDomains.classify(c.Path(), hostRouteStandard) == adminrouting.RouteDomainAdminAPI {
		return r.renderAPIError(c, err, resolved)
	}
	return r.renderHTMLError(c, err, resolved)
}

func resolveFiberError(err error) resolvedFiberError {
	resolved := resolvedFiberError{code: fiber.StatusInternalServerError, message: "internal server error"}
	if errors.As(err, &resolved.fiber) {
		resolved.code = resolved.fiber.Code
		resolved.message = resolved.fiber.Message
	}
	if ge := (&goerrors.Error{}); goerrors.As(err, &ge) {
		if ge.Code != 0 {
			resolved.code = ge.Code
		}
		if ge.Message != "" {
			resolved.message = ge.Message
		}
	}
	switch {
	case errors.Is(err, admin.ErrNotFound):
		resolved.code = fiber.StatusNotFound
		resolved.message = "not found"
	case errors.Is(err, admin.ErrForbidden):
		resolved.code = fiber.StatusForbidden
		resolved.message = "forbidden"
	}
	return resolved
}

func (r fiberErrorHandlerRuntime) renderAPIError(c *fiber.Ctx, err error, resolved resolvedFiberError) error {
	mapped, status := r.presenter.Present(err)
	if mapped == nil {
		mapped = goerrors.New(resolved.message, goerrors.CategoryInternal).
			WithCode(resolved.code).
			WithTextCode(goerrors.HTTPStatusToTextCode(resolved.code))
		status = resolved.code
	}
	applyFiberErrorOverride(mapped, resolved, &status)
	if mapped.Metadata == nil {
		mapped.Metadata = map[string]any{}
	}
	mapped.Metadata["path"] = c.Path()
	mapped.Metadata["method"] = c.Method()
	code := mapped.Code
	if code == 0 {
		code = status
		mapped.Code = code
	}
	return c.Status(code).JSON(mapped.ToErrorResponse(r.presenter.IncludeStackTrace(), mapped.StackTrace))
}

func applyFiberErrorOverride(mapped *goerrors.Error, resolved resolvedFiberError, status *int) {
	if resolved.fiber == nil || resolved.fiber.Code <= 0 {
		return
	}
	if mapped.Code != 0 && mapped.Code < fiber.StatusInternalServerError {
		return
	}
	if resolved.fiber.Code >= fiber.StatusInternalServerError {
		return
	}
	mapped.Code = resolved.fiber.Code
	mapped.TextCode = goerrors.HTTPStatusToTextCode(resolved.fiber.Code)
	mapped.Message = resolved.fiber.Message
	mapped.Category = goerrors.CategoryValidation
	if resolved.fiber.Code == fiber.StatusNotFound {
		mapped.Category = goerrors.CategoryNotFound
	}
	*status = resolved.fiber.Code
}

func (r fiberErrorHandlerRuntime) renderHTMLError(c *fiber.Ctx, err error, resolved resolvedFiberError) error {
	headline, userMessage := errorContext(resolved.code)
	viewCtx := r.baseErrorViewContext(c, resolved.code, headline, userMessage)
	if r.errorCfg.DevMode {
		r.applyDevErrorContext(c, err, viewCtx)
	}
	for key, value := range viewCtx {
		c.Locals(key, value)
	}
	if renderErr := c.Status(resolved.code).Render("error", nil); renderErr != nil {
		return c.SendString(fmt.Sprintf("%d - %s", resolved.code, headline))
	}
	return nil
}

func (r fiberErrorHandlerRuntime) baseErrorViewContext(c *fiber.Ctx, code int, headline, message string) router.ViewContext {
	reqCtx := c.UserContext()
	if reqCtx == nil {
		reqCtx = context.Background()
	}
	viewCtx := WithNav(router.ViewContext{}, r.adm, r.cfg, "", reqCtx)
	viewCtx["status"] = code
	viewCtx["headline"] = headline
	viewCtx["message"] = message
	viewCtx["request_path"] = c.Path()
	viewCtx["base_path"] = r.cfg.BasePath
	viewCtx["title"] = r.cfg.Title
	viewCtx["dev_mode"] = r.errorCfg.DevMode
	return viewCtx
}

func (r fiberErrorHandlerRuntime) applyDevErrorContext(c *fiber.Ctx, err error, viewCtx router.ViewContext) {
	viewCtx["error_detail"] = err.Error()
	devCtx := r.presenter.BuildDevErrorContext(err, buildRequestInfo(c, r.errorCfg))
	if devCtx == nil {
		r.applyLegacyDevErrorContext(err, viewCtx)
	} else {
		applyEnrichedDevErrorContext(viewCtx, devCtx)
	}
	var disabled admin.FeatureDisabledError
	if errors.As(err, &disabled) {
		viewCtx["error_feature"] = disabled.Feature
		viewCtx["error_reason"] = disabled.Reason
	}
}

func (r fiberErrorHandlerRuntime) applyLegacyDevErrorContext(err error, viewCtx router.ViewContext) {
	mapped, _ := r.presenter.Present(err)
	if mapped == nil {
		return
	}
	viewCtx["error_text_code"] = mapped.TextCode
	viewCtx["error_category"] = mapped.Category
	applyErrorMetadata(viewCtx, mapped.Metadata)
	if r.presenter.IncludeStackTrace() {
		if stack := formatStackTrace(mapped.StackTrace); stack != "" {
			viewCtx["error_stack"] = stack
		}
	}
}

func applyEnrichedDevErrorContext(viewCtx router.ViewContext, devCtx *admin.DevErrorContext) {
	viewCtx["dev_context"] = serializeTemplateValue(devCtx)
	viewCtx["error_type"] = devCtx.ErrorType
	viewCtx["error_text_code"] = devCtx.TextCode
	viewCtx["error_category"] = devCtx.Category
	if devCtx.PrimarySource != nil {
		viewCtx["primary_source"] = serializeTemplateValue(devCtx.PrimarySource)
	}
	if len(devCtx.StackFrames) > 0 {
		viewCtx["stack_frames"] = serializeTemplateValue(devCtx.StackFrames)
		if stack := formatStackTrace(devCtx.StackFrames); stack != "" {
			viewCtx["error_stack"] = stack
		}
	}
	if devCtx.RequestInfo != nil {
		viewCtx["request_info"] = serializeTemplateValue(devCtx.RequestInfo)
	}
	if devCtx.EnvironmentInfo != nil {
		viewCtx["env_info"] = serializeTemplateValue(devCtx.EnvironmentInfo)
	}
	applyErrorMetadata(viewCtx, devCtx.Metadata)
}

func applyErrorMetadata(viewCtx router.ViewContext, metadata map[string]any) {
	if len(metadata) == 0 {
		return
	}
	viewCtx["error_metadata"] = metadata
	if metaJSON, err := json.MarshalIndent(metadata, "", "  "); err == nil {
		viewCtx["error_metadata_json"] = string(metaJSON)
	}
}

func shouldEnableDevMode(isDev bool, cfg admin.ErrorConfig) bool {
	if isDev || cfg.DevMode {
		return true
	}
	return false
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
		for key, value := range c.Request().Header.All() {
			headerKey := string(key)
			// Skip sensitive headers
			if !isSensitiveHeader(headerKey) {
				info.Headers[headerKey] = string(value)
			}
		}
	}

	// Extract query params
	info.QueryParams = make(map[string]string)
	for key, value := range c.Request().URI().QueryArgs().All() {
		info.QueryParams[string(key)] = string(value)
	}

	if methodMayHaveBody(c.Method()) {
		applyRequestBodyInfo(c, cfg, info)
	}

	return info
}

func methodMayHaveBody(method string) bool {
	return method == "POST" || method == "PUT" || method == "PATCH"
}

func applyRequestBodyInfo(c *fiber.Ctx, cfg admin.ErrorConfig, info *admin.RequestInfo) {
	contentType := info.ContentType
	if isFormContentType(contentType) {
		info.FormData = make(map[string]string)
		for key, value := range c.Request().PostArgs().All() {
			formKey := string(key)
			if !isSensitiveFormField(formKey) {
				info.FormData[formKey] = string(value)
			}
		}
		return
	}
	if cfg.ShowRequestBody && strings.Contains(contentType, "application/json") {
		info.Body = truncateRequestBody(c.Body(), 2000)
	}
}

func isFormContentType(contentType string) bool {
	return strings.Contains(contentType, "application/x-www-form-urlencoded") ||
		strings.Contains(contentType, "multipart/form-data")
}

func truncateRequestBody(body []byte, limit int) string {
	if len(body) == 0 {
		return ""
	}
	if len(body) <= limit {
		return string(body)
	}
	return string(body[:limit]) + "... (truncated)"
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
	return slices.Contains(sensitive, lower)
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
