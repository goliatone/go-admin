package admin

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	command "github.com/goliatone/go-command"
)

const ingestTenant = "11111111-1111-4111-8111-111111111111"
const ingestOrg = "22222222-2222-4222-8222-222222222222"
const ingestActor = "33333333-3333-4333-8333-333333333333"

func ingestionTestEvent() ActivityIngestionEvent {
	return ActivityIngestionEvent{SchemaVersion: 1, EventID: "event-1", OccurredAt: time.Date(2026, 10, 28, 12, 30, 0, 123456000, time.UTC), Scope: ScopeInput{TenantID: ingestTenant, OrgID: ingestOrg}, Actor: ActivityIngestionActor{Kind: "user", ID: ingestActor}, Action: "billing.invoice.approved", Object: ActivityIngestionObject{Type: "billing.invoice", ID: "INV-42"}, Channel: "billing"}
}

func TestActivityIngestionStrictCodec(t *testing.T) {
	e := ingestionTestEvent()
	raw, _ := json.Marshal(e)
	valid := []string{string(raw), strings.Replace(string(raw), `"scope":{"tenant_id":"`+ingestTenant+`","org_id":"`+ingestOrg+`"}`, `"scope":{}`, 1), strings.Replace(string(raw), `"scope":{"tenant_id":"`+ingestTenant+`","org_id":"`+ingestOrg+`"},`, "", 1)}
	for _, s := range valid {
		if _, err := DecodeActivityIngestionEvent([]byte(s)); err != nil {
			t.Fatalf("valid rejected: %v", err)
		}
	}
	invalid := []string{
		string(raw) + ` {}`, strings.Replace(string(raw), `"event_id":`, `"event_id":"extra","event_id":`, 1), strings.Replace(string(raw), `"event_id":`, `"\u0065vent_id":"extra","event_id":`, 1),
		strings.Replace(string(raw), `"event_id":`, `"Event_ID":`, 1), strings.Replace(string(raw), `"event_id":`, `"producer_id":"forged","event_id":`, 1),
		strings.Replace(string(raw), `"scope":{"tenant_id":"`+ingestTenant+`","org_id":"`+ingestOrg+`"}`, `"scope":null`, 1),
		strings.Replace(string(raw), `"channel":"billing"`, `"channel":"billing","subject_user_id":null`, 1),
		strings.Replace(string(raw), `"channel":"billing"`, `"channel":"billing","metadata":{"a":1,"\u0061":2}`, 1),
		strings.Replace(string(raw), `"channel":"billing"`, `"channel":"billing","metadata":{"nested":{"actor_id":"forged"}}`, 1),
		strings.Replace(string(raw), `"channel":"billing"`, `"channel":"billing","metadata":{"x":1e999999}`, 1),
		strings.Replace(string(raw), `123456Z`, `1234567Z`, 1), string([]byte{0xff}),
	}
	for i, s := range invalid {
		if _, err := DecodeActivityIngestionEvent([]byte(s)); err == nil {
			t.Errorf("invalid case %d accepted", i)
		}
	}
	for _, meta := range []string{`null`, `[]`, `{"x":1,"x":2}`, `{"x":1e40000}`, `{"x":` + strings.Repeat(`[`, 17) + `0` + strings.Repeat(`]`, 17) + `}`} {
		e.Metadata = json.RawMessage(meta)
		if err := (ActivityIngestMsg{Event: e}).Validate(); err == nil {
			t.Errorf("direct metadata accepted: %s", meta)
		}
	}
	e = ingestionTestEvent()
	e.EventID = strings.Repeat("e", 129)
	if (ActivityIngestMsg{Event: e}).Validate() == nil {
		t.Fatal("oversized event ID accepted")
	}
	e = ingestionTestEvent()
	e.Metadata = json.RawMessage(`{"x":"` + strings.Repeat("a", 32768) + `"}`)
	if (ActivityIngestMsg{Event: e}).Validate() == nil {
		t.Fatal("oversized metadata accepted")
	}
}
func TestActivityIngestionFingerprint(t *testing.T) {
	first := ingestionTestEvent()
	first.Metadata = json.RawMessage(`{"z":9007199254740993,"a":[1.00,1.230e-2,-0.0e5]}`)
	same := first
	same.Metadata = json.RawMessage(`{"a":[1e0,0.012300,0],"z":9007199254740993.0}`)
	same.OccurredAt = first.OccurredAt.In(time.FixedZone("offset", 3600))
	a, err := ActivityIngestionFingerprint(first, 1)
	if err != nil {
		t.Fatal(err)
	}
	b, err := ActivityIngestionFingerprint(same, 1)
	if err != nil || a != b {
		t.Fatalf("equivalent fingerprints differ %s %s %v", a, b, err)
	}
	same.Metadata = json.RawMessage(`{"z":9007199254740992,"a":[1,0.0123,0]}`)
	b, _ = ActivityIngestionFingerprint(same, 1)
	if a == b {
		t.Fatal("large integer rounded")
	}
	same = ingestionTestEvent()
	a, _ = ActivityIngestionFingerprint(same, 1)
	same.Metadata = json.RawMessage(`{}`)
	b, _ = ActivityIngestionFingerprint(same, 1)
	if a != b {
		t.Fatal("omitted metadata differs")
	}
	if _, err = ActivityIngestionFingerprint(first, 2); err != ErrActivityIngestionReplayVersion {
		t.Fatal(err)
	}
	for _, value := range []any{map[string]any{"x": float64(1)}, map[string]any{"x": float32(1)}, map[string]any{"x": time.Now()}} {
		if _, err := encodeActivityIngestionJSON(value, 65536, false); err == nil {
			t.Fatal("unsafe native type accepted")
		}
	}
	if _, err := encodeActivityIngestionJSON(map[string]any{"x": int64(9007199254740993)}, 65536, false); err != nil {
		t.Fatal(err)
	}
	// Several individually valid expansions must share a total budget.
	if _, err := decodeActivityIngestionJSON([]byte(`{"a":1e20000,"b":1e20000}`), 32768, true); err == nil {
		t.Fatal("aggregate expansion overflow accepted")
	}
}
func TestActivityIngestionScopeResolution(t *testing.T) {
	single := ScopePolicy{Mode: ScopePolicySingle, DefaultTenantID: ingestTenant, DefaultOrgID: ingestOrg}
	want := ScopeInput{TenantID: ingestTenant, OrgID: ingestOrg}
	got, err := ResolveActivityIngestionScope(single, ScopeInput{}, ScopeInput{})
	if err != nil || got != want {
		t.Fatalf("defaults: %+v %v", got, err)
	}
	multi := single
	multi.Mode = ScopePolicyMulti
	if _, err = ResolveActivityIngestionScope(multi, ScopeInput{}, ScopeInput{}); err == nil {
		t.Fatal("multi used global defaults")
	}
	got, err = ResolveActivityIngestionScope(multi, ScopeInput{}, want)
	if err != nil || got != want {
		t.Fatalf("binding: %+v %v", got, err)
	}
	for _, p := range []ScopePolicy{single, multi} {
		if _, err = ResolveActivityIngestionScope(p, ScopeInput{TenantID: ingestActor, OrgID: ingestOrg}, want); err != ErrActivityIngestionForbidden {
			t.Fatal("binding conflict accepted", err)
		}
	}
	got, err = ResolveActivityIngestionScope(single, ScopeInput{OrgID: ingestActor}, ScopeInput{})
	if err != nil || got.OrgID != ingestActor {
		t.Fatal("default org treated as fixed org", err)
	}
	single.Mode = "unknown"
	if _, err = ResolveActivityIngestionScope(single, want, ScopeInput{}); err != ErrActivityIngestionUnavailable {
		t.Fatal("unknown mode accepted", err)
	}
}
func TestActivityIngestionContextAndDispatchBoundary(t *testing.T) {
	if _, ok := ActivityProducerFromContext(context.WithValue(context.Background(), "producer_id", "forged")); ok {
		t.Fatal("forged context accepted")
	}
	now := time.Now()
	for _, opts := range []command.DispatchOptions{{Mode: command.ExecutionModeQueued}, {Delay: time.Second}, {RunAt: &now}, {IdempotencyKey: "other"}, {DedupPolicy: command.DedupPolicyDrop}} {
		ctx := command.ContextWithDispatchOptions(context.Background(), opts)
		if _, err := DispatchActivityIngestion(ctx, nil, ActivityIngestMsg{Event: ingestionTestEvent()}); err != ErrActivityIngestionInvalid {
			t.Fatalf("unsafe options reached bus: %+v %v", opts, err)
		}
	}
}

func TestActivityIngestionVerifiedClaims(t *testing.T) {
	now := time.Now()
	p := ActivityProducerPrincipal{ProducerID: "billing", CredentialID: "key-1", Issuer: "host", Audience: "activity", Purpose: ActivityIngestionPurpose, NotBefore: now.Add(-time.Hour), ExpiresAt: now.Add(time.Hour)}
	if err := validateActivityProducer(p, "host", "activity", now); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*ActivityProducerPrincipal){func(p *ActivityProducerPrincipal) { p.Purpose = "browser" }, func(p *ActivityProducerPrincipal) { p.Audience = "browser" }, func(p *ActivityProducerPrincipal) { p.Issuer = "foreign" }, func(p *ActivityProducerPrincipal) { p.ExpiresAt = now }, func(p *ActivityProducerPrincipal) { p.NotBefore = now.Add(time.Second) }, func(p *ActivityProducerPrincipal) { p.CredentialID = "" }} {
		q := p
		mutate(&q)
		if validateActivityProducer(q, "host", "activity", now) != ErrActivityIngestionUnauthenticated {
			t.Fatal("invalid principal accepted")
		}
	}
	e := ingestionTestEvent()
	proof := ActivityAttributionEvidence{ProducerID: p.ProducerID, ActorID: ingestActor, Scope: e.Scope, Issuer: p.Issuer, Audience: p.Audience, Purpose: p.Purpose, NotBefore: p.NotBefore, ExpiresAt: p.ExpiresAt}
	if err := validateActivityAttribution(proof, p, e, now); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*ActivityAttributionEvidence){func(e *ActivityAttributionEvidence) { e.Scope.OrgID = ingestActor }, func(e *ActivityAttributionEvidence) { e.ProducerID = "different" }, func(e *ActivityAttributionEvidence) { e.ActorID = ingestTenant }, func(e *ActivityAttributionEvidence) { e.Purpose = "login" }, func(e *ActivityAttributionEvidence) { e.ExpiresAt = now }} {
		q := proof
		mutate(&q)
		if validateActivityAttribution(q, p, e, now) != ErrActivityIngestionForbidden {
			t.Fatal("mismatched evidence accepted")
		}
	}
}
