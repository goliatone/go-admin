package setup

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
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

	if _, err := store.Upsert(context.Background(), admin.PreferencesUpsertInput{
		Scope: admin.PreferenceScope{UserID: userID},
		Level: admin.PreferenceLevelUser,
		Values: map[string]any{
			"theme":         "midnight",
			"theme_variant": "dark",
		},
	}); err != nil {
		t.Fatalf("save prefs: %v", err)
	}

	prefs, err := store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{UserID: userID},
		Keys:  []string{"theme", "theme_variant"},
	})
	if err != nil {
		t.Fatalf("get prefs: %v", err)
	}
	if prefs.Effective["theme"] != "midnight" || prefs.Effective["theme_variant"] != "dark" {
		t.Fatalf("unexpected prefs payload: %+v", prefs.Effective)
	}

	reloaded, err := NewGoUsersPreferencesStore(deps.PreferenceRepo)
	if err != nil {
		t.Fatalf("rebuild store: %v", err)
	}
	persisted, err := reloaded.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{UserID: userID},
		Keys:  []string{"theme", "theme_variant"},
	})
	if err != nil {
		t.Fatalf("get prefs after reload: %v", err)
	}
	if persisted.Effective["theme"] != "midnight" || persisted.Effective["theme_variant"] != "dark" {
		t.Fatalf("expected persisted prefs, got %+v", persisted.Effective)
	}

	if err := reloaded.Delete(context.Background(), admin.PreferencesDeleteInput{
		Scope: admin.PreferenceScope{UserID: userID},
		Level: admin.PreferenceLevelUser,
		Keys:  []string{"theme", "theme_variant"},
	}); err != nil {
		t.Fatalf("delete prefs: %v", err)
	}

	cleared, err := reloaded.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{UserID: userID},
		Keys:  []string{"theme", "theme_variant"},
	})
	if err != nil {
		t.Fatalf("resolve after delete: %v", err)
	}
	if _, ok := cleared.Effective["theme"]; ok {
		t.Fatalf("expected theme cleared, got %+v", cleared.Effective)
	}
}
