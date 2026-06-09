package admin

import (
	"context"
	"encoding/json"
	"io"
	"maps"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"

	crud "github.com/goliatone/go-crud"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnhancedMutationResponderReturnsEnhancedEnvelope(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeEnhanced}
	presentation := NewMutationPresentation(
		WithMutationStatus(http.StatusAccepted),
		WithMutationToast(EnhancedToast{Type: "success", Message: "Assigned to you."}),
		WithMutationFragment(EnhancedFragment{Selector: "[data-family-assignments]", HTML: "<section></section>"}),
		WithMutationFocus("[data-assignment-id='a1']"),
		WithMutationRedirect("/admin/translations/families/f1"),
	)

	err := NewEnhancedMutationResponder().Respond(ctx, req, presentation, MutationFallback{})

	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, ctx.status)
	assert.Equal(t, EnhancedMutationMediaType, ctx.headers["Content-Type"])
	payload := requireEnhancedMutationPayload(t, ctx.payload)
	assert.True(t, payload.OK)
	assert.Equal(t, EnhancedMutationResponseVersion, payload.Version)
	assert.Equal(t, "[data-family-assignments]", payload.Fragments[0].Selector)
	assert.Equal(t, EnhancedFragmentModeReplace, payload.Fragments[0].Mode)
	assert.Equal(t, "Assigned to you.", payload.Toasts[0].Message)
	assert.Equal(t, "/admin/translations/families/f1", payload.Redirect)
}

func TestDetectEnhancedMutationRequestUsesGenericHeaderAndAdminMediaType(t *testing.T) {
	headerCtx := newEnhancedMutationTestContext()
	headerCtx.headers[crud.EnhancedRequestHeader] = crud.EnhancedRequestHeaderValue
	headerCtx.headers["Accept"] = "application/json"
	adminAcceptCtx := newEnhancedMutationTestContext()
	adminAcceptCtx.headers["Accept"] = EnhancedMutationMediaType
	crudAcceptCtx := newEnhancedMutationTestContext()
	crudAcceptCtx.headers["Accept"] = crud.EnhancedMutationMediaType

	assert.Equal(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequest(headerCtx).Mode)
	assert.Equal(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequest(adminAcceptCtx).Mode)
	assert.Equal(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequest(crudAcceptCtx).Mode)
}

func TestDetectEnhancedMutationRequestUsesCustomAdminNegotiationConfig(t *testing.T) {
	cfg := EnhancedActionNegotiationConfig{
		RequestHeader:      "X-App-Action",
		RequestHeaderValue: "opaque-marker",
		RequestMediaTypes:  []string{"application/vnd.example.action+json"},
		ResponseMediaType:  "application/vnd.example.action+json",
	}
	headerCtx := newEnhancedMutationTestContext()
	headerCtx.headers["X-App-Action"] = "opaque-marker"
	headerCtx.headers["Accept"] = "application/json"
	acceptCtx := newEnhancedMutationTestContext()
	acceptCtx.headers["Accept"] = "application/vnd.example.action+json"
	defaultCtx := newEnhancedMutationTestContext()
	defaultCtx.headers[crud.EnhancedRequestHeader] = crud.EnhancedRequestHeaderValue

	assert.Equal(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequestWithConfig(headerCtx, cfg).Mode)
	assert.Equal(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequestWithConfig(acceptCtx, cfg).Mode)
	assert.NotEqual(t, crud.MutationResponseModeEnhanced, detectEnhancedMutationRequestWithConfig(defaultCtx, cfg).Mode)
}

func TestEnhancedMutationResponderUsesCustomMediaType(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeEnhanced}

	err := NewEnhancedMutationResponder().
		WithMediaType("application/vnd.example.action+json").
		Respond(ctx, req, NewMutationPresentation(), MutationFallback{})

	require.NoError(t, err)
	assert.Equal(t, "application/vnd.example.action+json", ctx.headers["Content-Type"])
}

func TestEnhancedActionRuntimeOptionsUseNormalizedNegotiationConfig(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{})
	adm.WithEnhancedActionNegotiation(EnhancedActionNegotiationConfig{
		RequestHeader:      "X-App-Action",
		RequestHeaderValue: "opaque-marker",
		RequestMediaTypes:  []string{"application/vnd.example.request+json"},
		ResponseMediaType:  "application/vnd.example.response+json",
	})

	options := adm.EnhancedActionRuntimeOptions()

	assert.Equal(t, "X-App-Action", options.RequestHeader)
	assert.Equal(t, "opaque-marker", options.RequestHeaderValue)
	assert.Equal(t, "application/vnd.example.response+json", options.Accept)
}

func TestEnhancedActionRuntimeOptionsMarshalSnakeCase(t *testing.T) {
	options := EnhancedActionRuntimeOptions{
		RequestHeader:      "X-App-Action",
		RequestHeaderValue: "opaque-marker",
		Accept:             "application/vnd.example.action+json",
	}

	raw, err := json.Marshal(options)

	require.NoError(t, err)
	assert.JSONEq(t, `{
		"request_header": "X-App-Action",
		"request_header_value": "opaque-marker",
		"accept": "application/vnd.example.action+json"
	}`, string(raw))
}

func TestTranslationSSREnhancementCarriesEnhancedActionRuntimeOptions(t *testing.T) {
	options := EnhancedActionRuntimeOptions{
		RequestHeader:      "X-App-Action",
		RequestHeaderValue: "opaque-marker",
		Accept:             "application/vnd.example.action+json",
	}

	enhancement := translationSSREnhancement(TranslationSSRPresenterInput{
		APIBasePath:       "/admin/api/",
		BasePath:          "/admin/",
		EnhancedAction:    options,
		BulkActionAPIPath: "/admin/api/translations/actions",
	})

	assert.Equal(t, options, enhancement["enhanced_action"])
}

func TestEnhancedMutationResponderRedirectsNormalFormWithFlash(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	ctx.referer = "/admin/fallback"
	req := crud.MutationRequest{Mode: crud.MutationResponseModeHTML}
	presentation := NewMutationPresentation(
		WithMutationToast(EnhancedToast{Type: "success", Message: "Saved."}),
		WithMutationRedirect("/admin/target"),
	)

	err := NewEnhancedMutationResponder().Respond(ctx, req, presentation, MutationFallback{})

	require.NoError(t, err)
	assert.Equal(t, http.StatusSeeOther, ctx.redirectStatus)
	assert.Equal(t, "/admin/target", ctx.redirectLocation)
	assert.Equal(t, "success", ctx.headers["X-GoAdmin-Flash-Type"])
	assert.Equal(t, "Saved.", ctx.headers["X-GoAdmin-Flash-Message"])
	assert.Equal(t, map[string]any{"type": "success", "message": "Saved."}, ctx.store["go_admin_flash"])
}

func TestEnhancedMutationResponderPreservesJSONFallback(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeJSON}
	jsonPayload := map[string]any{"assignment_id": "asg-1"}

	err := NewEnhancedMutationResponder().Respond(ctx, req, NewMutationPresentation(), MutationFallback{
		Status: http.StatusCreated,
		JSON:   jsonPayload,
	})

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, ctx.status)
	assert.Equal(t, jsonPayload, ctx.payload)
}

func TestEnhancedMutationResponderReturnsStructuredEnhancedError(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeEnhanced}
	errInput := goerrors.NewValidationFromMap("validation failed", map[string]string{
		"assignee_id": "assignee_id required",
	}).WithCode(http.StatusBadRequest).WithTextCode("VALIDATION_FAILED")

	err := NewEnhancedMutationResponder().RespondError(ctx, req, errInput, MutationFallback{Redirect: "/admin/families/f1"})

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, ctx.status)
	payload := requireEnhancedMutationPayload(t, ctx.payload)
	require.NotNil(t, payload.Error)
	assert.False(t, payload.OK)
	assert.Equal(t, "VALIDATION_FAILED", payload.Error.TextCode)
	assert.Equal(t, "assignee_id required", payload.Error.Fields["assignee_id"])
	assert.Equal(t, "/admin/families/f1", payload.Redirect)
	assert.Equal(t, "error", payload.Toasts[0].Type)
}

func TestEnhancedMutationResponderUsesWriteErrorForJSONErrors(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeJSON}
	errInput := goerrors.New("permission denied", goerrors.CategoryAuthz).WithCode(http.StatusForbidden)

	err := NewEnhancedMutationResponder().RespondError(ctx, req, errInput, MutationFallback{})

	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, ctx.status)
	_, isMutationPayload := ctx.payload.(MutationPresentation)
	assert.False(t, isMutationPayload)
}

func TestEnhancedMutationResponderPreservesJSONFallbackForPostCommitErrors(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	req := crud.MutationRequest{Mode: crud.MutationResponseModeJSON}
	errInput := goerrors.New("family view could not be refreshed", goerrors.CategoryInternal)
	jsonPayload := map[string]any{"data": map[string]any{"assignment_id": "asg-1"}}

	err := NewEnhancedMutationResponder().RespondError(ctx, req, errInput, MutationFallback{
		JSON: jsonPayload,
	})

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, ctx.status)
	assert.Equal(t, jsonPayload, ctx.payload)
}

func TestTranslationFamilyDetailRedirectUsesConfiguredBasePath(t *testing.T) {
	ctx := newEnhancedMutationTestContext()
	ctx.queries = map[string]string{
		"channel":   "production",
		"tenant_id": "tenant-1",
	}

	redirect := translationFamilyDetailRedirect(ctx, "/console", "family/with space")

	assert.Equal(t, "/console/translations/families/family%2Fwith%20space?channel=production&tenant_id=tenant-1", redirect)
}

func requireEnhancedMutationPayload(t *testing.T, payload any) MutationPresentation {
	t.Helper()
	switch typed := payload.(type) {
	case MutationPresentation:
		return typed
	case *MutationPresentation:
		require.NotNil(t, typed)
		return *typed
	default:
		raw, err := json.Marshal(payload)
		require.NoError(t, err)
		var presentation MutationPresentation
		require.NoError(t, json.Unmarshal(raw, &presentation))
		require.NotZero(t, presentation.Version)
		return presentation
	}
}

type enhancedMutationTestContext struct {
	ctx              context.Context
	method           string
	path             string
	headers          map[string]string
	store            map[any]any
	status           int
	payload          any
	body             []byte
	referer          string
	queries          map[string]string
	forms            map[string]string
	redirectLocation string
	redirectStatus   int
}

func newEnhancedMutationTestContext() *enhancedMutationTestContext {
	return &enhancedMutationTestContext{
		ctx:     context.Background(),
		method:  http.MethodPost,
		path:    "/admin/action",
		headers: map[string]string{},
		store:   map[any]any{},
	}
}

func (c *enhancedMutationTestContext) Method() string { return c.method }
func (c *enhancedMutationTestContext) Path() string   { return c.path }
func (c *enhancedMutationTestContext) Param(string, ...string) string {
	return ""
}
func (c *enhancedMutationTestContext) ParamsInt(string, int) int { return 0 }
func (c *enhancedMutationTestContext) Query(key string, defaults ...string) string {
	if value := strings.TrimSpace(c.queries[key]); value != "" {
		return value
	}
	if len(defaults) > 0 {
		return defaults[0]
	}
	return ""
}
func (c *enhancedMutationTestContext) QueryValues(key string) []string {
	if value := c.Query(key); value != "" {
		return []string{value}
	}
	return nil
}
func (c *enhancedMutationTestContext) QueryInt(string, int) int { return 0 }
func (c *enhancedMutationTestContext) Queries() map[string]string {
	if c.queries == nil {
		return nil
	}
	out := map[string]string{}
	maps.Copy(out, c.queries)
	return out
}
func (c *enhancedMutationTestContext) Body() []byte { return c.body }
func (c *enhancedMutationTestContext) Locals(key any, value ...any) any {
	if len(value) > 0 {
		c.store[key] = value[0]
	}
	return c.store[key]
}
func (c *enhancedMutationTestContext) LocalsMerge(key any, value map[string]any) map[string]any {
	current, ok := c.store[key].(map[string]any)
	if !ok || current == nil {
		current = map[string]any{}
	}
	maps.Copy(current, value)
	c.store[key] = current
	return current
}
func (c *enhancedMutationTestContext) Render(string, any, ...string) error { return nil }
func (c *enhancedMutationTestContext) Cookie(*router.Cookie)               {}
func (c *enhancedMutationTestContext) Cookies(string, ...string) string    { return "" }
func (c *enhancedMutationTestContext) CookieParser(any) error              { return nil }
func (c *enhancedMutationTestContext) Bind(any) error                      { return nil }
func (c *enhancedMutationTestContext) Redirect(location string, status ...int) error {
	c.redirectLocation = location
	c.redirectStatus = http.StatusFound
	if len(status) > 0 {
		c.redirectStatus = status[0]
	}
	return nil
}
func (c *enhancedMutationTestContext) RedirectToRoute(string, router.ViewContext, ...int) error {
	return nil
}
func (c *enhancedMutationTestContext) RedirectBack(fallback string, status ...int) error {
	return c.Redirect(fallback, status...)
}
func (c *enhancedMutationTestContext) Header(key string) string { return c.headers[key] }
func (c *enhancedMutationTestContext) Referer() string          { return c.referer }
func (c *enhancedMutationTestContext) OriginalURL() string      { return c.path }
func (c *enhancedMutationTestContext) FormFile(string) (*multipart.FileHeader, error) {
	return nil, nil
}
func (c *enhancedMutationTestContext) FormValue(key string, defaults ...string) string {
	if value := strings.TrimSpace(c.forms[key]); value != "" {
		return value
	}
	if len(defaults) > 0 {
		return defaults[0]
	}
	return ""
}
func (c *enhancedMutationTestContext) IP() string { return "127.0.0.1" }
func (c *enhancedMutationTestContext) Status(code int) router.Context {
	c.status = code
	return c
}
func (c *enhancedMutationTestContext) Send(body []byte) error {
	c.body = body
	var payload MutationPresentation
	if err := json.Unmarshal(body, &payload); err == nil && payload.Version != 0 {
		c.payload = payload
	}
	return nil
}
func (c *enhancedMutationTestContext) SendString(body string) error {
	c.body = []byte(body)
	return nil
}
func (c *enhancedMutationTestContext) SendStatus(code int) error {
	c.status = code
	return nil
}
func (c *enhancedMutationTestContext) JSON(code int, v any) error {
	c.status = code
	c.payload = v
	return nil
}
func (c *enhancedMutationTestContext) SendStream(r io.Reader) error {
	_, err := io.ReadAll(r)
	return err
}
func (c *enhancedMutationTestContext) NoContent(code int) error {
	c.status = code
	return nil
}
func (c *enhancedMutationTestContext) SetHeader(key, value string) router.Context {
	c.headers[key] = value
	return c
}
func (c *enhancedMutationTestContext) Set(key string, value any) { c.store[key] = value }
func (c *enhancedMutationTestContext) Get(key string, def any) any {
	if value, ok := c.store[key]; ok {
		return value
	}
	return def
}
func (c *enhancedMutationTestContext) GetString(key string, def string) string {
	if value, ok := c.store[key].(string); ok {
		return value
	}
	return def
}
func (c *enhancedMutationTestContext) GetInt(key string, def int) int {
	if value, ok := c.store[key].(int); ok {
		return value
	}
	return def
}
func (c *enhancedMutationTestContext) GetBool(key string, def bool) bool {
	if value, ok := c.store[key].(bool); ok {
		return value
	}
	return def
}
func (c *enhancedMutationTestContext) Context() context.Context { return c.ctx }
func (c *enhancedMutationTestContext) SetContext(ctx context.Context) {
	c.ctx = ctx
}
func (c *enhancedMutationTestContext) Next() error                    { return nil }
func (c *enhancedMutationTestContext) RouteName() string              { return "" }
func (c *enhancedMutationTestContext) RouteParams() map[string]string { return nil }
