package admin

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	router "github.com/goliatone/go-router"
)

type requestQueryFailureStore struct {
	data.OperationStore
	cause error
}

func (s requestQueryFailureStore) LookupRequest(context.Context, data.RequestKey) (data.Operation, bool, error) {
	return data.Operation{}, false, s.cause
}
func (s requestQueryFailureStore) GetOperation(context.Context, string) (data.Operation, error) {
	return data.Operation{}, s.cause
}

// Exercise the actual request-status transport with service read errors. The
// resolver is the same thin binding T02 uses, without enabling Data workflows.
func TestDataRequestQueryFailurePresentation(t *testing.T) {
	for _, retry := range []bool{false, true} {
		for _, test := range []struct {
			name   string
			cause  error
			status int
			code   string
		}{
			{"canceled", fmt.Errorf("store: %w", context.Canceled), http.StatusRequestTimeout, "CONSOLE_CANCELED"},
			{"deadline", fmt.Errorf("store: %w", context.DeadlineExceeded), http.StatusGatewayTimeout, "CONSOLE_TIMEOUT"},
			{"unavailable", data.Error(data.CodeUnavailable), http.StatusServiceUnavailable, "CONSOLE_PROVIDER_FAILED"},
			{"provider", data.Error(data.CodeProvider), http.StatusServiceUnavailable, "CONSOLE_PROVIDER_FAILED"},
		} {
			t.Run(fmt.Sprintf("retry=%v/%s", retry, test.name), func(t *testing.T) {
				m, provider, store, ctx, id := snapshotFixture(t, nil, snapshotPolicy{})
				service, err := data.NewService(data.ServiceConfig{
					Providers: map[string]data.Provider{"sample": provider}, Target: dataRegistrationTarget{},
					Store: requestQueryFailureStore{OperationStore: store, cause: test.cause}, Policy: snapshotPolicy{},
					Resolve: func(ctx context.Context) (data.Principal, error) { return snapshotPrincipal(t, ctx), nil },
				})
				if err != nil {
					t.Fatal(err)
				}
				m.config.Service = service
				registry := console.NewPanelRegistry()
				err = registry.Register(DataPanelOperations, console.PanelConfig{Requests: func(ctx context.Context, q console.PanelRequestQuery) (console.PanelRequestStatus, error) {
					var queryErr error
					if retry {
						_, queryErr = service.RetryDescriptor(ctx, q.RequestID)
					} else {
						_, queryErr = service.RequestStatus(ctx, data.Prepare, "preview", q.RequestID, q.SubmittedAt)
					}
					return console.PanelRequestStatus{}, dataConsoleReadError(queryErr)
				}})
				if err != nil {
					t.Fatal(err)
				}
				h := m.Console()
				h.config.Registry = registry
				h.config.RequestIdentity = func(router.Context) (console.Identity, error) { return id, nil }
				server := router.NewHTTPServer()
				server.Router().Get("/panels/:panel/requests/:request", func(c router.Context) error { c.SetContext(ctx); return h.handleRequestStatus(c) })
				res := httptest.NewRecorder()
				req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/panels/operations/requests/0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b?action=prepare", nil)
				server.WrappedRouter().ServeHTTP(res, req)
				if res.Code != test.status || !strings.Contains(res.Body.String(), test.code) {
					t.Fatalf("got %d %s; want %d %s", res.Code, res.Body.String(), test.status, test.code)
				}
				if strings.Contains(res.Body.String(), `"result"`) || strings.Contains(res.Body.String(), "FORBIDDEN") {
					t.Fatal("failed query leaked a result or became denial", res.Body.String())
				}
			})
		}
	}
}
