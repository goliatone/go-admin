package admin

import (
	"context"
	"reflect"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
)

func TestPermissionsDebugPanelDiagnoseRequiredStates(t *testing.T) {
	panel := &PermissionsDebugPanel{}
	tests := []struct {
		name      string
		inClaims  bool
		allows    bool
		wantDiag  string
		wantState string
	}{
		{
			name:      "ok when in claims and allowed",
			inClaims:  true,
			allows:    true,
			wantDiag:  "OK",
			wantState: "ok",
		},
		{
			name:      "missing grants when not in claims and denied",
			inClaims:  false,
			allows:    false,
			wantDiag:  "Grant missing permission in role assignment",
			wantState: "error",
		},
		{
			name:      "claims stale when not in claims but allowed",
			inClaims:  false,
			allows:    true,
			wantDiag:  "Permission list missing key while authorizer allows access",
			wantState: "warning",
		},
		{
			name:      "scope mismatch when in claims but denied",
			inClaims:  true,
			allows:    false,
			wantDiag:  "Scope/policy mismatch - permission listed but authorizer denies",
			wantState: "warning",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotDiag, gotState := panel.diagnose(true, tc.inClaims, "", tc.allows)
			if gotDiag != tc.wantDiag {
				t.Fatalf("diagnosis mismatch: got %q want %q", gotDiag, tc.wantDiag)
			}
			if gotState != tc.wantState {
				t.Fatalf("status mismatch: got %q want %q", gotState, tc.wantState)
			}
		})
	}
}

func TestPermissionsDebugPanelFindMissingPermissionsOnlyDeniedMissingClaims(t *testing.T) {
	panel := &PermissionsDebugPanel{}
	required := map[string]string{
		"perm.ok":       "x",
		"perm.mismatch": "x",
		"perm.stale":    "x",
		"perm.missing":  "x",
	}
	claims := []string{"perm.ok", "perm.mismatch"}
	checks := map[string]bool{
		"perm.ok":       true,
		"perm.mismatch": false,
		"perm.stale":    true,
		"perm.missing":  false,
	}

	got := panel.findMissingPermissions(required, claims, nil, checks)
	want := []string{"perm.missing"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("missing permissions mismatch: got %v want %v", got, want)
	}
}

func TestPermissionsDebugPanelComputeVerdict(t *testing.T) {
	panel := &PermissionsDebugPanel{}
	cases := []struct {
		name   string
		snap   PermissionsDebugSnapshot
		expect string
	}{
		{
			name: "healthy",
			snap: PermissionsDebugSnapshot{
				RequiredPermissions: map[string]string{"perm": "x"},
				ClaimsPermissions:   []string{"perm"},
				PermissionChecks:    map[string]bool{"perm": true},
			},
			expect: "healthy",
		},
		{
			name: "healthy with case folded exact grant",
			snap: PermissionsDebugSnapshot{
				RequiredPermissions: map[string]string{"admin.users.view": "users"},
				ClaimsPermissions:   []string{"Admin.Users.View"},
				PermissionChecks:    map[string]bool{"admin.users.view": true},
			},
			expect: "healthy",
		},
		{
			name: "claims stale",
			snap: PermissionsDebugSnapshot{
				RequiredPermissions: map[string]string{"perm": "x"},
				ClaimsPermissions:   []string{},
				PermissionChecks:    map[string]bool{"perm": true},
			},
			expect: "claims_stale",
		},
		{
			name: "scope mismatch",
			snap: PermissionsDebugSnapshot{
				RequiredPermissions: map[string]string{"perm": "x"},
				ClaimsPermissions:   []string{"perm"},
				PermissionChecks:    map[string]bool{"perm": false},
			},
			expect: "scope_mismatch",
		},
		{
			name: "missing grants has precedence",
			snap: PermissionsDebugSnapshot{
				RequiredPermissions: map[string]string{"perm.missing": "x", "perm.stale": "x", "perm.mismatch": "x"},
				ClaimsPermissions:   []string{"perm.mismatch"},
				PermissionChecks:    map[string]bool{"perm.missing": false, "perm.stale": true, "perm.mismatch": false},
			},
			expect: "missing_grants",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := panel.computeVerdict(&tc.snap)
			if got != tc.expect {
				t.Fatalf("verdict mismatch: got %q want %q", got, tc.expect)
			}
		})
	}
}

func TestPermissionsDebugPanelWildcardGrantCoverageIsHealthy(t *testing.T) {
	panel := &PermissionsDebugPanel{}
	snapshot := PermissionsDebugSnapshot{
		RequiredPermissions: map[string]string{
			"admin.users.view":                "users",
			"admin.translations.import.apply": "translations",
		},
		ClaimsPermissions: []string{"admin.*"},
		PermissionChecks: map[string]bool{
			"admin.users.view":                true,
			"admin.translations.import.apply": true,
		},
	}

	if got := panel.computeVerdict(&snapshot); got != "healthy" {
		t.Fatalf("expected wildcard-covered diagnostics to be healthy, got %q", got)
	}
	actions := panel.computeNextActions(&snapshot)
	joined := strings.Join(actions, "\n")
	if strings.Contains(joined, "Permissions missing in diagnostics list") {
		t.Fatalf("did not expect wildcard-covered permissions to be stale, got %v", actions)
	}
}

func TestPermissionsDebugPanelBuildSnapshotTreatsWildcardGrantAsCovered(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleMember),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{PermAdminWildcard}, nil
		},
	})
	panel := &PermissionsDebugPanel{admin: &Admin{
		config: Config{
			UsersPermission:       PermAdminUsersView,
			UsersDeletePermission: PermAdminUsersDelete,
		},
		authorizer: authz,
	}}

	snapshot := panel.buildSnapshot(ctx)
	if snapshot.Verdict != "healthy" {
		t.Fatalf("expected wildcard-backed snapshot to be healthy, got %q entries=%+v", snapshot.Verdict, snapshot.Entries)
	}
	if !reflect.DeepEqual(snapshot.ClaimsPermissions, []string{PermAdminWildcard}) {
		t.Fatalf("expected diagnostics to show stored wildcard grant, got %v", snapshot.ClaimsPermissions)
	}
	for _, perm := range []string{PermAdminUsersView, PermAdminUsersDelete} {
		if !snapshot.PermissionChecks[perm] {
			t.Fatalf("expected wildcard grant to allow %q, checks=%v", perm, snapshot.PermissionChecks)
		}
		found := false
		for _, entry := range snapshot.Entries {
			if entry.Permission != perm {
				continue
			}
			found = true
			if entry.InClaims || !entry.CoveredByGrant || entry.CoveringGrant != PermAdminWildcard || entry.Status != "ok" {
				t.Fatalf("expected %q entry covered by wildcard, got %+v", perm, entry)
			}
		}
		if !found {
			t.Fatalf("expected diagnostic entry for %q, got %+v", perm, snapshot.Entries)
		}
	}
}

func TestPermissionsDebugPanelBuildSnapshotTreatsExactGrantAsLiteralClaim(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleMember),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{PermAdminUsersView}, nil
		},
	})
	panel := &PermissionsDebugPanel{admin: &Admin{
		config: Config{
			UsersPermission: PermAdminUsersView,
		},
		authorizer: authz,
	}}

	snapshot := panel.buildSnapshot(ctx)
	if snapshot.Verdict != "healthy" {
		t.Fatalf("expected exact-grant snapshot to be healthy, got %q entries=%+v", snapshot.Verdict, snapshot.Entries)
	}
	found := false
	for _, entry := range snapshot.Entries {
		if entry.Permission != PermAdminUsersView {
			continue
		}
		found = true
		if !entry.InClaims || entry.CoveredByGrant || entry.CoveringGrant != "" || entry.Status != "ok" {
			t.Fatalf("expected exact grant to remain a literal claim, got %+v", entry)
		}
	}
	if !found {
		t.Fatalf("expected diagnostic entry for %q, got %+v", PermAdminUsersView, snapshot.Entries)
	}
}

func TestPermissionsDebugPanelBuildSnapshotTreatsCaseFoldedExactGrantAsLiteralClaim(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleMember),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{"Admin.Users.View"}, nil
		},
	})
	panel := &PermissionsDebugPanel{admin: &Admin{
		config: Config{
			UsersPermission: PermAdminUsersView,
		},
		authorizer: authz,
	}}

	snapshot := panel.buildSnapshot(ctx)
	if snapshot.Verdict != "healthy" {
		t.Fatalf("expected case-folded exact-grant snapshot to be healthy, got %q entries=%+v", snapshot.Verdict, snapshot.Entries)
	}
	if !reflect.DeepEqual(snapshot.ClaimsPermissions, []string{"Admin.Users.View"}) {
		t.Fatalf("expected diagnostics to preserve stored grant casing, got %v", snapshot.ClaimsPermissions)
	}
	found := false
	for _, entry := range snapshot.Entries {
		if entry.Permission != PermAdminUsersView {
			continue
		}
		found = true
		if !entry.InClaims || entry.CoveredByGrant || entry.CoveringGrant != "" || entry.Status != "ok" {
			t.Fatalf("expected case-folded exact grant to remain a literal claim, got %+v", entry)
		}
	}
	if !found {
		t.Fatalf("expected diagnostic entry for %q, got %+v", PermAdminUsersView, snapshot.Entries)
	}
}

func TestPermissionsDebugPanelComputeNextActionsUsesClassifiedLists(t *testing.T) {
	panel := &PermissionsDebugPanel{}

	t.Run("missing_grants lists only true missing grants", func(t *testing.T) {
		snapshot := &PermissionsDebugSnapshot{
			Verdict: "missing_grants",
			RequiredPermissions: map[string]string{
				"perm.missing": "x",
				"perm.stale":   "x",
			},
			PermissionChecks:  map[string]bool{"perm.missing": false, "perm.stale": true},
			ClaimsPermissions: []string{},
		}
		actions := panel.computeNextActions(snapshot)
		joined := strings.Join(actions, "\n")
		if !strings.Contains(joined, "  - perm.missing") {
			t.Fatalf("expected missing permission in next actions, got %v", actions)
		}
		if strings.Contains(joined, "  - perm.stale") {
			t.Fatalf("did not expect stale claim permission in missing grants actions, got %v", actions)
		}
	})

	t.Run("claims_stale lists claims gaps", func(t *testing.T) {
		snapshot := &PermissionsDebugSnapshot{
			Verdict:             "claims_stale",
			RequiredPermissions: map[string]string{"perm.stale": "x"},
			PermissionChecks:    map[string]bool{"perm.stale": true},
			ClaimsPermissions:   []string{},
		}
		actions := panel.computeNextActions(snapshot)
		joined := strings.Join(actions, "\n")
		if !strings.Contains(joined, "Permissions missing in diagnostics list:") {
			t.Fatalf("expected claims-stale guidance in next actions, got %v", actions)
		}
		if !strings.Contains(joined, "  - perm.stale") {
			t.Fatalf("expected stale permission list in next actions, got %v", actions)
		}
	})

	t.Run("scope_mismatch describes wildcard coverage", func(t *testing.T) {
		snapshot := &PermissionsDebugSnapshot{
			Verdict:             "scope_mismatch",
			RequiredPermissions: map[string]string{PermAdminUsersView: "users"},
			PermissionChecks:    map[string]bool{PermAdminUsersView: false},
			ClaimsPermissions:   []string{PermAdminWildcard},
		}
		actions := panel.computeNextActions(snapshot)
		joined := strings.Join(actions, "\n")
		if strings.Contains(joined, "Permission is listed but authorizer denies access") {
			t.Fatalf("did not expect literal-claim guidance for wildcard coverage, got %v", actions)
		}
		if !strings.Contains(joined, "Permission is covered by a resolved grant, but authorizer denies access") {
			t.Fatalf("expected wildcard coverage guidance in next actions, got %v", actions)
		}
		if !strings.Contains(joined, "  - "+PermAdminUsersView+" (covered by "+PermAdminWildcard+")") {
			t.Fatalf("expected covered permission annotation in next actions, got %v", actions)
		}
	})
}
