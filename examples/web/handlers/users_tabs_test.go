package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUserDetailTabSelection(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "activity" {
			t.Fatalf("expected active_tab=activity, got %q", got)
		}
		rawTabs, ok := viewCtx["tabs"].([]map[string]any)
		if !ok {
			t.Fatalf("expected tabs payload, got %T", viewCtx["tabs"])
		}
		hasDetails := false
		for _, tab := range rawTabs {
			if fmt.Sprint(tab["id"]) == "details" {
				hasDetails = true
				break
			}
		}
		if !hasDetails {
			t.Fatalf("expected synthetic details tab in tabs payload, got %+v", rawTabs)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserDetailTabDefaultsToDetails(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "details" {
			t.Fatalf("expected active_tab=details, got %q", got)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserDetailActivityTabPermissionModeStrictReturnsForbidden(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
	h.Config.ActivityTabPermissionFailureMode = "strict"
	h.Config.Errors.DevMode = false

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.On("Context").Return(withUsersClaims())

	err := h.Detail(ctx)
	require.Error(t, err)
	var appErr *goerrors.Error
	require.True(t, errors.As(err, &appErr))
	require.Equal(t, goerrors.CodeForbidden, appErr.Code)
	require.Equal(t, "activity", fmt.Sprint(appErr.Metadata["tab"]))
}

func TestUserDetailActivityTabPermissionModeInlineDegrades(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
	h.Config.ActivityTabPermissionFailureMode = "inline"
	h.Config.Errors.DevMode = true // explicit mode should win over dev defaults

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		require.True(t, ok)
		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, true, tabPanel["unavailable"])
		require.Equal(t, "permission_denied", tabPanel["unavailable_reason"])
	})

	require.NoError(t, h.Detail(ctx))
}

func TestUserDetailActivityTabPermissionModeAutoUsesDevMode(t *testing.T) {
	t.Run("dev mode strict", func(t *testing.T) {
		h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
		h.Config.ActivityTabPermissionFailureMode = ""
		h.Config.Errors.DevMode = true

		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.QueriesM["tab"] = "activity"
		ctx.On("Context").Return(withUsersClaims())

		err := h.Detail(ctx)
		require.Error(t, err)
		var appErr *goerrors.Error
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, goerrors.CodeForbidden, appErr.Code)
	})

	t.Run("prod mode inline", func(t *testing.T) {
		h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
		h.Config.ActivityTabPermissionFailureMode = ""
		h.Config.Errors.DevMode = false

		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.QueriesM["tab"] = "activity"
		ctx.On("Context").Return(withUsersClaims())
		ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			viewCtx, ok := args.Get(1).(router.ViewContext)
			require.True(t, ok)
			tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, tabPanel["unavailable"])
			require.Equal(t, "permission_denied", tabPanel["unavailable_reason"])
		})

		require.NoError(t, h.Detail(ctx))
	})
}

func TestUserTabHTMLEndpoint(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersAndActivityClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab_panel payload")
		}
		if got := fmt.Sprint(tabPanel["id"]); got != "activity" {
			t.Fatalf("expected tab_panel id activity, got %q", got)
		}
	})

	if err := h.TabHTML(ctx); err != nil {
		t.Fatalf("tab html handler: %v", err)
	}
}

func TestUserTabJSONEndpoint(t *testing.T) {
	h, user := setupUserHandlersTest(t)
	server := newTabsTestServer(t)
	defer server.Close()

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.HeadersM["X-Forwarded-Host"] = serverHost(t, server)
	ctx.HeadersM["X-Forwarded-Proto"] = serverScheme(t, server)
	ctx.On("Context").Return(withUsersAndActivityClaims())
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		payload, ok := args.Get(1).(map[string]any)
		if !ok {
			t.Fatalf("expected json payload map")
		}
		tab, ok := payload["tab"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab payload")
		}
		if got := fmt.Sprint(tab["id"]); got != "activity" {
			t.Fatalf("expected tab id activity, got %q", got)
		}
	})

	if err := h.TabJSON(ctx); err != nil {
		t.Fatalf("tab json handler: %v", err)
	}
}

func TestUserDetailTabSelectionFallsBackToRegistryTabs(t *testing.T) {
	h, user := setupUserHandlersWithRegistryTabs(t)

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.QueriesM["tab"] = "activity"
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		if got := fmt.Sprint(viewCtx["active_tab"]); got != "activity" {
			t.Fatalf("expected active_tab=activity, got %q", got)
		}
	})

	if err := h.Detail(ctx); err != nil {
		t.Fatalf("detail handler: %v", err)
	}
}

func TestUserTabHTMLEndpointFallsBackToRegistryTabs(t *testing.T) {
	h, user := setupUserHandlersWithRegistryTabs(t)

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.On("Context").Return(withUsersAndActivityClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("expected view context")
		}
		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		if !ok {
			t.Fatalf("expected tab_panel payload")
		}
		if got := fmt.Sprint(tabPanel["id"]); got != "activity" {
			t.Fatalf("expected tab_panel id activity, got %q", got)
		}
	})

	if err := h.TabHTML(ctx); err != nil {
		t.Fatalf("tab html handler: %v", err)
	}
}

func TestUserActivityTabPermissionMatrixAcrossEndpoints(t *testing.T) {
	endpoints := []struct {
		name string
		call func(*UserHandlers, router.Context) error
	}{
		{name: "tab html", call: func(h *UserHandlers, c router.Context) error { return h.TabHTML(c) }},
		{name: "tab json", call: func(h *UserHandlers, c router.Context) error { return h.TabJSON(c) }},
	}

	cases := []struct {
		name        string
		claims      context.Context
		expectError bool
	}{
		{
			name:        "users and activity permissions granted",
			claims:      withUsersAndActivityClaims(),
			expectError: false,
		},
		{
			name:        "users permission only",
			claims:      withUsersClaims(),
			expectError: true,
		},
		{
			name:        "activity permission only",
			claims:      withActivityClaimsOnly(),
			expectError: true,
		},
		{
			name:        "no relevant permissions",
			claims:      withNoResourceClaims(),
			expectError: true,
		},
	}

	for _, endpoint := range endpoints {
		for _, tc := range cases {
			t.Run(endpoint.name+"_"+tc.name, func(t *testing.T) {
				h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
				ctx := router.NewMockContext()
				ctx.ParamsM["id"] = fmt.Sprint(user["id"])
				ctx.ParamsM["tab"] = "activity"
				ctx.On("Context").Return(tc.claims)

				if !tc.expectError {
					if endpoint.name == "tab html" {
						ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil)
					} else {
						ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)
					}
				}

				err := endpoint.call(h, ctx)
				if !tc.expectError {
					require.NoError(t, err)
					return
				}

				require.Error(t, err)
				var appErr *goerrors.Error
				require.True(t, errors.As(err, &appErr))
				require.Equal(t, goerrors.CodeForbidden, appErr.Code)
			})
		}
	}
}

func TestUserActivityTabEndpointsRejectInvalidLimit(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})

	tests := []struct {
		name string
		call func(*UserHandlers, router.Context) error
	}{
		{name: "tab html", call: func(h *UserHandlers, c router.Context) error { return h.TabHTML(c) }},
		{name: "tab json", call: func(h *UserHandlers, c router.Context) error { return h.TabJSON(c) }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := router.NewMockContext()
			ctx.ParamsM["id"] = fmt.Sprint(user["id"])
			ctx.ParamsM["tab"] = "activity"
			ctx.QueriesM["limit"] = "abc"
			ctx.On("Context").Return(withUsersAndActivityClaims())

			err := tt.call(h, ctx)
			require.Error(t, err)
			var appErr *goerrors.Error
			require.True(t, errors.As(err, &appErr))
			require.Equal(t, goerrors.CodeBadRequest, appErr.Code)
		})
	}
}

func TestUserActivityTabGracefulDegradationOnBackendFailure(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, failingActivitySink{})

	t.Run("html response includes unavailable state", func(t *testing.T) {
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			viewCtx, ok := args.Get(1).(router.ViewContext)
			require.True(t, ok)
			panel, ok := viewCtx["tab_panel"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, panel["unavailable"])
			require.Equal(t, "query_failed", panel["unavailable_reason"])
			require.Equal(t, "Failed to load activity data.", panel["error_message"])
		})

		require.NoError(t, h.TabHTML(ctx))
	})

	t.Run("json response includes unavailable state", func(t *testing.T) {
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			payload, ok := args.Get(1).(map[string]any)
			require.True(t, ok)
			tab, ok := payload["tab"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, tab["unavailable"])
			require.Equal(t, "query_failed", tab["unavailable_reason"])
			require.Equal(t, "Failed to load activity data.", tab["error_message"])
		})

		require.NoError(t, h.TabJSON(ctx))
	})
}

func TestUserActivityTabGracefulDegradationOnTimeout(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, timeoutActivitySink{})

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.On("Context").Return(withUsersAndActivityClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		require.True(t, ok)
		panel, ok := viewCtx["tab_panel"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, true, panel["unavailable"])
		require.Equal(t, "query_failed", panel["unavailable_reason"])
	})

	require.NoError(t, h.TabHTML(ctx))
}

func TestUserActivityTabObservabilityMetrics(t *testing.T) {
	t.Run("successful query emits duration and result metrics", func(t *testing.T) {
		now := time.Now().UTC()
		sink := &scenarioActivitySink{
			targetEntries: []admin.ActivityEntry{
				{ID: "t1", Actor: "admin-1", Action: "updated", Object: "user:user-123", CreatedAt: now},
			},
		}
		h, user := setupUserHandlersActivityTest(t, sink)
		metrics := &capturingUserTabActivityMetrics{}
		h.ActivityStats = metrics

		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil)

		require.NoError(t, h.TabHTML(ctx))
		require.Len(t, metrics.queryDurations, 1)
		require.Equal(t, "success", metrics.queryDurations[0].tags["reason"])
		require.Len(t, metrics.resultCounts, 1)
		require.Equal(t, 1, metrics.resultCounts[0].count)
		require.Empty(t, metrics.errorCounts)
	})

	t.Run("failing query emits duration and error metrics", func(t *testing.T) {
		h, user := setupUserHandlersActivityTest(t, failingActivitySink{})
		metrics := &capturingUserTabActivityMetrics{}
		h.ActivityStats = metrics

		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil)

		require.NoError(t, h.TabHTML(ctx))
		require.Len(t, metrics.queryDurations, 1)
		require.Equal(t, "query_failed", metrics.queryDurations[0].tags["reason"])
		require.Empty(t, metrics.resultCounts)
		require.NotEmpty(t, metrics.errorCounts)
		require.Equal(t, "query_failed", metrics.errorCounts[0]["reason"])
	})

	t.Run("endpoint validation failure emits error metric", func(t *testing.T) {
		h, user := setupUserHandlersActivityTest(t, emptyActivitySink{})
		metrics := &capturingUserTabActivityMetrics{}
		h.ActivityStats = metrics

		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.QueriesM["limit"] = "not-a-number"
		ctx.On("Context").Return(withUsersAndActivityClaims())

		err := h.TabJSON(ctx)
		require.Error(t, err)
		require.Empty(t, metrics.queryDurations)
		require.Empty(t, metrics.resultCounts)
		require.NotEmpty(t, metrics.errorCounts)
		require.Equal(t, "invalid_limit", metrics.errorCounts[0]["reason"])
		require.Equal(t, "tab_json", metrics.errorCounts[0]["endpoint"])
	})
}

func TestUserActivityTabDegradedResponsesAreStructuredLogged(t *testing.T) {
	h, user := setupUserHandlersActivityTest(t, failingActivitySink{})
	var logs bytes.Buffer
	h.ActivityLog = slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelWarn}))

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = fmt.Sprint(user["id"])
	ctx.ParamsM["tab"] = "activity"
	ctx.On("Context").Return(withUsersAndActivityClaims())
	ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil)

	require.NoError(t, h.TabHTML(ctx))
	payload := logs.String()
	require.Contains(t, payload, `"resource":"users.activity"`)
	require.Contains(t, payload, `"tab":"activity"`)
	require.Contains(t, payload, `"endpoint":"detail_inline"`)
	require.Contains(t, payload, `"reason":"query_failed"`)
}

func TestUserActivityTabQueryCostBounded(t *testing.T) {
	t.Run("extreme requested limit is clamped and query count is bounded", func(t *testing.T) {
		now := time.Now().UTC()
		targetEntries := make([]admin.ActivityEntry, 0, 80)
		for i := 0; i < 80; i++ {
			targetEntries = append(targetEntries, admin.ActivityEntry{
				ID:        fmt.Sprintf("target-%03d", i),
				Actor:     "admin-1",
				Action:    "updated",
				Object:    "user:user-123",
				CreatedAt: now.Add(-time.Duration(i) * time.Second),
			})
		}

		sink := &scenarioActivitySink{targetEntries: targetEntries}
		h, user := setupUserHandlersActivityTest(t, sink)
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.QueriesM["limit"] = "999"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

		require.NoError(t, h.TabJSON(ctx))
		require.LessOrEqual(t, len(sink.callLimits), 4)
		require.Equal(t, []int{helpers.UserActivityMaxLimit, helpers.UserActivityMaxLimit}, sink.callLimits)
		for _, callLimit := range sink.callLimits {
			require.LessOrEqual(t, callLimit, helpers.UserActivityMaxLimit)
		}
	})

	t.Run("overlap refetch stays within fixed query budget", func(t *testing.T) {
		now := time.Now().UTC()
		targetEntries := make([]admin.ActivityEntry, 0, 50)
		actorEntries := make([]admin.ActivityEntry, 0, 20)
		for i := 0; i < 20; i++ {
			id := fmt.Sprintf("dup-%d", (i%5)+1)
			ts := now.Add(-time.Duration(i) * time.Second)
			targetEntries = append(targetEntries, admin.ActivityEntry{
				ID:        id,
				Actor:     "admin-1",
				Action:    "updated",
				Object:    "user:user-123",
				CreatedAt: ts,
			})
			actorEntries = append(actorEntries, admin.ActivityEntry{
				ID:        id,
				Actor:     "user-123",
				Action:    "updated",
				Object:    "user:user-123",
				CreatedAt: ts,
			})
		}
		for i := 0; i < 30; i++ {
			targetEntries = append(targetEntries, admin.ActivityEntry{
				ID:        fmt.Sprintf("unique-%02d", i+1),
				Actor:     "admin-2",
				Action:    "created",
				Object:    "user:user-123",
				CreatedAt: now.Add(-time.Duration(40+i) * time.Second),
			})
		}

		sink := &scenarioActivitySink{
			targetEntries: targetEntries,
			actorEntries:  actorEntries,
		}
		h, user := setupUserHandlersActivityTest(t, sink)
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = fmt.Sprint(user["id"])
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

		require.NoError(t, h.TabJSON(ctx))
		require.Equal(t, []int{20, 20, 50, 50}, sink.callLimits)
		require.LessOrEqual(t, len(sink.callLimits), 4)
		for _, callLimit := range sink.callLimits {
			require.LessOrEqual(t, callLimit, helpers.UserActivityMaxLimit)
		}
	})
}

func TestUserActivityTabEndpointsHandleTargetActorAndMixedScenarios(t *testing.T) {
	now := time.Now().UTC()
	scenarios := []struct {
		name       string
		target     []admin.ActivityEntry
		actor      []admin.ActivityEntry
		expectedID []string
	}{
		{
			name: "target only",
			target: []admin.ActivityEntry{
				{ID: "t2", Actor: "admin-1", Action: "updated", Object: "user:user-123", CreatedAt: now.Add(-1 * time.Minute)},
				{ID: "t1", Actor: "admin-2", Action: "created", Object: "user:user-123", CreatedAt: now.Add(-2 * time.Minute)},
			},
			expectedID: []string{"t2", "t1"},
		},
		{
			name: "actor only",
			actor: []admin.ActivityEntry{
				{ID: "a2", Actor: "user-123", Action: "login", Object: "session", CreatedAt: now.Add(-30 * time.Second)},
				{ID: "a1", Actor: "user-123", Action: "viewed", Object: "page:1", CreatedAt: now.Add(-2 * time.Minute)},
			},
			expectedID: []string{"a2", "a1"},
		},
		{
			name: "mixed deduped",
			target: []admin.ActivityEntry{
				{ID: "dup", Actor: "user-123", Action: "updated", Object: "user:user-123", CreatedAt: now.Add(-1 * time.Minute)},
				{ID: "t1", Actor: "admin-2", Action: "created", Object: "user:user-123", CreatedAt: now.Add(-4 * time.Minute)},
			},
			actor: []admin.ActivityEntry{
				{ID: "a2", Actor: "user-123", Action: "login", Object: "session", CreatedAt: now},
				{ID: "dup", Actor: "user-123", Action: "updated", Object: "user:user-123", CreatedAt: now.Add(-1 * time.Minute)},
			},
			expectedID: []string{"a2", "dup", "t1"},
		},
	}

	endpoints := []struct {
		name string
		call func(*UserHandlers, router.Context) error
	}{
		{name: "tab html", call: func(h *UserHandlers, c router.Context) error { return h.TabHTML(c) }},
		{name: "tab json", call: func(h *UserHandlers, c router.Context) error { return h.TabJSON(c) }},
	}

	for _, scenario := range scenarios {
		for _, endpoint := range endpoints {
			t.Run(scenario.name+"_"+endpoint.name, func(t *testing.T) {
				sink := &scenarioActivitySink{
					targetEntries: scenario.target,
					actorEntries:  scenario.actor,
				}
				h, user := setupUserHandlersActivityTest(t, sink)
				ctx := router.NewMockContext()
				ctx.ParamsM["id"] = fmt.Sprint(user["id"])
				ctx.ParamsM["tab"] = "activity"
				ctx.On("Context").Return(withUsersAndActivityClaims())

				if endpoint.name == "tab html" {
					ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
						viewCtx, ok := args.Get(1).(router.ViewContext)
						require.True(t, ok)
						panel, ok := viewCtx["tab_panel"].(map[string]any)
						require.True(t, ok)
						require.Equal(t, scenario.expectedID, activityEntryIDs(t, panel["entries"]))
						require.Equal(t, len(scenario.expectedID) > 0, panel["has_entries"])
					})
				} else {
					ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
						payload, ok := args.Get(1).(map[string]any)
						require.True(t, ok)
						tab, ok := payload["tab"].(map[string]any)
						require.True(t, ok)
						require.Equal(t, scenario.expectedID, activityEntryIDs(t, tab["entries"]))
						require.Equal(t, len(scenario.expectedID) > 0, tab["has_entries"])
					})
				}

				require.NoError(t, endpoint.call(h, ctx))
				require.GreaterOrEqual(t, len(sink.calls), 2, "expected target and actor queries")
				require.Equal(t, "user:"+fmt.Sprint(user["id"]), sink.calls[0].Object)
				require.Equal(t, fmt.Sprint(user["id"]), sink.calls[1].Actor)
			})
		}
	}
}

func TestBuildActivityTabPanelAcceptsNonStringUserID(t *testing.T) {
	sink := &scenarioActivitySink{
		targetEntries: []admin.ActivityEntry{
			{ID: "t1", Actor: "admin-1", Action: "updated", Object: "user:user-123", CreatedAt: time.Now().UTC()},
		},
	}
	h, _ := setupUserHandlersActivityTest(t, sink)
	ctx := router.NewMockContext()
	ctx.On("Context").Return(withUsersAndActivityClaims())

	panel := map[string]any{}
	h.buildActivityTabPanel(ctx, map[string]any{
		"id": nonStringTestID("user-123"),
	}, panel)

	require.Equal(t, true, panel["has_entries"])
	require.Equal(t, []string{"t1"}, activityEntryIDs(t, panel["entries"]))
}

func TestUsersTabsFlowProfileClientAndActivityHybrid(t *testing.T) {
	now := time.Now().UTC()
	sink := &scenarioActivitySink{
		targetEntries: []admin.ActivityEntry{
			{ID: "t1", Actor: "admin-1", Action: "updated", Object: "user:user-123", CreatedAt: now.Add(-2 * time.Minute)},
		},
		actorEntries: []admin.ActivityEntry{
			{ID: "a1", Actor: "user-123", Action: "login", Object: "session", CreatedAt: now},
		},
	}
	h, user := setupUserHandlersProfileActivityTest(t, sink)
	userID := fmt.Sprint(user["id"])

	t.Run("detail route advertises profile client and activity hybrid tabs", func(t *testing.T) {
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = userID
		ctx.QueriesM["tab"] = "profile"
		ctx.On("Context").Return(withUsersClaims())
		ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			viewCtx, ok := args.Get(1).(router.ViewContext)
			require.True(t, ok)
			require.Equal(t, "profile", fmt.Sprint(viewCtx["active_tab"]))

			tabs, ok := viewCtx["tabs"].([]map[string]any)
			require.True(t, ok)
			require.Equal(t, "client", tabRenderMode(t, tabs, "profile"))
			require.Equal(t, "hybrid", tabRenderMode(t, tabs, "activity"))
		})
		require.NoError(t, h.Detail(ctx))
	})

	t.Run("profile client endpoint returns profile widget payload", func(t *testing.T) {
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = userID
		ctx.ParamsM["tab"] = "profile"
		ctx.On("Context").Return(withUsersClaims())
		ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			payload, ok := args.Get(1).(map[string]any)
			require.True(t, ok)
			tab, ok := payload["tab"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, "profile", fmt.Sprint(tab["id"]))

			widgets, ok := tab["widgets"].([]map[string]any)
			require.True(t, ok)
			require.NotEmpty(t, widgets)
			profileWidget := findWidgetByDefinition(t, widgets, helpers.UserProfileWidgetCode)
			data, ok := profileWidget["data"].(map[string]any)
			require.True(t, ok)
			_, hasSections := data["sections"]
			require.True(t, hasSections, "expected sections payload")
			_, hasLegacyValues := data["values"]
			require.False(t, hasLegacyValues, "legacy values payload should be removed")
		})
		require.NoError(t, h.TabJSON(ctx))
	})

	t.Run("activity hybrid endpoint returns entries without degraded fallback state", func(t *testing.T) {
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = userID
		ctx.ParamsM["tab"] = "activity"
		ctx.On("Context").Return(withUsersAndActivityClaims())
		ctx.On("Render", "partials/tab-panel", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			viewCtx, ok := args.Get(1).(router.ViewContext)
			require.True(t, ok)
			tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, "activity", fmt.Sprint(tabPanel["id"]))
			require.Equal(t, true, tabPanel["has_entries"])
			require.Nil(t, tabPanel["unavailable"])
		})
		require.NoError(t, h.TabHTML(ctx))
	})

	require.GreaterOrEqual(t, len(sink.calls), 2, "expected target+actor query flow")
	require.Equal(t, "user:"+userID, sink.calls[0].Object)
	require.Equal(t, userID, sink.calls[1].Actor)
}

func TestUsersDetailsTabRegressionAndToolbarActionsContract(t *testing.T) {
	h, user := setupUserHandlersProfileActivityTest(t, emptyActivitySink{})
	userID := fmt.Sprint(user["id"])

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = userID
	ctx.On("Context").Return(withUsersClaims())
	ctx.On("Render", "resources/users/detail", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		viewCtx, ok := args.Get(1).(router.ViewContext)
		require.True(t, ok)
		require.Equal(t, "details", fmt.Sprint(viewCtx["active_tab"]))

		tabPanel, ok := viewCtx["tab_panel"].(map[string]any)
		require.True(t, ok)
		require.Equal(t, "details", fmt.Sprint(tabPanel["id"]))
		require.Equal(t, string(helpers.TabContentDetails), fmt.Sprint(tabPanel["kind"]))

		fields, ok := viewCtx["fields"].([]map[string]any)
		require.True(t, ok)
		require.Equal(t, []string{"Username", "Email", "Role", "Status", "Created", "Last Login"}, fieldLabels(fields))

		resourceItem, ok := viewCtx["resource_item"].(map[string]any)
		require.True(t, ok)
		actions, ok := resourceItem["actions"].(map[string]string)
		require.True(t, ok)
		require.Contains(t, actions["edit"], "/admin/users/"+userID+"/edit")
		require.Contains(t, actions["delete"], "/admin/users/"+userID+"/delete")
	})
	require.NoError(t, h.Detail(ctx))

	templateData, err := fs.ReadFile(client.Templates(), "resources/users/detail.html")
	require.NoError(t, err)
	template := string(templateData)
	require.Contains(t, template, `function renderWidget(widget)`)
	require.Contains(t, template, `<article class="widget"`)
}

func setupUserHandlersTest(t *testing.T) (*UserHandlers, map[string]any) {
	t.Helper()
	dsn := fmt.Sprintf("file:users_tabs_test_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := setup.SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}
	store, err := stores.NewUserStore(deps)
	if err != nil {
		t.Fatalf("new user store: %v", err)
	}
	store.Teardown()

	user, err := store.Create(context.Background(), map[string]any{
		"username": "tab.user",
		"email":    "tab.user@example.com",
		"role":     "admin",
		"status":   "active",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	cfg := admin.Config{
		BasePath:      "/admin",
		Title:         "Tabs Test",
		DefaultLocale: "en",
	}
	handler := &UserHandlers{
		Store:  store,
		Config: cfg,
		WithNav: func(ctx router.ViewContext, _ *admin.Admin, _ admin.Config, _ string, _ context.Context, _ router.Context) router.ViewContext {
			return ctx
		},
		TabResolver: helpers.TabContentResolverFunc(func(context.Context, string, map[string]any, admin.PanelTab) (helpers.TabContentSpec, error) {
			return helpers.TabContentSpec{Kind: helpers.TabContentDetails}, nil
		}),
		TabMode: helpers.TabRenderModeSelector{Default: helpers.TabRenderModeSSR},
	}
	return handler, user
}

type allowAllTabAuthorizer struct{}

func (allowAllTabAuthorizer) Can(context.Context, string, string) bool { return true }

type nonStringTestID string

func (id nonStringTestID) String() string { return string(id) }

type emptyActivitySink struct{}

func (emptyActivitySink) Record(context.Context, admin.ActivityEntry) error { return nil }
func (emptyActivitySink) List(context.Context, int, ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	return []admin.ActivityEntry{}, nil
}

type failingActivitySink struct{}

func (failingActivitySink) Record(context.Context, admin.ActivityEntry) error { return nil }
func (failingActivitySink) List(context.Context, int, ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	return nil, errors.New("activity backend failure")
}

type timeoutActivitySink struct{}

func (timeoutActivitySink) Record(context.Context, admin.ActivityEntry) error { return nil }
func (timeoutActivitySink) List(context.Context, int, ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	return nil, context.DeadlineExceeded
}

type scenarioActivitySink struct {
	targetEntries []admin.ActivityEntry
	actorEntries  []admin.ActivityEntry
	calls         []admin.ActivityFilter
	callLimits    []int
}

func (s *scenarioActivitySink) Record(context.Context, admin.ActivityEntry) error { return nil }

func (s *scenarioActivitySink) List(_ context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	if len(filters) == 0 {
		return []admin.ActivityEntry{}, nil
	}
	filter := filters[0]
	s.calls = append(s.calls, filter)
	s.callLimits = append(s.callLimits, limit)

	var source []admin.ActivityEntry
	switch {
	case strings.TrimSpace(filter.Object) != "":
		source = s.targetEntries
	case strings.TrimSpace(filter.Actor) != "":
		source = s.actorEntries
	default:
		return []admin.ActivityEntry{}, nil
	}
	if limit > 0 && len(source) > limit {
		source = source[:limit]
	}
	out := make([]admin.ActivityEntry, len(source))
	copy(out, source)
	return out, nil
}

type capturedDurationMetric struct {
	duration time.Duration
	tags     map[string]string
}

type capturedCountMetric struct {
	count int
	tags  map[string]string
}

type capturingUserTabActivityMetrics struct {
	queryDurations []capturedDurationMetric
	resultCounts   []capturedCountMetric
	errorCounts    []map[string]string
}

func (c *capturingUserTabActivityMetrics) ObserveQueryDuration(_ context.Context, duration time.Duration, tags map[string]string) {
	c.queryDurations = append(c.queryDurations, capturedDurationMetric{
		duration: duration,
		tags:     cloneMetricTags(tags),
	})
}

func (c *capturingUserTabActivityMetrics) ObserveResultCount(_ context.Context, count int, tags map[string]string) {
	c.resultCounts = append(c.resultCounts, capturedCountMetric{
		count: count,
		tags:  cloneMetricTags(tags),
	})
}

func (c *capturingUserTabActivityMetrics) IncrementErrorCount(_ context.Context, tags map[string]string) {
	c.errorCounts = append(c.errorCounts, cloneMetricTags(tags))
}

func cloneMetricTags(tags map[string]string) map[string]string {
	out := make(map[string]string, len(tags))
	for key, value := range tags {
		out[key] = value
	}
	return out
}

func activityEntryIDs(t *testing.T, raw any) []string {
	t.Helper()
	entries, ok := raw.([]admin.ActivityEntry)
	require.True(t, ok, "expected []admin.ActivityEntry, got %T", raw)
	ids := make([]string, 0, len(entries))
	for _, entry := range entries {
		ids = append(ids, entry.ID)
	}
	return ids
}

func setupUserHandlersWithRegistryTabs(t *testing.T) (*UserHandlers, map[string]any) {
	t.Helper()
	handler, user := setupUserHandlersTest(t)
	adm, err := admin.New(handler.Config, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllTabAuthorizer{})
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "profile",
		Label:      "Profile",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}
	handler.Admin = adm
	return handler, user
}

func setupUserHandlersActivityTest(t *testing.T, sink admin.ActivitySink) (*UserHandlers, map[string]any) {
	t.Helper()
	handler, user := setupUserHandlersTest(t)
	adm, err := admin.New(handler.Config, admin.Dependencies{
		ActivitySink: sink,
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllTabAuthorizer{})
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}
	handler.Admin = adm
	resolver := helpers.NewTabContentRegistry()
	resolver.Register("users", "details", helpers.TabContentSpec{Kind: helpers.TabContentDetails})
	resolver.Register("users", "activity", helpers.TabContentSpec{
		Kind:     helpers.TabContentDashboard,
		AreaCode: helpers.UserActivityAreaCode,
	})
	handler.TabResolver = resolver
	handler.TabMode = helpers.TabRenderModeSelector{
		Default: helpers.TabRenderModeSSR,
		Overrides: map[string]helpers.TabRenderMode{
			helpers.TabKey("users", "activity"): helpers.TabRenderModeHybrid,
		},
	}
	return handler, user
}

func setupUserHandlersProfileActivityTest(t *testing.T, sink admin.ActivitySink) (*UserHandlers, map[string]any) {
	t.Helper()
	handler, user := setupUserHandlersTest(t)
	adm, err := admin.New(handler.Config, admin.Dependencies{
		ActivitySink: sink,
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllTabAuthorizer{})

	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
	}); err != nil {
		t.Fatalf("register activity tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:         "profile",
		Label:      "Profile",
		Permission: "admin.users.view",
		Scope:      admin.PanelTabScopeDetail,
		Target:     admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
	}); err != nil {
		t.Fatalf("register profile tab: %v", err)
	}

	adm.Dashboard().RegisterArea(admin.WidgetAreaDefinition{
		Code:  helpers.UserProfileAreaCode,
		Name:  "User Profile",
		Scope: helpers.UserDetailAreaScope,
	})
	adm.Dashboard().RegisterProvider(admin.DashboardProviderSpec{
		Code:        helpers.UserProfileWidgetCode,
		Name:        helpers.UserProfileWidgetLabel,
		DefaultArea: helpers.UserProfileAreaCode,
		Handler: func(_ admin.AdminContext, _ map[string]any) (map[string]any, error) {
			return map[string]any{
				"values": map[string]any{
					"Username": "",
					"Email":    "",
					"Role":     "",
					"Status":   "",
					"Created":  "",
				},
			}, nil
		},
	})

	handler.Admin = adm
	resolver := helpers.NewTabContentRegistry()
	resolver.Register("users", "details", helpers.TabContentSpec{Kind: helpers.TabContentDetails})
	resolver.Register("users", "profile", helpers.TabContentSpec{
		Kind:     helpers.TabContentCMS,
		AreaCode: helpers.UserProfileAreaCode,
	})
	resolver.Register("users", "activity", helpers.TabContentSpec{
		Kind:     helpers.TabContentDashboard,
		AreaCode: helpers.UserActivityAreaCode,
	})
	handler.TabResolver = resolver
	handler.TabMode = helpers.TabRenderModeSelector{
		Default: helpers.TabRenderModeSSR,
		Overrides: map[string]helpers.TabRenderMode{
			helpers.TabKey("users", "profile"):  helpers.TabRenderModeClient,
			helpers.TabKey("users", "activity"): helpers.TabRenderModeHybrid,
		},
	}

	return handler, user
}

func newTabsTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	tabs := []map[string]any{
		{
			"id":    "details",
			"label": "Details",
			"scope": "detail",
			"target": map[string]any{
				"type":  "panel",
				"panel": "users",
			},
		},
		{
			"id":    "activity",
			"label": "Activity",
			"scope": "detail",
			"target": map[string]any{
				"type": "path",
				"path": "/admin/activity",
			},
		},
		{
			"id":    "profile",
			"label": "Profile",
			"scope": "detail",
			"target": map[string]any{
				"type":  "panel",
				"panel": "user-profiles",
			},
		},
	}
	payload, err := json.Marshal(map[string]any{
		"schema": map[string]any{
			"tabs": tabs,
		},
	})
	if err != nil {
		t.Fatalf("encode tabs payload: %v", err)
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/admin/api/users/") {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(payload)
	}))
}

func serverHost(t *testing.T, server *httptest.Server) string {
	t.Helper()
	parsed, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse server url: %v", err)
	}
	return parsed.Host
}

func serverScheme(t *testing.T, server *httptest.Server) string {
	t.Helper()
	parsed, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse server url: %v", err)
	}
	return parsed.Scheme
}

func withUsersClaims() context.Context {
	claims := &authlib.JWTClaims{
		UserRole: "",
		Resources: map[string]string{
			"admin.users": string(authlib.RoleOwner),
		},
	}
	return authlib.WithClaimsContext(context.Background(), claims)
}

func withUsersAndActivityClaims() context.Context {
	claims := &authlib.JWTClaims{
		UserRole: "",
		Resources: map[string]string{
			"admin.users":         string(authlib.RoleOwner),
			"admin.activity.view": string(authlib.RoleOwner),
		},
	}
	return authlib.WithClaimsContext(context.Background(), claims)
}

func withActivityClaimsOnly() context.Context {
	claims := &authlib.JWTClaims{
		UserRole: "",
		Resources: map[string]string{
			"admin.activity.view": string(authlib.RoleOwner),
		},
	}
	return authlib.WithClaimsContext(context.Background(), claims)
}

func withNoResourceClaims() context.Context {
	claims := &authlib.JWTClaims{
		UserRole:  "",
		Resources: map[string]string{},
	}
	return authlib.WithClaimsContext(context.Background(), claims)
}

func tabRenderMode(t *testing.T, tabs []map[string]any, id string) string {
	t.Helper()
	for _, tab := range tabs {
		if fmt.Sprint(tab["id"]) == id {
			return fmt.Sprint(tab["render_mode"])
		}
	}
	t.Fatalf("tab %q not found", id)
	return ""
}

func findWidgetByDefinition(t *testing.T, widgets []map[string]any, definition string) map[string]any {
	t.Helper()
	for _, widget := range widgets {
		if fmt.Sprint(widget["definition"]) == definition {
			return widget
		}
	}
	t.Fatalf("widget with definition %q not found", definition)
	return nil
}

func fieldLabels(fields []map[string]any) []string {
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		out = append(out, fmt.Sprint(field["label"]))
	}
	return out
}
