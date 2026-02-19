package admin

import (
	"reflect"
	"strings"
	"testing"
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
			gotDiag, gotState := panel.diagnose(true, tc.inClaims, tc.allows)
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
	claimsSet := map[string]bool{
		"perm.ok":       true,
		"perm.mismatch": true,
	}
	checks := map[string]bool{
		"perm.ok":       true,
		"perm.mismatch": false,
		"perm.stale":    true,
		"perm.missing":  false,
	}

	got := panel.findMissingPermissions(required, claimsSet, checks)
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
}
