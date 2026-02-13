package main

import (
	"context"
	"fmt"
	"io"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

type translationUIFixture struct {
	handler     *fiber.App
	fallbackID  string
	esVariantID string
}

func TestContentEntryEditRendersFallbackGuardForMissingRequestedLocale(t *testing.T) {
	fx := newTranslationUIFixture(t)

	status, body := doUIRequest(t, fx.handler, fiber.MethodGet, fmt.Sprintf("/admin/content/pages/%s/edit?locale=fr", fx.fallbackID))
	require.Equal(t, fiber.StatusOK, status)
	require.Contains(t, body, `translation-summary`)
	require.Contains(t, body, "data-fallback-mode=\"true\"\n     data-requested-locale=\"fr\"")
	require.Contains(t, body, `Viewing fallback content`)
	require.Contains(t, body, `data-requested-locale="fr"`)
	require.Contains(t, body, `Editing is disabled until you create the missing translation.`)
	require.Contains(t, body, `Create FR`)
	require.Contains(t, body, `Missing`)
	require.Contains(t, body, `Missing Translations`)

	status, body = doUIRequest(t, fx.handler, fiber.MethodGet, fmt.Sprintf("/admin/content/pages/%s/edit?locale=es", fx.esVariantID))
	require.Equal(t, fiber.StatusOK, status)
	require.Contains(t, body, `translation-summary`)
	require.NotContains(t, body, `Viewing fallback content`)
}

func TestContentEntryDetailRendersTranslationSummaryForFallbackLocale(t *testing.T) {
	fx := newTranslationUIFixture(t)

	status, body := doUIRequest(t, fx.handler, fiber.MethodGet, fmt.Sprintf("/admin/content/pages/%s?locale=fr", fx.fallbackID))
	require.Equal(t, fiber.StatusOK, status)
	require.Contains(t, body, `translation-summary`)
	require.Contains(t, body, `Viewing fallback content`)
	require.Contains(t, body, `Locale`)
	require.Contains(t, body, `Available`)
	require.Contains(t, body, `Missing`)
	require.Contains(t, body, `Missing Translations`)
}

func TestContentEntryEditBlocksFallbackSaveButAllowsExistingLocaleSave(t *testing.T) {
	fx := newTranslationUIFixture(t)

	blockedStatus, blockedBody := doUIFormRequest(t, fx.handler, fiber.MethodPost, fmt.Sprintf("/admin/content/pages/%s?locale=fr", fx.fallbackID), url.Values{
		"title":  {"Fallback page blocked update"},
		"slug":   {"translation-missing-fr"},
		"path":   {"/translation-missing-fr"},
		"status": {"draft"},
		"locale": {"fr"},
	})
	require.Equal(t, fiber.StatusConflict, blockedStatus)
	require.Contains(t, blockedBody, `TRANSLATION_FALLBACK_EDIT_BLOCKED`)

	allowedStatus, _ := doUIFormRequest(t, fx.handler, fiber.MethodPost, fmt.Sprintf("/admin/content/pages/%s?locale=es", fx.esVariantID), url.Values{
		"title":  {"Spanish translation update"},
		"slug":   {"translation-missing-fr-es"},
		"path":   {"/translation-missing-fr-es"},
		"status": {"draft"},
		"locale": {"es"},
	})
	require.Equal(t, fiber.StatusFound, allowedStatus)
}

func newTranslationUIFixture(t *testing.T) translationUIFixture {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", normalizedTestDSNName(t.Name()))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err, "setup persistent cms")

	_, err = stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err, "setup content database")

	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc, "content service should be configured")

	pageStore := stores.NewCMSPageStore(contentSvc, "en")
	require.NotNil(t, pageStore, "page store should be configured")

	cfg := coreadmin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Translation UI Test",
	}
	adm, err := coreadmin.New(cfg, coreadmin.Dependencies{
		CMSContainer: cmsOpts.Container,
		FeatureGate:  alwaysOnFeatureGate{},
	})
	require.NoError(t, err, "create admin")

	_, err = adm.RegisterPanel("pages", newTranslationUITestPagesPanel(pageStore))
	require.NoError(t, err, "register pages panel")

	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewBasePath(cfg.BasePath),
		quickstart.WithViewURLResolver(adm.URLs()),
	)
	require.NoError(t, err, "create view engine")

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
	require.NotNil(t, server)
	require.NoError(
		t,
		quickstart.RegisterContentEntryUIRoutes(
			r,
			cfg,
			adm,
			nil,
			quickstart.WithContentEntryUITemplateFS(client.FS()),
			quickstart.WithContentEntryRecommendedDefaults(),
		),
		"register content ui routes",
	)

	server.Init()

	fallbackID := findPageIDBySlug(t, contentSvc, "translation-missing-fr")
	require.NotEmpty(t, fallbackID, "expected seeded fallback page id")
	esVariantID := findPageIDBySlug(t, contentSvc, "translation-missing-fr-es")
	require.NotEmpty(t, esVariantID, "expected seeded es variant page id")

	return translationUIFixture{
		handler:     server.WrappedRouter(),
		fallbackID:  fallbackID,
		esVariantID: esVariantID,
	}
}

func newTranslationUITestPagesPanel(store stores.PageRepository) *coreadmin.PanelBuilder {
	return (&coreadmin.PanelBuilder{}).
		WithRepository(store).
		ListFields(
			coreadmin.Field{Name: "id", Label: "ID", Type: "text"},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "locale", Label: "Locale", Type: "text"},
			coreadmin.Field{Name: "translation_group_id", Label: "Translation Group", Type: "text", Hidden: true, ReadOnly: true},
		).
		FormFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			coreadmin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			coreadmin.Field{Name: "path", Label: "Path", Type: "text", Required: true},
			coreadmin.Field{Name: "content", Label: "Content", Type: "textarea"},
			coreadmin.Field{Name: "status", Label: "Status", Type: "text"},
			coreadmin.Field{Name: "locale", Label: "Locale", Type: "text"},
			coreadmin.Field{Name: "translation_group_id", Label: "Translation Group", Type: "text", Hidden: true, ReadOnly: true},
		).
		DetailFields(
			coreadmin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "slug", Label: "Slug", Type: "text"},
			coreadmin.Field{Name: "path", Label: "Path", Type: "text"},
			coreadmin.Field{Name: "status", Label: "Status", Type: "text"},
			coreadmin.Field{Name: "locale", Label: "Locale", Type: "text"},
			coreadmin.Field{Name: "translation_group_id", Label: "Translation Group", Type: "text", Hidden: true, ReadOnly: true},
		)
}

func findPageIDBySlug(t *testing.T, contentSvc coreadmin.CMSContentService, slug string) string {
	t.Helper()
	pages, err := contentSvc.Pages(context.Background(), "")
	require.NoError(t, err, "list pages")
	target := strings.ToLower(strings.TrimSpace(slug))
	for _, page := range pages {
		if strings.ToLower(strings.TrimSpace(page.Slug)) != target {
			continue
		}
		id := strings.TrimSpace(page.ID)
		if id != "" {
			return id
		}
	}
	return ""
}

func doUIRequest(t *testing.T, app *fiber.App, method, path string) (int, string) {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	res, err := app.Test(req, -1)
	require.NoError(t, err, "execute %s %s", method, path)
	body := ""
	if res != nil && res.Body != nil {
		raw, readErr := io.ReadAll(res.Body)
		require.NoError(t, readErr, "read response body")
		body = string(raw)
	}
	return res.StatusCode, body
}

func doUIFormRequest(t *testing.T, app *fiber.App, method, path string, values url.Values) (int, string) {
	t.Helper()

	body := strings.NewReader(values.Encode())
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := app.Test(req, -1)
	require.NoError(t, err, "execute %s %s", method, path)

	payload := ""
	if res != nil && res.Body != nil {
		raw, readErr := io.ReadAll(res.Body)
		require.NoError(t, readErr, "read response body")
		payload = string(raw)
	}

	return res.StatusCode, payload
}
