package admin

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	usersactivity "github.com/goliatone/go-users/activity"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestActivityEntryFromUsersRecordMapsFields(t *testing.T) {
	now := time.Date(2024, 2, 10, 9, 30, 0, 0, time.UTC)
	actorID := uuid.New()
	userID := uuid.New()
	record := usertypes.ActivityRecord{
		ID:         uuid.New(),
		ActorID:    actorID,
		UserID:     userID,
		Verb:       "updated",
		ObjectType: "item",
		ObjectID:   "item-1",
		Channel:    "admin",
		Data:       map[string]any{"token": "secret"},
		OccurredAt: now,
	}

	entry := entryFromUsersRecord(record)
	if entry.ID != record.ID.String() {
		t.Fatalf("expected id %s, got %s", record.ID, entry.ID)
	}
	if entry.Actor != actorID.String() {
		t.Fatalf("expected actor %s, got %s", actorID, entry.Actor)
	}
	if entry.Action != "updated" {
		t.Fatalf("expected action updated, got %s", entry.Action)
	}
	if entry.Object != "item:item-1" {
		t.Fatalf("expected object item:item-1, got %s", entry.Object)
	}
	if entry.Channel != "admin" {
		t.Fatalf("expected channel admin, got %s", entry.Channel)
	}
	if entry.Metadata["token"] != "secret" {
		t.Fatalf("expected metadata token secret, got %v", entry.Metadata["token"])
	}
	if !entry.CreatedAt.Equal(now) {
		t.Fatalf("expected created_at %s, got %s", now, entry.CreatedAt)
	}
}

func TestActivityEntryFromUsersRecordMapsPresentationActionAndCanonicalKey(t *testing.T) {
	record := usertypes.ActivityRecord{
		ID: uuid.New(), Verb: "audience.update",
		Data: map[string]any{usersactivity.DataKeyActionDisplay: "Updated audience"},
	}
	entry := entryFromUsersRecord(record)
	if entry.Action != "Updated audience" || entry.ActionKey != "audience.update" {
		t.Fatalf("unexpected action mapping: %+v", entry)
	}

	record.Data = nil
	entry = entryFromUsersRecord(record)
	if entry.Action != "audience.update" || entry.ActionKey != "audience.update" {
		t.Fatalf("unexpected fallback action mapping: %+v", entry)
	}
}

func TestActivityEntryFromUsersRecordFallsBackToUserID(t *testing.T) {
	userID := uuid.New()
	record := usertypes.ActivityRecord{
		ID:     uuid.New(),
		UserID: userID,
		Verb:   "login",
	}

	entry := entryFromUsersRecord(record)
	if entry.Actor != userID.String() {
		t.Fatalf("expected actor %s, got %s", userID, entry.Actor)
	}
}

func TestActivityEntryFromUsersRecordPrefersDisplayFields(t *testing.T) {
	record := usertypes.ActivityRecord{
		ID:         uuid.New(),
		ActorID:    uuid.New(),
		ObjectType: "role",
		ObjectID:   "role-1",
		Data: map[string]any{
			"actor_display":  "Ada Lovelace",
			"object_display": "Role: Admin",
		},
	}

	entry := entryFromUsersRecord(record)
	if entry.Actor != "Ada Lovelace" {
		t.Fatalf("expected actor display Ada Lovelace, got %s", entry.Actor)
	}
	if entry.Object != "Role: Admin" {
		t.Fatalf("expected object display Role: Admin, got %s", entry.Object)
	}
	if entry.Metadata["actor_display"] != "Ada Lovelace" {
		t.Fatalf("expected actor_display metadata Ada Lovelace, got %v", entry.Metadata["actor_display"])
	}
	if entry.Metadata["object_display"] != "Role: Admin" {
		t.Fatalf("expected object_display metadata Role: Admin, got %v", entry.Metadata["object_display"])
	}
}

func TestActivityNavigationIsPresentationOnly(t *testing.T) {
	entry := ActivityEntry{
		ID:     "activity-1",
		Actor:  "user-1",
		Action: "updated",
		Object: "customer:customer-1",
	}
	readEntry := ActivityReadEntry{
		ActivityEntry: entry,
		ActorHref:     "/admin/users/user-1",
		ObjectHref:    "/admin/customers/customer-1",
	}

	record := recordFromEntry(readEntry.ActivityEntry)
	if !reflect.DeepEqual(record.Data, entry.Metadata) || record.ActorID != entry.Actor || record.ObjectType != "customer" || record.ObjectID != "customer-1" {
		t.Fatalf("read navigation must not change the write-side persistence mapping: record=%+v entry=%+v", record, entry)
	}
}

func TestActivityEntryRetainsUnkeyedLiteralShape(t *testing.T) {
	entry := ActivityEntry{"id", "actor", "action", "action-key", "object", "channel", nil, time.Time{}}
	if entry.ID != "id" || entry.Object != "object" {
		t.Fatalf("unexpected unkeyed ActivityEntry: %+v", entry)
	}
}

func TestActivityEntriesFromUsersRecordsPreservesOrder(t *testing.T) {
	firstID := uuid.New()
	secondID := uuid.New()
	records := []usertypes.ActivityRecord{
		{ID: firstID, Verb: "first"},
		{ID: secondID, Verb: "second"},
	}

	entries := entriesFromUsersRecords(records)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].ID != firstID.String() || entries[1].ID != secondID.String() {
		t.Fatalf("expected order %s then %s, got %+v", firstID, secondID, entries)
	}
}

func TestActivityEntriesResolveTrustedHostNavigation(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	actorID := uuid.New()
	customerID := uuid.New()
	record := usertypes.ActivityRecord{
		ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID,
		Verb: "customer.consent.capture", ObjectType: "customer", ObjectID: customerID.String(),
		Data: map[string]any{
			usersactivity.DataKeyActorDisplay:  "Owner User",
			usersactivity.DataKeyObjectDisplay: "customer:" + customerID.String(),
			"actor_href":                       "https://stored.example/users/forged",
			"object_href":                      "javascript:alert(1)",
		},
	}
	readCtx := ActivityReadContext{
		Actor: usertypes.ActorRef{ID: actorID},
		Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID},
	}
	resolverCalls := 0
	adm := &Admin{activityNavigationResolver: ActivityNavigationResolverFunc(func(_ context.Context, gotCtx ActivityReadContext, records []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
		resolverCalls++
		gotRecord := records[0]
		if gotCtx.Scope.TenantID != tenantID || gotCtx.Scope.OrgID != orgID || gotRecord.ID != record.ID {
			t.Fatalf("navigation resolver received untrusted context or wrong record: ctx=%+v record=%+v", gotCtx, gotRecord)
		}
		return []ActivityNavigation{{
			ActorHref:  "/control/users/" + actorID.String(),
			ObjectHref: "/control/customers/" + customerID.String() + "?tab=activity",
		}}, nil
	})}

	entries := adm.entriesFromActivityRecords(context.Background(), readCtx, []usertypes.ActivityRecord{record})
	if resolverCalls != 1 || len(entries) != 1 {
		t.Fatalf("expected one navigation resolution and entry, calls=%d entries=%+v", resolverCalls, entries)
	}
	if entries[0].ActorHref != "/control/users/"+actorID.String() || entries[0].ObjectHref != "/control/customers/"+customerID.String()+"?tab=activity" {
		t.Fatalf("unexpected CRM navigation projection: %+v", entries[0])
	}
	if entries[0].Actor != "Owner User" || entries[0].Object != "customer:"+customerID.String() {
		t.Fatalf("navigation changed display labels: %+v", entries[0])
	}
}

func TestActivityEntriesNavigationFailsClosedPerRecord(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	record := usertypes.ActivityRecord{ID: uuid.New(), ActorID: uuid.New(), TenantID: tenantID, OrgID: orgID}
	readCtx := ActivityReadContext{Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID}}
	observed := 0
	adm := &Admin{
		activityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			return []ActivityNavigation{{ActorHref: "/admin/users/safe", ObjectHref: "https://evil.example/customer"}}, nil
		}),
		activityNavigationErrorHandler: func(_ context.Context, _ ActivityReadContext, got ActivityNavigationError) {
			observed++
			if got.Target != ActivityNavigationTargetResolver && got.ActivityID != record.ID {
				t.Errorf("unexpected activity ID: %s", got.ActivityID)
			}
		},
	}

	entries := adm.entriesFromActivityRecords(context.Background(), readCtx, []usertypes.ActivityRecord{record})
	if observed != 1 || entries[0].ActorHref != "/admin/users/safe" || entries[0].ObjectHref != "" {
		t.Fatalf("unsafe object navigation must preserve the independent safe actor target: observed=%d entry=%+v", observed, entries[0])
	}

	resolverErr := errors.New("route unavailable")
	adm.activityNavigationResolver = ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
		return nil, resolverErr
	})
	entries = adm.entriesFromActivityRecords(context.Background(), readCtx, []usertypes.ActivityRecord{record})
	if observed != 2 || entries[0].ActorHref != "" || entries[0].ObjectHref != "" {
		t.Fatalf("resolver errors must omit navigation and remain observable: observed=%d entry=%+v", observed, entries[0])
	}
}

func TestActivityEntriesNavigationRejectsMismatchedBatchResult(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	record := usertypes.ActivityRecord{ID: uuid.New(), TenantID: tenantID, OrgID: orgID}
	var observed ActivityNavigationError
	adm := &Admin{
		activityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			return nil, nil
		}),
		activityNavigationErrorHandler: func(_ context.Context, _ ActivityReadContext, got ActivityNavigationError) {
			observed = got
		},
	}

	entries := adm.entriesFromActivityRecords(context.Background(), ActivityReadContext{Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID}}, []usertypes.ActivityRecord{record})
	if !errors.Is(observed, errInvalidActivityNavigationResult) || observed.Target != ActivityNavigationTargetResolver || len(entries) != 1 {
		t.Fatalf("mismatched result must fail open through resolver observability: observed=%+v entries=%+v", observed, entries)
	}
}

func TestActivityEntriesNavigationSkipsZeroScope(t *testing.T) {
	calls := 0
	adm := &Admin{activityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
		calls++
		return []ActivityNavigation{{ActorHref: "/admin/users/should-not-resolve"}}, nil
	})}
	entries := adm.entriesFromActivityRecords(context.Background(), ActivityReadContext{}, []usertypes.ActivityRecord{{ID: uuid.New()}})
	if calls != 0 || entries[0].ActorHref != "" {
		t.Fatalf("zero-scope pages must not resolve navigation: calls=%d entry=%+v", calls, entries[0])
	}
}

func TestActivityEntriesNavigationReceivesDetachedMetadata(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	nested := map[string]any{"label": "original"}
	record := usertypes.ActivityRecord{
		ID: uuid.New(), TenantID: tenantID, OrgID: orgID,
		Data: map[string]any{"nested": nested, "items": []any{nested}},
	}
	adm := &Admin{activityNavigationResolver: ActivityNavigationResolverFunc(func(_ context.Context, _ ActivityReadContext, records []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
		got := records[0]
		got.Data["nested"].(map[string]any)["label"] = "changed"
		got.Data["items"].([]any)[0].(map[string]any)["label"] = "changed again"
		return []ActivityNavigation{{}}, nil
	})}

	adm.entriesFromActivityRecords(context.Background(), ActivityReadContext{Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID}}, []usertypes.ActivityRecord{record})
	if nested["label"] != "original" {
		t.Fatalf("resolver mutation escaped detached metadata: %+v", record.Data)
	}
}

func TestActivityEntriesNavigationSkipsForeignScope(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	calls := 0
	adm := &Admin{activityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
		calls++
		return []ActivityNavigation{{ActorHref: "/admin/users/should-not-resolve"}}, nil
	})}
	record := usertypes.ActivityRecord{ID: uuid.New(), TenantID: tenantID, OrgID: uuid.New()}
	entries := adm.entriesFromActivityRecords(context.Background(), ActivityReadContext{Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID}}, []usertypes.ActivityRecord{record})
	if calls != 0 || entries[0].ActorHref != "" {
		t.Fatalf("foreign-scope records must not resolve navigation: calls=%d entry=%+v", calls, entries[0])
	}
}

func TestSafeActivityNavigationHref(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want string
	}{
		{name: "empty", raw: "", want: ""},
		{name: "trimmed local", raw: "  /admin/users/user-1?tab=activity#latest  ", want: "/admin/users/user-1?tab=activity#latest"},
		{name: "escaped id", raw: "/admin/customers/customer%2Fone", want: "/admin/customers/customer%2Fone"},
		{name: "absolute URL", raw: "https://evil.example/admin", want: ""},
		{name: "protocol relative", raw: "//evil.example/admin", want: ""},
		{name: "relative", raw: "admin/users/user-1", want: ""},
		{name: "javascript", raw: "javascript:alert(1)", want: ""},
		{name: "backslash", raw: "/admin\\evil", want: ""},
		{name: "escaped backslash", raw: "/admin/%5cevil", want: ""},
		{name: "double escaped backslash", raw: "/admin/%255cevil", want: ""},
		{name: "escaped query control", raw: "/admin/users?next=%0aevil", want: ""},
		{name: "double escaped query control", raw: "/admin/users?next=%250aevil", want: ""},
		{name: "control", raw: "/admin/users\nuser-1", want: ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := safeActivityNavigationHref(tc.raw)
			if tc.want == "" && strings.TrimSpace(tc.raw) != "" {
				if err == nil || got != "" {
					t.Fatalf("safeActivityNavigationHref(%q)=(%q,%v), want rejection", tc.raw, got, err)
				}
				return
			}
			if err != nil || got != tc.want {
				t.Fatalf("safeActivityNavigationHref(%q)=(%q,%v), want (%q,nil)", tc.raw, got, err, tc.want)
			}
		})
	}
}
