package setup

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/examples/web/datamodule"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
)

func previewAuthorityFixture(t *testing.T) (DataConsoleAccess, context.Context, data.Principal) {
	t.Helper()
	deps, _, _, err := SetupUsers(t.Context(), "file:"+filepath.Join(t.TempDir(), "users.db")+"?_fk=1")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := deps.DB.Close(); err != nil {
			t.Error(err)
		}
	})
	user, err := deps.RepoManager.Users().GetByIdentifier(t.Context(), "superadmin")
	if err != nil {
		t.Fatal(err)
	}
	cfg := coreadmin.Config{}
	quickstart.ApplyScopeConfig(&cfg, quickstart.DefaultScopeConfig())
	a := DataConsoleAccess{Config: cfg, Users: deps, Environment: "dev", Enabled: func() bool { return true }}
	claims := &auth.JWTClaims{UID: user.ID.String(), RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	ctx := auth.WithClaimsContext(t.Context(), claims)
	p, err := a.Resolve(ctx)
	if err != nil {
		t.Fatal(err)
	}
	return a, ctx, p
}

func TestPreviewHostEpochGrantRestoreAndRestart(t *testing.T) {
	access, ctx, principal := previewAuthorityFixture(t)
	role, err := findSeedRole(ctx, access.Users.RoleRegistry, "superadmin")
	if err != nil || role == nil {
		t.Fatal(role, err)
	}
	file := filepath.Join(t.TempDir(), "preview.db")
	runtime, err := datamodule.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := runtime.Close(); err != nil {
			t.Error(err)
		}
	})
	build := func() *data.Service {
		s, err := data.NewService(data.ServiceConfig{Store: runtime.Store, Target: runtime, Providers: map[string]data.Provider{"kitchen-sink": runtime}, Policy: access, Resolve: access.Resolve, WritesEnabled: true, Preview: data.ApplicationPreviewConfig{Adapter: runtime, Enabled: true, ApplicationID: "app", EnvironmentID: "dev", Surfaces: []data.PreviewSurface{{ID: datamodule.OrdersReportSurface, Label: "Orders", Kind: "report"}}}})
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	service := build()
	catalog, err := service.Catalog(ctx, datamodule.TargetID, 10)
	if err != nil {
		t.Fatal(err)
	}
	descriptor, err := service.Describe(ctx, catalog[0].Dataset, datamodule.TargetID)
	if err != nil {
		t.Fatal(err)
	}
	in := data.Input{Dataset: descriptor.Dataset, Scenario: descriptor.Scenarios[0], TargetID: datamodule.TargetID, IdempotencyKey: "prepared"}
	result, err := service.Run(ctx, data.Prepare, in)
	if err != nil || result.Receipt == nil {
		t.Fatal(result, err)
	}
	receipt := result.Receipt
	q := data.OpenApplicationPreviewInput{Selection: data.ExploreSelection{Dataset: receipt.Dataset, Scenario: receipt.Scenario, TargetID: receipt.Target.TargetID, Context: data.ExplorePrepared, ReceiptID: receipt.ID, ContentRevision: receipt.ContentRevision}, SurfaceID: datamodule.OrdersReportSurface, RequestID: "launch"}
	session, err := service.OpenApplicationPreview(ctx, q)
	if err != nil {
		t.Fatal(err)
	}
	epoch, err := access.InsightAuthorizationRevision(ctx, principal)
	if err != nil {
		t.Fatal(err)
	}
	mutation := userstypes.RoleMutation{Name: role.Name, RoleKey: role.RoleKey, Permissions: []string{"admin.data.*"}, Scope: role.Scope, IsSystem: role.IsSystem, ActorID: role.CreatedBy}
	if _, err = access.Users.RoleRegistry.UpdateRole(ctx, role.ID, mutation); err != nil {
		t.Fatal(err)
	}
	mutation.Permissions = role.Permissions
	if _, err = access.Users.RoleRegistry.UpdateRole(ctx, role.ID, mutation); err != nil {
		t.Fatal(err)
	}
	restored, err := access.Resolve(ctx)
	if err != nil || restored.PermissionHash != principal.PermissionHash {
		t.Fatal("effective grant hash was not restored", restored, err)
	}
	changed, err := access.InsightAuthorizationRevision(ctx, restored)
	if err != nil || changed == epoch {
		t.Fatal("grant restore reused epoch", changed, err)
	}
	if err = runtime.Close(); err != nil {
		t.Fatal(err)
	}
	runtime, err = datamodule.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	service = build()
	// Neither an intervening navigation nor an in-memory revocation tracker exists.
	if _, err = service.ApplicationPreviewSession(ctx, data.ApplicationPreviewSessionQuery{SessionID: session.SessionID}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("old session revived after restart", err)
	}
	record, err := runtime.LookupPreview(ctx, session.SessionID)
	if err != nil || record.Session.State != data.PreviewUnavailable {
		t.Fatal(record, err)
	}
	q.RequestID = "fresh-launch"
	if _, err = service.OpenApplicationPreview(ctx, q); err != nil {
		t.Fatal("fresh launch under restored grants failed", err)
	}
}

func TestPreviewHostEpochAtomicityScopeAndAssignmentChanges(t *testing.T) {
	access, ctx, p := previewAuthorityFixture(t)
	epoch := func() string {
		t.Helper()
		value, err := access.InsightAuthorizationRevision(ctx, p)
		if err != nil {
			t.Fatal(err)
		}
		return value
	}
	initial := epoch()
	// Reinstallation and observation preserve the durable original epoch.
	if err := ensurePreviewAuthorityEpochs(ctx, access.Users.DB.DB); err != nil {
		t.Fatal(err)
	}
	if epoch() != initial {
		t.Fatal("startup reset authority epoch")
	}
	role, err := findSeedRole(ctx, access.Users.RoleRegistry, "superadmin")
	if err != nil {
		t.Fatal(err)
	}
	tx, err := access.Users.DB.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.ExecContext(ctx, `UPDATE custom_roles SET permissions='[]' WHERE id=?`, role.ID); err != nil {
		t.Fatal(err)
	}
	if err = tx.Rollback(); err != nil {
		t.Fatal(err)
	}
	if epoch() != initial {
		t.Fatal("rolled-back grant changed epoch")
	}
	// Exercise the actual registry with its role/user signature.
	user, err := access.Users.RepoManager.Users().GetByIdentifier(ctx, "superadmin")
	if err != nil {
		t.Fatal(err)
	}
	if err = access.Users.RoleRegistry.UnassignRole(ctx, user.ID, role.ID, role.Scope, user.ID); err != nil {
		t.Fatal(err)
	}
	if err = access.Users.RoleRegistry.AssignRole(ctx, user.ID, role.ID, role.Scope, user.ID); err != nil {
		t.Fatal(err)
	}
	if epoch() == initial {
		t.Fatal("assignment revoke/restore reused epoch")
	}
	before := epoch()
	for _, status := range []string{"suspended", "active"} {
		if _, err = access.Users.DB.ExecContext(ctx, `UPDATE users SET status=? WHERE id=?`, status, user.ID); err != nil {
			t.Fatal(err)
		}
	}
	if epoch() == before {
		t.Fatal("account status restore reused epoch")
	}
	before = epoch()
	var metadata string
	if err = access.Users.DB.QueryRowContext(ctx, `SELECT metadata FROM users WHERE id=?`, user.ID).Scan(&metadata); err != nil {
		t.Fatal(err)
	}
	changed, err := json.Marshal(map[string]any{coreadmin.ScopeOrganizationIDKey: "changed-scope"})
	if err != nil {
		t.Fatal(err)
	}
	for _, body := range []string{string(changed), metadata} {
		if _, err = access.Users.DB.ExecContext(ctx, `UPDATE users SET metadata=? WHERE id=?`, body, user.ID); err != nil {
			t.Fatal(err)
		}
	}
	if epoch() == before {
		t.Fatal("scope restore reused epoch")
	}
	before = epoch()
	other, err := access.Users.RepoManager.Users().GetByIdentifier(ctx, "viewer")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = access.Users.DB.ExecContext(ctx, `UPDATE users SET status='suspended' WHERE id=?`, other.ID); err != nil {
		t.Fatal(err)
	}
	if epoch() != before {
		t.Fatal("unrelated account invalidated actor")
	}
}

func TestPreviewHostEpochUnavailableRetainsProviderCause(t *testing.T) {
	access, ctx, p := previewAuthorityFixture(t)
	// A backend failure is not a revoked account/grant. It must not masquerade
	// as a denial that would terminally withdraw an existing session.
	if _, err := access.Users.DB.ExecContext(ctx, `DROP TABLE data_preview_authority_epochs`); err != nil {
		t.Fatal(err)
	}
	if _, err := access.InsightAuthorizationRevision(ctx, p); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal("epoch backend outage reported denial", err)
	}
}
