package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/pkg/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestExampleCMSPreviewAndPublicAPI(t *testing.T) {
	dsn := testSQLiteDSN(t)
	cmsOpts, err := setup.SetupPersistentCMS(context.Background(), "en", dsn)
	require.NoError(t, err)

	cfg := admin.Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnablePublicAPI: true,
		PreviewSecret:   "secret",
		AuthConfig:      &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	cfg.Site.AllowUnauthenticatedReads = true
	adm, err := admin.New(cfg, admin.Dependencies{CMSContainer: cmsOpts.Container})
	require.NoError(t, err)
	adm.WithAuth(translationRuntimeHarnessPassthroughAuthenticator{}, nil)

	contentSvc := cmsOpts.Container.ContentService()
	require.NotNil(t, contentSvc)

	contentPanel := (&admin.PanelBuilder{}).
		WithRepository(admin.NewCMSContentRepository(contentSvc)).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "content_type", Label: "Type", Type: "text"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			admin.Field{Name: "content_type", Label: "Type", Type: "text", Required: true},
			admin.Field{Name: "status", Label: "Status", Type: "text", Required: true},
			admin.Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
		)
	_, err = adm.RegisterPanel("content", contentPanel)
	require.NoError(t, err)

	server := router.NewHTTPServer()
	require.NoError(t, adm.Initialize(server.Router()))

	contentBody := `{"title":"Example Draft","slug":"example-draft","content_type":"post","status":"draft","locale":"en"}`
	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/panels/content", strings.NewReader(contentBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRes, createReq)
	require.Equal(t, http.StatusOK, createRes.Code)
	created := decodeTestJSON(t, createRes)
	pageID := fmt.Sprint(created["id"])
	require.NotEmpty(t, pageID)

	previewReq := httptest.NewRequest(http.MethodGet, "/admin/api/panels/content/"+pageID+"/preview", nil)
	previewRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(previewRes, previewReq)
	require.Equal(t, http.StatusOK, previewRes.Code)
	previewPayload := decodeTestJSON(t, previewRes)
	token := fmt.Sprint(previewPayload["token"])
	require.NotEmpty(t, token)

	adminPreviewReq := httptest.NewRequest(http.MethodGet, "/admin/api/preview/"+token, nil)
	adminPreviewRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(adminPreviewRes, adminPreviewReq)
	require.Equal(t, http.StatusOK, adminPreviewRes.Code)
	adminPreview := decodeTestJSON(t, adminPreviewRes)
	adminRecord := extractTestRecord(adminPreview)
	slug := firstTestString(adminRecord, "slug", "path", "Slug", "Path")
	require.Equal(t, "example-draft", slug)

	publicReq := httptest.NewRequest(http.MethodGet, "/api/v1/content/post/example-draft", nil)
	publicRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	require.Equal(t, http.StatusNotFound, publicRes.Code)

	updateReq := httptest.NewRequest(http.MethodPut, "/admin/api/panels/content/"+pageID, strings.NewReader(`{"status":"published"}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(updateRes, updateReq)
	require.Equal(t, http.StatusOK, updateRes.Code)

	publicReq = httptest.NewRequest(http.MethodGet, "/api/v1/content/post/example-draft", nil)
	publicRes = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	require.Equal(t, http.StatusOK, publicRes.Code)
}

func decodeTestJSON(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	payload := map[string]any{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &payload))
	return payload
}

func extractTestRecord(payload map[string]any) map[string]any {
	if payload == nil {
		return nil
	}
	if _, hasID := payload["id"]; hasID {
		return payload
	}
	if _, hasSlug := payload["slug"]; hasSlug {
		return payload
	}
	if record, ok := payload["record"].(map[string]any); ok {
		return record
	}
	if data, ok := payload["data"].(map[string]any); ok {
		return data
	}
	if values, ok := payload["values"].(map[string]any); ok {
		return values
	}
	return payload
}

func firstTestString(payload map[string]any, keys ...string) string {
	if payload == nil {
		return ""
	}
	for _, key := range keys {
		if value := fmt.Sprint(payload[key]); value != "" && value != "<nil>" {
			return value
		}
	}
	for _, value := range payload {
		nested, ok := value.(map[string]any)
		if !ok {
			continue
		}
		if resolved := firstTestString(nested, keys...); resolved != "" {
			return resolved
		}
	}
	return ""
}
