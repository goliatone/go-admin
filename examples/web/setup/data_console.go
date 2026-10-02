package setup

import (
	"context"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/examples/web/datamodule"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	"github.com/google/uuid"
)

// DataConsoleAccess reloads account status, scope and role assignments rather
// than retaining cookie permissions or the main authorizer's cached grants.
type DataConsoleAccess struct {
	Config      coreadmin.Config
	Users       stores.UserDependencies
	Environment string
	Enabled     func() bool
}

func (a DataConsoleAccess) current(ctx context.Context) (data.Principal, []string, error) {
	if ctx == nil || ctx.Err() != nil || a.Enabled == nil || !a.Enabled() || a.Users.AuthRepo == nil || a.Users.RoleRegistry == nil {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	claims, ok := auth.GetClaims(ctx)
	if !ok || claims == nil || claims.Expires().IsZero() || !time.Now().Before(claims.Expires()) {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	id, err := uuid.Parse(claims.UserID())
	if err != nil {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	user, err := a.Users.AuthRepo.GetByID(ctx, id)
	if err != nil || user == nil || string(user.Status) != "active" {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	tenant := primitives.StringFromAny(user.Metadata[coreadmin.ScopeTenantIDKey])
	org := primitives.StringFromAny(user.Metadata[coreadmin.ScopeOrganizationIDKey])
	if a.Config.ScopeMode == string(quickstart.ScopeModeSingle) {
		if tenant == "" {
			tenant = a.Config.DefaultTenantID
		}
		if org == "" {
			org = a.Config.DefaultOrgID
		}
	}
	tenantID, tenantErr := uuid.Parse(tenant)
	orgID, orgErr := uuid.Parse(org)
	scope := quickstart.ScopeBuilder(a.Config)(ctx)
	if tenantErr != nil || orgErr != nil || scope.TenantID != tenantID || scope.OrgID != orgID {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	identity := userIdentity{id: user.ID.String(), username: user.Username, email: user.Email, role: user.Role, status: auth.UserStatusActive, metadata: user.Metadata}
	permissions, err := resolveRolePermissions(ctx, a.Users.RoleRegistry, identity, scope)
	if err != nil {
		return data.Principal{}, nil, data.Error(data.CodeDenied)
	}
	// Bind only this module's effective grants. Application/PII/export grants
	// remain independent and do not become part of a Data capability.
	grants := []string{}
	for _, action := range []string{"view", "validate", "prepare", "refresh", "verify", "activate", "reset", "generate", "cancel", "recover"} {
		if dataPermissionAllowed(permissions, "admin.data."+action) {
			grants = append(grants, action)
		}
	}
	p := data.Principal{ActorID: user.ID.String(), ScopeKey: datamodule.Hash(tenant + ":" + org), ExecutionID: user.ID.String(),
		ModuleHash: datamodule.Hash("kitchen-sink-data-v1"), PolicyHash: datamodule.Hash("isolated-synthetic-target-v1"), PermissionHash: datamodule.Hash(strings.Join(grants, ","))}
	return p, permissions, nil
}

func (a DataConsoleAccess) Resolve(ctx context.Context) (data.Principal, error) {
	p, _, err := a.current(ctx)
	return p, err
}

func (a DataConsoleAccess) Identity(ctx context.Context) (console.Identity, error) {
	p, _, err := a.current(ctx)
	return console.Identity{ConsoleID: "data", ApplicationID: "go-admin-web", EnvironmentID: a.Environment, ActorID: p.ActorID, ScopeKey: p.ScopeKey}, err
}

func (a DataConsoleAccess) Authorize(ctx context.Context, p data.Principal, request data.AccessRequest) error {
	current, permissions, err := a.current(ctx)
	if err != nil || current != p || request.Target != (data.TargetKey{ScopeKey: p.ScopeKey, TargetID: datamodule.TargetID}) {
		return data.Error(data.CodeDenied)
	}
	if !dataPermissionAllowed(permissions, "admin.data.view") || !dataPermissionAllowed(permissions, "admin.data."+request.Action) {
		return data.Error(data.CodeDenied)
	}
	// The demo has no artifact/export adapter. No Data grant is a download grant.
	if request.Artifact != nil || request.Action == "artifact" {
		return data.Error(data.CodeDenied)
	}
	if request.Receipt != nil && request.Action != "view" && request.Receipt.RequesterID != p.ActorID {
		return data.Error(data.CodeDenied)
	}
	if request.Operation != nil && request.Action != "view" && request.Operation.Principal.ActorID != p.ActorID && request.Action != "recover" {
		return data.Error(data.CodeDenied)
	}
	return nil
}

func dataPermissionAllowed(permissions []string, want string) bool {
	for _, permission := range permissions {
		if permission == want || permission == "*" || (strings.HasSuffix(permission, ".*") && strings.HasPrefix(want, strings.TrimSuffix(permission, "*"))) {
			return true
		}
	}
	return false
}
