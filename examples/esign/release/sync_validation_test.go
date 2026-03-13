package release

import (
	"context"
	"strings"
	"testing"
)

func TestRunSyncValidationProfileCapturesConflictRetryAndReplay(t *testing.T) {
	result, err := RunSyncValidationProfile(context.Background())
	if err != nil {
		t.Fatalf("RunSyncValidationProfile: %v", err)
	}
	if strings.TrimSpace(result.DraftID) == "" {
		t.Fatalf("expected draft id in sync validation result, got %+v", result)
	}
	if strings.TrimSpace(result.AgreementID) == "" {
		t.Fatalf("expected agreement id in sync validation result, got %+v", result)
	}
	if !result.Replay.Replay {
		t.Fatalf("expected replay result from sync validation profile, got %+v", result.Replay)
	}
	if result.CurrentRev < 2 {
		t.Fatalf("expected stale conflict current revision >= 2, got %d", result.CurrentRev)
	}
	if !strings.Contains(strings.ToLower(result.RetryMessage), "already in progress") {
		t.Fatalf("expected retry message to mention in-flight send, got %q", result.RetryMessage)
	}
	if result.Snapshot.ConflictTotal < 1 || result.Snapshot.ConflictByOperation["autosave"] < 1 {
		t.Fatalf("expected autosave conflict metrics, got %+v", result.Snapshot)
	}
	if result.Snapshot.RetryTotal < 1 || result.Snapshot.RetryByOperation["send"] < 1 {
		t.Fatalf("expected send retry metrics, got %+v", result.Snapshot)
	}
	if result.Snapshot.ReplayTotal < 1 || result.Snapshot.ReplayByOperation["send"] < 1 {
		t.Fatalf("expected send replay metrics, got %+v", result.Snapshot)
	}
}
