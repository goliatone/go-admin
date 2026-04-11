package modules

import (
	"net/http"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/stretchr/testify/require"
)

func TestActionPhase8DomainDisablementParityAndStaleDeleteFailure(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, allowAllAuthorizer{})
	store, ok := module.store.(*stores.InMemoryStore)
	require.True(t, ok, "expected in-memory store")

	seedESignContractDocument(t, store, scope, "doc-phase8-001", "Phase 8 Document")

	listPayload := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelCollectionPath(scope, esignDocumentsPanelID)+"&page=1&per_page=100", nil)
	record := extractListRecordByID(t, listPayload, "doc-phase8-001")
	require.NotNil(t, record)
	assertActionStateEnabled(t, extractFixtureMap(t, record["_action_state"]), "delete", true)

	detailPayload := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelDetailPath(scope, esignDocumentsPanelID, "doc-phase8-001"), nil)
	assertActionStateEnabled(t, extractFixtureMap(t, extractTestRecordPayload(t, detailPayload)["_action_state"]), "delete", true)

	seedESignContractAgreement(t, module, store, scope, "agreement-phase8-sent", "doc-phase8-001", "Phase 8 Sent Agreement", true)

	deleteStatus, deletePayload := doPanelJSONRequestWithStatus(t, server, http.MethodDelete, scopedPanelDetailPath(scope, esignDocumentsPanelID, "doc-phase8-001"), nil)
	require.Equal(t, http.StatusConflict, deleteStatus, "delete payload=%+v", deletePayload)
	require.Equal(t, coreadmin.TextCodeResourceInUse, strings.TrimSpace(toString(extractFixtureMap(t, deletePayload["error"])["text_code"])))

	listAfter := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelCollectionPath(scope, esignDocumentsPanelID)+"&page=1&per_page=100", nil)
	recordAfter := extractListRecordByID(t, listAfter, "doc-phase8-001")
	require.NotNil(t, recordAfter)
	rowState := extractFixtureMap(t, recordAfter["_action_state"])
	assertActionStateCode(t, rowState, "delete", coreadmin.ActionDisabledReasonCodeResourceInUse)

	detailAfter := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelDetailPath(scope, esignDocumentsPanelID, "doc-phase8-001"), nil)
	detailState := extractFixtureMap(t, extractTestRecordPayload(t, detailAfter)["_action_state"])
	assertActionStateCode(t, detailState, "delete", coreadmin.ActionDisabledReasonCodeResourceInUse)
}
