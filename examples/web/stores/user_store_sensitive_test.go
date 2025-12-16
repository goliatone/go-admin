package stores

import (
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestApplyUserPatchDoesNotMutateSensitiveAuthFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	originalLoginAttempt := now.Add(-time.Hour)

	raw := &auth.User{
		PasswordHash:   "hash-1",
		LoginAttempts:  3,
		LoginAttemptAt: &originalLoginAttempt,
		ProfilePicture: "/admin/assets/uploads/users/profile-pictures/original.png",
		Phone:          "+1 555 0100",
		EmailValidated: true,
	}

	existing := &types.AuthUser{
		ID:       uuid.New(),
		Username: "tester",
		Email:    "tester@example.com",
		Role:     "viewer",
		Status:   "active",
		Raw:      raw,
	}

	patched := applyUserPatch(existing, map[string]any{
		"profile_picture":  "/admin/assets/uploads/users/profile-pictures/new.png",
		"password_hash":    "hash-2",
		"login_attempts":   0,
		"login_attempt_at": now.Format(time.RFC3339),
	})
	if patched == nil {
		t.Fatalf("expected patched user")
	}

	gotRaw, ok := patched.Raw.(*auth.User)
	if !ok || gotRaw == nil {
		t.Fatalf("expected patched.Raw to be *auth.User, got %#v", patched.Raw)
	}

	if gotRaw.PasswordHash != "hash-1" {
		t.Fatalf("expected password hash to be unchanged, got %q", gotRaw.PasswordHash)
	}
	if gotRaw.LoginAttempts != 3 {
		t.Fatalf("expected login attempts to be unchanged, got %d", gotRaw.LoginAttempts)
	}
	if gotRaw.LoginAttemptAt == nil || !gotRaw.LoginAttemptAt.Equal(originalLoginAttempt) {
		t.Fatalf("expected login attempt timestamp to be unchanged, got %#v", gotRaw.LoginAttemptAt)
	}

	if gotRaw.ProfilePicture != "/admin/assets/uploads/users/profile-pictures/new.png" {
		t.Fatalf("expected profile picture to be updated, got %q", gotRaw.ProfilePicture)
	}
}
