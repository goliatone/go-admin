package main

import (
	"net/http"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/stretchr/testify/require"
)

func TestActionPhase8WorkflowDisablementParityAndStaleExecutionFailure(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	createStatus, createdPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelCollectionPath("pages"), map[string]any{
		"title":  "Phase 8 Workflow Page",
		"slug":   "phase-8-workflow-page",
		"path":   "/phase-8-workflow-page",
		"status": "published",
		"locale": "en",
	})
	require.Equal(t, http.StatusOK, createStatus, "create payload=%+v", createdPayload)

	createdRecord := extractTestRecord(createdPayload)
	pageID := strings.TrimSpace(toString(createdRecord["id"]))
	require.NotEmpty(t, pageID)

	listPayload := panelListBySlug(t, fx.handler, "pages", "phase-8-workflow-page")
	listRecord := extractListRecordBySlug(listPayload, "phase-8-workflow-page")
	require.NotNil(t, listRecord)

	detailStatus, detailPayload := doAdminJSONRequest(t, fx.handler, http.MethodGet, panelDetailPath("pages", pageID), nil)
	require.Equal(t, http.StatusOK, detailStatus, "detail payload=%+v", detailPayload)

	rowState := extractMap(listRecord["_action_state"])
	detailState := extractMap(extractTestRecord(detailPayload)["_action_state"])

	assertActionStateCode(t, rowState, "publish", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	assertActionStateCode(t, detailState, "publish", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	require.Equal(t, true, extractMap(rowState["unpublish"])["enabled"], "expected row unpublish enabled before stale change")
	require.Equal(t, true, extractMap(detailState["unpublish"])["enabled"], "expected detail unpublish enabled before stale change")

	firstUnpublishStatus, firstUnpublishPayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("pages", "unpublish"), map[string]any{
		"id": pageID,
	})
	require.Equal(t, http.StatusOK, firstUnpublishStatus, "first unpublish payload=%+v", firstUnpublishPayload)

	staleStatus, stalePayload := doAdminJSONRequest(t, fx.handler, http.MethodPost, panelActionPath("pages", "unpublish"), map[string]any{
		"id": pageID,
	})
	require.Equal(t, http.StatusNotFound, staleStatus, "stale unpublish payload=%+v", stalePayload)
	require.Equal(t, coreadmin.TextCodeNotFound, extractErrorTextCode(stalePayload))

	listAfter := panelListBySlug(t, fx.handler, "pages", "phase-8-workflow-page")
	rowAfter := extractMap(extractListRecordBySlug(listAfter, "phase-8-workflow-page")["_action_state"])

	detailAfterStatus, detailAfterPayload := doAdminJSONRequest(t, fx.handler, http.MethodGet, panelDetailPath("pages", pageID), nil)
	require.Equal(t, http.StatusOK, detailAfterStatus, "detail after payload=%+v", detailAfterPayload)
	detailAfter := extractMap(extractTestRecord(detailAfterPayload)["_action_state"])

	assertActionStateCode(t, rowAfter, "unpublish", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	assertActionStateCode(t, detailAfter, "unpublish", coreadmin.ActionDisabledReasonCodeInvalidStatus)
}
