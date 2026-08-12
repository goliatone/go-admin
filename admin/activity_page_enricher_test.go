package admin

import (
	"context"
	"reflect"
	"testing"

	usersactivity "github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type capturePageActorResolver struct {
	calls int
	ids   []uuid.UUID
	meta  usersactivity.ResolveContext
	data  map[uuid.UUID]usersactivity.ActorInfo
}

func (r *capturePageActorResolver) ResolveActors(_ context.Context, ids []uuid.UUID, meta usersactivity.ResolveContext) (map[uuid.UUID]usersactivity.ActorInfo, error) {
	r.calls++
	r.ids = append([]uuid.UUID(nil), ids...)
	r.meta = meta
	return r.data, nil
}

type capturePageObjectResolver struct {
	calls map[string]int
	ids   map[string][]string
	meta  map[string]usersactivity.ResolveContext
	data  map[string]map[string]usersactivity.ObjectInfo
}

func (r *capturePageObjectResolver) ResolveObjects(_ context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
	if r.calls == nil {
		r.calls = map[string]int{}
		r.ids = map[string][]string{}
		r.meta = map[string]usersactivity.ResolveContext{}
	}
	r.calls[objectType]++
	r.ids[objectType] = append([]string(nil), ids...)
	r.meta[objectType] = meta
	return r.data[objectType], nil
}

func TestResolverActivityPageEnricherBatchesClonesAndReplacesUntrustedHints(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	actorID := uuid.New()
	actorResolver := &capturePageActorResolver{data: map[uuid.UUID]usersactivity.ActorInfo{
		actorID: {ID: actorID, Type: "user", Display: "Owner"},
	}}
	objectResolver := &capturePageObjectResolver{data: map[string]map[string]usersactivity.ObjectInfo{
		"audience": {"aud-1": {ID: "aud-1", Type: "audience", Display: "VIP Customers"}},
		"customer": {"cust-1": {ID: "cust-1", Type: "customer", Display: "M-1042"}},
	}}
	enricher := NewResolverActivityPageEnricher(ResolverActivityPageEnricherConfig{
		ActorResolver: actorResolver, ObjectResolver: objectResolver,
		ActionLabels: map[string]string{"audience.update": "Updated audience"},
	})
	page := userstypes.ActivityPage{
		Records: []userstypes.ActivityRecord{
			{ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID, Verb: "audience.update", ObjectType: " Audience ", ObjectID: "aud-1", Data: map[string]any{usersactivity.DataKeyActorDisplay: "forged actor", usersactivity.DataKeyObjectDisplay: "forged audience", usersactivity.DataKeyActionDisplay: "Forged action"}},
			{ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID, ObjectType: "customer", ObjectID: "cust-1", Data: map[string]any{usersactivity.DataKeyObjectDisplay: "Customer PII"}},
		},
		Total: 9, NextOffset: 2, HasMore: true,
	}

	got, err := enricher.EnrichActivityPage(context.Background(), ActivityReadContext{Scope: userstypes.ScopeFilter{TenantID: tenantID, OrgID: orgID}}, page)
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}
	if actorResolver.calls != 1 || !reflect.DeepEqual(actorResolver.ids, []uuid.UUID{actorID}) {
		t.Fatalf("unexpected actor batch calls=%d ids=%v", actorResolver.calls, actorResolver.ids)
	}
	if actorResolver.meta.TenantID != tenantID || actorResolver.meta.OrganizationID != orgID {
		t.Fatalf("unexpected actor resolver scope: %+v", actorResolver.meta)
	}
	if objectResolver.calls["audience"] != 1 || objectResolver.calls["customer"] != 1 {
		t.Fatalf("unexpected object batches: %+v", objectResolver.calls)
	}
	if got.Total != page.Total || got.NextOffset != page.NextOffset || got.HasMore != page.HasMore {
		t.Fatalf("pagination changed: %+v", got)
	}
	if got.Records[0].Data[usersactivity.DataKeyActorDisplay] != "Owner" || got.Records[0].Data[usersactivity.DataKeyObjectDisplay] != "VIP Customers" {
		t.Fatalf("unexpected audience enrichment: %+v", got.Records[0].Data)
	}
	if got.Records[0].Data[usersactivity.DataKeyActionDisplay] != "Updated audience" {
		t.Fatalf("unexpected action presentation: %+v", got.Records[0].Data)
	}
	if got.Records[1].Data[usersactivity.DataKeyObjectDisplay] != "M-1042" {
		t.Fatalf("unexpected customer enrichment: %+v", got.Records[1].Data)
	}
	if page.Records[0].Data[usersactivity.DataKeyActorDisplay] != "forged actor" || page.Records[1].Data[usersactivity.DataKeyObjectDisplay] != "Customer PII" {
		t.Fatalf("source metadata mutated: %+v", page.Records)
	}
}

func TestResolverActivityPageEnricherHintPolicyAndSafeFallbacks(t *testing.T) {
	actorID := uuid.New()
	policy := ActivityDisplayHintPolicyFunc(func(_ context.Context, _ ActivityReadContext, record userstypes.ActivityRecord, field, _ string) bool {
		return normalizeActivityObjectType(record.ObjectType) == "audience" && field == usersactivity.DataKeyObjectDisplay
	})
	enricher := NewResolverActivityPageEnricher(ResolverActivityPageEnricherConfig{HintPolicy: policy})
	page := userstypes.ActivityPage{Records: []userstypes.ActivityRecord{
		{ActorID: actorID, ObjectType: "audience", ObjectID: "aud-1", Data: map[string]any{usersactivity.DataKeyObjectDisplay: "Trusted Audience"}},
		{ActorID: actorID, ObjectType: "customer", ObjectID: "cust-1", Data: map[string]any{usersactivity.DataKeyObjectDisplay: "Forged Customer Name"}},
	}}

	got, err := enricher.EnrichActivityPage(context.Background(), ActivityReadContext{}, page)
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}
	if got.Records[0].Data[usersactivity.DataKeyObjectDisplay] != "Trusted Audience" {
		t.Fatalf("expected approved hint, got %+v", got.Records[0].Data)
	}
	if got.Records[1].Data[usersactivity.DataKeyObjectDisplay] != "customer:cust-1" {
		t.Fatalf("expected safe customer fallback, got %+v", got.Records[1].Data)
	}
	if got.Records[0].Data[usersactivity.DataKeyActorDisplay] != "User:"+actorID.String() {
		t.Fatalf("expected typed actor fallback, got %+v", got.Records[0].Data)
	}
}

type captureActivityUserBatchReader struct {
	calls int
	ids   []uuid.UUID
	meta  usersactivity.ResolveContext
	data  map[uuid.UUID]UserRecord
}

func (r *captureActivityUserBatchReader) ReadActivityUsers(_ context.Context, ids []uuid.UUID, meta usersactivity.ResolveContext) (map[uuid.UUID]UserRecord, error) {
	r.calls++
	r.ids = append([]uuid.UUID(nil), ids...)
	r.meta = meta
	return r.data, nil
}

func TestAdminActorResolverUsesOptionalBatchReader(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	reader := &captureActivityUserBatchReader{data: map[uuid.UUID]UserRecord{
		actorID: {ID: actorID.String(), FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.test"},
	}}
	resolver := AdminActorResolver{BatchUsers: reader}

	got, err := resolver.ResolveActors(context.Background(), []uuid.UUID{actorID, actorID}, usersactivity.ResolveContext{TenantID: tenantID, OrganizationID: orgID})
	if err != nil {
		t.Fatalf("resolve actors: %v", err)
	}
	if reader.calls != 1 || len(reader.ids) != 1 || reader.ids[0] != actorID || reader.meta.TenantID != tenantID || reader.meta.OrganizationID != orgID {
		t.Fatalf("unexpected batch invocation: calls=%d ids=%v meta=%+v", reader.calls, reader.ids, reader.meta)
	}
	if got[actorID].Display != "Ada Lovelace" {
		t.Fatalf("unexpected actor display: %+v", got[actorID])
	}
}
