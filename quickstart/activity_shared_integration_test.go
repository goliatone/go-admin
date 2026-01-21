package quickstart

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	auth "github.com/goliatone/go-auth"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestSharedActivitySinksIncludeAuthAndOnboarding(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:activity_shared_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, svc, _, err := setup.SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	adminSink := setup.NewGoUsersActivityAdapter(deps.ActivitySink, deps.ActivityRepo)
	if adminSink == nil {
		t.Fatalf("expected admin activity sink adapter")
	}

	sinks := NewSharedActivitySinks(adminSink, dashboardactivity.Hooks{}, dashboardactivity.Config{})
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
	}
	authEntry := findActivityEntry(entries, string(auth.ActivityEventLoginSuccess))
	if authEntry == nil {
		t.Fatalf("expected auth activity entry")
	}
	if authEntry.Channel != "auth" {
		t.Fatalf("expected auth entry channel auth, got %q", authEntry.Channel)
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
