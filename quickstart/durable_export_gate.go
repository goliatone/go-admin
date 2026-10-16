package quickstart

import (
	"context"
	"sync"

	"github.com/goliatone/go-export/export"
)

// ExportRecoveryCheckpoint contains reviewed references, not proof of recovery.
// Trusted callbacks must verify the complete restored set and authoritative
// current policy revision. Approval is process-local and never survives restart.
type ExportRecoveryCheckpoint struct {
	SetID          string `json:"set_id"`
	CatalogSHA256  string `json:"catalog_sha256"`
	PolicyRevision string `json:"policy_revision"`
}

func (c ExportRecoveryCheckpoint) Validate() error {
	if !validLegacyRef(c.SetID) || !validLegacyDigest(c.CatalogSHA256) || !validLegacyRef(c.PolicyRevision) {
		return durableExportInvalid("recovery set, catalog SHA256 and current policy revision required")
	}
	return nil
}

// ExportRecoveryPolicy is trusted consuming-host code. Authorize is read-only
// current operator policy for "seal" or "resume". VerifyCatalog must verify the
// complete restored set against independently trusted catalog custody; Reconcile
// must apply/check authoritative post-snapshot revocations before returning.
// Callbacks must honor cancellation and must not call gate control operations.
type ExportRecoveryPolicy struct {
	Authorize     func(context.Context, export.Actor, string) error
	VerifyCatalog func(context.Context, ExportRecoveryCheckpoint) error
	Reconcile     func(context.Context, ExportRecoveryCheckpoint) error
}
type ExportRecoveryGateState struct {
	Sealed   bool `json:"sealed"`
	Active   int  `json:"active"`
	Resuming bool `json:"resuming"`
}

// DurableExportRecoveryGate drains work admitted through the host facade and
// native Run lifecycle in this process. All host instances in the same process
// must share the gate. Raw persistence/runner/webhook/worker handles, external
// receivers and other processes require separate consuming-host fences.
// A zero value is invalid; construct a new sealed gate for every process start.
type DurableExportRecoveryGate struct {
	mu              sync.Mutex
	policy          ExportRecoveryPolicy
	open, resuming  bool
	active, sealers int
	generation      uint64
	stop, drained   chan struct{}
}
type exportGateLease struct {
	gate   *DurableExportRecoveryGate
	parent *exportGateLease
	active bool
	work   bool
	stop   <-chan struct{}
}
type exportGateContextKey struct{}

func exportLeaseFromContext(ctx context.Context) *exportGateLease {
	if lease, ok := ctx.Value(exportGateContextKey{}).(*exportGateLease); ok {
		return lease
	}
	return nil
}

func NewDurableExportRecoveryGate(policy ExportRecoveryPolicy) (*DurableExportRecoveryGate, error) {
	g := &DurableExportRecoveryGate{policy: policy, stop: make(chan struct{}), drained: make(chan struct{})}
	if e := g.validate(); e != nil {
		return nil, e
	}
	close(g.stop)
	close(g.drained)
	return g, nil
}
func (g *DurableExportRecoveryGate) validate() error {
	if g == nil || g.policy.Authorize == nil || g.policy.VerifyCatalog == nil || g.policy.Reconcile == nil {
		return durableExportInvalid("recovery gate requires trusted operator, catalog and reconciliation policies")
	}
	return nil
}
func (g *DurableExportRecoveryGate) State() ExportRecoveryGateState {
	if g == nil {
		return ExportRecoveryGateState{Sealed: true}
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	return ExportRecoveryGateState{Sealed: !g.open, Active: g.active, Resuming: g.resuming}
}
func (g *DurableExportRecoveryGate) leaseLocked(ctx context.Context, work bool) (context.Context, func(), <-chan struct{}) {
	if g.active == 0 {
		g.drained = make(chan struct{})
	}
	g.active++
	parent := exportLeaseFromContext(ctx)
	l := &exportGateLease{gate: g, parent: parent, active: true, work: work, stop: g.stop}
	release := func() {
		g.mu.Lock()
		defer g.mu.Unlock()
		if !l.active {
			return
		}
		l.active = false
		g.active--
		if g.active == 0 {
			close(g.drained)
		}
	}
	return context.WithValue(ctx, exportGateContextKey{}, l), release, l.stop
}

// Retain ancestry when a nested context finishes before its parent. This
// prevents a control call using that context from waiting on its own ancestor.
// Only active flags belonging to g are read while holding g.mu.
func (g *DurableExportRecoveryGate) activeLeaseLocked(ctx context.Context) *exportGateLease {
	l := exportLeaseFromContext(ctx)
	for ; l != nil; l = l.parent {
		if l.gate == g && l.active {
			return l
		}
	}
	return nil
}
func (g *DurableExportRecoveryGate) enter(ctx context.Context) (context.Context, func(), <-chan struct{}, error) {
	if ctx == nil {
		return ctx, nil, nil, durableExportInvalid("export work context required")
	}
	if e := ctx.Err(); e != nil {
		return ctx, nil, nil, e
	}
	if g == nil {
		return ctx, func() {}, nil, nil
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if l := g.activeLeaseLocked(ctx); l != nil {
		if !l.work {
			return ctx, nil, nil, durableExportInvalid("export work cannot run within recovery control")
		}
		// Count nested calls independently so an asynchronous child cannot
		// outlive its parent lease and disappear from a concurrent drain.
		work, release, stop := g.leaseLocked(ctx, true)
		return work, release, stop, nil
	}
	if !g.open {
		return ctx, nil, nil, export.NewError(export.KindAuthz, "durable exports are sealed", nil)
	}
	ctx, release, stop := g.leaseLocked(ctx, true)
	return ctx, release, stop, nil
}
func (g *DurableExportRecoveryGate) migration(ctx context.Context) (context.Context, func(), error) {
	if g == nil {
		return ctx, func() {}, nil
	}
	if ctx == nil {
		return ctx, nil, durableExportInvalid("migration context required")
	}
	if e := ctx.Err(); e != nil {
		return ctx, nil, e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.open || g.active != 0 || g.resuming || g.sealers != 0 {
		return ctx, nil, durableExportInvalid("migration requires an idle sealed recovery gate")
	}
	ctx, release, _ := g.leaseLocked(ctx, false)
	return ctx, release, nil
}
func (g *DurableExportRecoveryGate) authorize(ctx context.Context, a export.Actor, operation string) error {
	if e := g.validate(); e != nil {
		return e
	}
	if ctx == nil {
		return durableExportInvalid("operator context required")
	}
	if e := ctx.Err(); e != nil {
		return e
	}
	if a.ID == "" {
		return durableExportDenied()
	}
	return g.policy.Authorize(ctx, a, operation)
}

// Seal rejects new work, stops native Run lifecycles and waits for all admitted
// calls, migration/reconciliation and worker shutdown to finish. Timeout leaves
// admission sealed; it never declares outstanding work quiescent.
func (g *DurableExportRecoveryGate) Seal(ctx context.Context, a export.Actor) error {
	if e := g.authorize(ctx, a, "seal"); e != nil {
		return e
	}
	g.mu.Lock()
	if l := g.activeLeaseLocked(ctx); l != nil {
		g.mu.Unlock()
		return durableExportInvalid("cannot seal from active export work")
	}
	g.generation++
	if g.open {
		g.open = false
		close(g.stop)
	}
	g.sealers++
	done := g.drained
	g.mu.Unlock()
	defer func() { g.mu.Lock(); g.sealers--; g.mu.Unlock() }()
	select {
	case <-done:
		return ctx.Err()
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Resume authorizes the current operator, verifies catalog-anchored restoration
// and reconciles current policy while admission is closed. Concurrent Seal or
// cancellation invalidates the attempt, even if callbacks subsequently succeed.
func (g *DurableExportRecoveryGate) Resume(ctx context.Context, a export.Actor, c ExportRecoveryCheckpoint) error {
	if e := c.Validate(); e != nil {
		return e
	}
	if e := g.authorize(ctx, a, "resume"); e != nil {
		return e
	}
	g.mu.Lock()
	if g.open || g.resuming || g.active != 0 || g.sealers != 0 {
		g.mu.Unlock()
		return durableExportInvalid("resume requires an idle sealed recovery gate")
	}
	g.resuming = true
	generation := g.generation
	work, release, _ := g.leaseLocked(ctx, false)
	g.mu.Unlock()
	defer release()
	defer func() { g.mu.Lock(); g.resuming = false; g.mu.Unlock() }()
	if e := g.policy.VerifyCatalog(work, c); e != nil {
		return e
	}
	if e := work.Err(); e != nil {
		return e
	}
	if e := g.policy.Reconcile(work, c); e != nil {
		return e
	}
	if e := work.Err(); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if generation != g.generation || g.sealers != 0 {
		return durableExportInvalid("recovery resume invalidated by seal")
	}
	g.stop = make(chan struct{})
	g.open = true
	return nil
}
