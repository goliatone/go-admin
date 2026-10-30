package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"math/big"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type ingestionReadPolicy struct {
	base usersactivity.ActivityAccessPolicy
	drop bool
}

func (p *ingestionReadPolicy) Apply(a *auth.ActorContext, r string, f types.ActivityFilter) (types.ActivityFilter, error) {
	return p.base.Apply(a, r, f)
}
func (p *ingestionReadPolicy) Sanitize(_ *auth.ActorContext, _ string, records []types.ActivityRecord) []types.ActivityRecord {
	for i := range records {
		delete(records[i].Data, "secret")
		delete(records[i].Data, "legacy_payload")
		if p.drop {
			records[i].Data = nil
		}
	}
	return records
}

type ingestionReaderPermission struct{ allowed bool }

func (p *ingestionReaderPermission) Can(_ context.Context, permission, _ string) bool {
	return permission != PermAdminActivityView || p.allowed
}

type ingestionBrokenIdentity struct{}

func (ingestionBrokenIdentity) ResolveActivityReadIdentities(context.Context, ActivityReadContext, []types.ActivityRecord) (map[uuid.UUID]ActivityReadIdentity, error) {
	return nil, errors.New("identity unavailable")
}
func ingestionReaderContext(scope ScopeInput) context.Context {
	return auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: ingestActor, Role: "admin", TenantID: scope.TenantID, OrganizationID: scope.OrgID})
}
func runActivityIngestionReadContract(t *testing.T, postgres bool) {
	db, _ := ingestionTestDatabase(t, postgres)
	permission := &ingestionReaderPermission{allowed: true}
	policy := &ingestionTestPolicy{attest: true, scope: ScopeInput{TenantID: ingestTenant, OrgID: ingestOrg}}
	readPolicy := &ingestionReadPolicy{base: usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(true)))}
	opts := &ActivityIngestionOptions{Enabled: true, DB: db, Verifier: &ingestionHTTPVerifier{}, Policy: policy, ReadPolicy: readPolicy, Issuer: "host", Audience: "activity", Disclose: func(_ context.Context, e ActivityIngestionEvent) (json.RawMessage, error) { return e.Metadata, nil }}
	legacy := NewActivityFeed()
	a := mustNewAdmin(t, Config{BasePath: "/admin", ScopeMode: "single", DefaultTenantID: ingestTenant, DefaultOrgID: ingestOrg}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands, FeatureActivity, FeatureDashboard), Authorizer: permission, ActivitySink: legacy, ActivityIngestion: opts, ActivityPageEnricher: NewResolverActivityPageEnricher(ResolverActivityPageEnricherConfig{}), ActivityNavigationResolver: ActivityNavigationResolverFunc(func(_ context.Context, _ ActivityReadContext, records []types.ActivityRecord) ([]ActivityNavigation, error) {
		out := make([]ActivityNavigation, len(records))
		for i := range out {
			out[i].ActorHref = "/admin/users/subject"
		}
		return out, nil
	})})
	t.Cleanup(a.Commands().Close)
	server := router.NewHTTPServer()
	if err := a.Initialize(server.Router()); err != nil {
		t.Fatal(err)
	}
	runtime := a.ActivityIngestion()
	if runtime == nil {
		t.Fatal("missing bundle")
	}
	producer := WithVerifiedActivityProducer(context.Background(), ingestionTestPrincipal())
	e := ingestionTestEvent()
	e.Metadata = json.RawMessage(`{"large":9007199254740993,"amount":0.01234567890123456789,"huge":1e309,"secret":"redact","system":true,"machine":true,"actor":{"type":"system"},"batch":true}`)
	first, ingestErr := runtime.Service.Ingest(producer, e)
	if ingestErr != nil {
		t.Fatal(ingestErr)
	}
	if replay, err := runtime.Service.Ingest(producer, e); err != nil || !replay.Replayed || replay.ActivityID != first.ActivityID {
		t.Fatal("exact-number replay", replay, err)
	}
	machine := e
	machine.EventID = "system-with-subject"
	machine.Actor = ActivityIngestionActor{Kind: "system"}
	machine.SubjectUserID = ingestActor
	if _, err := runtime.Service.Ingest(producer, machine); err != nil {
		t.Fatal(err)
	}
	ctx := ingestionReaderContext(policy.scope)
	fetch := func(ctx context.Context) *httptest.ResponseRecorder {
		req := httptest.NewRequestWithContext(ctx, "GET", "/admin/api/activity", nil)
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		return rr
	}
	checkEntries := func(entries []ActivityEntry) {
		t.Helper()
		if len(entries) != 2 {
			t.Fatalf("want 2 entries: %+v", entries)
		}
		machineSeen := false
		for _, entry := range entries {
			if _, ok := entry.Metadata["secret"]; ok {
				t.Fatal("sanitized field restored")
			}
			if !readPolicy.drop && (entry.Metadata["large"] != json.Number("9007199254740993") || entry.Metadata["amount"] != json.Number("0.01234567890123456789")) {
				t.Fatal("number rounded", entry.Metadata)
			}
			if !readPolicy.drop {
				assertIngestionExactNumber(t, entry.Metadata["huge"], "1e309")
			}
			if entry.Actor == "System" {
				machineSeen = true
				if entry.Metadata[ActivityActorTypeKey] != "system" {
					t.Fatal("machine classification lost")
				}
			}
		}
		if !machineSeen {
			t.Fatal("machine subject became actor")
		}
	}
	checkAPI := func() {
		rr := fetch(ctx)
		if rr.Code != 200 {
			t.Fatal(rr.Code, rr.Body.String())
		}
		var response activityListResponse
		dec := json.NewDecoder(rr.Body)
		dec.UseNumber()
		if err := dec.Decode(&response); err != nil {
			t.Fatal(err)
		}
		entries := make([]ActivityEntry, len(response.Entries))
		for i, entry := range response.Entries {
			entries[i] = entry.ActivityEntry
			if entry.Actor == "System" && entry.ActorHref != "" {
				t.Fatal("machine links to subject")
			}
		}
		checkEntries(entries)
	}
	var widget DashboardProviderSpec
	for _, p := range a.Dashboard().Providers() {
		if p.Code == WidgetActivityFeed {
			widget = p
		}
	}
	if widget.Handler == nil {
		t.Fatal("missing actual recent activity provider")
	}
	checkWidget := func() {
		payload, err := widget.Handler(AdminContext{Context: ctx}, map[string]any{"limit": 10})
		if err != nil {
			t.Fatal(err)
		}
		entries := ingestionTestWidgetEntries(t, payload.Value())
		checkEntries(entries)
		encoded, err := encodeWidgetPayload(payload)
		if err != nil {
			t.Fatal(err)
		}
		raw := ingestionTestJSON(t, encoded)
		var out ActivityFeedWidgetPayload
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.UseNumber()
		if err = dec.Decode(&out); err != nil {
			t.Fatal(err)
		}
		checkEntries(out.Entries)
	}
	checkAPI()
	checkWidget()
	readPolicy.drop = true
	checkAPI()
	checkWidget()
	if _, err := runtime.Sink.List(producer, 10); err == nil {
		t.Fatal("producer granted read permission")
	}
	permission.allowed = false
	if rr := fetch(ctx); rr.Code != 403 {
		t.Fatal("API permission bypass", rr.Code)
	}
	if _, err := widget.Handler(AdminContext{Context: ctx}, nil); err == nil {
		t.Fatal("dashboard-only reader bypassed activity permission")
	}
	permission.allowed = true
	if _, err := runtime.Feed.Query(ctx, types.ActivityFilter{Scope: types.ScopeFilter{TenantID: uuid.MustParse(ingestTenant), OrgID: uuid.MustParse(ingestActor)}}); err == nil {
		t.Fatal("requested cross-scope read accepted")
	}
	if entries, err := runtime.Sink.List(ingestionReaderContext(ScopeInput{TenantID: ingestTenant, OrgID: ingestActor}), 10); err != nil || len(entries) != 0 {
		t.Fatal("foreign org disclosure", entries, err)
	}
	// Filtering is identical on the production query and widget before sanitization.
	for _, keys := range [][]string{nil, {"batch"}} {
		filterOpts := []usersactivity.FilterOption{usersactivity.WithMachineActivityEnabled(false)}
		if keys != nil {
			filterOpts = append(filterOpts, usersactivity.WithMachineDataKeys(keys...))
		}
		readPolicy.base = usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(filterOpts...))
		for _, drop := range []bool{false, true} {
			readPolicy.drop = drop
			page, err := runtime.Feed.Query(ctx, types.ActivityFilter{Pagination: types.Pagination{Limit: 1}})
			if err != nil || len(page.Records) != 1 || page.Total != 1 || page.Records[0].ID != first.ActivityID {
				t.Fatal("trusted classification before pagination/count", page, err)
			}
			var response activityListResponse
			rr := fetch(ctx)
			dec := json.NewDecoder(rr.Body)
			dec.UseNumber()
			if decodeErr := dec.Decode(&response); decodeErr != nil || rr.Code != 200 || len(response.Entries) != 1 || response.Entries[0].Actor == "System" {
				t.Fatal("API trusted machine visibility", rr.Code, response, decodeErr)
			}
			payload, err := widget.Handler(AdminContext{Context: ctx}, map[string]any{"limit": 1})
			if err != nil {
				t.Fatal("widget trusted machine visibility", err)
			}
			visible := ingestionTestWidgetEntries(t, payload.Value())
			if len(visible) != 1 || visible[0].Actor == "System" {
				t.Fatal("widget trusted machine visibility", payload, err)
			}
		}
	}
	readPolicy.base = usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(usersactivity.WithChannelAllowlist("other")))
	entries, listErr := runtime.Sink.List(ctx, 10)
	if listErr != nil || len(entries) != 0 {
		t.Fatal("channel policy", entries, listErr)
	}
	readPolicy.base = usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(true)))
	// Existing rows can exceed ingestion-only byte/depth limits. They must still
	// reach the policy, including when it removes the oversized/deep field.
	readPolicy.drop = false
	deep := any("leaf")
	for range ActivityIngestionMaxDepth + 4 {
		deep = map[string]any{"nested": deep}
	}
	legacyRow := types.ActivityRecord{ID: uuid.New(), ActorID: uuid.MustParse(ingestActor), UserID: uuid.MustParse(ingestActor), TenantID: uuid.MustParse(ingestTenant), OrgID: uuid.MustParse(ingestOrg), Verb: "legacy.saved", ObjectType: "document", ObjectID: "legacy", Channel: "legacy", OccurredAt: time.Now().UTC(), Data: map[string]any{"legacy_payload": map[string]any{"large": strings.Repeat("x", 48<<10), "deep": deep}, "large": json.Number("9007199254740993"), "huge": json.Number("1e309")}}
	if err := runtime.Store.repository.Log(ctx, legacyRow); err != nil {
		t.Fatal(err)
	}
	rr := fetch(ctx)
	if rr.Code != 200 || bytes.Contains(rr.Body.Bytes(), []byte("legacy_payload")) || !bytes.Contains(rr.Body.Bytes(), []byte("legacy.saved")) {
		t.Fatal("legacy API read/sanitization", rr.Code, rr.Body.String())
	}
	payload, widgetErr := widget.Handler(AdminContext{Context: ctx}, map[string]any{"limit": 10})
	if widgetErr != nil {
		t.Fatal("legacy widget read", widgetErr)
	}
	if got := ingestionTestWidgetEntries(t, payload.Value()); len(got) != 3 {
		t.Fatal("legacy missing from widget", got)
	} else {
		for _, entry := range got {
			if _, exists := entry.Metadata["legacy_payload"]; exists {
				t.Fatal("legacy sanitized field restored")
			}
		}
	}
	legacyMachine := legacyRow
	legacyMachine.ID = uuid.New()
	legacyMachine.Data = map[string]any{"batch": true}
	if err := runtime.Store.repository.Log(ctx, legacyMachine); err != nil {
		t.Fatal(err)
	}
	readPolicy.base = usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(false), usersactivity.WithMachineDataKeys("batch")))
	page, pageErr := runtime.Feed.Query(ctx, types.ActivityFilter{Pagination: types.Pagination{Limit: 1}})
	if pageErr != nil || page.Total != 2 || len(page.Records) != 1 {
		t.Fatal("legacy/custom alias classification before count and limit", page, pageErr)
	}
	rr = fetch(ctx)
	var mixed activityListResponse
	dec := json.NewDecoder(rr.Body)
	dec.UseNumber()
	if err := dec.Decode(&mixed); err != nil || rr.Code != 200 || mixed.Total != 2 || len(mixed.Entries) != 2 {
		t.Fatal("mixed legacy/ingested API classification", rr.Code, mixed, err)
	}
	payload, widgetErr = widget.Handler(AdminContext{Context: ctx}, map[string]any{"limit": 10})
	if widgetErr != nil || len(ingestionTestWidgetEntries(t, payload.Value())) != 2 {
		t.Fatal("mixed legacy/ingested widget classification", payload, widgetErr)
	}
	a.activityReadIdentityResolver = ingestionBrokenIdentity{}
	if _, err := runtime.Sink.List(ctx, 10); err == nil {
		t.Fatal("identity read failed open")
	}
	if rr := fetch(ctx); rr.Code != 503 {
		t.Fatal("API identity failed open", rr.Code, rr.Body.String())
	}
	// Existing Record stays on its original sink, including later host wiring.
	replacement := NewActivityFeed()
	a.WithActivitySink(replacement)
	if a.ActivityFeed() != runtime.Sink {
		t.Fatal("host writer replacement split durable reads")
	}
	if err := a.ActivityFeed().Record(ctx, ActivityEntry{Action: "legacy"}); err != nil {
		t.Fatal(err)
	}
	if entries, err := replacement.List(ctx, 10); err != nil || len(entries) != 1 {
		t.Fatal("legacy write behavior changed", entries, err)
	}
}
func TestActivityIngestionReadsSQLite(t *testing.T)   { runActivityIngestionReadContract(t, false) }
func TestActivityIngestionReadsPostgres(t *testing.T) { runActivityIngestionReadContract(t, true) }

func assertIngestionExactNumber(t *testing.T, value any, expected string) {
	t.Helper()
	n, ok := value.(json.Number)
	if !ok {
		t.Fatalf("expected exact JSON number, got %T", value)
	}
	got, gotOK := new(big.Rat).SetString(n.String())
	want, wantOK := new(big.Rat).SetString(expected)
	if !gotOK || !wantOK || got.Cmp(want) != 0 {
		t.Fatalf("numeric value changed: %s != %s", n, expected)
	}
}

func ingestionTestWidgetEntries(t *testing.T, value any) []ActivityEntry {
	t.Helper()
	payload, ok := value.(ActivityFeedWidgetPayload)
	if !ok {
		t.Fatalf("expected activity widget payload, got %T", value)
	}
	return payload.Entries
}
