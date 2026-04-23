package setup

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-users/pkg/types"
)

func TestDemoIdentityProviderVerifyIdentityRejectsExpiredTemporaryPassword(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:temp_password_verify_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	usersRepo := deps.RepoManager.Users()
	user, err := usersRepo.GetByIdentifier(ctx, "admin")
	if err != nil {
		t.Fatalf("get seeded user: %v", err)
	}
	if user == nil {
		t.Fatal("expected seeded admin user")
	}

	issuedAt := time.Now().UTC().Add(-2 * time.Hour)
	user.Metadata = types.MarkTemporaryPasswordMetadata(user.Metadata, issuedAt, issuedAt.Add(-time.Hour))
	if _, err := usersRepo.Update(ctx, user); err != nil {
		t.Fatalf("update user metadata: %v", err)
	}

	provider := &demoIdentityProvider{
		authRepo:    deps.AuthRepo,
		userTracker: userTrackerFromDependencies(deps),
	}
	_, err = provider.VerifyIdentity(ctx, "admin", "admin.pwd")
	if !errors.Is(err, auth.ErrTemporaryPasswordExpired) {
		t.Fatalf("expected ErrTemporaryPasswordExpired, got %v", err)
	}
}

func TestAuthRepositoryAdapterResetPasswordAndClearTemporaryPasswordClearsMetadata(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:temp_password_reset_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())
	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	resetRepo, ok := deps.AuthRepo.(types.TemporaryPasswordResetRepository)
	if !ok {
		t.Fatalf("expected auth repo to implement TemporaryPasswordResetRepository")
	}

	usersRepo := deps.RepoManager.Users()
	user, err := usersRepo.GetByIdentifier(ctx, "admin")
	if err != nil {
		t.Fatalf("get seeded user: %v", err)
	}
	if user == nil {
		t.Fatal("expected seeded admin user")
	}

	issuedAt := time.Now().UTC()
	user.Metadata = types.MarkTemporaryPasswordMetadata(user.Metadata, issuedAt, issuedAt.Add(time.Hour))
	if _, err := usersRepo.Update(ctx, user); err != nil {
		t.Fatalf("update user metadata: %v", err)
	}

	hash, err := auth.HashPassword("AdminChanged123!")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if err := resetRepo.ResetPasswordAndClearTemporaryPassword(ctx, user.ID, hash); err != nil {
		t.Fatalf("reset and clear temporary password: %v", err)
	}

	reloaded, err := usersRepo.GetByID(ctx, user.ID.String())
	if err != nil {
		t.Fatalf("reload user: %v", err)
	}
	if reloaded == nil {
		t.Fatal("expected reloaded user")
	}
	if types.HasTemporaryPasswordMetadata(reloaded.Metadata) {
		t.Fatalf("expected temporary-password metadata cleared, got %#v", reloaded.Metadata)
	}
	if err := auth.ComparePasswordAndHash("AdminChanged123!", reloaded.PasswordHash); err != nil {
		t.Fatalf("expected password hash updated: %v", err)
	}
}
