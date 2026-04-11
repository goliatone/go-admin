package modules

import (
	"net/http"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/stretchr/testify/require"
)

func TestESignBulkActionsPhase7ExposeSelectionSensitiveDocumentDeleteState(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, allowAllAuthorizer{})
	store, ok := module.store.(*stores.InMemoryStore)
	require.True(t, ok, "expected in-memory store")

	seedESignContractDocument(t, store, scope, "doc-phase7-001", "Phase 7 Protected Document")
	seedESignContractDocument(t, store, scope, "doc-phase7-002", "Phase 7 Reusable Document")
	seedESignContractAgreement(t, module, store, scope, "agreement-phase7-sent", "doc-phase7-001", "Phase 7 Sent Agreement", true)

	listPayload := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelCollectionPath(scope, esignDocumentsPanelID)+"&page=1&per_page=100", nil)
	meta := extractFixtureMap(t, listPayload["$meta"])
	require.NotEmpty(t, extractFixtureMap(t, meta["bulk_action_state"]), "expected static bulk_action_state metadata")

	schema := extractFixtureMap(t, listPayload["schema"])
	config := extractFixtureMap(t, schema["bulk_action_state_config"])
	require.Equal(t, true, config["selection_sensitive"])
	require.Equal(t, strings.Split(scopedPanelBulkStatePath(scope, esignDocumentsPanelID), "?")[0], strings.TrimSpace(toString(config["selection_state_endpoint"])))

	stateStatus, statePayload := doPanelJSONRequestWithStatus(
		t,
		server,
		http.MethodPost,
		scopedPanelBulkStatePath(scope, esignDocumentsPanelID),
		map[string]any{"ids": []string{"doc-phase7-001", "doc-phase7-002"}},
	)
	require.Equal(t, http.StatusOK, stateStatus, "state payload=%+v", statePayload)

	deleteState := extractFixtureMap(t, extractFixtureMap(t, statePayload["bulk_action_state"])["delete"])
	require.Equal(t, coreadmin.TextCodeInvalidSelection, strings.TrimSpace(toString(deleteState["reason_code"])))
	require.Equal(t, "View agreements", strings.TrimSpace(toString(extractFixtureMap(t, deleteState["metadata"])["remediation_label"])))
}

func TestESignBulkActionsPhase7MixedSelectionDeleteFailureUsesStructuredEnvelope(t *testing.T) {
	module, server, scope := setupESignModuleArtifactSubresourceTest(t, allowAllAuthorizer{})
	store, ok := module.store.(*stores.InMemoryStore)
	require.True(t, ok, "expected in-memory store")

	seedESignContractDocument(t, store, scope, "doc-phase7-101", "Phase 7 Protected Document")
	seedESignContractDocument(t, store, scope, "doc-phase7-102", "Phase 7 Reusable Document")
	seedESignContractAgreement(t, module, store, scope, "agreement-phase7-draft", "doc-phase7-101", "Phase 7 Draft Agreement", false)

	actionStatus, actionPayload := doPanelJSONRequestWithStatus(
		t,
		server,
		http.MethodPost,
		scopedPanelBulkPath(scope, esignDocumentsPanelID, "delete"),
		map[string]any{"ids": []string{"doc-phase7-101", "doc-phase7-102"}},
	)
	require.Equal(t, http.StatusBadRequest, actionStatus, "action payload=%+v", actionPayload)

	errPayload := extractFixtureMap(t, actionPayload["error"])
	require.Equal(t, coreadmin.TextCodeInvalidSelection, strings.TrimSpace(toString(errPayload["text_code"])))
	metadata := extractFixtureMap(t, errPayload["metadata"])
	require.Equal(t, "View agreements", strings.TrimSpace(toString(metadata["remediation_label"])))
	require.Equal(t, "delete", strings.TrimSpace(toString(metadata["action"])))
}

func scopedPanelBulkStatePath(scope stores.Scope, panel string) string {
	return "/admin/api/v1/panels/" + strings.TrimSpace(panel) + "/bulk-actions/state?tenant_id=" + scope.TenantID + "&org_id=" + scope.OrgID
}

func scopedPanelBulkPath(scope stores.Scope, panel, action string) string {
	return "/admin/api/v1/panels/" + strings.TrimSpace(panel) + "/bulk/" + strings.TrimSpace(action) + "?tenant_id=" + scope.TenantID + "&org_id=" + scope.OrgID
}
