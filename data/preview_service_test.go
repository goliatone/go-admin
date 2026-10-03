package data_test

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/goliatone/go-admin/data"
	"strconv"
	"sync"
	"testing"
	"time"
)

type previewTestAdapter struct {
	mu          sync.Mutex
	records     map[string]data.PreviewRecord
	requests    map[string]string
	now         func() time.Time
	afterOpen   func()
	afterReplay func()
	revision    string
}

func (*previewTestAdapter) PreviewGuarantees() data.PreviewGuarantees {
	return data.PreviewGuarantees{Durable: true, Isolation: true, ReadOnly: true, Retention: true, Cleanup: true}
}
func (*previewTestAdapter) PreviewReadiness(ctx context.Context, _ data.Principal, _ data.ExploreRead) error {
	return ctx.Err()
}
func (a *previewTestAdapter) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return a.revision, ctx.Err()
}
func (a *previewTestAdapter) OpenPreview(ctx context.Context, w data.PreviewRecord, quota int) (data.PreviewRecord, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	key := w.Principal.ActorID + ":" + w.Principal.ScopeKey + ":" + w.RequestID
	if id := a.requests[key]; id != "" {
		r := a.records[id]
		if r.Fingerprint != w.Fingerprint {
			return data.PreviewRecord{}, data.Error(data.CodeConflict)
		}
		if a.afterReplay != nil {
			a.afterReplay()
		}
		return r, ctx.Err()
	}
	count := 0
	for _, r := range a.records {
		if r.Principal == w.Principal && r.Session.State == data.PreviewReady && a.now().Before(r.Session.ExpiresAt) {
			count++
		}
	}
	if count >= quota {
		return data.PreviewRecord{}, data.Error(data.CodeBusy)
	}
	a.requests[key] = w.Session.SessionID
	a.records[w.Session.SessionID] = w
	if a.afterOpen != nil {
		a.afterOpen()
	}
	return w, ctx.Err()
}
func (a *previewTestAdapter) LookupPreview(ctx context.Context, id string) (data.PreviewRecord, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	r, ok := a.records[id]
	if !ok {
		return r, data.Error(data.CodeGone)
	}
	return r, ctx.Err()
}
func (a *previewTestAdapter) InspectPreview(ctx context.Context, r data.PreviewRecord) error {
	x, err := a.LookupPreview(ctx, r.Session.SessionID)
	if err != nil {
		return err
	}
	if x.Session.State != data.PreviewReady || !a.now().Before(x.Session.ExpiresAt) {
		return data.Error(data.CodeGone)
	}
	return nil
}
func (a *previewTestAdapter) EndPreview(ctx context.Context, id, state string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	r := a.records[id]
	if r.Session.State == data.PreviewReady {
		r.Session.State = state
		a.records[id] = r
	}
	return ctx.Err()
}
func (*previewTestAdapter) PrunePreviews(ctx context.Context, _ int) error { return ctx.Err() }

// This fixture's Policy is immutable; identity failures are supplied separately
// by Resolve. Mutable real hosts must supply a durable non-reused revision.
type immutablePreviewPolicy struct{ data.Policy }

func (immutablePreviewPolicy) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return "immutable-test-policy", ctx.Err()
}

func previewFixture(t *testing.T) (*fixture, *previewTestAdapter, *data.Service, data.OpenApplicationPreviewInput) {
	t.Helper()
	f := newFixture(t)
	r := prepared(t, f, "preview-stage")
	a := &previewTestAdapter{records: map[string]data.PreviewRecord{}, requests: map[string]string{}, revision: "1", now: func() time.Time { return time.Unix(0, f.now.Load()) }}
	cfg := f.serviceConfig(f.store)
	cfg.Policy = immutablePreviewPolicy{cfg.Policy}
	cfg.Preview = data.ApplicationPreviewConfig{Adapter: a, Enabled: true, ApplicationID: "test", EnvironmentID: "dev", Now: a.now, Surfaces: []data.PreviewSurface{{ID: "report", Label: "Orders", Kind: "report"}}}
	s, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	q := data.OpenApplicationPreviewInput{Selection: data.ExploreSelection{Dataset: r.Dataset, Scenario: r.Scenario, TargetID: r.Target.TargetID, Context: data.ExplorePrepared, ReceiptID: r.ID, ContentRevision: r.ContentRevision}, SurfaceID: "report", RequestID: "launch"}
	return f, a, s, q
}
func TestPreviewServiceReplayQuotaExpiryCloseAndIsolation(t *testing.T) {
	f, _, s, q := previewFixture(t)
	before, err := s.Active(t.Context(), q.Selection.TargetID)
	if err != nil {
		t.Fatal(err)
	}
	first, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	f.now.Add(int64(time.Minute))
	second, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil || first.SessionID != second.SessionID || first.ExpiresAt != second.ExpiresAt {
		t.Fatal(second, err)
	}
	q.SurfaceID = "missing"
	if _, err = s.OpenApplicationPreview(t.Context(), q); data.ErrorCode(err) != data.CodeGone {
		t.Fatal(err)
	}
	q.SurfaceID = "report"
	for i := 0; i < 3; i++ {
		q.RequestID = "launch-" + strconv.Itoa(i)
		if _, err = s.OpenApplicationPreview(t.Context(), q); err != nil {
			t.Fatal(err)
		}
	}
	q.RequestID = "fifth"
	if _, err = s.OpenApplicationPreview(t.Context(), q); data.ErrorCode(err) != data.CodeBusy {
		t.Fatal(err)
	}
	actor := f.principal.ActorID
	f.principal.ActorID = "bob"
	if _, err = s.ApplicationPreviewSession(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: first.SessionID}); data.ErrorCode(err) != data.CodeGone {
		t.Fatal(err)
	}
	f.principal.ActorID = actor
	encoded, err := json.Marshal(first)
	if err != nil {
		t.Fatal(err)
	}
	var forged data.ApplicationPreviewSession
	if err = json.Unmarshal(encoded, &forged); err != nil {
		t.Fatal(err)
	}
	if err = s.ValidatePreviewDelivery(t.Context(), forged); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("JSON created authority", err)
	}
	if _, err = s.ApplicationPreviewRead(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: first.SessionID}, "other"); data.ErrorCode(err) != data.CodeGone {
		t.Fatal(err)
	}
	closed, err := s.CloseApplicationPreview(t.Context(), data.CloseApplicationPreviewCommand{SessionID: first.SessionID})
	if err != nil || closed.State != data.PreviewClosed {
		t.Fatal(closed, err)
	}
	closed, err = s.CloseApplicationPreview(t.Context(), data.CloseApplicationPreviewCommand{SessionID: first.SessionID})
	if err != nil || closed.State != data.PreviewClosed {
		t.Fatal(closed, err)
	}
	q.RequestID = "launch"
	if _, err = s.OpenApplicationPreview(t.Context(), q); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("closed key relaunched", err)
	}
	f.now.Add(int64(30 * time.Minute))
	q.RequestID = "expired"
	fresh, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	f.now.Add(int64(16 * time.Minute))
	expired, err := s.ApplicationPreviewSession(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: fresh.SessionID})
	if err != nil || expired.State != data.PreviewExpired {
		t.Fatal(expired, err)
	}
	after, err := s.Active(t.Context(), q.Selection.TargetID)
	if err != nil || after.Activation != before.Activation {
		t.Fatal("preview changed activation", err)
	}
}
func TestPreviewServiceLateRevocationCancellationAndRollback(t *testing.T) {
	f, a, s, q := previewFixture(t)
	a.afterOpen = func() { f.revoked.Store(true) }
	if out, err := s.OpenApplicationPreview(t.Context(), q); data.ErrorCode(err) != data.CodeDenied || out.SessionID != "" {
		t.Fatal(out, err)
	}
	for _, r := range a.records {
		if r.Session.State == data.PreviewReady {
			t.Fatal("partial launch retained authority")
		}
	}
	f.revoked.Store(false)
	a.afterOpen = nil
	q.RequestID = "fence"
	out, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.ValidatePreviewDelivery(t.Context(), out, func(ctx context.Context) (context.Context, error) { a.revision = "2"; return ctx, nil }); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("late policy revision leaked session", err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err = s.OpenApplicationPreview(ctx, q); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
}

func TestPreviewFinalHostFailureAndRequestIdentity(t *testing.T) {
	f, a, s, q := previewFixture(t)
	out, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	f.principal.ExecutionID = "next-request"
	f.principal.CorrelationID = "trace"
	replay, err := s.OpenApplicationPreview(t.Context(), q)
	if err != nil || replay.SessionID != out.SessionID {
		t.Fatal("request metadata changed session owner", replay, err)
	}
	if _, err = s.ApplicationPreviewRead(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: out.SessionID}, q.SurfaceID); err != nil {
		t.Fatal(err)
	}
	if err = s.ValidatePreviewDelivery(t.Context(), replay, func(ctx context.Context) (context.Context, error) { return nil, data.Error(data.CodeDenied) }); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal(err)
	}
	record, err := a.LookupPreview(t.Context(), out.SessionID)
	if err != nil || record.Session.State != data.PreviewUnavailable {
		t.Fatal("final host failure left live authority", record, err)
	}
	q.RequestID = "deadline"
	out, err = s.OpenApplicationPreview(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.ValidatePreviewDelivery(t.Context(), out, func(context.Context) (context.Context, error) { return context.Background(), nil }); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("host detached deadline", err)
	}
}

func TestPreviewOriginalAuthorizationRevisionSurvivesRequests(t *testing.T) {
	_, adapter, service, input := previewFixture(t)
	session, err := service.OpenApplicationPreview(t.Context(), input)
	if err != nil {
		t.Fatal(err)
	}
	// Monotonic revocation/restoration epochs must invalidate an existing
	// session even when current grants and principal hashes match again.
	adapter.revision = "restored-epoch-2"
	if _, err = service.ApplicationPreviewSession(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("old authorization epoch revived", err)
	}
	record, err := adapter.LookupPreview(t.Context(), session.SessionID)
	if err != nil || record.Session.State != data.PreviewUnavailable {
		t.Fatal(record, err)
	}
	input.RequestID = "new-authorization-epoch"
	if _, err = service.OpenApplicationPreview(t.Context(), input); err != nil {
		t.Fatal(err)
	}
}

func TestPreviewScopeChangeAndCancelledAllocationEndAuthority(t *testing.T) {
	f, adapter, service, input := previewFixture(t)
	session, err := service.OpenApplicationPreview(t.Context(), input)
	if err != nil {
		t.Fatal(err)
	}
	if err = service.ValidatePreviewHost(t.Context(), "wrong-app", "dev", f.principal.ActorID, f.principal.ScopeKey); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("foreign application accepted", err)
	}
	scope := f.principal.ScopeKey
	f.principal.ScopeKey = "foreign-scope"
	if _, err = service.ApplicationPreviewSession(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("foreign scope read accepted", err)
	}
	f.principal.ScopeKey = scope
	if _, err = service.ApplicationPreviewRead(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}, input.SurfaceID); data.ErrorCode(err) != data.CodeGone {
		t.Fatal("scope change revived authority", err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	adapter.afterOpen = cancel
	input.RequestID = "cancelled-during-allocation"
	if out, openErr := service.OpenApplicationPreview(ctx, input); !errors.Is(openErr, context.Canceled) || out.SessionID != "" {
		t.Fatal("cancelled allocation launched", out, openErr)
	}
	for _, record := range adapter.records {
		if record.Session.State == data.PreviewReady {
			t.Fatal("cancelled allocation retained live resources")
		}
	}
	if _, err = service.LookupReceipt(t.Context(), input.Selection.TargetID, input.Selection.ReceiptID); err != nil {
		t.Fatal("preview cleanup deleted receipt", err)
	}
}

func TestPreviewRequestFailuresPreserveExistingAuthority(t *testing.T) {
	for _, failure := range []error{context.Canceled, context.DeadlineExceeded, data.Error(data.CodeProvider)} {
		t.Run(failure.Error(), func(t *testing.T) {
			_, adapter, service, input := previewFixture(t)
			session, err := service.OpenApplicationPreview(t.Context(), input)
			if err != nil {
				t.Fatal(err)
			}
			err = service.ValidatePreviewDelivery(t.Context(), session, func(ctx context.Context) (context.Context, error) { return ctx, failure })
			if err == nil {
				t.Fatal("failure permitted delivery")
			}
			record, err := adapter.LookupPreview(t.Context(), session.SessionID)
			if err != nil || record.Session.State != data.PreviewReady {
				t.Fatal("request failure withdrew existing authority", record, err)
			}
			if _, err = service.ApplicationPreviewRead(t.Context(), data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}, input.SurfaceID); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestPreviewCancelledReplayDoesNotOwnAllocation(t *testing.T) {
	_, adapter, service, input := previewFixture(t)
	session, err := service.OpenApplicationPreview(t.Context(), input)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	adapter.afterReplay = cancel
	if _, err = service.OpenApplicationPreview(ctx, input); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	record, err := adapter.LookupPreview(t.Context(), session.SessionID)
	if err != nil || record.Session.State != data.PreviewReady {
		t.Fatal("cancelled replay destroyed another request's allocation", record, err)
	}
	adapter.afterReplay = nil
	replay, err := service.OpenApplicationPreview(t.Context(), input)
	if err != nil {
		t.Fatal(err)
	}
	if err = service.DiscardPreviewLaunch(ctx, replay); err != nil {
		t.Fatal(err)
	}
	record, err = adapter.LookupPreview(t.Context(), session.SessionID)
	if err != nil || record.Session.State != data.PreviewReady {
		t.Fatal("transport rollback destroyed replay", record, err)
	}
	// A transport owns only a new allocation, including a cancelled response.
	input.RequestID = "undelivered-launch"
	fresh, err := service.OpenApplicationPreview(t.Context(), input)
	if err != nil {
		t.Fatal(err)
	}
	if err = service.DiscardPreviewLaunch(ctx, fresh); err != nil {
		t.Fatal(err)
	}
	record, err = adapter.LookupPreview(t.Context(), fresh.SessionID)
	if err != nil || record.Session.State != data.PreviewUnavailable {
		t.Fatal("undelivered new allocation remained live", record, err)
	}
}

func TestPreviewRequiresExplicitHostRevision(t *testing.T) {
	f, adapter, _, _ := previewFixture(t)
	cfg := f.serviceConfig(f.store)
	cfg.Preview = data.ApplicationPreviewConfig{Enabled: true, Adapter: adapter, ApplicationID: "app", EnvironmentID: "dev"}
	if _, err := data.NewService(cfg); data.ErrorCode(err) != data.CodeUnavailable {
		t.Fatal("enabled without host epoch", err)
	}
	cfg.Preview.Enabled = false
	if _, err := data.NewService(cfg); err != nil {
		t.Fatal("disabled preview changed mandatory policy interface", err)
	}
}
