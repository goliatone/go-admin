package main

import (
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/stretchr/testify/require"
)

func TestContentBulkActionsPhase7ExposeStaticAndSelectionSensitiveState(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)

	listStatus, listPayload := doAdminJSONRequest(t, fx.handler, httpMethodGet, panelCollectionPath("posts")+"?page=1&per_page=200", nil)
	require.Equal(t, 200, listStatus, "posts list payload=%+v", listPayload)

	meta := extractMap(listPayload["$meta"])
	bulkState := extractMap(meta["bulk_action_state"])
	require.NotEmpty(t, bulkState, "expected static bulk_action_state metadata")

	schema := extractMap(listPayload["schema"])
	config := extractMap(schema["bulk_action_state_config"])
	require.Equal(t, true, config["selection_sensitive"])
	require.Equal(t, panelBulkStatePath("posts"), strings.TrimSpace(toString(config["selection_state_endpoint"])))

	draftRecord := extractListRecordBySlug(listPayload, "database-optimization")
	publishedRecord := extractListRecordBySlug(listPayload, "getting-started-go")
	require.NotNil(t, draftRecord)
	require.NotNil(t, publishedRecord)

	stateStatus, statePayload := doAdminJSONRequest(t, fx.handler, httpMethodPost, panelBulkStatePath("posts"), map[string]any{
		"ids": []string{strings.TrimSpace(toString(draftRecord["id"])), strings.TrimSpace(toString(publishedRecord["id"]))},
	})
	require.Equal(t, 200, stateStatus, "bulk state payload=%+v", statePayload)

	deleteState := extractMap(extractMap(statePayload["bulk_action_state"])["schedule"])
	require.Equal(t, coreadmin.TextCodeInvalidSelection, strings.TrimSpace(toString(deleteState["reason_code"])))
	require.Equal(t, 1, toInt(extractMap(deleteState["metadata"])["invalid_count"]))
}

func TestContentBulkActionsPhase7StaleScheduleFailureUsesInvalidSelectionEnvelope(t *testing.T) {
	fx := newTranslationWorkflowFixture(t)
	listStatus, listPayload := doAdminJSONRequest(t, fx.handler, httpMethodGet, panelCollectionPath("posts")+"?page=1&per_page=200", nil)
	require.Equal(t, 200, listStatus, "posts list payload=%+v", listPayload)

	draftRecord := extractListRecordBySlug(listPayload, "database-optimization")
	publishedRecord := extractListRecordBySlug(listPayload, "getting-started-go")
	require.NotNil(t, draftRecord)
	require.NotNil(t, publishedRecord)

	actionStatus, actionPayload := doAdminJSONRequest(t, fx.handler, httpMethodPost, panelBulkPath("posts", "schedule"), map[string]any{
		"ids": []string{strings.TrimSpace(toString(draftRecord["id"])), strings.TrimSpace(toString(publishedRecord["id"]))},
	})
	require.Equal(t, 400, actionStatus, "bulk action payload=%+v", actionPayload)
	require.Equal(t, coreadmin.TextCodeInvalidSelection, extractErrorTextCode(actionPayload))
	require.Equal(t, 1, toInt(extractMap(extractMap(actionPayload["error"])["metadata"])["invalid_count"]))
}

func panelBulkStatePath(panel string) string {
	return "/admin/api/panels/" + strings.TrimSpace(panel) + "/bulk-actions/state"
}

func panelBulkPath(panel, action string) string {
	return "/admin/api/panels/" + strings.TrimSpace(panel) + "/bulk/" + strings.TrimSpace(action)
}
