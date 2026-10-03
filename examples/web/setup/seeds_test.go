package setup

import (
	"context"
	"path/filepath"
	"testing"
)

func TestSetupUsersRestartsWithExistingSeeds(t *testing.T) {
	ctx := context.Background()
	dsn := "file:" + filepath.Join(t.TempDir(), "users.db") + "?cache=shared&_fk=1"
	seedCacheKey := dsn + "|" + string(SeedGroupUsers)
	t.Cleanup(func() { seedOnce.Delete(seedCacheKey) })

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("initial setup: %v", err)
	}
	t.Cleanup(func() {
		if err := deps.DB.Close(); err != nil {
			t.Errorf("close DB: %v", err)
		}
	})
	user, err := deps.RepoManager.Users().GetByIdentifier(ctx, "admin")
	if err != nil {
		t.Fatalf("get seeded admin: %v", err)
	}
	user.FirstName = "Preserved on restart"
	if _, err := deps.RepoManager.Users().Update(ctx, user); err != nil {
		t.Fatalf("update seeded admin: %v", err)
	}
	// Remove a later fixture row to simulate a database seeded by an older version.
	if _, err := deps.DB.ExecContext(ctx, "DELETE FROM users WHERE username = 'viewer'"); err != nil {
		t.Fatalf("remove later seed: %v", err)
	}
	if err := deps.DB.Close(); err != nil {
		t.Fatalf("close initial database: %v", err)
	}

	// A new process has no seedOnce entry; reloading must tolerate existing rows.
	seedOnce.Delete(seedCacheKey)
	restarted, service, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("restart setup: %v", err)
	}
	t.Cleanup(func() {
		if err := restarted.DB.Close(); err != nil {
			t.Errorf("close restarted DB: %v", err)
		}
	})
	if err := service.HealthCheck(ctx); err != nil {
		t.Fatalf("users health after restart: %v", err)
	}
	got, err := restarted.RepoManager.Users().GetByIdentifier(ctx, "admin")
	if err != nil {
		t.Fatalf("get admin after restart: %v", err)
	}
	if _, err := restarted.RepoManager.Users().GetByIdentifier(ctx, "viewer"); err != nil {
		t.Fatalf("missing later seed was not restored: %v", err)
	}
	if got.ID != user.ID || got.FirstName != user.FirstName {
		t.Fatal("restart changed existing user data")
	}
}
