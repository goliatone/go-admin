package setup

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	"github.com/google/uuid"
)

func TestFindResourceRolesGrantsSelfServicePanels(t *testing.T) {
	provider := &demoIdentityProvider{}
	identity := userIdentity{
		id:       uuid.NewString(),
		username: "self.service",
		email:    "self@example.com",
		role:     "viewer",
		status:   auth.UserStatusActive,
	}

	roles, err := provider.FindResourceRoles(context.Background(), identity)
	if err != nil {
		t.Fatalf("find roles: %v", err)
	}
	if roles["admin.profile"] != string(auth.RoleOwner) {
		t.Fatalf("expected profile self-service role, got %v", roles["admin.profile"])
	}
	if roles["admin.preferences"] != string(auth.RoleOwner) {
		t.Fatalf("expected preferences self-service role, got %v", roles["admin.preferences"])
	}
}
