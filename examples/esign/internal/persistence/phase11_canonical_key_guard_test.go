package persistence

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPhase11GuardrailRuntimeLogicalUniqueIndexesUseCanonicalKeyConstructors(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("resolve caller path")
	}
	file := filepath.Join(filepath.Dir(filename), "runtime_relational_store_sync.go")
	payload, err := os.ReadFile(file)
	if err != nil {
		t.Fatalf("read %s: %v", file, err)
	}
	content := string(payload)

	required := []string{
		"snapshot.AgreementReminderStates[scopeAgreementRecipientKey(",
		"expected := scopeAgreementRecipientKey(",
		"snapshot.JobRunDedupeIndex[jobRunDedupeIndexForKey(",
		"snapshot.GoogleImportRunDedupeIndex[googleImportRunDedupeIndexForKey(",
		"snapshot.SignerProfileIndex[signerProfileIndexForKey(",
		"snapshot.IntegrationCredentialIndex[integrationCredentialIndexForKey(",
		"snapshot.IntegrationBindingIndex[integrationBindingIndexForKey(",
		"snapshot.IntegrationCheckpointIndex[integrationCheckpointIndexForKey(",
	}
	for _, marker := range required {
		if !strings.Contains(content, marker) {
			t.Fatalf("expected canonical key constructor marker %q in runtime relational store sync", marker)
		}
	}

	if strings.Contains(content, "snapshot.AgreementReminderStates[scopeRecordKey(") {
		t.Fatalf("agreement reminder state keys must not use scopeRecordKey in runtime relational sync")
	}
}
