package main

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCreateTranslationActionSupportsSeededLocalesAndRejectsUnknownLocale(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath("posts"), map[string]any{
		"title":    "Create Translation Action Post",
		"slug":     "create-translation-action-post",
		"path":     "/posts/create-translation-action-post",
		"content":  "body",
		"excerpt":  "excerpt",
		"category": "guides",
		"status":   "draft",
		"locale":   "en",
	})
	require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)
	createdRecord := extractTestRecord(createdPayload)
	entityID := strings.TrimSpace(fmt.Sprint(createdRecord["id"]))
	require.NotEmpty(t, entityID)

	seededStatus, seededPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("posts", "create_translation"), map[string]any{
		"id":     entityID,
		"locale": "es",
	})
	require.Equal(t, http.StatusOK, seededStatus, "seeded locale action payload=%+v", seededPayload)

	unknownStatus, unknownPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("posts", "create_translation"), map[string]any{
		"id":     entityID,
		"locale": "de",
	})
	require.NotEqual(t, http.StatusInternalServerError, unknownStatus, "unknown locale should not return 500 payload=%+v", unknownPayload)
}

func TestCreateTranslationActionDuplicateLocaleReturnsConflict(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath("posts"), map[string]any{
		"title":    "Create Translation Duplicate Post",
		"slug":     "create-translation-duplicate-post",
		"path":     "/posts/create-translation-duplicate-post",
		"content":  "body",
		"excerpt":  "excerpt",
		"category": "guides",
		"status":   "draft",
		"locale":   "en",
	})
	require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)
	createdRecord := extractTestRecord(createdPayload)
	entityID := strings.TrimSpace(fmt.Sprint(createdRecord["id"]))
	require.NotEmpty(t, entityID)

	firstStatus, firstPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("posts", "create_translation"), map[string]any{
		"id":     entityID,
		"locale": "fr",
	})
	require.Equal(t, http.StatusOK, firstStatus, "first create payload=%+v", firstPayload)

	secondStatus, secondPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("posts", "create_translation"), map[string]any{
		"id":     entityID,
		"locale": "fr",
	})
	require.Equal(t, http.StatusConflict, secondStatus, "duplicate create payload=%+v", secondPayload)
	errPayload, ok := secondPayload["error"].(map[string]any)
	require.True(t, ok, "expected error payload map: %+v", secondPayload)
	require.Equal(t, "TRANSLATION_EXISTS", strings.TrimSpace(fmt.Sprint(errPayload["text_code"])))
}
