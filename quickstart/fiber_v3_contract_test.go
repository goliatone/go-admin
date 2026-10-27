package quickstart_test

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

// The backend fixture needs only the contract and published router constructor.
// Presentation is injected independently of the quickstart frontend builder.
func TestFiberV3ContractBackendInputs(t *testing.T) {
	var inputs quickstart.FiberV3ServerConfig
	cfg := admin.Config{BasePath: "/admin"}
	chain := []fiber3.Handler{func(c fiber3.Ctx) error {
		c.Set("X-Bootstrap", "native-v3")
		return c.Next()
	}}
	middleware := quickstart.WithFiberV3Middleware(chain...)
	chain[0] = func(c fiber3.Ctx) error {
		c.Set("X-Bootstrap", "mutated")
		return c.Next()
	}
	options := []quickstart.FiberV3ServerOption{
		quickstart.WithFiberV3Config(func(c *fiber3.Config) { c.ReadBufferSize = 32 * 1024 }),
		quickstart.WithFiberV3AdapterConfig(func(c *router.FiberV3AdapterConfig) {
			c.StrictRoutes = true
			c.ListenConfig.DisableStartupMessage = true
		}),
		quickstart.WithFiberV3ErrorHandler(func(c fiber3.Ctx, _ error) error {
			return c.Status(403).JSON(admin.ErrorResponse{Error: &admin.PresentedError{
				TextCode: "FORBIDDEN", Message: "Access denied",
			}})
		}),
		middleware,
		quickstart.WithFiberV3Middleware(nil, func(c fiber3.Ctx) error {
			c.Set("X-Second", "after-first")
			return c.Next()
		}),
		quickstart.WithFiberV3Logger(true),
		quickstart.WithFiberV3Logger(false),
		quickstart.WithFiberV3Config(nil),
		quickstart.WithFiberV3AdapterConfig(nil),
	}
	for _, option := range options {
		option(nil) // Same nil-target tolerance as existing v2 options.
		option(&inputs)
	}
	require.True(t, inputs.AdapterConfig.StrictRoutes)
	require.True(t, inputs.AdapterConfig.ListenConfig.DisableStartupMessage)
	require.False(t, inputs.EnableLogger)
	require.Equal(t, 32*1024, inputs.Config.ReadBufferSize)

	server := router.NewFiberV3AdapterWithConfig(inputs.AdapterConfig, func(*fiber3.App) *fiber3.App {
		app := fiber3.New(inputs.Config)
		for _, mw := range inputs.Middleware {
			app.Use(mw)
		}
		return app
	})
	server.Router().Get(cfg.BasePath+"/denied", func(router.Context) error { return fiber3.ErrForbidden })
	response, err := server.WrappedRouter().Test(httptest.NewRequest("GET", "/admin/denied", nil))
	require.NoError(t, err)
	defer response.Body.Close()
	require.Equal(t, 403, response.StatusCode)
	require.Equal(t, "native-v3", response.Header.Get("X-Bootstrap"))
	require.Equal(t, "after-first", response.Header.Get("X-Second"))
	var payload admin.ErrorResponse
	require.NoError(t, json.NewDecoder(response.Body).Decode(&payload))
	require.NotNil(t, payload.Error)
	require.Equal(t, "FORBIDDEN", payload.Error.TextCode)
}

// The presentation fixture uses only native v3 and the released view engine.
// It does not depend on a future quickstart server or error-handler constructor.
func TestFiberV3ContractPresentationInputs(t *testing.T) {
	views, err := router.InitializeFiberV3ViewEngine(router.NewSimpleViewConfigFS(".", fstest.MapFS{
		"page.html": {Data: []byte("{{ title }}:{{ state }}")},
	}).WithDebug(false))
	require.NoError(t, err)
	var inputs quickstart.FiberV3ServerConfig
	quickstart.WithFiberV3Views(views)(&inputs)
	app := fiber3.New(inputs.Config)
	app.Get("/:state", func(c fiber3.Ctx) error {
		return c.Render("page", router.ViewContext{"title": "Admin <view>", "state": c.Params("state")})
	})
	for _, state := range []string{"normal", "empty", "denied", "error"} {
		t.Run(state, func(t *testing.T) {
			response, err := app.Test(httptest.NewRequest("GET", "/"+state, nil))
			require.NoError(t, err)
			defer response.Body.Close()
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			require.Equal(t, 200, response.StatusCode)
			require.Contains(t, response.Header.Get("Content-Type"), "text/html")
			require.Equal(t, "Admin &lt;view&gt;:"+state, string(body))
		})
	}
}
