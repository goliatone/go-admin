package quickstart_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	quickstart "github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type staticActivityEnricher struct {
	actorDisplay  string
	objectDisplay string
}

func (e staticActivityEnricher) Enrich(_ context.Context, record userstypes.ActivityRecord) (userstypes.ActivityRecord, error) {
	data := map[string]any{}
	for key, value := range record.Data {
		data[key] = value
	}
	if e.actorDisplay != "" {
		if _, ok := data[usersactivity.DataKeyActorDisplay]; !ok {
			data[usersactivity.DataKeyActorDisplay] = e.actorDisplay
		}
	}
	if e.objectDisplay != "" {
		if _, ok := data[usersactivity.DataKeyObjectDisplay]; !ok {
			data[usersactivity.DataKeyObjectDisplay] = e.objectDisplay
		}
	}
	record.Data = data
	return usersactivity.StampEnrichment(record, time.Now().UTC(), "test"), nil
}

func TestSharedActivitySinksIncludeAuthAndOnboarding(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:activity_shared_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, svc, _, err := setup.SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	enrichedSink := &usersactivity.EnrichedSink{
		Sink: deps.ActivitySink,
		Enricher: staticActivityEnricher{
			actorDisplay:  "Activity User",
			objectDisplay: "Activity Object",
		},
	}
	adminSink := setup.NewGoUsersActivityAdapter(enrichedSink, deps.ActivityRepo)
	if adminSink == nil {
		t.Fatalf("expected admin activity sink adapter")
	}

	sinks := quickstart.NewSharedActivitySinks(adminSink, dashboardactivity.Hooks{}, dashboardactivity.Config{})
	actorID := uuid.New()

	inviteResult := &command.UserInviteResult{}
	if err := svc.Commands().UserInvite.Execute(ctx, command.UserInviteInput{
		Email:     "activity@example.com",
		FirstName: "Activity",
		LastName:  "User",
		Role:      "member",
		Actor:     userstypes.ActorRef{ID: actorID, Type: "user"},
		Scope:     userstypes.ScopeFilter{},
		Metadata:  map[string]any{"source": "tests"},
		Result:    inviteResult,
	}); err != nil {
		t.Fatalf("issue invite: %v", err)
	}
	if inviteResult.User == nil {
		t.Fatalf("expected invite user result")
	}

	if err := sinks.Auth.Record(ctx, auth.ActivityEvent{
		EventType:  auth.ActivityEventLoginSuccess,
		Actor:      auth.ActorRef{ID: actorID.String(), Type: "user"},
		UserID:     inviteResult.User.ID.String(),
		OccurredAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("record auth activity: %v", err)
	}

	entries, err := sinks.Admin.List(ctx, 10)
	if err != nil {
		t.Fatalf("list activity entries: %v", err)
	}

	if entry := findActivityEntry(entries, "user.invite"); entry == nil {
		t.Fatalf("expected invite activity entry")
	} else {
		if entry.Metadata[usersactivity.DataKeyActorDisplay] != "Activity User" {
			t.Fatalf("expected invite actor_display metadata, got %+v", entry.Metadata[usersactivity.DataKeyActorDisplay])
		}
		if entry.Metadata[usersactivity.DataKeyObjectDisplay] != "Activity Object" {
			t.Fatalf("expected invite object_display metadata, got %+v", entry.Metadata[usersactivity.DataKeyObjectDisplay])
		}
	}
	authEntry := findActivityEntry(entries, string(auth.ActivityEventLoginSuccess))
	if authEntry == nil {
		t.Fatalf("expected auth activity entry")
	}
	if authEntry.Channel != "auth" {
		t.Fatalf("expected auth entry channel auth, got %q", authEntry.Channel)
	}
	if authEntry.Metadata[usersactivity.DataKeyActorDisplay] != "Activity User" {
		t.Fatalf("expected auth actor_display metadata, got %+v", authEntry.Metadata[usersactivity.DataKeyActorDisplay])
	}
	if authEntry.Metadata[usersactivity.DataKeyObjectDisplay] != "Activity Object" {
		t.Fatalf("expected auth object_display metadata, got %+v", authEntry.Metadata[usersactivity.DataKeyObjectDisplay])
	}
}

func findActivityEntry(entries []admin.ActivityEntry, action string) *admin.ActivityEntry {
	for _, entry := range entries {
		if entry.Action == action {
			return &entry
		}
	}
	return nil
}
