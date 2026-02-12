package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/quickstart"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

type translationExchangeE2EFixture struct {
	handler http.Handler
}

func TestTranslationExchangeExportValidateApplyThenPublishSucceedsUnderPolicy(t *testing.T) {
	fx := newTranslationExchangeE2EFixture(t)

	createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath("pages"), map[string]any{
		"title":  "Exchange Flow Page",
		"slug":   "exchange-flow-page",
		"path":   "/exchange-flow-page",
		"status": "draft",
		"locale": "en",
	})
	require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)

	createdRecord := extractTestRecord(createdPayload)
	entityID := strings.TrimSpace(fmt.Sprint(createdRecord["id"]))
	require.NotEmpty(t, entityID)

	blockedStatus, blockedPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("pages", "publish"), map[string]any{
		"id":            entityID,
		"locale":        "en",
		"environment":   "production",
		"policy_entity": "pages",
	})
	require.Equal(t, http.StatusConflict, blockedStatus, "blocked payload=%+v", blockedPayload)
	require.Equal(t, coreadmin.TextCodeTranslationMissing, extractErrorTextCode(blockedPayload))
	require.ElementsMatch(t, []string{"es", "fr"}, extractMissingLocales(blockedPayload))

	exportStatus, exportPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, "/admin/api/translations/export", map[string]any{
		"filter": map[string]any{
			"resources":           []string{"pages"},
			"entity_ids":          []string{entityID},
			"source_locale":       "en",
			"target_locales":      []string{"es", "fr"},
			"field_paths":         []string{"title"},
			"include_source_hash": true,
		},
	})
	require.Equal(t, http.StatusOK, exportStatus, "export payload=%+v", exportPayload)

	rawRows, ok := exportPayload["rows"].([]any)
	require.True(t, ok, "expected export rows array, got %+v", exportPayload["rows"])
	require.Len(t, rawRows, 2)

	translatedRows := make([]map[string]any, 0, len(rawRows))
	for _, raw := range rawRows {
		row, _ := raw.(map[string]any)
		require.NotNil(t, row)
		target := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["target_locale"])))
		row["translated_text"] = "Exchange Translation " + strings.ToUpper(target)
		translatedRows = append(translatedRows, row)
	}

	validateStatus, validatePayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, "/admin/api/translations/import/validate", map[string]any{
		"rows": translatedRows,
	})
	require.Equal(t, http.StatusOK, validateStatus, "validate payload=%+v", validatePayload)
	validateSummary, _ := validatePayload["summary"].(map[string]any)
	require.Equal(t, float64(2), validateSummary["processed"])
	require.Equal(t, float64(2), validateSummary["succeeded"])
	require.Equal(t, float64(0), validateSummary["failed"])

	applyStatus, applyPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, "/admin/api/translations/import/apply", map[string]any{
		"rows":               translatedRows,
		"create_translation": true,
	})
	require.Equal(t, http.StatusOK, applyStatus, "apply payload=%+v", applyPayload)
	applySummary, _ := applyPayload["summary"].(map[string]any)
	require.Equal(t, float64(2), applySummary["processed"])
	require.Equal(t, float64(2), applySummary["succeeded"])
	require.Equal(t, float64(0), applySummary["failed"])

	publishStatus, publishPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("pages", "publish"), map[string]any{
		"id":            entityID,
		"locale":        "en",
		"environment":   "production",
		"policy_entity": "pages",
	})
	require.Equal(t, http.StatusOK, publishStatus, "publish payload=%+v", publishPayload)
	require.Equal(t, "ok", strings.ToLower(strings.TrimSpace(fmt.Sprint(publishPayload["status"]))))
}

func newTranslationExchangeE2EFixture(t *testing.T) translationExchangeE2EFixture {
	t.Helper()
	_ = commandregistry.Stop(context.Background())
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

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
	postStore := stores.NewCMSPostStore(contentSvc, "en")
	require.NotNil(t, postStore, "post store should be configured")

	adm, err := coreadmin.New(coreadmin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, coreadmin.Dependencies{
		CMSContainer:      cmsOpts.Container,
		Workflow:          translationWorkflowEngine{},
		TranslationPolicy: newTranslationPolicyForContent(contentSvc),
		FeatureGate:       alwaysOnFeatureGate{},
	})
	require.NoError(t, err, "create admin")

	require.NoError(t, commands.RegisterPageCommandFactories(adm.Commands()), "register page command factories")
	require.NoError(t, commands.RegisterPostCommandFactories(adm.Commands()), "register post command factories")

	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPagePublishCommand(pageStore))
	require.NoError(t, err, "register page publish command")
	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPageBulkPublishCommand(pageStore))
	require.NoError(t, err, "register page bulk publish command")
	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPageBulkUnpublishCommand(pageStore))
	require.NoError(t, err, "register page bulk unpublish command")

	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPostBulkPublishCommand(postStore))
	require.NoError(t, err, "register post bulk publish command")
	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPostBulkUnpublishCommand(postStore))
	require.NoError(t, err, "register post bulk unpublish command")
	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPostBulkScheduleCommand(postStore))
	require.NoError(t, err, "register post bulk schedule command")
	_, err = coreadmin.RegisterCommand(adm.Commands(), commands.NewPostBulkArchiveCommand(postStore))
	require.NoError(t, err, "register post bulk archive command")

	_, err = adm.RegisterPanel("pages", setup.NewPagesPanelBuilder(pageStore))
	require.NoError(t, err, "register pages panel")
	_, err = adm.RegisterPanel("posts", setup.NewPostsPanelBuilder(postStore))
	require.NoError(t, err, "register posts panel")

	exchangeStore := &translationExchangePageStore{content: contentSvc}
	err = quickstart.RegisterTranslationExchangeWiring(adm, quickstart.TranslationExchangeConfig{
		Enabled: true,
		Store:   exchangeStore,
	})
	require.NoError(t, err, "register translation exchange wiring")

	server := router.NewHTTPServer()
	require.NoError(t, adm.Initialize(server.Router()), "initialize admin routes")

	return translationExchangeE2EFixture{
		handler: server.WrappedRouter(),
	}
}

type translationExchangePageStore struct {
	content coreadmin.CMSContentService
}

func (s *translationExchangePageStore) ExportRows(ctx context.Context, filter coreadmin.TranslationExportFilter) ([]coreadmin.TranslationExchangeRow, error) {
	if s == nil || s.content == nil {
		return nil, nil
	}
	targetLocales := filter.TargetLocales
	if len(targetLocales) == 0 {
		targetLocales = []string{"es", "fr"}
	}
	fieldPaths := filter.FieldPaths
	if len(fieldPaths) == 0 {
		fieldPaths = []string{"title"}
	}
	rows := []coreadmin.TranslationExchangeRow{}
	for _, entityID := range filter.EntityIDs {
		page, err := s.content.Page(ctx, strings.TrimSpace(entityID), strings.TrimSpace(filter.SourceLocale))
		if err != nil || page == nil {
			continue
		}
		groupID := strings.TrimSpace(page.TranslationGroupID)
		if groupID == "" {
			groupID = strings.TrimSpace(page.ID)
		}
		for _, locale := range targetLocales {
			targetLocale := strings.ToLower(strings.TrimSpace(locale))
			if targetLocale == "" {
				continue
			}
			for _, fieldPath := range fieldPaths {
				path := strings.TrimSpace(fieldPath)
				if path == "" {
					continue
				}
				sourceText := pageFieldText(page, path)
				rows = append(rows, coreadmin.TranslationExchangeRow{
					Resource:           "pages",
					EntityID:           strings.TrimSpace(page.ID),
					TranslationGroupID: groupID,
					SourceLocale:       strings.ToLower(strings.TrimSpace(page.Locale)),
					TargetLocale:       targetLocale,
					FieldPath:          path,
					SourceText:         sourceText,
					SourceHash:         hashTranslationSourceText(sourceText),
				})
			}
		}
	}
	return rows, nil
}

func (s *translationExchangePageStore) ResolveLinkage(ctx context.Context, key coreadmin.TranslationExchangeLinkageKey) (coreadmin.TranslationExchangeLinkage, error) {
	if s == nil || s.content == nil {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	if !strings.EqualFold(strings.TrimSpace(key.Resource), "pages") {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	if !strings.EqualFold(strings.TrimSpace(key.FieldPath), "title") {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	page, err := s.content.Page(ctx, strings.TrimSpace(key.EntityID), "")
	if err != nil || page == nil {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	groupID := strings.TrimSpace(page.TranslationGroupID)
	if groupID == "" {
		groupID = strings.TrimSpace(page.ID)
	}
	if !strings.EqualFold(groupID, strings.TrimSpace(key.TranslationGroupID)) {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	targetSlug := strings.TrimSpace(page.Slug) + "-" + strings.ToLower(strings.TrimSpace(key.TargetLocale))
	targetExists := false
	pages, err := s.content.Pages(ctx, "")
	if err == nil {
		for _, item := range pages {
			if strings.EqualFold(strings.TrimSpace(item.Slug), targetSlug) {
				targetExists = true
				break
			}
		}
	}
	return coreadmin.TranslationExchangeLinkage{
		Key:          key,
		SourceHash:   hashTranslationSourceText(pageFieldText(page, "title")),
		TargetExists: targetExists,
	}, nil
}

func (s *translationExchangePageStore) ApplyTranslation(ctx context.Context, req coreadmin.TranslationExchangeApplyRequest) error {
	if s == nil || s.content == nil {
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	page, err := s.content.Page(ctx, strings.TrimSpace(req.Key.EntityID), "")
	if err != nil || page == nil {
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}
	groupID := strings.TrimSpace(page.TranslationGroupID)
	if groupID == "" {
		groupID = strings.TrimSpace(page.ID)
	}
	targetLocale := strings.ToLower(strings.TrimSpace(req.Key.TargetLocale))
	targetSlug := strings.TrimSpace(page.Slug) + "-" + targetLocale

	pages, err := s.content.Pages(ctx, "")
	if err != nil {
		return err
	}
	for _, item := range pages {
		if !strings.EqualFold(strings.TrimSpace(item.Slug), targetSlug) {
			continue
		}
		item.Title = strings.TrimSpace(req.TranslatedText)
		item.Status = strings.TrimSpace(req.WorkflowStatus)
		if item.Status == "" {
			item.Status = "draft"
		}
		if strings.TrimSpace(item.TranslationGroupID) == "" {
			item.TranslationGroupID = groupID
		}
		_, err := s.content.UpdatePage(ctx, item)
		return err
	}

	if !req.CreateTranslation {
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}

	_, err = s.content.CreatePage(ctx, coreadmin.CMSPage{
		Title:              strings.TrimSpace(req.TranslatedText),
		Slug:               targetSlug,
		Locale:             targetLocale,
		Status:             strings.TrimSpace(req.WorkflowStatus),
		TranslationGroupID: groupID,
	})
	return err
}

func pageFieldText(page *coreadmin.CMSPage, fieldPath string) string {
	if page == nil {
		return ""
	}
	switch strings.ToLower(strings.TrimSpace(fieldPath)) {
	case "title":
		return strings.TrimSpace(page.Title)
	case "slug":
		return strings.TrimSpace(page.Slug)
	default:
		return ""
	}
}

func hashTranslationSourceText(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}
