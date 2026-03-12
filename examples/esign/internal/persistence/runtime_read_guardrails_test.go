package persistence

import (
	"os"
	"strings"
	"testing"
)

func TestPhase10GuardrailRelationalTxReadCutoverRemovedCompatibilityHelpers(t *testing.T) {
	path := "/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/internal/persistence/store_relational_tx.go"
	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	content := string(payload)
	for _, forbidden := range []string{
		"relationalReadCompat(",
		"relationalReadCompat2(",
		"relationalWriteCompat(",
		"relationalWriteCompat2(",
		"relationalExecCompat(",
		"loadSnapshotWithIDB",
		"inMemoryStoreFromRuntimeSnapshot",
		"persistSnapshotDeltaTx",
		"runtimeSnapshotFromInMemoryStore",
	} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("store_relational_tx.go still references forbidden compatibility helper %q", forbidden)
		}
	}
}

func TestPhase10GuardrailStoreAdapterDoesNotRetainSnapshotReadHelpers(t *testing.T) {
	path := "/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/internal/persistence/store.go"
	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	content := string(payload)
	for _, forbidden := range []string{
		"runtimeRelationalStoreSync",
		"readStore(",
		"readWithStore(",
		"inMemoryStoreFromRuntimeSnapshot",
		"runtimeSnapshotFromInMemoryStore",
		"loadSnapshotWithIDB",
		"persistSnapshotDeltaTx",
	} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("store.go still references forbidden snapshot helper %q", forbidden)
		}
	}
}

func TestPhase10GuardrailMigratedAdapterReadMethodsDoNotUseSnapshotReads(t *testing.T) {
	path := "/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/internal/persistence/store_methods.go"
	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	content := string(payload)
	for _, method := range []string{
		"Get",
		"List",
		"GetRemediationDispatch",
		"GetRemediationDispatchByIdempotencyKey",
		"ListFieldValuesByRecipient",
		"GetSignatureArtifact",
		"GetSignerProfile",
		"ListSavedSignerSignatures",
		"CountSavedSignerSignatures",
		"GetAgreementArtifacts",
		"GetGoogleImportRun",
		"ListGoogleImportRuns",
		"ListOutboxMessages",
		"GetIntegrationCredential",
		"ListIntegrationCredentials",
		"GetMappingSpec",
		"ListMappingSpecs",
		"GetIntegrationBindingByExternal",
		"ListIntegrationBindings",
		"GetIntegrationSyncRun",
		"ListIntegrationSyncRuns",
		"ListIntegrationCheckpoints",
		"GetIntegrationConflict",
		"ListIntegrationConflicts",
		"ListIntegrationChangeEvents",
		"GetPlacementRun",
		"ListPlacementRuns",
	} {
		body := phase10MethodBody(t, content, method)
		if strings.Contains(body, "readWithStore(") || strings.Contains(body, "s.readStore(") {
			t.Fatalf("StoreAdapter.%s still uses snapshot-backed read helpers", method)
		}
	}
}

func phase10MethodBody(t *testing.T, content, method string) string {
	t.Helper()
	start := strings.Index(content, "func (s *StoreAdapter) "+method)
	if start < 0 {
		t.Fatalf("missing StoreAdapter.%s in store_methods.go", method)
	}
	next := strings.Index(content[start+1:], "\nfunc (s *StoreAdapter) ")
	if next < 0 {
		return content[start:]
	}
	return content[start : start+1+next]
}
