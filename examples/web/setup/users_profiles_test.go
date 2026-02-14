package setup

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestSeedUsersCreatesProfilesForAllSeededUsers(t *testing.T) {
	dsn := fmt.Sprintf("file:profiles_seed_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	usersRepo := deps.RepoManager.Users()
	users, _, err := usersRepo.List(context.Background())
	if err != nil {
		t.Fatalf("list users: %v", err)
	}
	if len(users) == 0 {
		t.Fatalf("expected seeded users")
	}
	scope := seedScopeDefaults()

	for _, user := range users {
		if user == nil {
			continue
		}
		profile, err := deps.ProfileRepo.GetProfile(context.Background(), user.ID, scope)
		if err != nil {
			t.Fatalf("get profile for user %s: %v", user.Username, err)
		}
		if profile == nil {
			t.Fatalf("expected seeded profile for user %s", user.Username)
		}
		if profile.DisplayName == "" {
			t.Fatalf("expected display name for user %s", user.Username)
		}
		if profile.Locale == "" {
			t.Fatalf("expected locale for user %s", user.Username)
		}
		if profile.Contact == nil || profile.Contact["email"] != user.Email {
			t.Fatalf("expected profile email=%q for user %s, got %#v", user.Email, user.Username, profile.Contact)
		}
	}
}

func TestGoUsersProfileStorePersistsToSQLite(t *testing.T) {
	dsn := fmt.Sprintf("file:profiles_store_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	usersRepo := deps.RepoManager.Users()
	users, _, err := usersRepo.List(context.Background())
	if err != nil {
		t.Fatalf("list users: %v", err)
	}
	if len(users) == 0 {
		t.Fatalf("expected seeded users")
	}
	userID := users[0].ID.String()

	store := admin.NewGoUsersProfileStore(deps.ProfileRepo, nil)
	_, err = store.Save(context.Background(), admin.UserProfile{
		UserID:      userID,
		DisplayName: "Updated Name",
		Email:       "updated@example.com",
		Locale:      "en",
		Timezone:    "UTC",
		Bio:         "Updated bio",
	})
	if err != nil {
		t.Fatalf("save profile: %v", err)
	}

	reloaded := admin.NewGoUsersProfileStore(deps.ProfileRepo, nil)
	got, err := reloaded.Get(context.Background(), userID)
	if err != nil {
		t.Fatalf("get profile after reload: %v", err)
	}
	if got.DisplayName != "Updated Name" || got.Email != "updated@example.com" || got.Bio != "Updated bio" {
		t.Fatalf("unexpected profile payload: %+v", got)
	}
}

func TestSeedUserProfileIsIdempotent(t *testing.T) {
	dsn := fmt.Sprintf("file:profiles_idempotent_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	usersRepo := deps.RepoManager.Users()
	user, err := usersRepo.GetByIdentifier(context.Background(), "admin")
	if err != nil || user == nil {
		t.Fatalf("expected seeded admin user, got err=%v user=%v", err, user)
	}
	scope := seedScopeDefaults()

	_, err = deps.ProfileRepo.UpsertProfile(context.Background(), types.UserProfile{
		UserID:      user.ID,
		DisplayName: "Custom Name",
		Locale:      "fr",
		Contact:     map[string]any{"email": "custom@example.com"},
		Scope:       scope,
		CreatedBy:   user.ID,
		UpdatedBy:   user.ID,
	})
	if err != nil {
		t.Fatalf("upsert profile: %v", err)
	}

	if err := seedUserProfile(context.Background(), deps.ProfileRepo, user); err != nil {
		t.Fatalf("seedUserProfile: %v", err)
	}

	got, err := deps.ProfileRepo.GetProfile(context.Background(), user.ID, scope)
	if err != nil {
		t.Fatalf("get profile: %v", err)
	}
	if got == nil {
		t.Fatalf("expected profile")
	}
	if got.DisplayName != "Custom Name" {
		t.Fatalf("expected display name preserved, got %q", got.DisplayName)
	}
	if got.Locale != "fr" {
		t.Fatalf("expected locale preserved, got %q", got.Locale)
	}
	if got.Contact == nil || got.Contact["email"] != "custom@example.com" {
		t.Fatalf("expected contact email preserved, got %#v", got.Contact)
	}
}

func TestEnsureSeedUserProfilesCoversUsersBeyondLegacyPageLimit(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:profiles_many_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	usersRepo := deps.RepoManager.Users()
	extraUserIDs := make([]uuid.UUID, 0, 35)
	now := time.Now().UTC()
	for i := 0; i < 35; i++ {
		id := uuid.New()
		username := fmt.Sprintf("profile.seed.%03d", i)
		email := fmt.Sprintf("%s@example.com", username)
		if _, err := usersRepo.Create(ctx, &auth.User{
			ID:        id,
			Username:  username,
			Email:     email,
			Role:      auth.RoleMember,
			Status:    auth.UserStatusActive,
			CreatedAt: &now,
			Metadata:  map[string]any{},
		}); err != nil {
			t.Fatalf("create user %d: %v", i, err)
		}
		extraUserIDs = append(extraUserIDs, id)
	}

	if err := ensureSeedUserProfiles(ctx, deps); err != nil {
		t.Fatalf("ensureSeedUserProfiles: %v", err)
	}

	scope := seedScopeDefaults()
	for _, id := range extraUserIDs {
		profile, err := deps.ProfileRepo.GetProfile(ctx, id, scope)
		if err != nil {
			t.Fatalf("get profile %s: %v", id.String(), err)
		}
		if profile == nil {
			t.Fatalf("expected profile for user %s", id.String())
		}
	}
}
