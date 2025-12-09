package setup

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestGoUsersPreferencesStorePersistsToSQLite(t *testing.T) {
	dsn := fmt.Sprintf("file:prefs_store_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(context.Background(), dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	store, err := NewGoUsersPreferencesStore(deps.PreferenceRepo)
	if err != nil {
		t.Fatalf("build preferences store: %v", err)
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

	if err := store.Save(context.Background(), userID, map[string]any{
		"theme":         "midnight",
		"theme_variant": "dark",
	}); err != nil {
		t.Fatalf("save prefs: %v", err)
	}

	prefs, err := store.Get(context.Background(), userID)
	if err != nil {
		t.Fatalf("get prefs: %v", err)
	}
	if prefs["theme"] != "midnight" || prefs["theme_variant"] != "dark" {
		t.Fatalf("unexpected prefs payload: %+v", prefs)
	}

	reloaded, err := NewGoUsersPreferencesStore(deps.PreferenceRepo)
	if err != nil {
		t.Fatalf("rebuild store: %v", err)
	}
	persisted, err := reloaded.Get(context.Background(), userID)
	if err != nil {
		t.Fatalf("get prefs after reload: %v", err)
	}
	if persisted["theme"] != "midnight" || persisted["theme_variant"] != "dark" {
		t.Fatalf("expected persisted prefs, got %+v", persisted)
	}
}
