package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestPhase7AgreementDraftFixtures(t *testing.T) {
	t.Parallel()

	type fixtureCheck struct {
		name   string
		path   string
		assert func(t *testing.T, payload map[string]any)
	}

	fixtures := []fixtureCheck{
		{
			name: "bootstrap",
			path: filepath.Join("..", "testdata", "sync", "phase7_agreement_draft_bootstrap.json"),
			assert: func(t *testing.T, payload map[string]any) {
				resourceRef := mustMapField(t, payload, "resource_ref")
				if got := toString(resourceRef["kind"]); got != "agreement_draft" {
					t.Fatalf("expected bootstrap resource kind agreement_draft, got %q", got)
				}
				draft := mustMapField(t, payload, "draft")
				if got := toString(draft["revision"]); got != "1" {
					t.Fatalf("expected bootstrap draft revision=1, got %q", got)
				}
			},
		},
		{
			name: "autosave_success",
			path: filepath.Join("..", "testdata", "sync", "phase7_agreement_draft_autosave_success.json"),
			assert: func(t *testing.T, payload map[string]any) {
				if got := toString(payload["applied"]); got != "true" {
					t.Fatalf("expected autosave applied=true, got %q", got)
				}
				if got := toString(payload["replay"]); got != "false" {
					t.Fatalf("expected autosave replay=false, got %q", got)
				}
				metadata := mustMapField(t, payload, "metadata")
				if got := toString(metadata["operation"]); got != "autosave" {
					t.Fatalf("expected autosave metadata.operation=autosave, got %q", got)
				}
			},
		},
		{
			name: "stale_conflict",
			path: filepath.Join("..", "testdata", "sync", "phase7_agreement_draft_stale_conflict.json"),
			assert: func(t *testing.T, payload map[string]any) {
				errorPayload := mustMapField(t, payload, "error")
				if got := toString(errorPayload["code"]); got != "STALE_REVISION" {
					t.Fatalf("expected stale conflict code STALE_REVISION, got %q", got)
				}
				details := mustMapField(t, errorPayload, "details")
				if got := toString(details["current_revision"]); got != "2" {
					t.Fatalf("expected stale conflict current_revision=2, got %q", got)
				}
			},
		},
		{
			name: "send_replay",
			path: filepath.Join("..", "testdata", "sync", "phase7_agreement_draft_send_replay.json"),
			assert: func(t *testing.T, payload map[string]any) {
				if got := toString(payload["replay"]); got != "true" {
					t.Fatalf("expected send replay replay=true, got %q", got)
				}
				metadata := mustMapField(t, payload, "metadata")
				if got := toString(metadata["operation"]); got != "send" {
					t.Fatalf("expected send replay metadata.operation=send, got %q", got)
				}
			},
		},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			t.Parallel()
			raw, err := os.ReadFile(fixture.path)
			if err != nil {
				t.Fatalf("read fixture %s: %v", fixture.path, err)
			}
			var payload map[string]any
			if err := json.Unmarshal(raw, &payload); err != nil {
				t.Fatalf("decode fixture %s: %v", fixture.path, err)
			}
			fixture.assert(t, payload)
		})
	}
}
