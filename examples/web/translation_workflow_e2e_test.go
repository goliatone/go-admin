package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	commandregistry "github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

type translationWorkflowFixture struct {
	handler http.Handler
}

type alwaysOnFeatureGate struct{}

func (alwaysOnFeatureGate) Enabled(context.Context, string, ...fggate.ResolveOption) (bool, error) {
	return true, nil
}

type translationWorkflowEngine struct{}

func (translationWorkflowEngine) AvailableTransitions(_ context.Context, _ string, state string) ([]coreadmin.WorkflowTransition, error) {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case "", "draft":
		return []coreadmin.WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
			{Name: "submit_for_approval", From: "draft", To: "pending_approval"},
			{Name: "request_approval", From: "draft", To: "pending_approval"},
		}, nil
	case "pending_approval":
		return []coreadmin.WorkflowTransition{
			{Name: "publish", From: "pending_approval", To: "published"},
			{Name: "approve", From: "pending_approval", To: "published"},
			{Name: "reject", From: "pending_approval", To: "draft"},
		}, nil
	case "published":
		return []coreadmin.WorkflowTransition{
			{Name: "unpublish", From: "published", To: "draft"},
		}, nil
	default:
		return nil, nil
	}
}

func (w translationWorkflowEngine) Transition(ctx context.Context, input coreadmin.TransitionInput) (*coreadmin.TransitionResult, error) {
	target := strings.TrimSpace(input.TargetState)
	if target == "" {
		transitions, err := w.AvailableTransitions(ctx, input.EntityType, input.CurrentState)
		if err != nil {
			return nil, err
		}
		for _, transition := range transitions {
			if strings.EqualFold(transition.Name, input.Transition) {
				target = transition.To
				break
			}
		}
	}
	if target == "" {
		return nil, errors.New("invalid workflow transition")
	}
	return &coreadmin.TransitionResult{
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Transition: input.Transition,
		FromState:  input.CurrentState,
		ToState:    target,
	}, nil
}

func TestPublishBlockedThenCreateTranslationsThenPublishSucceedsForPagesAndPosts(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	tests := []struct {
		name       string
		panel      string
		createBody map[string]any
	}{
		{
			name:  "pages",
			panel: "pages",
			createBody: map[string]any{
				"title":  "Remediation Flow Page",
				"slug":   "remediation-flow-page",
				"path":   "/remediation-flow-page",
				"status": "draft",
				"locale": "en",
			},
		},
		{
			name:  "posts",
			panel: "posts",
			createBody: map[string]any{
				"title":    "Remediation Flow Post",
				"slug":     "remediation-flow-post",
				"path":     "/posts/remediation-flow-post",
				"content":  "Remediation content body",
				"excerpt":  "Remediation excerpt",
				"category": "guides",
				"status":   "draft",
				"locale":   "en",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath(tc.panel), tc.createBody)
			require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)

			createdRecord := extractTestRecord(createdPayload)
			entityID := strings.TrimSpace(fmt.Sprint(createdRecord["id"]))
			require.NotEmpty(t, entityID)

			blockedStatus, blockedPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath(tc.panel, "publish"), map[string]any{
				"id":            entityID,
				"locale":        "en",
				"environment":   "production",
				"policy_entity": tc.panel,
			})
			require.Equal(t, http.StatusConflict, blockedStatus, "blocked payload=%+v", blockedPayload)
			require.Equal(t, coreadmin.TextCodeTranslationMissing, extractErrorTextCode(blockedPayload))
			require.ElementsMatch(t, []string{"es", "fr"}, extractMissingLocales(blockedPayload))

			translationGroupID := strings.TrimSpace(fmt.Sprint(createdRecord["translation_group_id"]))
			if translationGroupID == "" || strings.EqualFold(translationGroupID, "<nil>") {
				translationGroupID = entityID
			}

			for _, locale := range []string{"es", "fr"} {
				variantStatus, variantPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath(tc.panel), buildTranslationVariantPayload(tc.panel, createdRecord, translationGroupID, locale))
				require.Equal(t, http.StatusOK, variantStatus, "create locale=%s payload=%+v", locale, variantPayload)
				variantRecord := extractTestRecord(variantPayload)
				require.Equal(t, strings.ToLower(locale), strings.ToLower(strings.TrimSpace(fmt.Sprint(variantRecord["locale"]))))
				require.Equal(t, "draft", strings.ToLower(strings.TrimSpace(fmt.Sprint(variantRecord["status"]))))
			}

			publishStatus, publishPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath(tc.panel, "publish"), map[string]any{
				"id":            entityID,
				"locale":        "en",
				"environment":   "production",
				"policy_entity": tc.panel,
			})
			require.Equal(t, http.StatusOK, publishStatus, "publish payload=%+v", publishPayload)
			require.Equal(t, "ok", strings.ToLower(strings.TrimSpace(fmt.Sprint(publishPayload["status"]))))

			detailStatus, detailPayload := doAdminJSONRequest(t, fx.handler, http.MethodGet, panelDetailPath(tc.panel, entityID), nil)
			require.Equal(t, http.StatusOK, detailStatus, "detail payload=%+v", detailPayload)
			detailRecord := extractTestRecord(detailPayload)
			require.Equal(t, "published", strings.ToLower(strings.TrimSpace(fmt.Sprint(detailRecord["status"]))))
		})
	}
}

func TestListIncludesWorkflowActionStateMetadata(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	tests := []struct {
		name       string
		panel      string
		createBody map[string]any
	}{
		{
			name:  "pages",
			panel: "pages",
			createBody: map[string]any{
				"title":  "Action State Page",
				"slug":   "action-state-page",
				"path":   "/action-state-page",
				"status": "published",
				"locale": "en",
			},
		},
		{
			name:  "posts",
			panel: "posts",
			createBody: map[string]any{
				"title":    "Action State Post",
				"slug":     "action-state-post",
				"path":     "/posts/action-state-post",
				"content":  "Action state content",
				"excerpt":  "Action state excerpt",
				"category": "guides",
				"status":   "published",
				"locale":   "en",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath(tc.panel), tc.createBody)
			require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)
			createdRecord := extractTestRecord(createdPayload)
			entityID := strings.TrimSpace(fmt.Sprint(createdRecord["id"]))
			require.NotEmpty(t, entityID)

			listPath := panelCollectionPath(tc.panel) + "?page=1&per_page=200"
			listStatus, listPayload := doAdminJSONRequest(t, fx.handler, http.MethodGet, listPath, nil)
			require.Equal(t, http.StatusOK, listStatus, "list payload=%+v", listPayload)

			listRecord := extractListRecordByID(listPayload, entityID)
			require.NotNil(t, listRecord, "expected created record in list response")

			actionState, ok := listRecord["_action_state"].(map[string]any)
			require.True(t, ok, "expected _action_state on list record: %+v", listRecord)

			requireActionStateEnabled(t, actionState, "request_approval", false)
			requireActionStateEnabled(t, actionState, "publish", false)
			requireActionStateEnabled(t, actionState, "unpublish", true)
		})
	}
}

func newTranslationWorkflowFixture(t *testing.T) translationWorkflowFixture {
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

	server := router.NewHTTPServer()
	require.NoError(t, adm.Initialize(server.Router()), "initialize admin routes")

	return translationWorkflowFixture{
		handler: server.WrappedRouter(),
	}
}

func newTranslationPolicyForContent(contentSvc coreadmin.CMSContentService) coreadmin.TranslationPolicy {
	return coreadmin.TranslationPolicyFunc(func(ctx context.Context, input coreadmin.TranslationPolicyInput) error {
		if contentSvc == nil {
			return nil
		}
		if !strings.EqualFold(strings.TrimSpace(input.Transition), "publish") {
			return nil
		}
		entity := normalizePolicyEntity(firstNonEmptyString(input.PolicyEntity, input.EntityType))
		if entity == "" {
			return nil
		}

		required := requiredLocalesForEnvironment(input.Environment)
		availableSet := map[string]struct{}{}
		switch entity {
		case "pages":
			source, err := contentSvc.Page(ctx, strings.TrimSpace(input.EntityID), "")
			if err != nil {
				return err
			}
			sourceSlug := strings.TrimSpace(source.Slug)
			sourceLocale := strings.ToLower(strings.TrimSpace(source.Locale))
			if sourceLocale == "" {
				sourceLocale = strings.ToLower(strings.TrimSpace(input.RequestedLocale))
			}
			if sourceLocale != "" {
				availableSet[sourceLocale] = struct{}{}
			}
			pages, err := contentSvc.Pages(ctx, "")
			if err != nil {
				return err
			}
			for _, locale := range required {
				normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
				if normalizedLocale == "" {
					continue
				}
				if _, ok := availableSet[normalizedLocale]; ok {
					continue
				}
				expectedSlug := sourceSlug + "-" + normalizedLocale
				for _, page := range pages {
					if strings.EqualFold(strings.TrimSpace(page.Slug), expectedSlug) {
						availableSet[normalizedLocale] = struct{}{}
						break
					}
				}
			}
		case "posts":
			source, err := contentSvc.Content(ctx, strings.TrimSpace(input.EntityID), "")
			if err != nil {
				return err
			}
			sourceSlug := strings.TrimSpace(source.Slug)
			sourceLocale := strings.ToLower(strings.TrimSpace(source.Locale))
			if sourceLocale == "" {
				sourceLocale = strings.ToLower(strings.TrimSpace(input.RequestedLocale))
			}
			if sourceLocale == "" {
				sourceLocale = "en"
			}
			availableSet[sourceLocale] = struct{}{}
			contents, err := contentSvc.Contents(ctx, "")
			if err != nil {
				return err
			}
			for _, locale := range required {
				normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
				if normalizedLocale == "" {
					continue
				}
				if _, ok := availableSet[normalizedLocale]; ok {
					continue
				}
				expectedSlug := sourceSlug + "-" + normalizedLocale
				for _, item := range contents {
					if !strings.EqualFold(strings.TrimSpace(item.ContentType), "post") {
						continue
					}
					if strings.EqualFold(strings.TrimSpace(item.Slug), expectedSlug) {
						availableSet[normalizedLocale] = struct{}{}
						break
					}
				}
			}
		default:
			return nil
		}
		available := make([]string, 0, len(availableSet))
		for locale := range availableSet {
			available = append(available, locale)
		}
		missing := diffLocales(required, available)
		if len(missing) == 0 {
			return nil
		}

		return coreadmin.MissingTranslationsError{
			EntityType:      entity,
			PolicyEntity:    entity,
			EntityID:        strings.TrimSpace(input.EntityID),
			Transition:      strings.TrimSpace(input.Transition),
			Environment:     strings.TrimSpace(input.Environment),
			RequestedLocale: strings.TrimSpace(input.RequestedLocale),
			MissingLocales:  missing,
		}
	})
}

func doAdminJSONRequest(t *testing.T, handler http.Handler, method, path string, payload map[string]any) (int, map[string]any) {
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
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	decoded := map[string]any{}
	if strings.TrimSpace(res.Body.String()) != "" {
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &decoded), "decode response body")
	}
	return res.Code, decoded
}

func panelCollectionPath(panel string) string {
	return "/admin/api/" + strings.TrimSpace(panel)
}

func panelDetailPath(panel, id string) string {
	return "/admin/api/" + strings.TrimSpace(panel) + "/" + strings.TrimSpace(id)
}

func panelActionPath(panel, action string) string {
	return "/admin/api/" + strings.TrimSpace(panel) + "/actions/" + strings.TrimSpace(action)
}

func buildTranslationVariantPayload(panel string, source map[string]any, translationGroupID, locale string) map[string]any {
	slug := strings.TrimSpace(fmt.Sprint(source["slug"]))
	path := strings.TrimSpace(fmt.Sprint(source["path"]))
	title := strings.TrimSpace(fmt.Sprint(source["title"]))
	payload := map[string]any{
		"title":                title + " (" + strings.ToUpper(locale) + ")",
		"slug":                 slug + "-" + strings.ToLower(locale),
		"path":                 path + "-" + strings.ToLower(locale),
		"status":               "draft",
		"locale":               strings.ToLower(locale),
		"translation_group_id": translationGroupID,
	}
	if strings.EqualFold(panel, "posts") {
		payload["content"] = strings.TrimSpace(fmt.Sprint(source["content"]))
		payload["excerpt"] = strings.TrimSpace(fmt.Sprint(source["excerpt"]))
		payload["category"] = strings.TrimSpace(fmt.Sprint(source["category"]))
	}
	return payload
}

func extractErrorTextCode(payload map[string]any) string {
	errPayload, _ := payload["error"].(map[string]any)
	return strings.TrimSpace(fmt.Sprint(errPayload["text_code"]))
}

func extractErrorMetadata(payload map[string]any) map[string]any {
	errPayload, _ := payload["error"].(map[string]any)
	if meta, ok := errPayload["metadata"].(map[string]any); ok {
		return meta
	}
	return map[string]any{}
}

func extractMissingLocales(payload map[string]any) []string {
	meta := extractErrorMetadata(payload)
	raw := meta["missing_locales"]
	values, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		locale := strings.ToLower(strings.TrimSpace(fmt.Sprint(value)))
		if locale == "" || locale == "<nil>" {
			continue
		}
		out = append(out, locale)
	}
	return out
}

func extractListRecordByID(payload map[string]any, id string) map[string]any {
	if payload == nil {
		return nil
	}
	items := extractListRecords(payload)
	targetID := strings.TrimSpace(id)
	if targetID == "" {
		return nil
	}
	for _, item := range items {
		record, _ := item.(map[string]any)
		if strings.EqualFold(recordID(record), targetID) {
			return record
		}
	}
	return nil
}

func extractListRecords(payload map[string]any) []any {
	if payload == nil {
		return nil
	}
	for _, key := range []string{"data", "records", "items"} {
		raw, ok := payload[key]
		if !ok {
			continue
		}
		if values, ok := raw.([]any); ok {
			return values
		}
	}
	return nil
}

func recordID(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	id := strings.TrimSpace(fmt.Sprint(record["id"]))
	if id != "" && id != "<nil>" {
		return id
	}
	id = strings.TrimSpace(fmt.Sprint(record["ID"]))
	if id != "" && id != "<nil>" {
		return id
	}
	return ""
}

func requireActionStateEnabled(t *testing.T, actionState map[string]any, actionName string, expected bool) {
	t.Helper()
	raw := actionState[strings.TrimSpace(actionName)]
	state, ok := raw.(map[string]any)
	require.True(t, ok, "expected action state object for %s, got %T", actionName, raw)
	enabled, ok := state["enabled"].(bool)
	require.True(t, ok, "expected enabled bool for %s, got %T", actionName, state["enabled"])
	require.Equal(t, expected, enabled, "unexpected enabled value for %s", actionName)
}

func normalizeLocales(locales []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales))
	for _, locale := range locales {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func requiredLocalesForEnvironment(environment string) []string {
	switch strings.ToLower(strings.TrimSpace(environment)) {
	case "staging":
		return []string{"en", "es"}
	case "production", "":
		return []string{"en", "es", "fr"}
	default:
		return []string{"en", "es", "fr"}
	}
}

func diffLocales(required, available []string) []string {
	availableSet := map[string]struct{}{}
	for _, locale := range normalizeLocales(available) {
		availableSet[locale] = struct{}{}
	}
	out := make([]string, 0, len(required))
	for _, locale := range normalizeLocales(required) {
		if _, ok := availableSet[locale]; ok {
			continue
		}
		out = append(out, locale)
	}
	return out
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func normalizePolicyEntity(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if idx := strings.Index(trimmed, "@"); idx > 0 {
		trimmed = trimmed[:idx]
	}
	return strings.ToLower(strings.TrimSpace(trimmed))
}

func normalizedTestDSNName(name string) string {
	replacer := strings.NewReplacer("/", "_", "\\", "_", " ", "_", ":", "_")
	return replacer.Replace(strings.ToLower(strings.TrimSpace(name)))
}
