package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestDevServeEquivalentTranslationRuntimeContracts(t *testing.T) {
	t.Setenv("ADMIN_TRANSLATION_PROFILE", "full")
	t.Setenv("ADMIN_TRANSLATION_EXCHANGE", "false")
	t.Setenv("USE_PERSISTENT_CMS", "true")
	t.Setenv("ADMIN_SEEDS", "true")
	t.Setenv("ADMIN_ASSETS_DEBUG", "1")
	t.Setenv("ADMIN_ASSETS_DIR", filepath.Join("pkg", "client", "assets"))

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	queueRepo := coreadmin.NewInMemoryTranslationAssignmentRepository()
	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc)
	exchangeStore := newExampleTranslationExchangeStore(func() coreadmin.CMSContentService {
		return contentSvc
	})

	cfg := quickstart.NewAdminConfig("/admin", "Translation Runtime Harness", "en")
	cfg.CMS = cmsOpts

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdapterFlags(quickstart.AdapterFlags{
			UsePersistentCMS:   false,
			UseGoOptions:       false,
			UseGoUsersActivity: false,
		}),
		quickstart.WithTranslationProductConfig(
			buildTranslationProductConfig(resolveTranslationProfile(), exchangeStore, queueRepo),
		),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
	)
	require.NoError(t, err)
	adm.WithAuth(nil, nil)
	adm.WithAuthorizer(translationRuntimeHarnessAllowAllAuthorizer{})

	require.NoError(t, seedExampleTranslationQueueFixture(ctx, queueRepo, contentSvc, "runtime-user"))

	server, r := quickstart.NewFiberServer(
		nil,
		cfg,
		adm,
		true,
		quickstart.WithFiberLogger(false),
		quickstart.WithFiberAdapterConfig(func(adapterCfg *router.FiberAdapterConfig) {
			if adapterCfg == nil {
				return
			}
			conflictPolicy := router.HTTPRouterConflictLogAndContinue
			adapterCfg.ConflictPolicy = &conflictPolicy
			adapterCfg.StrictRoutes = false
			adapterCfg.PathConflictMode = router.PathConflictModePreferStatic
		}),
	)
	require.NoError(t, adm.Initialize(r))
	server.Init()
	app := server.WrappedRouter()
	require.True(t, featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationQueue)), "translation queue feature must be enabled for full profile harness")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/my-work")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/queue")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, panelCollectionPath("translations"))

	myWorkStatus, myWorkPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/my-work?page=1&per_page=50",
		nil,
		map[string]string{"X-User-ID": "runtime-user"},
	)
	require.Equal(t, http.StatusOK, myWorkStatus, "my-work payload=%+v", myWorkPayload)
	myWork := unwrapResponseDataMap(myWorkPayload)
	require.Equal(t, "my_work", strings.ToLower(strings.TrimSpace(fmt.Sprint(myWork["scope"]))))
	require.GreaterOrEqual(t, intFromAny(myWork["total"]), 1)

	queueStatus, queuePayload := doAdminJSONRequestFiber(t, app, http.MethodGet, "/admin/api/translations/queue?page=1&per_page=100", nil)
	require.Equal(t, http.StatusOK, queueStatus, "queue payload=%+v", queuePayload)
	queue := unwrapResponseDataMap(queuePayload)
	require.Equal(t, "queue", strings.ToLower(strings.TrimSpace(fmt.Sprint(queue["scope"]))))
	require.GreaterOrEqual(t, intFromAny(queue["total"]), 1)

	panelListPath := fmt.Sprintf("%s?page=1&per_page=200", panelCollectionPath("translations"))
	panelStatus, panelPayload := doAdminJSONRequestFiber(t, app, http.MethodGet, panelListPath, nil)
	require.Equal(t, http.StatusOK, panelStatus, "translations panel payload=%+v", panelPayload)
	panelData := unwrapResponseDataMap(panelPayload)
	panelRecords := extractListRecords(panelData)
	require.NotEmpty(t, panelRecords, "expected seeded assignments in translations panel response")

	hasPagesAssignment := false
	hasPostsAssignment := false
	for _, item := range panelRecords {
		row, _ := item.(map[string]any)
		entityType := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["entity_type"])))
		if entityType == "pages" {
			hasPagesAssignment = true
		}
		if entityType == "posts" {
			hasPostsAssignment = true
		}
	}
	require.True(t, hasPagesAssignment, "expected translations panel response to include pages assignments")
	require.True(t, hasPostsAssignment, "expected translations panel response to include posts assignments")
}

func doAdminJSONRequestWithHeaders(
	t *testing.T,
	app *fiber.App,
	method, path string,
	payload map[string]any,
	headers map[string]string,
) (int, map[string]any) {
	t.Helper()

	var body *bytes.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		require.NoError(t, err, "marshal payload")
		body = bytes.NewReader(raw)
	} else {
		body = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, body)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err, "execute %s %s", method, path)
	defer func() {
		_ = res.Body.Close()
	}()

	decoded := map[string]any{}
	bodyBytes, readErr := io.ReadAll(res.Body)
	require.NoError(t, readErr, "read response body")
	if strings.TrimSpace(string(bodyBytes)) != "" {
		require.NoError(t, json.Unmarshal(bodyBytes, &decoded), "decode response body")
	}
	return res.StatusCode, decoded
}

func doAdminJSONRequestFiber(
	t *testing.T,
	app *fiber.App,
	method, path string,
	payload map[string]any,
) (int, map[string]any) {
	t.Helper()
	return doAdminJSONRequestWithHeaders(t, app, method, path, payload, nil)
}

func unwrapResponseDataMap(payload map[string]any) map[string]any {
	if payload == nil {
		return map[string]any{}
	}
	if data, ok := payload["data"].(map[string]any); ok && len(data) > 0 {
		return data
	}
	return payload
}

func intFromAny(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	default:
		parsed := strings.TrimSpace(fmt.Sprint(value))
		if parsed == "" || parsed == "<nil>" {
			return 0
		}
		var out int
		if _, err := fmt.Sscanf(parsed, "%d", &out); err == nil {
			return out
		}
		return 0
	}
}

func assertRouteRegistered(t *testing.T, routes []router.RouteDefinition, method, path string) {
	t.Helper()
	method = strings.ToUpper(strings.TrimSpace(method))
	path = strings.TrimSpace(path)
	for _, route := range routes {
		if strings.EqualFold(string(route.Method), method) && strings.TrimSpace(route.Path) == path {
			return
		}
	}
	available := make([]string, 0, len(routes))
	for _, route := range routes {
		available = append(available, fmt.Sprintf("%s %s", route.Method, route.Path))
	}
	require.Failf(t, "route not registered", "missing %s %s; registered routes: %v", method, path, available)
}

type translationRuntimeHarnessAllowAllAuthorizer struct{}

func (translationRuntimeHarnessAllowAllAuthorizer) Can(context.Context, string, string) bool {
	return true
}
