package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestDevServeEquivalentTranslationRuntimeContracts(t *testing.T) {
	require.NoError(t, commandregistry.Stop(context.Background()))
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	translationDB, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	require.NotNil(t, translationDB)

	queueRepo := coreadmin.NewBunTranslationAssignmentRepository(translationDB)
	familyStore := coreadmin.NewBunTranslationFamilyStore(translationDB)
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
		quickstart.WithAdminDependencies(coreadmin.Dependencies{
			Authorizer:             translationRuntimeHarnessAllowAllAuthorizer{},
			TranslationFamilyStore: familyStore,
		}),
		quickstart.WithAdapterFlags(quickstart.AdapterFlags{
			UsePersistentCMS:   false,
			UseGoOptions:       false,
			UseGoUsersActivity: false,
		}),
		quickstart.WithTranslationProductConfig(
			buildTranslationProductConfig(
				resolveTranslationProfile("full"),
				exchangeStore,
				queueRepo,
				appcfg.TranslationConfig{
					Profile:  "full",
					Exchange: new(false),
					Queue:    new(true),
				},
			),
		),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationPolicyServices(quickstart.TranslationPolicyServices{
			Pages:   &policyRecordingChecker{},
			Content: &policyRecordingChecker{},
		}),
	)
	require.NoError(t, err)

	const tenantID = "tenant-demo"
	const orgID = "org-demo"
	const scopeQuery = "tenant_id=tenant-demo&org_id=org-demo"
	authenticator := translationRuntimeHarnessPassthroughAuthenticator{
		tenantID: tenantID,
		orgID:    orgID,
	}
	adm.WithAuth(authenticator, nil)
	adm.WithAuthorizer(translationRuntimeHarnessAllowAllAuthorizer{})

	require.NoError(t, seedExampleTranslationQueueFixtureWithFamilySync(
		ctx,
		queueRepo,
		contentSvc,
		tenantID,
		orgID,
		func(ctx context.Context) error {
			return coreadmin.SyncTranslationFamilyStore(ctx, adm, defaultSiteContentChannel)
		},
		"reviewer-qa",
		"runtime-user",
	))
	require.NoError(t, coreadmin.SyncTranslationFamilyStore(ctx, adm, defaultSiteContentChannel))
	seededScopedAssignments, seededScopedTotal, err := queueRepo.List(ctx, coreadmin.ListOptions{
		Page:    1,
		PerPage: 100,
		Filters: map[string]any{
			coreadmin.ScopeTenantIDKey: tenantID,
			coreadmin.ScopeOrgIDKey:    orgID,
		},
	})
	require.NoError(t, err)
	require.Positive(t, seededScopedTotal, "expected scoped seeded assignment total")
	require.NotEmpty(t, seededScopedAssignments, "expected scoped seeded assignments")

	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(
			quickstart.WithTemplateURLResolver(adm.URLs()),
			quickstart.WithTemplateBasePath(cfg.BasePath),
			quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
		)),
	)
	require.NoError(t, err)

	server, r := quickstart.NewFiberServer(
		viewEngine,
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
	diskAssetsDir := quickstart.ResolveDiskAssetsDir(
		"output.css",
		filepath.Join("..", "..", "pkg", "client", "assets"),
		filepath.Join("pkg", "client", "assets"),
		"assets",
	)
	quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(diskAssetsDir))
	require.NoError(t, adm.Initialize(r))
	require.NoError(t, quickstart.RegisterAdminUIRoutes(
		r,
		cfg,
		adm,
		authenticator,
		quickstart.WithUIDashboardRoute(false),
		quickstart.WithUINotificationsRoute(false),
		quickstart.WithUIActivityRoute(false),
		quickstart.WithUIFeatureFlagsRoute(false),
		quickstart.WithUITranslationDashboardRoute(true),
		quickstart.WithUITranslationExchangeRoute(false),
	))
	server.Init()
	app := server.WrappedRouter()
	require.True(t, featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationQueue)), "translation queue feature must be enabled for full profile harness")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/my-work")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/queue")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/assignments")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/dashboard")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/api/translations/families")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/translations/dashboard")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/translations/queue")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, "/admin/translations/families")
	assertRouteRegistered(t, r.Routes(), http.MethodGet, panelCollectionPath("translations"))

	myWorkStatus, myWorkPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/my-work?page=1&per_page=50&"+scopeQuery,
		nil,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, myWorkStatus, "my-work payload=%+v", myWorkPayload)
	myWork := unwrapResponseDataMap(myWorkPayload)
	require.Equal(t, "my_work", strings.ToLower(strings.TrimSpace(fmt.Sprint(myWork["scope"]))))
	require.GreaterOrEqual(t, intFromAny(myWork["total"]), 1)

	queueStatus, queuePayload := doAdminJSONRequestFiber(t, app, http.MethodGet, "/admin/api/translations/queue?page=1&per_page=100&"+scopeQuery, nil)
	require.Equal(t, http.StatusOK, queueStatus, "queue payload=%+v", queuePayload)
	queue := unwrapResponseDataMap(queuePayload)
	require.Equal(t, "queue", strings.ToLower(strings.TrimSpace(fmt.Sprint(queue["scope"]))))
	require.GreaterOrEqual(t, intFromAny(queue["total"]), 1)

	assignmentsStatus, assignmentsPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/assignments?page=1&per_page=100&"+scopeQuery,
		nil,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, assignmentsStatus, "assignments payload=%+v", assignmentsPayload)
	require.NotEmpty(t, extractListRecords(assignmentsPayload), "expected seeded assignments API rows")

	dashboardStatus, dashboardPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/dashboard?"+scopeQuery,
		nil,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, dashboardStatus, "dashboard payload=%+v", dashboardPayload)
	dashboard := unwrapResponseDataMap(dashboardPayload)
	dashboardCards, _ := dashboard["cards"].([]any)
	require.NotEmpty(t, dashboardCards, "expected seeded dashboard cards")

	familyStatus, familyPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/families?page=1&per_page=100&"+scopeQuery,
		nil,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, familyStatus, "families payload=%+v", familyPayload)
	families := unwrapResponseDataMap(familyPayload)
	familyRows := extractListRecords(families)
	if len(familyRows) == 0 {
		familyRows = listFromAny(families["families"])
	}
	require.NotEmpty(t, familyRows, "expected seeded translation families")

	panelListPath := fmt.Sprintf("%s?page=1&per_page=200&%s", panelCollectionPath("translations"), scopeQuery)
	panelStatus, panelPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		panelListPath,
		nil,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, panelStatus, "translations panel payload=%+v", panelPayload)
	panelData := unwrapResponseDataMap(panelPayload)
	panelRecords := extractListRecords(panelData)
	require.NotEmpty(t, panelRecords, "expected seeded assignments in translations panel response")

	hasPagesAssignment := false
	for _, item := range panelRecords {
		row, _ := item.(map[string]any)
		entityType := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["entity_type"])))
		if entityType == "pages" {
			hasPagesAssignment = true
		}
	}
	require.True(t, hasPagesAssignment, "expected translations panel response to include pages assignments")

	dashboardHTMLStatus, dashboardHTML := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/dashboard?"+scopeQuery,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, dashboardHTMLStatus, "dashboard html=%s", dashboardHTML)
	require.NotContains(t, dashboardHTML, "/admin/login", "dashboard must not render a login redirect")
	require.Contains(t, dashboardHTML, `data-translation-dashboard-ssr="true"`)
	require.Contains(t, dashboardHTML, `data-metric-card=`)

	queueHTMLStatus, queueHTML := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/queue?"+scopeQuery,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, queueHTMLStatus, "queue html=%s", queueHTML)
	require.NotContains(t, queueHTML, "/admin/login", "queue must not render a login redirect")
	require.Contains(t, queueHTML, `data-translation-queue-ssr="true"`)
	require.True(
		t,
		strings.Contains(queueHTML, `data-translation-row-id=`) || strings.Contains(queueHTML, `data-translation-row-type="family"`),
		"expected queue SSR to render seeded assignment or grouped family rows, got html=%s",
		queueHTML,
	)
	authHeaders := map[string]string{"X-User-ID": "reviewer-qa"}
	assertQueueSSRMatchesAssignmentAPI(
		t,
		app,
		"page=1&per_page=25&priority=urgent&locale=es&sort=priority&order=desc&"+scopeQuery,
		authHeaders,
	)
	assertGroupedQueueSSRMatchesAssignmentAPI(
		t,
		app,
		"page=1&per_page=25&group_by=family_id&group_strategy=server_family&priority=high&locale=fr&sort=priority&order=desc&"+scopeQuery,
		authHeaders,
	)
	assertFamilyAssignmentsSSRPathFromGroupedQueue(
		t,
		app,
		"page=1&per_page=25&group_by=family_id&group_strategy=server_family&priority=high&locale=fr&sort=priority&order=desc&"+scopeQuery,
		authHeaders,
	)

	familiesHTMLStatus, familiesHTML := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/families?"+scopeQuery,
		map[string]string{"X-User-ID": "reviewer-qa"},
	)
	require.Equal(t, http.StatusOK, familiesHTMLStatus, "families html=%s", familiesHTML)
	require.NotContains(t, familiesHTML, "/admin/login", "families must not render a login redirect")
	require.Contains(t, familiesHTML, `data-translation-family-list-ssr="true"`)
	require.Contains(t, familiesHTML, `data-translation-row-id=`)

	detailFamilyID, detailHTML := requireEnhancedFamilyDetailHTML(t, app, familyRows, scopeQuery, authHeaders)
	require.Contains(t, detailHTML, `data-translation-family-detail-ssr="true"`)
	require.Contains(t, detailHTML, `assets/dist/translation-family/index.js`)
	require.Contains(t, detailHTML, `data-enhance-action="true"`)
	require.Contains(t, detailHTML, `method="post"`)
	require.Contains(t, detailHTML, `data-family-locale-coverage`)
	require.Contains(t, detailHTML, `data-family-assignments`)
	require.Contains(t, detailHTML, `data-family-publish-gate`)
	require.Contains(t, detailHTML, `data-family-activity`)
	assertEnhancedFamilyFormRedirects(t, app, detailHTML, detailFamilyID, authHeaders)
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

	req := httptest.NewRequestWithContext(context.Background(), method, path, body)
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

func doAdminHTMLRequestWithHeaders(
	t *testing.T,
	app *fiber.App,
	method, path string,
	headers map[string]string,
) (int, string) {
	t.Helper()

	req := httptest.NewRequestWithContext(context.Background(), method, path, nil)
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err, "execute %s %s", method, path)
	defer func() {
		_ = res.Body.Close()
	}()
	bodyBytes, readErr := io.ReadAll(res.Body)
	require.NoError(t, readErr, "read response body")
	return res.StatusCode, string(bodyBytes)
}

func requireEnhancedFamilyDetailHTML(
	t *testing.T,
	app *fiber.App,
	familyRows []any,
	scopeQuery string,
	headers map[string]string,
) (string, string) {
	t.Helper()
	for _, item := range familyRows {
		row, _ := item.(map[string]any)
		familyID := firstNonEmptyRuntimeString(row["family_id"], row["id"])
		if familyID == "" {
			continue
		}
		status, body := doAdminHTMLRequestWithHeaders(
			t,
			app,
			http.MethodGet,
			"/admin/translations/families/"+url.PathEscape(familyID)+"?"+scopeQuery,
			headers,
		)
		require.Equal(t, http.StatusOK, status, "family detail html=%s", body)
		require.NotContains(t, body, "/admin/login", "family detail must not render a login redirect")
		if strings.Contains(body, `data-enhance-action="true"`) {
			return familyID, body
		}
	}
	require.Fail(t, "expected at least one seeded family detail with enhanced assignment forms")
	return "", ""
}

func assertEnhancedFamilyFormRedirects(
	t *testing.T,
	app *fiber.App,
	detailHTML string,
	familyID string,
	headers map[string]string,
) {
	t.Helper()
	action, fields := firstEnhancedAssignmentForm(t, detailHTML)
	form := url.Values{}
	for key, value := range fields {
		form.Set(key, value)
	}
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, action, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "text/html")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err, "execute fallback family assignment form")
	defer func() {
		_ = res.Body.Close()
	}()
	bodyBytes, readErr := io.ReadAll(res.Body)
	require.NoError(t, readErr, "read fallback assignment body")
	require.Equal(t, http.StatusSeeOther, res.StatusCode, "body=%s", string(bodyBytes))
	require.Contains(t, res.Header.Get("Location"), "/admin/translations/families/"+familyID)
	require.Equal(t, "success", res.Header.Get("X-GoAdmin-Flash-Type"))
	require.Contains(t, res.Header.Get("X-GoAdmin-Flash-Message"), "Assignment updated.")
}

func firstEnhancedAssignmentForm(t *testing.T, detailHTML string) (string, map[string]string) {
	t.Helper()
	formRe := regexp.MustCompile(`(?s)<form\b[^>]*\baction="([^"]+)"[^>]*\bdata-enhance-action="true"[^>]*>(.*?)</form>`)
	match := formRe.FindStringSubmatch(detailHTML)
	require.Len(t, match, 3, "expected enhanced assignment form in detail html")
	action := html.UnescapeString(strings.TrimSpace(match[1]))
	require.NotEmpty(t, action, "expected enhanced assignment form action")
	fields := map[string]string{}
	inputRe := regexp.MustCompile(`<input\b[^>]*\bname="([^"]+)"[^>]*\bvalue="([^"]*)"[^>]*>`)
	for _, input := range inputRe.FindAllStringSubmatch(match[2], -1) {
		if len(input) != 3 {
			continue
		}
		name := html.UnescapeString(strings.TrimSpace(input[1]))
		if name == "" {
			continue
		}
		fields[name] = html.UnescapeString(input[2])
	}
	require.NotEmpty(t, fields["target_locale"], "expected target_locale hidden input")
	require.NotEmpty(t, fields["work_scope"], "expected work_scope hidden input")
	return action, fields
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

func listFromAny(value any) []any {
	switch typed := value.(type) {
	case []any:
		return typed
	default:
		return nil
	}
}

func assertQueueSSRMatchesAssignmentAPI(t *testing.T, app *fiber.App, query string, headers map[string]string) {
	t.Helper()
	apiStatus, apiPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/assignments?"+query,
		nil,
		headers,
	)
	require.Equal(t, http.StatusOK, apiStatus, "assignments payload=%+v", apiPayload)
	apiIDs := assignmentIDsFromRecords(extractListRecords(apiPayload))
	require.NotEmpty(t, apiIDs, "expected filtered assignment API rows for query %q", query)

	htmlStatus, html := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/queue?"+query,
		headers,
	)
	require.Equal(t, http.StatusOK, htmlStatus, "queue html=%s", html)
	require.NotContains(t, html, "/admin/login", "queue must not render a login redirect")
	require.Contains(t, html, `data-translation-queue-ssr="true"`)
	require.Equal(t, apiIDs, dataAttributeValuesOnTag(html, "tr", "data-translation-row-id"), "queue SSR rows must match assignment API rows for query %q", query)
}

func assertGroupedQueueSSRMatchesAssignmentAPI(t *testing.T, app *fiber.App, query string, headers map[string]string) {
	t.Helper()
	apiStatus, apiPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/assignments?"+query,
		nil,
		headers,
	)
	require.Equal(t, http.StatusOK, apiStatus, "grouped assignments payload=%+v", apiPayload)
	apiFamilyIDs := familyIDsFromRecords(extractListRecords(apiPayload))
	require.NotEmpty(t, apiFamilyIDs, "expected grouped assignment API rows for query %q", query)

	htmlStatus, html := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/queue?"+query,
		headers,
	)
	require.Equal(t, http.StatusOK, htmlStatus, "grouped queue html=%s", html)
	require.NotContains(t, html, "/admin/login", "queue must not render a login redirect")
	require.Contains(t, html, `data-translation-row-type="family"`)
	require.Equal(t, apiFamilyIDs, dataAttributeValuesOnTag(html, "tr", "data-translation-family-id"), "grouped queue SSR rows must match assignment API rows for query %q", query)
}

func assertFamilyAssignmentsSSRPathFromGroupedQueue(t *testing.T, app *fiber.App, query string, headers map[string]string) {
	t.Helper()
	apiStatus, apiPayload := doAdminJSONRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/api/translations/assignments?"+query,
		nil,
		headers,
	)
	require.Equal(t, http.StatusOK, apiStatus, "grouped assignments payload=%+v", apiPayload)
	apiFamilyIDs := familyIDsFromRecords(extractListRecords(apiPayload))
	require.NotEmpty(t, apiFamilyIDs, "expected grouped assignment API rows for query %q", query)

	familyID := apiFamilyIDs[0]
	uiPath := "/admin/translations/families/" + url.PathEscape(familyID) + "/assignments"
	apiPath := "/admin/api/translations/families/" + url.PathEscape(familyID) + "/assignments"
	queueStatus, queueHTML := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/translations/queue?"+query,
		headers,
	)
	require.Equal(t, http.StatusOK, queueStatus, "grouped queue html=%s", queueHTML)
	require.Contains(t, queueHTML, `href="`+uiPath, "grouped queue must link family rows to the SSR assignments UI")
	require.NotContains(t, queueHTML, `href="`+apiPath, "grouped queue must not expose the JSON expansion API as a navigation href")

	pageStatus, pageHTML := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		uiPath+"?"+query,
		headers,
	)
	require.Equal(t, http.StatusOK, pageStatus, "family assignments html=%s", pageHTML)
	require.NotContains(t, pageHTML, "/admin/login", "family assignments must not render a login redirect")
	require.NotRegexp(t, `^\s*\{`, pageHTML, "family assignments route must render HTML, not raw JSON")
	require.Contains(t, pageHTML, `data-translation-family-assignments-ssr="true"`)
	require.Contains(t, pageHTML, `data-translation-row-id=`, "family assignments page must render seeded assignment rows")
	require.Contains(t, pageHTML, `href="/admin/translations/assignments/`, "family assignments page must link rows to the SSR editor")
	require.Contains(t, pageHTML, `assets/dist/translation-actions/assignment-row-actions.js`, "family assignments page must include the assignment action enhancement")
	require.NotContains(t, pageHTML, `assets/dist/translation-queue/index.js`, "family assignments page should not load the full queue bundle")
	require.Contains(t, pageHTML, `data-action-endpoint="/admin/api/translations/assignments`, "family assignments page must expose the assignment action endpoint")
	require.Contains(t, pageHTML, `tenant_id=tenant-demo`, "family assignments page must preserve tenant query state")
	require.Contains(t, pageHTML, `org_id=org-demo`, "family assignments page must preserve org query state")

	assetStatus, assetBody := doAdminHTMLRequestWithHeaders(
		t,
		app,
		http.MethodGet,
		"/admin/assets/dist/translation-actions/assignment-row-actions.js",
		headers,
	)
	require.Equal(t, http.StatusOK, assetStatus, "assignment row action asset body=%s", assetBody)
	require.NotEmpty(t, strings.TrimSpace(assetBody), "assignment row action asset must not be empty")
}

func assignmentIDsFromRecords(records []any) []string {
	out := make([]string, 0, len(records))
	for _, item := range records {
		row, _ := item.(map[string]any)
		id := firstNonEmptyRuntimeString(row["assignment_id"], row["id"])
		if id != "" {
			out = append(out, id)
		}
	}
	return out
}

func familyIDsFromRecords(records []any) []string {
	out := make([]string, 0, len(records))
	for _, item := range records {
		row, _ := item.(map[string]any)
		id := firstNonEmptyRuntimeString(row["family_id"], row["id"])
		if id != "" {
			out = append(out, id)
		}
	}
	return out
}

func dataAttributeValuesOnTag(html, tag, attr string) []string {
	tag = regexp.QuoteMeta(strings.TrimSpace(tag))
	attr = regexp.QuoteMeta(strings.TrimSpace(attr))
	re := regexp.MustCompile(`<` + tag + `\b[^>]*` + attr + `="([^"]*)"`)
	matches := re.FindAllStringSubmatch(html, -1)
	out := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		if value := strings.TrimSpace(match[1]); value != "" {
			out = append(out, value)
		}
	}
	return out
}

func firstNonEmptyRuntimeString(values ...any) string {
	for _, value := range values {
		text := strings.TrimSpace(fmt.Sprint(value))
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
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

type translationRuntimeHarnessPassthroughAuthenticator struct {
	tenantID string
	orgID    string
}

func (a translationRuntimeHarnessPassthroughAuthenticator) Wrap(c router.Context) error {
	if c == nil {
		return nil
	}
	actorID := strings.TrimSpace(c.Header("X-User-ID"))
	if actorID == "" {
		actorID = "runtime-user"
	}
	c.SetContext(auth.WithActorContext(c.Context(), &auth.ActorContext{
		ActorID:        actorID,
		Subject:        actorID,
		TenantID:       strings.TrimSpace(a.tenantID),
		OrganizationID: strings.TrimSpace(a.orgID),
		Metadata: map[string]any{
			coreadmin.ScopeTenantIDKey:       strings.TrimSpace(a.tenantID),
			coreadmin.ScopeOrganizationIDKey: strings.TrimSpace(a.orgID),
			coreadmin.ScopeOrgIDKey:          strings.TrimSpace(a.orgID),
		},
	}))
	return nil
}

func (a translationRuntimeHarnessPassthroughAuthenticator) WrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return func(router.Context) error { return nil }
	}
	return func(c router.Context) error {
		if err := a.Wrap(c); err != nil {
			return err
		}
		return handler(c)
	}
}
