package setup

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/examples/web/datamodule"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type dataAccountRepository struct {
	userstypes.AuthRepository
	user *userstypes.AuthUser
}

func (r dataAccountRepository) GetByID(context.Context, uuid.UUID) (*userstypes.AuthUser, error) {
	return r.user, nil
}

func TestDataConsoleReloadsAccountScopeAndGrants(t *testing.T) {
	uid, rid := uuid.New(), uuid.New()
	user := &userstypes.AuthUser{ID: uid, Status: userstypes.LifecycleStateActive, Metadata: map[string]any{}}
	registry := &testRoleRegistry{assignments: []userstypes.RoleAssignment{{UserID: uid, RoleID: rid}}, roles: userstypes.RolePage{Roles: []userstypes.RoleDefinition{{ID: rid, Permissions: []string{"admin.data.view"}}}}}
	cfg := coreadmin.Config{}
	quickstart.ApplyScopeConfig(&cfg, quickstart.DefaultScopeConfig())
	access := DataConsoleAccess{Config: cfg, Users: stores.UserDependencies{AuthRepo: dataAccountRepository{user: user}, RoleRegistry: registry}, Environment: "dev", Enabled: func() bool { return true }}
	claims := &auth.JWTClaims{UID: uid.String(), RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	ctx := auth.WithClaimsContext(t.Context(), claims)
	p, err := access.Resolve(ctx)
	if err != nil {
		t.Fatal(err)
	}
	request := data.AccessRequest{Action: "view", Target: data.TargetKey{ScopeKey: p.ScopeKey, TargetID: datamodule.TargetID}}
	if err = access.Authorize(ctx, p, request); err != nil {
		t.Fatal("viewer cannot read", err)
	}
	request.Action = "prepare"
	if err = access.Authorize(ctx, p, request); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("viewer can prepare", err)
	}
	registry.roles.Roles[0].Permissions = []string{"admin.data.view", "admin.data.prepare"}
	operator, err := access.Resolve(ctx)
	if err != nil || operator.PermissionHash == p.PermissionHash {
		t.Fatal("grant profile did not change", operator, err)
	}
	if err = access.Authorize(ctx, operator, request); err != nil {
		t.Fatal("new current grant ignored", err)
	}
	request.Action = "reset"
	if err = access.Authorize(ctx, operator, request); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("operator can reset", err)
	}
	registry.roles.Roles[0].Permissions = []string{"admin.debug.view", "admin.debug.repl"}
	developer, err := access.Resolve(ctx)
	if err != nil {
		t.Fatal(err)
	}
	request.Action = "view"
	if err = access.Authorize(ctx, developer, request); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("Debug granted Data", err)
	}
	registry.roles.Roles[0].Permissions = []string{"admin.*"}
	admin, err := access.Resolve(ctx)
	if err != nil {
		t.Fatal(err)
	}
	request.Action = "activate"
	if err = access.Authorize(ctx, admin, request); err != nil {
		t.Fatal("superadmin cannot activate", err)
	}
	request.Target.TargetID = "production"
	if err = access.Authorize(ctx, admin, request); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("unexpected target allowed", err)
	}
	user.Status = userstypes.LifecycleStateSuspended
	if _, err = access.Identity(ctx); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("suspended account retained access", err)
	}
	user.Status = userstypes.LifecycleStateActive
	user.Metadata[coreadmin.ScopeOrganizationIDKey] = uuid.NewString()
	if _, err = access.Resolve(ctx); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("changed scope retained access", err)
	}
	delete(user.Metadata, coreadmin.ScopeOrganizationIDKey)
	claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute))
	if _, err = access.Resolve(ctx); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("expired session retained access", err)
	}
}
