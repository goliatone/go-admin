package sqlitestore

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
)

func previewStoreCandidate(target string, now time.Time) data.PreviewRecord {
	h := strings.Repeat("a", 64)
	dataset := data.DatasetRef{Provider: "demo", ID: "orders", Version: "1", Digest: h}
	scenario := data.ScenarioRef{Dataset: dataset, ID: "ready", Version: "1", ProfileHash: h}
	receipt := data.PreparationReceipt{ID: "receipt-" + target, Target: data.TargetKey{ScopeKey: "org", TargetID: target}, StageID: "stage-" + target, Dataset: dataset, Scenario: scenario, ContentRevision: 1}
	return data.PreviewRecord{ApplicationID: "app", EnvironmentID: "dev", Principal: data.Principal{ActorID: "alice", ScopeKey: "org", ModuleHash: h, PolicyHash: h, PermissionHash: h, ExecutionID: "request"}, Receipt: receipt, Fingerprint: "fp", Session: data.ApplicationPreviewSession{Selection: data.ExploreSelection{Dataset: dataset, Scenario: scenario, TargetID: target, Context: data.ExplorePrepared, ReceiptID: receipt.ID, ContentRevision: 1}, SurfaceID: "report", State: data.PreviewReady, ExpiresAt: now.Add(time.Minute), ReadOnly: true}}
}

func TestPreviewQuotaSpansTargetsAndPreservesReplay(t *testing.T) {
	now := time.Now()
	s, err := Open(filepath.Join(t.TempDir(), "preview.db"), Options{Now: func() time.Time { return now }})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := s.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	candidates := []data.PreviewRecord{previewStoreCandidate("one", now), previewStoreCandidate("two", now)}
	if err = s.transact(t.Context(), true, func(d *document) error {
		for _, r := range candidates {
			d.Receipts[r.Receipt.ID] = r.Receipt
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		r := candidates[i%2]
		r.RequestID = fmt.Sprintf("open-%d", i)
		r.Session.SessionID = r.RequestID
		_, err = s.OpenPreviewRecord(t.Context(), r, data.PreviewMaxSessions)
		if i < 4 && err != nil {
			t.Fatal(err)
		}
		if i == 4 && data.ErrorCode(err) != data.CodeBusy {
			t.Fatal("cross-target quota bypass", err)
		}
		if i == 0 {
			candidates[0] = r
		}
	}
	// Replay at quota and after expiry never allocates or changes expiry.
	want := candidates[0]
	want.Session.SessionID = "different-candidate"
	replay, err := s.OpenPreviewRecord(t.Context(), want, data.PreviewMaxSessions)
	if err != nil || replay.Session.SessionID != candidates[0].Session.SessionID {
		t.Fatal(replay, err)
	}
	want.Fingerprint = "changed"
	if _, err = s.OpenPreviewRecord(t.Context(), want, data.PreviewMaxSessions); data.ErrorCode(err) != data.CodeConflict {
		t.Fatal(err)
	}
}

func TestExpiredPreviewStopsCleanupProtectionWithoutLookup(t *testing.T) {
	now := time.Now()
	s, err := Open(filepath.Join(t.TempDir(), "cleanup.db"), Options{Now: func() time.Time { return now }})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := s.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	r := previewStoreCandidate("one", now)
	r.Session.SessionID = "session"
	r.RequestID = "request"
	lease := data.Lease{Target: r.Receipt.Target, OperationID: "cleanup", Fence: 1}
	if err = s.transact(t.Context(), true, func(d *document) error {
		d.Receipts[r.Receipt.ID] = r.Receipt
		d.RetainUntil[r.Receipt.ID] = now.Add(time.Second)
		d.Leases[key(lease.Target)] = leaseState{Fence: 1, OperationID: lease.OperationID, Until: now.Add(time.Hour)}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.OpenPreviewRecord(t.Context(), r, data.PreviewMaxSessions); err != nil {
		t.Fatal(err)
	}
	if err = s.CheckCleanup(t.Context(), lease, r.Receipt.StageID); data.ErrorCode(err) != data.CodeRecovery {
		t.Fatal("live preview was not protected", err)
	}
	now = now.Add(2 * time.Minute)
	if err = s.CheckCleanup(t.Context(), lease, r.Receipt.StageID); err != nil {
		t.Fatal("expired idle session retained cleanup protection", err)
	}
	// More expired sessions than one sweep batch cannot keep receipts protected.
	if err = s.transact(t.Context(), true, func(d *document) error {
		for i := 0; i < data.PreviewMaxPrune+1; i++ {
			copy := r
			copy.Session.SessionID = fmt.Sprintf("expired-%03d", i)
			d.PreviewSessions[copy.Session.SessionID] = copy
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if err = s.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err = s.GetReceipt(t.Context(), r.Receipt.ID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("expiry backlog protected receipt", err)
	}
}
