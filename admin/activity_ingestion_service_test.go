package admin

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/google/uuid"
)

type ingestionTestPolicy struct {
	mu             sync.Mutex
	revoked        bool
	credential     string
	attest         bool
	scope          ScopeInput
	checks         int
	authorizations int
}

func (p *ingestionTestPolicy) CheckActivityProducer(_ context.Context, principal ActivityProducerPrincipal, e ActivityIngestionEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.checks++
	if p.revoked || principal.CredentialID == p.credential || e.Channel != "billing" || e.Object.Type != "billing.invoice" || e.Action != "billing.invoice.approved" {
		return ErrActivityIngestionForbidden
	}
	return nil
}
func (p *ingestionTestPolicy) AuthorizeActivityIngestion(_ context.Context, a ActivityIngestionAuthorization) (ActivityIngestionDecision, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.authorizations++
	return ActivityIngestionDecision{Allowed: a.Event.Scope == p.scope && (a.Event.SubjectUserID == "" || a.Event.SubjectUserID == ingestActor), AllowProducerAttestation: p.attest}, nil
}
func ingestionTestPrincipal() ActivityProducerPrincipal {
	now := time.Now()
	return ActivityProducerPrincipal{ProducerID: "billing", CredentialID: "key-1", Issuer: "host", Audience: "activity", Purpose: ActivityIngestionPurpose, NotBefore: now.Add(-time.Hour), ExpiresAt: now.Add(time.Hour)}
}
func ingestionServiceFixture(t *testing.T, postgres bool) (*ActivityIngestionService, *BunActivityIngestionStore, *ingestionTestPolicy, context.Context) {
	t.Helper()
	db, _ := ingestionTestDatabase(t, postgres)
	store := ingestionTestStore(t, db)
	policy := &ingestionTestPolicy{attest: true, scope: ScopeInput{TenantID: ingestTenant, OrgID: ingestOrg}}
	svc, err := NewActivityIngestionService(ActivityIngestionConfig{Store: store, Policy: policy, ScopePolicy: ScopePolicy{Mode: ScopePolicySingle, DefaultTenantID: ingestTenant, DefaultOrgID: ingestOrg}, Issuer: "host", Audience: "activity", Disclose: func(_ context.Context, e ActivityIngestionEvent) (json.RawMessage, error) { return e.Metadata, nil }})
	if err != nil {
		t.Fatal(err)
	}
	return svc, store, policy, WithVerifiedActivityProducer(context.Background(), ingestionTestPrincipal())
}
func runActivityIngestionServiceContract(t *testing.T, postgres bool) {
	svc, store, policy, ctx := ingestionServiceFixture(t, postgres)
	e := ingestionTestEvent()
	e.Scope = ScopeInput{}
	e.Metadata = json.RawMessage(`{"amount":1.2300,"large":9007199254740993}`)
	validated := 0
	svc.config.ValidateEvent = func(_ context.Context, e ActivityIngestionEvent) error {
		validated++
		e.Metadata[0] = '!'
		e.Actor.ID = ingestTenant
		return nil
	}
	// Observer failure cannot replace committed acceptance.
	svc.config.Observe = func(context.Context, ActivityIngestionObservation) { panic("observer failed") }
	first, firstErr := svc.Ingest(ctx, e)
	if firstErr != nil || first.Replayed {
		t.Fatal(first, firstErr)
	}
	again := e
	again.Scope = policy.scope
	again.Metadata = json.RawMessage(`{"large":9007199254740993.0,"amount":123e-2}`)
	replay, replayErr := svc.Ingest(ctx, again)
	if replayErr != nil || !replay.Replayed || replay.ActivityID != first.ActivityID || replay.ReceivedAt != first.ReceivedAt || validated != 1 {
		t.Fatal("replay", replay, replayErr, validated)
	}
	changed := e
	changed.Object.ID = "changed"
	if _, err := svc.Ingest(ctx, changed); !errors.Is(err, ErrActivityIngestionConflict) {
		t.Fatal("conflict", err)
	}
	// Omitted-scope replay stays pinned across org-default and mode changes.
	svc.config.ScopePolicy.DefaultOrgID = ingestActor
	if got, err := svc.Ingest(ctx, e); err != nil || got.Scope != first.Scope {
		t.Fatal("changed default retargeted", got, err)
	}
	svc.config.ScopePolicy.Mode = ScopePolicyMulti
	if got, err := svc.Ingest(ctx, e); err != nil || got.Scope != first.Scope {
		t.Fatal("changed mode retargeted", got, err)
	}
	principal := ingestionTestPrincipal()
	principal.CredentialID = "rotated"
	rotated := WithVerifiedActivityProducer(context.Background(), principal)
	if got, err := svc.Ingest(rotated, e); err != nil || !got.Replayed {
		t.Fatal("rotation changed identity", got, err)
	}
	principal.Binding = ScopeInput{TenantID: ingestTenant, OrgID: ingestActor}
	if _, err := svc.Ingest(WithVerifiedActivityProducer(context.Background(), principal), e); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("binding change retargeted", err)
	}
	// Current policy runs before any private lookup, even on identical retries.
	policy.revoked = true
	if _, err := svc.Ingest(ctx, e); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("revoked replay", err)
	}
	policy.revoked = false
	policy.credential = "key-1"
	if _, err := svc.Ingest(ctx, e); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("credential revocation", err)
	}
	policy.credential = ""
	for _, mutate := range []func(*ActivityIngestionEvent){func(e *ActivityIngestionEvent) { e.Scope.OrgID = ingestActor }, func(e *ActivityIngestionEvent) { e.SubjectUserID = ingestTenant }, func(e *ActivityIngestionEvent) { e.Channel = "private" }} {
		bad := again
		bad.EventID = uuid.NewString()
		mutate(&bad)
		if _, err := svc.Ingest(ctx, bad); !errors.Is(err, ErrActivityIngestionForbidden) {
			t.Fatal("unauthorized event", err)
		}
	}
	// Changed target only exposes conflict after stored-target authorization.
	target := again
	target.Scope.OrgID = ingestActor
	if _, err := svc.Ingest(ctx, target); !errors.Is(err, ErrActivityIngestionConflict) {
		t.Fatal(err)
	}
	policy.scope.OrgID = ingestActor
	if _, err := svc.Ingest(ctx, target); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("unauthorized target disclosure", err)
	}
	policy.scope.OrgID = ingestOrg
	svc.config.ScopePolicy = ScopePolicy{Mode: ScopePolicySingle, DefaultTenantID: ingestTenant, DefaultOrgID: ingestOrg}
	// Delegation is bound to the effective pair; attestation must be explicit.
	policy.attest = false
	user := e
	user.EventID = "delegated"
	if _, err := svc.Ingest(ctx, user); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("implicit attestation", err)
	}
	p, _ := ActivityProducerFromContext(ctx)
	proof := ActivityAttributionEvidence{ProducerID: p.ProducerID, ActorID: ingestActor, Scope: policy.scope, Issuer: p.Issuer, Audience: p.Audience, Purpose: p.Purpose, NotBefore: p.NotBefore, ExpiresAt: p.ExpiresAt}
	delegated := WithVerifiedActivityAttribution(ctx, proof)
	if _, err := svc.Ingest(delegated, user); err != nil {
		t.Fatal(err)
	}
	machine := e
	machine.EventID = "job"
	machine.Actor = ActivityIngestionActor{Kind: "job"}
	machine.SubjectUserID = ingestActor
	got, machineErr := svc.Ingest(ctx, machine)
	if machineErr != nil {
		t.Fatal(machineErr)
	}
	var receipt activityIngestionReceiptRow
	if err := store.db.NewSelect().Model(&receipt).Where("activity_id = ?", got.ActivityID).Scan(ctx); err != nil {
		t.Fatal(err)
	}
	if receipt.ActorKind != "job" || receipt.ActorID != uuid.Nil || receipt.SubjectUserID != uuid.MustParse(ingestActor) {
		t.Fatal("machine conflated with subject", receipt)
	}
	policy.attest = true
	// Future bounds apply only to new acceptance, never a retained replay.
	future := e
	future.EventID = "future"
	future.OccurredAt = time.Now().UTC().Add(time.Hour).Truncate(time.Microsecond)
	if _, err := svc.Ingest(ctx, future); !errors.Is(err, ErrActivityIngestionInvalid) {
		t.Fatal("future accepted", err)
	}
	if _, err := store.db.NewUpdate().Model((*activityIngestionReceiptRow)(nil)).Set("fingerprint_version = 99").Where("event_id = ?", e.EventID).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Ingest(ctx, e); !errors.Is(err, ErrActivityIngestionReplayVersion) {
		t.Fatal("unsupported receipt rewritten", err)
	}
}
func TestActivityIngestionServiceSQLite(t *testing.T)   { runActivityIngestionServiceContract(t, false) }
func TestActivityIngestionServicePostgres(t *testing.T) { runActivityIngestionServiceContract(t, true) }

func TestActivityIngestionDisclosureRollback(t *testing.T) {
	svc, store, _, ctx := ingestionServiceFixture(t, false)
	for _, raw := range []string{`{"nested":{"actor_type":"user"}}`, `{"x":1e999999}`, `[]`, `{"x":1,"x":2}`} {
		svc.config.Disclose = func(context.Context, ActivityIngestionEvent) (json.RawMessage, error) {
			return json.RawMessage(raw), nil
		}
		e := ingestionTestEvent()
		e.EventID = uuid.NewString()
		if _, err := svc.Ingest(ctx, e); err == nil {
			t.Fatal("invalid disclosure accepted")
		}
		binding, err := store.Binding(ctx, "billing", e.EventID)
		if err != nil || binding != nil {
			t.Fatal("disclosure failure consumed event", binding, err)
		}
	}
}

type ingestionCountingStore struct {
	ActivityIngestionStore
	lookups  int
	attempts int
}

func (s *ingestionCountingStore) Binding(ctx context.Context, p, e string) (*ScopeInput, error) {
	s.lookups++
	return s.ActivityIngestionStore.Binding(ctx, p, e)
}
func (s *ingestionCountingStore) WithinTransaction(context.Context, func(ActivityIngestionTransaction) error) error {
	s.attempts++
	return ErrActivityIngestionContention
}
func TestActivityIngestionAuthorityBeforeLookupAndBoundedRetry(t *testing.T) {
	svc, store, policy, ctx := ingestionServiceFixture(t, false)
	count := &ingestionCountingStore{ActivityIngestionStore: store}
	svc.config.Store = count
	if _, err := svc.Ingest(context.Background(), ingestionTestEvent()); !errors.Is(err, ErrActivityIngestionUnauthenticated) || count.lookups != 0 {
		t.Fatal("absent authority queried receipt", err)
	}
	policy.revoked = true
	if _, err := svc.Ingest(ctx, ingestionTestEvent()); !errors.Is(err, ErrActivityIngestionForbidden) || count.lookups != 0 {
		t.Fatal("revoked authority queried receipt", err)
	}
	policy.revoked = false
	if _, err := svc.Ingest(ctx, ingestionTestEvent()); !errors.Is(err, ErrActivityIngestionUnavailable) || count.attempts != 3 {
		t.Fatal("unbounded retries", count.attempts, err)
	}
	stale := ingestionTestPrincipal()
	stale.ExpiresAt = time.Now().Add(-time.Minute)
	if _, err := svc.Ingest(WithVerifiedActivityProducer(context.Background(), stale), ingestionTestEvent()); !errors.Is(err, ErrActivityIngestionUnauthenticated) {
		t.Fatal("stale context", err)
	}
}

func TestActivityIngestionCommandDispatch(t *testing.T) {
	svc, _, policy, ctx := ingestionServiceFixture(t, false)
	bus := NewCommandBus(true)
	t.Cleanup(bus.Close)
	handler, err := RegisterActivityIngestionCommand(bus, svc)
	if err != nil {
		t.Fatal(err)
	}
	msg := ActivityIngestMsg{Event: ingestionTestEvent()}
	msg.Event.Scope = ScopeInput{}
	first, err := DispatchActivityIngestion(ctx, bus, msg)
	if err != nil || first.Replayed {
		t.Fatal("typed", first, err)
	}
	raw := ingestionTestJSON(t, msg.Event)
	payload, err := decodeActivityIngestionJSON(raw, 65536, false)
	if err != nil {
		t.Fatal(err)
	}
	fields, ok := payload.(map[string]any)
	if !ok {
		t.Fatalf("expected decoded object, got %T", payload)
	}
	outcome, err := bus.DispatchByNameWithOutcome(ctx, ActivityIngestCommandName, fields, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
	if err != nil {
		t.Fatal("named dispatch", err)
	}
	result, ok := outcome.Result.(ActivityIngestResult)
	if !ok || !result.Replayed {
		t.Fatal("named", outcome, err)
	}
	policy.revoked = true
	if _, err = handler.Run(ctx, msg); !errors.Is(err, ErrActivityIngestionForbidden) {
		t.Fatal("direct command bypassed policy", err)
	}
	policy.revoked = false
	if _, err = bus.DispatchByNameWithOutcome(context.Background(), ActivityIngestCommandName, fields, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); !errors.Is(err, ErrActivityIngestionUnauthenticated) {
		t.Fatal("generic admin dispatch bypassed auth", err)
	}
	// Factory must reject before dispatcher executor selection. A queued executor
	// that would accept anything is never called by either supported entry.
	calls := 0
	old, had := dispatcher.ExecutorForMode(command.ExecutionModeQueued)
	if err = dispatcher.RegisterExecutor(command.ExecutionModeQueued, ingestionQueueExecutor{calls: &calls}); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if had {
			if restoreErr := dispatcher.RegisterExecutor(command.ExecutionModeQueued, old); restoreErr != nil {
				t.Errorf("restore queued executor: %v", restoreErr)
			}
		} else {
			dispatcher.UnregisterExecutor(command.ExecutionModeQueued)
		}
	})
	for _, opts := range []command.DispatchOptions{{Mode: command.ExecutionModeQueued}, {Mode: command.ExecutionModeInline, Delay: time.Second}, {Mode: command.ExecutionModeInline, IdempotencyKey: "cache"}, {Mode: command.ExecutionModeInline, DedupPolicy: command.DedupPolicyReplace}} {
		_, err = bus.DispatchByNameWithOutcome(ctx, ActivityIngestCommandName, fields, nil, opts)
		if err == nil {
			t.Fatal("unsafe named options accepted")
		}
	}
	if calls != 0 {
		t.Fatal("queue invoked", calls)
	}

}

type ingestionQueueExecutor struct{ calls *int }

func (e ingestionQueueExecutor) Execute(context.Context, any, string, command.DispatchOptions) (command.DispatchReceipt, error) {
	*e.calls++
	return command.DispatchReceipt{}, nil
}
