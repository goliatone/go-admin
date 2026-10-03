package datamodule

import (
	"context"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func (demoPolicy) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return "immutable-demo-test-policy", ctx.Err()
}

func previewService(t *testing.T, r *Runtime, now func() time.Time) *data.Service {
	t.Helper()
	s, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": r}, Target: r, Store: r.Store, Policy: demoPolicy{}, Resolve: demoPrincipal, WritesEnabled: true, Preview: data.ApplicationPreviewConfig{Adapter: r, Enabled: true, ApplicationID: "test", EnvironmentID: "dev", Now: now, Surfaces: []data.PreviewSurface{{ID: OrdersReportSurface, Label: "Synthetic orders", Kind: "report", EntityID: "orders", Fields: []string{"id", "amount", "local_day"}}}}})
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestApplicationPreviewConcurrentDurableOpenAndLostStage(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "concurrent.db")
	r, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	}()
	other, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := other.Close(); err != nil {
			t.Error(err)
		}
	}()
	s := previewService(t, r, time.Now)
	s2 := previewService(t, other, time.Now)
	q := previewPrepared(t, r, s, "ready", "concurrent")
	var wg sync.WaitGroup
	ids := make(chan string, 8)
	failures := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			service := s
			if i%2 == 1 {
				service = s2
			}
			out, err := service.OpenApplicationPreview(t.Context(), q)
			if err != nil {
				failures <- err
			} else {
				ids <- out.SessionID
			}
		}(i)
	}
	wg.Wait()
	close(ids)
	close(failures)
	for err := range failures {
		t.Fatal(err)
	}
	var id string
	for next := range ids {
		if id == "" {
			id = next
		}
		if next != id {
			t.Fatal("concurrent open allocated two sessions")
		}
	}
	record, err := r.LookupPreview(t.Context(), id)
	if err != nil {
		t.Fatal(err)
	}
	// A lost physical stage ends authority; reads cannot switch to active data.
	if _, err = r.db.ExecContext(t.Context(), `DELETE FROM data_example_stages WHERE id=?`, record.Receipt.StageID); err != nil {
		t.Fatal(err)
	}
	if _, _, err = s.WithApplicationPreview(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: id}, OrdersReportSurface); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("lost stage did not fail closed", err)
	}
	record, err = r.LookupPreview(t.Context(), id)
	if err != nil || record.Session.State != data.PreviewUnavailable {
		t.Fatal("lost stage retained authority", record, err)
	}
}

func TestApplicationPreviewRetainsPinnedReportAcrossActivation(t *testing.T) {
	r, err := Open(filepath.Join(t.TempDir(), "activation.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	}()
	s := previewService(t, r, time.Now)
	ready := previewPrepared(t, r, s, "ready", "pin-ready")
	quiet := previewPrepared(t, r, s, "quiet", "pin-quiet")
	verify := func(q data.OpenApplicationPreviewInput) {
		t.Helper()
		in := scenarioInput(t, r, q.Selection.Scenario.ID, q.RequestID+"-verify")
		in.ReceiptID = q.Selection.ReceiptID
		result, err := s.Run(t.Context(), data.Verify, in)
		if err != nil || result.Verification == nil || !result.Verification.Passed() {
			t.Fatal(result, err)
		}
	}
	verify(ready)
	verify(quiet)
	a, err := s.OpenApplicationPreview(t.Context(), ready)
	if err != nil {
		t.Fatal(err)
	}
	for i, q := range []data.OpenApplicationPreviewInput{ready, quiet} {
		generation := uint64(i)
		in := scenarioInput(t, r, q.Selection.Scenario.ID, q.RequestID+"-activate")
		in.ReceiptID = q.Selection.ReceiptID
		in.ExpectedGeneration = &generation
		result, err := s.Run(t.Context(), data.Activate, in)
		if err != nil || result.Activation == nil {
			t.Fatal(result, err)
		}
	}
	active, err := r.ActiveOrdersReport(t.Context(), data.TargetKey{ScopeKey: "demo", TargetID: TargetID})
	if err != nil || active.OrderCount != 0 {
		t.Fatal(active, err)
	}
	ctx, read, err := s.WithApplicationPreview(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: a.SessionID}, OrdersReportSurface)
	if err != nil {
		t.Fatal(err)
	}
	report, err := r.PreviewOrdersReport(ctx, read)
	if err != nil || report.OrderCount != 3 || report.AmountTotal != 250 {
		t.Fatal("active route repinned preview", report, err)
	}
	before, err := s.Active(t.Context(), TargetID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.CloseApplicationPreview(t.Context(), data.CloseApplicationPreviewCommand{SessionID: a.SessionID}); err != nil {
		t.Fatal(err)
	}
	after, err := s.Active(t.Context(), TargetID)
	if err != nil || after.Activation != before.Activation {
		t.Fatal("close changed active route", err)
	}
}
func previewPrepared(t *testing.T, r *Runtime, s *data.Service, scenario, key string) data.OpenApplicationPreviewInput {
	t.Helper()
	result, err := s.Run(t.Context(), data.Prepare, scenarioInput(t, r, scenario, key))
	if err != nil || result.Receipt == nil {
		t.Fatal(result, err)
	}
	x := result.Receipt
	return data.OpenApplicationPreviewInput{Selection: data.ExploreSelection{Dataset: x.Dataset, Scenario: x.Scenario, TargetID: TargetID, Context: data.ExplorePrepared, ReceiptID: x.ID, ContentRevision: x.ContentRevision}, SurfaceID: OrdersReportSurface, RequestID: key + "-launch"}
}
func TestApplicationPreviewReferenceReadyQuietRestartAndNoFallback(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "preview.db")
	r, err := Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	}()
	s := previewService(t, r, time.Now)
	ready := previewPrepared(t, r, s, "ready", "ready")
	quiet := previewPrepared(t, r, s, "quiet", "quiet")
	before, err := s.Active(t.Context(), TargetID)
	if err != nil {
		t.Fatal(err)
	}
	a, err := s.OpenApplicationPreview(t.Context(), ready)
	if err != nil {
		t.Fatal(err)
	}
	b, err := s.OpenApplicationPreview(t.Context(), quiet)
	if err != nil {
		t.Fatal(err)
	}
	readReport := func(id string, count, total int) {
		t.Helper()
		ctx, read, err := s.WithApplicationPreview(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: id}, OrdersReportSurface)
		if err != nil {
			t.Fatal(err)
		}
		report, err := r.PreviewOrdersReport(ctx, read)
		if err != nil || report.OrderCount != count || report.AmountTotal != total {
			t.Fatal(report, err)
		}
		if err = s.ValidatePreviewDelivery(ctx, read.Session); err != nil {
			t.Fatal(err)
		}
		if _, err = r.PreviewOrdersReport(t.Context(), read); data.ErrorCode(err) != data.CodeDenied {
			t.Fatal("missing isolation context accepted", err)
		}
		if _, err = r.ActiveOrdersReport(ctx, data.TargetKey{ScopeKey: "demo", TargetID: TargetID}); data.ErrorCode(err) != data.CodeDenied {
			t.Fatal("production fallback", err)
		}
		if _, err = s.Run(ctx, data.Prepare, scenarioInput(t, r, "ready", "forged-effect")); data.ErrorCode(err) != data.CodeDenied {
			t.Fatal("lifecycle dispatched from preview", err)
		}
		if _, err = s.LookupArtifact(ctx, "kitchen-sink", "forged-export"); data.ErrorCode(err) != data.CodeDenied {
			t.Fatal("preview export permitted", err)
		}
		if data.RejectPreviewEffects(ctx) == nil || read.CacheKey() == "" {
			t.Fatal("missing effect/cache boundary")
		}
	}
	readReport(a.SessionID, 3, 250)
	readReport(b.SessionID, 0, 0)
	// Opening and serving preview neither verifies nor activates the stage.
	after, err := s.Active(t.Context(), TargetID)
	if err != nil || before.Activation != after.Activation {
		t.Fatal("preview changed generation", err)
	}
	if err = r.Close(); err != nil {
		t.Fatal(err)
	}
	r, err = Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	s = previewService(t, r, time.Now)
	replay, err := s.OpenApplicationPreview(t.Context(), ready)
	if err != nil || replay.SessionID != a.SessionID || !replay.ExpiresAt.Equal(a.ExpiresAt) {
		t.Fatal(replay, err)
	}
	readReport(a.SessionID, 3, 250)
	readReport(b.SessionID, 0, 0)
	if _, err = s.CloseApplicationPreview(t.Context(), data.CloseApplicationPreviewCommand{SessionID: a.SessionID}); err != nil {
		t.Fatal(err)
	}
	readReport(b.SessionID, 0, 0)
	if _, err = s.ApplicationPreviewRead(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: a.SessionID}, OrdersReportSurface); data.ErrorCode(err) != data.CodeGone {
		t.Fatal(err)
	}
	if _, err = s.LookupReceipt(t.Context(), TargetID, ready.Selection.ReceiptID); err != nil {
		t.Fatal("close deleted prepared receipt", err)
	}
}

func TestApplicationPreviewReferenceProtectedRetentionAndExpiry(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "retention.db")
	var clock atomic.Int64
	clock.Store(time.Now().UnixNano())
	now := func() time.Time { return time.Unix(0, clock.Load()) }
	r, err := OpenWithOptions(filename, RuntimeOptions{Store: sqlitestore.Options{Now: now, ReceiptRetention: time.Hour}})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	}()
	s := previewService(t, r, now)
	q := previewPrepared(t, r, s, "ready", "retain")
	// Open just before ordinary retention elapses; TTL alone cannot protect this.
	clock.Add(int64(59 * time.Minute))
	session, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	clock.Add(int64(2 * time.Minute))
	if err = r.Store.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	ctx, read, err := s.WithApplicationPreview(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}, OrdersReportSurface)
	if err != nil {
		t.Fatal(err)
	}
	if report, err := r.PreviewOrdersReport(ctx, read); err != nil || report.AmountTotal != 250 {
		t.Fatal(report, err)
	}
	clock.Add(int64(20 * time.Minute))
	expired, err := s.ApplicationPreviewSession(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID})
	if err != nil || expired.State != data.PreviewExpired {
		t.Fatal(expired, err)
	}
	if err = r.PrunePreviews(context.Background(), data.PreviewMaxPrune+1); data.ErrorCode(err) != data.CodeInvalid {
		t.Fatal(err)
	}
	if err = r.Store.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err = s.LookupReceipt(t.Context(), TargetID, q.Selection.ReceiptID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("released receipt remained protected", err)
	}
	// Expiry/prune removes session protection/authority, never physical stages.
	var count int
	if err = r.db.QueryRowContext(t.Context(), `SELECT count(*) FROM data_example_records`).Scan(&count); err != nil || count != 3 {
		t.Fatal(count, err)
	}
}

func TestApplicationPreviewIdleExpirySweepAndStartup(t *testing.T) {
	file := filepath.Join(t.TempDir(), "idle-expiry.db")
	var clock atomic.Int64
	clock.Store(time.Now().UnixNano())
	now := func() time.Time { return time.Unix(0, clock.Load()) }
	options := RuntimeOptions{Store: sqlitestore.Options{Now: now}, PreviewCleanupInterval: 5 * time.Millisecond}
	r, err := OpenWithOptions(file, options)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	})
	service := previewService(t, r, now)
	q := previewPrepared(t, r, service, "ready", "idle")
	session, err := service.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	clock.Add(int64(data.PreviewMaxLifetime + time.Minute))
	// Observe persistence directly: neither lookup through Service nor explicit
	// pruning may drive expiry. The runtime's worker must end idle authority.
	deadline := time.Now().Add(2 * time.Second)
	for {
		record, err := r.Store.LookupPreviewRecord(t.Context(), session.SessionID)
		if err != nil {
			t.Fatal(err)
		}
		if record.Session.State == data.PreviewExpired {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("idle preview never expired")
		}
		time.Sleep(5 * time.Millisecond)
	}
	var count int
	if err = r.db.QueryRowContext(t.Context(), `SELECT count(*) FROM data_example_records`).Scan(&count); err != nil || count != 3 {
		t.Fatal("sweep deleted physical stage", count, err)
	}
	// A process can stop before the next sweep; startup reclaims persisted expiry.
	q.RequestID = "restart-expiry"
	next, err := service.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	if err = r.Close(); err != nil {
		t.Fatal(err)
	}
	clock.Add(int64(data.PreviewMaxLifetime + time.Minute))
	options.PreviewCleanupInterval = time.Minute
	r, err = OpenWithOptions(file, options)
	if err != nil {
		t.Fatal(err)
	}
	record, err := r.Store.LookupPreviewRecord(t.Context(), next.SessionID)
	if err != nil || record.Session.State != data.PreviewExpired {
		t.Fatal("startup left expired idle preview ready", record, err)
	}
	// Close joins the worker before closing either pool, and is idempotent.
	if err = r.Close(); err != nil {
		t.Fatal(err)
	}
	if err = r.Close(); err != nil {
		t.Fatal(err)
	}
}
