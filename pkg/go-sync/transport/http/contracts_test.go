package httptransport

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
)

func TestReadFixtureMatchesCanonicalReadEnvelope(t *testing.T) {
	payload := loadFixture(t, "01_read_success.json")

	var envelope ReadResponse
	if err := json.Unmarshal(payload, &envelope); err != nil {
		t.Fatalf("unmarshal read fixture: %v", err)
	}
	if envelope.Revision != 12 {
		t.Fatalf("expected revision 12, got %d", envelope.Revision)
	}
	if len(envelope.Data) == 0 {
		t.Fatal("expected read fixture data payload")
	}
}

func TestMutateFixtureMatchesCanonicalMutationEnvelope(t *testing.T) {
	payload := loadFixture(t, "02_mutate_success.json")

	var envelope MutationResponse
	if err := json.Unmarshal(payload, &envelope); err != nil {
		t.Fatalf("unmarshal mutate fixture: %v", err)
	}
	if !envelope.Applied {
		t.Fatal("expected mutate success fixture to report applied=true")
	}
	if envelope.Replay {
		t.Fatal("expected mutate success fixture to report replay=false")
	}
}

func TestConflictFixtureMatchesCanonicalStaleRevisionEnvelope(t *testing.T) {
	payload := loadFixture(t, "03_stale_revision_conflict.json")

	var envelope ErrorEnvelope
	if err := json.Unmarshal(payload, &envelope); err != nil {
		t.Fatalf("unmarshal conflict fixture: %v", err)
	}
	if envelope.Error.Code != core.CodeStaleRevision {
		t.Fatalf("expected stale revision code, got %s", envelope.Error.Code)
	}

	rawDetails, err := json.Marshal(envelope.Error.Details)
	if err != nil {
		t.Fatalf("marshal conflict details: %v", err)
	}
	var details StaleRevisionDetails
	if err := json.Unmarshal(rawDetails, &details); err != nil {
		t.Fatalf("unmarshal stale revision details: %v", err)
	}
	if details.CurrentRevision != 13 {
		t.Fatalf("expected current revision 13, got %d", details.CurrentRevision)
	}
	if details.Resource == nil {
		t.Fatal("expected stale revision fixture to include latest resource payload")
	}
}

func TestReplayFixtureMatchesCanonicalReplayEnvelope(t *testing.T) {
	payload := loadFixture(t, "04_idempotency_replay.json")

	var envelope MutationResponse
	if err := json.Unmarshal(payload, &envelope); err != nil {
		t.Fatalf("unmarshal replay fixture: %v", err)
	}
	if !envelope.Applied {
		t.Fatal("expected replay fixture to report applied=true")
	}
	if !envelope.Replay {
		t.Fatal("expected replay fixture to report replay=true")
	}
}

func TestErrorEnvelopeFromErrorIncludesCanonicalStaleRevisionPayload(t *testing.T) {
	now := time.Date(2026, time.March, 12, 18, 0, 2, 0, time.UTC)
	latest := core.Snapshot{
		ResourceRef: core.ResourceRef{Kind: "agreement_draft", ID: "agreement_draft_123"},
		Data:        []byte(`{"id":"agreement_draft_123","status":"draft"}`),
		Revision:    13,
		UpdatedAt:   now,
	}

	envelope := ErrorEnvelopeFromError(core.NewStaleRevisionError(13, &latest))
	if envelope.Error.Code != core.CodeStaleRevision {
		t.Fatalf("expected stale revision code, got %s", envelope.Error.Code)
	}

	rawDetails, err := json.Marshal(envelope.Error.Details)
	if err != nil {
		t.Fatalf("marshal stale revision details: %v", err)
	}

	var details StaleRevisionDetails
	if err := json.Unmarshal(rawDetails, &details); err != nil {
		t.Fatalf("unmarshal stale revision details: %v", err)
	}
	if details.CurrentRevision != 13 {
		t.Fatalf("expected current revision 13, got %d", details.CurrentRevision)
	}
	if details.Resource == nil || details.Resource.Revision != 13 {
		t.Fatalf("expected latest resource revision 13, got %+v", details.Resource)
	}
}

func TestErrorEnvelopeFromErrorOmitsLatestSnapshotWhenUnavailable(t *testing.T) {
	envelope := ErrorEnvelopeFromError(core.NewStaleRevisionError(13, nil))
	rawDetails, err := json.Marshal(envelope.Error.Details)
	if err != nil {
		t.Fatalf("marshal stale revision details: %v", err)
	}

	var details StaleRevisionDetails
	if err := json.Unmarshal(rawDetails, &details); err != nil {
		t.Fatalf("unmarshal stale revision details: %v", err)
	}
	if details.CurrentRevision != 13 {
		t.Fatalf("expected current revision 13, got %d", details.CurrentRevision)
	}
	if details.Resource != nil {
		t.Fatalf("expected stale revision payload without resource, got %+v", details.Resource)
	}
}

func TestReadResponseFromSnapshotDerivesCanonicalMetadataFromResourceRef(t *testing.T) {
	envelope := ReadResponseFromSnapshot(core.Snapshot{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "agreement_draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
		},
		Data:      []byte(`{"id":"agreement_draft_123"}`),
		Revision:  12,
		UpdatedAt: time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC),
	})

	if envelope.Metadata["kind"] != "agreement_draft" {
		t.Fatalf("expected metadata.kind to be derived from resource ref, got %+v", envelope.Metadata)
	}
	scope, ok := envelope.Metadata["scope"].(map[string]string)
	if !ok {
		t.Fatalf("expected metadata.scope map[string]string, got %#v", envelope.Metadata["scope"])
	}
	if scope["tenant"] != "tenant_1" {
		t.Fatalf("expected tenant scope metadata, got %+v", scope)
	}
}

func TestMutationResponseFromResultDerivesCanonicalMetadataFromResourceRef(t *testing.T) {
	envelope := MutationResponseFromResult(core.MutationResult{
		Snapshot: core.Snapshot{
			ResourceRef: core.ResourceRef{
				Kind: "agreement_draft",
				ID:   "agreement_draft_123",
				Scope: map[string]string{
					"tenant": "tenant_1",
				},
			},
			Data:      []byte(`{"id":"agreement_draft_123","status":"sent"}`),
			Revision:  14,
			UpdatedAt: time.Date(2026, time.March, 12, 18, 0, 5, 0, time.UTC),
		},
		Applied: true,
		Replay:  true,
	})

	if envelope.Metadata["kind"] != "agreement_draft" {
		t.Fatalf("expected metadata.kind to be derived from resource ref, got %+v", envelope.Metadata)
	}
}

func TestErrorEnvelopeFromWrappedSyncErrorPreservesCanonicalMessageAndDetails(t *testing.T) {
	err := fmt.Errorf("transport wrapper: %w", core.NewError(core.CodeInvalidMutation, "operation is required", map[string]any{
		"field": "operation",
	}))

	envelope := ErrorEnvelopeFromError(err)
	if envelope.Error.Code != core.CodeInvalidMutation {
		t.Fatalf("expected invalid mutation code, got %s", envelope.Error.Code)
	}
	if envelope.Error.Message != "operation is required" {
		t.Fatalf("expected canonical message, got %q", envelope.Error.Message)
	}
	rawDetails, marshalErr := json.Marshal(envelope.Error.Details)
	if marshalErr != nil {
		t.Fatalf("marshal wrapped error details: %v", marshalErr)
	}
	var details map[string]any
	if unmarshalErr := json.Unmarshal(rawDetails, &details); unmarshalErr != nil {
		t.Fatalf("unmarshal wrapped error details: %v", unmarshalErr)
	}
	if details["field"] != "operation" {
		t.Fatalf("expected canonical details to survive wrapping, got %+v", details)
	}
}

func loadFixture(t *testing.T, name string) []byte {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	path := filepath.Join(filepath.Dir(filename), "..", "..", "testdata", "http", name)
	payload, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return payload
}
