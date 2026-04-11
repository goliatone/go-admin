package quickstart_test

import (
	"net/http"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestHostRouterPhase7AdapterParityForFallbackOwnershipAndMethods(t *testing.T) {
	t.Run("httprouter", func(t *testing.T) {
		runHostRouterPhase7AdapterMatrix(t, router.NewHTTPServer())
	})
	t.Run("fiber", func(t *testing.T) {
		runHostRouterPhase7AdapterMatrix(t, router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
			PathConflictMode: router.PathConflictModePreferStatic,
			StrictRoutes:     true,
		}))
	})
}

func runHostRouterPhase7AdapterMatrix[T any](t *testing.T, server router.Server[T]) {
	t.Helper()

	server, _ = buildHostRouterTestServer(t, server, []string{"host", "admin", "static", "site"})

	assertJSONHandler(t, server, http.MethodGet, "/posts/welcome", http.StatusOK, "site")
	assertStatusCode(t, server, http.MethodPost, "/posts/welcome", http.StatusMethodNotAllowed)
	assertJSONHandler(t, server, http.MethodGet, "/admin/debug", http.StatusOK, "admin_ui")
	assertJSONHandler(t, server, http.MethodGet, "/admin/api/debug/scope", http.StatusOK, "admin_api")
	assertJSONStatus(t, server, http.MethodGet, "/readyz", http.StatusOK)
	assertJSONStatus(t, server, http.MethodGet, "/ops/status", http.StatusOK)
	assertJSONHandler(t, server, http.MethodGet, "/.well-known/app-info", http.StatusOK, "system")
	assertStatusCode(t, server, http.MethodGet, "/.well-known/security.txt", http.StatusNotFound)
	assertStatusCode(t, server, http.MethodGet, "/admin/not-found", http.StatusNotFound)
}
