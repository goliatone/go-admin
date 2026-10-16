package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/goliatone/go-job/queue"
)

var gateActor = export.Actor{ID: "trusted-operator"}

func gateCheckpoint() ExportRecoveryCheckpoint {
	return ExportRecoveryCheckpoint{SetID: "restored-set-v1", CatalogSHA256: strings.Repeat("a", 64), PolicyRevision: "authoritative-policy-v2"}
}
func gatePolicy() ExportRecoveryPolicy {
	return ExportRecoveryPolicy{
		Authorize: func(ctx context.Context, a export.Actor, op string) error {
			if a.ID != gateActor.ID {
				return durableExportDenied()
			}
			return nil
		},
		VerifyCatalog: func(context.Context, ExportRecoveryCheckpoint) error { return nil }, Reconcile: func(context.Context, ExportRecoveryCheckpoint) error { return nil },
	}
}
func gateNew(t *testing.T, p ExportRecoveryPolicy) *DurableExportRecoveryGate {
	t.Helper()
	g, e := NewDurableExportRecoveryGate(p)
	adoptionRecoveryMust(t, e)
	return g
}
func gateResume(t *testing.T, g *DurableExportRecoveryGate) {
	t.Helper()
	adoptionRecoveryMust(t, g.Resume(context.Background(), gateActor, gateCheckpoint()))
}
func gateWait(t *testing.T, fn func() bool) {
	t.Helper()
	until := time.Now().Add(5 * time.Second)
	for !fn() {
		if time.Now().After(until) {
			t.Fatal("gate state did not settle")
		}
		time.Sleep(time.Millisecond)
	}
}
func TestDurableExportGatePoliciesAndCheckpoint(t *testing.T) {
	for _, which := range []string{"authorize", "catalog", "reconcile"} {
		t.Run(which, func(t *testing.T) {
			p := gatePolicy()
			switch which {
			case "authorize":
				p.Authorize = nil
			case "catalog":
				p.VerifyCatalog = nil
			case "reconcile":
				p.Reconcile = nil
			}
			if _, e := NewDurableExportRecoveryGate(p); e == nil {
				t.Fatal("incomplete trusted policy accepted")
			}
		})
	}
	for _, which := range []string{"set", "digest", "uppercase", "revision"} {
		t.Run(which, func(t *testing.T) {
			c := gateCheckpoint()
			switch which {
			case "set":
				c.SetID = " "
			case "digest":
				c.CatalogSHA256 = "bad"
			case "uppercase":
				c.CatalogSHA256 = strings.Repeat("A", 64)
			case "revision":
				c.PolicyRevision = ""
			}
			g := gateNew(t, gatePolicy())
			if e := g.Resume(context.Background(), gateActor, c); e == nil || !g.State().Sealed {
				t.Fatal("bad checkpoint admitted")
			}
		})
	}
}
func TestDurableExportGateResumePoliciesFailClosed(t *testing.T) {
	for _, fault := range []string{"actor", "authorize", "catalog", "reconcile", "cancel"} {
		t.Run(fault, func(t *testing.T) {
			p := gatePolicy()
			called := []string{}
			p.Authorize = func(context.Context, export.Actor, string) error {
				called = append(called, "authorize")
				if fault == "authorize" {
					return errors.New("denied")
				}
				return nil
			}
			p.VerifyCatalog = func(context.Context, ExportRecoveryCheckpoint) error {
				called = append(called, "catalog")
				if fault == "catalog" {
					return errors.New("untrusted catalog")
				}
				return nil
			}
			p.Reconcile = func(context.Context, ExportRecoveryCheckpoint) error {
				called = append(called, "reconcile")
				if fault == "reconcile" {
					return errors.New("revocation feed unavailable")
				}
				return nil
			}
			g := gateNew(t, p)
			ctx := context.Background()
			a := gateActor
			if fault == "actor" {
				a.ID = ""
			}
			if fault == "cancel" {
				c, cancel := context.WithCancel(ctx)
				cancel()
				ctx = c
			}
			if e := g.Resume(ctx, a, gateCheckpoint()); e == nil {
				t.Fatal("failed recovery opened gate")
			}
			if st := g.State(); !st.Sealed || st.Active != 0 || st.Resuming {
				t.Fatal(st)
			}
			want := map[string]int{"actor": 0, "authorize": 1, "catalog": 2, "reconcile": 3, "cancel": 0}[fault]
			if len(called) != want {
				t.Fatal(called)
			}
		})
	}
}
func TestDurableExportGateLeaseDrainAndStaleContext(t *testing.T) {
	g := gateNew(t, gatePolicy())
	if _, _, _, e := g.enter(context.Background()); e == nil {
		t.Fatal("new gate open")
	}
	gateResume(t, g)
	ctx, release, _, e := g.enter(context.Background())
	adoptionRecoveryMust(t, e)
	nested, done, _, e := g.enter(ctx)
	adoptionRecoveryMust(t, e)
	done()
	if g.State().Active != 1 {
		t.Fatal("nested lease counted twice")
	}
	if e = g.Seal(nested, gateActor); e == nil || g.State().Sealed {
		t.Fatal("self-drain accepted")
	}
	timeout, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if e = g.Seal(timeout, gateActor); !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal(e)
	}
	if st := g.State(); !st.Sealed || st.Active != 1 {
		t.Fatal(st)
	}
	if _, _, _, e = g.enter(context.Background()); e == nil {
		t.Fatal("sealed work admitted")
	}
	// In-flight nested work retains its lease, but a released context cannot be
	// reused as a credential after the gate closes.
	_, nestedDone, _, e := g.enter(ctx)
	adoptionRecoveryMust(t, e)
	nestedDone()
	release()
	release()
	if _, _, _, e = g.enter(ctx); e == nil {
		t.Fatal("expired context bypassed seal")
	}
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if g.State().Active != 0 {
		t.Fatal(g.State())
	}
	gateResume(t, g)
}
func TestDurableExportGateConcurrentResumeAndSeal(t *testing.T) {
	p := gatePolicy()
	entered := make(chan struct{})
	finish := make(chan struct{})
	p.VerifyCatalog = func(context.Context, ExportRecoveryCheckpoint) error { close(entered); <-finish; return nil }
	g := gateNew(t, p)
	result := make(chan error, 1)
	go func() { result <- g.Resume(context.Background(), gateActor, gateCheckpoint()) }()
	<-entered
	if e := g.Resume(context.Background(), gateActor, gateCheckpoint()); e == nil {
		t.Fatal("concurrent resume accepted")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if e := g.Seal(ctx, gateActor); !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal(e)
	}
	if !g.State().Sealed || g.State().Active != 1 {
		t.Fatal("reconciliation not retained by drain")
	}
	close(finish)
	if e := <-result; e == nil {
		t.Fatal("stale resume reopened sealed gate")
	}
	if st := g.State(); !st.Sealed || st.Active != 0 {
		t.Fatal(st)
	}
}
func TestDurableExportGateCancelledResumeAndControlContext(t *testing.T) {
	p := gatePolicy()
	ctx, cancel := context.WithCancel(context.Background())
	p.VerifyCatalog = func(work context.Context, _ ExportRecoveryCheckpoint) error { cancel(); return nil }
	g := gateNew(t, p)
	if e := g.Resume(ctx, gateActor, gateCheckpoint()); !errors.Is(e, context.Canceled) || !g.State().Sealed {
		t.Fatal(e)
	}
	p = gatePolicy()
	var other *DurableExportRecoveryGate
	p.Reconcile = func(work context.Context, _ ExportRecoveryCheckpoint) error {
		if _, _, _, e := other.enter(work); e == nil {
			t.Fatal("recovery control context admitted export work")
		}
		if e := other.Seal(work, gateActor); e == nil {
			t.Fatal("self-draining reconcile accepted")
		}
		return nil
	}
	other = gateNew(t, p)
	gateResume(t, other)
	work, done, e := g.migration(context.Background())
	adoptionRecoveryMust(t, e)
	if _, _, _, e = g.enter(work); e == nil {
		t.Fatal("migration admitted export")
	}
	if e = g.Resume(context.Background(), gateActor, gateCheckpoint()); e == nil {
		t.Fatal("resume raced migration")
	}
	done()
	if _, _, e = other.migration(context.Background()); e == nil {
		t.Fatal("open gate admitted migration")
	}
}
func TestDurableExportGateNestedChildOutlivesParent(t *testing.T) {
	g := gateNew(t, gatePolicy())
	gateResume(t, g)
	parent, parentDone, _, e := g.enter(context.Background())
	adoptionRecoveryMust(t, e)
	child, childDone, _, e := g.enter(parent)
	adoptionRecoveryMust(t, e)
	parentDone()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if e = g.Seal(ctx, gateActor); !errors.Is(e, context.DeadlineExceeded) || g.State().Active != 1 {
		t.Fatal("nested work disappeared from drain", e, g.State())
	}
	childDone()
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if _, _, _, e = g.enter(child); e == nil {
		t.Fatal("released child bypassed sealed gate")
	}
}

func TestDurableExportGateConcurrentAdmission(t *testing.T) {
	g := gateNew(t, gatePolicy())
	gateResume(t, g)
	var wg sync.WaitGroup
	for range 32 {
		wg.Go(func() {
			for range 100 {
				ctx, done, _, e := g.enter(context.Background())
				if e == nil {
					_, nested, _, e := g.enter(ctx)
					if e != nil {
						t.Error(e)
					} else {
						nested()
					}
					done()
				}
			}
		})
	}
	for range 10 {
		adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
		gateResume(t, g)
	}
	wg.Wait()
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if g.State().Active != 0 {
		t.Fatal(g.State())
	}
}
func TestDurableExportGateOperatorCommands(t *testing.T) {
	g := gateNew(t, gatePolicy())
	resume := &ResumeDurableExportsHandler{Gate: g}
	seal := &SealDurableExportsHandler{Gate: g}
	bus := admin.NewCommandBus(true)
	_, e := admin.RegisterCommand(bus, resume)
	adoptionRecoveryMust(t, e)
	_, e = admin.RegisterCommand(bus, seal)
	adoptionRecoveryMust(t, e)
	msg := ResumeDurableExports{Actor: gateActor, Checkpoint: gateCheckpoint()}
	raw, e := json.Marshal(msg)
	adoptionRecoveryMust(t, e)
	if strings.Contains(string(raw), gateActor.ID) {
		t.Fatal("operator actor serialized")
	}
	var out command.Result[ExportRecoveryGateState]
	ctx := command.ContextWithResult(context.Background(), &out)
	adoptionRecoveryMust(t, resume.Execute(ctx, msg))
	st, ok := out.Load()
	if !ok || st.Sealed {
		t.Fatal(st, ok)
	}
	adoptionRecoveryMust(t, seal.Execute(context.Background(), SealDurableExports{Actor: gateActor}))
	if !g.State().Sealed {
		t.Fatal("seal command failed")
	}
	if _, e = resume.Run(context.Background(), ResumeDurableExports{}); e == nil {
		t.Fatal("missing operator accepted")
	}
	if _, e = (&SealDurableExportsHandler{}).Run(context.Background(), SealDurableExports{Actor: gateActor}); e == nil {
		t.Fatal("missing service accepted")
	}
	if e = g.Resume(context.Background(), export.Actor{ID: "forged"}, gateCheckpoint()); e == nil {
		t.Fatal("unauthorized operator opened gate")
	}
}
func gateEnableFixture(t *testing.T, f *legacyFixture, p ExportRecoveryPolicy) *DurableExportRecoveryGate {
	t.Helper()
	g := gateNew(t, p)
	f.cfg.RecoveryGate = g
	f.h = f.newHost()
	adoptionRecoveryMust(t, f.h.Migrate(context.Background()))
	return g
}
func TestDurableExportGateHostFacadeSealed(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("retained", export.StateQueued)
	r := f.review("retained")
	before, stateErr := adoptionRecoveryState(f.db)
	adoptionRecoveryMust(t, stateErr)
	g := gateEnableFixture(t, f, gatePolicy())
	ctx := context.Background()
	calls := []struct {
		name string
		run  func() error
	}{
		{"request", func() error {
			_, e := f.h.RequestExport(ctx, f.actor, export.ExportRequest{Definition: "resources", Format: export.FormatCSV})
			return e
		}},
		{"generate", func() error {
			_, e := f.h.GenerateExport(ctx, f.actor, "retained", export.ExportRequest{Definition: "resources", Format: export.FormatCSV})
			return e
		}},
		{"cancel", func() error { _, e := f.h.CancelExport(ctx, f.actor, "retained"); return e }},
		{"delete", func() error { return f.h.DeleteExport(ctx, f.actor, "retained") }},
		{"status", func() error { _, e := f.h.Status(ctx, f.actor, "retained"); return e }},
		{"history", func() error { _, e := f.h.History(ctx, f.actor, export.ProgressFilter{}); return e }},
		{"download", func() error { _, e := f.h.DownloadMetadata(ctx, f.actor, "retained"); return e }},
		{"cleanup", func() error { _, e := f.h.Cleanup(ctx, time.Now()); return e }},
		{"schedule", func() error { _, e := f.h.TickSchedule(ctx, "Group A", "absent", time.Now(), 1); return e }},
		{"poll", func() error { return f.h.Poll(ctx) }},
		{"worker", func() error { return f.h.ExecuteMessage(ctx, &job.ExecutionMessage{}) }},
		{"preview", func() error { _, e := f.h.PreviewLegacyExport(ctx, f.actor, "retained", "profile-v2"); return e }},
		{"adopt", func() error { _, e := f.h.AdoptLegacyExport(ctx, f.actor, r); return e }},
		{"run", func() error { return f.h.Run(ctx) }},
	}
	for _, c := range calls {
		t.Run(c.name, func(t *testing.T) {
			if e := c.run(); e == nil || !strings.Contains(e.Error(), "sealed") {
				t.Fatal("sealed facade bypass", e)
			}
		})
	}
	adoptionRecoveryMust(t, adoptionRecoveryCompare(f.db, before))
	if f.sourceCalls.Load() != 0 || f.accepts.Load() != 0 || f.sends.Load() != 0 {
		t.Fatal("sealed host produced effects")
	}
	gateResume(t, g)
	f.apply(r)
	adoptionRecoveryMust(t, adoptionRecoveryExecute(t, f, true))
	if f.sourceCalls.Load() != 1 {
		t.Fatal("resumed worker did not generate")
	}
	if e := f.h.Migrate(ctx); e == nil {
		t.Fatal("live migration bypassed gate")
	}
	replacement := gateNew(t, gatePolicy())
	f.cfg.RecoveryGate = replacement
	f.h = f.newHost()
	if _, e := f.h.Status(ctx, f.actor, "retained"); e == nil {
		t.Fatal("restart retained old approval")
	}
}
func TestDurableExportGateTrustedCatalogAndReconciliation(t *testing.T) {
	for _, fault := range []string{"catalog", "restored-state", "revocation-feed", "revoked-account", "pass"} {
		t.Run(fault, func(t *testing.T) {
			f := newLegacyFixture(t)
			f.record("retained", export.StateCompleted)
			r := f.review("retained")
			expected, e := adoptionRecoveryState(f.db)
			adoptionRecoveryMust(t, e)
			p := gatePolicy()
			p.VerifyCatalog = func(ctx context.Context, c ExportRecoveryCheckpoint) error {
				if fault == "catalog" || c.CatalogSHA256 != gateCheckpoint().CatalogSHA256 {
					return errors.New("untrusted catalog digest")
				}
				return adoptionRecoveryCompare(f.db, expected)
			}
			p.Reconcile = func(ctx context.Context, c ExportRecoveryCheckpoint) error {
				if fault == "revocation-feed" {
					return errors.New("current revision unavailable")
				}
				if fault == "revoked-account" {
					_, updateErr := f.db.ExecContext(ctx, "UPDATE legacy_test_principals SET enabled=0")
					return updateErr
				}
				return nil
			}
			g := gateEnableFixture(t, f, p)
			if fault == "restored-state" {
				_, e = f.db.Exec("DELETE FROM legacy_test_resources")
				adoptionRecoveryMust(t, e)
			}
			e = g.Resume(context.Background(), gateActor, gateCheckpoint())
			if fault == "pass" || fault == "revoked-account" {
				adoptionRecoveryMust(t, e)
			} else {
				if e == nil || !g.State().Sealed {
					t.Fatal("failed recovery resumed")
				}
				return
			}
			_, e = f.h.AdoptLegacyExport(context.Background(), f.actor, r)
			if fault == "revoked-account" {
				if e == nil || f.accepts.Load() != 0 {
					t.Fatal("reconciled revocation bypassed current host policy")
				}
			} else {
				adoptionRecoveryMust(t, e)
			}
		})
	}
}

// Open deliberately ignores cancellation to model a source which cannot stop
// promptly. Seal must never claim quiescence while it or native shutdown is live.
type gateBlockedSource struct{ entered, finish chan struct{} }

func (s *gateBlockedSource) Open(context.Context, export.RowSourceSpec) (export.RowIterator, error) {
	close(s.entered)
	<-s.finish
	return &legacyIterator{}, nil
}
func gateBlockHost(t *testing.T, f *legacyFixture) *gateBlockedSource {
	t.Helper()
	s := &gateBlockedSource{entered: make(chan struct{}), finish: make(chan struct{})}
	f.h.Bundle.Runner.RowSources = export.NewRowSourceRegistry()
	adoptionRecoveryMust(t, f.h.Bundle.Runner.RowSources.Register("resources", func(export.ExportRequest, export.ResolvedDefinition) (export.RowSource, error) { return s, nil }))
	return s
}
func TestDurableExportGateDrainsActiveGeneration(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("retained", export.StateQueued)
	r := f.review("retained")
	g := gateEnableFixture(t, f, gatePolicy())
	gateResume(t, g)
	f.apply(r)
	source := gateBlockHost(t, f)
	result := make(chan error, 1)
	go func() { result <- adoptionRecoveryExecute(t, f, true) }()
	select {
	case <-source.entered:
	case <-time.After(5 * time.Second):
		t.Fatal("source did not start")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	e := g.Seal(ctx, gateActor)
	if !errors.Is(e, context.DeadlineExceeded) || g.State().Active == 0 {
		t.Fatal("active generation declared drained", e, g.State())
	}
	if _, e = f.h.Status(context.Background(), f.actor, "retained"); e == nil {
		t.Fatal("sealed metadata access accepted")
	}
	close(source.finish)
	adoptionRecoveryMust(t, <-result)
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if g.State().Active != 0 || f.count("export_webhook_targets") != 1 {
		t.Fatal("in-flight completion lost lease/publication")
	}
}
func TestDurableExportGateSealStopsNativeLifecycle(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("retained", export.StateQueued)
	r := f.review("retained")
	g := gateEnableFixture(t, f, gatePolicy())
	gateResume(t, g)
	f.apply(r)
	source := gateBlockHost(t, f)
	result := make(chan error, 1)
	go func() { result <- f.h.Run(context.Background()) }()
	select {
	case <-source.entered:
	case <-time.After(5 * time.Second):
		t.Fatal("native worker did not start")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	if e := g.Seal(ctx, gateActor); !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal(e)
	}
	if g.State().Active == 0 {
		t.Fatal("worker released lifetime lease before actual stop")
	}
	select {
	case e := <-result:
		t.Fatal("native Run ended before worker", e)
	default:
	}
	close(source.finish)
	select {
	case <-result:
	case <-time.After(5 * time.Second):
		t.Fatal("native shutdown did not finish")
	}
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if g.State().Active != 0 {
		t.Fatal(g.State())
	}
	before, e := adoptionRecoveryState(f.db)
	adoptionRecoveryMust(t, e)
	time.Sleep(120 * time.Millisecond)
	adoptionRecoveryMust(t, adoptionRecoveryCompare(f.db, before))
}
func TestDurableExportGateSharedHostLifecycles(t *testing.T) {
	f := newLegacyFixture(t)
	g := gateEnableFixture(t, f, gatePolicy())
	gateResume(t, g)
	other := f.newHost()
	results := make(chan error, 2)
	go func() { results <- f.h.Run(context.Background()) }()
	go func() { results <- other.Run(context.Background()) }()
	gateWait(t, func() bool { return g.State().Active == 2 })
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	adoptionRecoveryMust(t, g.Seal(ctx, gateActor))
	for range 2 {
		select {
		case e := <-results:
			if e != nil && !errors.Is(e, context.Canceled) {
				t.Fatal(e)
			}
		case <-ctx.Done():
			t.Fatal("shared host still running")
		}
	}
	if g.State().Active != 0 {
		t.Fatal(g.State())
	}
}

type gateHeartbeatDelivery struct{ entered, finish chan struct{} }

func (d *gateHeartbeatDelivery) Message() *job.ExecutionMessage                { return &job.ExecutionMessage{} }
func (d *gateHeartbeatDelivery) Ack(context.Context) error                     { return nil }
func (d *gateHeartbeatDelivery) Nack(context.Context, queue.NackOptions) error { return nil }
func (d *gateHeartbeatDelivery) Attempts() int                                 { return 3 }
func (d *gateHeartbeatDelivery) ExtendLease(context.Context, time.Duration) error {
	close(d.entered)
	<-d.finish
	return nil
}
func TestDurableExportGateHeartbeatOutlivesWorker(t *testing.T) {
	g := gateNew(t, gatePolicy())
	gateResume(t, g)
	run, stopped, _, e := g.enter(context.Background())
	adoptionRecoveryMust(t, e)
	native := &gateHeartbeatDelivery{entered: make(chan struct{}), finish: make(chan struct{})}
	d := &durableGatedExportDelivery{Delivery: native, gate: g}
	result := make(chan error, 1)
	go func() { result <- d.ExtendLease(run, time.Minute) }()
	<-native.entered
	stopped()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if e = g.Seal(ctx, gateActor); !errors.Is(e, context.DeadlineExceeded) || g.State().Active != 1 {
		t.Fatal("heartbeat I/O disappeared from drain", e, g.State())
	}
	close(native.finish)
	adoptionRecoveryMust(t, <-result)
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	if d.Attempts() != 3 {
		t.Fatal("native retry attempt lost")
	}
	if e = d.ExtendLease(run, time.Minute); e == nil {
		t.Fatal("stale heartbeat bypassed seal")
	}
}
